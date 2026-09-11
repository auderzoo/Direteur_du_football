/* ============================================================
   DATA.JS — Données de référence du monde du jeu
   Tous les noms de clubs/joueurs sont GÉNÉRÉS, inspirés des
   cultures footballistiques réelles mais fictifs (pas de licence).
   ============================================================ */

// ---- Groupes linguistiques pour les noms de joueurs ----
const NAME_POOLS = {
  fr: {
    first: ["Léo","Nathan","Yanis","Mathis","Enzo","Rayan","Hugo","Kylian","Tom","Bilal","Amir","Sacha","Noah","Idris","Malo","Gabin","Ousmane","Theo","Adama","Baptiste"],
    last: ["Moreau","Girard","Bernard","Diallo","Traoré","Fontaine","Rousseau","Lefevre","Petit","Faure","Camara","N'Diaye","Blanchard","Guerin","Robert","Simon","Barbier","Dumas","Legrand","Kone"]
  },
  en: {
    first: ["Jack","Harry","Oliver","George","Callum","Marcus","Ryan","Ethan","Aaron","Lewis","Connor","Owen","Bradley","Kai","Reece","Josh","Charlie","Tyler","Liam","Dean"],
    last: ["Walker","Hughes","Bennett","Carter","Foster","Harrison","Mitchell","Reid","Sutton","Barnes","Coleman","Hayes","Pearce","Grant","Wallace","Marsh","Doyle","Fisher","Nash","Whitfield"]
  },
  es: {
    first: ["Alejandro","Pablo","Iker","Mateo","Diego","Hugo","Marcos","Rodrigo","Adrián","Bruno","Álvaro","Sergio","Javier","Nico","Gonzalo","Emilio","Rafael","Tomás","Ander","Unai"],
    last: ["García","Fernández","Martínez","López","Sánchez","Romero","Navarro","Torres","Domínguez","Vidal","Cabrera","Ibáñez","Serrano","Molina","Ortega","Vega","Carrasco","Reyes","Pardo","Lozano"]
  },
  it: {
    first: ["Matteo","Lorenzo","Andrea","Davide","Riccardo","Federico","Gianluca","Marco","Alessio","Simone","Nicolò","Leonardo","Tommaso","Emanuele","Cristian","Vincenzo","Salvatore","Luca","Stefano","Filippo"],
    last: ["Ricci","Bruno","Ferrari","Esposito","Romano","Conti","Marino","Greco","Fontana","Rinaldi","Costa","Barbieri","Moretti","Villa","Caruso","Longo","Mancini","Rizzo","Pellegrini","Vitale"]
  },
  de: {
    first: ["Lukas","Finn","Jonas","Niklas","Maximilian","Tim","Julian","Leon","Moritz","Paul","Felix","David","Sven","Kevin","Marcel","Fabian","Tobias","Jan","Mats","Nico"],
    last: ["Müller","Schneider","Fischer","Weber","Wagner","Becker","Hoffmann","Schulz","Koch","Richter","Klein","Wolf","Neumann","Braun","Zimmermann","Krüger","Hartmann","Lange","Werner","Vogel"]
  },
  tr: {
    first: ["Emre","Burak","Mert","Ozan","Kerem","Arda","Alperen","Cem","Baris","Tolga","Yusuf","Enes","Berk","Umut","Serkan","Kaan","Volkan","Onur","Ferhat","Deniz"],
    last: ["Yildiz","Kaya","Demir","Sahin","Aydin","Ozturk","Aslan","Yildirim","Dogan","Arslan","Korkmaz","Polat","Kurt","Ozdemir","Celik","Guler","Aksoy","Bulut","Tekin","Kilic"]
  },
  no: { // pool nordique partagé (Norvège / Suède / Islande)
    first: ["Erik","Magnus","Oscar","Anders","Henrik","Fredrik","Sigurd","Bjorn","Elias","Kasper","Viktor","Emil","Gustav","Leif","Aksel","Sander","Halvor","Ola","Tobias","Filip"],
    last: ["Hansen","Andersen","Johansen","Larsen","Berg","Haugen","Kristiansen","Nilsson","Lindqvist","Solberg","Eriksson","Karlsson","Dahl","Sørensen","Halvorsen","Moe","Strand","Aas","Lund","Sund"]
  },
  ro: { // pool slave partagé (Roumanie / Moldavie)
    first: ["Andrei","Mihai","Cristian","Alexandru","Ionut","George","Vlad","Stefan","Bogdan","Marian","Radu","Florin","Cosmin","Adrian","Gabriel","Daniel","Sergiu","Nicolae","Petru","Dorin"],
    last: ["Popescu","Ionescu","Constantin","Stancu","Dumitru","Radu","Marin","Stoica","Ciobanu","Rusu","Munteanu","Ilie","Cojocaru","Nistor","Barbu","Toma","Anton","Matei","Craciun","Neagu"]
  },
  pl: {
    first: ["Kacper","Szymon","Filip","Jakub","Wojciech","Bartosz","Mateusz","Michal","Pawel","Krzysztof","Tomasz","Adrian","Dawid","Radoslaw","Piotr","Marcin","Damian","Grzegorz","Rafal","Sebastian"],
    last: ["Kowalski","Nowak","Wisniewski","Wojcik","Kaminski","Lewandowski","Zielinski","Szymanski","Wozniak","Dabrowski","Kozlowski","Jankowski","Mazur","Krawczyk","Piatek","Grabowski","Pawlak","Michalski","Adamczyk","Urban"]
  },
  zh: {
    first: ["Wei","Jun","Hao","Lei","Yang","Chao","Bo","Peng","Tao","Ming","Feng","Kai","Long","Jian","Qiang","Zhi","Yong","Xin","Bin","Cheng"],
    last: ["Wang","Li","Zhang","Liu","Chen","Yang","Huang","Zhao","Wu","Zhou","Xu","Sun","Ma","Zhu","Hu","Guo","He","Lin","Gao","Luo"]
  },
  ko: {
    first: ["Min-jun","Seo-jun","Do-yun","Ji-ho","Joon-ho","Hyun-woo","Tae-yang","Jun-seo","Sung-min","Yeong-jin","Dong-hyun","Jae-won","Kang-min","Hyun-jun","Woo-jin","Seung-min","Chan-ho","In-su","Yong-jae","Min-seok"],
    last: ["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh","Seo","Shin","Kwon","Hwang","Ahn","Song","Yoo","Hong"]
  },
  pt: {
    first: ["Gabriel","Lucas","Matheus","Rafael","Bruno","Thiago","Felipe","Rodrigo","Gustavo","Vinicius","Caio","Diego","Wesley","Everton","Marcelo","Anderson","Leandro","Igor","Renan","Douglas"],
    last: ["Silva","Santos","Oliveira","Souza","Pereira","Costa","Almeida","Ribeiro","Carvalho","Gomes","Martins","Araujo","Barbosa","Rocha","Dias","Nascimento","Moreira","Cardoso","Teixeira","Correia"]
  }
};

