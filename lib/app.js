/* Nomad Horizon — backend shared by the Node.js server (server.js) and the Vercel function (api/index.js).
   All data lives in PostgreSQL (db/schema.sql). Without DATABASE_URL the public site still works:
   forms are delivered to Telegram, and the admin panel reports that the database is not connected. */
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const zlib = require('zlib');
const { createDb } = require('./pg');
const { sendTelegram } = require('./telegram');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ON_VERCEL = !!process.env.VERCEL;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || ON_VERCEL;
const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Bishkek';

const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = Number(process.env.LOGIN_BLOCK_SECONDS) > 0 ? Number(process.env.LOGIN_BLOCK_SECONDS) * 1000 : 15 * 60 * 1000;
const UPLOAD_MAX = 4 * 1024 * 1024;           // Vercel accepts request bodies up to 4.5 MB
const JSON_MAX = 256 * 1024;
const SOURCE_MAX = 1024 * 1024;
const EDITABLE = ['index.html', 'styles.css', 'script.js'];
const LANGS = ['en', 'ky', 'ru'];
const VERSION = '3.0.0';

/* --------------------------------------------- shared site data (vm) */
const TH = (function loadSiteData() {
  const sandbox = { window: {}, globalThis: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['translations.js', 'catalog.js']) {
    vm.runInContext(fs.readFileSync(path.join(PUBLIC_DIR, f), 'utf8'), sandbox, { filename: f });
  }
  return JSON.parse(JSON.stringify(sandbox.TH));
})();
const SLUGS = TH.catalog.map((c) => c.slug);
const IDEAS = [];
TH.moods.forEach((m) => TH.durations.forEach((d) => IDEAS.push(m + '-' + d)));
const REGIONS = Object.keys(TH.regions.en);
const HOST_TYPES = TH.hostTypeKeys;
const SPOKEN = Object.keys(TH.spoken);

function defaultContent() {
  const en = TH.defaults.en;
  return { version: 2, updatedAt: new Date().toISOString(), hero: en.hero, journeys: en.journeys, land: en.land, destinations: {},
    contacts: { telegram: '', whatsapp: '', email: 'hello@nomadhorizon.example' }, locales: { ky: {}, ru: {} } };
}

/* ------------------------------------------------------------ database */
const DB = DATABASE_URL ? createDb(DATABASE_URL) : null;
const SCHEMA = fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8');
let ready = null;

function init() {
  if (!DB) return Promise.resolve();
  if (!ready) ready = setup().catch((e) => { ready = null; throw e; });
  return ready;
}
async function setup() {
  await DB.tx(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(4173001)');      // one instance creates tables at a time
    await c.exec(SCHEMA);
    await c.query("INSERT INTO settings (key, value) VALUES ('content', $1) ON CONFLICT (key) DO NOTHING", [defaultContent()]);
    const first = await c.query("INSERT INTO settings (key, value) VALUES ('seeded', 'true') ON CONFLICT (key) DO NOTHING RETURNING key");
    if (first.rowCount) {
      for (const h of TH.exampleHosts) {
        await c.query(
          'INSERT INTO hosts (id, status, example, name, type, region, languages, about, about_lang, offer, contacts, show_contacts, image) ' +
          'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING',
          [h.id, h.status || 'approved', !!h.example, h.name, h.type, h.region, h.languages, h.about, h.aboutLang || 'en', h.offer, h.contacts || {}, !!h.showContacts, h.image || '']);
      }
    }
  });
  await loadAuth();
}
async function one(text, params) { return (await DB.query(text, params)).rows[0] || null; }

function rowToRequest(r) {
  return { id: r.id, createdAt: r.created_at, updatedAt: r.updated_at || undefined, firstResponseAt: r.first_response_at || undefined,
    status: r.status, kind: r.kind, name: r.name, contact: r.contact, country: r.country, month: r.month, group: r.group_size || '',
    note: r.note, idea: r.idea, place: r.place, hostId: r.host_id || '', hostName: r.host_name, lang: r.lang, page: r.page, telegram: r.telegram };
}
function rowToHost(h) {
  return { id: h.id, status: h.status, example: h.example, name: h.name, type: h.type, region: h.region, languages: h.languages,
    about: h.about, aboutLang: h.about_lang, offer: h.offer, contacts: h.contacts, showContacts: h.show_contacts, image: h.image,
    createdAt: h.created_at, updatedAt: h.updated_at };
}
function publicHost(h) {
  return { id: h.id, example: !!h.example, name: h.name, type: h.type, region: h.region, languages: h.languages, about: h.about, aboutLang: h.aboutLang,
    offer: h.offer, image: h.image || '', showContacts: !!h.showContacts,
    contacts: h.showContacts ? { telegram: (h.contacts || {}).telegram || '', whatsapp: (h.contacts || {}).whatsapp || '' } : {} };
}
async function getContent() {
  if (!DB) return defaultContent();
  const r = await one("SELECT value FROM settings WHERE key = 'content'");
  const c = (r && r.value) || defaultContent();
  c.locales = c.locales || {}; c.contacts = c.contacts || { telegram: '', whatsapp: '', email: '' }; c.destinations = c.destinations || {};
  return c;
}
/* Changes the site content inside a transaction (row lock), so two admins cannot overwrite each other. */
async function updateContent(change) {
  return DB.tx(async (c) => {
    const r = (await c.query("SELECT value FROM settings WHERE key = 'content' FOR UPDATE")).rows[0];
    const content = (r && r.value) || defaultContent();
    content.locales = content.locales || {};
    change(content);
    content.updatedAt = new Date().toISOString();
    await c.query("INSERT INTO settings (key, value, updated_at) VALUES ('content', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", [content]);
    return content;
  });
}
async function audit(ip, action, detail) {
  if (!DB) return;
  try { await DB.query('INSERT INTO audit_log (ip, action, detail) VALUES ($1, $2, $3)', [ip, action, detail || '']); } catch (e) { console.error('[audit] ' + e.message); }
}

