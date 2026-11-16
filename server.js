#!/usr/bin/env node
/* Nomad Horizon — server for your own computer or a VPS.
   Node.js 18+, no npm packages. The site, the admin panel and the API; all data in PostgreSQL.

   Environment:
     DATABASE_URL               PostgreSQL, e.g. postgres://user:pass@localhost:5432/nomad (or the Neon URL from Vercel)
     HOST, PORT                 default 127.0.0.1:4173
     PUBLIC_URL                 e.g. https://nomadhorizon.kg (sitemap, Secure cookie)
     ADMIN_PASSWORD             optional; otherwise the first start creates one and prints it
     TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   requests and host applications go to this chat
     TRUST_PROXY=1              read the client IP from X-Forwarded-For (behind Caddy/Nginx)
     TIME_ZONE                  default Asia/Bishkek (analytics day boundaries)
   Commands:
     node server.js                    start
     node server.js set-password NEW   store a new admin password in the database and exit */
'use strict';

const http = require('http');
const app = require('./lib/app');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;

async function main() {
  if (process.argv[2] === 'set-password') {
    const pw = process.argv[3];
    if (!app.hasDatabase) { console.error('Set DATABASE_URL first.'); process.exit(1); }
    if (!pw || pw.length < 10) { console.error('Usage: node server.js set-password <new password, at least 10 characters>'); process.exit(1); }
    await app.setPassword(pw);
    console.log('Admin password updated. All admin sessions were closed.');
    process.exit(0);
  }
  if (app.hasDatabase) {
    await app.init();
    console.log('Database: connected (' + app.DB.config.host + '/' + app.DB.config.database + ')');
  } else {
    console.log('Database: not configured — set DATABASE_URL. The site works; forms go only to Telegram; the admin panel needs the database.');
  }
  const server = http.createServer((req, res) => { app.handle(req, res); });
  server.headersTimeout = 20000;
  server.requestTimeout = 60000;
  server.listen(PORT, HOST, () => {
    console.log('Nomad Horizon ' + app.VERSION + ' → http://' + HOST + ':' + PORT + '  (admin: /admin/)');
    console.log('Telegram notifications: ' + (process.env.TELEGRAM_BOT_TOKEN ? 'on' : 'off (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)'));
  });
  const stop = () => { server.close(); (app.DB ? app.DB.end() : Promise.resolve()).finally(() => process.exit(0)); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => { console.error('Could not start: ' + e.message); process.exit(1); });
