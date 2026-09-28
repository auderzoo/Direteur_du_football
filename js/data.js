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
  france: ["Lyon","Marseille","Lille","Nantes","Rennes","Toulouse","Nice","Strasbourg","Bordeaux","Reims","Metz","Brest","Angers","Le Havre","Montpellier","Caen","Dijon","Nancy","Troyes","Auxerre","Le Mans","Lorient","Valenciennes","Amiens","Ajaccio","Bastia","Clermont-Ferrand","Grenoble"],
  angleterre: ["Manchester","Liverpool","Leeds","Sheffield","Newcastle","Nottingham","Birmingham","Bristol","Southampton","Leicester","Derby","Sunderland","Coventry","Preston","Ipswich","Norwich","Watford","Luton","Bournemouth","Brighton","Brentford","Fulham","Hull","Middlesbrough","Reading","Portsmouth","Stoke","Wolverhampton","Blackburn","Bolton","Huddersfield","Swansea"],
  espagne: ["Séville","Valence","Bilbao","Malaga","Saragosse","Vigo","Gijon","Cadix","Grenade","Valladolid","Alicante","Cordoue","Murcie","San Sebastian","Santander","Almeria"],
  italie: ["Turin","Milan","Naples","Florence","Bologne","Gênes","Vérone","Bergame","Palerme","Cagliari","Lecce","Parme","Salerne","Udine","Brescia","Catane"],
  allemagne: ["Munich","Berlin","Hambourg","Cologne","Francfort","Stuttgart","Dortmund","Leipzig","Brême","Hanovre","Nuremberg","Bochum","Kiel","Rostock","Mayence","Dresde"],
  belgique: ["Anvers","Bruges","Gand","Charleroi","Liège","Louvain","Mons","Namur","Malines","Genk","Ostende","Courtrai"],
  suisse: ["Zurich","Genève","Bâle","Berne","Lausanne","Lucerne","Lugano","Sion","Winterthour","Saint-Gall"],
  turquie: ["Ankara","Izmir","Bursa","Antalya","Trabzon","Konya","Kayseri","Gaziantep","Adana","Samsun","Eskisehir","Denizli"],
  norvege: ["Bergen","Trondheim","Stavanger","Tromso","Drammen","Sandefjord","Bodo","Kristiansand","Alesund","Fredrikstad"],
  islande: ["Reykjavik","Kopavogur","Hafnarfjordur","Akureyri","Keflavik","Gardabaer","Selfoss","Akranes","Vestmannaeyjar","Mosfellsbaer","Reykjanesbaer","Egilsstadir","Isafjordur","Grindavik","Njardvik","Fjardabyggd","Modruvellir","Bolungarvik","Blonduos","Husavik"],
  irlande: ["Dublin","Cork","Galway","Limerick","Waterford","Sligo","Dundalk","Drogheda","Athlone","Bray","Longford","Wexford","Kilkenny","Tralee","Cobh","Navan","Ennis","Carlow","Wicklow","Mullingar"],
  irlandeNord: ["Belfast","Derry","Lisburn","Newry","Bangor","Coleraine","Ballymena","Larne","Portadown","Armagh","Craigavon","Omagh","Enniskillen","Antrim","Carrickfergus","Newtownabbey","Downpatrick","Dungannon","Lurgan","Newtownards"],
  roumanie: ["Cluj","Timisoara","Iasi","Craiova","Constanta","Brasov","Sibiu","Ploiesti","Oradea","Arad"],
  pologne: ["Varsovie","Cracovie","Wroclaw","Poznan","Gdansk","Lodz","Katowice","Szczecin","Lublin","Bydgoszcz"],
  suede: ["Goteborg","Malmo","Uppsala","Norrkoping","Helsingborg","Orebro","Vasteras","Jonkoping","Sundsvall","Umea"],
  moldavie: ["Chisinau","Balti","Tiraspol","Bender","Orhei","Cahul","Ungheni","Soroca","Comrat","Straseni","Hincesti","Nisporeni","Causeni","Falesti","Edinet","Drochia","Rezina","Anenii Noi","Riscani","Floresti"],
  chine: ["Shanghai","Guangzhou","Shenzhen","Chengdu","Wuhan","Tianjin","Qingdao","Dalian","Nanjing","Chongqing"],
  coreeSud: ["Séoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Ulsan","Suwon","Jeonju","Seongnam"],
  australie: ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Newcastle","Wollongong","Gold Coast","Canberra","Wellington","Geelong","Ballarat","Townsville","Hobart","Darwin","Cairns","Toowoomba","Bendigo","Launceston","Ipswich","Sunshine Coast","Mackay","Rockhampton","Bunbury"],
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
const SPONSOR_NAMES = ["Vortex Énergie","Banque Solide","AtlasTech","Néréide Assurances","Pinacle Immobilier","Rapide Logistique","Horizon Télécom","Grivois Boissons","Cortex Informatique","Zenith Compagnie Aérienne","Fusion Sportswear","Lumina Électronique","Argent Frais Finance","Marée Haute Fruits de Mer","Cristal Eau Minérale"];

/* ============================================================
   VRAIS NOMS DE LIGUES + CLUBS GÉNÉRIQUES INSPIRÉS DES VRAIES ÉQUIPES
   (noms génériques façon "Football Manager non-licencié" : on reconnaît
   l'équipe visée sans utiliser son nom/logo déposé exact)
   ============================================================ */

const LEAGUE_NAMES = {
  france:      { d1: "Ligue 1",                d2: "Ligue 2", d3: "Ligue 3", d4: "National", d5: "National 2" },
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
  france: ["Paris Saint-Germain","Olympique de Marseille","AS Monaco","Olympique Lyonnais","LOSC Lille","OGC Nice","RC Lens","RC Strasbourg Alsace","Stade Rennais FC","Toulouse FC","Stade Brestois 29","Angers SCO","Le Havre AC","AJ Auxerre","FC Nantes","FC Metz","Paris FC","FC Lorient"],
  angleterre: ["Manchester City","Arsenal","Liverpool","Manchester United","Chelsea","Tottenham Hotspur","Newcastle United","Aston Villa","Brighton & Hove Albion","Crystal Palace","Everton","Fulham","Brentford","Nottingham Forest","AFC Bournemouth","Leeds United","Ipswich Town","Sunderland","Hull City","Coventry City"],
  espagne: ["Real Madrid","FC Barcelone","Atlético Madrid","Athletic Bilbao","Villarreal CF","Real Betis","Séville FC","Real Sociedad","Valence CF","RC Celta de Vigo","Rayo Vallecano","CA Osasuna","RCD Majorque","Getafe CF","Deportivo Alavés","RCD Espanyol","Girona FC","Levante UD","Elche CF","Real Oviedo"],
  italie: ["SSC Naples","Inter Milan","AC Milan","Juventus Turin","Atalanta Bergame","AS Rome","Lazio Rome","Fiorentina","Bologne FC","Torino FC","Udinese","Genoa CFC","Cagliari Calcio","Hellas Vérone","US Lecce","Parme Calcio","Côme 1907","Sassuolo","Pise SC","US Cremonese"],
  allemagne: ["Bayern Munich","Bayer Leverkusen","Borussia Dortmund","RB Leipzig","Eintracht Francfort","VfB Stuttgart","SC Fribourg","VfL Wolfsburg","Borussia Mönchengladbach","Werder Brême","FC Augsbourg","1. FSV Mayence 05","TSG Hoffenheim","1. FC Union Berlin","FC St. Pauli","1. FC Heidenheim","FC Cologne","Hambourg SV"],
  belgique: ["Anvers Royal","Bruges Blauw","Gand Buffles","Bruxelles Mauve","Genk Bleu","Charleroi Zèbres","Liège Rouge","Malines Kaki","Courtrai Renards","Ostende Côtiers"],
  suisse: ["Zurich Sauterelles","Zurich Blauweiss","Bâle Rotblau","Berne Young","Lucerne Zentral","Lugano Ticino","Lausanne Vaudois","Sion Valaisan","Saint-Gall Est","Genève Servette"],
  turquie: ["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor","İstanbul Başakşehir","Konyaspor","Kayserispor","Antalyaspor","Gaziantep FK","Samsunspor"],
  norvege: ["Bodø/Glimt","Molde FK","Rosenborg BK","Vålerenga","SK Brann","Viking FK","Lillestrøm SK","Odds BK","Sarpsborg 08","Tromsø IL"],
  islande: ["KR Reykjavik","Valur","FH Hafnarfjörður","Breiðablik","Víkingur Reykjavik","Stjarnan","ÍA Akranes","KA Akureyri","Fram Reykjavik","Vestri"],
  irlande: ["Shamrock Rovers","Shelbourne FC","St Patrick's Athletic","Derry City","Bohemian FC","Drogheda United","Dundalk FC","Sligo Rovers","Galway United","Waterford FC"],
  irlandeNord: ["Linfield FC","Glentoran","Crusaders FC","Cliftonville","Larne FC","Coleraine FC","Glenavon","Portadown","Ballymena United","Newry City"],
  roumanie: ["Bucarest Militari","Bucarest Rouge","Cluj Feroviari","Cluj Universitari","Craiova Oltenia","Iasi Moldova","Constanta Maritim","Timisoara Banat","Sibiu Transylvanie","Ploiesti Petrol"],
  pologne: ["Lech Poznań","Legia Varsovie","Raków Częstochowa","Jagiellonia Białystok","Pogoń Szczecin","Górnik Zabrze","Widzew Łódź","Cracovia","Wisła Cracovie","Piast Gliwice"],
  suede: ["Malmö FF","AIK Solna","Djurgårdens IF","Hammarby IF","IFK Göteborg","BK Häcken","IF Elfsborg","Kalmar FF","IFK Norrköping","Mjällby AIF"],
  moldavie: ["Sheriff Tiraspol","Zimbru Chișinău","Milsami Orhei","Petrocub Hîncești","Dacia Buiucani","Sfântul Gheorghe","Speranța Nisporeni","Politehnica UTM","Florești","Bălți SC"],
  chine: ["Shanghai Port","Shanghai Shenhua","Beijing Guoan","Shandong Taishan","Zhejiang FC","Chengdu Rongcheng","Wuhan Three Towns","Tianjin Jinmen Tiger","Qingdao Hainiu","Meizhou Hakka"],
  coreeSud: ["Ulsan HD","Pohang Steelers","Gwangju FC","FC Seoul","Suwon FC","Daegu FC","Daejeon Hana Citizen","Gimcheon Sangmu","Jeonbuk Hyundai Motors","Incheon United"],
  australie: ["Melbourne City","Central Coast Mariners","Melbourne Victory","Western United","Sydney FC","Wellington Phoenix","Western Sydney Wanderers","Adelaide United","Macarthur FC","Brisbane Roar","Newcastle Jets","Perth Glory"],
  usa: ["LA Galactique","LA Noir-Or","New York Rouge","New York Bleu","Seattle Vert","Atlanta Or-Noir","Columbus Jaune-Noir","Portland Rose","Miami Rosa-Noir","Chicago Feu"],
  mexique: ["Club América","Chivas Guadalajara","Cruz Azul","Pumas UNAM","CF Monterrey","Tigres UANL","Deportivo Toluca","Club León","Santos Laguna","CF Pachuca","Atlas FC","Club Necaxa","Puebla FC","Xolos Tijuana","Mazatlán FC","Querétaro FC","FC Juárez","Atlético San Luis"],
  argentine: ["La Boca Azul-Or","Nunez Blanc","La Plata Lobo","Rosario Canalla","Rosario Leproso","Avellaneda Rouge","Avellaneda Académico","Boedo Corbeau","Cordoba Céleste","Mendoza Andin"],
  bresil: ["Rio Rubro-Negro","Rio Tricolor","Rio Alvinegro","São Paulo Tricolor","São Paulo Verdão","São Paulo Alvinegro","Porto Alegre Colorado","Porto Alegre Tricolor","Belo Horizonte Coq","Belo Horizonte Renard"]
};

