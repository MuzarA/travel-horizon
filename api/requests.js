/* POST /api/requests — a trip request, a question about a place, a message to a host or a general enquiry.
   Sends it to the company Telegram chat. */
'use strict';
const t = require('./_lib/telegram');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!t.sameOrigin(req)) return res.status(403).json({ error: 'bad_origin' });
  const body = t.readBody(req);
  if (!body) return res.status(400).json({ error: 'invalid_json' });
  if (body.website) return res.status(201).json({ ok: true });                       // honeypot
  if (t.limited('req:' + t.clientIp(req), 5, 10 * 60 * 1000)) return res.status(429).json({ error: 'too_many' });

  const errors = [];
  const kind = ['trip', 'place', 'host', 'general'].indexOf(body.kind) >= 0 ? body.kind : (errors.push('kind'), '');
  const name = t.str(errors, body, 'name', 80, { required: true });
  const contact = t.str(errors, body, 'contact', 120, { required: true, min: 3 });
  const country = t.str(errors, body, 'country', 60);
  const month = t.str(errors, body, 'month', 40);
  const note = t.str(errors, body, 'note', 800, { multiline: true });
  const lang = t.LANGS.indexOf(body.lang) >= 0 ? body.lang : 'en';
  let group = '';
  if (body.group !== undefined && body.group !== '' && body.group !== null) {
    const g = Number(body.group);
    if (!Number.isInteger(g) || g < 1 || g > 99) errors.push('group'); else group = g;
  }
  let what = 'General enquiry';
  if (kind === 'trip') { if (!t.IDEAS[body.idea]) errors.push('idea'); else what = 'Trip idea: ' + t.IDEAS[body.idea] + ' (' + body.idea + ')'; }
  if (kind === 'place') { if (!t.PLACES[body.place]) errors.push('place'); else what = 'Question about: ' + t.PLACES[body.place]; }
  if (kind === 'host') { if (!/^[a-z0-9-]{3,60}$/.test(String(body.hostId || ''))) errors.push('hostId'); else what = 'Message to host: ' + body.hostId; }
  if (errors.length) return res.status(400).json({ error: 'invalid', fields: errors });

  const text = '🧭 New request · Nomad Horizon\n' + what + '\nName: ' + name + '\nContact: ' + contact +
    (country ? '\nCountry: ' + country : '') + (month ? '\nWhen: ' + month : '') + (group ? '\nTravellers: ' + group : '') +
    (note ? '\nNote: ' + note : '') + '\nLanguage: ' + lang.toUpperCase() + '\nTime: ' + new Date().toISOString();
  const telegram = await t.sendTelegram(text);
  if (telegram !== 'sent') return res.status(502).json({ error: 'delivery_failed', telegram });
  return res.status(201).json({ ok: true });
};
