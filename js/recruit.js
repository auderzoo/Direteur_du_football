/* =====================================================================
   RECRUTEMENT : staff technique, budgets calculés, réseau de scouts par pays,
   recherche multicritères, clubs affiliés / parent, événements de joueurs.
   (Module chargé après engine.js ; tout est stocké dans `state`, donc sauvegardé.)
   ===================================================================== */

// ---------------------------------------------------------------------
// STAFF TECHNIQUE
// ---------------------------------------------------------------------
const STAFF_ROLES = {
  entraineur: { label: "Entraîneur principal", icon: "🧢", max: 1, wageK: 1.7, effect: "Progression des jeunes, moral du groupe",
    attrs: ["tactique", "motivation", "discipline", "gestionDuGroupe", "formationDesJeunes", "adaptabilite"] },
  adjoint: { label: "Entraîneur adjoint", icon: "📋", max: 2, wageK: 1.0, effect: "Progression des joueurs, relais du coach",
    attrs: ["tactique", "motivation", "technique", "discipline", "gestionDuGroupe", "adaptabilite"] },
  recruteur: { label: "Recruteur", icon: "🔭", max: 5, wageK: 1.0, effect: "Découverte de joueurs et connaissance des pays",
    attrs: ["jugementNiveau", "jugementPotentiel", "reseau", "observation", "adaptabilite", "negociation"] },
  kine: { label: "Kinésithérapeute", icon: "🩺", max: 2, wageK: 0.9, effect: "Blessures plus rares et plus courtes",
    attrs: ["prevention", "readaptation", "diagnostic", "soins", "reactivite", "suiviIndividuel"] },
  preparateur: { label: "Préparateur physique", icon: "🏋️", max: 2, wageK: 0.9, effect: "Récupération de la fatigue, moins de blessures",
    attrs: ["endurance", "force", "vitesse", "recuperation", "prevention", "periodisation"] },
  gardiens: { label: "Entraîneur des gardiens", icon: "🧤", max: 1, wageK: 0.8, effect: "Progression des gardiens",
    attrs: ["reflexes", "placement", "jeuAuPied", "motivation", "technique", "discipline"] },
  analyste: { label: "Analyste vidéo", icon: "📈", max: 2, wageK: 0.9, effect: "Rapports de scouting plus précis",
    attrs: ["analyseVideo", "statistiques", "adversaires", "synthese", "reactivite", "precision"] },
  directeurFormation: { label: "Directeur du centre de formation", icon: "🎓", max: 1, wageK: 1.2, effect: "Qualité et nombre de jeunes issus du centre",
    attrs: ["jugementJeunes", "formation", "encadrement", "detection", "pedagogie", "reseau"] }
};
const STAFF_ATTR_LABELS = {
  tactique: "Tactique", motivation: "Motivation", discipline: "Discipline", gestionDuGroupe: "Gestion du groupe",
  formationDesJeunes: "Formation des jeunes", adaptabilite: "Adaptabilité", technique: "Technique",
  jugementNiveau: "Jugement du niveau", jugementPotentiel: "Jugement du potentiel", reseau: "Réseau de contacts",
  observation: "Observation", negociation: "Négociation",
  prevention: "Prévention", readaptation: "Réathlétisation", diagnostic: "Diagnostic", soins: "Soins",
  reactivite: "Réactivité", suiviIndividuel: "Suivi individuel",
  endurance: "Endurance", force: "Force", vitesse: "Vitesse", recuperation: "Récupération", periodisation: "Planification",
  reflexes: "Réflexes", placement: "Placement", jeuAuPied: "Jeu au pied",
  analyseVideo: "Analyse vidéo", statistiques: "Statistiques", adversaires: "Étude des adversaires", synthese: "Synthèse", precision: "Précision",
  jugementJeunes: "Jugement des jeunes", formation: "Formation", encadrement: "Encadrement", detection: "Détection", pedagogie: "Pédagogie"
};
const STAFF_ROLE_ORDER = ["entraineur", "adjoint", "recruteur", "kine", "preparateur", "gardiens", "analyste", "directeurFormation"];

function staffAbility(s) {
  const v = Object.values(s.attributes);
  return v.reduce((a, b) => a + b, 0) / v.length;
}
// niveau en étoiles (0.5 à 5) façon FM
function staffStars(s) { return clamp(Math.round(((staffAbility(s) - 3) / 15 * 5) * 2) / 2, 0.5, 5); }
function staffPotentialStars(s) { return clamp(Math.round(((s.potential - 3) / 15 * 5) * 2) / 2, staffStars(s), 5); }

function staffWageFor(ability, role) {
  const k = (STAFF_ROLES[role] || { wageK: 1 }).wageK;
  return Math.max(1500, Math.round(Math.pow(ability, 2) * 55 * k / 100) * 100);
}

