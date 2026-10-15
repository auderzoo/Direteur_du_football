// =====================================================================
// RÉALISME & PROFONDEUR (bloc 3) :
//  - régens, retraites, reconversions, « wonderkids » aux profils variés
//  - calendrier réel : trêves internationales, coupes d'Europe, mercato d'hiver
//  - blessures liées à la charge, à l'âge et à la saison-type par poste
//  - statuts juridiques : formé au club, prêt avec obligation d'achat, clauses
//  - médias et supporters : humeur de la presse et des tribunes
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dkey = (d) => new Date(d).toISOString().slice(0, 10);
  const todayKey = () => dkey(state.date);
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };
  const news = (text) => { try { state.news.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };
  const userIds = () => (state.userClubIds || []).slice();
  const mine = (c) => !!c && isUserClub(c.id);
  function wpick(items, wf) {
    const ws = items.map(wf); const tot = ws.reduce((a, b) => a + b, 0); if (tot <= 0) return items[0];
    let r = Math.random() * tot; for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1];
  }
  let rzRootEl = null;
  function root() { if (!rzRootEl || !document.body.contains(rzRootEl)) { rzRootEl = document.createElement("div"); rzRootEl.id = "rz-root"; document.body.appendChild(rzRootEl); } return rzRootEl; }
  function closeRZ() { root().innerHTML = ""; }
  function showModal(html) { root().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">${html}</div></div>`; }
  const anyModal = () => !!(document.querySelector("#gp-root .modal-backdrop, #rz-root .modal-backdrop, #match-modal .modal-backdrop, #player-modal .modal-backdrop"));

  // ===================================================================
  // 1. TRÊVES INTERNATIONALES
  // ===================================================================
  const BREAKS_MD = [[9, 5, 9, 13, "Trêve internationale de septembre"], [10, 10, 10, 18, "Trêve internationale d'octobre"],
    [11, 9, 11, 17, "Trêve internationale de novembre"], [3, 20, 3, 28, "Trêve internationale de mars"]];
  function breaksFor(start) {
    const y0 = start.getUTCFullYear(), out = [];
    [y0, y0 + 1].forEach((y) => BREAKS_MD.forEach(([m1, d1, m2, d2, label]) => {
      const s = Date.UTC(y, m1 - 1, d1), e = Date.UTC(y, m2 - 1, d2);
      if (e > start.getTime() && s < start.getTime() + 330 * 864e5) out.push({ start: dkey(s), end: dkey(e), label });
    }));
    return out.sort((a, b) => a.start.localeCompare(b.start));
  }
  const origGAF = window.generateAllFixtures;
  window.generateAllFixtures = function () {
    origGAF.apply(this, arguments);
    try {
      const br = breaksFor(new Date(state.date.getTime() + 14 * 864e5));
      state.intlBreaks = br;
      Object.keys(state.countries).forEach((ck) => {
        if (COUNTRIES[ck] && COUNTRIES[ck].calendar && COUNTRIES[ck].calendar !== "europe") return;
        Object.values(state.countries[ck].leagues).forEach((league) => {
          let off = 0;
          league.fixtures.forEach((r) => {
            const t = new Date(r.date).getTime();
            for (let guard = 0; guard < 6; guard++) {
              const k = dkey(t + off * 864e5);
              if (br.some((b) => k >= b.start && k <= b.end)) off += 7; else break;
            }
            r.date = new Date(t + off * 864e5).toISOString();
          });
        });
      });
    } catch (e) { console.warn("trêves", e); }
  };
  function callUp(b) {
    userIds().forEach((id) => {
      const c = getClub(id); if (!c) return;
      const t = todayKey();
      const sel = c.players.filter((p) => (p.internationalCaps || 0) > 0 && p.overall >= 62 && !(p.injuredUntil && p.injuredUntil >= t) && !p.onLoan)
        .sort((a, b) => b.overall - a.overall).slice(0, 6);
      sel.forEach((p) => { p.intl = { until: b.end }; });
      if (sel.length) note(`${b.label} : ${sel.map((p) => p.lastName).join(", ")} rejoignent leur sélection.`);
    });
  }
  function callBack(b) {
    userIds().forEach((id) => {
      const c = getClub(id); if (!c) return;
      const hurt = [];
      c.players.filter((p) => p.intl && p.intl.until === b.end).forEach((p) => {
        delete p.intl;
        p.internationalCaps = (p.internationalCaps || 0) + randInt(1, 2);
        p.fatigue = clamp((p.fatigue || 0) + 8, 0, 100);
        if (Math.random() < 0.07) {
          const days = randInt(8, 25);
          p.injuredUntil = dkey(state.date.getTime() + days * 864e5);
          p.injury = { type: "Blessure en sélection", days, date: todayKey() };
          hurt.push(`${p.lastName} (${Math.round(days / 7) || 1} sem.)`);
        }
      });
      note(`Fin de la ${b.label.toLowerCase()} : les internationaux sont de retour${hurt.length ? ` — blessés : ${hurt.join(", ")}` : ""}.`);
    });
  }

  // ===================================================================
  // 2. COUPES D'EUROPE
  // ===================================================================
  const origRoll = window.seasonRollover;
  const origSetupCups = window.setupCups;
  let retireSnapshot = [];
  window.seasonRollover = function () {
    try {
      state.lastRanks = {};
      Object.keys(state.countries).forEach((ck) => {
        const d1 = state.countries[ck].leagues.d1; if (!d1) return;
        state.lastRanks[ck] = [...d1.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga)).map((c) => c.id);
      });
      retireSnapshot = [];
      allClubs().forEach((c) => c.players.forEach((p) => { if (p.age >= 31) retireSnapshot.push({ id: p.id, club: c, p }); }));
    } catch (e) { console.warn("pré-rollover", e); }
    const r = origRoll.apply(this, arguments);
    try { afterRollover(); } catch (e) { console.warn("post-rollover", e); }
    return r;
  };
  window.setupCups = function () {
    origSetupCups.apply(this, arguments);
    try { buildEurope(); } catch (e) { console.warn("coupes d'Europe", e); }
  };
  function buildEurope() {
    const keys = Object.keys(state.countries);
    state.cups.europa = null;
    if (keys.length < 2) return;
    const d = state.date; const Y = d.getUTCMonth() >= 8 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
    const minStart = d.getTime() + 10 * 864e5;
    const s1 = new Date(Math.max(Date.UTC(Y, 8, 16), minStart)), s2 = new Date(Math.max(Date.UTC(Y, 8, 17), minStart + 864e5));
    let ucl = [], uel = [];
    keys.forEach((ck) => {
      const ids = (state.lastRanks && state.lastRanks[ck]) || [...state.countries[ck].leagues.d1.clubs].sort((a, b) => b.reputation - a.reputation).map((c) => c.id);
      ucl = ucl.concat(ids.slice(0, 4)); uel = uel.concat(ids.slice(4, 6));
    });
    const c1 = buildKnockout("Ligue des Champions", ucl, s1); if (c1) c1._pendingWinPrize = 15_000_000;
    const c2 = uel.length >= 2 ? buildKnockout("Ligue Europa", uel, s2) : null; if (c2) c2._pendingWinPrize = 6_000_000;
    state.cups.continental = c1; state.cups.europa = c2;
    userIds().forEach((id) => {
      const c = getClub(id); if (!c) return;
      if (ucl.includes(id)) note(`${c.name} est qualifié pour la Ligue des Champions (début ${fmtDate(s1)}).`);
      else if (uel.includes(id)) note(`${c.name} est qualifié pour la Ligue Europa (début ${fmtDate(s2)}).`);
    });
  }
  function europeHTML() { return window.dsEuroStatusHTML ? window.dsEuroStatusHTML() : ""; }
  function calendarInfoHTML() {
    const br = (state.intlBreaks || []).filter((b) => b.end >= todayKey());
    const club = userClub(); const cal = club ? COUNTRIES[club.countryKey].calendar : "europe";
    const wins = (TRANSFER_WINDOWS[cal] || []).map((w) => `<li>${esc(w.name)} : du ${w.startDay}/${w.startMonth} au ${w.endDay}/${w.endMonth}</li>`).join("");
    return `<h3 class="panel-subtitle">Calendrier réel</h3>
      <div class="rz-cols"><div><b>Trêves internationales</b>${br.length ? `<ul>${br.map((b) => `<li>${esc(b.label)} : ${fmtDate(new Date(b.start))} → ${fmtDate(new Date(b.end))}</li>`).join("")}</ul>` : `<p class="hint">Aucune à venir.</p>`}<p class="hint">Aucun match de championnat pendant les trêves ; vos internationaux partent en sélection (risque de blessure).</p></div>
      <div><b>Fenêtres de transfert</b><ul>${wins}</ul></div></div>${europeHTML()}`;
  }
  const origCal = window.renderCalendar;
  window.renderCalendar = function () { return origCal.apply(this, arguments) + calendarInfoHTML(); };
  const origCups = window.renderCups;
  window.renderCups = function () { return origCups.apply(this, arguments) + europeHTML(); };

  // ===================================================================
  // 3. BLESSURES : CHARGE, ÂGE, SAISON-TYPE PAR POSTE
  // ===================================================================
  const POS_BASE = { GB: 0.55, DEF: 1, MIL: 1.05, ATT: 1.1 };
  // multiplicateurs mensuels (janv → déc) : reprise estivale pour les attaquants, congestion hivernale pour les défenseurs…
  const SEASON_PROFILE = {
    GB: [1, 1, 1, 1, 1, 1, 0.9, 0.9, 1, 1, 1, 1],
    DEF: [1.15, 1, 0.9, 0.9, 0.95, 0.8, 0.85, 0.9, 1, 1.05, 1.25, 1.3],
    MIL: [1.1, 1.05, 1, 1, 1, 0.85, 0.9, 1.1, 1.15, 1.05, 1.1, 1.15],
    ATT: [1, 1, 0.95, 0.95, 1, 0.8, 0.95, 1.3, 1.2, 1, 1, 1.1]
  };
  const SEASON_NOTE = { GB: "stable toute l'année", DEF: "pic en novembre-décembre (matchs rapprochés, froid)", MIL: "pic à la reprise (août-sept.) et en hiver", ATT: "pic à la reprise estivale (ischio-jambiers)" };
  const INJ_TYPES = [
    { k: "Contracture", d: [3, 10], w: () => 30 }, { k: "Élongation des ischio-jambiers", d: [14, 35], w: (p) => 18 + (p.position === "ATT" || p.position === "MIL" ? 8 : 0) },
    { k: "Entorse de la cheville", d: [10, 28], w: () => 20 }, { k: "Lésion musculaire", d: [21, 50], w: (p) => 10 + Math.max(0, p.age - 28) },
    { k: "Entorse du genou", d: [28, 70], w: () => 8 }, { k: "Tendinite", d: [10, 30], w: (p) => 5 + Math.max(0, p.age - 27) * 1.5 },
    { k: "Fracture", d: [35, 70], w: () => 3 }, { k: "Rupture du ligament croisé", d: [150, 240], w: (p) => 1 + Math.max(0, p.age - 26) * 0.12 }
  ];
  function injuryWeight(p, month) {
    const pos = p.position || "MIL";
    const age = p.age || 25;
    const ageF = age <= 21 ? 0.9 : age <= 29 ? 1 : 1 + (age - 29) * 0.09;
    const loadF = 1 + clamp(p.fatigue || 0, 0, 100) / 100 * 0.9;
    const prone = p.profile && p.profile.k === "fragile" ? 1.6 : 1;
    return (POS_BASE[pos] || 1) * ((SEASON_PROFILE[pos] || SEASON_PROFILE.MIL)[month]) * ageF * loadF * prone;
  }
  window.injuryWeight = injuryWeight;
  window.maybeInjure = function (club, dateKey) {
    const month = new Date(state.date).getUTCMonth();
    const pool = club.players.filter((p) => isAvailable(p, dateKey));
    if (!pool.length) return;
    const starters = [...pool].sort((a, b) => b.overall - a.overall).slice(0, 14);
    const avgW = starters.reduce((s, p) => s + injuryWeight(p, month), 0) / starters.length;
    if (Math.random() >= 0.045 * injuryRiskMult(club) * clamp(avgW, 0.6, 2.2)) return;
    const startIds = new Set(starters.map((p) => p.id));
    const victim = wpick(pool, (p) => injuryWeight(p, month) * (startIds.has(p.id) ? 1 : 0.35));
    const type = wpick(INJ_TYPES, (t) => t.w(victim));
    let days = randInt(type.d[0], type.d[1]);
    days *= injuryDurationMult(club) * (victim.age > 31 ? 1.25 : victim.age <= 20 ? 0.85 : 1);
    days = Math.max(3, Math.round(days));
    victim.injuredUntil = dkey(state.date.getTime() + days * 864e5);
    victim.injury = { type: type.k, days, date: todayKey() };
    victim.injuryHistory = victim.injuryHistory || [];
    victim.injuryHistory.unshift({ type: type.k, days, year: state.season.year });
    if (victim.injuryHistory.length > 8) victim.injuryHistory.length = 8;
    if (isUserClub(club.id)) {
      const dur = days >= 14 ? `${Math.round(days / 7)} semaine(s)` : `${days} jour(s)`;
      note(`🩹 ${victim.firstName} ${victim.lastName} : ${type.k.toLowerCase()}, indisponible environ ${dur}.`);
    }
  };
  function riskLabel(w) { return w < 0.9 ? ["Faible", "ok"] : w < 1.3 ? ["Moyen", "mid"] : w < 1.8 ? ["Élevé", "bad"] : ["Critique", "bad"]; }
  function injuryPanelHTML() {
    const club = userClub(); if (!club) return "";
    const month = new Date(state.date).getUTCMonth(), t = todayKey();
    const ranked = club.players.filter((p) => !(p.injuredUntil && p.injuredUntil >= t)).map((p) => ({ p, w: injuryWeight(p, month) })).sort((a, b) => b.w - a.w).slice(0, 5);
    const out = club.players.filter((p) => p.injuredUntil && p.injuredUntil >= t);
    return `<h3 class="panel-subtitle">Risque de blessure</h3>
      <p class="hint">Dépend de la <b>charge</b> (fatigue), de l'<b>âge</b>, du poste et de la période de la saison. Ce mois-ci : ${Object.keys(SEASON_NOTE).map((k) => `${k} ×${SEASON_PROFILE[k][month].toFixed(2)}`).join(" · ")}.</p>
      <div class="rz-risk">${ranked.map(({ p, w }) => { const [l, c] = riskLabel(w); return `<div class="rz-row"><span>${esc(p.firstName[0])}. ${esc(p.lastName)} <span class="hint">${p.position} · ${p.age} ans · fatigue ${Math.round(p.fatigue || 0)}</span></span><span class="rz-chip rz-${c}">${l}</span></div>`; }).join("")}</div>
      <p class="hint">Profil de saison par poste : ${Object.entries(SEASON_NOTE).map(([k, v]) => `<b>${k}</b> ${v}`).join(" ; ")}.</p>
      ${out.length ? `<p class="hint">À l'infirmerie : ${out.map((p) => `${esc(p.lastName)}${p.injury ? ` (${esc(p.injury.type.toLowerCase())})` : ""}`).join(", ")}.</p>` : ""}`;
  }

  // ===================================================================
  // 4. PROFILS « WONDERKIDS », RÉGENS, RETRAITES, RECONVERSIONS
  // ===================================================================
  const PROFILES = [
    { k: "prodige", label: "Prodige", w: 12, desc: "Niveau précoce et plafond très élevé, mais attentes énormes." },
    { k: "late", label: "Éclosion tardive", w: 14, desc: "Potentiel sous-estimé : il explosera vers 21-23 ans.", hidden: true },
    { k: "fragile", label: "Talent fragile", w: 12, desc: "Très doué mais sujet aux blessures.", hidden: "own" },
    { k: "physique", label: "Phénomène physique", w: 14, desc: "Progresse vite jusqu'à 21 ans, puis plafonne." },
    { k: "technicien", label: "Surdoué technique", w: 14, desc: "Potentiel élevé et progression régulière." },
    { k: "leader", label: "Jeune capitaine", w: 10, desc: "Très loyal, tire le vestiaire vers le haut." },
    { k: "standard", label: "", w: 24, desc: "" }
  ];
  function assignProfile(p) {
    if (p.profile) return p.profile;
    const pr = wpick(PROFILES, (x) => x.w);
    p.profile = { k: pr.k, label: pr.label };
    if (pr.k === "prodige") { p.overall = clamp(p.overall + 5, 30, 80); p.potential = clamp(Math.max(p.potential, 88 + randInt(0, 6)), p.overall, 96); }
    else if (pr.k === "late") { p.hiddenPot = clamp(p.potential + randInt(10, 14), p.potential, 95); p.potential = clamp(p.overall + randInt(0, 3), p.overall, 94); }
    else if (pr.k === "fragile") p.potential = clamp(p.potential + 4, p.overall, 95);
    else if (pr.k === "physique") p.overall = clamp(p.overall + 3, 30, 85);
    else if (pr.k === "technicien") p.potential = clamp(p.potential + 4, p.overall, 95);
    else if (pr.k === "leader") p.loyalty = clamp((p.loyalty || 50) + 20, 0, 100);
    return p.profile;
  }
  function profileVisible(p, own) {
    const pr = p.profile; if (!pr || !pr.label) return false;
    const def = PROFILES.find((x) => x.k === pr.k);
    if (def && def.hidden === true && !pr.revealed) return false;
    if (def && def.hidden === "own" && !own) return false;
    return true;
  }
  function seedWorld() {
    allClubs().forEach((c) => c.players.forEach((p) => {
      if (p.age <= 21 && !p.profile) assignProfile(p);
      if (p.age <= 22 && p.formedAt === undefined && Math.random() < 0.35) { p.formedAt = c.id; p.formedAtName = c.name; }
      if (p.overall >= 72 && !(p.internationalCaps > 0) && Math.random() < 0.6) p.internationalCaps = randInt(1, 30);
    }));
  }
  const origNewGame = window.newGame;
  window.newGame = function () { const r = origNewGame.apply(this, arguments); try { seedWorld(); } catch (e) { console.warn("seedWorld", e); } return r; };
  const origMigrate = window.migrateSave;
  window.migrateSave = function () { const r = origMigrate.apply(this, arguments); try { if (!state.media) ensureMedia(); } catch (e) {} return r; };

  const RECONV = [
    { k: "coach", w: 20, label: "devient entraîneur" }, { k: "scout", w: 14, label: "devient recruteur" },
    { k: "agent", w: 10, label: "devient agent de joueurs" }, { k: "tv", w: 14, label: "devient consultant à la télévision" },
    { k: "ambassador", w: 10, label: "devient ambassadeur de son club" }, { k: "none", w: 32, label: "se retire de la vie publique" }
  ];
  function makeYouth(club, lastName) {
    const posCode = pick(POSITIONS.map((p) => p.code));
    const y = generatePlayer(club.countryKey, posCode, club.tierFactor || 0.4);
    if (lastName) y.lastName = lastName;
    const tc = club.trainingCenterLevel || 1;
    y.age = randInt(16, 18);
    y.overall = clamp(y.overall - randInt(8, 18) + Math.round(tc * 1.5), 30, 85);
    y.potential = clamp(y.potential + Math.round(tc * 0.8) + 3, y.overall, 96);
    y.contractEndYear = new Date(state.date).getFullYear() + randInt(2, 4);
    y.value = computeValue(y); y.wage = Math.max(500, Math.round(y.value * 0.0025 / 100) * 100);
    y.clubId = club.id; y.formedAt = club.id; y.formedAtName = club.name;
    assignProfile(y); club.players.push(y);
    return y;
  }
  function afterRollover() {
    state.retired = state.retired || [];
    // retraites + reconversions
    retireSnapshot.filter((x) => !getPlayer(x.p.id)).forEach((x) => {
      const p = x.p, club = x.club; const notable = p.overall >= 68 || mine(club);
      const path = wpick(RECONV, (r) => r.w * (r.k === "none" && notable ? 0.5 : 1));
      let detail = "";
      if (notable && (path.k === "coach" || path.k === "scout")) {
        const s = generateStaff(path.k === "coach" ? (Math.random() < 0.5 ? "entraineur" : "adjoint") : "recruteur", club.countryKey, clamp((p.overall - 40) / 50, 0.25, 0.9));
        s.firstName = p.firstName; s.lastName = p.lastName; s.age = p.age + 1; s.exPro = club.name;
        if (path.k === "scout" && s.attributes.reseau !== undefined) s.attributes.reseau = clamp(s.attributes.reseau + 4, 1, 20);
        (state.staffMarket = state.staffMarket || []).push(s); detail = " (disponible sur le marché du staff)";
      }
      if (path.k === "ambassador" && mine(club)) { ensureMedia(); state.media.fans = clamp(state.media.fans + 3, 0, 100); }
      if (path.k === "tv" && p.overall >= 72) { ensureMedia(); state.media.press = clamp(state.media.press + 2, 0, 100); }
      state.retired.unshift({ name: `${p.firstName} ${p.lastName}`, club: club.name, year: state.season.year, ovr: p.overall, path: path.label + detail, mine: mine(club) });
      if (mine(club) || p.overall >= 78) note(`${p.firstName} ${p.lastName} (${club.name}) ${path.label}${detail}.`);
      // régen : le fils d'une légende rejoint le centre de formation
      if (p.overall >= 66 && Math.random() < 0.3) {
        const y = makeYouth(club, p.lastName); y.regenOf = `${p.firstName} ${p.lastName}`;
        if (mine(club)) note(`✨ Le fils de ${p.firstName} ${p.lastName}, ${y.firstName} ${y.lastName} (${y.age} ans, ${y.position}), intègre le centre de formation.`);
      }
    });
    if (state.retired.length > 80) state.retired.length = 80;
    retireSnapshot = [];
    // nouvelles recrues du centre de formation : profil + « formé au club » ; révélations et poussées de croissance
    allClubs().forEach((c) => c.players.forEach((p) => {
      if (p.age <= 18 && p.formedAt === undefined) { p.formedAt = c.id; p.formedAtName = c.name; }
      if (p.age <= 18 && !p.profile) assignProfile(p);
      const pr = p.profile; if (!pr) return;
      if (pr.k === "late" && !pr.revealed && p.age >= 21 && p.age <= 24 && p.hiddenPot) {
        pr.revealed = true; p.potential = p.hiddenPot; p.overall = clamp(p.overall + randInt(2, 4), 30, p.potential); delete p.hiddenPot;
        if (mine(c)) note(`🌟 Éclosion : ${p.firstName} ${p.lastName} (${p.age} ans) dévoile un potentiel bien supérieur à ce qu'on pensait !`);
      }
      if (pr.k === "physique" && p.age <= 21) p.overall = clamp(p.overall + 1, 30, p.potential);
    }));
  }
  function retiredPanelHTML() {
    const list = (state.retired || []).filter((r) => r.mine || r.ovr >= 78).slice(0, 8);
    if (!list.length) return "";
    return `<h3 class="panel-subtitle">Après-carrière</h3><div class="rz-risk">${list.map((r) => `<div class="rz-row"><span>${esc(r.name)} <span class="hint">${esc(r.club)} · ${r.year}</span></span><span class="hint">${esc(r.path)}</span></div>`).join("")}</div>`;
  }
  const origCard = window.openPlayerCard;
  window.openPlayerCard = function (id) {
    const r = origCard.apply(this, arguments);
    try {
      const p = getPlayer(id); if (!p) return r;
      const club = getClub(p.clubId); const own = mine(club);
      const chips = [];
      if (profileVisible(p, own)) chips.push(`<span class="rz-chip rz-info" title="${esc((PROFILES.find((x) => x.k === p.profile.k) || {}).desc || "")}">⭐ ${esc(p.profile.label)}</span>`);
      if (p.formedAt) chips.push(`<span class="rz-chip rz-ok">🎓 Formé à ${esc(p.formedAtName || "son club")}</span>`);
      if (p.regenOf) chips.push(`<span class="rz-chip rz-info">👪 Fils de ${esc(p.regenOf)}</span>`);
      if (p.onLoan && p.onLoan.mandatory) chips.push(`<span class="rz-chip rz-mid">Prêt · achat obligatoire si ${p.onLoan.mandatory.matches} matchs (${(p.seasonStats || {}).matches || 0})</span>`);
      else if (p.onLoan && p.onLoan.buyOption) chips.push(`<span class="rz-chip rz-mid">Prêt · option d'achat</span>`);
      (p.sellOnClauses || []).forEach((cl) => { const oc = getClub(cl.clubId); chips.push(`<span class="rz-chip rz-mid">Revente : ${cl.pct} % à ${esc(oc ? oc.name : "?")}</span>`); });
      if (p.injury && p.injuredUntil && p.injuredUntil >= todayKey()) chips.push(`<span class="rz-chip rz-bad">🩹 ${esc(p.injury.type)}</span>`);
      if (own && p.injuryHistory && p.injuryHistory.length) chips.push(`<span class="rz-chip rz-mid">${p.injuryHistory.length} blessure(s) récente(s)</span>`);
      if (chips.length) {
        const m = document.querySelector("#player-modal .modal");
        if (m && !m.querySelector(".rz-chips")) { const h = document.createElement("div"); h.className = "rz-chips"; h.innerHTML = chips.join(""); const first = m.firstElementChild; first ? first.insertAdjacentElement("afterend", h) : m.appendChild(h); }
      }
    } catch (e) { console.warn("fiche joueur", e); }
    return r;
  };

  // ===================================================================
  // 5. STATUTS JURIDIQUES : FORMÉ AU CLUB, PRÊT AVEC OBLIGATION, CLAUSES
  // ===================================================================
  const origLoan = window.loanPlayerOut;
  window.loanPlayerOut = function (player, toClubId, weeks, buyOption, obligationMatches) {
    const r = origLoan.apply(this, arguments);
    if (obligationMatches > 0 && buyOption > 0 && player.onLoan) {
      player.onLoan.mandatory = { matches: obligationMatches, fee: buyOption };
      const tc = getClub(toClubId); const txt = `Obligation d'achat : ${fmtMoney(buyOption)} si ${player.lastName} joue ${obligationMatches} matchs avec ${tc ? tc.name : "son club d'accueil"}.`;
      note(txt);
    }
    return r;
  };
  const origReturns = window.checkLoanReturns;
  window.checkLoanReturns = function () {
    try {
      const t = todayKey();
      allClubs().forEach((c) => c.players.filter((p) => p.onLoan && p.onLoan.mandatory && p.onLoan.until <= t).forEach((p) => {
        const m = p.onLoan.mandatory, from = p.onLoan.fromClubId, to = p.onLoan.toClubId;
        if (((p.seasonStats || {}).matches || 0) >= m.matches) {
          delete p.onLoan;
          transferPlayer(p, from, to, m.fee);
          const buyer = getClub(to); const txt = `Obligation d'achat levée : ${p.firstName} ${p.lastName} signe définitivement à ${buyer.name} pour ${fmtMoney(m.fee)}.`;
          news(txt); if (mine(buyer) || mine(getClub(from))) note(txt);
        } else {
          delete p.onLoan.mandatory;
          const txt = `${p.firstName} ${p.lastName} n'a pas atteint ${m.matches} matchs : l'obligation d'achat ne se déclenche pas.`;
          if (mine(getClub(to)) || mine(getClub(from))) note(txt);
        }
      }));
    } catch (e) { console.warn("obligation d'achat", e); }
    return origReturns.apply(this, arguments);
  };
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee) {
    const pre = { formed: player.formedAt, age: player.age, ovr: player.overall, value: player.value };
    const wasTop = (() => { const c = getClub(fromId); if (!c) return false; const top = [...c.players].sort((a, b) => b.overall - a.overall).slice(0, 4); return top.some((p) => p.id === player.id); })();
    const r = origTransfer.apply(this, arguments);
    try {
      const from = getClub(fromId), to = getClub(toId);
      if (fee > 0 && from && to) {
        // indemnité de formation : le club formateur touche 10 % s'il vend son propre joueur formé
        if (pre.formed === fromId) {
          const bonus = Math.round(fee * 0.10 / 1000) * 1000; from.budget += bonus;
          if (mine(from)) note(`🎓 Indemnité de formation : ${fmtMoney(bonus)} pour la vente de ${player.firstName} ${player.lastName}, formé au club.`);
        } else if (pre.formed && pre.formed !== toId && pre.age <= 23) {
          // mécanisme de solidarité : 3 % reversés au club formateur
          const origin = getClub(pre.formed); const sol = Math.round(fee * 0.03 / 1000) * 1000;
          if (origin) { origin.budget += sol; from.budget -= sol; if (mine(origin)) note(`Solidarité : ${fmtMoney(sol)} reversés pour le transfert de ${player.lastName} (formé chez nous).`); }
        }
      }
      // humeur des supporters et de la presse
      if (mine(from) && !mine(to) && fee > 0) {
        ensureMedia();
        if (wasTop) { state.media.fans = clamp(state.media.fans - 6, 0, 100); state.media.press = clamp(state.media.press - 2, 0, 100); headline(`${player.lastName} quitte ${from.name} : la colère gronde dans les tribunes.`); }
        if (fee > pre.value * 1.3) { state.media.press = clamp(state.media.press + 3, 0, 100); headline(`Cession à ${fmtMoney(fee)} : la presse salue la bonne affaire.`); }
      }
      if (mine(to) && !mine(from) && fee >= 0) {
        ensureMedia();
        const sq = [...to.players].sort((a, b) => b.overall - a.overall).slice(0, 5);
        if (sq.some((p) => p.id === player.id)) { state.media.fans = clamp(state.media.fans + 5, 0, 100); state.media.press = clamp(state.media.press + 4, 0, 100); headline(`Recrue de prestige : ${player.firstName} ${player.lastName} signe à ${to.name} !`); }
        if (state.media.promise && !state.media.promise.done) { state.media.promise.done = true; state.media.fans = clamp(state.media.fans + 4, 0, 100); note("Promesse tenue : les supporters apprécient l'arrivée d'une recrue."); }
      }
    } catch (e) { console.warn("statuts transfert", e); }
    return r;
  };
  function homegrownCount(club) { return club.players.filter((p) => p.formedAt === club.id).length; }
  function legalPanelHTML() {
    const club = userClub(); if (!club) return "";
    const hg = homegrownCount(club);
    const rows = club.players.map((p) => {
      const tags = [];
      if (p.formedAt === club.id) tags.push(`<span class="rz-chip rz-ok">🎓 Formé au club</span>`);
      if (p.releaseClause) tags.push(`<span class="rz-chip rz-mid">Clause libératoire ${fmtMoney(p.releaseClause)}</span>`);
      (p.sellOnClauses || []).forEach((cl) => { const oc = getClub(cl.clubId); tags.push(`<span class="rz-chip rz-mid">Revente ${cl.pct} % → ${esc(oc ? oc.name : "?")}</span>`); });
      if (p.onLoan) { const m = p.onLoan.mandatory; tags.push(`<span class="rz-chip rz-info">Prêt${p.onLoan.toClubId === club.id ? " (reçu)" : " (envoyé)"}${p.onLoan.buyOption ? ` · option ${fmtMoney(p.onLoan.buyOption)}` : ""}${m ? ` · obligation à ${m.matches} matchs (${(p.seasonStats || {}).matches || 0})` : ""}</span>`); }
      return tags.length ? `<div class="rz-row"><span>${esc(p.firstName[0])}. ${esc(p.lastName)} <span class="hint">${p.position}</span></span><span class="rz-tags">${tags.join("")}</span></div>` : "";
    }).filter(Boolean);
    return `<h3 class="panel-subtitle">Statuts juridiques</h3>
      <p class="hint">Joueurs formés au club : <b>${hg}</b> (objectif conseillé : 4 ou plus — les supporters adorent). Vendre un joueur formé au club rapporte 10 % d'indemnité de formation ; vendre un jeune formé ailleurs reverse 3 % de solidarité à son club formateur.</p>
      ${rows.length ? `<div class="rz-risk">${rows.join("")}</div>` : `<p class="hint">Aucune clause ni statut particulier pour l'instant.</p>`}`;
  }

  // ===================================================================
  // 6. MÉDIAS ET SUPPORTERS
  // ===================================================================
  function ensureMedia() {
    if (!state.media) state.media = { press: 55, fans: 60, log: [], pending: null, mark: 0, promise: null };
    return state.media;
  }
  function headline(text) { const m = ensureMedia(); m.log.unshift({ date: fmtDate(state.date), text }); if (m.log.length > 14) m.log.length = 14; }
  const origAtt = window.attendanceRate;
  window.attendanceRate = function (club) {
    const base = origAtt.apply(this, arguments);
    if (!mine(club) || !state.media) return base;
    return base * (0.88 + state.media.fans / 100 * 0.24);
  };
  function weeklyMedia() {
    const club = userClub(); if (!club) return;
    const m = ensureMedia();
    const n = Math.min(4, Math.max(0, (club.played || 0) - (m.mark || 0))); m.mark = club.played || 0;
    let delta = 0;
    if (n > 0) getRecentForm(club, n).forEach((r) => { delta += r.result === "W" ? 4 : r.result === "D" ? 0.5 : -4; });
    const hgBonus = clamp((homegrownCount(club) - 4) * 0.3, -1.5, 1.5);
    m.fans = clamp(Math.round((m.fans + delta + hgBonus + (55 - m.fans) * 0.03) * 10) / 10, 0, 100);
    m.press = clamp(Math.round((m.press + delta * 0.8 + (50 - m.press) * 0.04) * 10) / 10, 0, 100);
    if (delta <= -8) headline(`${club.name} s'enfonce : les critiques se multiplient.`);
    else if (delta >= 8) headline(`${club.name} enchaîne : la presse encense le club.`);
    // promesse non tenue
    if (m.promise && !m.promise.done && state.dayCounter > m.promise.untilDay) {
      m.fans = clamp(m.fans - 10, 0, 100); m.press = clamp(m.press - 3, 0, 100); headline("Promesse non tenue : les supporters se sentent trahis."); note("Vous n'avez pas tenu votre promesse de recrutement : les supporters sont furieux."); m.promise = null;
    } else if (m.promise && m.promise.done) m.promise = null;
    // la presse influe sur la réputation du DS (chaque mois)
    if (state.dayCounter % 28 === 0) {
      if (m.press >= 75) state.ds.reputation = clamp(state.ds.reputation + 1, 0, 100);
      else if (m.press <= 25) state.ds.reputation = clamp(state.ds.reputation - 1, 0, 100);
    }
    if (!m.pending && Math.random() < 0.4) m.pending = buildMediaEvent(club);
  }
  function buildMediaEvent(club) {
    const form = getRecentForm(club, 4); const L = form.filter((r) => r.result === "L").length, W = form.filter((r) => r.result === "W").length;
    const t = todayKey();
    const cands = [];
    if (L >= 2) cands.push({ w: 5, ev: { id: "lose", title: "📰 La presse réclame des comptes", text: `Après ${L} défaites sur les ${form.length} derniers matchs, un journaliste vous demande si le projet du club tient encore.`, choices: [
      { label: "Assumer et promettre du changement", desc: "La presse apprécie la franchise.", fans: 2, press: 5 },
      { label: "Défendre le groupe", desc: "Les supporters aiment la loyauté.", fans: 4, press: -3 },
      { label: "Refuser de répondre", desc: "Le silence passe mal.", fans: -1, press: -6 }] } });
    if (W >= 3) cands.push({ w: 5, ev: { id: "win", title: "📰 Série victorieuse", text: "Le club est en pleine confiance. Un journal sportif vous sollicite pour une interview.", choices: [
      { label: "Rester humble", desc: "On ne s'enflamme pas.", fans: 1, press: 4 },
      { label: "Annoncer de grandes ambitions", desc: "Les tribunes s'enflamment, la presse est sceptique.", fans: 5, press: 1 },
      { label: "Féliciter le staff", desc: "Le staff apprécie la reconnaissance.", fans: 1, press: 2, staffLoyalty: 4 }] } });
    const rumor = [...club.players].sort((a, b) => b.overall - a.overall).slice(0, 5).find((p) => (p.loyalty || 70) < 55 || ((p.contractEndYear || 9999) - new Date(state.date).getFullYear() <= 1));
    if (rumor) cands.push({ w: 4, ev: { id: "rumor", title: `📰 Rumeur : ${rumor.lastName} courtisé`, text: `Plusieurs clubs seraient sur ${rumor.firstName} ${rumor.lastName}. Que répondez-vous ?`, pid: rumor.id, choices: [
      { label: "Démentir fermement", desc: "Rassure les supporters et le joueur.", fans: 4, press: -2, loyalty: 6 },
      { label: "Rester évasif", desc: "Le flou entretient le doute.", fans: -1, press: 2, loyalty: -3 },
      { label: "Laisser entendre qu'il est vendable", desc: "La presse adore ; les tribunes beaucoup moins.", fans: -6, press: 3, loyalty: -8 }] } });
    if (!state.media.promise) cands.push({ w: 3, ev: { id: "ultras", title: "📣 Les ultras s'impatientent", text: "Une banderole réclame un renfort offensif avant la fin de la période de mercato.", choices: [
      { label: "Promettre une recrue d'ici 60 jours", desc: "Succès immédiat, mais gare à la promesse non tenue.", fans: 6, press: 1, promise: 60 },
      { label: "Expliquer que le projet est sur la durée", desc: "Peu populaire, mais honnête.", fans: -2, press: 3 },
      { label: "Ne pas commenter", desc: "Rien ne change.", fans: 0, press: 0 }] } });
    if (homegrownCount(club) < 4) cands.push({ w: 3, ev: { id: "youth", title: "📰 Et les jeunes du club ?", text: "Les supporters regrettent le peu de joueurs formés au club dans l'effectif.", choices: [
      { label: "S'engager à lancer des jeunes", desc: "Les tribunes applaudissent.", fans: 5, press: 2 },
      { label: "Prôner la prudence", desc: "Le résultat avant tout.", fans: -1, press: 3 }] } });
    cands.push({ w: 2, ev: { id: "gen", title: "🎤 Conférence de presse", text: "Une conférence de presse d'avant-match est organisée. Quel ton adoptez-vous ?", choices: [
      { label: "Ton offensif", desc: "Du spectacle pour les tribunes.", fans: 3, press: 1 },
      { label: "Ton posé", desc: "Les journalistes apprécient.", fans: 0, press: 3 },
      { label: "Ton fermé", desc: "On ne dit rien.", fans: -1, press: -2 }] } });
    const pick1 = wpick(cands, (c) => c.w); return pick1.ev;
  }
  function openMedia() {
    const m = state.media; if (!m || !m.pending) return;
    const ev = m.pending;
    showModal(`<h3>${esc(ev.title)}</h3><p>${esc(ev.text)}</p>
      <div class="stance-list">${ev.choices.map((c, i) => `<button class="stance-card" data-rz="media:${i}"><b>${esc(c.label)}</b><span class="hint">${esc(c.desc)}</span></button>`).join("")}</div>`);
  }
  function chooseMedia(i) {
    const m = state.media; const ev = m.pending; if (!ev) return; const c = ev.choices[i]; if (!c) return;
    m.fans = clamp(m.fans + (c.fans || 0), 0, 100); m.press = clamp(m.press + (c.press || 0), 0, 100);
    if (c.loyalty && ev.pid) { const p = getPlayer(ev.pid); if (p) p.loyalty = clamp((p.loyalty || 50) + c.loyalty, 0, 100); }
    if (c.staffLoyalty) (userClub().staff || []).forEach((s) => { s.loyalty = clamp((s.loyalty === undefined ? 60 : s.loyalty) + c.staffLoyalty, 5, 98); });
    if (c.promise) m.promise = { untilDay: state.dayCounter + c.promise, done: false };
    headline(`${ev.title.replace(/^\S+\s/, "")} — « ${c.label} ».`);
    note(`Médias : ${c.label} (tribunes ${c.fans >= 0 ? "+" : ""}${c.fans || 0}, presse ${c.press >= 0 ? "+" : ""}${c.press || 0}).`);
    m.pending = null; closeRZ(); saveGame(); render();
  }
  function gauge(label, v) {
    const col = v < 35 ? "#8B3A2B" : v < 55 ? "#B9862E" : "#2E6B3E";
    return `<div class="rz-gauge"><div class="rz-gl"><span>${label}</span><b>${Math.round(v)}</b></div><div class="wage-bar"><div class="wage-bar-fill" style="width:${clamp(v, 0, 100)}%;background:${col}"></div></div></div>`;
  }
  function mediaHTML(full) {
    const m = ensureMedia();
    return `<h3 class="panel-subtitle">Médias et supporters</h3>
      <div class="rz-gauges">${gauge("🗞️ Presse", m.press)}${gauge("📣 Tribunes", m.fans)}</div>
      ${m.promise && !m.promise.done ? `<p class="hint">⚠️ Promesse en cours : recruter un joueur avant le jour ${m.promise.untilDay} (encore ${Math.max(0, m.promise.untilDay - state.dayCounter)} jours).</p>` : ""}
      ${(m.log || []).slice(0, full ? 8 : 2).map((h) => `<div class="log-row"><b>${esc(h.date)}</b> — ${esc(h.text)}</div>`).join("") || `<p class="hint">Rien à signaler pour l'instant.</p>`}
      ${full ? `<p class="hint">Les tribunes influencent l'affluence (et donc les recettes) ; la presse influence votre réputation de DS. Vos choix en conférence de presse et vos transferts font bouger les deux jauges.</p>` : ""}`;
  }

  // ===================================================================
  // INTÉGRATION
  // ===================================================================
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      const t = todayKey();
      (state.intlBreaks || []).forEach((b) => { if (b.start === t) callUp(b); if (b.end === t) callBack(b); });
      if (state.cups && state.cups.europa) processCupDay(state.cups.europa, t);
      if (state.dayCounter % 7 === 0) weeklyMedia();
    } catch (e) { console.warn("réalisme/jour", e); }
    return r;
  };
  const origOv = window.renderOverview;
  window.renderOverview = function () { return origOv.apply(this, arguments) + mediaHTML(false); };
  const origSquad = window.renderSquad;
  window.renderSquad = function () { return origSquad.apply(this, arguments) + injuryPanelHTML() + legalPanelHTML(); };
  const origClub = window.renderClubTab;
  window.renderClubTab = function () { return origClub.apply(this, arguments) + mediaHTML(true) + retiredPanelHTML(); };

  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (ui.screen === "dashboard" && state && state.ds && userClub()) {
        ensureMedia();
        if (state.media.pending && !anyModal()) openMedia();
      }
    } catch (e) { console.warn("réalisme post-rendu", e); }
    return r;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-rz]"); if (!b) return;
    const [cmd, arg] = b.dataset.rz.split(":");
    if (cmd === "media") chooseMedia(parseInt(arg, 10));
    else if (cmd === "close") closeRZ();
  });

  window.rz = { buildEurope, breaksFor, injuryWeight, assignProfile, afterRollover, weeklyMedia, buildMediaEvent, chooseMedia, ensureMedia, legalPanelHTML, injuryPanelHTML, homegrownCount, PROFILES, SEASON_PROFILE, seedWorld, callUp, callBack };
})();