/* --------------------------------------------------------------- auth */
function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(String(pw), salt, 64).toString('hex') };
}
let AUTH = null;
async function loadAuth() {
  if (process.env.ADMIN_PASSWORD) { AUTH = AUTH && AUTH.env ? AUTH : Object.assign(hashPassword(process.env.ADMIN_PASSWORD), { env: true }); return; }
  const saved = await one("SELECT value FROM settings WHERE key = 'auth'");
  if (saved && saved.value && saved.value.salt) { AUTH = saved.value; return; }
  const pw = crypto.randomBytes(9).toString('base64url');
  const created = await DB.query("INSERT INTO settings (key, value) VALUES ('auth', $1) ON CONFLICT (key) DO NOTHING RETURNING key", [hashPassword(pw)]);
  if (created.rowCount) {
    console.log('\n  ┌──────────────────────────────────────────────┐');
    console.log('  │  First start: admin password created          │');
    console.log('  │  Password: ' + pw.padEnd(35) + '│');
    console.log('  │  Change it: node server.js set-password NEW   │');
    console.log('  └──────────────────────────────────────────────┘\n');
  }
  AUTH = (await one("SELECT value FROM settings WHERE key = 'auth'")).value;
}
async function setPassword(pw) {
  await init();
  await DB.query("INSERT INTO settings (key, value, updated_at) VALUES ('auth', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", [hashPassword(pw)]);
  await DB.query('DELETE FROM sessions');
}
function checkPassword(pw) {
  if (!AUTH || typeof pw !== 'string' || !pw.length || pw.length > 200) return false;
  const h = crypto.scryptSync(pw, AUTH.salt, 64);
  const expected = Buffer.from(AUTH.hash, 'hex');
  return h.length === expected.length && crypto.timingSafeEqual(h, expected);
}
function tokenHash(t) { return crypto.createHash('sha256').update(t).digest('hex'); }
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { /* ignore bad cookie */ } }
  });
  return out;
}
async function isAuthed(req) {
  if (!DB) return false;
  const t = cookies(req).th_admin;
  if (!t || !/^[a-f0-9]{64}$/.test(t)) return false;
  return !!(await one('SELECT 1 AS ok FROM sessions WHERE token_hash = $1 AND expires_at > now()', [tokenHash(t)]));
}
function secureCookie(req) {
  return PUBLIC_URL.startsWith('https://') || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
}

/* ---------------------------------------------------------- rate limit */
const buckets = new Map();       // per process; good enough against floods from one address
function limited(key, max, windowMs) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n += 1;
  return b.n > max;
}

/* ------------------------------------------------------------ helpers */
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
};
function send(res, status, body, headers) {
  const h = Object.assign({}, SECURITY_HEADERS, headers || {});
  if (body !== undefined && body !== null && typeof body !== 'string' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
    h['Content-Type'] = 'application/json; charset=utf-8';
    h['Cache-Control'] = h['Cache-Control'] || 'no-store';
  }
  res.writeHead(status, h);
  res.end(body === undefined || body === null ? '' : body);
}
function fail(res, status, error, extra) { send(res, status, Object.assign({ error }, extra || {})); }
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

function readBody(req, limit) {
  // Vercel may hand over an already-read body; otherwise read the stream.
  if (req.readableEnded && req.body !== undefined) {
    const b = req.body;
    const buf = Buffer.isBuffer(b) ? b : Buffer.from(typeof b === 'string' ? b : JSON.stringify(b));
    return buf.length > limit ? Promise.reject(httpError(413, 'too_large')) : Promise.resolve(buf);
  }
  return new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length'] || 0);
    if (len > limit) { req.resume(); return reject(httpError(413, 'too_large')); }
    const chunks = []; let size = 0; let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) { done = true; req.resume(); reject(httpError(413, 'too_large')); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
  });
}
async function readJSONBody(req, limit) {
  const buf = await readBody(req, limit || JSON_MAX);
  try { const v = JSON.parse(buf.toString('utf8') || '{}'); if (v && typeof v === 'object') return v; } catch (e) { /* fall through */ }
  throw httpError(400, 'invalid_json');
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin);
    if (o.host === req.headers.host || o.host === req.headers['x-forwarded-host']) return true;
    if (PUBLIC_URL && o.origin === new URL(PUBLIC_URL).origin) return true;
  } catch (e) { return false; }
  return false;
}
function isJSON(req) { return /^application\/json\b/i.test(req.headers['content-type'] || ''); }
function newId(prefix) { return prefix + '-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'); }