// ---- Couleurs/formes de badge distinctives pour les clubs à noms réels (France) ----
// Ce sont des couleurs et une forme génériques inspirées du club, PAS les logos officiels
// (protégés par le droit d'auteur / la marque). Voir la note du DS pour plus de détails.
const FIXED_CLUB_STYLES = {
  "Paris Saint-Germain": { color: "#0B1F45", shape: "circle" },
  "AS Monaco": { color: "#CE1126", shape: "shield" },
  "Olympique de Marseille": { color: "#2FA7DE", shape: "circle" },
  "Olympique Lyonnais": { color: "#1A2C5B", shape: "shield" },
  "LOSC Lille": { color: "#C8102E", shape: "diamond" },
  "OGC Nice": { color: "#D2001C", shape: "shield" },
  "RC Lens": { color: "#FFD100", shape: "shield" },
  "RC Strasbourg Alsace": { color: "#0057B8", shape: "circle" },
  "Stade Rennais FC": { color: "#E2001A", shape: "shield" },
  "Toulouse FC": { color: "#6A0DAD", shape: "circle" },
  "AJ Auxerre": { color: "#1E4F91", shape: "shield" },
  "Stade Brestois 29": { color: "#D2122E", shape: "shield" },
  "Angers SCO": { color: "#1B1B1B", shape: "diamond" },
  "ESTAC Troyes": { color: "#00539B", shape: "shield" },
  "Le Havre AC": { color: "#0055A4", shape: "shield" },
  "FC Lorient": { color: "#F58220", shape: "shield" },
  "Le Mans FC": { color: "#E4002B", shape: "shield" },
  "Paris FC": { color: "#0B1F45", shape: "diamond" },

  // --- Angleterre (Premier League) ---
  "Manchester City": { color: "#6CABDD", shape: "circle" },
  "Arsenal": { color: "#EF0107", shape: "shield" },
  "Liverpool": { color: "#C8102E", shape: "shield" },
  "Manchester United": { color: "#DA291C", shape: "circle" },
  "Chelsea": { color: "#034694", shape: "circle" },
  "Tottenham Hotspur": { color: "#132257", shape: "shield" },
  "Newcastle United": { color: "#241F20", shape: "shield" },
  "Aston Villa": { color: "#95BFE5", shape: "shield" },
  "Brighton & Hove Albion": { color: "#0057B8", shape: "circle" },
  "Crystal Palace": { color: "#1B458F", shape: "shield" },
  "Everton": { color: "#003399", shape: "shield" },
  "Fulham": { color: "#1B1B1B", shape: "shield" },
  "Brentford": { color: "#D20000", shape: "circle" },
  "Nottingham Forest": { color: "#DD0000", shape: "diamond" },
  "AFC Bournemouth": { color: "#DA291C", shape: "shield" },
  "Leeds United": { color: "#FFCD00", shape: "shield" },
  "Ipswich Town": { color: "#0044A9", shape: "shield" },
  "Sunderland": { color: "#EB172B", shape: "shield" },
  "Hull City": { color: "#F5A12D", shape: "shield" },
  "Coventry City": { color: "#78D0F3", shape: "shield" }
};

// ---- Ville réelle associée à chaque club à nom réel ----
const FIXED_CLUB_CITIES = {
  "Paris Saint-Germain": "Paris", "Paris FC": "Paris", "AS Monaco": "Monaco",
  "Olympique de Marseille": "Marseille", "Olympique Lyonnais": "Lyon", "LOSC Lille": "Lille",
  "OGC Nice": "Nice", "RC Lens": "Lens", "RC Strasbourg Alsace": "Strasbourg",
  "Stade Rennais FC": "Rennes", "Toulouse FC": "Toulouse", "AJ Auxerre": "Auxerre",
  "Stade Brestois 29": "Brest", "Angers SCO": "Angers", "ESTAC Troyes": "Troyes",
  "Le Havre AC": "Le Havre", "FC Lorient": "Lorient", "Le Mans FC": "Le Mans",

  "Manchester City": "Manchester", "Manchester United": "Manchester",
  "Arsenal": "Londres", "Chelsea": "Londres", "Tottenham Hotspur": "Londres",
  "Crystal Palace": "Londres", "Fulham": "Londres", "Brentford": "Londres",
  "Liverpool": "Liverpool", "Everton": "Liverpool",
  "Newcastle United": "Newcastle", "Aston Villa": "Birmingham",
  "Brighton & Hove Albion": "Brighton", "Nottingham Forest": "Nottingham",
  "AFC Bournemouth": "Bournemouth", "Leeds United": "Leeds",
  "Ipswich Town": "Ipswich", "Sunderland": "Sunderland",
  "Hull City": "Hull", "Coventry City": "Coventry"
};

// ---- Clubs de deuxième division à noms réels (là où la hiérarchie est documentée) ----
const CLUB_POOLS_D2 = {
  france: ["ESTAC Troyes","Stade Lavallois","Amiens SC","EA Guingamp","US Boulogne","Pau FC","SC Bastia","FC Annecy","Clermont Foot 63","Grenoble Foot 38","Rodez AF","Red Star FC","USL Dunkerque","FC Martigues","AC Ajaccio","SM Caen","Nîmes Olympique","Le Mans FC"],
  espagne: ["Real Saragosse","Sporting Gijón","Racing Santander","Real Valladolid","UD Las Palmas","Cádiz CF","CD Leganés","SD Huesca","Albacete Balompié","Málaga CF","Deportivo La Corogne","Burgos CF","CD Castellón","Granada CF","Almería","Eibar","Mirandés","Córdoba CF"],
  italie: ["Sampdoria","Spezia Calcio","Venise FC","Palerme FC","Bari","Brescia Calcio","Empoli FC","Frosinone","Modène FC","Reggiana","Salernitana","Catanzaro","Cesena","Juve Stabia","Südtirol","Carrarese","Mantoue","Avellino"],
  allemagne: ["Schalke 04","Hertha Berlin","Fortuna Düsseldorf","Hanovre 96","Karlsruher SC","SC Paderborn","Holstein Kiel","1. FC Nuremberg","SV Darmstadt 98","VfL Bochum","Eintracht Brunswick","Greuther Fürth","SV Elversberg","Preußen Münster","Arminia Bielefeld","Dynamo Dresde","VfL Osnabrück","MSV Duisbourg"]
};

Object.assign(CLUB_POOLS_D2, {
  turquie: ["Adana Demirspor","Bodrumspor","MKE Ankaragücü","Boluspor","BB Erzurumspor","Manisa FK","Sakaryaspor","Pendikspor","Keçiörengücü","Bandırmaspor"],
  norvege: ["Sandefjord Fotball","Åsane Fotball","Sogndal Fotball","Kongsvinger IL","Ranheim Fotball","Bryne FK","Raufoss IL","Mjøndalen IF","Skeid Fotball","Fredrikstad FK"],
  islande: ["Þróttur Reykjavik","Grótta","Keflavík","Fjölnir","HK Kópavogur","Leiknir Reykjavik","Selfoss","Afturelding","Njarðvík","ÍBV Vestmannaeyjar"],
  irlande: ["Cork City","UCD AFC","Cobh Ramblers","Athlone Town","Longford Town","Bray Wanderers","Wexford FC","Treaty United","Kerry FC","Finn Harps"],
  irlandeNord: ["Dungannon Swifts","Carrick Rangers","Ards FC","Loughgall","Annagh United","Institute FC","Ballinamallard United","Newington FC","Bangor FC","Knockbreda FC"],
  pologne: ["GKS Katowice","Zagłębie Sosnowiec","Motor Lublin","Arka Gdynia","Chrobry Głogów","Odra Opole","Stal Mielec","Polonia Varsovie","ŁKS Łódź","Znicz Pruszków"],
  suede: ["GAIS Göteborg","Örebro SK","Halmstads BK","Degerfors IF","Sandvikens IF","Landskrona BoIS","Utsiktens BK","Östersunds FK","Varbergs BoIS","IK Brage"],
  moldavie: ["FC Nistru Otaci","Real Succes","Dinamo-Auto Tiraspol","Codru Lozova","Victoria Bardar","FC Ungheni","Recolta Cuizauca","CSF Speranța Drăsliceni","Cahul-2005","Costuleni"],
  chine: ["Dalian Yingbo","Nantong Zhiyun","Yanbian Longding","Sichuan Jiuniu","Guangxi Pingguo","Suzhou Dongwu","Heilongjiang Ice City","Qingdao West Coast","Zibo Cuju","Shenzhen Peng City"],
  coreeSud: ["Anyang FC","Bucheon FC 1995","Cheonan City","Ansan Greeners","Gimpo Citizen","Seoul E-Land","Hwaseong FC","Chungnam Asan","Gyeongnam FC","Jeonnam Dragons"],
  australie: ["Sydney United 58","Sydney Olympic","Marconi Stallions","South Melbourne","Heidelberg United","Green Gully SC","Avondale FC","Oakleigh Cannons","APIA Leichhardt","Wollongong Wolves","Broadmeadow Magic","Gold Coast Knights"],
  mexique: ["Mineros de Zacatecas","Correcaminos UAT","Atlético Morelia","Alebrijes de Oaxaca","Tepatitlán FC","Cancún FC","Tampico Madero","Leones Negros","Dorados de Sinaloa","Yucatán FC","Celaya FC","Tlaxcala FC"]
});

