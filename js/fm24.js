// =====================================================================
// COUCHE « FM 2024 » (bloc 5) :
//  - Vestiaire : statuts de joueurs, temps de jeu attendu, promesses, bonheur, capitaine, mentorat
//  - Dernier jour du mercato (deadline day) : offres de dernière minute, alertes de clôture
//  - Confiance du conseil : résultats / finances / supporters / presse, demandes de budget
//  - Hub de données : planificateur d'effectif, focus recrutement, projection de la saison suivante
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dkey = (d) => new Date(d).toISOString().slice(0, 10);
  const todayKey = () => dkey(state.date);
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mineC = (c) => !!c && isUserClub(c.id);
  let rootEl = null;
  function root() { if (!rootEl || !document.body.contains(rootEl)) { rootEl = document.createElement("div"); rootEl.id = "fm-root"; document.body.appendChild(rootEl); } return rootEl; }
  function closeFM() { root().innerHTML = ""; }
  function showModal(html) { root().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">${html}</div></div>`; }
  const anyModal = () => !!document.querySelector("#gp-root .modal-backdrop, #rz-root .modal-backdrop, #fm-root .modal-backdrop, #match-modal .modal-backdrop, #player-modal .modal-backdrop, #help-root .modal-backdrop");
  function F() {
    if (!state.fm) state.fm = { pending: null, deadlineSeen: null, board: { conf: 62, parts: {}, reqDay: -999, warnDay: -999, giftYear: null } };
    if (!state.fm.board) state.fm.board = { conf: 62, parts: {}, reqDay: -999, warnDay: -999, giftYear: null };
    return state.fm;
  }

  // ===================================================================
  // 1. VESTIAIRE : STATUTS, TEMPS DE JEU, BONHEUR, PROMESSES
  // ===================================================================
  const STATUS = {
    key: { label: "Titulaire indiscutable", short: "Cadre", share: 0.85, icon: "⭐" },
    first: { label: "Titulaire", short: "Titulaire", share: 0.70, icon: "🟢" },
    rotation: { label: "Rotation", short: "Rotation", share: 0.45, icon: "🔄" },
    backup: { label: "Remplaçant", short: "Remplaçant", share: 0.20, icon: "🪑" },
    prospect: { label: "Espoir à faire progresser", short: "Espoir", share: 0.12, icon: "🌱" }
  };
  const STARTERS = { GB: 1, DEF: 4, MIL: 3, ATT: 3 };
  function autoStatus(club, p) {
    const same = club.players.filter((x) => x.position === p.position && !x.onLoan).sort((a, b) => b.overall - a.overall);
    const r = same.findIndex((x) => x.id === p.id), n = STARTERS[p.position] || 3;
    if (p.age <= 20 && p.potential - p.overall >= 8 && r >= n) return "prospect";
    if (r < Math.ceil(n / 2)) return "key";
    if (r < n) return "first";
    if (r < n + 2) return "rotation";
    return p.age <= 21 && p.potential - p.overall >= 6 ? "prospect" : "backup";
  }
  const effStatus = (club, p) => p.promisedRole || autoStatus(club, p);
  function shareOf(club, p) { return clamp(((p.seasonStats || {}).matches || 0) / Math.max(1, club.played || 0), 0, 1); }
  function wagePercentileGap(club, p) {
    const n = club.players.length; if (n < 4) return 0;
    const byO = [...club.players].sort((a, b) => b.overall - a.overall).findIndex((x) => x.id === p.id);
    const byW = [...club.players].sort((a, b) => b.wage - a.wage).findIndex((x) => x.id === p.id);
    return (byO - byW) / n; // >0 : mieux payé que son rang de niveau
  }
  function teamFormScore(club) {
    const f = getRecentForm(club, 5); if (!f.length) return 0;
    return f.reduce((s, r) => s + (r.result === "W" ? 1 : r.result === "L" ? -1 : 0), 0) / f.length;
  }
  function happinessTarget(club, p) {
    let h = 62; const st = STATUS[effStatus(club, p)];
    if ((club.played || 0) >= 5) h += clamp((shareOf(club, p) - st.share) * 70, -32, 14);
    h += clamp(wagePercentileGap(club, p) * 28, -14, 9);
    h += ((p.loyalty || 50) - 50) * 0.1;
    h += teamFormScore(club) * 4;
    h -= clamp(((p.fatigue || 0) - 70) * 0.2, 0, 8);
    if (p.listed) h -= 10;
    if (p.promiseBroken && p.promiseBroken > (state.dayCounter || 0) - 120) h -= 15;
    if (p.mentorId) h += 2;
    return clamp(h, 5, 98);
  }
  function reasonOf(club, p) {
    const st = STATUS[effStatus(club, p)];
    const parts = [];
    if ((club.played || 0) >= 5 && shareOf(club, p) < st.share - 0.2) parts.push(`temps de jeu insuffisant (${Math.round(shareOf(club, p) * 100)} % des matchs pour un statut « ${st.short} »)`);
    if (wagePercentileGap(club, p) < -0.15) parts.push("salaire inférieur à celui de joueurs moins bons");
    if (p.promiseBroken && p.promiseBroken > state.dayCounter - 120) parts.push("promesse non tenue");
    return parts.length ? parts.join(", ") : "ambiance générale";
  }
  function captainOf(club) {
    const c = club.players.filter((p) => p.age >= 24 && !p.onLoan);
    if (!c.length) return null;
    const sc = (p) => (p.loyalty || 50) * 0.6 + p.overall * 0.4 + (p.profile && p.profile.k === "leader" ? 15 : 0) + Math.min(10, (p.age - 24));
    return c.sort((a, b) => sc(b) - sc(a))[0];
  }
  function cohesionOf(club) {
    const top = [...club.players].sort((a, b) => b.overall - a.overall).slice(0, 14);
    if (!top.length) return 60;
    let v = top.reduce((s, p) => s + (p.happy === undefined ? 62 : p.happy), 0) / top.length;
    const cap = captainOf(club); if (cap && (cap.happy === undefined ? 62 : cap.happy) < 35) v -= 5; else if (cap && (cap.happy || 62) > 70) v += 3;
    return clamp(Math.round(v), 0, 100);
  }
  function weeklyDynamics() {
    const club = userClub(); if (!club) return;
    const f = F();
    club.players.forEach((p) => {
      if (p.happy === undefined) p.happy = 62;
      const target = happinessTarget(club, p);
      p.happy = clamp(Math.round((p.happy + (target - p.happy) * 0.25) * 10) / 10, 0, 100);
      p.morale = clamp(Math.round((p.morale === undefined ? 65 : p.morale) * 0.6 + (p.happy * 0.8 + 15) * 0.4), 0, 100);
      p.unhappyWeeks = p.happy < 38 ? (p.unhappyWeeks || 0) + 1 : 0;
      // promesses de temps de jeu
      const pr = p.promise;
      if (pr && pr.kind === "minutes") {
        const dp = (club.played || 0) - pr.startPlayed, dm = ((p.seasonStats || {}).matches || 0) - pr.startM;
        if (dp >= 6 && dm / dp >= pr.need) { p.happy = clamp(p.happy + 10, 0, 100); p.loyalty = clamp((p.loyalty || 50) + 3, 0, 100); note(`Promesse tenue : ${p.lastName} a eu son temps de jeu.`); delete p.promise; }
        else if (state.dayCounter > pr.untilDay) { p.promiseBroken = (state.dayCounter || 0) + 1; p.happy = clamp(p.happy - 20, 0, 100); p.loyalty = clamp((p.loyalty || 50) - 6, 0, 100); note(`Promesse non tenue envers ${p.lastName} : il est furieux.`); delete p.promise; }
      }
      if (p.mentorId) { const m = getPlayer(p.mentorId); if (!m || m.clubId !== club.id) delete p.mentorId; }
    });
    if (!f.pending && !anyPending()) {
      const cand = club.players.filter((p) => (p.unhappyWeeks || 0) >= 3 && !(p.grumbleCd > state.dayCounter)).sort((a, b) => a.happy - b.happy)[0];
      if (cand) f.pending = { kind: "grumble", pid: cand.id, reason: reasonOf(club, cand) };
    }
  }
  const anyPending = () => !!(state.media && state.media.pending) || !!state.pendingPoach || !!state.pendingBoard;
  function openGrumble() {
    const f = F(); const ev = f.pending; if (!ev || ev.kind !== "grumble") return;
    const p = getPlayer(ev.pid); const club = userClub();
    if (!p || p.clubId !== club.id) { f.pending = null; return; }
    showModal(`<h3>🗣️ ${esc(p.firstName)} ${esc(p.lastName)} demande à vous voir</h3>
      <p>Le joueur (${esc(STATUS[effStatus(club, p)].short)}, bonheur ${Math.round(p.happy)}/100) est mécontent : <b>${esc(ev.reason)}</b>.</p>
      <div class="stance-list">
        <button class="stance-card" data-fm="gr:time"><b>Promettre plus de temps de jeu</b><span class="hint">Il doit jouer au moins la moitié des 8 prochains matchs. Promesse non tenue = pire colère.</span></button>
        <button class="stance-card" data-fm="gr:wage"><b>Revaloriser son salaire (+15 %)</b><span class="hint">Coûte ${fmtMoney(Math.round(p.wage * 0.15))} de plus par mois.</span></button>
        <button class="stance-card" data-fm="gr:wait"><b>Lui demander de patienter</b><span class="hint">Réussit plus souvent s'il est loyal (${Math.round(p.loyalty || 50)}/100).</span></button>
        <button class="stance-card" data-fm="gr:list"><b>L'inscrire sur la liste des transferts</b><span class="hint">Il se calme, mais des offres peuvent arriver.</span></button>
      </div><div id="fm-msg"></div>`);
  }
  function resolveGrumble(kind) {
    const f = F(); const ev = f.pending; if (!ev) return; const p = getPlayer(ev.pid); const club = userClub();
    let msg = "";
    if (kind === "time") { p.promise = { kind: "minutes", need: 0.5, startPlayed: club.played || 0, startM: (p.seasonStats || {}).matches || 0, untilDay: state.dayCounter + 56 }; p.happy = clamp(p.happy + 15, 0, 100); msg = `Promesse faite à ${p.lastName} : il doit disputer la moitié des 8 prochains matchs.`; }
    else if (kind === "wage") {
      const nw = Math.round(p.wage * 1.15 / 100) * 100;
      if (!canAffordWage(club, nw - p.wage)) { const m = document.getElementById("fm-msg"); if (m) m.innerHTML = `<p class="result-bad">Masse salariale insuffisante pour cette revalorisation.</p>`; return; }
      p.wage = nw; recomputeWageBill(club); p.happy = clamp(p.happy + 20, 0, 100); msg = `${p.lastName} est revalorisé à ${fmtMoney(nw)}/mois.`;
    } else if (kind === "wait") {
      if (Math.random() < clamp((p.loyalty || 50) / 130, 0.15, 0.7)) { p.happy = clamp(p.happy + 8, 0, 100); msg = `${p.lastName} accepte de patienter.`; }
      else { p.happy = clamp(p.happy - 8, 0, 100); if (state.media) state.media.press = clamp(state.media.press - 2, 0, 100); msg = `${p.lastName} n'est pas convaincu et s'en plaint dans la presse.`; }
    } else if (kind === "list") { p.listed = true; p.happy = clamp(p.happy + 5, 0, 100); msg = `${p.lastName} est inscrit sur la liste des transferts.`; }
    p.unhappyWeeks = 0; p.grumbleCd = state.dayCounter + 42;
    note(`Vestiaire : ${msg}`); f.pending = null; closeFM(); saveGame(); render();
    if (window.dsToast) dsToast(msg);
  }

  // Mentorat
  function mentorsFor(club, mentee) {
    return club.players.filter((m) => m.id !== mentee.id && m.age >= 28 && (m.loyalty || 50) >= 55 && !m.onLoan);
  }
  function applyMentoring() {
    allClubs().forEach((c) => c.players.forEach((p) => {
      if (!p.mentorId) return;
      const m = getPlayer(p.mentorId);
      if (!m || m.clubId !== c.id || p.age > 22) { delete p.mentorId; return; }
      const same = m.position === p.position && m.overall >= p.overall + 8;
      const gain = same ? 2 : 1;
      const before = p.overall; p.overall = clamp(p.overall + gain, 30, Math.max(p.overall, p.potential));
      m.loyalty = clamp((m.loyalty || 50) + 3, 0, 100);
      if (mineC(c) && p.overall > before) note(`🤝 Mentorat : ${p.lastName} progresse de ${p.overall - before} grâce à ${m.lastName}.`);
    }));
  }
  const origRoll = window.seasonRollover;
  window.seasonRollover = function () { const r = origRoll.apply(this, arguments); try { applyMentoring(); } catch (e) { console.warn("mentorat", e); } return r; };

  function dynamicsHTML() {
    const club = userClub(); const coh = cohesionOf(club); const cap = captainOf(club);
    const f = F();
    const rows = [...club.players].sort((a, b) => b.overall - a.overall);
    const mentorCount = club.players.filter((p) => p.mentorId).length;
    const col = (v) => (v < 35 ? "#8B3A2B" : v < 55 ? "#B9862E" : "#2E6B3E");
    return `<h2 class="panel-title">Vestiaire — ${esc(club.name)}</h2>
      <p class="hint">Chaque joueur a un <b>statut</b> (temps de jeu attendu). Un joueur qui joue moins que prévu, qui est mal payé ou qui a été trompé devient mécontent : son moral baisse, ce qui affaiblit l'équipe.</p>
      <div class="rz-gauges"><div class="rz-gauge"><div class="rz-gl"><span>🤝 Cohésion du groupe</span><b>${coh}</b></div><div class="wage-bar"><div class="wage-bar-fill" style="width:${coh}%;background:${col(coh)}"></div></div></div>
        <div class="rz-gauge"><div class="rz-gl"><span>🎖️ Capitaine</span><b>${cap ? esc(cap.lastName) : "—"}</b></div><div class="hint">${cap ? `Loyauté ${Math.round(cap.loyalty || 50)} · bonheur ${Math.round(cap.happy === undefined ? 62 : cap.happy)}` : ""}</div></div></div>
      <p class="hint">Mentorat : ${mentorCount}/3 binômes. Un mentor (28 ans et +, loyal) fait progresser un jeune (≤ 21 ans) chaque saison, davantage s'il joue au même poste.</p>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>Joueur</th><th>Statut</th><th>Bonheur</th><th>Temps de jeu</th><th>Promesse</th><th>Mentor</th></tr></thead><tbody>
      ${rows.map((p) => {
        const h = p.happy === undefined ? 62 : p.happy; const st = effStatus(club, p); const exp = STATUS[st].share; const sh = shareOf(club, p);
        const ok = (club.played || 0) < 5 || sh >= exp - 0.12;
        const young = p.age <= 21; const ments = young ? mentorsFor(club, p) : [];
        return `<tr><td>${esc(p.firstName[0])}. <b>${esc(p.lastName)}</b><br/><span class="hint">${p.position} · ${p.age} ans · ${p.overall}</span></td>
          <td><select data-fm-role="${p.id}"><option value="">Auto (${STATUS[autoStatus(club, p)].short})</option>${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${p.promisedRole === k ? "selected" : ""}>${s.icon} ${s.short}</option>`).join("")}</select></td>
          <td style="min-width:90px"><div class="wage-bar"><div class="wage-bar-fill" style="width:${h}%;background:${col(h)}"></div></div><span class="hint">${Math.round(h)}</span></td>
          <td><span class="rz-chip ${ok ? "rz-ok" : "rz-bad"}">${Math.round(sh * 100)} % / ${Math.round(exp * 100)} %</span></td>
          <td>${p.promise ? `<span class="rz-chip rz-mid">≥ 50 % des matchs (${Math.max(0, p.promise.untilDay - state.dayCounter)} j)</span>` : p.promiseBroken && p.promiseBroken > state.dayCounter - 120 ? `<span class="rz-chip rz-bad">Rompue</span>` : "—"}</td>
          <td>${young ? `<select data-fm-mentor="${p.id}"><option value="">—</option>${ments.map((m) => `<option value="${m.id}" ${p.mentorId === m.id ? "selected" : ""}>${esc(m.lastName)} (${m.position}, ${m.age})</option>`).join("")}</select>` : "—"}</td></tr>`;
      }).join("")}
      </tbody></table></div>
      <p class="hint">Promettre un statut plus haut que le niveau réel du joueur le rend heureux un temps, puis furieux s'il ne joue pas.</p>`;
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.dataset) return;
    const club = userClub();
    if (t.dataset.fmRole !== undefined) {
      const p = getPlayer(parseInt(t.dataset.fmRole, 10)); if (!p) return;
      const auto = autoStatus(club, p);
      if (!t.value) delete p.promisedRole; else { p.promisedRole = t.value; if (Object.keys(STATUS).indexOf(t.value) < Object.keys(STATUS).indexOf(auto)) { p.happy = clamp((p.happy === undefined ? 62 : p.happy) + 6, 0, 100); } }
      saveGame(); render();
    } else if (t.dataset.fmMentor !== undefined) {
      const p = getPlayer(parseInt(t.dataset.fmMentor, 10)); if (!p) return;
      if (!t.value) delete p.mentorId;
      else { if (club.players.filter((x) => x.mentorId && x.id !== p.id).length >= 3) { if (window.dsToast) dsToast("3 binômes maximum"); render(); return; } p.mentorId = parseInt(t.value, 10); }
      saveGame(); render();
    }
  });

  // ===================================================================
  // 2. DERNIER JOUR DU MERCATO
  // ===================================================================
  function daysToClose() {
    if (!currentWindow()) return null;
    for (let k = 1; k <= 120; k++) { if (!currentWindow(new Date(state.date.getTime() + k * 864e5))) return k - 1; }
    return null;
  }
  function deadlineDay() {
    const club = userClub(); if (!club) return;
    const f = F(); const t = todayKey();
    const before = state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved).length;
    for (let i = 0; i < 4; i++) { try { simulateAIMarketTick(); } catch (e) {} }
    for (let i = 0; i < 3; i++) { try { generateIncomingOffersForUser(); } catch (e) {} }
    const others = allClubs().filter((c) => !isUserClub(c.id) && c.id !== club.id);
    // offres non sollicitées sur les meilleurs joueurs
    [...club.players].sort((a, b) => b.overall - a.overall).slice(0, 6).forEach((p) => {
      if (Math.random() > 0.3 || p.onLoan) return;
      const buyers = others.filter((c) => c.budget >= p.value * 1.15 && c.reputation >= club.reputation - 12);
      if (!buyers.length) return;
      const b = pick(buyers); const amount = Math.round(p.value * randInt(112, 140) / 100 / 1000) * 1000;
      state.inbox.unshift({ id: nextId(), type: "offer_incoming", playerId: p.id, fromClubId: b.id, amount, date: fmtDate(state.date), resolved: false, deadline: true });
    });
    state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved && !o.deadline && o.date === fmtDate(state.date)).forEach((o) => { o.amount = Math.round(o.amount * 1.12 / 1000) * 1000; o.deadline = true; });
    const got = state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved && o.deadline && o.date === fmtDate(state.date)).length;
    f.deadline = { date: t, offers: got };
    note(`⏰ Dernier jour du mercato : ${got} offre(s) de dernière minute reçue(s).`);
  }
  function openDeadline() {
    const f = F(); const club = userClub(); const dl = f.deadline; if (!dl) return;
    const offers = state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved && o.deadline).slice(0, 5);
    const watched = (club.scouting && club.scouting.shortlist || []).length;
    showModal(`<h3>⏰ Dernier jour du mercato !</h3>
      <p>La fenêtre de transferts ferme <b>ce soir</b>. Après cela, plus aucune arrivée ni départ avant la prochaine ouverture.</p>
      <p class="hint">${dl.offers} offre(s) de dernière minute dans votre boîte de réception (+12 % en moyenne : les clubs paniquent). ${watched ? `Votre liste de suivi compte ${watched} joueur(s) : c'est maintenant ou jamais.` : "Pensez à combler vos lacunes dans le Hub de données."}</p>
      ${offers.length ? `<ul>${offers.map((o) => { const p = getPlayer(o.playerId), b = getClub(o.fromClubId); return `<li>${p ? esc(p.firstName[0] + ". " + p.lastName) : "?"} ← ${b ? esc(b.name) : "?"} : <b>${fmtMoney(o.amount)}</b></li>`; }).join("")}</ul>` : ""}
      <div class="creation-footer"><button class="btn btn-ghost" data-fm="close">Fermer</button><button class="btn btn-primary" data-fm="goto:inbox">Voir mes offres</button></div>`);
    f.deadlineSeen = dl.date;
  }

  // ===================================================================
  // 3. CONFIANCE DU CONSEIL
  // ===================================================================
  function targetRankFor(club, total) {
    return ({ titre: 1, top3: 3, top6: 6, promotion: 2, milieu: Math.ceil(total * 0.5), maintien: Math.max(1, total - 3) })[club.objectiveType] || Math.ceil(total / 2);
  }
  function boardParts(club) {
    const st = leagueStandingOf(club); const tr = targetRankFor(club, st.total);
    const results = (club.played || 0) < 4 ? 60 : clamp(58 + (tr - st.rank) * 5, 5, 98);
    const ratio = club.wageBill / Math.max(1, club.wageBudgetMonthly);
    let finances = clamp(92 - (ratio - 0.8) * 160, 10, 95); if (club.budget < 0) finances = Math.min(finances, 15);
    const m = state.media || { fans: 60, press: 55 };
    return { results: Math.round(results), finances: Math.round(finances), fans: Math.round(m.fans), press: Math.round(m.press), rank: st.rank, targetRank: tr };
  }
  function weeklyBoard() {
    const club = userClub(); if (!club) return;
    const b = F().board; const parts = boardParts(club); b.parts = parts;
    const target = parts.results * 0.45 + parts.finances * 0.25 + parts.fans * 0.2 + parts.press * 0.1;
    b.conf = clamp(Math.round((b.conf + (target - b.conf) * 0.15) * 10) / 10, 0, 100);
    const year = state.season.year;
    if (b.conf >= 80 && b.giftYear !== year) {
      b.giftYear = year; const g = Math.max(500000, Math.round(Math.max(club.budget, 0) * 0.05 / 50000) * 50000);
      club.budget += g; note(`Le conseil, ravi de votre travail, débloque une enveloppe de ${fmtMoney(g)}.`);
    }
    if (b.conf < 25 && state.dayCounter - b.warnDay > 60) {
      b.warnDay = state.dayCounter; state.ds.reputation = clamp(state.ds.reputation - (b.conf < 12 ? 2 : 1), 0, 100);
      note(b.conf < 12 ? "⚠️ Le conseil perd patience : un ultimatum plane sur votre poste." : "Le conseil s'inquiète de la situation du club.");
    }
  }
  function requestBudget() {
    const club = userClub(); const b = F().board;
    if (state.dayCounter - b.reqDay < 90) return { ok: false, msg: `Vous avez déjà fait une demande récemment (encore ${90 - (state.dayCounter - b.reqDay)} jours).` };
    b.reqDay = state.dayCounter;
    const p = clamp((b.conf - 40) / 60 + (state.ds.reputation - 40) / 300, 0.15, 0.9);
    if (Math.random() < p) {
      const amt = Math.max(500000, Math.round(Math.max(club.budget, 0) * 0.12 / 50000) * 50000);
      club.budget += amt; b.conf = clamp(b.conf - 10, 0, 100); note(`Le conseil accorde une rallonge de ${fmtMoney(amt)} (confiance −10).`);
      return { ok: true, msg: `Le conseil accepte : +${fmtMoney(amt)} de budget.` };
    }
    b.conf = clamp(b.conf - 5, 0, 100); note("Le conseil refuse votre demande de rallonge (confiance −5).");
    return { ok: false, msg: "Le conseil refuse : « Les résultats d'abord. »" };
  }

  // ===================================================================
  // 4. HUB DE DONNÉES : PLANIFICATEUR, FOCUS RECRUTEMENT, PROJECTION
  // ===================================================================
  const IDEAL = { GB: 3, DEF: 7, MIL: 7, ATT: 5 };
  const POS_LABEL = { GB: "Gardiens", DEF: "Défenseurs", MIL: "Milieux", ATT: "Attaquants" };
  function lineAvgOf(c, pos) { const a = c.players.filter((p) => p.position === pos).map((p) => p.overall).sort((x, y) => y - x).slice(0, STARTERS[pos]); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
  function leagueLineAvg(club, pos) {
    const lg = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
    const v = lg.clubs.map((c) => lineAvgOf(c, pos)).filter((x) => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  }
  function recruitNeeds(club) {
    const year = new Date(state.date).getFullYear();
    return Object.keys(IDEAL).map((pos) => {
      const list = club.players.filter((p) => p.position === pos && !(p.onLoan && p.onLoan.toClubId !== club.id));
      const n = list.length; const starters = [...list].sort((a, b) => b.overall - a.overall).slice(0, STARTERS[pos]);
      const mine = lineAvgOf(club, pos), lg = leagueLineAvg(club, pos);
      const gap = Math.max(0, lg - mine);
      const old = starters.filter((p) => p.age >= 31).length;
      const exp = starters.filter((p) => (p.contractEndYear || 9999) - year <= 0).length;
      const depth = Math.max(0, IDEAL[pos] - n);
      const score = depth * 10 + gap * 6 + old * 8 + exp * 10;
      const reasons = [];
      if (depth) reasons.push(`effectif réduit (${n}/${IDEAL[pos]})`);
      if (gap > 1) reasons.push(`niveau sous la moyenne du championnat (−${gap.toFixed(1)})`);
      if (old) reasons.push(`${old} titulaire(s) de 31 ans ou plus`);
      if (exp) reasons.push(`${exp} titulaire(s) en fin de contrat`);
      return { pos, n, mine, lg, gap, score, reasons, target: Math.round(Math.max(mine, lg) + 1) };
    }).sort((a, b) => b.score - a.score);
  }
  function projectOvr(p) {
    if (p.age <= 21) return Math.min(p.potential, p.overall + Math.max(1, Math.round((p.potential - p.overall) * 0.3)));
    if (p.age <= 24) return Math.min(p.potential, p.overall + Math.round((p.potential - p.overall) * 0.2));
    if (p.age <= 29) return p.overall;
    return p.overall - Math.round((p.age - 29) * 0.8);
  }
  function bars(items, max) {
    const m = max || Math.max(1, ...items.map((i) => i.v));
    return items.map((i) => `<div class="hub-bar"><span class="hub-bl">${i.l}</span><span class="hub-bt"><i style="width:${Math.round(i.v / m * 100)}%"></i></span><b>${i.v}</b></div>`).join("");
  }
  function hubHTML() {
    const club = userClub(); const f = F(); const b = f.board; const parts = b.parts && b.parts.results !== undefined ? b.parts : boardParts(club);
    const col = (v) => (v < 35 ? "#8B3A2B" : v < 55 ? "#B9862E" : "#2E6B3E");
    const g = (label, v) => `<div class="rz-gauge"><div class="rz-gl"><span>${label}</span><b>${Math.round(v)}</b></div><div class="wage-bar"><div class="wage-bar-fill" style="width:${clamp(v, 0, 100)}%;background:${col(v)}"></div></div></div>`;
    const year = new Date(state.date).getFullYear();
    const age = [["≤ 20", 0, 20], ["21-23", 21, 23], ["24-27", 24, 27], ["28-30", 28, 30], ["31+", 31, 99]].map(([l, a, z]) => ({ l, v: club.players.filter((p) => p.age >= a && p.age <= z).length }));
    const byYear = {}; club.players.forEach((p) => { const y = p.contractEndYear || year; (byYear[y] = byYear[y] || []).push(p); });
    const years = Object.keys(byYear).sort();
    const bill = club.wageBill || 1; const top = [...club.players].sort((a, b2) => b2.wage - a.wage).slice(0, 6);
    const needs = recruitNeeds(club); const tb = (() => { try { return getTransferBudget(club); } catch (e) { return club.budget; } })();
    const decl = club.players.map((p) => ({ p, d: projectOvr(p) - p.overall })).filter((x) => x.d < 0).sort((a, b2) => a.d - b2.d).slice(0, 5);
    const prog = club.players.map((p) => ({ p, d: projectOvr(p) - p.overall })).filter((x) => x.d > 0).sort((a, b2) => b2.d - a.d).slice(0, 5);
    const left = club.players.filter((p) => (p.contractEndYear || 9999) - year <= 0);
    const days = state.dayCounter - b.reqDay;
    return `<h2 class="panel-title">Hub de données — ${esc(club.name)}</h2>
      <h3 class="panel-subtitle">Confiance du conseil : <b>${Math.round(b.conf)}</b>/100</h3>
      <div class="rz-gauges">${g("Confiance globale", b.conf)}${g("Résultats (classement " + parts.rank + "ᵉ, objectif " + parts.targetRank + "ᵉ)", parts.results)}${g("Finances (masse salariale)", parts.finances)}${g("Supporters", parts.fans)}</div>
      <p class="hint">La confiance évolue chaque semaine. À 80+, le conseil débloque une enveloppe ; sous 25, il s'inquiète et votre réputation baisse.</p>
      <button class="btn btn-small btn-primary" data-fm="board-req" ${days < 90 ? "disabled" : ""}>Demander une rallonge de budget</button>
      <span class="hint">${days < 90 ? `(disponible dans ${90 - days} j)` : "Réussite probable si la confiance est élevée ; coûte 10 points de confiance."}</span>
      <div id="hub-msg"></div>

      <h3 class="panel-subtitle">Focus recrutement</h3>
      <p class="hint">Vos besoins classés par priorité (effectif, niveau face au championnat, âge, contrats). Budget conseillé : <b>${fmtMoney(tb)}</b>.</p>
      <div class="hub-needs">${needs.map((n, i) => `<div class="hub-need ${i === 0 && n.score > 0 ? "top" : ""}">
        <div><b>${POS_LABEL[n.pos]}</b> <span class="rz-chip ${n.score >= 25 ? "rz-bad" : n.score >= 10 ? "rz-mid" : "rz-ok"}">${n.score >= 25 ? "Prioritaire" : n.score >= 10 ? "À surveiller" : "Solide"}</span></div>
        <div class="hint">${n.reasons.length ? n.reasons.join(" · ") : "Aucune faiblesse détectée."}</div>
        <div class="hint">Votre ligne ${n.mine.toFixed(1)} · championnat ${n.lg.toFixed(1)}</div>
        <button class="btn btn-small btn-ghost" data-fm="recruit:${n.pos}:${n.target}:${tb}">🔍 Chercher un ${POS_LABEL[n.pos].toLowerCase().replace(/s$/, "")} (niveau ≥ ${n.target}, ≤ 27 ans)</button></div>`).join("")}</div>

      <h3 class="panel-subtitle">Planificateur d'effectif</h3>
      <div class="rz-cols"><div><b>Pyramide des âges</b>${bars(age)}</div>
        <div><b>Fins de contrat</b>${years.map((y) => `<div class="hub-bar"><span class="hub-bl">${y}</span><span class="hint">${byYear[y].slice(0, 4).map((p) => esc(p.lastName)).join(", ")}${byYear[y].length > 4 ? ` +${byYear[y].length - 4}` : ""}</span><b>${byYear[y].length}</b></div>`).join("")}</div></div>
      <b>Plus gros salaires</b><div class="rz-risk">${top.map((p) => `<div class="rz-row"><span>${esc(p.firstName[0])}. ${esc(p.lastName)} <span class="hint">${p.position} · ${p.overall}</span></span><span>${fmtMoney(p.wage)}/mois <span class="hint">(${Math.round(p.wage / bill * 100)} % de la masse)</span></span></div>`).join("")}</div>

      <h3 class="panel-subtitle">Projection de la saison prochaine</h3>
      <div class="rz-cols"><div><b>En progression</b>${prog.length ? prog.map(({ p, d }) => `<div class="rz-row"><span>${esc(p.lastName)} <span class="hint">${p.age} ans</span></span><span class="rz-chip rz-ok">${p.overall} → ${p.overall + d}</span></div>`).join("") : `<p class="hint">Personne de notable.</p>`}</div>
        <div><b>En déclin</b>${decl.length ? decl.map(({ p, d }) => `<div class="rz-row"><span>${esc(p.lastName)} <span class="hint">${p.age} ans</span></span><span class="rz-chip rz-bad">${p.overall} → ${p.overall + d}</span></div>`).join("") : `<p class="hint">Aucun déclin attendu.</p>`}</div></div>
      <p class="hint">${left.length ? `${left.length} joueur(s) arrivent en fin de contrat cette année : ${left.slice(0, 6).map((p) => esc(p.lastName)).join(", ")}${left.length > 6 ? "…" : ""}.` : "Aucun contrat n'expire cette année."}</p>`;
  }

  // ===================================================================
  // INTÉGRATION
  // ===================================================================
  window.renderDynamics = dynamicsHTML;
  window.renderHub = hubHTML;
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      if (state.dayCounter % 7 === 0) { weeklyDynamics(); weeklyBoard(); }
      const d = daysToClose();
      if (d === 0) deadlineDay();
      else if (d === 3 || d === 7) note(`⏳ Le mercato ferme dans ${d} jours : finalisez vos dossiers.`);
    } catch (e) { console.warn("fm24/jour", e); }
    return r;
  };
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (ui.screen === "dashboard" && state && state.ds && userClub()) {
        const d = daysToClose();
        const chip = document.querySelector(".sb-window.open");
        if (chip && d !== null && d <= 7) chip.textContent += d === 0 ? " · DERNIER JOUR !" : ` · clôture dans ${d} j`;
        const f = F();
        if (!anyModal()) {
          if (f.deadline && f.deadline.date === todayKey() && f.deadlineSeen !== f.deadline.date) openDeadline();
          else if (f.pending && f.pending.kind === "grumble") openGrumble();
        }
      }
    } catch (e) { console.warn("fm24/rendu", e); }
    return r;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-fm]"); if (!b) return;
    const [cmd, a1, a2, a3] = b.dataset.fm.split(":");
    if (cmd === "close") closeFM();
    else if (cmd === "gr") resolveGrumble(a1);
    else if (cmd === "goto") { ui.tab = a1; closeFM(); render(); window.scrollTo(0, 0); }
    else if (cmd === "board-req") { const r = requestBudget(); saveGame(); render(); if (window.dsToast) dsToast(r.msg); }
    else if (cmd === "recruit") {
      ui.search = Object.assign(defaultSearch(), { pos: a1, ageMax: "27", levelMin: String(overallStars(parseInt(a2, 10) || 60)), valueMax: String(Math.max(500000, parseInt(a3, 10) || 0)), sort: "level" });
      ui.tab = "market"; render(); window.scrollTo(0, 0);
    }
  });
  window.fm24 = { autoStatus, effStatus, happinessTarget, weeklyDynamics, cohesionOf, captainOf, daysToClose, deadlineDay, weeklyBoard, requestBudget, recruitNeeds, projectOvr, resolveGrumble, openGrumble, applyMentoring, STATUS, F };
})();