// ---- Villes réelles par pays (les villes ne sont pas soumises à licence) ----
const CITIES = {
  france: ["Lyon","Marseille","Lille","Nantes","Rennes","Toulouse","Nice","Strasbourg","Bordeaux","Reims","Metz","Brest","Angers","Le Havre","Montpellier","Caen","Dijon","Nancy"],
  angleterre: ["Manchester","Liverpool","Leeds","Sheffield","Newcastle","Nottingham","Birmingham","Bristol","Southampton","Leicester","Derby","Sunderland","Coventry","Preston","Ipswich","Norwich","Watford","Luton"],
  espagne: ["Séville","Valence","Bilbao","Malaga","Saragosse","Vigo","Gijon","Cadix","Grenade","Valladolid","Alicante","Cordoue","Murcie","San Sebastian","Santander","Almeria"],
  italie: ["Turin","Milan","Naples","Florence","Bologne","Gênes","Vérone","Bergame","Palerme","Cagliari","Lecce","Parme","Salerne","Udine","Brescia","Catane"],
  allemagne: ["Munich","Berlin","Hambourg","Cologne","Francfort","Stuttgart","Dortmund","Leipzig","Brême","Hanovre","Nuremberg","Bochum","Kiel","Rostock","Mayence","Dresde"],
  belgique: ["Anvers","Bruges","Gand","Charleroi","Liège","Louvain","Mons","Namur","Malines","Genk","Ostende","Courtrai"],
  suisse: ["Zurich","Genève","Bâle","Berne","Lausanne","Lucerne","Lugano","Sion","Winterthour","Saint-Gall"],
  turquie: ["Ankara","Izmir","Bursa","Antalya","Trabzon","Konya","Kayseri","Gaziantep","Adana","Samsun","Eskisehir","Denizli"],
  norvege: ["Bergen","Trondheim","Stavanger","Tromso","Drammen","Sandefjord","Bodo","Kristiansand","Alesund","Fredrikstad"],
  islande: ["Kopavogur","Hafnarfjordur","Akureyri","Keflavik","Gardabaer","Selfoss","Akranes"],
  irlande: ["Cork","Galway","Limerick","Waterford","Sligo","Dundalk","Drogheda","Athlone"],
  irlandeNord: ["Belfast","Derry","Lisburn","Newry","Bangor","Coleraine","Ballymena"],
  roumanie: ["Cluj","Timisoara","Iasi","Craiova","Constanta","Brasov","Sibiu","Ploiesti","Oradea","Arad"],
  pologne: ["Varsovie","Cracovie","Wroclaw","Poznan","Gdansk","Lodz","Katowice","Szczecin","Lublin","Bydgoszcz"],
  suede: ["Goteborg","Malmo","Uppsala","Norrkoping","Helsingborg","Orebro","Vasteras","Jonkoping","Sundsvall","Umea"],
  moldavie: ["Balti","Tiraspol","Bender","Orhei","Cahul","Ungheni","Soroca"],
  chine: ["Shanghai","Guangzhou","Shenzhen","Chengdu","Wuhan","Tianjin","Qingdao","Dalian","Nanjing","Chongqing"],
  coreeSud: ["Séoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Ulsan","Suwon","Jeonju","Seongnam"],
  australie: ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Newcastle","Wollongong","Gold Coast","Canberra"],
  usa: ["New York","Los Angeles","Chicago","Houston","Seattle","Denver","Atlanta","Miami","Portland","Columbus","Dallas","Orlando"],
  mexique: ["Guadalajara","Monterrey","Puebla","Tijuana","Leon","Toluca","Queretaro","Merida","Torreon","Veracruz"],
  argentine: ["Cordoba","Rosario","La Plata","Mendoza","Mar del Plata","San Miguel","Santa Fe","Salta","Tucuman","Bahia Blanca"],
  bresil: ["Rio de Janeiro","São Paulo","Belo Horizonte","Porto Alegre","Salvador","Recife","Curitiba","Fortaleza","Brasilia","Belem"]
};