// Couleurs/formes de badge pour l'Espagne, l'Italie et l'Allemagne (D1 et D2)
Object.assign(FIXED_CLUB_STYLES, {
  // Espagne — D1
  "Real Madrid": { color: "#FEBE10", shape: "circle" },
  "FC Barcelone": { color: "#A50044", shape: "shield" },
  "Atlético Madrid": { color: "#CB3524", shape: "shield" },
  "Athletic Bilbao": { color: "#EE2523", shape: "shield" },
  "Villarreal CF": { color: "#FFE667", shape: "circle" },
  "Real Betis": { color: "#00954C", shape: "shield" },
  "Séville FC": { color: "#D2122E", shape: "shield" },
  "Real Sociedad": { color: "#0067B1", shape: "shield" },
  "Valence CF": { color: "#EE3524", shape: "shield" },
  "RC Celta de Vigo": { color: "#8AC3EE", shape: "circle" },
  "Rayo Vallecano": { color: "#E53027", shape: "diamond" },
  "CA Osasuna": { color: "#0A346F", shape: "shield" },
  "RCD Majorque": { color: "#E20613", shape: "circle" },
  "Getafe CF": { color: "#005999", shape: "shield" },
  "Deportivo Alavés": { color: "#0761AF", shape: "shield" },
  "RCD Espanyol": { color: "#007FC8", shape: "shield" },
  "Girona FC": { color: "#CD2534", shape: "shield" },
  "Levante UD": { color: "#004B9B", shape: "shield" },
  "Elche CF": { color: "#046A38", shape: "shield" },
  "Real Oviedo": { color: "#0B4EA2", shape: "circle" },
  // Espagne — D2
  "Real Saragosse": { color: "#0B4EA2", shape: "shield" },
  "Sporting Gijón": { color: "#E53027", shape: "shield" },
  "Racing Santander": { color: "#009B48", shape: "circle" },
  "Real Valladolid": { color: "#6C2C8E", shape: "shield" },
  "UD Las Palmas": { color: "#FFE000", shape: "circle" },
  "Cádiz CF": { color: "#FFE000", shape: "shield" },
  "CD Leganés": { color: "#005BAC", shape: "shield" },
  "SD Huesca": { color: "#005BAC", shape: "shield" },
  "Albacete Balompié": { color: "#FFFFFF", shape: "shield" },
  "Málaga CF": { color: "#0071CE", shape: "shield" },
  "Deportivo La Corogne": { color: "#0072CE", shape: "shield" },
  "Burgos CF": { color: "#000000", shape: "shield" },
  "CD Castellón": { color: "#000000", shape: "shield" },
  "Granada CF": { color: "#C3172C", shape: "shield" },
  "Almería": { color: "#E4002B", shape: "shield" },
  "Eibar": { color: "#004996", shape: "shield" },
  "Mirandés": { color: "#E4002B", shape: "shield" },
  "Córdoba CF": { color: "#007A33", shape: "shield" },

  // Italie — D1
  "SSC Naples": { color: "#12A0D7", shape: "circle" },
  "Inter Milan": { color: "#0068A8", shape: "shield" },
  "AC Milan": { color: "#FB090B", shape: "shield" },
  "Juventus Turin": { color: "#000000", shape: "shield" },
  "Atalanta Bergame": { color: "#1E71B8", shape: "shield" },
  "AS Rome": { color: "#8E1F2F", shape: "circle" },
  "Lazio Rome": { color: "#87D8F7", shape: "shield" },
  "Fiorentina": { color: "#592C82", shape: "diamond" },
  "Bologne FC": { color: "#1A2F48", shape: "shield" },
  "Torino FC": { color: "#8B1E1E", shape: "shield" },
  "Udinese": { color: "#000000", shape: "shield" },
  "Genoa CFC": { color: "#A4243B", shape: "shield" },
  "Cagliari Calcio": { color: "#B01E36", shape: "shield" },
  "Hellas Vérone": { color: "#0A2D5C", shape: "shield" },
  "US Lecce": { color: "#FFD100", shape: "circle" },
  "Parme Calcio": { color: "#FFD100", shape: "diamond" },
  "Côme 1907": { color: "#0B2C5E", shape: "shield" },
  "Sassuolo": { color: "#00A752", shape: "shield" },
  "Pise SC": { color: "#0B2C5E", shape: "shield" },
  "US Cremonese": { color: "#A4243B", shape: "shield" },
  // Italie — D2
  "Sampdoria": { color: "#1B5497", shape: "circle" },
  "Spezia Calcio": { color: "#000000", shape: "shield" },
  "Venise FC": { color: "#000000", shape: "shield" },
  "Palerme FC": { color: "#F5A9C3", shape: "shield" },
  "Bari": { color: "#E4002B", shape: "shield" },
  "Brescia Calcio": { color: "#005BAC", shape: "shield" },
  "Empoli FC": { color: "#00579C", shape: "shield" },
  "Frosinone": { color: "#FFD100", shape: "shield" },
  "Modène FC": { color: "#FFD100", shape: "shield" },
  "Reggiana": { color: "#A4243B", shape: "shield" },
  "Salernitana": { color: "#7B1E28", shape: "shield" },
  "Catanzaro": { color: "#FFD100", shape: "shield" },
  "Cesena": { color: "#000000", shape: "shield" },
  "Juve Stabia": { color: "#FFD100", shape: "shield" },
  "Südtirol": { color: "#E4002B", shape: "shield" },
  "Carrarese": { color: "#005BAC", shape: "shield" },
  "Mantoue": { color: "#E4002B", shape: "shield" },
  "Avellino": { color: "#007A33", shape: "shield" },

  // Allemagne — D1
  "Bayern Munich": { color: "#DC052D", shape: "circle" },
  "Bayer Leverkusen": { color: "#E32221", shape: "shield" },
  "Borussia Dortmund": { color: "#FDE100", shape: "circle" },
  "RB Leipzig": { color: "#DD0741", shape: "shield" },
  "Eintracht Francfort": { color: "#E1000F", shape: "shield" },
  "VfB Stuttgart": { color: "#E32219", shape: "circle" },
  "SC Fribourg": { color: "#E2001A", shape: "shield" },
  "VfL Wolfsburg": { color: "#65B32E", shape: "circle" },
  "Borussia Mönchengladbach": { color: "#000000", shape: "diamond" },
  "Werder Brême": { color: "#1D9053", shape: "shield" },
  "FC Augsbourg": { color: "#BA3733", shape: "shield" },
  "1. FSV Mayence 05": { color: "#C3141E", shape: "shield" },
  "TSG Hoffenheim": { color: "#1C63B7", shape: "shield" },
  "1. FC Union Berlin": { color: "#EB1923", shape: "shield" },
  "FC St. Pauli": { color: "#6B3F2A", shape: "diamond" },
  "1. FC Heidenheim": { color: "#E30613", shape: "shield" },
  "FC Cologne": { color: "#ED1C24", shape: "circle" },
  "Hambourg SV": { color: "#0A3A8B", shape: "diamond" },
  // Allemagne — D2
  "Schalke 04": { color: "#004D9D", shape: "circle" },
  "Hertha Berlin": { color: "#004D9D", shape: "shield" },
  "Fortuna Düsseldorf": { color: "#E2001A", shape: "shield" },
  "Hanovre 96": { color: "#009A3D", shape: "shield" },
  "Karlsruher SC": { color: "#0C4DA2", shape: "shield" },
  "SC Paderborn": { color: "#0C4DA2", shape: "shield" },
  "Holstein Kiel": { color: "#0C4DA2", shape: "shield" },
  "1. FC Nuremberg": { color: "#AD1732", shape: "shield" },
  "SV Darmstadt 98": { color: "#0C4DA2", shape: "shield" },
  "VfL Bochum": { color: "#005BA4", shape: "shield" },
  "Eintracht Brunswick": { color: "#FFD100", shape: "shield" },
  "Greuther Fürth": { color: "#00975F", shape: "shield" },
  "SV Elversberg": { color: "#E2001A", shape: "shield" },
  "Preußen Münster": { color: "#007A33", shape: "shield" },
  "Arminia Bielefeld": { color: "#005BA4", shape: "shield" },
  "Dynamo Dresde": { color: "#FFD100", shape: "shield" },
  "VfL Osnabrück": { color: "#4B1F6F", shape: "shield" },
  "MSV Duisbourg": { color: "#005BA4", shape: "shield" }
});

// Villes réelles (Espagne / Italie / Allemagne)
Object.assign(FIXED_CLUB_CITIES, {
  "Real Madrid": "Madrid", "Atlético Madrid": "Madrid", "Rayo Vallecano": "Madrid", "Getafe CF": "Getafe",
  "FC Barcelone": "Barcelone", "RCD Espanyol": "Barcelone", "Athletic Bilbao": "Bilbao",
  "Villarreal CF": "Villarreal", "Real Betis": "Séville", "Séville FC": "Séville",
  "Real Sociedad": "San Sebastian", "Valence CF": "Valence", "RC Celta de Vigo": "Vigo",
  "CA Osasuna": "Pampelune", "RCD Majorque": "Palma", "Deportivo Alavés": "Vitoria",
  "Girona FC": "Gérone", "Levante UD": "Valence", "Elche CF": "Elche", "Real Oviedo": "Oviedo",
  "Real Saragosse": "Saragosse", "Sporting Gijón": "Gijon", "Racing Santander": "Santander",
  "Real Valladolid": "Valladolid", "UD Las Palmas": "Las Palmas", "Cádiz CF": "Cadix",
  "CD Leganés": "Leganés", "SD Huesca": "Huesca", "Albacete Balompié": "Albacete",
  "Málaga CF": "Malaga", "Deportivo La Corogne": "La Corogne", "Burgos CF": "Burgos",
  "CD Castellón": "Castellón", "Granada CF": "Grenade", "Almería": "Almeria",
  "Eibar": "Eibar", "Mirandés": "Miranda", "Córdoba CF": "Cordoue",

  "SSC Naples": "Naples", "Inter Milan": "Milan", "AC Milan": "Milan", "Juventus Turin": "Turin",
  "Atalanta Bergame": "Bergame", "AS Rome": "Rome", "Lazio Rome": "Rome", "Fiorentina": "Florence",
  "Bologne FC": "Bologne", "Torino FC": "Turin", "Udinese": "Udine", "Genoa CFC": "Gênes",
  "Cagliari Calcio": "Cagliari", "Hellas Vérone": "Vérone", "US Lecce": "Lecce",
  "Parme Calcio": "Parme", "Côme 1907": "Côme", "Sassuolo": "Sassuolo", "Pise SC": "Pise",
  "US Cremonese": "Crémone", "Sampdoria": "Gênes", "Spezia Calcio": "La Spezia",
  "Venise FC": "Venise", "Palerme FC": "Palerme", "Bari": "Bari", "Brescia Calcio": "Brescia",
  "Empoli FC": "Empoli", "Frosinone": "Frosinone", "Modène FC": "Modène", "Reggiana": "Reggio d'Émilie",
  "Salernitana": "Salerne", "Catanzaro": "Catanzaro", "Cesena": "Cesena", "Juve Stabia": "Castellammare",
  "Südtirol": "Bolzano", "Carrarese": "Carrare", "Mantoue": "Mantoue", "Avellino": "Avellino",

  "Bayern Munich": "Munich", "Bayer Leverkusen": "Leverkusen", "Borussia Dortmund": "Dortmund",
  "RB Leipzig": "Leipzig", "Eintracht Francfort": "Francfort", "VfB Stuttgart": "Stuttgart",
  "SC Fribourg": "Fribourg", "VfL Wolfsburg": "Wolfsburg", "Borussia Mönchengladbach": "Mönchengladbach",
  "Werder Brême": "Brême", "FC Augsbourg": "Augsbourg", "1. FSV Mayence 05": "Mayence",
  "TSG Hoffenheim": "Hoffenheim", "1. FC Union Berlin": "Berlin", "FC St. Pauli": "Hambourg",
  "1. FC Heidenheim": "Heidenheim", "FC Cologne": "Cologne", "Hambourg SV": "Hambourg",
  "Schalke 04": "Gelsenkirchen", "Hertha Berlin": "Berlin", "Fortuna Düsseldorf": "Düsseldorf",
  "Hanovre 96": "Hanovre", "Karlsruher SC": "Karlsruhe", "SC Paderborn": "Paderborn",
  "Holstein Kiel": "Kiel", "1. FC Nuremberg": "Nuremberg", "SV Darmstadt 98": "Darmstadt",
  "VfL Bochum": "Bochum", "Eintracht Brunswick": "Brunswick", "Greuther Fürth": "Fürth",
  "SV Elversberg": "Elversberg", "Preußen Münster": "Münster", "Arminia Bielefeld": "Bielefeld",
  "Dynamo Dresde": "Dresde", "VfL Osnabrück": "Osnabrück", "MSV Duisbourg": "Duisbourg"
});

/* ============================================================
   AJOUT : Portugal et Japon (pays complets) + clubs réels D1/D2
   pour Roumanie, Brésil, Portugal, Suisse, Belgique, USA,
   Argentine et Japon.
   ============================================================ */

Object.assign(NAME_POOLS, {
  ja: {
    first: ["Haruto","Yuto","Sota","Yuki","Hayato","Riku","Ren","Kaito","Daiki","Sora","Takumi","Koki","Shota","Yamato","Kenta","Ryo","Tatsuya","Naoki","Shun","Kazuki"],
    last: ["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato","Yoshida","Yamada","Sasaki","Yamaguchi","Matsumoto","Inoue","Kimura","Hayashi","Shimizu","Saito"]
  }
});

Object.assign(CITIES, {
  portugal: ["Lisbonne","Porto","Braga","Guimarães","Coimbra","Faro","Setúbal","Funchal","Aveiro","Leiria","Viseu","Famalicão","Chaves","Portimão","Estoril","Barcelos","Penafiel","Tondela","Moreira","Arouca"],
  japon: ["Tokyo","Yokohama","Osaka","Nagoya","Kobe","Sapporo","Hiroshima","Fukuoka","Kawasaki","Saitama","Sendai","Kyoto","Niigata","Shizuoka","Kashima","Chiba","Urawa","Oita","Matsumoto","Okayama"]
});

Object.assign(CLUB_TEMPLATES, {
  pt: (city) => pick(["SC ${c}","${c} FC","AD ${c}","CD ${c}"]).replace("${c}", city),
  ja: (city) => pick(["${c} FC","${c} United","Vissel ${c}","${c} Sporting"]).replace("${c}", city)
});

Object.assign(COUNTRIES, {
  portugal: { label: "Portugal", pool: "pt", calendar: "europe",     template: "pt", currency: "€" },
  japon:    { label: "Japon",    pool: "ja", calendar: "calendaire", template: "ja", currency: "¥" }
});

