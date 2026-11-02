#!/usr/bin/env node
/* Travel Horizon — server.
   Node.js 18+, built-in modules only. Serves the public site (public/), the admin panel (admin/)
   and a JSON API. All data lives in data/.

   Environment:
     HOST, PORT                 default 127.0.0.1:4173
     PUBLIC_URL                 e.g. https://travelhorizon.kg (sitemap, Secure cookie)
     ADMIN_PASSWORD             optional; otherwise data/auth.json (first start prints a password)
     TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   optional; requests and host applications go to this chat
     TRUST_PROXY=1              read client IP from X-Forwarded-For (behind Caddy/Nginx)
     DATA_DIR                   default ./data
     TIME_ZONE                  default Asia/Bishkek (analytics day boundaries)
   Commands:
     node server.js                    start
     node server.js set-password NEW   store a new admin password hash and exit */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const ADMIN_DIR = path.join(ROOT, 'admin');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const FILES = {
  content: path.join(DATA_DIR, 'content.json'),
  hosts: path.join(DATA_DIR, 'hosts.json'),
  requests: path.join(DATA_DIR, 'requests.json'),
  stats: path.join(DATA_DIR, 'stats.json'),
  auth: path.join(DATA_DIR, 'auth.json'),
  audit: path.join(DATA_DIR, 'audit.log')
};

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Bishkek';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = Number(process.env.LOGIN_BLOCK_SECONDS) > 0 ? Number(process.env.LOGIN_BLOCK_SECONDS) * 1000 : 15 * 60 * 1000;
const UPLOAD_MAX = 8 * 1024 * 1024;
const JSON_MAX = 256 * 1024;
const SOURCE_MAX = 1024 * 1024;
const EDITABLE = ['index.html', 'styles.css', 'script.js'];
const LANGS = ['en', 'ky', 'ru'];
const VERSION = '2.0.0';

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

/* ------------------------------------------------------------ storage */
const queues = new Map();
function writeAtomic(file, data) {
  const prev = queues.get(file) || Promise.resolve();
  const next = prev.then(async () => {
    const tmp = file + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
    await fsp.writeFile(tmp, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    await fsp.rename(tmp, file);
  });
  queues.set(file, next.catch(() => {}));
  return next;
}
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    if (e.code !== 'ENOENT') console.error('[data] could not read ' + path.basename(file) + ': ' + e.message);
    return fallback;
  }
}
function audit(ip, action, detail) {
  const line = new Date().toISOString() + ' ' + ip + ' ' + action + (detail ? ' ' + detail : '') + '\n';
  fsp.appendFile(FILES.audit, line).catch(() => {});
}

function ensureData() {
  for (const d of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(FILES.content)) {
    const en = TH.defaults.en;
    const content = { version: 2, updatedAt: new Date().toISOString(), hero: en.hero, journeys: en.journeys, land: en.land, destinations: {},
      contacts: { telegram: '', whatsapp: '', email: 'hello@travelhorizon.example' }, locales: { ky: {}, ru: {} } };
    fs.writeFileSync(FILES.content, JSON.stringify(content, null, 2));
  }
  if (!fs.existsSync(FILES.hosts)) {
    const now = new Date().toISOString();
    fs.writeFileSync(FILES.hosts, JSON.stringify(TH.exampleHosts.map((h) => Object.assign({}, h, { createdAt: now, updatedAt: now })), null, 2));
  }
  if (!fs.existsSync(FILES.requests)) fs.writeFileSync(FILES.requests, '[]');
  if (!fs.existsSync(FILES.stats)) fs.writeFileSync(FILES.stats, JSON.stringify({ days: {} }));
}

/* --------------------------------------------------------------- auth */
function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}
let AUTH = null;
function loadAuth() {
  if (process.env.ADMIN_PASSWORD) { AUTH = hashPassword(process.env.ADMIN_PASSWORD); return; }
  const saved = readJSON(FILES.auth, null);
  if (saved && saved.salt && saved.hash) { AUTH = saved; return; }
  const pw = crypto.randomBytes(9).toString('base64url');
  AUTH = hashPassword(pw);
  fs.writeFileSync(FILES.auth, JSON.stringify(AUTH));
  console.log('\n  ┌──────────────────────────────────────────────┐');
  console.log('  │  First start: admin password created          │');
  console.log('  │  Password: ' + pw.padEnd(35) + '│');
  console.log('  │  Change it: node server.js set-password NEW   │');
  console.log('  └──────────────────────────────────────────────┘\n');
}
function checkPassword(pw) {
  if (typeof pw !== 'string' || !pw.length || pw.length > 200) return false;
  const h = crypto.scryptSync(pw, AUTH.salt, 64);
  const expected = Buffer.from(AUTH.hash, 'hex');
  return h.length === expected.length && crypto.timingSafeEqual(h, expected);
}

