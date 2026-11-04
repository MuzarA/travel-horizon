# Nomad Horizon — website v2

Custom trips in Kyrgyzstan for travellers from abroad, plus a marketplace of checked local hosts (P2P).
Built to **Technical Requirements v2**.

- Public site in **English, Kyrgyz and Russian**: home page (hero, the feeling, journeys, the land, how it works, local hosts, planner, seasons, FAQ, quote), catalogue of 10 destinations with a page each, 9 trip ideas with a page each, local hosts, “Become a host”, “Before you go”, contact.
- Trip planner: 3 durations × 3 moods = 9 route ideas, each can be requested in one step.
- Requests are saved on the server and sent to **Telegram**; the admin inbox has statuses New / In progress / Done.
- Local hosts apply through the site; only profiles approved in the admin panel are public.
- Admin panel (EN / RU / KY): homepage texts and photos per language, destinations, contacts, requests, hosts moderation, stats with goals G1–G6, advanced file editing with backups.
- Cookie-free analytics, CSP and security headers, hashed password, login lockout, upload checks, rate limits, audit log.
- **No dependencies.** Only Node.js 18+ is needed. No build step.

## Run locally

```bash
node server.js
```

Open http://127.0.0.1:4173 — the admin panel is at http://127.0.0.1:4173/admin/.
On the first start the server prints a one-time admin password. Change it any time:

```bash
node server.js set-password "a-long-new-password"
```

## Check that everything works

```bash
node test.js
```

Starts its own server with a temporary data folder and runs the acceptance checks from the ТЗ
(27 planner results, login lockout, content save, validation, uploads, requests, hosts, analytics). Expected: `48 passed, 0 failed`.

## Telegram notifications

1. In Telegram, open **@BotFather**, send `/newbot`, copy the token.
2. Add the bot to the company chat (or write to it once).
3. Get the chat ID: open `https://api.telegram.org/bot<TOKEN>/getUpdates` and find `"chat":{"id": …}`.
4. Start the server with both values:

```bash
TELEGRAM_BOT_TOKEN=123:ABC TELEGRAM_CHAT_ID=-1001234567 node server.js
```

Every trip request, message to a host and host application then arrives in that chat. Requests are always saved in the admin inbox too, so nothing is lost if Telegram is down.

## Settings (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `HOST`, `PORT` | `127.0.0.1`, `4173` | Address the server listens on |
| `PUBLIC_URL` | — | Public address, e.g. `https://nomadhorizon.kg` (sitemap, Secure cookie) |
| `ADMIN_PASSWORD` | — | Use this password instead of `data/auth.json` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | — | Telegram notifications |
| `TRUST_PROXY` | — | Set `1` behind Caddy/Nginx so client IPs are correct |
| `DATA_DIR` | `./data` | Where content, requests, hosts, stats and photos are kept |
| `TIME_ZONE` | `Asia/Bishkek` | Day boundaries for stats |

## Before going live

1. **Contacts:** Admin → Contacts — enter the real Telegram, WhatsApp and email (the shipped email is a placeholder).
2. **Example hosts:** the 6 hosts are examples, marked “Example profile”. Delete them in Admin → Hosts once real hosts are approved.
3. **Photos:** the hero and all 10 places show free photos from Wikimedia Commons (CC BY / CC BY-SA). Each photo carries its author and licence on the image and on the **Photo credits** page (`#credits`), as the licences require — keep those credits. Your own photos uploaded in Admin → Homepage / Destinations replace them. If a photo cannot load, the built-in illustration stays visible.
4. **Facts:** altitudes, seasons and drive times in `public/catalog.js` and `public/translations.js` are approximate — let the trip designer check them; ask a native speaker to read the Kyrgyz text once.
5. **Visa note:** “Before you go” states the rule as of January 2026 and links the official portal evisa.e-gov.kg. Re-check it every season.

## Quick public preview on Vercel (static)

`vercel.json` is included: import this repository at https://vercel.com/new and press **Deploy** — no settings needed.
The site, all three languages, the planner and the Wikimedia photos work there. Requests, host applications and the
admin panel need the Node.js server (`node server.js` on your own server, see below): on a static host the forms
show your direct contacts instead of sending.

## Deploy on a VPS (HTTPS)

`/etc/systemd/system/travel-horizon.service`:

```ini
[Unit]
Description=Nomad Horizon
After=network.target

[Service]
WorkingDirectory=/opt/travel-horizon
ExecStart=/usr/bin/node server.js
Environment=PUBLIC_URL=https://nomadhorizon.kg TRUST_PROXY=1
EnvironmentFile=/opt/travel-horizon/.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile` (Caddy gets the HTTPS certificate automatically):

```
nomadhorizon.kg {
    encode gzip
    reverse_proxy 127.0.0.1:4173
}
```