Object.assign(LEAGUE_NAMES, {
  portugal: { d1: "Primeira Liga", d2: "Liga Portugal 2" },
  japon:    { d1: "J1 League",     d2: "J2 League" }
});

Object.assign(CLUB_POOLS_D1, {
  portugal: ["Sporting CP","SL Benfica","FC Porto","SC Braga","Vitória Guimarães","Moreirense FC","Santa Clara","FC Famalicão","Casa Pia AC","Rio Ave FC","Estoril Praia","CD Nacional","Gil Vicente FC","CF Estrela Amadora","AVS","Arouca","Tondela","Boavista"],
  japon: ["Vissel Kobe","Sanfrecce Hiroshima","Machida Zelvia","Gamba Osaka","Kashima Antlers","Cerezo Osaka","Tokyo Verdy","Kawasaki Frontale","FC Tokyo","Avispa Fukuoka","Urawa Reds","Nagoya Grampus","Yokohama F. Marinos","Kyoto Sanga","Shonan Bellmare","Albirex Niigata","Júbilo Iwata","Kashiwa Reysol","Consadole Sapporo","Shimizu S-Pulse"],
  roumanie: ["FCSB","CFR Cluj","Universitatea Craiova","Rapid Bucarest","Sepsi OSK","Farul Constanța","Universitatea Cluj","FC Botoșani","Petrolul Ploiești","UTA Arad","Dinamo Bucarest","FC Hermannstadt","Oțelul Galați","FC Voluntari","Poli Iași","Unirea Slobozia"],
  bresil: ["Flamengo","Palmeiras","Botafogo","São Paulo FC","Fluminense","Internacional","Grêmio","Corinthians","Cruzeiro","Atlético Mineiro","Vasco da Gama","Bahia","Fortaleza","Athletico Paranaense","Red Bull Bragantino","Santos FC","Vitória","Juventude","Criciúma","Cuiabá"],
  suisse: ["BSC Young Boys","FC Bâle","FC Lugano","Servette FC","FC Zurich","FC Saint-Gall","FC Lucerne","Grasshopper Zurich","FC Winterthour","Yverdon Sport","FC Sion","Lausanne-Sport"],
  belgique: ["Club Bruges","RSC Anderlecht","Royale Union Saint-Gilloise","KRC Genk","Antwerp FC","KAA La Gantoise","Cercle Bruges","Standard de Liège","KV Malines","Westerlo","OH Louvain","Charleroi","Sint-Truiden","KVC Dender","Beerschot","Kortrijk"],
  usa: ["Inter Miami CF","LA Galaxy","LAFC","Columbus Crew","FC Cincinnati","Seattle Sounders","Philadelphia Union","New York City FC","New York Red Bulls","Atlanta United","Portland Timbers","Real Salt Lake","Orlando City","Nashville SC","Minnesota United","Austin FC","Sporting Kansas City","Houston Dynamo","Chicago Fire","Toronto FC"],
  argentine: ["River Plate","Boca Juniors","Racing Club","Independiente","San Lorenzo","Vélez Sarsfield","Estudiantes La Plata","Talleres Córdoba","Rosario Central","Newell's Old Boys","Lanús","Argentinos Juniors","Huracán","Defensa y Justicia","Godoy Cruz","Belgrano","Instituto","Banfield","Platense","Tigre"]
});

Object.assign(CLUB_POOLS_D2, {
  portugal: ["FC Penafiel","UD Oliveirense","SC Farense","Académico Viseu","Leixões SC","CD Feirense","Portimonense","Marítimo","Chaves","Torreense","Vizela","Paços de Ferreira","União de Leiria","Alverca","Felgueiras","Lank Vilaverdense"],
  japon: ["Shimizu S-Pulse II","V-Varen Nagasaki","Yokohama FC","Vegalta Sendai","JEF United Chiba","Montedio Yamagata","Mito HollyHock","Fagiano Okayama","Ventforet Kofu","Roasso Kumamoto","Tokushima Vortis","Renofa Yamaguchi","Oita Trinita","Blaublitz Akita","Iwaki FC","Ehime FC","Sagan Tosu","Omiya Ardija","Fujieda MYFC","Kataller Toyama"],
  roumanie: ["Steaua Bucarest","CSM Reșița","Concordia Chiajna","Metaloglobus","Gloria Buzău","Corvinul Hunedoara","CS Tunari","Unirea Dej","Progresul Spartac","Dumbrăvița","CSM Slatina","ASA Târgu Mureș","Afumați","Câmpulung Muscel","Bihor Oradea","Șelimbăr"],
  bresil: ["Santa Cruz","Náutico","Sport Recife","Ceará SC","Goiás","América Mineiro","Chapecoense","Coritiba","Avaí","Paysandu","Remo","Ponte Preta","Guarani","Novorizontino","Mirassol","Operário Ferroviário","Botafogo-SP","Amazonas FC","Vila Nova","CRB"],
  suisse: ["FC Aarau","Neuchâtel Xamax","FC Thoune","FC Vaduz","FC Schaffhouse","FC Wil","Stade Nyonnais","Étoile Carouge","SC Bellinzone","FC Bienne"],
  belgique: ["Lommel SK","RWD Molenbeek","Lierse","Zulte Waregem","Beveren","RFC Liège","Seraing","Patro Eisden","Francs Borains","La Louvière","Club NXT","Jong Genk"],
  usa: ["Louisville City FC","Indy Eleven","Sacramento Republic","Phoenix Rising","San Antonio FC","Tampa Bay Rowdies","Pittsburgh Riverhounds","Birmingham Legion","Memphis 901","El Paso Locomotive","Colorado Springs Switchbacks","Detroit City FC","Charleston Battery","North Carolina FC","Rhode Island FC","Hartford Athletic","Oakland Roots","Monterey Bay FC"],
  argentine: ["Chacarita Juniors","Ferro Carril Oeste","Atlanta","Nueva Chicago","All Boys","Colón Santa Fe","Gimnasia Mendoza","San Martín Tucumán","Almirante Brown","Quilmes","Estudiantes Río Cuarto","Temperley","Deportivo Morón","Los Andes","Defensores de Belgrano","Deportivo Maipú","Agropecuario","San Telmo"]
});

