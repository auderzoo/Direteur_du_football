// =====================================================================
// COUPES D'EUROPE (format 2024+) : coefficients UEFA, qualifications, phase de championnat
// à 36 équipes puis barrages / tours à élimination directe, récompenses individuelles.
//  - coefficients des associations (base : classement UEFA 2025, valeurs approchées)
//  - coefficients de clubs, évolution chaque saison selon les résultats
//  - clubs « fantômes » pour les pays non simulés (pour avoir 36 équipes par coupe)
//  - Ballon d'or, Golden Boy, Soulier d'or, meilleur buteur/passeur, entraîneur, équipe type
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // ≈ [-1;1]
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
  const mailTo = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };

  // ---------------- associations (classement UEFA 2025 approché, total sur 5 saisons) ----------------
  const ASSOC = [
    ["ENG", "Angleterre", "angleterre", 104.5, "en", "en", ["Londres", "Manchester", "Liverpool", "Newcastle", "Birmingham", "Brighton", "Leeds", "Bristol"]],
    ["ITA", "Italie", "italie", 92.5, "it", "it", ["Milan", "Turin", "Rome", "Naples", "Bergame", "Florence", "Bologne", "Gênes"]],
    ["ESP", "Espagne", "espagne", 89.0, "es", "es", ["Madrid", "Barcelone", "Séville", "Valence", "Bilbao", "Villarreal", "Saint-Sébastien", "Gérone"]],
    ["GER", "Allemagne", "allemagne", 87.3, "de", "de", ["Munich", "Leverkusen", "Dortmund", "Leipzig", "Francfort", "Stuttgart", "Brême", "Fribourg"]],
    ["FRA", "France", "france", 67.5, "fr", "fr", ["Paris", "Marseille", "Monaco", "Lille", "Lyon", "Nice", "Rennes", "Lens"]],
    ["NED", "Pays-Bas", null, 61.3, "de", "de", ["Eindhoven", "Amsterdam", "Rotterdam", "Alkmaar", "Enschede", "Utrecht", "Arnhem", "Groningue"]],
    ["POR", "Portugal", null, 59.5, "es", "pt", ["Lisbonne", "Porto", "Braga", "Guimarães", "Benfica-Sud", "Faro", "Coimbra", "Setúbal"]],
    ["BEL", "Belgique", "belgique", 55.0, "be", "fr", ["Bruges", "Anderlecht", "Gand", "Genk", "Anvers", "Liège", "Charleroi", "Louvain"]],
    ["TUR", "Turquie", "turquie", 44.0, "tr", "tr", ["Istanbul", "Galata", "Trabzon", "Ankara", "Izmir", "Bursa", "Konya", "Antalya"]],
    ["CZE", "Tchéquie", null, 40.5, "pl", "pl", ["Prague", "Pilsen", "Ostrava", "Liberec", "Olomouc", "Brno", "Zlín", "Mladá"]],
    ["GRE", "Grèce", null, 39.5, "it", "it", ["Athènes", "Le Pirée", "Salonique", "Patras", "Volos", "Larissa", "Tripoli", "Iraklio"]],
    ["DEN", "Danemark", null, 38.5, "no", "no", ["Copenhague", "Midtjylland", "Brøndby", "Aarhus", "Aalborg", "Odense", "Silkeborg", "Randers"]],
    ["NOR", "Norvège", "norvege", 38.0, "no", "no", ["Oslo", "Bodø", "Molde", "Bergen", "Trondheim", "Tromsø", "Stavanger", "Lillestrøm"]],
    ["POL", "Pologne", "pologne", 36.5, "pl", "pl", ["Varsovie", "Cracovie", "Poznań", "Gdańsk", "Szczecin", "Lublin", "Katowice", "Białystok"]],
    ["CYP", "Chypre", null, 35.0, "tr", "tr", ["Nicosie", "Limassol", "Larnaca", "Paphos", "Famagouste", "Omonia", "Aradippou", "Pafos"]],
    ["SUI", "Suisse", "suisse", 33.0, "ch", "de", ["Berne", "Bâle", "Zurich", "Lugano", "Genève", "Lausanne", "Saint-Gall", "Lucerne"]],
    ["AUT", "Autriche", null, 32.5, "de", "de", ["Salzbourg", "Vienne", "Graz", "Linz", "Klagenfurt", "Innsbruck", "Wolfsberg", "Altach"]],
    ["SCO", "Écosse", null, 31.5, "en", "en", ["Glasgow-Est", "Glasgow-Ouest", "Édimbourg", "Aberdeen", "Dundee", "Kilmarnock", "Inverness", "Motherwell"]],
    ["UKR", "Ukraine", null, 30.0, "pl", "pl", ["Kiev", "Donetsk", "Kharkiv", "Lviv", "Odessa", "Poltava", "Zaporijia", "Loutsk"]],
    ["ISR", "Israël", null, 29.5, "en", "en", ["Tel-Aviv", "Haïfa", "Beer-Sheva", "Jérusalem", "Netanya", "Ashdod", "Kiryat", "Eilat"]],
    ["CRO", "Croatie", null, 28.5, "pl", "pl", ["Zagreb", "Split", "Rijeka", "Osijek", "Varaždin", "Pula", "Zadar", "Gorica"]],
    ["HUN", "Hongrie", null, 28.0, "pl", "pl", ["Budapest", "Debrecen", "Győr", "Fehérvár", "Pécs", "Szeged", "Miskolc", "Paks"]],
    ["SRB", "Serbie", null, 28.0, "pl", "pl", ["Belgrade-Rouge", "Belgrade-Noir", "Novi Sad", "Niš", "Čačak", "Kraljevo", "Subotica", "Vojvodina"]],
    ["SWE", "Suède", "suede", 27.5, "se", "no", ["Malmö", "Stockholm", "Göteborg", "Hammarby", "Norrköping", "Helsingborg", "Elfsborg", "Kalmar"]],
    ["ROU", "Roumanie", "roumanie", 27.0, "ro", "ro", ["Bucarest", "Cluj", "Craiova", "Iași", "Sibiu", "Constanța", "Târgu", "Ploiești"]],
    ["AZE", "Azerbaïdjan", null, 25.0, "tr", "tr", ["Bakou", "Qarabağ", "Gandja", "Sumqayit", "Neftçi", "Zira", "Sabah", "Shamakhi"]],
    ["BUL", "Bulgarie", null, 22.0, "ro", "ro", ["Sofia", "Ludogorets", "Plovdiv", "Varna", "Burgas", "Stara Zagora", "Razgrad", "Pernik"]],
    ["SVK", "Slovaquie", null, 20.0, "pl", "pl", ["Bratislava", "Košice", "Trnava", "Žilina", "Dunajská", "Zvolen", "Nitra", "Trenčín"]],
    ["SVN", "Slovénie", null, 19.0, "pl", "pl", ["Ljubljana", "Maribor", "Celje", "Koper", "Domžale", "Kranj", "Nova Gorica", "Murska"]],
    ["KAZ", "Kazakhstan", null, 18.5, "ro", "ro", ["Astana", "Almaty", "Aktobe", "Kairat", "Tobol", "Shymkent", "Karaganda", "Atyrau"]],
    ["FIN", "Finlande", null, 15.0, "se", "no", ["Helsinki", "Tampere", "Kuopio", "Oulu", "Lahti", "Turku", "Vaasa", "Seinäjoki"]],
    ["IRL", "Irlande", "irlande", 12.0, "ie", "en", ["Dublin-Nord", "Dublin-Sud", "Cork", "Galway", "Derry", "Sligo", "Waterford", "Drogheda"]],
    ["ISL", "Islande", "islande", 10.0, "is", "no", ["Reykjavik", "Kópavogur", "Akureyri", "Hafnarfjörður", "Keflavik", "Akranes", "Vestmannaeyjar", "Selfoss"]],
    ["NIR", "Irlande du Nord", "irlandeNord", 9.0, "en", "en", ["Belfast-Est", "Belfast-Ouest", "Larne", "Coleraine", "Derry-Nord", "Portadown", "Glenavon", "Linfield-Sud"]],
    ["MDA", "Moldavie", "moldavie", 8.0, "ro", "ro", ["Chișinău", "Sheriff", "Tiraspol", "Bălți", "Petrocub", "Milsami", "Zimbru", "Dacia"]]
  ];
  const A = {}; ASSOC.forEach((a) => { A[a[0]] = { code: a[0], label: a[1], ck: a[2], total: a[3], tpl: a[4], pool: a[5], cities: a[6] }; });
  const ALLOC = {
    ucl: [4, 4, 4, 4, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    uel: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    uecl: [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  };
  const COMP = {
    ucl: { key: "ucl", label: "Ligue des Champions", short: "LDC", col: "#1b3a8a", md: 8, off: [3, 9, 14, 21], part: 4, top8: 4, win: 2.1e6, partFee: 12e6, prize: 15e6 },
    uel: { key: "uel", label: "Ligue Europa", short: "LE", col: "#e07b00", md: 8, off: [3, 9, 14, 21], part: 2, top8: 3, win: 0.6e6, partFee: 4e6, prize: 6e6 },
    uecl: { key: "uecl", label: "Ligue Conférence", short: "LC", col: "#1c8a4b", md: 6, off: [5, 13, 22], part: 1, top8: 2, win: 0.35e6, partFee: 2e6, prize: 3e6 }
  };
  const CK = ["ucl", "uel", "uecl"];
  const OFFSET_DAYS = { ucl: 0, uel: 2, uecl: 2 };

  // ---------------- accès ----------------
  const E = () => state.euro;
  const isGameCountry = (a) => !!(a.ck && state.countries && state.countries[a.ck]);
  function assocTotal(code) { return (E().assoc[code] || []).reduce((s, v) => s + v, 0); }
  function assocRanking() { return ASSOC.map((a) => a[0]).sort((x, y) => assocTotal(y) - assocTotal(x)); }
  function allocFor(rank0) { return { ucl: ALLOC.ucl[rank0] || 0, uel: ALLOC.uel[rank0] || 0, uecl: ALLOC.uecl[rank0] || 0 }; }
  function clubName(id) { if (typeof id === "string") { const g = ghostById(id); return g ? g.name : "?"; } const c = getClub(id); return c ? c.name : "?"; }
  function ghostById(id) { const m = /^g:([A-Z]+):/.exec(id); if (!m) return null; return (E().ghosts[m[1]] || []).find((g) => g.id === id) || null; }
  function assocOfClub(id) { if (typeof id === "string") return (/^g:([A-Z]+):/.exec(id) || [])[1]; const c = getClub(id); if (!c) return null; const a = ASSOC.find((x) => x[2] === c.countryKey); return a ? a[0] : null; }
  const isUser = (id) => typeof id === "number" && isUserClub(id);

  // ---------------- clubs fantômes ----------------
  function ensureGhosts() {
    const e = E(); e.ghosts = e.ghosts || {};
    const rank = assocRanking();
    ASSOC.forEach((a, _i) => {
      const code = a[0];
      if (isGameCountry(A[code])) return;
      if (!e.ghosts[code]) {
        const r = rank.indexOf(code);
        e.ghosts[code] = A[code].cities.map((city, s) => {
          const tpl = (typeof CLUB_TEMPLATES !== "undefined" && CLUB_TEMPLATES[A[code].tpl]) || ((c) => `FC ${c}`);
          const rating = Math.round((83 - r * 0.45 - s * 1.7 + gauss() * 1.4) * 10) / 10;
          return { id: `g:${code}:${s}`, name: tpl(city), assoc: code, rating, stars: [] };
        });
      }
    });
  }
  function makeStar(code, rating, pos) {
    const pool = (typeof NAME_POOLS !== "undefined" && (NAME_POOLS[A[code].pool] || NAME_POOLS.en)) || { first: ["Alex"], last: ["Martin"] };
    return { id: "s" + Math.floor(Math.random() * 1e9), first: pick(pool.first), last: pick(pool.last), pos, age: rnd(19, 33), ovr: Math.max(55, Math.min(92, Math.round(rating + rnd(-2, 11)))), nat: A[code].label, stats: { g: 0, a: 0, eg: 0, ea: 0 } };
  }
  function refreshStars() {
    Object.keys(E().ghosts).forEach((code) => E().ghosts[code].forEach((g) => {
      if (g.rating < 62) { g.stars = []; return; }
      g.stars = (g.stars || []).filter((s) => s.age < 36);
      g.stars.forEach((s) => { s.age++; s.ovr = Math.max(55, Math.min(93, s.ovr + (s.age < 24 ? rnd(0, 3) : s.age > 31 ? -rnd(0, 3) : rnd(-1, 1)))); s.stats = { g: 0, a: 0, eg: 0, ea: 0 }; });
      const need = ["ATT", "ATT", "MIL", "DEF", "GB"];
      let i = 0; while (g.stars.length < 4 && i < 8) { g.stars.push(makeStar(g.assoc, g.rating, need[g.stars.length % need.length])); i++; }
    }));
  }

  // ---------------- construction de la saison européenne ----------------
  function seasonYear() { const d = new Date(state.date); return d.getUTCMonth() <= 3 ? d.getUTCFullYear() - 1 : d.getUTCFullYear(); }
  function seedClubCoef(id) {
    const e = E(); if (e.clubCoef[id]) return;
    let tot;
    if (typeof id === "string") tot = Math.max(4, (ghostById(id).rating - 55) * 5);
    else { const c = getClub(id); tot = Math.max(5, ((c ? c.reputation : 50) - 35) * 1.5); }
    e.clubCoef[id] = [0, 1, 2, 3, 4].map(() => Math.round(tot / 5 * (0.85 + Math.random() * 0.3) * 100) / 100);
  }
  const clubCoefTotal = (id) => { seedClubCoef(id); return E().clubCoef[id].reduce((s, v) => s + v, 0); };
  function strengthOf(id) {
    if (typeof id === "string") return ghostById(id).rating;
    const c = getClub(id); if (!c) return 55;
    try { return clubStrength(c); } catch (e) { return 60; }
  }

  function qualifiers() {
    const e = E(), rank = assocRanking();
    const res = { ucl: [], uel: [], uecl: [] };
    rank.forEach((code, i) => {
      const al = allocFor(i), a = A[code];
      let order;
      if (isGameCountry(a)) {
        const ck = a.ck;
        order = (state.lastRanks && state.lastRanks[ck]) ? state.lastRanks[ck].slice() : [...state.countries[ck].leagues.d1.clubs].sort((x, y) => y.reputation - x.reputation).map((c) => c.id);
        const cw = e.cupWinners && e.cupWinners[ck];
        const ucl = order.slice(0, al.ucl); let rest = order.slice(al.ucl); const uel = [];
        if (cw && !ucl.includes(cw) && al.uel > 0) { uel.push(cw); rest = rest.filter((x) => x !== cw); }
        while (uel.length < al.uel && rest.length) uel.push(rest.shift());
        const uecl = rest.slice(0, al.uecl);
        res.ucl.push(...ucl); res.uel.push(...uel); res.uecl.push(...uecl);
      } else {
        const gr = (e.ghostRanks && e.ghostRanks[code]) || e.ghosts[code].slice().sort((x, y) => y.rating - x.rating).map((g) => g.id);
        res.ucl.push(...gr.slice(0, al.ucl)); res.uel.push(...gr.slice(al.ucl, al.ucl + al.uel)); res.uecl.push(...gr.slice(al.ucl + al.uel, al.ucl + al.uel + al.uecl));
      }
    });
    return res;
  }

  function schedule(Y) {
    const t = new Date(state.date).getTime() + 2 * 864e5;
    let md1 = Date.UTC(Y, 8, 16), shift = 0;
    if (md1 < t) shift = Math.ceil((t - md1) / 864e5);
    const D = (y, m, d, off) => new Date(Date.UTC(y, m, d + shift + (off || 0))).toISOString().slice(0, 10);
    const mk = (off) => ({
      md: [D(Y, 8, 16, off), D(Y, 9, 1, off), D(Y, 9, 22, off), D(Y, 10, 5, off), D(Y, 10, 26, off), D(Y, 11, 10, off), D(Y + 1, 0, 21, off), D(Y + 1, 0, 28, off)],
      po: [D(Y + 1, 1, 17, off), D(Y + 1, 1, 24, off)], r16: [D(Y + 1, 2, 10, off), D(Y + 1, 2, 17, off)],
      qf: [D(Y + 1, 3, 7, off), D(Y + 1, 3, 14, off)], sf: [D(Y + 1, 3, 28, off), D(Y + 1, 4, 5, off)]
    });
    return { ucl: Object.assign(mk(0), { fin: D(Y + 1, 4, 30) }), uel: Object.assign(mk(2), { fin: D(Y + 1, 4, 20) }), uecl: Object.assign(mk(2), { fin: D(Y + 1, 4, 27) }) };
  }

  function buildRing(ids, offs) {
    const byCoef = ids.slice().sort((a, b) => clubCoefTotal(b) - clubCoefTotal(a));
    let best = null, bestC = 1e9;
    for (let t = 0; t < 300 && bestC > 0; t++) {
      const ring = [].concat(...[0, 1, 2, 3].map((k) => shuffle(byCoef.slice(k * 9, k * 9 + 9))));
      let c = 0;
      offs.forEach((d) => { for (let i = 0; i < 36; i++) if (assocOfClub(ring[i]) === assocOfClub(ring[(i + d) % 36])) c++; });
      if (c < bestC) { bestC = c; best = ring; }
    }
    return best;
  }
  function buildLeaguePhase(ck, ids, dates) {
    const off = COMP[ck].off, ring = buildRing(ids, off), matches = [];
    off.forEach((d, k) => {
      const g = gcd(36, d), L = 36 / g;
      for (let s = 0; s < g; s++) {
        for (let j = 0; j < L; j++) {
          const a = (s + j * d) % 36, b = (s + (j + 1) * d) % 36;
          const md = 2 * k + (j % 2);
          matches.push({ md, date: dates.md[md], home: ring[a], away: ring[b], played: false });
        }
      }
    });
    return matches;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  function buildEuro() {
    const prev = state.euro;
    const e = state.euro = { season: seasonYear(), assoc: prev && prev.assoc ? prev.assoc : {}, clubCoef: prev && prev.clubCoef ? prev.clubCoef : {}, ghosts: prev && prev.ghosts ? prev.ghosts : {}, ghostRanks: prev && prev.ghostRanks, cupWinners: prev && prev.cupWinners, history: prev && prev.history ? prev.history : [], coaches: prev && prev.coaches ? prev.coaches : {}, comps: {}, finished: false };
    ASSOC.forEach((a) => { if (!e.assoc[a[0]]) e.assoc[a[0]] = [0, 1, 2, 3, 4].map(() => Math.round(a[3] / 5 * (0.985 + Math.random() * 0.03) * 100) / 100); });
    ensureGhosts(); refreshStars();
    const q = qualifiers(), sch = schedule(e.season);
    CK.forEach((ck) => {
      let ids = q[ck];
      if (ids.length !== 36) { // sécurité : compléter avec les meilleurs fantômes disponibles
        const used = new Set([].concat(q.ucl, q.uel, q.uecl));
        const pool = [].concat(...Object.values(e.ghosts)).filter((g) => !used.has(g.id)).sort((a, b) => b.rating - a.rating);
        ids = ids.slice(0, 36); while (ids.length < 36 && pool.length) ids.push(pool.shift().id);
      }
      ids.forEach(seedClubCoef);
      e.comps[ck] = { key: ck, teams: ids, dates: sch[ck], matches: buildLeaguePhase(ck, ids, sch[ck]), ko: [], champion: null, pts: {}, stage: {}, finalists: [] };
      ids.forEach((id) => { e.comps[ck].pts[id] = COMP[ck].part; e.comps[ck].stage[id] = "lp"; });
    });
    // clubs de l'utilisateur
    (state.userClubIds || []).forEach((id) => {
      const c = getClub(id); if (!c) return;
      const k = CK.find((x) => e.comps[x].teams.includes(id));
      if (k) { note(`${c.name} est qualifié pour la ${COMP[k].label} (phase de championnat dès le ${fmtDate(new Date(e.comps[k].dates.md[0]))}).`); mailTo("match", "UEFA", `Qualification : ${COMP[k].label}`, `<p><b>${esc(c.name)}</b> disputera la <b>${COMP[k].label}</b>.</p><p>Phase de championnat à 36 équipes (${COMP[k].md} matchs), puis barrages et tours à élimination directe.</p>`); }
    });
    return e;
  }
  function ensureEuro() { if (!state || !state.countries) return null; if (!state.euro || !state.euro.comps || !state.euro.comps.ucl) buildEuro(); return state.euro; }

  // ---------------- simulation d'un match ----------------
  function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
  function scorers(id, goals, ck, hitsAssist) {
    const out = [];
    for (let i = 0; i < goals; i++) {
      if (typeof id === "string") {
        const g = ghostById(id); if (!g || !g.stars.length || Math.random() > 0.6) continue;
        const w = g.stars.map((s) => ({ s, w: (s.pos === "ATT" ? 6 : s.pos === "MIL" ? 3 : s.pos === "DEF" ? 1 : 0) * s.ovr }));
        const s = weighted(w); if (s) { s.s.stats.eg++; const b = weighted(g.stars.filter((x) => x !== s.s).map((x) => ({ s: x, w: (x.pos === "MIL" ? 4 : x.pos === "ATT" ? 3 : 1) * x.ovr }))); if (b && Math.random() < 0.65) b.s.stats.ea++; out.push(s.s.last); }
      } else {
        const c = getClub(id); if (!c) continue;
        const pl = c.players.filter((p) => !p.onLoan && !(p.injuredUntil && p.injuredUntil >= dayKey(state.date)));
        const s = weighted(pl.map((p) => ({ s: p, w: (p.position === "ATT" ? 6 : p.position === "MIL" ? 3 : p.position === "DEF" ? 1 : 0) * Math.pow(p.overall / 60, 3) })));
        if (!s) continue;
        const pp = s.s; pp.eu = pp.eu || { y: E().season, g: 0, a: 0 }; if (pp.eu.y !== E().season) pp.eu = { y: E().season, g: 0, a: 0 }; pp.eu.g++;
        const b = weighted(pl.filter((p) => p !== pp).map((p) => ({ s: p, w: (p.position === "MIL" ? 4 : p.position === "ATT" ? 3 : p.position === "DEF" ? 1 : 0.1) * Math.pow(p.overall / 60, 3) })));
        if (b && Math.random() < 0.7) { b.s.eu = b.s.eu || { y: E().season, g: 0, a: 0 }; if (b.s.eu.y !== E().season) b.s.eu = { y: E().season, g: 0, a: 0 }; b.s.eu.a++; }
        out.push(pp.lastName);
      }
    }
    return out;
  }
  function weighted(list) { const t = list.reduce((s, x) => s + x.w, 0); if (t <= 0) return null; let r = Math.random() * t; for (const x of list) { r -= x.w; if (r <= 0) return x; } return list[list.length - 1]; }

  function playMatch(ck, m, neutral) {
    const sh = strengthOf(m.home) + (neutral ? 0 : 2.5), sa = strengthOf(m.away), diff = sh - sa;
    m.hg = poisson(Math.max(0.25, Math.min(3.6, 1.3 + diff / 36)));
    m.ag = poisson(Math.max(0.2, Math.min(3.3, 1.05 - diff / 36)));
    m.played = true;
    m.hs = scorers(m.home, m.hg, ck); m.as = scorers(m.away, m.ag, ck);
    const comp = E().comps[ck], P = comp.pts;
    if (m.hg > m.ag) P[m.home] = (P[m.home] || 0) + 2; else if (m.hg < m.ag) P[m.away] = (P[m.away] || 0) + 2; else { P[m.home] = (P[m.home] || 0) + 1; P[m.away] = (P[m.away] || 0) + 1; }
    // primes de victoire pour les clubs suivis
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(([id, f, a]) => { if (typeof id === "number") { const c = getClub(id); if (c && f > a) c.monthlyOtherIncome = (c.monthlyOtherIncome || 0) + COMP[ck].win; } });
    if (isUser(m.home) || isUser(m.away)) {
      const h = clubName(m.home), a = clubName(m.away), uh = isUser(m.home);
      state.lastCupResult = { cupLabel: `${COMP[ck].label}${m.round ? " — " + m.round : ""}`, homeName: h, awayName: a, homeGoals: m.hg, awayGoals: m.ag, isHome: uh, penalties: false, won: uh ? m.hg > m.ag : m.ag > m.hg };
      note(`${COMP[ck].label} : ${h} ${m.hg}-${m.ag} ${a}`);
    }
  }

  function table(ck) {
    const comp = E().comps[ck], t = {};
    comp.teams.forEach((id) => { t[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    comp.matches.forEach((m) => {
      if (!m.played) return;
      const h = t[m.home], a = t[m.away]; if (!h || !a) return;
      h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
      if (m.hg > m.ag) { h.w++; a.l++; h.pts += 3; } else if (m.hg < m.ag) { a.w++; h.l++; a.pts += 3; } else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    return Object.values(t).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || clubCoefTotal(y.id) - clubCoefTotal(x.id));
  }

  // ---------------- phases à élimination directe ----------------
  function mkTie(ck, a, b, name, dates, final) {
    // a : tête de série (reçoit au retour) ; b : adversaire (reçoit à l'aller)
    if (final) return { name, a, b, legs: [{ round: name, date: dates, home: a, away: b, played: false, neutral: true }], winner: null };
    return { name, a, b, legs: [{ round: name + " (aller)", date: dates[0], home: b, away: a, played: false }, { round: name + " (retour)", date: dates[1], home: a, away: b, played: false }], winner: null };
  }
  function tieDone(t) { return t.legs.every((l) => l.played); }
  function settleTie(ck, t) {
    let ga = 0, gb = 0;
    t.legs.forEach((l) => { if (l.home === t.a) { ga += l.hg; gb += l.ag; } else { gb += l.hg; ga += l.ag; } });
    t.agg = [ga, gb];
    if (ga !== gb) t.winner = ga > gb ? t.a : t.b;
    else { const p = Math.max(0.3, Math.min(0.7, 0.5 + (strengthOf(t.a) - strengthOf(t.b)) * 0.01)); t.pens = true; t.winner = Math.random() < p ? t.a : t.b; }
  }
  function stageBonus(ck, id, stage) {
    const comp = E().comps[ck];
    const order = ["lp", "po", "r16", "qf", "sf", "f", "w"];
    if (order.indexOf(stage) <= order.indexOf(comp.stage[id] || "lp")) return;
    comp.stage[id] = stage;
    const b = { po: 1, r16: 1, qf: 1, sf: 1, f: 1, w: 0 }[stage] || 0;
    comp.pts[id] = (comp.pts[id] || 0) + b;
  }
  function progress(ck) {
    const comp = E().comps[ck], D = comp.dates;
    const lpDone = comp.matches.every((m) => m.played);
    if (lpDone && !comp.ko.length) {
      const tb = table(ck); comp.final = tb.map((r) => r.id); comp.top8 = tb.slice(0, 8).map((r) => r.id);
      tb.forEach((r, i) => { if (i < 8) { comp.pts[r.id] += COMP[ck].top8; stageBonus(ck, r.id, "r16"); } else if (i < 24) stageBonus(ck, r.id, "po"); });
      const ties = []; for (let i = 0; i < 8; i++) ties.push(mkTie(ck, tb[8 + i].id, tb[23 - i].id, "Barrage", D.po));
      comp.ko.push({ name: "Barrages", ties });
      user_notes_after_lp(ck, tb);
    }
    const last = comp.ko[comp.ko.length - 1];
    if (last && last.ties.every(tieDone) && !last.done) {
      last.done = true; last.ties.forEach((t) => { if (!t.winner) settleTie(ck, t); });
      const W = last.ties.map((t) => t.winner);
      if (last.name === "Barrages") {
        const seeds = comp.final.slice(0, 8), ties = [];
        // la tête de série k affronte le vainqueur du barrage n°(8-k)
        for (let k = 0; k < 8; k++) { const w = W[7 - k]; stageBonus(ck, w, "r16"); ties.push(mkTie(ck, seeds[k], w, "8ᵉ de finale", D.r16)); }
        comp.ko.push({ name: "8ᵉ de finale", ties });
      } else if (last.name === "8ᵉ de finale") {
        W.forEach((w) => stageBonus(ck, w, "qf"));
        const o = [[0, 3], [1, 2], [4, 7], [5, 6]];
        comp.ko.push({ name: "Quarts de finale", ties: o.map(([i, j]) => mkTie(ck, W[i], W[j], "Quart de finale", D.qf)) });
      } else if (last.name === "Quarts de finale") {
        W.forEach((w) => stageBonus(ck, w, "sf"));
        comp.ko.push({ name: "Demi-finales", ties: [mkTie(ck, W[0], W[1], "Demi-finale", D.sf), mkTie(ck, W[2], W[3], "Demi-finale", D.sf)] });
      } else if (last.name === "Demi-finales") {
        W.forEach((w) => stageBonus(ck, w, "f"));
        comp.ko.push({ name: "Finale", ties: [mkTie(ck, W[0], W[1], "Finale", D.fin, true)] });
      } else if (last.name === "Finale") {
        comp.champion = W[0]; stageBonus(ck, W[0], "w"); comp.finalists = [last.ties[0].a, last.ties[0].b];
        crown(ck);
      }
    }
  }
  function user_notes_after_lp(ck, tb) {
    tb.forEach((r, i) => { if (isUser(r.id)) { const c = getClub(r.id); const txt = i < 8 ? `qualifié directement pour les 8ᵉ de finale (${i + 1}ᵉ)` : i < 24 ? `qualifié pour les barrages (${i + 1}ᵉ)` : `éliminé (${i + 1}ᵉ)`; note(`${COMP[ck].label} : ${c.name} ${txt}.`); } });
  }
  function crown(ck) {
    const comp = E().comps[ck], id = comp.champion, name = clubName(id);
    state.news.unshift({ date: fmtDate(state.date), text: `🏆 ${name} remporte la ${COMP[ck].label} !` });
    if (typeof id === "number") {
      const c = getClub(id); if (c) { c.monthlyOtherIncome = (c.monthlyOtherIncome || 0) + COMP[ck].prize; c.trophies = c.trophies || []; c.trophies.unshift({ year: state.season.year, competition: COMP[ck].label }); if (isUser(id)) { note(`🏆 ${c.name} remporte la ${COMP[ck].label} ! Prime : ${fmtMoney(COMP[ck].prize)}.`); mailTo("match", "UEFA", `Victoire en ${COMP[ck].label} !`, `<p>Félicitations ! <b>${esc(c.name)}</b> gagne la ${COMP[ck].label}. Prime : ${fmtMoney(COMP[ck].prize)}.</p>`); } }
    }
  }

  // ---------------- boucle quotidienne ----------------
  function euroDay(today) {
    const e = ensureEuro(); if (!e || e.finished) return;
    CK.forEach((ck) => {
      const comp = e.comps[ck];
      for (let pass = 0; pass < 8; pass++) {
        let did = false;
        comp.matches.forEach((m) => { if (!m.played && m.date <= today) { m.round = `Journée ${m.md + 1}`; playMatch(ck, m); did = true; } });
        comp.ko.forEach((r) => r.ties.forEach((t) => t.legs.forEach((l) => { if (!l.played && l.date <= today) { playMatch(ck, l, l.neutral); did = true; } })));
        progress(ck);
        if (!did) break;
      }
    });
  }
  function finishAll() {
    const e = ensureEuro(); if (!e || e.finished) return;
    CK.forEach((ck) => { for (let i = 0; i < 40 && !e.comps[ck].champion; i++) euroDay("9999-12-31"); });
  }

  // ---------------- fin de saison : coefficients + récompenses ----------------
  function playerScore(p, club, extra) {
    const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 }, eu = p.eu && p.eu.y === E().season ? p.eu : { g: 0, a: 0 };
    return { g: (st.goals || 0), a: (st.assists || 0), eg: eu.g, ea: eu.a, m: st.matches || 0 };
  }
  function teamBonus(id) {
    let b = 0;
    CK.forEach((ck) => { const s = E().comps[ck].stage[id]; if (!s) return; const f = ck === "ucl" ? 1 : ck === "uel" ? 0.55 : 0.3; b += f * ({ lp: 0, po: 1, r16: 3, qf: 6, sf: 10, f: 15, w: 26 }[s] || 0); });
    return b;
  }
  function candidates() {
    const out = [];
    const rank = assocRanking();
    allClubs().forEach((c) => {
      const code = assocOfClub(c.id); const w = rank.indexOf(code) < 5 ? 2 : rank.indexOf(code) < 21 ? 1.5 : 1;
      const dom = (state.lastRanks && state.lastRanks[c.countryKey]) ? state.lastRanks[c.countryKey].indexOf(c.id) : -1;
      c.players.forEach((p) => {
        const s = playerScore(p, c);
        if (!s.m && !s.eg) return;
        out.push({ ref: p.id, name: `${p.firstName} ${p.lastName}`, club: c.name, clubId: c.id, pos: p.position, age: p.age, ovr: p.overall, nat: p.nationality, w, s, team: teamBonus(c.id) + (c.countryKey && c.division === 1 && domRank(c) === 1 ? 8 : 0), real: true });
      });
    });
    Object.values(E().ghosts).forEach((arr) => arr.forEach((g) => g.stars.forEach((st) => {
      const code = g.assoc, w = rank.indexOf(code) < 5 ? 2 : rank.indexOf(code) < 21 ? 1.5 : 1;
      out.push({ ref: st.id, name: `${st.first} ${st.last}`, club: g.name, clubId: g.id, pos: st.pos, age: st.age, ovr: st.ovr, nat: st.nat, w, s: { g: st.stats.g, a: st.stats.a, eg: st.stats.eg, ea: st.stats.ea, m: 30 }, team: teamBonus(g.id) + (((E().ghostRanks || {})[code] || [])[0] === g.id ? 8 : 0), real: false });
    })));
    return out;
  }
  function domRank(c) { try { return leagueStandingOf(c).rank; } catch (e) { return 99; } }
  const bdo = (x) => x.s.g * 2.6 + x.s.a * 1.6 + x.s.eg * 3.2 + x.s.ea * 1.8 + (x.ovr - 60) * 1.3 + x.team + Math.min(30, x.s.m) * 0.3;
  function genGhostDomestic() {
    Object.values(E().ghosts).forEach((arr) => arr.forEach((g) => g.stars.forEach((st) => {
      const base = Math.max(0, (st.ovr - 62) / 3);
      if (st.pos === "ATT") { st.stats.g = Math.max(0, Math.round(base * 1.7 + rnd(-3, 6))); st.stats.a = Math.max(0, Math.round(base * 0.7 + rnd(-2, 4))); }
      else if (st.pos === "MIL") { st.stats.g = Math.max(0, Math.round(base * 0.6 + rnd(-1, 3))); st.stats.a = Math.max(0, Math.round(base * 1.0 + rnd(-1, 5))); }
      else if (st.pos === "DEF") { st.stats.g = Math.max(0, Math.round(base * 0.2 + rnd(0, 2))); st.stats.a = Math.max(0, Math.round(base * 0.3 + rnd(0, 2))); }
    })));
  }
  function coachName(id) {
    const e = E(); if (e.coaches[id]) return e.coaches[id];
    const code = assocOfClub(id) || "FRA"; const pool = (typeof NAME_POOLS !== "undefined" && (NAME_POOLS[A[code].pool] || NAME_POOLS.en)) || { first: ["Alex"], last: ["Martin"] };
    return (e.coaches[id] = `${pick(pool.first)} ${pick(pool.last)}`);
  }
  function computeAwards() {
    const C = candidates(), top = (arr, f, n) => arr.map((x) => ({ x, v: f(x) })).sort((a, b) => b.v - a.v).slice(0, n);
    const aw = {};
    aw.ballon = top(C, bdo, 10);
    aw.golden = top(C.filter((x) => x.age <= 21), bdo, 5);
    aw.soulier = top(C, (x) => x.s.g * x.w, 5);
    aw.butEu = top(C, (x) => x.s.eg, 5);
    aw.passeurEu = top(C, (x) => x.s.ea * 100 + x.s.eg, 5);
    aw.passeur = top(C, (x) => x.s.a + x.s.ea, 5);
    const xi = []; const used = new Set();
    [["GB", 1], ["DEF", 4], ["MIL", 3], ["ATT", 3]].forEach(([pos, n]) => top(C.filter((x) => x.pos === pos), bdo, n).forEach((r) => xi.push(r)));
    aw.xi = xi;
    aw.gant = top(C.filter((x) => x.pos === "GB"), (x) => x.ovr * 1.2 + x.team + Math.random() * 2, 5);
    // entraîneur : bilan européen + titre national
    const clubs = new Set();
    CK.forEach((ck) => Object.keys(E().comps[ck].stage).forEach((id) => clubs.add(id)));
    const rows = []; clubs.forEach((raw) => {
      const id = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
      let dom = 0;
      if (typeof id === "number") { const c = getClub(id); if (c) { const r = domRank(c); const n = (leagueStandingOf(c).total) || 20; dom = r === 1 ? 24 : r <= 3 ? 14 : r <= 6 ? 6 : 0; dom += (n - r) / n * 6; } }
      else { const gr = (E().ghostRanks || {})[assocOfClub(id)] || []; const i = gr.indexOf(id); dom = i === 0 ? 24 : i < 3 ? 14 : i < 6 ? 6 : 0; }
      rows.push({ id, coach: coachName(id), club: clubName(id), v: teamBonus(id) * 1.4 + dom + Math.random() * 3 });
    });
    aw.coach = rows.sort((a, b) => b.v - a.v).slice(0, 5);
    return aw;
  }
  function seasonEnd() {
    const e = ensureEuro(); if (!e || e.finished) return;
    finishAll();
    // champions nationaux (coupes) pour les places européennes
    e.cupWinners = {}; Object.keys(state.cups.national || {}).forEach((ck) => { const c = state.cups.national[ck]; if (c && c.champion) e.cupWinners[ck] = c.champion; });
    // coefficients de clubs et d'associations
    const perAssoc = {}, cnt = {};
    const clubPts = {};
    CK.forEach((ck) => Object.keys(e.comps[ck].pts).forEach((raw) => { clubPts[raw] = (clubPts[raw] || 0) + e.comps[ck].pts[raw]; }));
    Object.keys(clubPts).forEach((raw) => {
      const id = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
      seedClubCoef(id); e.clubCoef[id].shift(); e.clubCoef[id].push(Math.round(clubPts[raw] * 100) / 100);
      const code = assocOfClub(id); if (!code) return;
      perAssoc[code] = (perAssoc[code] || 0) + clubPts[raw]; cnt[code] = (cnt[code] || 0) + 1;
    });
    const before = assocRanking();
    ASSOC.forEach((a) => { const arr = e.assoc[a[0]]; arr.shift(); arr.push(Math.round((cnt[a[0]] ? perAssoc[a[0]] / cnt[a[0]] : 0) * 1000) / 1000); });
    const after = assocRanking();
    // forme des fantômes + classements nationaux
    e.ghostRanks = {};
    Object.keys(e.ghosts).forEach((code) => {
      e.ghosts[code].forEach((g) => { const bonus = teamBonus(g.id) * 0.06; g.rating = Math.max(48, Math.min(86, Math.round((g.rating + (62 - g.rating) * 0.03 + gauss() * 1.4 + bonus - 0.5) * 10) / 10)); });
      e.ghostRanks[code] = e.ghosts[code].slice().map((g) => ({ g, v: g.rating + gauss() * 3.2 })).sort((a, b) => b.v - a.v).map((x) => x.g.id);
    });
    genGhostDomestic();
    const aw = computeAwards();
    const win = (k) => (aw[k][0] ? aw[k][0].x : null);
    const rec = { year: state.season.year, champs: {}, ballon: win("ballon") && fmtAw(win("ballon")), golden: win("golden") && fmtAw(win("golden")), soulier: win("soulier") && fmtAw(win("soulier"), "buts pondérés", (win("soulier").s.g * win("soulier").w)), coach: aw.coach[0] ? { name: aw.coach[0].coach, club: aw.coach[0].club } : null, butEu: win("butEu") && fmtAw(win("butEu"), win("butEu").s.eg + " buts"), passeur: win("passeur") && fmtAw(win("passeur"), (win("passeur").s.a + win("passeur").s.ea) + " passes"), xi: aw.xi.map((r) => ({ name: r.x.name, pos: r.x.pos, club: r.x.club })) };
    CK.forEach((ck) => { rec.champs[ck] = e.comps[ck].champion ? clubName(e.comps[ck].champion) : null; });
    rec.coefTop = after.slice(0, 5).map((c) => A[c].label);
    e.history.unshift(rec); if (e.history.length > 15) e.history.length = 15;
    // effets de jeu : trophées individuels
    [["ballon", "Ballon d'or"], ["golden", "Golden Boy"], ["soulier", "Soulier d'or"]].forEach(([k, label]) => {
      const w = win(k); if (!w || !w.real) return; const p = getPlayer(w.ref); if (!p) return;
      p.awards = p.awards || []; p.awards.push({ year: state.season.year, award: label });
      p.value = Math.round(p.value * (k === "ballon" ? 1.1 : 1.05)); p.happy = Math.min(100, (p.happy == null ? 62 : p.happy) + 5);
      if (isUserClub(p.clubId)) { note(`🏅 ${p.firstName} ${p.lastName} remporte le ${label} !`); mailTo("players", "Presse", `${label} : ${p.firstName} ${p.lastName} !`, `<p>Votre joueur <b>${esc(p.firstName)} ${esc(p.lastName)}</b> remporte le <b>${label}</b> ! Sa valeur augmente.</p>`); }
    });
    if (rec.ballon) state.news.unshift({ date: fmtDate(state.date), text: `🏅 Ballon d'or : ${rec.ballon.name} (${rec.ballon.club}).` });
    if (rec.golden) state.news.unshift({ date: fmtDate(state.date), text: `⭐ Golden Boy : ${rec.golden.name} (${rec.golden.club}).` });
    const mv = ASSOC.map((a) => a[0]).filter((c) => before.indexOf(c) !== after.indexOf(c) && (isGameCountry(A[c]))).map((c) => `${A[c].label} : ${before.indexOf(c) + 1}ᵉ → ${after.indexOf(c) + 1}ᵉ`);
    mailTo("match", "UEFA", `Bilan européen de la saison`, `<p><b>Vainqueurs</b> : LDC ${esc(rec.champs.ucl || "—")}, LE ${esc(rec.champs.uel || "—")}, LC ${esc(rec.champs.uecl || "—")}.</p><p>Ballon d'or : <b>${esc(rec.ballon ? rec.ballon.name : "—")}</b> · Golden Boy : ${esc(rec.golden ? rec.golden.name : "—")} · Entraîneur : ${esc(rec.coach ? rec.coach.name : "—")}.</p>${mv.length ? `<p>Classement UEFA : ${mv.map(esc).join(" · ")}</p>` : ""}`);
    e.finished = true;
  }
  function fmtAw(x, extra, val) { return { name: x.name, club: x.club, age: x.age, extra: extra || "" }; }

  // ---------------- branchements ----------------
  const origSetup = window.setupCups;
  window.setupCups = function () {
    origSetup.apply(this, arguments);
    try { state.cups.continental = null; state.cups.europa = null; buildEuro(); } catch (e) { console.error("euro", e); }
  };
  const origRoll = window.seasonRollover;
  window.seasonRollover = function () {
    try { seasonEnd(); } catch (e) { console.error("fin de saison européenne", e); }
    return origRoll.apply(this, arguments);
  };
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { euroDay(dayKey(state.date)); } catch (e) { console.error("euro/jour", e); }
    return r;
  };

  // ---------------- interface ----------------
  const V = [["coef", "Coefficients"], ["ucl", "Ligue des Champions"], ["uel", "Ligue Europa"], ["uecl", "Conférence"], ["awards", "Récompenses"], ["hist", "Palmarès"]];
  const f1 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  function myStatus(ck) {
    const comp = E().comps[ck], mine = (state.userClubIds || []).filter((id) => comp.teams.includes(id));
    return mine.map((id) => {
      const st = comp.stage[id], c = getClub(id);
      const lab = { lp: "phase de championnat", po: "barrages", r16: "8ᵉ de finale", qf: "quarts de finale", sf: "demi-finales", f: "finale", w: "vainqueur 🏆" }[st] || st;
      const out = comp.champion && comp.champion !== id ? (st === "f" ? "finaliste" : "éliminé (" + lab + ")") : lab;
      return `${esc(c.name)} : ${out}`;
    }).join(" · ");
  }
  function matchLine(m) { const h = clubName(m.home), a = clubName(m.away); const hs = isUser(m.home), as = isUser(m.away); return `<tr><td>${esc(m.date.slice(5).split("-").reverse().join("/"))}</td><td class="${hs ? "eu-me" : ""}" style="text-align:right">${esc(h)}</td><td style="text-align:center"><b>${m.played ? m.hg + " - " + m.ag : "vs"}</b></td><td class="${as ? "eu-me" : ""}">${esc(a)}</td></tr>`; }
  function compView(ck) {
    const comp = E().comps[ck], tb = table(ck), mine = myStatus(ck);
    const rows = tb.map((r, i) => `<tr class="${i < 8 ? "eu-q1" : i < 24 ? "eu-q2" : "eu-q3"} ${isUser(r.id) ? "eu-meRow" : ""}"><td>${i + 1}</td><td>${esc(clubName(r.id))}</td><td>${esc((A[assocOfClub(r.id)] || {}).label || "")}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}-${r.ga}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`).join("");
    const today = dayKey(state.date);
    const all = comp.matches.concat([].concat(...comp.ko.map((r) => [].concat(...r.ties.map((t) => t.legs))))), mineM = all.filter((m) => isUser(m.home) || isUser(m.away));
    const mineHTML = mineM.length ? `<h4>Mes matchs</h4><table class="fx-mini eu-m"><tbody>${mineM.map(matchLine).join("")}</tbody></table>` : "";
    const next = all.filter((m) => !m.played).sort((a, b) => a.date.localeCompare(b.date));
    const nd = next.length ? next[0].date : null;
    const nextHTML = nd ? `<h4>Prochaine date : ${fmtDate(new Date(nd))}</h4><table class="fx-mini eu-m"><tbody>${next.filter((m) => m.date === nd).slice(0, 18).map(matchLine).join("")}</tbody></table>` : "";
    const ko = comp.ko.map((r) => `<h4>${esc(r.name)}</h4>${r.ties.map((t) => { const sc = t.legs.map((l) => (l.played ? l.hg + "-" + l.ag : "–")).join(" ; "); return `<div class="eu-tie ${isUser(t.a) || isUser(t.b) ? "eu-meRow" : ""}"><b class="${t.winner === t.a ? "eu-w" : ""}">${esc(clubName(t.a))}</b> – <b class="${t.winner === t.b ? "eu-w" : ""}">${esc(clubName(t.b))}</b> <span class="hint">(${sc}${t.agg ? ` · cumul ${t.agg[0]}-${t.agg[1]}` : ""}${t.pens ? " · t.a.b." : ""})</span></div>`; }).join("")}`).join("");
    return `<h3 class="panel-subtitle" style="color:${COMP[ck].col}">${COMP[ck].label}</h3>
      ${mine ? `<p class="hint"><b>Mon parcours :</b> ${mine}</p>` : `<p class="hint">Aucun de vos clubs n'est qualifié cette saison.</p>`}
      ${comp.champion ? `<p class="eu-champ">🏆 Vainqueur : <b>${esc(clubName(comp.champion))}</b></p>` : ""}
      <p class="hint">Phase de championnat : ${COMP[ck].md} matchs par équipe · 1-8 : 8ᵉ de finale · 9-24 : barrages · 25-36 : éliminés.</p>
      <div class="table-scroll"><table class="squad-table eu-tb"><thead><tr><th>#</th><th>Club</th><th>Pays</th><th>J</th><th>G</th><th>N</th><th>P</th><th>Buts</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${mineHTML}${nextHTML}${ko}`;
  }
  function coefView() {
    const rank = assocRanking();
    const rows = rank.map((c, i) => { const al = allocFor(i), arr = E().assoc[c]; return `<tr class="${isGameCountry(A[c]) ? "eu-meRow" : ""}"><td>${i + 1}</td><td>${esc(A[c].label)}${isGameCountry(A[c]) ? " ⭐" : ""}</td>${arr.map((v) => `<td>${f1(v)}</td>`).join("")}<td><b>${f1(assocTotal(c))}</b></td><td>${al.ucl}/${al.uel}/${al.uecl}</td></tr>`; }).join("");
    const clubs = Object.keys(E().clubCoef).map((raw) => { const id = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw; return { id, v: clubCoefTotal(id) }; }).sort((a, b) => b.v - a.v).slice(0, 30);
    const crow = clubs.map((r, i) => `<tr class="${isUser(r.id) ? "eu-meRow" : ""}"><td>${i + 1}</td><td>${esc(clubName(r.id))}</td><td>${esc((A[assocOfClub(r.id)] || {}).label || "")}</td><td><b>${f1(r.v)}</b></td></tr>`).join("");
    const y = E().season;
    return `<h3 class="panel-subtitle">Coefficients UEFA des associations</h3>
      <p class="hint">Cinq saisons glissantes (${y - 5}/${String(y - 4).slice(2)} → ${y - 1}/${String(y).slice(2)} pour la base de départ). Points d'une saison = points des clubs ÷ nombre de clubs engagés. Colonne « Places » = Ligue des Champions / Ligue Europa / Conférence pour la saison à venir. Valeurs de départ : classement UEFA 2025, approximatives.</p>
      <div class="table-scroll"><table class="squad-table eu-tb"><thead><tr><th>#</th><th>Pays</th><th>S-4</th><th>S-3</th><th>S-2</th><th>S-1</th><th>Saison</th><th>Total</th><th>Places</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h3 class="panel-subtitle">Coefficients de clubs (top 30)</h3>
      <div class="table-scroll"><table class="squad-table eu-tb"><thead><tr><th>#</th><th>Club</th><th>Pays</th><th>Points</th></tr></thead><tbody>${crow}</tbody></table></div>`;
  }
  function awRows(list, fmt) { return `<table class="fx-mini eu-aw"><tbody>${list.map((r, i) => `<tr class="${r.x && r.x.clubId && isUser(r.x.clubId) ? "eu-meRow" : ""}"><td>${i + 1}</td>${fmt(r)}</tr>`).join("") || "<tr><td>—</td></tr>"}</tbody></table>`; }
  function awardsView() {
    const aw = computeAwards();
    const pl = (r) => `<td><b>${esc(r.x.name)}</b> <span class="hint">${esc(r.x.club)} · ${r.x.age} ans</span></td>`;
    const xi = ["GB", "DEF", "MIL", "ATT"].map((p) => aw.xi.filter((r) => r.x.pos === p).map((r) => `<span class="eu-chip">${esc(r.x.name)} <i>${esc(r.x.club)}</i></span>`).join("")).join("<br>");
    return `<h3 class="panel-subtitle">Course aux récompenses (saison en cours)</h3>
      <p class="hint">Classements provisoires. Joueurs des championnats suivis et grandes stars des pays non simulés. Remise des trophées à la fin de la saison.</p>
      <div class="eu-grid">
        <div><h4>🏅 Ballon d'or</h4>${awRows(aw.ballon, (r) => pl(r) + `<td>${Math.round(r.v)}</td>`)}</div>
        <div><h4>⭐ Golden Boy (≤ 21 ans)</h4>${awRows(aw.golden, (r) => pl(r) + `<td>${Math.round(r.v)}</td>`)}</div>
        <div><h4>👟 Soulier d'or (buts pondérés)</h4>${awRows(aw.soulier, (r) => pl(r) + `<td>${r.x.s.g} b.</td>`)}</div>
        <div><h4>⚽ Meilleur buteur des coupes d'Europe</h4>${awRows(aw.butEu, (r) => pl(r) + `<td>${r.x.s.eg} b.</td>`)}</div>
        <div><h4>🎯 Meilleur passeur (championnat + coupes)</h4>${awRows(aw.passeur, (r) => pl(r) + `<td>${r.x.s.a + r.x.s.ea}</td>`)}</div>
        <div><h4>🧤 Gant d'or (meilleur gardien)</h4>${awRows(aw.gant, (r) => pl(r) + `<td>${r.x.ovr}</td>`)}</div>
        <div><h4>🧠 Meilleur entraîneur</h4>${awRows(aw.coach, (r) => `<td><b>${esc(r.coach)}</b> <span class="hint">${esc(r.club)}</span></td><td>${Math.round(r.v)}</td>`)}</div>
      </div>
      <h4>Équipe type (4-3-3)</h4><div class="eu-xi">${xi}</div>`;
  }
  function histView() {
    const h = E().history;
    if (!h.length) return `<h3 class="panel-subtitle">Palmarès</h3><p class="hint">Le palmarès se remplira à la fin de chaque saison.</p>`;
    return `<h3 class="panel-subtitle">Palmarès</h3><div class="table-scroll"><table class="squad-table eu-tb"><thead><tr><th>Saison</th><th>LDC</th><th>LE</th><th>LC</th><th>Ballon d'or</th><th>Golden Boy</th><th>Soulier d'or</th><th>Entraîneur</th></tr></thead><tbody>${h.map((r) => `<tr><td>${r.year}</td><td>${esc(r.champs.ucl || "—")}</td><td>${esc(r.champs.uel || "—")}</td><td>${esc(r.champs.uecl || "—")}</td><td>${r.ballon ? esc(r.ballon.name) + " <span class='hint'>" + esc(r.ballon.club) + "</span>" : "—"}</td><td>${r.golden ? esc(r.golden.name) : "—"}</td><td>${r.soulier ? esc(r.soulier.name) : "—"}</td><td>${r.coach ? esc(r.coach.name) : "—"}</td></tr>`).join("")}</tbody></table></div>`;
  }
  window.renderEurope = function () {
    const e = ensureEuro(); if (!e) return "";
    const v = ui.euView || "coef";
    const body = v === "coef" ? coefView() : v === "awards" ? awardsView() : v === "hist" ? histView() : compView(v);
    return `<div class="fm-dark fm-panel eu">
      <h2 class="fm-title">Europe <span>saison ${e.season}/${String(e.season + 1).slice(2)}</span></h2>
      <div class="eu-subnav">${V.map(([k, l]) => `<button class="${v === k ? "on" : ""}" data-eu-v="${k}">${l}</button>`).join("")}</div>
      ${body}</div>`;
  };
  window.dsEuroStatusHTML = function () {
    try { const e = ensureEuro(); const lines = CK.map((ck) => { const s = myStatus(ck); return s ? `<div class="rz-row"><b>${COMP[ck].label}</b><span>${s}</span></div>` : ""; }).join(""); return `<h3 class="panel-subtitle">Coupes d'Europe</h3>${lines || `<p class="hint">Aucun de vos clubs n'est engagé en Europe cette saison.</p>`}<p class="hint">Détail, coefficients et récompenses dans l'onglet « Europe ».</p>`; } catch (x) { return ""; }
  };
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-eu-v]"); if (!b) return;
    ui.euView = b.dataset.euV; render();
  });

  window.dsEuro = { ASSOC, ALLOC, buildEuro, ensureEuro, euroDay, finishAll, seasonEnd, assocRanking, table, computeAwards, qualifiers, strengthOf };
})();
