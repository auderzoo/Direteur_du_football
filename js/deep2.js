// =====================================================================
// BLOC 7 — Profondeur : contrats, scouting, jeunes
//  1. Contrats : rôle promis à la signature, primes (match, but, réussite), clause libératoire
//  2. Scouting : axes de recherche par recruteur, rapports riches (profil, prix, risque, comparaison)
//  3. Jeunes : plan de développement individuel, prêts suivis avec rapports et rappel anticipé
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const todayKey = () => new Date(state.date).toISOString().slice(0, 10);
  const ROLES = { key: "Titulaire indiscutable", first: "Titulaire", rotation: "Rotation", backup: "Remplaçant", prospect: "Espoir à faire progresser" };
  const RANK = { key: 0, first: 1, rotation: 2, backup: 3, prospect: 4 };
  const SHARE = { key: 0.85, first: 0.7, rotation: 0.45, backup: 0.2, prospect: 0.12 };

  // ===================================================================
  // 1. CONTRATS
  // ===================================================================
  function top11Avg(club) {
    const t = club.players.map((p) => p.overall).sort((a, b) => b - a).slice(0, 11);
    return t.length ? t.reduce((s, v) => s + v, 0) / t.length : 55;
  }
  function wantedRole(p, club) {
    const d = p.overall - top11Avg(club);
    if (d >= 4) return "key";
    if (d >= 1) return "first";
    if (d >= -3) return "rotation";
    return p.age <= 21 && p.potential - p.overall >= 8 ? "prospect" : "backup";
  }
  function readDeal() {
    const g = (id) => { const e = document.getElementById(id); return e ? Math.max(0, parseInt(e.value, 10) || 0) : 0; };
    const r = document.getElementById("deal-role");
    return { role: r ? r.value : "", app: g("deal-app"), goal: g("deal-goal"), succ: g("deal-succ"), rel: g("deal-rel") };
  }
  function dealScore(p, deal, club) {
    const notes = []; let adj = 0;
    if (!deal) return { adj: 0, notes };
    if (deal.role) {
      const w = wantedRole(p, club), diff = RANK[w] - RANK[deal.role];
      adj += clamp(diff * 0.05, -0.15, 0.15);
      notes.push(diff > 0 ? `Le rôle promis (${ROLES[deal.role]}) dépasse ses attentes.` : diff < 0 ? `Il espérait mieux que « ${ROLES[deal.role]} ».` : `Le rôle correspond à ses attentes.`);
    }
    const wage = Math.max(1000, p.wage || 10000);
    const gw = p.position === "ATT" ? 6 : p.position === "MIL" ? 3.5 : 1.5;
    const val = deal.app * 25 + deal.goal * gw * 4 + deal.succ * 0.6;
    if (val > 0) { adj += clamp(val / (wage * 12) * 0.9, 0, 0.1); notes.push("Les primes sont appréciées."); }
    adj += window.dsNetBonus ? dsNetBonus("Agent influent") * 0.06 : 0;
    if (deal.rel) { adj += deal.rel <= p.value * 1.3 ? 0.06 : 0.02; notes.push("Clause libératoire acceptée par le joueur."); }
    return { adj, notes };
  }
  function fmtOpt(v) { return v ? fmtMoney(v) : "—"; }
  function formHTML(p, club, deal) {
    deal = deal || {};
    const w = wantedRole(p, club);
    return `<div class="dp-deal">
      <h4 style="margin:10px 0 4px;">Clauses &amp; rôle promis</h4>
      <p class="hint" style="margin:0 0 6px;">Le joueur s'attend à être <b>${ROLES[w].toLowerCase()}</b>. Une promesse non tenue le rendra furieux.</p>
      <label class="field"><span>Rôle promis à la signature</span><select id="deal-role"><option value="">Aucune promesse</option>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${deal.role === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="field"><span>Prime par match joué (€)</span><input type="number" id="deal-app" value="${deal.app || 0}" step="500" min="0" /></label>
      <label class="field"><span>Prime par but marqué (€)</span><input type="number" id="deal-goal" value="${deal.goal || 0}" step="1000" min="0" /></label>
      <label class="field"><span>Prime de réussite (top 3 en fin de saison, €)</span><input type="number" id="deal-succ" value="${deal.succ || 0}" step="10000" min="0" /></label>
      <label class="field"><span>Clause libératoire (€, 0 = aucune)</span><input type="number" id="deal-rel" value="${deal.rel || 0}" step="500000" min="0" /></label>
    </div>`;
  }
  function describe(d) {
    if (!d) return "";
    const b = [];
    if (d.role) b.push(`rôle promis : ${ROLES[d.role]}`);
    if (d.app) b.push(`${fmtMoney(d.app)}/match`);
    if (d.goal) b.push(`${fmtMoney(d.goal)}/but`);
    if (d.succ) b.push(`prime de réussite ${fmtMoney(d.succ)}`);
    if (d.rel) b.push(`clause libératoire ${fmtMoney(d.rel)}`);
    return b.join(" · ");
  }
  window.dsDeal = { ROLES, wantedRole, readDeal, score: dealScore, formHTML, describe };

  // application des clauses (signature ou prolongation)
  function applyDeal(player, club, d) {
    player.deal = { app: d.app || 0, goal: d.goal || 0, succ: d.succ || 0, since: todayKey(), paid: 0, lm: (player.seasonStats || {}).matches || 0, lg: (player.seasonStats || {}).goals || 0 };
    if (d.rel) player.releaseClause = d.rel; else delete player.releaseClause;
    if (d.role) {
      player.promisedRole = d.role;
      if (RANK[d.role] <= 2) player.promise = { kind: "minutes", need: SHARE[d.role] * 0.8, startPlayed: club.played || 0, startM: (player.seasonStats || {}).matches || 0, untilDay: (state.dayCounter || 0) + 100 };
    }
    const desc = describe(d);
    if (desc) {
      note(`Clauses signées avec ${player.lastName} : ${desc}.`);
      mail("transfers", player.agent ? player.agent.name : "Agent", `Contrat signé : ${player.firstName} ${player.lastName}`, `<p>Contrat de <b>${esc(player.firstName)} ${esc(player.lastName)}</b> avec ${esc(club.name)}.</p><table><tr><td>Salaire</td><td>${fmtMoney(player.wage)}/mois</td></tr><tr><td>Rôle promis</td><td>${d.role ? ROLES[d.role] : "—"}</td></tr><tr><td>Prime par match</td><td>${fmtOpt(d.app)}</td></tr><tr><td>Prime par but</td><td>${fmtOpt(d.goal)}</td></tr><tr><td>Prime de réussite</td><td>${fmtOpt(d.succ)}</td></tr><tr><td>Clause libératoire</td><td>${fmtOpt(d.rel)}</td></tr></table>`);
    }
  }
  window.dsDeal.apply = applyDeal;
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee, opts) {
    const r = origTransfer.apply(this, arguments);
    try { const d = opts && opts.deal; if (d && isUserClub(toId)) applyDeal(player, getClub(toId), d); } catch (e) { console.error(e); }
    return r;
  };

  // versement des primes + clause libératoire
  function payBonuses() {
    state.userClubIds.forEach((id) => {
      const club = getClub(id); if (!club) return;
      club.players.forEach((p) => {
        const d = p.deal; if (!d) return;
        const st = p.seasonStats || { matches: 0, goals: 0 };
        let dm = st.matches - (d.lm || 0), dg = st.goals - (d.lg || 0);
        if (dm < 0) dm = st.matches; if (dg < 0) dg = st.goals;
        d.lm = st.matches; d.lg = st.goals;
        const pay = Math.max(0, dm) * (d.app || 0) + Math.max(0, dg) * (d.goal || 0);
        if (pay > 0) { club.budget -= pay; d.paid += pay; }
      });
    });
  }
  function payRelease() {
    const club = userClub(); if (!club || !currentWindow()) return;
    club.players.filter((p) => p.releaseClause && !p.onLoan).forEach((p) => {
      if (Math.random() > 0.05) return;
      const buyers = allClubs().filter((c) => !isUserClub(c.id) && c.budget >= p.releaseClause);
      if (!buyers.length) return;
      const b = buyers[Math.floor(Math.random() * buyers.length)];
      const amt = p.releaseClause;
      delete p.deal; delete p.releaseClause;
      transferPlayer(p, club.id, b.id, amt);
      note(`Clause libératoire activée : ${p.firstName} ${p.lastName} rejoint ${b.name} pour ${fmtMoney(amt)}.`);
      mail("transfers", b.name, `Clause libératoire : ${p.firstName} ${p.lastName}`, `<p><b>${esc(b.name)}</b> a activé la clause libératoire de <b>${esc(p.firstName)} ${esc(p.lastName)}</b> : ${fmtMoney(amt)} versés à votre club. Le départ est immédiat.</p>`);
    });
  }
  function paySuccess() {
    state.userClubIds.forEach((id) => {
      const club = getClub(id); if (!club) return;
      const s = leagueStandingOf(club);
      if (s.rank > 3) return;
      club.players.forEach((p) => {
        if (p.deal && p.deal.succ) { club.budget -= p.deal.succ; p.deal.paid += p.deal.succ; note(`Prime de réussite versée à ${p.lastName} : ${fmtMoney(p.deal.succ)}.`); }
      });
    });
  }

  // ===================================================================
  // 2. SCOUTING
  // ===================================================================
  const FOCI = { "": "Équilibré", jeunes: "Jeunes talents (≤ 21 ans)", affaires: "Bonnes affaires (budget max)", libres: "Fins de contrat", shortlist: "Suivi de ma liste" };
  const PERSONA = ["Professionnel", "Ambitieux", "Fiable", "Fantasque", "Leader", "Discret"];
  function scFocus(club) { const sc = ensureScouting(club); return (sc.focus = sc.focus || {}); }

  function enrich(club, scout, p, pClub, rep) {
    const skill = scoutSkill(scout);
    const j = Math.round(4 - clamp(skill, 0, 20) / 20 * 3);
    const lo = clamp(p.potential - j - 1, p.overall, 99), hi = clamp(p.potential + j + 1, lo, 99);
    const persona = PERSONA[p.id % PERSONA.length];
    const prone = (p.id * 7) % 10;
    const injury = prone >= 8 ? "Fragile (blessures fréquentes)" : prone >= 5 ? "Normal" : "Solide";
    const mult = p.age <= 23 ? 1.15 : p.age >= 31 ? 0.8 : 0.97;
    const advice = Math.round(p.value * mult / 10000) * 10000;
    const wage = computeWageDemand(p);
    const role = wantedRole(p, club);
    const xi = club.players.filter((x) => x.position === p.position).sort((a, b) => b.overall - a.overall);
    const ref = xi[0];
    const vs = ref ? (p.overall - ref.overall >= 0 ? `+${p.overall - ref.overall} sur ${ref.lastName}` : `${p.overall - ref.overall} sous ${ref.lastName}`) : "poste vacant";
    const risks = [];
    if (p.age >= 31) risks.push("âge avancé");
    if (prone >= 8) risks.push("fragilité physique");
    if (persona === "Fantasque") risks.push("tempérament");
    if (pClub.countryKey !== club.countryKey) risks.push("adaptation à l'étranger");
    if (p.contractEndYear <= new Date(state.date).getFullYear()) risks.push("contrat expirant (opportunité)");
    rep.d = { lo, hi, persona, injury, advice, wage, role, vs, risk: risks.join(", ") || "faible", conf: rep.pk };
    if (isUserClub(club.id)) {
      mail("scout", rep.scoutName, `Rapport : ${p.firstName} ${p.lastName} — « ${rep.verdict} »`, repHTML(rep, p, pClub));
    }
  }
  function repHTML(rep, p, pc) {
    const d = rep.d;
    return `<p><b>${esc(p.firstName)} ${esc(p.lastName)}</b> · ${esc(p.position)} · ${p.age} ans · ${esc(pc ? pc.name : "?")}</p>
    <p>${esc(rep.text)}</p>
    <table><tr><td>Avis du recruteur</td><td><b>${esc(rep.verdict)}</b> (confiance ${Math.round(d.conf)} %)</td></tr>
    <tr><td>Potentiel estimé</td><td>${d.lo}–${d.hi}</td></tr>
    <tr><td>Personnalité</td><td>${d.persona}</td></tr>
    <tr><td>Santé</td><td>${d.injury}</td></tr>
    <tr><td>Rôle probable chez vous</td><td>${ROLES[d.role]}</td></tr>
    <tr><td>Comparé à votre titulaire</td><td>${esc(d.vs)}</td></tr>
    <tr><td>Prix conseillé</td><td>${fmtMoney(d.advice)} (valeur ${fmtMoney(p.value)})</td></tr>
    <tr><td>Salaire probable</td><td>${fmtMoney(d.wage)}/mois</td></tr>
    <tr><td>Risques</td><td>${esc(d.risk)}</td></tr></table>`;
  }
  const origMake = window.makeScoutReport;
  window.makeScoutReport = function (club, scout, p, pClub, pk) {
    const rep = origMake.apply(this, arguments);
    try { enrich(club, scout, p, pClub, rep); } catch (e) { console.error(e); }
    return rep;
  };

  // axes de recherche supplémentaires
  const origWeekly = window.scoutingWeeklyTick;
  window.scoutingWeeklyTick = function (club) {
    origWeekly.apply(this, arguments);
    try {
      const sc = ensureScouting(club), foc = sc.focus || {};
      staffByRole(club, "recruteur").forEach((scout) => {
        const f = foc[scout.id]; if (!f || !f.type) return;
        const skill = scoutSkill(scout);
        if (Math.random() > 0.35 + skill / 20 * 0.4) return;
        const m = sc.assignments[scout.id] || {};
        if (f.type === "shortlist") {
          const ids = sc.shortlist.filter((id) => getPlayer(id));
          if (!ids.length) return;
          const id = ids[Math.floor(Math.random() * ids.length)];
          const p = getPlayer(id), pc = getClub(p.clubId);
          if (pc) { sc.known[id] = clamp((sc.known[id] || 0) + 12, 0, 100); const rep = makeScoutReport(club, scout, p, pc, sc.known[id]); if (isUserClub(club.id)) note(`Suivi : ${rep.scoutName} actualise ${p.lastName} — « ${rep.verdict} ».`); }
          return;
        }
        if (!m.country || !state.countries[m.country]) return;
        const yr = new Date(state.date).getFullYear(), cands = [];
        Object.values(state.countries[m.country].leagues).forEach((lg) => lg.clubs.forEach((pc) => {
          if (pc.id === club.id) return;
          pc.players.forEach((p) => {
            if (m.position && p.position !== m.position) return;
            if (m.maxAge && p.age > m.maxAge) return;
            if (f.type === "jeunes" && !(p.age <= 21 && p.potential >= 70)) return;
            if (f.type === "affaires" && !(p.value <= (f.maxValue || 5e6) && p.overall >= 58)) return;
            if (f.type === "libres" && !(p.contractEndYear <= yr + 1 && p.overall >= 58)) return;
            if ((sc.known[p.id] || 0) >= 70) return;
            cands.push({ p, pc });
          });
        }));
        if (!cands.length) return;
        const c = cands[Math.floor(Math.random() * cands.length)];
        const k = clamp(Math.round(35 + skill * 2.2 + Math.floor(Math.random() * 15)), 0, 90);
        sc.known[c.p.id] = Math.max(sc.known[c.p.id] || 0, k);
        const rep = makeScoutReport(club, scout, c.p, c.pc, k);
        if (isUserClub(club.id)) note(`Rapport ciblé (${FOCI[f.type]}) : ${c.p.firstName} ${c.p.lastName} — « ${rep.verdict} ».`);
      });
    } catch (e) { console.error(e); }
  };

  const origScoutTab = window.renderScoutingTab;
  window.renderScoutingTab = function () {
    const base = origScoutTab.apply(this, arguments);
    try {
      const club = userClub(), sc = ensureScouting(club), foc = scFocus(club);
      const scouts = staffByRole(club, "recruteur");
      const rich = sc.reports.filter((r) => r.d).slice(0, 8);
      const plan = scouts.length ? `<h3 class="panel-subtitle">Axes de recherche</h3><div class="dossier">
        <p class="hint" style="margin-top:0;">En plus du pays, du poste et de l'âge, donnez à chaque recruteur un axe : il produira des rapports ciblés chaque semaine.</p>
        ${scouts.map((s) => { const f = foc[s.id] || {}; return `<div class="dp-row"><b>${esc(s.firstName)} ${esc(s.lastName)}</b>
          <select data-dp-focus="${s.id}">${Object.entries(FOCI).map(([k, l]) => `<option value="${k}" ${(f.type || "") === k ? "selected" : ""}>${l}</option>`).join("")}</select>
          ${f.type === "affaires" ? `<label>Budget max <input type="number" data-dp-maxval="${s.id}" value="${f.maxValue || 5000000}" step="500000" min="0" /></label>` : ""}</div>`; }).join("")}
      </div>` : "";
      const reps = `<h3 class="panel-subtitle">Rapports détaillés</h3>` + (rich.length ? rich.map((r) => { const p = getPlayer(r.playerId); if (!p) return ""; return `<details class="dp-rep"><summary><b>${esc(p.firstName)} ${esc(p.lastName)}</b> — ${esc(r.verdict)} · ${esc(r.date)}</summary>${repHTML(r, p, getClub(r.clubId))}</details>`; }).join("") : `<p class="hint">Les prochains rapports contiendront potentiel estimé, personnalité, santé, prix conseillé et comparaison avec votre effectif.</p>`);
      return base + plan + reps;
    } catch (e) { console.error(e); return base; }
  };

  // ===================================================================
  // 3. JEUNES : plan de développement + prêts suivis
  // ===================================================================
  const DEV_FOCUS = { "": "Aucun", technique: "Technique", physique: "Physique", mental: "Mental", defense: "Défense", attaque: "Attaque" };
  const DEV_POS = { technique: ["MIL", "ATT"], defense: ["DEF", "GB"], attaque: ["ATT"] };
  function devPool(club) {
    const u19 = (fxEnsureSubTeams(club).u19.players || []).map((p) => ({ p, where: "U19" }));
    const sen = club.players.filter((p) => p.age <= 21 && p.potential > p.overall).map((p) => ({ p, where: "Pro" }));
    return sen.concat(u19).slice(0, 40);
  }
  function loansOut(club) {
    const out = [];
    allClubs().forEach((c) => c.players.forEach((p) => { if (p.onLoan && p.onLoan.fromClubId === club.id && c.id !== club.id) out.push({ p, host: c }); }));
    return out;
  }
  function devPanel() {
    const club = userClub();
    const pool = devPool(club), loans = loansOut(club);
    return `<div class="fm-dark fm-panel dp-youth">
      <h2 class="fm-title">Développement des jeunes <span>plans individuels &amp; prêts suivis</span></h2>
      <h3 class="panel-subtitle">Plans de développement</h3>
      <p class="hint">Un plan « intensif » fait progresser plus vite mais augmente le risque de blessure. Un axe adapté au poste est plus efficace.</p>
      <div class="table-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Équipe</th><th>Poste</th><th>Âge</th><th>Niv./Pot.</th><th>Axe</th><th>Charge</th><th>Gains</th></tr></thead><tbody>
      ${pool.map(({ p, where }) => { const d = p.devPlan || {}; return `<tr><td>${esc(p.firstName)} <b>${esc(p.lastName)}</b></td><td>${where}</td><td>${p.position}</td><td>${p.age}</td><td>${p.overall}/${p.potential}</td>
        <td><select data-dp-dev="${p.id}">${Object.entries(DEV_FOCUS).map(([k, l]) => `<option value="${k}" ${(d.focus || "") === k ? "selected" : ""}>${l}</option>`).join("")}</select></td>
        <td><select data-dp-int="${p.id}"><option value="normal" ${d.intensity !== "intensif" ? "selected" : ""}>Normale</option><option value="intensif" ${d.intensity === "intensif" ? "selected" : ""}>Intensive</option></select></td>
        <td>${d.gain ? "+" + d.gain : "—"}</td></tr>`; }).join("") || `<tr><td colspan="8">Aucun jeune à suivre.</td></tr>`}
      </tbody></table></div>
      <h3 class="panel-subtitle">Prêts suivis</h3>
      ${loans.length ? `<div class="table-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Prêté à</th><th>Retour</th><th>Matchs</th><th>Buts</th><th>Évolution</th><th></th></tr></thead><tbody>
      ${loans.map(({ p, host }) => { const l = p.onLoan, st = p.seasonStats || { matches: 0, goals: 0 }; const m = st.matches - (l.m0 || 0), g = st.goals - (l.g0 || 0), dv = p.overall - (l.o0 === undefined ? p.overall : l.o0);
        return `<tr><td>${esc(p.firstName)} <b>${esc(p.lastName)}</b></td><td>${esc(host.name)}</td><td>${esc(l.until)}</td><td>${Math.max(0, m)}</td><td>${Math.max(0, g)}</td><td>${dv >= 0 ? "+" : ""}${dv}</td><td><button class="btn btn-small btn-ghost" data-dp-recall="${p.id}">Rappeler</button></td></tr>`; }).join("")}
      </tbody></table></div>` : `<p class="hint">Aucun joueur en prêt actuellement. Prêtez un jeune depuis sa fiche pour qu'il joue davantage : vous recevrez un rapport toutes les deux semaines.</p>`}
    </div>`;
  }
  const origSub = window.renderSubTeamTab;
  window.renderSubTeamTab = function (kind) {
    const base = origSub.apply(this, arguments);
    try { return kind === "u19" ? base + devPanel() : base; } catch (e) { console.error(e); return base; }
  };

  function weeklyYouth() {
    const club = userClub(); if (!club) return;
    const yr = todayKey();
    devPool(club).forEach(({ p, where }) => {
      const d = p.devPlan; if (!d || !d.focus && d.intensity !== "intensif") return;
      if (p.overall >= p.potential || p.age > 23) return;
      const intense = d.intensity === "intensif";
      let ch = intense ? 0.06 : 0.03;
      if (d.focus) { const pos = DEV_POS[d.focus]; ch *= (!pos || pos.includes(p.position)) ? 1.5 : 0.7; }
      if (Math.random() < ch) { p.overall++; d.gain = (d.gain || 0) + 1; if (where === "Pro") note(`🎯 Plan de développement : ${p.lastName} progresse (+1).`); }
      if (intense && where === "Pro" && Math.random() < 0.03 && !(p.injuredUntil && p.injuredUntil >= yr)) {
        p.injuredUntil = new Date(new Date(state.date).getTime() + 14 * 864e5).toISOString().slice(0, 10);
        note(`Charge d'entraînement trop forte : ${p.lastName} se blesse (2 semaines).`);
      }
    });
  }
  function loanReports() {
    const club = userClub(); if (!club) return;
    loansOut(club).forEach(({ p, host }) => {
      const l = p.onLoan, st = p.seasonStats || { matches: 0, goals: 0 };
      if (l.m0 === undefined) { l.m0 = st.matches; l.g0 = st.goals; l.o0 = p.overall; return; }
      const m = Math.max(0, st.matches - l.m0), g = Math.max(0, st.goals - l.g0), dv = p.overall - l.o0;
      const verdict = m >= 6 ? "Il joue régulièrement : le prêt est une réussite." : m >= 2 ? "Temps de jeu irrégulier." : "Il ne joue presque pas : envisagez un rappel.";
      mail("players", `Suivi de prêt — ${host.name}`, `${p.firstName} ${p.lastName} : ${m} match(s), ${g} but(s)`, `<p><b>${esc(p.firstName)} ${esc(p.lastName)}</b> (${p.position}, ${p.age} ans) à ${esc(host.name)}.</p><table><tr><td>Matchs depuis le prêt</td><td>${m}</td></tr><tr><td>Buts</td><td>${g}</td></tr><tr><td>Évolution du niveau</td><td>${dv >= 0 ? "+" : ""}${dv}</td></tr></table><p>${verdict}</p>`);
    });
  }

  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.dataset || !state || !state.ds) return;
    const club = userClub();
    let handled = false;
    if (t.dataset.dpFocus !== undefined) { const f = scFocus(club); const id = parseInt(t.dataset.dpFocus, 10); f[id] = Object.assign(f[id] || {}, { type: t.value }); handled = true; }
    else if (t.dataset.dpMaxval !== undefined) { const f = scFocus(club); const id = parseInt(t.dataset.dpMaxval, 10); f[id] = Object.assign(f[id] || {}, { maxValue: parseInt(t.value, 10) || 0 }); handled = true; }
    else if (t.dataset.dpDev !== undefined || t.dataset.dpInt !== undefined) {
      const id = parseInt(t.dataset.dpDev !== undefined ? t.dataset.dpDev : t.dataset.dpInt, 10);
      const e2 = devPool(club).find((x) => x.p.id === id); if (!e2) return;
      e2.p.devPlan = e2.p.devPlan || {};
      if (t.dataset.dpDev !== undefined) e2.p.devPlan.focus = t.value; else e2.p.devPlan.intensity = t.value;
      handled = true;
    }
    if (handled) { saveGame(); render(); }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-dp-recall]"); if (!b) return;
    const p = getPlayer(parseInt(b.dataset.dpRecall, 10)); if (!p || !p.onLoan) return;
    p.onLoan.until = todayKey(); checkLoanReturns();
    note(`${p.firstName} ${p.lastName} est rappelé de son prêt.`);
    saveGame(); render(); try { window.dsToast && window.dsToast("Joueur rappelé"); } catch (x) {}
  });

  // ---------- branchement sur le temps ----------
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const was = !!state.seasonComplete;
    const r = origAdv.apply(this, arguments);
    try {
      if (state.ds && userClub()) {
        payBonuses();
        if (!was && state.seasonComplete) paySuccess();
        const d = state.dayCounter || 0;
        if (d % 7 === 0) { payRelease(); weeklyYouth(); }
        if (d % 14 === 0) loanReports();
      }
    } catch (e) { console.error(e); }
    return r;
  };
  window.dsDeep = { dealScore, wantedRole, enrich, devPool, loansOut, weeklyYouth, loanReports, payBonuses };
})();