/* --------------------------------------------------------- validation */
function clean(v, multiline) {
  let s = String(v == null ? '' : v);
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return s.trim();
}
function V() { this.errors = []; }
V.prototype.str = function (obj, key, max, opts) {
  opts = opts || {};
  const raw = obj ? obj[key] : undefined;
  if (raw !== undefined && raw !== null && typeof raw !== 'string' && typeof raw !== 'number') { this.errors.push(opts.name || key); return ''; }
  const s = clean(raw, opts.multiline);
  if ((opts.required && !s) || s.length > max || (opts.min && s && s.length < opts.min)) this.errors.push(opts.name || key);
  return s;
};
V.prototype.oneOf = function (value, list, name, optional) {
  if (optional && (value === '' || value == null)) return '';
  if (list.indexOf(value) < 0) { this.errors.push(name); return ''; }
  return value;
};
V.prototype.image = function (obj, key, name) {
  const s = clean(obj ? obj[key] : '');
  if (!s) return '';
  if (/^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(s)) return s;
  if (s.length <= 600 && /^https:\/\/[^\s"'<>\\]+$/i.test(s)) { try { if (new URL(s).protocol === 'https:') return s; } catch (e) { /* invalid */ } }
  this.errors.push(name || key);
  return '';
};

const HERO_F = { eyebrow: 120, titleLine: 80, titleEmphasis: 80, copyFirst: 400, copySecond: 400 };
const CARD_F = { label: 60, duration: 40, title: 80, description: 500, alt: 200 };
const LAND_F = { titleLine: 80, titleEmphasis: 80, description: 1500, alt: 200, caption: 160 };
const DEST_F = { name: 60, short: 200, story: 1500, alt: 200 };
function validateContent(body) {
  const v = new V(), lang = body.lang;
  if (LANGS.indexOf(lang) < 0) return { errors: ['lang'] };
  const req = lang === 'en';
  const hero = {};
  for (const k in HERO_F) hero[k] = v.str(body.hero, k, HERO_F[k], { name: 'hero.' + k, required: req && (k === 'titleLine' || k === 'titleEmphasis') });
  if (!Array.isArray(body.journeys) || body.journeys.length !== 3) v.errors.push('journeys');
  const journeys = [0, 1, 2].map((i) => {
    const src = Array.isArray(body.journeys) ? body.journeys[i] : null, c = {};
    for (const k in CARD_F) c[k] = v.str(src, k, CARD_F[k], { name: 'journeys.' + i + '.' + k, required: req && k === 'title', multiline: k === 'description' });
    c.image = v.image(src, 'image', 'journeys.' + i + '.image');
    return c;
  });
  const land = {};
  for (const k in LAND_F) land[k] = v.str(body.land, k, LAND_F[k], { name: 'land.' + k, required: req && k === 'titleLine', multiline: k === 'description' });
  land.image = v.image(body.land, 'image', 'land.image');
  const destinations = {};
  const srcD = body.destinations && typeof body.destinations === 'object' ? body.destinations : {};
  for (const slug of Object.keys(srcD)) {
    if (SLUGS.indexOf(slug) < 0) { v.errors.push('destinations.' + slug); continue; }
    const d = {};
    for (const k in DEST_F) d[k] = v.str(srcD[slug], k, DEST_F[k], { name: 'destinations.' + slug + '.' + k, multiline: k === 'story' });
    d.image = v.image(srcD[slug], 'image', 'destinations.' + slug + '.image');
    if (Object.keys(d).some((k) => d[k])) destinations[slug] = d;
  }
  return { errors: v.errors, lang, data: { hero, journeys, land, destinations } };
}
function validateHost(body, v, partial) {
  const out = {};
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(body, k);
  if (has('name')) out.name = v.str(body, 'name', 80, { required: true });
  if (has('type')) out.type = v.oneOf(body.type, HOST_TYPES, 'type');
  if (has('region')) out.region = v.oneOf(body.region, REGIONS, 'region');
  if (has('languages')) {
    const l = Array.isArray(body.languages) ? body.languages.filter((x) => SPOKEN.indexOf(x) >= 0) : [];
    if (!l.length || l.length > 10) v.errors.push('languages');
    out.languages = Array.from(new Set(l));
  }
  if (has('about')) out.about = v.str(body, 'about', 1500, { required: true, min: 20, multiline: true });
  if (has('aboutLang')) out.aboutLang = v.oneOf(body.aboutLang, LANGS, 'aboutLang');
  if (has('offer')) {
    const o = body.offer || {};
    out.offer = { title: v.str(o, 'title', 120, { required: true, name: 'offerTitle' }), duration: v.str(o, 'duration', 40, { required: true, name: 'offerDuration' }), priceFrom: null };
    if (o.priceFrom !== null && o.priceFrom !== undefined && o.priceFrom !== '') {
      const p = Number(o.priceFrom);
      if (!Number.isFinite(p) || p < 0 || p > 100000) v.errors.push('priceFrom'); else out.offer.priceFrom = Math.round(p);
    }
  }
  if (has('contacts')) {
    const c = body.contacts || {};
    const tg = v.str(c, 'telegram', 33, { name: 'telegram' }).replace(/^@/, '');
    const wa = v.str(c, 'whatsapp', 24, { name: 'whatsapp' });
    const em = v.str(c, 'email', 120, { name: 'email' });
    if (tg && !/^[A-Za-z0-9_]{5,32}$/.test(tg)) v.errors.push('telegram');
    if (wa && !/^\+?[0-9 ()-]{7,22}$/.test(wa)) v.errors.push('whatsapp');
    if (em && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(em)) v.errors.push('email');
    if (!partial && !tg && !wa && !em) v.errors.push('telegram');
    out.contacts = { telegram: tg, whatsapp: wa, email: em };
  }
  if (has('showContacts')) out.showContacts = body.showContacts === true;
  if (has('image')) out.image = v.image(body, 'image', 'image');
  return out;
}
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/* --------------------------------------------------------------- stats */
const EVENTS = ['visit', 'planner_seen', 'planner_result', 'request_open', 'request_sent', 'contact_click', 'host_apply'];
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
async function count(event) {
  if (!DB) return;
  await DB.query('INSERT INTO stats_daily (day, event, count) VALUES ($1::date, $2, 1) ON CONFLICT (day, event) DO UPDATE SET count = stats_daily.count + 1',
    [dayFmt.format(new Date()), event]);
}

/* ------------------------------------------------------- static files */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const gzCache = new Map();
async function serveFile(req, res, baseDir, rel, cacheControl) {
  let decoded;
  try { decoded = decodeURIComponent(rel); } catch (e) { return fail(res, 400, 'bad_path'); }
  if (decoded.indexOf('\0') >= 0) return fail(res, 400, 'bad_path');
  const file = path.normalize(path.join(baseDir, decoded));
  if (file !== baseDir && !file.startsWith(baseDir + path.sep)) return fail(res, 403, 'forbidden');
  let st;
  try { st = await fsp.stat(file); } catch (e) { return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' }); }
  if (st.isDirectory()) return serveFile(req, res, baseDir, path.join(decoded, 'index.html'), cacheControl);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Cache-Control': cacheControl || 'no-cache', 'Last-Modified': st.mtime.toUTCString() };
  if (req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']).getTime() >= Math.floor(st.mtimeMs / 1000) * 1000) return send(res, 304, null, headers);
  const compressible = /^(text\/|application\/(json|xml)|image\/svg)/.test(type) && st.size > 1024;
  if (compressible && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    const key = file + ':' + st.mtimeMs;
    let gz = gzCache.get(key);
    if (!gz) { gz = zlib.gzipSync(await fsp.readFile(file), { level: 9 }); gzCache.set(key, gz); }
    headers['Content-Encoding'] = 'gzip'; headers['Vary'] = 'Accept-Encoding';
    return send(res, 200, req.method === 'HEAD' ? null : gz, headers);
  }
  return send(res, 200, req.method === 'HEAD' ? null : await fsp.readFile(file), headers);
}

/* --------------------------------------------------------------- API */
const routes = [];
/* need: 'auth' = admin session and database, 'db' = database, false = works without a database */
function on(method, pattern, need, handler) { routes.push({ method, pattern, need, handler }); }

on('GET', /^\/api\/health$/, false, async (req, res) => {
  let database = DB ? 'connected' : 'not_configured';
  if (DB) { try { await DB.query('SELECT 1'); } catch (e) { database = 'unreachable'; } }
  send(res, 200, { ok: true, version: VERSION, database, telegram: !!process.env.TELEGRAM_BOT_TOKEN, hosting: ON_VERCEL ? 'vercel' : 'node' });
});

on('GET', /^\/api\/content$/, false, async (req, res, ip, m, ctx) => send(res, 200, ctx.db ? await getContent() : defaultContent()));

on('PUT', /^\/api\/content$/, 'auth', async (req, res, ip) => {
  const r = validateContent(await readJSONBody(req));
  if (r.errors.length) return fail(res, 400, 'invalid', { fields: r.errors });
  const content = await updateContent((c) => {
    if (r.lang === 'en') { c.hero = r.data.hero; c.journeys = r.data.journeys; c.land = r.data.land; c.destinations = r.data.destinations; }
    else c.locales[r.lang] = r.data;
  });
  await audit(ip, 'content.save', r.lang);
  send(res, 200, { ok: true, updatedAt: content.updatedAt });
});

on('PUT', /^\/api\/contacts$/, 'auth', async (req, res, ip) => {
  const body = await readJSONBody(req), v = new V();
  const telegram = v.str(body, 'telegram', 33).replace(/^@/, '');
  const whatsapp = v.str(body, 'whatsapp', 24);
  const email = v.str(body, 'email', 120);
  if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) v.errors.push('telegram');
  if (whatsapp && !/^\+?[0-9 ()-]{7,22}$/.test(whatsapp)) v.errors.push('whatsapp');
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) v.errors.push('email');
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  await updateContent((c) => { c.contacts = { telegram, whatsapp, email }; });
  await audit(ip, 'contacts.save');
  send(res, 200, { ok: true });
});

on('POST', /^\/api\/login$/, 'db', async (req, res, ip) => {
  const a = await one('SELECT failures, blocked_until FROM login_attempts WHERE ip = $1', [ip]) || { failures: 0, blocked_until: null };
  const now = Date.now(), until = a.blocked_until ? Date.parse(a.blocked_until) : 0;
  if (until > now) return fail(res, 429, 'blocked', { retryAfterSeconds: Math.ceil((until - now) / 1000) });
  const failures = until ? 0 : a.failures;
  const body = await readJSONBody(req, 4096);
  if (!checkPassword(body.password)) {
    const n = failures + 1;
    if (n >= MAX_ATTEMPTS) {
      await DB.query('INSERT INTO login_attempts (ip, failures, blocked_until) VALUES ($1, 0, $2) ON CONFLICT (ip) DO UPDATE SET failures = 0, blocked_until = EXCLUDED.blocked_until', [ip, new Date(now + BLOCK_MS)]);
      await audit(ip, 'login.blocked');
      return fail(res, 429, 'blocked', { retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) });
    }
    await DB.query('INSERT INTO login_attempts (ip, failures, blocked_until) VALUES ($1, $2, NULL) ON CONFLICT (ip) DO UPDATE SET failures = EXCLUDED.failures, blocked_until = NULL', [ip, n]);
    await audit(ip, 'login.fail');
    return fail(res, 401, 'wrong_password', { attemptsLeft: MAX_ATTEMPTS - n });
  }
  const token = crypto.randomBytes(32).toString('hex');
  await DB.query('DELETE FROM login_attempts WHERE ip = $1', [ip]);
  await DB.query('DELETE FROM sessions WHERE expires_at < now()');
  await DB.query('INSERT INTO sessions (token_hash, expires_at) VALUES ($1, $2)', [tokenHash(token), new Date(now + SESSION_MS)]);
  await audit(ip, 'login.ok');
  send(res, 200, { ok: true, expiresInSeconds: SESSION_MS / 1000 }, {
    'Set-Cookie': 'th_admin=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + (SESSION_MS / 1000) + (secureCookie(req) ? '; Secure' : '')
  });
});

on('POST', /^\/api\/logout$/, false, async (req, res, ip) => {
  const t = cookies(req).th_admin;
  if (t && DB) { await DB.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(t)]); await audit(ip, 'logout'); }
  send(res, 200, { ok: true }, { 'Set-Cookie': 'th_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
});

on('GET', /^\/api\/session$/, false, async (req, res, ip, m, ctx) => send(res, 200, { authenticated: ctx.db ? await isAuthed(req) : false, database: ctx.db }));

on('POST', /^\/api\/uploads$/, 'auth', async (req, res, ip) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!/^image\/(jpeg|png|webp)$/.test(ct.split(';')[0].trim())) return fail(res, 415, 'unsupported_type');
  const buf = await readBody(req, UPLOAD_MAX);
  const ext = sniffImage(buf);
  if (!ext) return fail(res, 415, 'not_an_image');
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
  await DB.query('INSERT INTO uploads (name, mime, size, data) VALUES ($1, $2, $3, $4)', [name, ext === 'jpg' ? 'image/jpeg' : 'image/' + ext, buf.length, buf]);
  await audit(ip, 'upload', name + ' ' + buf.length);
  send(res, 201, { url: '/uploads/' + name, size: buf.length });
});

