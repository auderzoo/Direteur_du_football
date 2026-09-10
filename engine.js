/* ============================================================
   ENGINE.JS — Logique du jeu (génération, valorisation, mercato)
   ============================================================ */

const POSITIONS = [
  { code: "GB",  label: "Gardien",     share: 3 },
  { code: "DEF", label: "Défenseur",   share: 7 },
  { code: "MIL", label: "Milieu",      share: 7 },
  { code: "ATT", label: "Attaquant",   share: 5 }
];

let UID = 1;
function nextId() { return UID++; }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function gaussianAround(mean, spread) {
  // approximation gaussienne simple (somme de 3 uniformes)
  const r = (Math.random() + Math.random() + Math.random()) / 3;
  return mean + (r - 0.5) * 2 * spread;
}

// ---- Génération d'un joueur ----
function generatePlayer(countryKey, positionCode, tierFactor) {
  const country = COUNTRIES[countryKey];
  const pool = NAME_POOLS[country.pool];
  const first = pick(pool.first);
  const last = pick(pool.last);
  const age = randInt(17, 34);

  // niveau de base influencé par le "tierFactor" du club (1 = élite, 0 = petit club amateur-pro)
  const baseOverall = clamp(Math.round(gaussianAround(48 + tierFactor * 34, 10)), 38, 92);
  // potentiel : plus haut si jeune
  const potentialBonus = age < 21 ? randInt(0, 14) : age < 25 ? randInt(0, 6) : 0;
  const potential = clamp(baseOverall + potentialBonus, baseOverall, 94);

  const player = {
    id: nextId(),
    firstName: first,
    lastName: last,
    nationality: country.label,
    age,
    position: positionCode,
    overall: baseOverall,
    potential,
    form: randInt(-5, 5),
    contractEndYear: null, // fixé lors de l'affectation au club
    value: 0,
    wage: 0,
    listed: false,
    morale: randInt(55, 85),
    yellowCards: 0,
    suspendedMatches: 0,
    releaseClause: Math.random() < 0.2 ? null : null, // placeholder, fixé plus bas une fois la valeur connue
    seasonStats: { matches: 0, goals: 0, assists: 0 },
    history: []
  };
  player.value = computeValue(player);
  player.wage = Math.round(player.value * 0.011 / 500) * 500; // salaire MENSUEL estimé
  player.wage = Math.max(800, player.wage);
  // clause libératoire : environ 1 joueur sur 5 en possède une
  player.releaseClause = Math.random() < 0.2 ? Math.round(player.value * randInt(115, 180) / 100 / 5000) * 5000 : null;
  // agent : nom + commission
  player.agent = { name: pick(AGENT_NAMES), agency: pick(AGENCIES), commissionPct: randInt(3, 8) };
  // attributs de scouting façon "Football Manager" (1 à 20)
  player.attributes = generateAttributes(player);
  return player;
}

// ---- Attributs détaillés (rapport de scouting, échelle 1-20, 20 attributs façon FM) ----
function generateAttributes(player) {
  const base = clamp(Math.round(player.overall / 5), 1, 20);
  const pos = player.position;
  function attr(bias) { return clamp(base + bias + randInt(-2, 2), 1, 20); }
  return {
    vitesse:      attr(pos === "ATT" ? 2 : pos === "DEF" ? 0 : pos === "GB" ? -4 : 1),
    acceleration: attr(pos === "ATT" ? 2 : pos === "MIL" ? 1 : pos === "GB" ? -4 : 0),
    tir:          attr(pos === "ATT" ? 3 : pos === "MIL" ? 1 : pos === "GB" ? -7 : -3),
    passe:        attr(pos === "MIL" ? 3 : pos === "GB" ? -4 : pos === "DEF" ? 0 : 1),
    dribble:      attr(pos === "ATT" ? 2 : pos === "MIL" ? 2 : pos === "GB" ? -6 : -1),
    tacle:        attr(pos === "DEF" ? 3 : pos === "GB" ? -5 : pos === "MIL" ? 0 : -3),
    placement:    attr(pos === "DEF" ? 2 : pos === "GB" ? 2 : 0),
    physique:     attr(pos === "DEF" ? 1 : pos === "GB" ? 0 : 0),
    endurance:    attr(pos === "MIL" ? 2 : pos === "GB" ? -2 : 0),
    puissance:    attr(pos === "DEF" ? 1 : pos === "ATT" ? 1 : 0),
    jeuDeTete:    attr(pos === "DEF" ? 2 : pos === "ATT" ? 1 : pos === "GB" ? -3 : -2),
    technique:    attr(pos === "MIL" ? 2 : pos === "ATT" ? 1 : pos === "GB" ? -3 : -1),
    vision:       attr(pos === "MIL" ? 3 : pos === "GB" ? -3 : 0),
    decision:     attr(pos === "MIL" ? 1 : 0),
    concentration:attr(pos === "DEF" ? 1 : pos === "GB" ? 2 : 0),
    leadership:   attr(player.age >= 27 ? 1 : -1),
    agressivite:  attr(pos === "DEF" ? 1 : pos === "GB" ? -2 : 0),
    sangFroid:    attr(pos === "ATT" ? 2 : pos === "GB" ? 1 : 0),
    reflexes:     attr(pos === "GB" ? 4 : pos === "DEF" ? -6 : -8),
    relance:      attr(pos === "GB" ? 3 : pos === "DEF" ? -4 : -8)
  };
}

// ---- Rapport de scouting : précision dépendante du niveau "Scouting" du DS ----
function scoutedAttributes(player) {
  const level = (state && state.ds && state.ds.skills) ? (state.ds.skills.scouting || 0) : 0;
  const noise = level >= 3 ? 0 : level === 2 ? 1 : level === 1 ? 2 : 3;
  const out = {};
  Object.entries(player.attributes).forEach(([k, v]) => {
    if (noise === 0) { out[k] = { value: v, approx: false }; }
    else { out[k] = { value: clamp(v + randInt(-noise, noise), 1, 20), approx: true }; }
  });
  return out;
}

// ---- Valorisation réaliste (formule maison, pas de base de données réelle) ----
function computeValue(player) {
  const ov = player.overall;
  if (ov <= 40) return Math.round(20000 + ov * 2000);
  // Courbe cubique douce au-delà de 40 de note globale
  let base = Math.pow(Math.max(0, ov - 40), 2.85) * 900;

  // facteur d'âge : pic vers 25-27 ans
  let ageFactor;
  if (player.age <= 21) ageFactor = 0.85 + (21 - player.age) * 0.02;
  else if (player.age <= 27) ageFactor = 1.0 + (27 - player.age) * 0.03;
  else if (player.age <= 31) ageFactor = 1.0 - (player.age - 27) * 0.09;
  else ageFactor = Math.max(0.08, 0.64 - (player.age - 31) * 0.14);

  // potentiel non encore atteint = prime de valeur pour les jeunes
  const potentialFactor = 1 + Math.max(0, (player.potential - ov)) * 0.015;

  // facteur de poste (attaquants et milieux offensifs se négocient un peu plus cher à niveau égal)
  const posFactor = player.position === "ATT" ? 1.15 : player.position === "MIL" ? 1.05 : player.position === "GB" ? 0.85 : 1.0;

  let value = base * ageFactor * potentialFactor * posFactor;
  value = Math.max(25000, Math.round(value / 5000) * 5000);
  return value;
}

