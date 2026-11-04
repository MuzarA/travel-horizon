/* Shared helpers for the Vercel functions: field checks, simple rate limit, Telegram delivery.
   Settings (Vercel → Project → Settings → Environment Variables):
     TELEGRAM_BOT_TOKEN   required, from @BotFather
     TELEGRAM_CHAT_ID     recommended; if empty, the chat of the latest message sent to the bot is used */
'use strict';

const IDEAS = {
  'lakes-3': 'A little taste of Issyk-Kul', 'lakes-5': 'The lake, at your own pace', 'lakes-7': 'Around the big blue',
  'trails-3': 'A foothold in the mountains', 'trails-5': 'Into the Ala-Kul country', 'trails-7': 'The long way to the high places',
  'culture-3': 'A first taste of nomad life', 'culture-5': 'Meet the makers and herders', 'culture-7': 'Life between the pastures'
};
const PLACES = {
  'issyk-kul': 'Issyk-Kul', 'ala-archa': 'Ala-Archa', 'sary-chelek': 'Sary-Chelek', 'song-kul': 'Song-Kul', 'karakol': 'Karakol',
  'jeti-oguz': 'Jeti-Oguz', 'ala-kul': 'Ala-Kul', 'kochkor': 'Kochkor', 'tash-rabat': 'Tash-Rabat', 'arslanbob': 'Arslanbob'
};
const HOST_TYPES = { guide: 'Mountain guide', yurt: 'Yurt stay', driver: 'Driver', horse: 'Horse trekking', craft: 'Craft workshop', food: 'Home cooking' };
const REGIONS = { bishkek: 'Bishkek', chuy: 'Chuy', issykkul: 'Issyk-Kul', naryn: 'Naryn', jalalabad: 'Jalal-Abad', osh: 'Osh', talas: 'Talas', batken: 'Batken' };
const LANGS = ['en', 'ky', 'ru'];
const SPOKEN = ['en', 'ky', 'ru', 'de', 'fr', 'zh', 'tr', 'ko', 'ja', 'es'];

function clean(v, multiline) {
  let s = String(v == null ? '' : v);
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return s.trim();
}
function str(errors, obj, key, max, opts) {
  opts = opts || {};
  const raw = obj ? obj[key] : undefined;
  if (raw != null && typeof raw !== 'string' && typeof raw !== 'number') { errors.push(opts.name || key); return ''; }
  const s = clean(raw, opts.multiline);
  if ((opts.required && !s) || s.length > max || (opts.min && s && s.length < opts.min)) errors.push(opts.name || key);
  return s;
}

/* Best-effort limit per function instance (serverless instances do not share memory). */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let b = hits.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; hits.set(key, b); }
  b.n += 1;
  return b.n > max;
}
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}
function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return null; }
}

async function tgCall(token, method, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}), signal: ctrl.signal
    });
    return await res.json();
  } finally { clearTimeout(timer); }
}
async function resolveChatId(token) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const r = await tgCall(token, 'getUpdates', { limit: 20 });
  const ups = (r && r.ok && r.result) || [];
  for (let i = ups.length - 1; i >= 0; i--) {
    const m = ups[i].message || ups[i].channel_post || ups[i].my_chat_member;
    if (m && m.chat && m.chat.id) {
      console.log('[telegram] TELEGRAM_CHAT_ID not set; using chat from getUpdates: ' + m.chat.id);
      return String(m.chat.id);
    }
  }
  return '';
}
/* Returns 'sent', 'failed' or 'off'. */
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 'off';
  try {
    const chatId = await resolveChatId(token);
    if (!chatId) return 'failed';
    const r = await tgCall(token, 'sendMessage', { chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true });
    return r && r.ok ? 'sent' : 'failed';
  } catch (e) { return 'failed'; }
}

module.exports = { IDEAS, PLACES, HOST_TYPES, REGIONS, LANGS, SPOKEN, str, limited, clientIp, sameOrigin, readBody, sendTelegram };