on('POST', /^\/api\/requests$/, false, async (req, res, ip, m, ctx) => {
  let db = ctx.db;
  const body = await readJSONBody(req, 16 * 1024);
  if (body.website) return send(res, 201, { ok: true });                          // honeypot: pretend success
  if (limited('req:' + ip, 5, 10 * 60 * 1000)) return fail(res, 429, 'too_many');
  const v = new V();
  const kind = v.oneOf(body.kind, ['trip', 'place', 'host', 'general'], 'kind');
  const r = {
    id: newId('r'), createdAt: new Date().toISOString(), status: 'new', kind,
    name: v.str(body, 'name', 80, { required: true }),
    contact: v.str(body, 'contact', 120, { required: true, min: 3 }),
    country: v.str(body, 'country', 60), month: v.str(body, 'month', 40),
    group: '', note: v.str(body, 'note', 800, { multiline: true }),
    idea: kind === 'trip' ? v.oneOf(body.idea, IDEAS, 'idea') : '',
    place: kind === 'place' ? v.oneOf(body.place, SLUGS, 'place') : '',
    hostId: '', hostName: '',
    lang: v.oneOf(body.lang || 'en', LANGS, 'lang'), page: v.str(body, 'page', 100)
  };
  if (body.group !== undefined && body.group !== '' && body.group !== null) {
    const g = Number(body.group);
    if (!Number.isInteger(g) || g < 1 || g > 99) v.errors.push('group'); else r.group = g;
  }
  if (kind === 'host') {
    const h = db ? await one("SELECT id, name FROM hosts WHERE id = $1 AND status = 'approved'", [String(body.hostId || '')])
      : TH.exampleHosts.find((x) => x.id === body.hostId);
    if (!h) v.errors.push('hostId'); else { r.hostId = h.id; r.hostName = h.name; }
  }
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  if (db) {
    try {
      await DB.query('INSERT INTO requests (id, created_at, kind, name, contact, country, month, group_size, note, idea, place, host_id, host_name, lang, page) ' +
        'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
        [r.id, r.createdAt, r.kind, r.name, r.contact, r.country, r.month, r.group || null, r.note, r.idea, r.place, r.hostId || null, r.hostName, r.lang, r.page]);
      await count('request_sent');
    } catch (e) { console.error('[database] request not saved: ' + e.message); db = false; }
  }
  const what = r.idea ? 'Trip idea: ' + TH.routes.en[r.idea].title + ' (' + r.idea + ')'
    : r.place ? 'Question about: ' + TH.places.en[r.place].name
      : r.hostId ? 'Message to host: ' + r.hostName + ' (' + r.hostId + ')' : 'General enquiry';
  const text = '🧭 New request · Nomad Horizon\n' + what + '\nName: ' + r.name + '\nContact: ' + r.contact +
    (r.country ? '\nCountry: ' + r.country : '') + (r.month ? '\nWhen: ' + r.month : '') + (r.group ? '\nTravellers: ' + r.group : '') +
    (r.note ? '\nNote: ' + r.note : '') + '\nLanguage: ' + r.lang.toUpperCase() + '\nTime: ' + r.createdAt;
  const telegram = await sendTelegram(text);
  if (db) {
    await DB.query('UPDATE requests SET telegram = $2 WHERE id = $1', [r.id, telegram]).catch(() => {});
    return send(res, 201, { ok: true, id: r.id });
  }
  if (telegram !== 'sent') return fail(res, 502, 'delivery_failed', { telegram });   // nowhere to keep it: tell the visitor
  send(res, 201, { ok: true });
});