// ---- Génération d'un club ----
function generateClub(countryKey, divisionTier, cityPool, isUserClub, fixedName, rankIndex, poolSize) {
  const country = COUNTRIES[countryKey];
  const city = cityPool.length ? cityPool.shift() : `Ville-${randInt(100, 999)}`;
  let name = fixedName;
  if (!name) {
    const templateFn = CLUB_TEMPLATES[country.template] || CLUB_TEMPLATES.en;
    name = templateFn(city);
  }

  // tierFactor : basé sur le rang connu si division 1 avec pool fixe, sinon aléatoire
  let tierFactor;
  if (fixedName && typeof rankIndex === "number") {
    tierFactor = clamp(0.9 - rankIndex * (0.4 / Math.max(1, poolSize - 1)) + gaussianAround(0, 0.03), 0.35, 0.95);
  } else {
    const tierBase = divisionTier === 1 ? 0.55 : 0.35;
    tierFactor = clamp(gaussianAround(tierBase, 0.12), 0.15, 0.9);
  }

  const club = {
    id: nextId(),
    name,
    city,
    countryKey,
    division: divisionTier,
    tierFactor,
    reputation: Math.round(tierFactor * 100),
    budget: Math.round((tierFactor ** 2) * 60_000_000 + randInt(200000, 2_000_000)),
    wageBudgetMonthly: Math.round((tierFactor ** 2) * 12_000_000 + randInt(80000, 400000)),
    sponsorIncome: Math.round((tierFactor ** 2) * 6_000_000 + randInt(100000, 400000)),
    stadiumCapacity: Math.round(6000 + tierFactor * 55000 + randInt(-1500, 1500)),
    monthlyTransferNet: 0,
    monthlyOtherIncome: 0,
    homeMatchesThisMonth: 0,
    financeHistory: [],
    isUserClub: !!isUserClub,
    players: [],
    points: 0, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0
  };

  let squadPlan = [];
  POSITIONS.forEach(p => { for (let i = 0; i < p.share; i++) squadPlan.push(p.code); });
  club.players = squadPlan.map(code => {
    const pl = generatePlayer(countryKey, code, tierFactor);
    pl.clubId = club.id;
    pl.contractEndYear = new Date(state.date).getFullYear() + randInt(1, 4);
    return pl;
  });
  club.wageBill = club.players.reduce((s, p) => s + p.wage, 0);

  return club;
}

// ---- Génération complète d'un pays (2 divisions) ----
function generateCountry(countryKey) {
  const cities = [...CITIES[countryKey]];
  cities.sort(() => Math.random() - 0.5);
  const namesD1 = CLUB_POOLS_D1[countryKey] || [];
  const div1Count = namesD1.length || 10;
  const div2Count = 10;
  const div1 = [];
  const div2 = [];
  for (let i = 0; i < div1Count; i++) {
    div1.push(generateClub(countryKey, 1, cities, false, namesD1[i], i, div1Count));
  }
  for (let i = 0; i < div2Count; i++) div2.push(generateClub(countryKey, 2, cities, false));

  const names = LEAGUE_NAMES[countryKey] || { d1: "Division Élite", d2: "Division Nationale" };
  const country = {
    key: countryKey,
    label: COUNTRIES[countryKey].label,
    leagues: {
      d1: { name: `${names.d1} (${COUNTRIES[countryKey].label})`, tier: 1, clubs: div1, fixtures: [] },
      d2: { name: `${names.d2} (${COUNTRIES[countryKey].label})`, tier: 2, clubs: div2, fixtures: [] }
    }
  };
  return country;
}

// ---- Génération du calendrier de championnat (aller-retour) ----
function roundRobinRounds(ids) {
  let teams = [...ids];
  if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const roundPairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i], b = teams[n - 1 - i];
      if (a !== null && b !== null) roundPairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(roundPairs);
    teams.splice(1, 0, teams.pop());
  }
  return rounds;
}

function generateFixtures(league, seasonStartDate) {
  const ids = league.clubs.map(c => c.id);
  const half1 = roundRobinRounds(ids);
  const half2 = half1.map(round => round.map(([a, b]) => [b, a]));
  const allRounds = half1.concat(half2);
  league.fixtures = allRounds.map((pairs, i) => ({
    date: new Date(seasonStartDate.getTime() + i * 7 * 24 * 3600 * 1000).toISOString(),
    matches: pairs.map(([home, away]) => ({ home, away, played: false, homeGoals: null, awayGoals: null }))
  }));
}

function generateAllFixtures() {
  const seasonStart = new Date(state.date.getTime() + 14 * 24 * 3600 * 1000);
  Object.values(state.countries).forEach(country => {
    generateFixtures(country.leagues.d1, seasonStart);
    generateFixtures(country.leagues.d2, seasonStart);
  });
}

function allLeaguesComplete() {
  return Object.values(state.countries).every(country =>
    [country.leagues.d1, country.leagues.d2].every(league =>
      league.fixtures.length > 0 && league.fixtures.every(round => round.matches.every(m => m.played))
    )
  );
}