// Couleurs/formes de badge (Portugal, Japon, Roumanie, Brésil, Suisse, Belgique, USA, Argentine)
Object.assign(FIXED_CLUB_STYLES, {
  // Portugal
  "Sporting CP": { color: "#008057", shape: "shield" }, "SL Benfica": { color: "#E02127", shape: "circle" },
  "FC Porto": { color: "#00428C", shape: "shield" }, "SC Braga": { color: "#B3111A", shape: "shield" },
  "Vitória Guimarães": { color: "#FFFFFF", shape: "shield" }, "Moreirense FC": { color: "#009B48", shape: "shield" },
  "Santa Clara": { color: "#E4002B", shape: "shield" }, "FC Famalicão": { color: "#004F9F", shape: "shield" },
  "Casa Pia AC": { color: "#000000", shape: "shield" }, "Rio Ave FC": { color: "#009B48", shape: "shield" },
  "Estoril Praia": { color: "#FFD100", shape: "shield" }, "CD Nacional": { color: "#000000", shape: "shield" },
  "Gil Vicente FC": { color: "#E4002B", shape: "shield" }, "CF Estrela Amadora": { color: "#E4002B", shape: "shield" },
  "AVS": { color: "#004F9F", shape: "shield" }, "Arouca": { color: "#FFD100", shape: "shield" },
  "Tondela": { color: "#FFD100", shape: "shield" }, "Boavista": { color: "#000000", shape: "diamond" },
  "FC Penafiel": { color: "#E4002B", shape: "shield" }, "UD Oliveirense": { color: "#004F9F", shape: "shield" },
  "SC Farense": { color: "#000000", shape: "shield" }, "Académico Viseu": { color: "#E4002B", shape: "shield" },
  "Leixões SC": { color: "#E4002B", shape: "shield" }, "CD Feirense": { color: "#004F9F", shape: "shield" },
  "Portimonense": { color: "#000000", shape: "shield" }, "Marítimo": { color: "#009B48", shape: "shield" },
  "Chaves": { color: "#004F9F", shape: "shield" }, "Torreense": { color: "#009B48", shape: "shield" },
  "Vizela": { color: "#004F9F", shape: "shield" }, "Paços de Ferreira": { color: "#FFD100", shape: "shield" },
  "União de Leiria": { color: "#004F9F", shape: "shield" }, "Alverca": { color: "#E4002B", shape: "shield" },
  "Felgueiras": { color: "#009B48", shape: "shield" }, "Lank Vilaverdense": { color: "#004F9F", shape: "shield" },

  // Japon
  "Vissel Kobe": { color: "#8B1A3A", shape: "circle" }, "Sanfrecce Hiroshima": { color: "#4B2E83", shape: "shield" },
  "Machida Zelvia": { color: "#0B2C5E", shape: "shield" }, "Gamba Osaka": { color: "#0B2C5E", shape: "circle" },
  "Kashima Antlers": { color: "#8B1A3A", shape: "shield" }, "Cerezo Osaka": { color: "#E4007F", shape: "circle" },
  "Tokyo Verdy": { color: "#009B48", shape: "shield" }, "Kawasaki Frontale": { color: "#0B7DC4", shape: "shield" },
  "FC Tokyo": { color: "#0B2C5E", shape: "circle" }, "Avispa Fukuoka": { color: "#0B2C5E", shape: "shield" },
  "Urawa Reds": { color: "#E4002B", shape: "circle" }, "Nagoya Grampus": { color: "#E4002B", shape: "shield" },
  "Yokohama F. Marinos": { color: "#0B2C5E", shape: "shield" }, "Kyoto Sanga": { color: "#6B2E8B", shape: "shield" },
  "Shonan Bellmare": { color: "#009B48", shape: "shield" }, "Albirex Niigata": { color: "#F5A12D", shape: "shield" },
  "Júbilo Iwata": { color: "#009B48", shape: "shield" }, "Kashiwa Reysol": { color: "#FFD100", shape: "shield" },
  "Consadole Sapporo": { color: "#E4002B", shape: "shield" }, "Shimizu S-Pulse": { color: "#F5A12D", shape: "shield" },
  "Shimizu S-Pulse II": { color: "#F5A12D", shape: "diamond" }, "V-Varen Nagasaki": { color: "#0B7DC4", shape: "shield" },
  "Yokohama FC": { color: "#0B7DC4", shape: "shield" }, "Vegalta Sendai": { color: "#FFD100", shape: "shield" },
  "JEF United Chiba": { color: "#FFD100", shape: "shield" }, "Montedio Yamagata": { color: "#0B2C5E", shape: "shield" },
  "Mito HollyHock": { color: "#0B2C5E", shape: "shield" }, "Fagiano Okayama": { color: "#0B2C5E", shape: "shield" },
  "Ventforet Kofu": { color: "#0B2C5E", shape: "shield" }, "Roasso Kumamoto": { color: "#E4002B", shape: "shield" },
  "Tokushima Vortis": { color: "#0B7DC4", shape: "shield" }, "Renofa Yamaguchi": { color: "#F5A12D", shape: "shield" },
  "Oita Trinita": { color: "#0B7DC4", shape: "shield" }, "Blaublitz Akita": { color: "#0B2C5E", shape: "shield" },
  "Iwaki FC": { color: "#E4002B", shape: "shield" }, "Ehime FC": { color: "#F5A12D", shape: "shield" },
  "Sagan Tosu": { color: "#0B7DC4", shape: "shield" }, "Omiya Ardija": { color: "#F5A12D", shape: "shield" },
  "Fujieda MYFC": { color: "#6B2E8B", shape: "shield" }, "Kataller Toyama": { color: "#0B7DC4", shape: "shield" },

  // Roumanie
  "FCSB": { color: "#E4002B", shape: "circle" }, "CFR Cluj": { color: "#8B1A3A", shape: "shield" },
  "Universitatea Craiova": { color: "#0B2C5E", shape: "shield" }, "Rapid Bucarest": { color: "#6B2E8B", shape: "shield" },
  "Sepsi OSK": { color: "#000000", shape: "shield" }, "Farul Constanța": { color: "#0B7DC4", shape: "shield" },
  "Universitatea Cluj": { color: "#000000", shape: "shield" }, "FC Botoșani": { color: "#E4002B", shape: "shield" },
  "Petrolul Ploiești": { color: "#FFD100", shape: "shield" }, "UTA Arad": { color: "#E4002B", shape: "shield" },
  "Dinamo Bucarest": { color: "#E4002B", shape: "circle" }, "FC Hermannstadt": { color: "#E4002B", shape: "shield" },
  "Oțelul Galați": { color: "#0B2C5E", shape: "shield" }, "FC Voluntari": { color: "#0B7DC4", shape: "shield" },
  "Poli Iași": { color: "#0B2C5E", shape: "shield" }, "Unirea Slobozia": { color: "#009B48", shape: "shield" },
  "Steaua Bucarest": { color: "#E4002B", shape: "shield" }, "CSM Reșița": { color: "#E4002B", shape: "shield" },
  "Concordia Chiajna": { color: "#009B48", shape: "shield" }, "Metaloglobus": { color: "#0B7DC4", shape: "shield" },
  "Gloria Buzău": { color: "#E4002B", shape: "shield" }, "Corvinul Hunedoara": { color: "#0B2C5E", shape: "shield" },
  "CS Tunari": { color: "#009B48", shape: "shield" }, "Unirea Dej": { color: "#E4002B", shape: "shield" },
  "Progresul Spartac": { color: "#0B7DC4", shape: "shield" }, "Dumbrăvița": { color: "#009B48", shape: "shield" },
  "CSM Slatina": { color: "#0B2C5E", shape: "shield" }, "ASA Târgu Mureș": { color: "#FFD100", shape: "shield" },
  "Afumați": { color: "#E4002B", shape: "shield" }, "Câmpulung Muscel": { color: "#0B7DC4", shape: "shield" },
  "Bihor Oradea": { color: "#E4002B", shape: "shield" }, "Șelimbăr": { color: "#009B48", shape: "shield" },

  // Brésil
  "Flamengo": { color: "#E4002B", shape: "circle" }, "Palmeiras": { color: "#006437", shape: "shield" },
  "Botafogo": { color: "#000000", shape: "circle" }, "São Paulo FC": { color: "#E4002B", shape: "diamond" },
  "Fluminense": { color: "#8B1A3A", shape: "shield" }, "Internacional": { color: "#E4002B", shape: "circle" },
  "Grêmio": { color: "#0B7DC4", shape: "shield" }, "Corinthians": { color: "#000000", shape: "shield" },
  "Cruzeiro": { color: "#0B2C5E", shape: "diamond" }, "Atlético Mineiro": { color: "#000000", shape: "shield" },
  "Vasco da Gama": { color: "#000000", shape: "diamond" }, "Bahia": { color: "#0B7DC4", shape: "shield" },
  "Fortaleza": { color: "#0B2C5E", shape: "shield" }, "Athletico Paranaense": { color: "#E4002B", shape: "shield" },
  "Red Bull Bragantino": { color: "#E4002B", shape: "shield" }, "Santos FC": { color: "#FFFFFF", shape: "circle" },
  "Vitória": { color: "#E4002B", shape: "shield" }, "Juventude": { color: "#009B48", shape: "shield" },
  "Criciúma": { color: "#FFD100", shape: "shield" }, "Cuiabá": { color: "#FFD100", shape: "shield" },
  "Santa Cruz": { color: "#E4002B", shape: "shield" }, "Náutico": { color: "#E4002B", shape: "shield" },
  "Sport Recife": { color: "#E4002B", shape: "shield" }, "Ceará SC": { color: "#000000", shape: "shield" },
  "Goiás": { color: "#009B48", shape: "shield" }, "América Mineiro": { color: "#009B48", shape: "shield" },
  "Chapecoense": { color: "#009B48", shape: "shield" }, "Coritiba": { color: "#009B48", shape: "shield" },
  "Avaí": { color: "#0B7DC4", shape: "shield" }, "Paysandu": { color: "#0B2C5E", shape: "shield" },
  "Remo": { color: "#0B2C5E", shape: "shield" }, "Ponte Preta": { color: "#000000", shape: "shield" },
  "Guarani": { color: "#009B48", shape: "shield" }, "Novorizontino": { color: "#FFD100", shape: "shield" },
  "Mirassol": { color: "#FFD100", shape: "shield" }, "Operário Ferroviário": { color: "#000000", shape: "shield" },
  "Botafogo-SP": { color: "#E4002B", shape: "shield" }, "Amazonas FC": { color: "#009B48", shape: "shield" },
  "Vila Nova": { color: "#E4002B", shape: "shield" }, "CRB": { color: "#E4002B", shape: "shield" },

  // Suisse
  "BSC Young Boys": { color: "#FFD100", shape: "shield" }, "FC Bâle": { color: "#E4002B", shape: "shield" },
  "FC Lugano": { color: "#000000", shape: "shield" }, "Servette FC": { color: "#8B1A3A", shape: "shield" },
  "FC Zurich": { color: "#0B7DC4", shape: "shield" }, "FC Saint-Gall": { color: "#009B48", shape: "shield" },
  "FC Lucerne": { color: "#0B7DC4", shape: "shield" }, "Grasshopper Zurich": { color: "#0B2C5E", shape: "shield" },
  "FC Winterthour": { color: "#E4002B", shape: "shield" }, "Yverdon Sport": { color: "#009B48", shape: "shield" },
  "FC Sion": { color: "#E4002B", shape: "shield" }, "Lausanne-Sport": { color: "#0B2C5E", shape: "shield" },
  "FC Aarau": { color: "#000000", shape: "shield" }, "Neuchâtel Xamax": { color: "#E4002B", shape: "shield" },
  "FC Thoune": { color: "#E4002B", shape: "shield" }, "FC Vaduz": { color: "#0B2C5E", shape: "shield" },
  "FC Schaffhouse": { color: "#000000", shape: "shield" }, "FC Wil": { color: "#E4002B", shape: "shield" },
  "Stade Nyonnais": { color: "#0B7DC4", shape: "shield" }, "Étoile Carouge": { color: "#E4002B", shape: "shield" },
  "SC Bellinzone": { color: "#0B7DC4", shape: "shield" }, "FC Bienne": { color: "#FFD100", shape: "shield" },

  // Belgique
  "Club Bruges": { color: "#0B2C5E", shape: "shield" }, "RSC Anderlecht": { color: "#6B2E8B", shape: "circle" },
  "Royale Union Saint-Gilloise": { color: "#FFD100", shape: "shield" }, "KRC Genk": { color: "#0B7DC4", shape: "shield" },
  "Antwerp FC": { color: "#E4002B", shape: "shield" }, "KAA La Gantoise": { color: "#0B7DC4", shape: "shield" },
  "Cercle Bruges": { color: "#009B48", shape: "shield" }, "Standard de Liège": { color: "#E4002B", shape: "shield" },
  "KV Malines": { color: "#FFD100", shape: "shield" }, "Westerlo": { color: "#FFD100", shape: "shield" },
  "OH Louvain": { color: "#0B2C5E", shape: "shield" }, "Charleroi": { color: "#000000", shape: "shield" },
  "Sint-Truiden": { color: "#FFD100", shape: "shield" }, "KVC Dender": { color: "#E4002B", shape: "shield" },
  "Beerschot": { color: "#6B2E8B", shape: "shield" }, "Kortrijk": { color: "#E4002B", shape: "shield" },
  "Lommel SK": { color: "#009B48", shape: "shield" }, "RWD Molenbeek": { color: "#000000", shape: "shield" },
  "Lierse": { color: "#FFD100", shape: "shield" }, "Zulte Waregem": { color: "#E4002B", shape: "shield" },
  "Beveren": { color: "#FFD100", shape: "shield" }, "RFC Liège": { color: "#E4002B", shape: "shield" },
  "Seraing": { color: "#E4002B", shape: "shield" }, "Patro Eisden": { color: "#FFD100", shape: "shield" },
  "Francs Borains": { color: "#009B48", shape: "shield" }, "La Louvière": { color: "#0B7DC4", shape: "shield" },
  "Club NXT": { color: "#0B2C5E", shape: "diamond" }, "Jong Genk": { color: "#0B7DC4", shape: "diamond" },

  // USA
  "Inter Miami CF": { color: "#F5B6CD", shape: "circle" }, "LA Galaxy": { color: "#FFD100", shape: "shield" },
  "LAFC": { color: "#C39E6D", shape: "shield" }, "Columbus Crew": { color: "#FFD100", shape: "circle" },
  "FC Cincinnati": { color: "#F5811F", shape: "shield" }, "Seattle Sounders": { color: "#009B48", shape: "shield" },
  "Philadelphia Union": { color: "#0B2C5E", shape: "shield" }, "New York City FC": { color: "#6CABDD", shape: "circle" },
  "New York Red Bulls": { color: "#E4002B", shape: "shield" }, "Atlanta United": { color: "#E4002B", shape: "shield" },
  "Portland Timbers": { color: "#009B48", shape: "shield" }, "Real Salt Lake": { color: "#8B1A3A", shape: "shield" },
  "Orlando City": { color: "#6B2E8B", shape: "circle" }, "Nashville SC": { color: "#FFD100", shape: "shield" },
  "Minnesota United": { color: "#0B7DC4", shape: "shield" }, "Austin FC": { color: "#009B48", shape: "shield" },
  "Sporting Kansas City": { color: "#0B7DC4", shape: "shield" }, "Houston Dynamo": { color: "#F5811F", shape: "shield" },
  "Chicago Fire": { color: "#E4002B", shape: "shield" }, "Toronto FC": { color: "#E4002B", shape: "shield" },
  "Louisville City FC": { color: "#6B2E8B", shape: "shield" }, "Indy Eleven": { color: "#0B2C5E", shape: "shield" },
  "Sacramento Republic": { color: "#8B1A3A", shape: "shield" }, "Phoenix Rising": { color: "#E4002B", shape: "shield" },
  "San Antonio FC": { color: "#000000", shape: "shield" }, "Tampa Bay Rowdies": { color: "#FFD100", shape: "shield" },
  "Pittsburgh Riverhounds": { color: "#FFD100", shape: "shield" }, "Birmingham Legion": { color: "#000000", shape: "shield" },
  "Memphis 901": { color: "#0B2C5E", shape: "shield" }, "El Paso Locomotive": { color: "#000000", shape: "shield" },
  "Colorado Springs Switchbacks": { color: "#0B2C5E", shape: "shield" }, "Detroit City FC": { color: "#8B1A3A", shape: "shield" },
  "Charleston Battery": { color: "#000000", shape: "shield" }, "North Carolina FC": { color: "#0B7DC4", shape: "shield" },
  "Rhode Island FC": { color: "#0B2C5E", shape: "shield" }, "Hartford Athletic": { color: "#009B48", shape: "shield" },
  "Oakland Roots": { color: "#009B48", shape: "shield" }, "Monterey Bay FC": { color: "#0B7DC4", shape: "shield" },

  // Argentine
  "River Plate": { color: "#E4002B", shape: "circle" }, "Boca Juniors": { color: "#0B2C5E", shape: "shield" },
  "Racing Club": { color: "#6CABDD", shape: "circle" }, "Independiente": { color: "#E4002B", shape: "shield" },
  "San Lorenzo": { color: "#8B1A3A", shape: "shield" }, "Vélez Sarsfield": { color: "#0B2C5E", shape: "shield" },
  "Estudiantes La Plata": { color: "#E4002B", shape: "shield" }, "Talleres Córdoba": { color: "#0B2C5E", shape: "shield" },
  "Rosario Central": { color: "#FFD100", shape: "shield" }, "Newell's Old Boys": { color: "#E4002B", shape: "shield" },
  "Lanús": { color: "#8B1A3A", shape: "shield" }, "Argentinos Juniors": { color: "#E4002B", shape: "shield" },
  "Huracán": { color: "#FFFFFF", shape: "shield" }, "Defensa y Justicia": { color: "#009B48", shape: "shield" },
  "Godoy Cruz": { color: "#0B2C5E", shape: "shield" }, "Belgrano": { color: "#6CABDD", shape: "shield" },
  "Instituto": { color: "#E4002B", shape: "shield" }, "Banfield": { color: "#009B48", shape: "shield" },
  "Platense": { color: "#8B1A3A", shape: "shield" }, "Tigre": { color: "#0B7DC4", shape: "shield" },
  "Chacarita Juniors": { color: "#E4002B", shape: "shield" }, "Ferro Carril Oeste": { color: "#009B48", shape: "shield" },
  "Atlanta": { color: "#FFD100", shape: "shield" }, "Nueva Chicago": { color: "#009B48", shape: "shield" },
  "All Boys": { color: "#000000", shape: "shield" }, "Colón Santa Fe": { color: "#E4002B", shape: "shield" },
  "Gimnasia Mendoza": { color: "#0B2C5E", shape: "shield" }, "San Martín Tucumán": { color: "#E4002B", shape: "shield" },
  "Almirante Brown": { color: "#000000", shape: "shield" }, "Quilmes": { color: "#0B7DC4", shape: "shield" },
  "Estudiantes Río Cuarto": { color: "#0B2C5E", shape: "shield" }, "Temperley": { color: "#6CABDD", shape: "shield" },
  "Deportivo Morón": { color: "#E4002B", shape: "shield" }, "Los Andes": { color: "#E4002B", shape: "shield" },
  "Defensores de Belgrano": { color: "#E4002B", shape: "shield" }, "Deportivo Maipú": { color: "#0B2C5E", shape: "shield" },
  "Agropecuario": { color: "#009B48", shape: "shield" }, "San Telmo": { color: "#0B7DC4", shape: "shield" }
});

