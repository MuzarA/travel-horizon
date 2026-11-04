/* Nomad Horizon — admin panel. Plain JavaScript; talks only to /api. */
(function () {
  'use strict';
  var TH = window.TH;

  /* ------------------------------------------------------- admin text */
  var L = {
    en: {
      signInTitle: 'Admin sign in', signInSub: 'Nomad Horizon content, requests and hosts.', password: 'Password', signIn: 'Sign in',
      wrong: 'Wrong password. Attempts left: {n}.', blocked: 'Too many attempts. Login is blocked for {m} min.', netError: 'The server did not answer. Is it running?',
      openSite: 'Open site', signOut: 'Sign out', uiLang: 'Panel language',
      tabs: { content: 'Homepage', destinations: 'Destinations', contacts: 'Contacts', requests: 'Requests', hosts: 'Hosts', stats: 'Stats', files: 'Advanced' },
      contentTitle: 'Homepage content', contentSub: 'Edit the hero, the three journey cards and the land section for each language. Changes show after the visitor reloads the page.',
      contentLang: 'Content language', emptyHint: 'Empty fields show the built-in {lang} text (grey placeholder) — visitors never see English instead.',
      meterOwn: 'your own text', meterRest: 'the rest: built-in translation',
      hero: 'Hero', heroHint: 'The first screen. 5 text fields.', cards: 'Journey cards', cardsHint: 'Exactly three cards: Issyk-Kul, Ala-Archa, Sary-Chelek.', card: 'Card', land: 'The land section', landHint: 'Song-Kul and the seasons.',
      f: { eyebrow: 'Small line above the title', titleLine: 'Title', titleEmphasis: 'Title, highlighted part', copyFirst: 'First paragraph', copySecond: 'Second paragraph', label: 'Label', duration: 'Duration', title: 'Title', description: 'Description', image: 'Photo', alt: 'Photo description (alt text)', caption: 'Caption', name: 'Name', short: 'Short line', story: 'Story' },
      save: 'Save', saving: 'Saving…', saved: 'Saved. Visitors see it after reload.', unsaved: 'Unsaved changes', allSaved: 'All changes saved', checkFields: 'Check the highlighted fields.', saveError: 'Could not save: {e}',
      upload: 'Upload photo', remove: 'Remove', urlPh: 'https://… or upload', uploading: 'Uploading…', tooBig: 'The file is larger than 8 MB.', badType: 'Use JPEG, PNG or WebP.', uploaded: 'Photo uploaded. Press Save to publish it.', imgHint: 'JPEG, PNG or WebP up to 8 MB, or a secure https link. Empty = built-in Wikimedia photo with author credit.',
      destTitle: 'Destinations', destSub: 'Override the name, texts and photo of any of the 10 places. Facts (altitude, season) live in catalog.js.',
      contactsTitle: 'Contacts', contactsSub: 'Shown in the footer, on the contact page and when a request cannot be sent. Shared by all languages.', tg: 'Telegram username', wa: 'WhatsApp number', email: 'Email',
      reqTitle: 'Requests', reqSub: 'Every request from the site, newest first. Also sent to Telegram when it is configured.', all: 'All', st: { new: 'New', progress: 'In progress', done: 'Done' },
      col: { date: 'Received', who: 'Traveller', what: 'About', details: 'Details', status: 'Status', tg: 'Telegram' }, noRequests: 'No requests yet.', kind: { trip: 'Trip idea', place: 'Place', host: 'Host', general: 'General' },
      hostsTitle: 'Local hosts', hostsSub: 'Applications from locals. Only approved profiles appear on the site.', hs: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
      approve: 'Approve', reject: 'Reject', del: 'Delete', edit: 'Edit', cancel: 'Cancel', confirmDel: 'Delete this host profile for good?', example: 'Example', noHosts: 'No hosts in this list.',
      hf: { name: 'Name', type: 'Type', region: 'Region', languages: 'Languages', about: 'About', aboutLang: 'About is written in', offerTitle: 'Offer title', offerDuration: 'Duration', priceFrom: 'Price from, USD', telegram: 'Telegram', whatsapp: 'WhatsApp', email: 'Email (never public)', showContacts: 'Show Telegram and WhatsApp on the public profile', image: 'Photo' },
      statsTitle: 'Stats', statsSub: 'Last 30 days. No cookies, no personal data — only counts.', goal: { G1: 'G1 · visitors reach the planner', G2: 'G2 · planner results per 100 visits', G5: 'G5 · requests per 100 visits', G6: 'G6 · requests answered within 24 h' }, target: 'target',
      fn: { visit: 'Visits', planner_seen: 'Saw the planner', planner_result: 'Got a trip idea', request_open: 'Opened request form', request_sent: 'Sent a request' }, daily: 'Last 14 days', contact_click: 'Contact clicks', host_apply: 'Host applications', date: 'Date', noData: 'no data yet',
      filesTitle: 'Advanced: source files', filesSub: 'Edit the public page files directly. Every save keeps a backup; “Restore” brings back the previous version.', warn: 'A mistake here can break the public page. Use Restore if something goes wrong.', file: 'File',
      confirmSave: 'Save {f}? A backup of the current version is kept.', restore: 'Restore previous version', confirmRestore: 'Replace {f} with the latest backup?', restored: 'Restored {f}.', backups: 'backups', noBackup: 'No backup to restore.'
    },
    ru: {
      signInTitle: 'Вход в админку', signInSub: 'Контент, заявки и хосты Nomad Horizon.', password: 'Пароль', signIn: 'Войти',
      wrong: 'Неверный пароль. Осталось попыток: {n}.', blocked: 'Слишком много попыток. Вход заблокирован на {m} мин.', netError: 'Сервер не отвечает. Он запущен?',
      openSite: 'Открыть сайт', signOut: 'Выйти', uiLang: 'Язык панели',
      tabs: { content: 'Главная', destinations: 'Места', contacts: 'Контакты', requests: 'Заявки', hosts: 'Хосты', stats: 'Статистика', files: 'Для продвинутых' },
      contentTitle: 'Контент главной', contentSub: 'Редактируйте первый экран, три карточки и раздел о земле для каждого языка. Посетитель увидит изменения после перезагрузки страницы.',
      contentLang: 'Язык контента', emptyHint: 'Пустые поля показывают встроенный текст на языке «{lang}» (серая подсказка) — английский вместо него посетитель не увидит.',
      meterOwn: 'ваш собственный текст', meterRest: 'остальное — встроенный перевод',
      hero: 'Первый экран', heroHint: 'Первое, что видит посетитель. 5 текстовых полей.', cards: 'Карточки путешествий', cardsHint: 'Ровно три карточки: Иссык-Куль, Ала-Арча, Сары-Челек.', card: 'Карточка', land: 'Раздел «Земля»', landHint: 'Сон-Куль и сезоны.',
      f: { eyebrow: 'Строка над заголовком', titleLine: 'Заголовок', titleEmphasis: 'Заголовок, выделенная часть', copyFirst: 'Первый абзац', copySecond: 'Второй абзац', label: 'Метка', duration: 'Длительность', title: 'Название', description: 'Описание', image: 'Фото', alt: 'Описание фото (alt)', caption: 'Подпись', name: 'Название', short: 'Короткая строка', story: 'Рассказ' },
      save: 'Сохранить', saving: 'Сохраняем…', saved: 'Сохранено. Посетители увидят после перезагрузки.', unsaved: 'Есть несохранённые изменения', allSaved: 'Все изменения сохранены', checkFields: 'Проверьте отмеченные поля.', saveError: 'Не удалось сохранить: {e}',
      upload: 'Загрузить фото', remove: 'Убрать', urlPh: 'https://… или загрузите', uploading: 'Загружаем…', tooBig: 'Файл больше 8 МБ.', badType: 'Нужен JPEG, PNG или WebP.', uploaded: 'Фото загружено. Нажмите «Сохранить», чтобы опубликовать.', imgHint: 'JPEG, PNG или WebP до 8 МБ, либо защищённая ссылка https. Пусто = встроенное фото с Wikimedia с подписью автора.',
      destTitle: 'Места', destSub: 'Можно заменить название, тексты и фото любого из 10 мест. Факты (высота, сезон) хранятся в catalog.js.',
      contactsTitle: 'Контакты', contactsSub: 'Показываются в подвале, на странице контактов и если заявку не удалось отправить. Общие для всех языков.', tg: 'Имя в Telegram', wa: 'Номер WhatsApp', email: 'Почта',
      reqTitle: 'Заявки', reqSub: 'Все заявки с сайта, новые сверху. Если Telegram настроен, они приходят и туда.', all: 'Все', st: { new: 'Новая', progress: 'В работе', done: 'Готово' },
      col: { date: 'Получена', who: 'Путешественник', what: 'О чём', details: 'Детали', status: 'Статус', tg: 'Telegram' }, noRequests: 'Заявок пока нет.', kind: { trip: 'Идея поездки', place: 'Место', host: 'Хост', general: 'Общий вопрос' },
      hostsTitle: 'Местные хосты', hostsSub: 'Заявки от местных. На сайте видны только одобренные профили.', hs: { pending: 'Ждут проверки', approved: 'Одобрены', rejected: 'Отклонены' },
      approve: 'Одобрить', reject: 'Отклонить', del: 'Удалить', edit: 'Изменить', cancel: 'Отмена', confirmDel: 'Удалить профиль хоста навсегда?', example: 'Пример', noHosts: 'В этом списке хостов нет.',
      hf: { name: 'Имя', type: 'Тип', region: 'Регион', languages: 'Языки', about: 'О себе', aboutLang: 'Язык текста «О себе»', offerTitle: 'Название предложения', offerDuration: 'Длительность', priceFrom: 'Цена от, USD', telegram: 'Telegram', whatsapp: 'WhatsApp', email: 'Почта (не публикуется)', showContacts: 'Показывать Telegram и WhatsApp в публичном профиле', image: 'Фото' },
      statsTitle: 'Статистика', statsSub: 'Последние 30 дней. Без cookies и персональных данных — только счётчики.', goal: { G1: 'G1 · доходят до планировщика', G2: 'G2 · результатов на 100 визитов', G5: 'G5 · заявок на 100 визитов', G6: 'G6 · ответ на заявку за 24 ч' }, target: 'цель',
      fn: { visit: 'Визиты', planner_seen: 'Увидели планировщик', planner_result: 'Получили идею', request_open: 'Открыли форму заявки', request_sent: 'Отправили заявку' }, daily: 'Последние 14 дней', contact_click: 'Клики по контактам', host_apply: 'Заявки хостов', date: 'Дата', noData: 'пока нет данных',
      filesTitle: 'Для продвинутых: исходные файлы', filesSub: 'Прямое редактирование файлов сайта. При каждом сохранении делается резервная копия; «Восстановить» возвращает предыдущую версию.', warn: 'Ошибка здесь может сломать сайт. Если что-то пошло не так — нажмите «Восстановить».', file: 'Файл',
      confirmSave: 'Сохранить {f}? Текущая версия останется в резервной копии.', restore: 'Восстановить предыдущую версию', confirmRestore: 'Заменить {f} последней резервной копией?', restored: '{f} восстановлен.', backups: 'копий', noBackup: 'Нет копии для восстановления.'
    },
    ky: {
      signInTitle: 'Админкага кирүү', signInSub: 'Nomad Horizon мазмуну, суроолор жана хосттор.', password: 'Сырсөз', signIn: 'Кирүү',
      wrong: 'Сырсөз туура эмес. Калган аракеттер: {n}.', blocked: 'Аракеттер өтө көп. Кирүү {m} мүнөткө бөгөттөлдү.', netError: 'Сервер жооп бербейт. Ал иштеп жатабы?',
      openSite: 'Сайтты ачуу', signOut: 'Чыгуу', uiLang: 'Панелдин тили',
      tabs: { content: 'Башкы бет', destinations: 'Жерлер', contacts: 'Байланыштар', requests: 'Суроолор', hosts: 'Хосттор', stats: 'Статистика', files: 'Кошумча' },
      contentTitle: 'Башкы беттин мазмуну', contentSub: 'Ар бир тил үчүн биринчи экранды, үч карточканы жана «Жер» бөлүмүн оңдоңуз. Келүүчү өзгөрүүлөрдү бетти кайра жүктөгөндөн кийин көрөт.',
      contentLang: 'Мазмундун тили', emptyHint: 'Бош талааларда «{lang}» тилиндеги даяр текст көрсөтүлөт (боз жазуу) — келүүчү анын ордуна англисче текстти көрбөйт.',
      meterOwn: 'өзүңүздүн текст', meterRest: 'калганы — даяр котормо',
      hero: 'Биринчи экран', heroHint: 'Келүүчү эң биринчи көргөн бөлүк. 5 текст талаасы.', cards: 'Саякат карточкалары', cardsHint: 'Так үч карточка: Ысык-Көл, Ала-Арча, Сары-Челек.', card: 'Карточка', land: '«Жер» бөлүмү', landHint: 'Соң-Көл жана мезгилдер.',
      f: { eyebrow: 'Аталыштын үстүндөгү сап', titleLine: 'Аталыш', titleEmphasis: 'Аталыштын бөлүнгөн бөлүгү', copyFirst: 'Биринчи абзац', copySecond: 'Экинчи абзац', label: 'Белги', duration: 'Узактыгы', title: 'Аталышы', description: 'Сүрөттөмө', image: 'Сүрөт', alt: 'Сүрөттүн сүрөттөмөсү (alt)', caption: 'Кол жазуу', name: 'Аталышы', short: 'Кыска сап', story: 'Баян' },
      save: 'Сактоо', saving: 'Сакталууда…', saved: 'Сакталды. Келүүчүлөр кайра жүктөгөндөн кийин көрүшөт.', unsaved: 'Сакталбаган өзгөрүүлөр бар', allSaved: 'Бардык өзгөрүүлөр сакталды', checkFields: 'Белгиленген талааларды текшериңиз.', saveError: 'Сактоо мүмкүн болбоду: {e}',
      upload: 'Сүрөт жүктөө', remove: 'Алып салуу', urlPh: 'https://… же жүктөңүз', uploading: 'Жүктөлүүдө…', tooBig: 'Файл 8 МБдан чоң.', badType: 'JPEG, PNG же WebP колдонуңуз.', uploaded: 'Сүрөт жүктөлдү. Жарыялоо үчүн «Сактоо» баскычын басыңыз.', imgHint: '8 МБга чейинки JPEG, PNG же WebP, же коопсуз https шилтеме. Бош = автору көрсөтүлгөн Wikimedia сүрөтү.',
      destTitle: 'Жерлер', destSub: '10 жердин каалаганынын аталышын, тексттерин жана сүрөтүн алмаштырсаңыз болот. Фактылар (бийиктик, мезгил) catalog.js файлында.',
      contactsTitle: 'Байланыштар', contactsSub: 'Төмөнкү бөлүктө, байланыш бетинде жана суроо жөнөтүлбөй калганда көрсөтүлөт. Бардык тилдер үчүн жалпы.', tg: 'Telegram аты', wa: 'WhatsApp номери', email: 'E-mail',
      reqTitle: 'Суроолор', reqSub: 'Сайттан келген бардык суроолор, жаңылары жогоруда. Telegram туураланса, ал жакка да келет.', all: 'Баары', st: { new: 'Жаңы', progress: 'Иште', done: 'Бүттү' },
      col: { date: 'Келген', who: 'Саякатчы', what: 'Эмне жөнүндө', details: 'Чоо-жайы', status: 'Абалы', tg: 'Telegram' }, noRequests: 'Азырынча суроолор жок.', kind: { trip: 'Саякат идеясы', place: 'Жер', host: 'Хост', general: 'Жалпы суроо' },
      hostsTitle: 'Жергиликтүү хосттор', hostsSub: 'Жергиликтүүлөрдүн арыздары. Сайтта бекитилген профилдер гана көрүнөт.', hs: { pending: 'Текшерүүнү күтүүдө', approved: 'Бекитилген', rejected: 'Четке кагылган' },
      approve: 'Бекитүү', reject: 'Четке кагуу', del: 'Өчүрүү', edit: 'Оңдоо', cancel: 'Жокко чыгаруу', confirmDel: 'Бул хосттун профилин биротоло өчүрөсүзбү?', example: 'Үлгү', noHosts: 'Бул тизмеде хосттор жок.',
      hf: { name: 'Аты', type: 'Түрү', region: 'Аймак', languages: 'Тилдер', about: 'Өзү жөнүндө', aboutLang: '«Өзү жөнүндө» тексттин тили', offerTitle: 'Сунуштун аталышы', offerDuration: 'Узактыгы', priceFrom: 'Баасы, USD', telegram: 'Telegram', whatsapp: 'WhatsApp', email: 'E-mail (жарыяланбайт)', showContacts: 'Telegram жана WhatsApp ачык профилде көрсөтүлсүн', image: 'Сүрөт' },
      statsTitle: 'Статистика', statsSub: 'Акыркы 30 күн. Cookie жана жеке маалымат жок — эсептегичтер гана.', goal: { G1: 'G1 · пландоочуга жеткендер', G2: 'G2 · 100 кирүүгө идеялар', G5: 'G5 · 100 кирүүгө суроолор', G6: 'G6 · 24 саатта жооп берилген' }, target: 'максат',
      fn: { visit: 'Кирүүлөр', planner_seen: 'Пландоочуну көрүштү', planner_result: 'Идея алышты', request_open: 'Суроо формасын ачышты', request_sent: 'Суроо жөнөтүштү' }, daily: 'Акыркы 14 күн', contact_click: 'Байланышка басуулар', host_apply: 'Хост арыздары', date: 'Күнү', noData: 'азырынча маалымат жок',
      filesTitle: 'Кошумча: булак файлдар', filesSub: 'Сайттын файлдарын түз оңдоо. Ар бир сактоодо камдык көчүрмө кала берет; «Калыбына келтирүү» мурунку версияны кайтарат.', warn: 'Бул жердеги ката сайтты бузуп коюшу мүмкүн. Бир нерсе туура эмес болсо — «Калыбына келтирүүнү» басыңыз.', file: 'Файл',
      confirmSave: '{f} сакталсынбы? Учурдагы версия камдык көчүрмөдө калат.', restore: 'Мурунку версияны калыбына келтирүү', confirmRestore: '{f} акыркы камдык көчүрмө менен алмаштырылсынбы?', restored: '{f} калыбына келтирилди.', backups: 'көчүрмө', noBackup: 'Калыбына келтире турган көчүрмө жок.'
    }
  };

  var ADMIN_LANG_KEY = 'th-admin-lang';
  var S = {
    ui: 'ru', tab: 'content', lang: 'en', content: null, draft: {}, dirty: {},
    destSlug: TH.catalog[0].slug, requests: null, reqFilter: 'all', hosts: null, hostFilter: 'pending', editing: null, stats: null, file: 'index.html'
  };
  try { var saved = localStorage.getItem(ADMIN_LANG_KEY); if (L[saved]) S.ui = saved; else if (/^en/.test(navigator.language)) S.ui = 'en'; } catch (e) { /* ignore */ }

  function t() { return L[S.ui]; }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o && o[k] != null ? o[k] : ''; }); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var toastTimer;
  function toast(msg, error) {
    var el = $('#toast'); el.textContent = msg; el.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.className = 'toast'; }, 3600);
  }
  function api(method, url, body, raw) {
    var opts = { method: method, headers: {}, credentials: 'same-origin' };
    if (raw) { opts.body = raw; opts.headers['Content-Type'] = raw.type; }
    else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401 && url !== '/api/login') { renderLogin(); throw Object.assign(new Error('login_required'), { status: 401, data: data }); }
        if (!res.ok) throw Object.assign(new Error(data.error || ('HTTP ' + res.status)), { status: res.status, data: data });
        return data;
      });
    });
  }
  var LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="11" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5 25 Q32 13 59 25 M5 39 Q32 51 59 39 M25 5 Q13 32 25 59 M39 5 Q51 32 39 59" fill="none" stroke="#e39a52" stroke-width="2.6"/></svg>';
  function uiLangSelect(id) {
    return '<label class="sr" for="' + id + '">' + esc(t().uiLang) + '</label><select id="' + id + '" data-ui-lang>' +
      [['ru', 'Русский'], ['ky', 'Кыргызча'], ['en', 'English']].map(function (l) { return '<option value="' + l[0] + '"' + (S.ui === l[0] ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') + '</select>';
  }

  /* ------------------------------------------------------------ login */
  function renderLogin(message) {
    document.documentElement.lang = S.ui;
    $('#admin').innerHTML = '<div class="login"><form class="login-card" id="login-form"><div class="brand-row">' + LOGO + uiLangSelect('ui-lang-login') + '</div>' +
      '<h1>' + esc(t().signInTitle) + '</h1><p>' + esc(t().signInSub) + '</p>' +
      '<div class="field"><label for="pw">' + esc(t().password) + '</label><input id="pw" type="password" autocomplete="current-password" required></div>' +
      '<p class="notice" id="login-msg"' + (message ? '' : ' hidden') + ' role="alert">' + esc(message || '') + '</p>' +
      '<button class="btn" type="submit">' + esc(t().signIn) + '</button></form></div>';
    $('#pw').focus();
  }
  function doLogin(pw) {
    var msg = $('#login-msg'), btn = $('#login-form button');
    btn.disabled = true;
    api('POST', '/api/login', { password: pw }).then(function () { loadAll(); }).catch(function (e) {
      btn.disabled = false;
      var d = e.data || {};
      msg.hidden = false;
      if (e.status === 401) msg.textContent = fmt(t().wrong, { n: d.attemptsLeft });
      else if (e.status === 429) msg.textContent = fmt(t().blocked, { m: Math.ceil((d.retryAfterSeconds || 900) / 60) });
      else msg.textContent = t().netError;
      $('#pw').select();
    });
  }

  /* ------------------------------------------------------------ shell */
  function shell() {
    document.documentElement.lang = S.ui;
    var tabs = ['content', 'destinations', 'contacts', 'requests', 'hosts', 'stats', 'files'];
    var counts = { requests: S.requests ? S.requests.filter(function (r) { return r.status === 'new'; }).length : 0, hosts: S.hosts ? S.hosts.filter(function (h) { return h.status === 'pending'; }).length : 0 };
    $('#admin').innerHTML = '<header class="topbar"><div class="topbar-inner"><a class="brand" href="/admin/">' + LOGO + 'Nomad Horizon</a><span class="spacer"></span>' +
      uiLangSelect('ui-lang') + '<a href="/" target="_blank" rel="noopener">' + esc(t().openSite) + '</a><button class="btn btn-small btn-light" data-logout type="button">' + esc(t().signOut) + '</button></div>' +
      '<nav class="tabs" role="tablist">' + tabs.map(function (k) {
        return '<button class="tab" role="tab" type="button" data-tab="' + k + '" aria-selected="' + (S.tab === k) + '">' + esc(t().tabs[k]) + (counts[k] ? '<span class="count">' + counts[k] + '</span>' : '') + '</button>';
      }).join('') + '</nav></header><main id="view" tabindex="-1"></main>';
    $('[data-logout]').classList.add('btn-logout');
    renderTab();
  }
  function renderTab() {
    var v = $('#view');
    if (!v) return;
    ({ content: viewContent, destinations: viewDestinations, contacts: viewContacts, requests: viewRequests, hosts: viewHosts, stats: viewStats, files: viewFiles })[S.tab](v);
  }

  /* ----------------------------------------------------- content draft */
  function emptyCard() { return { label: '', duration: '', title: '', description: '', image: '', alt: '' }; }
  function buildDraft() {
    var c = S.content;
    function pick(src) {
      src = src || {};
      var hero = {}; ['eyebrow', 'titleLine', 'titleEmphasis', 'copyFirst', 'copySecond'].forEach(function (k) { hero[k] = (src.hero && src.hero[k]) || ''; });
      var journeys = [0, 1, 2].map(function (i) { var x = (src.journeys && src.journeys[i]) || {}, o = emptyCard(); for (var k in o) o[k] = x[k] || ''; return o; });
      var land = {}; ['titleLine', 'titleEmphasis', 'description', 'image', 'alt', 'caption'].forEach(function (k) { land[k] = (src.land && src.land[k]) || ''; });
      var destinations = {}; TH.catalog.forEach(function (d) { var x = (src.destinations && src.destinations[d.slug]) || {}; destinations[d.slug] = { name: x.name || '', short: x.short || '', story: x.story || '', image: x.image || '', alt: x.alt || '' }; });
      return { hero: hero, journeys: journeys, land: land, destinations: destinations };
    }
    S.draft = { en: pick(c), ky: pick(c.locales && c.locales.ky), ru: pick(c.locales && c.locales.ru) };
    S.dirty = {};
  }
  function getPath(obj, p) { return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function setPath(obj, p, val) { var ks = p.split('.'), last = ks.pop(); var o = ks.reduce(function (a, k) { return a[k]; }, obj); o[last] = val; }
  function placeholderFor(path) {
    var lang = S.lang, parts = path.split('.');
    if (parts[0] === 'destinations') { var pl = (TH.places[lang] || TH.places.en)[parts[1]] || {}; return parts[2] === 'alt' ? pl.name : (pl[parts[2]] || ''); }
    return getPath(TH.defaults[lang], path) || '';
  }
  function input(path, label, opts) {
    opts = opts || {};
    var val = getPath(S.draft[S.lang], path) || '', ph = opts.noPh ? '' : placeholderFor(path), id = 'f-' + path.replace(/\./g, '-');
    var tag = opts.area ? '<textarea id="' + id + '" data-path="' + esc(path) + '" maxlength="' + opts.max + '" placeholder="' + esc(ph) + '" rows="' + (opts.rows || 3) + '">' + esc(val) + '</textarea>'
      : '<input id="' + id + '" data-path="' + esc(path) + '" maxlength="' + opts.max + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '">';
    return '<div class="field" data-field="' + esc(path) + '"><label for="' + id + '">' + esc(label) + '</label>' + tag + '<div class="meta"><span></span><span data-len>' + val.length + ' / ' + opts.max + '</span></div></div>';
  }
  function imageField(path, scene, label) {
    var val = getPath(S.draft[S.lang], path) || '', id = 'f-' + path.replace(/\./g, '-');
    var enVal = S.lang !== 'en' ? getPath(S.draft.en, path) || '' : '';
    var parts = path.split('.'), slug = parts[0] === 'journeys' ? ['issyk-kul', 'ala-archa', 'sary-chelek'][Number(parts[1])] : parts[0] === 'land' ? 'song-kul' : parts[1];
    var builtin = (TH.photos || {})[slug];
    var shown = val || enVal || (builtin ? builtin.src : '');
    return '<div class="field" data-field="' + esc(path) + '"><label for="' + id + '">' + esc(label) + '</label><div class="imgfield"><div class="thumb">' + TH.art(scene) + (shown ? '<img src="' + esc(shown) + '" alt="" referrerpolicy="no-referrer">' : '') + '</div>' +
      '<div><input id="' + id + '" data-path="' + esc(path) + '" data-image value="' + esc(val) + '" placeholder="' + esc(enVal || t().urlPh) + '" maxlength="600">' +
      '<div class="img-actions"><span class="btn btn-small btn-light file-btn">' + esc(t().upload) + '<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="' + esc(path) + '" aria-label="' + esc(t().upload) + '"></span>' +
      '<button type="button" class="btn btn-small btn-danger" data-clear="' + esc(path) + '">' + esc(t().remove) + '</button></div><p class="muted small">' + esc(t().imgHint) + '</p></div></div></div>';
  }
  function langSeg() {
    return '<div class="seg" role="group" aria-label="' + esc(t().contentLang) + '">' + TH.langs.map(function (l) {
      return '<button type="button" data-clang="' + l.code + '" aria-pressed="' + (S.lang === l.code) + '">' + l.label + (S.dirty[l.code] ? ' •' : '') + '</button>';
    }).join('') + '</div>';
  }
  function meters() {
    var fields = ['hero.eyebrow', 'hero.titleLine', 'hero.titleEmphasis', 'hero.copyFirst', 'hero.copySecond', 'land.titleLine', 'land.titleEmphasis', 'land.description', 'land.alt', 'land.caption'];
    [0, 1, 2].forEach(function (i) { ['label', 'duration', 'title', 'description', 'alt'].forEach(function (k) { fields.push('journeys.' + i + '.' + k); }); });
    return '<div class="meters">' + TH.langs.map(function (l) {
      var n = fields.filter(function (f) { return getPath(S.draft[l.code], f); }).length, pct = Math.round(n / fields.length * 100);
      return '<div class="meter"><strong>' + l.label + ' · ' + esc(l.name) + '</strong><div class="bar"><span data-pct="' + pct + '"></span></div><small>' + n + ' / ' + fields.length + ' ' + esc(t().meterOwn) + (n < fields.length ? '; ' + esc(t().meterRest) : '') + '</small></div>';
    }).join('') + '</div>';
  }
  function saveBar() {
    var dirty = !!S.dirty[S.lang];
    return '<div class="savebar"><div class="savebar-inner"><button class="btn" type="button" data-save-content>' + esc(t().save) + ' · ' + S.lang.toUpperCase() + '</button><span class="state' + (dirty ? ' dirty' : '') + '" data-state>' + esc(dirty ? t().unsaved : t().allSaved) + '</span></div></div>';
  }
  function viewContent(v) {
    var f = t().f, langName = (TH.langs.filter(function (l) { return l.code === S.lang; })[0] || {}).name;
    var scenes = ['issyk', 'alaarcha', 'sarychelek'], names = ['Issyk-Kul', 'Ala-Archa', 'Sary-Chelek'];
    v.innerHTML = '<h2 class="page">' + esc(t().contentTitle) + '</h2><p class="page-sub">' + esc(t().contentSub) + '</p>' + meters() +
      '<div class="toolbar">' + langSeg() + '<span class="muted small">' + esc(fmt(t().emptyHint, { lang: langName })) + '</span></div>' +
      '<section class="panel"><h3>' + esc(t().hero) + '</h3><p class="hint">' + esc(t().heroHint) + '</p><div class="grid">' +
      input('hero.eyebrow', f.eyebrow, { max: 120 }) + input('hero.titleLine', f.titleLine, { max: 80 }) + input('hero.titleEmphasis', f.titleEmphasis, { max: 80 }) + '</div><div class="grid">' +
      input('hero.copyFirst', f.copyFirst, { max: 400, area: true }) + input('hero.copySecond', f.copySecond, { max: 400, area: true }) + '</div></section>' +
      '<section class="panel"><h3>' + esc(t().cards) + '</h3><p class="hint">' + esc(t().cardsHint) + '</p><div class="grid-3">' + [0, 1, 2].map(function (i) {
        var p = 'journeys.' + i + '.';
        return '<div><h4>' + esc(t().card) + ' ' + (i + 1) + ' · ' + names[i] + '</h4>' + input(p + 'label', f.label, { max: 60 }) + input(p + 'duration', f.duration, { max: 40 }) + input(p + 'title', f.title, { max: 80 }) +
          input(p + 'description', f.description, { max: 500, area: true, rows: 5 }) + imageField(p + 'image', scenes[i], f.image) + input(p + 'alt', f.alt, { max: 200 }) + '</div>';
      }).join('') + '</div></section>' +
      '<section class="panel"><h3>' + esc(t().land) + '</h3><p class="hint">' + esc(t().landHint) + '</p><div class="grid">' + input('land.titleLine', f.titleLine, { max: 80 }) + input('land.titleEmphasis', f.titleEmphasis, { max: 80 }) + input('land.caption', f.caption, { max: 160 }) + '</div>' +
      input('land.description', f.description, { max: 1500, area: true, rows: 5 }) + '<div class="grid">' + imageField('land.image', 'songkul', f.image) + input('land.alt', f.alt, { max: 200 }) + '</div></section>' + saveBar();
    hydrateImages(v);
  }
  function viewDestinations(v) {
    var f = t().f, slug = S.destSlug, c = TH.catalog.filter(function (x) { return x.slug === slug; })[0];
    var list = TH.catalog.map(function (d) {
      var x = S.draft[S.lang].destinations[d.slug], changed = x && (x.name || x.short || x.story || x.image || x.alt);
      return '<li><button type="button" data-dest="' + d.slug + '" aria-current="' + (d.slug === slug) + '">' + esc((TH.places[S.lang] || TH.places.en)[d.slug].name) + (changed ? '<span class="dot" title="custom"></span>' : '') + '</button></li>';
    }).join('');
    var p = 'destinations.' + slug + '.';
    v.innerHTML = '<h2 class="page">' + esc(t().destTitle) + '</h2><p class="page-sub">' + esc(t().destSub) + '</p><div class="toolbar">' + langSeg() + '</div>' +
      '<div class="dest-layout"><ul class="dest-list">' + list + '</ul><section class="panel"><h3>' + esc((TH.places[S.lang] || TH.places.en)[slug].name) + '</h3><p class="hint">' + esc(c.altitude) + ' · ' + esc((TH.regions[S.lang] || TH.regions.en)[c.region]) + '</p>' +
      '<div class="grid">' + input(p + 'name', f.name, { max: 60 }) + input(p + 'short', f.short, { max: 200 }) + '</div>' + input(p + 'story', f.story, { max: 1500, area: true, rows: 6 }) +
      '<div class="grid">' + imageField(p + 'image', c.art, f.image) + input(p + 'alt', f.alt, { max: 200 }) + '</div></section></div>' + saveBar();
    hydrateImages(v);
  }
  function hydrateImages(root) {
    $$('[data-pct]', root).forEach(function (el) { el.style.width = el.getAttribute('data-pct') + '%'; });
    $$('img', root).forEach(function (img) { img.addEventListener('error', function () { img.remove(); }, { once: true }); });
  }
  function markDirty() {
    S.dirty[S.lang] = true;
    var st = $('[data-state]'); if (st) { st.textContent = t().unsaved; st.classList.add('dirty'); }
    var b = $('[data-clang="' + S.lang + '"]'); if (b && b.textContent.indexOf('•') < 0) b.textContent += ' •';
  }
  function saveContent() {
    var btn = $('[data-save-content]'); btn.disabled = true; btn.textContent = t().saving;
    $$('.field.invalid').forEach(function (x) { x.classList.remove('invalid'); });
    var d = S.draft[S.lang], dest = {};
    Object.keys(d.destinations).forEach(function (k) { var x = d.destinations[k]; if (x.name || x.short || x.story || x.image || x.alt) dest[k] = x; });
    api('PUT', '/api/content', { lang: S.lang, hero: d.hero, journeys: d.journeys, land: d.land, destinations: dest }).then(function () {
      S.dirty[S.lang] = false; toast(t().saved);
      return api('GET', '/api/content').then(function (c) { S.content = c; });
    }).then(function () { renderTab(); }).catch(function (e) {
      btn.disabled = false; btn.textContent = t().save + ' · ' + S.lang.toUpperCase();
      if (e.status === 400 && e.data && e.data.fields) {
        e.data.fields.forEach(function (p) { var el = $('[data-field="' + p + '"]'); if (el) el.classList.add('invalid'); });
        var first = $('.field.invalid input, .field.invalid textarea'); if (first) first.focus();
        toast(t().checkFields, true);
      } else if (e.status !== 401) toast(fmt(t().saveError, { e: e.message }), true);
    });
  }
  function uploadFile(file, cb) {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) < 0) return toast(t().badType, true);
    if (file.size > 8 * 1024 * 1024) return toast(t().tooBig, true);
    toast(t().uploading);
    api('POST', '/api/uploads', undefined, file).then(function (r) { cb(r.url); toast(t().uploaded); }).catch(function (e) {
      if (e.status !== 401) toast(e.status === 413 ? t().tooBig : e.status === 415 ? t().badType : fmt(t().saveError, { e: e.message }), true);
    });
  }
  function setThumb(fieldEl, url) {
    var th = $('.thumb', fieldEl), old = $('img', th); if (old) old.remove();
    if (url) { var img = document.createElement('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = url; img.addEventListener('error', function () { img.remove(); }); th.appendChild(img); }
  }

  /* --------------------------------------------------------- contacts */
  function viewContacts(v) {
    var c = (S.content && S.content.contacts) || {};
    v.innerHTML = '<h2 class="page">' + esc(t().contactsTitle) + '</h2><p class="page-sub">' + esc(t().contactsSub) + '</p><form class="panel" id="contacts-form" novalidate><div class="grid">' +
      '<div class="field" data-field="telegram"><label for="c-tg">' + esc(t().tg) + '</label><input id="c-tg" name="telegram" value="' + esc(c.telegram) + '" placeholder="@nomadhorizon"></div>' +
      '<div class="field" data-field="whatsapp"><label for="c-wa">' + esc(t().wa) + '</label><input id="c-wa" name="whatsapp" value="' + esc(c.whatsapp) + '" placeholder="+996 …"></div>' +
      '<div class="field" data-field="email"><label for="c-em">' + esc(t().email) + '</label><input id="c-em" name="email" type="email" value="' + esc(c.email) + '"></div></div>' +
      '<button class="btn" type="submit">' + esc(t().save) + '</button></form>';
  }

  /* --------------------------------------------------------- requests */
  function viewRequests(v) {
    if (!S.requests) { v.innerHTML = '<p>…</p>'; return; }
    var st = t().st, list = S.requests.filter(function (r) { return S.reqFilter === 'all' || r.status === S.reqFilter; });
    var seg = '<div class="seg" role="group">' + ['all', 'new', 'progress', 'done'].map(function (k) { return '<button type="button" data-reqf="' + k + '" aria-pressed="' + (S.reqFilter === k) + '">' + esc(k === 'all' ? t().all : st[k]) + '</button>'; }).join('') + '</div>';
    var rows = list.map(function (r) {
      var what = r.kind === 'trip' && TH.routes[S.ui] ? (TH.routes[S.ui] || TH.routes.en)[r.idea].title : r.kind === 'place' ? (TH.places[S.ui] || TH.places.en)[r.place].name : r.kind === 'host' ? r.hostName : '';
      var contact = /@/.test(r.contact) && /\./.test(r.contact) ? '<a href="mailto:' + esc(r.contact) + '">' + esc(r.contact) + '</a>' : esc(r.contact);
      return '<tr><td>' + esc(new Date(r.createdAt).toLocaleString(S.ui === 'en' ? 'en-GB' : 'ru-RU')) + '</td><td><strong>' + esc(r.name) + '</strong><br>' + contact + (r.country ? '<br><span class="muted">' + esc(r.country) + '</span>' : '') + '</td>' +
        '<td><span class="pill">' + esc(t().kind[r.kind] || r.kind) + '</span><br>' + esc(what) + '</td>' +
        '<td>' + (r.month ? esc(r.month) + '<br>' : '') + (r.group ? '👥 ' + esc(r.group) + '<br>' : '') + (r.note ? '<span class="about">' + esc(r.note) + '</span><br>' : '') + '<span class="muted small">' + esc((r.lang || '').toUpperCase()) + '</span></td>' +
        '<td><select data-req-status="' + esc(r.id) + '" aria-label="' + esc(t().col.status) + '">' + ['new', 'progress', 'done'].map(function (k) { return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' + esc(st[k]) + '</option>'; }).join('') + '</select></td>' +
        '<td><span class="pill ' + esc(r.telegram || '') + '">' + esc(r.telegram || '—') + '</span></td></tr>';
    }).join('');
    v.innerHTML = '<h2 class="page">' + esc(t().reqTitle) + '</h2><p class="page-sub">' + esc(t().reqSub) + '</p><div class="toolbar">' + seg + '</div>' +
      (list.length ? '<div class="table-wrap"><table><thead><tr><th>' + esc(t().col.date) + '</th><th>' + esc(t().col.who) + '</th><th>' + esc(t().col.what) + '</th><th>' + esc(t().col.details) + '</th><th>' + esc(t().col.status) + '</th><th>' + esc(t().col.tg) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">' + esc(t().noRequests) + '</div>');
  }

  /* ------------------------------------------------------------ hosts */
  function viewHosts(v) {
    if (!S.hosts) { v.innerHTML = '<p>…</p>'; return; }
    var hs = t().hs, types = (TH.ui[S.ui] || TH.ui.en).hostTypes, regions = TH.regions[S.ui] || TH.regions.en;
    var seg = '<div class="seg" role="group">' + ['pending', 'approved', 'rejected', 'all'].map(function (k) {
      var n = k === 'all' ? S.hosts.length : S.hosts.filter(function (h) { return h.status === k; }).length;
      return '<button type="button" data-hostf="' + k + '" aria-pressed="' + (S.hostFilter === k) + '">' + esc(k === 'all' ? t().all : hs[k]) + ' (' + n + ')</button>';
    }).join('') + '</div>';
    var list = S.hosts.filter(function (h) { return S.hostFilter === 'all' || h.status === S.hostFilter; });
    v.innerHTML = '<h2 class="page">' + esc(t().hostsTitle) + '</h2><p class="page-sub">' + esc(t().hostsSub) + '</p><div class="toolbar">' + seg + '</div>' +
      (list.length ? list.map(function (h) {
        if (S.editing === h.id) return hostEditor(h);
        var c = h.contacts || {};
        return '<article class="panel host-row"><div class="avatar-wrap">' + TH.avatar(h.name, h.id) + (h.image ? '<img src="' + esc(h.image) + '" alt="" referrerpolicy="no-referrer">' : '') + '</div><div>' +
          '<h3>' + esc(h.name) + ' <span class="pill ' + esc(h.status) + '">' + esc(hs[h.status]) + '</span>' + (h.example ? ' <span class="pill">' + esc(t().example) + '</span>' : '') + '</h3>' +
          '<p class="muted small">' + esc(types[h.type] || h.type) + ' · ' + esc(regions[h.region] || h.region) + ' · ' + (h.languages || []).map(function (l) { return esc(TH.spoken[l] || l); }).join(', ') + ' · ' + esc(new Date(h.createdAt).toLocaleDateString()) + '</p>' +
          '<p><strong>' + esc(h.offer && h.offer.title) + '</strong> — ' + esc(h.offer && h.offer.duration) + (h.offer && h.offer.priceFrom ? ' · ' + esc(h.offer.priceFrom) + ' USD' : '') + '</p>' +
          '<p class="about">' + esc(h.about) + '</p><p class="small">' + [c.telegram && 'Telegram @' + esc(c.telegram), c.whatsapp && 'WhatsApp ' + esc(c.whatsapp), c.email && esc(c.email)].filter(Boolean).join(' · ') + '</p></div>' +
          '<div class="host-actions">' + (h.status !== 'approved' ? '<button class="btn btn-small btn-ok" data-host-status="approved" data-id="' + esc(h.id) + '">' + esc(t().approve) + '</button>' : '') +
          (h.status !== 'rejected' ? '<button class="btn btn-small btn-light" data-host-status="rejected" data-id="' + esc(h.id) + '">' + esc(t().reject) + '</button>' : '') +
          '<button class="btn btn-small btn-light" data-host-edit="' + esc(h.id) + '">' + esc(t().edit) + '</button><button class="btn btn-small btn-danger" data-host-del="' + esc(h.id) + '">' + esc(t().del) + '</button></div></article>';
      }).join('') : '<div class="empty">' + esc(t().noHosts) + '</div>');
    hydrateImages(v);
  }
  function hostEditor(h) {
    var f = t().hf, types = (TH.ui[S.ui] || TH.ui.en).hostTypes, regions = TH.regions[S.ui] || TH.regions.en, c = h.contacts || {}, o = h.offer || {};
    function fi(name, label, val, extra) { return '<div class="field" data-field="' + name + '"><label for="he-' + name + '">' + esc(label) + '</label><input id="he-' + name + '" name="' + name + '" value="' + esc(val == null ? '' : val) + '"' + (extra || '') + '></div>'; }
    function sel(name, label, opts, val) { return '<div class="field" data-field="' + name + '"><label for="he-' + name + '">' + esc(label) + '</label><select id="he-' + name + '" name="' + name + '">' + opts.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === val ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></div>'; }
    return '<form class="panel" data-host-form="' + esc(h.id) + '" novalidate><h3>' + esc(h.name) + '</h3><div class="grid">' + fi('name', f.name, h.name, ' maxlength="80"') +
      sel('type', f.type, TH.hostTypeKeys.map(function (k) { return [k, types[k]]; }), h.type) + sel('region', f.region, Object.keys(TH.regions.en).map(function (k) { return [k, regions[k]]; }), h.region) +
      sel('aboutLang', f.aboutLang, TH.langs.map(function (l) { return [l.code, l.name]; }), h.aboutLang) + '</div>' +
      '<div class="field" data-field="languages"><span class="small"><strong>' + esc(f.languages) + '</strong></span><div class="checks">' + Object.keys(TH.spoken).map(function (l) { return '<label><input type="checkbox" name="languages" value="' + l + '"' + ((h.languages || []).indexOf(l) >= 0 ? ' checked' : '') + '>' + esc(TH.spoken[l]) + '</label>'; }).join('') + '</div></div>' +
      '<div class="field" data-field="about"><label for="he-about">' + esc(f.about) + '</label><textarea id="he-about" name="about" rows="5" maxlength="1500">' + esc(h.about) + '</textarea></div>' +
      '<div class="grid">' + fi('offerTitle', f.offerTitle, o.title, ' maxlength="120"') + fi('offerDuration', f.offerDuration, o.duration, ' maxlength="40"') + fi('priceFrom', f.priceFrom, o.priceFrom, ' type="number" min="0"') + '</div>' +
      '<div class="grid">' + fi('telegram', f.telegram, c.telegram, ' maxlength="33"') + fi('whatsapp', f.whatsapp, c.whatsapp, ' maxlength="24"') + fi('email', f.email, c.email, ' maxlength="120"') + '</div>' +
      '<label class="checks"><label><input type="checkbox" name="showContacts"' + (h.showContacts ? ' checked' : '') + '>' + esc(f.showContacts) + '</label></label>' +
      '<div class="field" data-field="image"><label for="he-image">' + esc(f.image) + '</label><div class="imgfield"><div class="thumb">' + TH.avatar(h.name, h.id) + (h.image ? '<img src="' + esc(h.image) + '" alt="">' : '') + '</div><div><input id="he-image" name="image" value="' + esc(h.image) + '" maxlength="600" placeholder="https://…">' +
      '<div class="img-actions"><span class="btn btn-small btn-light file-btn">' + esc(t().upload) + '<input type="file" accept="image/jpeg,image/png,image/webp" data-host-upload aria-label="' + esc(t().upload) + '"></span></div></div></div></div>' +
      '<div class="host-actions"><button class="btn" type="submit">' + esc(t().save) + '</button><button class="btn btn-light" type="button" data-host-cancel>' + esc(t().cancel) + '</button></div></form>';
  }
  function hostPatch(id, body) {
    return api('PATCH', '/api/admin/hosts/' + encodeURIComponent(id), body).then(function (r) {
      S.hosts = S.hosts.map(function (h) { return h.id === id ? r.host : h; }); return r;
    });
  }

  /* ------------------------------------------------------------ stats */
  function viewStats(v) {
    if (!S.stats) { v.innerHTML = '<p>…</p>'; return; }
    var s = S.stats, fn = t().fn;
    var goals = ['G1', 'G2', 'G5', 'G6'].map(function (k) {
      var g = s.goals[k], val = g.value == null ? null : Math.round(g.value * 10) / 10;
      return '<div class="goal ' + (val == null ? '' : val >= g.target ? 'hit' : 'miss') + '"><div class="small"><strong>' + esc(t().goal[k]) + '</strong></div><div class="v">' + (val == null ? '—' : val + (g.unit === '%' ? '%' : '')) + '</div><div class="t">' + esc(t().target) + ': ' + g.target + (g.unit === '%' ? '%' : '') + (val == null ? ' · ' + esc(t().noData) : '') + '</div></div>';
    }).join('');
    var steps = ['visit', 'planner_seen', 'planner_result', 'request_open', 'request_sent'], max = Math.max(1, s.totals.visit || 0);
    var funnel = steps.map(function (k) {
      var n = s.totals[k] || 0;
      return '<div class="funnel-row"><span>' + esc(fn[k]) + '</span><div class="track"><div class="fill"></div></div><span class="n">' + n + '</span></div>';
    }).join('');
    var days = s.days.slice(-14).reverse().map(function (d) {
      return '<tr><td>' + esc(d.date) + '</td>' + steps.concat(['contact_click', 'host_apply']).map(function (k) { return '<td>' + d[k] + '</td>'; }).join('') + '</tr>';
    }).join('');
    v.innerHTML = '<h2 class="page">' + esc(t().statsTitle) + '</h2><p class="page-sub">' + esc(t().statsSub) + '</p><div class="goals">' + goals + '</div>' +
      '<section class="panel"><div class="funnel">' + funnel + '</div></section><h3>' + esc(t().daily) + '</h3><div class="table-wrap"><table><thead><tr><th>' + esc(t().date) + '</th>' +
      steps.map(function (k) { return '<th>' + esc(fn[k]) + '</th>'; }).join('') + '<th>' + esc(t().contact_click) + '</th><th>' + esc(t().host_apply) + '</th></tr></thead><tbody>' + days + '</tbody></table></div>';
    steps.forEach(function (k, i) { var el = $$('.fill', v)[i]; if (el) el.style.width = Math.min(100, (s.totals[k] || 0) / max * 100).toFixed(1) + '%'; });
  }

  /* ------------------------------------------------------------ files */
  function viewFiles(v) {
    v.innerHTML = '<h2 class="page">' + esc(t().filesTitle) + '</h2><p class="page-sub">' + esc(t().filesSub) + '</p><p class="notice">' + esc(t().warn) + '</p>' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="' + esc(t().file) + '">' + ['index.html', 'styles.css', 'script.js'].map(function (n) { return '<button type="button" data-file="' + n + '" aria-pressed="' + (S.file === n) + '">' + n + '</button>'; }).join('') + '</div><span class="muted small" data-backups></span></div>' +
      '<div class="field"><label for="code" class="sr">' + esc(S.file) + '</label><textarea id="code" class="code" spellcheck="false">…</textarea></div>' +
      '<div class="toolbar"><button class="btn" type="button" data-file-save>' + esc(t().save) + '</button><button class="btn btn-light" type="button" data-file-restore>' + esc(t().restore) + '</button></div>';
    api('GET', '/api/files/' + S.file).then(function (r) { $('#code').value = r.content; });
    api('GET', '/api/files').then(function (r) { var f = r.files.filter(function (x) { return x.name === S.file; })[0]; if (f) $('[data-backups]').textContent = f.backups + ' ' + t().backups; });
  }

  /* ------------------------------------------------------------ events */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'login-form') { e.preventDefault(); doLogin($('#pw').value); }
    if (f.id === 'contacts-form') {
      e.preventDefault();
      $$('.field.invalid', f).forEach(function (x) { x.classList.remove('invalid'); });
      api('PUT', '/api/contacts', { telegram: f.telegram.value, whatsapp: f.whatsapp.value, email: f.email.value }).then(function () {
        return api('GET', '/api/content');
      }).then(function (c) { S.content = c; toast(t().saved); }).catch(function (err) {
        if (err.data && err.data.fields) { err.data.fields.forEach(function (n) { var el = $('[data-field="' + n + '"]', f); if (el) el.classList.add('invalid'); }); toast(t().checkFields, true); }
      });
    }
    if (f.hasAttribute('data-host-form')) {
      e.preventDefault();
      var id = f.getAttribute('data-host-form');
      $$('.field.invalid', f).forEach(function (x) { x.classList.remove('invalid'); });
      var body = {
        name: f.name.value, type: f.type.value, region: f.region.value, aboutLang: f.aboutLang.value, about: f.about.value,
        languages: $$('[name="languages"]:checked', f).map(function (x) { return x.value; }),
        offer: { title: f.offerTitle.value, duration: f.offerDuration.value, priceFrom: f.priceFrom.value === '' ? null : Number(f.priceFrom.value) },
        contacts: { telegram: f.telegram.value, whatsapp: f.whatsapp.value, email: f.email.value }, showContacts: f.showContacts.checked, image: f.image.value
      };
      hostPatch(id, body).then(function () { S.editing = null; toast(t().saved); renderTab(); }).catch(function (err) {
        if (err.data && err.data.fields) { err.data.fields.forEach(function (n) { var el = $('[data-field="' + n + '"]', f); if (el) el.classList.add('invalid'); }); toast(t().checkFields, true); }
      });
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-ui-lang')) { S.ui = el.value; try { localStorage.setItem(ADMIN_LANG_KEY, S.ui); } catch (x) { /* ignore */ } if ($('#login-form')) renderLogin(); else shell(); return; }
    if (el.hasAttribute('data-upload')) {
      var path = el.getAttribute('data-upload'), field = el.closest('.field');
      uploadFile(el.files[0], function (url) { setPath(S.draft[S.lang], path, url); $('input[data-path="' + path + '"]').value = url; setThumb(field, url); markDirty(); });
      el.value = '';
    }
    if (el.hasAttribute('data-host-upload')) {
      var form = el.closest('form');
      uploadFile(el.files[0], function (url) { form.image.value = url; setThumb(el.closest('.field'), url); });
      el.value = '';
    }
    if (el.hasAttribute('data-req-status')) {
      var rid = el.getAttribute('data-req-status');
      api('PATCH', '/api/requests/' + encodeURIComponent(rid), { status: el.value }).then(function (r) {
        S.requests = S.requests.map(function (x) { return x.id === rid ? r.request : x; }); toast(t().saved);
      }).catch(function () { toast(fmt(t().saveError, { e: '' }), true); });
    }
  });

  document.addEventListener('input', function (e) {
    var el = e.target, path = el.getAttribute && el.getAttribute('data-path');
    if (!path) return;
    setPath(S.draft[S.lang], path, el.value);
    var len = el.closest('.field').querySelector('[data-len]'); if (len) len.textContent = el.value.length + ' / ' + el.getAttribute('maxlength');
    if (el.hasAttribute('data-image')) setThumb(el.closest('.field'), /^https:\/\/|^\/uploads\//.test(el.value) ? el.value : '');
    markDirty();
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('button') : null;
    if (!el) return;
    if (el.hasAttribute('data-tab')) { S.tab = el.getAttribute('data-tab'); S.editing = null; $$('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b === el)); }); refreshFor(S.tab); renderTab(); return; }
    if (el.hasAttribute('data-logout')) { api('POST', '/api/logout').then(function () { renderLogin(); }); return; }
    if (el.hasAttribute('data-clang')) { S.lang = el.getAttribute('data-clang'); renderTab(); return; }
    if (el.hasAttribute('data-dest')) { S.destSlug = el.getAttribute('data-dest'); renderTab(); return; }
    if (el.hasAttribute('data-save-content')) { saveContent(); return; }
    if (el.hasAttribute('data-clear')) {
      var p = el.getAttribute('data-clear'); setPath(S.draft[S.lang], p, ''); var inp = $('input[data-path="' + p + '"]'); inp.value = ''; setThumb(el.closest('.field'), ''); markDirty(); return;
    }
    if (el.hasAttribute('data-reqf')) { S.reqFilter = el.getAttribute('data-reqf'); renderTab(); return; }
    if (el.hasAttribute('data-hostf')) { S.hostFilter = el.getAttribute('data-hostf'); S.editing = null; renderTab(); return; }
    if (el.hasAttribute('data-host-status')) { hostPatch(el.getAttribute('data-id'), { status: el.getAttribute('data-host-status') }).then(function () { toast(t().saved); renderTab(); updateCounts(); }); return; }
    if (el.hasAttribute('data-host-edit')) { S.editing = el.getAttribute('data-host-edit'); renderTab(); return; }
    if (el.hasAttribute('data-host-cancel')) { S.editing = null; renderTab(); return; }
    if (el.hasAttribute('data-host-del')) {
      if (!window.confirm(t().confirmDel)) return;
      var hid = el.getAttribute('data-host-del');
      api('DELETE', '/api/admin/hosts/' + encodeURIComponent(hid)).then(function () { S.hosts = S.hosts.filter(function (h) { return h.id !== hid; }); renderTab(); updateCounts(); });
      return;
    }
    if (el.hasAttribute('data-file')) { S.file = el.getAttribute('data-file'); renderTab(); return; }
    if (el.hasAttribute('data-file-save')) {
      if (!window.confirm(fmt(t().confirmSave, { f: S.file }))) return;
      api('PUT', '/api/files/' + S.file, { content: $('#code').value }).then(function () { toast(t().saved); renderTab(); }).catch(function (x) { toast(fmt(t().saveError, { e: x.message }), true); });
      return;
    }
    if (el.hasAttribute('data-file-restore')) {
      if (!window.confirm(fmt(t().confirmRestore, { f: S.file }))) return;
      api('POST', '/api/files/' + S.file + '/restore').then(function () { toast(fmt(t().restored, { f: S.file })); renderTab(); }).catch(function (x) { toast(x.status === 404 ? t().noBackup : fmt(t().saveError, { e: x.message }), true); });
    }
  });

  window.addEventListener('beforeunload', function (e) {
    if (Object.keys(S.dirty).some(function (k) { return S.dirty[k]; })) { e.preventDefault(); e.returnValue = ''; }
  });

  function updateCounts() {
    var nr = S.requests ? S.requests.filter(function (r) { return r.status === 'new'; }).length : 0;
    var nh = S.hosts ? S.hosts.filter(function (h) { return h.status === 'pending'; }).length : 0;
    [['requests', nr], ['hosts', nh]].forEach(function (x) {
      var tab = $('[data-tab="' + x[0] + '"]'); if (!tab) return;
      var c = $('.count', tab); if (c) c.remove();
      if (x[1]) { var s = document.createElement('span'); s.className = 'count'; s.textContent = x[1]; tab.appendChild(s); }
    });
  }
  function refreshFor(tab) {
    if (tab === 'requests') api('GET', '/api/requests').then(function (r) { S.requests = r.requests; if (S.tab === 'requests') renderTab(); updateCounts(); });
    if (tab === 'hosts') api('GET', '/api/admin/hosts').then(function (r) { S.hosts = r.hosts; if (S.tab === 'hosts') renderTab(); updateCounts(); });
    if (tab === 'stats') api('GET', '/api/stats').then(function (r) { S.stats = r; if (S.tab === 'stats') renderTab(); });
  }
  function loadAll() {
    Promise.all([api('GET', '/api/content'), api('GET', '/api/requests'), api('GET', '/api/admin/hosts'), api('GET', '/api/stats')]).then(function (r) {
      S.content = r[0]; S.requests = r[1].requests; S.hosts = r[2].hosts; S.stats = r[3];
      buildDraft(); shell();
    }).catch(function (e) { if (e.status !== 401) $('#admin').innerHTML = '<p class="boot">' + esc(t().netError) + '</p>'; });
  }

  api('GET', '/api/session').then(function (s) { if (s.authenticated) loadAll(); else renderLogin(); }).catch(function () { renderLogin(t().netError); });
})();