on('GET', /^\/api\/requests$/, 'auth', async (req, res) => {
  const rows = (await DB.query('SELECT * FROM requests ORDER BY created_at DESC LIMIT 500')).rows;
  send(res, 200, { requests: rows.map(rowToRequest) });
});

on('PATCH', /^\/api\/requests\/([a-z0-9-]+)$/, 'auth', async (req, res, ip, m) => {
  const body = await readJSONBody(req, 2048);
  if (['new', 'progress', 'done'].indexOf(body.status) < 0) return fail(res, 400, 'invalid', { fields: ['status'] });
  const r = await one('UPDATE requests SET status = $2, updated_at = now(), ' +
    "first_response_at = CASE WHEN status = 'new' AND $2 <> 'new' AND first_response_at IS NULL THEN now() ELSE first_response_at END " +
    'WHERE id = $1 RETURNING *', [m[1], body.status]);
  if (!r) return fail(res, 404, 'not_found');
  await audit(ip, 'request.status', r.id + ' ' + r.status);
  send(res, 200, { ok: true, request: rowToRequest(r) });
});

/* hosts (P2P) */
on('GET', /^\/api\/hosts$/, false, async (req, res, ip, m, ctx) => {
  if (!ctx.db) return send(res, 200, { hosts: TH.exampleHosts.filter((h) => h.status === 'approved').map(publicHost) });
  const rows = (await DB.query("SELECT * FROM hosts WHERE status = 'approved' ORDER BY example, created_at DESC")).rows;
  send(res, 200, { hosts: rows.map(rowToHost).map(publicHost) });
});