function seasonRollover() {
  Object.values(state.countries).forEach(country => {
    const d1sorted = [...country.leagues.d1.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
    const d2sorted = [...country.leagues.d2.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

    // évaluation de l'objectif de saison pour le club du joueur
    const uc = userClub();
    if (uc && (country.leagues.d1.clubs.includes(uc) || country.leagues.d2.clubs.includes(uc))) {
      const sortedList = uc.division === 1 ? d1sorted : d2sorted;
      const rank = sortedList.findIndex(c => c.id === uc.id) + 1;
      const success = evaluateObjective(uc, rank, sortedList.length);
      state.ds.reputation = clamp(state.ds.reputation + (success ? randInt(3, 7) : -randInt(2, 6)), 0, 100);
      if (success) {
        state.ds.failStreak = 0;
        state.ds.skillPoints = (state.ds.skillPoints || 0) + 1;
      } else {
        state.ds.failStreak = (state.ds.failStreak || 0) + 1;
      }
      state.log.unshift({
        date: fmtDate(state.date),
        text: `Bilan de saison : ${rank}ᵉ place — objectif "${uc.objectiveLabel}" ${success ? "atteint" : "manqué"} (réputation DS : ${state.ds.reputation}).`
      });
      if (state.ds.failStreak >= 2) {
        state.ds.fired = true;
        uc.isUserClub = false;
        state.userClubId = null;
        const text = `${state.ds.name} est démis de ses fonctions après deux saisons sans objectif atteint.`;
        state.news.unshift({ date: fmtDate(state.date), text });
        state.log.unshift({ date: fmtDate(state.date), text });
      }
    }

    // primes de classement de fin de saison
    d1sorted.forEach((c, i) => {
      const prize = Math.round(3_000_000 * (d1sorted.length - i) / d1sorted.length);
      c.budget += prize;
      if (c.id === state.userClubId) state.log.unshift({ date: fmtDate(state.date), text: `Fin de saison : ${i + 1}ᵉ place, prime de classement ${fmtMoney(prize)}.` });
    });
    d2sorted.forEach((c, i) => {
      const prize = Math.round(1_100_000 * (d2sorted.length - i) / d2sorted.length);
      c.budget += prize;
      if (c.id === state.userClubId) state.log.unshift({ date: fmtDate(state.date), text: `Fin de saison : ${i + 1}ᵉ place, prime de classement ${fmtMoney(prize)}.` });
    });

    // Descente directe du dernier, montée directe du premier ; les deux places
    // suivantes se jouent en barrage (aller simple) entre D1 et D2.
    let relegatedDirect = [], promotedDirect = [], playoffLoserToD2 = [], playoffWinnerToD1 = [];
    if (d1sorted.length >= 4 && d2sorted.length >= 3) {
      relegatedDirect = d1sorted.slice(-1);
      promotedDirect = d2sorted.slice(0, 1);
      const d1Challengers = d1sorted.slice(-3, -1);   // avant-derniers de D1
      const d2Challengers = d2sorted.slice(1, 3);     // 2e et 3e de D2
      const pairs = [[d1Challengers[0], d2Challengers[1]], [d1Challengers[1], d2Challengers[0]]];
      pairs.forEach(([teamD1, teamD2]) => {
        if (!teamD1 || !teamD2) return;
        const res = simulateKnockoutMatch(teamD2, teamD1); // le club de D2 reçoit le barrage
        const d1Wins = res.winner === teamD1.id;
        const winnerName = d1Wins ? teamD1.name : teamD2.name;
        const text = `Barrage montée/descente (${country.label}) : ${teamD2.name} ${res.homeGoals} - ${res.awayGoals} ${teamD1.name}${res.penalties ? " (tab)" : ""} — ${winnerName} évoluera en Élite la saison prochaine.`;
        state.news.unshift({ date: fmtDate(state.date), text });
        if (teamD1.id === state.userClubId || teamD2.id === state.userClubId) state.log.unshift({ date: fmtDate(state.date), text });
        if (d1Wins) { playoffWinnerToD1.push(teamD1); playoffLoserToD2.push(teamD2); }
        else { playoffWinnerToD1.push(teamD2); playoffLoserToD2.push(teamD1); }
      });
      const relegated = relegatedDirect.concat(playoffLoserToD2);
      const promoted = promotedDirect.concat(playoffWinnerToD1);
      relegated.forEach(c => c.division = 2);
      promoted.forEach(c => c.division = 1);
      country.leagues.d1.clubs = d1sorted.filter(c => !relegated.includes(c)).concat(promoted);
      country.leagues.d2.clubs = d2sorted.filter(c => !promoted.includes(c)).concat(relegated);
    } else {
      // ligues trop petites pour un barrage : ancien système simple
      const relegated = d1sorted.slice(-2);
      const promoted = d2sorted.slice(0, 2);
      relegated.forEach(c => c.division = 2);
      promoted.forEach(c => c.division = 1);
      country.leagues.d1.clubs = d1sorted.slice(0, -2).concat(promoted);
      country.leagues.d2.clubs = d2sorted.slice(2).concat(relegated);
    }
    [...country.leagues.d1.clubs, ...country.leagues.d2.clubs].forEach(c => {
      c.points = 0; c.played = 0; c.won = 0; c.draw = 0; c.lost = 0; c.gf = 0; c.ga = 0;
    });
  });

  // Archivage des statistiques de la saison écoulée pour chaque joueur
  allClubs().forEach(club => {
    club.players.forEach(p => {
      const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
      p.history = p.history || [];
      p.history.unshift({
        year: state.season.year, club: club.name, overall: p.overall,
        matches: st.matches, goals: st.goals, assists: st.assists
      });
      if (p.history.length > 15) p.history.length = 15;
      p.seasonStats = { matches: 0, goals: 0, assists: 0 };
    });
  });

  generateAllFixtures();
  setupCups();
  if (userClub()) assignObjective(userClub());
  state.season.year++;
  const text = `Nouvelle saison (${state.season.year}) : championnats relancés, montées et descentes appliquées.`;
  state.news.unshift({ date: fmtDate(state.date), text });
  state.log.unshift({ date: fmtDate(state.date), text });
}

/* ============================================================
   COUPES NATIONALES ET CONTINENTALES
   ============================================================ */
function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }
function shuffleArr(a) { const arr = [...a]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function cupRoundLabel(matchCount) {
  if (matchCount === 1) return "Finale";
  if (matchCount === 2) return "Demi-finales";
  if (matchCount === 4) return "Quarts de finale";
  if (matchCount === 8) return "Huitièmes de finale";
  return "Seizièmes de finale";
}

function buildKnockout(label, clubIds, startDate) {
  const n = clubIds.length;
  if (n < 2) return null;
  const targetSize = nextPow2(n);
  const byesNeeded = targetSize - n;
  const sortedByRep = [...clubIds].sort((a, b) => getClub(b).reputation - getClub(a).reputation);
  const byeClubs = sortedByRep.slice(0, byesNeeded);
  let playing = shuffleArr(clubIds.filter(id => !byeClubs.includes(id)));
  const matches = [];
  for (let i = 0; i < playing.length; i += 2) {
    matches.push({ home: playing[i], away: playing[i + 1], played: false, homeGoals: null, awayGoals: null, winner: null });
  }
  return {
    label,
    pendingAdvancers: byeClubs,
    rounds: [{ date: startDate.toISOString(), matches }],
    champion: null
  };
}

function setupCups() {
  state.cups = { national: {}, continental: null };
  const nationalStart = new Date(state.date.getTime() + 10 * 24 * 3600 * 1000);
  Object.keys(state.countries).forEach(ck => {
    const country = state.countries[ck];
    const d1ids = country.leagues.d1.clubs.map(c => c.id);
    const d2top = [...country.leagues.d2.clubs].sort((a, b) => b.reputation - a.reputation).slice(0, 6).map(c => c.id);
    state.cups.national[ck] = buildKnockout(`Coupe Nationale (${COUNTRIES[ck].label})`, d1ids.concat(d2top), nationalStart);
  });
  const countryKeys = Object.keys(state.countries);
  if (countryKeys.length >= 2) {
    let contenders = [];
    countryKeys.forEach(ck => {
      const top = [...state.countries[ck].leagues.d1.clubs].sort((a, b) => b.reputation - a.reputation).slice(0, 2).map(c => c.id);
      contenders = contenders.concat(top);
    });
    const continentalStart = new Date(state.date.getTime() + 18 * 24 * 3600 * 1000);
    state.cups.continental = buildKnockout("Coupe Continentale", contenders, continentalStart);
  }
}

function simulateKnockoutMatch(home, away) {
  const strengthHome = clubStrength(home) + 2;
  const strengthAway = clubStrength(away);
  const diff = strengthHome - strengthAway;
  const homeGoals = Math.max(0, Math.round(gaussianAround(1.2 + diff / 42, 1.05)));
  const awayGoals = Math.max(0, Math.round(gaussianAround(1.1 - diff / 42, 1.05)));
  let winner, penalties = false;
  if (homeGoals === awayGoals) {
    penalties = true;
    const probHome = clamp(0.5 + diff * 0.01, 0.3, 0.7);
    winner = Math.random() < probHome ? home.id : away.id;
  } else {
    winner = homeGoals > awayGoals ? home.id : away.id;
  }
  return { homeGoals, awayGoals, winner, penalties };
}

function advanceCupRound(cup) {
  const current = cup.rounds[cup.rounds.length - 1];
  const winners = current.matches.map(m => m.winner);
  const nextParticipants = cup.pendingAdvancers.concat(winners);
  cup.pendingAdvancers = [];
  if (nextParticipants.length === 1) { cup.champion = nextParticipants[0]; return; }
  const shuffled = shuffleArr(nextParticipants);
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({ home: shuffled[i], away: shuffled[i + 1], played: false, homeGoals: null, awayGoals: null, winner: null });
  }
  const nextDate = new Date(new Date(current.date).getTime() + 21 * 24 * 3600 * 1000);
  cup.rounds.push({ date: nextDate.toISOString(), matches });
}

function processCupDay(cup, todayKey) {
  if (!cup || cup.champion) return;
  const round = cup.rounds[cup.rounds.length - 1];
  if (!round || round.date.slice(0, 10) !== todayKey) return;
  round.matches.forEach(m => {
    if (m.played) return;
    const home = getClub(m.home), away = getClub(m.away);
    if (!home || !away) return;
    const res = simulateKnockoutMatch(home, away);
    m.played = true; m.homeGoals = res.homeGoals; m.awayGoals = res.awayGoals; m.winner = res.winner;
    if (home.id === state.userClubId || away.id === state.userClubId) {
      state.lastCupResult = {
        cupLabel: cupRoundLabel(round.matches.length) + " — " + cup.label,
        homeName: home.name, awayName: away.name, homeGoals: res.homeGoals, awayGoals: res.awayGoals,
        isHome: home.id === state.userClubId, penalties: res.penalties, won: res.winner === state.userClubId
      };
      state.log.unshift({ date: fmtDate(state.date), text: `${cup.label} : ${home.name} ${res.homeGoals}-${res.awayGoals} ${away.name}${res.penalties ? " (t.a.b.)" : ""}` });
    }
  });
  if (round.matches.every(m => m.played)) {
    const wasFinal = round.matches.length === 1;
    if (wasFinal) {
      const finalMatch = round.matches[0];
      const loserId = finalMatch.winner === finalMatch.home ? finalMatch.away : finalMatch.home;
      const loserClub = getClub(loserId);
      const isContinental = cup.label === "Coupe Continentale";
      const winPrize = isContinental ? 9_000_000 : 2_500_000;
      const loosePrize = isContinental ? 3_500_000 : 900_000;
      if (loserClub) { loserClub.monthlyOtherIncome += loosePrize; }
      cup._pendingWinPrize = winPrize;
    }
    advanceCupRound(cup);
    if (cup.champion) {
      const champ = getClub(cup.champion);
      if (champ) {
        const prize = cup._pendingWinPrize || 1_000_000;
        champ.monthlyOtherIncome += prize;
        const text = `${champ.name} remporte la ${cup.label} ! (prime de ${fmtMoney(prize)})`;
        state.news.unshift({ date: fmtDate(state.date), text });
        if (champ.id === state.userClubId) state.log.unshift({ date: fmtDate(state.date), text });
      }
    }
  }
}

// ---- État global du jeu ----
let state = null;

function newGame(dsName, dsAvatarSeed, selectedCountryKeys, dsNationality, dsSpecialization, dsDifficulty) {
  UID = 1;
  state = {
    ds: {
      name: dsName,
      avatarSeed: dsAvatarSeed,
      nationality: dsNationality || "france",
      specialization: dsSpecialization || "generaliste",
      difficulty: dsDifficulty || "normal",
      reputation: 30,
      skills: { negociation: 0, scouting: 0, finance: 0, jeunes: 0 },
      skillPoints: 0,
      failStreak: 0,
      fired: false
    },
    loans: [],
    date: new Date(Date.UTC(new Date().getFullYear(), 5, 15)), // démarrage mi-juin
    countries: {},
    userClubId: null,
    inbox: [],       // offres de transfert reçues
    news: [],        // actualités mondiales (transferts, résultats notables)
    log: [],         // journal du club du joueur uniquement
    lastMatchResult: null,
    lastCupResult: null,
    cups: { national: {}, continental: null },
    season: { year: 1 },
    financeMonthKey: null,
    dayCounter: 0,
    week: 0
  };
  selectedCountryKeys.forEach(k => { state.countries[k] = generateCountry(k); });
  generateAllFixtures();
  setupCups();
  state.financeMonthKey = monthKey(state.date);
  return state;
}

function allClubs() {
  let clubs = [];
  Object.values(state.countries).forEach(c => {
    clubs = clubs.concat(c.leagues.d1.clubs, c.leagues.d2.clubs);
  });
  return clubs;
}

function getClub(id) { return allClubs().find(c => c.id === id); }
function getPlayer(id) { let p = null; allClubs().forEach(c => { const f = c.players.find(pl => pl.id === id); if (f) p = f; }); return p; }

function setUserClub(clubId) {
  state.userClubId = clubId;
  const club = getClub(clubId);
  club.isUserClub = true;
  club.tactics = club.tactics || { formation: "4-4-2", mentality: "equilibre" };
  club.kitColor = club.kitColor || "#B9862E";
  assignObjective(club);
  applySpecializationToClub(club);
  state.ds.fired = false;
}

function applySpecializationToClub(club) {
  const spec = state.ds.specialization;
  const finLvl = state.ds.skills ? state.ds.skills.finance || 0 : 0;
  if (spec === "financier") {
    club.wageBudgetMonthly = Math.round(club.wageBudgetMonthly * 1.18);
    club.budget = Math.round(club.budget * 1.15);
  } else if (spec === "recruteur") {
    // meilleur oeil pour repérer les jeunes talents : léger bonus de potentiel pour l'effectif de départ
    club.players.forEach(p => {
      if (p.age <= 23) { p.potential = clamp(p.potential + randInt(1, 4), p.overall, 96); p.value = computeValue(p); }
    });
  }
  if (finLvl > 0) {
    club.wageBudgetMonthly = Math.round(club.wageBudgetMonthly * (1 + finLvl * 0.03));
    club.budget = Math.round(club.budget * (1 + finLvl * 0.03));
  }
  // "negociateur" et "generaliste" agissent directement dans evaluateOffer / evaluateContractOffer
}

// ---- Arbre de compétences du DS ----
function upgradeSkill(skillKey) {
  if (!DS_SKILL_TREE[skillKey]) return false;
  if (state.ds.skillPoints <= 0) return false;
  const current = state.ds.skills[skillKey] || 0;
  if (current >= DS_SKILL_TREE[skillKey].max) return false;
  state.ds.skills[skillKey] = current + 1;
  state.ds.skillPoints--;
  if (skillKey === "finance") applySpecializationToClub(userClub());
  state.log.unshift({ date: fmtDate(state.date), text: `Compétence "${DS_SKILL_TREE[skillKey].label}" améliorée (niveau ${state.ds.skills[skillKey]}).` });
  return true;
}

function userClub() { return getClub(state.userClubId); }

// ---- Mercato : fenêtre ouverte ? ----
function isWindowOpen(date = state.date) {
  const country = COUNTRIES[Object.keys(state.countries)[0]] || { calendar: "europe" };
  return currentWindow(date) !== null;
}

function currentWindow(date = state.date) {
  // on se base sur le calendrier du club du joueur (ou "europe" par défaut)
  const club = userClub();
  const calType = club ? COUNTRIES[club.countryKey].calendar : "europe";
  const windows = TRANSFER_WINDOWS[calType];
  const m = date.getUTCMonth() + 1, d = date.getUTCDate();
  for (const w of windows) {
    if (dateInRange(m, d, w)) return w;
  }
  return null;
}

function dateInRange(m, d, w) {
  const val = m * 100 + d;
  const start = w.startMonth * 100 + w.startDay;
  const end = w.endMonth * 100 + w.endDay;
  if (start <= end) return val >= start && val <= end;
  return val >= start || val <= end; // fenêtre à cheval sur le nouvel an
}

// ---- IA simplifiée : négociation d'une offre (style FM, plusieurs tours possibles) ----
function difficultyFactor() {
  const d = state && state.ds ? state.ds.difficulty : "normal";
  return d === "facile" ? 1.12 : d === "difficile" ? 0.88 : 1.0;
}

function evaluateOffer(player, offerAmount, isBuyerUser) {
  const value = player.value;
  let effectiveOfferAmount = offerAmount;
  if (isBuyerUser) {
    effectiveOfferAmount *= difficultyFactor();
    if (state && state.ds && state.ds.specialization === "negociateur") effectiveOfferAmount *= 1.06;
    const negLvl = state && state.ds && state.ds.skills ? (state.ds.skills.negociation || 0) : 0;
    effectiveOfferAmount *= (1 + negLvl * 0.02);
  }
  const ratio = effectiveOfferAmount / value;
  let accept = false;
  let counter = null;
  if (ratio >= 1.0) accept = true;
  else if (ratio >= 0.82) {
    accept = Math.random() < 0.45;
    if (!accept) counter = Math.round(value * 0.95 / 1000) * 1000;
  } else {
    accept = false;
    counter = Math.round(value * 0.98 / 1000) * 1000;
  }
  return { accept, counter, value };
}

// ---- Négociation de contrat (salaire + prime à la signature) ----
function computeWageDemand(player) {
  const factor = 1.05 + Math.random() * 0.35;
  return Math.max(800, Math.round(player.wage * factor / 100) * 100);
}

function evaluateContractOffer(player, wageOffer, bonusOffer, demand, isBuyerUser) {
  let wageRatio = wageOffer / demand;
  if (isBuyerUser) {
    wageRatio *= difficultyFactor();
    if (state && state.ds && state.ds.specialization === "negociateur") wageRatio *= 1.05;
    const negLvl = state && state.ds && state.ds.skills ? (state.ds.skills.negociation || 0) : 0;
    wageRatio *= (1 + negLvl * 0.02);
  }
  const bonusBoost = bonusOffer / Math.max(1, player.value * 0.08);
  const effectiveRatio = wageRatio + bonusBoost;
  const threshold = 0.95 - Math.random() * 0.08;
  const accept = effectiveRatio >= threshold;
  return { accept, score: effectiveRatio };
}

// ---- Salaires : le club ne peut pas dépasser son budget salarial mensuel ----
function recomputeWageBill(club) {
  club.wageBill = club.players.reduce((s, p) => s + p.wage, 0);
}
function canAffordWage(club, wage) {
  return (club.wageBill + wage) <= club.wageBudgetMonthly * 1.05;
}

function transferPlayer(player, fromClubId, toClubId, fee, contractOptions) {
  const from = getClub(fromClubId);
  const to = getClub(toClubId);
  from.players = from.players.filter(p => p.id !== player.id);

  // clause de vente future : reverse une partie de la vente aux clubs qui la détiennent
  let netFeeForSeller = fee;
  let sellOnTxt = "";
  if (player.sellOnClauses && player.sellOnClauses.length) {
    player.sellOnClauses.forEach(cl => {
      if (cl.clubId === fromClubId) return; // le club vendeur actuel ne se paie pas lui-même
      const owedClub = getClub(cl.clubId);
      if (!owedClub) return;
      const cut = Math.round(fee * cl.pct / 100);
      owedClub.budget += cut;
      netFeeForSeller -= cut;
      sellOnTxt += ` ${owedClub.name} touche ${fmtMoney(cut)} au titre d'une clause de revente (${cl.pct}%).`;
    });
    player.sellOnClauses = player.sellOnClauses.filter(cl => cl.clubId === toClubId ? false : true);
  }

  from.budget += netFeeForSeller;
  to.budget -= fee;
  from.monthlyTransferNet += netFeeForSeller;
  to.monthlyTransferNet -= fee;
  player.clubId = toClubId;
  player.contractEndYear = new Date(state.date).getFullYear() + randInt(2, 4);
  if (contractOptions && contractOptions.wage) player.wage = contractOptions.wage;
  if (contractOptions && contractOptions.bonus) to.budget -= contractOptions.bonus;
  // commission de l'agent, prélevée sur le budget de l'acheteur
  let commissionTxt = "";
  if (player.agent && contractOptions && contractOptions.payCommission) {
    const commission = Math.round(fee * player.agent.commissionPct / 100 / 500) * 500;
    to.budget -= commission;
    commissionTxt = ` Commission de l'agent ${player.agent.name} (${player.agent.commissionPct}%) : ${fmtMoney(commission)}.`;
  }
  // nouvelle clause de vente éventuelle exigée par le vendeur (fixée en amont dans la négociation)
  if (contractOptions && contractOptions.newSellOnPct) {
    player.sellOnClauses = (player.sellOnClauses || []).concat([{ clubId: fromClubId, pct: contractOptions.newSellOnPct }]);
  }
  to.players.push(player);
  recomputeWageBill(from);
  recomputeWageBill(to);

  const bonusTxt = contractOptions && contractOptions.bonus ? ` (prime à la signature ${fmtMoney(contractOptions.bonus)})` : "";
  const text = `${player.firstName} ${player.lastName} rejoint ${to.name} (${from.name} ➜ ${to.name}) pour ${fmtMoney(fee)}${bonusTxt}.${commissionTxt}${sellOnTxt}`;
  state.news.unshift({ date: fmtDate(state.date), text });
  if (state.news.length > 80) state.news.length = 80;
  if (from.id === state.userClubId || to.id === state.userClubId) {
    state.log.unshift({ date: fmtDate(state.date), text });
  }
}

// ---- Clause libératoire : transfert immédiat si le montant proposé l'atteint ----
function payReleaseClause(playerId) {
  const player = getPlayer(playerId);
  if (!player || !player.releaseClause) return { ok: false, reason: "Aucune clause libératoire pour ce joueur." };
  const club = userClub();
  if (club.budget < player.releaseClause) return { ok: false, reason: "Trésorerie insuffisante pour payer la clause." };
  return { ok: true, amount: player.releaseClause };
}

// ---- IA achète/vend passivement autour du joueur (rumeurs de fond) ----
function simulateAIMarketTick() {
  if (!currentWindow()) return;
  const clubs = allClubs().filter(c => c.id !== state.userClubId);
  const tries = randInt(1, 3);
  for (let i = 0; i < tries; i++) {
    const buyer = pick(clubs);
    const seller = pick(clubs);
    if (buyer.id === seller.id || seller.players.length < 16) continue;
    const target = pick(seller.players);
    if (buyer.budget < target.value * 0.9) continue;
    if (Math.random() < 0.25) {
      const fee = Math.round(target.value * randInt(90, 110) / 100 / 1000) * 1000;
      if (buyer.budget >= fee) transferPlayer(target, seller.id, buyer.id, fee);
    }
  }
}

// ---- Simulation de match approfondie : lignes, tactique, forme, blessures, buteurs ----
const MENTALITY_MODS = {
  offensif: { att: 5, def: -4 },
  equilibre: { att: 0, def: 0 },
  defensif: { att: -4, def: 5 }
};

function getTactics(club) {
  return club.tactics || { formation: "4-4-2", mentality: "equilibre" };
}

function isAvailable(player, dateKey) {
  if (player.suspendedMatches > 0) return false;
  return !player.injuredUntil || player.injuredUntil < dateKey;
}

// ---- Feuille de match : composition simplifiée par ligne selon la formation ----
const FORMATION_QUOTAS = {
  "4-4-2": { DEF: 4, MIL: 4, ATT: 2 },
  "4-3-3": { DEF: 4, MIL: 3, ATT: 3 },
  "3-5-2": { DEF: 3, MIL: 5, ATT: 2 },
  "5-3-2": { DEF: 5, MIL: 3, ATT: 2 }
};
function buildLineup(club, dateKey) {
  const t = getTactics(club);
  const q = FORMATION_QUOTAS[t.formation] || FORMATION_QUOTAS["4-4-2"];
  const avail = code => club.players.filter(p => p.position === code && isAvailable(p, dateKey)).sort((a, b) => b.overall - a.overall);
  return [...avail("GB").slice(0, 1), ...avail("DEF").slice(0, q.DEF), ...avail("MIL").slice(0, q.MIL), ...avail("ATT").slice(0, q.ATT)];
}

// ---- Cartons (jaune/rouge) et suspensions ----
function generateCards(lineup) {
  const events = [];
  lineup.forEach(p => {
    const roll = Math.random();
    if (roll < 0.018) {
      p.suspendedMatches = (p.suspendedMatches || 0) + randInt(1, 2);
      events.push({ name: `${p.firstName} ${p.lastName}`, type: "red" });
    } else if (roll < 0.15) {
      p.yellowCards = (p.yellowCards || 0) + 1;
      events.push({ name: `${p.firstName} ${p.lastName}`, type: "yellow" });
      if (p.yellowCards >= 5) {
        p.yellowCards = 0;
        p.suspendedMatches = (p.suspendedMatches || 0) + 1;
        events.push({ name: `${p.firstName} ${p.lastName}`, type: "suspension" });
      }
    }
  });
  return events;
}
function decaySuspensions(club) {
  club.players.forEach(p => { if (p.suspendedMatches > 0) p.suspendedMatches--; });
}

function lineRating(club, positionCodes, count, dateKey) {
  const pool = club.players.filter(p => positionCodes.includes(p.position) && isAvailable(p, dateKey))
    .sort((a, b) => b.overall - a.overall).slice(0, count);
  if (!pool.length) return 42; // ligne décimée : très affaiblie
  const avgOverall = pool.reduce((s, p) => s + p.overall, 0) / pool.length;
  const avgMorale = pool.reduce((s, p) => s + p.morale, 0) / pool.length;
  return avgOverall + (avgMorale - 70) * 0.05;
}

function computeMatchRatings(club, dateKey) {
  const t = getTactics(club);
  const mod = MENTALITY_MODS[t.mentality] || MENTALITY_MODS.equilibre;
  const gk = lineRating(club, ["GB"], 1, dateKey);
  const def = lineRating(club, ["DEF"], 4, dateKey) + mod.def;
  const mil = lineRating(club, ["MIL"], 4, dateKey);
  const att = lineRating(club, ["ATT", "MIL"], 4, dateKey) + mod.att;
  return {
    defenseRating: gk * 0.4 + def * 0.6,
    attackRating: att * 0.65 + mil * 0.35
  };
}

function poissonish(lambda) {
  return Math.max(0, Math.round(gaussianAround(lambda, Math.sqrt(lambda + 0.4))));
}

function weightedPick(players) {
  if (!players.length) return null;
  const weights = players.map(p => Math.max(1, p.overall - 30));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < players.length; i++) { r -= weights[i]; if (r <= 0) return players[i]; }
  return players[players.length - 1];
}

