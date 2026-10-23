// =====================================================================
// BLOC 18 (1/4) : CLAUSES DE CONTRAT AVANCÉES + PRÊTS PLUS RICHES
//  - Contrats : bonus de matchs et de buts (à seuil), prime par passe décisive, salaire
//    progressif, baisse de salaire en cas de relégation, prolongation automatique.
//  - Prêts : temps de jeu minimum garanti, part du salaire payée par le prêteur,
//    clause de rappel en janvier, suivi et indemnités en cas de non-respect.
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ready = () => typeof state !== "undefined" && state && state.ds && typeof userClub === "function" && userClub();
  const day = () => (typeof state !== "undefined" && state && state.dayCounter) || 0;
  const money = (v) => fmtMoney(Math.round(v));
  const pn = (p) => `${p.firstName} ${p.lastName}`;
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { dsMail(f, s, sub, html); } catch (e) {} };
  const toast = (t) => { try { window.dsToast ? window.dsToast(t) : null; } catch (e) {} };
  const todayKey = () => new Date(state.date).toISOString().slice(0, 10);
  const userClubs = () => (state.userClubIds || []).map(getClub).filter(Boolean);

  // ===================================================================
  // 1. CLAUSES DE CONTRAT AVANCÉES
  // ===================================================================
  const KEYS = ["mbN", "mbA", "gbN", "gbA", "ast", "raise", "cut", "auto"];
  const hasExtra = (d) => d && KEYS.some((k) => d[k]);
  const D = window.dsDeal;
  if (D) {
    const oForm = D.formHTML, oRead = D.readDeal, oScore = D.score, oApply = D.apply, oDesc = D.describe;
    D.formHTML = function (p, club, deal) {
      deal = deal || {};
      const f = (id, label, v, step) => `<label class="field"><span>${label}</span><input type="number" id="${id}" value="${v || 0}" step="${step}" min="0" /></label>`;
      return oForm.apply(this, arguments) + `<div class="dp-deal dp2"><h4 style="margin:10px 0 4px;">Clauses avancées</h4>
        <p class="hint" style="margin:0 0 6px;">Des bonus à seuil, versés une fois par saison, rendent l'offre plus attractive sans alourdir le salaire fixe.</p>
        ${f("deal-mb-n", "Bonus de présence : nombre de matchs à atteindre dans la saison", deal.mbN, 1)}
        ${f("deal-mb-amt", "… montant du bonus de présence (€)", deal.mbA, 10000)}
        ${f("deal-gb-n", "Bonus de buts : nombre de buts à atteindre dans la saison", deal.gbN, 1)}
        ${f("deal-gb-amt", "… montant du bonus de buts (€)", deal.gbA, 10000)}
        ${f("deal-ast", "Prime par passe décisive (€)", deal.ast, 500)}
        ${f("deal-raise", "Salaire progressif : hausse à chaque saison (%)", deal.raise, 1)}
        ${f("deal-cut", "Baisse de salaire en cas de relégation (%)", deal.cut, 5)}
        ${f("deal-auto", "Prolongation automatique d'un an si N matchs joués (0 = non)", deal.auto, 1)}
      </div>`;
    };
    D.readDeal = function () {
      const d = oRead.apply(this, arguments);
      const g = (id) => { const e = document.getElementById(id); return e ? Math.max(0, parseFloat(e.value) || 0) : 0; };
      d.mbN = Math.round(g("deal-mb-n")); d.mbA = g("deal-mb-amt"); d.gbN = Math.round(g("deal-gb-n")); d.gbA = g("deal-gb-amt");
      d.ast = g("deal-ast"); d.raise = Math.min(25, g("deal-raise")); d.cut = Math.min(60, g("deal-cut")); d.auto = Math.round(g("deal-auto"));
      return d;
    };
    D.score = function (p, deal, club) {
      const r = oScore.apply(this, arguments);
      try {
        if (hasExtra(deal)) {
          const wage = Math.max(1000, p.wage || 10000);
          const val = (deal.mbN ? deal.mbA * 0.6 : 0) + (deal.gbN ? deal.gbA * 0.5 : 0) + (deal.ast || 0) * 6;
          let adj = clamp(val / (wage * 12) * 0.8, 0, 0.06) + clamp((deal.raise || 0) * 0.008, 0, 0.05) + (deal.auto ? 0.02 : 0) - clamp((deal.cut || 0) * 0.003, 0, 0.12);
          r.adj += adj;
          if (val > 0) r.notes.push("Les bonus à seuil sont appréciés.");
          if (deal.raise) r.notes.push("Le salaire progressif le rassure sur l'avenir.");
          if (deal.cut) r.notes.push("La baisse de salaire en cas de relégation le refroidit.");
        }
      } catch (e) {}
      return r;
    };
    function stash(player, d) { if (!player.deal) player.deal = {}; KEYS.forEach((k) => { player.deal[k] = d && d[k] ? d[k] : 0; }); player.deal.yr = state.season.year; player.deal.mbP = false; player.deal.gbP = false; const st = player.seasonStats || {}; player.deal.la = st.assists || 0; }
    D.apply = function (player, club, d) {
      const r = oApply.apply(this, arguments);
      try { if (hasExtra(d)) { stash(player, d); describeNote(player, d); } } catch (e) { console.error(e); }
      return r;
    };
    D.describe = function (d) {
      let s = oDesc.apply(this, arguments) || "";
      const b = [];
      if (d && d.mbN && d.mbA) b.push(`${money(d.mbA)} si ${d.mbN} matchs`);
      if (d && d.gbN && d.gbA) b.push(`${money(d.gbA)} si ${d.gbN} buts`);
      if (d && d.ast) b.push(`${money(d.ast)}/passe décisive`);
      if (d && d.raise) b.push(`+${d.raise} %/saison`);
      if (d && d.cut) b.push(`−${d.cut} % si relégation`);
      if (d && d.auto) b.push(`prolongation auto. après ${d.auto} matchs`);
      return [s, b.join(" · ")].filter(Boolean).join(" · ");
    };
    function describeNote(p, d) {
      const t = D.describe({ mbN: d.mbN, mbA: d.mbA, gbN: d.gbN, gbA: d.gbA, ast: d.ast, raise: d.raise, cut: d.cut, auto: d.auto });
      if (t) note(`Clauses avancées avec ${p.lastName} : ${t}.`);
    }
    // les transferts passent par transferPlayer(opts.deal), pas par dsDeal.apply
    const oTr = window.transferPlayer;
    window.transferPlayer = function (player, fromId, toId, fee, opts) {
      const r = oTr.apply(this, arguments);
      try { const d = opts && opts.deal; if (d && hasExtra(d) && isUserClub(toId)) { stash(player, d); describeNote(player, d); } } catch (e) { console.error(e); }
      return r;
    };
  }

  function tickClauses() {
    userClubs().forEach((club) => club.players.forEach((p) => {
      const d = p.deal; if (!d || !hasExtra(d)) return;
      const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
      const yr = state.season.year;
      if (d.yr !== yr) { d.yr = yr; d.mbP = false; d.gbP = false; d.la = st.assists || 0; }
      const pay = (amt, why) => { club.budget -= amt; d.paid = (d.paid || 0) + amt; note(`${why} versé à ${p.lastName} : ${money(amt)}.`); };
      if (d.mbN && d.mbA && !d.mbP && st.matches >= d.mbN) { d.mbP = true; pay(d.mbA, `Bonus de présence (${d.mbN} matchs)`); }
      if (d.gbN && d.gbA && !d.gbP && st.goals >= d.gbN) { d.gbP = true; pay(d.gbA, `Bonus de buts (${d.gbN} buts)`); }
      if (d.ast) { let da = (st.assists || 0) - (d.la || 0); if (da < 0) da = st.assists || 0; d.la = st.assists || 0; if (da > 0) { club.budget -= da * d.ast; d.paid = (d.paid || 0) + da * d.ast; } }
    }));
  }

  const oRoll = window.seasonRollover;
  window.seasonRollover = function () {
    let pre = null;
    try {
      pre = { div: {}, auto: [] };
      userClubs().forEach((c) => {
        pre.div[c.id] = c.division;
        c.players.forEach((p) => { const d = p.deal; if (d && d.auto && ((p.seasonStats || {}).matches || 0) >= d.auto) pre.auto.push(p.id); });
      });
    } catch (e) { pre = null; }
    const r = oRoll.apply(this, arguments);
    try {
      if (pre) userClubs().forEach((c) => {
        const rel = pre.div[c.id] != null && c.division > pre.div[c.id];
        c.players.forEach((p) => {
          const d = p.deal; if (!d || !hasExtra(d)) return;
          if (d.raise) { p.wage = Math.round(p.wage * (1 + d.raise / 100) / 100) * 100; note(`Salaire progressif : ${p.lastName} passe à ${money(p.wage)}/mois.`); }
          if (rel && d.cut) { p.wage = Math.max(500, Math.round(p.wage * (1 - d.cut / 100) / 100) * 100); note(`Clause de relégation : le salaire de ${p.lastName} baisse de ${d.cut} % (${money(p.wage)}/mois).`); }
          if (pre.auto.includes(p.id) && (p.contractEndYear || 0) - new Date(state.date).getFullYear() <= 1) { p.contractEndYear += 1; note(`Prolongation automatique : ${p.lastName} est lié au club jusqu'en ${p.contractEndYear}.`); }
        });
        recomputeWageBill(c);
      });
    } catch (e) { console.error("clauses de saison", e); }
    return r;
  };

  // ===================================================================
  // 2. PRÊTS PLUS RICHES
  // ===================================================================
  function injectLoanFields() {
    const modal = document.getElementById("loan-modal"); if (!modal) return;
    const footer = modal.querySelector(".creation-footer"); if (!footer || modal.querySelector(".ln2")) return;
    const sel = (id, opts) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>`;
    footer.insertAdjacentHTML("beforebegin", `<div class="ln2"><h4 style="margin:10px 0 4px;">Conditions avancées du prêt</h4>
      <label class="field"><span>Temps de jeu minimum garanti (% des matchs du club d'accueil)</span>${sel("ln-min", [[0, "Aucun"], [30, "30 %"], [40, "40 %"], [50, "50 %"], [60, "60 %"], [70, "70 %"]])}</label>
      <label class="field"><span>Part du salaire payée par le club prêteur</span>${sel("ln-share", [[0, "0 % (l'accueil paie tout)"], [25, "25 %"], [50, "50 %"], [75, "75 %"], [100, "100 %"]])}</label>
      <label class="field"><span>Clause de rappel en janvier (sans indemnité)</span>${sel("ln-jan", [[0, "Non"], [1, "Oui"]])}</label>
      <p class="hint" id="ln-hint">Sans clause, un rappel anticipé coûte une indemnité au prêteur. Un temps de jeu garanti non respecté donne une compensation au prêteur.</p></div>`);
  }
  ["openLoanOutModal", "openLoanInModal"].forEach((name) => {
    const o = window[name]; if (typeof o !== "function") return;
    window[name] = function () { const r = o.apply(this, arguments); try { injectLoanFields(); } catch (e) { console.error(e); } return r; };
  });

  const SLOTS = { GB: 1, DEF: 4, MIL: 4, ATT: 2 };
  function hostRefusal(p, host, o, kind) {
    const better = host.players.filter((x) => x.position === p.position && x.overall >= p.overall && !x.onLoan).length;
    const slots = SLOTS[p.position] || 2;
    if (o.min >= 50 && better >= slots) return `${host.name} ne peut pas garantir ${o.min} % de temps de jeu à un joueur de ce niveau : baissez l'exigence.`;
    if (o.min >= 30 && better >= slots + 2) return `${host.name} dispose de trop de joueurs devant ${p.lastName} pour garantir du temps de jeu.`;
    if (kind === "out" && o.share === 0) {
      const room = typeof wageBudgetRemaining === "function" ? wageBudgetRemaining(host) : 1e9;
      if (p.wage > room) return `${host.name} n'a pas la marge salariale pour ${pn(p)} (${money(p.wage)}/mois) : proposez de payer une partie du salaire.`;
    }
    return null;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("#confirm-loanout, #confirm-loanin"); if (!b || !ready()) return;
    const g = (id) => { const x = document.getElementById(id); return x ? parseInt(x.value, 10) || 0 : 0; };
    const o = { min: g("ln-min"), share: g("ln-share"), jan: g("ln-jan"), kind: b.id === "confirm-loanout" ? "out" : "in" };
    const modal = document.getElementById("loan-modal");
    let pid = null; try { const m = ((modal.querySelector("h3") || {}).textContent || "").trim(); const all = allClubs().flatMap((c) => c.players); pid = (all.find((p) => m.endsWith(pn(p))) || {}).id; } catch (x) {}
    const p = pid && getPlayer(pid);
    if (p) {
      const host = o.kind === "out" ? getClub(parseInt((document.getElementById("loan-target") || {}).value, 10)) : userClub();
      const why = host ? hostRefusal(p, host, o, o.kind) : null;
      if (why) { e.stopImmediatePropagation(); e.preventDefault(); const h = document.getElementById("ln-hint"); if (h) { h.textContent = "❌ " + why; h.className = "hint result-bad"; } return; }
    }
    window.__loanOpts = o;
  }, true);

  const oLoan = window.loanPlayerOut;
  window.loanPlayerOut = function (player) {
    const r = oLoan.apply(this, arguments);
    try {
      const o = window.__loanOpts; window.__loanOpts = null;
      if (o && player.onLoan && (o.min || o.share || o.jan)) {
        const l = player.onLoan, host = getClub(l.toClubId);
        l.min = o.min; l.share = o.share; l.jan = !!o.jan; l.start = day(); l.breach = 0;
        l.hostP0 = host ? host.played || 0 : 0; l.pM0 = (player.seasonStats || {}).matches || 0; l.chk = day();
        const bits = [];
        if (o.min) bits.push(`${o.min} % de temps de jeu garanti`);
        if (o.share) bits.push(`${o.share} % du salaire payé par le prêteur`);
        if (o.jan) bits.push("rappel possible en janvier");
        note(`Conditions du prêt de ${player.lastName} : ${bits.join(", ")}.`);
      }
    } catch (e) { console.error(e); }
    return r;
  };

  function allLoans() {
    const out = [];
    allClubs().forEach((c) => c.players.forEach((p) => { const l = p.onLoan; if (l && l.fromClubId !== c.id) out.push({ p, l, host: c, parent: getClub(l.fromClubId) }); }));
    return out;
  }
  function shareNow(x) {
    const st = x.p.seasonStats || { matches: 0 }; const hg = Math.max(0, (x.host.played || 0) - (x.l.hostP0 || 0));
    const pm = Math.max(0, st.matches - (x.l.pM0 || 0));
    return { hg, pm, pct: hg ? Math.min(100, Math.round(pm / hg * 100)) : null };
  }
  function recallInfo(p) {
    const l = p.onLoan; if (!l) return null;
    const jan = new Date(state.date).getUTCMonth() === 0;
    const free = !!(l.freeRecall || (l.jan && jan));
    const cost = free ? 0 : Math.max(1000, Math.round((p.wage * 3 + p.value * 0.02) / 1000) * 1000);
    return { free, cost, jan };
  }

  function loansMonthly() {
    allLoans().forEach((x) => {
      const l = x.l; if (!l.share || !x.parent) return;
      const amt = Math.round(x.p.wage * l.share / 100);
      if (amt <= 0) return;
      x.parent.budget -= amt; x.host.budget += amt;
      if (isUserClub(x.parent.id)) note(`Prêt de ${x.p.lastName} : vous financez ${l.share} % du salaire (${money(amt)}).`);
      else if (isUserClub(x.host.id)) note(`Prêt de ${x.p.lastName} : ${x.parent.name} prend en charge ${l.share} % du salaire (${money(amt)}/mois).`);
    });
  }
  function loansWeekly2() {
    const jan = new Date(state.date).getUTCMonth() === 0;
    allLoans().forEach((x) => {
      const l = x.l, involved = isUserClub(x.parent && x.parent.id) || isUserClub(x.host.id);
      if (l.min && day() - (l.chk || 0) >= 28) {
        l.chk = day();
        const s = shareNow(x);
        if (s.hg >= 4 && s.pct < l.min) {
          l.breach = (l.breach || 0) + 1;
          const comp = Math.round(x.p.wage * 2 / 1000) * 1000;
          if (x.parent) { x.host.budget -= comp; x.parent.budget += comp; }
          if (involved) mail("players", x.host.name, `Prêt de ${pn(x.p)} : temps de jeu insuffisant`, `<p>Le contrat de prêt garantissait <b>${l.min} %</b> de temps de jeu à <b>${esc(pn(x.p))}</b> ; il n'a participé qu'à <b>${s.pct} %</b> des matchs de ${esc(x.host.name)} (${s.pm}/${s.hg}).</p><p>${isUserClub(x.parent.id) ? `Compensation reçue : ${money(comp)}.` : isUserClub(x.host.id) ? `Compensation versée à ${esc(x.parent.name)} : ${money(comp)}. Faites-le jouer, sinon il sera rappelé.` : ""}</p>`);
          if (l.breach >= 2) {
            l.freeRecall = true;
            if (isUserClub(x.host.id)) { l.until = todayKey(); try { checkLoanReturns(); } catch (e) {} mail("players", x.parent.name, `${pn(x.p)} est rappelé par son club`, `<p>${esc(x.parent.name)} met fin au prêt de <b>${esc(pn(x.p))}</b> : la clause de temps de jeu n'a pas été respectée à deux reprises.</p>`); }
            else if (isUserClub(x.parent.id)) toast(`${x.p.lastName} : rappel gratuit possible (clause non respectée)`);
          }
        } else if (involved && s.hg >= 4 && isUserClub(x.parent.id) && !l.jan) {
          mail("players", `Suivi de prêt — ${x.host.name}`, `${pn(x.p)} : ${s.pct}% des matchs`, `<p>${esc(pn(x.p))} a disputé ${s.pm} des ${s.hg} matchs de ${esc(x.host.name)} (${s.pct} %). Clause de temps de jeu (${l.min} %) respectée.</p>`);
        }
      }
      // le club prêteur (IA) rappelle parfois son joueur en janvier
      if (jan && l.jan && x.parent && !isUserClub(x.parent.id) && isUserClub(x.host.id) && (day() % 7 === 0) && Math.random() < 0.18) {
        l.until = todayKey(); try { checkLoanReturns(); } catch (e) {}
        mail("players", x.parent.name, `${pn(x.p)} rappelé en janvier`, `<p>${esc(x.parent.name)} exerce la clause de rappel de janvier : <b>${esc(pn(x.p))}</b> retourne dans son club.</p>`);
      }
    });
  }

  // bouton « Rappeler » : indemnité si pas de clause
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-dp-recall]"); if (!b || !ready()) return;
    const p = getPlayer(parseInt(b.dataset.dpRecall, 10)); if (!p || !p.onLoan) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const info = recallInfo(p), club = userClub(), host = getClub(p.onLoan.toClubId);
    if (info.cost > 0) {
      if (club.budget < info.cost) { toast(`Indemnité de rappel : ${money(info.cost)} — trésorerie insuffisante`); return; }
      club.budget -= info.cost; if (host) host.budget += info.cost;
      note(`Rappel anticipé de ${pn(p)} : indemnité de ${money(info.cost)} versée à ${host ? host.name : "son club d'accueil"}.`);
    }
    p.onLoan.until = todayKey(); try { checkLoanReturns(); } catch (x) {}
    note(`${pn(p)} est rappelé de son prêt${info.free ? " (clause de rappel)" : ""}.`);
    try { saveGame(); render(); } catch (x) {}
    toast(info.cost ? `Joueur rappelé (indemnité ${money(info.cost)})` : "Joueur rappelé sans indemnité");
  }, true);

  const oSub = window.renderSubTeamTab;
  if (typeof oSub === "function") window.renderSubTeamTab = function (kind) {
    let html = oSub.apply(this, arguments);
    try {
      if (kind !== "u19" || !ready()) return html;
      html = html.replace(/data-dp-recall="(\d+)">Rappeler</g, (m, id) => {
        const p = getPlayer(parseInt(id, 10)); const i = p && recallInfo(p);
        return `data-dp-recall="${id}">Rappeler${i ? (i.free ? " (gratuit)" : ` (${money(i.cost)})`) : ""}<`;
      });
      const club = userClub();
      const loans = allLoans().filter((x) => (x.parent && x.parent.id === club.id) || x.host.id === club.id);
      const rows = loans.map((x) => { const s = shareNow(x); const sense = x.host.id === club.id ? "reçu de " + esc(x.parent ? x.parent.name : "?") : "prêté à " + esc(x.host.name); return `<tr><td>${esc(pn(x.p))}</td><td>${sense}</td><td>${x.l.min ? x.l.min + " %" : "—"}</td><td>${s.pct == null ? "—" : s.pct + " %"}</td><td>${x.l.share ? x.l.share + " %" : "—"}</td><td>${x.l.jan ? "oui" : "non"}</td><td>${x.l.breach || 0}</td></tr>`; }).join("");
      if (rows) html += `<div class="fm-dark fm-panel"><h3 class="panel-subtitle">Conditions des prêts</h3><div class="table-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Prêt</th><th>Temps de jeu garanti</th><th>Réalisé</th><th>Salaire du prêteur</th><th>Rappel janvier</th><th>Manquements</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    } catch (e) { console.error(e); }
    return html;
  };

  const oAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = oAdv.apply(this, arguments);
    try {
      if (ready()) {
        tickClauses();
        const d = day();
        if (d % 30 === 0) loansMonthly();
        if (d % 7 === 0) loansWeekly2();
      }
    } catch (e) { console.error("bloc18 contrats/prêts", e); }
    return r;
  };

  window.dsContracts2 = { tickClauses, recallInfo, loansMonthly, loansWeekly2, shareNow, allLoans, hostRefusal, KEYS };
})();