const sessions = new Map();     // token -> expiresAt
const attempts = new Map();     // ip -> { count, blockedUntil }
function newSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  return token;
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isAuthed(req) {
  const t = cookies(req).th_admin;
  if (!t || !sessions.has(t)) return false;
  if (sessions.get(t) < Date.now()) { sessions.delete(t); return false; }
  return true;
}
function secureCookie(req) {
  return PUBLIC_URL.startsWith('https://') || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
}

/* ---------------------------------------------------------- rate limit */
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n += 1;
  return b.n > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  for (const [k, exp] of sessions) if (exp < now) sessions.delete(k);
  for (const [k, a] of attempts) if (a.blockedUntil && a.blockedUntil < now && !a.count) attempts.delete(k);
}, 60 * 1000).unref();

/* ------------------------------------------------------------ helpers */
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
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

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length'] || 0);
    if (len > limit) { const e = new Error('too_large'); e.status = 413; req.resume(); return reject(e); }
    const chunks = []; let size = 0; let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) { done = true; const e = new Error('too_large'); e.status = 413; req.resume(); reject(e); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
  });
}
async function readJSONBody(req, limit) {
  const buf = await readBody(req, limit || JSON_MAX);
  try { const v = JSON.parse(buf.toString('utf8') || '{}'); if (v && typeof v === 'object') return v; } catch (e) { /* fall through */ }
  const err = new Error('invalid_json'); err.status = 400; throw err;
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin);
    if (o.host === req.headers.host) return true;
    if (PUBLIC_URL && o.origin === new URL(PUBLIC_URL).origin) return true;
  } catch (e) { return false; }
  return false;
}
function isJSON(req) { return /^application\/json\b/i.test(req.headers['content-type'] || ''); }

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

/* ------------------------------------------------------------ telegram */
function telegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return Promise.resolve('off');
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: TG_CHAT, text: text.slice(0, 3900), disable_web_page_preview: true });
    const req = https.request({ hostname: 'api.telegram.org', path: '/bot' + TG_TOKEN + '/sendMessage', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 6000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200 ? 'sent' : 'failed');
    });
    req.on('timeout', () => { req.destroy(); resolve('failed'); });
    req.on('error', () => resolve('failed'));
    req.end(body);
  });
}

/* --------------------------------------------------------------- stats */
let STATS = null, statsDirty = false;
const EVENTS = ['visit', 'planner_seen', 'planner_result', 'request_open', 'request_sent', 'contact_click', 'host_apply'];
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
function today() { return dayFmt.format(new Date()); }
function count(event) {
  const d = today();
  STATS.days[d] = STATS.days[d] || {};
  STATS.days[d][event] = (STATS.days[d][event] || 0) + 1;
  statsDirty = true;
}
function flushStats() {
  if (!statsDirty) return Promise.resolve();
  statsDirty = false;
  return writeAtomic(FILES.stats, STATS);
}
setInterval(flushStats, 5000).unref();

/* ------------------------------------------------------- data in memory */
let CONTENT, HOSTS, REQUESTS;
function saveContent() { CONTENT.updatedAt = new Date().toISOString(); return writeAtomic(FILES.content, CONTENT); }
function saveHosts() { return writeAtomic(FILES.hosts, HOSTS); }
function saveRequests() { return writeAtomic(FILES.requests, REQUESTS); }
function publicHost(h) {
  return { id: h.id, example: !!h.example, name: h.name, type: h.type, region: h.region, languages: h.languages, about: h.about, aboutLang: h.aboutLang,
    offer: h.offer, image: h.image || '', showContacts: !!h.showContacts,
    contacts: h.showContacts ? { telegram: (h.contacts || {}).telegram || '', whatsapp: (h.contacts || {}).whatsapp || '' } : {} };
}
function newId(prefix) { return prefix + '-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'); }

/* -------------------------------------------------- content validation */
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

/* ---------------------------------------------------------- uploads */
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
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
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
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
function on(method, pattern, auth, handler) { routes.push({ method, pattern, auth, handler }); }