on('POST', /^\/api\/hosts\/apply$/, false, async (req, res, ip, m, ctx) => {
  let db = ctx.db;
  const body = await readJSONBody(req, 32 * 1024);
  if (body.website) return send(res, 201, { ok: true });
  if (limited('host:' + ip, 3, 60 * 60 * 1000)) return fail(res, 429, 'too_many');
  const v = new V();
  const h = validateHost(body, v, false);
  if (body.consent !== true) v.errors.push('consent');
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  const id = newId('h');
  if (db) {
    try {
      await DB.query('INSERT INTO hosts (id, status, name, type, region, languages, about, about_lang, offer, contacts, show_contacts) ' +
        "VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [id, h.name, h.type, h.region, h.languages, h.about, h.aboutLang || 'en', h.offer, h.contacts, !!h.showContacts]);
      await count('host_apply');
    } catch (e) { console.error('[database] host application not saved: ' + e.message); db = false; }
  }
  const c = h.contacts;
  const telegram = await sendTelegram('🏕 New host application · Nomad Horizon\nName: ' + h.name + '\nType: ' + TH.ui.en.hostTypes[h.type] + '\nRegion: ' + TH.regions.en[h.region] +
    '\nLanguages: ' + h.languages.join(', ') + '\nOffer: ' + h.offer.title + ' (' + h.offer.duration + ')' + (h.offer.priceFrom != null ? '\nPrice from: $' + h.offer.priceFrom : '') +
    '\nAbout: ' + h.about + '\nContacts: ' + [c.telegram && '@' + c.telegram, c.whatsapp, c.email].filter(Boolean).join(', ') +
    '\nShow contacts publicly: ' + (h.showContacts ? 'yes' : 'no') + (db ? '\nReview it in the admin panel → Hosts.' : ''));
  if (!db && telegram !== 'sent') return fail(res, 502, 'delivery_failed', { telegram });
  send(res, 201, { ok: true });
});

on('GET', /^\/api\/admin\/hosts$/, 'auth', async (req, res) => {
  const rows = (await DB.query('SELECT * FROM hosts ORDER BY created_at DESC')).rows;
  send(res, 200, { hosts: rows.map(rowToHost) });
});

const HOST_COLUMNS = { name: 'name', type: 'type', region: 'region', languages: 'languages', about: 'about', aboutLang: 'about_lang',
  offer: 'offer', contacts: 'contacts', showContacts: 'show_contacts', image: 'image', status: 'status' };
on('PATCH', /^\/api\/admin\/hosts\/([a-z0-9-]+)$/, 'auth', async (req, res, ip, m) => {
  const body = await readJSONBody(req, 32 * 1024);
  const v = new V();
  const upd = validateHost(body, v, true);
  if (Object.prototype.hasOwnProperty.call(body, 'status')) upd.status = v.oneOf(body.status, ['pending', 'approved', 'rejected'], 'status');
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  const sets = [], params = [m[1]];
  for (const k in upd) { params.push(upd[k]); sets.push(HOST_COLUMNS[k] + ' = $' + params.length); }
  sets.push('updated_at = now()');
  const row = await one('UPDATE hosts SET ' + sets.join(', ') + ' WHERE id = $1 RETURNING *', params);
  if (!row) return fail(res, 404, 'not_found');
  await audit(ip, 'host.update', row.id + (upd.status ? ' ' + upd.status : ''));
  send(res, 200, { ok: true, host: rowToHost(row) });
});

on('DELETE', /^\/api\/admin\/hosts\/([a-z0-9-]+)$/, 'auth', async (req, res, ip, m) => {
  const r = await DB.query('DELETE FROM hosts WHERE id = $1', [m[1]]);
  if (!r.rowCount) return fail(res, 404, 'not_found');
  await audit(ip, 'host.delete', m[1]);
  send(res, 200, { ok: true });
});

/* analytics */
on('POST', /^\/api\/track$/, false, async (req, res, ip) => {
  let body = {};
  try { body = JSON.parse((await readBody(req, 1024)).toString('utf8') || '{}'); } catch (e) { return send(res, 204); }
  if (limited('track:' + ip, 300, 60 * 60 * 1000)) return send(res, 204);
  if (DB && ['visit', 'planner_seen', 'planner_result', 'request_open', 'contact_click'].indexOf(body.event) >= 0) {
    try { await init(); await count(body.event); } catch (e) { /* analytics must never break the page */ }
  }
  send(res, 204);
});

on('GET', /^\/api\/stats$/, 'auth', async (req, res) => {
  const first = dayFmt.format(new Date(Date.now() - 29 * 86400000));
  const rows = (await DB.query("SELECT to_char(day, 'YYYY-MM-DD') AS d, event, count FROM stats_daily WHERE day >= $1::date", [first])).rows;
  const byDay = {};
  rows.forEach((r) => { (byDay[r.d] = byDay[r.d] || {})[r.event] = r.count; });
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayFmt.format(new Date(Date.now() - i * 86400000));
    const row = { date: d };
    EVENTS.forEach((e) => { row[e] = (byDay[d] && byDay[d][e]) || 0; });
    days.push(row);
  }
  const totals = {}; EVENTS.forEach((e) => { totals[e] = days.reduce((s, r) => s + r[e], 0); });
  const visits = totals.visit || 0;
  const g6 = await one("SELECT count(*) FILTER (WHERE now() - created_at >= interval '1 day' OR first_response_at IS NOT NULL)::int AS eligible, " +
    "count(*) FILTER (WHERE first_response_at IS NOT NULL AND first_response_at - created_at <= interval '1 day')::int AS fast " +
    "FROM requests WHERE created_at >= now() - interval '30 days'");
  const hc = await one("SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending, count(*) FILTER (WHERE status = 'approved')::int AS approved FROM hosts");
  const open = await one("SELECT count(*)::int AS n FROM requests WHERE status = 'new'");
  send(res, 200, {
    days, totals,
    goals: {
      G1: { value: visits ? totals.planner_seen / visits * 100 : null, target: 40, unit: '%' },
      G2: { value: visits ? totals.planner_result / visits * 100 : null, target: 25, unit: 'per 100 visits' },
      G5: { value: visits ? totals.request_sent / visits * 100 : null, target: 3, unit: 'per 100 visits' },
      G6: { value: g6.eligible ? g6.fast / g6.eligible * 100 : null, target: 90, unit: '%' }
    },
    hosts: { pending: hc.pending, approved: hc.approved },
    requests: { open: open.n }
  });
});