function generateStaff(role, countryKey, quality) {
  const country = COUNTRIES[countryKey];
  const pool = NAME_POOLS[country.pool];
  const q = clamp(quality, 0.05, 1);
  const base = 4.5 + q * 10 + (Math.random() - 0.5) * 3;
  const attributes = {};
  STAFF_ROLES[role].attrs.forEach(k => { attributes[k] = clamp(Math.round(base + randInt(-3, 3)), 1, 20); });
  const age = randInt(28, 63);
  const s = {
    id: nextId(), firstName: pick(pool.first), lastName: pick(pool.last), nationality: country.label,
    age, role, attributes, clubId: null, contractEndYear: null, morale: randInt(55, 85),
    potential: 0, wage: 0
  };
  const ab = staffAbility(s);
  s.potential = clamp(Math.round(ab + (age < 40 ? randInt(0, 4) : age < 50 ? randInt(0, 2) : 0)), Math.round(ab), 20);
  s.wage = staffWageFor(ab, role);
  return s;
}

function generateStaffMarket() {
  const market = [];
  Object.keys(state.countries).forEach(ck => {
    STAFF_ROLE_ORDER.forEach(role => {
      const n = role === "recruteur" ? 6 : 3;
      for (let i = 0; i < n; i++) market.push(generateStaff(role, ck, 0.1 + Math.random() * 0.85));
    });
  });
  return market;
}

function getStaffMember(id) {
  let found = (state.staffMarket || []).find(s => s.id === id);
  if (found) return found;
  allClubs().forEach(c => { const s = (c.staff || []).find(x => x.id === id); if (s) found = s; });
  return found || null;
}
function staffByRole(club, role) { return (club.staff || []).filter(s => s.role === role); }
function staffWageBill(club) { return (club.staff || []).reduce((sum, s) => sum + s.wage, 0); }
function staffBudget(club) { return Math.round((club.wageBudgetMonthly || 0) * 0.10); }
// effet d'un rôle : moyenne des 2 meilleurs, normalisée 0..1 (0 si aucun)
function staffEffect(club, role) {
  const list = staffByRole(club, role).map(staffAbility).sort((a, b) => b - a).slice(0, 2);
  if (!list.length) return 0;
  return clamp((list.reduce((a, b) => a + b, 0) / list.length) / 20, 0, 1);
}

function ensureInitialStaff(club) {
  if (club.staff && club.staff.length) return;
  club.staff = [];
  const q = clamp(club.tierFactor || 0.4, 0.1, 0.95);
  const order = ["entraineur", "kine", "recruteur", "preparateur", "adjoint", "gardiens", "recruteur", "analyste", "directeurFormation"];
  const budget = staffBudget(club) * 0.9;
  order.forEach(role => {
    const s = generateStaff(role, club.countryKey, q + (Math.random() - 0.5) * 0.2);
    if (staffWageBill(club) + s.wage > budget) return;
    if (staffByRole(club, role).length >= STAFF_ROLES[role].max) return;
    s.clubId = club.id;
    s.contractEndYear = new Date(state.date).getFullYear() + randInt(1, 3);
    club.staff.push(s);
  });
}

function hireStaff(clubId, staffId, years) {
  const club = getClub(clubId), s = getStaffMember(staffId);
  if (!club || !s || s.clubId) return { ok: false, reason: "Ce membre du staff n'est plus disponible." };
  if (staffByRole(club, s.role).length >= STAFF_ROLES[s.role].max) return { ok: false, reason: "Tous les postes de ce type sont déjà pourvus." };
  if (staffWageBill(club) + s.wage > staffBudget(club)) return { ok: false, reason: `Budget staff dépassé (${fmtMoney(staffBudget(club))}/mois).` };
  club.staff = club.staff || [];
  state.staffMarket = (state.staffMarket || []).filter(x => x.id !== s.id);
  s.clubId = club.id;
  s.contractEndYear = new Date(state.date).getFullYear() + (years || 2);
  club.staff.push(s);
  if (isUserClub(club.id)) state.log.unshift({ date: fmtDate(state.date), text: `${s.firstName} ${s.lastName} rejoint le staff (${STAFF_ROLES[s.role].label}).` });
  return { ok: true };
}
function releaseStaff(clubId, staffId) {
  const club = getClub(clubId);
  const s = club && (club.staff || []).find(x => x.id === staffId);
  if (!s) return { ok: false };
  const severance = s.wage * 3;
  club.budget -= severance;
  club.staff = club.staff.filter(x => x.id !== staffId);
  // retire d'éventuelles missions de scouting
  if (club.scouting && club.scouting.assignments) delete club.scouting.assignments[staffId];
  s.clubId = null; s.contractEndYear = null;
  state.staffMarket = state.staffMarket || [];
  state.staffMarket.push(s);
  if (isUserClub(club.id)) state.log.unshift({ date: fmtDate(state.date), text: `${s.firstName} ${s.lastName} (${STAFF_ROLES[s.role].label}) quitte le staff (indemnité ${fmtMoney(severance)}).` });
  return { ok: true, severance };
}
function renewStaff(clubId, staffId) {
  const club = getClub(clubId);
  const s = club && (club.staff || []).find(x => x.id === staffId);
  if (!s) return { ok: false };
  const newWage = Math.round(s.wage * 1.08 / 100) * 100;
  if (staffWageBill(club) - s.wage + newWage > staffBudget(club)) return { ok: false, reason: "Budget staff insuffisant pour cette prolongation." };
  s.wage = newWage;
  s.contractEndYear = new Date(state.date).getFullYear() + 2;
  return { ok: true };
}
// fin de saison : les contrats échus quittent le club, le marché du staff se renouvelle
function staffSeasonTick() {
  const year = new Date(state.date).getFullYear();
  allClubs().forEach(club => {
    if (!club.staff || !club.staff.length) return;
    club.staff.filter(s => s.contractEndYear && s.contractEndYear <= year).forEach(s => {
      club.staff = club.staff.filter(x => x.id !== s.id);
      if (club.scouting && club.scouting.assignments) delete club.scouting.assignments[s.id];
      s.clubId = null; s.contractEndYear = null;
      state.staffMarket.push(s);
      if (isUserClub(club.id)) state.log.unshift({ date: fmtDate(state.date), text: `Le contrat de ${s.firstName} ${s.lastName} (${STAFF_ROLES[s.role].label}) arrive à terme : il quitte le staff.` });
    });
    club.staff.forEach(s => { s.age++; });
  });
  // renouvellement partiel du marché
  state.staffMarket = (state.staffMarket || []).filter(() => Math.random() > 0.3);
  Object.keys(state.countries).forEach(ck => {
    STAFF_ROLE_ORDER.forEach(role => {
      const n = role === "recruteur" ? 2 : 1;
      for (let i = 0; i < n; i++) state.staffMarket.push(generateStaff(role, ck, 0.1 + Math.random() * 0.85));
    });
  });
}