on('GET', /^\/api\/health$/, false, (req, res) => send(res, 200, { ok: true, version: VERSION, uptime: Math.round(process.uptime()), telegram: !!(TG_TOKEN && TG_CHAT) }));

on('GET', /^\/api\/content$/, false, (req, res) => send(res, 200, CONTENT));

on('PUT', /^\/api\/content$/, true, async (req, res, ip) => {
  const body = await readJSONBody(req);
  const r = validateContent(body);
  if (r.errors.length) return fail(res, 400, 'invalid', { fields: r.errors });
  if (r.lang === 'en') { CONTENT.hero = r.data.hero; CONTENT.journeys = r.data.journeys; CONTENT.land = r.data.land; CONTENT.destinations = r.data.destinations; }
  else { CONTENT.locales = CONTENT.locales || {}; CONTENT.locales[r.lang] = r.data; }
  await saveContent();
  audit(ip, 'content.save', r.lang);
  send(res, 200, { ok: true, updatedAt: CONTENT.updatedAt });
});

on('PUT', /^\/api\/contacts$/, true, async (req, res, ip) => {
  const body = await readJSONBody(req), v = new V();
  const telegram = v.str(body, 'telegram', 33).replace(/^@/, '');
  const whatsapp = v.str(body, 'whatsapp', 24);
  const email = v.str(body, 'email', 120);
  if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) v.errors.push('telegram');
  if (whatsapp && !/^\+?[0-9 ()-]{7,22}$/.test(whatsapp)) v.errors.push('whatsapp');
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) v.errors.push('email');
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  CONTENT.contacts = { telegram, whatsapp, email };
  await saveContent();
  audit(ip, 'contacts.save');
  send(res, 200, { ok: true });
});

on('POST', /^\/api\/login$/, false, async (req, res, ip) => {
  const now = Date.now();
  const a = attempts.get(ip) || { count: 0, blockedUntil: 0 };
  if (a.blockedUntil > now) return fail(res, 429, 'blocked', { retryAfterSeconds: Math.ceil((a.blockedUntil - now) / 1000) });
  if (a.blockedUntil && a.blockedUntil <= now) { a.blockedUntil = 0; a.count = 0; }
  const body = await readJSONBody(req, 4096);
  if (!checkPassword(body.password)) {
    a.count += 1;
    if (a.count >= MAX_ATTEMPTS) {
      a.blockedUntil = now + BLOCK_MS; a.count = 0; attempts.set(ip, a);
      audit(ip, 'login.blocked');
      return fail(res, 429, 'blocked', { retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) });
    }
    attempts.set(ip, a);
    audit(ip, 'login.fail');
    return fail(res, 401, 'wrong_password', { attemptsLeft: MAX_ATTEMPTS - a.count });
  }
  attempts.delete(ip);
  const token = newSession();
  audit(ip, 'login.ok');
  send(res, 200, { ok: true, expiresInSeconds: SESSION_MS / 1000 }, {
    'Set-Cookie': 'th_admin=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + (SESSION_MS / 1000) + (secureCookie(req) ? '; Secure' : '')
  });
});

on('POST', /^\/api\/logout$/, false, (req, res, ip) => {
  const t = cookies(req).th_admin;
  if (t) sessions.delete(t);
  audit(ip, 'logout');
  send(res, 200, { ok: true }, { 'Set-Cookie': 'th_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
});

on('GET', /^\/api\/session$/, false, (req, res) => send(res, 200, { authenticated: isAuthed(req) }));

on('POST', /^\/api\/uploads$/, true, async (req, res, ip) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!/^image\/(jpeg|png|webp)$/.test(ct.split(';')[0].trim())) return fail(res, 415, 'unsupported_type');
  const buf = await readBody(req, UPLOAD_MAX);
  const ext = sniffImage(buf);
  if (!ext) return fail(res, 415, 'not_an_image');
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
  await fsp.writeFile(path.join(UPLOAD_DIR, name), buf);
  audit(ip, 'upload', name + ' ' + buf.length);
  send(res, 201, { url: '/uploads/' + name, size: buf.length });
});