// Villes réelles pour ces pays
Object.assign(FIXED_CLUB_CITIES, {
  "Sporting CP": "Lisbonne", "SL Benfica": "Lisbonne", "Casa Pia AC": "Lisbonne", "Estoril Praia": "Estoril",
  "FC Porto": "Porto", "Boavista": "Porto", "SC Braga": "Braga", "Vitória Guimarães": "Guimarães",
  "Moreirense FC": "Moreira", "Santa Clara": "Ponta Delgada", "FC Famalicão": "Famalicão",
  "Rio Ave FC": "Vila do Conde", "CD Nacional": "Funchal", "Gil Vicente FC": "Barcelos",
  "CF Estrela Amadora": "Amadora", "AVS": "Vila das Aves", "Arouca": "Arouca", "Tondela": "Tondela",
  "FC Penafiel": "Penafiel", "UD Oliveirense": "Oliveira", "SC Farense": "Faro", "Académico Viseu": "Viseu",
  "Leixões SC": "Matosinhos", "CD Feirense": "Santa Maria da Feira", "Portimonense": "Portimão",
  "Marítimo": "Funchal", "Chaves": "Chaves", "Torreense": "Torres Vedras", "Vizela": "Vizela",
  "Paços de Ferreira": "Paços de Ferreira", "União de Leiria": "Leiria", "Alverca": "Alverca",
  "Felgueiras": "Felgueiras", "Lank Vilaverdense": "Vila Verde",

  "Vissel Kobe": "Kobe", "Sanfrecce Hiroshima": "Hiroshima", "Machida Zelvia": "Machida",
  "Gamba Osaka": "Osaka", "Cerezo Osaka": "Osaka", "Kashima Antlers": "Kashima",
  "Tokyo Verdy": "Tokyo", "FC Tokyo": "Tokyo", "Kawasaki Frontale": "Kawasaki",
  "Avispa Fukuoka": "Fukuoka", "Urawa Reds": "Urawa", "Nagoya Grampus": "Nagoya",
  "Yokohama F. Marinos": "Yokohama", "Yokohama FC": "Yokohama", "Kyoto Sanga": "Kyoto",
  "Shonan Bellmare": "Hiratsuka", "Albirex Niigata": "Niigata", "Júbilo Iwata": "Iwata",
  "Kashiwa Reysol": "Kashiwa", "Consadole Sapporo": "Sapporo", "Shimizu S-Pulse": "Shizuoka",
  "Shimizu S-Pulse II": "Shizuoka", "V-Varen Nagasaki": "Nagasaki", "Vegalta Sendai": "Sendai",
  "JEF United Chiba": "Chiba", "Montedio Yamagata": "Yamagata", "Mito HollyHock": "Mito",
  "Fagiano Okayama": "Okayama", "Ventforet Kofu": "Kofu", "Roasso Kumamoto": "Kumamoto",
  "Tokushima Vortis": "Tokushima", "Renofa Yamaguchi": "Yamaguchi", "Oita Trinita": "Oita",
  "Blaublitz Akita": "Akita", "Iwaki FC": "Iwaki", "Ehime FC": "Matsuyama", "Sagan Tosu": "Tosu",
  "Omiya Ardija": "Saitama", "Fujieda MYFC": "Fujieda", "Kataller Toyama": "Toyama",

  "FCSB": "Bucarest", "Rapid Bucarest": "Bucarest", "Dinamo Bucarest": "Bucarest",
  "Steaua Bucarest": "Bucarest", "CFR Cluj": "Cluj", "Universitatea Cluj": "Cluj",
  "Universitatea Craiova": "Craiova", "Sepsi OSK": "Sfântu Gheorghe", "Farul Constanța": "Constanța",
  "FC Botoșani": "Botoșani", "Petrolul Ploiești": "Ploiești", "UTA Arad": "Arad",
  "FC Hermannstadt": "Sibiu", "Oțelul Galați": "Galați", "FC Voluntari": "Voluntari",
  "Poli Iași": "Iași", "Unirea Slobozia": "Slobozia", "CSM Reșița": "Reșița",
  "Concordia Chiajna": "Chiajna", "Metaloglobus": "Bucarest", "Gloria Buzău": "Buzău",
  "Corvinul Hunedoara": "Hunedoara", "CS Tunari": "Tunari", "Unirea Dej": "Dej",
  "Progresul Spartac": "Bucarest", "Dumbrăvița": "Dumbrăvița", "CSM Slatina": "Slatina",
  "ASA Târgu Mureș": "Târgu Mureș", "Afumați": "Afumați", "Câmpulung Muscel": "Câmpulung",
  "Bihor Oradea": "Oradea", "Șelimbăr": "Șelimbăr",

  "Flamengo": "Rio de Janeiro", "Botafogo": "Rio de Janeiro", "Fluminense": "Rio de Janeiro",
  "Vasco da Gama": "Rio de Janeiro", "Palmeiras": "São Paulo", "São Paulo FC": "São Paulo",
  "Corinthians": "São Paulo", "Santos FC": "Santos", "Internacional": "Porto Alegre",
  "Grêmio": "Porto Alegre", "Cruzeiro": "Belo Horizonte", "Atlético Mineiro": "Belo Horizonte",
  "América Mineiro": "Belo Horizonte", "Bahia": "Salvador", "Vitória": "Salvador",
  "Fortaleza": "Fortaleza", "Ceará SC": "Fortaleza", "Athletico Paranaense": "Curitiba",
  "Coritiba": "Curitiba", "Red Bull Bragantino": "Bragança", "Juventude": "Caxias do Sul",
  "Criciúma": "Criciúma", "Cuiabá": "Cuiabá", "Santa Cruz": "Recife", "Náutico": "Recife",
  "Sport Recife": "Recife", "Goiás": "Goiânia", "Vila Nova": "Goiânia", "Chapecoense": "Chapecó",
  "Avaí": "Florianópolis", "Paysandu": "Belém", "Remo": "Belém", "Ponte Preta": "Campinas",
  "Guarani": "Campinas", "Novorizontino": "Novo Horizonte", "Mirassol": "Mirassol",
  "Operário Ferroviário": "Ponta Grossa", "Botafogo-SP": "Ribeirão Preto", "Amazonas FC": "Manaus",
  "CRB": "Maceió",

  "BSC Young Boys": "Berne", "FC Bâle": "Bâle", "FC Lugano": "Lugano", "Servette FC": "Genève",
  "FC Zurich": "Zurich", "Grasshopper Zurich": "Zurich", "FC Saint-Gall": "Saint-Gall",
  "FC Lucerne": "Lucerne", "FC Winterthour": "Winterthour", "Yverdon Sport": "Yverdon",
  "FC Sion": "Sion", "Lausanne-Sport": "Lausanne", "FC Aarau": "Aarau", "Neuchâtel Xamax": "Neuchâtel",
  "FC Thoune": "Thoune", "FC Vaduz": "Vaduz", "FC Schaffhouse": "Schaffhouse", "FC Wil": "Wil",
  "Stade Nyonnais": "Nyon", "Étoile Carouge": "Carouge", "SC Bellinzone": "Bellinzone", "FC Bienne": "Bienne",

  "Club Bruges": "Bruges", "Cercle Bruges": "Bruges", "Club NXT": "Bruges",
  "RSC Anderlecht": "Bruxelles", "Royale Union Saint-Gilloise": "Bruxelles", "RWD Molenbeek": "Bruxelles",
  "KRC Genk": "Genk", "Jong Genk": "Genk", "Antwerp FC": "Anvers", "Beerschot": "Anvers",
  "KAA La Gantoise": "Gand", "Standard de Liège": "Liège", "RFC Liège": "Liège",
  "KV Malines": "Malines", "Westerlo": "Westerlo", "OH Louvain": "Louvain", "Charleroi": "Charleroi",
  "Sint-Truiden": "Saint-Trond", "KVC Dender": "Denderleeuw", "Kortrijk": "Courtrai",
  "Lommel SK": "Lommel", "Lierse": "Lierre", "Zulte Waregem": "Waregem", "Beveren": "Beveren",
  "Seraing": "Seraing", "Patro Eisden": "Maasmechelen", "Francs Borains": "Boussu", "La Louvière": "La Louvière",

  "Inter Miami CF": "Miami", "LA Galaxy": "Los Angeles", "LAFC": "Los Angeles",
  "Columbus Crew": "Columbus", "FC Cincinnati": "Cincinnati", "Seattle Sounders": "Seattle",
  "Philadelphia Union": "Philadelphie", "New York City FC": "New York", "New York Red Bulls": "New York",
  "Atlanta United": "Atlanta", "Portland Timbers": "Portland", "Real Salt Lake": "Salt Lake City",
  "Orlando City": "Orlando", "Nashville SC": "Nashville", "Minnesota United": "Minneapolis",
  "Austin FC": "Austin", "Sporting Kansas City": "Kansas City", "Houston Dynamo": "Houston",
  "Chicago Fire": "Chicago", "Toronto FC": "Toronto", "Louisville City FC": "Louisville",
  "Indy Eleven": "Indianapolis", "Sacramento Republic": "Sacramento", "Phoenix Rising": "Phoenix",
  "San Antonio FC": "San Antonio", "Tampa Bay Rowdies": "Tampa", "Pittsburgh Riverhounds": "Pittsburgh",
  "Birmingham Legion": "Birmingham", "Memphis 901": "Memphis", "El Paso Locomotive": "El Paso",
  "Colorado Springs Switchbacks": "Colorado Springs", "Detroit City FC": "Détroit",
  "Charleston Battery": "Charleston", "North Carolina FC": "Cary", "Rhode Island FC": "Pawtucket",
  "Hartford Athletic": "Hartford", "Oakland Roots": "Oakland", "Monterey Bay FC": "Seaside",

  "River Plate": "Buenos Aires", "Boca Juniors": "Buenos Aires", "San Lorenzo": "Buenos Aires",
  "Vélez Sarsfield": "Buenos Aires", "Huracán": "Buenos Aires", "Argentinos Juniors": "Buenos Aires",
  "Platense": "Vicente López", "Racing Club": "Avellaneda", "Independiente": "Avellaneda",
  "Estudiantes La Plata": "La Plata", "Talleres Córdoba": "Cordoba", "Belgrano": "Cordoba",
  "Instituto": "Cordoba", "Rosario Central": "Rosario", "Newell's Old Boys": "Rosario",
  "Lanús": "Lanús", "Defensa y Justicia": "Florencio Varela", "Godoy Cruz": "Mendoza",
  "Gimnasia Mendoza": "Mendoza", "Deportivo Maipú": "Mendoza", "Banfield": "Banfield",
  "Tigre": "Victoria", "Chacarita Juniors": "San Martín", "Ferro Carril Oeste": "Buenos Aires",
  "Atlanta": "Buenos Aires", "Nueva Chicago": "Buenos Aires", "All Boys": "Buenos Aires",
  "Defensores de Belgrano": "Buenos Aires", "San Telmo": "Buenos Aires",
  "Colón Santa Fe": "Santa Fe", "San Martín Tucumán": "Tucumán", "Almirante Brown": "San Justo",
  "Quilmes": "Quilmes", "Estudiantes Río Cuarto": "Río Cuarto", "Temperley": "Temperley",
  "Deportivo Morón": "Morón", "Los Andes": "Lomas de Zamora", "Agropecuario": "Carlos Casares"
});