// ---------------------------------------------------------------------
// BUDGETS CALCULÉS SELON LES FINANCES DU CLUB
// ---------------------------------------------------------------------
function recentMonthlyRevenue(club) {
  const h = (club.financeHistory || []).slice(0, 3);
  if (!h.length) return null;
  return h.reduce((s, x) => s + (x.sponsor || 0) + (x.ticketing || 0) + (x.merchandising || 0) + (x.otherIncome || 0), 0) / h.length;
}
function recalcBudgets(club) {
  if (!club.wageAnchor) club.wageAnchor = club.wageBudgetMonthly;
  const rev = recentMonthlyRevenue(club);
  const finLvl = (state.ds.skills && state.ds.skills.finance) || 0;
  let base = club.wageAnchor;
  if (rev) base = 0.5 * club.wageAnchor + 0.5 * rev * 0.7;
  club.wageBudgetMonthly = Math.round(base * (1 + 0.03 * finLvl));
}
function totalDebt(club) { return (club.loans || []).reduce((s, l) => s + l.remaining, 0); }
function getTransferBudget(club) {
  const reserve = 2 * ((club.wageBill || 0) + staffWageBill(club));
  const share = ({ ambitieux: 0.7, patient: 0.5, investisseur: 0.4, local: 0.55 })[club.owner && club.owner.type] || 0.55;
  return Math.max(0, Math.round((club.budget - reserve - totalDebt(club) * 0.25) * share));
}
function wageBudgetRemaining(club) { return Math.max(0, Math.round(club.wageBudgetMonthly * 1.05 - club.wageBill)); }