Back up the `data/` folder every day (content, requests, hosts, photos). Monitor `GET /api/health`.

## Structure

```
server.js            HTTP server and JSON API (built-in modules only)
test.js              acceptance checks
public/
  index.html         page shell, meta, structured data
  styles.css         all public styles
  script.js          views, planner, forms, language switch, analytics
  translations.js    every text in EN / KY / RU, 9 routes, FAQ, Before you go
  catalog.js         10 destinations, regions, Wikimedia photos with credits, example hosts
  art.js             built-in SVG landscapes and host avatars
admin/
  index.html, admin.css, admin.js   admin panel
data/                created on first start: content.json, hosts.json, requests.json,
                     stats.json, auth.json, audit.log, uploads/, backups/
```

### Adding a language

Add it to `TH.langs` in `translations.js` and copy one full block (`ui`, `defaults`, `routes`, `faq`, `before`, `quote`)
plus `places` and `regions` in `catalog.js`. Add the code to `LANGS` in `server.js`. `node test.js` tells you if a key is missing.

## API

| Method and path | Purpose | Login |
| --- | --- | --- |
| GET /api/health | Server status | No |
| GET /api/content | Site content | No |
| PUT /api/content | Save content for one language | Yes |
| PUT /api/contacts | Save contacts | Yes |
| POST /api/login, /api/logout · GET /api/session | Admin session | No |
| POST /api/uploads | Upload a JPEG/PNG/WebP up to 8 MB | Yes |
| POST /api/requests | Send a request (trip, place, host, general) | No |
| GET /api/requests · PATCH /api/requests/{id} | Inbox and status | Yes |
| GET /api/hosts | Approved hosts | No |
| POST /api/hosts/apply | Host application | No |
| GET /api/admin/hosts · PATCH/DELETE /api/admin/hosts/{id} | Moderation | Yes |
| POST /api/track · GET /api/stats | Analytics | No · Yes |
| GET/PUT /api/files/{name} · POST /api/files/{name}/restore | Advanced editing | Yes |
| GET /sitemap.xml, /robots.txt | Search engines | No |

## Photo credits

| Place | Photo | Author | Licence |
| --- | --- | --- | --- |
| Home (Song-Kul) | [Lake Son Kol, Kyrgyzstan.jpg](https://commons.wikimedia.org/wiki/File:Lake_Son_Kol,_Kyrgyzstan.jpg) | Benjamin Goetzinger | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| issyk-kul | [20141010 Kyrgyzstan 1169 Lake Issyk-Kul (15635724474).jpg](https://commons.wikimedia.org/wiki/File:20141010_Kyrgyzstan_1169_Lake_Issyk-Kul_(15635724474).jpg) | Dan Lundberg | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| ala-archa | [Kyrgyzstan Alpinism, Ala Archa National Park (7208606302).jpg](https://commons.wikimedia.org/wiki/File:Kyrgyzstan_Alpinism,_Ala_Archa_National_Park_(7208606302).jpg) | Thomas Depenbusch | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| sary-chelek | [Sary Chelek Lake.jpg](https://commons.wikimedia.org/wiki/File:Sary_Chelek_Lake.jpg) | Kondephy | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| song-kul | [Lake Son Kol, Kyrgyzstan, afternoon.jpg](https://commons.wikimedia.org/wiki/File:Lake_Son_Kol,_Kyrgyzstan,_afternoon.jpg) | Benjamin Goetzinger | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| karakol | [Tower of Karakol Dungan Mosque.jpg](https://commons.wikimedia.org/wiki/File:Tower_of_Karakol_Dungan_Mosque.jpg) | Adam Harangozó | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| jeti-oguz | [Jeti-Ögüz Rocks - Issyk-Kul Region, Jeti-Oguz District.jpg](https://commons.wikimedia.org/wiki/File:Jeti-%C3%96g%C3%BCz_Rocks_-_Issyk-Kul_Region,_Jeti-Oguz_District.jpg) | Jiří Komárek | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| ala-kul | [Ala-Köl.jpg](https://commons.wikimedia.org/wiki/File:Ala-K%C3%B6l.jpg) | Ondřej Žváček | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| kochkor | [On A365, Kochor District, Kyrgyzstan - panoramio.jpg](https://commons.wikimedia.org/wiki/File:On_A365,_Kochor_District,_Kyrgyzstan_-_panoramio.jpg) | ThomasG | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| tash-rabat | [Tash Rabat.JPG](https://commons.wikimedia.org/wiki/File:Tash_Rabat.JPG) | WikiTofu | [CC BY-SA 3.0 DE](https://creativecommons.org/licenses/by-sa/3.0/de/) |
| arslanbob | [Walnut forest Arslanbob.jpg](https://commons.wikimedia.org/wiki/File:Walnut_forest_Arslanbob.jpg) | Ekrem Canli | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
