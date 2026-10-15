// =====================================================================
// MERCATO AVANCÉ — 4 améliorations
//  1. Négociation avancée : paiement échelonné, échange de joueurs, clause de revente, option de rachat
//  2. Radar des opportunités : fins de contrat, clauses libératoires atteignables, clubs en difficulté + alertes
//  3. Règles d'effectif : liste de 25, joueurs formés localement, quota hors-UE, fenêtres d'inscription
//  4. Dernier jour du mercato : salle des marchés avec horloge, offres de dernière minute, dossiers qui échouent
// Tout se greffe sur les fonctions existantes (pas de réécriture du moteur).
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const toast = (m) => { try { window.dsToast && window.dsToast(m); } catch (e) {} };
  const day = () => state.dayCounter || 0;
  const anyModal = () => !!document.querySelector(".modal-backdrop");
  const MX = () => (typeof state === "undefined" || !state) ? { inst: [], alerted: {}, dd: null, regInit: true } : (state.mx = state.mx || { inst: [], alerted: {}, dd: null, regInit: false });
  const money = (n) => fmtMoney(Math.round(n));

  // ===================================================================
  // 3. RÈGLES D'EFFECTIF
  // ===================================================================
  const NON_EU = new Set(["Angleterre", "Irlande du Nord", "Suisse", "Turquie", "Norvège", "Islande", "Chine", "Corée du Sud", "Australie", "USA", "Mexique", "Argentine", "Brésil", "Japon", "Moldavie"]);
  const CAP_NONEU = { espagne: 3, italie: 3, portugal: 5, france: 5 };
  const capNonEU = (club) => CAP_NONEU[club.countryKey] || 6;
  const LIST_MAX = 25, NONHG_MAX = 17;

  function countryKeyOfLabel(label) {
    for (const k in COUNTRIES) if (COUNTRIES[k].label === label) return k;
    return null;
  }
  function ensureOrigin(p, club) {
    if (p.trainedCountry === undefined) {
      p.trainedCountry = countryKeyOfLabel(p.nationality) || (club && club.countryKey) || null;
      const r = (typeof hashUnit === "function") ? hashUnit(p.id + 3) : 0.5;
      p.trainedClubId = (club && p.age <= 27 && p.trainedCountry === club.countryKey && r < 0.4) ? club.id : null;
    }
  }
  const isNonEU = (p) => NON_EU.has(p.nationality);
  const isLocal = (p, club) => { ensureOrigin(p, club); return p.trainedCountry === club.countryKey; };
  const isClubTrained = (p, club) => { ensureOrigin(p, club); return p.trainedClubId === club.id; };
  const isExempt = (p, club) => p.age <= 21 && isLocal(p, club); // jeunes formés au pays : hors liste

  function rulesCheck(club) {
    const reg = club.players.filter((p) => !p.unreg);
    const counted = reg.filter((p) => !isExempt(p, club));
    const nonHG = counted.filter((p) => !isLocal(p, club)).length;
    const nonEU = reg.filter(isNonEU).length;
    const hg = counted.length - nonHG;
    const cap = capNonEU(club);
    const issues = [];
    if (counted.length > LIST_MAX) issues.push(`liste de ${counted.length} / ${LIST_MAX}`);
    if (nonHG > NONHG_MAX) issues.push(`${nonHG} joueurs non formés localement (max ${NONHG_MAX})`);
    if (nonEU > cap) issues.push(`${nonEU} joueurs hors UE (max ${cap})`);
    return { counted: counted.length, nonHG, hg, nonEU, cap, issues, ok: !issues.length, exempt: reg.length - counted.length, reg: reg.length };
  }
  function autoCompose(club) {
    const sorted = club.players.slice().sort((a, b) => b.overall - a.overall);
    sorted.forEach((p) => { p.unreg = false; });
    // on retire les joueurs les plus faibles qui posent problème, jusqu'à ce que tout soit conforme
    const weakest = sorted.slice().reverse();
    let guard = 80;
    while (!rulesCheck(club).ok && guard-- > 0) {
      const r = rulesCheck(club);
      let cand = null;
      if (r.nonEU > r.cap) cand = weakest.find((p) => !p.unreg && isNonEU(p));
      else if (r.nonHG > NONHG_MAX) cand = weakest.find((p) => !p.unreg && !isExempt(p, club) && !isLocal(p, club));
      else cand = weakest.find((p) => !p.unreg && !isExempt(p, club));
      if (!cand) break;
      cand.unreg = true;
    }
    return club.players.filter((p) => p.unreg);
  }
  function enforce(club, why) {
    if (!club || !club.players) return;
    const r = rulesCheck(club);
    if (r.ok) return;
    const out = autoCompose(club);
    if (out.length) {
      mail("Club", "Secrétariat", `Liste d'effectif : ${out.length} joueur(s) non inscrit(s)`,
        `<p>${esc(why || "Contrôle d'inscription")} : votre effectif ne respectait pas les règles (${esc(r.issues.join(" ; "))}).</p><p>Joueurs non inscrits : ${out.map((p) => esc(p.firstName[0] + ". " + p.lastName)).join(", ")}.</p><p>Vous pourrez modifier la liste dans <b>Radar ▸ Règles d'effectif</b> tant que la fenêtre d'inscription est ouverte.</p>`);
      note(`Liste d'effectif : ${out.length} joueur(s) non inscrit(s) (${r.issues.join(" ; ")}).`);
    }
  }
  // un joueur non inscrit ne peut pas jouer
  const origAvail = window.isAvailable;
  window.isAvailable = function (player, dateKey) {
    if (player && player.unreg) return false;
    return origAvail.apply(this, arguments);
  };

  // ===================================================================
  // 1. NÉGOCIATION AVANCÉE
  // ===================================================================
  const origNeg = window.openNegotiation;
  window.openNegotiation = function (playerId) {
    window.__nxPid = playerId; window.__nxPending = null;
    return origNeg.apply(this, arguments);
  };
  const origEval = window.evaluateOffer;
  window.evaluateOffer = function (player, amount, isBuyerUser) {
    const nx = window.__nxPending;
    if (nx && isBuyerUser && nx.pid === player.id) {
      const r = origEval.call(this, player, nx.perceived, isBuyerUser);
      nx.accepted = !!r.accept;
      return r;
    }
    return origEval.apply(this, arguments);
  };
  const origBudget = window.getTransferBudget;
  window.getTransferBudget = function (club) {
    let b = origBudget.apply(this, arguments);
    if (club && isUserClub(club.id)) b -= owedTotal();
    return Math.max(0, b);
  };
  function owedTotal() { return (MX().inst || []).filter((i) => isUserClub(i.from)).reduce((s, i) => s + i.amount, 0); }

  function nxBoxHTML(p) {
    const club = userClub();
    const mine = club.players.filter((x) => x.id !== p.id && !x.onLoan && !x.loan).sort((a, b) => b.value - a.value).slice(0, 24);
    const r = rulesCheck(club);
    let regNote = "";
    if (isNonEU(p) && r.nonEU >= r.cap) regNote = `⚠️ Joueur hors UE : quota atteint (${r.nonEU}/${r.cap}). Il ne pourra pas être inscrit sans libérer une place.`;
    else if (!isLocal(p, club) && !isExempt(p, club) && r.nonHG >= NONHG_MAX) regNote = `⚠️ Quota de joueurs non formés localement atteint (${r.nonHG}/${NONHG_MAX}).`;
    const dd = MX().dd;
    const ddNote = dd && dd.date === fmtDate(state.date) && !dd.closed ? `<p class="mx-warn">⏱ Dernier jour du mercato — il reste ${24 - dd.hour} h. Risque d'échec administratif : ${Math.round(failChance(dd.hour) * 100)} %.</p>` : "";
    return `<details id="nx-box" class="nx"><summary>⚙️ Montage financier avancé <span class="hint">(échelonnement, échange, clauses)</span></summary>
      <div class="nx-grid">
        <label>Comptant <select id="nx-up"><option value="100">100 %</option><option value="70">70 %</option><option value="50">50 %</option><option value="30">30 %</option></select></label>
        <label>Solde sur <select id="nx-yrs"><option value="1">1 an</option><option value="2">2 ans</option><option value="3">3 ans</option></select></label>
        <label>Clause de revente accordée <select id="nx-sell"><option value="0">Aucune</option><option value="10">10 %</option><option value="15">15 %</option><option value="20">20 %</option></select></label>
        <label>Option de rachat (vendeur) <select id="nx-bb"><option value="0">Non</option><option value="1">Oui (130 %, 2 ans)</option></select></label>
      </div>
      <div class="nx-ex"><b>Joueurs proposés en échange</b>
        ${mine.map((x) => `<label class="nx-chk"><input type="checkbox" class="nx-pl" value="${x.id}" /> ${esc(x.firstName[0] + ". " + x.lastName)} · ${x.position} · ${x.overall} · ${money(x.value)}</label>`).join("")}
      </div>
      <div id="nx-sum" class="hint"></div>
      ${regNote ? `<p class="mx-warn">${regNote}</p>` : ""}${ddNote}
    </details>`;
  }
  function nxRead() {
    const box = document.getElementById("nx-box"); if (!box) return null;
    const up = parseInt(document.getElementById("nx-up").value, 10) / 100;
    const yrs = parseInt(document.getElementById("nx-yrs").value, 10);
    const sell = parseInt(document.getElementById("nx-sell").value, 10);
    const bb = document.getElementById("nx-bb").value === "1";
    const ex = [...box.querySelectorAll(".nx-pl:checked")].map((c) => getPlayer(parseInt(c.value, 10))).filter(Boolean);
    return { up, yrs, sell, bb, ex };
  }
  function nxCompute(p, T, o) {
    const E = o.ex.reduce((s, x) => s + x.value, 0);
    const credit = Math.min(E, T);
    const cash = Math.max(0, T - credit);
    const upfront = Math.round(cash * o.up / 1000) * 1000;
    const rest = cash - upfront;
    const club = userClub();
    const risk = club.budget < 0 ? 0.8 : 1;
    let pv = upfront + credit * 0.85 * (o.ex.some((x) => x.age > 31) ? 0.85 : 1);
    for (let k = 1; k <= o.yrs; k++) pv += (rest / o.yrs) * Math.pow(0.95, k) * risk;
    pv += (o.sell / 100) * p.value * 0.6;
    if (o.bb) pv += T * 0.04;
    return { E, credit, cash, upfront, rest, perceived: Math.round(pv / 1000) * 1000 };
  }
  function nxIsNeutral(o) { return o.up === 1 && !o.sell && !o.bb && !o.ex.length; }
  function nxRefresh() {
    const out = document.getElementById("nx-sum"); if (!out) return;
    const p = getPlayer(window.__nxPid); if (!p) return;
    const o = nxRead(); const T = parseInt(document.getElementById("offer-amount").value, 10) || 0;
    if (nxIsNeutral(o)) { out.textContent = "Paiement classique : tout comptant, sans clause."; return; }
    const c = nxCompute(p, T, o);
    const pct = T ? Math.round(c.perceived / T * 100) : 0;
    out.innerHTML = `Prix annoncé <b>${money(T)}</b> · échange crédité ${money(c.credit)} · comptant <b>${money(c.upfront)}</b> · étalé ${money(c.rest)} sur ${o.yrs} an(s)<br>Valeur perçue par le vendeur : <b>${pct} %</b> du prix annoncé.`;
  }
  document.addEventListener("input", (e) => { if (e.target.closest && e.target.closest("#nx-box, #offer-amount")) nxRefresh(); });
  document.addEventListener("change", (e) => { if (e.target.closest && e.target.closest("#nx-box")) nxRefresh(); });

  // injection de la boîte dans la fenêtre de négociation
  let obsBusy = false;
  new MutationObserver(() => {
    if (obsBusy) return;
    const amt = document.getElementById("offer-amount");
    if (!amt || document.getElementById("nx-box") || !document.getElementById("negotiation-modal")) return;
    if (!document.getElementById("negotiation-modal").contains(amt)) return;
    const p = getPlayer(window.__nxPid); if (!p) return;
    obsBusy = true;
    try {
      const field = amt.closest("label") || amt.parentNode;
      field.insertAdjacentHTML("afterend", nxBoxHTML(p));
      nxRefresh();
    } catch (e) { console.warn("nx", e); }
    obsBusy = false;
  }).observe(document.body, { childList: true, subtree: true });

  // envoi de l'offre : on transforme l'offre avancée en offre comptant + valeur perçue
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("#send-offer, #pay-clause");
    if (!t) return;
    if (t.id === "pay-clause") { window.__nxPending = null; return; }
    const p = getPlayer(window.__nxPid), box = document.getElementById("nx-box");
    if (!p || !box) return;
    const amtEl = document.getElementById("offer-amount");
    const T = parseInt(amtEl.value, 10) || 0;
    const o = nxRead();
    if (nxIsNeutral(o)) { window.__nxPending = null; return; }
    const club = userClub();
    if (club.players.length - o.ex.length < 18) {
      e.stopPropagation(); e.preventDefault();
      document.getElementById("nx-sum").innerHTML = `<span class="result-bad">Votre effectif tomberait sous 18 joueurs.</span>`; return;
    }
    const c = nxCompute(p, T, o);
    window.__nxPending = { pid: p.id, T, o, c, perceived: c.perceived, accepted: false, sellOn: o.sell, bb: o.bb, yrs: o.yrs };
    amtEl.value = String(c.upfront);
    setTimeout(() => { const a = document.getElementById("offer-amount"); if (a && a.value === String(c.upfront)) a.value = String(T); }, 0);
  }, true);

  // application du montage au moment de la signature
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee, opts) {
    const nx = window.__nxPending;
    const mine = isUserClub(toId) && !isUserClub(fromId);
    if (nx && nx.accepted && mine && nx.pid === player.id) {
      window.__nxPending = null;
      const o2 = Object.assign({}, opts || {});
      if (nx.sellOn) o2.newSellOnPct = nx.sellOn;
      const r = origTransfer.call(this, player, fromId, toId, fee, o2);
      try {
        const buyer = getClub(toId), seller = getClub(fromId);
        const lines = [];
        if (nx.c.rest > 0) {
          for (let k = 1; k <= nx.yrs; k++) MX().inst.push({ id: nextId(), pid: player.id, name: player.firstName[0] + ". " + player.lastName, from: toId, to: fromId, amount: Math.round(nx.c.rest / nx.yrs / 1000) * 1000, due: day() + 365 * k });
          lines.push(`Solde de ${money(nx.c.rest)} payable en ${nx.yrs} échéance(s) annuelle(s).`);
          if (o2.payCommission && player.agent) { const extra = Math.round(nx.c.rest * (o2.commissionPct != null ? o2.commissionPct : player.agent.commissionPct) / 100 / 500) * 500; buyer.budget -= extra; lines.push(`Commission de l'agent sur le solde : ${money(extra)}.`); }
        }
        nx.o.ex.forEach((x) => {
          if (x.clubId === toId) { window.transferPlayer(x, toId, fromId, 0); lines.push(`${x.firstName} ${x.lastName} part à ${seller.name} dans l'échange.`); }
        });
        if (nx.sellOn) lines.push(`Clause de revente de ${nx.sellOn} % accordée à ${seller.name}.`);
        if (nx.bb) { player.buyBack = { clubId: fromId, price: Math.round(nx.T * 1.3 / 10000) * 10000, until: day() + 730 }; lines.push(`Option de rachat de ${seller.name} : ${money(player.buyBack.price)} pendant 2 ans.`); }
        if (lines.length) { mail("Transferts", "Direction sportive", `Montage du transfert de ${player.lastName}`, `<p>${lines.map(esc).join("</p><p>")}</p>`); note(lines.join(" ")); }
        enforce(buyer, "Arrivée de " + player.lastName);
      } catch (e) { console.warn("nx/apply", e); }
      return r;
    }
    const wasUser = isUserClub(fromId);
    const r = origTransfer.apply(this, arguments);
    try {
      if (wasUser) player.unreg = false;
      if (isUserClub(toId) && !isUserClub(fromId)) { player.unreg = false; ensureOrigin(player, null); enforce(getClub(toId), "Arrivée de " + player.lastName); }
    } catch (e) {}
    return r;
  };

  function processInstalments() {
    const M = MX(); if (!M.inst.length) return;
    const due = M.inst.filter((i) => i.due <= day());
    if (!due.length) return;
    due.forEach((i) => {
      const a = getClub(i.from), b = getClub(i.to); if (!a || !b) return;
      a.budget -= i.amount; b.budget += i.amount;
      if (isUserClub(a.id)) { mail("Finances", "Direction financière", `Échéance payée : ${i.name}`, `<p>Vous réglez ${money(i.amount)} à ${esc(b.name)} (échéance du transfert de ${esc(i.name)}).</p>`); note(`Échéance de transfert payée : ${money(i.amount)} à ${b.name}.`); }
    });
    M.inst = M.inst.filter((i) => i.due > day());
  }
  function checkBuyBacks() {
    const club = userClub(); if (!club || !currentWindow()) return;
    club.players.slice().forEach((p) => {
      const bb = p.buyBack; if (!bb) return;
      if (bb.until < day()) { delete p.buyBack; return; }
      const c = getClub(bb.clubId);
      if (!c || p.value < bb.price * 0.9 || c.budget < bb.price || Math.random() > 0.3) return;
      mail("Transferts", c.name, `Option de rachat levée : ${p.lastName}`, `<p>${esc(c.name)} active son option de rachat sur ${esc(p.firstName + " " + p.lastName)} pour ${money(bb.price)}. Le joueur repart.</p>`);
      delete p.buyBack;
      window.transferPlayer(p, club.id, c.id, bb.price);
      note(`${c.name} lève l'option de rachat sur ${p.firstName} ${p.lastName} (${money(bb.price)}).`);
    });
  }

  // ===================================================================
  // 2. RADAR DES OPPORTUNITÉS
  // ===================================================================
  const RX = () => (ui.rx = ui.rx || { view: "opp", horizon: 12, scope: "network" });
  function monthsToEnd(p) {
    const d = new Date(state.date);
    return (p.contractEndYear * 12 + 6) - (d.getUTCFullYear() * 12 + d.getUTCMonth() + 1);
  }
  function floorLevel(club) {
    const o = club.players.map((p) => p.overall).sort((a, b) => b - a);
    return (o[13] || o[o.length - 1] || 50) - 2;
  }
  function inScope(p, scope) {
    if (scope === "world") return true;
    try { return knowledgeOfPlayerForUser(p) >= 35; } catch (e) { return true; }
  }
  function quality(p) { return p.overall * 0.7 + p.potential * 0.3 - Math.max(0, p.age - 28) * 0.8; }
  function scanOpportunities(horizon, scope) {
    const club = userClub(); const fl = floorLevel(club);
    const budget = getTransferBudget(club);
    const others = allClubs().filter((c) => c.id !== club.id);
    const free = [], clauses = [], distress = [];
    others.forEach((c) => {
      const hard = c.budget < 0 || (c.wageBill > 0 && c.budget < c.wageBill * 3);
      c.players.forEach((p) => {
        if (p.overall < fl || !inScope(p, scope)) return;
        const m = monthsToEnd(p);
        if (m >= 0 && m <= horizon) free.push({ p, c, m });
        if (p.releaseClause && p.releaseClause <= budget) clauses.push({ p, c });
        if (hard && p.value > 0) distress.push({ p, c });
      });
    });
    const top = (a, n) => a.sort((x, y) => quality(y.p) - quality(x.p)).slice(0, n);
    const hardClubs = {};
    distress.forEach((d) => { hardClubs[d.c.id] = d.c; });
    return { free: top(free, 12), clauses: top(clauses, 10), distress: top(distress, 10), hardClubs: Object.keys(hardClubs).length, fl, budget };
  }
  function playerBtn(p) { return `<button class="link-danger" style="margin:0;color:var(--fm-accent,#c9a24a);" data-playercard="${p.id}">${esc(p.firstName[0])}. <b>${esc(p.lastName)}</b></button>`; }
  function oppTable(rows, cols) {
    if (!rows.length) return `<p class="hint">Rien à signaler pour le moment.</p>`;
    return `<div class="mx-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Niv.</th><th>Club</th>${cols.map((c) => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><td>${playerBtn(r.p)}</td><td>${r.p.position}</td><td>${r.p.age}</td><td>${r.p.overall}</td><td>${esc(r.c.name)}</td>${cols.map((c) => `<td>${c[1](r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function oppHTML() {
    const R = RX(); const s = scanOpportunities(R.horizon, R.scope);
    const chip = (k, v, label) => `<button class="${R[k] === v ? "on" : ""}" data-mx="set:${k}:${v}">${label}</button>`;
    return `<div class="eu-subnav">${chip("horizon", 6, "Libres dans 6 mois")}${chip("horizon", 12, "Libres dans 12 mois")}<span style="flex:0 0 12px"></span>${chip("scope", "network", "Mon réseau")}${chip("scope", "world", "Monde entier")}</div>
      <p class="hint">Niveau minimum retenu : ${s.fl} (pour entrer dans votre top 14). Budget de transferts disponible : ${money(s.budget)}${owedTotal() ? ` (après ${money(owedTotal())} d'échéances à venir)` : ""}.</p>
      <h3 class="panel-subtitle">🆓 Contrats qui expirent (${R.horizon} mois)</h3>
      ${oppTable(s.free, [["Fin", (r) => r.m <= 0 ? "ce mois-ci" : `${r.m} mois`], ["Salaire", (r) => money(r.p.wage) + "/m"]])}
      <h3 class="panel-subtitle">🔓 Clauses libératoires à votre portée</h3>
      ${oppTable(s.clauses, [["Clause", (r) => money(r.p.releaseClause)], ["Valeur", (r) => money(r.p.value)]])}
      <h3 class="panel-subtitle">🆘 Clubs en difficulté financière <span class="hint">(${s.hardClubs} club(s))</span></h3>
      ${oppTable(s.distress, [["Valeur", (r) => money(r.p.value)], ["Trésorerie du club", (r) => `<span class="result-bad">${money(r.c.budget)}</span>`]])}
      <p class="hint">Les clubs étranglés financièrement vendent plus facilement : une offre un peu sous la valeur a davantage de chances de passer.</p>`;
  }

  function weeklyRadar() {
    const club = userClub(); if (!club) return;
    const s = scanOpportunities(6, "network");
    const A = MX().alerted; const lines = [];
    const push = (p, c, why) => { if (A[p.id + why]) return; A[p.id + why] = day(); lines.push(`<li>${playerBtn(p)} (${p.position}, ${p.age} ans, niv. ${p.overall}) — ${esc(c.name)} : ${why}</li>`); };
    s.free.slice(0, 3).forEach((r) => { if (r.m <= 6) push(r.p, r.c, `libre dans ${Math.max(r.m, 0)} mois`); });
    s.clauses.slice(0, 2).forEach((r) => push(r.p, r.c, `clause libératoire de ${money(r.p.releaseClause)} atteignable`));
    s.distress.slice(0, 2).forEach((r) => push(r.p, r.c, `club en difficulté financière`));
    const keys = Object.keys(A); if (keys.length > 400) keys.slice(0, 150).forEach((k) => delete A[k]);
    if (!lines.length) return;
    mail("Transferts", "Radar du scouting", `📡 ${lines.length} opportunité(s) détectée(s)`, `<p>Votre cellule de veille signale :</p><ul>${lines.slice(0, 4).join("")}</ul>`);
  }

  // ===================================================================
  // RÈGLES D'EFFECTIF — écran
  // ===================================================================
  function rulesHTML() {
    const club = userClub(); const r = rulesCheck(club); const open = !!currentWindow();
    const left = window.fm24 && fm24.daysToClose ? fm24.daysToClose() : null;
    const pill = (ok, txt) => `<span class="mx-pill ${ok ? "ok" : "ko"}">${ok ? "✔" : "✖"} ${txt}</span>`;
    const rows = club.players.slice().sort((a, b) => b.overall - a.overall).map((p) => {
      const tags = [isClubTrained(p, club) ? "🏠 club" : isLocal(p, club) ? "🏳️ pays" : "", isNonEU(p) ? "🌍 hors UE" : "", isExempt(p, club) ? "U21" : ""].filter(Boolean).join(" · ");
      return `<tr class="${p.unreg ? "mx-off" : ""}"><td>${playerBtn(p)}</td><td>${p.position}</td><td>${p.age}</td><td>${p.overall}</td><td>${tags || "—"}</td><td><button class="btn btn-small ${p.unreg ? "btn-ghost" : "btn-primary"}" data-mx="reg:${p.id}" ${open ? "" : "disabled"}>${p.unreg ? "Non inscrit" : "Inscrit"}</button></td></tr>`;
    }).join("");
    return `<p>${pill(r.counted <= LIST_MAX, `Liste ${r.counted}/${LIST_MAX}`)} ${pill(r.nonHG <= NONHG_MAX, `Non formés localement ${r.nonHG}/${NONHG_MAX}`)} ${pill(r.nonEU <= r.cap, `Hors UE ${r.nonEU}/${r.cap}`)} <span class="mx-pill">U21 formés au pays (hors liste) : ${r.exempt}</span></p>
      <p class="hint">Les joueurs <b>formés localement</b> (au club ou dans le pays) et les U21 formés au pays allègent la liste. Un joueur non inscrit ne peut pas être aligné. Règles simplifiées, inspirées des listes UEFA et des quotas nationaux.</p>
      <p class="${open ? "" : "mx-warn"}">${open ? `Fenêtre d'inscription ouverte${left != null ? ` — clôture dans ${left} jour(s)` : ""} : vous pouvez modifier la liste.` : "🔒 Fenêtre d'inscription fermée : la liste est verrouillée jusqu'au prochain mercato."}</p>
      <p><button class="btn btn-primary btn-small" data-mx="auto" ${open ? "" : "disabled"}>Composer automatiquement</button></p>
      <div class="mx-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Niv.</th><th>Statut</th><th>Liste</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ===================================================================
  // 4. DERNIER JOUR DU MERCATO
  // ===================================================================
  const failChance = (h) => h < 19 ? 0.03 : h < 21 ? 0.10 : h < 22 ? 0.18 : h < 23 ? 0.30 : 0.45;
  const todayStr = () => fmtDate(state.date);
  function ddActive() { if (typeof state === "undefined" || !state || !state.date) return null; const d = MX().dd; return d && d.date === todayStr() ? d : null; }

  const origWin = window.currentWindow;
  window.currentWindow = function (date) {
    const w = origWin.apply(this, arguments);
    const d = ddActive();
    if (w && d && d.closed && (date === undefined || fmtDate(date) === d.date)) return null;
    return w;
  };

  function startDeadline() {
    const M = MX();
    if (M.dd && M.dd.date === todayStr()) return;
    M.dd = { date: todayStr(), hour: 10, closed: false, log: [], failed: {}, ok: {}, shown: false };
  }
  function ddLog(d, t) { d.log.unshift(`${String(d.hour).padStart(2, "0")}:00 — ${t}`); if (d.log.length > 14) d.log.length = 14; }
  function ddTick(d) {
    if (d.closed) return;
    d.hour++;
    const club = userClub();
    if (d.hour >= 24) { d.closed = true; d.hour = 24; ddLog(d, "🔔 Le mercato est fermé. Plus aucun transfert possible."); mail("Transferts", "Ligue", "Mercato clos", `<p>La fenêtre de transferts vient de se refermer.</p>`); enforce(club, "Clôture du mercato"); return; }
    try { simulateAIMarketTick(); } catch (e) {}
    const r = Math.random();
    if (r < 0.45) {
      const cand = club.players.filter((p) => !p.onLoan).sort((a, b) => b.overall - a.overall).slice(0, 8);
      const p = cand.length ? pick(cand) : null;
      const buyers = p ? allClubs().filter((c) => !isUserClub(c.id) && c.budget >= p.value * 1.1) : [];
      if (p && buyers.length) {
        const b = pick(buyers), amount = Math.round(p.value * randInt(105, 135) / 100 / 1000) * 1000;
        state.inbox.unshift({ id: nextId(), type: "offer_incoming", playerId: p.id, fromClubId: b.id, amount, date: fmtDate(state.date), resolved: false, deadline: true });
        ddLog(d, `📨 ${b.name} offre ${money(amount)} pour ${p.firstName[0]}. ${p.lastName} (boîte de réception).`);
      }
    } else if (r < 0.65) {
      const unhappy = club.players.filter((p) => (p.morale || 70) < 55 && !p.onLoan);
      if (unhappy.length) { const p = pick(unhappy); p.morale = Math.max(10, (p.morale || 50) - 5); ddLog(d, `😠 ${p.firstName[0]}. ${p.lastName} fait pression : il veut partir aujourd'hui.`); }
    } else if (r < 0.85) {
      const sl = (club.scouting && club.scouting.shortlist) || [];
      const tgt = sl.map(getPlayer).filter((p) => p && p.clubId !== club.id)[0];
      if (tgt) {
        const rich = allClubs().filter((c) => !isUserClub(c.id) && c.id !== tgt.clubId && c.budget >= tgt.value * 1.2);
        if (rich.length && Math.random() < 0.5) { const b = pick(rich), from = tgt.clubId; window.transferPlayer(tgt, from, b.id, Math.round(tgt.value * 1.1 / 1000) * 1000); ddLog(d, `💔 ${b.name} vous coiffe sur ${tgt.firstName[0]}. ${tgt.lastName} (liste de suivi).`); }
      }
    }
    if (d.hour === 20) ddLog(d, "⚠️ Les dossiers deviennent risqués : les délais administratifs se resserrent.");
    if (d.hour === 22) ddLog(d, "🚨 Dernière heure et demie : un dossier sur trois risque d'échouer.");
  }
  function openDeadlineRoom() {
    const d = ddActive();
    if (!d) return;
    let holder = document.getElementById("mx-root");
    if (!holder) { holder = document.createElement("div"); holder.id = "mx-root"; document.body.appendChild(holder); }
    const left = Math.max(0, 24 - d.hour);
    const offers = state.inbox.filter((o) => o.type === "offer_incoming" && !o.resolved && o.deadline);
    const watched = ((userClub().scouting || {}).shortlist || []).length;
    holder.innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">
      <h3>⏰ Salle des marchés — ${String(Math.min(d.hour, 23)).padStart(2, "0")}:${d.hour >= 24 ? "59" : "00"}</h3>
      <div class="mx-clock"><div class="mx-bar"><i style="width:${Math.min(100, (d.hour - 10) / 14 * 100)}%"></i></div><span>${d.closed ? "FERMÉ" : `Il reste ${left} h`}</span></div>
      <p class="hint">${d.closed ? "La fenêtre est refermée." : `Risque d'échec administratif pour un dossier lancé maintenant : <b>${Math.round(failChance(d.hour) * 100)} %</b>. ${offers.length} offre(s) en attente · ${watched} cible(s) suivie(s).`}</p>
      <div class="log-list">${d.log.map((l) => `<div class="log-row">${esc(l)}</div>`).join("") || `<div class="log-row">Le téléphone n'a pas encore sonné…</div>`}</div>
      <div class="creation-footer"><button class="btn btn-ghost" data-mx="dd:close">Fermer</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-mx="dd:inbox">📥 Offres</button>
        ${d.closed ? "" : `<button class="btn btn-ghost" data-mx="dd:tick">⏳ +1 h</button><button class="btn btn-primary" data-mx="dd:rush">⏭ Jusqu'à 23 h</button>`}</div></div>
    </div></div>`;
    d.shown = true;
  }
  function closeDeadlineRoom() { const h = document.getElementById("mx-root"); if (h) h.innerHTML = ""; }

  // dossiers qui échouent : achats (étape contrat) et ventes (acceptation d'une offre)
  document.addEventListener("click", (e) => {
    const d = ddActive(); if (!d || d.closed) return;
    const sc = e.target.closest && e.target.closest("#send-contract");
    if (sc) {
      const pid = window.__nxPid; if (!pid) return;
      if (d.ok[pid]) return;
      if (d.failed[pid] || Math.random() < failChance(d.hour)) {
        d.failed[pid] = true;
        e.stopPropagation(); e.preventDefault();
        const box = document.getElementById("contract-result");
        if (box) box.innerHTML = `<p class="result-bad">Dossier hors délai : les documents sont arrivés après la clôture. Le transfert tombe à l'eau.</p>`;
        sc.disabled = true;
        const p = getPlayer(pid);
        mail("Transferts", "Direction sportive", "Transfert échoué au dernier moment", `<p>${esc(p ? p.firstName + " " + p.lastName : "Le joueur")} ne sera pas enregistré : le dossier est arrivé trop tard.</p>`);
      } else d.ok[pid] = true;
      return;
    }
    const ac = e.target.closest && e.target.closest("[data-accept]");
    if (ac) {
      const id = parseInt(ac.getAttribute("data-accept"), 10);
      const o = state.inbox.find((x) => x.id === id);
      if (!o || o.type !== "offer_incoming") return;
      if (d.failed["o" + id] || (!d.ok["o" + id] && Math.random() < failChance(d.hour))) {
        d.failed["o" + id] = true; o.resolved = true;
        e.stopPropagation(); e.preventDefault();
        const p = getPlayer(o.playerId);
        mail("Transferts", "Direction sportive", "Vente échouée au dernier moment", `<p>La vente de ${esc(p ? p.firstName + " " + p.lastName : "votre joueur")} a capoté : le club acheteur n'a pas déposé les documents à temps.</p>`);
        toast("⏱ Vente échouée : dossier hors délai");
        try { render(); } catch (err) {}
      } else d.ok["o" + id] = true;
    }
  }, true);

  // ===================================================================
  // INTÉGRATION
  // ===================================================================
  window.renderRadar = function () {
    if (!userClub()) return "";
    const R = RX(); const d = ddActive();
    const tab = (v, l) => `<button class="${R.view === v ? "on" : ""}" data-mx="view:${v}">${l}</button>`;
    let body = R.view === "rules" ? rulesHTML() : R.view === "dd" ? ddHTML() : R.view === "sales" && window.dsSalesHTML ? dsSalesHTML() : R.view === "bilan" && window.dsBilanHTML ? dsBilanHTML() : oppHTML();
    return `<div class="fm-dark fm-panel mx"><h2 class="fm-title">Radar & mercato <span>${d && !d.closed ? "DERNIER JOUR" : currentWindow() ? "mercato ouvert" : "mercato fermé"}</span></h2>
      <div class="eu-subnav">${tab("opp", "📡 Opportunités")}${tab("sales", "💰 Ventes")}${tab("rules", "📋 Règles d'effectif")}${tab("dd", "⏰ Dernier jour")}${tab("bilan", "📊 Bilan")}</div>${body}</div>`;
  };
  function ddHTML() {
    const d = ddActive(); const left = window.fm24 && fm24.daysToClose ? fm24.daysToClose() : null;
    const owed = MX().inst;
    const inst = owed.length ? `<h3 class="panel-subtitle">💳 Échéances de transferts à venir</h3><table class="fx-mini"><thead><tr><th>Joueur</th><th>Sens</th><th>Montant</th><th>Dans</th></tr></thead><tbody>${owed.map((i) => `<tr><td>${esc(i.name)}</td><td>${isUserClub(i.from) ? "à payer" : "à recevoir"}</td><td>${money(i.amount)}</td><td>${Math.max(0, i.due - day())} j</td></tr>`).join("")}</tbody></table>` : "";
    const bb = userClub().players.filter((p) => p.buyBack && p.buyBack.until >= day());
    const bbh = bb.length ? `<h3 class="panel-subtitle">↩️ Options de rachat qui pèsent sur votre effectif</h3><ul>${bb.map((p) => `<li>${playerBtn(p)} — ${esc((getClub(p.buyBack.clubId) || {}).name || "?")} peut le racheter ${money(p.buyBack.price)} (encore ${Math.max(0, p.buyBack.until - day())} j)</li>`).join("")}</ul>` : "";
    const head = d && !d.closed ? `<p class="mx-warn">C'est le dernier jour du mercato !</p><p><button class="btn btn-primary" data-mx="dd:open">Ouvrir la salle des marchés</button></p>`
      : `<p class="hint">${left != null ? `Le mercato ferme dans ${left} jour(s). ` : "Le mercato est fermé. "}Le dernier jour, une salle des marchés s'ouvre avec une horloge : offres de dernière minute, joueurs qui font pression, concurrents qui vous coiffent… et des dossiers qui peuvent échouer faute de temps.</p>`;
    return head + inst + bbh;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-mx]"); if (!b || b.disabled) return;
    const [k, a, v] = b.getAttribute("data-mx").split(":");
    const R = RX(); const refresh = () => { const c = document.getElementById("tab-content"); if (c && ui.tab === "radar") c.innerHTML = renderRadar(); };
    if (k === "view") { R.view = a; refresh(); }
    else if (k === "set") { R[a] = isNaN(+v) ? v : +v; refresh(); }
    else if (k === "auto") { const out = autoCompose(userClub()); toast(`Liste recomposée (${out.length} non inscrit(s))`); try { saveGame(); } catch (x) {} refresh(); }
    else if (k === "reg") {
      const club = userClub(); const p = getPlayer(parseInt(a, 10)); if (!p || !currentWindow()) return;
      p.unreg = !p.unreg;
      if (!p.unreg && !rulesCheck(club).ok) { p.unreg = true; toast("Inscription impossible : quota dépassé"); }
      try { saveGame(); } catch (x) {} refresh();
    }
    else if (k === "dd") {
      const d = ddActive();
      if (a === "open") { startDeadline(); openDeadlineRoom(); }
      else if (a === "close") { closeDeadlineRoom(); try { render(); } catch (x) {} }
      else if (a === "inbox") { closeDeadlineRoom(); ui.tab = "inbox"; try { render(); } catch (x) {} }
      else if (d && a === "tick") { ddTick(d); openDeadlineRoom(); try { saveGame(); } catch (x) {} }
      else if (d && a === "rush") { while (!d.closed && d.hour < 23) ddTick(d); openDeadlineRoom(); try { saveGame(); } catch (x) {} }
    }
  });

  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      if (!userClub()) return r;
      if (!MX().regInit) { MX().regInit = true; enforce(userClub(), "Inscription initiale"); }
      processInstalments();
      if (day() % 7 === 3) { checkBuyBacks(); weeklyRadar(); }
      const left = window.fm24 && fm24.daysToClose ? fm24.daysToClose() : null;
      if (left === 0) {
        startDeadline();
        const f = fm24.F && fm24.F(); if (f && f.deadline) f.deadlineSeen = f.deadline.date; // on remplace l'ancienne fenêtre
      }
      const d = MX().dd;
      if (d && d.date !== todayStr()) { MX().dd = null; }
    } catch (e) { console.warn("market2/jour", e); }
    return r;
  };
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (ui.screen === "dashboard" && state && state.ds && userClub()) {
        const d = ddActive();
        if (d && !d.shown && !d.closed && !anyModal()) openDeadlineRoom();
      }
    } catch (e) { console.warn("market2/rendu", e); }
    return r;
  };
  window.dsMarket2 = { rulesCheck, autoCompose, enforce, scanOpportunities, failChance, nxCompute, startDeadline, ddTick, MX };
})();