on('POST', /^\/api\/requests$/, false, async (req, res, ip) => {
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
    const h = HOSTS.find((x) => x.id === body.hostId && x.status === 'approved');
    if (!h) v.errors.push('hostId'); else { r.hostId = h.id; r.hostName = h.name; }
  }
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  REQUESTS.unshift(r);
  if (REQUESTS.length > 5000) REQUESTS.length = 5000;
  count('request_sent');
  const what = r.idea ? 'Idea: ' + r.idea + ' — ' + TH.routes.en[r.idea].title
    : r.place ? 'Place: ' + TH.places.en[r.place].name
      : r.hostId ? 'Host: ' + r.hostName + ' (' + r.hostId + ')' : 'General enquiry';
  const text = 'New request · Travel Horizon\n' + what + '\nName: ' + r.name + '\nContact: ' + r.contact +
    (r.country ? '\nCountry: ' + r.country : '') + (r.month ? '\nWhen: ' + r.month : '') + (r.group ? '\nTravellers: ' + r.group : '') +
    (r.note ? '\nNote: ' + r.note : '') + '\nLanguage: ' + r.lang.toUpperCase() + '\nTime: ' + r.createdAt;
  r.telegram = await telegram(text);
  await saveRequests();
  send(res, 201, { ok: true, id: r.id });
});

on('GET', /^\/api\/requests$/, true, (req, res) => send(res, 200, { requests: REQUESTS.slice(0, 500) }));

on('PATCH', /^\/api\/requests\/([a-z0-9-]+)$/, true, async (req, res, ip, m) => {
  const body = await readJSONBody(req, 2048);
  const r = REQUESTS.find((x) => x.id === m[1]);
  if (!r) return fail(res, 404, 'not_found');
  if (['new', 'progress', 'done'].indexOf(body.status) < 0) return fail(res, 400, 'invalid', { fields: ['status'] });
  if (r.status === 'new' && body.status !== 'new' && !r.firstResponseAt) r.firstResponseAt = new Date().toISOString();
  r.status = body.status; r.updatedAt = new Date().toISOString();
  await saveRequests();
  audit(ip, 'request.status', r.id + ' ' + r.status);
  send(res, 200, { ok: true, request: r });
});

/* hosts (P2P) */
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

on('GET', /^\/api\/hosts$/, false, (req, res) => send(res, 200, { hosts: HOSTS.filter((h) => h.status === 'approved').map(publicHost) }));

on('POST', /^\/api\/hosts\/apply$/, false, async (req, res, ip) => {
  const body = await readJSONBody(req, 32 * 1024);
  if (body.website) return send(res, 201, { ok: true });
  if (limited('host:' + ip, 3, 60 * 60 * 1000)) return fail(res, 429, 'too_many');
  const v = new V();
  const h = validateHost(body, v, false);
  if (body.consent !== true) v.errors.push('consent');
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  const now = new Date().toISOString();
  const host = Object.assign({ id: newId('h'), status: 'pending', example: false, createdAt: now, updatedAt: now, image: '' }, h);
  HOSTS.unshift(host);
  await saveHosts();
  count('host_apply');
  const c = host.contacts;
  await telegram('New host application · Travel Horizon\nName: ' + host.name + '\nType: ' + TH.ui.en.hostTypes[host.type] + '\nRegion: ' + TH.regions.en[host.region] +
    '\nOffer: ' + host.offer.title + ' (' + host.offer.duration + ')' + '\nContacts: ' + [c.telegram && '@' + c.telegram, c.whatsapp, c.email].filter(Boolean).join(', ') + '\nReview it in the admin panel → Hosts.');
  send(res, 201, { ok: true });
});

on('GET', /^\/api\/admin\/hosts$/, true, (req, res) => send(res, 200, { hosts: HOSTS }));

on('PATCH', /^\/api\/admin\/hosts\/([a-z0-9-]+)$/, true, async (req, res, ip, m) => {
  const body = await readJSONBody(req, 32 * 1024);
  const host = HOSTS.find((x) => x.id === m[1]);
  if (!host) return fail(res, 404, 'not_found');
  const v = new V();
  const upd = validateHost(body, v, true);
  if (Object.prototype.hasOwnProperty.call(body, 'status')) upd.status = v.oneOf(body.status, ['pending', 'approved', 'rejected'], 'status');
  if (v.errors.length) return fail(res, 400, 'invalid', { fields: v.errors });
  Object.assign(host, upd, { updatedAt: new Date().toISOString() });
  await saveHosts();
  audit(ip, 'host.update', host.id + (upd.status ? ' ' + upd.status : ''));
  send(res, 200, { ok: true, host });
});

