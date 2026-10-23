// ===================================================================
// BLOC 22 (2/4) — PRÉSIDENT ET SUPPORTERS
//  Président : un caractère, une relation (liée à la confiance du conseil), de l'ingérence (ventes forcées, critiques,
//    coups de pouce), un entretien pour huiler la relation.
//  Supporters : ambiance du stade qui suit les résultats, groupes d'ultras qui réagissent à vos transferts
//    (vente d'une idole, arrivée d'un joueur du rival, recrue star…), actions (rencontre, tifo), effet sur l'affluence.
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pk = (a) => a[Math.floor(Math.random() * a.length)];
  const money = (v) => { try { return fmtMoney(v); } catch (e) { return Math.round(v) + " €"; } };
  const hasState = () => typeof state !== "undefined" && state && state.ds && state.countries;
  const mail = (f, s, sub, html) => { try { dsMail(f, s, sub, html); } catch (e) {} };
  const toast = (t) => { try { window.dsToast && window.dsToast(t); } catch (e) {} };
  const day = () => state.dayCounter || 0;

  const EGO = { ambitieux: 72, investisseur: 58, local: 40, patient: 24 };
  const STYLE = { ambitieux: "Exigeant et pressé", investisseur: "Gestionnaire, obsédé par la plus-value", local: "Proche des supporters", patient: "Discret, vision à long terme" };
  const FN = ["Henri", "Jean-Marc", "Carlos", "Giorgio", "Alan", "Dimitri", "Stefan", "Mehmet", "Philippe", "Richard", "Antonio", "Klaus", "Yann", "Marco"];
  const LN = ["Delmas", "Rossi", "Hartmann", "Vasquez", "Mercier", "Whitfield", "Petrov", "Bianchi", "Okafor", "Lambert", "Duarte", "Kessler", "Bernard", "Santoro"];

  function B() {
    if (!state.board2) state.board2 = {};
    const b = state.board2;
    if (!b.pres) b.pres = { name: pk(FN) + " " + pk(LN), adj: 0, lastMeet: -999, lastDemand: -999, refused: 0, hist: [] };
    if (!b.sup) b.sup = { atmo: 60, ultras: 60, lastMeet: -999, lastTifo: -999, hist: [], boycott: 0 };
    if (b.pres.club !== state.userClubId) { b.pres.club = state.userClubId; b.pres.name = pk(FN) + " " + pk(LN); b.pres.adj = 0; b.pres.refused = 0; }
    return b;
  }
  function owner(c) { try { if (!c.owner) assignOwnerProfile(c); } catch (e) {} return c.owner || { type: "local", label: "Président", patience: 4, badSeasons: 0 }; }
  const conf = () => { try { return window.fm24.F().board.conf; } catch (e) { return 60; } };
  const rel = () => cl(Math.round(conf() * 0.8 + 12 + B().pres.adj), 0, 100);
  const sup = () => B().sup;
  function note(t) { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} }
  function addHist(arr, t) { arr.unshift({ d: fmtDate(state.date), t }); if (arr.length > 8) arr.length = 8; }
  function bumpConf(d) { try { const b = window.fm24.F().board; b.conf = cl(b.conf + d, 0, 100); } catch (e) {} }
  function bumpFans(d) { try { if (state.media) state.media.fans = cl(state.media.fans + d, 0, 100); } catch (e) {} }

  // -------------------- ULTRAS : réactions aux transferts --------------------
  function topIds(club, n) { return club.players.slice().sort((a, b) => b.overall - a.overall).slice(0, n).map((p) => p.id); }
  function ultraEvent(delta, txt, title) {
    const s = sup(); s.ultras = cl(s.ultras + delta, 0, 100); s.atmo = cl(s.atmo + delta * 0.4, 0, 100);
    addHist(s.hist, txt); mail("news", "Groupes de supporters", title || "Les tribunes réagissent", `<p>${esc(txt)}</p><p class="hint">Humeur des ultras : ${Math.round(s.ultras)}/100.</p>`);
    bumpFans(delta > 0 ? 1 : -1);
  }
  function onSold(p, club, toClub, top) {
    if (!hasState()) return;
    const star = (top || topIds(club, 3)).includes(p.id), formed = p.formedAt === club.id || p.homegrown;
    let rival = null; try { rival = getRivalClub(club); } catch (e) {}
    const name = p.firstName + " " + p.lastName;
    if (rival && toClub && toClub.id === rival.id) ultraEvent(-22, `Vendre ${name} au rival ${rival.name} ? Les ultras parlent de trahison et déploient une banderole hostile.`, "Colère des ultras");
    else if (star && formed) ultraEvent(-14, `${name}, enfant du club et figure de l'équipe, est vendu : le virage est en deuil.`, "Colère des ultras");
    else if (star) ultraEvent(-8, `Le départ de ${name} fait grincer des dents dans les tribunes.`, "Les supporters regrettent un départ");
    else if (formed && p.overall >= 62) ultraEvent(-4, `${name}, formé au club, s'en va : les supporters soupirent.`);
  }
  function onBought(p, club, fromClub) {
    if (!hasState()) return;
    const name = p.firstName + " " + p.lastName;
    let rival = null; try { rival = getRivalClub(club); } catch (e) {}
    const avgTop = club.players.slice().sort((a, b) => b.overall - a.overall).slice(0, 5).reduce((s, x) => s + x.overall, 0) / 5;
    if (rival && fromClub && fromClub.id === rival.id) ultraEvent(-16, `${name} arrive… de ${rival.name}, le rival ! Les ultras refusent de l'applaudir.`, "Une recrue mal accueillie");
    else if (p.overall >= avgTop + 4) ultraEvent(+8, `Signature de ${name} : le stade se réjouit d'une vraie recrue de prestige.`, "Enthousiasme des supporters");
    else if (p.formedAt === club.id) ultraEvent(+6, `Retour de ${name}, formé au club : les ultras le saluent.`, "Retour d'un enfant du club");
  }

  // -------------------- PRÉSIDENT : demandes --------------------
  function buyerFor(club, fee) {
    const all = allClubs().filter((c) => !isUserClub(c.id) && c.budget >= fee * 0.8 && c.players.length < 30);
    const same = all.filter((c) => c.countryKey === club.countryKey);
    const pool = (same.length ? same : all).sort((a, b) => b.reputation - a.reputation).slice(0, 8);
    return pool.length ? pk(pool) : null;
  }
  function pendingDemand(club) {
    const b = B(), o = owner(club);
    const sorted = club.players.filter((p) => !p.onLoan).sort((a, b2) => b2.value - a.value);
    const cand = sorted.slice(1, 6); // pas l'idole absolue : le président vise un joueur de valeur
    if (!cand.length || club.players.length < 20) return null;
    const p = pk(cand);
    const reasons = { investisseur: "Il veut réaliser une plus-value pour équilibrer les comptes.", ambitieux: "Il a promis un gros investissement ailleurs et réclame des liquidités.", local: "Il a besoin d'argent pour la rénovation du centre d'entraînement.", patient: "Les comptes de l'exercice demandent un coup de pouce." };
    return { type: "sale", pid: p.id, price: Math.round(p.value * (0.95 + Math.random() * 0.1) / 1000) * 1000, why: reasons[o.type] || reasons.local, due: day() + 20 };
  }
  function maybeDemand(club) {
    const b = B(), o = owner(club), p = b.pres;
    if (b.pending || day() - p.lastDemand < 70) return;
    const ego = EGO[o.type] || 40;
    const base = ego / 100 * 0.05 * (1 + (60 - rel()) / 80);
    if (club.budget < 0) { /* club en difficulté : le président est plus pressant */ }
    const prob = base * (club.budget < club.wageBudgetMonthly * 2 ? 2 : 1);
    if (Math.random() > prob) return;
    const roll = Math.random();
    if (roll < 0.6) {
      const d = pendingDemand(club); if (!d) return;
      p.lastDemand = day(); b.pending = d; openDemand();
    } else if (roll < 0.8 && rel() < 45) {
      p.lastDemand = day(); p.adj -= 3; bumpFans(-1);
      const t = `${p.name} critique publiquement vos choix dans la presse.`; addHist(p.hist, t); mail("news", p.name, "Le président hausse le ton", `<p>${esc(t)}</p>`); toast("Le président vous critique en public");
    } else if (rel() >= 70) {
      const g = Math.max(300000, Math.round(Math.max(club.budget, 0) * 0.04 / 50000) * 50000);
      p.lastDemand = day(); club.budget += g; p.adj += 2;
      const t = `${p.name}, satisfait de votre travail, débloque ${money(g)} pour le mercato.`; addHist(p.hist, t); mail("news", p.name, "Coup de pouce du président", `<p>${esc(t)}</p>`); note(t);
    }
  }
  function sellNow(club, p, fee) {
    const buyer = buyerFor(club, fee); if (!buyer) return false;
    try { transferPlayer(p, club.id, buyer.id, fee, {}); } catch (e) { console.warn(e); return false; }
    return buyer;
  }
  function resolveDemand(choice, altId) {
    const b = B(), d = b.pending, club = userClub(); if (!d || !club) return;
    const p = club.players.find((x) => x.id === d.pid), pr = b.pres;
    const finish = (txt) => { addHist(pr.hist, txt); note(txt); b.pending = null; saveGame(); closeModal(); try { render(); } catch (e) {} toast(txt); };
    if (!p) { b.pending = null; closeModal(); return; }
    if (choice === "accept" || (choice === "alt" && altId)) {
      let target = p;
      if (choice === "alt") {
        const alt = club.players.find((x) => x.id === altId);
        const ok = alt && Math.random() < cl(0.35 + rel() / 200 + (alt.value / p.value - 0.7) * 0.4, 0.2, 0.85);
        if (!ok) { pr.adj -= 4; d.altFailed = true; saveGame(); showModal(); toast("Le président insiste : c'est " + p.lastName + " ou rien."); return; }
        target = alt;
      }
      const fee = target === p ? d.price : Math.round(target.value * 0.98 / 1000) * 1000;
      const buyer = sellNow(club, target, fee);
      if (!buyer) { b.pending = null; closeModal(); toast("Aucun acheteur trouvé pour l'instant : le président patiente."); return; }
      pr.adj += choice === "accept" ? 5 : 2;
      finish(`${target.firstName} ${target.lastName} est vendu à ${buyer.name} pour ${money(fee)} à la demande du président.`);
    } else {
      pr.refused++; pr.adj -= 14; bumpConf(-7);
      try { state.ds.reputation = cl(state.ds.reputation - (pr.refused >= 2 ? 2 : 0), 0, 100); } catch (e) {}
      finish(`Vous refusez de vendre ${p.firstName} ${p.lastName} : ${pr.name} le prend très mal (confiance du conseil −7${pr.refused >= 2 ? ", réputation −2" : ""}).`);
    }
  }
  function closeModal() { const r = document.getElementById("bd-root"); if (r) r.innerHTML = ""; }
  function showModal() {
    const b = B(), d = b.pending, club = userClub(); if (!d || !club) return;
    const p = club.players.find((x) => x.id === d.pid); if (!p) { b.pending = null; return; }
    let root = document.getElementById("bd-root"); if (!root) { root = document.createElement("div"); root.id = "bd-root"; document.body.appendChild(root); }
    const alts = club.players.filter((x) => x.id !== p.id && !x.onLoan && x.value >= p.value * 0.6 && x.value <= p.value * 1.3).sort((a, c) => c.value - a.value).slice(0, 3);
    root.innerHTML = `<div class="modal-backdrop bd-bg"><div class="bd-modal" role="dialog" aria-label="Demande du président">
      <h3>🎩 ${esc(b.pres.name)} exige une vente</h3>
      <p>${esc(d.why)} Il souhaite voir partir <b>${esc(p.firstName + " " + p.lastName)}</b> (${p.age} ans, valeur ${money(p.value)}) pour environ <b>${money(d.price)}</b>.</p>
      <p class="hint">Relation avec le président : ${rel()}/100. Refuser coûtera de la confiance.</p>
      <div class="bd-actions"><button class="btn btn-primary" data-bd="accept">Accepter la vente</button>
      ${!d.altFailed && alts.length ? alts.map((a) => `<button class="btn btn-ghost" data-bd="alt" data-id="${a.id}">Proposer ${esc(a.lastName)} à la place</button>`).join("") : ""}
      <button class="btn btn-ghost bd-no" data-bd="refuse">Refuser</button></div></div></div>`;
  }
  function openDemand() { try { showModal(); } catch (e) {} }

  // -------------------- tick hebdomadaire --------------------
  function weekly() {
    const club = userClub(); if (!club) return;
    const b = B(), p = b.pres, s = b.sup;
    p.adj *= 0.97; if (Math.abs(p.adj) < 0.3) p.adj = 0;
    let form = 0.5; try { const r = getRecentForm(club, 5); if (r.length) form = r.reduce((a, x) => a + (x.result === "W" ? 3 : x.result === "D" ? 1 : 0), 0) / (r.length * 3); } catch (e) {}
    const fans = state.media ? state.media.fans : 60;
    s.ultras = cl(s.ultras + (form - 0.5) * 7 + (55 - s.ultras) * 0.04, 0, 100);
    const target = fans * 0.45 + s.ultras * 0.3 + form * 100 * 0.25;
    s.atmo = cl(s.atmo + (target - s.atmo) * 0.2, 0, 100);
    if (s.ultras < 22 && Math.random() < 0.25) {
      const t = pk(["Les ultras tournent le dos à l'équipe pendant tout le match.", "Banderoles hostiles à la direction dans le virage.", "Les ultras sifflent l'équipe à la mi-temps."]);
      addHist(s.hist, t); mail("news", "Groupes de supporters", "Grogne dans les tribunes", `<p>${esc(t)}</p><p class="hint">Rencontrez leurs représentants (onglet Club) pour apaiser la situation.</p>`); bumpFans(-2); bumpConf(-1);
    }
    s.boycott = s.ultras < 12 ? 1 : 0;
    if (s.ultras > 78 && Math.random() < 0.15) {
      const t = pk(["Superbe tifo dans le virage : l'ambiance est électrique !", "Les ultras fêtent l'équipe avec un chant à l'unisson.", "Une atmosphère de feu au stade ce week-end."]);
      addHist(s.hist, t); bumpFans(1); mail("news", "Groupes de supporters", "Grande ambiance", `<p>${esc(t)}</p>`);
    }
    maybeDemand(club);
    if (!b.pending && day() % 14 === 3 && false) {}
  }

  // -------------------- actions du joueur --------------------
  function meetPresident() {
    const b = B(), p = b.pres, club = userClub();
    if (day() - p.lastMeet < 60) return { ok: false, msg: `Prochain entretien possible dans ${60 - (day() - p.lastMeet)} jours.` };
    p.lastMeet = day(); const g = ri(4, 8); p.adj += g;
    note(`Entretien avec ${p.name} : la relation s'améliore (+${g}).`);
    return { ok: true, msg: `Entretien constructif avec ${p.name} : relation +${g}.` };
  }
  function meetUltras() {
    const s = sup(); if (day() - s.lastMeet < 45) return { ok: false, msg: `Prochaine rencontre possible dans ${45 - (day() - s.lastMeet)} jours.` };
    s.lastMeet = day(); const g = ri(8, 14); s.ultras = cl(s.ultras + g, 0, 100); addHist(s.hist, `Rencontre avec les représentants des ultras : le dialogue apaise les tensions (+${g}).`);
    return { ok: true, msg: `Dialogue avec les ultras : humeur +${g}.` };
  }
  function tifo() {
    const s = sup(), club = userClub(), cost = Math.max(20000, Math.round(Math.min(Math.max(club.budget, 0) * 0.01, 120000) / 5000) * 5000);
    if (day() - s.lastTifo < 60) return { ok: false, msg: `Un tifo tous les 60 jours maximum (encore ${60 - (day() - s.lastTifo)} j).` };
    if (club.budget < cost) return { ok: false, msg: "Budget insuffisant pour financer le tifo." };
    club.budget -= cost; s.lastTifo = day(); s.atmo = cl(s.atmo + 8, 0, 100); s.ultras = cl(s.ultras + 5, 0, 100); bumpFans(2);
    addHist(s.hist, `Le club finance un tifo (${money(cost)}) : le virage est ravi.`);
    return { ok: true, msg: `Tifo financé (${money(cost)}) : ambiance +8.` };
  }

  // -------------------- interface (onglet Club) --------------------
  const gauge = (l, v, hint) => `<div class="bd-g"><span>${l}</span><div class="bd-bar"><i style="width:${Math.round(v)}%;background:${v >= 65 ? "#2e8b4f" : v >= 40 ? "#b9862e" : "#b04040"}"></i></div><b>${Math.round(v)}</b>${hint ? `<small class="hint"> ${hint}</small>` : ""}</div>`;
  function panel() {
    const club = userClub(); if (!club) return "";
    const b = B(), o = owner(club), p = b.pres, s = b.sup, r = rel();
    const ego = EGO[o.type] || 40, egoL = ego >= 65 ? "Interventionniste" : ego >= 45 ? "Présent" : "Discret";
    const left = Math.max(0, (o.patience || 3) - (o.badSeasons || 0));
    const atmoL = s.atmo >= 75 ? "Stade en fusion" : s.atmo >= 55 ? "Bonne ambiance" : s.atmo >= 35 ? "Tribunes tièdes" : "Ambiance glaciale";
    return `<div class="dossier bd-card" id="bd-panel"><h3 class="panel-subtitle">🎩 Le président</h3>
      <div class="bd-pres"><div class="bd-av">${esc(p.name.split(" ").map((w) => w[0]).join(""))}</div><div><b>${esc(p.name)}</b><p class="hint" style="margin:2px 0 0">${esc(o.label || "")} · ${esc(STYLE[o.type] || "")}</p></div></div>
      ${gauge("Relation", r)}${gauge("Patience", cl(left / Math.max(1, o.patience || 3) * 100, 0, 100), left + " saison(s) de marge")}
      <p class="hint">Ingérence : <b>${egoL}</b>${o.forSale ? ' · <span class="result-bad">menace de vendre le club</span>' : ""}. Il peut exiger la vente d'un joueur ; mieux vaut garder de bonnes relations.</p>
      <button class="btn btn-small btn-primary" data-bd="meet-pres">Demander un entretien</button>
      ${p.hist.length ? `<ul class="bd-hist">${p.hist.slice(0, 4).map((h) => `<li><span class="hint">${esc(h.d)}</span> ${esc(h.t)}</li>`).join("")}</ul>` : ""}
      <h3 class="panel-subtitle">🏟️ Supporters et ambiance</h3>
      ${gauge("Ambiance du stade", s.atmo, atmoL)}${gauge("Humeur des ultras", s.ultras)}
      ${s.boycott ? '<p class="result-bad">Les ultras boycottent les matchs : l\'affluence chute.</p>' : ""}
      <div class="bd-btns"><button class="btn btn-small btn-ghost" data-bd="meet-ultras">Rencontrer les ultras</button><button class="btn btn-small btn-ghost" data-bd="tifo">Financer un tifo</button></div>
      <p class="hint" id="bd-msg"></p>
      ${s.hist.length ? `<ul class="bd-hist">${s.hist.slice(0, 5).map((h) => `<li><span class="hint">${esc(h.d)}</span> ${esc(h.t)}</li>`).join("")}</ul>` : ""}</div>`;
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-bd]"); if (!t || !hasState()) return;
    const a = t.dataset.bd;
    if (a === "accept") resolveDemand("accept");
    else if (a === "refuse") resolveDemand("refuse");
    else if (a === "alt") resolveDemand("alt", +t.dataset.id);
    else if (a === "meet-pres" || a === "meet-ultras" || a === "tifo") {
      const r = a === "meet-pres" ? meetPresident() : a === "meet-ultras" ? meetUltras() : tifo();
      try { saveGame(); } catch (x) {}
      toast(r.msg); try { render(); } catch (x) {}
    }
  });

  // -------------------- branchements --------------------
  const origTr = window.transferPlayer;
  if (typeof origTr === "function") window.transferPlayer = function (player, fromId, toId) {
    let from = null, to = null; let top = null; try { from = getClub(fromId); to = getClub(toId); if (from) top = topIds(from, 3); } catch (e) {}
    const r = origTr.apply(this, arguments);
    try {
      if (hasState() && !B().busy) {
        if (from && isUserClub(from.id) && to && !isUserClub(to.id)) onSold(player, from, to, top);
        else if (to && isUserClub(to.id) && from && !isUserClub(from.id)) onBought(player, to, from);
      }
    } catch (e) { console.warn("board2", e); }
    return r;
  };
  const origAdv = window.advanceDay;
  if (typeof origAdv === "function") window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (hasState() && userClub() && day() % 7 === 3) weekly(); } catch (e) { console.warn("board2 weekly", e); }
    return r;
  };
  const origAtt = window.attendanceRate;
  if (typeof origAtt === "function") window.attendanceRate = function (club) {
    let r = origAtt.apply(this, arguments);
    try { if (hasState() && isUserClub(club.id)) { const s = sup(); r *= 0.9 + s.atmo / 100 * 0.18; if (s.boycott) r *= 0.82; r = cl(r, 0.2, 0.99); } } catch (e) {}
    return r;
  };
  const origClub = window.renderClubTab;
  if (typeof origClub === "function") window.renderClubTab = function () { const base = origClub.apply(this, arguments); try { return base + panel(); } catch (e) { return base; } };
  const origRender = window.render;
  if (typeof origRender === "function") window.render = function () {
    const r = origRender.apply(this, arguments);
    try { if (hasState() && state.board2 && state.board2.pending && !document.querySelector("#bd-root .bd-modal")) showModal(); } catch (e) {}
    return r;
  };
  window.dsBoard = { B, rel, weekly, onSold, onBought, resolveDemand, maybeDemand, meetPresident, meetUltras, tifo, pendingDemand, showModal };
})();
