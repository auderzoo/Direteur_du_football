// =====================================================================
// PROFONDEUR « FM 2024 » (côté directeur sportif) :
//  - planificateur d'effectif (besoins par poste, vieillissement, fins de contrat, projection à 3 ans)
//  - réunion de recrutement (le staff propose des cibles selon vos priorités)
//  - vestiaire : moral lié au temps de jeu, promesses, leaders, groupes, cohésion
//  - confiance du conseil d'administration
//  - plans de développement individuels des jeunes
//  - suivi des prêts et « data hub » (statistiques de vos derniers matchs)
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };
  const nowYear = () => new Date(state.date).getFullYear();
  const todayKey = () => new Date(state.date).toISOString().slice(0, 10);
  const POS = { GB: { label: "Gardiens", start: 1, ideal: 3 }, DEF: { label: "Défenseurs", start: 4, ideal: 7 }, MIL: { label: "Milieux", start: 3, ideal: 7 }, ATT: { label: "Attaquants", start: 3, ideal: 5 } };
  const FOCUS = { "": "Aucun", technique: "Technique", physique: "Physique", mental: "Mental", defense: "Défense", attaque: "Attaque" };
  const FOCUS_POS = { technique: ["MIL", "ATT"], defense: ["DEF", "GB"], attaque: ["ATT"] };
  let rootEl = null;
  function root() { if (!rootEl || !document.body.contains(rootEl)) { rootEl = document.createElement("div"); rootEl.id = "dp-root"; document.body.appendChild(rootEl); } return rootEl; }
  const closeDP = () => { root().innerHTML = ""; };
  const modalOpen = () => !!document.querySelector("#gp-root .modal-backdrop, #rz-root .modal-backdrop, #match-modal .modal-backdrop, #player-modal .modal-backdrop, #dp-root .modal-backdrop, #tuto-root .tuto-card");

  // ===================================================================
  // 1. PLANIFICATEUR D'EFFECTIF
  // ===================================================================
  function projectedOvr(p, years) {
    let o = p.overall, a = p.age;
    for (let i = 0; i < years; i++) {
      a++;
      if (a <= 23) o += Math.min(Math.max(0, p.potential - o), 2.2);
      else if (a <= 29) o += 0;
      else if (a <= 32) o -= 1.2;
      else o -= 2.4;
    }
    return o;
  }
  function leagueLineAvg(club, pos) {
    const league = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
    const vals = league.clubs.map((c) => startersOf(c, pos).reduce((s, p, _, arr) => s + p.overall / arr.length, 0)).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  function startersOf(club, pos) {
    return club.players.filter((p) => p.position === pos && !p.onLoan || (p.position === pos && p.onLoan && p.onLoan.toClubId === club.id))
      .sort((a, b) => b.overall - a.overall).slice(0, POS[pos].start);
  }
  function plan(club) {
    const y = nowYear();
    return Object.keys(POS).map((pos) => {
      const all = club.players.filter((p) => p.position === pos).sort((a, b) => b.overall - a.overall);
      const st = all.slice(0, POS[pos].start);
      const avg = st.length ? st.reduce((s, p) => s + p.overall, 0) / st.length : 0;
      const lg = leagueLineAvg(club, pos);
      const ageing = st.filter((p) => p.age >= 31).length;
      const expiring = st.filter((p) => (p.contractEndYear || 9999) <= y).length;
      const gap = lg - avg;
      const proj = [0, 1, 2, 3].map((k) => {
        const keep = all.filter((p) => (p.contractEndYear || 9999) >= y + k - (k > 0 ? 0 : 0));
        const top = keep.map((p) => projectedOvr(p, k)).sort((a, b) => b - a).slice(0, POS[pos].start);
        return top.length < POS[pos].start ? (top.reduce((s, v) => s + v, 0) + (POS[pos].start - top.length) * 42) / POS[pos].start : top.reduce((s, v) => s + v, 0) / top.length;
      });
      let score = Math.max(0, gap) * 1.2 + ageing * 1.5 + expiring * 1.3 + Math.max(0, POS[pos].ideal - all.length) * 1.4 + Math.max(0, proj[0] - proj[2]) * 0.6;
      if (st.length < POS[pos].start) score += 6;
      const level = score >= 6 ? "critique" : score >= 3 ? "élevée" : score >= 1.5 ? "normale" : "aucune";
      return { pos, all, st, avg, lg, ageing, expiring, gap, proj, score, level, count: all.length };
    });
  }
  window.dpPlan = plan;
  const LV = { critique: "bad", "élevée": "mid", normale: "info", aucune: "ok" };
  function plannerHTML() {
    const club = userClub(); if (!club) return "";
    const P = plan(club), y = nowYear();
    return `<h3 class="panel-subtitle">Planificateur d'effectif</h3>
      <p class="hint">Compare vos titulaires à la moyenne du championnat, repère les joueurs vieillissants ou en fin de contrat et projette le niveau de chaque ligne sur 3 ans (sans recrutement).</p>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>Ligne</th><th>Effectif</th><th>Titulaires</th><th>Champ.</th><th>${y}</th><th>${y + 1}</th><th>${y + 2}</th><th>${y + 3}</th><th>Besoin</th></tr></thead><tbody>
      ${P.map((r) => `<tr><td>${POS[r.pos].label}</td><td>${r.count}/${POS[r.pos].ideal}</td><td>${r.avg.toFixed(1)}${r.ageing ? ` <span class="hint">· ${r.ageing} ≥31 ans</span>` : ""}${r.expiring ? ` <span class="hint">· ${r.expiring} fin de contrat</span>` : ""}</td><td>${r.lg.toFixed(1)}</td>${r.proj.map((v) => `<td>${v.toFixed(1)}</td>`).join("")}<td><span class="rz-chip rz-${LV[r.level]}">${r.level}</span></td></tr>`).join("")}
      </tbody></table></div>`;
  }

  // ===================================================================
  // 2. RÉUNION DE RECRUTEMENT
  // ===================================================================
  function runMeeting() {
    const club = userClub(); const P = plan(club);
    const budget = getTransferBudget(club);
    const items = [];
    P.filter((r) => r.level === "critique" || r.level === "élevée").sort((a, b) => b.score - a.score).forEach((r) => {
      const weakest = r.st.length ? r.st[r.st.length - 1].overall : 40;
      const ageMax = r.level === "critique" ? 32 : 29;
      const rows = searchPlayers(club, { pos: r.pos, ageMax, valueMax: Math.max(budget, 50000), sort: "level" })
        .filter((x) => x.p.overall > weakest + 1 && wageOk(club, x.p)).slice(0, 3);
      items.push({ pos: r.pos, level: r.level, weakest, picks: rows.map((x) => ({ id: x.p.id, club: x.club.name, name: `${x.p.firstName} ${x.p.lastName}`, age: x.p.age, value: x.p.value, stars: starsPair(x.view) })) });
    });
    state.recruitReport = { date: fmtDate(state.date), day: state.dayCounter, budget, items };
    note(`Réunion de recrutement : ${items.length} poste(s) prioritaire(s), ${items.reduce((s, i) => s + i.picks.length, 0)} cible(s) proposée(s).`);
    return state.recruitReport;
  }
  function wageOk(club, p) { return canAffordWage(club, Math.round(computeWageDemand(p))); }
  function meetingHTML() {
    const club = userClub(); if (!club) return "";
    const r = state.recruitReport;
    const needs = plan(club).filter((x) => x.level === "critique" || x.level === "élevée");
    return `<h3 class="panel-subtitle">Réunion de recrutement</h3>
      <p class="hint">Postes à renforcer en priorité : ${needs.length ? needs.map((n) => `<b>${POS[n.pos].label}</b> (${n.level})`).join(", ") : "aucun besoin urgent détecté"}. Enveloppe de transferts : <b>${fmtMoney(getTransferBudget(club))}</b>.</p>
      <p><button class="btn btn-small btn-primary" data-dp="meeting">📋 Lancer la réunion</button></p>
      ${r ? `<p class="hint">Dernière réunion : ${esc(r.date)}. Seules les cibles visibles par votre réseau de recruteurs sont proposées.</p>
        ${r.items.map((i) => `<div class="dp-need"><b>${POS[i.pos].label}</b> <span class="rz-chip rz-${LV[i.level]}">${i.level}</span>
          ${i.picks.length ? i.picks.map((p) => { const on = ensureScouting(club).shortlist.includes(p.id); return `<div class="rz-row"><span>${esc(p.name)} <span class="hint">${p.age} ans · ${esc(p.club)} · ${fmtMoney(p.value)}</span> ${p.stars}</span><span><button class="btn btn-small btn-ghost" data-dp="open:${p.id}">Fiche</button> <button class="btn btn-small ${on ? "btn-ghost" : "btn-primary"}" data-dp="short:${p.id}">${on ? "Retirer" : "★ Ma liste"}</button></span></div>`; }).join("") : `<p class="hint">Aucune cible abordable et visible pour l'instant : renforcez votre réseau de recruteurs.</p>`}</div>`).join("") || `<p class="hint">Aucun poste prioritaire à pourvoir.</p>`}` : ""}`;
  }

  // ===================================================================
  // 3. VESTIAIRE : MORALE, PROMESSES, LEADERS, GROUPES, COHÉSION
  // ===================================================================
  function weeklyLockerRoom() {
    const club = userClub(); if (!club) return;
    const pl = club.players.filter((p) => !p.onLoan || p.onLoan.toClubId === club.id);
    const ranked = [...pl].sort((a, b) => b.overall - a.overall);
    const top = new Set(ranked.slice(0, 14).map((p) => p.id));
    const played = club.played || 0;
    const form = played >= 2 ? getRecentForm(club, 3) : [];
    const teamDelta = form.reduce((s, r) => s + (r.result === "W" ? 1 : r.result === "L" ? -1 : 0), 0) * 0.5;
    pl.forEach((p) => {
      if (p.morale === undefined) p.morale = 65;
      let d = teamDelta + (65 - p.morale) * 0.04;
      if (played >= 4) {
        const share = ((p.seasonStats || {}).matches || 0) / played;
        if (top.has(p.id) && share < 0.35 && !(p.injuredUntil && p.injuredUntil >= todayKey())) d -= 3;
        else if (!top.has(p.id) && share < 0.15) d -= 0.5;
        else if (share > 0.7) d += 1.5;
      }
      if ((p.contractEndYear || 9999) - nowYear() <= 0) d -= 0.5;
      p.morale = clamp(Math.round((p.morale + d) * 10) / 10, 5, 100);
      if (p.promise) {
        const pr = p.promise;
        if (state.dayCounter >= pr.untilDay) {
          const ok = ((p.seasonStats || {}).matches || 0) >= pr.target;
          p.morale = clamp(p.morale + (ok ? 8 : -15), 5, 100);
          if (!ok) p.loyalty = clamp((p.loyalty || 60) - 8, 0, 100);
          note(ok ? `Promesse tenue : ${p.lastName} a eu son temps de jeu.` : `Promesse non tenue envers ${p.firstName} ${p.lastName} : il est furieux.`);
          delete p.promise;
        }
      }
    });
  }
  function leaders(club) {
    return club.players.map((p) => ({ p, v: (p.loyalty || 50) * 0.4 + Math.min(40, (p.age - 18) * 2) + Math.min(20, (p.internationalCaps || 0) * 0.4) + (p.profile && p.profile.k === "leader" ? 25 : 0) + (p.overall - 50) * 0.3 }))
      .sort((a, b) => b.v - a.v).slice(0, 3).map((x) => x.p);
  }
  function cohesion(club) {
    const pl = club.players; if (!pl.length) return 0;
    const avg = pl.reduce((s, p) => s + (p.morale === undefined ? 65 : p.morale), 0) / pl.length;
    const unhappy = pl.filter((p) => (p.morale === undefined ? 65 : p.morale) < 40).length / pl.length;
    const lead = leaders(club).reduce((s, p) => s + (p.morale === undefined ? 65 : p.morale), 0) / 3;
    return clamp(Math.round(avg * 0.6 + lead * 0.25 + (1 - unhappy) * 15), 0, 100);
  }
  window.dpCohesion = cohesion;
  function gauge(label, v, tip) {
    const col = v < 35 ? "#8B3A2B" : v < 55 ? "#B9862E" : "#2E6B3E";
    return `<div class="rz-gauge"><div class="rz-gl"><span>${label}</span><b>${Math.round(v)}</b></div><div class="wage-bar"><div class="wage-bar-fill" style="width:${clamp(v, 0, 100)}%;background:${col}"></div></div></div>`;
  }
  function lockerHTML() {
    const club = userClub(); if (!club) return "";
    const co = cohesion(club); const lead = leaders(club);
    const groups = {};
    club.players.forEach((p) => { (groups[p.nationality] = groups[p.nationality] || []).push(p); });
    const gl = Object.entries(groups).filter(([, l]) => l.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
    const unhappy = club.players.filter((p) => (p.morale === undefined ? 65 : p.morale) < 45).sort((a, b) => a.morale - b.morale).slice(0, 6);
    return `<h3 class="panel-subtitle">Vestiaire et cohésion</h3>
      <div class="rz-gauges">${gauge("🤝 Cohésion du groupe", co)}${gauge("😊 Moral moyen", club.players.reduce((s, p) => s + (p.morale === undefined ? 65 : p.morale), 0) / Math.max(1, club.players.length))}</div>
      <p class="hint"><b>Cadres :</b> ${lead.map((p) => esc(p.lastName)).join(", ") || "—"} · <b>Groupes :</b> ${gl.map(([n, l]) => `${esc(n)} (${l.length}, moral ${Math.round(l.reduce((s, p) => s + (p.morale === undefined ? 65 : p.morale), 0) / l.length)})`).join(", ") || "aucun groupe marqué"}.</p>
      ${unhappy.length ? `<div class="rz-risk">${unhappy.map((p) => `<div class="rz-row"><span>${esc(p.firstName[0])}. ${esc(p.lastName)} <span class="hint">${p.position} · moral ${Math.round(p.morale)} · ${(p.seasonStats || {}).matches || 0} match(s)</span></span><span>${p.promise ? `<span class="rz-chip rz-info">Promesse en cours</span>` : `<button class="btn btn-small btn-ghost" data-dp="promise:${p.id}">Promettre du temps de jeu</button>`}</span></div>`).join("")}</div>
      <p class="hint">Un titulaire potentiel qui ne joue pas voit son moral chuter. Une promesse redonne +10 de moral, mais devient +8 si elle est tenue (4 matchs sous 6 semaines) ou −15 sinon.</p>` : `<p class="hint">Aucun joueur en difficulté dans le vestiaire.</p>`}`;
  }

  // ===================================================================
  // 4. CONFIANCE DU CONSEIL D'ADMINISTRATION
  // ===================================================================
  function targetRank(club, total) {
    return ({ titre: 1, top3: 3, top6: 6, promotion: 2, milieu: Math.ceil(total * 0.55), maintien: total - 3 })[club.objectiveType] || Math.ceil(total / 2);
  }
  function boardTick() {
    const club = userClub(); if (!club) return;
    const b = state.board = state.board || { conf: 60, lowWeeks: 0, last: "" };
    const st = leagueStandingOf(club);
    let delta = 0, why = "Début de saison : le conseil observe.";
    if ((club.played || 0) >= 3) {
      const diff = targetRank(club, st.total) - st.rank;
      delta = clamp(diff * 0.8, -5, 4);
      why = diff >= 0 ? `${st.rank}ᵉ au classement : l'objectif (${club.objectiveLabel || "—"}) est dans les clous.` : `${st.rank}ᵉ au classement : en retard sur l'objectif (${club.objectiveLabel || "—"}).`;
    }
    if (club.budget < 0) { delta -= 2; why += " Trésorerie négative."; }
    if (state.media) delta += (state.media.press - 50) / 40;
    b.conf = clamp(Math.round((b.conf + delta + (60 - b.conf) * 0.02) * 10) / 10, 0, 100);
    b.last = why;
    b.lowWeeks = b.conf < 25 ? b.lowWeeks + 1 : 0;
    if (b.lowWeeks === 3) { state.ds.reputation = clamp(state.ds.reputation - 2, 0, 100); note("⚠️ Le conseil d'administration vous adresse un avertissement : sa confiance est au plus bas (−2 de réputation)."); if (window.dsToast) dsToast("Avertissement du conseil ⚠️"); }
    if (b.lowWeeks >= 8 && b.lowWeeks % 4 === 0) { state.ds.reputation = clamp(state.ds.reputation - 3, 0, 100); note("Le conseil perd patience : nouveau malus de réputation (−3)."); }
  }
  function boardHTML() {
    const b = state.board || { conf: 60, last: "" };
    return `<h3 class="panel-subtitle">Confiance du conseil</h3>${gauge("🏛️ Conseil d'administration", b.conf)}<p class="hint">${esc(b.last || "Pas encore d'évaluation.")}</p>`;
  }

  // ===================================================================
  // 5. PLANS DE DÉVELOPPEMENT INDIVIDUELS
  // ===================================================================
  function weeklyDevelopment() {
    const club = userClub(); if (!club) return;
    const coach = (staffEffect(club, "entraineur") + staffEffect(club, "adjoint")) / 2;
    club.players.filter((p) => p.focus && p.age <= 24 && p.overall < p.potential).forEach((p) => {
      const fit = FOCUS_POS[p.focus] ? (FOCUS_POS[p.focus].includes(p.position) ? 1.5 : 0.6) : 1;
      if (Math.random() < 0.035 * (0.6 + coach) * fit) {
        p.overall = clamp(p.overall + 1, 30, p.potential);
        note(`📈 ${p.firstName} ${p.lastName} progresse grâce à son plan de développement (${FOCUS[p.focus].toLowerCase()}) : niveau ${p.overall}.`);
      }
    });
  }
  function developmentHTML() {
    const club = userClub(); if (!club) return "";
    const youth = club.players.filter((p) => p.age <= 24).sort((a, b) => b.potential - a.potential).slice(0, 8);
    if (!youth.length) return "";
    return `<h3 class="panel-subtitle">Plans de développement</h3>
      <p class="hint">Assignez un axe de travail à vos jeunes (24 ans max). La progression dépend de votre staff technique et de l'adéquation entre l'axe et le poste.</p>
      <div class="rz-risk">${youth.map((p) => `<div class="rz-row"><span>${esc(p.firstName[0])}. ${esc(p.lastName)} <span class="hint">${p.position} · ${p.age} ans · ${p.overall}/${Math.min(99, p.potential)} pot.</span></span>
        <select data-dpfocus="${p.id}">${Object.entries(FOCUS).map(([k, l]) => `<option value="${k}" ${(p.focus || "") === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>`).join("")}</div>`;
  }

  // ===================================================================
  // 6. SUIVI DES PRÊTS + DATA HUB
  // ===================================================================
  function loansHTML() {
    const club = userClub(); if (!club) return "";
    const out = allClubs().flatMap((c) => c.players.filter((p) => p.onLoan && p.onLoan.fromClubId === club.id));
    if (!out.length) return "";
    return `<h3 class="panel-subtitle">Suivi des prêts</h3><div class="table-scroll"><table class="squad-table"><thead><tr><th>Joueur</th><th>Club</th><th>Matchs</th><th>Buts</th><th>Retour</th></tr></thead><tbody>
      ${out.map((p) => { const to = getClub(p.onLoan.toClubId); const st = p.seasonStats || {}; return `<tr><td>${esc(p.firstName[0])}. ${esc(p.lastName)}</td><td>${esc(to ? to.name : "?")}</td><td>${st.matches || 0}</td><td>${st.goals || 0}</td><td>${esc(p.onLoan.until)}</td></tr>`; }).join("")}</tbody></table></div>`;
  }
  function dataHubHTML() {
    const club = userClub(); if (!club) return "";
    const league = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
    const rows = [];
    league.fixtures.forEach((r) => r.matches.forEach((m) => {
      if (!m.played || !m.report || !m.report.stats) return;
      if (m.home !== club.id && m.away !== club.id) return;
      const home = m.home === club.id; const s = m.report.stats, me = home ? s.home : s.away, op = home ? s.away : s.home;
      rows.push({ date: r.date, opp: getClub(home ? m.away : m.home), gf: home ? m.homeGoals : m.awayGoals, ga: home ? m.awayGoals : m.homeGoals, me, op });
    }));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const last = rows.slice(-8);
    if (!last.length) return `<h3 class="panel-subtitle">Data hub</h3><p class="hint">Les statistiques avancées apparaîtront après vos premiers matchs.</p>`;
    const avg = (f) => (last.reduce((s, r) => s + f(r), 0) / last.length);
    return `<h3 class="panel-subtitle">Data hub — ${last.length} derniers matchs</h3>
      <div class="trend-grid">
        <div class="trend-card"><span class="trend-title">Possession</span><div class="trend-val">${Math.round(avg((r) => r.me.possession))}%</div></div>
        <div class="trend-card"><span class="trend-title">xG pour / contre</span><div class="trend-val">${avg((r) => r.me.xg).toFixed(2)} / ${avg((r) => r.op.xg).toFixed(2)}</div></div>
        <div class="trend-card"><span class="trend-title">Tirs cadrés</span><div class="trend-val">${avg((r) => r.me.onTarget).toFixed(1)}</div></div>
        <div class="trend-card"><span class="trend-title">Précision de passes</span><div class="trend-val">${Math.round(avg((r) => r.me.passAcc))}%</div></div></div>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>Adversaire</th><th>Score</th><th>xG</th><th>Tirs</th><th>Poss.</th></tr></thead><tbody>
      ${last.map((r) => `<tr><td>${esc(r.opp ? r.opp.name : "?")}</td><td>${r.gf}-${r.ga}</td><td>${r.me.xg.toFixed(2)} – ${r.op.xg.toFixed(2)}</td><td>${r.me.shots}-${r.op.shots}</td><td>${r.me.possession}%</td></tr>`).join("")}</tbody></table></div>
      <p class="hint">Un score très au-dessus du xG indique de la réussite, qui ne durera pas forcément.</p>`;
  }

  // ===================================================================
  // INTÉGRATION
  // ===================================================================
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (state.dayCounter % 7 === 0) { weeklyLockerRoom(); boardTick(); weeklyDevelopment(); } } catch (e) { console.warn("profondeur/jour", e); }
    return r;
  };
  const origSquad = window.renderSquad;
  window.renderSquad = function () { return origSquad.apply(this, arguments) + plannerHTML() + lockerHTML() + developmentHTML() + loansHTML(); };
  const origScout = window.renderScoutingTab;
  window.renderScoutingTab = function () { return origScout.apply(this, arguments) + meetingHTML(); };
  const origClub = window.renderClubTab;
  window.renderClubTab = function () { return origClub.apply(this, arguments) + boardHTML() + dataHubHTML(); };
  const origOv = window.renderOverview;
  window.renderOverview = function () { return origOv.apply(this, arguments) + boardHTML(); };

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-dp]"); if (!b) return;
    const [cmd, arg] = b.dataset.dp.split(":");
    if (cmd === "meeting") { runMeeting(); saveGame(); render(); }
    else if (cmd === "open") { openPlayerCard(parseInt(arg, 10)); }
    else if (cmd === "short") { toggleShortlist(userClub().id, parseInt(arg, 10)); saveGame(); render(); }
    else if (cmd === "promise") {
      const p = getPlayer(parseInt(arg, 10)); if (!p || p.promise) return;
      p.promise = { untilDay: state.dayCounter + 42, target: ((p.seasonStats || {}).matches || 0) + 4 };
      p.morale = clamp((p.morale || 50) + 10, 5, 100);
      note(`Vous promettez du temps de jeu à ${p.firstName} ${p.lastName} (4 matchs d'ici 6 semaines).`);
      saveGame(); render();
    }
  });
  document.addEventListener("change", (e) => {
    const s = e.target.closest && e.target.closest("[data-dpfocus]"); if (!s) return;
    const p = getPlayer(parseInt(s.dataset.dpfocus, 10)); if (!p) return;
    p.focus = s.value; saveGame();
    if (window.dsToast) dsToast(p.focus ? `Plan : ${FOCUS[p.focus]}` : "Plan retiré");
  });

  window.dp = { plan, runMeeting, weeklyLockerRoom, boardTick, weeklyDevelopment, cohesion, leaders, projectedOvr, targetRank, plannerHTML, lockerHTML, dataHubHTML };
})();