// ---- Configuration complète des 23 pays sélectionnables ----
// pool: pool de noms utilisé | calendar: type de saison | template: gabarit de nom de club
const COUNTRIES = {
  france:      { label: "France",            pool: "fr", calendar: "europe",   template: "fr",  currency: "€" },
  angleterre:  { label: "Angleterre",         pool: "en", calendar: "europe",   template: "en",  currency: "£" },
  espagne:     { label: "Espagne",            pool: "es", calendar: "europe",   template: "es",  currency: "€" },
  italie:      { label: "Italie",             pool: "it", calendar: "europe",   template: "it",  currency: "€" },
  allemagne:   { label: "Allemagne",          pool: "de", calendar: "europe",   template: "de",  currency: "€" },
  belgique:    { label: "Belgique",           pool: "fr", calendar: "europe",   template: "be",  currency: "€" },
  suisse:      { label: "Suisse",             pool: "de", calendar: "europe",   template: "ch",  currency: "CHF" },
  turquie:     { label: "Turquie",            pool: "tr", calendar: "europe",   template: "tr",  currency: "₺" },
  norvege:     { label: "Norvège",            pool: "no", calendar: "calendaire", template: "no", currency: "NOK" },
  islande:     { label: "Islande",            pool: "no", calendar: "calendaire", template: "is", currency: "ISK" },
  irlande:     { label: "Irlande",            pool: "en", calendar: "europe",   template: "ie",  currency: "€" },
  irlandeNord: { label: "Irlande du Nord",    pool: "en", calendar: "europe",   template: "en",  currency: "£" },
  roumanie:    { label: "Roumanie",           pool: "ro", calendar: "europe",   template: "ro",  currency: "RON" },
  pologne:     { label: "Pologne",            pool: "pl", calendar: "europe",   template: "pl",  currency: "PLN" },
  suede:       { label: "Suède",              pool: "no", calendar: "calendaire", template: "se", currency: "SEK" },
  moldavie:    { label: "Moldavie",           pool: "ro", calendar: "europe",   template: "ro",  currency: "MDL" },
  chine:       { label: "Chine",              pool: "zh", calendar: "calendaire", template: "zh", currency: "¥" },
  coreeSud:    { label: "Corée du Sud",       pool: "ko", calendar: "calendaire", template: "ko", currency: "₩" },
  australie:   { label: "Australie",          pool: "en", calendar: "calendaire", template: "au", currency: "AU$" },
  usa:         { label: "USA",                pool: "en", calendar: "calendaire", template: "us", currency: "$" },
  mexique:     { label: "Mexique",            pool: "es", calendar: "calendaire", template: "mx", currency: "$" },
  argentine:   { label: "Argentine",          pool: "es", calendar: "calendaire", template: "ar", currency: "$" },
  bresil:      { label: "Brésil",             pool: "pt", calendar: "calendaire", template: "br", currency: "R$" }
};