/* advanced: source files (only where the site files are writable — not on Vercel, where they are part of the deployment) */
function filesAvailable(res) {
  if (!ON_VERCEL) return true;
  fail(res, 501, 'not_available_on_vercel');
  return false;
}
on('GET', /^\/api\/files$/, 'auth', async (req, res) => {
  if (!filesAvailable(res)) return;
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const all = await fsp.readdir(BACKUP_DIR);
  const list = [];
  for (const name of EDITABLE) {
    const st = await fsp.stat(path.join(PUBLIC_DIR, name));
    list.push({ name, size: st.size, updatedAt: st.mtime.toISOString(), backups: all.filter((f) => f.startsWith(name + '.') && f.endsWith('.bak')).length });
  }
  send(res, 200, { files: list });
});
on('GET', /^\/api\/files\/([a-z.]+)$/, 'auth', async (req, res, ip, m) => {
  if (!filesAvailable(res)) return;
  if (EDITABLE.indexOf(m[1]) < 0) return fail(res, 404, 'not_found');
  send(res, 200, { name: m[1], content: await fsp.readFile(path.join(PUBLIC_DIR, m[1]), 'utf8') });
});
on('PUT', /^\/api\/files\/([a-z.]+)$/, 'auth', async (req, res, ip, m) => {
  if (!filesAvailable(res)) return;
  if (EDITABLE.indexOf(m[1]) < 0) return fail(res, 404, 'not_found');
  const body = await readJSONBody(req, SOURCE_MAX + 4096);
  if (typeof body.content !== 'string' || !body.content.trim() || body.content.length > SOURCE_MAX) return fail(res, 400, 'invalid', { fields: ['content'] });
  const file = path.join(PUBLIC_DIR, m[1]);
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  await fsp.copyFile(file, path.join(BACKUP_DIR, m[1] + '.' + Date.now() + '.bak'));
  const tmp = file + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  await fsp.writeFile(tmp, body.content); await fsp.rename(tmp, file);
  await audit(ip, 'file.save', m[1]);
  send(res, 200, { ok: true });
});
on('POST', /^\/api\/files\/([a-z.]+)\/restore$/, 'auth', async (req, res, ip, m) => {
  if (!filesAvailable(res)) return;
  if (EDITABLE.indexOf(m[1]) < 0) return fail(res, 404, 'not_found');
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const backups = (await fsp.readdir(BACKUP_DIR)).filter((f) => f.startsWith(m[1] + '.') && f.endsWith('.bak')).sort();
  if (!backups.length) return fail(res, 404, 'no_backup');
  const latest = backups[backups.length - 1], file = path.join(PUBLIC_DIR, m[1]);
  await fsp.copyFile(file, path.join(BACKUP_DIR, m[1] + '.' + Date.now() + '.replaced'));
  await fsp.writeFile(file, await fsp.readFile(path.join(BACKUP_DIR, latest), 'utf8'));
  await fsp.unlink(path.join(BACKUP_DIR, latest));
  await audit(ip, 'file.restore', m[1] + ' ' + latest);
  send(res, 200, { ok: true, restored: latest, backupsLeft: backups.length - 1 });
});

