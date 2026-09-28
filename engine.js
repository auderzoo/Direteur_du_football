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
    loyalty: randInt(10, 95), // attachement au club : plus haut = plus susceptible de refuser un transfert
    fatigue: 0,
    motmCount: 0,
    internationalCaps: Math.random() < 0.08 ? randInt(1, 40) : 0,
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
  // les clubs à nom réel gardent leur vraie ville ; les autres puisent dans le pool
  const fixedCity = fixedName ? FIXED_CLUB_CITIES[fixedName] : null;
  let city;
  if (fixedCity) {
    city = fixedCity;
    const idx = cityPool.indexOf(fixedCity);
    if (idx !== -1) cityPool.splice(idx, 1); // évite de réutiliser cette ville pour un club générique
  } else {
    city = cityPool.length ? cityPool.shift() : `Ville-${randInt(100, 999)}`;
  }
  let name = fixedName;
  if (!name) {
    const templateFn = CLUB_TEMPLATES[country.template] || CLUB_TEMPLATES.en;
    name = templateFn(city);
  }

  // tierFactor : basé sur le rang connu si pool fixe, sinon aléatoire.
  // Chaque division démarre sur un palier de force plus bas que la précédente,
  // pour garder une vraie hiérarchie même avec plus de deux divisions (ex. France à 4).
  let tierFactor;
  if (fixedName && typeof rankIndex === "number") {
    // palier haut/bas de la division : D1 = [0.55,0.95], puis chaque division suivante
    // descend d'un cran (~0.20) sur l'échelle, avec un plancher pour ne pas descendre sous 0.15
    const tierTop = clamp(0.95 - (divisionTier - 1) * 0.20, 0.15, 0.95);
    const tierBottom = clamp(tierTop - 0.38, 0.12, 0.90);
    tierFactor = clamp(tierTop - rankIndex * ((tierTop - tierBottom) / Math.max(1, poolSize - 1)) + gaussianAround(0, 0.03), 0.12, 0.95);
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
    playstyle: pick(["possession", "contre", "direct", "equilibre"]),
    trainingCenterLevel: 1,
    loans: [],
    sponsorContract: null, // initialisé juste après la création (voir plus bas), une fois sponsorIncome connu
    formStreak: { type: null, count: 0 },
    trophies: [],
    points: 0, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0
  };

  const fixedStyle = FIXED_CLUB_STYLES[name];
  if (fixedStyle) {
    club.kitColor = fixedStyle.color;
    club.logoColor = fixedStyle.color;
    club.logoShape = fixedStyle.shape;
  } else if (fixedName) {
    // club à nom réel sans style prédéfini (D2 de certains pays) : couleur/forme
    // dérivées du nom pour rester stables d'une partie à l'autre, sans copier un vrai logo
    const palette = ["#B9862E","#8B3A2B","#3C6E52","#2C4A6E","#6E4A2C","#4A3C6E","#1B2A22","#0057B8","#E4002B","#009B48","#6B2E8B","#FFD100","#0B2C5E","#8B1A3A"];
    const shapes = ["shield","circle","diamond","star"];
    let hash = 0;
    for (let i = 0; i < fixedName.length; i++) hash = (hash * 31 + fixedName.charCodeAt(i)) >>> 0;
    club.kitColor = palette[hash % palette.length];
    club.logoColor = club.kitColor;
    club.logoShape = shapes[Math.floor(hash / palette.length) % shapes.length];
  }

  let squadPlan = [];
  POSITIONS.forEach(p => { for (let i = 0; i < p.share; i++) squadPlan.push(p.code); });
  club.players = squadPlan.map(code => {
    const pl = generatePlayer(countryKey, code, tierFactor);
    pl.clubId = club.id;
    pl.contractEndYear = new Date(state.date).getFullYear() + randInt(1, 4);
    return pl;
  });
  club.wageBill = club.players.reduce((s, p) => s + p.wage, 0);

  assignOwnerProfile(club);
  club.sponsorContract = { name: pick(SPONSOR_NAMES), amount: club.sponsorIncome, monthsLeft: randInt(6, 24), totalMonths: 24 };
  return club;
}

// ---- Génération complète d'un pays (2 divisions) ----
const DIVISION_COUNT = { france: 5 }; // 2 par défaut pour tous les autres pays

function generateCountry(countryKey) {
  const cities = [...CITIES[countryKey]];
  cities.sort(() => Math.random() - 0.5);
  const nDiv = DIVISION_COUNT[countryKey] || 2;
  const names = LEAGUE_NAMES[countryKey] || { d1: "Division Élite", d2: "Division Nationale" };
  const leagues = {};
  for (let tier = 1; tier <= nDiv; tier++) {
    const poolMap = { 1: CLUB_POOLS_D1, 2: CLUB_POOLS_D2, 3: CLUB_POOLS_D3, 4: CLUB_POOLS_D4, 5: typeof CLUB_POOLS_D5 !== "undefined" ? CLUB_POOLS_D5 : null }[tier];
    const pool = (poolMap && poolMap[countryKey]) || [];
    const count = pool.length || 10;
    const clubs = [];
    for (let i = 0; i < count; i++) {
      clubs.push(generateClub(countryKey, tier, cities, false, pool[i], pool.length ? i : undefined, count));
    }
    const label = names["d" + tier] || `Division ${tier}`;
    leagues["d" + tier] = { name: `${label} (${COUNTRIES[countryKey].label})`, tier, clubs, fixtures: [] };
  }
  const country = {
    key: countryKey,
    label: COUNTRIES[countryKey].label,
    leagues
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
    Object.values(country.leagues).forEach(league => generateFixtures(league, seasonStart));
  });
}

function allLeaguesComplete() {
  return Object.values(state.countries).every(country =>
    Object.values(country.leagues).every(league =>
      league.fixtures.length > 0 && league.fixtures.every(round => round.matches.every(m => m.played))
    )
  );
}

function divisionLabelFor(club) {
  const names = LEAGUE_NAMES[club.countryKey];
  return (names && names["d" + club.division]) || `Division ${club.division}`;
}

