// ===================================================================
// BLOC 22 (4/4) — MONDIAL DES CLUBS, SUPERCOUPES, LIVRE D'OR ET RECORDS
//  - Coupe du monde des clubs (7 équipes, format FIFA) : à chaque fin de saison, champion d'Europe + champions des autres
//    continents + champion du pays hôte. Primes si votre club y participe.
//  - Supercoupes nationales (champion vs vainqueur de coupe, un match) et Supercoupe d'Europe (LDC vs Ligue Europa),
//    jouées au début de la saison suivante, avec primes.
//  - Livre d'or du club (tous les titres, y compris supercoupes et Mondial) et palmarès du directeur sportif.
//  - Records : plus gros achat / vente, plus large victoire, séries.
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hasState = () => typeof state !== "undefined" && state && state.ds && state.countries;
  const mail = (cat, from, sub, html) => { try { window.dsMail && window.dsMail(cat, from, sub, html); } catch (e) {} };
  const money = (v) => { try { return fmtMoney(v); } catch (e) { return Math.round(v) + " €"; } };
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += Math.random(); return (u - 3) / 0.7; };
  const poisson = (l) => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };

  const H = () => {
    if (!state.hon) state.hon = { cwc: [], sup: [], ds: [], rec: { signing: null, sale: null, bigWin: null, bigLoss: null, winStreak: 0, bestStreak: 0, unbeaten: 0, bestUnbeaten: 0 }, last: 0 };
    return state.hon;
  };

  // ---------------- clubs de l'extérieur de l'Europe (champions continentaux) ----------------
  const CONT = {
    CONMEBOL: { label: "Amérique du Sud", base: 74, clubs: ["Palmeiras", "River Plate", "Flamengo", "Boca Juniors", "Fluminense", "Atlético Mineiro", "Estudiantes", "Botafogo"] },
    CAF: { label: "Afrique", base: 68, clubs: ["Al Ahly", "Espérance de Tunis", "Wydad Casablanca", "Mamelodi Sundowns", "Pyramids FC", "TP Mazembe", "Raja Casablanca"] },
    AFC: { label: "Asie", base: 69, clubs: ["Al-Hilal", "Urawa Red Diamonds", "Al-Ahli Saudi", "Ulsan HD", "Yokohama F. Marinos", "Al-Nassr", "Al-Sadd"] },
    CONCACAF: { label: "Amérique du Nord et centrale", base: 67, clubs: ["Club América", "CF Monterrey", "Seattle Sounders", "CF Pachuca", "Los Angeles FC", "Tigres UANL", "Inter Miami"] },
    OFC: { label: "Océanie", base: 54, clubs: ["Auckland City", "Hienghène Sport", "Auckland FC B", "Suva FC", "Wellington Phoenix B"] }
  };
  const pk = (a) => a[Math.floor(Math.random() * a.length)];
  function contTeam(code) {
    const c = CONT[code];
    return { id: "w:" + code, name: pk(c.clubs), tag: c.label, rating: Math.round((c.base + gauss() * 2.2) * 10) / 10, ghost: true };
  }
  function ratingOf(club) {
    const o = club.players.map((p) => p.overall).sort((a, b) => b - a).slice(0, 14);
    return o.length ? o.reduce((s, v) => s + v, 0) / o.length : 60;
  }
  function realTeam(club, tag) { return { id: club.id, name: club.name, tag, rating: Math.round(ratingOf(club) * 10) / 10, club }; }
  function euroTeamByName(name, tag) {
    try { const c = allClubs().find((x) => x.name === name); if (c) return realTeam(c, tag); } catch (e) {}
    try {
      const gh = state.euro && state.euro.ghosts; if (gh) { const g = [].concat(...Object.values(gh)).find((x) => x.name === name); if (g) return { id: g.id, name: g.name, tag, rating: g.rating, ghost: true }; }
    } catch (e) {}
    return name ? { id: "x:" + name, name, tag, rating: 70, ghost: true } : null;
  }

  // ---------------- simulation d'un match ----------------
  function play(a, b, noDraw) {
    const d = (a.rating - b.rating) / 16;
    const hg = poisson(1.35 * Math.exp(d / 1.6)), ag = poisson(1.35 * Math.exp(-d / 1.6));
    let pens = null, w = hg > ag ? a : hg < ag ? b : null;
    if (!w && noDraw) {
      const pa = 0.5 + Math.max(-0.12, Math.min(0.12, d * 0.08));
      const ps = [3 + Math.floor(Math.random() * 3), 3 + Math.floor(Math.random() * 3)];
      if (ps[0] === ps[1]) ps[Math.random() < pa ? 0 : 1]++;
      w = ps[0] > ps[1] ? a : b; pens = ps;
    }
    return { a, b, hg, ag, pens, w, l: w ? (w === a ? b : a) : null };
  }
  const line = (m) => `${m.a.name} ${m.hg}–${m.ag}${m.pens ? " (tab " + m.pens[0] + "–" + m.pens[1] + ")" : ""} ${m.b.name}`;
  const isMine = (t) => t && typeof t.id === "number" && isUserClub(t.id);

  function pay(t, amount, why) {
    if (!isMine(t)) return;
    try { const c = getClub(t.id); c.budget += amount; c.monthlyOtherIncome = c.monthlyOtherIncome; mail("finance", "Direction financière", why, `<p>${esc(why)} : <b>${money(amount)}</b> versés au budget du club.</p>`); } catch (e) {}
  }
  function trophy(t, year, comp) {
    if (!t || typeof t.id !== "number") return;
    const c = getClub(t.id); if (!c) return;
    c.trophies = c.trophies || []; c.trophies.unshift({ year, competition: comp });
    if (isUserClub(c.id)) {
      H().ds.unshift({ year, club: c.name, comp });
      try { state.news.unshift({ date: fmtDate(state.date), text: `🏆 ${c.name} remporte : ${comp}.` }); } catch (e) {}
    }
  }

  // ---------------- Coupe du monde des clubs ----------------
  function runCWC(snap) {
    const H0 = H(), yr = snap.year;
    const uefa = snap.ucl ? euroTeamByName(snap.ucl, "Europe") : null;
    if (!uefa) return null;
    let host = null;
    try {
      const pool = Object.keys(state.countries).map((ck) => { const s = getLeagueStandings(ck, "d1")[0]; return s ? { ck, c: s } : null; }).filter(Boolean);
      const alt = pool.filter((x) => x.c.id !== uefa.id);
      const nonEu = alt.filter((x) => !/^(france|angleterre|espagne|italie|allemagne|portugal|belgique|suisse|roumanie)$/.test(x.ck));
      const h = pk(nonEu.length ? nonEu : alt); if (h) host = realTeam(h.c, "Pays hôte");
    } catch (e) {}
    if (!host) host = contTeam("CAF");
    const sa = contTeam("CONMEBOL"), caf = contTeam("CAF"), afc = contTeam("AFC"), cc = contTeam("CONCACAF"), oc = contTeam("OFC");
    [sa, caf, afc, cc, oc].forEach((t, i) => { t.tag = [CONT.CONMEBOL, CONT.CAF, CONT.AFC, CONT.CONCACAF, CONT.OFC][i].label; });
    const R = [];
    const m0 = play(host, oc, true); R.push({ round: "Match d'ouverture", m: m0 });
    const q1 = play(afc, m0.w, true), q2 = play(caf, cc, true); R.push({ round: "Quart de finale", m: q1 }, { round: "Quart de finale", m: q2 });
    const s1 = play(uefa, q1.w, true), s2 = play(sa, q2.w, true); R.push({ round: "Demi-finale", m: s1 }, { round: "Demi-finale", m: s2 });
    const third = play(s1.l, s2.l, true); R.push({ round: "Match pour la 3ᵉ place", m: third });
    const fin = play(s1.w, s2.w, true); R.push({ round: "Finale", m: fin });
    const rec = { year: yr, champion: fin.w.name, champTag: fin.w.tag, finalist: fin.l.name, rounds: R.map((x) => ({ round: x.round, txt: line(x.m) })), teams: [host, oc, afc, caf, cc, uefa, sa].map((t) => ({ name: t.name, tag: t.tag, mine: isMine(t) })) };
    H0.cwc.unshift(rec); if (H0.cwc.length > 12) H0.cwc.length = 12;
    // primes et titres
    const stage = (t) => (t === fin.w ? "w" : t === fin.l ? "f" : t === third.w ? "3" : t === third.l ? "4" : (t === q1.l || t === q2.l || t === m0.l) ? (t === m0.l ? "pre" : "qf") : "");
    [host, oc, afc, caf, cc, uefa, sa].forEach((t) => {
      if (!isMine(t)) return;
      const k = stage(t), amt = { w: 25e6, f: 12e6, 3: 8e6, 4: 6e6, qf: 3e6, pre: 1.5e6 }[k] || 1.5e6;
      pay(t, amt, `Coupe du monde des clubs ${yr}`);
      mail("match", "FIFA", `Mondial des clubs ${yr} : bilan`, `<p><b>${esc(t.name)}</b> a disputé la Coupe du monde des clubs.</p>${R.map((x) => `<p class="hint">${esc(x.round)} : ${esc(line(x.m))}</p>`).join("")}`);
    });
    trophy(fin.w, yr, `Coupe du monde des clubs ${yr}`);
    try { state.news.unshift({ date: fmtDate(state.date), text: `🌍 ${fin.w.name} remporte la Coupe du monde des clubs ${yr} face à ${fin.l.name} (${fin.pens ? "aux tirs au but" : fin.hg + "–" + fin.ag}).` }); } catch (e) {}
    return rec;
  }

  // ---------------- supercoupes ----------------
  function runSupercups(snap) {
    const H0 = H(), yr = state.season.year, out = [];
    (snap.countries || []).forEach((c) => {
      const ch = getClub(c.champ), cw = c.cup != null ? getClub(c.cup) : null;
      if (!ch) return;
      const other = cw && cw.id !== ch.id ? cw : (c.second != null ? getClub(c.second) : null);
      if (!other) return;
      const label = `Supercoupe (${COUNTRIES[c.ck].label})`;
      const m = play(realTeam(ch, "Champion"), realTeam(other, cw && cw.id !== ch.id ? "Vainqueur de coupe" : "Dauphin"), true);
      const rec = { year: yr, comp: label, txt: line(m), winner: m.w.name };
      out.push(rec);
      if (isMine(m.w) || isMine(m.l)) {
        const tf = (getClub(m.w.id).tierFactor || 0.4);
        pay(m.w, Math.round((300000 + 1.2e6 * tf) / 1e4) * 1e4, label); pay(m.l, Math.round((120000 + 0.5e6 * tf) / 1e4) * 1e4, label + " (finaliste)");
        mail("match", "Fédération", `${label} : ${m.w.name} s'impose`, `<p>${esc(line(m))}</p>`);
      }
      trophy(m.w, yr, label);
    });
    if (snap.ucl && snap.uel) {
      const a = euroTeamByName(snap.ucl, "Vainqueur LDC"), b = euroTeamByName(snap.uel, "Vainqueur Ligue Europa");
      if (a && b && a.id !== b.id) {
        const m = play(a, b, true), label = "Supercoupe de l'UEFA";
        out.push({ year: yr, comp: label, txt: line(m), winner: m.w.name });
        pay(m.w, 3.5e6, label); pay(m.l, 1.5e6, label + " (finaliste)");
        if (isMine(m.w) || isMine(m.l)) mail("match", "UEFA", `${label} : ${m.w.name} s'impose`, `<p>${esc(line(m))}</p>`);
        trophy(m.w, yr, label);
      }
    }
    H0.sup.unshift(...out); if (H0.sup.length > 60) H0.sup.length = 60;
    return out;
  }

  // ---------------- instantané de fin de saison ----------------
  function snapshot() {
    try { window.dsEuro && window.dsEuro.ensureEuro && window.dsEuro.ensureEuro(); window.dsEuro && window.dsEuro.finishAll && window.dsEuro.finishAll(); } catch (e) {}
    const e = state.euro, nm = (id) => { if (id == null) return null; try { if (typeof id === "string") { const g = [].concat(...Object.values(e.ghosts || {})).find((x) => x.id === id); return g ? g.name : null; } const c = getClub(id); return c ? c.name : null; } catch (x) { return null; } };
    const s = { year: state.season.year, countries: [], ucl: e && e.comps && e.comps.ucl ? nm(e.comps.ucl.champion) : null, uel: e && e.comps && e.comps.uel ? nm(e.comps.uel.champion) : null,
      trophies: {} };
    Object.keys(state.countries).forEach((ck) => {
      const st = getLeagueStandings(ck, "d1"), cup = state.cups && state.cups.national && state.cups.national[ck];
      if (st.length > 1) s.countries.push({ ck, champ: st[0].id, second: st[1].id, cup: cup && cup.champion != null ? cup.champion : null });
    });
    (state.userClubIds || []).forEach((id) => { const c = getClub(id); if (c) s.trophies[id] = (c.trophies || []).length; });
    return s;
  }
  const origRoll = window.seasonRollover;
  if (typeof origRoll === "function") window.seasonRollover = function () {
    let snap = null; try { snap = hasState() ? snapshot() : null; } catch (e) { console.warn("honours snapshot", e); }
    const r = origRoll.apply(this, arguments);
    try {
      if (snap) {
        // titres de la saison écoulée gagnés par vos clubs (championnat, coupes, Europe)
        (state.userClubIds || []).forEach((id) => {
          const c = getClub(id); if (!c || snap.trophies[id] == null) return;
          const nw = (c.trophies || []).length - snap.trophies[id];
          for (let i = 0; i < nw; i++) { const t = c.trophies[i]; if (t) H().ds.unshift({ year: t.year, club: c.name, comp: t.competition }); }
        });
        runCWC(snap); runSupercups(snap);
        state.hon.last = state.season.year;
      }
    } catch (e) { console.warn("honours", e); }
    return r;
  };

  // ---------------- records ----------------
  const origTr = window.transferPlayer;
  if (typeof origTr === "function") window.transferPlayer = function (player, fromId, toId, fee) {
    const r = origTr.apply(this, arguments);
    try {
      if (hasState() && fee > 0) {
        const rec = H().rec, nm = `${player.firstName} ${player.lastName}`, yr = state.season.year;
        if (isUserClub(toId) && !isUserClub(fromId) && (!rec.signing || fee > rec.signing.fee)) rec.signing = { name: nm, fee, year: yr, club: (getClub(toId) || {}).name };
        if (isUserClub(fromId) && !isUserClub(toId) && (!rec.sale || fee > rec.sale.fee)) rec.sale = { name: nm, fee, year: yr, club: (getClub(fromId) || {}).name };
      }
    } catch (e) {}
    return r;
  };
  const origAdv = window.advanceDay;
  let lastSeen = null;
  if (typeof origAdv === "function") window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      const m = hasState() && state.lastMatchResult;
      if (m && m !== lastSeen) {
        lastSeen = m; const rec = H().rec, g = m.isHome ? m.homeGoals - m.awayGoals : m.awayGoals - m.homeGoals;
        const sc = m.isHome ? `${m.homeGoals}-${m.awayGoals}` : `${m.awayGoals}-${m.homeGoals}`, opp = m.isHome ? m.awayName : m.homeName;
        if (g > 0 && (!rec.bigWin || g > rec.bigWin.margin)) rec.bigWin = { margin: g, score: sc, opp, date: fmtDate(state.date) };
        if (g < 0 && (!rec.bigLoss || -g > rec.bigLoss.margin)) rec.bigLoss = { margin: -g, score: sc, opp, date: fmtDate(state.date) };
        rec.winStreak = g > 0 ? (rec.winStreak || 0) + 1 : 0; rec.bestStreak = Math.max(rec.bestStreak || 0, rec.winStreak);
        rec.unbeaten = g >= 0 ? (rec.unbeaten || 0) + 1 : 0; rec.bestUnbeaten = Math.max(rec.bestUnbeaten || 0, rec.unbeaten);
      }
    } catch (e) {}
    return r;
  };

  // ---------------- interface ----------------
  function group(list) { const m = {}; list.forEach((t) => { const k = t.competition || t.comp; (m[k] = m[k] || []).push(t.year); }); return Object.entries(m).sort((a, b) => b[1].length - a[1].length); }
  function panel() {
    const c = userClub(); if (!c) return "";
    const h = H(), tr = c.trophies || [], gp = group(tr), rec = h.rec;
    const ds = h.ds || [], dg = group(ds), hist = (state.ds.careerHistory || []);
    const cw = h.cwc[0], sup = h.sup.filter((x) => x.year === state.season.year).slice(0, 4);
    return `<div class="dossier hn-card" id="hn-panel"><h3 class="panel-subtitle">📖 Livre d'or — ${esc(c.name)}</h3>
      ${gp.length ? `<div class="table-wrap"><table class="fm-table"><thead><tr><th>Compétition</th><th>Titres</th><th>Années</th></tr></thead><tbody>${gp.map(([k, y]) => `<tr><td>🏆 ${esc(k)}</td><td>${y.length}</td><td>${y.slice(0, 8).join(", ")}${y.length > 8 ? "…" : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Aucun trophée pour l'instant : le livre d'or reste à écrire.</p>`}
      <h3 class="panel-subtitle">🧭 Palmarès du directeur sportif</h3>
      <p class="hint">${hist.length} saison${hist.length > 1 ? "s" : ""} dirigée${hist.length > 1 ? "s" : ""} · ${ds.length} titre${ds.length > 1 ? "s" : ""}${dg.length ? " (" + dg.slice(0, 4).map(([k, y]) => y.length + "× " + esc(k)).join(", ") + ")" : ""}</p>
      ${ds.length ? `<p class="hint">${ds.slice(0, 6).map((t) => `${t.year} · ${esc(t.comp)} (${esc(t.club)})`).join("<br>")}</p>` : ""}
      <h3 class="panel-subtitle">📊 Records</h3>
      <p class="hint">Plus gros achat : ${rec.signing ? `<b>${esc(rec.signing.name)}</b> — ${money(rec.signing.fee)} (${rec.signing.year})` : "—"}<br>
      Plus grosse vente : ${rec.sale ? `<b>${esc(rec.sale.name)}</b> — ${money(rec.sale.fee)} (${rec.sale.year})` : "—"}<br>
      Plus large victoire : ${rec.bigWin ? `${esc(rec.bigWin.score)} contre ${esc(rec.bigWin.opp)}` : "—"}<br>
      Plus lourde défaite : ${rec.bigLoss ? `${esc(rec.bigLoss.score)} contre ${esc(rec.bigLoss.opp)}` : "—"}<br>
      Meilleure série de victoires : ${rec.bestStreak || 0} · invincibilité : ${rec.bestUnbeaten || 0} matchs</p>
      <h3 class="panel-subtitle">🌍 Coupe du monde des clubs</h3>
      ${cw ? `<p class="hint">Édition ${cw.year} : <b>${esc(cw.champion)}</b> (${esc(cw.champTag)}) bat ${esc(cw.finalist)} en finale.</p>
        <details><summary class="hint">Voir le tableau</summary>${cw.rounds.map((r) => `<p class="hint" style="margin:2px 0">${esc(r.round)} : ${esc(r.txt)}</p>`).join("")}</details>` : `<p class="hint">Le tournoi réunit en fin de saison le champion d'Europe, ceux des autres continents et le champion du pays hôte.</p>`}
      ${sup.length ? `<h3 class="panel-subtitle">🏅 Supercoupes ${state.season.year}</h3>${sup.map((s) => `<p class="hint" style="margin:2px 0">${esc(s.comp)} : ${esc(s.txt)}</p>`).join("")}` : ""}
    </div>`;
  }
  const origClub = window.renderClubTab;
  if (typeof origClub === "function") window.renderClubTab = function () { const b = origClub.apply(this, arguments); try { return b + panel(); } catch (e) { return b; } };
  window.dsHonours = { H, runCWC, runSupercups, snapshot, panel, play };
})();