on('DELETE', /^\/api\/admin\/hosts\/([a-z0-9-]+)$/, true, async (req, res, ip, m) => {
  const i = HOSTS.findIndex((x) => x.id === m[1]);
  if (i < 0) return fail(res, 404, 'not_found');
  HOSTS.splice(i, 1);
  await saveHosts();
  audit(ip, 'host.delete', m[1]);
  send(res, 200, { ok: true });
});

/* analytics */
on('POST', /^\/api\/track$/, false, async (req, res, ip) => {
  let body = {};
  try { body = JSON.parse((await readBody(req, 1024)).toString('utf8') || '{}'); } catch (e) { return send(res, 204); }
  if (limited('track:' + ip, 300, 60 * 60 * 1000)) return send(res, 204);
  if (['visit', 'planner_seen', 'planner_result', 'request_open', 'contact_click'].indexOf(body.event) >= 0) count(body.event);
  send(res, 204);
});

on('GET', /^\/api\/stats$/, true, (req, res) => {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayFmt.format(new Date(Date.now() - i * 86400000));
    const row = { date: d };
    EVENTS.forEach((e) => { row[e] = (STATS.days[d] && STATS.days[d][e]) || 0; });
    days.push(row);
  }
  const totals = {}; EVENTS.forEach((e) => { totals[e] = days.reduce((s, r) => s + r[e], 0); });
  const visits = totals.visit || 0;
  const since = Date.now() - 30 * 86400000, dayMs = 86400000;
  const recent = REQUESTS.filter((r) => Date.parse(r.createdAt) >= since);
  const eligible = recent.filter((r) => Date.now() - Date.parse(r.createdAt) >= dayMs || r.firstResponseAt);
  const fast = eligible.filter((r) => r.firstResponseAt && Date.parse(r.firstResponseAt) - Date.parse(r.createdAt) <= dayMs);
  send(res, 200, {
    days, totals,
    goals: {
      G1: { value: visits ? totals.planner_seen / visits * 100 : null, target: 40, unit: '%' },
      G2: { value: visits ? totals.planner_result / visits * 100 : null, target: 25, unit: 'per 100 visits' },
      G5: { value: visits ? totals.request_sent / visits * 100 : null, target: 3, unit: 'per 100 visits' },
      G6: { value: eligible.length ? fast.length / eligible.length * 100 : null, target: 90, unit: '%' }
    },
    hosts: { pending: HOSTS.filter((h) => h.status === 'pending').length, approved: HOSTS.filter((h) => h.status === 'approved').length },
    requests: { open: REQUESTS.filter((r) => r.status === 'new').length }
  });
});

/* advanced: source files */
on('GET', /^\/api\/files$/, true, async (req, res) => {
  const list = [];
  for (const name of EDITABLE) {
    const st = await fsp.stat(path.join(PUBLIC_DIR, name));
    const backups = (await fsp.readdir(BACKUP_DIR)).filter((f) => f.startsWith(name + '.') && f.endsWith('.bak')).length;
    list.push({ name, size: st.size, updatedAt: st.mtime.toISOString(), backups });
  }
  send(res, 200, { files: list });
});
on('GET', /^\/api\/files\/([a-z.]+)$/, true, async (req, res, ip, m) => {
  if (EDITABLE.indexOf(m[1]) < 0) return fail(res, 404, 'not_found');
  send(res, 200, { name: m[1], content: await fsp.readFile(path.join(PUBLIC_DIR, m[1]), 'utf8') });
});
on('PUT', /^\/api\/files\/([a-z.]+)$/, true, async (req, res, ip, m) => {
  if (EDITABLE.indexOf(m[1]) < 0) return fail(res, 404, 'not_found');
  const body = await readJSONBody(req, SOURCE_MAX + 4096);
  if (typeof body.content !== 'string' || !body.content.trim() || body.content.length > SOURCE_MAX) return fail(res, 400, 'invalid', { fields: ['content'] });
  const file = path.join(PUBLIC_DIR, m[1]);
  await fsp.copyFile(file, path.join(BACKUP_DIR, m[1] + '.' + Date.now() + '.bak'));
  await writeAtomic(file, body.content);
  audit(ip, 'file.save', m[1]);
  send(res, 200, { ok: true });
});
on('POST', /^\/api\/files\/([a-z.]+)\/restore$/, true, async (req, res, ip, m) => {
  if (EDITABLE.indexOf(m[1]) < 0) return fail(res, 404, 'not_found');
  const backups = (await fsp.readdir(BACKUP_DIR)).filter((f) => f.startsWith(m[1] + '.') && f.endsWith('.bak')).sort();
  if (!backups.length) return fail(res, 404, 'no_backup');
  const latest = backups[backups.length - 1], file = path.join(PUBLIC_DIR, m[1]);
  await fsp.copyFile(file, path.join(BACKUP_DIR, m[1] + '.' + Date.now() + '.replaced'));
  await writeAtomic(file, await fsp.readFile(path.join(BACKUP_DIR, latest), 'utf8'));
  await fsp.unlink(path.join(BACKUP_DIR, latest));
  audit(ip, 'file.restore', m[1] + ' ' + latest);
  send(res, 200, { ok: true, restored: latest, backupsLeft: backups.length - 1 });
});

