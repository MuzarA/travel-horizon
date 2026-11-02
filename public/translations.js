/* Travel Horizon — all interface text, default content and the 9 planner routes.
   To add a language: add it to TH.langs and copy one full block below (ui, defaults, routes, faq, seasons, before). */
(function (root) {
  'use strict';
  var TH = root.TH = root.TH || {};

  TH.langs = [
    { code: 'en', label: 'EN', name: 'English', htmlLang: 'en' },
    { code: 'ky', label: 'KY', name: 'Кыргызча', htmlLang: 'ky' },
    { code: 'ru', label: 'RU', name: 'Русский', htmlLang: 'ru' }
  ];
  TH.moods = ['lakes', 'trails', 'culture'];
  TH.durations = ['3', '5', '7'];

  /* ------------------------------------------------------------------ UI */
  TH.ui = {
    en: {
      meta: {
        title: 'Travel Horizon — custom trips in Kyrgyzstan',
        description: 'Get your first Kyrgyzstan trip idea in under a minute, then plan it with a real person. Lakes, trails, nomad culture and local hosts.'
      },
      skip: 'Skip to content',
      nav: { home: 'Trips', destinations: 'Destinations', hosts: 'Local hosts', before: 'Before you go', contact: 'Contact', menu: 'Menu', close: 'Close' },
      langLabel: 'Language',
      cta: { plan: 'Plan your trip', journeys: 'See destinations', request: 'Request this trip', back: 'Back', allDest: 'All destinations', allIdeas: 'All trip ideas', allHosts: 'All local hosts' },
      hero: { scroll: 'Scroll' },
      feeling: {
        kicker: 'The feeling', title: 'Quiet is a big word here.',
        body: 'Drive two hours from the capital and you hear only wind, water and horses. Mornings start with tea in a yurt; evenings end with more stars than you remember. We build trips around that feeling, not around a checklist.',
        facts: [
          { value: '90%+', label: 'of the country is mountains' },
          { value: 'Issyk-Kul', label: 'never freezes, even in winter' },
          { value: '3,016 m', label: 'summer pastures of Song-Kul' }
        ]
      },
      journeys: { kicker: 'Journeys', title: 'Three places to begin', sub: 'Each one can be a long weekend or the start of something bigger.', planLike: 'Plan a trip like this', more: 'About this place' },
      land: { kicker: 'The land' },
      how: {
        kicker: 'How it works', title: 'From idea to the road in three steps',
        steps: [
          { title: 'Pick a starting idea', text: 'Answer two questions in the planner and get a route in under a minute.' },
          { title: 'Talk to a real person', text: 'A trip designer shapes dates, transport and stays with you in Telegram, WhatsApp or email.' },
          { title: 'Travel with locals', text: 'Guides, yurt families and masters who live in these places show you around.' }
        ]
      },
      hostsTeaser: { kicker: 'Local hosts', title: 'Meet the people who live here', sub: 'Guides, yurt families, drivers and craft masters publish their own offers. We check every profile; you talk to them directly.', become: 'Are you a local? Become a host' },
      planner: {
        kicker: 'Trip planner', title: 'Your first idea in under a minute', sub: 'Two questions. The rest we work out together.',
        q1: 'How much time do you have?', q2: 'What is your mood?',
        durations: { '3': '3 days', '5': '5 days', '7': '7+ days' },
        moods: { lakes: 'Lakes and slow days', trails: 'Trails and big views', culture: 'Culture and nomad life' },
        empty: 'Choose time and mood — your idea appears here.',
        resultKicker: 'Your starting point', route: 'Route', season: 'Best season', start: 'Starts in', open: 'Open the full idea'
      },
      ideas: { kicker: 'Trip ideas', title: 'Nine ways to start', sub: 'Three lengths, three moods. Every idea is a starting point we adjust to you.', stops: 'Stops', custom: 'None of these? Ask us for a custom route.' },
      seasons: {
        kicker: 'Seasons', title: 'When to come',
        items: [
          { name: 'Summer', months: 'June – September', text: 'High pastures open, yurt camps on Song-Kul, warm water in Issyk-Kul, the best trekking.' },
          { name: 'Autumn', months: 'September – October', text: 'Golden valleys in Ala-Archa, walnut harvest in Arslanbob, quiet roads.' },
          { name: 'Winter', months: 'December – March', text: 'Skiing near Karakol, hot springs, and a lake that never freezes.' },
          { name: 'Spring', months: 'April – May', text: 'Green hills, apricot blossom, lower trails and fewer travellers.' }
        ]
      },
      faq: { kicker: 'Questions', title: 'Good to know' },
      quote: { source: 'Kyrgyz proverb' },
      dest: {
        kicker: 'Destinations', title: 'Ten places, five regions', sub: 'Filter by the mood of your trip.', all: 'All',
        facts: { region: 'Region', altitude: 'Altitude', season: 'Best season', gateway: 'Start from' },
        highlights: 'Highlights', related: 'Trip ideas through this place', noRelated: 'We build trips here on request.', ask: 'Ask about this place'
      },
      hosts: {
        kicker: 'Local hosts', title: 'Travel with the people who live here', sub: 'Every profile is checked by Travel Horizon. You contact hosts directly — no middleman in the conversation.',
        filterType: 'Type', filterRegion: 'Region', any: 'Any', none: 'No hosts match these filters yet.',
        checked: 'Checked by Travel Horizon', example: 'Example profile', speaks: 'Speaks', offer: 'Offer', duration: 'Duration',
        priceFrom: 'From', priceOnRequest: 'Price on request', writtenIn: 'Written in', directly: 'Write directly',
        viaSite: 'Or send a message through our site', open: 'View profile', loading: 'Loading hosts…'
      },
      hostTypes: { guide: 'Mountain guide', yurt: 'Yurt stay', driver: 'Driver', horse: 'Horse trekking', craft: 'Craft workshop', food: 'Home cooking' },
      become: {
        kicker: 'For locals', title: 'Become a host', sub: 'Show travellers from abroad your valley, your yurt, your craft or your kitchen. Listing is free. We check every application and reply within a few days.',
        name: 'Your name', type: 'What do you offer?', region: 'Region', languages: 'Languages you speak', about: 'About you and your place', aboutHint: 'Write in Kyrgyz, Russian or English — we show travellers which language it is.', aboutLang: 'Language of this text',
        offerTitle: 'Offer title', offerTitleHint: 'For example: Two nights in our family yurt', duration: 'Duration', durationHint: 'For example: 1 day, 2 nights', price: 'Price from, USD (optional)',
        telegram: 'Telegram username', whatsapp: 'WhatsApp number', email: 'Email', contactHint: 'At least one way to reach you.', showContacts: 'Show my Telegram and WhatsApp on my public profile',
        consent: 'I agree that Travel Horizon publishes this profile after checking it.', send: 'Send application',
        success: 'Thank you! Your application is with us. We will contact you before it goes live.', invalid: 'Please fill in the marked fields.'
      },
      before: {
        kicker: 'Before you go', title: 'Practical notes for travellers from abroad', sub: 'The basics we are asked most. Rules change, so always check the official sources linked here.',
        official: 'Official portal', updated: 'Checked: November 2026'
      },
      contact: { kicker: 'Contact', title: 'Write to a real person', sub: 'Tell us roughly when and how you want to travel. We reply in English, Kyrgyz or Russian.', channels: 'Or write directly' },
      form: {
        title: 'Where should we reply?', name: 'Your name', contact: 'Telegram, WhatsApp or email', country: 'Country (optional)', month: 'When (optional)', monthHint: 'For example: July 2027',
        group: 'Travellers (optional)', note: 'Anything we should know? (optional)', send: 'Send request', sending: 'Sending…',
        success: 'Thank you! A person from our team will write to you soon.', error: 'We could not send it right now. Please write to us directly:',
        invalid: 'Please add your name and a way to contact you.', privacy: 'We use these details only to reply to you.', close: 'Close',
        messageHost: 'Message to the host', required: 'required'
      },
      footer: { tagline: 'Custom trips in Kyrgyzstan, designed with you and the people who live here.', explore: 'Explore', locals: 'For locals', write: 'Write to us', rights: 'All rights reserved.', place: 'Bishkek, Kyrgyzstan' },
      credits: { kicker: 'Photo credits', title: 'Who took these photos', sub: 'Photos come from Wikimedia Commons and are used under their free licences. Thank you to every photographer.', author: 'Author', license: 'Licence', note: 'Photos are shown from Wikimedia Commons without changes other than cropping on screen.' },
      notFound: 'This page does not exist. Back to the start?'
    },

    ky: {
      meta: {
        title: 'Travel Horizon — Кыргызстан боюнча жеке саякаттар',
        description: 'Кыргызстан боюнча саякаттын алгачкы идеясын бир мүнөткө жетпей табыңыз, анан аны чыныгы адам менен бирге пландаңыз. Көлдөр, тоо жолдору, көчмөн маданияты жана жергиликтүү хосттор.'
      },
      skip: 'Негизги мазмунга өтүү',
      nav: { home: 'Саякаттар', destinations: 'Жерлер', hosts: 'Жергиликтүү хосттор', before: 'Сапарга чейин', contact: 'Байланыш', menu: 'Меню', close: 'Жабуу' },
      langLabel: 'Тил',
      cta: { plan: 'Саякатты пландоо', journeys: 'Жерлерди көрүү', request: 'Бул саякатты суроо', back: 'Артка', allDest: 'Бардык жерлер', allIdeas: 'Бардык идеялар', allHosts: 'Бардык хосттор' },
      hero: { scroll: 'Ылдый' },
      feeling: {
        kicker: 'Сезим', title: 'Бул жерде тынчтык — чоң сөз.',
        body: 'Борбор шаардан эки саат жол жүрсөңүз, шамалдын, суунун жана аттардын үнүн гана угасыз. Таң боз үйдөгү чай менен башталат, кеч эсиңизде калгандан да көп жылдыздар менен бүтөт. Биз саякатты тизме боюнча эмес, ушул сезим боюнча түзөбүз.',
        facts: [
          { value: '90%+', label: 'өлкөнүн аймагын тоолор ээлейт' },
          { value: 'Ысык-Көл', label: 'кышында да тоңбойт' },
          { value: '3016 м', label: 'Соң-Көлдүн жайкы жайлоолору' }
        ]
      },
      journeys: { kicker: 'Саякаттар', title: 'Баштоо үчүн үч жер', sub: 'Ар бири узун дем алыш да, чоң саякаттын башталышы да боло алат.', planLike: 'Ушундай саякатты пландоо', more: 'Бул жер жөнүндө' },
      land: { kicker: 'Жер' },
      how: {
        kicker: 'Кантип иштейт', title: 'Идеядан жолго чейин үч кадам',
        steps: [
          { title: 'Баштапкы идеяны тандаңыз', text: 'Пландоочуда эки суроого жооп берип, бир мүнөткө жетпей маршрут аласыз.' },
          { title: 'Чыныгы адам менен сүйлөшүңүз', text: 'Саякат дизайнери Telegram, WhatsApp же e-mail аркылуу даталарды, транспортту жана жашай турган жерди сиз менен бирге тактайт.' },
          { title: 'Жергиликтүү адамдар менен саякаттаңыз', text: 'Ошол жерлерде жашаган гиддер, боз үйлүү үй-бүлөлөр жана усталар сизди тааныштырат.' }
        ]
      },
      hostsTeaser: { kicker: 'Жергиликтүү хосттор', title: 'Бул жерде жашаган адамдар менен таанышыңыз', sub: 'Гиддер, боз үйлүү үй-бүлөлөр, айдоочулар жана усталар өз сунуштарын жарыялашат. Биз ар бир профилди текшеребиз, сиз алар менен түз сүйлөшөсүз.', become: 'Жергиликтүүсүзбү? Хост болуңуз' },
      planner: {
        kicker: 'Саякат пландоочу', title: 'Алгачкы идея — бир мүнөткө жетпей', sub: 'Эки гана суроо. Калганын бирге ойлонобуз.',
        q1: 'Канча убактыңыз бар?', q2: 'Кандай маанайдасыз?',
        durations: { '3': '3 күн', '5': '5 күн', '7': '7+ күн' },
        moods: { lakes: 'Көлдөр жана шашылбаган күндөр', trails: 'Тоо жолдору жана кенен көрүнүштөр', culture: 'Маданият жана көчмөн турмуш' },
        empty: 'Убакытты жана маанайды тандаңыз — идеяңыз ушул жерде пайда болот.',
        resultKicker: 'Сиздин баштапкы чекитиңиз', route: 'Маршрут', season: 'Ылайыктуу мезгил', start: 'Башталышы', open: 'Толук идеяны ачуу'
      },
      ideas: { kicker: 'Саякат идеялары', title: 'Баштоонун тогуз жолу', sub: 'Үч узактык, үч маанай. Ар бир идея — сизге ылайыкташтыра турган баштапкы чекит.', stops: 'Аялдамалар', custom: 'Бирөө да туура келбейби? Жеке маршрут сураңыз.' },
      seasons: {
        kicker: 'Мезгилдер', title: 'Качан келүү керек',
        items: [
          { name: 'Жай', months: 'июнь – сентябрь', text: 'Бийик жайлоолор ачылат, Соң-Көлдө боз үй лагерлери, Ысык-Көлдүн суусу жылуу, тоо жолдоруна эң ылайыктуу убак.' },
          { name: 'Күз', months: 'сентябрь – октябрь', text: 'Ала-Арчанын алтын түстүү капчыгайлары, Арсланбапта жаңгак терүү, тынч жолдор.' },
          { name: 'Кыш', months: 'декабрь – март', text: 'Караколдун жанында лыжа, ысык булактар жана тоңбогон көл.' },
          { name: 'Жаз', months: 'апрель – май', text: 'Жашыл адырлар, өрүк гүлү, төмөнкү тоо жолдору жана саякатчылар азыраак.' }
        ]
      },
      faq: { kicker: 'Суроолор', title: 'Билип алуу пайдалуу' },
      quote: { source: 'Кыргыз макалы' },
      dest: {
        kicker: 'Жерлер', title: 'Он жер, беш аймак', sub: 'Саякатыңыздын маанайы боюнча тандаңыз.', all: 'Баары',
        facts: { region: 'Аймак', altitude: 'Бийиктиги', season: 'Ылайыктуу мезгил', gateway: 'Кайдан баштоо' },
        highlights: 'Эмнени көрүү керек', related: 'Ушул жер аркылуу өткөн идеялар', noRelated: 'Бул жерге саякатты суроо боюнча түзөбүз.', ask: 'Бул жер жөнүндө суроо'
      },
      hosts: {
        kicker: 'Жергиликтүү хосттор', title: 'Бул жерде жашаган адамдар менен саякаттаңыз', sub: 'Ар бир профилди Travel Horizon текшерет. Хосттор менен түз байланышасыз — сүйлөшүүдө ортомчу жок.',
        filterType: 'Түрү', filterRegion: 'Аймак', any: 'Баары', none: 'Бул тандоо боюнча азырынча хосттор жок.',
        checked: 'Travel Horizon текшерген', example: 'Үлгү профиль', speaks: 'Тилдери', offer: 'Сунуш', duration: 'Узактыгы',
        priceFrom: 'Баасы', priceOnRequest: 'Баасы суроо боюнча', writtenIn: 'Жазылган тили', directly: 'Түз жазуу',
        viaSite: 'Же сайт аркылуу билдирүү жөнөтүңүз', open: 'Профилди көрүү', loading: 'Хосттор жүктөлүүдө…'
      },
      hostTypes: { guide: 'Тоо гиди', yurt: 'Боз үйдө жашоо', driver: 'Айдоочу', horse: 'Ат менен саякат', craft: 'Кол өнөрчүлүк устаканасы', food: 'Үй тамагы' },
      become: {
        kicker: 'Жергиликтүүлөр үчүн', title: 'Хост болуңуз', sub: 'Чет элдик саякатчыларга өрөөнүңүздү, боз үйүңүздү, өнөрүңүздү же дасторконуңузду көрсөтүңүз. Жарыялоо акысыз. Ар бир арызды текшерип, бир нече күндүн ичинде жооп беребиз.',
        name: 'Атыңыз', type: 'Эмне сунуштайсыз?', region: 'Аймак', languages: 'Кайсы тилдерде сүйлөйсүз', about: 'Өзүңүз жана жериңиз жөнүндө', aboutHint: 'Кыргызча, орусча же англисче жазыңыз — саякатчыларга кайсы тилде экенин көрсөтөбүз.', aboutLang: 'Бул тексттин тили',
        offerTitle: 'Сунуштун аталышы', offerTitleHint: 'Мисалы: Үй-бүлөлүк боз үйдө эки түн', duration: 'Узактыгы', durationHint: 'Мисалы: 1 күн, 2 түн', price: 'Баасы, USD (милдеттүү эмес)',
        telegram: 'Telegram аты', whatsapp: 'WhatsApp номери', email: 'E-mail', contactHint: 'Сиз менен байланышуунун жок дегенде бир жолу.', showContacts: 'Telegram жана WhatsApp байланышымды ачык профилимде көрсөтүү',
        consent: 'Travel Horizon бул профилди текшергенден кийин жарыялоосуна макулмун.', send: 'Арыз жөнөтүү',
        success: 'Рахмат! Арызыңыз бизге келди. Жарыяланганга чейин сиз менен байланышабыз.', invalid: 'Белгиленген талааларды толтуруңуз.'
      },
      before: {
        kicker: 'Сапарга чейин', title: 'Чет элдик саякатчылар үчүн практикалык кеңештер', sub: 'Бизден эң көп сурашкан негизги нерселер. Эрежелер өзгөрүп турат, ошондуктан бул жердеги расмий булактарды дайыма текшериңиз.',
        official: 'Расмий портал', updated: 'Текшерилди: 2026-жылдын ноябры'
      },
      contact: { kicker: 'Байланыш', title: 'Чыныгы адамга жазыңыз', sub: 'Болжол менен качан жана кандай саякаттагыңыз келерин жазыңыз. Англисче, кыргызча же орусча жооп беребиз.', channels: 'Же түз жазыңыз' },
      form: {
        title: 'Сизге кайда жооп беребиз?', name: 'Атыңыз', contact: 'Telegram, WhatsApp же e-mail', country: 'Өлкө (милдеттүү эмес)', month: 'Качан (милдеттүү эмес)', monthHint: 'Мисалы: 2027-жылдын июлу',
        group: 'Саякатчылар саны (милдеттүү эмес)', note: 'Дагы эмнени билишибиз керек? (милдеттүү эмес)', send: 'Суроо жөнөтүү', sending: 'Жөнөтүлүүдө…',
        success: 'Рахмат! Биздин командадан бир адам жакында сизге жазат.', error: 'Азыр жөнөтүү мүмкүн болбоду. Бизге түз жазыңыз:',
        invalid: 'Атыңызды жана байланыш маалыматын жазыңыз.', privacy: 'Бул маалыматты сизге жооп берүү үчүн гана колдонобуз.', close: 'Жабуу',
        messageHost: 'Хостко билдирүү', required: 'милдеттүү'
      },
      footer: { tagline: 'Кыргызстан боюнча сиз жана ушул жерде жашаган адамдар менен бирге түзүлгөн жеке саякаттар.', explore: 'Карап чыгуу', locals: 'Жергиликтүүлөр үчүн', write: 'Бизге жазыңыз', rights: 'Бардык укуктар корголгон.', place: 'Бишкек, Кыргызстан' },
      credits: { kicker: 'Сүрөттөрдүн авторлору', title: 'Бул сүрөттөрдү ким тарткан', sub: 'Сүрөттөр Wikimedia Commons сайтынан алынып, эркин лицензиялар боюнча колдонулат. Ар бир сүрөтчүгө рахмат.', author: 'Автору', license: 'Лицензия', note: 'Сүрөттөр Wikimedia Commons сайтынан экранда кесилгенден башка өзгөртүүсүз көрсөтүлөт.' },
      notFound: 'Мындай барак жок. Башына кайтасызбы?'
    },

    ru: {
      meta: {
        title: 'Travel Horizon — индивидуальные поездки по Кыргызстану',
        description: 'Первая идея поездки по Кыргызстану меньше чем за минуту, а дальше — вместе с живым человеком. Озёра, тропы, кочевая культура и местные хосты.'
      },
      skip: 'Перейти к содержанию',
      nav: { home: 'Поездки', destinations: 'Места', hosts: 'Местные хосты', before: 'Перед поездкой', contact: 'Контакты', menu: 'Меню', close: 'Закрыть' },
      langLabel: 'Язык',
      cta: { plan: 'Спланировать поездку', journeys: 'Смотреть места', request: 'Запросить эту поездку', back: 'Назад', allDest: 'Все места', allIdeas: 'Все идеи', allHosts: 'Все хосты' },
      hero: { scroll: 'Вниз' },
      feeling: {
        kicker: 'Ощущение', title: 'Тишина здесь — большое слово.',
        body: 'Два часа от столицы — и слышно только ветер, воду и лошадей. Утро начинается с чая в юрте, вечер заканчивается звёздами, которых вы давно не видели. Мы строим поездки вокруг этого ощущения, а не вокруг списка достопримечательностей.',
        facts: [
          { value: '90%+', label: 'территории страны — горы' },
          { value: 'Иссык-Куль', label: 'не замерзает даже зимой' },
          { value: '3016 м', label: 'летние пастбища Сон-Куля' }
        ]
      },
      journeys: { kicker: 'Путешествия', title: 'Три места, с которых можно начать', sub: 'Каждое может стать длинными выходными или началом чего-то большего.', planLike: 'Спланировать такую поездку', more: 'Подробнее о месте' },
      land: { kicker: 'Земля' },
      how: {
        kicker: 'Как это работает', title: 'От идеи до дороги — три шага',
        steps: [
          { title: 'Выберите стартовую идею', text: 'Ответьте на два вопроса в планировщике и получите маршрут меньше чем за минуту.' },
          { title: 'Поговорите с живым человеком', text: 'Дизайнер поездки вместе с вами уточнит даты, транспорт и жильё в Telegram, WhatsApp или по почте.' },
          { title: 'Путешествуйте с местными', text: 'Гиды, семьи с юртами и мастера, которые живут в этих местах, покажут их изнутри.' }
        ]
      },
      hostsTeaser: { kicker: 'Местные хосты', title: 'Познакомьтесь с теми, кто здесь живёт', sub: 'Гиды, семьи с юртами, водители и мастера сами публикуют свои предложения. Мы проверяем каждый профиль, а общаетесь вы с ними напрямую.', become: 'Вы местный? Станьте хостом' },
      planner: {
        kicker: 'Планировщик', title: 'Первая идея меньше чем за минуту', sub: 'Два вопроса. Остальное придумаем вместе.',
        q1: 'Сколько у вас времени?', q2: 'Какое у вас настроение?',
        durations: { '3': '3 дня', '5': '5 дней', '7': '7+ дней' },
        moods: { lakes: 'Озёра и неспешные дни', trails: 'Тропы и большие виды', culture: 'Культура и кочевая жизнь' },
        empty: 'Выберите время и настроение — идея появится здесь.',
        resultKicker: 'Ваша отправная точка', route: 'Маршрут', season: 'Лучший сезон', start: 'Старт', open: 'Открыть идею целиком'
      },
      ideas: { kicker: 'Идеи поездок', title: 'Девять способов начать', sub: 'Три длительности, три настроения. Каждая идея — отправная точка, которую мы подстроим под вас.', stops: 'Остановки', custom: 'Ничего не подошло? Попросите индивидуальный маршрут.' },
      seasons: {
        kicker: 'Сезоны', title: 'Когда приезжать',
        items: [
          { name: 'Лето', months: 'июнь – сентябрь', text: 'Открываются высокие пастбища, юрточные лагеря на Сон-Куле, тёплая вода в Иссык-Куле, лучшие треки.' },
          { name: 'Осень', months: 'сентябрь – октябрь', text: 'Золотые ущелья Ала-Арчи, сбор орехов в Арсланбобе, тихие дороги.' },
          { name: 'Зима', months: 'декабрь – март', text: 'Лыжи под Караколом, горячие источники и озеро, которое не замерзает.' },
          { name: 'Весна', months: 'апрель – май', text: 'Зелёные холмы, цветущий урюк, нижние тропы и меньше путешественников.' }
        ]
      },
      faq: { kicker: 'Вопросы', title: 'Полезно знать' },
      quote: { source: 'Кыргызская пословица' },
      dest: {
        kicker: 'Места', title: 'Десять мест, пять регионов', sub: 'Выберите по настроению поездки.', all: 'Все',
        facts: { region: 'Регион', altitude: 'Высота', season: 'Лучший сезон', gateway: 'Откуда начать' },
        highlights: 'Что посмотреть', related: 'Идеи поездок через это место', noRelated: 'Поездки сюда собираем по запросу.', ask: 'Спросить об этом месте'
      },
      hosts: {
        kicker: 'Местные хосты', title: 'Путешествуйте с теми, кто здесь живёт', sub: 'Каждый профиль проверен Travel Horizon. С хостами вы общаетесь напрямую — без посредника в разговоре.',
        filterType: 'Тип', filterRegion: 'Регион', any: 'Любой', none: 'По этим фильтрам хостов пока нет.',
        checked: 'Проверено Travel Horizon', example: 'Пример профиля', speaks: 'Языки', offer: 'Предложение', duration: 'Длительность',
        priceFrom: 'От', priceOnRequest: 'Цена по запросу', writtenIn: 'Написано на языке', directly: 'Написать напрямую',
        viaSite: 'Или отправьте сообщение через наш сайт', open: 'Открыть профиль', loading: 'Загружаем хостов…'
      },
      hostTypes: { guide: 'Горный гид', yurt: 'Ночлег в юрте', driver: 'Водитель', horse: 'Конные прогулки', craft: 'Мастерская ремёсел', food: 'Домашняя кухня' },
      become: {
        kicker: 'Для местных', title: 'Станьте хостом', sub: 'Покажите путешественникам из-за границы свою долину, юрту, ремесло или кухню. Размещение бесплатно. Мы проверяем каждую заявку и отвечаем в течение нескольких дней.',
        name: 'Ваше имя', type: 'Что вы предлагаете?', region: 'Регион', languages: 'На каких языках говорите', about: 'О себе и своём месте', aboutHint: 'Пишите на кыргызском, русском или английском — мы покажем путешественникам, на каком языке текст.', aboutLang: 'Язык этого текста',
        offerTitle: 'Название предложения', offerTitleHint: 'Например: Две ночи в нашей семейной юрте', duration: 'Длительность', durationHint: 'Например: 1 день, 2 ночи', price: 'Цена от, USD (необязательно)',
        telegram: 'Имя в Telegram', whatsapp: 'Номер WhatsApp', email: 'Почта', contactHint: 'Хотя бы один способ связаться с вами.', showContacts: 'Показывать мои Telegram и WhatsApp в публичном профиле',
        consent: 'Я согласен(на), что Travel Horizon опубликует этот профиль после проверки.', send: 'Отправить заявку',
        success: 'Спасибо! Заявка у нас. Мы свяжемся с вами до публикации.', invalid: 'Заполните отмеченные поля.'
      },
      before: {
        kicker: 'Перед поездкой', title: 'Практичные заметки для путешественников из-за границы', sub: 'Самое частое, о чём нас спрашивают. Правила меняются, поэтому всегда проверяйте официальные источники по ссылкам.',
        official: 'Официальный портал', updated: 'Проверено: ноябрь 2026'
      },
      contact: { kicker: 'Контакты', title: 'Напишите живому человеку', sub: 'Расскажите, примерно когда и как хотите путешествовать. Отвечаем на английском, кыргызском или русском.', channels: 'Или напишите напрямую' },
      form: {
        title: 'Куда вам ответить?', name: 'Ваше имя', contact: 'Telegram, WhatsApp или почта', country: 'Страна (необязательно)', month: 'Когда (необязательно)', monthHint: 'Например: июль 2027',
        group: 'Сколько человек (необязательно)', note: 'Что нам важно знать? (необязательно)', send: 'Отправить запрос', sending: 'Отправляем…',
        success: 'Спасибо! Человек из нашей команды скоро вам напишет.', error: 'Сейчас не получилось отправить. Напишите нам напрямую:',
        invalid: 'Укажите имя и способ связи.', privacy: 'Мы используем эти данные только чтобы ответить вам.', close: 'Закрыть',
        messageHost: 'Сообщение хосту', required: 'обязательно'
      },
      footer: { tagline: 'Индивидуальные поездки по Кыргызстану, которые мы придумываем вместе с вами и с теми, кто здесь живёт.', explore: 'Смотреть', locals: 'Для местных', write: 'Напишите нам', rights: 'Все права защищены.', place: 'Бишкек, Кыргызстан' },
      credits: { kicker: 'Авторы фотографий', title: 'Кто снял эти фотографии', sub: 'Фотографии взяты с Wikimedia Commons и используются по их свободным лицензиям. Спасибо каждому фотографу.', author: 'Автор', license: 'Лицензия', note: 'Фотографии показываются с Wikimedia Commons без изменений, кроме обрезки на экране.' },
      notFound: 'Такой страницы нет. Вернуться в начало?'
    }
  };

  /* ------------------------------------------------- default editable content */
  TH.defaults = {
    en: {
      hero: {
        eyebrow: 'Kyrgyzstan · trips designed around you',
        titleLine: 'Where the mountains',
        titleEmphasis: 'hold the sky',
        copyFirst: 'We don’t sell fixed tours. We help travellers from anywhere find a first trip idea that fits their time and mood.',
        copySecond: 'Then a real person from our team — and the locals who live here — take it from there.'
      },
      journeys: [
        { label: 'Lakes and slow days', duration: '3–7 days', title: 'Issyk-Kul', description: 'A lake so big it feels like the sea, with snowy ridges on both shores. Warm water in summer, quiet beaches on the south side.', image: '', alt: 'Issyk-Kul lake with snowy mountains behind it' },
        { label: 'Trails and big views', duration: '1–3 days', title: 'Ala-Archa', description: 'A national park about an hour from Bishkek. Juniper forest, rivers, waterfalls and glaciers — real mountains next to the city.', image: '', alt: 'Sharp peaks of Ala-Archa national park' },
        { label: 'Forests and hidden lakes', duration: '4–6 days', title: 'Sary-Chelek', description: 'A turquoise lake among forests in the west, inside a UNESCO biosphere reserve. Far away, and worth every kilometre.', image: '', alt: 'Sary-Chelek lake surrounded by forested slopes' }
      ],
      land: {
        titleLine: 'A land that',
        titleEmphasis: 'moves with the seasons',
        description: 'Every summer herders take their horses and sheep up to the high pastures, the jailoo. Around Song-Kul, at 3,016 m, yurts appear on the grass for a few months and then disappear again. Travelling here means joining that rhythm for a while.',
        image: '', alt: 'Yurts on the green shore of Song-Kul lake', caption: 'Song-Kul, Naryn region · 3,016 m'
      }
    },
    ky: {
      hero: {
        eyebrow: 'Кыргызстан · сиз үчүн түзүлгөн саякаттар',
        titleLine: 'Тоолор асманды',
        titleEmphasis: 'кармап турган жер',
        copyFirst: 'Биз даяр турларды сатпайбыз. Дүйнөнүн каалаган жеринен келген саякатчыга убактысына жана маанайына ылайык алгачкы идеяны табууга жардам беребиз.',
        copySecond: 'Андан ары биздин командадан чыныгы адам жана бул жерде жашаган жергиликтүү адамдар улантат.'
      },
      journeys: [
        { label: 'Көлдөр жана шашылбаган күндөр', duration: '3–7 күн', title: 'Ысык-Көл', description: 'Деңиздей кең көл, эки жээгинде тең карлуу кырка тоолор. Жайында суусу жылуу, түштүк жээгинде тынч пляждар.', image: '', alt: 'Карлуу тоолордун алдындагы Ысык-Көл' },
        { label: 'Тоо жолдору жана кенен көрүнүштөр', duration: '1–3 күн', title: 'Ала-Арча', description: 'Бишкектен болжол менен бир сааттык жолдогу улуттук парк. Арча токою, дарыялар, шаркыратмалар жана мөңгүлөр — шаардын жанындагы чыныгы тоолор.', image: '', alt: 'Ала-Арча улуттук паркынын учтуу чокулары' },
        { label: 'Токойлор жана жашыруун көлдөр', duration: '4–6 күн', title: 'Сары-Челек', description: 'Өлкөнүн батышында, ЮНЕСКОнун биосфералык коругундагы токойлордун арасындагы көгүлтүр көл. Алыс, бирок ар бир чакырымына татыктуу.', image: '', alt: 'Токойлуу капталдар курчаган Сары-Челек көлү' }
      ],
      land: {
        titleLine: 'Мезгил менен',
        titleEmphasis: 'кошо жашаган жер',
        description: 'Ар жайда малчылар жылкы-койлорун бийик жайлоого айдап чыгышат. Деңиз деңгээлинен 3016 м бийиктиктеги Соң-Көлдүн жээгинде бир нече айга боз үйлөр тигилип, кайра жоголот. Бул жакта саякаттоо — ошол ыргакка бир аз убакытка кошулуу.',
        image: '', alt: 'Соң-Көлдүн жашыл жээгиндеги боз үйлөр', caption: 'Соң-Көл, Нарын облусу · 3016 м'
      }
    },
    ru: {
      hero: {
        eyebrow: 'Кыргызстан · поездки, придуманные под вас',
        titleLine: 'Где горы',
        titleEmphasis: 'держат небо',
        copyFirst: 'Мы не продаём готовые туры. Мы помогаем путешественникам из любой страны найти первую идею поездки под их время и настроение.',
        copySecond: 'Дальше подключается живой человек из нашей команды — и местные жители, которые здесь живут.'
      },
      journeys: [
        { label: 'Озёра и неспешные дни', duration: '3–7 дней', title: 'Иссык-Куль', description: 'Озеро такое большое, что кажется морем, а на обоих берегах — снежные хребты. Тёплая вода летом и тихие пляжи на южном берегу.', image: '', alt: 'Озеро Иссык-Куль на фоне снежных гор' },
        { label: 'Тропы и большие виды', duration: '1–3 дня', title: 'Ала-Арча', description: 'Национальный парк примерно в часе от Бишкека. Арчовый лес, реки, водопады и ледники — настоящие горы рядом с городом.', image: '', alt: 'Острые вершины национального парка Ала-Арча' },
        { label: 'Леса и скрытые озёра', duration: '4–6 дней', title: 'Сары-Челек', description: 'Бирюзовое озеро среди лесов на западе страны, в биосферном заповеднике ЮНЕСКО. Далеко — и стоит каждого километра.', image: '', alt: 'Озеро Сары-Челек среди лесистых склонов' }
      ],
      land: {
        titleLine: 'Земля, которая',
        titleEmphasis: 'живёт по сезонам',
        description: 'Каждое лето пастухи поднимают лошадей и овец на высокие пастбища — джайлоо. На берегах Сон-Куля, на высоте 3016 м, на несколько месяцев появляются юрты, а потом снова исчезают. Путешествовать здесь — значит на время войти в этот ритм.',
        image: '', alt: 'Юрты на зелёном берегу озера Сон-Куль', caption: 'Сон-Куль, Нарынская область · 3016 м'
      }
    }
  };

  /* ------------------------------------------------------- 9 planner routes
     stops: [name, one line]; season and start are shown under the route. */
  TH.routes = {
    en: {
      'lakes-3': { title: 'A little taste of Issyk-Kul', text: 'Drive east from Bishkek through the Boom gorge and settle on the north shore. A day of swimming and sun, a quiet morning among ancient petroglyphs, then home rested.', season: 'June – September', start: 'Bishkek',
        stops: [['Bishkek', 'Pick-up and a short drive east'], ['Boom gorge', 'Red cliffs where the road enters the mountains'], ['Cholpon-Ata', 'Beach, swimming and a lakeside guesthouse'], ['Petroglyph field', 'Stones carved thousands of years ago, best in morning light']] },
      'lakes-5': { title: 'The lake, at your own pace', text: 'Follow the south shore, where beaches are wild and villages are small. Stay in a guesthouse in Tamga, walk Skazka canyon at sunset, swim whenever you like. No alarms.', season: 'June – September', start: 'Bishkek',
        stops: [['Bishkek', 'Start of the trip'], ['Bokonbaevo', 'Meet an eagle hunter and his bird'], ['Skazka canyon', 'Red and orange clay shapes at sunset'], ['Tamga', 'Quiet beach days and a family guesthouse']] },
      'lakes-7': { title: 'Around the big blue', text: 'A full circle of Issyk-Kul: the quiet south, the red rocks of Jeti-Oguz, hot springs near Karakol and the lively north shore. A week of water with mountains on every side.', season: 'June – September', start: 'Bishkek',
        stops: [['Bishkek', 'Start of the loop'], ['Bokonbaevo', 'South shore, eagle hunting show'], ['Jeti-Oguz', 'The Seven Bulls rocks and a walk up the valley'], ['Karakol', 'Wooden Dungan mosque, Sunday animal market'], ['Cholpon-Ata', 'Beaches and petroglyphs on the way back']] },
      'trails-3': { title: 'A foothold in the mountains', text: 'Two days in Ala-Archa, about an hour from Bishkek. Walk to the Ak-Sai waterfall, sleep near the trails and see your first glaciers without a long drive.', season: 'May – October', start: 'Bishkek',
        stops: [['Bishkek', 'Short transfer south'], ['Ala-Archa', 'Juniper forest and a mountain lodge'], ['Ak-Sai waterfall', 'A steep half-day walk with glacier views']] },
      'trails-5': { title: 'Into the Ala-Kul country', text: 'Start in Karakol and climb through spruce forest to Ala-Kul, a turquoise lake at about 3,500 m. Cross the pass, come down to the hot springs of Altyn-Arashan and rest.', season: 'July – September', start: 'Karakol',
        stops: [['Karakol', 'Gear check and a night in town'], ['Karakol valley', 'Spruce forest and the first camp'], ['Ala-Kul', 'Turquoise lake under the glaciers'], ['Altyn-Arashan', 'Hot springs after the pass']] },
      'trails-7': { title: 'The long way to the high places', text: 'Get used to the altitude in Ala-Archa, go east to Karakol for the Ala-Kul trek, and finish on the summer pastures of Song-Kul at 3,016 m. For people who want big views every single day.', season: 'July – September', start: 'Bishkek',
        stops: [['Ala-Archa', 'Acclimatisation walks'], ['Karakol', 'Base for the trek'], ['Ala-Kul', 'Two days on high trails'], ['Song-Kul', 'Wide pastures and a night in a yurt']] },
      'culture-3': { title: 'A first taste of nomad life', text: 'Drive to a yurt camp near Kochkor, learn how shyrdak felt carpets are made, eat with a herding family and sleep under a tunduk full of stars.', season: 'June – September', start: 'Bishkek',
        stops: [['Bishkek', 'Start of the trip'], ['Kochkor', 'Felt workshop with local women'], ['Yurt camp', 'Dinner with a herding family, a night in a yurt']] },
      'culture-5': { title: 'Meet the makers and herders', text: 'Felt makers in Kochkor, two nights in yurts on Song-Kul, an eagle hunter in Bokonbaevo. You will ride, cook and hear komuz music in the evening.', season: 'June – September', start: 'Bishkek',
        stops: [['Bishkek', 'Start of the trip'], ['Kochkor', 'Shyrdak workshop'], ['Song-Kul', 'Two nights with a herding family, horse riding'], ['Bokonbaevo', 'Eagle hunter on the way back']] },
      'culture-7': { title: 'Life between the pastures', text: 'Follow the herders’ summer: from the felt villages of Kochkor to Song-Kul, then south to the stone caravanserai of Tash-Rabat on the old Silk Road. Slow days, long tables, real conversations.', season: 'June – September', start: 'Bishkek',
        stops: [['Kochkor', 'Felt makers and the village market'], ['Song-Kul', 'Life in a summer yurt camp'], ['Naryn', 'A mountain town on the river'], ['Tash-Rabat', 'Stone caravanserai of the Silk Road']] }
    },
    ky: {
      'lakes-3': { title: 'Ысык-Көлдүн алгачкы даамы', text: 'Бишкектен Боом капчыгайы аркылуу чыгышка жол тартып, түндүк жээкке токтойсуз. Бир күн сууга түшүп, күнгө кактанасыз, бир тынч эртеңди байыркы петроглифтердин арасында өткөрүп, эс алып кайтасыз.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Тосуп алуу жана чыгышка кыска жол'], ['Боом капчыгайы', 'Жол тоого кирген жердеги кызыл аскалар'], ['Чолпон-Ата', 'Пляж, сууга түшүү жана көл жээгиндеги конок үй'], ['Петроглифтер талаасы', 'Миң жылдар мурун чегилген таштар, эртең мененки жарыкта өзгөчө кооз']] },
      'lakes-5': { title: 'Көл — өз ыргагыңызда', text: 'Жээктери жапайы, айылдары кичинекей түштүк жээкти бойлой жүрөсүз. Тамгадагы конок үйдө жатып, күн батканда Жомок капчыгайын кыдырып, каалаган убакта сууга түшөсүз. Ойготкучсуз.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Саякаттын башталышы'], ['Бөкөнбаев', 'Бүркүтчү жана анын бүркүтү менен таанышуу'], ['Жомок капчыгайы', 'Күн батканда кызыл-сары чопо аскалар'], ['Тамга', 'Тынч пляж күндөрү жана үй-бүлөлүк конок үй']] },
      'lakes-7': { title: 'Көк көлдү айланып', text: 'Ысык-Көлдү толук айланып чыгасыз: тынч түштүк жээк, Жети-Өгүздүн кызыл аскалары, Караколдун жанындагы ысык булактар жана жандуу түндүк жээк. Ар тарабы тоо менен курчалган бир жума.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Айлануунун башталышы'], ['Бөкөнбаев', 'Түштүк жээк, бүркүтчүлөрдүн көргөзмөсү'], ['Жети-Өгүз', 'Жети өгүз аскасы жана өрөөнгө сейил'], ['Каракол', 'Жыгач дунган мечити, жекшембилик мал базары'], ['Чолпон-Ата', 'Кайтар жолдо пляждар жана петроглифтер']] },
      'trails-3': { title: 'Тоолордогу алгачкы кадам', text: 'Бишкектен болжол менен бир сааттык жолдогу Ала-Арчада эки күн. Ак-Сай шаркыратмасына чейин басып барып, тоо жолдорунун жанында түнөйсүз жана узак жол жүрбөй эле алгачкы мөңгүлөрдү көрөсүз.', season: 'май – октябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Түштүккө кыска жол'], ['Ала-Арча', 'Арча токою жана тоо мейманканасы'], ['Ак-Сай шаркыратмасы', 'Мөңгү көрүнгөн тик жол, жарым күн']] },
      'trails-5': { title: 'Ала-Көлдүн тоолоруна', text: 'Караколдон баштап, карагай токою аркылуу болжол менен 3500 м бийиктиктеги көгүлтүр Ала-Көлгө чыгасыз. Ашууну ашып, Алтын-Арашандын ысык булактарына түшүп, эс аласыз.', season: 'июль – сентябрь', start: 'Каракол',
        stops: [['Каракол', 'Жабдыкты текшерүү жана шаарда бир түн'], ['Каракол өрөөнү', 'Карагай токою жана биринчи лагерь'], ['Ала-Көл', 'Мөңгүлөрдүн алдындагы көгүлтүр көл'], ['Алтын-Арашан', 'Ашуудан кийин ысык булактар']] },
      'trails-7': { title: 'Бийик жерлерге узак жол', text: 'Ала-Арчада бийиктикке көнүп, Ала-Көл жолу үчүн чыгышка — Караколго барасыз, саякатты 3016 м бийиктиктеги Соң-Көлдүн жайлоолорунда аяктайсыз. Күн сайын кенен көрүнүштөрдү көргүсү келгендер үчүн.', season: 'июль – сентябрь', start: 'Бишкек',
        stops: [['Ала-Арча', 'Бийиктикке көнүү үчүн сейилдер'], ['Каракол', 'Жөө жүрүштүн базасы'], ['Ала-Көл', 'Бийик жолдордо эки күн'], ['Соң-Көл', 'Кең жайлоо жана боз үйдө бир түн']] },
      'culture-3': { title: 'Көчмөн турмуштун алгачкы даамы', text: 'Кочкордун жанындагы боз үй лагерине барып, шырдак кантип жасаларын үйрөнөсүз, малчы үй-бүлө менен дасторкондош болуп, жылдыздар көрүнгөн түндүктүн астында уктайсыз.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Саякаттын башталышы'], ['Кочкор', 'Жергиликтүү аялдар менен кийиз устаканасы'], ['Боз үй лагери', 'Малчы үй-бүлө менен кечки тамак, боз үйдө түнөө']] },
      'culture-5': { title: 'Усталар жана малчылар менен таанышуу', text: 'Кочкордогу кийиз жасоочулар, Соң-Көлдөгү боз үйдө эки түн, Бөкөнбаевдеги бүркүтчү. Ат минип, тамак жасап, кечинде комуздун үнүн угасыз.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Саякаттын башталышы'], ['Кочкор', 'Шырдак устаканасы'], ['Соң-Көл', 'Малчы үй-бүлө менен эки түн, ат минүү'], ['Бөкөнбаев', 'Кайтар жолдо бүркүтчү']] },
      'culture-7': { title: 'Жайлоолордун ортосундагы турмуш', text: 'Малчылардын жайкы жолун кайталайсыз: Кочкордун кийиз айылдарынан Соң-Көлгө, андан ары түштүккө — Улуу Жибек жолундагы таш кербен сарай Таш-Рабатка. Шашылбаган күндөр, узун дасторкондор, чыныгы маектер.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Кочкор', 'Кийиз жасоочулар жана айыл базары'], ['Соң-Көл', 'Жайкы боз үй лагериндеги турмуш'], ['Нарын', 'Дарыя боюндагы тоолуу шаар'], ['Таш-Рабат', 'Жибек жолунун таш кербен сарайы']] }
    },
    ru: {
      'lakes-3': { title: 'Первое знакомство с Иссык-Кулем', text: 'Из Бишкека на восток через Боомское ущелье — и на северный берег. День купания и солнца, тихое утро среди древних петроглифов, а потом домой — отдохнувшими.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Встреча и недолгая дорога на восток'], ['Боомское ущелье', 'Красные скалы там, где дорога входит в горы'], ['Чолпон-Ата', 'Пляж, купание и гостевой дом у озера'], ['Поле петроглифов', 'Камни с рисунками возрастом в тысячи лет, лучше всего утром']] },
      'lakes-5': { title: 'Озеро в вашем ритме', text: 'Вдоль южного берега, где пляжи дикие, а сёла маленькие. Гостевой дом в Тамге, закат в ущелье Сказка, купание — когда захочется. Без будильников.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Начало поездки'], ['Боконбаево', 'Знакомство с беркутчи и его птицей'], ['Ущелье Сказка', 'Красно-оранжевые глиняные фигуры на закате'], ['Тамга', 'Тихие пляжные дни и семейный гостевой дом']] },
      'lakes-7': { title: 'Вокруг большой синевы', text: 'Полный круг вокруг Иссык-Куля: тихий юг, красные скалы Джети-Огуза, горячие источники у Каракола и оживлённый северный берег. Неделя у воды, и горы со всех сторон.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Начало круга'], ['Боконбаево', 'Южный берег, показ охоты с беркутом'], ['Джети-Огуз', 'Скалы «Семь быков» и прогулка по долине'], ['Каракол', 'Деревянная дунганская мечеть, воскресный скотный рынок'], ['Чолпон-Ата', 'Пляжи и петроглифы на обратном пути']] },
      'trails-3': { title: 'Первый шаг в горы', text: 'Два дня в Ала-Арче, примерно в часе от Бишкека. Подъём к водопаду Ак-Сай, ночёвка рядом с тропами и первые ледники — без долгой дороги.', season: 'май – октябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Короткий трансфер на юг'], ['Ала-Арча', 'Арчовый лес и горный приют'], ['Водопад Ак-Сай', 'Крутая тропа на полдня с видом на ледники']] },
      'trails-5': { title: 'В края Ала-Куля', text: 'Старт в Караколе, подъём через еловый лес к бирюзовому озеру Ала-Куль на высоте около 3500 м. Перевал, спуск к горячим источникам Алтын-Арашана и отдых.', season: 'июль – сентябрь', start: 'Каракол',
        stops: [['Каракол', 'Проверка снаряжения и ночь в городе'], ['Каракольское ущелье', 'Еловый лес и первая стоянка'], ['Ала-Куль', 'Бирюзовое озеро под ледниками'], ['Алтын-Арашан', 'Горячие источники после перевала']] },
      'trails-7': { title: 'Долгая дорога к высоким местам', text: 'Акклиматизация в Ала-Арче, затем на восток — в Каракол и на тропу к Ала-Кулю, а в финале — летние пастбища Сон-Куля на 3016 м. Для тех, кто хочет больших видов каждый день.', season: 'июль – сентябрь', start: 'Бишкек',
        stops: [['Ала-Арча', 'Прогулки для акклиматизации'], ['Каракол', 'База для трека'], ['Ала-Куль', 'Два дня на высоких тропах'], ['Сон-Куль', 'Широкие пастбища и ночь в юрте']] },
      'culture-3': { title: 'Первое знакомство с кочевой жизнью', text: 'Поездка в юрточный лагерь под Кочкоркой: узнаете, как делают войлочные ковры-шырдаки, поужинаете с семьёй пастухов и уснёте под тюндюком, в который видно звёзды.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Начало поездки'], ['Кочкорка', 'Войлочная мастерская с местными мастерицами'], ['Юрточный лагерь', 'Ужин с семьёй пастухов, ночь в юрте']] },
      'culture-5': { title: 'Мастера и пастухи', text: 'Мастерицы войлока в Кочкорке, две ночи в юртах на Сон-Куле, беркутчи в Боконбаево. Будете ездить верхом, готовить и слушать комуз по вечерам.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Бишкек', 'Начало поездки'], ['Кочкорка', 'Мастерская шырдаков'], ['Сон-Куль', 'Две ночи с семьёй пастухов, верховая езда'], ['Боконбаево', 'Беркутчи на обратном пути']] },
      'culture-7': { title: 'Жизнь между пастбищами', text: 'Летний путь пастухов: от войлочных сёл Кочкорки к Сон-Кулю, а дальше на юг — к каменному караван-сараю Таш-Рабат на старом Шёлковом пути. Неспешные дни, длинные застолья, настоящие разговоры.', season: 'июнь – сентябрь', start: 'Бишкек',
        stops: [['Кочкорка', 'Мастерицы войлока и сельский рынок'], ['Сон-Куль', 'Жизнь в летнем юрточном лагере'], ['Нарын', 'Горный город на реке'], ['Таш-Рабат', 'Каменный караван-сарай Шёлкового пути']] }
    }
  };

  /* ---------------------------------------------------------------- FAQ */
  TH.faq = {
    en: [
      ['Do you sell fixed tours?', 'No. Every trip is built around your dates, pace and budget. The planner gives you a starting point; a person shapes the rest with you.'],
      ['What happens after I send a request?', 'A trip designer writes to you through the contact you left. We aim to reply within 24 hours.'],
      ['Who are the local hosts?', 'Guides, yurt families, drivers and craft masters who publish their own offers. We check each profile before it goes live; you talk to them directly.'],
      ['Do I need a visa?', 'Citizens of many countries can visit without a visa for a short stay; others apply online. See Before you go and always check the official portal.'],
      ['Can you plan for families or groups?', 'Yes. Tell us the group size and ages in your request and we shape the pace and transport around them.'],
      ['Which languages do you speak?', 'English, Kyrgyz and Russian. Some local hosts speak other languages too — it is shown on each profile.']
    ],
    ky: [
      ['Даяр турларды сатасыздарбы?', 'Жок. Ар бир саякат сиздин даталарыңызга, ыргагыңызга жана бюджетиңизге жараша түзүлөт. Пландоочу баштапкы чекитти берет, калганын адам сиз менен бирге тактайт.'],
      ['Суроо жөнөткөндөн кийин эмне болот?', 'Саякат дизайнери сиз калтырган байланыш аркылуу жазат. 24 сааттын ичинде жооп берүүгө аракет кылабыз.'],
      ['Жергиликтүү хосттор кимдер?', 'Өз сунуштарын жарыялаган гиддер, боз үйлүү үй-бүлөлөр, айдоочулар жана усталар. Ар бир профилди жарыяланганга чейин текшеребиз, сиз алар менен түз сүйлөшөсүз.'],
      ['Виза керекпи?', 'Көп өлкөлөрдүн жарандары кыска мөөнөткө визасыз келе алышат, калгандары онлайн кайрылат. «Сапарга чейин» бөлүмүн караңыз жана расмий порталды дайыма текшериңиз.'],
      ['Үй-бүлө же топ үчүн пландай аласыздарбы?', 'Ооба. Суроодо топтун санын жана жашын жазыңыз, ыргакты жана транспортту ошого жараша түзөбүз.'],
      ['Кайсы тилдерде сүйлөйсүздөр?', 'Англисче, кыргызча жана орусча. Айрым хосттор башка тилдерде да сүйлөйт — бул ар бир профилде көрсөтүлгөн.']
    ],
    ru: [
      ['Вы продаёте готовые туры?', 'Нет. Каждая поездка строится под ваши даты, темп и бюджет. Планировщик даёт отправную точку, остальное человек продумывает вместе с вами.'],
      ['Что будет после отправки запроса?', 'Дизайнер поездки напишет вам по оставленному контакту. Стараемся ответить в течение 24 часов.'],
      ['Кто такие местные хосты?', 'Гиды, семьи с юртами, водители и мастера, которые сами публикуют свои предложения. Мы проверяем каждый профиль до публикации, а общаетесь вы с ними напрямую.'],
      ['Нужна ли виза?', 'Граждане многих стран могут приехать без визы на короткий срок, остальные подают заявку онлайн. Смотрите раздел «Перед поездкой» и всегда проверяйте официальный портал.'],
      ['Можно спланировать поездку для семьи или группы?', 'Да. Укажите в запросе число людей и возраст — подберём темп и транспорт под вас.'],
      ['На каких языках вы говорите?', 'На английском, кыргызском и русском. Некоторые хосты говорят и на других языках — это указано в профиле.']
    ]
  };

  /* ---------------------------------------------------- Before you go */
  TH.before = {
    en: [
      { icon: 'passport', title: 'Entry and visas', text: 'Since 1 January 2026, citizens of 55 countries can stay without a visa for up to 30 days in any 60-day period. Others apply online for an e-visa. Rules change — check your passport on the official portal before you book flights.', link: 'https://www.evisa.e-gov.kg' },
      { icon: 'plane', title: 'Getting there', text: 'Most travellers land at Manas International Airport (FRU), about 25 km from Bishkek. Osh airport serves the south. We can arrange a transfer from arrivals.' },
      { icon: 'coin', title: 'Money', text: 'The currency is the Kyrgyz som (KGS). Cards work in Bishkek and larger towns; carry cash for villages, yurt camps and markets.' },
      { icon: 'signal', title: 'Phone and internet', text: 'A local SIM card with data is cheap and sold at the airport and in city shops — bring your passport. Coverage is good on main roads, patchy in high valleys.' },
      { icon: 'heart', title: 'Respect and safety', text: 'Weather in the mountains changes fast: go with a guide on high trails and carry warm layers. Ask before photographing people, and take your shoes off when you enter a yurt.' }
    ],
    ky: [
      { icon: 'passport', title: 'Кирүү жана визалар', text: '2026-жылдын 1-январынан тартып 55 өлкөнүн жарандары каалаган 60 күндүн ичинде 30 күнгө чейин визасыз жүрө алышат. Калгандары электрондук визага онлайн кайрылышат. Эрежелер өзгөрүп турат — билет алардан мурун паспортуңузду расмий порталдан текшериңиз.', link: 'https://www.evisa.e-gov.kg' },
      { icon: 'plane', title: 'Кантип жетүү керек', text: 'Саякатчылардын көбү Бишкектен болжол менен 25 км алыстыктагы «Манас» эл аралык аэропортуна (FRU) конушат. Түштүктү Ош аэропорту тейлейт. Аэропорттон тосуп алууну уюштура алабыз.' },
      { icon: 'coin', title: 'Акча', text: 'Улуттук валюта — кыргыз сому (KGS). Карталар Бишкекте жана ири шаарларда иштейт; айылдар, боз үй лагерлери жана базарлар үчүн накталай акча алып жүрүңүз.' },
      { icon: 'signal', title: 'Телефон жана интернет', text: 'Интернети бар жергиликтүү SIM-карта арзан, аэропорттон жана шаардагы дүкөндөрдөн сатылат — паспортуңузду ала жүрүңүз. Негизги жолдордо байланыш жакшы, бийик өрөөндөрдө начар.' },
      { icon: 'heart', title: 'Урмат жана коопсуздук', text: 'Тоодо аба ырайы тез өзгөрөт: бийик жолдорго гид менен чыгып, жылуу кийим алыңыз. Адамдарды сүрөткө тартардан мурун уруксат сураңыз, боз үйгө кирерде бут кийимиңизди чечиңиз.' }
    ],
    ru: [
      { icon: 'passport', title: 'Въезд и визы', text: 'С 1 января 2026 года граждане 55 стран могут находиться без визы до 30 дней в любые 60 дней. Остальные оформляют электронную визу онлайн. Правила меняются — проверьте свой паспорт на официальном портале до покупки билетов.', link: 'https://www.evisa.e-gov.kg' },
      { icon: 'plane', title: 'Как добраться', text: 'Большинство прилетает в международный аэропорт «Манас» (FRU), примерно в 25 км от Бишкека. Юг обслуживает аэропорт Оша. Можем организовать встречу в зоне прилёта.' },
      { icon: 'coin', title: 'Деньги', text: 'Валюта — кыргызский сом (KGS). Карты работают в Бишкеке и крупных городах; для сёл, юрточных лагерей и рынков берите наличные.' },
      { icon: 'signal', title: 'Связь и интернет', text: 'Местная SIM-карта с интернетом недорогая, продаётся в аэропорту и в городских салонах — нужен паспорт. На основных трассах связь хорошая, в высоких долинах — с перебоями.' },
      { icon: 'heart', title: 'Уважение и безопасность', text: 'Погода в горах меняется быстро: на высокие тропы идите с гидом и берите тёплые вещи. Спрашивайте разрешения, прежде чем фотографировать людей, и снимайте обувь, входя в юрту.' }
    ]
  };

  /* -------------------------------------------------------------- Quote */
  TH.quote = {
    original: 'Көп жашаган билбейт, көп жүргөн билет.',
    en: 'Not the one who has lived long knows, but the one who has travelled far.',
    ru: 'Знает не тот, кто долго жил, а тот, кто много ходил.',
    ky: 'Көп жашаган билбейт, көп жүргөн билет.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