/* ------------------------------------------------------------- router */
async function handle(req, res) {
  const ip = clientIp(req);
  let url;
  try { url = new URL(req.url, 'http://local'); } catch (e) { return fail(res, 400, 'bad_url'); }
  let p = url.pathname;
  // On Vercel, /api/*, /uploads/*, /sitemap.xml and /robots.txt are rewritten to this one function (vercel.json).
  const forced = url.searchParams.get('__path');
  if (forced && (p === '/api' || p === '/api/index' || p === '/api/index.js')) p = forced;

  if (p.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (!sameOrigin(req)) return fail(res, 403, 'bad_origin');
      if (p !== '/api/track' && p !== '/api/uploads' && p !== '/api/logout' && !isJSON(req)) return fail(res, 415, 'json_required');
    }
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = p.match(r.pattern);
      if (!m) continue;
      if (r.need && !DB) return fail(res, 503, 'database_not_configured');
      let db = !!DB;
      if (DB && p !== '/api/track') {
        try { await init(); } catch (e) {
          console.error('[database] ' + e.message);
          if (r.need) return fail(res, 503, 'database_unavailable');
          db = false;                                  // public routes keep working without the database
        }
      }
      if (r.need === 'auth' && !(await isAuthed(req))) return fail(res, 401, 'login_required');
      return r.handler(req, res, ip, m, { db });
    }
    return fail(res, routes.some((r) => r.pattern.test(p)) ? 405 : 404, 'not_found');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'method_not_allowed');
  if (p.startsWith('/uploads/')) {
    const m = /^\/uploads\/([a-f0-9]{24}\.(jpg|png|webp))$/.exec(p);
    if (!m || !DB) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    await init();
    const f = await one('SELECT mime, data FROM uploads WHERE name = $1', [m[1]]);
    if (!f) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    return send(res, 200, req.method === 'HEAD' ? null : f.data, { 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  }
  if (p === '/admin') return send(res, 301, null, { Location: '/admin/' });
  if (p === '/robots.txt') {
    const base = PUBLIC_URL || ((TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https' ? 'https://' : 'http://') + req.headers.host);
    return send(res, 200, 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ' + base + '/sitemap.xml\n', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (p === '/sitemap.xml') {
    const base = PUBLIC_URL || ((TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https' ? 'https://' : 'http://') + req.headers.host);
    let updated = new Date().toISOString();
    try { if (DB) { await init(); updated = (await getContent()).updatedAt || updated; } } catch (e) { /* keep today */ }
    const urls = ['/', '/?lang=ky', '/?lang=ru'].map((u) => '  <url><loc>' + base + u.replace(/&/g, '&amp;') + '</loc><lastmod>' + updated.slice(0, 10) + '</lastmod></url>').join('\n');
    return send(res, 200, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n', { 'Content-Type': 'application/xml; charset=utf-8' });
  }
  return serveFile(req, res, PUBLIC_DIR, p === '/' ? 'index.html' : p.slice(1));
}

/* Wraps handle() so that every error becomes a JSON answer instead of a crash. */
async function handleSafe(req, res) {
  try { await handle(req, res); } catch (e) {
    if (e && e.status) return fail(res, e.status, e.message);
    console.error(e);
    if (!res.headersSent) fail(res, 500, 'server_error');
  }
}

module.exports = { handle: handleSafe, init, setPassword, DB, VERSION, hasDatabase: !!DB };
