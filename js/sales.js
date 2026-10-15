// =====================================================================
// VENTES RÉALISTES + BILAN DE MERCATO (bloc 16)
//  - Prix demandé par joueur : l'intérêt des clubs dépend de l'écart avec la valeur
//  - Offres avec montage (paiement échelonné, joueur en échange) et négociation en plusieurs tours
//  - Clause de revente exigée par vous, enchères entre plusieurs clubs
//  - Bilan à la clôture de chaque fenêtre : arrivées, départs, argent, pistes perdues, note
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (n) => fmtMoney(Math.round(n));
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const toast = (m) => { try { window.dsToast && window.dsToast(m); } catch (e) {} };
  const hap = (k) => { try { window.dsHaptic && window.dsHaptic(k); } catch (e) {} };
  const day = () => state.dayCounter || 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const nm = (p) => p.firstName[0] + ". " + p.lastName;
  const S = () => (state.sales = state.sales || { asks: {}, auctions: {}, hist: [] });
  const MXs = () => (state.mx = state.mx || { inst: [], alerted: {}, dd: null, regInit: false });
  const userId = () => state.userClubId;
  const ask = (p) => S().asks[p.id] || Math.round(p.value * 1.1 / 10000) * 10000;

  // ---------------------------------------------------------------
  // OFFRES ENTRANTES : intérêt fonction du prix demandé, montages variés
  // ---------------------------------------------------------------
  function describeTerms(o) {
    const t = o.terms; if (!t) return "";
    const parts = [];
    const ex = t.exchangePid ? getPlayer(t.exchangePid) : null;
    if (ex) parts.push(`échange avec ${esc(nm(ex))} (${ex.overall}, ${money(ex.value)})`);
    if (t.up < 1) parts.push(`${Math.round(t.up * 100)} % comptant, solde sur ${t.yrs} an(s)`);
    if (t.sellOn) parts.push(`clause de revente ${t.sellOn} % pour vous`);
    return parts.join(" · ");
  }
  function makeOffer(p, buyer, W) {
    const a = ask(p);
    let amount = Math.round(W * rnd(0.82, 0.97) / 1000) * 1000;
    if (W >= a && Math.random() < 0.55) amount = a;
    let terms = null;
    const r = Math.random();
    if (r < 0.3) { terms = { up: 0.6, yrs: 2 }; amount = Math.round(amount * 1.06 / 1000) * 1000; }
    else if (r < 0.45) {
      const q = buyer.players.filter((x) => x.position !== "GB" && x.value > amount * 0.12 && x.value < amount * 0.5).sort((x, y) => y.overall - x.overall)[0];
      if (q) terms = { up: 1, yrs: 1, exchangePid: q.id };
    }
    if (buyer.budget < amount * (terms && terms.up < 1 ? terms.up : 1)) return null;
    return { id: nextId(), type: "offer_incoming", playerId: p.id, fromClubId: buyer.id, amount, date: fmtDate(state.date), resolved: false, w: W, terms };
  }
  const origGen = window.generateIncomingOffersForUser;
  window.generateIncomingOffersForUser = function () {
    if (!currentWindow()) return;
    const club = userClub(); if (!club) return;
    const others = allClubs().filter((c) => c.id !== club.id);
    club.players.filter((p) => p.listed && !S().auctions[p.id] && !p.onLoan).forEach((p) => {
      const r = ask(p) / Math.max(1, p.value);
      const f = Math.max(0.1, Math.min(1.3, 2.2 - 1.3 * r));
      if (Math.random() > 0.24 * f) return;
      const pending = new Set(state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved && o.playerId === p.id).map((o) => o.fromClubId));
      const cands = others.filter((c) => !pending.has(c.id) && c.budget >= p.value * 0.7);
      if (!cands.length) return;
      const buyer = cands[Math.floor(Math.random() * cands.length)];
      const W = p.value * rnd(0.88, 1.2);
      if (W < ask(p) * 0.72) return;
      const o = makeOffer(p, buyer, W);
      if (o) state.inbox.unshift(o);
    });
  };

  // résolution des offres avec montage
  const origResolve = window.resolveIncomingOffer;
  window.resolveIncomingOffer = function (offerId, accept) {
    const o = state.inbox.find((x) => x.id === offerId);
    if (!accept || !o || o.resolved || !o.terms) return origResolve.apply(this, arguments);
    o.resolved = true; o.accepted = true;
    applySale(o);
  };
  function applySale(o) {
    const p = getPlayer(o.playerId), buyer = getClub(o.fromClubId), club = userClub();
    if (!p || !buyer) return;
    const t = o.terms || { up: 1, yrs: 1 };
    const ex = t.exchangePid ? getPlayer(t.exchangePid) : null;
    const exOk = ex && ex.clubId === buyer.id;
    const credit = exOk ? Math.min(ex.value, o.amount) : 0;
    const cash = Math.max(0, o.amount - credit);
    const upfront = Math.round(cash * t.up / 1000) * 1000, rest = cash - upfront;
    window.__slTotal = cash;
    window.transferPlayer(p, club.id, buyer.id, upfront, t.sellOn ? { newSellOnPct: t.sellOn } : undefined);
    window.__slTotal = null;
    const lines = [];
    if (rest > 0) {
      for (let k = 1; k <= t.yrs; k++) MXs().inst.push({ id: nextId(), pid: p.id, name: nm(p), from: buyer.id, to: club.id, amount: Math.round(rest / t.yrs / 1000) * 1000, due: day() + 365 * k });
      lines.push(`${buyer.name} vous verse ${money(upfront)} maintenant et ${money(rest)} en ${t.yrs} échéance(s).`);
    }
    if (exOk) { window.transferPlayer(ex, buyer.id, club.id, 0); lines.push(`${nm(ex)} rejoint votre effectif dans l'échange.`); }
    if (t.sellOn) lines.push(`Vous conservez ${t.sellOn} % de la prochaine vente.`);
    S().hist.unshift({ date: fmtDate(state.date), name: nm(p), to: buyer.name, total: cash, credit, terms: describeTerms(o) });
    if (S().hist.length > 30) S().hist.length = 30;
    if (lines.length) { mail("Transferts", "Direction sportive", `Vente de ${p.lastName} : montage`, `<p>${lines.map(esc).join("</p><p>")}</p>`); note(lines.join(" ")); }
    delete S().asks[p.id];
  }

  // ---------------------------------------------------------------
  // NÉGOCIATION DE VENTE (contre-propositions, plusieurs tours)
  // ---------------------------------------------------------------
  function buyerCost(o, T, c) {
    const p = getPlayer(o.playerId);
    const ex = c.ex && o.terms && o.terms.exchangePid ? getPlayer(o.terms.exchangePid) : null;
    const credit = ex ? Math.min(ex.value, T) : 0;
    const cash = Math.max(0, T - credit), up = cash * c.up, rest = cash - up;
    let cost = up + credit * 0.9;
    for (let k = 1; k <= c.yrs; k++) cost += (rest / c.yrs) * Math.pow(0.96, k);
    cost += (c.sell / 100) * p.value * 0.5;
    const W = o.w || o.amount * 1.1;
    return { cost, W, ok: cost <= W, credit, cash };
  }
  const NEG = { oid: null, round: 0, log: [], counter: null };
  function root() { let r = document.getElementById("sl-root"); if (!r) { r = document.createElement("div"); r.id = "sl-root"; document.body.appendChild(r); } return r; }
  function closeNeg() { root().innerHTML = ""; try { render(); } catch (e) {} }
  function openNeg(oid, msg) {
    const o = state.inbox.find((x) => x.id === oid); if (!o || o.resolved) return closeNeg();
    if (NEG.oid !== oid) { NEG.oid = oid; NEG.round = 0; NEG.log = []; NEG.counter = null; }
    const p = getPlayer(o.playerId), b = getClub(o.fromClubId); if (!p || !b) return closeNeg();
    const ex = o.terms && o.terms.exchangePid ? getPlayer(o.terms.exchangePid) : null;
    const T0 = NEG.counter ? NEG.counter.T : Math.max(o.amount, ask(p));
    root().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">
      <h3>💬 Vente de ${esc(p.firstName + " " + p.lastName)} — ${esc(b.name)}</h3>
      <p class="hint">Offre actuelle : <b>${money(o.amount)}</b>${o.terms ? " — " + describeTerms(o) : ""} · prix demandé ${money(ask(p))} · valeur ${money(p.value)}. Tour ${Math.min(NEG.round + 1, 3)} / 3.</p>
      ${NEG.log.length ? `<div class="log-list">${NEG.log.map((l) => `<div class="log-row">${l}</div>`).join("")}</div>` : ""}
      ${msg ? `<p class="${msg.bad ? "result-bad" : "result-mid"}">${msg.text}</p>` : ""}
      <label class="field"><span>Votre prix</span><input type="number" id="sl-T" value="${T0}" step="10000" /></label>
      <div class="nx-grid">
        <label>Comptant <select id="sl-up"><option value="1">100 %</option><option value="0.7">70 %</option><option value="0.5">50 %</option><option value="0.3">30 %</option></select></label>
        <label>Solde sur <select id="sl-yrs"><option value="1">1 an</option><option value="2">2 ans</option><option value="3">3 ans</option></select></label>
        <label>Clause de revente pour vous <select id="sl-sell"><option value="0">Aucune</option><option value="10">10 %</option><option value="15">15 %</option><option value="20">20 %</option></select></label>
      </div>
      ${ex ? `<label class="nx-chk"><input type="checkbox" id="sl-ex" checked /> Accepter l'échange avec ${esc(nm(ex))} (${ex.position}, ${ex.overall}, ${money(ex.value)})</label>` : ""}
      <div class="creation-footer"><button class="btn btn-ghost" data-sl="ndecl">Décliner</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${NEG.counter ? `<button class="btn btn-ghost" data-sl="nacc">Accepter ${money(NEG.counter.T)}</button>` : `<button class="btn btn-ghost" data-sl="nasis">Accepter l'offre actuelle</button>`}
        <button class="btn btn-primary" data-sl="nsend">Contre-proposer</button></div></div>
    </div></div>`;
    if (NEG.counter) {
      const c = NEG.counter.c;
      document.getElementById("sl-up").value = String(c.up); document.getElementById("sl-yrs").value = String(c.yrs); document.getElementById("sl-sell").value = String(c.sell);
    }
  }
  function readNeg() {
    return { T: parseInt(document.getElementById("sl-T").value, 10) || 0, up: parseFloat(document.getElementById("sl-up").value), yrs: parseInt(document.getElementById("sl-yrs").value, 10), sell: parseInt(document.getElementById("sl-sell").value, 10), ex: !!(document.getElementById("sl-ex") && document.getElementById("sl-ex").checked) };
  }
  function sendCounter() {
    const o = state.inbox.find((x) => x.id === NEG.oid); if (!o) return closeNeg();
    const c = readNeg(), p = getPlayer(o.playerId), b = getClub(o.fromClubId);
    const ev = buyerCost(o, c.T, c);
    NEG.round++;
    const desc = `Vous : ${money(c.T)}${c.up < 1 ? `, ${Math.round(c.up * 100)} % comptant` : ""}${c.sell ? `, revente ${c.sell} %` : ""}`;
    if (ev.ok) {
      NEG.log.push(`${desc} — <b>accepté</b> par ${esc(b.name)}.`);
      finalize(o, c); return;
    }
    if (NEG.round >= 3 || ev.cost / ev.W > 1.3) {
      NEG.log.push(`${desc} — ${esc(b.name)} se retire de la négociation.`);
      o.resolved = true; o.accepted = false; NEG.oid = null;
      mail("Transferts", b.name, `${b.name} retire son offre pour ${p.lastName}`, `<p>Les discussions n'ont pas abouti (vos exigences dépassaient ce que le club est prêt à payer).</p>`);
      hap("bad"); closeNeg(); return;
    }
    let T2 = Math.round(c.T * (ev.W * 0.96 / ev.cost) / 10000) * 10000;
    T2 = Math.max(T2, o.amount);
    const probe = buyerCost(o, T2, c);
    if (!probe.ok) {
      NEG.log.push(`${desc} — refusé : ${esc(b.name)} ne peut pas accepter ces conditions.`);
      openNeg(o.id, { text: `${esc(b.name)} refuse ces conditions (échéances, clause ou échange). Allégez-les ou acceptez l'offre actuelle.` }); return;
    }
    NEG.log.push(`${desc} — contre-proposition de ${esc(b.name)} : <b>${money(T2)}</b> aux mêmes conditions.`);
    NEG.counter = { T: T2, c };
    openNeg(o.id, { text: `${esc(b.name)} propose ${money(T2)}. Vous pouvez accepter ou insister.` });
  }
  function finalize(o, c) {
    const ex = o.terms && o.terms.exchangePid;
    o.amount = c.T;
    o.terms = { up: c.up, yrs: c.yrs, sell: 0, sellOn: c.sell || 0, exchangePid: c.ex ? ex : null };
    o.resolved = false; NEG.oid = null; NEG.counter = null;
    window.resolveIncomingOffer(o.id, true);
    hap("good"); toast("Vente conclue"); try { saveGame(); } catch (e) {}
    root().innerHTML = ""; try { render(); } catch (e) {}
  }

  // ---------------------------------------------------------------
  // ENCHÈRES
  // ---------------------------------------------------------------
  function startAuction(pid) {
    const p = getPlayer(pid), club = userClub();
    if (!p || p.clubId !== club.id || !currentWindow() || S().auctions[pid]) return { ok: false, reason: "Enchères impossibles (mercato fermé ou déjà lancées)." };
    p.listed = true;
    const pool = allClubs().filter((c) => c.id !== club.id && c.budget >= p.value * 0.85).sort(() => Math.random() - 0.5).slice(0, 5);
    if (pool.length < 2) return { ok: false, reason: "Pas assez de clubs intéressés pour organiser des enchères." };
    const A = { start: day(), end: day() + 3, top: null, bidders: pool.map((c) => ({ id: c.id, w: p.value * rnd(0.92, 1.35) * (0.9 + c.reputation / 500) })), log: [] };
    A.bidders.forEach((b) => { const amt = Math.round(p.value * rnd(0.85, 0.95) / 1000) * 1000; if (amt <= b.w && (!A.top || amt > A.top.amount)) A.top = { clubId: b.id, amount: amt }; });
    A.log.push(`Ouverture : ${pool.length} clubs invités. Meilleure offre : ${A.top ? money(A.top.amount) + " (" + getClub(A.top.clubId).name + ")" : "aucune"}.`);
    S().auctions[pid] = A;
    mail("Transferts", "Direction sportive", `🔨 Enchères lancées pour ${p.lastName}`, `<p>${esc(A.log[0])} Les clubs surenchérissent pendant 3 jours.</p>`);
    return { ok: true };
  }
  function tickAuctions() {
    const A = S().auctions;
    Object.keys(A).forEach((k) => {
      const pid = parseInt(k, 10), a = A[k], p = getPlayer(pid);
      if (!p || p.clubId !== userId() || !currentWindow()) { delete A[k]; return; }
      let moved = false;
      a.bidders.forEach((b) => {
        if (a.top && a.top.clubId === b.id) return;
        const cur = a.top ? a.top.amount : 0;
        if (cur < b.w * 0.97 && Math.random() < 0.65) {
          const amt = Math.round(Math.max(cur * rnd(1.02, 1.07), cur + 10000) / 1000) * 1000;
          if (amt <= b.w) { a.top = { clubId: b.id, amount: amt }; moved = true; a.log.push(`${getClub(b.id).name} surenchérit : ${money(amt)}.`); }
        }
      });
      if (moved && a.top) mail("Transferts", "Direction sportive", `🔨 ${p.lastName} : ${money(a.top.amount)}`, `<p>${esc(getClub(a.top.clubId).name)} prend la tête des enchères avec ${money(a.top.amount)}.</p>`);
      if (day() >= a.end) closeAuction(pid);
    });
  }
  function closeAuction(pid) {
    const a = S().auctions[pid], p = getPlayer(pid); delete S().auctions[pid];
    if (!a || !p) return;
    if (!a.top) { mail("Transferts", "Direction sportive", `Enchères sans offre : ${p.lastName}`, `<p>Aucun club n'a enchéri.</p>`); return; }
    const b = getClub(a.top.clubId), w = (a.bidders.find((x) => x.id === a.top.clubId) || {}).w || a.top.amount * 1.05;
    state.inbox.unshift({ id: nextId(), type: "offer_incoming", playerId: pid, fromClubId: b.id, amount: a.top.amount, date: fmtDate(state.date), resolved: false, w, terms: null, auction: true });
    mail("Transferts", "Direction sportive", `🔨 Enchères closes : ${p.lastName}`, `<p>Meilleure offre : ${esc(b.name)}, ${money(a.top.amount)}. Elle vous attend dans la boîte de réception (Radar ▸ Ventes).</p>`);
    hap("good");
  }

  // ---------------------------------------------------------------
  // BILAN DE MERCATO
  // ---------------------------------------------------------------
  const M = () => MXs();
  function startWin() {
    const w = (typeof currentWindow === "function" && currentWindow()) || {};
    M().win = { name: w.name || "Mercato", from: fmtDate(state.date), arr: [], dep: [], lost: [], spent: 0, earned: 0 };
  }
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee, opts) {
    const nx = window.__nxPending;
    const nxTotal = nx && nx.accepted && nx.pid === player.id && isUserClub(toId) ? nx.c.cash : null;
    const sl = window.__slTotal;
    const shortlisted = (() => { try { const c = userClub(); return ((c.scouting || {}).shortlist || []).includes(player.id); } catch (e) { return false; } })();
    const val = player.value, name = nm(player), fromName = (getClub(fromId) || {}).name, toName = (getClub(toId) || {}).name;
    const r = origTransfer.apply(this, arguments);
    try {
      const w = M().win; if (!w) return r;
      const mineIn = isUserClub(toId) && !isUserClub(fromId), mineOut = isUserClub(fromId) && !isUserClub(toId);
      if (mineIn) { const tot = nxTotal != null ? nxTotal : fee; w.arr.push({ pid: player.id, name, fee: tot, value: val, from: fromName, ovr: player.overall }); w.spent += tot; }
      else if (mineOut) { const tot = sl != null ? sl : fee; w.dep.push({ pid: player.id, name, fee: tot, value: val, to: toName }); w.earned += tot; }
      else if (shortlisted && !isUserClub(toId) && !w.lost.some((x) => x.pid === player.id)) w.lost.push({ pid: player.id, name, to: toName, fee });
    } catch (e) { console.warn("bilan", e); }
    return r;
  };
  function grade(w) {
    const club = userClub();
    const top = club.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 16);
    const avg = top.reduce((s, p) => s + p.overall, 0) / Math.max(1, top.length);
    let score = 50; const why = [];
    w.arr.forEach((a) => { const d = Math.max(-10, Math.min(10, (a.ovr - avg) * 0.8)); score += d; });
    if (w.arr.length) why.push(`Niveau des arrivées : ${(w.arr.reduce((s, a) => s + a.ovr, 0) / w.arr.length).toFixed(1)} en moyenne (effectif : ${avg.toFixed(1)}).`);
    const sales = w.dep.filter((d) => d.value > 0);
    if (sales.length) { const r = sales.reduce((s, d) => s + d.fee / d.value, 0) / sales.length; score += Math.max(-15, Math.min(15, (r - 1) * 40)); why.push(`Ventes à ${Math.round(r * 100)} % de la valeur estimée en moyenne.`); }
    const net = w.spent - w.earned, bud = Math.max(1, getTransferBudget(club) + w.spent);
    if (net <= 0) { score += 5; why.push("Bilan financier positif."); } else if (net > bud * 0.5) { score -= 10; why.push(`Dépenses nettes élevées (${money(net)}).`); }
    if (w.lost.length) { score -= Math.min(9, w.lost.length * 3); why.push(`${w.lost.length} piste(s) perdue(s) face à des rivaux.`); }
    const unreg = club.players.filter((p) => p.unreg).length;
    if (unreg) { score -= Math.min(12, unreg * 4); why.push(`${unreg} joueur(s) non inscrit(s) (règles d'effectif).`); }
    if (!w.arr.length && !w.dep.length) { score = 45; why.push("Aucun mouvement : fenêtre blanche."); }
    score = Math.max(5, Math.min(98, Math.round(score)));
    return { score, letter: score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E", why };
  }
  function summaryHTML(s) {
    const li = (arr, f) => arr.length ? `<ul>${arr.map(f).join("")}</ul>` : `<p class="hint">Aucun.</p>`;
    return `<div class="sl-grade g${s.g.letter}"><b>${esc(s.g.letter)}</b><span>${s.g.score} / 100</span></div>
      <p class="hint">${esc(s.name)} — du ${esc(s.from)} au ${esc(s.to)}. Dépensé : <b>${money(s.spent)}</b> · encaissé : <b>${money(s.earned)}</b> · solde : <b>${money(s.earned - s.spent)}</b></p>
      <h4>Arrivées (${s.arr.length})</h4>${li(s.arr, (a) => `<li>${esc(a.name)} (${a.ovr}) ← ${esc(a.from)} · ${money(a.fee)}</li>`)}
      <h4>Départs (${s.dep.length})</h4>${li(s.dep, (d) => `<li>${esc(d.name)} → ${esc(d.to)} · ${money(d.fee)} <span class="hint">(valeur ${money(d.value)})</span></li>`)}
      <h4>Pistes perdues (${s.lost.length})</h4>${li(s.lost, (l) => `<li>${esc(l.name)} → ${esc(l.to)}</li>`)}
      <h4>Pourquoi cette note</h4><ul>${s.g.why.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }
  function closeWin() {
    const w = M().win; M().win = null; if (!w) return;
    const s = Object.assign({}, w, { to: fmtDate(state.date), g: grade(w) });
    M().summaries = [s].concat(M().summaries || []).slice(0, 6);
    M().summaryPending = true;
    mail("Transferts", "Direction sportive", `📊 Bilan du ${w.name} : note ${s.g.letter}`, summaryHTML(s));
    note(`Bilan du ${w.name} : note ${s.g.letter} (${s.g.score}/100).`);
  }
  function showSummary() {
    const s = (M().summaries || [])[0]; if (!s) return;
    root().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal"><h3>📊 Bilan — ${esc(s.name)}</h3>${summaryHTML(s)}
      <div class="creation-footer"><button class="btn btn-primary" data-sl="sclose">Fermer</button></div></div></div>`;
    M().summaryPending = false; hap("tap");
  }
  window.dsBilanHTML = function () {
    const w = M().win, list = M().summaries || [];
    let live = "";
    if (w) { const live2 = Object.assign({}, w, { to: "aujourd'hui", g: grade(w) }); live = `<h3 class="panel-subtitle">En cours</h3>${summaryHTML(live2)}`; }
    else live = `<p class="hint">Aucun mercato en cours. Le bilan s'affiche à la clôture de chaque fenêtre.</p>`;
    const old = list.slice(w ? 0 : 1).map((s) => `<details class="mk-fold"><summary>${esc(s.name)} — note ${esc(s.g.letter)} (${s.g.score}/100)</summary><div class="mk-fold-body">${summaryHTML(s)}</div></details>`).join("");
    const first = !w && list[0] ? `<h3 class="panel-subtitle">Dernier bilan</h3>${summaryHTML(list[0])}` : "";
    return live + first + (old ? `<h3 class="panel-subtitle">Bilans précédents</h3>${old}` : "");
  };

  // ---------------------------------------------------------------
  // ÉCRAN « VENTES » (onglet Radar)
  // ---------------------------------------------------------------
  window.dsSalesHTML = function () {
    const club = userClub(), A = S().auctions;
    const listed = club.players.filter((p) => p.listed);
    const offers = state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved);
    const open = !!currentWindow();
    const cards = listed.map((p) => {
      const a = A[p.id], offs = offers.filter((o) => o.playerId === p.id);
      return `<div class="sl-card"><div class="sl-head"><b>${esc(nm(p))}</b> <span class="hint">${p.position} · ${p.age} ans · niv. ${p.overall} · valeur ${money(p.value)}</span></div>
        <div class="sl-row"><label>Prix demandé <input type="number" id="sl-ask-${p.id}" value="${ask(p)}" step="10000" /></label>
          <button class="btn btn-small btn-ghost" data-sl="ask:${p.id}">Mettre à jour</button></div>
        <p class="hint">${offs.length} offre(s) en attente${ask(p) > p.value * 1.4 ? " — prix très élevé : peu de clubs se manifesteront" : ""}</p>
        ${a ? `<div class="sl-auction">🔨 Enchères en cours (jusqu'au jour ${a.end - day() > 0 ? "J+" + (a.end - day()) : "J"}) — meilleure offre : <b>${a.top ? money(a.top.amount) + " · " + esc(getClub(a.top.clubId).name) : "aucune"}</b><ul>${a.log.slice(-4).map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>` : ""}
        <div class="sl-row"><button class="btn btn-small btn-ghost" data-sl="unlist:${p.id}">Retirer de la vente</button>
          ${a ? `<button class="btn btn-small btn-primary" data-sl="aclose:${p.id}">Conclure maintenant</button>` : `<button class="btn btn-small btn-primary" data-sl="auct:${p.id}" ${open ? "" : "disabled"}>🔨 Lancer les enchères</button>`}</div></div>`;
    }).join("");
    const cand = club.players.filter((p) => !p.listed && !p.onLoan).sort((a, b) => b.value - a.value).slice(0, 30);
    const offRows = offers.map((o) => {
      const p = getPlayer(o.playerId), b = getClub(o.fromClubId); if (!p || !b) return "";
      return `<div class="sl-card"><div class="sl-head"><b>${esc(nm(p))}</b> ← ${esc(b.name)}${o.auction ? " 🔨" : ""}</div><p>${money(o.amount)} <span class="hint">(valeur ${money(p.value)})</span>${o.terms ? `<br><span class="hint">${describeTerms(o)}</span>` : ""}</p>
        <div class="sl-row"><button class="btn btn-small btn-primary" data-sl="acc:${o.id}">Accepter</button><button class="btn btn-small btn-ghost" data-sl="neg:${o.id}">💬 Négocier</button><button class="btn btn-small btn-ghost" data-sl="rej:${o.id}">Refuser</button></div></div>`;
    }).join("");
    const hist = S().hist.slice(0, 6).map((h) => `<li>${esc(h.name)} → ${esc(h.to)} · ${money(h.total)}${h.terms ? ` <span class="hint">(${h.terms})</span>` : ""} <span class="hint">${esc(h.date)}</span></li>`).join("");
    return `<p class="hint">Fixez un <b>prix demandé</b> : plus il s'éloigne de la valeur du joueur, moins les clubs se manifestent. Les offres peuvent inclure un paiement échelonné ou un joueur en échange ; vous pouvez contre-proposer (prix, comptant, clause de revente) ou lancer des <b>enchères</b> entre plusieurs clubs.</p>
      <h3 class="panel-subtitle">Joueurs à vendre (${listed.length})</h3>${cards || `<p class="hint">Aucun joueur sur le marché.</p>`}
      <div class="sl-card"><div class="sl-head"><b>Mettre un joueur en vente</b></div><div class="sl-row">
        <select id="sl-pick">${cand.map((p) => `<option value="${p.id}">${esc(nm(p))} · ${p.position} · ${p.overall} · ${money(p.value)}</option>`).join("")}</select>
        <button class="btn btn-small btn-primary" data-sl="add">Mettre en vente</button></div></div>
      <h3 class="panel-subtitle">Offres reçues (${offers.length})</h3>${offRows || `<p class="hint">Aucune offre en attente.</p>`}
      <h3 class="panel-subtitle">Dernières ventes</h3>${hist ? `<ul>${hist}</ul>` : `<p class="hint">Aucune vente encore.</p>`}`;
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-sl]"); if (!b || b.disabled) return;
    if (typeof state === "undefined" || !state) return;
    const [k, a] = b.getAttribute("data-sl").split(":"); const id = parseInt(a, 10);
    const refresh = () => { const c = document.getElementById("tab-content"); if (c && ui.tab === "radar") c.innerHTML = renderRadar(); };
    if (k === "add") { const p = getPlayer(parseInt(document.getElementById("sl-pick").value, 10)); if (p) { p.listed = true; S().asks[p.id] = Math.round(p.value * 1.1 / 10000) * 10000; } refresh(); }
    else if (k === "unlist") { const p = getPlayer(id); if (p) { p.listed = false; delete S().asks[id]; delete S().auctions[id]; } refresh(); }
    else if (k === "ask") { const v = parseInt(document.getElementById("sl-ask-" + id).value, 10); if (v > 0) S().asks[id] = v; toast("Prix demandé mis à jour"); refresh(); }
    else if (k === "auct") { const r = startAuction(id); if (!r.ok) toast(r.reason); refresh(); }
    else if (k === "aclose") { closeAuction(id); refresh(); }
    else if (k === "acc") { window.resolveIncomingOffer(id, true); try { saveGame(); } catch (x) {} refresh(); }
    else if (k === "rej") { window.resolveIncomingOffer(id, false); try { saveGame(); } catch (x) {} refresh(); }
    else if (k === "neg") { openNeg(id); }
    else if (k === "nsend") sendCounter();
    else if (k === "nasis") { const o = state.inbox.find((x) => x.id === NEG.oid); NEG.oid = null; NEG.counter = null; root().innerHTML = ""; if (o) { window.resolveIncomingOffer(o.id, true); try { saveGame(); } catch (x) {} } try { render(); } catch (x) {} }
    else if (k === "nacc") { const o = state.inbox.find((x) => x.id === NEG.oid); if (o && NEG.counter) finalize(o, Object.assign({ T: NEG.counter.T }, NEG.counter.c)); }
    else if (k === "ndecl") { const o = state.inbox.find((x) => x.id === NEG.oid); NEG.oid = null; NEG.counter = null; if (o) window.resolveIncomingOffer(o.id, false); closeNeg(); }
    else if (k === "sclose") closeNeg();
  });

  // boutons « Négocier » et description du montage dans les cartes d'offres existantes (boîte de réception, Marché)
  let busy = false;
  new MutationObserver(() => {
    if (busy) return; busy = true;
    try {
      document.querySelectorAll("[data-accept]").forEach((btn) => {
        const box = btn.closest(".offer-actions") || btn.parentNode;
        if (!box || box.dataset.slx) return; box.dataset.slx = "1";
        const id = parseInt(btn.getAttribute("data-accept"), 10);
        const o = state.inbox.find((x) => x.id === id); if (!o) return;
        if (box.parentNode && o.terms) box.insertAdjacentHTML("beforebegin", `<div class="hint sl-terms">${describeTerms(o)}</div>`);
        box.insertAdjacentHTML("afterbegin", `<button class="btn btn-small btn-ghost" data-sl="neg:${id}">💬 Négocier</button> `);
      });
    } catch (e) {}
    busy = false;
  }).observe(document.body, { childList: true, subtree: true });

  // ---------------------------------------------------------------
  // INTÉGRATION
  // ---------------------------------------------------------------
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      if (!userClub()) return r;
      const open = !!currentWindow();
      if (open && !M().win) startWin();
      if (!open && M().win) closeWin();
      tickAuctions();
    } catch (e) { console.warn("sales/jour", e); }
    return r;
  };
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (ui.screen === "dashboard" && state && state.mx && state.mx.summaryPending && !document.querySelector(".modal-backdrop")) showSummary();
    } catch (e) {}
    return r;
  };
  window.dsSales = { ask, makeOffer, startAuction, tickAuctions, closeAuction, buyerCost, applySale, grade, closeWin, startWin, S };
})();
