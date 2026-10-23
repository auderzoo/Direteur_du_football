// =====================================================================
// BLOC 9 — COUPES D'EUROPE RÉELLES
//  - coefficients UEFA 2024-25 (valeurs arrondies) qui évoluent selon les résultats des clubs
//  - places qualificatives LDC / Europa League / Conférence League selon le classement des associations
//  - vrai format : phase de ligue à 36 clubs, barrages, huitièmes, quarts, demies, finale
//  - clubs « fantômes » (réels) simulés pour les pays que vous ne suivez pas
//  - récompenses : Ballon d'or, Golden Boy, meilleur buteur / passeur, entraîneur, gardien
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAY = 864e5;
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const news = (t) => { try { state.news.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pickOf = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;

  // ---------------------------------------------------------------
  // DONNÉES : associations (coefficient UEFA 5 ans, arrondi, classement 2024-25) et clubs réels
  // [clé, libellé, code, pays du jeu, coefficient, groupe de noms, clubs du plus fort au plus modeste]
  // ---------------------------------------------------------------
  const A = [
    ["england", "Angleterre", "ENG", "angleterre", 97.6, "en", ["Manchester City", "Arsenal", "Liverpool", "Manchester United", "Chelsea", "Tottenham Hotspur", "Newcastle United", "Aston Villa", "Crystal Palace"]],
    ["spain", "Espagne", "ESP", "espagne", 88.9, "es", ["Real Madrid", "FC Barcelone", "Atlético Madrid", "Athletic Bilbao", "Villarreal CF", "Real Betis", "Real Sociedad", "Séville FC", "Valence CF"]],
    ["italy", "Italie", "ITA", "italie", 85.4, "it", ["Inter Milan", "SSC Naples", "Atalanta Bergame", "Juventus Turin", "AC Milan", "AS Rome", "Lazio Rome", "Fiorentina", "Bologne FC"]],
    ["germany", "Allemagne", "GER", "allemagne", 81.3, "de", ["Bayern Munich", "Bayer Leverkusen", "Borussia Dortmund", "RB Leipzig", "Eintracht Francfort", "VfB Stuttgart", "SC Fribourg", "VfL Wolfsburg", "Werder Brême"]],
    ["france", "France", "FRA", "france", 71.2, "fr", ["Paris Saint-Germain", "Olympique de Marseille", "AS Monaco", "Olympique Lyonnais", "LOSC Lille", "OGC Nice", "RC Lens", "RC Strasbourg Alsace", "Stade Rennais FC"]],
    ["netherlands", "Pays-Bas", "NED", null, 63.4, "de", ["PSV Eindhoven", "Feyenoord", "Ajax Amsterdam", "AZ Alkmaar", "FC Twente", "FC Utrecht", "SC Heerenveen"]],
    ["portugal", "Portugal", "POR", "portugal", 61.9, "pt", ["Sporting CP", "SL Benfica", "FC Porto", "SC Braga", "Vitória Guimarães", "Boavista FC", "Gil Vicente"]],
    ["belgium", "Belgique", "BEL", "belgique", 54.0, "fr", ["Club Bruges", "Union Saint-Gilloise", "RSC Anderlecht", "KRC Genk", "Royal Antwerp", "KAA Gent", "Standard de Liège"]],
    ["turkey", "Turquie", "TUR", "turquie", 41.7, "tr", ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "İstanbul Başakşehir", "Samsunspor", "Konyaspor"]],
    ["czechia", "Tchéquie", "CZE", null, 41.0, "pl", ["Slavia Prague", "Sparta Prague", "Viktoria Plzeň", "Baník Ostrava", "Sigma Olomouc", "FK Mladá Boleslav"]],
    ["scotland", "Écosse", "SCO", null, 37.9, "en", ["Celtic", "Rangers", "Aberdeen", "Heart of Midlothian", "Hibernian", "Dundee United"]],
    ["greece", "Grèce", "GRE", null, 37.1, "tr", ["Olympiacos", "Panathinaïkos", "AEK Athènes", "PAOK Salonique", "Aris Salonique", "Volos"]],
    ["austria", "Autriche", "AUT", null, 35.8, "de", ["Red Bull Salzbourg", "Sturm Graz", "LASK Linz", "Rapid Vienne", "Austria Vienne", "Wolfsberger AC"]],
    ["switzerland", "Suisse", "SUI", "suisse", 34.5, "de", ["BSC Young Boys", "FC Bâle", "Servette FC", "FC Lugano", "FC Zurich", "FC Lucerne"]],
    ["norway", "Norvège", "NOR", "norvege", 34.2, "no", ["Bodø/Glimt", "SK Brann", "Molde FK", "Rosenborg BK", "Viking FK", "Fredrikstad FK"]],
    ["denmark", "Danemark", "DEN", null, 33.4, "no", ["FC Copenhague", "FC Midtjylland", "Brøndby IF", "FC Nordsjælland", "AGF Aarhus", "Silkeborg IF"]],
    ["poland", "Pologne", "POL", "pologne", 32.1, "pl", ["Legia Varsovie", "Lech Poznań", "Jagiellonia Białystok", "Raków Częstochowa", "Pogoń Szczecin", "Cracovia"]],
    ["cyprus", "Chypre", "CYP", null, 31.5, "tr", ["Omonia Nicosie", "APOEL Nicosie", "Apollon Limassol", "AEK Larnaca", "Pafos FC"]],
    ["israel", "Israël", "ISR", null, 31.0, "tr", ["Maccabi Tel-Aviv", "Maccabi Haïfa", "Hapoel Beer-Sheva", "Hapoel Tel-Aviv", "Beitar Jérusalem"]],
    ["ukraine", "Ukraine", "UKR", null, 30.0, "pl", ["Shakhtar Donetsk", "Dynamo Kiev", "Dnipro-1", "Kryvbas Kryvyï Rih", "Polissya Jytomyr"]],
    ["croatia", "Croatie", "CRO", null, 29.5, "pl", ["Dinamo Zagreb", "Hajduk Split", "HNK Rijeka", "NK Osijek", "Varaždin"]],
    ["serbia", "Serbie", "SRB", null, 28.8, "pl", ["Étoile Rouge de Belgrade", "Partizan Belgrade", "TSC Bačka Topola", "Vojvodina Novi Sad", "Čukarički"]],
    ["hungary", "Hongrie", "HUN", null, 27.5, "pl", ["Ferencváros", "Puskás Akadémia", "Fehérvár FC", "Paks", "Debrecen"]],
    ["sweden", "Suède", "SWE", "suede", 27.0, "no", ["Malmö FF", "IF Elfsborg", "Djurgårdens IF", "BK Häcken", "Hammarby IF"]],
    ["romania", "Roumanie", "ROU", "roumanie", 26.5, "ro", ["FCSB", "CFR Cluj", "Universitatea Craiova", "Rapid Bucarest", "Dinamo Bucarest"]],
    ["azerbaijan", "Azerbaïdjan", "AZE", null, 25.0, "tr", ["Qarabağ", "Neftçi Bakou", "Sabah FK", "Zira FK"]],
    ["slovakia", "Slovaquie", "SVK", null, 24.0, "pl", ["Slovan Bratislava", "Spartak Trnava", "DAC Dunajská Streda", "MFK Ružomberok"]],
    ["bulgaria", "Bulgarie", "BUL", null, 23.5, "ro", ["Ludogorets", "CSKA Sofia", "Levski Sofia", "Lokomotiv Plovdiv"]],
    ["slovenia", "Slovénie", "SVN", null, 22.5, "pl", ["NK Olimpija Ljubljana", "NK Celje", "NK Maribor", "NK Koper"]],
    ["kazakhstan", "Kazakhstan", "KAZ", null, 21.0, "pl", ["FC Astana", "FC Kairat Almaty", "FC Aktobe", "FC Tobol"]],
    ["kosovo", "Kosovo", "KOS", null, 19.0, "ro", ["Ballkani", "Drita Gjilan", "Malisheva", "Llapi"]],
    ["ireland", "Irlande", "IRL", "irlande", 18.0, "en", ["Shamrock Rovers", "Shelbourne FC", "Derry City", "St Patrick's Athletic"]],
    ["finland", "Finlande", "FIN", null, 17.5, "no", ["HJK Helsinki", "KuPS Kuopio", "Inter Turku", "SJK Seinäjoki"]],
    ["armenia", "Arménie", "ARM", null, 17.0, "ro", ["Noah", "Ararat-Armenia", "Pyunik", "Urartu"]],
    ["iceland", "Islande", "ISL", "islande", 16.0, "no", ["Breiðablik", "Víkingur Reykjavik", "Valur", "KR Reykjavik"]],
    ["nireland", "Irlande du Nord", "NIR", "irlandeNord", 15.0, "en", ["Linfield FC", "Larne FC", "Cliftonville", "Glentoran"]]
  ].map((r, i) => ({ key: r[0], label: r[1], code: r[2], gk: r[3], coef: r[4], pool: r[5], clubs: r[6], order: i }));
  const AK = {}; A.forEach((a) => { AK[a.key] = a; });
  const GK2A = {}; A.forEach((a) => { if (a.gk) GK2A[a.gk] = a.key; });
  const COMPS = {
    ucl: { id: "ucl", name: "Ligue des Champions", short: "LDC", P: 4, per: 2, nMD: 8, off: [80, 94, 115, 129, 150, 164, 206, 213], shift: 0, ko: [233, 254, 282, 303, 335], pts: [2, 1], base: 18_000_000, win: 2_000_000, draw: 650_000, stagePrize: [0, 11_000_000, 12_500_000, 15_000_000, 18_000_000], champ: 6_500_000, rankK: 3, stageK: 1 },
    uel: { id: "uel", name: "Ligue Europa", short: "UEL", P: 4, per: 2, nMD: 8, off: [80, 94, 115, 129, 150, 164, 206, 213], shift: 2, ko: [233, 254, 282, 303, 333], pts: [2, 1], base: 4_300_000, win: 450_000, draw: 150_000, stagePrize: [0, 1_500_000, 2_000_000, 3_000_000, 4_500_000], champ: 3_500_000, rankK: 2, stageK: 1 },
    uecl: { id: "uecl", name: "Ligue Conférence", short: "UECL", P: 6, per: 1, nMD: 6, off: [80, 101, 129, 157, 185, 213], shift: 2, ko: [233, 254, 282, 303, 331], pts: [1, 0.5], base: 3_000_000, win: 300_000, draw: 100_000, stagePrize: [0, 700_000, 1_000_000, 1_500_000, 2_500_000], champ: 2_000_000, rankK: 1, stageK: 0.5 }
  };
  const COMP_ORDER = ["ucl", "uel", "uecl"];
  const STAGES = ["league", "po", "r16", "qf", "sf", "final", "winner"];
  const STAGE_LABEL = { league: "Phase de ligue", po: "Barrages", r16: "Huitièmes", qf: "Quarts", sf: "Demi-finales", final: "Finale", winner: "Vainqueur" };

  // ---------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------
  function EU() { if (!state.eu) initEU(); return state.eu; }
  function initEU() {
    const eu = state.eu = { v: 1, assoc: {}, clubs: {}, comps: null, history: [], stats: {}, cs: {}, seasonPts: {}, reach: {}, ghosts: {}, coaches: {}, pendingRanks: null, lastCup: {}, eps: ["england", "spain"], deadline: null, built: null, awardsView: "ballon" };
    A.forEach((a) => {
      const h = [0, 0, 0, 0, 0].map(() => 0.85 + Math.random() * 0.3), s = sum(h);
      eu.assoc[a.key] = { hist: h.map((v) => r2(v / s * a.coef)) };
    });
  }
  const assocSum = (key) => sum(EU().assoc[key].hist);
  const isGhost = (id) => typeof id === "string";
  let cmap = null, cmapDay = -1;
  function clubOf(id) {
    if (cmapDay !== state.dayCounter || !cmap) { cmap = new Map(); allClubs().forEach((c) => cmap.set(c.id, c)); cmapDay = state.dayCounter; }
    return cmap.get(id) || getClub(id);
  }
  function nameOf(id) { if (isGhost(id)) { const g = EU().clubs[id]; return g ? g.name : "?"; } const c = clubOf(id); return c ? c.name : "?"; }
  function assocOfClub(id) { if (isGhost(id)) { const g = EU().clubs[id]; return g ? g.assoc : null; } const c = clubOf(id); return c ? GK2A[c.countryKey] || null : null; }
  const strCache = {};
  function strengthOf(id) {
    if (isGhost(id)) return EU().clubs[id].rating;
    const k = id + ":" + state.dayCounter;
    if (strCache[k] === undefined) { const c = clubOf(id); strCache[k] = c ? clubStrength(c) : 55; }
    return strCache[k];
  }
  function clubInfo(id) {
    const eu = EU();
    if (eu.clubs[id]) return eu.clubs[id];
    const c = clubOf(id);
    const tot = Math.max(6, ((c ? c.reputation : 40) - 15) * 1.45);
    const h = [0, 0, 0, 0, 0].map(() => 0.8 + Math.random() * 0.4), s = sum(h);
    return (eu.clubs[id] = { id, name: c ? c.name : "?", assoc: assocOfClub(id), ghost: false, hist: h.map((v) => r1(v / s * tot)) });
  }
  const clubCoef = (id) => sum(clubInfo(id).hist);

  function ghostClubs(a) {
    const eu = EU(), r = a.order + 1, out = [];
    a.clubs.forEach((nm, idx) => {
      const id = "g:" + a.key + ":" + idx;
      if (!eu.clubs[id]) {
        const rep = Math.max(18, 94 - (r - 1) * 1.5 - idx * 3.8);
        const tot = Math.max(6, (rep - 15) * 1.45), h = [0, 0, 0, 0, 0].map(() => 0.8 + Math.random() * 0.4), s = sum(h);
        eu.clubs[id] = { id, name: nm, assoc: a.key, ghost: true, idx, rating: 55 + rep * 0.3 + rnd(-1.5, 1.5), hist: h.map((v) => r1(v / s * tot)) };
      }
      out.push(id);
    });
    return out;
  }

  // ---------------------------------------------------------------
  // JOUEURS FANTÔMES (stars des clubs non suivis) pour buteurs / passeurs / Ballon d'or
  // ---------------------------------------------------------------
  function ghostStars(id) {
    const eu = EU(); if (eu.ghosts[id]) return eu.ghosts[id];
    const g = eu.clubs[id], a = AK[g.assoc], pool = (typeof NAME_POOLS !== "undefined" && NAME_POOLS[a.pool]) || NAME_POOLS.en;
    const mk = (pos, bonus, age) => ({ name: pickOf(pool.first) + " " + pickOf(pool.last), pos, ovr: Math.round(clamp(g.rating + bonus + rnd(0, 5), 50, 93)), age: age || ri(20, 33), dg: 0, da: 0, nat: a.label });
    const L = [mk("ATT", 7), mk("ATT", 3), mk("MIL", 5), mk("MIL", 1), mk("DEF", 1), mk("GB", 3)];
    if (Math.random() < 0.5) { const y = mk(pickOf(["ATT", "MIL"]), 2, ri(17, 21)); y.young = true; y.pot = Math.min(95, y.ovr + ri(4, 12)); L.push(y); }
    return (eu.ghosts[id] = L);
  }
  const ghostKey = (id, i) => "g" + id + "#" + i;

  // ---------------------------------------------------------------
  // QUALIFICATIONS
  // ---------------------------------------------------------------
  function rankedAssocs() { return A.map((a) => ({ a, s: assocSum(a.key) })).sort((x, y) => y.s - x.s); }
  function slotsFor(rank, key) {
    const eu = EU();
    return { ucl: (rank <= 4 ? 4 : rank === 5 ? 3 : rank <= 8 ? 2 : rank <= 17 ? 1 : 0) + (eu.eps.includes(key) ? 1 : 0), uel: rank <= 10 ? 2 : rank <= 26 ? 1 : 0, uecl: 1 };
  }
  function domesticOrder(a) {
    const eu = EU();
    if (a.gk && state.countries[a.gk]) {
      const ids = (eu.pendingRanks && eu.pendingRanks[a.gk]) || (state.lastRanks && state.lastRanks[a.gk]) || [...state.countries[a.gk].leagues.d1.clubs].sort((x, y) => y.reputation - x.reputation).map((c) => c.id);
      return { dom: ids, cup: eu.lastCup[a.gk] || null };
    }
    const g = ghostClubs(a);
    const dom = g.map((id) => ({ id, s: eu.clubs[id].rating + rnd(-5, 5) })).sort((x, y) => y.s - x.s).map((x) => x.id);
    return { dom, cup: Math.random() < 0.75 ? pickOf(dom.slice(0, 4)) : pickOf(dom) };
  }
  function qualify() {
    const eu = EU(), ra = rankedAssocs(), q = { ucl: [], uel: [], uecl: [] }, where = {};
    ra.forEach(({ a }, i) => {
      const sl = slotsFor(i + 1, a.key), { dom, cup } = domesticOrder(a);
      const ucl = dom.slice(0, sl.ucl); let rest = dom.slice(sl.ucl);
      const uel = [];
      if (sl.uel) { if (cup && !ucl.includes(cup)) { uel.push(cup); rest = rest.filter((x) => x !== cup); } while (uel.length < sl.uel && rest.length) uel.push(rest.shift()); }
      const uecl = []; while (uecl.length < sl.uecl && rest.length) uecl.push(rest.shift());
      q.ucl.push(...ucl); q.uel.push(...uel); q.uecl.push(...uecl);
      ucl.forEach((id) => { where[id] = "ucl"; }); uel.forEach((id) => { where[id] = "uel"; }); uecl.forEach((id) => { where[id] = "uecl"; });
    });
    // complément éventuel à 36 clubs (groupes incomplets)
    COMP_ORDER.forEach((c) => {
      let n = 0;
      while (q[c].length < 36 && n++ < 60) {
        const a = pickOf(A.slice(0, 20)), id = "g:" + a.key + ":x" + ri(100, 999) + n;
        EU().clubs[id] = { id, name: "FC " + a.label + " " + ri(2, 9), assoc: a.key, ghost: true, idx: 9, rating: 52 + rnd(0, 8), hist: [3, 3, 3, 3, 3] };
        q[c].push(id);
      }
      q[c] = q[c].slice(0, 36);
    });
    return q;
  }

  // ---------------------------------------------------------------
  // TIRAGE ET CALENDRIER DE LA PHASE DE LIGUE
  // ---------------------------------------------------------------
  function leaguePairs(teams, P, per) {
    const size = teams.length / P, pots = [];
    for (let i = 0; i < P; i++) pots.push(shuffle(teams.slice(i * size, (i + 1) * size)));
    const f = [];
    for (let i = 0; i < P; i++) for (let j = i; j < P; j++) {
      const n = size;
      if (i === j) {
        if (per === 2) { for (let x = 0; x < n; x++) f.push([pots[i][x], pots[i][(x + 1) % n]]); }
        else { const s = shuffle(pots[i]); for (let x = 0; x + 1 < n; x += 2) f.push(Math.random() < 0.5 ? [s[x], s[x + 1]] : [s[x + 1], s[x]]); }
      } else {
        const k = Math.floor(Math.random() * n);
        for (let x = 0; x < n; x++) {
          if (per === 2) { f.push([pots[i][x], pots[j][(x + k) % n]]); f.push([pots[j][(x + k + 1) % n], pots[i][x]]); }
          else { const b = pots[j][(x + k) % n]; f.push((i + j + x) % 2 ? [pots[i][x], b] : [b, pots[i][x]]); }
        }
      }
    }
    return f;
  }
  function edgeColor(fix, nMD) {
    for (let t = 0; t < 300; t++) {
      const at = new Map(), col = new Array(fix.length).fill(-1);
      const get = (v) => { if (!at.has(v)) at.set(v, new Array(nMD).fill(-1)); return at.get(v); };
      let ok = true;
      for (const i of shuffle(fix.map((_, k) => k))) {
        const [u, v] = fix[i], U = get(u), V = get(v), fu = [], fv = [];
        for (let c = 0; c < nMD; c++) { if (U[c] < 0) fu.push(c); if (V[c] < 0) fv.push(c); }
        const common = fu.filter((c) => fv.includes(c));
        if (common.length) { const c = pickOf(common); col[i] = c; U[c] = i; V[c] = i; continue; }
        if (!fu.length || !fv.length) { ok = false; break; }
        const a = pickOf(fu), b = pickOf(fv);
        const chain = []; let cur = v, c = a, guard = 0, hitU = false;
        while (guard++ < 200) { const e = get(cur)[c]; if (e < 0) break; chain.push(e); const [x, y] = fix[e]; cur = x === cur ? y : x; if (cur === u) { hitU = true; break; } c = c === a ? b : a; }
        if (hitU) { ok = false; break; }
        chain.forEach((e) => { const [x, y] = fix[e], cc = col[e]; get(x)[cc] = -1; get(y)[cc] = -1; });
        chain.forEach((e) => { const [x, y] = fix[e], cc = col[e] === a ? b : a; col[e] = cc; get(x)[cc] = e; get(y)[cc] = e; });
        col[i] = a; get(u)[a] = i; get(v)[a] = i;
      }
      if (ok && col.every((c) => c >= 0)) return col;
    }
    return null;
  }
  function d0() {
    let m = Infinity;
    Object.values(state.countries).forEach((c) => { const f = c.leagues.d1 && c.leagues.d1.fixtures; if (f && f.length) m = Math.min(m, new Date(f[0].date).getTime()); });
    return isFinite(m) ? m : state.date.getTime() + 14 * DAY;
  }
  const dkey = (t) => new Date(t).toISOString().slice(0, 10);

  function buildComp(cfg, teams, start) {
    const sorted = [...teams].sort((a, b) => clubCoef(b) - clubCoef(a));
    const size = sorted.length / cfg.P, pot = {};
    sorted.forEach((id, i) => { pot[id] = Math.floor(i / size); });
    let fix = null, col = null;
    for (let t = 0; t < 60 && !col; t++) { fix = leaguePairs(sorted, cfg.P, cfg.per); col = edgeColor(fix, cfg.nMD); }
    if (!col) { fix = leaguePairs(sorted, cfg.P, cfg.per); col = fix.map((_, i) => i % cfg.nMD); }
    const dates = cfg.off.map((o) => start + (o + cfg.shift) * DAY);
    return {
      id: cfg.id, teams: sorted, pot, stage: "league", rounds: [], champion: null, done: false, seed: null,
      dates, koDates: cfg.ko.map((o) => start + (o + cfg.shift) * DAY),
      fx: fix.map((p, i) => ({ md: col[i], home: p[0], away: p[1], date: dkey(dates[col[i]]), played: false, hg: null, ag: null }))
    };
  }
  function buildEdition() {
    const eu = EU(), q = qualify(), start = d0();
    eu.comps = COMP_ORDER.map((id) => buildComp(COMPS[id], q[id], start));
    eu.stats = {}; eu.cs = {}; eu.seasonPts = {}; eu.reach = {};
    eu.deadline = start + (COMPS.ucl.ko[4] + 12) * DAY;
    eu.built = state.season.year;
    COMP_ORDER.forEach((id, k) => { eu.reach[id] = {}; eu.comps[k].teams.forEach((t) => { eu.reach[id][t] = "league"; }); });
    // clubs fantômes : stars de la saison
    eu.comps.forEach((c) => c.teams.forEach((t) => { if (isGhost(t)) ghostStars(t); }));
    notifyUser();
  }
  function notifyUser() {
    const eu = EU(); if (!eu.comps || eu.notified === eu.built || !(state.userClubIds || []).length) return;
    eu.notified = eu.built;
    (state.userClubIds || []).forEach((uid) => {
      eu.comps.forEach((c, k) => {
        if (!c.teams.includes(uid)) return;
        const cfg = COMPS[c.id], name = nameOf(uid);
        note(`${name} est qualifié pour la ${cfg.name} (pot ${c.pot[uid] + 1}).`);
        const opp = c.fx.filter((f) => f.home === uid || f.away === uid).sort((x, y) => x.md - y.md);
        mail("match", "UEFA", `Tirage de la ${cfg.name} : ${name}`, `<p>${esc(name)} est dans le <b>pot ${c.pot[uid] + 1}</b> de la ${esc(cfg.name)}.</p><table><tr><th>Journée</th><th>Rencontre</th><th>Date</th></tr>${opp.map((f) => `<tr><td>${f.md + 1}</td><td>${f.home === uid ? "<b>" + esc(nameOf(f.home)) + "</b>" : esc(nameOf(f.home))} – ${f.away === uid ? "<b>" + esc(nameOf(f.away)) + "</b>" : esc(nameOf(f.away))}</td><td>${esc(fmtDate(new Date(f.date)))}</td></tr>`).join("")}</table>`);
      });
    });
  }

  // ---------------------------------------------------------------
  // SIMULATION
  // ---------------------------------------------------------------
  function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L && k < 12); return k - 1; }
  function simScore(a, b, neutral) {
    const d = strengthOf(a) - strengthOf(b);
    return [poisson(clamp(1.3 + d / 26 + (neutral ? 0 : 0.2), 0.2, 4.2)), poisson(clamp(1.1 - d / 26 - (neutral ? 0 : 0.05), 0.2, 4.2))];
  }
  function playersFor(id) {
    if (isGhost(id)) return ghostStars(id).map((s, i) => ({ key: ghostKey(id, i), name: s.name, pos: s.pos, ovr: s.ovr, age: s.age, ref: s }));
    const c = clubOf(id), today = state.date.toISOString().slice(0, 10);
    return c.players.filter((p) => !(p.onLoan && p.onLoan.fromClubId === c.id) && !(p.injuredUntil && p.injuredUntil >= today) && !(p.suspendedMatches > 0)).sort((x, y) => y.overall - x.overall).slice(0, 16).map((p) => ({ key: "p" + p.id, name: p.firstName + " " + p.lastName, pos: p.position, ovr: p.overall, age: p.age, ref: null, pid: p.id }));
  }
  function wpick(list, wf) {
    const ws = list.map(wf), t = sum(ws); if (t <= 0) return null;
    let r = Math.random() * t; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[0];
  }
  function stat(p, id, comp) {
    const eu = EU();
    return (eu.stats[p.key] || (eu.stats[p.key] = { k: p.key, name: p.name, club: nameOf(id), cid: id, pos: p.pos, age: p.age, ovr: p.ovr, g: 0, a: 0, c: { ucl: [0, 0], uel: [0, 0], uecl: [0, 0] } }));
  }
  function scoreGoals(id, n, comp) {
    if (!n) return;
    const L = playersFor(id); if (!L.length) return;
    for (let i = 0; i < n; i++) {
      if (isGhost(id) && Math.random() < 0.5) continue; // une partie des buts revient à des joueurs non suivis
      const s = wpick(L, (p) => ({ ATT: 6, MIL: 2.3, DEF: 0.5, GB: 0 }[p.pos] || 0) * Math.pow(p.ovr / 60, 3));
      if (!s) continue;
      const st = stat(s, id, comp); st.g++; st.c[comp][0]++;
      if (Math.random() < 0.72) {
        const as = wpick(L.filter((p) => p.key !== s.key), (p) => ({ ATT: 2.2, MIL: 3.5, DEF: 1, GB: 0.02 }[p.pos] || 0) * Math.pow(p.ovr / 60, 2));
        if (as) { const sa = stat(as, id, comp); sa.a++; sa.c[comp][1]++; }
      }
    }
  }
  function award(id, amount) { if (!isGhost(id) && amount > 0) { const c = clubOf(id); if (c) c.monthlyOtherIncome = (c.monthlyOtherIncome || 0) + amount; } }
  function addPts(id, v) { EU().seasonPts[id] = (EU().seasonPts[id] || 0) + v; }
  function reach(comp, id, stage) {
    const eu = EU(), cur = eu.reach[comp.id][id];
    if (STAGES.indexOf(stage) <= STAGES.indexOf(cur)) return;
    eu.reach[comp.id][id] = stage;
    const cfg = COMPS[comp.id], k = STAGES.indexOf(stage);
    if (k >= 2 && k <= 5) { addPts(id, cfg.stageK); award(id, cfg.stagePrize[k - 1]); }
    if (stage === "winner") award(id, cfg.champ);
  }
  function afterMatch(comp, m, label, neutral) {
    const cfg = COMPS[comp.id], eu = EU();
    scoreGoals(m.home, m.hg, comp.id); scoreGoals(m.away, m.ag, comp.id);
    if (m.ag === 0) eu.cs[m.home] = (eu.cs[m.home] || 0) + 1;
    if (m.hg === 0) eu.cs[m.away] = (eu.cs[m.away] || 0) + 1;
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(([id, f, a]) => {
      if (f > a) { addPts(id, cfg.pts[0]); award(id, cfg.win); } else if (f === a) { addPts(id, cfg.pts[1]); award(id, cfg.draw); }
    });
    [m.home, m.away].forEach((id) => {
      if (!(state.userClubIds || []).includes(id)) return;
      const t = `${cfg.name}${label ? " (" + label + ")" : ""} : ${nameOf(m.home)} ${m.hg}-${m.ag} ${nameOf(m.away)}`;
      note(t);
      if (id === state.userClubId) state.lastCupResult = { cupLabel: `${cfg.name}${label ? " — " + label : ""}`, homeName: nameOf(m.home), awayName: nameOf(m.away), homeGoals: m.hg, awayGoals: m.ag, isHome: m.home === id, penalties: !!m.pens, won: m.hg === m.ag ? !!m.pensWin : (id === m.home ? m.hg > m.ag : m.ag > m.hg) };
    });
  }
  function playMatch(comp, m, label, neutral) {
    const [h, a] = simScore(m.home, m.away, neutral);
    m.hg = h; m.ag = a; m.played = true;
    afterMatch(comp, m, label, neutral);
  }
  function table(comp) {
    const T = {}; comp.teams.forEach((t) => { T[t] = { id: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    comp.fx.forEach((f) => {
      if (!f.played) return;
      const H = T[f.home], Aw = T[f.away]; H.p++; Aw.p++; H.gf += f.hg; H.ga += f.ag; Aw.gf += f.ag; Aw.ga += f.hg;
      if (f.hg > f.ag) { H.w++; H.pts += 3; Aw.l++; } else if (f.hg < f.ag) { Aw.w++; Aw.pts += 3; H.l++; } else { H.d++; Aw.d++; H.pts++; Aw.pts++; }
    });
    return Object.values(T).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || clubCoef(b.id) - clubCoef(a.id));
  }
  function mkTie(a, b, dates, single) {
    return { a, b, legs: (single ? [[a, b]] : [[a, b], [b, a]]).map((p, i) => ({ home: p[0], away: p[1], date: dkey(dates[i]), played: false, hg: null, ag: null })), w: null, pen: false, agg: null };
  }
  function resolveTie(comp, t, label) {
    if (t.w != null) return;
    if (!t.legs.every((l) => l.played)) return;
    let ga = 0, gb = 0; t.legs.forEach((l) => { if (l.home === t.a) { ga += l.hg; gb += l.ag; } else { gb += l.hg; ga += l.ag; } });
    t.agg = [ga, gb];
    if (ga !== gb) t.w = ga > gb ? t.a : t.b;
    else { t.pen = true; const pa = clamp(0.5 + (strengthOf(t.a) - strengthOf(t.b)) / 120, 0.35, 0.65); t.w = Math.random() < pa ? t.a : t.b; const last = t.legs[t.legs.length - 1]; last.pens = true; last.pensWin = (t.w === last.home) ; }
  }
  function progress(comp) {
    const eu = EU(), cfg = COMPS[comp.id];
    if (comp.done) return;
    if (comp.stage === "league" && comp.fx.every((f) => f.played)) {
      const tb = table(comp); comp.seed = tb.map((r) => r.id);
      tb.forEach((r, i) => { addPts(r.id, (37 - (i + 1)) / 36 * cfg.rankK); });
      comp.seed.slice(0, 8).forEach((id) => reach(comp, id, "r16"));
      comp.seed.slice(8, 24).forEach((id) => reach(comp, id, "po"));
      const ties = []; for (let i = 0; i < 8; i++) ties.push(mkTie(comp.seed[23 - i], comp.seed[8 + i], comp.koDates.slice(0, 1).map((t) => t - 0).concat([comp.koDates[0] + 7 * DAY])));
      comp.rounds.push({ key: "po", label: "Barrages", ties }); comp.stage = "po";
      (state.userClubIds || []).forEach((u) => { const i = comp.seed.indexOf(u); if (i >= 0) { const nm = nameOf(u); note(`${cfg.name} : ${nm} termine la phase de ligue ${i + 1}ᵉ${i < 8 ? " — qualifié directement pour les huitièmes !" : i < 24 ? " — barrages." : " — éliminé."}`); } });
    }
    const cur = comp.rounds[comp.rounds.length - 1];
    if (cur && cur.ties.every((t) => { resolveTie(comp, t); return t.w != null; }) && comp.stage !== "league") {
      const winners = cur.ties.map((t) => t.w), losers = cur.ties.map((t) => (t.w === t.a ? t.b : t.a));
      if (cur.key === "po") {
        const seed = comp.seed, W = winners; // ties[i] : seed 9+i (b) contre seed 24-i (a)
        const order = [[0, 0], [7, 7], [3, 3], [4, 4], [1, 1], [6, 6], [2, 2], [5, 5]]; // [têtes de série, tie]
        const ties = order.map(([s, t]) => mkTie(W[t], seed[s], [comp.koDates[1], comp.koDates[1] + 7 * DAY]));
        comp.rounds.push({ key: "r16", label: "Huitièmes de finale", ties }); comp.stage = "r16";
        W.forEach((id) => reach(comp, id, "r16"));
      } else if (cur.key === "final") {
        comp.champion = winners[0]; comp.done = true; comp.stage = "winner"; reach(comp, winners[0], "winner"); reach(comp, losers[0], "final");
        const nm = nameOf(winners[0]); news(`${nm} remporte la ${cfg.name} !`);
        if (!isGhost(winners[0])) { const c = clubOf(winners[0]); if (c) { c.trophies = c.trophies || []; c.trophies.unshift({ year: state.season.year, competition: cfg.name }); } }
        if ((state.userClubIds || []).includes(winners[0])) note(`🏆 ${nm} remporte la ${cfg.name} !`);
      } else {
        const next = { r16: ["qf", "Quarts de finale", 2], qf: ["sf", "Demi-finales", 3], sf: ["final", "Finale", 4] }[cur.key];
        const ties = [];
        for (let i = 0; i < winners.length; i += 2) ties.push(next[0] === "final" ? mkTie(winners[i], winners[i + 1], [comp.koDates[4]], true) : mkTie(winners[i], winners[i + 1], [comp.koDates[next[2]], comp.koDates[next[2]] + 7 * DAY]));
        winners.forEach((id) => reach(comp, id, next[0]));
        comp.rounds.push({ key: next[0], label: next[1], ties }); comp.stage = next[0];
        (state.userClubIds || []).forEach((u) => { if (winners.includes(u)) note(`${cfg.name} : ${nameOf(u)} se qualifie pour les ${next[1].toLowerCase()} !`); else if (cur.ties.some((t) => t.a === u || t.b === u)) note(`${cfg.name} : ${nameOf(u)} est éliminé.`); });
      }
    }
  }
  function euroDay(key) {
    const eu = state.eu; if (!eu || !eu.comps) return;
    eu.comps.forEach((comp) => {
      if (comp.done) return;
      comp.fx.forEach((f) => { if (!f.played && f.date === key) playMatch(comp, f, `J${f.md + 1}`); });
      progress(comp);
      const r = comp.rounds[comp.rounds.length - 1];
      if (r) {
        r.ties.forEach((t) => t.legs.forEach((l, i) => {
          if (!l.played && l.date === key) { playMatch(comp, l, r.label + (t.legs.length > 1 ? (i ? " retour" : " aller") : ""), t.legs.length === 1); }
        }));
        progress(comp);
      }
    });
  }
  function finishAll() {
    const eu = state.eu; if (!eu || !eu.comps) return;
    for (let g = 0; g < 80 && !eu.comps.every((c) => c.done); g++) {
      eu.comps.forEach((comp) => {
        if (comp.done) return;
        comp.fx.forEach((f) => { if (!f.played) playMatch(comp, f, `J${f.md + 1}`); });
        progress(comp);
        const r = comp.rounds[comp.rounds.length - 1];
        if (r) { r.ties.forEach((t) => t.legs.forEach((l) => { if (!l.played) playMatch(comp, l, r.label, t.legs.length === 1); })); progress(comp); }
      });
    }
  }
  window.dsEuropeFinish = finishAll;

  // ---------------------------------------------------------------
  // ÉTOILES DOMESTIQUES (clubs fantômes) : buts et passes en championnat, par semaine
  // ---------------------------------------------------------------
  function ghostWeek() {
    const eu = state.eu; if (!eu) return;
    const t = state.date.getTime(), s0 = d0();
    if (t < s0 || t > s0 + 275 * DAY) return;
    Object.keys(eu.ghosts).forEach((id) => eu.ghosts[id].forEach((p) => {
      const q = clamp((p.ovr - 58) / 34, 0, 1);
      const gl = { ATT: 0.78, MIL: 0.26, DEF: 0.07, GB: 0 }[p.pos] * q, as = { ATT: 0.28, MIL: 0.5, DEF: 0.1, GB: 0 }[p.pos] * q;
      if (Math.random() < gl) p.dg += (Math.random() < 0.2 ? 2 : 1);
      if (Math.random() < as) p.da++;
    }));
  }

  // ---------------------------------------------------------------
  // RÉCOMPENSES
  // ---------------------------------------------------------------
  function stageScore(id) {
    const eu = EU(); let best = 0;
    COMP_ORDER.forEach((c) => { const st = eu.reach[c] && eu.reach[c][id]; if (!st) return; const k = STAGES.indexOf(st); const w = c === "ucl" ? 1 : c === "uel" ? 0.55 : 0.3; best = Math.max(best, [0, 0, 1, 2.5, 5, 9, 16][k] * w); });
    return best;
  }
  function domesticChamp(id) {
    if (isGhost(id)) return (EU().domChamp || {})[id] ? 1 : 0;
    const c = clubOf(id); if (!c) return 0;
    const lg = state.countries[c.countryKey] && state.countries[c.countryKey].leagues.d1; if (!lg || !lg.clubs.length) return 0;
    const top = [...lg.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga))[0];
    return top.id === id && top.played > 3 ? 1 : 0;
  }
  function candidates() {
    const eu = EU(), out = [];
    // joueurs des pays suivis (élite uniquement)
    Object.keys(state.countries).forEach((ck) => {
      const lg = state.countries[ck].leagues.d1; if (!lg) return;
      lg.clubs.forEach((c) => c.players.forEach((p) => {
        const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 }, e = eu.stats["p" + p.id];
        if (p.overall < (p.age <= 21 ? 56 : 66) && !(e && e.g)) return;
        out.push({ key: "p" + p.id, pid: p.id, name: p.firstName + " " + p.lastName, club: c.name, cid: c.id, pos: p.position, age: p.age, ovr: p.overall, pot: p.potential, dg: st.goals, da: st.assists, eg: e ? e.g : 0, ea: e ? e.a : 0, apps: st.matches, mine: (state.userClubIds || []).includes(c.id) });
      }));
    });
    Object.keys(eu.ghosts).forEach((id) => eu.ghosts[id].forEach((s, i) => {
      const e = eu.stats[ghostKey(id, i)];
      out.push({ key: ghostKey(id, i), name: s.name, club: nameOf(id), cid: id, pos: s.pos, age: s.age, ovr: s.ovr, pot: s.pot || s.ovr, dg: s.dg, da: s.da, eg: e ? e.g : 0, ea: e ? e.a : 0, apps: 0, ghost: true });
    }));
    // joueurs des pays suivis hors du top 5 de leur club ayant joué en Europe sont déjà inclus ; stars européennes des clubs suivis en Europe
    return out;
  }
  function ballonScore(c) {
    const team = stageScore(c.cid) + domesticChamp(c.cid) * 5;
    return c.ovr * 0.55 + c.dg * 0.8 + c.da * 0.45 + c.eg * 1.5 + c.ea * 0.8 + team;
  }
  function liveAwards() {
    const eu = EU(), C = candidates();
    const top = (arr, f, n) => arr.map((c) => ({ c, s: f(c) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n);
    const coachRows = [];
    const ids = new Set(); COMP_ORDER.forEach((k) => { if (eu.reach[k]) Object.keys(eu.reach[k]).forEach((id) => ids.add(isNaN(+id) ? id : +id)); });
    Object.keys(state.countries).forEach((ck) => { const lg = state.countries[ck].leagues.d1; if (lg) lg.clubs.forEach((c) => ids.add(c.id)); });
    ids.forEach((id) => {
      const c = isGhost(id) ? null : clubOf(id);
      const dom = c && c.played > 0 ? (c.points / (c.played * 3)) : 0;
      const exp = c ? clamp(0.25 + c.reputation / 130, 0.3, 0.95) : 0;
      const s = stageScore(id) * 1.2 + domesticChamp(id) * 6 + (c ? (dom - exp) * 14 + dom * 5 : 0);
      if (s > 0) coachRows.push({ id, s });
    });
    const coaches = coachRows.sort((a, b) => b.s - a.s).slice(0, 5).map((r) => ({ id: r.id, name: coachName(r.id), club: nameOf(r.id), s: r.s }));
    const keepers = C.filter((c) => c.pos === "GB").map((c) => ({ c, s: c.ovr * 0.7 + (eu.cs[c.cid] || 0) * 1.8 + stageScore(c.cid) * 0.6 })).sort((a, b) => b.s - a.s).slice(0, 5);
    return {
      ballon: top(C, ballonScore, 10),
      golden: top(C.filter((c) => c.age <= 21), (c) => ballonScore(c) * 0.9 + (c.pot - c.ovr) * 0.2, 5),
      scorer: top(C, (c) => c.dg + c.eg, 10),
      assist: top(C, (c) => c.da + c.ea, 10),
      uclscorer: Object.values(eu.stats).filter((s) => s.c.ucl[0] > 0).sort((a, b) => b.c.ucl[0] - a.c.ucl[0] || b.c.ucl[1] - a.c.ucl[1]).slice(0, 10),
      coach: coaches, keeper: keepers
    };
  }
  function coachName(id) {
    const eu = EU(); if (eu.coaches[id]) return eu.coaches[id];
    const a = assocOfClub(id), pk = a ? AK[a].pool : "en", pool = (typeof NAME_POOLS !== "undefined" && NAME_POOLS[pk]) || NAME_POOLS.en;
    return (eu.coaches[id] = pickOf(pool.first) + " " + pickOf(pool.last));
  }

  // ---------------------------------------------------------------
  // FIN DE SAISON
  // ---------------------------------------------------------------
  function closeSeason() {
    const eu = state.eu; if (!eu || !eu.comps) return;
    finishAll();
    // classements domestiques de la saison
    const ranks = {}, cups = {};
    Object.keys(state.countries).forEach((ck) => {
      const d1 = state.countries[ck].leagues.d1; if (!d1) return;
      ranks[ck] = [...d1.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga)).map((c) => c.id);
      const cp = state.cups && state.cups.national && state.cups.national[ck]; cups[ck] = cp && cp.champion ? cp.champion : null;
    });
    eu.domChamp = {};
    A.forEach((a) => { if (a.gk && state.countries[a.gk]) return; const g = ghostClubs(a); const dom = g.map((id) => ({ id, s: eu.clubs[id].rating + rnd(-5, 5) })).sort((x, y) => y.s - x.s); eu.domChamp[dom[0].id] = 1; });
    // récompenses
    const lv = liveAwards();
    const fmtC = (x) => ({ name: x.c.name, club: x.c.club, pos: x.c.pos, age: x.c.age, dg: x.c.dg, da: x.c.da, eg: x.c.eg, ea: x.c.ea, ovr: x.c.ovr, s: r1(x.s), mine: !!x.c.mine, pid: x.c.pid || null });
    const hist = { season: state.season.year, ballon: lv.ballon.slice(0, 5).map(fmtC), golden: lv.golden.slice(0, 3).map(fmtC), scorer: lv.scorer.slice(0, 3).map(fmtC), assist: lv.assist.slice(0, 3).map(fmtC), keeper: lv.keeper.slice(0, 1).map(fmtC), coach: lv.coach.slice(0, 3), winners: eu.comps.map((c) => ({ id: c.id, name: nameOf(c.champion) })), dom: Object.keys(ranks).map((ck) => ({ country: COUNTRIES[ck].label, name: nameOf(ranks[ck][0]) })) };
    eu.history.unshift(hist); if (eu.history.length > 20) eu.history.length = 20;
    const W = (label, x) => { if (!x) return; news(`${label} : ${x.name} (${x.club})`); const own = x.mine; if (own) note(`🏅 ${label} : ${x.name} (votre club) !`); if (x.pid) { const p = getPlayer(x.pid); if (p) { p.awards = p.awards || []; p.awards.unshift({ year: state.season.year, name: label }); p.value = Math.round(p.value * 1.06); } } };
    W("Ballon d'or", hist.ballon[0]); W("Golden Boy", hist.golden[0]); W("Soulier d'or européen", hist.scorer[0]); W("Meilleur passeur européen", hist.assist[0]); W("Meilleur gardien", hist.keeper[0]);
    if (hist.coach[0]) news(`Meilleur entraîneur : ${hist.coach[0].name} (${hist.coach[0].club})`);
    mail("club", "Presse européenne", `Récompenses de la saison ${state.season.year}`, awardsMailHTML(hist));
    // coefficients : points de la saison par club et par association
    const parts = {};
    Object.keys(eu.seasonPts).forEach((id) => { const a = assocOfClub(isNaN(+id) ? id : +id); if (a) { (parts[a] = parts[a] || []).push(eu.seasonPts[id]); } });
    Object.keys(eu.clubs).forEach((id) => { const info = eu.clubs[id]; info.hist.push(r2(eu.seasonPts[id] || eu.seasonPts[+id] || 0)); if (info.hist.length > 5) info.hist.shift(); });
    A.forEach((a) => { const arr = parts[a.key] || []; const v = arr.length ? sum(arr) / arr.length : 0; const h = eu.assoc[a.key].hist; h.push(r2(v)); if (h.length > 5) h.shift(); });
    // places de performance européenne : les deux meilleures moyennes de la saison
    const top10 = rankedAssocs().slice(0, 10).map((x) => x.a.key);
    const avg = A.filter((a) => top10.includes(a.key)).map((a) => ({ k: a.key, v: (parts[a.key] || []).length ? sum(parts[a.key]) / parts[a.key].length : 0 })).sort((x, y) => y.v - x.v);
    eu.eps = avg.slice(0, 2).map((x) => x.k);
    // clubs fantômes : évolution du niveau
    Object.values(eu.clubs).forEach((g) => { if (g.ghost) g.rating = clamp(g.rating + rnd(-1.6, 1.6) + ((eu.seasonPts[g.id] || 0) - 6) * 0.08, 46, 86); });
    eu.pendingRanks = ranks; eu.lastCup = cups; eu.ghosts = {}; eu.coaches = {};
    eu.comps = null;
  }
  function awardsMailHTML(h) {
    const row = (l, x) => x ? `<tr><td>${l}</td><td><b>${esc(x.name)}</b> (${esc(x.club)})</td></tr>` : "";
    return `<table>${row("Ballon d'or", h.ballon[0])}${row("Golden Boy", h.golden[0])}${row("Soulier d'or européen", h.scorer[0])}${row("Meilleur passeur", h.assist[0])}${row("Meilleur gardien", h.keeper[0])}${h.coach[0] ? `<tr><td>Meilleur entraîneur</td><td><b>${esc(h.coach[0].name)}</b> (${esc(h.coach[0].club)})</td></tr>` : ""}${h.winners.map((w) => `<tr><td>${esc(COMPS[w.id].name)}</td><td>${esc(w.name)}</td></tr>`).join("")}</table>`;
  }

  // ---------------------------------------------------------------
  // BRANCHEMENT SUR LE JEU
  // ---------------------------------------------------------------
  const origSetup = window.setupCups;
  window.setupCups = function () {
    origSetup.apply(this, arguments);
    try { state.cups.continental = null; state.cups.europa = null; buildEdition(); } catch (e) { console.error("europe", e); }
  };
  const origRoll = window.seasonRollover;
  window.seasonRollover = function () {
    try { closeSeason(); } catch (e) { console.error("fin de saison européenne", e); }
    return origRoll.apply(this, arguments);
  };
  function userAlive(comp) {
    if (comp.done) return false;
    const ids = state.userClubIds || [];
    if (comp.stage === "league") return ids.some((u) => comp.teams.includes(u));
    const r = comp.rounds[comp.rounds.length - 1];
    return !!r && r.ties.some((t) => ids.includes(t.a) || ids.includes(t.b));
  }
  const origComplete = window.allLeaguesComplete;
  window.allLeaguesComplete = function () {
    const r = origComplete.apply(this, arguments);
    if (!r) return r;
    const eu = state && state.eu;
    if (eu && eu.comps && state.date.getTime() < eu.deadline && eu.comps.some((c) => userAlive(c))) return false;
    return r;
  };
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    // anciennes sauvegardes : on construit l'édition si la phase de ligue n'a pas encore commencé
    try {
      const eu = EU();
      if (!eu.comps && eu.built !== state.season.year && state.date.getTime() < d0() + 70 * DAY) buildEdition();
      else if (!eu.comps) eu.built = state.season.year;
    } catch (e) { console.error(e); }
    try { notifyUser(); } catch (e) {}
    const r = origAdv.apply(this, arguments);
    try { euroDay(state.date.toISOString().slice(0, 10)); if (state.dayCounter % 7 === 0) ghostWeek(); state.seasonComplete = allLeaguesComplete(); } catch (e) { console.error("europe", e); }
    return r;
  };
  window.dsEurope = { COMPS, A, EU, qualify, buildEdition, buildComp, table, liveAwards, closeSeason, rankedAssocs, slotsFor, userAlive, notifyUser, clubCoef, assocSum, nameOf, STAGES, STAGE_LABEL, edgeColor, leaguePairs, finishAll, euroDay, strengthOf, ghostClubs };
  // l'interface est dans europe-ui.js
})();