function seasonRollover() {
  Object.values(state.countries).forEach(country => {
    const tiers = Object.keys(country.leagues).map(k => parseInt(k.slice(1), 10)).sort((a, b) => a - b);
    const sortedByTier = {};
    tiers.forEach(t => {
      sortedByTier[t] = [...country.leagues["d" + t].clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
    });
    const allClubsCountry = tiers.flatMap(t => country.leagues["d" + t].clubs);

    // évaluation de l'objectif de saison pour chaque club contrôlé par un joueur (hotseat)
    const humanClubsHere = allClubsCountry.filter(c => isUserClub(c.id));
    humanClubsHere.forEach(uc => {
      const sortedList = sortedByTier[uc.division];
      const rank = sortedList.findIndex(c => c.id === uc.id) + 1;
      const success = evaluateObjective(uc, rank, sortedList.length);
      uc.lastObjectiveMet = success;
      evaluateOwnerPatience(uc);
      state.ds.reputation = clamp(state.ds.reputation + (success ? randInt(3, 7) : -randInt(2, 6)), 0, 100);
      state.ds.careerHistory = state.ds.careerHistory || [];
      state.ds.careerHistory.unshift({
        year: state.season.year, club: uc.name, division: divisionLabelFor(uc),
        country: COUNTRIES[uc.countryKey].label, rank, objective: uc.objectiveLabel, success
      });
      if (success) {
        state.ds.failStreak = 0;
        state.ds.skillPoints = (state.ds.skillPoints || 0) + 1;
      } else {
        state.ds.failStreak = (state.ds.failStreak || 0) + 1;
      }
      state.log.unshift({
        date: fmtDate(state.date),
        text: `Bilan de saison (${uc.name}) : ${rank}ᵉ place — objectif "${uc.objectiveLabel}" ${success ? "atteint" : "manqué"} (réputation DS : ${state.ds.reputation}).`
      });
      if (state.ds.failStreak >= 2) {
        state.ds.fired = true;
        uc.isUserClub = false;
        state.userClubIds = (state.userClubIds || []).filter(id => id !== uc.id);
        if (state.userClubId === uc.id) state.userClubId = state.userClubIds[0] || null;
        const text = `${state.ds.name} est démis de ses fonctions à ${uc.name} après deux saisons sans objectif atteint.`;
        state.news.unshift({ date: fmtDate(state.date), text });
        state.log.unshift({ date: fmtDate(state.date), text });
      }
    });

    // primes de classement de fin de saison (dégressives selon la division)
    tiers.forEach(t => {
      const base = Math.round(3_000_000 / t);
      sortedByTier[t].forEach((c, i) => {
        const prize = Math.round(base * (sortedByTier[t].length - i) / sortedByTier[t].length);
        c.budget += prize;
        if (isUserClub(c.id)) state.log.unshift({ date: fmtDate(state.date), text: `Fin de saison : ${i + 1}ᵉ place, prime de classement ${fmtMoney(prize)}.` });
      });
      // titre de champion de la division (uniquement pour l'élite du pays)
      if (t === 1 && sortedByTier[1][0]) {
        const champion = sortedByTier[1][0];
        champion.trophies = champion.trophies || [];
        champion.trophies.unshift({ year: state.season.year, competition: (LEAGUE_NAMES[country.key] && LEAGUE_NAMES[country.key].d1) || "Championnat" });
        const text = `${champion.name} est sacré champion (${(LEAGUE_NAMES[country.key] && LEAGUE_NAMES[country.key].d1) || "Élite"}) !`;
        state.news.unshift({ date: fmtDate(state.date), text });
        if (isUserClub(champion.id)) state.log.unshift({ date: fmtDate(state.date), text });
      }
      // meilleur joueur de la division (buts*2 + passes + bonus homme du match)
      const divisionLabelTxt = (LEAGUE_NAMES[country.key] && LEAGUE_NAMES[country.key]["d" + t]) || `Division ${t}`;
      let best = null, bestScore = -1;
      country.leagues["d" + t].clubs.forEach(c => {
        c.players.forEach(p => {
          const st = p.seasonStats || { goals: 0, assists: 0, matches: 0 };
          const score = st.goals * 2 + st.assists + (p.motmCount || 0) * 0.5;
          if (score > bestScore) { bestScore = score; best = { name: `${p.firstName} ${p.lastName}`, club: c.name, clubId: c.id, goals: st.goals, assists: st.assists }; }
        });
      });
      if (best && bestScore > 0) {
        country.leagues["d" + t].lastSeasonBestPlayer = best;
        if (isUserClub(best.clubId)) {
          state.log.unshift({ date: fmtDate(state.date), text: `${best.name} est élu meilleur joueur de ${divisionLabelTxt} (${country.label}) avec ${best.goals} buts et ${best.assists} passes décisives !` });
        }
      }
    });

    // Montées/descentes entre chaque palier de divisions adjacent : descente directe du
    // dernier, montée directe du premier, et barrage (aller simple) pour les 2 places suivantes.
    const finalClubs = {};
    tiers.forEach(t => { finalClubs[t] = new Map(sortedByTier[t].map(c => [c.id, c])); });

    for (let t = tiers[0]; t < tiers[tiers.length - 1]; t++) {
      const upper = sortedByTier[t];
      const lower = sortedByTier[t + 1];
      const upperLabel = (LEAGUE_NAMES[country.key] && LEAGUE_NAMES[country.key]["d" + t]) || `Division ${t}`;
      if (upper.length >= 4 && lower.length >= 3) {
        const relegatedDirect = upper.slice(-1);
        const promotedDirect = lower.slice(0, 1);
        const upChallengers = upper.slice(-3, -1);
        const downChallengers = lower.slice(1, 3);
        const pairs = [[upChallengers[0], downChallengers[1]], [upChallengers[1], downChallengers[0]]];
        const playoffWinnerToUpper = [], playoffLoserToLower = [];
        pairs.forEach(([teamUp, teamDown]) => {
          if (!teamUp || !teamDown) return;
          const res = simulateKnockoutMatch(teamDown, teamUp); // le club de la division du bas reçoit le barrage
          const upWins = res.winner === teamUp.id;
          const winnerName = upWins ? teamUp.name : teamDown.name;
          const text = `Barrage montée/descente (${country.label}) : ${teamDown.name} ${res.homeGoals} - ${res.awayGoals} ${teamUp.name}${res.penalties ? " (tab)" : ""} — ${winnerName} évoluera en ${upperLabel} la saison prochaine.`;
          state.news.unshift({ date: fmtDate(state.date), text });
          if (isUserClub(teamUp.id) || isUserClub(teamDown.id)) state.log.unshift({ date: fmtDate(state.date), text });
          if (upWins) { playoffWinnerToUpper.push(teamUp); playoffLoserToLower.push(teamDown); }
          else { playoffWinnerToUpper.push(teamDown); playoffLoserToLower.push(teamUp); }
        });
        const goingDown = relegatedDirect.concat(playoffLoserToLower.filter(c => c.division === t));
        const goingUp = promotedDirect.concat(playoffWinnerToUpper.filter(c => c.division === t + 1));
        goingDown.forEach(c => { finalClubs[t].delete(c.id); finalClubs[t + 1].set(c.id, c); c.division = t + 1; });
        goingUp.forEach(c => { finalClubs[t + 1].delete(c.id); finalClubs[t].set(c.id, c); c.division = t; });
      } else {
        // paliers trop petits pour un barrage : système simple (2 montent, 2 descendent)
        const relegated = upper.slice(-2);
        const promoted = lower.slice(0, 2);
        relegated.forEach(c => { finalClubs[t].delete(c.id); finalClubs[t + 1].set(c.id, c); c.division = t + 1; });
        promoted.forEach(c => { finalClubs[t + 1].delete(c.id); finalClubs[t].set(c.id, c); c.division = t; });
      }
    }
    tiers.forEach(t => { country.leagues["d" + t].clubs = [...finalClubs[t].values()]; });
    allClubsCountry.forEach(c => {
      c.points = 0; c.played = 0; c.won = 0; c.draw = 0; c.lost = 0; c.gf = 0; c.ga = 0;
    });
  });

  // Archivage des statistiques de la saison écoulée pour chaque joueur
  // + records du club + retraites + centre de formation (nouveaux joueurs chaque saison)
  allClubs().forEach(club => {
    club.records = club.records || { biggestWin: null, topScorerName: null, topScorerGoals: 0 };
    const retiring = [];
    club.players.forEach(p => {
      const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
      p.history = p.history || [];
      p.history.unshift({
        year: state.season.year, club: club.name, overall: p.overall,
        matches: st.matches, goals: st.goals, assists: st.assists
      });
      if (p.history.length > 15) p.history.length = 15;

      // record du meilleur buteur toutes saisons confondues du club
      if (st.goals > club.records.topScorerGoals) {
        club.records.topScorerGoals = st.goals;
        club.records.topScorerName = `${p.firstName} ${p.lastName} (${state.season.year})`;
      }
      p.seasonStats = { matches: 0, goals: 0, assists: 0 };
      p.motmCount = 0;

      // retraite : de plus en plus probable après 32 ans
      if (p.age >= 32) {
        const retireChance = clamp((p.age - 31) * 0.12, 0.05, 0.9);
        if (Math.random() < retireChance) retiring.push(p);
      }
    });
    if (retiring.length) {
      retiring.forEach(p => {
        club.players = club.players.filter(pl => pl.id !== p.id);
        if (isUserClub(club.id)) {
          state.log.unshift({ date: fmtDate(state.date), text: `${p.firstName} ${p.lastName} prend sa retraite après une dernière saison à ${club.name}.` });
        }
      });
    }
    // centre de formation : le niveau du centre augmente le nombre et la qualité des jeunes générés
    const tcLevel = club.trainingCenterLevel || 1;
    const youthCount = randInt(1, 2) + Math.floor((tcLevel - 1) / 2);
    for (let i = 0; i < youthCount; i++) {
      const posCode = pick(POSITIONS.map(p => p.code));
      const youth = generatePlayer(club.countryKey, posCode, club.tierFactor || 0.4);
      youth.age = randInt(16, 18);
      youth.overall = clamp(youth.overall - randInt(8, 18) + Math.round(tcLevel * 1.5), 30, 92);
      youth.potential = clamp(youth.potential + Math.round(tcLevel * 0.8), youth.overall, 96);
      youth.contractEndYear = new Date(state.date).getFullYear() + randInt(2, 4);
      youth.value = computeValue(youth);
      youth.wage = Math.max(500, Math.round(youth.value * 0.0025 / 100) * 100);
      youth.clubId = club.id;
      club.players.push(youth);
      if (isUserClub(club.id)) {
        state.log.unshift({ date: fmtDate(state.date), text: `Le centre de formation de ${club.name} promeut ${youth.firstName} ${youth.lastName} (${youth.age} ans, ${youth.position}).` });
      }
    }
  });

  generateAllFixtures();
  setupCups();
  if (userClub()) assignObjective(userClub());
  state.ds.reputationHistory = state.ds.reputationHistory || [];
  state.ds.reputationHistory.push({ year: state.season.year, reputation: state.ds.reputation });
  if (state.ds.reputationHistory.length > 30) state.ds.reputationHistory.shift();
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
        if (isUserClub(champ.id)) state.log.unshift({ date: fmtDate(state.date), text });
        champ.trophies = champ.trophies || [];
        champ.trophies.unshift({ year: state.season.year, competition: cup.label });
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
      fired: false,
      careerHistory: [],
      reputationHistory: [{ year: 1, reputation: 30 }]
    },
    loans: [],
    date: new Date(Date.UTC(new Date().getFullYear(), 5, 15)), // démarrage mi-juin
    countries: {},
    userClubId: null,
    userClubIds: [],
    notifSettings: { blessures: true, transferts: true, resultats: true },
    h2h: {},
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
    Object.values(c.leagues).forEach(league => { clubs = clubs.concat(league.clubs); });
  });
  return clubs;
}