function pickScorers(club, goals, dateKey) {
  if (goals === 0) return [];
  const attackers = club.players.filter(p => (p.position === "ATT" || p.position === "MIL") && isAvailable(p, dateKey));
  const pool = attackers.length ? attackers : club.players;
  const scorers = [];
  for (let i = 0; i < goals; i++) {
    const scorer = weightedPick(pool);
    if (!scorer) continue;
    scorer.seasonStats = scorer.seasonStats || { matches: 0, goals: 0, assists: 0 };
    scorer.seasonStats.goals++;
    scorers.push(`${scorer.firstName} ${scorer.lastName}`);
    // passeur décisif éventuel (70% de chances), différent du buteur
    if (Math.random() < 0.7) {
      const assistPool = pool.filter(p => p.id !== scorer.id);
      const assister = weightedPick(assistPool.length ? assistPool : pool);
      if (assister && assister.id !== scorer.id) {
        assister.seasonStats = assister.seasonStats || { matches: 0, goals: 0, assists: 0 };
        assister.seasonStats.assists++;
      }
    }
  }
  return scorers;
}

function trackMatchesPlayed(lineup) {
  lineup.forEach(p => {
    p.seasonStats = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
    p.seasonStats.matches++;
  });
}

function maybeInjure(club, dateKey) {
  if (Math.random() >= 0.045) return;
  const pool = club.players.filter(p => isAvailable(p, dateKey));
  if (!pool.length) return;
  const victim = pick(pool);
  const days = randInt(7, 35);
  victim.injuredUntil = new Date(state.date.getTime() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (club.id === state.userClubId) {
    state.log.unshift({ date: fmtDate(state.date), text: `${victim.firstName} ${victim.lastName} se blesse, indisponible environ ${Math.round(days / 7)} semaine(s).` });
  }
}

function simulateMatch(home, away) {
  const dateKey = state.date.toISOString().slice(0, 10);
  const homeR = computeMatchRatings(home, dateKey);
  const awayR = computeMatchRatings(away, dateKey);
  const homeAdvantage = 4;

  const homeExpected = clamp(1.25 + (homeR.attackRating + homeAdvantage * 0.5 - awayR.defenseRating) / 22, 0.15, 4.2);
  const awayExpected = clamp(1.0 + (awayR.attackRating - (homeR.defenseRating + homeAdvantage * 0.5)) / 22, 0.1, 4.0);

  const homeGoals = poissonish(homeExpected);
  const awayGoals = poissonish(awayExpected);
  const homeScorers = pickScorers(home, homeGoals, dateKey);
  const awayScorers = pickScorers(away, awayGoals, dateKey);

  const homeLineup = buildLineup(home, dateKey);
  const awayLineup = buildLineup(away, dateKey);
  trackMatchesPlayed(homeLineup);
  trackMatchesPlayed(awayLineup);
  const homeCards = generateCards(homeLineup);
  const awayCards = generateCards(awayLineup);
  decaySuspensions(home);
  decaySuspensions(away);

  maybeInjure(home, dateKey);
  maybeInjure(away, dateKey);

  applyResult(home, away, homeGoals, awayGoals);
  return {
    homeGoals, awayGoals, homeScorers, awayScorers,
    homeLineup: homeLineup.map(p => ({ name: `${p.firstName} ${p.lastName}`, position: p.position })),
    awayLineup: awayLineup.map(p => ({ name: `${p.firstName} ${p.lastName}`, position: p.position })),
    homeCards, awayCards
  };
}

function clubStrength(club) {
  const dateKey = state && state.date ? state.date.toISOString().slice(0, 10) : "1970-01-01";
  const r = computeMatchRatings(club, dateKey);
  return (r.attackRating + r.defenseRating) / 2;
}

function applyResult(home, away, hg, ag) {
  home.played++; away.played++;
  home.gf += hg; home.ga += ag;
  away.gf += ag; away.ga += hg;
  home.homeMatchesThisMonth = (home.homeMatchesThisMonth || 0) + 1;
  if (hg > ag) { home.won++; home.points += 3; away.lost++; }
  else if (hg < ag) { away.won++; away.points += 3; home.lost++; }
  else { home.draw++; away.draw++; home.points += 1; away.points += 1; }
}

// ---- Objectifs de saison fixés par le "conseil" du club ----
function assignObjective(club) {
  if (club.division === 1) {
    if (club.tierFactor > 0.75) { club.objectiveType = "top3"; club.objectiveLabel = "Viser le podium (top 3)"; }
    else if (club.tierFactor > 0.5) { club.objectiveType = "top6"; club.objectiveLabel = "Finir dans le top 6"; }
    else { club.objectiveType = "maintien"; club.objectiveLabel = "Assurer le maintien"; }
  } else {
    if (club.tierFactor > 0.55) { club.objectiveType = "promotion"; club.objectiveLabel = "Monter en Élite"; }
    else { club.objectiveType = "milieu"; club.objectiveLabel = "Terminer en milieu de tableau"; }
  }
}

function evaluateObjective(club, rank, total) {
  switch (club.objectiveType) {
    case "top3": return rank <= 3;
    case "top6": return rank <= 6;
    case "maintien": return rank <= total - 2;
    case "promotion": return rank <= 2;
    case "milieu": return rank > 2 && rank <= total - 2;
    default: return true;
  }
}

// ---- Tactique : choix du joueur pour son propre club ----
const FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "5-3-2"];
const MENTALITIES = ["offensif", "equilibre", "defensif"];
function setUserTactics(formation, mentality) {
  const club = userClub();
  club.tactics = { formation, mentality };
}

