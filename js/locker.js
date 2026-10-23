// ===================================================================
// BLOC 23 (1/4) — HIÉRARCHIE DU VESTIAIRE ET PRESSE
//  Vestiaire : influence de chaque joueur (leadership, ancienneté, niveau, âge), capitaine nommé par vous, vice-capitaine,
//    leaders et joueurs d'influence, clans (nationalité, jeunes, anciens, formés au club). Vendre un joueur d'influence
//    secoue le groupe (plus fort chez son clan) ; vendre un élément toxique soulage. Climat du vestiaire.
//  Presse : interviews (après un résultat, avant un derby, sur une rumeur…) avec 3 tons : calme, offensif, évasif.
//    Effets sur les supporters, le vestiaire, le président et la relation avec les agents (négociations).
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pk = (a) => a[Math.floor(Math.random() * a.length)];
  const hasState = () => typeof state !== "undefined" && state && state.ds && state.countries && typeof userClub === "function" && !!userClub();
  const day = () => state.dayCounter || 0;
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const toast = (t) => { try { window.dsToast && window.dsToast(t); } catch (e) {} };
  const hu = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const happyOf = (p) => (p.happy === undefined ? 62 : p.happy);
  const setHappy = (p, d) => { p.happy = cl(Math.round((happyOf(p) + d) * 10) / 10, 0, 100); p.morale = cl(Math.round((p.morale === undefined ? 65 : p.morale) + d * 0.7), 0, 100); };

  // ===================================================================
  // 1. HIÉRARCHIE
  // ===================================================================
  function tenure(club, p) {
    if (p.arrDay != null) return Math.max(0, (day() - p.arrDay) / 365);
    return p.formedAt === club.id || p.homegrown ? Math.max(1, p.age - 17) : 1 + Math.floor(hu(p.id) * 6);
  }
  function influence(club, p) {
    const lead = (p.attributes && p.attributes.leadership) || 10;
    const v = lead * 2.6 + Math.min(10, tenure(club, p) * 1.4) + (p.age >= 27 ? 4 : p.age >= 24 ? 2 : -3) + p.overall * 0.28 + Math.min(8, (p.internationalCaps || 0) * 0.1) + (p.formedAt === club.id ? 4 : 0) + (p.profile && p.profile.k === "leader" ? 8 : 0);
    return Math.round(cl(v, 5, 99));
  }
  function clanOf(club, p, natCount) {
    if (natCount[p.nationality] >= 3 && p.nationality !== COUNTRIES[club.countryKey].label) return "Clan " + p.nationality;
    if (p.formedAt === club.id || p.homegrown) return "Formés au club";
    if (p.age <= 21) return "Les jeunes";
    if (p.age >= 30) return "Les anciens";
    return "Le groupe";
  }
  const LK = () => { state.locker = state.locker || { capId: null, viceId: null, lastCap: -999, hist: [] }; return state.locker; };
  function hierarchy(club) {
    club = club || userClub();
    const nat = {}; club.players.forEach((p) => { nat[p.nationality] = (nat[p.nationality] || 0) + 1; });
    const rows = club.players.filter((p) => !p.onLoan).map((p) => ({ p, inf: influence(club, p), clan: clanOf(club, p, nat) })).sort((a, b) => b.inf - a.inf);
    const L = LK();
    let cap = rows.find((r) => r.p.id === L.capId);
    if (!cap) { const c = rows.filter((r) => r.p.age >= 22)[0] || rows[0]; cap = c; if (c) L.capId = c.p.id; }
    let vice = rows.find((r) => r.p.id === L.viceId && cap && r.p.id !== cap.p.id);
    if (!vice) { vice = rows.find((r) => cap && r.p.id !== cap.p.id && r.p.age >= 22); if (vice) L.viceId = vice.p.id; }
    rows.forEach((r, i) => { r.role = cap && r.p.id === cap.p.id ? "Capitaine" : vice && r.p.id === vice.p.id ? "Vice-capitaine" : i < 4 ? "Leader" : i < 9 ? "Influent" : ""; });
    return { rows, cap, vice };
  }
  const WEIGHT = { Capitaine: 1, "Vice-capitaine": 0.6, Leader: 0.5, Influent: 0.25, "": 0.05 };
  function saleImpact(club, row, H) {
    const w = WEIGHT[row.role] || 0.05, base = w * 11;
    return { all: Math.round(base * 10) / 10, clan: Math.round(base * 1.7 * 10) / 10, toxic: happyOf(row.p) < 40 };
  }
  function climate(club) {
    const H = hierarchy(club), top = H.rows.slice(0, 8);
    if (!top.length) return 60;
    let v = top.reduce((s, r) => s + happyOf(r.p) * (WEIGHT[r.role] + 0.3), 0) / top.reduce((s, r) => s + WEIGHT[r.role] + 0.3, 0);
    return Math.round(cl(v, 0, 100));
  }

  function onSold(p, club, toClub) {
    if (!hasState() || !isUserClub(club.id)) return;
    const L = LK();
    // on recalcule la hiérarchie AVANT le départ : on remet le joueur dans l'effectif le temps du calcul
    const before = club.players.concat([p]);
    const fake = { ...club, players: before };
    const H = hierarchy(fake), row = H.rows.find((r) => r.p.id === p.id); if (!row) return;
    const imp = saleImpact(club, row, H);
    const squad = club.players;
    let txt;
    if (imp.toxic && row.role !== "Capitaine") {
      squad.forEach((q) => setHappy(q, +1.5));
      txt = `${p.firstName} ${p.lastName}, en froid avec le groupe, part sans que personne ne le regrette : l'ambiance s'allège.`;
    } else if (imp.all >= 1.5) {
      squad.forEach((q) => { const same = clanOf(club, q, {}) === row.clan || (row.clan.startsWith("Clan") && q.nationality === p.nationality); setHappy(q, -(same ? imp.clan : imp.all)); });
      txt = `${row.role ? row.role + " du vestiaire" : "Cadre"}, ${p.firstName} ${p.lastName} est parti${row.role === "Capitaine" ? " : le groupe perd son capitaine" : ""}. Le moral baisse (${row.clan} : −${imp.clan}, autres : −${imp.all}).`;
    } else return;
    if (row.role === "Capitaine") { L.capId = null; L.viceId = L.viceId === p.id ? null : L.viceId; }
    if (L.viceId === p.id) L.viceId = null;
    L.hist.unshift({ date: fmtDate(state.date), text: txt }); L.hist.length = Math.min(L.hist.length, 12);
    note(txt); mail("news", "Vestiaire", "Le vestiaire réagit à un départ", `<p>${esc(txt)}</p><p class="hint">Pensez à nommer un nouveau capitaine si besoin (onglet Vestiaire).</p>`);
    toast("Le vestiaire réagit au départ de " + p.lastName);
  }
  function setCaptain(id, vice) {
    const club = userClub(), L = LK();
    if (!vice && day() - L.lastCap < 30) return { ok: false, msg: `Un changement de capitaine est possible dans ${30 - (day() - L.lastCap)} jours.` };
    const H = hierarchy(club), r = H.rows.find((x) => x.p.id === id); if (!r) return { ok: false, msg: "Joueur introuvable." };
    if (vice) { L.viceId = id; return { ok: true, msg: `${r.p.lastName} est vice-capitaine.` }; }
    const old = H.cap && H.cap.p;
    if (old && old.id === id) return { ok: false, msg: "Il est déjà capitaine." };
    L.capId = id; if (L.viceId === id) L.viceId = null; L.lastCap = day();
    setHappy(r.p, +7);
    if (old) { setHappy(old, -(H.cap.inf >= 70 ? 7 : 3)); }
    const nm = `${r.p.firstName} ${r.p.lastName}`;
    const reacts = H.rows.filter((x) => x.p.id !== id && x.inf >= r.inf + 8 && x.p.age >= 26).slice(0, 2);
    reacts.forEach((x) => setHappy(x.p, -3));
    const t = `${nm} reçoit le brassard de capitaine${old ? " (remplaçant " + old.lastName + ")" : ""}.${reacts.length ? " " + reacts.map((x) => x.p.lastName).join(" et ") + " ne cachent pas leur déception." : ""}`;
    L.hist.unshift({ date: fmtDate(state.date), text: t }); note(t);
    return { ok: true, msg: t };
  }
  function weeklyLocker() {
    const club = userClub(); if (!club) return;
    const c = climate(club);
    if (c < 42) club.players.forEach((p) => setHappy(p, -0.8));
    else if (c > 72) club.players.forEach((p) => setHappy(p, +0.4));
    LK().climate = c;
  }

  // ----- interface Vestiaire -----
  const BADGE = { Capitaine: "©", "Vice-capitaine": "VC", Leader: "★", Influent: "●" };
  function lockerPanel() {
    const club = userClub(); if (!club) return "";
    const H = hierarchy(club), c = climate(club), L = LK();
    const top = H.rows.slice(0, 12);
    const clans = {}; H.rows.forEach((r) => { (clans[r.clan] = clans[r.clan] || []).push(r); });
    const climTxt = c >= 72 ? "Excellent : le groupe est soudé" : c >= 55 ? "Correct" : c >= 42 ? "Tendu" : "Tendu à l'extrême : risque de crise";
    return `<div class="dossier lk-card" id="lk-panel"><h3 class="panel-subtitle">🎖️ Hiérarchie du vestiaire</h3>
      <p class="hint">Climat du vestiaire : <b>${c}/100</b> — ${climTxt}. Capitaine : <b>${H.cap ? esc(H.cap.p.firstName + " " + H.cap.p.lastName) : "—"}</b>${H.vice ? " · vice-capitaine : " + esc(H.vice.p.lastName) : ""}.</p>
      <div class="table-wrap"><table class="fm-table"><thead><tr><th></th><th>Joueur</th><th>Influence</th><th>Clan</th><th>Moral</th><th>Si vendu</th><th></th></tr></thead><tbody>
      ${top.map((r) => { const im = saleImpact(club, r, H); return `<tr><td>${BADGE[r.role] || ""}</td><td>${esc(r.p.firstName[0] + ". " + r.p.lastName)}<br><span class="hint">${esc(r.role || "")}</span></td><td><span class="lk-bar"><i style="width:${r.inf}%"></i></span> ${r.inf}</td><td>${esc(r.clan)}</td><td>${Math.round(happyOf(r.p))}</td><td>${im.toxic && r.role !== "Capitaine" ? "<span class='result-good'>+1,5 (soulagement)</span>" : im.all >= 1.5 ? "−" + im.all + " (clan −" + im.clan + ")" : "négligeable"}</td>
        <td>${r.role === "Capitaine" ? "" : `<button class="btn btn-small btn-ghost" data-lk="cap" data-id="${r.p.id}">Capitaine</button> <button class="btn btn-small btn-ghost" data-lk="vice" data-id="${r.p.id}">VC</button>`}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="hint">Clans : ${Object.entries(clans).map(([k, a]) => `${esc(k)} (${a.length})`).join(" · ")}</p>
      ${L.hist.length ? `<p class="hint">${L.hist.slice(0, 3).map((h) => esc(h.date) + " — " + esc(h.text)).join("<br>")}</p>` : ""}
      <p class="hint" id="lk-msg"></p></div>`;
  }

  // ===================================================================
  // 2. PRESSE
  // ===================================================================
  const PR = () => { state.press = state.press || { pending: null, last: -999, hist: [], agents: {}, tones: { calme: 0, offensif: 0, evasif: 0 } }; return state.press; };
  const TONES = { calme: "Calme et mesuré", offensif: "Offensif, sans filtre", evasif: "Évasif" };
  function ctxList(club) {
    const out = [];
    let f = []; try { f = getRecentForm(club, 5); } catch (e) {}
    const lastR = f[f.length - 1];
    if (lastR && lastR.result === "W" && lastR.gf - lastR.ga >= 2) out.push({ k: "win", q: `Belle victoire ${lastR.gf}-${lastR.ga} contre ${lastR.opponent ? lastR.opponent.name : "votre adversaire"} : les journalistes vous demandent si l'équipe peut viser plus haut.` });
    const lossRun = f.slice(-3).length === 3 && f.slice(-3).every((x) => x.result === "L");
    if (lossRun || (lastR && lastR.result === "L" && lastR.ga - lastR.gf >= 3)) out.push({ k: "loss", q: lossRun ? "Trois défaites de suite : la presse s'interroge sur votre travail et sur l'état d'esprit du groupe." : `Lourde défaite ${lastR.gf}-${lastR.ga} : on vous demande des comptes.` });
    try { const nx = getNextFixture(club), riv = getRivalClub(club); if (nx && riv && (nx.home.id === riv.id || nx.away.id === riv.id)) out.push({ k: "derby", q: `Le derby contre ${riv.name} approche : les journalistes veulent votre état d'esprit.` }); } catch (e) {}
    let star = null; try { star = club.players.filter((p) => !p.onLoan).sort((a, b) => b.value - a.value)[0]; } catch (e) {}
    if (star && currentWindow()) out.push({ k: "rumor", pid: star.id, q: `Une rumeur annonce ${star.firstName} ${star.lastName} dans le viseur d'un grand club. Est-il vendeur, est-il sur le départ ?`, agency: star.agent && star.agent.agency });
    try { const r = dsBoard.rel(); if (r < 40) out.push({ k: "pres", q: "Les relations avec la présidence semblent tendues, selon la presse. Que répondez-vous ?" }); } catch (e) {}
    if (!out.length) out.push({ k: "gen", q: "Un point de situation sur la saison, votre mercato et vos ambitions pour le club ?" });
    return out;
  }
  const FX = {
    // [fans, presse, vestiaire, président, agents, ultras]
    win: { calme: [1, 1, 1, 1, 1, 0], offensif: [3, -1, 2, 0, -2, 2], evasif: [-1, -2, 0, 0, 0, 0] },
    loss: { calme: [2, 1, 1, 1, 1, 1], offensif: [-2, -3, -3, -2, -3, -2], evasif: [-1, -1, -1, 0, 0, -1] },
    derby: { calme: [1, 1, 1, 1, 0, 0], offensif: [4, -1, 3, 1, -1, 4], evasif: [-2, -1, -1, 0, 0, -2] },
    rumor: { calme: [1, 1, 1, 1, 1, 0], offensif: [2, -1, 1, 0, -4, 1], evasif: [-1, -1, 0, 1, 2, 0] },
    pres: { calme: [1, 1, 1, 2, 1, 0], offensif: [2, -2, 1, -4, -1, 1], evasif: [0, -1, 0, 1, 0, 0] },
    gen: { calme: [1, 1, 1, 1, 1, 0], offensif: [2, -1, 2, 0, -2, 1], evasif: [-1, -1, 0, 0, 0, -1] }
  };
  const HINT = { calme: "Posé, sans risque : un petit gain partout.", offensif: "Fort mais risqué : peut galvaniser… ou déraper.", evasif: "Vous ne dites rien : peu de risques, mais la presse s'agace." };
  function agencyRel(a) { return PR().agents[a] || 0; }
  function agentMood(agent) {
    try {
      const g = PR().agents.__all || 0, s = agent && agent.agency ? agencyRel(agent.agency) : 0;
      return Math.round(cl(g * 1.6 + s * 2, -30, 30));
    } catch (e) { return 0; }
  }
  function bumpAgents(all, one) { const A = PR().agents; A.__all = cl((A.__all || 0) + all, -15, 15); if (one && one.a) A[one.a] = cl((A[one.a] || 0) + one.v, -15, 15); }
  function openInterview(manual) {
    const club = userClub(); if (!club) return null;
    const P = PR(); if (P.pending) return P.pending;
    const list = ctxList(club), c = pk(list);
    P.pending = { ...c, manual: !!manual, day: day() };
    return P.pending;
  }
  function answer(tone) {
    const P = PR(), pd = P.pending, club = userClub(); if (!pd || !club) return null;
    const row = (FX[pd.k] || FX.gen)[tone], v = row.map((x) => x + (Math.random() < 0.35 ? pk([-1, 1]) : 0));
    let slip = false;
    if (tone === "offensif" && Math.random() < (pd.k === "loss" ? 0.45 : 0.22)) { slip = true; v[0] -= 3; v[3] -= 3; v[1] -= 2; }
    if (state.media) { state.media.fans = cl(state.media.fans + v[0], 0, 100); state.media.press = cl((state.media.press || 55) + v[1], 0, 100); }
    club.players.forEach((p) => setHappy(p, v[2] * 0.8));
    try { const b = dsBoard.B(); b.pres.adj += v[3]; b.sup.ultras = cl(b.sup.ultras + v[5], 0, 100); b.sup.atmo = cl(b.sup.atmo + v[0] * 0.5, 0, 100); } catch (e) {}
    bumpAgents(v[4] * 0.5, pd.agency ? { a: pd.agency, v: v[4] } : null);
    P.tones[tone]++;
    const sum = (v0, l) => (v0 > 0 ? "+" + v0 : v0 < 0 ? "−" + Math.abs(v0) : "=") + " " + l;
    const res = `Interview (${TONES[tone]}) : ${slip ? "dérapage ! " : ""}${[sum(v[0], "supporters"), sum(v[2], "vestiaire"), sum(v[3], "président"), sum(v[4], "agents"), sum(v[1], "presse")].join(" · ")}.`;
    P.hist.unshift({ date: fmtDate(state.date), k: pd.k, tone, slip, res }); P.hist.length = Math.min(P.hist.length, 15);
    P.last = day(); P.pending = null;
    note(res);
    mail("news", "Presse", slip ? "Interview : un dérapage fait du bruit" : "Votre interview fait réagir", `<p>${esc(res)}</p>`);
    return { res, slip };
  }
  function modal() {
    const P = PR(), pd = P.pending; if (!pd) return;
    let root = document.getElementById("pr-root"); if (!root) { root = document.createElement("div"); root.id = "pr-root"; document.body.appendChild(root); }
    root.innerHTML = `<div class="modal-backdrop pr-bg"><div class="pr-modal dossier" role="dialog" aria-label="Interview"><h3>🎙️ Conférence de presse</h3>
      <p class="pr-q">« ${esc(pd.q)} »</p><p class="hint">Choisissez votre ton. Il influence les supporters, le vestiaire, le président et les agents.</p>
      ${Object.keys(TONES).map((k) => `<button class="btn ${k === "calme" ? "btn-primary" : "btn-ghost"} pr-tone" data-pr="${k}"><b>${TONES[k]}</b><br><span class="hint">${HINT[k]}</span></button>`).join("")}
      <button class="btn btn-ghost btn-small" data-pr="skip">Pas de commentaire (la presse s'en agace)</button></div></div>`;
  }
  function closeModal() { const r = document.getElementById("pr-root"); if (r) r.innerHTML = ""; }
  const autoOn = () => { try { return localStorage.getItem("ds_press_auto") !== "0"; } catch (e) { return true; } };
  function weeklyPress() {
    const club = userClub(); if (!club) return;
    const P = PR();
    if (!autoOn()) return;
    if (P.pending || day() - P.last < 21 || Math.random() > 0.5) return;
    if (openInterview(false)) { P.autoShow = true; }
  }
  function pressPanel() {
    const P = PR(), cd = Math.max(0, 14 - (day() - P.last));
    const A = Object.entries(P.agents).filter(([k]) => k !== "__all").sort((a, b) => a[1] - b[1]);
    const g = P.agents.__all || 0;
    return `<div class="dossier pr-card" id="pr-panel"><h3 class="panel-subtitle">🎙️ Presse et agents</h3>
      <p class="hint">Interviews données : ${P.tones.calme + P.tones.offensif + P.tones.evasif} (calme ${P.tones.calme} · offensif ${P.tones.offensif} · évasif ${P.tones.evasif}). Relation générale avec les agents : <b>${g > 4 ? "bonne" : g < -4 ? "dégradée" : "neutre"}</b> (${g > 0 ? "+" : ""}${Math.round(g * 10) / 10}) — elle joue sur la patience des agents en négociation.</p>
      <button class="btn btn-small btn-primary" data-pr="ask" ${cd ? "disabled" : ""}>${cd ? "Prochaine interview dans " + cd + " j" : "Donner une interview"}</button>
      <button class="btn btn-small btn-ghost" data-pr="auto">Interviews automatiques : ${autoOn() ? "activées" : "désactivées"}</button>
      ${A.length ? `<p class="hint">Agences : ${A.slice(0, 5).map(([k, v]) => esc(k) + " " + (v > 0 ? "+" : "") + Math.round(v)).join(" · ")}</p>` : ""}
      ${P.hist.length ? `<p class="hint">${P.hist.slice(0, 4).map((h) => esc(h.date) + " — " + esc(h.res)).join("<br>")}</p>` : ""}</div>`;
  }

  document.addEventListener("click", (e) => {
    if (!hasState()) return;
    const t = e.target.closest && e.target.closest("[data-pr]");
    if (t) {
      const a = t.dataset.pr;
      if (a === "ask") { openInterview(true); modal(); return; }
      if (a === "skip") { const P = PR(); P.pending = null; P.last = day(); if (state.media) state.media.press = cl((state.media.press || 55) - 2, 0, 100); closeModal(); try { render(); } catch (x) {} return; }
      if (a === "auto") { try { localStorage.setItem("ds_press_auto", autoOn() ? "0" : "1"); } catch (x) {} try { render(); } catch (x) {} return; }
      if (TONES[a]) { const r = answer(a); closeModal(); try { saveGame(); } catch (x) {} if (r) toast(r.res); try { render(); } catch (x) {} return; }
    }
    const l = e.target.closest && e.target.closest("[data-lk]");
    if (l) {
      const r = setCaptain(parseInt(l.dataset.id, 10), l.dataset.lk === "vice");
      toast(r.msg); try { saveGame(); render(); } catch (x) {}
    }
  });

  // ----- branchements -----
  const oAdv = window.advanceDay;
  if (typeof oAdv === "function") window.advanceDay = function () {
    const r = oAdv.apply(this, arguments);
    try { if (hasState()) { if (day() % 7 === 3) { weeklyLocker(); weeklyPress(); } } } catch (e) { console.warn("locker", e); }
    return r;
  };
  const oTr = window.transferPlayer;
  if (typeof oTr === "function") window.transferPlayer = function (player, fromId, toId) {
    let from = null, to = null; try { from = getClub(fromId); to = getClub(toId); } catch (e) {}
    const r = oTr.apply(this, arguments);
    try {
      if (hasState()) {
        if (from && isUserClub(from.id) && !(to && isUserClub(to.id))) { onSold(player, from, to); if (player.agent) bumpAgents(0, { a: player.agent.agency, v: -1 }); }
        if (to && isUserClub(to.id)) { player.arrDay = day(); if (player.agent) bumpAgents(0, { a: player.agent.agency, v: 2 }); }
      }
    } catch (e) { console.warn("locker transfer", e); }
    return r;
  };
  const oDyn = window.renderDynamics;
  if (typeof oDyn === "function") window.renderDynamics = function () { const b = oDyn.apply(this, arguments); try { return lockerPanel() + b; } catch (e) { return b; } };
  const oClub = window.renderClubTab;
  if (typeof oClub === "function") window.renderClubTab = function () { const b = oClub.apply(this, arguments); try { return b + pressPanel(); } catch (e) { return b; } };
  const oRender = window.render;
  if (typeof oRender === "function") window.render = function () {
    const r = oRender.apply(this, arguments);
    try {
      if (hasState() && state.press && state.press.pending && state.press.autoShow && !document.querySelector(".modal-backdrop:not(.pr-bg)") && !document.querySelector("#pr-root .pr-modal")) { state.press.autoShow = false; modal(); }
    } catch (e) {}
    return r;
  };
  window.dsLocker = { hierarchy, influence, climate, setCaptain, onSold, LK, lockerPanel };
  window.dsPress = { PR, openInterview, answer, modal, ctxList, agentMood, pressPanel, FX };
})();
