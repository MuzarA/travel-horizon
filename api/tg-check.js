/* Preview-only diagnostics for the Telegram connection. Never returns the token. */
'use strict';
module.exports = async (req, res) => {
  if (process.env.VERCEL_ENV === 'production') return res.status(404).json({ error: 'not_found' });
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const out = { env: process.env.VERCEL_ENV, node: process.version, hasToken: !!token, tokenShape: /^\d+:[\w-]{30,}$/.test(token), chatIdSet: !!process.env.TELEGRAM_CHAT_ID };
  const call = async (m, p) => {
    try {
      const r = await fetch('https://api.telegram.org/bot' + token + '/' + m, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
      return await r.json();
    } catch (e) { return { ok: false, fetchError: String(e && e.message || e) }; }
  };
  if (token) {
    const me = await call('getMe');
    out.getMe = me.ok ? { ok: true, username: me.result.username } : me;
    const wh = await call('getWebhookInfo');
    out.webhook = wh.ok ? { url: wh.result.url ? '(set)' : '', pending: wh.result.pending_update_count } : wh;
    const up = await call('getUpdates', { limit: 20 });
    out.getUpdates = up.ok ? { ok: true, count: up.result.length, chats: up.result.map(u => { const m = u.message || u.channel_post || u.my_chat_member || {}; return m.chat ? { id: m.chat.id, type: m.chat.type } : null; }) } : up;
    if (req.query && req.query.send === '1' && up.ok && up.result.length) {
      const u = up.result[up.result.length - 1]; const m = u.message || u.channel_post || u.my_chat_member;
      const s = await call('sendMessage', { chat_id: m.chat.id, text: '✅ Nomad Horizon: тест связи сайта с ботом' });
      out.send = s.ok ? { ok: true } : s;
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
};
