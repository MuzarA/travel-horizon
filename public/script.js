/* Travel Horizon — public site.
   Plain JavaScript, no framework. Views are switched by the address hash:
   #planner, #destinations, #d-<slug>, #ideas, #i-<mood>-<days>, #hosts, #h-<id>, #become-host, #before-you-go, #contact */
(function () {
  'use strict';

  var TH = window.TH;
  var API = '/api';
  var LANG_KEY = 'th-lang';

  var state = {
    lang: 'en',
    server: null,          // content.json from the server, or null when offline
    hosts: null,           // approved hosts from the server, or examples when offline
    hostsOffline: false,
    plan: { duration: null, mood: null },
    destFilter: 'all',
    hostFilter: { type: '', region: '' },
    menuOpen: false,
    seenCombos: {}
  };

  /* ------------------------------------------------------------ helpers */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl2p(text) {
    return String(text || '').split(/\n{2,}/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function store(key, val) {
    try { if (val === undefined) return window.localStorage.getItem(key); window.localStorage.setItem(key, val); } catch (e) { return null; }
    return null;
  }
  function session(key, val) {
    try { if (val === undefined) return window.sessionStorage.getItem(key); window.sessionStorage.setItem(key, val); } catch (e) { return null; }
    return null;
  }
  function ui() { return TH.ui[state.lang] || TH.ui.en; }
  function safeImage(src) {
    src = String(src || '').trim();
    if (/^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(src)) return src;
    if (/^https:\/\/[^\s"'<>]+$/i.test(src)) return src;
    return '';
  }
  function fetchJSON(url, opts, timeoutMs) {
    opts = opts || {};
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) opts.signal = ctrl.signal;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 5000);
    return fetch(url, opts).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) { var err = new Error(body.error || ('HTTP ' + res.status)); err.status = res.status; err.body = body; throw err; }
        return body;
      });
    }, function (e) { clearTimeout(timer); throw e; });
  }
  function track(event) {
    var body = JSON.stringify({ event: event });
    try {
      if (navigator.sendBeacon) { navigator.sendBeacon(API + '/track', new Blob([body], { type: 'text/plain;charset=UTF-8' })); return; }
    } catch (e) { /* fall through */ }
    fetch(API + '/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
  }

  /* ------------------------------------------------------- content merge */
  function content() {
    var lang = state.lang, d = TH.defaults[lang] || TH.defaults.en, s = state.server || {};
    var base = { hero: s.hero, journeys: s.journeys, land: s.land, destinations: s.destinations || {} };
    var loc = lang === 'en' ? base : ((s.locales && s.locales[lang]) || {});
    var en = base;
    function pick(block, field, i) {
      var v = i == null ? (loc[block] && loc[block][field]) : (loc[block] && loc[block][i] && loc[block][i][field]);
      if (v) return v;
      var dv = i == null ? d[block][field] : (d[block][i] && d[block][i][field]);
      return dv || '';
    }
    function pickImage(block, i) {
      var v = i == null ? (loc[block] && loc[block].image) : (loc[block] && loc[block][i] && loc[block][i].image);
      if (v) return v;
      return i == null ? (en[block] && en[block].image) || '' : (en[block] && en[block][i] && en[block][i].image) || '';
    }
    var hero = {}; ['eyebrow', 'titleLine', 'titleEmphasis', 'copyFirst', 'copySecond'].forEach(function (f) { hero[f] = pick('hero', f); });
    var journeys = [0, 1, 2].map(function (i) {
      var c = {}; ['label', 'duration', 'title', 'description', 'alt'].forEach(function (f) { c[f] = pick('journeys', f, i); });
      c.image = pickImage('journeys', i); return c;
    });
    var land = {}; ['titleLine', 'titleEmphasis', 'description', 'alt', 'caption'].forEach(function (f) { land[f] = pick('land', f); });
    land.image = pickImage('land');
    return { hero: hero, journeys: journeys, land: land, contacts: s.contacts || { telegram: '', whatsapp: '', email: '' } };
  }
  function place(slug) {
    var basePlace = (TH.places[state.lang] || TH.places.en)[slug] || TH.places.en[slug];
    var s = state.server || {}, out = {};
    for (var k in basePlace) out[k] = basePlace[k];
    var en = (s.destinations || {})[slug] || {};
    var loc = state.lang === 'en' ? en : (((s.locales || {})[state.lang] || {}).destinations || {})[slug] || {};
    ['name', 'short', 'story', 'alt'].forEach(function (f) { if (loc[f]) out[f] = loc[f]; });
    out.image = loc.image || en.image || '';
    if (!out.alt) out.alt = out.name;
    return out;
  }
  function catalogItem(slug) {
    for (var i = 0; i < TH.catalog.length; i++) if (TH.catalog[i].slug === slug) return TH.catalog[i];
    return null;
  }
  function route(key) { return (TH.routes[state.lang] || TH.routes.en)[key]; }
  function regionName(key) { return (TH.regions[state.lang] || TH.regions.en)[key] || key; }

  /* ---------------------------------------------------------- pieces */
  var SCENE_SLUG = { issyk: 'issyk-kul', alaarcha: 'ala-archa', sarychelek: 'sary-chelek', songkul: 'song-kul', karakol: 'karakol', jetioguz: 'jeti-oguz', alakul: 'ala-kul', kochkor: 'kochkor', tashrabat: 'tash-rabat', arslanbob: 'arslanbob' };
  function builtInPhoto(key) { return (TH.photos || {})[key] || null; }
  function creditHTML(p) {
    return '<a class="credit" href="' + esc(p.page) + '" target="_blank" rel="noopener">© ' + esc(p.author) + ' · ' + esc(p.license) + '</a>';
  }
  /* A picture slot: built-in illustration underneath, then the admin's photo or the built-in Wikimedia photo on top. */
  function media(scene, image, alt, extraClass, opts) {
    opts = opts || {};
    var src = safeImage(image), credit = null;
    if (!src) { var p = builtInPhoto(opts.photo || SCENE_SLUG[scene]); if (p) { src = p.src; credit = p; } }
    return '<div class="media ' + (extraClass || '') + '"' + (src ? '' : ' role="img" aria-label="' + esc(alt) + '"') + '>' + TH.art(scene) +
      (src ? '<img src="' + esc(src) + '" alt="' + esc(alt) + '"' + (opts.eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" referrerpolicy="no-referrer" data-fallback>' + (credit ? creditHTML(credit) : '') : '') + '</div>';
  }
  var ICONS = {
    passport: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
    plane: '<path d="M2 13l20-7-7 16-3-7-10-2z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9h4.5a2 2 0 010 4H10.5a2 2 0 000 4H15M12 7v2M12 17v-0"/>',
    signal: '<path d="M4 20v-3M9 20v-7M14 20v-11M19 20V5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    pin: '<path d="M12 21s-6-6.2-6-11a6 6 0 0112 0c0 4.8-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }
  var TUNDUK = '<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5 25 Q32 13 59 25 M5 39 Q32 51 59 39 M25 5 Q13 32 25 59 M39 5 Q51 32 39 59" fill="none" stroke="var(--apricot)" stroke-width="2.6"/></svg>';

  function contactLinks(c, cls) {
    var out = [];
    if (c.telegram) out.push('<a class="' + (cls || 'chip-link') + '" data-contact href="https://t.me/' + esc(c.telegram.replace(/^@/, '')) + '" rel="noopener" target="_blank">Telegram · @' + esc(c.telegram.replace(/^@/, '')) + '</a>');
    if (c.whatsapp) out.push('<a class="' + (cls || 'chip-link') + '" data-contact href="https://wa.me/' + esc(c.whatsapp.replace(/[^0-9]/g, '')) + '" rel="noopener" target="_blank">WhatsApp · ' + esc(c.whatsapp) + '</a>');
    if (c.email) out.push('<a class="' + (cls || 'chip-link') + '" data-contact href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    return out.join('');
  }

  function requestForm(kind, extra) {
    var u = ui().form, id = 'f' + Math.random().toString(36).slice(2, 8);
    extra = extra || {};
    return '<form class="request-form" novalidate data-kind="' + esc(kind) + '" data-idea="' + esc(extra.idea || '') + '" data-host="' + esc(extra.host || '') + '" data-place="' + esc(extra.place || '') + '">' +
      (extra.title === false ? '' : '<h3 class="form-title">' + esc(extra.title || u.title) + '</h3>') +
      '<div class="field-grid">' +
      field(id + 'n', 'name', u.name, 'text', true, 'name', 80) +
      field(id + 'c', 'contact', u.contact, 'text', true, 'email', 120) +
      field(id + 'k', 'country', u.country, 'text', false, 'country-name', 60) +
      field(id + 'm', 'month', u.month, 'text', false, 'off', 40, u.monthHint) +
      field(id + 'g', 'group', u.group, 'number', false, 'off', 3) +
      '</div>' +
      '<div class="field"><label for="' + id + 't">' + esc(extra.host ? u.messageHost : u.note) + '</label><textarea id="' + id + 't" name="note" rows="3" maxlength="800"></textarea></div>' +
      '<div class="hp" aria-hidden="true"><label for="' + id + 'w">Website</label><input id="' + id + 'w" name="website" tabindex="-1" autocomplete="off"></div>' +
      '<p class="form-privacy">' + esc(u.privacy) + '</p>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + esc(u.send) + '</button></div>' +
      '<div class="form-status" role="status" aria-live="polite"></div></form>';
  }
  function field(id, name, label, type, required, ac, max, hint) {
    var attrs = type === 'number' ? ' min="1" max="99" inputmode="numeric"' : ' maxlength="' + max + '"';
    return '<div class="field"><label for="' + id + '">' + esc(label) + (required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
      '<input id="' + id + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + attrs + (required ? ' required aria-required="true"' : '') + (hint ? ' placeholder="' + esc(hint) + '"' : '') + '></div>';
  }

  /* ---------------------------------------------------------- header */
  function header(view) {
    var u = ui(), n = u.nav;
    function link(href, label, active) { return '<a href="' + href + '"' + (active ? ' aria-current="page"' : '') + '>' + esc(label) + '</a>'; }
    var langs = TH.langs.map(function (l) {
      return '<button type="button" class="lang-btn" data-lang="' + l.code + '" lang="' + l.htmlLang + '" aria-pressed="' + (l.code === state.lang) + '" title="' + esc(l.name) + '">' + l.label + '</button>';
    }).join('');
    return '<a class="skip" href="#main">' + esc(u.skip) + '</a>' +
      '<header class="site-header' + (view === 'home' ? ' on-hero' : '') + '"><div class="container header-inner">' +
      '<a class="brand" href="#top" aria-label="Travel Horizon">' + TUNDUK + '<span>Travel Horizon</span></a>' +
      '<button class="menu-btn" type="button" aria-expanded="' + state.menuOpen + '" aria-controls="site-nav">' + icon(state.menuOpen ? 'close' : 'menu') + '<span class="sr">' + esc(state.menuOpen ? n.close : n.menu) + '</span></button>' +
      '<nav id="site-nav" class="site-nav' + (state.menuOpen ? ' open' : '') + '" aria-label="Main">' +
      link('#top', n.home, view === 'home') + link('#destinations', n.destinations, view === 'destinations' || view === 'destination') +
      link('#hosts', n.hosts, view === 'hosts' || view === 'host' || view === 'become-host') + link('#before-you-go', n.before, view === 'before') +
      link('#contact', n.contact, view === 'contact') +
      '<div class="lang-switch" role="group" aria-label="' + esc(u.langLabel) + '">' + langs + '</div>' +
      '<a class="btn btn-small btn-accent" href="#planner">' + esc(u.cta.plan) + '</a>' +
      '</nav></div></header>';
  }

  function footer() {
    var u = ui(), f = u.footer, c = content().contacts, n = u.nav;
    var langs = TH.langs.map(function (l) { return '<button type="button" class="lang-btn" data-lang="' + l.code + '" lang="' + l.htmlLang + '" aria-pressed="' + (l.code === state.lang) + '">' + esc(l.name) + '</button>'; }).join('');
    return '<footer class="site-footer"><div class="container footer-grid">' +
      '<div><a class="brand brand-footer" href="#top">' + TUNDUK + '<span>Travel Horizon</span></a><p class="muted">' + esc(f.tagline) + '</p><p class="muted small">' + icon('pin') + ' ' + esc(f.place) + '</p></div>' +
      '<div><h2 class="foot-title">' + esc(f.explore) + '</h2><ul class="foot-list"><li><a href="#destinations">' + esc(n.destinations) + '</a></li><li><a href="#ideas">' + esc(u.ideas.kicker) + '</a></li><li><a href="#planner">' + esc(u.planner.kicker) + '</a></li><li><a href="#before-you-go">' + esc(n.before) + '</a></li></ul></div>' +
      '<div><h2 class="foot-title">' + esc(f.locals) + '</h2><ul class="foot-list"><li><a href="#hosts">' + esc(n.hosts) + '</a></li><li><a href="#become-host">' + esc(u.become.title) + '</a></li></ul></div>' +
      '<div><h2 class="foot-title">' + esc(f.write) + '</h2><div class="foot-contacts">' + (contactLinks(c, 'foot-link') || '<a class="foot-link" href="#contact">' + esc(n.contact) + '</a>') + '</div>' +
      '<div class="lang-switch lang-switch-footer" role="group" aria-label="' + esc(u.langLabel) + '">' + langs + '</div></div>' +
      '</div><div class="container foot-bottom"><span>© ' + new Date().getFullYear() + ' Travel Horizon. ' + esc(f.rights) + '</span><a href="#credits">' + esc(u.credits.kicker) + '</a></div></footer>';
  }

  /* ------------------------------------------------------------ home */
  function homeView() {
    var u = ui(), c = content(), h = c.hero;
    var out = [];
    out.push('<section class="hero" id="top" aria-labelledby="hero-title">' + media('hero', '', '', 'hero-art', { photo: 'hero', eager: true }) + '<div class="hero-shade"></div>' +
      '<div class="container hero-inner"><p class="eyebrow">' + esc(h.eyebrow) + '</p>' +
      '<h1 id="hero-title" class="hero-title"><span>' + esc(h.titleLine) + '</span> <em>' + esc(h.titleEmphasis) + '</em></h1>' +
      '<p class="hero-copy">' + esc(h.copyFirst) + '</p><p class="hero-copy hero-copy-2">' + esc(h.copySecond) + '</p>' +
      '<div class="hero-actions"><a class="btn btn-accent" href="#planner">' + esc(u.cta.plan) + ' ' + icon('arrow') + '</a><a class="btn btn-ghost-light" href="#destinations">' + esc(u.cta.journeys) + '</a></div></div>' +
      '<a class="scroll-hint" href="#feeling">' + esc(u.hero.scroll) + '</a></section>');

    var fe = u.feeling;
    out.push('<section class="section feeling" id="feeling"><div class="container feeling-grid"><div><p class="kicker">' + esc(fe.kicker) + '</p><h2 class="h2">' + esc(fe.title) + '</h2></div>' +
      '<div><p class="lead">' + esc(fe.body) + '</p><ul class="facts">' + fe.facts.map(function (f) { return '<li><strong>' + esc(f.value) + '</strong><span>' + esc(f.label) + '</span></li>'; }).join('') + '</ul></div></div></section>');

    var j = u.journeys, scenes = ['issyk', 'alaarcha', 'sarychelek'], slugs = ['issyk-kul', 'ala-archa', 'sary-chelek'], moods = ['lakes', 'trails', 'lakes'];
    out.push('<section class="section journeys" id="journeys"><div class="container"><div class="section-head"><p class="kicker">' + esc(j.kicker) + '</p><h2 class="h2">' + esc(j.title) + '</h2><p class="sub">' + esc(j.sub) + '</p></div>' +
      '<div class="cards cards-3">' + c.journeys.map(function (card, i) {
        return '<article class="card journey-card">' + media(scenes[i], card.image, card.alt, 'ratio-4x5') +
          '<div class="card-body"><p class="card-meta"><span>' + esc(card.label) + '</span><span>' + esc(card.duration) + '</span></p>' +
          '<h3 class="h3"><a class="stretch" href="#d-' + slugs[i] + '">' + esc(card.title) + '</a></h3><p>' + esc(card.description) + '</p>' +
          '<div class="card-actions"><button type="button" class="link-btn" data-plan-mood="' + moods[i] + '">' + esc(j.planLike) + ' ' + icon('arrow') + '</button></div></div></article>';
      }).join('') + '</div></div></section>');

    var l = c.land;
    out.push('<section class="section land" id="land"><div class="container land-grid"><figure class="land-figure">' + media('songkul', l.image, l.alt, 'ratio-land') +
      '<figcaption>' + esc(l.caption) + '</figcaption></figure><div class="land-text"><p class="kicker">' + esc(u.land.kicker) + '</p>' +
      '<h2 class="h2">' + esc(l.titleLine) + ' <em>' + esc(l.titleEmphasis) + '</em></h2>' + nl2p(l.description) +
      '<div class="row-actions"><a class="btn btn-outline" href="#d-song-kul">' + esc(place('song-kul').name) + ' ' + icon('arrow') + '</a><button type="button" class="link-btn" data-plan-mood="culture">' + esc(j.planLike) + '</button></div></div></div></section>');

    var hw = u.how;
    out.push('<section class="section how" id="how"><div class="container"><div class="section-head"><p class="kicker">' + esc(hw.kicker) + '</p><h2 class="h2">' + esc(hw.title) + '</h2></div>' +
      '<ol class="steps">' + hw.steps.map(function (s, i) { return '<li class="step"><span class="step-num">' + (i + 1) + '</span><h3 class="h4">' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></li>'; }).join('') + '</ol></div></section>');

    var ht = u.hostsTeaser;
    out.push('<section class="section hosts-teaser" id="locals"><div class="container"><div class="section-head split"><div><p class="kicker">' + esc(ht.kicker) + '</p><h2 class="h2">' + esc(ht.title) + '</h2><p class="sub">' + esc(ht.sub) + '</p></div>' +
      '<div class="head-actions"><a class="btn btn-outline" href="#hosts">' + esc(u.cta.allHosts) + '</a><a class="link-btn" href="#become-host">' + esc(ht.become) + ' ' + icon('arrow') + '</a></div></div>' +
      '<div class="cards cards-3" data-hosts-slot="3">' + hostCards((state.hosts || []).slice(0, 3)) + '</div></div></section>');

    out.push(plannerSection());

    var se = u.seasons;
    out.push('<section class="section seasons" id="seasons"><div class="container"><div class="section-head"><p class="kicker">' + esc(se.kicker) + '</p><h2 class="h2">' + esc(se.title) + '</h2></div>' +
      '<div class="season-grid">' + se.items.map(function (s, i) { return '<article class="season season-' + i + '"><h3 class="h4">' + esc(s.name) + '</h3><p class="season-months">' + esc(s.months) + '</p><p>' + esc(s.text) + '</p></article>'; }).join('') + '</div></div></section>');

    var fq = u.faq;
    out.push('<section class="section faq" id="faq"><div class="container faq-grid"><div><p class="kicker">' + esc(fq.kicker) + '</p><h2 class="h2">' + esc(fq.title) + '</h2></div><div class="faq-list">' +
      (TH.faq[state.lang] || TH.faq.en).map(function (q) { return '<details class="faq-item"><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') + '</div></div></section>');

    out.push(quoteSection());
    return out.join('');
  }

  function quoteSection() {
    var q = TH.quote, main = q[state.lang] || q.en;
    return '<section class="quote" aria-label="' + esc(ui().quote.source) + '"><div class="container"><blockquote><p class="quote-text">“' + esc(main) + '”</p>' +
      (state.lang !== 'ky' ? '<p class="quote-original" lang="ky">' + esc(q.original) + '</p>' : '') +
      '<footer>— ' + esc(ui().quote.source) + '</footer></blockquote></div></section>';
  }

  /* --------------------------------------------------------- planner */
  function plannerSection() {
    var p = ui().planner, pl = state.plan;
    function pill(group, value, label) {
      var on = pl[group] === value;
      return '<button type="button" class="pill" role="radio" aria-checked="' + on + '" tabindex="' + (on || (!pl[group] && (value === '3' || value === 'lakes')) ? '0' : '-1') + '" data-group="' + group + '" data-value="' + value + '">' + esc(label) + '</button>';
    }
    return '<section class="section planner" id="planner" aria-labelledby="planner-title"><div class="container planner-grid">' +
      '<div class="planner-controls"><p class="kicker kicker-light">' + esc(p.kicker) + '</p><h2 class="h2" id="planner-title">' + esc(p.title) + '</h2><p class="sub">' + esc(p.sub) + '</p>' +
      '<div class="q"><p class="q-label" id="q1">' + esc(p.q1) + '</p><div class="pills" role="radiogroup" aria-labelledby="q1">' + TH.durations.map(function (d) { return pill('duration', d, p.durations[d]); }).join('') + '</div></div>' +
      '<div class="q"><p class="q-label" id="q2">' + esc(p.q2) + '</p><div class="pills" role="radiogroup" aria-labelledby="q2">' + TH.moods.map(function (m) { return pill('mood', m, p.moods[m]); }).join('') + '</div></div>' +
      '<a class="link-btn link-light" href="#ideas">' + esc(ui().cta.allIdeas) + ' ' + icon('arrow') + '</a></div>' +
      '<div class="planner-result" aria-live="polite">' + plannerResult() + '</div></div></section>';
  }
  function ideaKey() { return state.plan.mood && state.plan.duration ? state.plan.mood + '-' + state.plan.duration : null; }
  function moodScene(mood, days) {
    var map = { lakes: { '3': 'issyk', '5': 'issyk', '7': 'karakol' }, trails: { '3': 'alaarcha', '5': 'alakul', '7': 'songkul' }, culture: { '3': 'kochkor', '5': 'songkul', '7': 'tashrabat' } };
    return (map[mood] || {})[days] || 'issyk';
  }
  function plannerResult() {
    var p = ui().planner, key = ideaKey();
    if (!key) return '<div class="result-empty">' + TUNDUK + '<p>' + esc(p.empty) + '</p></div>';
    var r = route(key), parts = key.split('-');
    return '<article class="result-card">' + media(moodScene(parts[0], parts[1]), '', r.title, 'ratio-wide') +
      '<div class="result-body"><p class="kicker">' + esc(p.resultKicker) + ' · ' + esc(p.durations[parts[1]]) + ' · ' + esc(p.moods[parts[0]]) + '</p>' +
      '<h3 class="h3">' + esc(r.title) + '</h3><p>' + esc(r.text) + '</p>' +
      '<p class="route-line"><span class="route-label">' + esc(p.route) + ':</span> ' + r.stops.map(function (s) { return esc(s[0]); }).join(' <span aria-hidden="true">→</span> ') + '</p>' +
      '<dl class="mini-facts"><div><dt>' + esc(p.season) + '</dt><dd>' + esc(r.season) + '</dd></div><div><dt>' + esc(p.start) + '</dt><dd>' + esc(r.start) + '</dd></div></dl>' +
      '<div class="result-actions"><button type="button" class="btn btn-primary" data-open-request>' + esc(ui().cta.request) + '</button><a class="link-btn" href="#i-' + key + '">' + esc(p.open) + ' ' + icon('arrow') + '</a></div>' +
      '<div class="request-slot" hidden>' + requestForm('trip', { idea: key }) + '</div></div></article>';
  }

  /* ---------------------------------------------------- destinations */
  function destinationsView() {
    var d = ui().dest, p = ui().planner;
    var filters = ['all'].concat(TH.moods).map(function (m) {
      return '<button type="button" class="pill pill-dark" data-dest-filter="' + m + '" aria-pressed="' + (state.destFilter === m) + '">' + esc(m === 'all' ? d.all : p.moods[m]) + '</button>';
    }).join('');
    var items = TH.catalog.filter(function (c) { return state.destFilter === 'all' || c.mood === state.destFilter; });
    return pageHead(d.kicker, d.title, d.sub) + '<section class="section section-tight"><div class="container"><div class="filters" role="group" aria-label="' + esc(d.sub) + '">' + filters + '</div>' +
      '<div class="cards cards-3">' + items.map(destCard).join('') + '</div></div></section>';
  }
  function destCard(c) {
    var pl = place(c.slug);
    return '<article class="card dest-card">' + media(c.art, pl.image, pl.alt, 'ratio-4x3') + '<div class="card-body"><p class="card-meta"><span>' + esc(regionName(c.region)) + '</span><span>' + esc(c.altitude) + '</span></p>' +
      '<h3 class="h3"><a class="stretch" href="#d-' + c.slug + '">' + esc(pl.name) + '</a></h3><p>' + esc(pl.short) + '</p></div></article>';
  }
  function destinationView(slug) {
    var c = catalogItem(slug); if (!c) return notFound();
    var pl = place(slug), d = ui().dest, p = ui().planner;
    var related = c.ideas.map(function (k) { var r = route(k), parts = k.split('-'); return '<li><a href="#i-' + k + '"><strong>' + esc(r.title) + '</strong><span>' + esc(p.durations[parts[1]]) + ' · ' + esc(p.moods[parts[0]]) + '</span></a></li>'; }).join('');
    return '<section class="detail-hero">' + media(c.art, pl.image, pl.alt, 'detail-media') + '<div class="detail-shade"></div><div class="container detail-hero-inner">' +
      '<a class="back-link" href="#destinations">' + icon('back') + ' ' + esc(ui().cta.allDest) + '</a><p class="eyebrow">' + esc(regionName(c.region)) + '</p><h1 class="detail-title">' + esc(pl.name) + '</h1><p class="hero-copy">' + esc(pl.short) + '</p></div></section>' +
      '<section class="section section-tight"><div class="container detail-grid"><div class="detail-main">' + nl2p(pl.story) +
      '<h2 class="h4">' + esc(d.highlights) + '</h2><ul class="ticks">' + pl.highlights.map(function (hl) { return '<li>' + icon('check') + '<span>' + esc(hl) + '</span></li>'; }).join('') + '</ul>' +
      '<h2 class="h4">' + esc(d.related) + '</h2>' + (related ? '<ul class="idea-links">' + related + '</ul>' : '<p class="muted">' + esc(d.noRelated) + '</p>') + '</div>' +
      '<aside class="detail-side"><dl class="fact-list"><div><dt>' + esc(d.facts.region) + '</dt><dd>' + esc(regionName(c.region)) + '</dd></div><div><dt>' + esc(d.facts.altitude) + '</dt><dd>' + esc(c.altitude) + '</dd></div>' +
      '<div><dt>' + esc(d.facts.season) + '</dt><dd>' + esc(pl.season) + '</dd></div><div><dt>' + esc(d.facts.gateway) + '</dt><dd>' + esc(pl.gateway) + '</dd></div></dl>' +
      '<div class="side-card"><h2 class="h4">' + esc(d.ask) + '</h2>' + requestForm('place', { place: slug, title: false }) + '</div></aside></div></section>';
  }

  /* ----------------------------------------------------------- ideas */
  function ideasView() {
    var i = ui().ideas, p = ui().planner;
    var grid = '<div class="idea-grid"><div class="idea-corner"></div>' + TH.durations.map(function (d) { return '<div class="idea-col-head">' + esc(p.durations[d]) + '</div>'; }).join('');
    TH.moods.forEach(function (m) {
      grid += '<div class="idea-row-head">' + esc(p.moods[m]) + '</div>';
      TH.durations.forEach(function (d) {
        var k = m + '-' + d, r = route(k);
        grid += '<a class="idea-cell" href="#i-' + k + '"><span class="idea-cell-meta">' + esc(p.durations[d]) + ' · ' + esc(p.moods[m]) + '</span><strong>' + esc(r.title) + '</strong><span class="idea-stops">' + r.stops.map(function (s) { return esc(s[0]); }).join(' → ') + '</span></a>';
      });
    });
    grid += '</div>';
    return pageHead(i.kicker, i.title, i.sub) + '<section class="section section-tight"><div class="container">' + grid + '<p class="center muted"><a class="link-btn" href="#contact">' + esc(i.custom) + ' ' + icon('arrow') + '</a></p></div></section>';
  }
  function ideaView(key) {
    var r = route(key); if (!r) return notFound();
    var parts = key.split('-'), p = ui().planner, i = ui().ideas;
    return '<section class="detail-hero">' + media(moodScene(parts[0], parts[1]), '', r.title, 'detail-media') + '<div class="detail-shade"></div><div class="container detail-hero-inner">' +
      '<a class="back-link" href="#ideas">' + icon('back') + ' ' + esc(ui().cta.allIdeas) + '</a><p class="eyebrow">' + esc(p.durations[parts[1]]) + ' · ' + esc(p.moods[parts[0]]) + '</p><h1 class="detail-title">' + esc(r.title) + '</h1></div></section>' +
      '<section class="section section-tight"><div class="container detail-grid"><div class="detail-main"><p class="lead">' + esc(r.text) + '</p>' +
      '<h2 class="h4">' + esc(i.stops) + '</h2><ol class="timeline">' + r.stops.map(function (s) { return '<li><strong>' + esc(s[0]) + '</strong><span>' + esc(s[1]) + '</span></li>'; }).join('') + '</ol></div>' +
      '<aside class="detail-side"><dl class="fact-list"><div><dt>' + esc(p.season) + '</dt><dd>' + esc(r.season) + '</dd></div><div><dt>' + esc(p.start) + '</dt><dd>' + esc(r.start) + '</dd></div></dl>' +
      '<div class="side-card"><h2 class="h4">' + esc(ui().cta.request) + '</h2>' + requestForm('trip', { idea: key, title: false }) + '</div></aside></div></section>';
  }

  /* ----------------------------------------------------------- hosts */
  function hostCards(list) {
    var h = ui().hosts, types = ui().hostTypes;
    if (!list.length) return state.hosts === null ? '<p class="muted">' + esc(h.loading) + '</p>' : '<p class="muted">' + esc(h.none) + '</p>';
    return list.map(function (x) {
      var img = safeImage(x.image);
      return '<article class="card host-card"><div class="host-top"><div class="host-photo">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback>' : '') + TH.avatar(x.name, x.id) + '</div>' +
        '<div><h3 class="h4"><a class="stretch" href="#h-' + esc(x.id) + '">' + esc(x.name) + '</a></h3><p class="card-meta"><span>' + esc(types[x.type] || x.type) + '</span><span>' + esc(regionName(x.region)) + '</span></p></div></div>' +
        '<p class="host-offer">' + esc(x.offer && x.offer.title) + '</p>' +
        '<p class="badges">' + (x.example ? '<span class="badge badge-example">' + esc(h.example) + '</span>' : '<span class="badge badge-ok">' + icon('check') + esc(h.checked) + '</span>') +
        '<span class="badge">' + esc(h.speaks) + ': ' + (x.languages || []).map(function (l) { return esc(TH.spoken[l] || l); }).join(', ') + '</span></p></article>';
    }).join('');
  }
  function filteredHosts() {
    var f = state.hostFilter;
    return (state.hosts || []).filter(function (x) { return (!f.type || x.type === f.type) && (!f.region || x.region === f.region); });
  }
  function hostsView() {
    var h = ui().hosts, types = ui().hostTypes;
    var typeOpts = '<option value="">' + esc(h.any) + '</option>' + TH.hostTypeKeys.map(function (k) { return '<option value="' + k + '"' + (state.hostFilter.type === k ? ' selected' : '') + '>' + esc(types[k]) + '</option>'; }).join('');
    var regOpts = '<option value="">' + esc(h.any) + '</option>' + Object.keys(TH.regions.en).map(function (k) { return '<option value="' + k + '"' + (state.hostFilter.region === k ? ' selected' : '') + '>' + esc(regionName(k)) + '</option>'; }).join('');
    return pageHead(h.kicker, h.title, h.sub, '<a class="btn btn-accent" href="#become-host">' + esc(ui().hostsTeaser.become) + '</a>') +
      '<section class="section section-tight"><div class="container"><div class="filters filters-select">' +
      '<div class="field field-inline"><label for="hf-type">' + esc(h.filterType) + '</label><select id="hf-type" data-host-filter="type">' + typeOpts + '</select></div>' +
      '<div class="field field-inline"><label for="hf-region">' + esc(h.filterRegion) + '</label><select id="hf-region" data-host-filter="region">' + regOpts + '</select></div></div>' +
      '<div class="cards cards-3" data-hosts-slot="all">' + hostCards(filteredHosts()) + '</div></div></section>';
  }
  function hostView(id) {
    var x = null, list = state.hosts || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) x = list[i];
    if (!x) return state.hosts === null ? pageHead(ui().hosts.kicker, ui().hosts.loading, '') : notFound();
    var h = ui().hosts, types = ui().hostTypes, img = safeImage(x.image), c = x.contacts || {};
    var direct = x.showContacts ? contactLinks({ telegram: c.telegram, whatsapp: c.whatsapp }, 'btn btn-outline') : '';
    var aboutLangName = (TH.langs.filter(function (l) { return l.code === x.aboutLang; })[0] || {}).name || x.aboutLang;
    var price = x.offer && x.offer.priceFrom ? h.priceFrom + ' ' + x.offer.priceFrom + ' USD' : h.priceOnRequest;
    return '<section class="section host-page"><div class="container"><a class="back-link back-dark" href="#hosts">' + icon('back') + ' ' + esc(ui().cta.allHosts) + '</a>' +
      '<div class="host-head"><div class="host-photo host-photo-lg">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(x.name) + '" referrerpolicy="no-referrer" data-fallback>' : '') + TH.avatar(x.name, x.id) + '</div>' +
      '<div><p class="kicker">' + esc(types[x.type] || x.type) + ' · ' + esc(regionName(x.region)) + '</p><h1 class="h1">' + esc(x.name) + '</h1>' +
      '<p class="badges">' + (x.example ? '<span class="badge badge-example">' + esc(h.example) + '</span>' : '<span class="badge badge-ok">' + icon('check') + esc(h.checked) + '</span>') + '<span class="badge">' + esc(h.speaks) + ': ' + (x.languages || []).map(function (l) { return esc(TH.spoken[l] || l); }).join(', ') + '</span></p></div></div>' +
      '<div class="detail-grid"><div class="detail-main"><div class="host-about" lang="' + esc(x.aboutLang || '') + '">' + nl2p(x.about) + '</div><p class="muted small">' + esc(h.writtenIn) + ': ' + esc(aboutLangName) + '</p></div>' +
      '<aside class="detail-side"><div class="side-card offer-card"><p class="kicker">' + esc(h.offer) + '</p><h2 class="h4">' + esc(x.offer && x.offer.title) + '</h2><dl class="fact-list"><div><dt>' + esc(h.duration) + '</dt><dd>' + esc(x.offer && x.offer.duration) + '</dd></div><div><dt>' + esc(h.priceFrom) + '</dt><dd>' + esc(price) + '</dd></div></dl>' +
      (direct ? '<p class="q-label">' + esc(h.directly) + '</p><div class="direct">' + direct + '</div>' : '') + '</div>' +
      '<div class="side-card"><h2 class="h4">' + esc(h.viaSite) + '</h2>' + requestForm('host', { host: x.id, title: false }) + '</div></aside></div></div></section>';
  }
  function becomeView() {
    var b = ui().become, types = ui().hostTypes;
    var typeOpts = '<option value=""></option>' + TH.hostTypeKeys.map(function (k) { return '<option value="' + k + '">' + esc(types[k]) + '</option>'; }).join('');
    var regOpts = '<option value=""></option>' + Object.keys(TH.regions.en).map(function (k) { return '<option value="' + k + '">' + esc(regionName(k)) + '</option>'; }).join('');
    var langs = ['ky', 'ru', 'en', 'de', 'fr', 'zh', 'tr', 'ko', 'ja', 'es'].map(function (l) { return '<label class="check"><input type="checkbox" name="languages" value="' + l + '"><span>' + esc(TH.spoken[l]) + '</span></label>'; }).join('');
    var aboutLang = TH.langs.map(function (l) { return '<option value="' + l.code + '"' + (l.code === state.lang ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('');
    function f(name, label, opts) {
      opts = opts || {};
      var id = 'bh-' + name;
      return '<div class="field' + (opts.wide ? ' field-wide' : '') + '"><label for="' + id + '">' + esc(label) + (opts.req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
        (opts.select ? '<select id="' + id + '" name="' + name + '"' + (opts.req ? ' required' : '') + '>' + opts.select + '</select>' :
          opts.area ? '<textarea id="' + id + '" name="' + name + '" rows="5" maxlength="1500"' + (opts.req ? ' required' : '') + ' aria-describedby="' + id + '-h"></textarea>' :
            '<input id="' + id + '" name="' + name + '" type="' + (opts.type || 'text') + '" maxlength="' + (opts.max || 120) + '"' + (opts.req ? ' required' : '') + (opts.hint ? ' placeholder="' + esc(opts.hint) + '"' : '') + '>') +
        (opts.help ? '<p class="help" id="' + id + '-h">' + esc(opts.help) + '</p>' : '') + '</div>';
    }
    return pageHead(b.kicker, b.title, b.sub) + '<section class="section section-tight"><div class="container narrow">' +
      '<form class="host-form side-card" novalidate>' +
      '<div class="field-grid">' + f('name', b.name, { req: true, max: 80 }) + f('type', b.type, { req: true, select: typeOpts }) + f('region', b.region, { req: true, select: regOpts }) +
      f('aboutLang', b.aboutLang, { select: aboutLang }) + '</div>' +
      '<fieldset class="field"><legend>' + esc(b.languages) + ' <span class="req" aria-hidden="true">*</span></legend><div class="checks">' + langs + '</div></fieldset>' +
      f('about', b.about, { req: true, area: true, help: b.aboutHint, wide: true }) +
      '<div class="field-grid">' + f('offerTitle', b.offerTitle, { req: true, hint: b.offerTitleHint }) + f('offerDuration', b.duration, { req: true, hint: b.durationHint, max: 40 }) +
      f('priceFrom', b.price, { type: 'number', max: 6 }) + '</div>' +
      '<p class="help">' + esc(b.contactHint) + '</p><div class="field-grid">' + f('telegram', b.telegram, { max: 40, hint: '@username' }) + f('whatsapp', b.whatsapp, { max: 24, hint: '+996 …', type: 'tel' }) + f('email', b.email, { type: 'email', max: 120 }) + '</div>' +
      '<label class="check"><input type="checkbox" name="showContacts"><span>' + esc(b.showContacts) + '</span></label>' +
      '<label class="check"><input type="checkbox" name="consent" required><span>' + esc(b.consent) + ' <span class="req" aria-hidden="true">*</span></span></label>' +
      '<div class="hp" aria-hidden="true"><label for="bh-website">Website</label><input id="bh-website" name="website" tabindex="-1" autocomplete="off"></div>' +
      '<div class="form-actions"><button class="btn btn-primary" type="submit">' + esc(b.send) + '</button></div><div class="form-status" role="status" aria-live="polite"></div></form></div></section>';
  }

  /* ------------------------------------------------------ before you go */
  function beforeView() {
    var b = ui().before;
    return pageHead(b.kicker, b.title, b.sub) + '<section class="section section-tight"><div class="container"><div class="info-grid">' +
      (TH.before[state.lang] || TH.before.en).map(function (x) {
        return '<article class="info-card">' + icon(x.icon) + '<h2 class="h4">' + esc(x.title) + '</h2><p>' + esc(x.text) + '</p>' +
          (x.link ? '<p><a class="link-btn" href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(b.official) + ': ' + esc(x.link.replace(/^https:\/\//, '')) + ' ' + icon('arrow') + '</a></p>' : '') + '</article>';
      }).join('') + '</div><p class="muted small">' + esc(b.updated) + '</p></div></section>' +
      '<section class="section seasons section-tight"><div class="container"><div class="section-head"><p class="kicker">' + esc(ui().seasons.kicker) + '</p><h2 class="h2">' + esc(ui().seasons.title) + '</h2></div><div class="season-grid">' +
      ui().seasons.items.map(function (s, i) { return '<article class="season season-' + i + '"><h3 class="h4">' + esc(s.name) + '</h3><p class="season-months">' + esc(s.months) + '</p><p>' + esc(s.text) + '</p></article>'; }).join('') + '</div></div></section>';
  }

  /* ---------------------------------------------------------- contact */
  function contactView() {
    var c = ui().contact, links = contactLinks(content().contacts, 'btn btn-outline');
    return pageHead(c.kicker, c.title, c.sub) + '<section class="section section-tight"><div class="container detail-grid"><div class="detail-main"><div class="side-card">' + requestForm('general', { title: false }) + '</div></div>' +
      '<aside class="detail-side">' + (links ? '<div class="side-card"><h2 class="h4">' + esc(c.channels) + '</h2><div class="direct">' + links + '</div></div>' : '') + '</aside></div></section>';
  }

  function creditsView() {
    var c = ui().credits, names = { hero: place('song-kul').name };
    var rows = Object.keys(TH.photos || {}).map(function (k) {
      var p = TH.photos[k], label = names[k] || (place(k) || {}).name || k;
      return '<li class="credit-row"><div class="credit-thumb">' + media(k === 'hero' ? 'hero' : (catalogItem(k) || {}).art || 'issyk', '', label, '', { photo: k }) + '</div>' +
        '<div><strong>' + esc(label) + '</strong><br><a href="' + esc(p.page) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a><br>' +
        esc(c.author) + ': ' + esc(p.author) + ' · ' + esc(c.license) + ': <a href="' + esc(p.licenseUrl) + '" target="_blank" rel="noopener license">' + esc(p.license) + '</a></div></li>';
    }).join('');
    return pageHead(c.kicker, c.title, c.sub) + '<section class="section section-tight"><div class="container"><ul class="credit-list">' + rows + '</ul><p class="muted small">' + esc(c.note) + '</p></div></section>';
  }

  function pageHead(kicker, title, sub, actions) {
    return '<section class="page-head"><div class="container"><p class="kicker">' + esc(kicker) + '</p><h1 class="h1">' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + (actions ? '<div class="head-actions">' + actions + '</div>' : '') + '</div></section>';
  }
  function notFound() {
    return '<section class="page-head"><div class="container"><h1 class="h1">404</h1><p class="sub"><a href="#top">' + esc(ui().notFound) + '</a></p></div></section>';
  }

  /* ----------------------------------------------------------- router */
  var HOME_ANCHORS = ['top', 'feeling', 'journeys', 'land', 'how', 'locals', 'planner', 'seasons', 'faq', 'main', ''];
  function parseRoute() {
    var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (HOME_ANCHORS.indexOf(h) >= 0) return { view: 'home', anchor: h };
    if (h === 'destinations') return { view: 'destinations' };
    if (h.indexOf('d-') === 0) return { view: 'destination', id: h.slice(2) };
    if (h === 'ideas') return { view: 'ideas' };
    if (h.indexOf('i-') === 0) return { view: 'idea', id: h.slice(2) };
    if (h === 'hosts') return { view: 'hosts' };
    if (h.indexOf('h-') === 0) return { view: 'host', id: h.slice(2) };
    if (h === 'become-host') return { view: 'become-host' };
    if (h === 'before-you-go') return { view: 'before' };
    if (h === 'contact') return { view: 'contact' };
    if (h === 'credits') return { view: 'credits' };
    return { view: 'notfound' };
  }
  var current = null;
  function render(opts) {
    opts = opts || {};
    var r = parseRoute(), body;
    switch (r.view) {
      case 'home': body = homeView(); break;
      case 'destinations': body = destinationsView(); break;
      case 'destination': body = destinationView(r.id); break;
      case 'ideas': body = ideasView(); break;
      case 'idea': body = ideaView(r.id); break;
      case 'hosts': body = hostsView(); break;
      case 'host': body = hostView(r.id); break;
      case 'become-host': body = becomeView(); break;
      case 'before': body = beforeView(); break;
      case 'contact': body = contactView(); break;
      case 'credits': body = creditsView(); break;
      default: body = notFound();
    }
    var sameView = current && current.view === r.view && current.id === r.id;
    var app = document.getElementById('app');
    var y = window.scrollY;
    app.innerHTML = header(r.view) + '<main id="main" tabindex="-1">' + body + '</main>' + footer();
    current = r;
    applyMeta(r);
    hydrate(app);
    if (opts.keepScroll) { window.scrollTo(0, y); }
    else if (r.view === 'home' && r.anchor && r.anchor !== 'top' && r.anchor !== 'main') {
      var el = document.getElementById(r.anchor);
      if (el) { el.scrollIntoView({ behavior: sameView ? 'smooth' : 'auto' }); }
    } else if (!sameView || r.anchor === 'top') { window.scrollTo(0, 0); }
    if (!opts.keepScroll && !opts.initial && !sameView) {
      var hd = app.querySelector('main h1');
      if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    }
    setupParallax(r.view === 'home');
    setupPlannerSeen();
  }
  function applyMeta(r) {
    var u = ui(), l = TH.langs.filter(function (x) { return x.code === state.lang; })[0];
    document.documentElement.lang = l ? l.htmlLang : 'en';
    var title = u.meta.title, desc = u.meta.description;
    if (r.view === 'destination' && catalogItem(r.id)) { var p = place(r.id); title = p.name + ' — Travel Horizon'; desc = p.short; }
    if (r.view === 'idea' && route(r.id)) { title = route(r.id).title + ' — Travel Horizon'; desc = route(r.id).text; }
    if (r.view === 'hosts') title = u.hosts.title + ' — Travel Horizon';
    if (r.view === 'before') title = u.before.title + ' — Travel Horizon';
    document.title = title;
    var m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', desc);
    var og = document.querySelector('meta[property="og:title"]'); if (og) og.setAttribute('content', title);
  }

  /* ------------------------------------------------------- hydration */
  function hydrate(rootEl) {
    rootEl.querySelectorAll('img[data-fallback]').forEach(function (img) {
      function drop() {
        var m = img.parentNode;
        if (m && m.classList && m.classList.contains('media') && img.alt) { m.setAttribute('role', 'img'); m.setAttribute('aria-label', img.alt); }
        var c = img.nextElementSibling; if (c && c.classList.contains('credit')) c.remove();
        img.remove();
      }
      if (img.complete && img.naturalWidth === 0 && img.src) drop(); else img.addEventListener('error', drop, { once: true });
      img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
      if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');
    });
  }

  var parallaxBound = false, parallaxOn = false, ticking = false;
  function setupParallax(on) {
    parallaxOn = on && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!parallaxBound) {
      parallaxBound = true;
      window.addEventListener('scroll', function () {
        if (!parallaxOn || ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          var y = window.scrollY, hero = document.querySelector('.hero');
          if (!hero || y > hero.offsetHeight) return;
          var ph = hero.querySelector('.hero-art > img'); if (ph) ph.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0) scale(1.06)';
          hero.querySelectorAll('.art-layer').forEach(function (g) {
            var d = parseFloat(g.getAttribute('data-depth')) || 0;
            g.setAttribute('transform', 'translate(0 ' + (y * d * 1.4).toFixed(1) + ')');
          });
          var hd = document.querySelector('.site-header');
          if (hd) hd.classList.toggle('scrolled', y > 40);
        });
      }, { passive: true });
    }
    var hd = document.querySelector('.site-header');
    if (hd) hd.classList.toggle('scrolled', window.scrollY > 40);
  }
  var seenObserver = null;
  function setupPlannerSeen() {
    if (seenObserver) { seenObserver.disconnect(); seenObserver = null; }
    var el = document.getElementById('planner');
    if (!el || session('th-seen-planner') || !('IntersectionObserver' in window)) return;
    seenObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { session('th-seen-planner', '1'); track('planner_seen'); seenObserver.disconnect(); seenObserver = null; }
      });
    }, { threshold: 0.35 });
    seenObserver.observe(el);
  }

  /* ---------------------------------------------------------- events */
  function setLang(code) {
    if (!TH.ui[code] || code === state.lang) return;
    state.lang = code;
    store(LANG_KEY, code);
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', code);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) { /* address bar may be read-only in some viewers */ }
    render({ keepScroll: true });
  }

  function refreshPlanner() {
    var slot = document.querySelector('.planner-result');
    if (slot) { slot.innerHTML = plannerResult(); hydrate(slot); }
    document.querySelectorAll('.planner .pill').forEach(function (b) {
      var on = state.plan[b.getAttribute('data-group')] === b.getAttribute('data-value');
      b.setAttribute('aria-checked', String(on));
    });
    document.querySelectorAll('.planner [role="radiogroup"]').forEach(function (g) {
      var pills = g.querySelectorAll('.pill'), any = false;
      pills.forEach(function (p) { if (p.getAttribute('aria-checked') === 'true') any = true; });
      pills.forEach(function (p, i) { p.tabIndex = (p.getAttribute('aria-checked') === 'true' || (!any && i === 0)) ? 0 : -1; });
    });
    var key = ideaKey();
    if (key && !state.seenCombos[key]) { state.seenCombos[key] = true; track('planner_result'); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var langBtn = t.closest('[data-lang]');
    if (langBtn) { setLang(langBtn.getAttribute('data-lang')); return; }

    var menu = t.closest('.menu-btn');
    if (menu) { state.menuOpen = !state.menuOpen; var nav = document.getElementById('site-nav'); nav.classList.toggle('open', state.menuOpen); menu.setAttribute('aria-expanded', String(state.menuOpen)); menu.innerHTML = icon(state.menuOpen ? 'close' : 'menu') + '<span class="sr">' + esc(state.menuOpen ? ui().nav.close : ui().nav.menu) + '</span>'; return; }
    if (t.closest('.site-nav a')) state.menuOpen = false;

    var pill = t.closest('.planner .pill');
    if (pill) { state.plan[pill.getAttribute('data-group')] = pill.getAttribute('data-value'); refreshPlanner(); return; }

    var planMood = t.closest('[data-plan-mood]');
    if (planMood) {
      state.plan.mood = planMood.getAttribute('data-plan-mood');
      if (location.hash === '#planner') { refreshPlanner(); document.getElementById('planner').scrollIntoView({ behavior: 'smooth' }); }
      else location.hash = 'planner';
      return;
    }

    var open = t.closest('[data-open-request]');
    if (open) {
      var slot = open.closest('.result-body').querySelector('.request-slot');
      slot.hidden = false; open.hidden = true; track('request_open');
      var first = slot.querySelector('input'); if (first) first.focus();
      return;
    }

    var df = t.closest('[data-dest-filter]');
    if (df) { state.destFilter = df.getAttribute('data-dest-filter'); render({ keepScroll: true }); return; }

    if (t.closest('[data-contact]')) track('contact_click');
  });

  document.addEventListener('keydown', function (e) {
    var pill = e.target.closest && e.target.closest('.planner .pill');
    if (!pill) return;
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    var pills = Array.prototype.slice.call(pill.parentNode.querySelectorAll('.pill'));
    var next = pills[(pills.indexOf(pill) + keys[e.key] + pills.length) % pills.length];
    state.plan[next.getAttribute('data-group')] = next.getAttribute('data-value');
    refreshPlanner();
    var again = document.querySelector('.planner .pill[data-group="' + next.getAttribute('data-group') + '"][data-value="' + next.getAttribute('data-value') + '"]');
    if (again) again.focus();
  });

  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('[data-host-filter]');
    if (sel) {
      state.hostFilter[sel.getAttribute('data-host-filter')] = sel.value;
      var slot = document.querySelector('[data-hosts-slot="all"]');
      if (slot) { slot.innerHTML = hostCards(filteredHosts()); hydrate(slot); }
    }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.classList.contains('request-form')) { e.preventDefault(); submitRequest(form); }
    if (form.classList.contains('host-form')) { e.preventDefault(); submitHost(form); }
  });

  function statusMsg(form, kind, html) {
    var s = form.querySelector('.form-status');
    s.className = 'form-status ' + kind;
    s.innerHTML = html;
  }
  function markInvalid(form, names) {
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    names.forEach(function (n) { var el = form.querySelector('[name="' + n + '"]'); if (el) el.setAttribute('aria-invalid', 'true'); });
    var first = names.length && form.querySelector('[name="' + names[0] + '"]'); if (first) first.focus();
  }

  function submitRequest(form) {
    var u = ui().form, data = {};
    ['name', 'contact', 'country', 'month', 'group', 'note', 'website'].forEach(function (n) { var el = form.querySelector('[name="' + n + '"]'); data[n] = el ? el.value.trim() : ''; });
    var bad = [];
    if (data.name.length < 1) bad.push('name');
    if (data.contact.length < 3) bad.push('contact');
    if (bad.length) { markInvalid(form, bad); statusMsg(form, 'error', esc(u.invalid)); return; }
    markInvalid(form, []);
    data.kind = form.getAttribute('data-kind'); data.idea = form.getAttribute('data-idea'); data.hostId = form.getAttribute('data-host'); data.place = form.getAttribute('data-place');
    data.lang = state.lang; data.page = location.hash || '#top';
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = u.sending;
    fetchJSON(API + '/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }, 8000).then(function () {
      form.querySelectorAll('input, textarea, button').forEach(function (el) { el.disabled = true; });
      btn.textContent = u.send;
      statusMsg(form, 'ok', icon('check') + ' ' + esc(u.success));
    }).catch(function () {
      btn.disabled = false; btn.textContent = u.send;
      var links = contactLinks(content().contacts);
      statusMsg(form, 'error', esc(u.error) + (links ? '<span class="direct">' + links + '</span>' : ''));
    });
  }

  function submitHost(form) {
    var b = ui().become, val = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
    var langs = Array.prototype.slice.call(form.querySelectorAll('[name="languages"]:checked')).map(function (x) { return x.value; });
    var data = {
      name: val('name'), type: val('type'), region: val('region'), languages: langs, about: val('about'), aboutLang: val('aboutLang'),
      offer: { title: val('offerTitle'), duration: val('offerDuration'), priceFrom: val('priceFrom') ? Number(val('priceFrom')) : null },
      contacts: { telegram: val('telegram'), whatsapp: val('whatsapp'), email: val('email') },
      showContacts: form.querySelector('[name="showContacts"]').checked, consent: form.querySelector('[name="consent"]').checked, website: val('website'), lang: state.lang
    };
    var bad = [];
    if (!data.name) bad.push('name'); if (!data.type) bad.push('type'); if (!data.region) bad.push('region');
    if (!langs.length) bad.push('languages'); if (data.about.length < 20) bad.push('about');
    if (!data.offer.title) bad.push('offerTitle'); if (!data.offer.duration) bad.push('offerDuration');
    if (!data.contacts.telegram && !data.contacts.whatsapp && !data.contacts.email) bad.push('telegram');
    if (!data.consent) bad.push('consent');
    if (bad.length) { markInvalid(form, bad); statusMsg(form, 'error', esc(b.invalid)); return; }
    markInvalid(form, []);
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = ui().form.sending;
    fetchJSON(API + '/hosts/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }, 8000).then(function () {
      form.querySelectorAll('input, textarea, select, button').forEach(function (el) { el.disabled = true; });
      btn.textContent = b.send;
      statusMsg(form, 'ok', icon('check') + ' ' + esc(b.success));
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = b.send;
      if (err && err.body && err.body.fields) markInvalid(form, err.body.fields);
      var links = contactLinks(content().contacts);
      statusMsg(form, 'error', esc(err && err.status === 400 ? b.invalid : ui().form.error) + (links && !(err && err.status === 400) ? '<span class="direct">' + links + '</span>' : ''));
    });
  }

  /* ------------------------------------------------------------- start */
  function detectLang() {
    var q = null;
    try { q = new URLSearchParams(window.location.search).get('lang'); } catch (e) { q = null; }
    if (q && TH.ui[q]) return q;
    var saved = store(LANG_KEY);
    if (saved && TH.ui[saved]) return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    nav = nav.toLowerCase().slice(0, 2);
    return TH.ui[nav] ? nav : 'en';
  }

  function start() {
    state.lang = detectLang();
    render({ initial: true });
    window.addEventListener('hashchange', function () { state.menuOpen = false; render(); });
    if (!session('th-visit')) { session('th-visit', '1'); track('visit'); }

    fetchJSON(API + '/content', { headers: { Accept: 'application/json' } }, 4000).then(function (data) {
      if (!data || !data.hero || !Array.isArray(data.journeys)) return;
      state.server = data; render({ keepScroll: true, initial: true });
    }).catch(function () { /* offline: built-in text stays (FR-06) */ });

    fetchJSON(API + '/hosts', { headers: { Accept: 'application/json' } }, 4000).then(function (data) {
      if (!data || !Array.isArray(data.hosts)) throw new Error('no hosts');
      state.hosts = data.hosts;
    }).catch(function () {
      state.hosts = TH.exampleHosts.slice(); state.hostsOffline = true;
    }).then(function () {
      var r = parseRoute();
      if (r.view === 'home' || r.view === 'hosts' || r.view === 'host') render({ keepScroll: true, initial: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
