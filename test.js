#!/usr/bin/env node
/* Travel Horizon — acceptance checks (ТЗ v2, section 12).
   Starts its own server on a spare port with a temporary data folder, runs the checks, stops it.
   Usage: node test.js */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const PORT = 4300 + Math.floor(Math.random() * 500);
const BASE = 'http://127.0.0.1:' + PORT;
const PASSWORD = 'test-password-123';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'th-test-'));
let passed = 0, failed = 0;

function check(name, ok, detail) {
  if (ok) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (detail ? '  → ' + detail : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = '';
async function call(method, url, body, opts) {
  opts = opts || {};
  const headers = Object.assign({}, opts.headers || {});
  if (cookie && !opts.noCookie) headers.Cookie = cookie;
  let payload = body;
  if (body !== undefined && !Buffer.isBuffer(body) && typeof body !== 'string') { payload = JSON.stringify(body); headers['Content-Type'] = headers['Content-Type'] || 'application/json'; }
  const res = await fetch(BASE + url, { method, headers, body: payload, redirect: 'manual' });
  const set = res.headers.get('set-cookie');
  if (set && /th_admin=/.test(set)) cookie = set.split(';')[0];
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ }
  return { status: res.status, json, text, headers: res.headers };
}

function loadTH() {
  const sb = { window: {} }; sb.window = sb; vm.createContext(sb);
  for (const f of ['translations.js', 'catalog.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'public', f), 'utf8'), sb);
  return sb.TH;
}
function keysDeep(o, prefix) {
  if (Array.isArray(o)) return o.flatMap((v, i) => keysDeep(v, prefix + '[' + i + ']'));
  if (o && typeof o === 'object') return Object.keys(o).flatMap((k) => keysDeep(o[k], prefix ? prefix + '.' + k : k));
  return [prefix];
}
function emptyDeep(o, prefix) { return keysDeep(o, prefix).filter((k) => { const v = k.split(/\.|\[|\]/).filter(Boolean).reduce((a, x) => a[x], o); return typeof v === 'string' && !v.trim(); }); }

async function main() {
  console.log('\nTranslations and planner');
  const TH = loadTH();
  let routesOk = 0;
  for (const lang of ['en', 'ky', 'ru']) for (const m of TH.moods) for (const d of TH.durations) {
    const r = TH.routes[lang][m + '-' + d];
    if (r && r.title && r.text && r.season && r.start && r.stops.length >= 3) routesOk++;
  }
  check('AC-02 all 9 planner combinations have a result in each of 3 languages (27)', routesOk === 27, routesOk + '/27');
  const enUi = keysDeep(TH.ui.en, '').sort().join('|');
  for (const lang of ['ky', 'ru']) {
    check('AC-01 ' + lang.toUpperCase() + ' has every interface text that EN has', keysDeep(TH.ui[lang], '').sort().join('|') === enUi);
    check('AC-01 ' + lang.toUpperCase() + ' has no empty interface text', emptyDeep(TH.ui[lang], '').length === 0, emptyDeep(TH.ui[lang], '').join(', '));
    check('AC-01 ' + lang.toUpperCase() + ' default content, FAQ, Before-you-go and 10 places are complete',
      keysDeep(TH.defaults[lang], '').length === keysDeep(TH.defaults.en, '').length && TH.faq[lang].length === TH.faq.en.length &&
      TH.before[lang].length === TH.before.en.length && Object.keys(TH.places[lang]).length === 10);
  }

  console.log('\nServer');
  const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: DATA, ADMIN_PASSWORD: PASSWORD, LOGIN_BLOCK_SECONDS: '2', TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = ''; server.stdout.on('data', (d) => { log += d; }); server.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50; i++) { try { const h = await call('GET', '/api/health'); if (h.status === 200) break; } catch (e) { /* not up yet */ } await sleep(100); }

  try {
    const home = await call('GET', '/');
    check('home page is served with a Content Security Policy', home.status === 200 && /default-src 'self'/.test(home.headers.get('content-security-policy') || ''));
    check('robots.txt and sitemap.xml exist', (await call('GET', '/robots.txt')).status === 200 && /<urlset/.test((await call('GET', '/sitemap.xml')).text));
    check('path traversal is blocked', [403, 404].indexOf((await call('GET', '/..%2fserver.js')).status) >= 0);

    console.log('\nLogin (AC-03)');
    check('content cannot be saved without login', (await call('PUT', '/api/content', { lang: 'en' })).status === 401);
    let last;
    for (let i = 1; i <= 5; i++) last = await call('POST', '/api/login', { password: 'wrong-' + i });
    check('5 wrong passwords block login', last.status === 429 && last.json.error === 'blocked', JSON.stringify(last.json));
    const during = await call('POST', '/api/login', { password: PASSWORD });
    check('the correct password is refused while blocked', during.status === 429);
    await sleep(2300);
    const after = await call('POST', '/api/login', { password: PASSWORD });
    check('the correct password works after the block time', after.status === 200 && !!cookie);
    check('session cookie is HttpOnly and SameSite=Strict', /HttpOnly/.test(after.headers.get('set-cookie')) && /SameSite=Strict/.test(after.headers.get('set-cookie')));

    console.log('\nContent (AC-04, AC-07)');
    const before = (await call('GET', '/api/content')).json;
    const good = { lang: 'en', hero: Object.assign({}, before.hero, { titleLine: 'Where the rivers' }), journeys: before.journeys, land: before.land, destinations: {} };
    const saved = await call('PUT', '/api/content', good);
    const reread = (await call('GET', '/api/content', undefined, { noCookie: true })).json;
    check('AC-04 an admin saves a text and a visitor sees it', saved.status === 200 && reread.hero.titleLine === 'Where the rivers');
    const ky = await call('PUT', '/api/content', { lang: 'ky', hero: { titleLine: 'Тоолор' }, journeys: [{}, {}, {}], land: {}, destinations: { 'song-kul': { name: 'Соң-Көл көлү' } } });
    const kyRead = (await call('GET', '/api/content')).json;
    check('AC-04 Kyrgyz content is saved separately; empty fields are allowed', ky.status === 200 && kyRead.locales.ky.hero.titleLine === 'Тоолор' && kyRead.hero.titleLine === 'Where the rivers' && kyRead.locales.ky.destinations['song-kul'].name === 'Соң-Көл көлү');
    const noTitle = await call('PUT', '/api/content', Object.assign({}, good, { hero: Object.assign({}, good.hero, { titleLine: '' }) }));
    const httpImg = await call('PUT', '/api/content', Object.assign({}, good, { land: Object.assign({}, good.land, { image: 'http://example.com/a.jpg' }) }));
    const twoCards = await call('PUT', '/api/content', Object.assign({}, good, { journeys: good.journeys.slice(0, 2) }));
    const js = await call('PUT', '/api/content', Object.assign({}, good, { land: Object.assign({}, good.land, { image: 'javascript:alert(1)' }) }));
    const unchanged = (await call('GET', '/api/content')).json;
    check('AC-07 missing title, http link, javascript link, 2 cards are all rejected', [noTitle, httpImg, twoCards, js].every((r) => r.status === 400), [noTitle, httpImg, twoCards, js].map((r) => r.status).join(','));
    check('AC-07 a rejected save changes nothing', unchanged.hero.titleLine === 'Where the rivers' && unchanged.journeys.length === 3);
    check('a request from another site is refused', (await call('PUT', '/api/content', good, { headers: { Origin: 'https://evil.example' } })).status === 403);
    const contacts = await call('PUT', '/api/contacts', { telegram: '@travel_horizon', whatsapp: '+996 555 000 000', email: 'hello@travelhorizon.example' });
    check('contacts are saved', contacts.status === 200 && (await call('GET', '/api/content')).json.contacts.telegram === 'travel_horizon');

    console.log('\nUploads (AC-06)');
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
    const up = await call('POST', '/api/uploads', png, { headers: { 'Content-Type': 'image/png' } });
    check('a real PNG is accepted', up.status === 201 && /^\/uploads\/[a-f0-9]{24}\.png$/.test(up.json.url));
    const served = up.json ? await call('GET', up.json.url) : { status: 0, headers: new Map() };
    check('the uploaded photo is served as an image', served.status === 200 && served.headers.get('content-type') === 'image/png');
    check('a text file pretending to be a JPEG is rejected', (await call('POST', '/api/uploads', Buffer.from('<script>alert(1)</script>'), { headers: { 'Content-Type': 'image/jpeg' } })).status === 415);
    const big = Buffer.alloc(8 * 1024 * 1024 + 10, 0); png.copy(big);
    check('a file over 8 MB is rejected', (await call('POST', '/api/uploads', big, { headers: { 'Content-Type': 'image/png' } })).status === 413);
    check('a GIF type is rejected', (await call('POST', '/api/uploads', png, { headers: { 'Content-Type': 'image/gif' } })).status === 415);

    console.log('\nRequests (AC-05)');
    const savedCookie = cookie; cookie = '';
    const rq = await call('POST', '/api/requests', { kind: 'trip', idea: 'lakes-5', name: 'Anna', contact: 'anna@example.com', country: 'Germany', month: 'July 2027', group: 2, note: 'Two adults', lang: 'en' });
    check('AC-05 a visitor sends a trip request', rq.status === 201);
    const hostReq = await call('POST', '/api/requests', { kind: 'host', hostId: 'example-aigul', name: 'Tom', contact: '@tom_travels' });
    check('a traveller can message an approved host through the site', hostReq.status === 201);
    check('a message to a host that does not exist is rejected', (await call('POST', '/api/requests', { kind: 'host', hostId: 'nobody', name: 'Tom', contact: '@tom_travels' })).status === 400);
    check('a request with a made-up idea is rejected', (await call('POST', '/api/requests', { kind: 'trip', idea: 'lakes-99', name: 'X', contact: 'xxx@x.io' })).status === 400);
    check('a request without contact is rejected', (await call('POST', '/api/requests', { kind: 'general', name: 'X', contact: '' })).status === 400);
    check('a spam bot filling the hidden field gets a fake OK', (await call('POST', '/api/requests', { kind: 'general', name: 'bot', contact: 'bot@bot.io', website: 'spam' })).status === 201);
    const flood = [];
    for (let i = 0; i < 6; i++) flood.push((await call('POST', '/api/requests', { kind: 'general', name: 'F' + i, contact: 'f@f.io' })).status);
    check('more than 5 requests in 10 minutes from one address are refused', flood.indexOf(429) >= 0, flood.join(','));
    cookie = savedCookie;
    const list = (await call('GET', '/api/requests')).json.requests;
    const anna = list.find((r) => r.name === 'Anna');
    check('AC-05 the request is in the admin inbox with status New', !!anna && anna.status === 'new' && anna.idea === 'lakes-5' && anna.telegram === 'off');
    const st = await call('PATCH', '/api/requests/' + anna.id, { status: 'progress' });
    check('the request status can be changed', st.status === 200 && st.json.request.status === 'progress' && !!st.json.request.firstResponseAt);
    check('the inbox is closed to visitors', (await call('GET', '/api/requests', undefined, { noCookie: true })).status === 401);

    console.log('\nLocal hosts (AC-11, AC-12, AC-13)');
    cookie = '';
    const app = await call('POST', '/api/hosts/apply', { name: 'Test Host', type: 'guide', region: 'naryn', languages: ['ky', 'en'], about: 'I guide treks around Song-Kul in summer.', aboutLang: 'en', offer: { title: 'Day hike', duration: '1 day', priceFrom: 40 }, contacts: { telegram: 'testhost1', email: 'secret@host.example' }, showContacts: true, consent: true });
    check('a local can apply to become a host', app.status === 201);
    check('an application without consent is rejected', (await call('POST', '/api/hosts/apply', { name: 'No', type: 'guide', region: 'naryn', languages: ['ky'], about: 'Long enough about text here.', aboutLang: 'ky', offer: { title: 'x', duration: '1' }, contacts: { telegram: 'nohost1' } })).status === 400);
    let pub = (await call('GET', '/api/hosts')).json.hosts;
    check('AC-11 a new application is not public until approved', !pub.some((h) => h.name === 'Test Host'));
    cookie = savedCookie;
    const pending = (await call('GET', '/api/admin/hosts')).json.hosts.find((h) => h.name === 'Test Host');
    await call('PATCH', '/api/admin/hosts/' + pending.id, { status: 'approved' });
    pub = (await call('GET', '/api/hosts', undefined, { noCookie: true })).json.hosts;
    const shown = pub.find((h) => h.name === 'Test Host');
    check('an approved host appears on the site', !!shown);
    check('AC-13 the public hosts list never contains email or pending profiles', !JSON.stringify(pub).includes('secret@host.example') && pub.every((h) => !h.status));
    await call('PATCH', '/api/admin/hosts/' + pending.id, { status: 'rejected' });
    pub = (await call('GET', '/api/hosts', undefined, { noCookie: true })).json.hosts;
    check('AC-12 a rejected host disappears from the public list', !pub.some((h) => h.name === 'Test Host'));
    check('example hosts are shipped and marked as examples', pub.length >= 6 && pub.every((h) => h.example));

    console.log('\nAnalytics and files');
    for (const ev of ['visit', 'visit', 'planner_seen', 'planner_result', 'bogus']) await call('POST', '/api/track', JSON.stringify({ event: ev }), { headers: { 'Content-Type': 'text/plain' }, noCookie: true });
    await sleep(100);
    const stats = (await call('GET', '/api/stats')).json;
    check('visits, planner use and requests are counted', stats.totals.visit === 2 && stats.totals.planner_seen === 1 && stats.totals.request_sent >= 2 && stats.goals.G1.value === 50, JSON.stringify(stats.totals));
    const files = (await call('GET', '/api/files')).json.files.map((f) => f.name).join(',');
    check('only index.html, styles.css, script.js are editable', files === 'index.html,styles.css,script.js');
    check('other files cannot be read through the files API', (await call('GET', '/api/files/server.js')).status === 404);

    console.log('\nSign out');
    await call('POST', '/api/logout');
    check('after sign out the admin API is closed', (await call('GET', '/api/requests')).status === 401);
    const audit = fs.readFileSync(path.join(DATA, 'audit.log'), 'utf8');
    check('admin actions are written to the audit log', /content\.save/.test(audit) && /login\.blocked/.test(audit) && /host\.update/.test(audit));
  } catch (e) {
    failed++; console.log('  ✗ test run crashed: ' + e.stack);
  } finally {
    server.kill('SIGTERM');
    await sleep(200);
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
  if (failed) { console.log(log); process.exit(1); }
}
main();