/* ------------------------------------------------------------- server */
async function handle(req, res) {
  const ip = clientIp(req);
  let url;
  try { url = new URL(req.url, 'http://local'); } catch (e) { return fail(res, 400, 'bad_url'); }
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (!sameOrigin(req)) return fail(res, 403, 'bad_origin');
      if (p !== '/api/track' && p !== '/api/uploads' && p !== '/api/logout' && !isJSON(req)) return fail(res, 415, 'json_required');
    }
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = p.match(r.pattern);
      if (!m) continue;
      if (r.auth && !isAuthed(req)) return fail(res, 401, 'login_required');
      return r.handler(req, res, ip, m);
    }
    return fail(res, routes.some((r) => r.pattern.test(p)) ? 405 : 404, 'not_found');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'method_not_allowed');
  if (p.startsWith('/uploads/')) {
    if (!/^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(p)) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    return serveFile(req, res, UPLOAD_DIR, p.slice('/uploads/'.length), 'public, max-age=31536000, immutable');
  }
  if (p === '/admin') return send(res, 301, null, { Location: '/admin/' });
  if (p.startsWith('/admin/')) return serveFile(req, res, ADMIN_DIR, p.slice('/admin/'.length) || 'index.html');
  if (p === '/robots.txt') {
    return send(res, 200, 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n' + (PUBLIC_URL ? 'Sitemap: ' + PUBLIC_URL + '/sitemap.xml\n' : ''), { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (p === '/sitemap.xml') {
    const base = PUBLIC_URL || ('http://' + req.headers.host);
    const urls = ['/', '/?lang=ky', '/?lang=ru'].map((u) => '  <url><loc>' + base + u.replace(/&/g, '&amp;') + '</loc><lastmod>' + (CONTENT.updatedAt || '').slice(0, 10) + '</lastmod></url>').join('\n');
    return send(res, 200, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n', { 'Content-Type': 'application/xml; charset=utf-8' });
  }
  return serveFile(req, res, PUBLIC_DIR, p === '/' ? 'index.html' : p.slice(1));
}

function start() {
  ensureData();
  loadAuth();
  CONTENT = readJSON(FILES.content, null);
  if (!CONTENT) { console.error('data/content.json is not valid JSON. Fix or delete it, then restart.'); process.exit(1); }
  CONTENT.locales = CONTENT.locales || {};
  CONTENT.contacts = CONTENT.contacts || { telegram: '', whatsapp: '', email: '' };
  CONTENT.destinations = CONTENT.destinations || {};
  HOSTS = readJSON(FILES.hosts, []);
  REQUESTS = readJSON(FILES.requests, []);
  STATS = readJSON(FILES.stats, { days: {} });
  STATS.days = STATS.days || {};

  const server = http.createServer((req, res) => {
    Promise.resolve(handle(req, res)).catch((e) => {
      if (e && e.status) return fail(res, e.status, e.message);
      console.error(e);
      if (!res.headersSent) fail(res, 500, 'server_error');
    });
  });
  server.headersTimeout = 20000;
  server.requestTimeout = 60000;
  server.listen(PORT, HOST, () => {
    console.log('Travel Horizon ' + VERSION + ' → http://' + HOST + ':' + PORT + '  (admin: /admin/)');
    console.log('Telegram notifications: ' + (TG_TOKEN && TG_CHAT ? 'on' : 'off (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)'));
  });
  const stop = () => { flushStats().finally(() => process.exit(0)); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[2] === 'set-password') {
  const pw = process.argv[3];
  if (!pw || pw.length < 10) { console.error('Usage: node server.js set-password <new password, at least 10 characters>'); process.exit(1); }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILES.auth, JSON.stringify(hashPassword(pw)));
  console.log('Admin password updated. Restart the server; existing sessions end on restart.');
} else {
  start();
}
