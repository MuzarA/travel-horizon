/* POST /api/track — on the static Vercel version analytics are not stored; answer quietly so the browser does not log errors. */
'use strict';
module.exports = (req, res) => { res.status(204).end(); };