function getClub(id) { return allClubs().find(c => c.id === id); }
function getPlayer(id) { let p = null; allClubs().forEach(c => { const f = c.players.find(pl => pl.id === id); if (f) p = f; }); return p; }

function setUserClub(clubId) {
  state.userClubIds = state.userClubIds || [];
  if (!state.userClubIds.includes(clubId)) state.userClubIds.push(clubId);
  state.userClubId = clubId;
  const club = getClub(clubId);
  club.isUserClub = true;
  club.tactics = club.tactics || { formation: "4-4-2", mentality: "equilibre" };
  club.kitColor = club.kitColor || "#B9862E";
  club.nickname = club.nickname || "";
  club.anthem = club.anthem || "";
  club.logoShape = club.logoShape || "shield";
  club.logoColor = club.logoColor || club.kitColor;
  club.records = club.records || { biggestWin: null, topScorerName: null, topScorerGoals: 0 };
  assignObjective(club);
  applySpecializationToClub(club);
  state.ds.fired = false;
}

function isUserClub(clubId) { return (state.userClubIds || []).includes(clubId); }

function switchActiveClub(clubId) {
  if (isUserClub(clubId)) state.userClubId = clubId;
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
  if (isUserClub(from.id) || isUserClub(to.id)) {
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
  const clubs = allClubs().filter(c => !isUserClub(c.id));
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

// ---- Forme récente et prochain match (pour l'écran "Vue d'ensemble") ----
function getRecentForm(club, limit) {
  const country = state.countries[club.countryKey];
  const league = country.leagues["d" + club.division];
  const played = [];
  league.fixtures.forEach(round => {
    round.matches.forEach(m => {
      if (!m.played || (m.home !== club.id && m.away !== club.id)) return;
      const isHome = m.home === club.id;
      const gf = isHome ? m.homeGoals : m.awayGoals;
      const ga = isHome ? m.awayGoals : m.homeGoals;
      played.push({ date: round.date, result: gf > ga ? "W" : gf < ga ? "L" : "D", gf, ga, opponent: getClub(isHome ? m.away : m.home) });
    });
  });
  played.sort((a, b) => a.date.localeCompare(b.date));
  return played.slice(-1 * (limit || 5));
}
function getNextFixture(club) {
  const country = state.countries[club.countryKey];
  const league = country.leagues["d" + club.division];
  let next = null;
  league.fixtures.forEach(round => {
    round.matches.forEach(m => {
      if (m.played || (m.home !== club.id && m.away !== club.id)) return;
      if (!next || round.date < next.date) next = { date: round.date, home: getClub(m.home), away: getClub(m.away) };
    });
  });
  return next;
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

// ---- Banc de touche : les meilleurs joueurs disponibles non titularisés ----
function buildBench(club, dateKey, starters) {
  const startingIds = new Set(starters.map(p => p.id));
  return club.players
    .filter(p => !startingIds.has(p.id) && isAvailable(p, dateKey))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 7);
}

// ---- Remplacements (feuille de match) : purement descriptif, n'affecte pas le résultat déjà calculé ----
function simulateSubstitutions(starters, bench) {
  const events = [];
  const subsCount = Math.min(bench.length, randInt(1, 3));
  const usedOutIds = new Set();
  for (let i = 0; i < subsCount; i++) {
    const candidatesOut = starters.filter(p => p.position !== "GB" && !usedOutIds.has(p.id));
    if (!candidatesOut.length || !bench[i]) break;
    // priorité aux joueurs les plus fatigués pour sortir
    candidatesOut.sort((a, b) => (b.fatigue || 0) - (a.fatigue || 0));
    const out = candidatesOut[0];
    const incoming = bench[i];
    usedOutIds.add(out.id);
    events.push({ minute: randInt(46, 88), outName: `${out.firstName} ${out.lastName}`, inName: `${incoming.firstName} ${incoming.lastName}`, position: incoming.position });
  }
  return events.sort((a, b) => a.minute - b.minute);
}

// ---- Cartons (jaune/rouge) et suspensions ----
function generateCards(lineup, excludeIds) {
  const skip = excludeIds || new Set();
  const events = [];
  lineup.forEach(p => {
    if (skip.has(p.id)) return;
    const roll = Math.random();
    if (roll < 0.15) {
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

// ---- Détection d'un carton rouge (au plus un par équipe et par match, hors gardien) ----
// L'expulsion a un effet réel sur le score : l'équipe réduite marque moins et en encaisse plus après le carton.
function detectRedCard(lineup) {
  for (const p of lineup) {
    if (p.position === "GB") continue;
    if (Math.random() < 0.012) {
      p.suspendedMatches = (p.suspendedMatches || 0) + randInt(1, 2);
      return { player: p, minute: randInt(15, 85) };
    }
  }
  return null;
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

function computeMatchRatings(club, dateKey, opponentPlaystyle) {
  const t = getTactics(club);
  const mod = MENTALITY_MODS[t.mentality] || MENTALITY_MODS.equilibre;
  const gk = lineRating(club, ["GB"], 1, dateKey);
  const def = lineRating(club, ["DEF"], 4, dateKey) + mod.def;
  const mil = lineRating(club, ["MIL"], 4, dateKey);
  const att = lineRating(club, ["ATT", "MIL"], 4, dateKey) + mod.att;

  // forme du moment : une série en cours donne un petit bonus/malus
  const streak = club.formStreak || { type: null, count: 0 };
  const formBonus = clamp(streak.type === "W" ? streak.count * 0.5 : streak.type === "L" ? -streak.count * 0.5 : 0, -3, 3);

  // fatigue moyenne de l'effectif disponible : pénalise en cas de calendrier chargé
  const outfield = club.players.filter(p => p.position !== "GB" && isAvailable(p, dateKey));
  const avgFatigue = outfield.length ? outfield.reduce((s, p) => s + (p.fatigue || 0), 0) / outfield.length : 0;
  const fatigueMalus = (avgFatigue / 100) * 4;

  // styles de jeu adverses : possession bat le jeu direct, le direct bat le contre, le contre bat la possession
  let styleBonus = 0;
  if (opponentPlaystyle && club.playstyle) {
    const beats = { possession: "direct", direct: "contre", contre: "possession" };
    if (beats[club.playstyle] === opponentPlaystyle) styleBonus = 2;
    else if (beats[opponentPlaystyle] === club.playstyle) styleBonus = -1;
  }

  return {
    defenseRating: gk * 0.4 + def * 0.6 + formBonus - fatigueMalus,
    attackRating: att * 0.65 + mil * 0.35 + formBonus - fatigueMalus + styleBonus
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
  if (isUserClub(club.id)) {
    state.log.unshift({ date: fmtDate(state.date), text: `${victim.firstName} ${victim.lastName} se blesse, indisponible environ ${Math.round(days / 7)} semaine(s).` });
  }
}

function simulateMatch(home, away) {
  const dateKey = state.date.toISOString().slice(0, 10);
  const homeR = computeMatchRatings(home, dateKey, away.playstyle);
  const awayR = computeMatchRatings(away, dateKey, home.playstyle);
  const homeAdvantage = 4;

  const homeExpected = clamp(1.25 + (homeR.attackRating + homeAdvantage * 0.5 - awayR.defenseRating) / 22, 0.15, 4.2);
  const awayExpected = clamp(1.0 + (awayR.attackRating - (homeR.defenseRating + homeAdvantage * 0.5)) / 22, 0.1, 4.0);

  // carton rouge éventuel (au plus un par équipe) : détecté avant le calcul des buts pour
  // avoir un vrai effet sur le score, pas seulement une mention cosmétique après coup
  const preHomeLineup = buildLineup(home, dateKey);
  const preAwayLineup = buildLineup(away, dateKey);
  const homeRed = detectRedCard(preHomeLineup);
  const awayRed = detectRedCard(preAwayLineup);

  let homeGoals, awayGoals;
  if (homeRed || awayRed) {
    // un seul carton retenu (le plus tôt) pour garder un modèle simple à deux périodes
    const redMinute = Math.min(homeRed ? homeRed.minute : 999, awayRed ? awayRed.minute : 999);
    const frac1 = redMinute / 90, frac2 = 1 - frac1;
    homeGoals = poissonish(homeExpected * frac1) + poissonish(homeExpected * frac2 * (awayRed ? 1.15 : homeRed ? 0.72 : 1));
    awayGoals = poissonish(awayExpected * frac1) + poissonish(awayExpected * frac2 * (homeRed ? 1.15 : awayRed ? 0.72 : 1));
  } else {
    homeGoals = poissonish(homeExpected);
    awayGoals = poissonish(awayExpected);
  }
  const homeScorers = pickScorers(home, homeGoals, dateKey);
  const awayScorers = pickScorers(away, awayGoals, dateKey);

  const homeLineup = preHomeLineup;
  const awayLineup = preAwayLineup;
  const homeBench = buildBench(home, dateKey, homeLineup);
  const awayBench = buildBench(away, dateKey, awayLineup);
  const homeSubs = simulateSubstitutions(homeLineup, homeBench);
  const awaySubs = simulateSubstitutions(awayLineup, awayBench);
  trackMatchesPlayed(homeLineup);
  trackMatchesPlayed(awayLineup);
  applyFatigue(homeLineup);
  applyFatigue(awayLineup);
  const redIds = new Set([homeRed && homeRed.player.id, awayRed && awayRed.player.id].filter(Boolean));
  const homeCards = generateCards(homeLineup, redIds);
  const awayCards = generateCards(awayLineup, redIds);
  if (homeRed) homeCards.push({ name: `${homeRed.player.firstName} ${homeRed.player.lastName}`, type: "red", minute: homeRed.minute });
  if (awayRed) awayCards.push({ name: `${awayRed.player.firstName} ${awayRed.player.lastName}`, type: "red", minute: awayRed.minute });
  decaySuspensions(home);
  decaySuspensions(away);

  maybeInjure(home, dateKey);
  maybeInjure(away, dateKey);

  applyResult(home, away, homeGoals, awayGoals);
  const motm = pickManOfTheMatch(homeLineup, awayLineup, homeGoals, awayGoals);
  return {
    homeGoals, awayGoals, homeScorers, awayScorers,
    homeLineup: homeLineup.map(p => ({ name: `${p.firstName} ${p.lastName}`, position: p.position })),
    awayLineup: awayLineup.map(p => ({ name: `${p.firstName} ${p.lastName}`, position: p.position })),
    homeBench: homeBench.map(p => ({ name: `${p.firstName} ${p.lastName}`, position: p.position })),
    awayBench: awayBench.map(p => ({ name: `${p.firstName} ${p.lastName}`, position: p.position })),
    homeSubs, awaySubs,
    homeCards, awayCards, motm
  };
}

// ---- Homme du match : parmi les buteurs, sinon un joueur au hasard du camp vainqueur ----
function pickManOfTheMatch(homeLineup, awayLineup, homeGoals, awayGoals) {
  const winnerLineup = homeGoals >= awayGoals ? homeLineup : awayLineup;
  if (!winnerLineup.length) return null;
  const candidate = weightedPick(winnerLineup);
  if (!candidate) return null;
  candidate.motmCount = (candidate.motmCount || 0) + 1;
  return `${candidate.firstName} ${candidate.lastName}`;
}

// ---- Fatigue : chaque match joué fatigue un peu, chaque jour de repos en récupère un peu ----
function applyFatigue(lineup) {
  lineup.forEach(p => { p.fatigue = clamp((p.fatigue || 0) + randInt(12, 20), 0, 100); });
}
function recoverFatigueDaily() {
  allClubs().forEach(club => {
    club.players.forEach(p => { if (p.fatigue) p.fatigue = clamp(p.fatigue - 6, 0, 100); });
  });
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
  if (hg > ag) { home.won++; home.points += 3; away.lost++; updateStreak(home, "W"); updateStreak(away, "L"); }
  else if (hg < ag) { away.won++; away.points += 3; home.lost++; updateStreak(home, "L"); updateStreak(away, "W"); }
  else { home.draw++; away.draw++; home.points += 1; away.points += 1; updateStreak(home, "D"); updateStreak(away, "D"); }
}

function updateStreak(club, result) {
  const s = club.formStreak || { type: null, count: 0 };
  if (s.type === result) s.count = Math.min(s.count + 1, 6);
  else { s.type = result; s.count = 1; }
  club.formStreak = s;
}

// ---- Objectifs de saison fixés par le "conseil" du club ----
function assignObjective(club) {
  const nDiv = DIVISION_COUNT[club.countryKey] || 2;
  const topLabel = (LEAGUE_NAMES[club.countryKey] && LEAGUE_NAMES[club.countryKey].d1) || "Élite";
  if (club.division === 1) {
    if (club.tierFactor > 0.75) { club.objectiveType = "top3"; club.objectiveLabel = "Viser le podium (top 3)"; }
    else if (club.tierFactor > 0.5) { club.objectiveType = "top6"; club.objectiveLabel = "Finir dans le top 6"; }
    else { club.objectiveType = "maintien"; club.objectiveLabel = "Assurer le maintien"; }
  } else if (club.division >= nDiv) {
    club.objectiveType = "milieu"; club.objectiveLabel = "Terminer en milieu de tableau";
  } else {
    if (club.tierFactor > 0.55) { club.objectiveType = "promotion"; club.objectiveLabel = `Monter en division ${club.division - 1 === 1 ? "1 (" + topLabel + ")" : club.division - 1}`; }
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
  const league = country.leagues["d" + club.division] || country.leagues.d1;
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
  checkSponsorRenewals();
  allClubs().forEach(club => {
    recomputeWageBill(club);
    const sponsor = club.sponsorContract ? club.sponsorContract.amount : club.sponsorIncome;
    const cap = club.stadiumCapacity || 15000;
    const fillRate = attendanceRate(club);
    const ticketPrice = 12 + club.reputation * 0.25; // prix moyen du billet, plus cher pour les grands clubs
    const attendance = Math.round(cap * fillRate);
    const ticketing = Math.round((club.homeMatchesThisMonth || 0) * attendance * ticketPrice);
    const merchandising = Math.round(club.reputation * 1500 + club.homeMatchesThisMonth * club.reputation * 300);
    const { rank, total } = leagueStandingOf(club);
    const tvBase = Math.round(900_000 / club.division);
    const tvRights = Math.round(tvBase * (total - rank + 1) / total);
    const wages = club.wageBill;
    const loanPayment = processLoanPayments(club);
    const transfersNet = club.monthlyTransferNet;
    const otherIncome = (club.monthlyOtherIncome || 0) + tvRights;
    const balanceChange = sponsor + ticketing + merchandising + otherIncome - wages - loanPayment + transfersNet;
    club.budget += balanceChange;
    club.lastAttendance = attendance;
    club.financeHistory.unshift({
      month: monthKey(state.date), sponsor, ticketing, merchandising, tvRights, otherIncome, wages, loanPayment, transfersNet,
      balanceChange, budgetAfter: club.budget
    });
    if (club.financeHistory.length > 12) club.financeHistory.length = 12;
    club.monthlyTransferNet = 0;
    club.monthlyOtherIncome = 0;
    club.homeMatchesThisMonth = 0;
  });
}

// ---- Avancer le temps d'un jour ----
// ---- Historique des confrontations directes + records de club ----
function h2hKey(id1, id2) { return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`; }
function recordH2H(homeId, awayId, homeGoals, awayGoals, competition) {
  state.h2h = state.h2h || {};
  const key = h2hKey(homeId, awayId);
  state.h2h[key] = state.h2h[key] || [];
  state.h2h[key].unshift({ date: fmtDate(state.date), homeId, awayId, homeGoals, awayGoals, competition });
  if (state.h2h[key].length > 20) state.h2h[key].length = 20;
}
function getH2H(id1, id2) { return (state.h2h || {})[h2hKey(id1, id2)] || []; }
function updateClubRecord(club, goalsFor, goalsAgainst, opponentName) {
  club.records = club.records || { biggestWin: null, topScorerName: null, topScorerGoals: 0 };
  const margin = goalsFor - goalsAgainst;
  if (margin > 0) {
    const prevMargin = club.records.biggestWin ? club.records.biggestWin.margin : -1;
    if (margin > prevMargin) {
      club.records.biggestWin = { margin, score: `${goalsFor}-${goalsAgainst}`, opponent: opponentName, date: fmtDate(state.date) };
    }
  }
}

function advanceDay() {
  state.dayCounter++;
  state.date = new Date(state.date.getTime() + 24 * 3600 * 1000);
  state.lastMatchResult = null;
  state.lastCupResult = null;
  recoverFatigueDaily();
  const todayKey = state.date.toISOString().slice(0, 10);

  // simuler les journées de championnat programmées ce jour
  Object.values(state.countries).forEach(country => {
    Object.values(country.leagues).forEach(league => {
      league.fixtures.forEach(round => {
        if (round.date.slice(0, 10) !== todayKey) return;
        round.matches.forEach(m => {
          if (m.played) return;
          const home = getClub(m.home), away = getClub(m.away);
          if (!home || !away) return;
          const { homeGoals, awayGoals, homeScorers, awayScorers, homeLineup, awayLineup, homeBench, awayBench, homeSubs, awaySubs, homeCards, awayCards, motm } = simulateMatch(home, away);
          m.played = true; m.homeGoals = homeGoals; m.awayGoals = awayGoals;
          if (isUserClub(home.id) || isUserClub(away.id)) {
            recordH2H(home.id, away.id, homeGoals, awayGoals, league.name);
            if (isUserClub(home.id)) updateClubRecord(home, homeGoals, awayGoals, away.name);
            if (isUserClub(away.id)) updateClubRecord(away, awayGoals, homeGoals, home.name);
          }
          if (home.id === state.userClubId || away.id === state.userClubId) {
            state.lastMatchResult = {
              homeName: home.name, awayName: away.name, homeGoals, awayGoals, isHome: home.id === state.userClubId, homeScorers, awayScorers,
              homeLineup, awayLineup, homeBench, awayBench, homeSubs, awaySubs, homeCards, awayCards, motm
            };
            const scorersTxt = [...homeScorers, ...awayScorers].length ? ` (Buts : ${[...homeScorers, ...awayScorers].join(", ")})` : "";
            state.log.unshift({ date: fmtDate(state.date), text: `Résultat : ${home.name} ${homeGoals} - ${awayGoals} ${away.name}${scorersTxt}` });
            [...homeCards, ...awayCards].filter(c => c.type !== "yellow").forEach(c => {
              state.log.unshift({ date: fmtDate(state.date), text: `${c.name} : ${c.type === "red" ? `carton rouge${c.minute ? ` (${c.minute}ᵉ minute)` : ""}, suspendu` : "suspendu pour cumul de cartons jaunes"}.` });
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
// avance un nombre fixe de jours sans se soucier des popups (mode simulation rapide)
function advanceMultipleDays(days) {
  let matchesPlayed = 0, offersReceived = 0;
  for (let i = 0; i < days; i++) {
    if (state.seasonComplete) break;
    const inboxBefore = state.inbox.filter(o => !o.resolved).length;
    advanceDay();
    if (state.lastMatchResult) matchesPlayed++;
    const inboxAfter = state.inbox.filter(o => !o.resolved).length;
    if (inboxAfter > inboxBefore) offersReceived += (inboxAfter - inboxBefore);
  }
  state.lastMatchResult = null; // pas de popup en mode simulation rapide
  return { matchesPlayed, offersReceived };
}

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
  (state.userClubIds || []).forEach(id => { const c = getClub(id); if (c) playPreseasonFriendlies(c); });
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
  if (isUserClub(from.id) || isUserClub(to.id)) state.log.unshift({ date: fmtDate(state.date), text });
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
        if ((from && isUserClub(from.id)) || (to && isUserClub(to.id))) state.log.unshift({ date: fmtDate(state.date), text });
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
  const candidates = allClubs().filter(c => !isUserClub(c.id) && c.reputation > current.reputation + 8);
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
    if (oldClub) {
      oldClub.isUserClub = false;
      state.userClubIds = (state.userClubIds || []).filter(id => id !== oldClub.id);
    }
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
  if (!state.ds.careerHistory) state.ds.careerHistory = [];
  if (!state.ds.reputationHistory) state.ds.reputationHistory = [{ year: state.season.year, reputation: state.ds.reputation }];
  if (!state.loans) state.loans = [];
  if (!state.userClubIds) state.userClubIds = state.userClubId ? [state.userClubId] : [];
  if (!state.h2h) state.h2h = {};
  if (!state.notifSettings) state.notifSettings = { blessures: true, transferts: true, resultats: true };
  allClubs().forEach(c => {
    if (c.stadiumCapacity === undefined) c.stadiumCapacity = Math.round(6000 + (c.tierFactor || 0.4) * 55000);
    if (c.trainingCenterLevel === undefined) c.trainingCenterLevel = 1;
    if (!c.loans) c.loans = [];
    if (!c.sponsorContract) c.sponsorContract = { name: "Sponsor historique", amount: c.sponsorIncome, monthsLeft: randInt(6, 24), totalMonths: 24 };
    if (!c.owner) assignOwnerProfile(c);
    if (c.nickname === undefined) c.nickname = "";
    if (c.anthem === undefined) c.anthem = "";
    if (!c.logoShape) c.logoShape = "shield";
    if (!c.logoColor) c.logoColor = c.kitColor || "#B9862E";
    if (!c.records) c.records = { biggestWin: null, topScorerName: null, topScorerGoals: 0 };
    if (!c.playstyle) c.playstyle = pick(["possession", "contre", "direct", "equilibre"]);
    if (!c.formStreak) c.formStreak = { type: null, count: 0 };
    if (!c.trophies) c.trophies = [];
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
      if (p.loyalty === undefined) p.loyalty = randInt(10, 95);
      if (p.fatigue === undefined) p.fatigue = 0;
      if (p.motmCount === undefined) p.motmCount = 0;
      if (p.internationalCaps === undefined) p.internationalCaps = Math.random() < 0.08 ? randInt(1, 40) : 0;
    });
  });
}
function hasSave() { return !!localStorage.getItem("ds_save_v1"); }
function deleteSave() { localStorage.removeItem("ds_save_v1"); }

// ---- Export / import de la sauvegarde sous forme de fichier JSON ----
function exportSaveToFile() {
  saveGame();
  const raw = localStorage.getItem("ds_save_v1");
  if (!raw) return;
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateTag = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `directeur-sportif-sauvegarde-${dateTag}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importSaveFromJSON(jsonText) {
  const parsed = JSON.parse(jsonText); // lève une erreur si invalide
  if (!parsed || !parsed.ds || !parsed.date) throw new Error("format invalide");
  localStorage.setItem("ds_save_v1", jsonText);
  loadGame();
}

// =====================================================================
// NOUVELLES FONCTIONNALITÉS : renouvellement de contrat, discussion avec
// un joueur, offres de recrutement du DS, amicaux de pré-saison,
// classements globaux, comparaison de joueurs, historique du club.
// =====================================================================

// ---- Étoiles façon FM (1 à 5) pour le niveau actuel et le potentiel ----
function starRating(value20) { return clamp(Math.round((value20 / 100) * 5 * 5) / 5, 0.5, 5); }
function overallStars(overall) { return clamp(Math.round(overall / 100 * 5 * 2) / 2, 0.5, 5); }

// ---- Renouvellement de contrat ----
// Retourne { accept, wageAsked, yearsOffered, reason } sans rien modifier tant que confirmRenewal n'est pas appelé.
function evaluateRenewal(player, proposedWage, proposedYears) {
  const club = getClub(player.clubId);
  const currentYear = new Date(state.date).getFullYear();
  const yearsLeft = (player.contractEndYear || currentYear) - currentYear;
  const wageRatio = proposedWage / Math.max(1, player.wage);
  // un joueur en fin de contrat et fidèle accepte plus facilement une offre correcte
  let acceptChance = 0.35 + (wageRatio - 1) * 1.2 + (player.loyalty / 100) * 0.25 - (yearsLeft > 2 ? 0.25 : 0);
  acceptChance = clamp(acceptChance, 0.05, 0.95);
  const accept = Math.random() < acceptChance;
  return { accept, acceptChance };
}
function confirmRenewal(playerId, proposedWage, proposedYears) {
  const player = getPlayer(playerId);
  if (!player) return { ok: false };
  const evalRes = evaluateRenewal(player, proposedWage, proposedYears);
  if (evalRes.accept) {
    player.wage = proposedWage;
    player.contractEndYear = new Date(state.date).getFullYear() + proposedYears;
    const club = getClub(player.clubId);
    if (club && isUserClub(club.id)) {
      state.log.unshift({ date: fmtDate(state.date), text: `${player.firstName} ${player.lastName} prolonge jusqu'en ${player.contractEndYear} (${fmtMoney(proposedWage)}/mois).` });
    }
  }
  return { ok: true, accepted: evalRes.accept };
}

// ---- Discuter avec un joueur pour influencer son moral ----
function talkToPlayer(playerId, tone) {
  const player = getPlayer(playerId);
  if (!player) return null;
  let delta = 0, message = "";
  if (tone === "encourager") {
    delta = randInt(2, 8);
    message = `${player.firstName} ${player.lastName} apprécie vos encouragements.`;
  } else if (tone === "feliciter") {
    delta = randInt(4, 10);
    message = `${player.firstName} ${player.lastName} est ravi de vos félicitations.`;
  } else if (tone === "recadrer") {
    // recadrer un joueur est risqué : ça peut motiver ou braquer selon sa loyauté
    if (Math.random() * 100 < player.loyalty) {
      delta = randInt(3, 9);
      message = `${player.firstName} ${player.lastName} prend votre recadrage de façon constructive.`;
    } else {
      delta = -randInt(4, 12);
      message = `${player.firstName} ${player.lastName} n'a pas apprécié d'être recadré.`;
    }
  }
  player.morale = clamp((player.morale || 60) + delta, 0, 100);
  return { delta, message, morale: player.morale };
}

// ---- Amicaux de pré-saison (flavor, sans impact sur le classement) ----
function playPreseasonFriendlies(club) {
  if (!club) return [];
  const opponents = allClubs().filter(c => c.id !== club.id && c.countryKey === club.countryKey);
  const results = [];
  for (let i = 0; i < 2 && opponents.length; i++) {
    const opp = pick(opponents);
    const dateKey = state.date.toISOString().slice(0, 10);
    const homeR = computeMatchRatings(club, dateKey, opp.playstyle);
    const awayR = computeMatchRatings(opp, dateKey, club.playstyle);
    const hg = poissonish(clamp(1.1 + (homeR.attackRating - awayR.defenseRating) / 24, 0.2, 3.5));
    const ag = poissonish(clamp(1.0 + (awayR.attackRating - homeR.defenseRating) / 24, 0.2, 3.5));
    results.push({ opponent: opp.name, homeGoals: hg, awayGoals: ag });
  }
  if (isUserClub(club.id) && results.length) {
    results.forEach(r => {
      state.log.unshift({ date: fmtDate(state.date), text: `Amical de pré-saison : ${club.name} ${r.homeGoals} - ${r.awayGoals} ${r.opponent}.` });
    });
  }
  return results;
}

// ---- Classements et statistiques transverses (lecture seule) ----
function getLeagueStandings(countryKey, divKey) {
  const league = state.countries[countryKey] && state.countries[countryKey].leagues[divKey];
  if (!league) return [];
  return [...league.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
}
function getLeagueTopScorers(countryKey, divKey, limit) {
  const league = state.countries[countryKey] && state.countries[countryKey].leagues[divKey];
  if (!league) return [];
  const all = [];
  league.clubs.forEach(c => c.players.forEach(p => {
    if ((p.seasonStats && p.seasonStats.goals) > 0) all.push({ name: `${p.firstName} ${p.lastName}`, club: c.name, goals: p.seasonStats.goals, assists: p.seasonStats.assists });
  }));
  return all.sort((a, b) => b.goals - a.goals).slice(0, limit || 15);
}
function getLeagueTopAssists(countryKey, divKey, limit) {
  const league = state.countries[countryKey] && state.countries[countryKey].leagues[divKey];
  if (!league) return [];
  const all = [];
  league.clubs.forEach(c => c.players.forEach(p => {
    if ((p.seasonStats && p.seasonStats.assists) > 0) all.push({ name: `${p.firstName} ${p.lastName}`, club: c.name, goals: p.seasonStats.goals, assists: p.seasonStats.assists });
  }));
  return all.sort((a, b) => b.assists - a.assists).slice(0, limit || 15);
}

// ---- Rival historique : l'autre club de la même ville, s'il existe ----
function getRivalClub(club) {
  const sameCity = allClubs().filter(c => c.id !== club.id && c.countryKey === club.countryKey && c.city === club.city);
  if (sameCity.length) return sameCity.sort((a, b) => b.reputation - a.reputation)[0];
  return null;
}

// =====================================================================
// INFRASTRUCTURES : agrandissement du stade et amélioration du centre
// de formation. Effets durables (capacité, qualité/quantité des jeunes).
// =====================================================================
function stadiumUpgradeCost(club, extraSeats) {
  const costPerSeat = 900 + (club.reputation || 50) * 4;
  return Math.round(extraSeats * costPerSeat);
}
function investInStadium(clubId, extraSeats) {
  const club = getClub(clubId);
  if (!club || extraSeats <= 0) return { ok: false };
  const cost = stadiumUpgradeCost(club, extraSeats);
  if (club.budget < cost) return { ok: false, reason: "budget", cost };
  club.budget -= cost;
  club.stadiumCapacity = (club.stadiumCapacity || 0) + extraSeats;
  if (isUserClub(club.id)) {
    state.log.unshift({ date: fmtDate(state.date), text: `Travaux d'agrandissement du stade : +${extraSeats.toLocaleString("fr-FR")} places pour ${fmtMoney(cost)} (nouvelle capacité : ${club.stadiumCapacity.toLocaleString("fr-FR")}).` });
  }
  return { ok: true, cost };
}
function trainingCenterCost(club) {
  const level = club.trainingCenterLevel || 1;
  return Math.round(1_200_000 * level);
}
function investInTrainingCenter(clubId) {
  const club = getClub(clubId);
  if (!club) return { ok: false };
  const level = club.trainingCenterLevel || 1;
  if (level >= 5) return { ok: false, reason: "max" };
  const cost = trainingCenterCost(club);
  if (club.budget < cost) return { ok: false, reason: "budget", cost };
  club.budget -= cost;
  club.trainingCenterLevel = level + 1;
  if (isUserClub(club.id)) {
    state.log.unshift({ date: fmtDate(state.date), text: `Centre de formation amélioré au niveau ${club.trainingCenterLevel} pour ${fmtMoney(cost)} : plus de jeunes, et de meilleure qualité.` });
  }
  return { ok: true, cost };
}

// =====================================================================
// SPONSORS À NÉGOCIER, EMPRUNTS BANCAIRES, ACTIONNAIRES/PROPRIÉTAIRE
// =====================================================================

// ---- Sponsors : contrat à durée limitée, plusieurs offres au renouvellement ----
function generateSponsorOffers(club) {
  const base = club.sponsorIncome || Math.round((club.tierFactor ** 2) * 6_000_000 + 150000);
  const durations = [6, 12, 24, 36];
  const offers = [];
  const usedNames = new Set();
  for (let i = 0; i < 3; i++) {
    let name = pick(SPONSOR_NAMES);
    while (usedNames.has(name) && usedNames.size < SPONSOR_NAMES.length) name = pick(SPONSOR_NAMES);
    usedNames.add(name);
    const months = pick(durations);
    // contrats courts : mieux payés mais moins stables ; contrats longs : plus sûrs mais moins généreux
    const durationFactor = months <= 6 ? 1.18 : months <= 12 ? 1.02 : months <= 24 ? 0.92 : 0.82;
    const variance = 0.85 + Math.random() * 0.3;
    const amount = Math.round(base * durationFactor * variance / 1000) * 1000;
    offers.push({ name, amount, months });
  }
  return offers;
}
function chooseSponsorOffer(clubId, offerIndex, offers) {
  const club = getClub(clubId);
  if (!club) return { ok: false };
  const offer = offers[offerIndex];
  if (!offer) return { ok: false };
  club.sponsorContract = { name: offer.name, amount: offer.amount, monthsLeft: offer.months, totalMonths: offer.months };
  club.sponsorIncome = offer.amount;
  club.pendingSponsorOffers = null;
  if (isUserClub(club.id)) {
    state.log.unshift({ date: fmtDate(state.date), text: `Nouveau sponsor maillot : ${offer.name}, ${fmtMoney(offer.amount)}/mois sur ${offer.months} mois.` });
  }
  return { ok: true };
}
function checkSponsorRenewals() {
  allClubs().forEach(club => {
    if (!club.sponsorContract) {
      club.sponsorContract = { name: "Sponsor historique", amount: club.sponsorIncome, monthsLeft: randInt(6, 24), totalMonths: 24 };
      return;
    }
    club.sponsorContract.monthsLeft--;
    if (club.sponsorContract.monthsLeft <= 0) {
      const offers = generateSponsorOffers(club);
      if (isUserClub(club.id)) {
        club.pendingSponsorOffers = offers;
        state.log.unshift({ date: fmtDate(state.date), text: `Le contrat avec ${club.sponsorContract.name} arrive à échéance : de nouvelles offres de sponsoring sont disponibles (onglet Finances).` });
      } else {
        // l'IA choisit simplement l'offre la plus généreuse sur la durée totale
        const best = offers.reduce((a, b) => (a.amount * a.months > b.amount * b.months ? a : b));
        chooseSponsorOffer(club.id, offers.indexOf(best), offers);
      }
    }
  });
}

// ---- Emprunts bancaires ----
function maxLoanAmount(club) {
  return Math.round((club.wageBudgetMonthly || 1_000_000) * 8);
}
function takeLoan(clubId, amount, months) {
  const club = getClub(clubId);
  if (!club) return { ok: false };
  const cap = maxLoanAmount(club);
  const existingDebt = (club.loans || []).reduce((s, l) => s + l.remaining, 0);
  if (existingDebt + amount > cap) return { ok: false, reason: "cap", cap };
  const rate = 0.07; // taux annuel simplifié
  const totalToRepay = Math.round(amount * (1 + rate * (months / 12)));
  const monthlyPayment = Math.round(totalToRepay / months);
  club.loans = club.loans || [];
  club.loans.push({ id: nextId(), principal: amount, remaining: totalToRepay, monthlyPayment, monthsLeft: months });
  club.budget += amount;
  if (isUserClub(club.id)) {
    state.log.unshift({ date: fmtDate(state.date), text: `Emprunt bancaire de ${fmtMoney(amount)} sur ${months} mois (mensualité : ${fmtMoney(monthlyPayment)}).` });
  }
  return { ok: true };
}
function processLoanPayments(club) {
  if (!club.loans || !club.loans.length) return 0;
  let total = 0;
  club.loans.forEach(loan => {
    const payment = Math.min(loan.monthlyPayment, loan.remaining);
    loan.remaining -= payment;
    loan.monthsLeft--;
    total += payment;
  });
  club.loans = club.loans.filter(l => l.remaining > 0 && l.monthsLeft > 0);
  return total;
}

// ---- Actionnaires / propriétaire : exigences propres, menace de vente ----
function assignOwnerProfile(club) {
  const profiles = [
    { type: "ambitieux", label: "Propriétaire ambitieux", patience: 2, description: "Exige des résultats rapides, sinon il menace de vendre le club." },
    { type: "patient", label: "Propriétaire patient", patience: 5, description: "Laisse du temps pour construire un projet, mais suit les finances de près." },
    { type: "investisseur", label: "Fonds d'investissement", patience: 3, description: "Veut voir la valeur du club augmenter, peu importe le classement." },
    { type: "local", label: "Actionnariat populaire", patience: 4, description: "Attaché à l'identité du club, tolérant tant que les comptes sont sains." }
  ];
  club.owner = { ...pick(profiles), badSeasons: 0, forSale: false };
}
function evaluateOwnerPatience(club) {
  if (!club.owner) assignOwnerProfile(club);
  const owner = club.owner;
  const objectiveMet = club.lastObjectiveMet !== false;
  const financiallyHealthy = club.budget > -Math.abs(club.wageBudgetMonthly || 0);
  if (!objectiveMet || !financiallyHealthy) owner.badSeasons++;
  else owner.badSeasons = Math.max(0, owner.badSeasons - 1);
  if (owner.badSeasons >= owner.patience) {
    owner.forSale = true;
    if (isUserClub(club.id)) {
      state.log.unshift({ date: fmtDate(state.date), text: `${owner.label} de ${club.name} menace de mettre le club en vente après plusieurs saisons décevantes.` });
    }
  }
}
