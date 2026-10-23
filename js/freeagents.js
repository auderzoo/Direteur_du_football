// ===================================================================
// BLOC 22 (1/4) — JOUEURS LIBRES
//  - fins de contrat : à la fin de la saison, une partie des joueurs en fin de bail quitte son club (les clubs IA en prolongent d'autres)
//  - vivier de joueurs libres (anciens joueurs de clubs, jeunes non retenus, vétérans), alimenté chaque mois
//  - recrutement sans indemnité de transfert : salaire, durée et prime à la signature négociés
//  - les clubs IA recrutent aussi des libres (la concurrence réduit le vivier), les exigences baissent avec le temps
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const POS = { GB: "Gardien", DEF: "Défenseur", MIL: "Milieu", ATT: "Attaquant" };
  const money = (v) => { try { return fmtMoney(v); } catch (e) { return Math.round(v) + " €"; } };
  const hasState = () => typeof state !== "undefined" && state && state.countries;
  const F = () => { state.free = state.free || { pool: [], seeded: false, signed: 0, hist: [] }; return state.free; };
  const year = () => new Date(state.date).getFullYear();
  const dkey = () => new Date(state.date).toISOString().slice(0, 10);
  let ft = { pos: "", sort: "level", openId: null, msg: "" };

  function release(p, reason) {
    p.clubId = null; p.contractEndYear = null; p.onLoan = false; p.listed = false;
    p.freeSince = dkey(); p.demand = Math.max(800, Math.round((p.wage || 1000) * (1.04 + Math.random() * 0.16) / 100) * 100);
    p.freeWhy = reason || "fin de contrat";
    F().pool.push(p);
  }
  function seed() {
    const f = F(); if (f.seeded || !hasState()) return; f.seeded = true;
    const cks = Object.keys(state.countries), pos = ["GB", "DEF", "DEF", "DEF", "MIL", "MIL", "MIL", "ATT", "ATT"];
    for (let i = 0; i < 40; i++) {
      const p = generatePlayer(cks[i % cks.length], pos[i % pos.length], 0.15 + Math.random() * 0.75);
      p.age = ri(20, 35); p.value = computeValue(p); p.wage = Math.max(800, Math.round(p.value * 0.011 / 500) * 500);
      release(p, i % 3 ? "sans club" : "libéré");
    }
  }
  const monthsFree = (p) => Math.max(0, Math.round((new Date(state.date) - new Date(p.freeSince || state.date)) / (30 * 864e5)));
  const demandNow = (p) => Math.max(Math.round((p.demand || p.wage || 1000) * 0.7 / 100) * 100, Math.round((p.demand || 1000) * Math.pow(0.97, monthsFree(p)) / 100) * 100);

  // -------- fin de saison --------
  function expiry() {
    const y = year(), me = (state.userClubIds || []);
    const out = [];
    allClubs().forEach((c) => {
      const isMe = me.includes(c.id);
      const exp = c.players.filter((p) => !p.onLoan && p.contractEndYear && p.contractEndYear <= y);
      exp.forEach((p) => {
        if (!isMe) {
          // le club IA prolonge les bons éléments, laisse partir les autres
          const keep = Math.random() < (0.45 + (p.overall >= 70 ? 0.3 : 0) + (p.age <= 24 ? 0.15 : 0) - (p.age >= 33 ? 0.3 : 0));
          if (keep || c.players.length <= 20) { p.contractEndYear = y + ri(1, 4); return; }
        } else if (c.players.filter((q) => !(q.contractEndYear && q.contractEndYear <= y)).length < 16) {
          p.contractEndYear = y + 1; out.push({ p, club: c, saved: true }); return; // effectif trop court : prolongation d'office d'un an
        } else out.push({ p, club: c });
        c.players = c.players.filter((q) => q.id !== p.id);
        release(p, "fin de contrat");
      });
      try { recomputeWageBill(c); } catch (e) {}
    });
    const gone = out.filter((o) => !o.saved), saved = out.filter((o) => o.saved);
    if (gone.length || saved.length) {
      try { dsMail("transferts", "Direction du club", "Fins de contrat",
        `<p>${gone.length ? `<b>${gone.length}</b> joueur(s) quittent le club libres de tout contrat : ${gone.map((o) => esc(o.p.firstName + " " + o.p.lastName)).join(", ")}. Ils sont désormais dans la liste des <b>joueurs libres</b> (onglet Marché) : vous pouvez encore les reprendre.` : ""}</p>${saved.length ? `<p>Pour ne pas vider l'effectif, ${saved.length} contrat(s) ont été prolongés d'un an automatiquement.</p>` : ""}`); } catch (e) {}
    }
    // les vétérans trop âgés prennent leur retraite
    const f = F(); f.pool = f.pool.filter((p) => { p.age += 0; return !(p.age >= 37 || (p.age >= 35 && Math.random() < 0.5)); });
  }

  // -------- tick mensuel --------
  function monthly() {
    const f = F(); seed();
    // quelques joueurs libérés par des clubs IA
    allClubs().forEach((c) => {
      if (isUserClub(c.id) || c.players.length <= 22 || Math.random() > 0.05) return;
      const w = c.players.filter((p) => !p.onLoan && p.overall < 56).sort((a, b) => a.overall - b.overall)[0];
      if (w) { c.players = c.players.filter((q) => q.id !== w.id); release(w, "libéré"); try { recomputeWageBill(c); } catch (e) {} }
    });
    // arrivée de nouveaux profils sans club
    const cks = Object.keys(state.countries), pos = ["GB", "DEF", "MIL", "ATT"];
    for (let i = 0; i < 3; i++) { const p = generatePlayer(cks[ri(0, cks.length - 1)], pos[ri(0, 3)], 0.2 + Math.random() * 0.6); p.age = ri(21, 34); p.value = computeValue(p); p.wage = Math.max(800, Math.round(p.value * 0.011 / 500) * 500); release(p, "sans club"); }
    // les clubs IA recrutent
    let signedAI = 0;
    allClubs().forEach((c) => {
      if (isUserClub(c.id) || !f.pool.length || signedAI >= 5) return;
      if (!(c.players.length < 20 || Math.random() < 0.02)) return;
      signedAI++;
      const avg = c.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, c.players.length);
      const cand = f.pool.filter((p) => p.overall >= avg - 6 && demandNow(p) + c.wageBill <= c.wageBudgetMonthly * 1.02).sort((a, b) => b.overall - a.overall)[0];
      if (!cand) return;
      f.pool = f.pool.filter((p) => p.id !== cand.id);
      cand.clubId = c.id; cand.wage = demandNow(cand); cand.contractEndYear = year() + ri(1, 3); c.players.push(cand); try { recomputeWageBill(c); } catch (e) {}
    });
    // le vivier est plafonné : les moins bons rangent les crampons
    if (f.pool.length > 110) f.pool = f.pool.sort((a, b) => b.overall - a.overall).slice(0, 100);
    // préavis : contrats qui expirent en fin de saison
    const m = new Date(state.date).getMonth();
    if (m === 2) {
      const me = userClub(); if (me) {
        const l = me.players.filter((p) => !p.onLoan && p.contractEndYear <= year()).sort((a, b) => b.overall - a.overall);
        if (l.length) try { dsMail("transferts", "Direction du club", "Contrats arrivant à terme", `<p>${l.length} joueur(s) seront <b>libres cet été</b> sans prolongation : ${l.slice(0, 6).map((p) => esc(p.firstName + " " + p.lastName)).join(", ")}. Prolongez-les (onglet Effectif) ou préparez leur remplacement dans la liste des joueurs libres.</p>`); } catch (e) {}
      }
    }
  }

  // -------- signature --------
  function chance(p, wage, years, bonus) {
    const me = userClub(), d = demandNow(p);
    let w = wage;
    // ambition : un joueur de haut niveau hésite à rejoindre un petit club
    const need = cl((p.overall - 45) * 1.4, 0, 70), gap = need - (me.reputation || 40);
    if (gap > 0) w *= cl(1 - gap * 0.006, 0.7, 1);
    if (p.age >= 30 && years >= 3) w *= 1.04;
    if (p.age <= 23 && years >= 3) w *= 1.03;
    if (years === 1 && p.age <= 30) w *= 0.96;
    const r = w / d + (bonus || 0) / Math.max(1, p.value * 0.08);
    return { ratio: r, demand: d };
  }
  function sign(id, wage, years, bonus) {
    const f = F(), p = f.pool.find((x) => x.id === id), me = userClub();
    if (!p || !me) return { ok: false, msg: "Joueur introuvable." };
    if (me.players.length >= 32) return { ok: false, msg: "Effectif complet : 32 joueurs maximum." };
    if (!canAffordWage(me, wage)) return { ok: false, msg: "Ce salaire dépasse votre budget salarial mensuel." };
    if (bonus > me.budget) return { ok: false, msg: "Budget insuffisant pour la prime à la signature." };
    const c = chance(p, wage, years, bonus);
    let ratio = c.ratio; try { ratio *= difficultyFactor(); const n = state.ds.skills && state.ds.skills.negociation || 0; ratio *= 1 + n * 0.02; if (state.ds.specialization === "negociateur") ratio *= 1.05; } catch (e) {}
    const thr = 0.97 - Math.random() * 0.08;
    p.tries = (p.tries || 0) + 1;
    if (ratio < thr) {
      if (ratio < 0.8) return { ok: false, msg: `${p.lastName} trouve l'offre très insuffisante et se détourne.`, hard: true };
      return { ok: false, msg: `${p.lastName} souhaite plus : « Je vise environ ${money(Math.round(c.demand * 0.97))} par mois. »` };
    }
    f.pool = f.pool.filter((x) => x.id !== id);
    p.clubId = me.id; p.wage = wage; p.contractEndYear = year() + years; p.signedFree = state.season.year;
    p.history = p.history || [];
    if (bonus) { me.budget -= bonus; me.monthlyTransferNet = (me.monthlyTransferNet || 0) - bonus; }
    me.players.push(p); recomputeWageBill(me); f.signed++;
    const t = `${p.firstName} ${p.lastName} (joueur libre) signe à ${me.name} jusqu'en ${p.contractEndYear} — ${money(wage)}/mois${bonus ? `, prime ${money(bonus)}` : ""}, sans indemnité de transfert.`;
    try { state.log.unshift({ date: fmtDate(state.date), text: t }); state.news.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {}
    try { dsMail("transferts", "Transferts", `Signature libre : ${p.firstName} ${p.lastName}`, `<p>${esc(t)}</p>`); } catch (e) {}
    try { window.dsBoard && window.dsBoard.onBought(p, me, null); } catch (e) {}
    try { saveGame(); } catch (e) {}
    return { ok: true, msg: t };
  }

  // -------- interface --------
  const stars = (v) => { const full = Math.floor(v), half = v - full >= 0.5; return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0))); };
  function view(p) { let pk = 55; try { pk = 50 + Math.min(30, Math.round((ensureScouting(userClub()).knowledge[p.nationality] || 0) * 0.3)); } catch (e) {} try { return playerStarView(p, pk); } catch (e) { return { level: [1, 5], potential: [1, 5], levelMid: 3 }; } }
  const range = (r) => (r[0] === r[1] ? stars(r[0]) : stars(r[0]) + " → " + stars(r[1]));

  function render() {
    const root = document.getElementById("fa-root"); if (!root) return;
    seed();
    const f = F(), me = userClub();
    let rows = f.pool.filter((p) => !ft.pos || p.position === ft.pos);
    rows = rows.slice().sort((a, b) => ft.sort === "age" ? a.age - b.age : ft.sort === "salary" ? demandNow(a) - demandNow(b) : ft.sort === "pot" ? b.potential - a.potential : b.overall - a.overall);
    const open = ft.openId && f.pool.find((p) => p.id === ft.openId);
    root.innerHTML = `<div class="fa-back" data-fa="close"><div class="fa-modal" role="dialog" aria-label="Joueurs libres"><div class="fa-top"><h2>🆓 Joueurs libres <span class="count-tag">${f.pool.length}</span></h2><button class="cs-x" data-fa="close" aria-label="Fermer">✕</button></div>
      <p class="hint">Sans indemnité de transfert, mais ils réclament un bon salaire et ils partent vite : les clubs IA en recrutent chaque mois. Leur exigence baisse peu à peu s'ils restent sans club.</p>
      <div class="fa-tools">${["", "GB", "DEF", "MIL", "ATT"].map((k) => `<button class="tab-chip ${ft.pos === k ? "active" : ""}" data-fa="pos" data-v="${k}">${k ? POS[k] + "s" : "Tous"}</button>`).join("")}
        <select data-fa="sort" aria-label="Tri">${[["level", "Niveau"], ["pot", "Potentiel"], ["age", "Âge"], ["salary", "Salaire demandé"]].map(([k, l]) => `<option value="${k}" ${ft.sort === k ? "selected" : ""}>Tri : ${l}</option>`).join("")}</select></div>
      ${open ? negoHTML(open, me) : ""}
      <div class="table-wrap"><table class="fm-table"><thead><tr><th>Joueur</th><th>Âge</th><th>Poste</th><th>Niveau</th><th>Potentiel</th><th>Salaire demandé</th><th>Libre depuis</th><th></th></tr></thead><tbody>
      ${rows.map((p) => { const v = view(p); return `<tr><td>${esc(p.firstName + " " + p.lastName)}<br><span class="hint">${esc(p.nationality || "")} · ${esc(p.freeWhy || "")}</span></td><td>${p.age}</td><td>${POS[p.position]}</td><td class="fa-st">${range(v.level)}</td><td class="fa-st">${range(v.potential)}</td><td>${money(demandNow(p))}</td><td>${monthsFree(p) ? monthsFree(p) + " mois" : "récent"}</td><td><button class="btn btn-small btn-primary" data-fa="open" data-id="${p.id}">Négocier</button></td></tr>`; }).join("") || `<tr><td colspan="8" class="hint">Aucun joueur libre pour ce filtre.</td></tr>`}</tbody></table></div></div></div>`;
  }
  function negoHTML(p, me) {
    const d = demandNow(p), w0 = ft.wage || d, y0 = ft.years || 2, b0 = ft.bonus || 0, c = chance(p, w0, y0, b0);
    const label = c.ratio >= 1.02 ? ["Très probable", "result-good"] : c.ratio >= 0.93 ? ["Probable", "result-good"] : c.ratio >= 0.82 ? ["Incertain", ""] : ["Improbable", "result-bad"];
    return `<div class="dossier fa-nego"><h3 class="panel-subtitle">Négociation — ${esc(p.firstName + " " + p.lastName)}</h3>
      <p class="hint">Budget salarial restant : ${money(Math.max(0, Math.round(me.wageBudgetMonthly * 1.05 - me.wageBill)))} / mois · Effectif : ${me.players.length}</p>
      <label class="field"><span>Salaire mensuel : <b id="fa-w">${money(w0)}</b></span><input type="range" data-fa="wage" min="${Math.round(d * 0.6 / 100) * 100}" max="${Math.round(d * 1.6 / 100) * 100}" step="100" value="${w0}"/></label>
      <label class="field"><span>Durée : <b>${y0} an${y0 > 1 ? "s" : ""}</b></span><input type="range" data-fa="years" min="1" max="4" value="${y0}"/></label>
      <label class="field"><span>Prime à la signature : <b>${money(b0)}</b></span><input type="range" data-fa="bonus" min="0" max="${Math.round(p.value * 0.15 / 1000) * 1000}" step="1000" value="${b0}"/></label>
      <p class="hint">Accueil probable : <b class="${label[1]}">${label[0]}</b></p>
      ${ft.msg ? `<p class="${ft.ok ? "result-good" : "result-bad"}">${esc(ft.msg)}</p>` : ""}
      <div class="creation-footer"><button class="btn btn-ghost" data-fa="cancel">Annuler</button><button class="btn btn-primary" data-fa="sign" data-id="${p.id}">Proposer le contrat</button></div></div>`;
  }
  function openUI() {
    let root = document.getElementById("fa-root"); if (!root) { root = document.createElement("div"); root.id = "fa-root"; document.body.appendChild(root); }
    ft.openId = null; ft.msg = ""; render();
  }
  function closeUI() { const r = document.getElementById("fa-root"); if (r) r.innerHTML = ""; }
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-fa]"); if (!t) return;
    const a = t.dataset.fa;
    if (a === "close") { if (t.classList.contains("fa-back") && e.target !== t) return; closeUI(); return; }
    if (a === "open") { const p = F().pool.find((x) => x.id === +t.dataset.id); ft.openId = +t.dataset.id; ft.wage = p ? demandNow(p) : 0; ft.years = 2; ft.bonus = 0; ft.msg = ""; render(); const n = document.querySelector(".fa-nego"); if (n) n.scrollIntoView({ block: "nearest" }); return; }
    if (a === "cancel") { ft.openId = null; ft.msg = ""; render(); return; }
    if (a === "pos") { ft.pos = t.dataset.v; render(); return; }
    if (a === "sign") {
      const r = sign(+t.dataset.id, ft.wage, ft.years, ft.bonus || 0); ft.msg = r.msg; ft.ok = r.ok;
      if (r.ok) { ft.openId = null; try { window.dsToast && window.dsToast(r.msg); } catch (x) {} try { render_main(); } catch (x) {} }
      if (r.hard) { /* le joueur se détourne : on ferme la négociation */ ft.openId = null; }
      render(); return;
    }
  });
  const onIn = (e) => {
    const t = e.target; if (!t.dataset || !t.dataset.fa) return;
    const a = t.dataset.fa;
    if (a === "sort") { ft.sort = t.value; render(); return; }
    if (a === "wage") { ft.wage = +t.value; } else if (a === "years") { ft.years = +t.value; } else if (a === "bonus") { ft.bonus = +t.value; } else return;
    ft.msg = ""; const y = t.scrollTop; render(); const el = document.querySelector(`[data-fa="${a}"]`); if (el) el.focus();
  };
  document.addEventListener("input", onIn); document.addEventListener("change", onIn);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeUI(); });
  function render_main() { if (typeof window.render === "function") window.render(); }

  // -------- branchements --------
  const origRoll = window.seasonRollover;
  if (typeof origRoll === "function") window.seasonRollover = function () {
    // les contrats arrivant à terme sont traités AVANT le vieillissement de l'effectif
    try { if (hasState()) { seed(); expiry(); } } catch (e) { console.warn("free expiry", e); }
    const r = origRoll.apply(this, arguments);
    try { const f = F(); f.pool.forEach((p) => { p.age = p.age; }); } catch (e) {}
    return r;
  };
  const origMon = window.runMonthlyFinanceTick;
  if (typeof origMon === "function") window.runMonthlyFinanceTick = function () {
    const r = origMon.apply(this, arguments);
    try { monthly(); } catch (e) { console.warn("free monthly", e); }
    return r;
  };
  const origMarket = window.renderMarket;
  if (typeof origMarket === "function") window.renderMarket = function () {
    const base = origMarket.apply(this, arguments);
    try { seed(); return `<div class="dossier fa-card"><div><b>🆓 Joueurs libres</b><p class="hint" style="margin:2px 0 0">${F().pool.length} joueurs sans club, signables sans indemnité de transfert.</p></div><button class="btn btn-primary btn-small" data-fa-open="1" id="fa-open">Ouvrir la liste</button></div>` + base; } catch (e) { return base; }
  };
  document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-fa-open]"); if (b) openUI(); });
  window.dsFree = { openUI, closeUI, seed, monthly, expiry, sign, release, chance, F, demandNow };
})();