// ---- Badges + villes pour Turquie, Norvège, Islande, Irlande, Irlande du Nord,
// Pologne, Suède, Moldavie, Chine, Corée du Sud, Australie, Mexique (D1 uniquement ;
// la D2 de ces pays garde une couleur/forme dérivée automatiquement du nom du club) ----
Object.assign(FIXED_CLUB_STYLES, {
  "Galatasaray": { color: "#A90432", shape: "star" }, "Fenerbahçe": { color: "#FFD100", shape: "shield" },
  "Beşiktaş": { color: "#000000", shape: "shield" }, "Trabzonspor": { color: "#800E1B", shape: "shield" },
  "İstanbul Başakşehir": { color: "#FF6600", shape: "shield" }, "Konyaspor": { color: "#00A651", shape: "shield" },
  "Kayserispor": { color: "#FFD100", shape: "shield" }, "Antalyaspor": { color: "#E4002B", shape: "shield" },
  "Gaziantep FK": { color: "#E4002B", shape: "shield" }, "Samsunspor": { color: "#E4002B", shape: "shield" },

  "Bodø/Glimt": { color: "#FFD100", shape: "shield" }, "Molde FK": { color: "#0057B8", shape: "shield" },
  "Rosenborg BK": { color: "#000000", shape: "shield" }, "Vålerenga": { color: "#0057B8", shape: "shield" },
  "SK Brann": { color: "#E4002B", shape: "shield" }, "Viking FK": { color: "#0057B8", shape: "shield" },
  "Lillestrøm SK": { color: "#FFD100", shape: "shield" }, "Odds BK": { color: "#009B48", shape: "shield" },
  "Sarpsborg 08": { color: "#FFD100", shape: "shield" }, "Tromsø IL": { color: "#E4002B", shape: "shield" },

  "KR Reykjavik": { color: "#000000", shape: "shield" }, "Valur": { color: "#E4002B", shape: "shield" },
  "FH Hafnarfjörður": { color: "#FFFFFF", shape: "shield" }, "Breiðablik": { color: "#0057B8", shape: "shield" },
  "Víkingur Reykjavik": { color: "#E4002B", shape: "shield" }, "Stjarnan": { color: "#0057B8", shape: "shield" },
  "ÍA Akranes": { color: "#FFD100", shape: "shield" }, "KA Akureyri": { color: "#FFD100", shape: "shield" },
  "Fram Reykjavik": { color: "#0057B8", shape: "shield" }, "Vestri": { color: "#0057B8", shape: "shield" },

  "Shamrock Rovers": { color: "#00A651", shape: "shield" }, "Shelbourne FC": { color: "#E4002B", shape: "shield" },
  "St Patrick's Athletic": { color: "#E4002B", shape: "shield" }, "Derry City": { color: "#E4002B", shape: "shield" },
  "Bohemian FC": { color: "#000000", shape: "shield" }, "Drogheda United": { color: "#009B48", shape: "shield" },
  "Dundalk FC": { color: "#FFFFFF", shape: "shield" }, "Sligo Rovers": { color: "#000000", shape: "shield" },
  "Galway United": { color: "#6B2E8B", shape: "shield" }, "Waterford FC": { color: "#0057B8", shape: "shield" },

  "Linfield FC": { color: "#0057B8", shape: "shield" }, "Glentoran": { color: "#00A651", shape: "shield" },
  "Crusaders FC": { color: "#E4002B", shape: "shield" }, "Cliftonville": { color: "#E4002B", shape: "shield" },
  "Larne FC": { color: "#0057B8", shape: "shield" }, "Coleraine FC": { color: "#6CABDD", shape: "shield" },
  "Glenavon": { color: "#6B2E8B", shape: "shield" }, "Portadown": { color: "#0057B8", shape: "shield" },
  "Ballymena United": { color: "#6CABDD", shape: "shield" }, "Newry City": { color: "#E4002B", shape: "shield" },

  "Lech Poznań": { color: "#0057B8", shape: "shield" }, "Legia Varsovie": { color: "#00A651", shape: "shield" },
  "Raków Częstochowa": { color: "#E4002B", shape: "shield" }, "Jagiellonia Białystok": { color: "#FFD100", shape: "shield" },
  "Pogoń Szczecin": { color: "#0057B8", shape: "shield" }, "Górnik Zabrze": { color: "#000000", shape: "shield" },
  "Widzew Łódź": { color: "#E4002B", shape: "shield" }, "Cracovia": { color: "#6CABDD", shape: "shield" },
  "Wisła Cracovie": { color: "#E4002B", shape: "star" }, "Piast Gliwice": { color: "#0057B8", shape: "shield" },

  "Malmö FF": { color: "#6CABDD", shape: "shield" }, "AIK Solna": { color: "#000000", shape: "shield" },
  "Djurgårdens IF": { color: "#0057B8", shape: "shield" }, "Hammarby IF": { color: "#00A651", shape: "shield" },
  "IFK Göteborg": { color: "#6CABDD", shape: "shield" }, "BK Häcken": { color: "#FFD100", shape: "shield" },
  "IF Elfsborg": { color: "#FFD100", shape: "shield" }, "Kalmar FF": { color: "#E4002B", shape: "shield" },
  "IFK Norrköping": { color: "#0057B8", shape: "shield" }, "Mjällby AIF": { color: "#FFD100", shape: "shield" },

  "Sheriff Tiraspol": { color: "#FFD100", shape: "shield" }, "Zimbru Chișinău": { color: "#0057B8", shape: "shield" },
  "Milsami Orhei": { color: "#E4002B", shape: "shield" }, "Petrocub Hîncești": { color: "#00A651", shape: "shield" },
  "Dacia Buiucani": { color: "#E4002B", shape: "shield" }, "Sfântul Gheorghe": { color: "#FFD100", shape: "shield" },
  "Speranța Nisporeni": { color: "#0057B8", shape: "shield" }, "Politehnica UTM": { color: "#0057B8", shape: "shield" },
  "Florești": { color: "#00A651", shape: "shield" }, "Bălți SC": { color: "#E4002B", shape: "shield" },

  "Shanghai Port": { color: "#E4002B", shape: "shield" }, "Shanghai Shenhua": { color: "#0057B8", shape: "shield" },
  "Beijing Guoan": { color: "#00A651", shape: "shield" }, "Shandong Taishan": { color: "#E4002B", shape: "shield" },
  "Zhejiang FC": { color: "#E4002B", shape: "shield" }, "Chengdu Rongcheng": { color: "#6CABDD", shape: "shield" },
  "Wuhan Three Towns": { color: "#6B2E8B", shape: "shield" }, "Tianjin Jinmen Tiger": { color: "#0057B8", shape: "shield" },
  "Qingdao Hainiu": { color: "#E4002B", shape: "shield" }, "Meizhou Hakka": { color: "#FFD100", shape: "shield" },

  "Ulsan HD": { color: "#0057B8", shape: "shield" }, "Pohang Steelers": { color: "#E4002B", shape: "shield" },
  "Gwangju FC": { color: "#FFD100", shape: "shield" }, "FC Seoul": { color: "#E4002B", shape: "shield" },
  "Suwon FC": { color: "#0057B8", shape: "shield" }, "Daegu FC": { color: "#6CABDD", shape: "shield" },
  "Daejeon Hana Citizen": { color: "#6B2E8B", shape: "shield" }, "Gimcheon Sangmu": { color: "#000000", shape: "shield" },
  "Jeonbuk Hyundai Motors": { color: "#00A651", shape: "shield" }, "Incheon United": { color: "#6CABDD", shape: "shield" },

  "Melbourne City": { color: "#6CABDD", shape: "shield" }, "Central Coast Mariners": { color: "#FFD100", shape: "shield" },
  "Melbourne Victory": { color: "#6CABDD", shape: "shield" }, "Western United": { color: "#6B2E8B", shape: "shield" },
  "Sydney FC": { color: "#6CABDD", shape: "shield" }, "Wellington Phoenix": { color: "#FFD100", shape: "shield" },
  "Western Sydney Wanderers": { color: "#E4002B", shape: "shield" }, "Adelaide United": { color: "#E4002B", shape: "shield" },
  "Macarthur FC": { color: "#6CABDD", shape: "shield" }, "Brisbane Roar": { color: "#FF6600", shape: "shield" },
  "Newcastle Jets": { color: "#6CABDD", shape: "shield" }, "Perth Glory": { color: "#6CABDD", shape: "shield" },

  "Club América": { color: "#FFD100", shape: "shield" }, "Chivas Guadalajara": { color: "#E4002B", shape: "shield" },
  "Cruz Azul": { color: "#0057B8", shape: "shield" }, "Pumas UNAM": { color: "#6B2E8B", shape: "shield" },
  "CF Monterrey": { color: "#0057B8", shape: "shield" }, "Tigres UANL": { color: "#FF6600", shape: "shield" },
  "Deportivo Toluca": { color: "#E4002B", shape: "shield" }, "Club León": { color: "#00A651", shape: "shield" },
  "Santos Laguna": { color: "#00A651", shape: "shield" }, "CF Pachuca": { color: "#0057B8", shape: "shield" },
  "Atlas FC": { color: "#E4002B", shape: "shield" }, "Club Necaxa": { color: "#E4002B", shape: "shield" },
  "Puebla FC": { color: "#0057B8", shape: "shield" }, "Xolos Tijuana": { color: "#E4002B", shape: "shield" },
  "Mazatlán FC": { color: "#6B2E8B", shape: "shield" }, "Querétaro FC": { color: "#000000", shape: "shield" },
  "FC Juárez": { color: "#00A651", shape: "shield" }, "Atlético San Luis": { color: "#E4002B", shape: "shield" }
});

