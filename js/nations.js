// ===================================================================
// BLOC 21 (1/4) — MODE SÉLECTIONNEUR : entraîner une équipe nationale
//  - ~65 nations (toutes celles du Mondial 2026 + celles demandées) + nations « figurantes »
//  - effectif = vrais joueurs du monde simulé (même nationalité), convocations par trêve
//  - calendrier : Ligue des nations (automne), éliminatoires, tournoi continental (16 équipes),
//    Coupe du monde à 48 équipes (12 groupes, 8 meilleurs 3ᵉ, 1/16 de finale), amicaux
//  - les joueurs convoqués manquent à leur club pendant la trêve (blessures, fatigue)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const hasState = () => typeof state !== "undefined" && state && state.ds;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const rf = (a, b) => a + Math.random() * (b - a);
  const pk = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dkey = (d) => new Date(d).toISOString().slice(0, 10);
  const todayKey = () => dkey(state.date);
  const hu = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const hstr = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // ---------------------------------------------------------------
  // Drapeaux (emoji) — repli : pastille aux couleurs de la sélection
  // ---------------------------------------------------------------
  const tagFlag = (s) => String.fromCodePoint(0x1F3F4, ...s.split("").map((c) => 0xE0000 + c.charCodeAt(0)), 0xE007F);
  const SPECIAL = { ENG: () => tagFlag("gbeng"), SCT: () => tagFlag("gbsct"), WLS: () => tagFlag("gbwls"), NIR: () => "🇬🇧" };
  const flagOf = (cc) => SPECIAL[cc] ? SPECIAL[cc]() : String.fromCodePoint(...cc.toUpperCase().split("").map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));

  // ---------------------------------------------------------------
  // Noms supplémentaires pour les nations hors Europe de l'Ouest
  // ---------------------------------------------------------------
  const POOLS = {
    ar: { first: ["Youssef", "Mehdi", "Karim", "Amine", "Hamza", "Omar", "Walid", "Nabil", "Zakaria", "Sofiane", "Anas", "Ayoub", "Rachid", "Mounir", "Hicham", "Tarek", "Bassem", "Khalid", "Fares", "Ismail"], last: ["Benali", "El Amrani", "Haddad", "Mansouri", "Belhadj", "Saidi", "Cherif", "Bouzid", "Mahrez", "Hakimi", "Zerrouki", "Ziani", "Rahmani", "Slimani", "Ouali", "Khalil", "Nasser", "Farouk", "Mostafa", "Darwish"] },
    wa: { first: ["Moussa", "Sadio", "Ibrahima", "Cheikh", "Mamadou", "Seydou", "Amadou", "Boubacar", "Kalidou", "Idrissa", "Franck", "Serge", "Wilfried", "Yaya", "Salomon", "Eric", "Christian", "Jean", "Arnaud", "Cédric"], last: ["Diop", "Sarr", "Ndiaye", "Gueye", "Diatta", "Sow", "Keita", "Coulibaly", "Touré", "Bamba", "Doumbia", "Sangaré", "Kouassi", "Yao", "Konan", "Mbemba", "Bakambu", "Wissa", "Tchamba", "Nkoulou"] },
    ga: { first: ["Kwame", "Kofi", "Thomas", "Mohammed", "Daniel", "Samuel", "Emmanuel", "Joseph", "Victor", "Ola", "Chidi", "Tunde", "Ben", "Isaac", "Denis", "Brian", "Joel", "Patrick", "Collins", "Abdul"], last: ["Mensah", "Asante", "Owusu", "Boateng", "Adeyemi", "Okafor", "Eze", "Balogun", "Osei", "Appiah", "Okello", "Mugisha", "Kato", "Tendai", "Banda", "Phiri", "Mwale", "Nkosi", "Dlamini", "Khumalo"] },
    sl: { first: ["Luka", "Ivan", "Marko", "Mateo", "Dominik", "Petr", "Tomas", "Jakub", "Andrij", "Oleksandr", "Dmitri", "Artem", "Nikola", "Filip", "Stefan", "Milan", "Vladimir", "Denis", "Bogdan", "Mario"], last: ["Kovačić", "Modrić", "Perišić", "Novak", "Horvat", "Kral", "Souček", "Dvořák", "Zinchenko", "Mudryk", "Sobolev", "Golovin", "Petrović", "Jovanović", "Ilić", "Kolarov", "Popov", "Marković", "Babić", "Vlašić"] },
    nl: { first: ["Daan", "Sem", "Lars", "Bram", "Joris", "Teun", "Ruben", "Stijn", "Memphis", "Virgil", "Frenkie", "Cody", "Jurrien", "Tijjani", "Denzel", "Wout", "Mats", "Luuk", "Noa", "Jesper"], last: ["De Vries", "Van Dijk", "Janssen", "Bakker", "Visser", "Smit", "Meijer", "De Boer", "Mulder", "Bos", "Vos", "Peters", "Hendriks", "Dekker", "Brouwer", "De Jong", "Koopmeiners", "Gakpo", "Timber", "Schouten"] },
    al: { first: ["Arben", "Besnik", "Granit", "Valon", "Bekim", "Lirim", "Fatos", "Ermal", "Edon", "Florent", "Berat", "Elvis", "Albion", "Mërgim", "Armando", "Ylber", "Kastriot", "Naim", "Rey", "Eljif"], last: ["Hoxha", "Krasniqi", "Berisha", "Gashi", "Shala", "Ramadani", "Zeqiri", "Dervishi", "Basha", "Kastrati", "Hysaj", "Memeti", "Rrahmani", "Muriqi", "Cikalleshi", "Asllani", "Bytyqi", "Aliu", "Sadiku", "Topalli"] },
    as: { first: ["Somchai", "Arif", "Rizky", "Nattawut", "Hendra", "Ali", "Hassan", "Rashid", "Salem", "Majid", "Nawaf", "Fahad", "Yazan", "Sardar", "Bashar", "Mohannad", "Eldor", "Jasur", "Abbosbek", "Otabek"], last: ["Pratama", "Wijaya", "Saputra", "Suwannarat", "Kanchanapha", "Al-Dawsari", "Al-Shahrani", "Al-Mutairi", "Al-Hamad", "Al-Marri", "Afif", "Hatem", "Bahman", "Taremi", "Rezaei", "Fayzullaev", "Shomurodov", "Olwan", "Altamari", "Al-Taamari"] },
    oc: { first: ["Tim", "Chris", "Jake", "Liam", "Josh", "Ryan", "Wiremu", "Hemi", "Maui", "Sione", "Jone", "Aisake", "Tevita", "Kolinio", "Rangi", "Rewi", "Atu", "Piripi", "Tane", "Nikau"], last: ["Wood", "Smith", "Cacace", "Singh", "Tuilagi", "Ravouvou", "Vakacegu", "Tuiasosopo", "Waka", "Hone", "Parata", "Rawiri", "Manu", "Tapuai", "Kauhalalalo", "Fonua", "Talia", "Naivalu", "Seru", "Vuki"] }
  };
  function ensurePools() {
    try { Object.keys(POOLS).forEach((k) => { if (typeof NAME_POOLS !== "undefined" && !NAME_POOLS[k]) NAME_POOLS[k] = POOLS[k]; }); } catch (e) {}
  }

  // ---------------------------------------------------------------
  // Les nations : [label, confédération, force 0-100, code drapeau, pool de noms, couleur 1, couleur 2, jouable]
  // (force = estimation maison, pas un classement officiel)
  // ---------------------------------------------------------------
  const ROWS = [
    // UEFA — jouables
    ["France", "UEFA", 92, "FR", "fr", "#1e3a8a", "#e63946", 1], ["Angleterre", "UEFA", 90, "ENG", "en", "#f4f4f4", "#1d2c5e", 1], ["Italie", "UEFA", 82, "IT", "it", "#1f5fbf", "#ffffff", 1],
    ["Espagne", "UEFA", 92, "ES", "es", "#c8102e", "#f1bf00", 1], ["Allemagne", "UEFA", 86, "DE", "de", "#f4f4f4", "#111111", 1], ["Belgique", "UEFA", 82, "BE", "fr", "#c8102e", "#f4d000", 1],
    ["Suisse", "UEFA", 76, "CH", "de", "#d52b1e", "#ffffff", 1], ["Irlande", "UEFA", 60, "IE", "en", "#169b62", "#ffffff", 1], ["Irlande du Nord", "UEFA", 55, "NIR", "en", "#1d7a3a", "#ffffff", 1],
    ["Écosse", "UEFA", 70, "SCT", "en", "#0b2e6e", "#ffffff", 1], ["Pays de Galles", "UEFA", 66, "WLS", "en", "#c8102e", "#00853f", 1], ["Turquie", "UEFA", 74, "TR", "tr", "#e30a17", "#ffffff", 1],
    ["Croatie", "UEFA", 80, "HR", "sl", "#e63946", "#ffffff", 1], ["République tchèque", "UEFA", 69, "CZ", "sl", "#d7141a", "#11457e", 1], ["Kosovo", "UEFA", 56, "XK", "al", "#244aa5", "#d0a650", 1],
    ["Liechtenstein", "UEFA", 24, "LI", "de", "#002b7f", "#ce1126", 1], ["Andorre", "UEFA", 22, "AD", "es", "#10069f", "#d50032", 1], ["Portugal", "UEFA", 88, "PT", "pt", "#a50021", "#006600", 1],
    ["Russie", "UEFA", 66, "RU", "sl", "#d52b1e", "#ffffff", 1], ["Ukraine", "UEFA", 72, "UA", "sl", "#ffd500", "#0057b7", 1], ["Norvège", "UEFA", 76, "NO", "no", "#ba0c2f", "#00205b", 1],
    ["Danemark", "UEFA", 76, "DK", "no", "#c60c30", "#ffffff", 1], ["Islande", "UEFA", 55, "IS", "no", "#02529c", "#dc1e35", 1], ["Pays-Bas", "UEFA", 86, "NL", "nl", "#f36c21", "#1e3a8a", 1],
    ["Autriche", "UEFA", 75, "AT", "de", "#ed2939", "#ffffff", 1], ["Bosnie-Herzégovine", "UEFA", 64, "BA", "sl", "#002f6c", "#fecb00", 1], ["Suède", "UEFA", 70, "SE", "no", "#006aa7", "#fecc00", 1],
    // UEFA — figurantes
    ["Pologne", "UEFA", 70, "PL", "pl", "#dc143c", "#ffffff"], ["Serbie", "UEFA", 70, "RS", "sl", "#c6363c", "#0c4076"], ["Hongrie", "UEFA", 66, "HU", "ro", "#cd2a3e", "#436f4d"],
    ["Grèce", "UEFA", 66, "GR", "it", "#0d5eaf", "#ffffff"], ["Roumanie", "UEFA", 62, "RO", "ro", "#fcd116", "#002b7f"], ["Slovaquie", "UEFA", 60, "SK", "sl", "#0b4ea2", "#ee1c25"],
    ["Slovénie", "UEFA", 60, "SI", "sl", "#005da4", "#ffffff"], ["Finlande", "UEFA", 56, "FI", "no", "#003580", "#ffffff"], ["Albanie", "UEFA", 58, "AL", "al", "#e41e20", "#111111"],
    ["Géorgie", "UEFA", 58, "GE", "ro", "#ffffff", "#e8112d"], ["Bulgarie", "UEFA", 54, "BG", "sl", "#00966e", "#d62612"], ["Macédoine du Nord", "UEFA", 54, "MK", "sl", "#d20000", "#ffe600"],
    ["Monténégro", "UEFA", 52, "ME", "sl", "#c40308", "#d3ae3b"], ["Chypre", "UEFA", 42, "CY", "it", "#ffffff", "#d57800"], ["Arménie", "UEFA", 42, "AM", "ro", "#d90012", "#f2a800"],
    ["Luxembourg", "UEFA", 38, "LU", "fr", "#ed2939", "#00a1de"], ["Malte", "UEFA", 30, "MT", "it", "#cf142b", "#ffffff"],
    // CAF
    ["Maroc", "CAF", 80, "MA", "ar", "#c1272d", "#006233", 1], ["Sénégal", "CAF", 77, "SN", "wa", "#00853f", "#fdef42", 1], ["Ghana", "CAF", 66, "GH", "ga", "#ffffff", "#ce1126", 1],
    ["Côte d'Ivoire", "CAF", 74, "CI", "wa", "#f77f00", "#009e60", 1], ["Bénin", "CAF", 54, "BJ", "wa", "#008751", "#fcd116", 1], ["Ouganda", "CAF", 52, "UG", "ga", "#fcdc04", "#000000", 1],
    ["Somalie", "CAF", 36, "SO", "ar", "#4189dd", "#ffffff", 1], ["République du Congo", "CAF", 54, "CG", "wa", "#009543", "#fbde4a", 1], ["RD Congo", "CAF", 64, "CD", "wa", "#007fff", "#f7d618", 1],
    ["Tunisie", "CAF", 68, "TN", "ar", "#e70013", "#ffffff", 1], ["Algérie", "CAF", 72, "DZ", "ar", "#ffffff", "#006233", 1], ["Égypte", "CAF", 72, "EG", "ar", "#ce1126", "#111111", 1],
    ["Cap-Vert", "CAF", 62, "CV", "pt", "#003893", "#cf2027", 1], ["Afrique du Sud", "CAF", 60, "ZA", "ga", "#ffb612", "#007749", 1],
    ["Nigeria", "CAF", 70, "NG", "ga", "#008751", "#ffffff"], ["Cameroun", "CAF", 66, "CM", "wa", "#007a5e", "#ce1126"], ["Mali", "CAF", 64, "ML", "wa", "#14b53a", "#fcd116"],
    ["Burkina Faso", "CAF", 58, "BF", "wa", "#ef2b2d", "#009e49"], ["Gabon", "CAF", 56, "GA", "wa", "#009e60", "#fcd116"], ["Guinée", "CAF", 56, "GN", "wa", "#ce1126", "#fcd116"],
    ["Angola", "CAF", 52, "AO", "pt", "#cc092f", "#111111"], ["Zambie", "CAF", 50, "ZM", "ga", "#198a00", "#ef7d00"], ["Tanzanie", "CAF", 46, "TZ", "ga", "#1eb53a", "#00a3dd"], ["Mozambique", "CAF", 44, "MZ", "pt", "#007168", "#fce100"],
    // AFC
    ["Chine", "AFC", 52, "CN", "zh", "#de2910", "#ffde00", 1], ["Japon", "AFC", 78, "JP", "ja", "#1e3a8a", "#ffffff", 1], ["Australie", "AFC", 70, "AU", "en", "#ffcd00", "#00843d", 1],
    ["Corée du Sud", "AFC", 74, "KR", "ko", "#cd2e3a", "#ffffff", 1], ["Iran", "AFC", 72, "IR", "ar", "#ffffff", "#239f40", 1], ["Jordanie", "AFC", 58, "JO", "ar", "#ce1126", "#007a3d", 1],
    ["Ouzbékistan", "AFC", 62, "UZ", "as", "#1eb53a", "#0099b5", 1], ["Qatar", "AFC", 56, "QA", "as", "#8a1538", "#ffffff", 1], ["Arabie saoudite", "AFC", 62, "SA", "as", "#006c35", "#ffffff", 1], ["Irak", "AFC", 56, "IQ", "ar", "#007a3d", "#ce1126", 1],
    ["Émirats arabes unis", "AFC", 52, "AE", "as", "#ffffff", "#00732f"], ["Oman", "AFC", 48, "OM", "as", "#db161b", "#008000"], ["Bahreïn", "AFC", 46, "BH", "as", "#ce1126", "#ffffff"],
    ["Thaïlande", "AFC", 44, "TH", "as", "#a51931", "#2d2a4a"], ["Indonésie", "AFC", 46, "ID", "as", "#ce1126", "#ffffff"], ["Palestine", "AFC", 46, "PS", "ar", "#007a3d", "#ce1126"],
    // CONMEBOL
    ["Brésil", "CONMEBOL", 88, "BR", "pt", "#ffdf00", "#009c3b", 1], ["Argentine", "CONMEBOL", 92, "AR", "es", "#75aadb", "#ffffff", 1], ["Paraguay", "CONMEBOL", 66, "PY", "es", "#d52b1e", "#0038a8", 1],
    ["Colombie", "CONMEBOL", 80, "CO", "es", "#fcd116", "#003893", 1], ["Chili", "CONMEBOL", 64, "CL", "es", "#d52b1e", "#0039a6", 1], ["Équateur", "CONMEBOL", 74, "EC", "es", "#ffdd00", "#034ea2", 1],
    ["Uruguay", "CONMEBOL", 80, "UY", "es", "#7bafd4", "#ffffff", 1], ["Pérou", "CONMEBOL", 60, "PE", "es", "#d91023", "#ffffff"], ["Bolivie", "CONMEBOL", 46, "BO", "es", "#007934", "#d52b1e"], ["Venezuela", "CONMEBOL", 56, "VE", "es", "#7a0019", "#cf142b"],
    // CONCACAF
    ["USA", "CONCACAF", 76, "US", "en", "#ffffff", "#0a3161", 1], ["Mexique", "CONCACAF", 75, "MX", "es", "#006847", "#ce1126", 1], ["Canada", "CONCACAF", 70, "CA", "en", "#d52b1e", "#ffffff", 1],
    ["Panama", "CONCACAF", 62, "PA", "es", "#d21034", "#005293", 1], ["Curaçao", "CONCACAF", 48, "CW", "nl", "#002b7f", "#f9e814", 1], ["Haïti", "CONCACAF", 50, "HT", "fr", "#00209f", "#d21034", 1],
    ["Jamaïque", "CONCACAF", 54, "JM", "en", "#fed100", "#009b3a"], ["Costa Rica", "CONCACAF", 58, "CR", "es", "#ce1126", "#002b7f"], ["Honduras", "CONCACAF", 52, "HN", "es", "#0073cf", "#ffffff"], ["Salvador", "CONCACAF", 46, "SV", "es", "#0047ab", "#ffffff"],
    // OFC
    ["Nouvelle-Zélande", "OFC", 46, "NZ", "oc", "#111111", "#ffffff", 1], ["Fidji", "OFC", 28, "FJ", "oc", "#ffffff", "#68bfe5"], ["Nouvelle-Calédonie", "OFC", 26, "NC", "fr", "#009543", "#ed1c24"],
    ["Tahiti", "OFC", 22, "PF", "fr", "#ce1126", "#ffffff"], ["Îles Salomon", "OFC", 24, "SB", "oc", "#0051ba", "#215b33"], ["Vanuatu", "OFC", 22, "VU", "oc", "#d21034", "#009543"],
    ["Papouasie-Nouvelle-Guinée", "OFC", 26, "PG", "oc", "#111111", "#ce1126"], ["Samoa", "OFC", 18, "WS", "oc", "#ce1126", "#002b7f"]
  ];
  const NATIONS = {};
  const ORDER = [];
  ROWS.forEach((r) => {
    const key = slug(r[0]);
    NATIONS[key] = { key, label: r[0], conf: r[1], base: r[2], cc: r[3], pool: r[4], c1: r[5], c2: r[6], play: !!r[7], flag: flagOf(r[3]) };
    ORDER.push(key);
  });
  const CONF_LABEL = { UEFA: "Europe (UEFA)", CAF: "Afrique (CAF)", AFC: "Asie (AFC)", CONMEBOL: "Amérique du Sud (CONMEBOL)", CONCACAF: "Amérique du Nord & centrale (CONCACAF)", OFC: "Océanie (OFC)" };
  const CONT_NAME = { UEFA: "Championnat d'Europe", CAF: "Coupe d'Afrique des nations", AFC: "Coupe d'Asie", CONMEBOL: "Copa América", CONCACAF: "Gold Cup", OFC: "Coupe d'Océanie" };
  const WC_SLOTS = { UEFA: 16, CAF: 10, AFC: 9, CONMEBOL: 6, CONCACAF: 6, OFC: 1 };
  const WC_HOSTS = { 2030: ["espagne", "portugal", "maroc"], 2034: ["arabie-saoudite"] };
  const nat = (k) => NATIONS[k];
  const nName = (k) => (NATIONS[k] ? NATIONS[k].label : k);
  const nLabelNat = (k) => (NATIONS[k] ? NATIONS[k].label : String(k));
  const natByLabel = (l) => ORDER.map(nat).find((n) => n.label === l);
  function playable() { return ORDER.map(nat).filter((n) => n.play); }

  // ---------------------------------------------------------------
  // État
  // ---------------------------------------------------------------
  const N = () => (hasState() ? state.nt : null);
  const active = () => { const n = N(); return !!(n && n.nat && !n.fired); };
  const myKey = () => (N() ? N().nat : null);
  const myNat = () => nat(myKey());
  function rating(k) { const n = N(); return (n && n.rate && n.rate[k] != null) ? n.rate[k] : (nat(k) ? nat(k).base : 40); }
  const xiAvgFromRating = (r) => 40 + r * 0.45;
  const nextIdSafe = () => (typeof nextId === "function" ? nextId() : Math.floor(Math.random() * 1e9) + 5e6);

  // ---------------------------------------------------------------
  // Effectifs virtuels (adversaires) et « diaspora » du pays géré
  // ---------------------------------------------------------------
  const PLAN = { GB: 3, DEF: 8, MIL: 8, ATT: 6 };
  function mkPlayer(n, pos, ov, age) {
    ensurePools();
    const pool = (typeof NAME_POOLS !== "undefined" && (NAME_POOLS[n.pool] || NAME_POOLS.en)) || { first: ["Alex"], last: ["Martin"] };
    const a = age || ri(19, 35);
    const potential = cl(ov + (a < 23 ? ri(0, 9) : a < 27 ? ri(0, 3) : 0), ov, 95);
    return { id: nextIdSafe(), firstName: pk(pool.first), lastName: pk(pool.last), nationality: n.label, age: a, position: pos, overall: ov, potential,
      form: ri(-3, 3), morale: ri(60, 85), yellowCards: 0, suspendedMatches: 0, fatigue: 0, motmCount: 0, internationalCaps: ri(0, 60), seasonStats: { matches: 0, goals: 0, assists: 0 }, virtual: true };
  }
  function buildSquadFor(n, target, plan) {
    const out = [];
    Object.keys(plan).forEach((pos) => {
      const cnt = plan[pos];
      for (let i = 0; i < cnt; i++) {
        const ov = cl(Math.round(target + 6 - i * (14 / cnt) + rf(-3, 3) + (pos === "GB" ? -1 : 0)), 34, 94);
        out.push(mkPlayer(n, pos, ov));
      }
    });
    return out;
  }
  function team(k) {
    const S = N(); S.teams = S.teams || {};
    let t = S.teams[k];
    if (!t) {
      const n = nat(k);
      t = S.teams[k] = { players: buildSquadFor(n, xiAvgFromRating(rating(k)), PLAN), formation: pk(["4-4-2", "4-3-3", "3-5-2", "4-4-2", "4-3-3"]), style: ["possession", "contre", "direct", "equilibre"][hstr(k) % 4], y: new Date(state.date).getUTCFullYear() };
    }
    return t;
  }
  function ageTeams() {
    const S = N(); const y = new Date(state.date).getUTCFullYear();
    Object.keys(S.teams || {}).forEach((k) => {
      const t = S.teams[k]; if (t.y === y) return; t.y = y;
      const n = nat(k); const target = xiAvgFromRating(rating(k));
      t.players = t.players.map((p) => {
        p.age++;
        if (p.age > 35 || Math.random() < 0.06) { const q = mkPlayer(n, p.position, cl(Math.round(target + rf(-8, 5)), 34, 94), ri(19, 27)); return q; }
        p.overall = cl(Math.round(p.overall + (target + 3 - p.overall) * 0.25 + rf(-1.5, 1.5)), 34, 94); return p;
      });
    });
  }
  const oppClub = (k) => {
    const t = team(k), n = nat(k);
    return { id: -(100 + (hstr(k) % 800)), name: n.label, city: "", countryKey: null, isNT: true, nationKey: k, players: t.players, tactics: { formation: t.formation, mentality: "equilibre" }, playstyle: t.style,
      formStreak: { type: null, count: 0 }, trophies: [], kitColor: n.c1, logoColor: n.c1, logoShape: "shield", staff: [], points: 0, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0 };
  };

  // joueurs réels éligibles
  function eligible(k) {
    const lab = nat(k).label, out = [];
    try { allClubs().forEach((c) => c.players.forEach((p) => { if (p.nationality === lab && !p.retired) out.push(p); })); } catch (e) {}
    return out;
  }
  function placeInClub(p, clubs) {
    const need = (p.overall - 48) / 34;
    let cand = clubs.filter((c) => c.tierFactor >= need - 0.22 && c.tierFactor <= need + 0.3);
    if (!cand.length) cand = clubs.slice().sort((a, b) => Math.abs(a.tierFactor - need) - Math.abs(b.tierFactor - need)).slice(0, 6);
    const c = pk(cand);
    p.clubId = c.id; p.contractEndYear = new Date(state.date).getUTCFullYear() + ri(1, 4);
    p.value = (typeof computeValue === "function") ? computeValue(p) : 1e6;
    p.wage = Math.max(800, Math.round(p.value * 0.011 / 500) * 500);
    p.listed = false; p.loyalty = ri(10, 95); p.agent = { name: (typeof AGENT_NAMES !== "undefined" ? pk(AGENT_NAMES) : "Agent"), agency: (typeof AGENCIES !== "undefined" ? pk(AGENCIES) : "Agence"), commissionPct: ri(3, 8) };
    p.releaseClause = null; p.history = []; p.injected = true;
    if (typeof generateAttributes === "function") p.attributes = generateAttributes(p);
    delete p.virtual;
    c.players.push(p);
    try { c.wageBill = (c.wageBill || 0) + p.wage; } catch (e) {}
  }
  // complète la « diaspora » : garantit un vivier crédible au niveau de la sélection gérée
  function injectDiaspora(k) {
    const n = nat(k), target = xiAvgFromRating(rating(k));
    const clubs = allClubs(); if (!clubs.length) return 0;
    const have = eligible(k);
    const good = have.filter((p) => p.overall >= target - 10).length;
    let made = 0;
    const plan = { GB: 3, DEF: 9, MIL: 9, ATT: 7 };
    if (good >= 28) return 0;
    const full = buildSquadFor(n, target, plan);
    // on n'ajoute que le nombre manquant, en commençant par les meilleurs éléments
    const missing = Math.max(0, 30 - good);
    full.sort((a, b) => b.overall - a.overall).slice(0, missing).forEach((p) => { placeInClub(p, clubs); made++; });
    return made;
  }

  // ---------------------------------------------------------------
  // Clubs fictifs pour le moteur de match
  // ---------------------------------------------------------------
  function mySquad() {
    const S = N(); const out = [];
    (S.squad || []).forEach((id) => { const p = (typeof getPlayer === "function") ? getPlayer(id) : null; if (p) out.push(p); });
    return out;
  }
  function myClub() {
    const S = N(), n = myNat();
    return { id: -1, name: n.label, city: "", countryKey: null, isNT: true, isMine: true, nationKey: n.key, players: mySquad(), tactics: S.tactics, playstyle: S.style, xi: S.xi && S.xi.length ? S.xi : null,
      formStreak: S.form || { type: null, count: 0 }, trophies: [], kitColor: n.c1, logoColor: n.c1, logoShape: "shield", staff: [], points: 0, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0 };
  }
  const origBuildLineup = window.buildLineup;
  if (typeof origBuildLineup === "function") window.buildLineup = function (club, dateKey) {
    if (club && club.isMine && club.xi) {
      const set = new Map(club.players.map((p) => [p.id, p]));
      const xi = club.xi.map((id) => set.get(id)).filter((p) => p && isAvailable(p, dateKey));
      if (xi.length === 11 && xi.filter((p) => p.position === "GB").length === 1) return xi;
    }
    return origBuildLineup.apply(this, arguments);
  };
  const origAvail = window.isAvailable;
  if (typeof origAvail === "function") window.isAvailable = function (p, dateKey) {
    try {
      if (p && p.intl && p.intl.nt && hasState() && state.nt && state.nt.mdSet && state.nt.mdSet[dateKey]) {
        const saved = p.intl; p.intl = null;
        try { return origAvail.apply(this, arguments); } finally { p.intl = saved; }
      }
    } catch (e) {}
    return origAvail.apply(this, arguments);
  };

  window.dsNationsData = { NATIONS, ORDER, nat, nName, playable, CONF_LABEL, CONT_NAME, WC_SLOTS, WC_HOSTS, flagOf, slug, natByLabel };
  window.__ntInternal = { N, active, myKey, myNat, rating, team, oppClub, myClub, mySquad, eligible, injectDiaspora, ageTeams, xiAvgFromRating, ensurePools, mkPlayer, hu, hstr, cl, ri, rf, pk, dkey, todayKey, esc, hasState, nextIdSafe };
})();
