// ===================================================================
// BLOC 20 (2/3) — CLUBS AFFILIÉS NÉGOCIÉS (senior ou parent)
//  - on « parle » à un club : type de partenariat, durée, redevance annuelle, quota de prêts,
//    droit de priorité, partage de scouting, part des salaires des prêtés
//  - le club répond : accepte, refuse (délai avant de réessayer) ou fait une contre-offre
//  - effets : redevance mensuelle, développement des prêtés chez l'affilié (rapport mensuel),
//    droit de priorité d'achat (−10 %), prêts gratuits du club parent, fin de contrat
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const ready = () => typeof state !== "undefined" && state && state.ds && state.countries && state.userClubId != null;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const money = (v) => (typeof fmtMoney === "function" ? fmtMoney(v) : Math.round(v) + " €");
  const day = () => state.dayCounter || 0;
  const mail = (sub, html, sender) => { try { window.dsMail && window.dsMail("scout", sender || "Partenariats", sub, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  function S() { if (!state.aff2) state.aff2 = { cool: {}, seq: 1 }; return state.aff2; }
  const me = () => userClub();
  const list = () => ensureScouting(me()).affiliates;

  // ---------------------------------------------------------------
  // Réponse du club
  // ---------------------------------------------------------------
  const unit = (t) => t.reputation * 4000 + 20000; // « valeur » d'une redevance annuelle pour ce club
  function evaluate(club, target, terms) {
    const g = club.reputation - target.reputation;
    let base = terms.type === "affilie" ? 50 + g * 0.8 : 36 + g * 0.35;
    base += ((state.ds.reputation || 30) - 30) * 0.15;
    base += (((target.id * 7919) % 11) - 5); // tempérament propre au club (stable)
    const feeScore = (terms.fee / unit(target)) * 25;
    let burden = terms.quota * 2.2 + (terms.scout ? 3 : 0);
    if (terms.priority === "nous") burden += 10; else if (terms.priority === "eux") burden -= 8;
    burden -= (terms.share / 100) * 14;
    const score = Math.round(base + feeScore - burden);
    return { score, base, feeScore, burden };
  }
  function checkLimits(club, target, type) {
    const l = list();
    if (!target || target.id === club.id || isUserClub(target.id)) return "Club indisponible.";
    if (l.some((a) => a.clubId === target.id)) return "Ce club est déjà lié à vous.";
    if (type === "parent" && l.filter((a) => a.type === "parent").length >= 1) return "Vous avez déjà un club parent.";
    if (type === "affilie" && l.filter((a) => a.type === "affilie").length >= 2) return "Vous avez déjà deux clubs affiliés.";
    if (type === "parent" && !(target.division < club.division || target.reputation >= club.reputation + 8)) return `${target.name} n'est pas assez grand pour devenir votre club parent.`;
    if (type === "affilie" && target.reputation > club.reputation + 8) return `${target.name} est trop prestigieux pour devenir un simple club affilié.`;
    const cd = S().cool[target.id];
    if (cd && cd > day()) return `${target.name} refuse d'en reparler avant ${cd - day()} jour(s).`;
    return null;
  }
  function propose(terms) {
    const club = me(), target = getClub(terms.clubId);
    const why = checkLimits(club, target, terms.type);
    if (why) return { ok: false, reason: why };
    terms = { type: terms.type, clubId: terms.clubId, years: cl(parseInt(terms.years, 10) || 2, 1, 5), fee: Math.round(parseFloat(terms.fee) || 0), quota: cl(parseInt(terms.quota, 10) || 2, 1, 6), priority: terms.priority || "none", scout: !!terms.scout, share: [0, 25, 50].includes(+terms.share) ? +terms.share : 0 };
    const ev = evaluate(club, target, terms);
    if (ev.score >= 55) return { ok: true, result: "accept", terms, ev };
    if (ev.score >= 40) {
      const need = 58 - ev.score; // points à compenser par la redevance
      const newFee = Math.round((terms.fee + need / 25 * unit(target)) / 1000) * 1000;
      if (newFee <= Math.max(0, club.budget) * 0.4) return { ok: true, result: "counter", terms, counter: Object.assign({}, terms, { fee: newFee }), ev };
    }
    S().cool[target.id] = day() + 45;
    return { ok: true, result: "refuse", terms, ev };
  }
  function sign(terms) {
    const club = me(), target = getClub(terms.clubId);
    const why = checkLimits(club, target, terms.type); if (why) return { ok: false, reason: why };
    const sc = ensureScouting(club);
    const entry = { clubId: target.id, type: terms.type, since: fmtDate(state.date), years: terms.years, until: state.season.year + terms.years, fee: terms.fee, quota: terms.quota, priority: terms.priority, scout: !!terms.scout, share: terms.share };
    sc.affiliates.push(entry);
    if (terms.scout) { sc.knowledge[target.countryKey] = Math.min(100, (sc.knowledge[target.countryKey] || 0) + 6); }
    const label = terms.type === "parent" ? "club parent" : "club affilié";
    const text = `${target.name} devient ${terms.type === "parent" ? "le " : ""}${label} de ${club.name} (${terms.years} an${terms.years > 1 ? "s" : ""}, redevance ${money(terms.fee)}/an).`;
    try { state.news.unshift({ date: fmtDate(state.date), text }); } catch (e) {}
    note(text);
    mail("Partenariat conclu : " + target.name, `<p>${esc(text)}</p><p>Quota de prêts garantis : <b>${terms.quota}</b> · droit de priorité : <b>${terms.priority === "nous" ? "pour vous (−10 %)" : terms.priority === "eux" ? "pour eux" : "aucun"}</b> · partage du scouting : <b>${terms.scout ? "oui" : "non"}</b> · salaires des prêtés pris en charge par vous : <b>${terms.share} %</b>.</p>`);
    return { ok: true, entry };
  }
  function end(clubId, why) {
    const club = me(), sc = ensureScouting(club), a = sc.affiliates.find((x) => x.clubId === clubId);
    if (!a) return { ok: false };
    const t = getClub(clubId);
    sc.affiliates = sc.affiliates.filter((x) => x.clubId !== clubId);
    if (why === "break") { const pen = Math.round(Math.abs(a.fee || 0) * 0.5) + 5000; club.budget -= pen; S().cool[clubId] = day() + 120; note(`Rupture du partenariat avec ${t ? t.name : "?"} (indemnité ${money(pen)}).`); return { ok: true, pen }; }
    return { ok: true };
  }
  function renew(clubId, years) {
    const a = list().find((x) => x.clubId === clubId); if (!a) return { ok: false };
    const t = getClub(clubId), club = me();
    const ev = evaluate(club, t, { type: a.type, fee: a.fee, quota: a.quota, priority: a.priority, scout: a.scout, share: a.share });
    if (ev.score < 45) return { ok: false, reason: `${t.name} souhaite revoir les conditions (rapprochez-vous d'une redevance plus élevée).` };
    a.years = cl(years || 2, 1, 5); a.until = Math.max(a.until, state.season.year) + a.years;
    return { ok: true };
  }

  // ---------------------------------------------------------------
  // Effets du partenariat
  // ---------------------------------------------------------------
  const origFin = window.runMonthlyFinanceTick;
  if (typeof origFin === "function") window.runMonthlyFinanceTick = function () {
    const r = origFin.apply(this, arguments);
    try { if (ready()) monthly(); } catch (e) { console.warn("affiliés/mois", e); }
    return r;
  };
  function monthly() {
    const club = me(), sc = ensureScouting(club);
    sc.affiliates.forEach((a) => {
      const t = getClub(a.clubId); if (!t) return;
      if (a.fee) { const m = Math.round(a.fee / 12); club.budget -= m; t.budget += m; }
      // développement des prêtés
      const loaned = club.players.concat(allClubs().flatMap((c) => c.players)).filter((p, i, arr) => p.onLoan && p.onLoan.fromClubId === club.id && p.onLoan.toClubId === t.id && arr.indexOf(p) === i);
      if (!loaned.length) return;
      const lines = [];
      loaned.forEach((p, i) => {
        const slot = i < a.quota;
        let up = 0;
        if (slot && p.age <= 23 && p.overall < p.potential && Math.random() < 0.28) { p.overall = Math.min(p.potential, p.overall + 1); try { p.value = computeValue(p); } catch (e) {} up = 1; }
        const ss = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
        lines.push(`${esc(p.firstName[0] + ". " + p.lastName)} : ${ss.matches} match(s), ${ss.goals} but(s)${slot ? " · temps de jeu garanti" : ""}${up ? " · <b>progression +1</b>" : ""}`);
      });
      mail(`Rapport de ${t.name}`, `<p>Point mensuel de votre ${a.type === "parent" ? "club parent" : "club affilié"} sur vos prêtés :</p><ul>${lines.map((x) => `<li>${x}</li>`).join("")}</ul>`, t.name);
    });
  }
  const origRoll = window.seasonRollover;
  if (typeof origRoll === "function") window.seasonRollover = function () {
    const r = origRoll.apply(this, arguments);
    try {
      if (ready()) {
        const club = me(), sc = ensureScouting(club);
        sc.affiliates.slice().forEach((a) => {
          if (a.until != null && state.season.year >= a.until) {
            const t = getClub(a.clubId);
            sc.affiliates = sc.affiliates.filter((x) => x !== a);
            mail(`Fin du partenariat avec ${t ? t.name : "?"}`, `<p>Le contrat de partenariat est arrivé à terme. Vous pouvez rouvrir la discussion dans l'onglet Scouting.</p>`);
          }
        });
      }
    } catch (e) { console.warn("affiliés/saison", e); }
    return r;
  };
  // droit de priorité : achat à −10 %
  function priorityList() {
    const club = me();
    return list().filter((a) => a.priority === "nous").flatMap((a) => {
      const t = getClub(a.clubId); if (!t) return [];
      return t.players.filter((p) => !p.onLoan && p.age <= 25 && p.overall >= 55).sort((x, y) => y.potential - x.potential).slice(0, 4).map((p) => ({ p, t, price: Math.round(p.value * 0.9 / 1000) * 1000 }));
    });
  }
  function buyPriority(pid) {
    const club = me(), p = getPlayer(pid);
    const row = priorityList().find((x) => x.p.id === pid); if (!row) return { ok: false, reason: "Joueur non concerné par le droit de priorité." };
    if (club.budget < row.price) return { ok: false, reason: "Trésorerie insuffisante." };
    if (typeof currentWindow === "function" && !currentWindow()) return { ok: false, reason: "Le mercato est fermé." };
    transferPlayer(p, row.t.id, club.id, row.price);
    return { ok: true, price: row.price };
  }
  // prêts gratuits du club parent
  function parentLoanList() {
    const club = me(), par = list().find((a) => a.type === "parent"); if (!par) return [];
    const t = getClub(par.clubId); if (!t) return [];
    const used = club.players.filter((p) => p.onLoan && p.onLoan.fromClubId === t.id).length;
    if (used >= par.quota) return [];
    return t.players.filter((p) => !p.onLoan && p.age <= 23 && p.overall >= club.players.slice().sort((a, b) => b.overall - a.overall)[Math.min(10, club.players.length - 1)].overall - 6).sort((a, b) => b.overall - a.overall).slice(0, 5).map((p) => ({ p, t, par }));
  }
  function requestParentLoan(pid) {
    const club = me(), row = parentLoanList().find((x) => x.p.id === pid); if (!row) return { ok: false, reason: "Aucun prêt disponible (quota atteint ou joueur indisponible)." };
    if (typeof currentWindow === "function" && !currentWindow()) return { ok: false, reason: "Le mercato est fermé." };
    loanPlayerOut(row.p, club.id, 52, null);
    return { ok: true };
  }

  // ---------------------------------------------------------------
  // Interface
  // ---------------------------------------------------------------
  let root = null;
  const rootEl = () => { if (!root || !document.body.contains(root)) { root = document.createElement("div"); root.id = "af-root"; document.body.appendChild(root); } return root; };
  const PRI = [["none", "Aucun"], ["nous", "Pour nous : option d'achat prioritaire, −10 %"], ["eux", "Pour eux : ils sont prioritaires sur nos joueurs"]];
  function candidates(type) { const club = me(); return (typeof affiliationCandidates === "function" ? affiliationCandidates(club, type) : []).filter((c) => !checkLimits(club, c, type)).slice(0, 30); }
  function panelHTML() {
    const club = me(), l = list();
    const cur = l.length ? `<table class="squad-table co-tbl"><thead><tr><th>Club</th><th>Lien</th><th>Fin</th><th>Redevance/an</th><th>Quota</th><th>Priorité</th><th></th></tr></thead><tbody>${l.map((a) => { const t = getClub(a.clubId); if (!t) return ""; return `<tr><td>${esc(t.name)}<br><span class="hint">${esc(divisionLabel(t))}</span></td><td>${a.type === "parent" ? "Club parent" : "Club affilié"}</td><td>${a.until != null ? "saison " + a.until : "—"}</td><td>${a.fee ? money(a.fee) : "—"}</td><td>${a.quota != null ? a.quota : "—"}</td><td>${a.priority === "nous" ? "nous" : a.priority === "eux" ? "eux" : "—"}</td><td><button class="btn btn-small" data-af="renew" data-id="${t.id}">Prolonger</button> <button class="btn btn-small btn-ghost" data-af="break" data-id="${t.id}">Rompre</button></td></tr>`; }).join("")}</tbody></table>` : `<p class="hint">Aucun partenariat négocié pour l'instant.</p>`;
    const pri = priorityList(), pl = parentLoanList();
    return `<section class="panel co-panel" id="af-panel"><h3 class="panel-subtitle">🤝 Partenariats : discuter avec un club</h3>
      <p class="hint" style="margin-top:0">Un <b>club affilié senior</b> accueille vos joueurs en prêt (temps de jeu, rapports mensuels, progression). Un <b>club parent</b> est plus grand : il vous prête gratuitement ses jeunes. Chaque contrat fixe une durée, une redevance, un quota de prêts et un éventuel droit de priorité.</p>
      ${cur}
      <div class="co-actions" style="margin-top:8px"><label class="field" style="margin:0"><span>Type</span><select id="af-type"><option value="affilie">Club affilié senior (partenaire)</option><option value="parent">Club parent (plus grand)</option></select></label>
        <label class="field" style="margin:0;min-width:210px"><span>Club</span><select id="af-club"></select></label>
        <button class="btn btn-primary btn-small" data-af="open">💬 Ouvrir la discussion</button></div>
      ${pri.length ? `<h4 class="co-h">Droit de priorité (−10 %)</h4><table class="squad-table co-tbl"><tbody>${pri.map((r) => `<tr><td>${esc(r.p.firstName[0] + ". " + r.p.lastName)}</td><td>${esc(r.t.name)}</td><td>${r.p.age} ans · ${r.p.overall}/${r.p.potential}</td><td>${money(r.price)}</td><td><button class="btn btn-small" data-af="buy" data-id="${r.p.id}">Acheter</button></td></tr>`).join("")}</tbody></table>` : ""}
      ${pl.length ? `<h4 class="co-h">Prêts gratuits proposés par le club parent</h4><table class="squad-table co-tbl"><tbody>${pl.map((r) => `<tr><td>${esc(r.p.firstName[0] + ". " + r.p.lastName)}</td><td>${r.p.position}</td><td>${r.p.age} ans · ${r.p.overall}/${r.p.potential}</td><td><button class="btn btn-small" data-af="loan" data-id="${r.p.id}">Demander en prêt</button></td></tr>`).join("")}</tbody></table>` : ""}
      <p class="hint" id="af-msg"></p></section>`;
  }
  const origScout = window.renderScoutingTab;
  if (typeof origScout === "function") window.renderScoutingTab = function () {
    const html = origScout.apply(this, arguments);
    try { return ready() && me() ? html + panelHTML() : html; } catch (e) { console.error(e); return html; }
  };
  function fillClubs() { const t = document.getElementById("af-type"), c = document.getElementById("af-club"); if (!t || !c) return; c.innerHTML = candidates(t.value).map((x) => `<option value="${x.id}">${esc(x.name)} — ${esc(divisionLabel(x))}</option>`).join("") || `<option value="">Aucun club disponible</option>`; }
  new MutationObserver(() => { const t = document.getElementById("af-type"); if (t && !t.dataset.f) { t.dataset.f = "1"; fillClubs(); } }).observe(document.documentElement, { childList: true, subtree: true });

  let DR = null;
  function modal(clubId, type) {
    const t = getClub(clubId), club = me();
    DR = { clubId, type, years: 3, fee: type === "parent" ? Math.round(unit(t) * 0.3 / 1000) * 1000 : 0, quota: 2, priority: "none", scout: false, share: 0, res: null };
    drawModal();
  }
  function drawModal() {
    const d = DR; if (!d) { rootEl().innerHTML = ""; return; }
    const t = getClub(d.clubId), club = me();
    const r = d.res;
    rootEl().innerHTML = `<div class="modal-backdrop af-back"><div class="modal dossier af-modal"><h3>Discussion avec ${esc(t.name)}</h3>
      <p class="hint">${esc(divisionLabel(t))} · réputation ${t.reputation} (vous : ${club.reputation})</p>
      <label class="field"><span>Type de partenariat</span><select data-afm="type"><option value="affilie" ${d.type === "affilie" ? "selected" : ""}>Club affilié senior</option><option value="parent" ${d.type === "parent" ? "selected" : ""}>Club parent</option></select></label>
      <label class="field"><span>Durée (saisons)</span><select data-afm="years">${[1, 2, 3, 4, 5].map((n) => `<option ${n === d.years ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="field"><span>Redevance annuelle (positive : vous payez ; négative : ils vous paient)</span><input type="number" step="5000" data-afm="fee" value="${d.fee}"></label>
      <label class="field"><span>Quota de prêts garantis</span><select data-afm="quota">${[1, 2, 3, 4, 5, 6].map((n) => `<option ${n === d.quota ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="field"><span>Droit de priorité</span><select data-afm="priority">${PRI.map(([v, l]) => `<option value="${v}" ${v === d.priority ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="field"><span>Part des salaires des prêtés payée par vous</span><select data-afm="share">${[0, 25, 50].map((n) => `<option value="${n}" ${n === d.share ? "selected" : ""}>${n} %</option>`).join("")}</select></label>
      <label class="field"><span><input type="checkbox" data-afm="scout" ${d.scout ? "checked" : ""} style="width:auto"> Partage du scouting (visibilité renforcée sur son pays)</span></label>
      ${r ? `<div class="af-res ${r.result === "refuse" ? "bad" : r.result === "accept" ? "ok" : "mid"}">${r.result === "accept" ? "✅ " + esc(t.name) + " accepte ces conditions." : r.result === "counter" ? `🤔 Contre-proposition : redevance de <b>${money(r.counter.fee)}</b> par an.` : r.reason ? "❌ " + esc(r.reason) : "❌ " + esc(t.name) + " décline la proposition."}<br><span class="hint">Intérêt du club : ${r.ev ? r.ev.score : "—"}/100</span></div>` : ""}
      <div class="creation-footer" style="display:flex;gap:8px;flex-wrap:wrap">
        ${r && r.result === "accept" ? `<button class="btn btn-primary" data-af="sign">Signer le partenariat</button>` : r && r.result === "counter" ? `<button class="btn btn-primary" data-af="acceptcounter">Accepter la contre-offre</button>` : `<button class="btn btn-primary" data-af="propose">Proposer ces conditions</button>`}
        <button class="btn btn-ghost" data-af="close">Fermer</button></div></div></div>`;
  }
  document.addEventListener("change", (e) => {
    const m = e.target.closest && e.target.closest("[data-afm]"); if (m && DR) {
      const k = m.dataset.afm, v = m.type === "checkbox" ? m.checked : m.value;
      DR[k] = (k === "years" || k === "quota" || k === "share" || k === "fee") ? parseFloat(v) || 0 : v; DR.res = null;
      if (k === "type") { const t = getClub(DR.clubId); const ok = !checkLimits(me(), t, DR.type); if (!ok) DR.res = { result: "refuse", reason: checkLimits(me(), t, DR.type) }; }
      drawModal(); return;
    }
    if (e.target && e.target.id === "af-type") fillClubs();
  });
  // l'ancien bouton « Proposer un partenariat » ouvre désormais la discussion
  document.addEventListener("click", (e) => {
    if (!ready()) return;
    const old = e.target.closest && e.target.closest("#aff-propose");
    if (old) { e.stopImmediatePropagation(); e.preventDefault(); const c = parseInt((document.getElementById("aff-club") || {}).value, 10), ty = (document.getElementById("aff-type") || {}).value || "affilie"; if (c) modal(c, ty); return; }
    const b = e.target.closest && e.target.closest("[data-af]"); if (!b) return;
    const a = b.dataset.af, msg = (t, bad) => { const m = document.getElementById("af-msg"); if (m) { m.textContent = t; m.className = "hint " + (bad ? "result-bad" : "result-good"); } if (window.dsToast) dsToast(t); };
    const refresh = () => { try { saveGame(); } catch (x) {} render(); };
    if (a === "open") { const c = parseInt(document.getElementById("af-club").value, 10); if (c) modal(c, document.getElementById("af-type").value); else msg("Aucun club disponible.", true); }
    else if (a === "close") { DR = null; drawModal(); }
    else if (a === "propose") { DR.res = propose(DR); if (DR.res.ok === false) DR.res = { result: "refuse", reason: DR.res.reason }; drawModal(); }
    else if (a === "acceptcounter") { Object.assign(DR, DR.res.counter); const r = sign(DR); DR = null; drawModal(); refresh(); if (!r.ok) msg(r.reason, true); }
    else if (a === "sign") { const r = sign(DR); DR = null; drawModal(); refresh(); if (!r.ok) msg(r.reason, true); }
    else if (a === "renew") { const r = renew(parseInt(b.dataset.id, 10), 2); refresh(); msg(r.ok ? "Partenariat prolongé de 2 saisons" : r.reason, !r.ok); }
    else if (a === "break") { if (confirm("Rompre le partenariat ? Une indemnité sera due.")) { end(parseInt(b.dataset.id, 10), "break"); refresh(); } }
    else if (a === "buy") { const r = buyPriority(parseInt(b.dataset.id, 10)); refresh(); msg(r.ok ? "Joueur acheté à " + money(r.price) : r.reason, !r.ok); }
    else if (a === "loan") { const r = requestParentLoan(parseInt(b.dataset.id, 10)); refresh(); msg(r.ok ? "Prêt accordé par le club parent" : r.reason, !r.ok); }
  }, true);

  window.dsAffil = { evaluate, propose, sign, end, renew, checkLimits, monthly, priorityList, buyPriority, parentLoanList, requestParentLoan, modal, S };
})();