// ---------------------------------------------------------------------
// FICHE / CONNAISSANCE DES JOUEURS (précision de l'information)
// ---------------------------------------------------------------------
function hashUnit(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function ensureScouting(club) {
  if (!club.scouting) club.scouting = { knowledge: {}, known: {}, assignments: {}, observations: [], reports: [], shortlist: [], affiliates: [] };
  const sc = club.scouting;
  Object.keys(state.countries).forEach(k => { if (sc.knowledge[k] === undefined) sc.knowledge[k] = (k === club.countryKey ? 70 : 8); });
  return sc;
}
function isAffiliated(club, otherClubId) {
  return !!(club && club.scouting && club.scouting.affiliates.some(a => a.clubId === otherClubId));
}
function divisionThreshold(tier) { return 25 + 15 * (tier - 1); }

function playerVisibleTo(club, p, pClub) {
  if (pClub.id === club.id) return true;
  const sc = ensureScouting(club);
  if (isAffiliated(club, pClub.id)) return true;
  if ((sc.known[p.id] || 0) > 0) return true;
  if (p.overall >= 80) return true;
  return (sc.knowledge[pClub.countryKey] || 0) >= divisionThreshold(pClub.division);
}
// 0..100 : précision de l'information dont dispose le club sur ce joueur
function playerKnowledge(club, p, pClub) {
  if (!club || !pClub) return 100;
  if (pClub.id === club.id || isAffiliated(club, pClub.id)) return 100;
  const sc = ensureScouting(club);
  const base = Math.round((sc.knowledge[pClub.countryKey] || 0) * 0.45);
  let k = Math.max(sc.known[p.id] || 0, base);
  if (p.overall >= 80) k = Math.max(k, 55);
  return clamp(k, 0, 100);
}
function knowledgeOfPlayerForUser(p) {
  const club = userClub();
  if (!club) return 100;
  const pClub = getClub(p.clubId);
  return playerKnowledge(club, p, pClub);
}
// étoiles estimées (fourchettes) : plus la connaissance est faible, plus la fourchette est large
function playerStarView(p, pk) {
  const lvl = overallStars(p.overall), pot = overallStars(p.potential);
  const hw = pk >= 80 ? 0 : pk >= 60 ? 0.5 : pk >= 40 ? 1 : 1.5;
  const hwP = pk >= 90 ? 0 : hw + 0.5;
  const off = hashUnit(p.id) * 2 - 1, offP = hashUnit(p.id + 7) * 2 - 1;
  const cl = lvl + off * hw * 0.6, cp = pot + offP * hwP * 0.6;
  const r = x => clamp(Math.round(x * 2) / 2, 0.5, 5);
  return {
    level: [r(cl - hw), r(cl + hw)], potential: [Math.max(r(cp - hwP), r(cl - hw)), r(cp + hwP)],
    levelMid: r(cl), exact: pk >= 90
  };
}

// ---------------------------------------------------------------------
// SCOUTING PAR PAYS
// ---------------------------------------------------------------------
function scoutSkill(scout) {
  const a = scout.attributes;
  return ((a.jugementNiveau || 8) + (a.reseau || 8) + (a.observation || 8)) / 3;
}
function scoutMission(club, scoutId) {
  const sc = ensureScouting(club);
  return sc.assignments[scoutId] || null;
}
function assignScout(clubId, scoutId, country, position, maxAge) {
  const club = getClub(clubId);
  if (!club) return false;
  const sc = ensureScouting(club);
  if (!country) { delete sc.assignments[scoutId]; return true; }
  sc.assignments[scoutId] = { country, position: position || "", maxAge: parseInt(maxAge, 10) || 0 };
  return true;
}
function toggleShortlist(clubId, playerId) {
  const club = getClub(clubId);
  const sc = ensureScouting(club);
  const i = sc.shortlist.indexOf(playerId);
  if (i >= 0) sc.shortlist.splice(i, 1); else sc.shortlist.push(playerId);
  return i < 0;
}
function requestObservation(clubId, playerId) {
  const club = getClub(clubId);
  const sc = ensureScouting(club);
  if (!staffByRole(club, "recruteur").length) return { ok: false, reason: "Aucun recruteur dans votre staff." };
  if (sc.observations.some(o => o.playerId === playerId)) return { ok: false, reason: "Observation déjà en cours." };
  sc.observations.push({ playerId, weeksLeft: 3 });
  return { ok: true };
}

const SCOUT_POS_LABEL = { GB: "gardien", DEF: "défenseur", MIL: "milieu", ATT: "attaquant" };
function scoutVerdict(club, p, scoutSkillValue) {
  const xi = club.players.filter(x => x.position === p.position).map(x => x.overall).sort((a, b) => b - a);
  const ref = xi.length ? xi[Math.min(1, xi.length - 1)] : 60;
  const jn = Math.round(4 - clamp(scoutSkillValue, 0, 20) / 20 * 3);
  const judged = p.overall + randInt(-jn, jn);
  const judgedPot = p.potential + randInt(-jn - 1, jn + 1);
  if (judged >= ref + 2 || (p.age <= 21 && judgedPot >= ref + 8)) return "Recruter";
  if (judged >= ref - 3 || judgedPot >= ref + 3) return "À suivre";
  return "Écarter";
}
function scoutReportText(p, skill) {
  const gkOnly = ["reflexes", "relance"];
  const entries = Object.entries(p.attributes)
    .filter(([k]) => p.position === "GB" ? true : !gkOnly.includes(k))
    .map(([k, v]) => [k, clamp(v + randInt(-1, 1), 1, 20)]);
  entries.sort((a, b) => b[1] - a[1]);
  const strong = entries.slice(0, 2).map(e => attrLabel(e[0]).toLowerCase());
  const weak = entries.slice(-1).map(e => attrLabel(e[0]).toLowerCase());
  let t = `${p.age} ans, ${SCOUT_POS_LABEL[p.position] || p.position}. Points forts : ${strong.join(" et ")}. À travailler : ${weak.join(", ")}.`;
  if (p.age <= 21) t += " Belle marge de progression.";
  else if (p.age >= 31) t += " Profil d'expérience, à court terme.";
  if (p.releaseClause) t += " Une clause libératoire existe.";
  return t;
}
function makeScoutReport(club, scout, p, pClub, pk) {
  const sc = ensureScouting(club);
  const skill = scoutSkill(scout);
  const rep = {
    id: nextId(), date: fmtDate(state.date), scoutId: scout.id, scoutName: `${scout.firstName} ${scout.lastName}`,
    playerId: p.id, clubId: pClub.id, country: pClub.countryKey, pk,
    text: scoutReportText(p, skill), verdict: scoutVerdict(club, p, skill)
  };
  sc.reports.unshift(rep);
  if (sc.reports.length > 60) sc.reports.length = 60;
  return rep;
}

function scoutingWeeklyTick(club) {
  const sc = ensureScouting(club);
  const scouts = staffByRole(club, "recruteur");
  if (!scouts.length) return;
  const analyst = staffEffect(club, "analyste") * 2;
  scouts.forEach(scout => {
    const m = sc.assignments[scout.id];
    if (!m || !m.country || !state.countries[m.country]) return;
    const skill = scoutSkill(scout) + analyst;
    let gain = 1 + skill / 20 * 4 + ((scout.attributes.reseau || 8) / 20) * 2;
    if ((sc.knowledge[m.country] || 0) >= 80) gain *= 0.5;
    sc.knowledge[m.country] = clamp((sc.knowledge[m.country] || 0) + gain, 0, 100);
    if (Math.random() < 0.5 + skill / 20 * 0.35) {
      const country = state.countries[m.country];
      const cands = [];
      Object.values(country.leagues).forEach(lg => lg.clubs.forEach(pc => {
        if (pc.id === club.id) return;
        pc.players.forEach(p => {
          if (m.position && p.position !== m.position) return;
          if (m.maxAge && p.age > m.maxAge) return;
          const kn = sc.known[p.id] || 0;
          if (kn >= 70) return;
          const w = (1 + (p.potential >= 75 ? 2 : 0) + (p.age <= 21 ? 1 : 0) + (skill / 20) * Math.max(0, p.potential - 60) / 10) * (kn > 0 ? 0.4 : 1);
          cands.push({ p, pc, w });
        });
      }));
      if (cands.length) {
        let total = cands.reduce((s, c) => s + c.w, 0), r = Math.random() * total, chosen = cands[0];
        for (const c of cands) { r -= c.w; if (r <= 0) { chosen = c; break; } }
        const k = clamp(Math.round(35 + skill * 2.2 + randInt(0, 15)), 0, 90);
        sc.known[chosen.p.id] = Math.max(sc.known[chosen.p.id] || 0, k);
        const rep = makeScoutReport(club, scout, chosen.p, chosen.pc, k);
        if (isUserClub(club.id)) state.log.unshift({ date: fmtDate(state.date), text: `Rapport de ${rep.scoutName} : ${chosen.p.firstName} ${chosen.p.lastName} (${chosen.pc.name}) — avis « ${rep.verdict} ».` });
      }
    }
  });
  // observations ciblées sur un joueur précis
  const best = scouts.reduce((a, b) => (scoutSkill(a) >= scoutSkill(b) ? a : b));
  sc.observations.forEach(o => {
    const p = getPlayer(o.playerId);
    if (!p) { o.weeksLeft = 0; return; }
    sc.known[p.id] = clamp((sc.known[p.id] || 0) + Math.round(15 + scoutSkill(best) * 1.2), 0, 100);
    o.weeksLeft--;
    if (o.weeksLeft <= 0) {
      const pc = getClub(p.clubId);
      if (pc) {
        const rep = makeScoutReport(club, best, p, pc, sc.known[p.id]);
        if (isUserClub(club.id)) state.log.unshift({ date: fmtDate(state.date), text: `Observation terminée : ${p.firstName} ${p.lastName} — avis « ${rep.verdict} ».` });
      }
    }
  });
  sc.observations = sc.observations.filter(o => o.weeksLeft > 0);
}

// ---------------------------------------------------------------------
// RECHERCHE MULTICRITÈRES
// ---------------------------------------------------------------------
function searchPlayers(club, f) {
  const sc = ensureScouting(club);
  const rows = [];
  const q = (f.q || "").toLowerCase();
  const attrFilters = (f.attrs || []).filter(a => a.key && a.min > 0);
  allClubs().forEach(pc => {
    if (pc.id === club.id) return;
    if (f.country && pc.countryKey !== f.country) return;
    if (f.tier && pc.division !== parseInt(f.tier, 10)) return;
    if (f.affiliatesOnly && !isAffiliated(club, pc.id)) return;
    pc.players.forEach(p => {
      if (f.pos && p.position !== f.pos) return;
      if (f.ageMin && p.age < f.ageMin) return;
      if (f.ageMax && p.age > f.ageMax) return;
      if (f.valueMax && p.value > f.valueMax) return;
      if (f.contractMax && (p.contractEndYear || 9999) > f.contractMax) return;
      if (q && !`${p.firstName} ${p.lastName}`.toLowerCase().includes(q)) return;
      if (f.nationality && !p.nationality.toLowerCase().includes(f.nationality.toLowerCase())) return;
      if (!playerVisibleTo(club, p, pc)) return;
      if (f.listedOnly && !p.listed) return;
      if (f.onLoanOnly && !p.onLoan) return;
      if (f.unhappyOnly && (p.morale === undefined || p.morale >= 40)) return;
      const pk = playerKnowledge(club, p, pc);
      const view = playerStarView(p, pk);
      if (f.levelMin && view.levelMid < f.levelMin) return;
      if (f.potMin && view.potential[1] < f.potMin) return;
      if (attrFilters.length) {
        const att = scoutedAttributes(p, pk);
        if (!attrFilters.every(a => att[a.key] && att[a.key].value >= a.min)) return;
      }
      rows.push({ p, club: pc, pk, view });
    });
  });
  const sorters = {
    level: (a, b) => b.view.levelMid - a.view.levelMid || b.p.overall - a.p.overall,
    potential: (a, b) => b.view.potential[1] - a.view.potential[1] || b.p.potential - a.p.potential,
    value: (a, b) => b.p.value - a.p.value,
    age: (a, b) => a.p.age - b.p.age
  };
  rows.sort(sorters[f.sort || "level"] || sorters.level);
  return rows;
}

// ---------------------------------------------------------------------
// CLUBS AFFILIÉS / CLUB PARENT
// ---------------------------------------------------------------------
function affiliationCandidates(club, type) {
  return allClubs().filter(c => {
    if (c.id === club.id || isUserClub(c.id) || c.countryKey !== club.countryKey) return false;
    if (isAffiliated(club, c.id)) return false;
    if (type === "parent") return c.division < club.division || c.reputation >= club.reputation + 12;
    return c.division >= club.division && c.reputation <= club.reputation + 5;
  }).sort((a, b) => b.reputation - a.reputation);
}
function affiliationCost(club, target, type) {
  return Math.round(target.reputation * 6000 * (type === "parent" ? 1.4 : 1));
}
function requestAffiliation(clubId, targetId, type) {
  const club = getClub(clubId), target = getClub(targetId);
  const sc = ensureScouting(club);
  if (!target) return { ok: false, reason: "Club introuvable." };
  const parents = sc.affiliates.filter(a => a.type === "parent").length;
  const affs = sc.affiliates.filter(a => a.type === "affilie").length;
  if (type === "parent" && parents >= 1) return { ok: false, reason: "Vous avez déjà un club parent." };
  if (type === "affilie" && affs >= 2) return { ok: false, reason: "Vous avez déjà deux clubs affiliés." };
  const cost = affiliationCost(club, target, type);
  if (club.budget < cost) return { ok: false, reason: `Frais de partenariat : ${fmtMoney(cost)} (trésorerie insuffisante).` };
  let chance;
  if (type === "parent") chance = clamp(0.3 + state.ds.reputation / 200 - (target.reputation - club.reputation) / 160, 0.08, 0.85);
  else chance = clamp(0.55 + (club.reputation - target.reputation) / 120 + state.ds.reputation / 300, 0.15, 0.95);
  if (Math.random() >= chance) return { ok: true, accepted: false, cost: 0 };
  club.budget -= cost;
  sc.affiliates.push({ clubId: target.id, type, since: fmtDate(state.date) });
  const text = type === "parent"
    ? `${target.name} devient le club parent de ${club.name} : prêts sans indemnité et pleine visibilité sur son effectif.`
    : `${target.name} devient club affilié de ${club.name} : prêts sans indemnité et pleine visibilité sur son effectif.`;
  state.news.unshift({ date: fmtDate(state.date), text });
  state.log.unshift({ date: fmtDate(state.date), text: `${text} (frais : ${fmtMoney(cost)})` });
  return { ok: true, accepted: true, cost };
}
function endAffiliation(clubId, targetId) {
  const club = getClub(clubId);
  const sc = ensureScouting(club);
  sc.affiliates = sc.affiliates.filter(a => a.clubId !== targetId);
}
function loanFeeWaived(fromClub, toClub) {
  return (isUserClub(fromClub.id) && isAffiliated(fromClub, toClub.id)) || (isUserClub(toClub.id) && isAffiliated(toClub, fromClub.id));
}

// ---------------------------------------------------------------------
// EFFETS DU STAFF (blessures, fatigue, progression, jeunes)
// ---------------------------------------------------------------------
function injuryRiskMult(club) {
  if (!isUserClub(club.id)) return 1;
  const prev = (staffEffect(club, "kine") + staffEffect(club, "preparateur")) / 2;
  return clamp(1.15 - prev * 0.45, 0.7, 1.15);
}
function injuryDurationMult(club) {
  if (!isUserClub(club.id)) return 1;
  return clamp(1.2 - staffEffect(club, "kine") * 0.55, 0.65, 1.2);
}
function fatigueRecoveryBonus(club) {
  if (!isUserClub(club.id)) return 0;
  return Math.round(staffEffect(club, "preparateur") * 4);
}
function staffDevelopmentTick() {
  (state.userClubIds || []).forEach(id => {
    const club = getClub(id);
    if (!club) return;
    const coach = (staffEffect(club, "entraineur") * 2 + staffEffect(club, "adjoint")) / 3;
    const gk = staffEffect(club, "gardiens");
    club.players.forEach(p => {
      if (p.age > 24 || p.overall >= p.potential) return;
      const eff = p.position === "GB" ? (coach + gk) / 2 : coach;
      if (Math.random() < 0.02 + eff * 0.07) {
        p.overall = clamp(p.overall + 1, 30, p.potential);
        p.value = computeValue(p);
      }
    });
  });
}

// ---------------------------------------------------------------------
// ÉVÉNEMENTS DE JOUEURS (augmentation, départ, mécontentement, prêt)
// ---------------------------------------------------------------------
function pendingPlayerEvents(club) {
  return state.inbox.filter(o => o.type === "player_event" && !o.resolved && (!club || o.clubId === club.id));
}
function addPlayerEvent(club, p, kind, data) {
  if (state.inbox.some(o => o.type === "player_event" && !o.resolved && o.playerId === p.id)) return null;
  if (pendingPlayerEvents(club).length >= 4) return null;
  const ev = { id: nextId(), type: "player_event", kind, playerId: p.id, clubId: club.id, date: fmtDate(state.date), dayCounter: state.dayCounter, resolved: false, data: data || {} };
  state.inbox.unshift(ev);
  return ev;
}
function generatePlayerEvents(club) {
  if (!club.players.length) return;
  const xi = [...club.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
  const avgXI = xi.reduce((s, p) => s + p.overall, 0) / xi.length;
  const year = new Date(state.date).getFullYear();
  const shuffled = [...club.players].sort(() => Math.random() - 0.5);
  let created = 0;
  for (const p of shuffled) {
    if (created >= 1) break;
    if (p.onLoan) continue;
    const st = p.seasonStats || { matches: 0 };
    // 1) demande d'augmentation : titulaire performant, sous-payé
    if (p.overall >= avgXI - 2 && p.morale >= 50 && st.matches >= 4 && (p.lastRaiseYear || 0) < year && Math.random() < 0.035) {
      const ask = Math.round(p.wage * (1.15 + Math.random() * 0.2) / 100) * 100;
      if (addPlayerEvent(club, p, "raise", { ask })) { created++; continue; }
    }
    // 2) veut quitter le club : très mécontent, ou trop bon pour le club
    if ((p.morale < 35 && Math.random() < 0.18) || (p.age <= 27 && p.overall >= avgXI + 5 && p.potential >= avgXI + 8 && p.loyalty < 55 && Math.random() < 0.04)) {
      if (addPlayerEvent(club, p, "leave", { reason: p.morale < 35 ? "morale" : "ambition" })) { created++; continue; }
    }
    // 3) demande à être prêté : jeune peu utilisé
    if (p.age <= 22 && p.potential >= p.overall + 4 && club.played >= 8 && st.matches <= club.played * 0.25 && Math.random() < 0.10) {
      if (addPlayerEvent(club, p, "loan_request", {})) { created++; continue; }
    }
  }
}
// appelé quand le joueur refuse une offre reçue pour l'un de ses joueurs
function onTransferRefused(offer) {
  const p = getPlayer(offer.playerId);
  if (!p) return;
  const club = getClub(p.clubId);
  if (!club || !isUserClub(club.id)) return;
  const attractive = offer.amount >= p.value * 0.85;
  if (attractive && p.loyalty < 75 && Math.random() < 0.55) {
    p.morale = clamp((p.morale || 60) - randInt(6, 14), 0, 100);
    addPlayerEvent(club, p, "refused_transfer", { buyerId: offer.fromClubId, amount: offer.amount });
  }
}
function playerEventChoices(ev) {
  if (ev.kind === "raise") return [["accept", `Accepter (${fmtMoney(ev.data.ask)}/mois)`], ["negotiate", "Proposer un compromis"], ["refuse", "Refuser"]];
  if (ev.kind === "leave") return [["convince", "Le convaincre de rester"], ["list", "Le mettre sur la liste des transferts"], ["refuse", "Refuser catégoriquement"]];
  if (ev.kind === "refused_transfer") return [["explain", "Lui expliquer votre projet"], ["ignore", "Ignorer"]];
  if (ev.kind === "loan_request") return [["accept", "Accepter le prêt"], ["refuse", "Refuser"]];
  return [];
}
function resolvePlayerEvent(eventId, choice) {
  const ev = state.inbox.find(o => o.id === eventId);
  if (!ev || ev.resolved) return { ok: false };
  const p = getPlayer(ev.playerId), club = getClub(ev.clubId);
  if (!p || !club) { ev.resolved = true; return { ok: false }; }
  const name = `${p.firstName} ${p.lastName}`;
  const negoSkill = (state.ds.skills && state.ds.skills.negociation) || 0;
  const coachMot = staffEffect(club, "entraineur");
  let msg = "";
  const done = m => { ev.resolved = true; ev.outcome = m; state.log.unshift({ date: fmtDate(state.date), text: `${name} : ${m}` }); return { ok: true, message: m }; };

  if (ev.kind === "raise") {
    if (choice === "accept" || choice === "negotiate") {
      const newWage = choice === "accept" ? ev.data.ask : Math.round((p.wage + ev.data.ask) / 2 / 100) * 100;
      if (choice === "negotiate" && Math.random() > 0.6 + p.loyalty / 300) {
        p.morale = clamp(p.morale - 4, 0, 100);
        return done("a refusé votre compromis et reste sur sa faim.");
      }
      if (newWage - p.wage > wageBudgetRemaining(club)) return { ok: false, message: "Votre masse salariale ne permet pas cette augmentation." };
      p.wage = newWage; p.lastRaiseYear = new Date(state.date).getFullYear();
      p.morale = clamp(p.morale + 8, 0, 100);
      recomputeWageBill(club);
      return done(`voit son salaire passer à ${fmtMoney(newWage)}/mois.`);
    }
    p.morale = clamp(p.morale - 7, 0, 100); p.lastRaiseYear = new Date(state.date).getFullYear();
    if (p.morale < 32 && Math.random() < 0.45) addPlayerEvent(club, p, "leave", { reason: "morale" });
    return done("est déçu de votre refus d'augmenter son salaire.");
  }
  if (ev.kind === "leave") {
    if (choice === "convince") {
      const chance = clamp(0.3 + p.loyalty / 200 + negoSkill * 0.06 + coachMot * 0.12, 0.1, 0.9);
      if (Math.random() < chance) { p.morale = clamp(p.morale + 14, 0, 100); return done("accepte finalement de rester au club."); }
      p.morale = clamp(p.morale - 4, 0, 100);
      return done("n'est pas convaincu et maintient son souhait de partir.");
    }
    if (choice === "list") { p.listed = true; return done("est placé sur la liste des transferts à sa demande."); }
    p.morale = clamp(p.morale - 9, 0, 100);
    return done("reste sous contrat malgré son mécontentement.");
  }
  if (ev.kind === "refused_transfer") {
    if (choice === "explain") {
      const chance = clamp(0.4 + p.loyalty / 200 + negoSkill * 0.06, 0.15, 0.9);
      if (Math.random() < chance) { p.morale = clamp(p.morale + 9, 0, 100); return done("comprend votre décision et se remet au travail."); }
      return done("écoute vos explications sans être convaincu.");
    }
    p.morale = clamp(p.morale - 4, 0, 100);
    return done("est vexé que vous ignoriez sa frustration.");
  }
  if (ev.kind === "loan_request") {
    if (choice === "accept") {
      const sc = ensureScouting(club);
      let dest = null;
      const aff = sc.affiliates.map(a => getClub(a.clubId)).filter(c => c && c.division >= club.division);
      if (aff.length) dest = aff[0];
      if (!dest) {
        const lower = allClubs().filter(c => c.countryKey === club.countryKey && c.id !== club.id && !isUserClub(c.id) && c.division >= club.division && c.reputation < club.reputation);
        if (lower.length) dest = pick(lower);
      }
      if (!dest) return { ok: false, message: "Aucun club d'accueil trouvé pour ce prêt." };
      loanPlayerOut(p, dest.id, 30, null);
      p.morale = clamp(p.morale + 10, 0, 100);
      return done(`est prêté à ${dest.name} pour gagner du temps de jeu.`);
    }
    p.morale = clamp(p.morale - 8, 0, 100);
    return done("reste au club malgré son manque de temps de jeu.");
  }
  return { ok: false };
}

// ---------------------------------------------------------------------
// TICKS PÉRIODIQUES
// ---------------------------------------------------------------------
function recruitWeeklyTick() {
  (state.userClubIds || []).forEach(id => {
    const club = getClub(id);
    if (!club) return;
    ensureScouting(club);
    scoutingWeeklyTick(club);
    // le moral revient doucement vers la normale ; un bon entraîneur aide
    const coach = staffEffect(club, "entraineur");
    club.players.forEach(p => {
      const target = 62 + coach * 8;
      p.morale = clamp(Math.round((p.morale || 60) + (target - (p.morale || 60)) * 0.06), 0, 100);
    });
    // événements non traités depuis 3 semaines : le joueur s'agace
    pendingPlayerEvents(club).forEach(ev => {
      if (state.dayCounter - ev.dayCounter >= 21) {
        const p = getPlayer(ev.playerId);
        if (p) p.morale = clamp(p.morale - 6, 0, 100);
        ev.resolved = true; ev.outcome = "resté sans réponse";
        if (p) state.log.unshift({ date: fmtDate(state.date), text: `${p.firstName} ${p.lastName} : votre silence a été mal perçu.` });
      }
    });
    generatePlayerEvents(club);
  });
}
