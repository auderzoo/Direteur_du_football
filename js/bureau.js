// =====================================================================
// BUREAU DU DIRECTEUR SPORTIF — 10 améliorations
//  1. Plan de saison chiffré + bilan (réputation)           6. Résumé de fin de saison (boîte de réception)
//  2. Réseau de contacts (agent, journaliste, dirigeant…)    7. Conseils hebdomadaires du staff
//  3. Carnet de transferts (plus-values)                     8. Réglages : taille du texte, contraste, animations
//  4. Identité de jeu du club (adéquation des joueurs)       9. Raccourcis clavier
//  5. Fair-play financier (alerte, sanction)                10. Radar des contrats + hall of fame
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const day = () => state.dayCounter || 0;
  const yr = () => state.season.year;
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const B = () => (state.bureau = state.bureau || { plan: null, net: null, ledger: [], style: "equilibre", fpf: { strikes: 0, last: 0 }, tips: {} });

  // ===================================================================
  // 3. CARNET DE TRANSFERTS
  // ===================================================================
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee) {
    const r = origTransfer.apply(this, arguments);
    try {
      const mine = isUserClub(toId), sold = isUserClub(fromId);
      if ((mine || sold) && !(mine && sold)) {
        const L = B().ledger, from = getClub(fromId), to = getClub(toId);
        const e = { season: yr(), date: fmtDate(state.date), pid: player.id, name: `${player.firstName} ${player.lastName}`, type: mine ? "achat" : "vente", fee: fee || 0, other: mine ? (from ? from.name : "?") : (to ? to.name : "?"), ovr: player.overall, age: player.age };
        if (sold) { const buy = [...L].reverse().find((x) => x.pid === player.id && x.type === "achat"); if (buy) e.gain = (fee || 0) - buy.fee; }
        L.push(e); if (L.length > 300) L.shift();
      }
    } catch (x) { console.error(x); }
    return r;
  };
  const seasonNet = (y) => B().ledger.filter((x) => x.season === y).reduce((s, x) => s + (x.type === "vente" ? x.fee : -x.fee), 0);

  // ===================================================================
  // 1. PLAN DE SAISON
  // ===================================================================
  const squadValue = (c) => c.players.reduce((s, p) => s + (p.value || 0), 0);
  const topAge = (c) => { const t = c.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 14); return t.length ? t.reduce((s, p) => s + p.age, 0) / t.length : 27; };
  const youthUsed = (c) => c.players.filter((p) => p.age <= 21 && ((p.seasonStats || {}).matches || 0) >= 5).length;
  function ensurePlan() {
    const b = B(), c = userClub(); if (!c) return null;
    if (b.plan && b.plan.season === yr()) return b.plan;
    const age = topAge(c), sv = squadValue(c);
    b.plan = { season: yr(), v0: sv, goals: [
      { k: "wage", label: "Masse salariale ≤ 95 % du plafond", target: 95, dir: "max" },
      { k: "age", label: `Âge moyen des 14 meilleurs ≤ ${Math.max(24, Math.round(age) + 0)}`, target: Math.max(24, Math.round(age)), dir: "max" },
      { k: "youth", label: "Jeunes (≤ 21 ans) utilisés (≥ 5 matchs)", target: 2, dir: "min" },
      { k: "net", label: "Bilan des transferts ≥ -5 M€", target: -5e6, dir: "min" },
      { k: "value", label: "Valeur de l'effectif +5 %", target: 5, dir: "min" }
    ], done: false };
    return b.plan;
  }
  function goalValue(g) {
    const c = userClub();
    if (g.k === "wage") return Math.round(c.wageBill / Math.max(1, c.wageBudgetMonthly) * 100);
    if (g.k === "age") return Math.round(topAge(c) * 10) / 10;
    if (g.k === "youth") return youthUsed(c);
    if (g.k === "net") return seasonNet(yr());
    return Math.round((squadValue(c) / Math.max(1, B().plan.v0) - 1) * 1000) / 10;
  }
  const goalOk = (g) => { const v = goalValue(g); return g.dir === "max" ? v <= g.target : v >= g.target; };
  function planHTML() {
    const p = ensurePlan(), ok = p.goals.filter(goalOk).length;
    return `<h3 class="panel-subtitle">📋 Plan de saison ${p.season}</h3>
      <p class="hint">${ok} / ${p.goals.length} objectifs atteints pour l'instant. Bilan en fin de saison : réputation de directeur sportif ${ok >= 4 ? "en hausse" : ok >= 3 ? "stable" : "en baisse"}.</p>
      <table class="fx-mini"><tbody>${p.goals.map((g) => { const v = goalValue(g), good = goalOk(g); const f = g.k === "net" ? fmtMoney(v) : g.k === "value" ? v + " %" : g.k === "wage" ? v + " %" : v; return `<tr><td>${good ? "✅" : "⏳"}</td><td>${esc(g.label)}</td><td><b>${f}</b></td></tr>`; }).join("")}</tbody></table>`;
  }
  function planEnd() {
    const p = ensurePlan(); if (!p || p.done) return;
    p.done = true;
    const ok = p.goals.filter(goalOk).length, delta = ok >= 4 ? 3 : ok >= 3 ? 1 : ok >= 2 ? -1 : -3;
    if (state.ds) state.ds.reputation = Math.max(0, Math.min(100, (state.ds.reputation || 30) + delta));
    note(`Plan de saison : ${ok}/${p.goals.length} objectifs atteints (réputation ${delta >= 0 ? "+" : ""}${delta}).`);
    return { ok, n: p.goals.length, delta, lines: p.goals.map((g) => `${goalOk(g) ? "✅" : "❌"} ${esc(g.label)}`) };
  }

  // ===================================================================
  // 2. RÉSEAU DE CONTACTS
  // ===================================================================
  const ROLES = [["Agent influent", "Facilite les contrats : un bon contact rend les joueurs plus enclins à signer."], ["Journaliste", "Améliore la fiabilité de vos vérifications de rumeurs."], ["Dirigeant rival", "Lâche parfois un tuyau : un joueur bientôt sur le marché."], ["Ancien joueur", "Conseille sur le vestiaire : petit bonus de moral à l'équipe."]];
  function ensureNet() {
    const b = B(); if (b.net) return b.net;
    const nm = (typeof NAME_POOLS !== "undefined" && NAME_POOLS[(COUNTRIES[userClub().countryKey] || {}).pool || "fr"]) || NAME_POOLS.fr;
    b.net = ROLES.map(([role, desc], i) => ({ role, desc, name: `${pick(nm.first)} ${pick(nm.last)}`, rel: rnd(25, 45), cd: 0 }));
    return b.net;
  }
  window.dsNetBonus = (role) => { try { const c = ensureNet().find((x) => x.role === role); return c ? c.rel / 100 : 0; } catch (e) { return 0; } };
  function netHTML() {
    return `<h3 class="panel-subtitle">🤝 Réseau de contacts</h3>
      <p class="hint">Entretenez vos relations (déjeuner : 15 000 €, tous les 14 jours). Sans contact, la relation s'érode lentement.</p>
      <table class="fx-mini"><tbody>${ensureNet().map((c, i) => `<tr><td><b>${esc(c.name)}</b><br><span class="hint">${esc(c.role)}</span></td><td style="min-width:120px"><div class="wage-bar"><div class="wage-bar-fill ${c.rel >= 60 ? "" : c.rel >= 35 ? "warn" : "danger"}" style="width:${c.rel}%"></div></div><span class="hint">${Math.round(c.rel)} / 100</span></td><td class="hint">${esc(c.desc)}</td><td><button class="btn btn-small btn-ghost" data-bu="meet:${i}" ${c.cd > day() ? "disabled" : ""}>${c.cd > day() ? `Dans ${c.cd - day()} j` : "Déjeuner"}</button></td></tr>`).join("")}</tbody></table>`;
  }

  // ===================================================================
  // 4. IDENTITÉ DE JEU
  // ===================================================================
  const STYLES = { equilibre: ["Équilibré", "Aucune préférence marquée."], possession: ["Jeu de possession", "Milieux techniques, défenseurs relanceurs, joueurs de 22 à 30 ans."], pressing: ["Pressing haut", "Joueurs jeunes et athlétiques, endurants (≤ 27 ans)."], contre: ["Contre-attaque", "Attaquants rapides, milieux box-to-box, profils de 21 à 29 ans."], defensif: ["Bloc bas solide", "Défenseurs et gardiens d'expérience, milieux récupérateurs."] };
  function fit(p, style) {
    if (style === "equilibre") return 60 + Math.round((p.overall - 60) * 0.5);
    let s = 50 + (p.overall - 60) * 0.4;
    if (style === "possession") { if (p.position === "MIL") s += 14; if (p.position === "DEF") s += 4; if (p.age >= 22 && p.age <= 30) s += 8; }
    else if (style === "pressing") { s += p.age <= 27 ? 14 : -10; if (p.position === "MIL" || p.position === "ATT") s += 5; }
    else if (style === "contre") { if (p.position === "ATT") s += 14; if (p.position === "MIL") s += 5; if (p.age >= 21 && p.age <= 29) s += 8; }
    else if (style === "defensif") { if (p.position === "DEF" || p.position === "GB") s += 14; if (p.age >= 27) s += 6; }
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  window.dsStyleFit = (p) => fit(p, B().style);
  function styleHTML() {
    const b = B(), c = userClub(), top = c.players.filter((p) => !p.onLoan).slice().sort((x, y) => y.overall - x.overall).slice(0, 14);
    const avg = Math.round(top.reduce((s, p) => s + fit(p, b.style), 0) / Math.max(1, top.length));
    const best = c.players.filter((p) => !p.onLoan).map((p) => ({ p, f: fit(p, b.style) })).sort((x, y) => y.f - x.f).slice(0, 5);
    return `<h3 class="panel-subtitle">🎯 Identité de jeu</h3>
      <div class="eu-subnav">${Object.entries(STYLES).map(([k, v]) => `<button class="${b.style === k ? "on" : ""}" data-bu="style:${k}">${v[0]}</button>`).join("")}</div>
      <p class="hint">${esc(STYLES[b.style][1])} Adéquation moyenne des 14 meilleurs : <b>${avg} %</b> ${avg >= 65 ? "— identité claire : léger bonus de moral chaque semaine." : "— recrutez des profils adaptés pour renforcer l'identité."}</p>
      <p class="hint">Mieux adaptés : ${best.map((x) => `${esc(x.p.lastName)} (${x.f} %)`).join(" · ")}</p>`;
  }

  // ===================================================================
  // 5. FAIR-PLAY FINANCIER
  // ===================================================================
  function fpfTick() {
    const c = userClub(), f = B().fpf, ratio = c.wageBill / Math.max(1, c.wageBudgetMonthly);
    if (ratio > 1.05) f.strikes++; else f.strikes = Math.max(0, f.strikes - 1);
    if (f.strikes === 4) { note("⚠️ Fair-play financier : votre masse salariale dépasse le plafond depuis un mois."); mail("club", "Fair-play financier", "Avertissement : masse salariale", "<p>Votre masse salariale dépasse le plafond depuis 4 semaines. Sans redressement, une sanction financière sera appliquée.</p>"); }
    if (f.strikes >= 8) {
      const fine = Math.round(Math.max(250000, c.budget * 0.03) / 10000) * 10000;
      c.budget -= fine; f.strikes = 0; if (state.ds) state.ds.reputation = Math.max(0, (state.ds.reputation || 30) - 3);
      note(`🚫 Fair-play financier : amende de ${fmtMoney(fine)}.`); mail("club", "Fair-play financier", `Amende : ${fmtMoney(fine)}`, `<p>Sanction pour dépassement prolongé du plafond salarial : <b>${fmtMoney(fine)}</b> (réputation du DS -3).</p>`);
    }
  }
  function fpfHTML() { const f = B().fpf, c = userClub(), r = Math.round(c.wageBill / Math.max(1, c.wageBudgetMonthly) * 100); return `<h3 class="panel-subtitle">⚖️ Fair-play financier</h3><p class="hint">Masse salariale : <b>${r} %</b> du plafond. Semaines de dépassement : <b>${f.strikes} / 8</b> (amende à 8).</p><div class="wage-bar"><div class="wage-bar-fill ${f.strikes >= 4 ? "danger" : f.strikes ? "warn" : ""}" style="width:${Math.min(100, f.strikes * 12.5)}%"></div></div>`; }

  // ===================================================================
  // 7. CONSEILS DU STAFF
  // ===================================================================
  function tips() {
    const c = userClub(), b = B(), out = [], y = new Date(state.date).getFullYear();
    const cnt = (pos) => c.players.filter((p) => p.position === pos && !p.onLoan).length;
    [["GB", 2, "gardiens"], ["DEF", 6, "défenseurs"], ["MIL", 6, "milieux"], ["ATT", 4, "attaquants"]].forEach(([pos, n, l]) => { if (cnt(pos) < n) out.push(`Effectif déséquilibré : seulement ${cnt(pos)} ${l} (minimum conseillé : ${n}).`); });
    const exp = c.players.filter((p) => !p.onLoan && p.contractEndYear <= y).sort((a, z) => z.overall - a.overall).slice(0, 3);
    if (exp.length) out.push(`Contrats arrivant à terme : ${exp.map((p) => `${p.lastName} (${p.overall})`).join(", ")}. Pensez à prolonger ou vendre.`);
    const inj = c.players.filter((p) => p.injuredUntil && p.injuredUntil >= new Date(state.date).toISOString().slice(0, 10)).length;
    if (inj >= 4) out.push(`${inj} joueurs sont blessés : renforcez le poste le plus touché.`);
    if (c.budget < 1e6) out.push("Trésorerie très basse : privilégiez les ventes ou les prêts avant d'acheter.");
    const old = c.players.filter((p) => p.age >= 33 && p.overall >= 70 && !p.onLoan).length;
    if (old >= 3) out.push(`${old} cadres ont 33 ans ou plus : préparez leur succession.`);
    out.slice(0, 3).forEach((t) => { const k = t.slice(0, 30); if (b.tips[k] && day() - b.tips[k] < 28) return; b.tips[k] = day(); mail("club", "Staff technique", "Conseil du staff", `<p>${esc(t)}</p>`); });
  }

  // ===================================================================
  // 6. RÉSUMÉ DE FIN DE SAISON
  // ===================================================================
  function seasonSummary(planRes) {
    const c = userClub(); if (!c) return;
    let s = {}; try { s = leagueStandingOf(c); } catch (e) { s = { rank: "?", total: "?" }; }
    const tr = (c.trophies || []).filter((t) => t.year === yr()).map((t) => t.competition);
    const net = seasonNet(yr()), tot = B().ledger.filter((x) => x.season === yr()).length;
    let eu = ""; try { const e = state.euro; if (e) eu = ["ucl", "uel", "uecl"].map((k) => (e.comps[k].stage[c.id] ? `${({ ucl: "LDC", uel: "LE", uecl: "LC" })[k]} : ${e.comps[k].stage[c.id]}` : "")).filter(Boolean).join(" · "); } catch (x) {}
    mail("club", "Direction sportive", `Bilan de la saison ${yr()}`, `<table><tr><td>Classement</td><td><b>${s.rank}ᵉ / ${s.total}</b> — ${c.points} pts (${c.gf}-${c.ga})</td></tr><tr><td>Trophées</td><td>${tr.length ? tr.map(esc).join(", ") : "—"}</td></tr>${eu ? `<tr><td>Europe</td><td>${esc(eu)}</td></tr>` : ""}<tr><td>Mouvements</td><td>${tot} transfert(s), bilan ${fmtMoney(net)}</td></tr><tr><td>Trésorerie</td><td>${fmtMoney(c.budget)}</td></tr></table>${planRes ? `<p><b>Plan de saison :</b> ${planRes.ok}/${planRes.n} (réputation ${planRes.delta >= 0 ? "+" : ""}${planRes.delta})</p><p>${planRes.lines.join("<br>")}</p>` : ""}`);
  }

  // ===================================================================
  // 10. RADAR DES CONTRATS + HALL OF FAME
  // ===================================================================
  function radarHTML() {
    const c = userClub(), y = new Date(state.date).getFullYear();
    const l = c.players.filter((p) => !p.onLoan && p.contractEndYear <= y + 1).sort((a, b) => a.contractEndYear - b.contractEndYear || b.overall - a.overall).slice(0, 10);
    return `<h3 class="panel-subtitle">⏰ Radar des contrats</h3>${l.length ? `<table class="fx-mini"><thead><tr><th>Joueur</th><th>Poste</th><th>Niveau</th><th>Âge</th><th>Fin</th><th>Salaire</th></tr></thead><tbody>${l.map((p) => `<tr><td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-playercard="${p.id}">${esc(p.firstName)} <b>${esc(p.lastName)}</b></button></td><td>${p.position}</td><td>${p.overall}</td><td>${p.age}</td><td class="${p.contractEndYear <= y ? "result-bad" : ""}">${p.contractEndYear}</td><td>${fmtMoney(p.wage)}/m</td></tr>`).join("")}</tbody></table>` : `<p class="hint">Aucun contrat n'arrive à échéance dans les 12 mois.</p>`}`;
  }
  function ledgerHTML() {
    const L = B().ledger.slice().reverse().slice(0, 12), all = B().ledger;
    const gains = all.filter((x) => x.gain != null), bestSale = gains.slice().sort((a, z) => z.gain - a.gain)[0];
    const buys = all.filter((x) => x.type === "achat"), rec = (arr) => arr.slice().sort((a, z) => z.fee - a.fee)[0];
    const c = userClub();
    const best = buys.map((x) => { const p = getPlayer(x.pid); return p && p.clubId === c.id ? { x, g: p.value - x.fee, p } : null; }).filter(Boolean).sort((a, z) => z.g - a.g)[0];
    const hof = `<p class="hint">🏆 <b>Hall of fame du DS</b> — Meilleure vente : ${bestSale ? `${esc(bestSale.name)} (+${fmtMoney(bestSale.gain)})` : "—"} · Meilleur achat : ${best ? `${esc(best.x.name)} (valeur +${fmtMoney(best.g)})` : "—"} · Record d'achat : ${rec(buys) ? `${esc(rec(buys).name)} (${fmtMoney(rec(buys).fee)})` : "—"} · Record de vente : ${rec(all.filter((x) => x.type === "vente")) ? `${esc(rec(all.filter((x) => x.type === "vente")).name)} (${fmtMoney(rec(all.filter((x) => x.type === "vente")).fee)})` : "—"} · Trophées du club : ${(c.trophies || []).length}</p>`;
    return `<h3 class="panel-subtitle">📒 Carnet de transferts</h3>${hof}${L.length ? `<table class="fx-mini"><thead><tr><th>Date</th><th>Joueur</th><th>Opération</th><th>Club</th><th>Montant</th><th>Plus-value</th></tr></thead><tbody>${L.map((x) => `<tr><td>${esc(x.date)}</td><td>${esc(x.name)}</td><td>${x.type === "achat" ? "Achat" : "Vente"}</td><td>${esc(x.other)}</td><td>${fmtMoney(x.fee)}</td><td>${x.gain != null ? (x.gain >= 0 ? "+" : "") + fmtMoney(x.gain) : "—"}</td></tr>`).join("")}</tbody></table>` : `<p class="hint">Aucun transfert enregistré pour l'instant.</p>`}`;
  }

  window.renderBureau = function () {
    if (!userClub()) return "";
    return `<div class="fm-dark fm-panel bu"><h2 class="fm-title">Bureau du DS <span>réputation ${state.ds ? state.ds.reputation : "?"}</span></h2>
      ${planHTML()}${fpfHTML()}${styleHTML()}${netHTML()}${radarHTML()}${ledgerHTML()}</div>`;
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-bu]"); if (!b || !state || !state.ds) return;
    const [cmd, arg] = b.dataset.bu.split(":");
    if (cmd === "style") B().style = arg;
    else if (cmd === "meet") { const c = ensureNet()[parseInt(arg, 10)], club = userClub(); if (c && c.cd <= day() && club.budget >= 15000) { club.budget -= 15000; c.rel = Math.min(100, c.rel + rnd(8, 14)); c.cd = day() + 14; if (window.dsToast) dsToast(`Déjeuner avec ${c.name}`); } }
    try { saveGame(); } catch (x) {} render();
  });

  // ===================================================================
  // BRANCHEMENTS
  // ===================================================================
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      if (state.ds && userClub()) {
        ensurePlan();
        if (day() % 7 === 0) {
          fpfTick();
          ensureNet().forEach((c) => { c.rel = Math.max(5, c.rel - 1); });
          const club = userClub();
          if (B().style !== "equilibre") { const t = club.players.filter((p) => !p.onLoan).sort((a, z) => z.overall - a.overall).slice(0, 14); if (t.reduce((s, p) => s + fit(p, B().style), 0) / Math.max(1, t.length) >= 65) club.players.forEach((p) => { p.happy = Math.min(100, (p.happy == null ? 62 : p.happy) + 1); }); }
          const ex = ensureNet().find((c) => c.role === "Ancien joueur"); if (ex && ex.rel >= 50) club.players.forEach((p) => { p.happy = Math.min(100, (p.happy == null ? 62 : p.happy) + 0.5); });
          const dr = ensureNet().find((c) => c.role === "Dirigeant rival");
          if (dr && dr.rel >= 50 && Math.random() < 0.2) { const o = allClubs().filter((c) => c.id !== club.id); const cl = o[rnd(0, o.length - 1)], p = cl.players.filter((x) => !x.listed && x.overall >= 62)[0]; if (p) { p.listed = true; mail("transfers", dr.name, `Tuyau : ${p.firstName} ${p.lastName}`, `<p>Mon contact chez <b>${esc(cl.name)}</b> me dit que <b>${esc(p.firstName)} ${esc(p.lastName)}</b> (${p.position}, ${p.overall}) peut partir. À voir avant les autres.</p>`); } }
        }
        if (day() % 7 === 5) tips();
      }
    } catch (e) { console.error("bureau", e); }
    return r;
  };
  const origRoll = window.seasonRollover;
  window.seasonRollover = function () {
    try { if (state.ds && userClub()) { const res = planEnd(); seasonSummary(res); } } catch (e) { console.error("bilan", e); }
    return origRoll.apply(this, arguments);
  };

  // ===================================================================
  // 8 & 9. RÉGLAGES + RACCOURCIS
  // ===================================================================
  const SET0 = { size: 100, contrast: false, calm: false };
  const getSet = () => { try { return Object.assign({}, SET0, JSON.parse(lsGet("ds_settings") || "{}")); } catch (e) { return Object.assign({}, SET0); } };
  function applySet(s) {
    document.documentElement.style.fontSize = s.size + "%";
    document.body.classList.toggle("hc", !!s.contrast); document.body.classList.toggle("calm", !!s.calm);
  }
  const KEYS = { i: ["inbox", "Boîte de réception"], e: ["squad", "Effectif"], r: ["market", "Recrutement"], s: ["scouting", "Scouting"], f: ["finance", "Finances"], c: ["calendar", "Calendrier"], u: ["europe", "Europe"], b: ["bureau", "Bureau du DS"], j: ["u19", "Jeunes (U19)"], v: ["dynamics", "Vestiaire"] };
  function openSettings() {
    let root = document.getElementById("set-root"); if (!root) { root = document.createElement("div"); root.id = "set-root"; document.body.appendChild(root); }
    const s = getSet();
    root.innerHTML = `<div class="modal-backdrop"><div class="modal dossier"><h3>⚙️ Réglages</h3>
      <label class="field"><span>Taille du texte : ${s.size} %</span><input type="range" id="set-size" min="85" max="140" step="5" value="${s.size}"></label>
      <label class="field"><span><input type="checkbox" id="set-hc" ${s.contrast ? "checked" : ""}> Contraste renforcé</span></label>
      <label class="field"><span><input type="checkbox" id="set-calm" ${s.calm ? "checked" : ""}> Réduire les animations</span></label>
      <h4>Raccourcis clavier</h4><p class="hint"><b>Espace</b> Continuer · ${Object.entries(KEYS).map(([k, v]) => `<b>${k.toUpperCase()}</b> ${v[1]}`).join(" · ")} · <b>Échap</b> fermer une fenêtre</p>
      <div class="creation-footer"><button class="btn btn-primary" id="set-close">Fermer</button></div></div></div>`;
    const upd = () => { const n = { size: parseInt(document.getElementById("set-size").value, 10), contrast: document.getElementById("set-hc").checked, calm: document.getElementById("set-calm").checked }; lsSet("ds_settings", JSON.stringify(n)); applySet(n); root.querySelector(".field span").textContent = `Taille du texte : ${n.size} %`; };
    ["set-size", "set-hc", "set-calm"].forEach((id) => { document.getElementById(id).oninput = upd; document.getElementById(id).onchange = upd; });
    document.getElementById("set-close").onclick = () => { root.innerHTML = ""; };
  }
  window.dsOpenSettings = openSettings;
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    if (e.key === "Escape") { document.querySelectorAll("#set-root,#help-root,#gp-root,#rz-root").forEach((r) => { if (r.querySelector(".modal-backdrop")) r.innerHTML = ""; }); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || !state || !state.ds || ui.screen !== "dashboard" || document.querySelector(".modal-backdrop")) return;
    const k = KEYS[e.key.toLowerCase()]; if (!k) return;
    ui.tab = k[0]; render();
  });
  function mountFab() {
    if (document.getElementById("set-fab")) return;
    const b = document.createElement("button"); b.id = "set-fab"; b.setAttribute("aria-label", "Réglages"); b.textContent = "⚙"; b.onclick = openSettings; document.body.appendChild(b);
  }
  const start = () => { try { applySet(getSet()); mountFab(); } catch (e) {} };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  window.dsBureau = { B, ensurePlan, goalOk, planEnd, ensureNet, fit, fpfTick, tips, seasonSummary, STYLES, getSet, applySet };
})();