// ---- Gabarits de noms de clubs par culture ----
const CLUB_TEMPLATES = {
  fr:  (city) => pick(["AS ${c}","FC ${c}","Olympique de ${c}","Racing Club de ${c}","Stade ${c}ois"]).replace("${c}", city),
  en:  (city) => pick(["${c} City","${c} United","${c} Athletic","${c} Rovers","${c} Town"]).replace("${c}", city),
  es:  (city) => pick(["Real ${c}","Atlético ${c}","Deportivo ${c}","Unión ${c}","CD ${c}"]).replace("${c}", city),
  it:  (city) => pick(["AC ${c}","US ${c}","Calcio ${c}","AS ${c}","Inter ${c}"]).replace("${c}", city),
  de:  (city) => pick(["FC ${c}","Borussia ${c}","SV ${c}","TSV ${c}","VfL ${c}"]).replace("${c}", city),
  be:  (city) => pick(["Royal ${c} FC","${c} SK","Standard de ${c}","${c} United"]).replace("${c}", city),
  ch:  (city) => pick(["FC ${c}","${c} Grasshoppers","Servette ${c}","${c} Young Boys"]).replace("${c}", city),
  tr:  (city) => pick(["${c}spor","${c} Belediyespor","Genç ${c}","${c} FK"]).replace("${c}", city),
  no:  (city) => pick(["${c} IF","${c} FK","${c} IK","${c} BK"]).replace("${c}", city),
  is:  (city) => pick(["${c} IB","${c} UMF","Knattspyrnufélag ${c}"]).replace("${c}", city),
  ie:  (city) => pick(["${c} City FC","${c} United","${c} Athletic"]).replace("${c}", city),
  ro:  (city) => pick(["CS ${c}","FC ${c}","Universitatea ${c}","Steaua ${c}"]).replace("${c}", city),
  pl:  (city) => pick(["KS ${c}","Wisła ${c}","Górnik ${c}","Legia ${c}"]).replace("${c}", city),
  se:  (city) => pick(["${c} IF","${c} FF","IFK ${c}","${c} BK"]).replace("${c}", city),
  zh:  (city) => pick(["${c} FC","${c} United","Guoan ${c}","${c} Shenhua"]).replace("${c}", city),
  ko:  (city) => pick(["${c} FC","${c} United","${c} Hyundai FC"]).replace("${c}", city),
  au:  (city) => pick(["${c} FC","${c} United","${c} City"]).replace("${c}", city),
  us:  (city) => pick(["${c} FC","${c} United","${c} SC","Real ${c}"]).replace("${c}", city),
  mx:  (city) => pick(["Club ${c}","Deportivo ${c}","Atlético ${c}","${c} FC"]).replace("${c}", city),
  ar:  (city) => pick(["Club Atlético ${c}","${c} Central","Deportivo ${c}","${c} Juniors"]).replace("${c}", city),
  br:  (city) => pick(["EC ${c}","${c} Futebol Clube","Atlético ${c}","SC ${c}"]).replace("${c}", city)
};

