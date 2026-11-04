/* Nomad Horizon — destination catalogue, regions and example host profiles.
   Facts are approximate (≈) and should be checked by the trip designer before launch. */
(function (root) {
  'use strict';
  var TH = root.TH = root.TH || {};

  TH.regions = {
    en: { bishkek: 'Bishkek', chuy: 'Chuy', issykkul: 'Issyk-Kul', naryn: 'Naryn', jalalabad: 'Jalal-Abad', osh: 'Osh', talas: 'Talas', batken: 'Batken' },
    ky: { bishkek: 'Бишкек', chuy: 'Чүй', issykkul: 'Ысык-Көл', naryn: 'Нарын', jalalabad: 'Жалал-Абад', osh: 'Ош', talas: 'Талас', batken: 'Баткен' },
    ru: { bishkek: 'Бишкек', chuy: 'Чуйская обл.', issykkul: 'Иссык-Кульская обл.', naryn: 'Нарынская обл.', jalalabad: 'Джалал-Абадская обл.', osh: 'Ошская обл.', talas: 'Таласская обл.', batken: 'Баткенская обл.' }
  };
  TH.hostTypeKeys = ['guide', 'yurt', 'driver', 'horse', 'craft', 'food'];
  TH.spoken = { en: 'English', ky: 'Кыргызча', ru: 'Русский', de: 'Deutsch', fr: 'Français', zh: '中文', tr: 'Türkçe', ko: '한국어', ja: '日本語', es: 'Español' };

  /* slug, art scene, mood, region, altitude, months, related planner ideas */
  TH.catalog = [
    { slug: 'issyk-kul', art: 'issyk', mood: 'lakes', region: 'issykkul', altitude: '≈ 1,607 m', ideas: ['lakes-3', 'lakes-5', 'lakes-7'], journey: 0 },
    { slug: 'ala-archa', art: 'alaarcha', mood: 'trails', region: 'chuy', altitude: '1,600 – 4,860 m', ideas: ['trails-3', 'trails-7'], journey: 1 },
    { slug: 'sary-chelek', art: 'sarychelek', mood: 'lakes', region: 'jalalabad', altitude: '≈ 1,873 m', ideas: [], journey: 2 },
    { slug: 'song-kul', art: 'songkul', mood: 'culture', region: 'naryn', altitude: '3,016 m', ideas: ['trails-7', 'culture-5', 'culture-7'], land: true },
    { slug: 'karakol', art: 'karakol', mood: 'trails', region: 'issykkul', altitude: '≈ 1,700 m', ideas: ['lakes-7', 'trails-5', 'trails-7'] },
    { slug: 'jeti-oguz', art: 'jetioguz', mood: 'trails', region: 'issykkul', altitude: '≈ 2,200 m', ideas: ['lakes-7'] },
    { slug: 'ala-kul', art: 'alakul', mood: 'trails', region: 'issykkul', altitude: '≈ 3,500 m', ideas: ['trails-5', 'trails-7'] },
    { slug: 'kochkor', art: 'kochkor', mood: 'culture', region: 'naryn', altitude: '≈ 1,800 m', ideas: ['culture-3', 'culture-5', 'culture-7'] },
    { slug: 'tash-rabat', art: 'tashrabat', mood: 'culture', region: 'naryn', altitude: '≈ 3,500 m', ideas: ['culture-7'] },
    { slug: 'arslanbob', art: 'arslanbob', mood: 'culture', region: 'jalalabad', altitude: '≈ 1,600 m', ideas: [] }
  ];

  /* name, short line, story, 3 highlights, best season, gateway */
  TH.places = {
    en: {
      'issyk-kul': { name: 'Issyk-Kul', short: 'A mountain lake as big as a sea, and it never freezes.', story: 'Issyk-Kul stretches about 180 km between two snowy ranges. The north shore has beaches and guesthouses; the south shore is quieter, with canyons, eagle hunters and small villages.', highlights: ['Swimming in clear, slightly salty water', 'Skazka canyon at sunset', 'Petroglyphs near Cholpon-Ata'], season: 'June – September; all year for the views', gateway: 'Cholpon-Ata, ≈ 4 h from Bishkek' },
      'ala-archa': { name: 'Ala-Archa', short: 'Glaciers and juniper forest an hour from the capital.', story: 'A national park in the Kyrgyz Ala-Too range, named after its river and the juniper that grows along it. Easy walks start at the lodge; steep trails climb to waterfalls and glaciers.', highlights: ['Ak-Sai waterfall', 'Glacier views from the high trail', 'Golden valley in autumn'], season: 'May – October', gateway: 'Bishkek, ≈ 1 h' },
      'sary-chelek': { name: 'Sary-Chelek', short: 'A turquoise lake hidden in the forests of the west.', story: 'Sary-Chelek is about 7.5 km long and more than 200 m deep, the heart of a UNESCO biosphere reserve. Six smaller lakes lie in the hills around it, linked by forest paths.', highlights: ['Boat trip to the far end of the lake', 'Forest walk past the small lakes', 'Village life in Arkyt'], season: 'June – September', gateway: 'Arkyt village, a long day’s drive from Bishkek' },
      'song-kul': { name: 'Song-Kul', short: 'A high lake where herders spend the summer.', story: 'At 3,016 m, Song-Kul is ringed by wide pastures. From June to September families set up yurts here with their horses and sheep; the rest of the year the lake is under snow.', highlights: ['A night in a family yurt', 'Riding along the shore', 'Stars with no city light'], season: 'June – September', gateway: 'Kochkor, ≈ 3 h by mountain road' },
      'karakol': { name: 'Karakol', short: 'The town where the eastern mountains begin.', story: 'Karakol sits at the east end of Issyk-Kul and is the base for treks to Ala-Kul and Altyn-Arashan. In town: a wooden Dungan mosque, an Orthodox church and a busy Sunday animal market.', highlights: ['Dungan mosque built of wood', 'Sunday animal market', 'Skiing in winter'], season: 'All year', gateway: 'Bishkek, ≈ 6–7 h by the north shore' },
      'jeti-oguz': { name: 'Jeti-Oguz', short: 'Red rocks and a green valley behind them.', story: 'The name means “seven bulls”, after the row of red sandstone cliffs at the valley mouth. Behind them the valley opens into meadows and spruce forest, good for walking and riding.', highlights: ['Seven Bulls rocks', 'Broken Heart rock', 'Valley of Flowers walk'], season: 'May – October', gateway: 'Karakol, ≈ 40 min' },
      'ala-kul': { name: 'Ala-Kul', short: 'A turquoise lake under glaciers, reached on foot.', story: 'Ala-Kul lies at about 3,500 m above the Karakol valley. The classic trek takes two to three days and crosses a high pass before coming down to the hot springs of Altyn-Arashan.', highlights: ['First view of the lake from the pass', 'Hot springs of Altyn-Arashan', 'Camp nights under glaciers'], season: 'July – September', gateway: 'Karakol, 2–3 days on foot' },
      'kochkor': { name: 'Kochkor', short: 'The village of felt makers on the way to Song-Kul.', story: 'Kochkor is known for shyrdak, the bright felt carpets made by local women. Travellers stop here to meet the makers, try the craft and organise the drive up to Song-Kul.', highlights: ['Shyrdak workshop', 'Village market', 'Start of the road to Song-Kul'], season: 'All year; best June – September', gateway: 'Bishkek, ≈ 3 h' },
      'tash-rabat': { name: 'Tash-Rabat', short: 'A stone caravanserai on the old Silk Road.', story: 'Tash-Rabat is a stone caravanserai from the 15th century, set in a quiet valley at about 3,500 m. Merchants once rested here on the way to China; today you can sleep in yurts nearby.', highlights: ['The domed stone halls', 'Yurt camp in the valley', 'Ride towards Chatyr-Kul'], season: 'June – September', gateway: 'Naryn, ≈ 3 h' },
      'arslanbob': { name: 'Arslanbob', short: 'A village inside one of the world’s largest walnut forests.', story: 'Arslanbob sits below a wall of rock in the south of the country, surrounded by wild walnut and fruit forest. Two waterfalls, homestays and the autumn walnut harvest bring travellers here.', highlights: ['Big and small waterfalls', 'Walnut forest walks', 'Homestay with a local family'], season: 'May – October; harvest in autumn', gateway: 'Jalal-Abad, ≈ 2 h' }
    },
    ky: {
      'issyk-kul': { name: 'Ысык-Көл', short: 'Деңиздей кең тоо көлү — анан эч качан тоңбойт.', story: 'Ысык-Көл эки карлуу кырка тоонун ортосунда болжол менен 180 км созулат. Түндүк жээгинде пляждар жана конок үйлөр, түштүк жээги тынчыраак — капчыгайлар, бүркүтчүлөр жана кичинекей айылдар.', highlights: ['Тунук, бир аз туздуу сууда сүзүү', 'Күн батканда Жомок капчыгайы', 'Чолпон-Атанын жанындагы петроглифтер'], season: 'июнь – сентябрь; көрүнүштөр үчүн жыл бою', gateway: 'Чолпон-Ата, Бишкектен ≈ 4 саат' },
      'ala-archa': { name: 'Ала-Арча', short: 'Борбор шаардан бир сааттык жолдо мөңгүлөр жана арча токою.', story: 'Кыргыз Ала-Тоосундагы улуттук парк, анын аты дарыясынан жана жээгинде өскөн арчадан алынган. Жеңил сейилдер мейманканадан башталат, тик жолдор шаркыратмаларга жана мөңгүлөргө алып чыгат.', highlights: ['Ак-Сай шаркыратмасы', 'Бийик жолдон мөңгүлөр көрүнөт', 'Күзүндө алтын түстүү өрөөн'], season: 'май – октябрь', gateway: 'Бишкек, ≈ 1 саат' },
      'sary-chelek': { name: 'Сары-Челек', short: 'Батыштын токойлорунда жашырынган көгүлтүр көл.', story: 'Сары-Челек болжол менен 7,5 км узун жана 200 метрден ашык терең, ЮНЕСКОнун биосфералык коругунун жүрөгү. Айланасындагы адырларда токой жолдору менен байланышкан алты кичинекей көл бар.', highlights: ['Көлдүн алыскы четине кайык менен сейил', 'Кичинекей көлдөрдү бойлой токой жолу', 'Аркыт айылындагы турмуш'], season: 'июнь – сентябрь', gateway: 'Аркыт айылы, Бишкектен бир күндүк узак жол' },
      'song-kul': { name: 'Соң-Көл', short: 'Малчылар жай өткөргөн бийик көл.', story: '3016 м бийиктиктеги Соң-Көлдү кең жайлоолор курчап турат. Июнь-сентябрда үй-бүлөлөр бул жерге жылкы-койлору менен боз үй тигишет, жылдын калган убагында көл кар астында болот.', highlights: ['Үй-бүлөлүк боз үйдө бир түн', 'Жээкти бойлой ат минүү', 'Шаар жарыгы жок жылдыздуу асман'], season: 'июнь – сентябрь', gateway: 'Кочкор, тоо жолу менен ≈ 3 саат' },
      'karakol': { name: 'Каракол', short: 'Чыгыш тоолору башталган шаар.', story: 'Каракол Ысык-Көлдүн чыгыш четинде жайгашкан жана Ала-Көлгө, Алтын-Арашанга жөө жүрүштүн базасы. Шаарда жыгачтан салынган дунган мечити, православ чиркөөсү жана жекшембилик мал базары бар.', highlights: ['Жыгачтан салынган дунган мечити', 'Жекшембилик мал базары', 'Кышында лыжа'], season: 'Жыл бою', gateway: 'Бишкек, түндүк жээк аркылуу ≈ 6–7 саат' },
      'jeti-oguz': { name: 'Жети-Өгүз', short: 'Кызыл аскалар жана алардын артындагы жашыл өрөөн.', story: 'Аты өрөөндүн оозундагы катар тизилген кызыл кумдук аскалардан алынган. Алардын артында өрөөн шалбаага жана карагай токоюна ачылат — сейилдеп, ат минүүгө ыңгайлуу.', highlights: ['Жети өгүз аскасы', 'Жарылган жүрөк аскасы', 'Гүлдөр өрөөнүнө сейил'], season: 'май – октябрь', gateway: 'Каракол, ≈ 40 мүнөт' },
      'ala-kul': { name: 'Ала-Көл', short: 'Мөңгүлөрдүн алдындагы, жөө гана жетүүгө боло турган көгүлтүр көл.', story: 'Ала-Көл Каракол өрөөнүнөн жогору, болжол менен 3500 м бийиктикте жатат. Белгилүү жөө жүрүш эки-үч күнгө созулуп, бийик ашууну ашып, Алтын-Арашандын ысык булактарына түшөт.', highlights: ['Ашуудан көлдүн алгачкы көрүнүшү', 'Алтын-Арашандын ысык булактары', 'Мөңгүлөрдүн алдында лагердеги түндөр'], season: 'июль – сентябрь', gateway: 'Каракол, жөө 2–3 күн' },
      'kochkor': { name: 'Кочкор', short: 'Соң-Көлгө бара жаткан жолдогу кийиз жасоочулардын айылы.', story: 'Кочкор жергиликтүү аялдар жасаган ачык түстүү кийиз шырдактар менен белгилүү. Саякатчылар бул жерге усталар менен таанышып, өнөрдү сынап көрүп, Соң-Көлгө жолду уюштуруу үчүн токтошот.', highlights: ['Шырдак устаканасы', 'Айыл базары', 'Соң-Көлгө жолдун башталышы'], season: 'Жыл бою; эң жакшысы июнь – сентябрь', gateway: 'Бишкек, ≈ 3 саат' },
      'tash-rabat': { name: 'Таш-Рабат', short: 'Байыркы Жибек жолундагы таш кербен сарай.', story: 'Таш-Рабат — болжол менен 3500 м бийиктиктеги тынч өрөөндөгү XV кылымдагы таш кербен сарай. Илгери соодагерлер Кытайга бара жатканда бул жерде эс алышкан, азыр жакын жердеги боз үйлөрдө түнөсөңүз болот.', highlights: ['Күмбөздүү таш залдар', 'Өрөөндөгү боз үй лагери', 'Чатыр-Көлгө карай ат менен сейил'], season: 'июнь – сентябрь', gateway: 'Нарын, ≈ 3 саат' },
      'arslanbob': { name: 'Арсланбап', short: 'Дүйнөдөгү эң чоң жаңгак токойлорунун бириндеги айыл.', story: 'Арсланбап өлкөнүн түштүгүндө, аскалуу тоонун этегинде, жапайы жаңгак жана жемиш токою менен курчалган. Эки шаркыратма, үй-бүлөлүк конок үйлөр жана күзгү жаңгак терүү саякатчыларды өзүнө тартат.', highlights: ['Чоң жана кичи шаркыратмалар', 'Жаңгак токоюнда сейил', 'Жергиликтүү үй-бүлөдө жашоо'], season: 'май – октябрь; күзүндө жаңгак терүү', gateway: 'Жалал-Абад, ≈ 2 саат' }
    },
    ru: {
      'issyk-kul': { name: 'Иссык-Куль', short: 'Горное озеро размером с море — и оно никогда не замерзает.', story: 'Иссык-Куль тянется примерно на 180 км между двумя снежными хребтами. На северном берегу пляжи и гостевые дома, южный тише — каньоны, беркутчи и маленькие сёла.', highlights: ['Купание в чистой, чуть солоноватой воде', 'Ущелье Сказка на закате', 'Петроглифы у Чолпон-Аты'], season: 'июнь – сентябрь; ради видов — круглый год', gateway: 'Чолпон-Ата, ≈ 4 ч от Бишкека' },
      'ala-archa': { name: 'Ала-Арча', short: 'Ледники и арчовый лес в часе от столицы.', story: 'Национальный парк в хребте Кыргызский Ала-Тоо, названный по реке и арче, что растёт вдоль неё. Лёгкие прогулки начинаются у приюта, крутые тропы ведут к водопадам и ледникам.', highlights: ['Водопад Ак-Сай', 'Вид на ледники с верхней тропы', 'Золотое ущелье осенью'], season: 'май – октябрь', gateway: 'Бишкек, ≈ 1 ч' },
      'sary-chelek': { name: 'Сары-Челек', short: 'Бирюзовое озеро, спрятанное в лесах запада.', story: 'Сары-Челек длиной около 7,5 км и глубиной более 200 м — сердце биосферного заповедника ЮНЕСКО. Вокруг в холмах ещё шесть маленьких озёр, связанных лесными тропами.', highlights: ['На лодке в дальний конец озера', 'Лесная тропа мимо малых озёр', 'Сельская жизнь в Аркыте'], season: 'июнь – сентябрь', gateway: 'Село Аркыт, долгий день пути от Бишкека' },
      'song-kul': { name: 'Сон-Куль', short: 'Высокогорное озеро, где пастухи проводят лето.', story: 'Сон-Куль на высоте 3016 м окружён широкими пастбищами. С июня по сентябрь семьи ставят здесь юрты и пасут лошадей и овец, остальное время озеро под снегом.', highlights: ['Ночь в семейной юрте', 'Верхом вдоль берега', 'Звёзды без городского света'], season: 'июнь – сентябрь', gateway: 'Кочкорка, ≈ 3 ч по горной дороге' },
      'karakol': { name: 'Каракол', short: 'Город, с которого начинаются восточные горы.', story: 'Каракол стоит на восточном краю Иссык-Куля и служит базой для треков к Ала-Кулю и Алтын-Арашану. В городе — деревянная дунганская мечеть, православный храм и шумный воскресный скотный рынок.', highlights: ['Деревянная дунганская мечеть', 'Воскресный скотный рынок', 'Лыжи зимой'], season: 'Круглый год', gateway: 'Бишкек, ≈ 6–7 ч по северному берегу' },
      'jeti-oguz': { name: 'Джети-Огуз', short: 'Красные скалы и зелёная долина за ними.', story: 'Название значит «семь быков» — по ряду красных песчаниковых скал у входа в долину. За ними открываются луга и еловый лес, где хорошо гулять и ездить верхом.', highlights: ['Скалы «Семь быков»', 'Скала «Разбитое сердце»', 'Прогулка в Долину цветов'], season: 'май – октябрь', gateway: 'Каракол, ≈ 40 мин' },
      'ala-kul': { name: 'Ала-Куль', short: 'Бирюзовое озеро под ледниками, куда идут пешком.', story: 'Ала-Куль лежит на высоте около 3500 м над Каракольским ущельем. Классический трек занимает два-три дня и проходит через высокий перевал к горячим источникам Алтын-Арашана.', highlights: ['Первый вид на озеро с перевала', 'Горячие источники Алтын-Арашана', 'Ночи в лагере под ледниками'], season: 'июль – сентябрь', gateway: 'Каракол, 2–3 дня пешком' },
      'kochkor': { name: 'Кочкорка', short: 'Село мастериц войлока по дороге на Сон-Куль.', story: 'Кочкорка известна шырдаками — яркими войлочными коврами, которые делают местные женщины. Путешественники останавливаются здесь, чтобы познакомиться с мастерицами, попробовать ремесло и договориться о дороге на Сон-Куль.', highlights: ['Мастерская шырдаков', 'Сельский рынок', 'Начало дороги на Сон-Куль'], season: 'Круглый год; лучше июнь – сентябрь', gateway: 'Бишкек, ≈ 3 ч' },
      'tash-rabat': { name: 'Таш-Рабат', short: 'Каменный караван-сарай на старом Шёлковом пути.', story: 'Таш-Рабат — каменный караван-сарай XV века в тихой долине на высоте около 3500 м. Когда-то здесь отдыхали купцы на пути в Китай, сегодня рядом можно переночевать в юрте.', highlights: ['Купольные каменные залы', 'Юрточный лагерь в долине', 'Верхом в сторону Чатыр-Куля'], season: 'июнь – сентябрь', gateway: 'Нарын, ≈ 3 ч' },
      'arslanbob': { name: 'Арсланбоб', short: 'Село внутри одного из крупнейших в мире ореховых лесов.', story: 'Арсланбоб лежит под скальной стеной на юге страны, в окружении дикого орехово-плодового леса. Два водопада, гостевые дома в семьях и осенний сбор орехов привлекают сюда путешественников.', highlights: ['Большой и малый водопады', 'Прогулки по ореховому лесу', 'Ночлег в местной семье'], season: 'май – октябрь; осенью сбор орехов', gateway: 'Джалал-Абад, ≈ 2 ч' }
    }
  };


  /* Photos from Wikimedia Commons, used under their free licences with credit (shown on the site and on #credits).
     They load from upload.wikimedia.org in the visitor's browser. Uploads in the admin panel replace them. */
  TH.photos = {
    "hero": {
      "title": "Lake Son Kol, Kyrgyzstan.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Lake_Son_Kol,_Kyrgyzstan.jpg/1920px-Lake_Son_Kol,_Kyrgyzstan.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Lake_Son_Kol,_Kyrgyzstan.jpg",
      "author": "Benjamin Goetzinger",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    "issyk-kul": {
      "title": "20141010 Kyrgyzstan 1169 Lake Issyk-Kul (15635724474).jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/20141010_Kyrgyzstan_1169_Lake_Issyk-Kul_(15635724474).jpg/1280px-20141010_Kyrgyzstan_1169_Lake_Issyk-Kul_(15635724474).jpg",
      "page": "https://commons.wikimedia.org/wiki/File:20141010_Kyrgyzstan_1169_Lake_Issyk-Kul_(15635724474).jpg",
      "author": "Dan Lundberg",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/"
    },
    "ala-archa": {
      "title": "Kyrgyzstan Alpinism, Ala Archa National Park (7208606302).jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Kyrgyzstan_Alpinism,_Ala_Archa_National_Park_(7208606302).jpg/1280px-Kyrgyzstan_Alpinism,_Ala_Archa_National_Park_(7208606302).jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Kyrgyzstan_Alpinism,_Ala_Archa_National_Park_(7208606302).jpg",
      "author": "Thomas Depenbusch",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/"
    },
    "sary-chelek": {
      "title": "Sary Chelek Lake.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sary_Chelek_Lake.jpg/1280px-Sary_Chelek_Lake.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Sary_Chelek_Lake.jpg",
      "author": "Kondephy",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    "song-kul": {
      "title": "Lake Son Kol, Kyrgyzstan, afternoon.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Lake_Son_Kol,_Kyrgyzstan,_afternoon.jpg/1280px-Lake_Son_Kol,_Kyrgyzstan,_afternoon.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Lake_Son_Kol,_Kyrgyzstan,_afternoon.jpg",
      "author": "Benjamin Goetzinger",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    "karakol": {
      "title": "Tower of Karakol Dungan Mosque.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Tower_of_Karakol_Dungan_Mosque.jpg/1280px-Tower_of_Karakol_Dungan_Mosque.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Tower_of_Karakol_Dungan_Mosque.jpg",
      "author": "Adam Harangozó",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    "jeti-oguz": {
      "title": "Jeti-Ögüz Rocks - Issyk-Kul Region, Jeti-Oguz District.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Jeti-%C3%96g%C3%BCz_Rocks_-_Issyk-Kul_Region,_Jeti-Oguz_District.jpg/1280px-Jeti-%C3%96g%C3%BCz_Rocks_-_Issyk-Kul_Region,_Jeti-Oguz_District.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Jeti-%C3%96g%C3%BCz_Rocks_-_Issyk-Kul_Region,_Jeti-Oguz_District.jpg",
      "author": "Jiří Komárek",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    "ala-kul": {
      "title": "Ala-Köl.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Ala-K%C3%B6l.jpg/1280px-Ala-K%C3%B6l.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Ala-K%C3%B6l.jpg",
      "author": "Ondřej Žváček",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
    },
    "kochkor": {
      "title": "On A365, Kochor District, Kyrgyzstan - panoramio.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/On_A365,_Kochor_District,_Kyrgyzstan_-_panoramio.jpg/1280px-On_A365,_Kochor_District,_Kyrgyzstan_-_panoramio.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:On_A365,_Kochor_District,_Kyrgyzstan_-_panoramio.jpg",
      "author": "ThomasG",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
    },
    "tash-rabat": {
      "title": "Tash Rabat.JPG",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Tash_Rabat.JPG/1280px-Tash_Rabat.JPG",
      "page": "https://commons.wikimedia.org/wiki/File:Tash_Rabat.JPG",
      "author": "WikiTofu",
      "license": "CC BY-SA 3.0 DE",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/"
    },
    "arslanbob": {
      "title": "Walnut forest Arslanbob.jpg",
      "src": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Walnut_forest_Arslanbob.jpg/1280px-Walnut_forest_Arslanbob.jpg",
      "page": "https://commons.wikimedia.org/wiki/File:Walnut_forest_Arslanbob.jpg",
      "author": "Ekrem Canli",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
    }
  };

  /* Example host profiles for the demo. They are labelled "Example" on the site
     and can be deleted in the admin panel. Not real people. */
  TH.exampleHosts = [
    { id: 'example-aigul', example: true, status: 'approved', name: 'Aigul', type: 'yurt', region: 'naryn', languages: ['ky', 'ru'], aboutLang: 'ru',
      about: 'Каждое лето наша семья ставит две юрты на южном берегу Сон-Куля. Угощаем кумысом и боорсоками, показываем, как доят кобылиц, а вечером муж играет на комузе.',
      offer: { title: 'Two nights in our family yurt', duration: '2 nights', priceFrom: null }, showContacts: false, contacts: {}, image: '' },
    { id: 'example-bakyt', example: true, status: 'approved', name: 'Bakyt', type: 'guide', region: 'issykkul', languages: ['ky', 'ru', 'en'], aboutLang: 'en',
      about: 'I grew up in Karakol and have walked the Ala-Kul and Altyn-Arashan trails since I was a boy. I keep groups small and pace them for people who are new to altitude.',
      offer: { title: 'Ala-Kul trek with a local guide', duration: '3 days', priceFrom: null }, showContacts: false, contacts: {}, image: '' },
    { id: 'example-nurlan', example: true, status: 'approved', name: 'Nurlan', type: 'driver', region: 'bishkek', languages: ['ky', 'ru', 'en'], aboutLang: 'en',
      about: 'Airport pick-ups and long drives across the country in a comfortable 4×4. I know the mountain roads to Song-Kul and Sary-Chelek and where to stop for the best views.',
      offer: { title: 'Driver for multi-day routes', duration: '1–14 days', priceFrom: null }, showContacts: false, contacts: {}, image: '' },
    { id: 'example-gulnara', example: true, status: 'approved', name: 'Gulnara', type: 'craft', region: 'naryn', languages: ['ky', 'ru'], aboutLang: 'ky',
      about: 'Кочкордо отуз жылдан бери шырдак жасайм. Конокторго жүндү кантип даярдап, кийиз басып, оюу чегерин көрсөтөм. Өзүңүз жасаган кичинекей кийизди ала кетесиз.',
      offer: { title: 'Shyrdak felt workshop', duration: 'Half a day', priceFrom: null }, showContacts: false, contacts: {}, image: '' },
    { id: 'example-azamat', example: true, status: 'approved', name: 'Azamat', type: 'horse', region: 'naryn', languages: ['ky', 'ru'], aboutLang: 'ru',
      about: 'Вожу конные маршруты из Кызарта на Сон-Куль через перевал. Лошади спокойные, подходят и для новичков. По дороге ночуем у знакомых пастухов.',
      offer: { title: 'Ride to Song-Kul over the pass', duration: '2 days', priceFrom: null }, showContacts: false, contacts: {}, image: '' },
    { id: 'example-cholpon', example: true, status: 'approved', name: 'Cholpon', type: 'food', region: 'issykkul', languages: ['ky', 'ru', 'en'], aboutLang: 'en',
      about: 'Come to my kitchen in a village on the south shore of Issyk-Kul. We make lagman noodles by hand, bake bread in the tandyr and eat together in the garden.',
      offer: { title: 'Cook and eat with a village family', duration: '3 hours', priceFrom: null }, showContacts: false, contacts: {}, image: '' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
