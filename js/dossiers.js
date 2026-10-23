// =====================================================================
// BLOC 17 : DOSSIERS DE RECRUTEMENT + MERCATO DES AUTRES CLUBS + CONSÉQUENCES DE SAISON
//  1. Dossier de recrutement dans la fiche joueur (rapports, prix, salaire, concurrents,
//     avis du staff) + comparateur de 2 à 3 candidats au même poste
//  2. Les clubs IA ont des besoins, des budgets et des plans ; leurs achats alimentent
//     un fil d'actualité du mercato avec la raison du transfert
//  3. Conséquences sportives : confiance du président, enveloppe de transferts, offres
//     d'autres clubs ; relégation = joueurs mécontents ; clubs en difficulté = vendent moins cher
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = () => (typeof state !== "undefined" && state && state.dayCounter) || 0;
  const money = (v) => fmtMoney(Math.round(v));
  const pn = (p) => `${p.firstName} ${p.lastName}`;
  const POSL = { GB: "gardien", DEF: "défenseur", MIL: "milieu", ATT: "attaquant" };
  const POSP = { GB: "gardiens", DEF: "défenseurs", MIL: "milieux", ATT: "attaquants" };
  const ready = () => typeof state !== "undefined" && state && state.ds && typeof userClub === "function" && userClub();
  const MK = () => { state.mk = state.mk || { feed: [], hits: [], cmp: [], seq: 0 }; state.mk.cmp = state.mk.cmp || []; state.mk.feed = state.mk.feed || []; state.mk.hits = state.mk.hits || []; return state.mk; };
  const CS = () => { state.cs = state.cs || { mods: {}, hist: [] }; state.cs.mods = state.cs.mods || {}; state.cs.hist = state.cs.hist || []; return state.cs; };
  const mail = (folder, sender, subject, html) => { try { dsMail(folder, sender, subject, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };

  // ------------------------------------------------------------------
  // Difficulté financière / mécontentement : prix plancher d'un joueur
  // ------------------------------------------------------------------
  function distressOf(c) {
    if (!c || isUserClub(c.id)) return null;
    const w = c.wageBill || 0;
    let d = 1; const why = [];
    if (c.budget < 0) { d = 0.8; why.push(`trésorerie négative (${money(c.budget)})`); }
    else if (w > 0 && c.budget < w * 1.5) { d = 0.85; why.push("trésorerie quasi nulle"); }
    else if (w > 0 && c.budget < w * 3) { d = 0.9; why.push("finances très tendues"); }
    else if (w > 0 && c.budget < w * 4.5) { d = 0.95; why.push("finances tendues"); }
    return d < 1 ? { d, why } : null;
  }
  function grudgeOf(p) {
    const g = p.relegGrudge;
    return g && g.until > day() && g.clubId === p.clubId && !isUserClub(p.clubId) ? g : null;
  }
  // facteur appliqué au prix demandé (≤ 1) pour un joueur d'un autre club
  function discountOf(p) {
    const c = getClub(p.clubId);
    if (!c || isUserClub(c.id)) return { disc: 1, reasons: [] };
    let disc = 1; const reasons = [];
    const ds = distressOf(c);
    if (ds) { disc *= ds.d; reasons.push(`${c.name} est en difficulté financière (${ds.why[0]})`); }
    const g = grudgeOf(p);
    if (g) { disc *= 0.9; reasons.push(`${p.lastName} est mécontent de la relégation de ${c.name}`); }
    disc = Math.max(0.72, disc);
    return { disc, reasons };
  }

  // ------------------------------------------------------------------
  // Besoins / plans des clubs IA
  // ------------------------------------------------------------------
  const NC = { day: -1, map: {} };
  function needsOf(c) {
    if (NC.day !== day()) { NC.day = day(); NC.map = {}; }
    if (!NC.map[c.id]) { try { NC.map[c.id] = window.fm24 && fm24.recruitNeeds ? fm24.recruitNeeds(c) : []; } catch (e) { NC.map[c.id] = []; } }
    return NC.map[c.id];
  }
  function planOf(c) {
    const needs = needsOf(c); const top = needs[0] || null;
    const budget = getTransferBudget(c);
    const ds = distressOf(c);
    const lg = c.tierFactor || 0.5;
    let type = "renfort", label = "Renfort ciblé";
    if (ds) { type = "assainir"; label = "Assainir les comptes (vendre)"; }
    else if (budget > 25e6 || (c.reputation >= 80 && budget > 8e6)) { type = "star"; label = "Recruter un joueur d'impact"; }
    else if (lg < 0.45) { type = "jeunes"; label = "Miser sur les jeunes à petit prix"; }
    return { type, label, budget, needs, top, maxFee: Math.round(budget * (type === "star" ? 0.8 : 0.55)) };
  }
  function whyBuy(buyer, p, seller) {
    const parts = [];
    const needs = needsOf(buyer); const n = needs.find((x) => x.pos === p.position);
    if (n && n.score > 0) {
      const rk = needs.indexOf(n) + 1;
      parts.push(rk === 1 ? `priorité n°1 du club : ${POSP[p.position]}` : `besoin au poste de ${POSL[p.position]}`);
      if (n.reasons && n.reasons[0]) parts.push(n.reasons[0]);
    } else parts.push("opportunité de marché");
    const ds = distressOf(seller);
    if (ds) parts.push(`vendeur en difficulté (${ds.why[0]})`);
    if (p.relegGrudge && p.relegGrudge.clubId === (seller && seller.id)) parts.push("joueur mécontent après la relégation");
    const m = (p.contractEndYear || 9999) - new Date(state.date).getFullYear();
    if (m <= 0) parts.push("contrat arrivant à terme");
    return parts.join(" · ");
  }

  // ------------------------------------------------------------------
  // Fil d'actualité du mercato : capte tous les transferts hors utilisateur
  // ------------------------------------------------------------------
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee) {
    let info = null;
    try {
      if (ready() && !isUserClub(fromId) && !isUserClub(toId)) {
        const buyer = getClub(toId), seller = getClub(fromId);
        info = { reason: window.__mkReason || whyBuy(buyer, player, seller), buyer: buyer.name, seller: seller.name, forced: !!distressOf(seller) };
      }
    } catch (e) { info = null; }
    const r = origTransfer.apply(this, arguments);
    try {
      if (info) {
        const m = MK();
        const e = { id: ++m.seq, day: day(), date: fmtDate(state.date), pid: player.id, name: pn(player), pos: player.position, age: player.age, ovr: player.overall, from: fromId, to: toId, fromName: info.seller, toName: info.buyer, fee: Math.round(fee || 0), reason: info.reason, forced: info.forced, country: (getClub(toId) || {}).countryKey };
        m.feed.unshift(e); if (m.feed.length > 160) m.feed.length = 160;
        const club = userClub();
        const sl = (club && club.scouting && club.scouting.shortlist) || [];
        if (sl.includes(player.id) || m.cmp.includes(player.id)) {
          e.hit = true; m.hits.unshift({ day: day(), pid: player.id });
          mail("transfers", info.buyer, `💔 ${info.buyer} vous coiffe sur ${pn(player)}`,
            `<p><b>${esc(pn(player))}</b> (${esc(POSL[player.position])}, ${player.age} ans, niv. ${player.overall}) signe à <b>${esc(info.buyer)}</b> pour ${money(fee)}.</p>
             <p><b>Pourquoi ?</b> ${esc(info.reason)}.</p>
             <p class="hint">Astuce : le Radar ▸ « Mercato des clubs » montre les besoins et budgets des clubs pour anticiper ces coups.</p>`);
          m.cmp = m.cmp.filter((x) => x !== player.id);
        }
      }
    } catch (e) { console.warn("fil mercato", e); }
    return r;
  };

  // achats pilotés par les besoins des clubs
  function attemptBuy(b, forceSeller) {
    if (b.players.length >= 30) return false;
    const plan = planOf(b);
    if (plan.budget < 150000 || !plan.needs.length) return false;
    const n = plan.needs[Math.random() < 0.7 ? 0 : Math.min(1, plan.needs.length - 1)];
    if (!n || n.score <= 0) return false;
    const all = allClubs().filter((c) => c.id !== b.id && !isUserClub(c.id) && c.players.length >= 19);
    const sellers = [];
    for (let i = 0; i < 7; i++) sellers.push(pick(all));
    if (forceSeller) sellers.push(forceSeller);
    let best = null, bs = -1e9;
    sellers.forEach((s) => {
      if (!s || s.id === b.id) return;
      const sellerDs = distressOf(s);
      s.players.forEach((p) => {
        if (p.position !== n.pos || p.onLoan || p.overall < n.target - 2) return;
        if (plan.type === "jeunes" && p.age > 23) return;
        if (p.overall > n.target + (plan.type === "star" ? 9 : 4)) return;
        let price = p.value * (sellerDs ? sellerDs.d : 1) * (grudgeOf(p) ? 0.92 : 1);
        if (price > plan.maxFee) return;
        const sc = p.overall * 2 + p.potential * 0.5 - price / 1e6 * 0.8 + (sellerDs ? 6 : 0) + (grudgeOf(p) ? 5 : 0) + Math.random() * 6;
        if (sc > bs) { bs = sc; best = { p, s, price }; }
      });
    });
    if (!best) return false;
    const fee = Math.max(10000, Math.round(best.price * (0.97 + Math.random() * 0.1) / 1000) * 1000);
    if (b.budget < fee) return false;
    window.__mkReason = null;
    origTransferSafe(best.p, best.s.id, b.id, fee);
    return true;
  }
  function origTransferSafe(p, from, to, fee) { try { window.transferPlayer(p, from, to, fee); } finally { window.__mkReason = null; } }

  function mkTick() {
    if (!ready() || !currentWindow()) return;
    const left = window.fm24 && fm24.daysToClose ? fm24.daysToClose() : 30;
    const clubs = allClubs().filter((c) => !isUserClub(c.id));
    const trials = left <= 5 ? 16 : 10, p = left <= 5 ? 0.3 : 0.2;
    for (let i = 0; i < trials; i++) if (Math.random() < p) attemptBuy(pick(clubs));
    // ventes forcées : un club en difficulté cherche à se délester
    const hard = clubs.filter((c) => distressOf(c) && c.players.length > 20);
    if (hard.length && Math.random() < 0.35) {
      const s = pick(hard), b = pick(clubs.filter((c) => c.id !== s.id && c.budget > 1e6));
      if (b) attemptBuy(b, s);
    }
  }

  // ------------------------------------------------------------------
  // Dossier de recrutement
  // ------------------------------------------------------------------
  function knowledge(p) { try { return isUserClub(p.clubId) ? 100 : knowledgeOfPlayerForUser(p); } catch (e) { return 60; } }
  function ovrEst(p) {
    const pk = knowledge(p); if (pk >= 90) return { v: p.overall, txt: String(p.overall) };
    const j = Math.round((hashUnit(p.id) - 0.5) * 2 * (100 - pk) / 14);
    return { v: p.overall + j, txt: `≈${p.overall + j}` };
  }
  function reportsOf(p) {
    const club = userClub(); const sc = ensureScouting(club);
    return sc.reports.filter((r) => r.playerId === p.id);
  }
  function competitorsOf(p) {
    const club = userClub();
    const list = [];
    allClubs().forEach((c) => {
      if (c.id === club.id || c.id === p.clubId || isUserClub(c.id)) return;
      const bud = getTransferBudget(c);
      if (bud < p.value * 0.85) return;
      const needs = needsOf(c); const i = needs.findIndex((x) => x.pos === p.position);
      if (i < 0 || i > 1 || needs[i].score <= 0) return;
      const n = needs[i];
      if (p.overall < n.mine - 1) return;
      list.push({ c, budget: bud, rank: i + 1, score: needs[i].score + bud / p.value * 5, reason: n.reasons[0] || "besoin au poste" });
    });
    return list.sort((a, b) => b.score - a.score).slice(0, 4);
  }
  function priceOf(p) {
    const rep = reportsOf(p).find((r) => r.d);
    const mult = p.age <= 23 ? 1.15 : p.age >= 31 ? 0.8 : 0.97;
    const advice = rep && rep.d ? rep.d.advice : Math.round(p.value * mult / 10000) * 10000;
    const dd = discountOf(p);
    const floor = Math.round(p.value * dd.disc / 10000) * 10000;
    return { value: p.value, advice, floor, disc: dd.disc, reasons: dd.reasons, release: p.releaseClause || 0 };
  }
  function wageOf(p) {
    const rep = reportsOf(p).find((r) => r.d);
    return rep && rep.d ? rep.d.wage : Math.round(p.wage * 1.2 / 100) * 100;
  }
  function staffOpinion(p) {
    const club = userClub(); const out = [];
    const xi = club.players.filter((x) => x.position === p.position && !x.onLoan).sort((a, b) => b.overall - a.overall);
    const slots = ({ GB: 1, DEF: 4, MIL: 4, ATT: 2 })[p.position] || 2;
    const ref = xi[slots - 1] || xi[xi.length - 1];
    const est = ovrEst(p).v;
    let fit, fitScore;
    if (!ref) { fit = "Le poste est vacant : il jouerait tout de suite."; fitScore = 2; }
    else if (est >= ref.overall + 3) { fit = `Titulaire indiscutable : +${est - ref.overall} sur ${ref.lastName}.`; fitScore = 2; }
    else if (est >= ref.overall) { fit = `Passerait titulaire de peu devant ${ref.lastName}.`; fitScore = 1; }
    else if (p.potential >= ref.overall + 6 && p.age <= 22) { fit = "Pas prêt aujourd'hui, mais un vrai pari sur l'avenir."; fitScore = 0; }
    else { fit = `Resterait remplaçant (${ref.lastName} est meilleur).`; fitScore = -1; }
    const coach = staffByRole(club, "entraineur")[0] || staffByRole(club, "adjoint")[0];
    out.push({ who: coach ? `${coach.firstName} ${coach.lastName} (entraîneur)` : "Staff technique", txt: fit, score: fitScore });
    const prone = (p.id * 7) % 10;
    const kine = staffByRole(club, "kine")[0];
    const inj = prone >= 8 ? "Profil fragile : blessures fréquentes à prévoir." : prone >= 5 ? "Dossier médical sans alerte particulière." : "Physique très solide.";
    out.push({ who: kine ? `${kine.firstName} ${kine.lastName} (kiné)` : "Médecin du club", txt: inj, score: prone >= 8 ? -1 : prone < 5 ? 1 : 0 });
    const budget = getTransferBudget(club), pr = priceOf(p), w = wageOf(p);
    const wRoom = typeof wageBudgetRemaining === "function" ? wageBudgetRemaining(club) : 1e9;
    let fin, fs = 0;
    if (pr.floor > budget) { fin = `Hors budget : il manque ${money(pr.floor - budget)}.`; fs = -2; }
    else if (w > wRoom) { fin = `Le salaire (${money(w)}/mois) dépasse la marge salariale (${money(wRoom)}).`; fs = -1; }
    else if (pr.floor > budget * 0.7) { fin = "Absorberait l'essentiel de l'enveloppe de transferts."; fs = 0; }
    else { fin = "Largement finançable."; fs = 1; }
    out.push({ who: "Direction financière", txt: fin, score: fs });
    const an = staffByRole(club, "analyste")[0];
    const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
    if (an) out.push({ who: `${an.firstName} ${an.lastName} (analyste)`, txt: st.matches ? `${st.goals} but(s) et ${st.assists} passe(s) en ${st.matches} match(s) cette saison.` : "Pas assez de matchs pour une analyse fiable.", score: 0 });
    const total = out.reduce((s, o) => s + o.score, 0);
    const verdict = total >= 3 ? ["Recommandé", "ok"] : total >= 1 ? ["À étudier", "mid"] : ["Déconseillé", "ko"];
    return { items: out, total, verdict };
  }
  function dossier(p) {
    const reps = reportsOf(p), pr = priceOf(p), comp = competitorsOf(p), so = staffOpinion(p);
    return { p, reps, pr, wage: wageOf(p), comp, so, ovr: ovrEst(p), pk: knowledge(p) };
  }

  function dosHTML(p) {
    const club = userClub(); const d = dossier(p); const sc = ensureScouting(club);
    const inList = sc.shortlist.includes(p.id), inCmp = MK().cmp.includes(p.id);
    const budget = getTransferBudget(club);
    const repHtml = d.reps.length ? d.reps.slice(0, 3).map((r) => `<div class="dos-rep"><b>${esc(r.scoutName)}</b> <span class="hint">${esc(r.date)}</span> — <span class="dos-v dos-${r.verdict === "Recruter" ? "ok" : r.verdict === "À suivre" ? "mid" : "ko"}">${esc(r.verdict)}</span><div class="hint">${esc(r.text)}</div>${r.d ? `<div class="hint">Potentiel estimé ${r.d.lo}–${r.d.hi} · ${esc(r.d.persona)} · ${esc(r.d.injury)} · risques : ${esc(r.d.risk)}</div>` : ""}</div>`).join("")
      : `<p class="hint">Aucun rapport de scout sur ce joueur pour l'instant.</p><button class="btn btn-small btn-ghost" data-dos="obs:${p.id}">🔭 Demander une observation</button>`;
    const compHtml = d.comp.length ? `<ul class="dos-list">${d.comp.map((x) => `<li><b>${esc(x.c.name)}</b> — ${esc(x.reason)} · budget ${money(x.budget)}${x.rank === 1 ? ' <span class="dos-v dos-ko">priorité n°1</span>' : ""}</li>`).join("")}</ul>` : `<p class="hint">Aucun club ne semble en position de le convoiter.</p>`;
    const so = d.so.items.map((o) => `<li><b>${esc(o.who)}</b> : ${esc(o.txt)}</li>`).join("");
    const discLine = d.pr.disc < 1 ? `<div class="dos-flag">💸 ${esc(d.pr.reasons.join(" · "))} : prix plancher estimé <b>${money(d.pr.floor)}</b> (≈ −${Math.round((1 - d.pr.disc) * 100)} %).</div>` : "";
    return `<div class="dos" data-dospid="${p.id}">
      <h3 class="panel-subtitle">🗂️ Dossier de recrutement <span class="dos-v dos-${d.so.verdict[1]}">${d.so.verdict[0]}</span></h3>
      <div class="dos-actions">
        <button class="btn btn-small ${inList ? "btn-primary" : "btn-ghost"}" data-dos="list:${p.id}">${inList ? "★ Dans ma liste" : "☆ Suivre"}</button>
        <button class="btn btn-small ${inCmp ? "btn-primary" : "btn-ghost"}" data-dos="cmp:${p.id}">${inCmp ? "✔ En comparaison" : "⚖️ Comparer"}</button>
      </div>
      <div class="dos-grid">
        <div><span class="hint">Niveau / potentiel</span><b>${d.ovr.txt} / ${d.pk >= 90 ? p.potential : "?"}</b></div>
        <div><span class="hint">Valeur</span><b>${money(d.pr.value)}</b></div>
        <div><span class="hint">Prix conseillé</span><b>${money(d.pr.advice)}</b></div>
        <div><span class="hint">Salaire demandé</span><b>${money(d.wage)}/mois</b></div>
        <div><span class="hint">Clause libératoire</span><b>${d.pr.release ? money(d.pr.release) : "—"}</b></div>
        <div><span class="hint">Votre enveloppe</span><b>${money(budget)}</b></div>
      </div>${discLine}
      <h4 class="dos-h">Rapports de scouts</h4>${repHtml}
      <h4 class="dos-h">Concurrents sur le coup</h4>${compHtml}
      <h4 class="dos-h">Avis du staff</h4><ul class="dos-list">${so}</ul>
      <div id="dos-cmp">${compareHTML(p.id)}</div>
    </div>`;
  }

  // comparateur : 2 à 3 candidats (de préférence au même poste)
  function compareHTML(hl) {
    const m = MK(); const ids = m.cmp.filter((id) => getPlayer(id));
    if (!ids.length) return `<p class="hint">Ajoutez 2 ou 3 candidats avec « ⚖️ Comparer » pour les mettre côte à côte.</p>`;
    if (ids.length < 2) return `<p class="hint">Comparaison : 1 candidat retenu (${esc(pn(getPlayer(ids[0])))}). Ajoutez-en un autre au même poste.</p>`;
    const ds = ids.map((id) => dossier(getPlayer(id)));
    const rows = [
      ["Poste", (d) => POSL[d.p.position], null],
      ["Âge", (d) => d.p.age, (d) => -d.p.age],
      ["Niveau", (d) => d.ovr.txt, (d) => d.ovr.v],
      ["Potentiel", (d) => d.pk >= 90 ? d.p.potential : "?", (d) => d.pk >= 90 ? d.p.potential : null],
      ["Club", (d) => esc((getClub(d.p.clubId) || {}).name || "—"), null],
      ["Prix estimé", (d) => money(d.pr.floor), (d) => -d.pr.floor],
      ["Salaire demandé", (d) => money(d.wage) + "/m", (d) => -d.wage],
      ["Fin de contrat", (d) => d.p.contractEndYear, (d) => -d.p.contractEndYear],
      ["Concurrents", (d) => d.comp.length, (d) => -d.comp.length],
      ["Avis du staff", (d) => `<span class="dos-v dos-${d.so.verdict[1]}">${d.so.verdict[0]}</span>`, (d) => d.so.total],
    ];
    const head = `<tr><th></th>${ds.map((d) => `<th><button class="link-danger" data-playercard="${d.p.id}" style="color:var(--fm-accent,#c9a24a)">${esc(pn(d.p))}</button><br/><button class="btn btn-small btn-ghost" data-dos="cmp:${d.p.id}">retirer</button></th>`).join("")}</tr>`;
    const body = rows.map(([l, f, k]) => {
      let best = null;
      if (k) { const vals = ds.map(k); const mx = Math.max(...vals.filter((v) => v != null)); if (vals.filter((v) => v === mx).length < vals.length) best = mx; }
      return `<tr><th>${l}</th>${ds.map((d) => `<td class="${k && best != null && k(d) === best ? "dos-best" : ""}">${f(d)}</td>`).join("")}</tr>`;
    }).join("");
    const pos = new Set(ds.map((d) => d.p.position));
    const rank = ds.slice().sort((a, b) => b.so.total - a.so.total || a.pr.floor - b.pr.floor)[0];
    return `<h4 class="dos-h">⚖️ Comparaison des candidats</h4>${pos.size > 1 ? `<p class="hint">Attention : ces joueurs ne jouent pas au même poste.</p>` : ""}
      <div class="mx-scroll"><table class="fx-mini dos-cmp"><thead>${head}</thead><tbody>${body}</tbody></table></div>
      <p class="hint">Cases dorées : meilleur du lot sur la ligne. Le staff pencherait pour <b>${esc(pn(rank.p))}</b>.</p>`;
  }

  // ------------------------------------------------------------------
  // Fiche joueur : insertion du dossier
  // ------------------------------------------------------------------
  const origCard = window.openPlayerCard;
  window.openPlayerCard = function (id) {
    const r = origCard.apply(this, arguments);
    try {
      const p = getPlayer(id); if (!p || !ready() || isUserClub(p.clubId)) return r;
      const m = document.querySelector("#player-modal .modal"); if (!m || m.querySelector(".dos")) return r;
      const html = dosHTML(p);
      const tbl = m.querySelector("table.squad-table");
      if (tbl) tbl.insertAdjacentHTML("beforebegin", html); else m.insertAdjacentHTML("beforeend", html);
    } catch (e) { console.warn("dossier", e); }
    return r;
  };

  function reopenDos(pid) { try { const c = document.querySelector("#player-modal .modal"); if (c && document.querySelector(".dos")) { const sc = c.scrollTop; window.openPlayerCard(pid); c.scrollTop = sc; } } catch (e) {} }

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-dos]"); if (!b || b.disabled || !ready()) return;
    const [k, a] = b.getAttribute("data-dos").split(":"); const id = parseInt(a, 10); const club = userClub();
    if (k === "list") { toggleShortlist(club.id, id); try { saveGame(); } catch (x) {} refreshAny(id); }
    else if (k === "cmp") {
      const m = MK(); const i = m.cmp.indexOf(id);
      if (i >= 0) m.cmp.splice(i, 1);
      else {
        const p = getPlayer(id);
        if (m.cmp.length >= 3) { toast("3 candidats maximum : retirez-en un."); return; }
        const first = getPlayer(m.cmp[0]);
        if (first && p && first.position !== p.position) toast(`Attention : ${POSL[first.position]} et ${POSL[p.position]}.`);
        m.cmp.push(id);
      }
      try { saveGame(); } catch (x) {} refreshAny(id);
    }
    else if (k === "obs") { const r = requestObservation(club.id, id); toast(r.ok ? "Observation lancée (≈ 3 semaines)" : r.reason); }
    else if (k === "pv") { if (typeof ui !== "undefined") { ui.rx = ui.rx || {}; ui.rx.view = a; } }
  });
  function toast(t) { try { window.dsToast ? window.dsToast(t) : alert(t); } catch (e) {} }
  function refreshAny(pid) {
    const box = document.getElementById("dos-cmp");
    if (box && document.querySelector("#player-modal .dos")) { reopenDos(parseInt(document.querySelector(".dos").getAttribute("data-dospid"), 10)); return; }
    refreshRadar();
  }
  function refreshRadar() { const c = document.getElementById("tab-content"); if (c && ui.tab === "radar") c.innerHTML = renderRadar(); }

  // ------------------------------------------------------------------
  // Radar : vues « Mercato des clubs », « Dossiers », « Conséquences »
  // ------------------------------------------------------------------
  const FEEDF = () => { ui.mkf = ui.mkf || "all"; return ui.mkf; };
  function feedHTML() {
    const club = userClub(); const m = MK(); const f = FEEDF();
    const sl = (club.scouting && club.scouting.shortlist) || [];
    let list = m.feed.slice();
    if (f === "mine") list = list.filter((e) => e.country === club.countryKey);
    else if (f === "pistes") list = list.filter((e) => sl.includes(e.pid) || e.hit);
    else if (f === "big") list = list.filter((e) => e.fee >= 5e6);
    else if (f === "forced") list = list.filter((e) => e.forced);
    const chip = (k, l) => `<button class="${f === k ? "on" : ""}" data-dos="filt:${k}">${l}</button>`;
    const rows = list.slice(0, 40).map((e) => `<li class="${e.hit ? "dos-hit" : ""}"><span class="hint">${esc(e.date)}</span> <button class="link-danger" data-playercard="${e.pid}" style="color:var(--fm-accent,#c9a24a)">${esc(e.name)}</button> <span class="hint">(${esc(POSL[e.pos])}, ${e.age} ans, niv. ${e.ovr})</span> : ${esc(e.fromName)} ➜ <b>${esc(e.toName)}</b> · ${money(e.fee)}${e.forced ? ' <span class="dos-v dos-mid">vente forcée</span>' : ""}${e.hit ? ' <span class="dos-v dos-ko">vous coiffe</span>' : ""}<div class="hint">↳ ${esc(e.reason)}</div></li>`).join("");
    return `<div class="eu-subnav">${chip("all", "Tous")}${chip("mine", "Mon pays")}${chip("pistes", "Mes pistes")}${chip("big", "Gros coups")}${chip("forced", "Ventes forcées")}</div>
      <ul class="dos-feed">${rows || '<li class="hint">Aucun transfert pour le moment : le fil se remplit à chaque mercato.</li>'}</ul>`;
  }
  function plansHTML() {
    const club = userClub(); const sl = ((club.scouting && club.scouting.shortlist) || []).map(getPlayer).filter(Boolean);
    const mine = allClubs().filter((c) => !isUserClub(c.id) && c.countryKey === club.countryKey);
    const rich = mine.slice().sort((a, b) => getTransferBudget(b) - getTransferBudget(a)).slice(0, 8);
    const hard = allClubs().filter((c) => distressOf(c)).sort((a, b) => a.budget - b.budget).slice(0, 5);
    const set = new Map(); rich.concat(hard).forEach((c) => set.set(c.id, c));
    const rows = [...set.values()].map((c) => {
      const pl = planOf(c); const t = pl.top; const ds = distressOf(c);
      const threat = sl.filter((p) => t && p.position === t.pos && p.clubId !== c.id && pl.maxFee >= p.value * 0.9).length;
      return `<tr><td>${esc(c.name)}${ds ? ' <span class="dos-v dos-ko">en difficulté</span>' : ""}</td><td>${t ? esc(POSL[t.pos]) : "—"}</td><td>${money(pl.budget)}</td><td>${esc(pl.label)}</td><td>${threat ? `<span class="dos-v dos-ko">${threat} de vos pistes</span>` : "—"}</td></tr>`;
    }).join("");
    return `<h3 class="panel-subtitle">🔍 Clubs à surveiller</h3>
      <div class="mx-scroll"><table class="fx-mini"><thead><tr><th>Club</th><th>Poste prioritaire</th><th>Budget transferts</th><th>Plan du mercato</th><th>Concurrence</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">Un club dont le poste prioritaire correspond à une de vos cibles, et dont le budget couvre sa valeur, peut vous coiffer. Les clubs en difficulté financière vendent vite et moins cher.</p>`;
  }
  function mkHTML() { return `<p class="hint">Les clubs ont des besoins (postes faibles, joueurs vieillissants, fins de contrat), un budget et un plan. Chaque transfert indique <b>pourquoi</b> il a lieu.</p>${plansHTML()}<h3 class="panel-subtitle">📰 Fil d'actualité du mercato</h3>${feedHTML()}`; }

  function dosViewHTML() {
    const club = userClub(); const sc = ensureScouting(club);
    const list = sc.shortlist.map(getPlayer).filter(Boolean).filter((p) => p.clubId !== club.id);
    const rows = list.map((p) => { const d = dossier(p); const inC = MK().cmp.includes(p.id); return `<tr><td><button class="link-danger" data-playercard="${p.id}" style="color:var(--fm-accent,#c9a24a)">${esc(pn(p))}</button></td><td>${p.position}</td><td>${p.age}</td><td>${d.ovr.txt}</td><td>${money(d.pr.floor)}</td><td>${money(d.wage)}/m</td><td>${d.comp.length}</td><td><span class="dos-v dos-${d.so.verdict[1]}">${d.so.verdict[0]}</span></td><td><button class="btn btn-small ${inC ? "btn-primary" : "btn-ghost"}" data-dos="cmp:${p.id}">⚖️</button></td></tr>`; }).join("");
    return `<p class="hint">Un dossier par joueur suivi. Ouvrez la fiche d'un joueur pour le détail (rapports, concurrents, avis du staff) ; cochez ⚖️ pour comparer 2 ou 3 candidats.</p>
      ${list.length ? `<div class="mx-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Niv.</th><th>Prix</th><th>Salaire</th><th>Rivaux</th><th>Staff</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="hint">Votre liste de suivi est vide : ajoutez des joueurs depuis le Marché ou une fiche joueur.</p>'}
      <div id="dos-cmp">${compareHTML()}</div>`;
  }

  // ------------------------------------------------------------------
  // Conséquences de saison
  // ------------------------------------------------------------------
  function modOf(club) {
    const m = CS().mods[club.id];
    if (!m || day() - m.day > 330) return null;
    return m;
  }
  function boardFactor() {
    try {
      const c = window.fm24 && fm24.F().board.conf;
      if (c == null) return { f: 1, txt: "" };
      if (c >= 75) return { f: 1.1, txt: "Le président est ravi : +10 % d'enveloppe." };
      if (c < 15) return { f: 0.7, txt: "Le président gèle une grande partie des fonds : −30 %." };
      if (c < 30) return { f: 0.85, txt: "Le président se méfie : −15 % d'enveloppe." };
      return { f: 1, txt: "" };
    } catch (e) { return { f: 1, txt: "" }; }
  }
  const origBudget = window.getTransferBudget;
  window.getTransferBudget = function (club) {
    let b = origBudget.apply(this, arguments);
    try {
      if (club && ready() && isUserClub(club.id)) {
        const m = modOf(club); if (m) b *= m.mult;
        b *= boardFactor().f;
      }
    } catch (e) {}
    return Math.max(0, Math.round(b));
  };

  // prix : un club en difficulté ou un joueur mécontent cède à moindre coût
  const origEval = window.evaluateOffer;
  window.evaluateOffer = function (player, amount, isBuyerUser) {
    let dd = { disc: 1 };
    try { if (isBuyerUser && ready()) dd = discountOf(player); } catch (e) {}
    if (dd.disc >= 1) return origEval.apply(this, arguments);
    const nx = window.__nxPending; let res;
    if (nx && nx.pid === player.id) {
      const old = nx.perceived; nx.perceived = old / dd.disc;
      try { res = origEval.apply(this, arguments); } finally { nx.perceived = old; }
    } else res = origEval.call(this, player, amount / dd.disc, isBuyerUser);
    if (res && res.counter) res.counter = Math.max(1000, Math.round(res.counter * dd.disc / 1000) * 1000);
    return res;
  };
  window.dsMarketDiscount = discountOf;

  function jobOffers(club, s) {
    if (!state.inbox || s === 0) return 0;
    const rep = state.ds.reputation || 0;
    const pending = state.inbox.filter((o) => o.type === "job_offer" && !o.resolved).map((o) => o.clubId);
    let n = 0;
    const want = s >= 2 ? 2 : s === 1 ? 1 : s === -1 ? 1 : 0;
    const aspire = 35 + rep * 0.55;
    for (let i = 0; i < want; i++) {
      let cands;
      if (s > 0) cands = allClubs().filter((c) => (!window.dsPlayableClub || window.dsPlayableClub(c)) && !isUserClub(c.id) && !pending.includes(c.id) && c.reputation > club.reputation + 2 && c.reputation <= Math.max(club.reputation + 8, aspire + 8));
      else cands = allClubs().filter((c) => (!window.dsPlayableClub || window.dsPlayableClub(c)) && !isUserClub(c.id) && !pending.includes(c.id) && c.reputation >= club.reputation - 18 && c.reputation < club.reputation - 3);
      if (!cands.length) break;
      const t = pick(cands); pending.push(t.id);
      const kind = s > 0 ? "ascension" : "rebond";
      const terms = { kind, years: randInt(2, 4), reason: s > 0 ? `Vos résultats à ${club.name} ont séduit ${t.name}, qui vise plus haut.` : `Après une saison compliquée, ${t.name} vous offre un nouveau départ.`, objective: t.objectiveLabel || "—", budgetBoostPct: s > 0 ? randInt(6, 14) : randInt(10, 20) };
      state.inbox.unshift({ id: nextId(), type: "job_offer", clubId: t.id, date: fmtDate(state.date), resolved: false, terms, expiresDay: day() + 30 });
      n++;
    }
    return n;
  }

  const origRoll = window.seasonRollover;
  window.seasonRollover = function () {
    let pre = null;
    try {
      pre = { divs: {}, users: [] };
      allClubs().forEach((c) => { pre.divs[c.id] = c.division; });
      (state.userClubIds || []).forEach((id) => {
        const uc = getClub(id); if (!uc) return;
        const st = leagueStandingOf(uc);
        pre.users.push({ id, name: uc.name, rank: st.rank, total: st.total, div: uc.division, obj: uc.objectiveLabel || "—" });
      });
    } catch (e) { pre = null; }
    const r = origRoll.apply(this, arguments);
    try { if (pre) afterRoll(pre); } catch (e) { console.error("conséquences", e); }
    return r;
  };

  function afterRoll(pre) {
    const cs = CS();
    // clubs relégués : leurs meilleurs joueurs sont mécontents ; promus : enthousiasme
    const relegated = [], promoted = [];
    allClubs().forEach((c) => {
      const was = pre.divs[c.id]; if (was == null) return;
      if (c.division > was) relegated.push(c); else if (c.division < was) promoted.push(c);
    });
    relegated.forEach((c) => {
      const stars = c.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 6);
      stars.forEach((p) => {
        p.happy = Math.min(p.happy === undefined ? 62 : p.happy, 62) - 26; p.happy = Math.max(5, p.happy);
        p.unhappyWeeks = Math.max(p.unhappyWeeks || 0, 3);
        p.relegGrudge = { clubId: c.id, until: day() + 240, year: state.season.year };
      });
      if (!isUserClub(c.id)) {
        c.budget -= Math.round(Math.max(c.budget, 0) * 0.1 / 10000) * 10000; // perte des droits TV
        const e = { id: ++MK().seq, day: day(), date: fmtDate(state.date), pid: stars[0] ? stars[0].id : 0, name: stars.slice(0, 3).map((p) => pn(p)).join(", "), pos: stars[0] ? stars[0].position : "MIL", age: stars[0] ? stars[0].age : 25, ovr: stars[0] ? stars[0].overall : 70, from: c.id, to: c.id, fromName: c.name, toName: c.name, fee: 0, reason: `${c.name} est relégué : ses meilleurs joueurs sont mécontents et pourraient partir à prix réduit`, forced: true, relegNews: true };
        MK().feed.unshift(e);
      }
    });
    promoted.forEach((c) => c.players.forEach((p) => { p.happy = Math.min(100, (p.happy === undefined ? 62 : p.happy) + 8); }));
    if (relegated.length) state.news.unshift({ date: fmtDate(state.date), text: `Relégation : ${relegated.slice(0, 4).map((c) => c.name).join(", ")}${relegated.length > 4 ? "…" : ""} — leurs meilleurs joueurs sont sur le départ.` });

    // conséquences pour chaque club du DS
    pre.users.forEach((u) => {
      const uc = getClub(u.id); if (!uc || !isUserClub(uc.id)) return;
      const rel = uc.division > u.div, pro = uc.division < u.div;
      const champ = u.rank === 1 && u.div === 1;
      const met = uc.lastObjectiveMet === true;
      const s = (pro || champ) ? 2 : rel ? -2 : met ? 1 : -1;
      const confD = ({ 2: 22, 1: 12, "-1": -14, "-2": -28 })[s];
      const mult = ({ 2: 1.35, 1: 1.15, "-1": 0.8, "-2": 0.6 })[s];
      const bp = ({ 2: 0.12, 1: 0.06, "-1": -0.05, "-2": -0.12 })[s];
      const lines = [];
      try { const b = fm24.F().board; b.conf = clamp(Math.round(b.conf + confD), 0, 100); lines.push(`Confiance du président ${confD > 0 ? "+" : ""}${confD} (→ ${b.conf}/100)`); } catch (e) {}
      const dB = Math.round(Math.max(uc.budget, 0) * bp / 10000) * 10000;
      uc.budget += dB; lines.push(`Budget du club ${dB >= 0 ? "+" : "−"}${money(Math.abs(dB))}`);
      cs.mods[uc.id] = { mult, day: day(), s, label: ({ 2: "Saison exceptionnelle", 1: "Objectif atteint", "-1": "Objectif manqué", "-2": "Relégation" })[s] };
      lines.push(`Marge de manœuvre au mercato : ×${mult.toFixed(2)} sur l'enveloppe de transferts`);
      if (rel) {
        uc.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 6).forEach((p) => { p.happy = Math.max(5, Math.min(p.happy === undefined ? 62 : p.happy, 62) - 22); p.unhappyWeeks = Math.max(p.unhappyWeeks || 0, 3); });
        lines.push("Vos meilleurs joueurs sont mécontents de la relégation : des demandes de départ sont à prévoir");
      }
      const n = jobOffers(uc, s); if (n) lines.push(`${n} offre(s) d'un autre club dans votre boîte de réception`);
      cs.hist.unshift({ year: state.season.year, club: uc.name, rank: u.rank, obj: u.obj, s, label: cs.mods[uc.id].label, lines });
      if (cs.hist.length > 12) cs.hist.length = 12;
      mail("club", "Conseil d'administration", `📋 Bilan de saison — ${cs.mods[uc.id].label}`, `<p>${esc(u.name)} termine ${u.rank}ᵉ (objectif : ${esc(u.obj)}).</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`);
      note(`Conséquences de saison (${uc.name}) : ${cs.mods[uc.id].label}. ${lines[0] || ""}`);
    });
  }

  function consHTML() {
    const club = userClub(); const cs = CS(); const m = modOf(club); const bf = boardFactor();
    let conf = null; try { conf = fm24.F().board.conf; } catch (e) {}
    const base = window.__csBase ? 0 : null;
    const hist = cs.hist.map((h) => `<li><b>${h.year}</b> · ${esc(h.club)} — ${h.rank}ᵉ · <span class="dos-v dos-${h.s > 0 ? "ok" : "ko"}">${esc(h.label)}</span><ul>${h.lines.map((l) => `<li class="hint">${esc(l)}</li>`).join("")}</ul></li>`).join("");
    const offers = state.inbox.filter((o) => o.type === "job_offer" && !o.resolved).map((o) => { const t = getClub(o.clubId); return t ? `<li>${esc(t.name)} — ${esc((o.terms || {}).kind || "")}</li>` : ""; }).join("");
    const relegs = allClubs().filter((c) => !isUserClub(c.id)).flatMap((c) => c.players.filter((p) => grudgeOf(p)).map((p) => ({ p, c }))).sort((a, b) => b.p.overall - a.p.overall).slice(0, 8);
    const hard = allClubs().filter((c) => distressOf(c)).length;
    return `<div class="dos-grid">
        <div><span class="hint">Confiance du président</span><b>${conf == null ? "—" : conf + "/100"}</b></div>
        <div><span class="hint">Effet de la dernière saison</span><b>${m ? "×" + m.mult.toFixed(2) + " (" + esc(m.label) + ")" : "neutre"}</b></div>
        <div><span class="hint">Enveloppe de transferts</span><b>${money(getTransferBudget(club))}</b></div>
        <div><span class="hint">Clubs en difficulté</span><b>${hard}</b></div></div>
      ${bf.txt ? `<p class="dos-flag">${esc(bf.txt)}</p>` : ""}
      <p class="hint">À chaque fin de saison, votre classement face à l'objectif décide de la confiance du président, de votre enveloppe de transferts pendant les mercatos suivants et des offres reçues d'autres clubs. Une relégation rend vos meilleurs joueurs mécontents ; chez les autres clubs, elle ouvre des opportunités.</p>
      <h3 class="panel-subtitle">Historique des conséquences</h3>${hist ? `<ul class="dos-list">${hist}</ul>` : '<p class="hint">Aucun bilan pour l\'instant : il sera établi à la fin de la saison.</p>'}
      ${offers ? `<h3 class="panel-subtitle">Offres en attente</h3><ul class="dos-list">${offers}</ul>` : ""}
      <h3 class="panel-subtitle">Relégués mécontents (cibles possibles)</h3>
      ${relegs.length ? `<ul class="dos-list">${relegs.map((x) => `<li><button class="link-danger" data-playercard="${x.p.id}" style="color:var(--fm-accent,#c9a24a)">${esc(pn(x.p))}</button> (${x.p.position}, niv. ${x.p.overall}) — ${esc(x.c.name)} · valeur ${money(x.p.value)}, prix plancher ≈ ${money(priceOf(x.p).floor)}</li>`).join("")}</ul>` : '<p class="hint">Aucun joueur de club relégué n\'est actuellement sur le départ.</p>'}`;
  }

  // ------------------------------------------------------------------
  // intégration au Radar
  // ------------------------------------------------------------------
  const origRadar = window.renderRadar;
  window.renderRadar = function () {
    if (!ready()) return origRadar ? origRadar.apply(this, arguments) : "";
    const R = ui.rx = ui.rx || { view: "opp", horizon: 12, scope: "network" };
    const extra = (v, l) => `<button class="${R.view === v ? "on" : ""}" data-mx="view:${v}">${l}</button>`;
    const buttons = extra("mk", "🏟️ Mercato des clubs") + extra("dos", "🗂️ Dossiers") + extra("cs", "📋 Conséquences");
    let html;
    if (R.view === "mk" || R.view === "dos" || R.view === "cs") {
      const keep = R.view; R.view = "opp"; html = origRadar.apply(this, arguments); R.view = keep;
      const i = html.indexOf('<div class="eu-subnav">'); const j = html.indexOf("</div>", i);
      const nav = html.slice(i, j).replace(/class="on"/g, 'class=""') + buttons;
      const body = R.view === "mk" ? mkHTML() : R.view === "dos" ? dosViewHTML() : consHTML();
      return html.slice(0, i) + nav + "</div>" + body + "</div>";
    }
    html = origRadar.apply(this, arguments);
    const i = html.indexOf('<div class="eu-subnav">'); const j = i < 0 ? -1 : html.indexOf("</div>", i);
    if (j > 0) html = html.slice(0, j) + buttons + html.slice(j);
    return html;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-dos^='filt:']"); if (!b || !ready()) return;
    ui.mkf = b.getAttribute("data-dos").split(":")[1]; refreshRadar();
  });

  // ------------------------------------------------------------------
  // branchement sur le temps
  // ------------------------------------------------------------------
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (ready()) mkTick(); } catch (e) { console.error("mercato clubs", e); }
    return r;
  };

  window.dsDossiers = { dossier, compareHTML, competitorsOf, staffOpinion, priceOf, planOf, distressOf, discountOf, mkTick, attemptBuy, afterRoll, modOf, boardFactor, MK, CS, whyBuy };
})();