// ---- Fenêtres de mercato réalistes (simplifiées par type de calendrier) ----
// "europe" = saison août->mai (calendrier européen classique)
// "calendaire" = saison alignée sur l'année civile (Scandinavie, Amériques, Asie, Océanie, USA)
const TRANSFER_WINDOWS = {
  europe: [
    { name: "Mercato d'été", startMonth: 6, startDay: 1, endMonth: 9, endDay: 1 },
    { name: "Mercato d'hiver", startMonth: 1, startDay: 1, endMonth: 2, endDay: 3 }
  ],
  calendaire: [
    { name: "Fenêtre de pré-saison", startMonth: 1, startDay: 10, endMonth: 3, endDay: 20 },
    { name: "Fenêtre estivale", startMonth: 7, startDay: 1, endMonth: 8, endDay: 15 }
  ]
};

// ---- Niveaux de difficulté ----
const DS_DIFFICULTIES = {
  facile: { label: "Facile", desc: "Les clubs adverses sont plus conciliants en négociation. Idéal pour apprendre." },
  normal: { label: "Normal", desc: "Un équilibre fidèle à la réalité des négociations de transfert." },
  difficile: { label: "Difficile", desc: "Les clubs et joueurs adverses négocient plus durement. Pour les habitués." }
};

// ---- Spécialisations du directeur sportif (personnalisation) ----
const DS_SPECIALIZATIONS = {
  generaliste: { label: "Généraliste", desc: "Aucun bonus particulier, un profil équilibré pour apprendre les bases." },
  negociateur: { label: "Négociateur", desc: "Vos offres de transfert et propositions de salaire sont mieux perçues par les clubs et les joueurs adverses." },
  financier: { label: "Financier", desc: "Vous obtenez un budget de transfert et un plafond salarial plus élevés dès le départ." },
  recruteur: { label: "Recruteur formateur", desc: "Vos jeunes joueurs (23 ans et moins) progressent plus vite et ont un potentiel de départ plus élevé." }
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---- Emblèmes illustrés du directeur sportif (portrait / avatar) ----
const DS_AVATARS = [
  { id: "tacticien",  emoji: "🧢", label: "Le Tacticien" },
  { id: "diplomate",  emoji: "🎩", label: "Le Diplomate" },
  { id: "batisseur",  emoji: "🏗️", label: "Le Bâtisseur" },
  { id: "denicheur",  emoji: "🔎", label: "Le Dénicheur" },
  { id: "veteran",    emoji: "🥸", label: "Le Vétéran" },
  { id: "ambitieux",  emoji: "🚀", label: "L'Ambitieux" }
];

// ---- Arbre de compétences du directeur sportif ----
const DS_SKILL_TREE = {
  negociation: { label: "Négociation", desc: "Vos offres et propositions salariales sont mieux perçues (+2% par niveau).", max: 3 },
  scouting:    { label: "Scouting",    desc: "Vos rapports de scouting sont plus précis à mesure que vous progressez.", max: 3 },
  finance:     { label: "Finance",     desc: "Budget de transfert et plafond salarial augmentés (+3% par niveau).", max: 3 },
  jeunes:      { label: "Formation",   desc: "Vos jeunes joueurs (23 ans et moins) progressent plus vite.", max: 3 }
};

// ---- Agents de joueurs (noms d'agences et d'agents génériques) ----
const AGENT_NAMES = ["Marc Villeroy","Sabine Duquesne","Julien Farrant","Nadia Kerbache","Thomas Lindqvist","Elena Bracco","Yusuf Demirtas","Carla Novotny","Renaud Ombeline","Priya Anand","Diego Salcedo","Ines Halvorsen"];
const AGENCIES = ["Sportif Global","Prime Talents Agency","Horizon Football Management","Elite Circle Sports","Atlas Player Group","Meridian Sports Agency"];

/* ============================================================
   VRAIS NOMS DE LIGUES + CLUBS GÉNÉRIQUES INSPIRÉS DES VRAIES ÉQUIPES
   (noms génériques façon "Football Manager non-licencié" : on reconnaît
   l'équipe visée sans utiliser son nom/logo déposé exact)
   ============================================================ */

const LEAGUE_NAMES = {
  france:      { d1: "Ligue 1",                d2: "Ligue 2" },
  angleterre:  { d1: "Premier League",         d2: "Championship" },
  espagne:     { d1: "La Liga",                d2: "Segunda División" },
  italie:      { d1: "Serie A",                d2: "Serie B" },
  allemagne:   { d1: "Bundesliga",             d2: "2. Bundesliga" },
  belgique:    { d1: "Pro League",             d2: "Challenger Pro League" },
  suisse:      { d1: "Super League",           d2: "Challenge League" },
  turquie:     { d1: "Süper Lig",              d2: "1. Lig" },
  norvege:     { d1: "Eliteserien",            d2: "OBOS-ligaen" },
  islande:     { d1: "Besta deild karla",      d2: "1. deild karla" },
  irlande:     { d1: "Premier Division",       d2: "First Division" },
  irlandeNord: { d1: "NIFL Premiership",       d2: "NIFL Championship" },
  roumanie:    { d1: "Liga I",                 d2: "Liga II" },
  pologne:     { d1: "Ekstraklasa",            d2: "I liga" },
  suede:       { d1: "Allsvenskan",            d2: "Superettan" },
  moldavie:    { d1: "Divizia Națională",      d2: "Liga 1" },
  chine:       { d1: "Super League",           d2: "League One" },
  coreeSud:    { d1: "K League 1",             d2: "K League 2" },
  australie:   { d1: "A-League Men",           d2: "NPL National" },
  usa:         { d1: "Major League Soccer",    d2: "USL Championship" },
  mexique:     { d1: "Liga MX",                d2: "Liga de Expansión" },
  argentine:   { d1: "Liga Profesional",       d2: "Primera Nacional" },
  bresil:      { d1: "Brasileirão Série A",    d2: "Brasileirão Série B" }
};

// Clubs "génériques" de l'élite (division 1), inspirés des vraies références du pays,
// classés approximativement du plus huppé au plus modeste.
const CLUB_POOLS_D1 = {
  france: ["Paris Capitale","Olympique Phocéen","Rhône FC","Lille Nordiste","Monaco Principauté","Rennes Bretagne","Nice Côte d'Azur","Lens Artois","Strasbourg Alsace","Brest Finistère"],
  angleterre: ["Liverpool Rouge","Londres Gunners","Manchester Ciel","Londres Blues","Tyneside United","Villa Park","Forest Verts","Manchester Rouge","Londres Spurs","Merseyside Bleu"],
  espagne: ["Catalogne Blaugrana","Madrid Blancos","Madrid Rojiblanco","Bilbao Vasco","Villarreal Amarillo","Séville Verdiblanco","Séville Rojiblanco","Sociedad Donostiarra","Valence Blanquinegro","Vigo Céleste"],
  italie: ["Naples Azzurri","Milan Nerazzurri","Bergame Nerazzurri","Turin Bianconeri","Bologne Rossoblu","Rome Giallorossi","Rome Biancocelesti","Florence Viola","Milan Rossoneri","Turin Granata"],
  allemagne: ["Bavière Rouge","Ruhr Jaune-Noir","Leipzig Rouge-Blanc","Leverkusen Pharma","Berlin Union","Francfort Aigles","Stuttgart Souabe","Wolfsburg Loups","Gladbach Poulains","Brême Verts"],
  belgique: ["Anvers Royal","Bruges Blauw","Gand Buffles","Bruxelles Mauve","Genk Bleu","Charleroi Zèbres","Liège Rouge","Malines Kaki","Courtrai Renards","Ostende Côtiers"],
  suisse: ["Zurich Sauterelles","Zurich Blauweiss","Bâle Rotblau","Berne Young","Lucerne Zentral","Lugano Ticino","Lausanne Vaudois","Sion Valaisan","Saint-Gall Est","Genève Servette"],
  turquie: ["Istanbul Sarı-Lacivert","Istanbul Sarı-Kırmızı","Istanbul Siyah-Beyaz","Trabzon Bordo-Mavi","Konya Yeşil","Kayseri Sarı","Antalya Kırmızı","Gaziantep Kaplan","Adana Turuncu","Samsun Kırmızı-Beyaz"],
  norvege: ["Oslo Bleu","Bergen Noir-Blanc","Trondheim Noir","Bodø Or","Molde Bleu","Stavanger Blanc","Sarpsborg Jaune","Kristiansand Sud","Tromsø Nord","Sandefjord Rouge"],
  islande: ["Reykjavik Bleu","Reykjavik Jaune","Reykjavik Blanc","Kópavogur Bleu","Hafnarfjörður Blanc","Akureyri Jaune","Keflavik Bleu","Selfoss Vert","Vestmannaeyjar Bleu","Grindavik Bleu"],
  irlande: ["Dublin Hoops","Dublin Saints","Cork Rebelles","Galway Marron","Sligo Bit O'Red","Drogheda Boghawks","Dundalk Lilywhites","Waterford Bleu","Athlone Rouge","Bray Mouettes"],
  irlandeNord: ["Belfast Glens","Belfast Bleus","Larne Invicta","Coleraine Bannsiders","Crusaders Nord-Belfast","Cliftonville Rouge","Glenavon Lurgan","Ballymena Ciel","Newry Rouge","Portadown Ports"],
  roumanie: ["Bucarest Militari","Bucarest Rouge","Cluj Feroviari","Cluj Universitari","Craiova Oltenia","Iasi Moldova","Constanta Maritim","Timisoara Banat","Sibiu Transylvanie","Ploiesti Petrol"],
  pologne: ["Varsovie Militaire","Cracovie Rayures","Cracovie Blanc","Poznan Cheminot","Wroclaw Silésie","Gdansk Lechia","Katowice Mineur","Szczecin Pogon","Lodz Widzew","Lublin Motor"],
  suede: ["Stockholm Jaune-Noir","Stockholm Bleu-Or","Stockholm Vert-Blanc","Goteborg Bleu-Blanc","Malmo Ciel","Norrkoping Peking","Boras Elfsborg","Kalmar Sud","Goteborg Hacken","Sundsvall Norrland"],
  moldavie: ["Tiraspol Jaune","Chisinau Zimbru","Balti Nord","Nisporeni Espoir","Hincesti Petrocub","Orhei Milsami","Buiucani Dacia","Balti Zaria","Floresti Central","Ungheni Prut"],
  chine: ["Shanghai Portuaire","Shanghai Bleu","Pekin National","Guangzhou Sud","Shandong Jaune","Wuhan Yangtze","Chengdu Rong","Tianjin Jinmen","Dalian Renard","Qingdao Ocean"],
  coreeSud: ["Séoul Rouge","Suwon Bleu","Ulsan Tigres","Jeonju Vert","Pohang Acier","Daegu Ciel","Incheon Bleu","Gwangju Jaune","Daejeon Violet","Gimcheon Militaire"],
  australie: ["Sydney Ciel","Sydney Rouge-Noir","Melbourne Ciel","Melbourne Rouge-Blanc","Brisbane Orange","Perth Orange-Bleu","Adelaide Rouge-Bleu","Newcastle Rouge","Central Coast Bleu-Jaune","Gold Coast United"],
  usa: ["LA Galactique","LA Noir-Or","New York Rouge","New York Bleu","Seattle Vert","Atlanta Or-Noir","Columbus Jaune-Noir","Portland Rose","Miami Rosa-Noir","Chicago Feu"],
  mexique: ["Guadalajara Rojiblanco","Monterrey Rayé","Monterrey Félin","Ciudad Aigles","Ciudad Céleste","Ciudad Universitaire","Puebla Camotero","Tijuana Xolos","Leon Émeraude","Toluca Écarlate"],
  argentine: ["La Boca Azul-Or","Nunez Blanc","La Plata Lobo","Rosario Canalla","Rosario Leproso","Avellaneda Rouge","Avellaneda Académico","Boedo Corbeau","Cordoba Céleste","Mendoza Andin"],
  bresil: ["Rio Rubro-Negro","Rio Tricolor","Rio Alvinegro","São Paulo Tricolor","São Paulo Verdão","São Paulo Alvinegro","Porto Alegre Colorado","Porto Alegre Tricolor","Belo Horizonte Coq","Belo Horizonte Renard"]
};
