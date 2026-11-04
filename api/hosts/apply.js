/* POST /api/hosts/apply — a local person applies to become a host. Sent to the company Telegram chat for review. */
'use strict';
const t = require('../_lib/telegram');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!t.sameOrigin(req)) return res.status(403).json({ error: 'bad_origin' });
  const body = t.readBody(req);
  if (!body) return res.status(400).json({ error: 'invalid_json' });
  if (body.website) return res.status(201).json({ ok: true });
  if (t.limited('host:' + t.clientIp(req), 3, 60 * 60 * 1000)) return res.status(429).json({ error: 'too_many' });

  const errors = [];
  const name = t.str(errors, body, 'name', 80, { required: true });
  if (!t.HOST_TYPES[body.type]) errors.push('type');
  if (!t.REGIONS[body.region]) errors.push('region');
  const langs = Array.isArray(body.languages) ? body.languages.filter((l) => t.SPOKEN.indexOf(l) >= 0) : [];
  if (!langs.length) errors.push('languages');
  const about = t.str(errors, body, 'about', 1500, { required: true, min: 20, multiline: true });
  const offer = body.offer || {};
  const offerTitle = t.str(errors, offer, 'title', 120, { required: true, name: 'offerTitle' });
  const offerDuration = t.str(errors, offer, 'duration', 40, { required: true, name: 'offerDuration' });
  let price = '';
  if (offer.priceFrom !== null && offer.priceFrom !== undefined && offer.priceFrom !== '') {
    const p = Number(offer.priceFrom);
    if (!Number.isFinite(p) || p < 0 || p > 100000) errors.push('priceFrom'); else price = Math.round(p) + ' USD';
  }
  const c = body.contacts || {};
  const tg = t.str(errors, c, 'telegram', 33, { name: 'telegram' }).replace(/^@/, '');
  const wa = t.str(errors, c, 'whatsapp', 24, { name: 'whatsapp' });
  const em = t.str(errors, c, 'email', 120, { name: 'email' });
  if (tg && !/^[A-Za-z0-9_]{5,32}$/.test(tg)) errors.push('telegram');
  if (wa && !/^\+?[0-9 ()-]{7,22}$/.test(wa)) errors.push('whatsapp');
  if (em && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(em)) errors.push('email');
  if (!tg && !wa && !em) errors.push('telegram');
  if (body.consent !== true) errors.push('consent');
  if (errors.length) return res.status(400).json({ error: 'invalid', fields: errors });

  const text = '🏕 New host application · Nomad Horizon\nName: ' + name + '\nType: ' + t.HOST_TYPES[body.type] + '\nRegion: ' + t.REGIONS[body.region] +
    '\nLanguages: ' + langs.join(', ') + '\nOffer: ' + offerTitle + ' (' + offerDuration + ')' + (price ? '\nPrice from: ' + price : '') +
    '\nAbout: ' + about + '\nContacts: ' + [tg && '@' + tg, wa, em].filter(Boolean).join(', ') +
    '\nShow contacts publicly: ' + (body.showContacts === true ? 'yes' : 'no') + '\nTime: ' + new Date().toISOString();
  const telegram = await t.sendTelegram(text);
  if (telegram !== 'sent') return res.status(502).json({ error: 'delivery_failed', telegram });
  return res.status(201).json({ ok: true });
};