// ---- Finances mensuelles ----
function monthKey(d) { return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; }

// ---- Rang courant d'un club dans sa division (pour droits TV et affluence) ----
function leagueStandingOf(club) {
  const country = state.countries[club.countryKey];
  if (!country) return { rank: 1, total: 1 };
  const league = club.division === 1 ? country.leagues.d1 : country.leagues.d2;
  const sorted = [...league.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  const rank = sorted.findIndex(c => c.id === club.id) + 1;
  return { rank: rank || sorted.length, total: sorted.length || 1 };
}

// ---- Affluence au stade : dépend de la réputation et de la forme récente ----
function attendanceRate(club) {
  const recentForm = club.played > 0 ? club.points / (club.played * 3) : 0.5; // 0..1
  const rate = 0.5 + (club.reputation - 50) * 0.004 + (recentForm - 0.5) * 0.25;
  return clamp(rate, 0.28, 0.99);
}

function runMonthlyFinanceTick() {
  allClubs().forEach(club => {
    recomputeWageBill(club);
    const sponsor = club.sponsorIncome;
    const cap = club.stadiumCapacity || 15000;
    const fillRate = attendanceRate(club);
    const ticketPrice = 12 + club.reputation * 0.25; // prix moyen du billet, plus cher pour les grands clubs
    const attendance = Math.round(cap * fillRate);
    const ticketing = Math.round((club.homeMatchesThisMonth || 0) * attendance * ticketPrice);
    const merchandising = Math.round(club.reputation * 1500 + club.homeMatchesThisMonth * club.reputation * 300);
    const { rank, total } = leagueStandingOf(club);
    const tvBase = club.division === 1 ? 900_000 : 220_000;
    const tvRights = Math.round(tvBase * (total - rank + 1) / total);
    const wages = club.wageBill;
    const transfersNet = club.monthlyTransferNet;
    const otherIncome = (club.monthlyOtherIncome || 0) + tvRights;
    const balanceChange = sponsor + ticketing + merchandising + otherIncome - wages + transfersNet;
    club.budget += balanceChange;
    club.lastAttendance = attendance;
    club.financeHistory.unshift({
      month: monthKey(state.date), sponsor, ticketing, merchandising, tvRights, otherIncome, wages, transfersNet,
      balanceChange, budgetAfter: club.budget
    });
    if (club.financeHistory.length > 12) club.financeHistory.length = 12;
    club.monthlyTransferNet = 0;
    club.monthlyOtherIncome = 0;
    club.homeMatchesThisMonth = 0;
  });
}

// ---- Avancer le temps d'un jour ----
function advanceDay() {
  state.dayCounter++;
  state.date = new Date(state.date.getTime() + 24 * 3600 * 1000);
  state.lastMatchResult = null;
  state.lastCupResult = null;
  const todayKey = state.date.toISOString().slice(0, 10);

  // simuler les journées de championnat programmées ce jour
  Object.values(state.countries).forEach(country => {
    [country.leagues.d1, country.leagues.d2].forEach(league => {
      league.fixtures.forEach(round => {
        if (round.date.slice(0, 10) !== todayKey) return;
        round.matches.forEach(m => {
          if (m.played) return;
          const home = getClub(m.home), away = getClub(m.away);
          if (!home || !away) return;
          const { homeGoals, awayGoals, homeScorers, awayScorers, homeLineup, awayLineup, homeCards, awayCards } = simulateMatch(home, away);
          m.played = true; m.homeGoals = homeGoals; m.awayGoals = awayGoals;
          if (home.id === state.userClubId || away.id === state.userClubId) {
            state.lastMatchResult = {
              homeName: home.name, awayName: away.name, homeGoals, awayGoals, isHome: home.id === state.userClubId, homeScorers, awayScorers,
              homeLineup, awayLineup, homeCards, awayCards
            };
            const scorersTxt = [...homeScorers, ...awayScorers].length ? ` (Buts : ${[...homeScorers, ...awayScorers].join(", ")})` : "";
            state.log.unshift({ date: fmtDate(state.date), text: `Résultat : ${home.name} ${homeGoals} - ${awayGoals} ${away.name}${scorersTxt}` });
            [...homeCards, ...awayCards].filter(c => c.type !== "yellow").forEach(c => {
              state.log.unshift({ date: fmtDate(state.date), text: `${c.name} : ${c.type === "red" ? "carton rouge, suspendu" : "suspendu pour cumul de cartons jaunes"}.` });
            });
          }
        });
      });
    });
  });

  // simuler les coupes (nationale + continentale) programmées ce jour
  Object.values(state.cups.national).forEach(cup => processCupDay(cup, todayKey));
  if (state.cups.continental) processCupDay(state.cups.continental, todayKey);

  // rumeurs de marché + offres reçues environ 1 fois par semaine
  if (state.dayCounter % 7 === 0) {
    simulateAIMarketTick();
    generateIncomingOffersForUser();
    generateJobOffers();
  }

  // retours de prêt
  checkLoanReturns();

  // bilan financier mensuel
  const mk = monthKey(state.date);
  if (mk !== state.financeMonthKey) {
    runMonthlyFinanceTick();
    state.financeMonthKey = mk;
  }

  // vieillissement occasionnel (accéléré pour les jeunes du club si spécialisation "recruteur")
  if (state.dayCounter % 28 === 0) {
    const spec = state.ds.specialization;
    allClubs().forEach(c => c.players.forEach(p => {
      const isUserYouth = spec === "recruteur" && c.id === state.userClubId && p.age <= 22;
      const chance = isUserYouth ? 0.05 : 0.02;
      if (Math.random() < chance) {
        const delta = isUserYouth ? randInt(0, 3) : randInt(-2, 2);
        p.age += (Math.random() < 0.15) ? 1 : 0;
        p.overall = clamp(p.overall + delta, 30, 94);
        p.value = computeValue(p);
      }
    }));
  }

  state.seasonComplete = allLeaguesComplete();
}

// avance jusqu'au prochain évènement notable pour le joueur (match, coupe ou offre), avec garde-fou
function advanceToNextEvent(maxDays = 30) {
  for (let i = 0; i < maxDays; i++) {
    if (state.seasonComplete) return;
    const inboxBefore = state.inbox.filter(o => !o.resolved).length;
    advanceDay();
    const inboxAfter = state.inbox.filter(o => !o.resolved).length;
    if (state.lastMatchResult || state.lastCupResult || inboxAfter > inboxBefore || state.seasonComplete) return;
  }
}

// déclenché uniquement par le bouton "Saison suivante" une fois la saison terminée
function triggerNextSeason() {
  if (!state.seasonComplete) return false;
  seasonRollover();
  state.seasonComplete = false;
  return true;
}

// ---- Offres entrantes de l'IA pour les joueurs listés du club du joueur ----
function generateIncomingOffersForUser() {
  if (!currentWindow()) return;
  const club = userClub();
  if (!club) return;
  const listed = club.players.filter(p => p.listed);
  const otherClubs = allClubs().filter(c => c.id !== club.id);
  listed.forEach(p => {
    if (Math.random() < 0.22) {
      const buyer = pick(otherClubs);
      const pct = randInt(80, 115);
      const amount = Math.round(p.value * pct / 100 / 1000) * 1000;
      if (buyer.budget >= amount) {
        state.inbox.unshift({
          id: nextId(),
          type: "offer_incoming",
          playerId: p.id,
          fromClubId: buyer.id,
          amount,
          date: fmtDate(state.date),
          resolved: false
        });
      }
    }
  });
}

function resolveIncomingOffer(offerId, accept) {
  const offer = state.inbox.find(o => o.id === offerId);
  if (!offer || offer.resolved) return;
  offer.resolved = true;
  offer.accepted = accept;
  if (accept) {
    const player = getPlayer(offer.playerId);
    if (player) transferPlayer(player, player.clubId, offer.fromClubId, offer.amount);
  }
}

/* ============================================================
   PRÊTS DE JOUEURS (avec ou sans option d'achat)
   ============================================================ */
function loanPlayerOut(player, toClubId, weeks, buyOption) {
  const from = getClub(player.clubId);
  const to = getClub(toClubId);
  from.players = from.players.filter(p => p.id !== player.id);
  to.players.push(player);
  const until = new Date(state.date.getTime() + weeks * 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  player.onLoan = { fromClubId: from.id, toClubId: to.id, until, buyOption: buyOption || null };
  const fee = Math.max(1000, Math.round(player.value * 0.03 / 1000) * 1000);
  from.monthlyOtherIncome = (from.monthlyOtherIncome || 0) + fee;
  to.monthlyOtherIncome = (to.monthlyOtherIncome || 0) - fee;
  recomputeWageBill(from); recomputeWageBill(to);
  const text = `${player.firstName} ${player.lastName} part en prêt à ${to.name} jusqu'au ${fmtDate(new Date(until))}${buyOption ? ` (option d'achat : ${fmtMoney(buyOption)})` : ""}.`;
  state.news.unshift({ date: fmtDate(state.date), text });
  if (from.id === state.userClubId || to.id === state.userClubId) state.log.unshift({ date: fmtDate(state.date), text });
}

function checkLoanReturns() {
  const todayKey = state.date.toISOString().slice(0, 10);
  allClubs().forEach(club => {
    club.players.filter(p => p.onLoan).forEach(p => {
      if (p.onLoan.until <= todayKey) {
        const from = getClub(p.onLoan.fromClubId);
        const to = getClub(p.onLoan.toClubId);
        if (to) to.players = to.players.filter(pl => pl.id !== p.id);
        if (from) {
          from.players.push(p);
          recomputeWageBill(from);
        }
        if (to) recomputeWageBill(to);
        const text = `${p.firstName} ${p.lastName} termine son prêt et retourne à ${from ? from.name : "son club d'origine"}.`;
        state.news.unshift({ date: fmtDate(state.date), text });
        if ((from && from.id === state.userClubId) || (to && to.id === state.userClubId)) state.log.unshift({ date: fmtDate(state.date), text });
        delete p.onLoan;
      }
    });
  });
}

function exerciseLoanBuyOption(playerId) {
  const player = getPlayer(playerId);
  if (!player || !player.onLoan || !player.onLoan.buyOption) return { ok: false, reason: "Pas d'option d'achat pour ce joueur." };
  const club = userClub();
  if (club.id !== player.onLoan.toClubId) return { ok: false, reason: "Ce joueur n'est pas prêté à votre club." };
  if (club.budget < player.onLoan.buyOption) return { ok: false, reason: "Trésorerie insuffisante pour lever l'option." };
  const fromId = player.onLoan.fromClubId;
  const amount = player.onLoan.buyOption;
  delete player.onLoan;
  transferPlayer(player, fromId, club.id, amount);
  return { ok: true };
}

/* ============================================================
   OFFRES D'AUTRES CLUBS POUR RECRUTER LE DS + RENVOI
   ============================================================ */
function generateJobOffers() {
  if (!state.ds || state.ds.reputation < 40) return;
  if (Math.random() > 0.12) return;
  const current = userClub();
  if (!current) return;
  const candidates = allClubs().filter(c => c.id !== current.id && c.reputation > current.reputation + 8);
  if (!candidates.length) return;
  const target = pick(candidates);
  const already = state.inbox.some(o => o.type === "job_offer" && !o.resolved);
  if (already) return;
  state.inbox.unshift({ id: nextId(), type: "job_offer", clubId: target.id, date: fmtDate(state.date), resolved: false });
}

function resolveJobOffer(offerId, accept) {
  const offer = state.inbox.find(o => o.id === offerId);
  if (!offer || offer.resolved) return;
  offer.resolved = true;
  offer.accepted = accept;
  if (accept) {
    const oldClub = userClub();
    const newClub = getClub(offer.clubId);
    if (oldClub) oldClub.isUserClub = false;
    setUserClub(newClub.id);
    state.ds.failStreak = 0;
    const text = `${state.ds.name} quitte ${oldClub ? oldClub.name : "son club"} pour prendre les rênes de ${newClub.name}.`;
    state.news.unshift({ date: fmtDate(state.date), text });
    state.log.unshift({ date: fmtDate(state.date), text });
  }
}

// ---- Utilitaires de formatage ----
function fmtMoney(v) {
  const club = userClub();
  const cur = club ? COUNTRIES[club.countryKey].currency : "€";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M${cur}`;
  if (v >= 1_000) return `${Math.round(v / 1000)} k${cur}`;
  return `${Math.round(v)} ${cur}`;
}

function fmtDate(d) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

// ---- Sauvegarde locale ----
function saveGame() {
  localStorage.setItem("ds_save_v1", JSON.stringify(state));
}
function loadGame() {
  const raw = localStorage.getItem("ds_save_v1");
  if (!raw) return false;
  state = JSON.parse(raw);
  state.date = new Date(state.date);
  // recalcule UID max pour éviter les collisions
  let max = 0;
  allClubs().forEach(c => { max = Math.max(max, c.id); c.players.forEach(p => max = Math.max(max, p.id)); });
  UID = max + 1;
  migrateSave();
  return true;
}

// ---- Compatibilité ascendante avec les sauvegardes des versions précédentes ----
function migrateSave() {
  if (!state.ds.skills) state.ds.skills = { negociation: 0, scouting: 0, finance: 0, jeunes: 0 };
  if (state.ds.skillPoints === undefined) state.ds.skillPoints = 0;
  if (state.ds.failStreak === undefined) state.ds.failStreak = 0;
  if (state.ds.fired === undefined) state.ds.fired = false;
  if (!state.loans) state.loans = [];
  allClubs().forEach(c => {
    if (c.stadiumCapacity === undefined) c.stadiumCapacity = Math.round(6000 + (c.tierFactor || 0.4) * 55000);
    c.players.forEach(p => {
      if (p.yellowCards === undefined) p.yellowCards = 0;
      if (p.suspendedMatches === undefined) p.suspendedMatches = 0;
      if (p.releaseClause === undefined) p.releaseClause = Math.random() < 0.2 ? Math.round(p.value * randInt(115, 180) / 100 / 5000) * 5000 : null;
      if (!p.agent) p.agent = { name: pick(AGENT_NAMES), agency: pick(AGENCIES), commissionPct: randInt(3, 8) };
      if (!p.attributes || Object.keys(p.attributes).length < 20) {
        p.attributes = Object.assign(generateAttributes(p), p.attributes || {});
      }
      if (!p.seasonStats) p.seasonStats = { matches: 0, goals: 0, assists: 0 };
      if (!p.history) p.history = [];
    });
  });
}
function hasSave() { return !!localStorage.getItem("ds_save_v1"); }
function deleteSave() { localStorage.removeItem("ds_save_v1"); }
