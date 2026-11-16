/* Telegram delivery for requests and host applications.
   TELEGRAM_BOT_TOKEN  — from @BotFather.
   TELEGRAM_CHAT_ID    — the chat that receives messages. If empty, the chat of the latest message
                         sent to the bot is used (works only when the bot has no webhook). */
'use strict';

async function call(token, method, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}), signal: ctrl.signal
    });
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function chatId(token) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const r = await call(token, 'getUpdates', { limit: 20 });
  const ups = (r && r.ok && r.result) || [];
  for (let i = ups.length - 1; i >= 0; i--) {
    const m = ups[i].message || ups[i].channel_post || ups[i].my_chat_member;
    if (m && m.chat && m.chat.id) { console.log('[telegram] TELEGRAM_CHAT_ID not set; using chat ' + m.chat.id); return String(m.chat.id); }
  }
  if (r && !r.ok) console.error('[telegram] getUpdates: ' + r.description);
  return '';
}

/* Returns 'sent', 'failed' or 'off' (no token configured). */
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 'off';
  try {
    const id = await chatId(token);
    if (!id) return 'failed';
    const r = await call(token, 'sendMessage', { chat_id: id, text: String(text).slice(0, 3900), disable_web_page_preview: true });
    if (!r || !r.ok) console.error('[telegram] sendMessage: ' + (r && r.description));
    return r && r.ok ? 'sent' : 'failed';
  } catch (e) {
    console.error('[telegram] ' + e.message);
    return 'failed';
  }
}

module.exports = { sendTelegram };
