/* Vercel function: the whole backend (lib/app.js). vercel.json sends /api/*, /uploads/*,
   /sitemap.xml and /robots.txt here; everything else is served from public/ as static files. */
'use strict';
const app = require('../lib/app');

module.exports = (req, res) => app.handle(req, res);