Object.assign(FIXED_CLUB_CITIES, {
  "Galatasaray": "Istanbul", "Fenerbahçe": "Istanbul", "Beşiktaş": "Istanbul",
  "Trabzonspor": "Trabzon", "İstanbul Başakşehir": "Istanbul", "Konyaspor": "Konya",
  "Kayserispor": "Kayseri", "Antalyaspor": "Antalya", "Gaziantep FK": "Gaziantep", "Samsunspor": "Samsun",

  "Bodø/Glimt": "Bodo", "Molde FK": "Alesund", "Rosenborg BK": "Trondheim", "Vålerenga": "Drammen",
  "SK Brann": "Bergen", "Viking FK": "Stavanger", "Lillestrøm SK": "Fredrikstad",
  "Odds BK": "Kristiansand", "Sarpsborg 08": "Sandefjord", "Tromsø IL": "Tromso",

  "KR Reykjavik": "Reykjavik", "Valur": "Reykjavik", "Fram Reykjavik": "Reykjavik",
  "FH Hafnarfjörður": "Hafnarfjordur", "Breiðablik": "Kopavogur", "Víkingur Reykjavik": "Reykjavik",
  "Stjarnan": "Gardabaer", "ÍA Akranes": "Akranes", "KA Akureyri": "Akureyri", "Vestri": "Isafjordur",

  "Shamrock Rovers": "Dublin", "Shelbourne FC": "Dublin", "St Patrick's Athletic": "Dublin",
  "Bohemian FC": "Dublin", "Derry City": "Derry",
  "Drogheda United": "Drogheda", "Dundalk FC": "Dundalk", "Sligo Rovers": "Sligo",
  "Galway United": "Galway", "Waterford FC": "Waterford",

  "Linfield FC": "Belfast", "Glentoran": "Belfast", "Crusaders FC": "Belfast", "Cliftonville": "Belfast",
  "Larne FC": "Larne", "Coleraine FC": "Coleraine", "Glenavon": "Lurgan", "Portadown": "Portadown",
  "Ballymena United": "Ballymena", "Newry City": "Newry",

  "Lech Poznań": "Poznan", "Legia Varsovie": "Varsovie", "Raków Częstochowa": "Częstochowa",
  "Jagiellonia Białystok": "Bialystok", "Pogoń Szczecin": "Szczecin", "Górnik Zabrze": "Katowice",
  "Widzew Łódź": "Lodz", "Cracovia": "Cracovie", "Wisła Cracovie": "Cracovie", "Piast Gliwice": "Wroclaw",

  "Malmö FF": "Malmo", "AIK Solna": "Stockholm", "Djurgårdens IF": "Stockholm", "Hammarby IF": "Stockholm",
  "IFK Göteborg": "Goteborg", "BK Häcken": "Goteborg", "IF Elfsborg": "Boras",
  "Kalmar FF": "Kalmar", "IFK Norrköping": "Norrkoping", "Mjällby AIF": "Sundsvall",

  "Sheriff Tiraspol": "Tiraspol", "Zimbru Chișinău": "Chisinau", "Milsami Orhei": "Orhei",
  "Petrocub Hîncești": "Hincesti", "Dacia Buiucani": "Chisinau", "Sfântul Gheorghe": "Balti",
  "Speranța Nisporeni": "Nisporeni", "Politehnica UTM": "Chisinau", "Florești": "Floresti", "Bălți SC": "Balti",

  "Shanghai Port": "Shanghai", "Shanghai Shenhua": "Shanghai", "Beijing Guoan": "Nanjing",
  "Shandong Taishan": "Qingdao", "Zhejiang FC": "Dalian", "Chengdu Rongcheng": "Chengdu",
  "Wuhan Three Towns": "Wuhan", "Tianjin Jinmen Tiger": "Tianjin", "Qingdao Hainiu": "Qingdao", "Meizhou Hakka": "Shenzhen",

  "Ulsan HD": "Ulsan", "Pohang Steelers": "Daegu", "Gwangju FC": "Gwangju", "FC Seoul": "Séoul",
  "Suwon FC": "Suwon", "Daegu FC": "Daegu", "Daejeon Hana Citizen": "Daejeon",
  "Gimcheon Sangmu": "Seongnam", "Jeonbuk Hyundai Motors": "Jeonju", "Incheon United": "Incheon",

  "Melbourne City": "Melbourne", "Melbourne Victory": "Melbourne", "Western United": "Geelong",
  "Central Coast Mariners": "Gold Coast", "Sydney FC": "Sydney", "Western Sydney Wanderers": "Sydney",
  "Wellington Phoenix": "Wellington", "Adelaide United": "Adelaide", "Macarthur FC": "Canberra",
  "Brisbane Roar": "Brisbane", "Newcastle Jets": "Newcastle", "Perth Glory": "Perth",

  "Club América": "Ciudad Universitaire", "Pumas UNAM": "Ciudad Universitaire", "Cruz Azul": "Ciudad Céleste",
  "Chivas Guadalajara": "Guadalajara", "Atlas FC": "Guadalajara", "CF Monterrey": "Monterrey",
  "Tigres UANL": "Monterrey", "Deportivo Toluca": "Toluca", "Club León": "Leon",
  "Santos Laguna": "Torreon", "CF Pachuca": "Merida", "Club Necaxa": "Veracruz",
  "Puebla FC": "Puebla", "Xolos Tijuana": "Tijuana", "Querétaro FC": "Queretaro"
});

/* ============================================================
   France : National 1 (D3) et National 2 (D4), avec de vrais
   noms de clubs du football amateur/semi-pro français.
   ============================================================ */
const CLUB_POOLS_D3 = {
  france: ["Le Puy Foot 43","US Concarneau","US Avranches","Aviron Bayonnais","AS Cannes","FC Chambly Oise","Villefranche Beaujolais","CS Sedan Ardennes","SAS Épinal","Trélissac FC","Rouen FC","Sète FC","GOAL FC","Espaly Foot","SC Toulon","Hyères FC","US Sarrebourg","Val de Marne"]
};
const CLUB_POOLS_D4 = {
  france: ["US Sarcelles","FC Fleury 91","Louhans-Cuiseaux","Bourgoin-Jallieu","AS Andrézieux","Marignane Gignac","US Colomiers","Racing Besançon","Furiani-Agliani","US Granville","Cherbourg FC","Feignies Aulnoye","Jura Sud Foot","US Quevilly-Rouen","Stade Poitevin","US Créteil-Lusitanos","Bergerac Périgord","Angoulême CFC"]
};
const CLUB_POOLS_D5 = {
  france: ["FC Chartres", "ES Vitré", "Stade Plabennec", "US Saint-Malo", "AS Poissy", "US Raon-l'Étape", "Étoile Fréjus Saint-Raphaël", "FC Bourg-Péronnas", "Racing Club de Strasbourg B", "AS Moulins", "US Boulogne B", "FC Villefranche B", "Stade Beaucairois", "US Orléans", "FC Rouen B", "ASPTT Colmar", "Terville Florange OS", "AS Vitré"]
};


Object.assign(FIXED_CLUB_STYLES, {
  "Le Puy Foot 43": { color: "#009B48", shape: "shield" }, "US Concarneau": { color: "#000080", shape: "shield" },
  "SC Bastia": { color: "#0057B8", shape: "shield" }, "Nîmes Olympique": { color: "#E4002B", shape: "shield" },
  "Stade Briochin": { color: "#E4002B", shape: "shield" }, "US Boulogne": { color: "#8B1A3A", shape: "shield" },
  "Aviron Bayonnais": { color: "#6B2E8B", shape: "shield" }, "AS Cannes": { color: "#E4002B", shape: "shield" },
  "Grenoble Foot 38": { color: "#E4002B", shape: "shield" }, "FC Martigues": { color: "#6CABDD", shape: "shield" },
  "US Avranches": { color: "#0057B8", shape: "shield" }, "FC Chambly Oise": { color: "#0057B8", shape: "shield" },
  "Villefranche Beaujolais": { color: "#6B2E8B", shape: "shield" }, "CS Sedan Ardennes": { color: "#8B1A3A", shape: "shield" },
  "SAS Épinal": { color: "#0057B8", shape: "shield" }, "Trélissac FC": { color: "#E4002B", shape: "shield" },
  "Rouen FC": { color: "#6CABDD", shape: "shield" }, "Red Star FC": { color: "#009B48", shape: "star" },

  "US Sarcelles": { color: "#0057B8", shape: "shield" }, "FC Rouen": { color: "#6CABDD", shape: "diamond" },
  "Cherbourg FC": { color: "#8B1A3A", shape: "shield" }, "US Granville": { color: "#0057B8", shape: "shield" },
  "Louhans-Cuiseaux": { color: "#E4002B", shape: "shield" }, "Bourgoin-Jallieu": { color: "#0057B8", shape: "shield" },
  "AS Andrézieux": { color: "#E4002B", shape: "shield" }, "Marignane Gignac": { color: "#6B2E8B", shape: "shield" },
  "US Colomiers": { color: "#8B1A3A", shape: "shield" }, "Racing Besançon": { color: "#0057B8", shape: "shield" },
  "Furiani-Agliani": { color: "#0057B8", shape: "shield" }, "GOAL FC": { color: "#009B48", shape: "shield" },
  "Espaly Foot": { color: "#E4002B", shape: "shield" }, "SC Toulon": { color: "#6B2E8B", shape: "shield" },
  "Hyères FC": { color: "#E4002B", shape: "shield" }, "Sète FC": { color: "#0057B8", shape: "shield" },
  "US Sarrebourg": { color: "#E4002B", shape: "shield" }, "Val de Marne": { color: "#0057B8", shape: "shield" }
});

Object.assign(FIXED_CLUB_CITIES, {
  "Le Puy Foot 43": "Le Puy-en-Velay", "US Concarneau": "Concarneau", "SC Bastia": "Bastia",
  "Nîmes Olympique": "Nîmes", "Stade Briochin": "Saint-Brieuc", "US Boulogne": "Boulogne-sur-Mer",
  "Aviron Bayonnais": "Bayonne", "AS Cannes": "Cannes", "Grenoble Foot 38": "Grenoble",
  "FC Martigues": "Martigues", "US Avranches": "Avranches", "FC Chambly Oise": "Chambly",
  "Villefranche Beaujolais": "Villefranche-sur-Saône", "CS Sedan Ardennes": "Sedan",
  "SAS Épinal": "Épinal", "Trélissac FC": "Trélissac", "Rouen FC": "Rouen", "Red Star FC": "Saint-Ouen",
  "US Sarcelles": "Sarcelles", "FC Rouen": "Rouen", "Cherbourg FC": "Cherbourg", "US Granville": "Granville",
  "Louhans-Cuiseaux": "Louhans", "Bourgoin-Jallieu": "Bourgoin-Jallieu", "AS Andrézieux": "Andrézieux",
  "Marignane Gignac": "Marignane", "US Colomiers": "Colomiers", "Racing Besançon": "Besançon",
  "Furiani-Agliani": "Furiani", "GOAL FC": "Ajaccio", "Espaly Foot": "Espaly-Saint-Marcel",
  "SC Toulon": "Toulon", "Hyères FC": "Hyères", "Sète FC": "Sète", "US Sarrebourg": "Sarrebourg", "Val de Marne": "Créteil"
});

Object.assign(FIXED_CLUB_CITIES, {
  "FC Chartres": "Chartres", "ES Vitré": "Vitré", "Stade Plabennec": "Plabennec",
  "US Saint-Malo": "Saint-Malo", "AS Poissy": "Poissy", "US Raon-l'Étape": "Raon-l'Étape",
  "Étoile Fréjus Saint-Raphaël": "Fréjus", "FC Bourg-Péronnas": "Bourg-en-Bresse",
  "Racing Club de Strasbourg B": "Strasbourg", "AS Moulins": "Moulins", "US Boulogne B": "Boulogne-sur-Mer",
  "FC Villefranche B": "Villefranche-sur-Saône", "Stade Beaucairois": "Beaucaire",
  "US Orléans": "Orléans", "FC Rouen B": "Rouen", "ASPTT Colmar": "Colmar",
  "Terville Florange OS": "Florange", "AS Vitré": "Vitré"
});

Object.assign(FIXED_CLUB_CITIES, {
  "FC Nantes": "Nantes", "FC Metz": "Metz",
  "Stade Lavallois": "Laval", "Amiens SC": "Amiens", "EA Guingamp": "Guingamp",
  "Pau FC": "Pau", "FC Annecy": "Annecy", "Clermont Foot 63": "Clermont-Ferrand",
  "Rodez AF": "Rodez", "USL Dunkerque": "Dunkerque", "AC Ajaccio": "Ajaccio", "SM Caen": "Caen",
  "FC Fleury 91": "Fleury-Mérogis", "Feignies Aulnoye": "Feignies", "Jura Sud Foot": "Lons-le-Saunier",
  "US Quevilly-Rouen": "Rouen", "Stade Poitevin": "Poitiers", "US Créteil-Lusitanos": "Créteil",
  "Bergerac Périgord": "Bergerac", "Angoulême CFC": "Angoulême"
});
