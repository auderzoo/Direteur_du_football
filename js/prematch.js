// ===================================================================
// BLOC 19 — Avant-match : compositions, simuler ou assister au match en 2D
//  - la veille d'un match du club (championnat, coupe, Europe), « Continuer » ouvre
//    l'écran d'avant-match : compositions des deux équipes sur le terrain, forces,
//    probabilités, tactique modifiable, joueurs indisponibles
//  - « Simuler » : le match est joué comme avant (résumé FM24 ensuite)
//  - « Assister au match » : le match est joué puis rejoué en direct sur un terrain 2D
//    (passes, tirs, arrêts, buts, cartons, remplacements) fidèle au score réel
//  - réglage « Afficher l'écran d'avant-match » dans l'onglet Club (localStorage ds_prematch)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const hasState = () => typeof state !== "undefined" && state && state.ds;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const keyOf = (d) => new Date(d).toISOString().slice(0, 10);
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const enabled = () => { try { return localStorage.getItem("ds_prematch") !== "0"; } catch (e) { return true; } };
  const setEnabled = (v) => { try { localStorage.setItem("ds_prematch", v ? "1" : "0"); } catch (e) {} };

  // ---------------------------------------------------------------
  // 1. Détection du prochain match du club
  // ---------------------------------------------------------------
  function sideInfo(id) {
    if (typeof id === "string") {
      let g = null;
      try { const m = /^g:([A-Z]+):/.exec(id); if (m && state.euro && state.euro.ghosts) g = (state.euro.ghosts[m[1]] || []).find((x) => x.id === id); } catch (e) {}
      return { id, ghost: true, name: g ? g.name : "Équipe européenne", club: null };
    }
    const c = getClub(id);
    return c ? { id, ghost: false, name: c.name, club: c } : null;
  }
  function findMatch(dateKey) {
    if (!hasState()) return null;
    const uid = state.userClubId;
    if (uid == null) return null;
    const mk = (kind, label, hid, aid) => {
      const h = sideInfo(hid), a = sideInfo(aid);
      if (!h || !a) return null;
      return { kind, label, dateKey, home: h, away: a, userHome: hid === uid };
    };
    // championnat
    try {
      for (const country of Object.values(state.countries)) {
        for (const league of Object.values(country.leagues)) {
          for (const round of league.fixtures) {
            if (round.date.slice(0, 10) !== dateKey) continue;
            const m = round.matches.find((x) => !x.played && (x.home === uid || x.away === uid));
            if (m) return mk("league", league.name, m.home, m.away);
          }
        }
      }
    } catch (e) { console.warn("prematch/league", e); }
    // coupes nationales
    try {
      for (const cup of Object.values(state.cups.national || {})) {
        if (!cup || cup.champion) continue;
        const round = cup.rounds[cup.rounds.length - 1];
        if (!round || round.date.slice(0, 10) !== dateKey) continue;
        const m = round.matches.find((x) => !x.played && (x.home === uid || x.away === uid));
        if (m) return mk("cup", cup.label, m.home, m.away);
      }
      const cc = state.cups.continental;
      if (cc && !cc.champion) {
        const round = cc.rounds[cc.rounds.length - 1];
        if (round && round.date.slice(0, 10) === dateKey) {
          const m = round.matches.find((x) => !x.played && (x.home === uid || x.away === uid));
          if (m) return mk("cup", cc.label, m.home, m.away);
        }
      }
    } catch (e) { console.warn("prematch/cup", e); }
    // coupes d'Europe
    try {
      const comps = state.euro && state.euro.comps;
      if (comps) {
        const labels = { ucl: "Ligue des Champions", uel: "Ligue Europa", uecl: "Ligue Conférence" };
        for (const ck of Object.keys(comps)) {
          const comp = comps[ck];
          const all = (comp.matches || []).concat([].concat(...(comp.ko || []).map((r) => [].concat(...r.ties.map((t) => t.legs)))));
          const m = all.find((x) => !x.played && String(x.date).slice(0, 10) === dateKey && (x.home === uid || x.away === uid));
          if (m) return mk("euro", (labels[ck] || ck) + (m.round ? " — " + m.round : ""), m.home, m.away);
        }
      }
    } catch (e) { console.warn("prematch/euro", e); }
    return null;
  }
  const tomorrowKey = () => keyOf(new Date(state.date.getTime() + 24 * 3600 * 1000));

  // ---------------------------------------------------------------
  // 2. Compositions & couleurs
  // ---------------------------------------------------------------
  const QUOTA = (f) => (typeof FORMATION_QUOTAS !== "undefined" && FORMATION_QUOTAS[f]) || { DEF: 4, MIL: 4, ATT: 2 };
  function lineupFor(side, dateKey) {
    if (side.ghost || !side.club) {
      const out = [];
      const q = { DEF: 4, MIL: 4, ATT: 2 };
      const pos = ["GB"].concat(Array(q.DEF).fill("DEF"), Array(q.MIL).fill("MIL"), Array(q.ATT).fill("ATT"));
      pos.forEach((p, i) => out.push({ id: "x" + i, name: "Joueur " + (i + 1), pos: p, ovr: null, num: i + 1 }));
      return { xi: out, bench: [], formation: "4-4-2", unknown: true };
    }
    const c = side.club;
    const xi = buildLineup(c, dateKey).map((p, i) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, last: p.lastName, pos: p.position, ovr: p.overall, num: i + 1 }));
    const bench = buildBench(c, dateKey, buildLineup(c, dateKey)).map((p, i) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, last: p.lastName, pos: p.position, ovr: p.overall, num: 12 + i }));
    const t = getTactics(c);
    return { xi, bench, formation: t.formation, mentality: t.mentality, unknown: false };
  }
  function slotsFor(xi) {
    // coordonnées « côté propre » : x = 0 (son but) → 1 (but adverse), y = 0..1
    const by = { GB: [], DEF: [], MIL: [], ATT: [] };
    xi.forEach((p) => (by[p.pos] || by.MIL).push(p));
    const xs = { GB: 0.07, DEF: 0.24, MIL: 0.47, ATT: 0.70 };
    const out = new Map();
    Object.keys(by).forEach((k) => {
      const n = by[k].length;
      by[k].forEach((p, i) => out.set(p, { x: xs[k], y: k === "GB" ? 0.5 : (i + 1) / (n + 1) }));
    });
    return out;
  }
  function hexRgb(h) { h = String(h || "#888").replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function cdist(a, b) { const x = hexRgb(a), y = hexRgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }
  function kits(homeClub, awayClub) {
    const home = homeClub ? ((homeClub.cc && homeClub.cc.home && homeClub.cc.home.c1) || homeClub.kitColor || "#B9862E") : "#2C4A6E";
    let away = awayClub ? ((awayClub.cc && awayClub.cc.home && awayClub.cc.home.c1) || awayClub.kitColor || "#2C4A6E") : "#C0392B";
    if (cdist(home, away) < 110) {
      const alt = awayClub && awayClub.cc && awayClub.cc.away && awayClub.cc.away.c1;
      away = alt && cdist(home, alt) >= 110 ? alt : (cdist(home, "#F4EFE2") > 110 ? "#F4EFE2" : "#1c1c1c");
    }
    return { home, away };
  }
  const pois = (l, k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return Math.exp(-l) * Math.pow(l, k) / f; };
  function probs(m, dateKey) {
    if (m.home.ghost || m.away.ghost) return null;
    try {
      const hR = computeMatchRatings(m.home.club, dateKey, m.away.club.playstyle), aR = computeMatchRatings(m.away.club, dateKey, m.home.club.playstyle);
      const he = clampN(1.25 + (hR.attackRating + 2 - aR.defenseRating) / 22, 0.15, 4.2), ae = clampN(1.0 + (aR.attackRating - (hR.defenseRating + 2)) / 22, 0.1, 4.0);
      let w = 0, d = 0, l = 0;
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { const p = pois(he, i) * pois(ae, j); if (i > j) w += p; else if (i === j) d += p; else l += p; }
      const t = w + d + l;
      return { home: w / t, draw: d / t, away: l / t, hR, aR, he, ae };
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------
  // 3. Écran d'avant-match
  // ---------------------------------------------------------------
  let root = null;
  const rootEl = () => { if (!root || !document.body.contains(root)) { root = document.createElement("div"); root.id = "pm-root"; document.body.appendChild(root); } return root; };
  let CUR = null; // match en cours de préparation

  function pitchSvg(h, a, kit) {
    const W = 105, H = 68;
    const lines = `<rect x="0" y="0" width="105" height="68" fill="#3f7d3a"/>` +
      [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 15}" y="0" width="7.5" height="68" fill="#44853f"/>`).join("") +
      `<g fill="none" stroke="#e9f3e2" stroke-width=".4" opacity=".85"><rect x=".5" y=".5" width="104" height="67"/><line x1="52.5" y1=".5" x2="52.5" y2="67.5"/><circle cx="52.5" cy="34" r="9.15"/>
      <rect x=".5" y="13.8" width="16.5" height="40.3"/><rect x="88" y="13.8" width="16.5" height="40.3"/><rect x=".5" y="24.8" width="5.5" height="18.3"/><rect x="99" y="24.8" width="5.5" height="18.3"/></g>`;
    const dot = (p, s, sx, col, tcol) => {
      const X = sx === "h" ? s.x * 52.5 * 1.0 + 0 : 105 - s.x * 52.5, Y = sx === "h" ? s.y * 68 : (1 - s.y) * 68;
      return `<g><circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="3.1" fill="${col}" stroke="#fff" stroke-width=".35"/><text x="${X.toFixed(1)}" y="${(Y + 1.2).toFixed(1)}" text-anchor="middle" font-size="3.4" font-weight="700" fill="${tcol}" font-family="sans-serif">${p.num}</text></g>`;
    };
    const tcol = (c) => (hexRgb(c).reduce((s, v) => s + v, 0) > 400 ? "#111" : "#fff");
    const hs = slotsFor(h.xi), as = slotsFor(a.xi);
    const hd = h.xi.map((p) => dot(p, hs.get(p), "h", kit.home, tcol(kit.home))).join("");
    const ad = a.xi.map((p) => dot(p, as.get(p), "a", kit.away, tcol(kit.away))).join("");
    return `<svg class="pm-pitch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Compositions des deux équipes">${lines}${hd}${ad}</svg>`;
  }
  function listCol(name, L, col, mine) {
    const row = (p) => `<div class="pm-pl"><span class="pm-num" style="background:${col};color:${hexRgb(col).reduce((s, v) => s + v, 0) > 400 ? "#111" : "#fff"}">${p.num}</span><span class="pm-pp">${esc(p.pos)}</span><span class="pm-pn">${esc(p.name)}</span><span class="pm-po">${p.ovr == null ? "—" : p.ovr}</span></div>`;
    return `<div class="pm-col"><h4>${esc(name)} <small>${esc(L.formation)}${L.mentality ? " · " + esc(L.mentality) : ""}</small></h4>
      ${L.unknown ? `<p class="pm-hint">Composition adverse non communiquée.</p>` : ""}
      ${L.xi.map(row).join("")}
      ${L.bench.length ? `<div class="pm-bench">Banc : ${L.bench.map((p) => esc(p.last || p.name)).join(", ")}</div>` : ""}</div>`;
  }
  function missing(club, key) {
    return club.players.filter((p) => !p.onLoan && !isAvailable(p, key)).slice(0, 8).map((p) => {
      const inj = p.injuredUntil && String(p.injuredUntil) >= key;
      return `${esc(p.firstName[0] + ". " + p.lastName)} <small>(${inj ? "blessé" : "suspendu"})</small>`;
    });
  }
  function bar(label, a, b) {
    const t = Math.max(1, a + b);
    return `<div class="pm-bar"><span>${Math.round(a)}</span><div class="pm-track"><i style="width:${(a / t * 100).toFixed(0)}%"></i></div><span>${Math.round(b)}</span><em>${esc(label)}</em></div>`;
  }
  function standingTxt(side) {
    if (side.ghost || !side.club) return "Club européen";
    try { const s = leagueStandingOf(side.club); return `${s.rank}ᵉ / ${s.total} · ${side.club.points} pts`; } catch (e) { return ""; }
  }
  function renderPre() {
    if (!CUR) { rootEl().innerHTML = ""; return; }
    const m = CUR, key = m.dateKey;
    const h = lineupFor(m.home, key), a = lineupFor(m.away, key);
    m.L = { h, a };
    const kit = kits(m.home.club, m.away.club); m.kit = kit;
    const pr = probs(m, key);
    const mine = m.userHome ? m.home.club : m.away.club;
    const mt = getTactics(mine);
    const ms = missing(mine, key);
    const stad = m.home.club ? (m.home.club.stadiumName || ("Stade de " + m.home.name)) : "Stade";
    rootEl().innerHTML = `<div class="pm-back" data-pm="noop"><div class="pm-modal" role="dialog" aria-label="Avant-match">
      <div class="pm-head"><div class="pm-comp">${esc(m.label)} · ${esc(fmtDate(new Date(key)))}</div>
        <div class="pm-vs"><div class="pm-team"><b>${esc(m.home.name)}</b><small>${esc(standingTxt(m.home))}</small></div><div class="pm-x">vs</div><div class="pm-team"><b>${esc(m.away.name)}</b><small>${esc(standingTxt(m.away))}</small></div></div>
        <div class="pm-stad">🏟️ ${esc(stad)}</div></div>
      <div class="pm-body">
        ${pr ? `<div class="pm-probs"><div style="flex:${pr.home.toFixed(3)}" class="pp-h">${Math.round(pr.home * 100)}%</div><div style="flex:${pr.draw.toFixed(3)}" class="pp-d">${Math.round(pr.draw * 100)}%</div><div style="flex:${pr.away.toFixed(3)}" class="pp-a">${Math.round(pr.away * 100)}%</div></div>
        <div class="pm-probl"><span>Victoire ${esc(m.home.name)}</span><span>Nul</span><span>Victoire ${esc(m.away.name)}</span></div>
        <div class="pm-bars">${bar("Attaque", pr.hR.attackRating, pr.aR.attackRating)}${bar("Défense", pr.hR.defenseRating, pr.aR.defenseRating)}</div>` : ""}
        ${pitchSvg(h, a, kit)}
        <div class="pm-tact"><label>Formation <select data-pm="formation">${FORMATIONS.map((f) => `<option ${f === mt.formation ? "selected" : ""}>${f}</option>`).join("")}</select></label>
          <label>Mentalité <select data-pm="mentality">${MENTALITIES.map((f) => `<option ${f === mt.mentality ? "selected" : ""}>${f}</option>`).join("")}</select></label></div>
        <div class="pm-cols">${listCol(m.home.name, h, kit.home, m.userHome)}${listCol(m.away.name, a, kit.away, !m.userHome)}</div>
        ${ms.length ? `<p class="pm-miss">🩹 Indisponibles (${esc(mine.name)}) : ${ms.join(", ")}</p>` : ""}
      </div>
      <div class="pm-actions"><button class="pm-btn pm-sim" data-pm="sim">⚡ Simuler le match</button><button class="pm-btn pm-watch" data-pm="watch">📺 Assister au match</button><button class="pm-btn pm-cancel" data-pm="cancel">Retour</button></div>
      <label class="pm-off"><input type="checkbox" data-pm="off"> Ne plus afficher cet écran (réactivable dans l'onglet Club)</label>
    </div></div>`;
  }
  function openPre(m) { CUR = m; renderPre();  }
  function closePre() { CUR = null; if (root) root.innerHTML = "";  }

  // ---------------------------------------------------------------
  // 4. Hook sur « Continuer »
  // ---------------------------------------------------------------
  const STOP = { pmStop: true };
  let guard = false, cleared = null;
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    if (guard && hasState() && enabled() && state.userClubId != null) {
      const k = tomorrowKey();
      if (cleared !== k) {
        const m = findMatch(k);
        if (m) { CUR_PENDING = m; throw STOP; }
      }
    }
    return origAdv.apply(this, arguments);
  };
  let CUR_PENDING = null;
  const origCont = window.dsContinue;
  if (typeof origCont === "function") window.dsContinue = function () {
    if (CUR || V) return;
    if (!hasState() || (typeof ui !== "undefined" && ui.screen !== "dashboard")) return origCont.apply(this, arguments);
    guard = true; CUR_PENDING = null;
    try { return origCont.apply(this, arguments); }
    catch (e) {
      if (e !== STOP) throw e;
      try { saveGame(); render(); } catch (x) {}
      const m = CUR_PENDING; CUR_PENDING = null;
      if (m) openPre(m);
    } finally { guard = false; }
  };
  // anciens boutons (onglet Aperçu) : on les redirige vers « Continuer »
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("#advance-day,#advance-event,#advance-week");
    if (!b || !hasState() || !enabled() || typeof window.dsContinue !== "function") return;
    e.stopImmediatePropagation(); e.preventDefault();
    window.dsContinue(b.id === "advance-day" ? "day" : b.id === "advance-week" ? "week" : "event");
  }, true);

  function playNow(watch) {
    const m = CUR; if (!m) return;
    cleared = m.dateKey;
    closePre();
    const before = hasState() ? state.date.getTime() : 0;
    try { ui.matchModalShown = false; ui.moreOpen = false; } catch (e) {}
    window.advanceDay();
    try { saveGame(); } catch (e) {}
    if (watch && (state.lastMatchResult || state.lastCupResult || true)) {
      try { ui.matchModalShown = true; } catch (e) {}
      try { render(); } catch (e) {}
      openViewer(m);
    } else {
      try { render(); } catch (e) {}
      if (typeof toast === "function") toast("Match joué");
    }
  }

  document.addEventListener("change", (e) => {
    const t = e.target.closest && e.target.closest("[data-pm]"); if (!t || !CUR) return;
    if (t.dataset.pm === "formation" || t.dataset.pm === "mentality") {
      const mine = getClub(state.userClubId); const tc = getTactics(mine);
      const sel = (k) => (document.querySelector(`[data-pm="${k}"]`) || {}).value;
      setUserTactics(sel("formation") || tc.formation, sel("mentality") || tc.mentality);
      renderPre();
    } else if (t.dataset.pm === "off") { setEnabled(!t.checked); }
    else if (t.dataset.pmset) { }
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-pm],[data-pmv],[data-pmset]"); if (!t) return;
    if (t.dataset.pmset) { setEnabled(t.checked !== undefined ? t.checked : true); return; }
    if (t.dataset.pmv) { viewerAction(t.dataset.pmv, t); return; }
    const a = t.dataset.pm;
    if (a === "sim") playNow(false);
    else if (a === "watch") playNow(true);
    else if (a === "cancel") closePre();
  });
  document.addEventListener("change", (e) => { if (e.target && e.target.dataset && e.target.dataset.pmset) setEnabled(e.target.checked); });

  // ---------------------------------------------------------------
  // 5. Moteur 2D
  // ---------------------------------------------------------------
  const PW = 105, PH = 68;
  let V = null; // viewer courant

  function buildTeam(side, L, isHome, color) {
    const slots = slotsFor(L.xi);
    const players = L.xi.map((p) => {
      const s = slots.get(p);
      const bx = isHome ? s.x * PW : PW - s.x * PW, by = isHome ? s.y * PH : (1 - s.y) * PH;
      return { id: p.id, name: p.name, last: p.last || p.name, pos: p.pos, num: p.num, ovr: p.ovr, bx, by, x: bx, y: by, tx: bx, ty: by, hold: 0, team: isHome ? 0 : 1, dead: false };
    });
    return { name: side.name, color, dir: isHome ? 1 : -1, players, bench: L.bench.slice(), club: side.club };
  }
  function resultData(m) {
    const r = state.lastMatchResult, c = state.lastCupResult;
    // score réel
    let hg = 0, ag = 0, res = null;
    if (r && (r.homeName === m.home.name && r.awayName === m.away.name)) { hg = r.homeGoals; ag = r.awayGoals; res = r; }
    else if (c && c.homeName === m.home.name && c.awayName === m.away.name) { hg = c.homeGoals; ag = c.awayGoals; }
    return { hg, ag, res, cup: c && !res ? c : null };
  }
  function lineupFromResult(side, L, rl) {
    return L;
  }
  function buildTimeline(m, D, T) {
    const ev = [];
    const r = D.res;
    const nameOf = (team, nm) => team.players.find((p) => p.name === nm) || null;
    const goalList = (team, scorers, n) => {
      const out = [];
      if (scorers && scorers.length) scorers.forEach((g) => out.push({ minute: g.minute || rint(3, 88), scorer: g.name, assist: g.assistName || null }));
      while (out.length < n) out.push({ minute: rint(3, 88), scorer: null, assist: null });
      return out.slice(0, n);
    };
    const hgoals = goalList(T[0], r && r.homeScorers, D.hg), agoals = goalList(T[1], r && r.awayScorers, D.ag);
    hgoals.forEach((g) => ev.push(Object.assign({ type: "goal", team: 0 }, g)));
    agoals.forEach((g) => ev.push(Object.assign({ type: "goal", team: 1 }, g)));
    // tirs non transformés d'après les stats du match
    const st = r && r.stats;
    [0, 1].forEach((t) => {
      const s = st ? (t ? st.away : st.home) : null;
      const goals = t ? D.ag : D.hg;
      let shots = s ? s.shots - goals : rint(4, 9) - 0;
      shots = clampN(shots, 2, 12);
      let onT = s ? Math.max(0, s.onTarget - goals) : Math.round(shots * 0.4);
      for (let i = 0; i < shots; i++) {
        const k = i < onT ? "save" : Math.random() < 0.3 ? "block" : "miss";
        ev.push({ type: "shot", kind: k, team: t, minute: rint(2, 89) });
      }
    });
    if (r) {
      (r.homeCards || []).forEach((c) => ev.push({ type: "card", team: 0, kind: c.type, name: c.name, minute: c.minute || rint(10, 85) }));
      (r.awayCards || []).forEach((c) => ev.push({ type: "card", team: 1, kind: c.type, name: c.name, minute: c.minute || rint(10, 85) }));
      (r.homeSubs || []).forEach((s) => ev.push({ type: "sub", team: 0, s, minute: s.minute }));
      (r.awaySubs || []).forEach((s) => ev.push({ type: "sub", team: 1, s, minute: s.minute }));
    }
    ev.forEach((e) => { e.done = false; });
    ev.sort((a, b) => a.minute - b.minute);
    return ev;
  }

  function openViewer(m) {
    const D = resultData(m);
    const L = m.L || { h: lineupFor(m.home, m.dateKey), a: lineupFor(m.away, m.dateKey) };
    // les compositions réelles du résultat (si disponibles) priment sur l'aperçu
    const kit = m.kit || kits(m.home.club, m.away.club);
    const T = [buildTeam(m.home, L.h, true, kit.home), buildTeam(m.away, L.a, false, kit.away)];
    const r = D.res;
    if (r) {
      [[0, r.homeLineup], [1, r.awayLineup]].forEach(([i, lu]) => {
        if (!lu || lu.length !== T[i].players.length) return;
        T[i].players.forEach((pl, k) => { pl.id = lu[k].id; pl.name = lu[k].name; pl.last = lu[k].name.split(" ").slice(-1)[0]; pl.pos = lu[k].position || pl.pos; });
      });
    }
    V = {
      m, D, T, kit, ev: null, min: 0, speed: 1, paused: false, score: [0, 0], ball: { x: PW / 2, y: PH / 2, fx: 0, fy: 0, tx: 0, ty: 0, t: 0, dur: 0, holder: null, fly: false },
      poss: 0, script: null, ticker: [], half: false, ended: false, banner: null, bannerT: 0, wait: 0, last: 0, raf: 0, ht: 0, st: r ? r.stats : null
    };
    V.ev = buildTimeline(m, D, T);
    const el = rootEl();
    const logo = (c) => { try { return c ? clubLogoSvg(c) : ""; } catch (e) { return ""; } };
    el.innerHTML = `<div class="pm-back pm-vback"><div class="pm-viewer" role="dialog" aria-label="Match en direct">
      <div class="pmv-score"><div class="pmv-t"><span class="pmv-l">${logo(m.home.club)}</span><b>${esc(m.home.name)}</b></div>
        <div class="pmv-mid"><div class="pmv-sc"><span id="pmv-h">0</span> - <span id="pmv-a">0</span></div><div class="pmv-clock" id="pmv-clock">0'</div></div>
        <div class="pmv-t pmv-r"><b>${esc(m.away.name)}</b><span class="pmv-l">${logo(m.away.club)}</span></div></div>
      <div class="pmv-comp">${esc(m.label)}</div>
      <div class="pmv-cvwrap"><canvas id="pmv-cv" width="840" height="544"></canvas><div class="pmv-banner" id="pmv-banner" hidden></div></div>
      <div class="pmv-ctl"><button data-pmv="pause" id="pmv-pause">⏸ Pause</button>
        <span class="pmv-spd"><button data-pmv="spd" data-v="1" class="on">×1</button><button data-pmv="spd" data-v="2">×2</button><button data-pmv="spd" data-v="4">×4</button><button data-pmv="spd" data-v="10">×10</button></span>
        <button data-pmv="skip">⏭ Passer à la fin</button></div>
      <div class="pmv-tick" id="pmv-tick" aria-live="polite"></div>
      <div class="pmv-end" id="pmv-end" hidden></div>
    </div></div>`;
    
    resizeCanvas();
    tick(CM("kickoff", { home: m.home.name, away: m.away.name, stade: (m.home.club && (m.home.club.stadiumName || m.home.club.stadium)) || "stade" }, `Coup d'envoi : ${m.home.name} – ${m.away.name}`), "info", 0);
    kickoff(0);
    V.last = performance.now();
    V.raf = requestAnimationFrame(loop);
  }
  function resizeCanvas() {
    const cv = document.getElementById("pmv-cv"); if (!cv) return;
    const maxH = window.innerHeight * (window.innerWidth > 720 ? 0.56 : 0.5);
    const w = Math.max(240, Math.min(cv.parentElement.clientWidth - 20 || 840, 1000, maxH * PW / PH));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * PH / PW);
    cv.style.width = w + "px"; cv.style.height = (w * PH / PW) + "px"; cv.style.margin = "0 auto";
  }
  window.addEventListener("resize", () => { if (V && !V.ended) resizeCanvas(); });

  const CM = (k, c, fb) => { try { return (window.dsCommentary && window.dsCommentary.say(k, c)) || fb; } catch (e) { return fb; } };
  function tick(text, cls, minute) {
    V.ticker.unshift({ text, cls: cls || "", minute });
    const el = document.getElementById("pmv-tick");
    if (el) el.innerHTML = V.ticker.slice(0, 40).map((t) => `<div class="pmv-ev ${t.cls}"><b>${t.minute != null ? t.minute + "'" : ""}</b> ${esc(t.text)}</div>`).join("");
  }
  function banner(text, cls, secs) {
    V.banner = text; V.bannerT = secs || 2;
    const b = document.getElementById("pmv-banner"); if (b) { b.textContent = text; b.className = "pmv-banner " + (cls || ""); b.hidden = false; }
  }

  // --- gestion du ballon
  const ball = () => V.ball;
  function setBall(x, y) { const b = ball(); b.x = x; b.y = y; b.fly = false; }
  function giveTo(p) { const b = ball(); b.holder = p; b.fly = false; p.hold = rnd(0.35, 0.9); V.poss = p.team; b.x = p.x; b.y = p.y; }
  function flyTo(x, y, dur, onArrive) {
    const b = ball(); b.fx = b.x; b.fy = b.y; b.tx = x; b.ty = y; b.t = 0; b.dur = Math.max(0.2, dur); b.fly = true; b.holder = null; b.arrive = onArrive || null;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function kickoff(team) {
    V.T.forEach((t) => t.players.forEach((p) => { p.x = p.bx; p.y = p.by; p.tx = p.bx; p.ty = p.by; }));
    const t = V.T[team], pl = t.players.filter((p) => p.pos !== "GB").sort((a, b) => Math.abs(a.bx - PW / 2) - Math.abs(b.bx - PW / 2))[0];
    pl.x = PW / 2 - t.dir * 1; pl.y = PH / 2;
    V.script = null; V.wait = 0.8;
    giveTo(pl);
  }
  const gk = (team) => V.T[team].players.find((p) => p.pos === "GB") || V.T[team].players[0];
  function teamBias(team) {
    const s = V.st; if (!s) return 0.5;
    const p = team === 0 ? s.home.possession : s.away.possession;
    return p / 100;
  }

  function think(p) {
    // décision ambiante : passe vers un coéquipier
    const T = V.T[p.team], O = V.T[1 - p.team], dir = T.dir;
    const prog = (p.x - (dir > 0 ? 0 : PW)) / PW * dir; // 0..1 vers le but adverse
    const mates = T.players.filter((q) => q !== p && !(q.pos === "GB" && prog > 0.3));
    const ment = (T.club && getTactics(T.club).mentality) || "equilibre";
    const fwd = ment === "offensif" ? 1.5 : ment === "defensif" ? 0.7 : 1;
    const sc = mates.map((q) => {
      const d = dist(p, q), gain = (q.x - p.x) * dir;
      let s = gain * 0.12 * fwd - Math.abs(d - 16) * 0.07 + rnd(0, 1.6);
      return { q, s };
    }).sort((a, b) => b.s - a.s);
    const target = sc[0].q;
    const lose = 0.15 - (teamBias(p.team) - 0.5) * 0.25 + (prog > 0.8 ? 0.12 : 0);
    if (Math.random() < lose) {
      const opp = O.players.filter((q) => q.pos !== "GB").sort((a, b) => dist(a, { x: (p.x + target.x) / 2, y: (p.y + target.y) / 2 }) - dist(b, { x: (p.x + target.x) / 2, y: (p.y + target.y) / 2 }))[0];
      flyTo(opp.x, opp.y, dist(p, opp) / 20 + 0.2, () => giveTo(opp));
      return;
    }
    const lead = { x: target.x + dir * rnd(0, 3), y: target.y };
    flyTo(lead.x, lead.y, dist(p, lead) / 22 + 0.25, () => giveTo(target));
  }

  // --- scripts d'occasions (tirs / buts)
  function startScript(ev) {
    const t = ev.team, T = V.T[t], O = V.T[1 - t], dir = T.dir;
    ev.done = true;
    let shooter = null;
    if (ev.scorer) shooter = T.players.find((p) => p.name === ev.scorer || p.name.split(" ").slice(-1)[0] === ev.scorer.split(" ").slice(-1)[0]);
    if (!shooter) { const pool = T.players.filter((p) => p.pos === "ATT").concat(T.players.filter((p) => p.pos === "MIL")); shooter = pool[rint(0, Math.max(0, Math.min(pool.length - 1, 3)))] || T.players[T.players.length - 1]; }
    let assister = ev.assist ? T.players.find((p) => p.name === ev.assist) : null;
    if (assister === shooter) assister = null;
    const mid = assister || T.players.filter((p) => p.pos === "MIL" && p !== shooter)[0] || T.players.filter((p) => p !== shooter && p.pos !== "GB")[0];
    const steps = [];
    const holder = ball().holder;
    if (!holder || holder.team !== t) {
      steps.push({ k: "fly", to: mid, dur: 0.7 });
    }
    if (mid && mid !== shooter) steps.push({ k: "pass", to: mid }, { k: "pass", to: shooter });
    steps.push({ k: "carry", p: shooter, tx: PW / 2 + dir * (PW / 2 - rnd(14, 20)), ty: PH / 2 + rnd(-9, 9), dur: 1.3 }, { k: "shot", ev });
    V.script = { steps, i: -1, ev, shooter, t: 0, cur: null, T: 0 };
    nextStep();
  }
  function nextStep() {
    const s = V.script; if (!s) return;
    s.i++;
    if (s.i >= s.steps.length) { V.script = null; return; }
    const st = s.steps[s.i]; s.cur = st; st.t = 0;
    const b = ball();
    if (st.k === "fly") { const to = st.to; flyTo(to.x, to.y, st.dur, () => { giveTo(to); to.hold = 0.2; nextStep(); }); }
    else if (st.k === "pass") { const h = b.holder || { x: b.x, y: b.y }; const to = st.to; flyTo(to.x + V.T[to.team].dir * rnd(0, 2), to.y, dist(h, to) / 21 + 0.25, () => { giveTo(to); to.hold = 0.15; nextStep(); }); }
    else if (st.k === "carry") { giveTo(st.p); st.p.hold = 99; }
    else if (st.k === "shot") doShot(st);
  }
  function doShot(st) {
    const ev = st.ev, sh = V.script.shooter, t = ev.team, dir = V.T[t].dir, G = gk(1 - t);
    const goalX = dir > 0 ? PW : 0, b = ball();
    sh.hold = 0; b.holder = null; V.poss = t;
    const side = Math.random() < 0.5 ? -1 : 1;
    const gy = PH / 2 + side * rnd(1.5, 3.1);
    const mn = ev.minute;
    if (ev.type === "goal") {
      G.dive = { y: PH / 2 - side * rnd(1.5, 3), t: 0 };
      flyTo(goalX + dir * 1.4, gy, 0.55, () => {
        V.score[t]++; updateScore();
        const nm = ev.scorer || sh.name;
        let gk0 = "goalOpen"; try { const mine = V.score[t] - 1, oth = V.score[1 - t]; gk0 = window.dsCommentary.goalKind(mn, mine, oth, true); } catch (e) {}
        tick("⚽ " + CM(gk0, { scorer: nm, team: V.T[t].name, opp: V.T[1 - t].name, gk: (V.T[1 - t].players.find((p) => p.pos === "GB") || {}).last || "le gardien", assist: ev.assist ? " Passe de " + ev.assist + "." : "" }, `BUT ! ${nm}${ev.assist ? " (passe de " + ev.assist + ")" : ""}`) + ` (${V.score[0]}-${V.score[1]})`, "goal", mn);
        banner(`BUT ! ${nm}`, "goal", 2.4);
        V.script = { steps: [], celebrate: 2.4, t: 0, after: () => kickoff(1 - t), shooter: sh };
        V.celebrate = { p: sh, t: 0 };
      });
    } else if (ev.kind === "save") {
      G.dive = { y: gy, t: 0 };
      flyTo(G.x, gy, 0.5, () => { tick("🧤 " + CM("save", { gk: G.last, shooter: sh.last }, `${G.last} repousse la frappe de ${sh.last}`), "save", mn); giveTo(G); G.hold = 1.2; V.script = null; });
    } else if (ev.kind === "block") {
      const d = V.T[1 - t].players.filter((p) => p.pos === "DEF")[0] || G;
      flyTo(d.x, d.y, 0.3, () => { tick("🛡️ " + CM("block", { shooter: sh.last, def: d.last }, `Tir de ${sh.last} contré par ${d.last}`), "info", mn); giveTo(d); V.script = null; });
    } else {
      const off = Math.random() < 0.5 ? -1 : 1;
      flyTo(goalX + dir * 4, PH / 2 + off * rnd(5.5, 9), 0.6, () => { tick("❌ " + CM(Math.random() < 0.15 ? "post" : "miss", { shooter: sh.last, gk: G.last, opp: V.T[1 - t].name }, `${sh.last} tire à côté du cadre`), "info", mn); giveTo(G); G.hold = 1.4; V.script = null; });
    }
    V.script.steps = []; // en attente de l'arrivée du ballon (géré par onArrive)
    V.script.waiting = true;
  }
  function updateScore() { const h = document.getElementById("pmv-h"), a = document.getElementById("pmv-a"); if (h) h.textContent = V.score[0]; if (a) a.textContent = V.score[1]; }
  function updateClock() { const c = document.getElementById("pmv-clock"); if (c) c.textContent = (V.ended ? "FIN" : V.half ? "MT" : Math.min(90, Math.floor(V.min)) + "'"); }

  // --- boucle de simulation
  function applyEvent(e) {
    e.done = true;
    const T = V.T[e.team];
    if (e.type === "card") {
      tick((e.kind === "red" ? "🟥 " : "🟨 ") + CM(e.kind === "red" ? "red" : "yellow", { name: e.name, team: T.name }, `Carton pour ${e.name} (${T.name})`), "card", e.minute);
      if (e.kind === "red") {
        const p = T.players.find((x) => x.name === e.name); if (p) { p.dead = true; p.x = -20; p.y = -20; p.bx = -20; p.by = -20; p.tx = -20; p.ty = -20; if (ball().holder === p) ball().holder = null; }
        banner(`Carton rouge : ${e.name}`, "red", 1.6);
      }
    } else if (e.type === "sub") {
      const s = e.s, p = T.players.find((x) => x.id === s.outId), inn = T.bench.find((x) => x.id === s.inId);
      if (p && inn) { tick("🔄 " + CM("sub", { team: T.name, inn: s.inName, out: s.outName }, `${T.name} : ${s.inName} remplace ${s.outName}`), "sub", e.minute); p.id = inn.id; p.name = inn.name; p.last = inn.last || inn.name; p.num = inn.num; p.pos = inn.pos || p.pos; }
      else tick("🔄 " + CM("sub", { team: T.name, inn: s.inName, out: s.outName }, `${T.name} : ${s.inName} remplace ${s.outName}`), "sub", e.minute);
    }
  }
  function step(dt) {
    if (V.ended) return;
    if (V.ht > 0) { V.ht -= dt; if (V.ht <= 0) { V.half = false; tick("Début de la seconde période", "info", 45); updateClock(); kickoff(1); } return; }
    if (V.bannerT > 0) { V.bannerT -= dt; if (V.bannerT <= 0) { const b = document.getElementById("pmv-banner"); if (b) b.hidden = true; } }
    const b = ball();
    // clock
    const sc = V.script && V.script.celebrate;
    V.min += dt * 0.5;
    const pendGoal = (lim) => V.ev.some((e) => !e.done && e.type === "goal" && e.minute <= lim);
    if (V.min >= 45 && !V.hdone && !V.script && !pendGoal(45)) { V.hdone = true; V.half = true; V.ht = 2.5; V.script = null; b.fly = false; tick(CM(V.score[0] === V.score[1] ? "htEven" : "ht", { score: V.score[0] + "-" + V.score[1] }, "Mi-temps"), "info", 45); updateClock(); banner("Mi-temps", "info", 2); return; }
    if (V.min >= 90 && !V.script && !pendGoal(99)) { V.ev.forEach((e) => { if (!e.done && e.type === "shot") e.done = true; }); finish(); return; }
    // événements
    V.ev.forEach((e) => {
      if (e.done || e.minute > V.min + 0.4) return;
      if (e.type === "card" || e.type === "sub") applyEvent(e);
    });
    if (!V.script) {
      const e = V.ev.find((x) => !x.done && (x.type === "goal" || x.type === "shot") && x.minute <= V.min + 0.4);
      if (e) startScript(e);
    }
    // célébration
    if (V.script && V.script.celebrate != null) {
      V.script.t += dt;
      if (V.script.t >= V.script.celebrate) { const f = V.script.after; V.script = null; V.celebrate = null; f && f(); }
    }
    // ballon en vol
    if (b.fly) {
      b.t += dt; const k = clampN(b.t / b.dur, 0, 1);
      b.x = b.fx + (b.tx - b.fx) * k; b.y = b.fy + (b.ty - b.fy) * k;
      if (k >= 1) { b.fly = false; const f = b.arrive; b.arrive = null; if (f) f(); }
    } else if (b.holder) {
      const h = b.holder;
      b.x = h.x + V.T[h.team].dir * 0.9; b.y = h.y;
      if (!V.script || V.script.celebrate == null) {
        if (V.script && V.script.cur && V.script.cur.k === "carry") {
          const c = V.script.cur; c.t += dt;
          const dx = c.tx - h.x, dy = c.ty - h.y, d = Math.hypot(dx, dy);
          const mv = Math.min(d, 9 * dt); if (d > 0.01) { h.x += dx / d * mv; h.y += dy / d * mv; }
          if (d < 1 || c.t > c.dur + 0.6) { h.hold = 0; nextStep(); }
        } else if (!V.script) {
          h.hold -= dt;
          if (h.hold <= 0 && V.wait <= 0) think(h);
        }
      }
    }
    if (V.wait > 0) V.wait -= dt;
    movePlayers(dt);
  }
  function movePlayers(dt) {
    const b = ball();
    const poss = V.poss;
    V.T.forEach((T, ti) => {
      const attacking = ti === poss;
      // joueur le plus proche du ballon : va le chercher s'il n'a pas la possession
      let near = null, nd = 1e9;
      T.players.forEach((p) => { if (p.dead || p.pos === "GB") return; const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < nd) { nd = d; near = p; } });
      T.players.forEach((p) => {
        if (p.dead) return;
        if (b.holder === p && V.script && V.script.cur && V.script.cur.k === "carry") return; // géré par le script
        const dir = T.dir;
        let tx = p.bx, ty = p.by;
        if (p.pos === "GB") {
          tx = p.bx + (dir > 0 ? 1 : -1) * Math.max(0, (1 - Math.abs(b.x - (dir > 0 ? 0 : PW)) / PW) * 0);
          ty = PH / 2 + clampN((b.y - PH / 2) * 0.22, -5, 5);
          if (p.dive) { p.dive.t += dt; ty = p.dive.y; if (p.dive.t > 1.2) p.dive = null; }
        } else {
          const shift = (b.x - PW / 2) / PW * 0.34 * PW * 0.5;
          const push = attacking ? 8 : -4;
          tx = p.bx + shift + dir * push * (p.pos === "DEF" ? 0.5 : 1);
          ty = p.by + (b.y - p.by) * 0.2;
          if (p === near && b.holder !== p && !b.fly) { tx = b.x; ty = b.y; }
          if (V.celebrate && V.celebrate.p === p) { tx = dir > 0 ? PW - 3 : 3; ty = p.y < PH / 2 ? 3 : PH - 3; }
          if (b.holder && b.holder !== p && b.holder.team === ti) { /* soutien : léger appel vers l'avant */ if (p.pos !== "DEF") tx += dir * 2; }
        }
        tx = clampN(tx, 1, PW - 1); ty = clampN(ty, 1, PH - 1);
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        const sp = (p === near && !b.holder ? 8 : 5.5) * dt;
        if (d > 0.01) { const m = Math.min(d, sp); p.x += dx / d * m; p.y += dy / d * m; }
      });
    });
  }

  // --- rendu
  function draw() {
    const cv = document.getElementById("pmv-cv"); if (!cv || !V) return;
    const g = cv.getContext("2d"), W = cv.width, H = cv.height, sx = W / PW, sy = H / PH;
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? "#44853f" : "#3d7a38"; g.fillRect(i * W / 14, 0, W / 14 + 1, H); }
    g.strokeStyle = "rgba(240,248,235,.85)"; g.lineWidth = Math.max(1, W / 420);
    const R = (x, y, w, h) => g.strokeRect(x * sx, y * sy, w * sx, h * sy);
    R(0.5, 0.5, 104, 67); g.beginPath(); g.moveTo(52.5 * sx, 0.5 * sy); g.lineTo(52.5 * sx, 67.5 * sy); g.stroke();
    g.beginPath(); g.arc(52.5 * sx, 34 * sy, 9.15 * sx, 0, 7); g.stroke();
    R(0.5, 13.8, 16.5, 40.3); R(88, 13.8, 16.5, 40.3); R(0.5, 24.8, 5.5, 18.3); R(99, 24.8, 5.5, 18.3);
    g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(-2 * sx * 0.3, 30.3 * sy, 1.2 * sx * 0.5, 7.3 * sy); g.fillRect(W - 0.6 * sx, 30.3 * sy, 0.6 * sx, 7.3 * sy);
    const dpr = W / (parseFloat(cv.style.width) || W), b = V.ball, rad = Math.max(W / 72, 7.5 * dpr);
    V.T.forEach((T) => {
      T.players.forEach((p) => {
        if (p.dead) return;
        const col = p.pos === "GB" ? (T === V.T[0] ? "#e8c13a" : "#37b6c9") : T.color;
        const lum = hexRgb(col).reduce((s, v) => s + v, 0);
        g.beginPath(); g.fillStyle = "rgba(0,0,0,.25)"; g.ellipse(p.x * sx + 1, p.y * sy + rad * 0.8, rad * 0.9, rad * 0.4, 0, 0, 7); g.fill();
        g.beginPath(); g.fillStyle = col; g.arc(p.x * sx, p.y * sy, rad, 0, 7); g.fill();
        g.lineWidth = b.holder === p ? 3 : 1.2; g.strokeStyle = b.holder === p ? "#fff700" : "rgba(255,255,255,.9)"; g.stroke();
        g.fillStyle = lum > 400 ? "#111" : "#fff"; g.font = `700 ${Math.round(Math.max(rad * 1.15, 9 * dpr))}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(p.num, p.x * sx, p.y * sy + 0.5);
      });
    });
    if (b.holder) { g.font = `600 ${Math.round(rad * 1.2)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillStyle = "#fff"; g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 3; const t = b.holder.last; g.strokeText(t, b.holder.x * sx, b.holder.y * sy - rad * 1.3); g.fillText(t, b.holder.x * sx, b.holder.y * sy - rad * 1.3); }
    g.beginPath(); g.fillStyle = "#fff"; g.arc(b.x * sx, b.y * sy, rad * 0.55, 0, 7); g.fill(); g.lineWidth = 1.2; g.strokeStyle = "#222"; g.stroke();
  }
  function loop(now) {
    if (!V) return;
    const real = Math.min(0.1, (now - V.last) / 1000); V.last = now;
    if (!V.paused && !V.ended) {
      let dt = real * V.speed;
      while (dt > 0 && !V.ended) { const s = Math.min(0.05, dt); step(s); dt -= s; }
      updateClock();
    }
    draw();
    if (V && !V.ended || (V && V.endDraw-- > 0)) V.raf = requestAnimationFrame(loop);
  }
  function finish() {
    if (V.ended) return;
    // s'assure que le score affiché est le score réel
    V.score = [V.D.hg, V.D.ag]; updateScore();
    V.ended = true; V.endDraw = 3; V.min = 90; updateClock();
    const s = V.st;
    const row = (l, a, b) => `<tr><td>${a}</td><td>${l}</td><td>${b}</td></tr>`;
    tick(CM("ft", { home: V.T[0].name, away: V.T[1].name, hg: V.score[0], ag: V.score[1] }, "Coup de sifflet final"), "info", 90);
    const end = document.getElementById("pmv-end");
    if (end) {
      end.hidden = false;
      end.innerHTML = `<h4>Match terminé : ${esc(V.m.home.name)} ${V.D.hg} - ${V.D.ag} ${esc(V.m.away.name)}</h4>
        ${s ? `<table class="pmv-st">${row("Possession", s.home.possession + "%", s.away.possession + "%")}${row("Tirs (cadrés)", s.home.shots + " (" + s.home.onTarget + ")", s.away.shots + " (" + s.away.onTarget + ")")}${row("xG", s.home.xg, s.away.xg)}${row("Corners", s.home.corners, s.away.corners)}</table>` : ""}
        <button class="pm-btn pm-watch" data-pmv="close">Voir le résumé du match ▶</button>`;
    }
    const pb = document.getElementById("pmv-pause"); if (pb) pb.disabled = true;
  }
  function viewerAction(a, el) {
    if (!V) return;
    if (a === "pause") { V.paused = !V.paused; el.textContent = V.paused ? "▶ Reprendre" : "⏸ Pause"; }
    else if (a === "spd") { V.speed = +el.dataset.v; document.querySelectorAll(".pmv-spd button").forEach((b) => b.classList.toggle("on", b === el)); }
    else if (a === "skip") {
      V.ev.forEach((e) => { if (!e.done) { e.done = true; if (e.type === "card" || e.type === "sub") applyEvent(e); else if (e.type === "goal") tick(`⚽ But : ${e.scorer || "?"}`, "goal", e.minute); } });
      finish();
    }
    else if (a === "close") closeViewer();
  }
  function closeViewer() {
    if (V) cancelAnimationFrame(V.raf);
    V = null; closePre(); if (root) root.innerHTML = "";
    
    try { ui.matchModalShown = false; render(); } catch (e) {}
  }

  // ---------------------------------------------------------------
  // 6. Réglage dans l'onglet Club
  // ---------------------------------------------------------------
  const origClub = window.renderClubTab;
  if (typeof origClub === "function") window.renderClubTab = function () {
    const html = origClub.apply(this, arguments);
    try { return hasState() ? html + `<section class="panel pm-set"><h3 class="panel-subtitle">📺 Jour de match</h3><label class="pm-off" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-pmset="1" ${enabled() ? "checked" : ""}> Afficher l'écran d'avant-match (compositions, simuler ou assister au match en 2D) avant chaque rencontre</label></section>` : html; } catch (e) { return html; }
  };

  // sécurité : aucune couche d'avant-match ne doit rester si rien n'est ouvert
  setInterval(() => { if (!CUR && !V && root && root.innerHTML) root.innerHTML = ""; document.body.classList.remove("pm-open"); document.body.style.overflow === "hidden" && !document.querySelector(".modal-backdrop") && (document.body.style.overflow = ""); }, 1500);

  window.dsPrematch = {
    findMatch, openPre, closePre, enabled, setEnabled, tomorrowKey,
    viewer: () => V, openViewer, setSpeed: (n) => { if (V) V.speed = n; }, skip: () => viewerAction("skip"),
    closeViewer
  };
})();
