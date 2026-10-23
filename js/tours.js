// ===================================================================
// BLOC 23 (2/4) — PARTENARIATS COMMERCIAUX : tournées d'été et amicaux à l'étranger
//  - propositions de tournées en pré-saison et d'amicaux lucratifs à l'étranger (cachets, visibilité, ferveur des supporters)
//  - choix de l'équipe emmenée (équipe type, groupe mixte, réserve) : plus de cachet = plus de fatigue et de blessures
//  - impossible si un match officiel tombe pendant la tournée
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
  const money = (v) => { try { return fmtMoney(v); } catch (e) { return Math.round(v) + " €"; } };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const toast = (t) => { try { window.dsToast && window.dsToast(t); } catch (e) {} };
  const poisson = (l) => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const dk = (d) => new Date(d).toISOString().slice(0, 10);

  const DEST = {
    asie: { label: "Asie", cities: ["Tokyo", "Séoul", "Shanghai", "Singapour"], f: 1.0, tr: 16, fans: 3, rating: 62, opp: ["Kawasaki Frontale", "Seoul FC", "Shanghai Port", "Selangor FC", "Vissel Kobe"] },
    usa: { label: "États-Unis", cities: ["New York", "Los Angeles", "Miami", "Seattle"], f: 1.25, tr: 14, fans: 3, rating: 64, opp: ["New York Red Bulls", "LA Galaxy", "Inter Miami B", "Seattle Sounders B", "Austin FC"] },
    golfe: { label: "Golfe", cities: ["Doha", "Riyad", "Abou Dabi", "Dubaï"], f: 1.45, tr: 12, fans: 2, rating: 63, opp: ["Al-Duhail", "Al-Shabab", "Al-Wahda", "Al-Ain", "Shabab Al-Ahli"] },
    afrique: { label: "Afrique", cities: ["Casablanca", "Dakar", "Abidjan", "Tunis"], f: 0.6, tr: 10, fans: 4, rating: 58, opp: ["Raja Casablanca B", "Génération Foot", "ASEC Mimosas", "Club Africain", "Horoya AC"] },
    sudam: { label: "Amérique du Sud", cities: ["São Paulo", "Buenos Aires", "Bogotá", "Santiago"], f: 0.9, tr: 18, fans: 3, rating: 63, opp: ["Santos B", "Racing Club B", "Millonarios", "Colo-Colo", "Bahia"] },
    europe: { label: "Europe proche", cities: ["Vienne", "Zurich", "Lisbonne", "Prague"], f: 0.4, tr: 5, fans: 1, rating: 60, opp: ["FK Austria Wien", "FC Zürich", "Vitória SC", "Slavia Prague B", "Sparta Prague B"] }
  };
  const MODES = {
    full: { label: "Équipe type", money: 1.25, fat: 1.0, inj: 1.0, hint: "Cachet maximal, fatigue et risque de blessure élevés." },
    mix: { label: "Groupe mixte", money: 1.0, fat: 0.7, inj: 0.6, hint: "Équilibré : titulaires en alternance et jeunes." },
    res: { label: "Réserve et jeunes", money: 0.55, fat: 0.35, inj: 0.3, hint: "Cachet réduit, peu de fatigue, belle expérience pour les jeunes." }
  };
  const T = () => { state.tours = state.tours || { offers: [], active: null, hist: [], lastFriendly: -999, seeded: false }; return state.tours; };
  const clubRating = (c) => { const o = c.players.map((p) => p.overall).sort((a, b) => b - a).slice(0, 14); return o.length ? o.reduce((s, v) => s + v, 0) / o.length : 60; };

  // ---------- calendrier : jours libres avant le prochain match officiel ----------
  function nextOfficial() {
    const club = userClub(); let best = null;
    try {
      const lg = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
      lg.fixtures.forEach((r) => r.matches.forEach((m) => { if (!m.played && (m.home === club.id || m.away === club.id)) { const d = dk(r.date); if (!best || d < best) best = d; } }));
    } catch (e) {}
    return best;
  }
  function freeDays() {
    const t0 = dk(state.date);
    let n = 0;
    for (let k = 1; k <= 20; k++) {
      const d = dk(new Date(t0).getTime() + k * 864e5);
      let busy = false;
      try { if (window.dsPrematch && window.dsPrematch.findMatch(d)) busy = true; } catch (e) {}
      const no = nextOfficial(); if (no && no <= d) busy = true;
      if (busy) break; n = k;
    }
    return n;
  }
  function mkOffer(kind) {
    const club = userClub(), key = pk(Object.keys(DEST)), d = DEST[key];
    const games = kind === "tour" ? ri(2, 3) : 1, days = kind === "tour" ? games * 3 + ri(0, 1) : 2;
    const base = (club.reputation * 38000 + 350000) * d.f * (0.8 + Math.random() * 0.5);
    return { id: Math.floor(Math.random() * 1e9), kind, dest: key, city: pk(d.cities), games, days, base: Math.round(base * Math.max(1, games * 0.8) / 10000) * 10000, mode: "mix", expire: day() + (kind === "tour" ? 40 : 25) };
  }
  function refreshOffers() {
    const t = T(), club = userClub(); if (!club) return;
    t.offers = t.offers.filter((o) => o.expire > day());
    const fd = freeDays();
    if (!t.offers.some((o) => o.kind === "tour") && fd >= 6 && /^(0[6-8])/.test(dk(state.date).slice(5, 7))) { t.offers.push(mkOffer("tour")); if (Math.random() < 0.6) t.offers.push(mkOffer("tour")); }
    if (!t.offers.some((o) => o.kind === "friendly") && day() - t.lastFriendly > 30 && Math.random() < 0.35) t.offers.push(mkOffer("friendly"));
  }
  function netOf(o) { const m = MODES[o.mode].money; const gross = Math.round(o.base * m / 10000) * 10000; return { gross, cost: Math.round(gross * 0.22 / 10000) * 10000, net: gross - Math.round(gross * 0.22 / 10000) * 10000 }; }

  function accept(id, mode) {
    const t = T(), o = t.offers.find((x) => x.id === id), club = userClub();
    if (!o) return { ok: false, msg: "Offre expirée." };
    if (t.active) return { ok: false, msg: "Une tournée est déjà en cours." };
    o.mode = mode || o.mode;
    const fd = freeDays();
    if (fd < o.days) return { ok: false, msg: `Un match officiel est trop proche : il vous faut ${o.days} jours libres (vous en avez ${fd}).` };
    const gap = Math.max(1, Math.floor(o.days / o.games));
    t.active = { ...o, start: day() + 1, end: day() + o.days, results: [], playedN: 0 };
    t.offers = t.offers.filter((x) => x.id !== id);
    if (o.kind === "friendly") t.lastFriendly = day();
    const d = DEST[o.dest];
    note(`${o.kind === "tour" ? "Tournée" : "Amical"} acceptée : ${d.label} (${o.city}), ${o.days} jours.`);
    return { ok: true, msg: `${o.kind === "tour" ? "Tournée" : "Match amical"} confirmée : ${d.label} — départ demain, retour dans ${o.days} jours.` };
  }
  function decline(id) { const t = T(); t.offers = t.offers.filter((o) => o.id !== id); }

  function playGame(a, club) {
    const d = DEST[a.dest], mode = MODES[a.mode];
    const opp = { name: pk(d.opp), rating: d.rating + ri(-4, 6) };
    const mine = clubRating(club) - (a.mode === "res" ? 5 : a.mode === "mix" ? 2 : 0);
    const dr = (mine - opp.rating) / 16;
    const gf = poisson(1.45 * Math.exp(dr / 1.6)), ga = poisson(1.2 * Math.exp(-dr / 1.6));
    // fatigue et blessures
    let hurt = null;
    club.players.forEach((p) => {
      if (p.onLoan) return;
      const first = club.players.slice().sort((x, y) => y.overall - x.overall).indexOf(p) < 14;
      const goes = a.mode === "full" ? first || Math.random() < 0.5 : a.mode === "mix" ? Math.random() < 0.7 : !first || p.age <= 21;
      if (!goes) return;
      p.fatigue = cl((p.fatigue || 0) + (d.tr + ri(4, 10)) * mode.fat, 0, 100);
      if (!hurt && Math.random() < 0.022 * mode.inj && (!p.injuredUntil || p.injuredUntil < dk(state.date))) {
        const days = ri(8, 24); p.injuredUntil = dk(state.date.getTime() + days * 864e5); hurt = { p, days };
      }
    });
    if (hurt) { const m = `${hurt.p.firstName} ${hurt.p.lastName} se blesse en tournée (${hurt.days} jours).`; note(m); a.hurt = (a.hurt || []).concat(m); }
    return { opp: opp.name, gf, ga, city: a.city };
  }
  function finish(a, club) {
    const t = T(), d = DEST[a.dest], n = netOf(a);
    club.budget += n.net;
    if (state.media) state.media.fans = cl(state.media.fans + d.fans * (a.mode === "res" ? 0.5 : 1), 0, 100);
    club.players.forEach((p) => { p.happy = cl((p.happy === undefined ? 62 : p.happy) + (a.mode === "res" ? 0 : 1.5), 0, 100); });
    try { club.reputation = Math.min(100, (club.reputation || 50) + (a.kind === "tour" ? 0.3 : 0.1)); } catch (e) {}
    club.players.forEach((p) => { if (!p.onLoan) p.fatigue = cl((p.fatigue || 0) + d.tr * MODES[a.mode].fat * (0.8 + Math.random() * 0.4), 0, 100); }); // décalage horaire et voyage retour
    const wins = a.results.filter((r) => r.gf > r.ga).length;
    const rec = { year: state.season.year, label: `${a.kind === "tour" ? "Tournée" : "Amical"} — ${d.label} (${a.city})`, net: n.net, results: a.results.map((r) => `${r.opp} ${r.gf}-${r.ga}`), hurt: a.hurt || [] };
    t.hist.unshift(rec); t.hist.length = Math.min(t.hist.length, 10);
    mail("finance", "Partenariats", `Retour de ${a.kind === "tour" ? "tournée" : "match amical"} : ${d.label}`,
      `<p>${esc(rec.label)} : ${wins} victoire(s) sur ${a.results.length}. Recettes nettes : <b>${money(n.net)}</b> (cachets ${money(n.gross)}, frais ${money(n.cost)}).</p>${rec.results.map((r) => `<p class="hint">${esc(r)}</p>`).join("")}${rec.hurt.length ? `<p class="result-bad">${rec.hurt.map(esc).join("<br>")}</p>` : ""}<p class="hint">Les joueurs rentrent fatigués : pensez à gérer la reprise.</p>`);
    t.active = null;
    note(`Retour de ${rec.label} : +${money(n.net)}.`);
  }
  function daily() {
    const t = T(), a = t.active, club = userClub(); if (!club) return;
    if (a && day() >= a.start) {
      const gap = Math.max(1, Math.floor(a.days / a.games));
      if (a.playedN < a.games && (day() - a.start) % gap === 0 && (day() - a.start) / gap === a.playedN) { const r = playGame(a, club); a.results.push(r); a.playedN++; }
      if (day() >= a.end) finish(a, club);
    }
    if (day() % 5 === 0) refreshOffers();
  }

  // ---------- interface (onglet Finances) ----------
  function panel() {
    const club = userClub(); if (!club) return "";
    const t = T(), a = t.active;
    const offer = (o) => {
      const d = DEST[o.dest], n = netOf(o);
      return `<div class="tr-row to-offer"><div class="tr-ic">${o.kind === "tour" ? "✈️" : "🌍"}</div><div class="tr-tx"><b>${o.kind === "tour" ? "Tournée" : "Match amical"} — ${esc(d.label)} (${esc(o.city)})</b>
        <p class="hint" style="margin:2px 0">${o.games} match${o.games > 1 ? "s" : ""} en ${o.days} jours · cachet estimé <b>${money(n.net)}</b> net · expire dans ${Math.max(0, o.expire - day())} j</p>
        <select data-to="mode" data-id="${o.id}" aria-label="Équipe emmenée">${Object.entries(MODES).map(([k, m]) => `<option value="${k}" ${o.mode === k ? "selected" : ""}>${m.label}</option>`).join("")}</select>
        <span class="hint">${esc(MODES[o.mode].hint)}</span></div>
        <div><button class="btn btn-small btn-primary" data-to="ok" data-id="${o.id}">Accepter</button> <button class="btn btn-small btn-ghost" data-to="no" data-id="${o.id}">Refuser</button></div></div>`;
    };
    return `<div class="dossier to-card" id="to-panel"><h3 class="panel-subtitle">✈️ Tournées et matchs amicaux</h3>
      <p class="hint">Les clubs étrangers paient pour vous accueillir : cachets et ferveur des supporters, mais fatigue des joueurs et risque de blessure. Il faut des jours libres sans match officiel.</p>
      ${a ? `<p class="result-good">En cours : ${esc(DEST[a.dest].label)} (${esc(a.city)}) — ${a.playedN}/${a.games} matchs, retour dans ${Math.max(0, a.end - day())} jours.</p>${a.results.map((r) => `<p class="hint" style="margin:0">${esc(r.opp)} ${r.gf}-${r.ga}</p>`).join("")}` : ""}
      ${t.offers.length ? t.offers.map(offer).join("") : `<p class="hint">Aucune proposition pour l'instant (les tournées arrivent surtout en été).</p>`}
      ${t.hist.length ? `<h4 class="fm-h">Historique</h4>${t.hist.slice(0, 4).map((h) => `<p class="hint" style="margin:2px 0">${h.year} · ${esc(h.label)} : ${money(h.net)} — ${esc(h.results.join(" · "))}</p>`).join("")}` : ""}
      <p class="hint" id="to-msg"></p></div>`;
  }
  document.addEventListener("click", (e) => {
    if (!hasState()) return;
    const b = e.target.closest && e.target.closest("button[data-to]"); if (!b) return;
    const id = parseInt(b.dataset.id, 10);
    if (b.dataset.to === "ok") { const sel = document.querySelector(`select[data-to="mode"][data-id="${id}"]`); const r = accept(id, sel && sel.value); toast(r.msg); const m = document.getElementById("to-msg"); if (m) m.textContent = r.msg; try { saveGame(); } catch (x) {} if (r.ok) { try { render(); } catch (x) {} } }
    else if (b.dataset.to === "no") { decline(id); try { render(); } catch (x) {} }
  });
  document.addEventListener("change", (e) => {
    const s = e.target; if (!s.dataset || s.dataset.to !== "mode" || !hasState()) return;
    const o = T().offers.find((x) => x.id === parseInt(s.dataset.id, 10)); if (o) { o.mode = s.value; try { render(); } catch (x) {} }
  });
  const oAdv = window.advanceDay;
  if (typeof oAdv === "function") window.advanceDay = function () {
    const r = oAdv.apply(this, arguments);
    try { if (hasState()) daily(); } catch (e) { console.warn("tours", e); }
    return r;
  };
  const oRoll = window.seasonRollover;
  if (typeof oRoll === "function") window.seasonRollover = function () {
    const r = oRoll.apply(this, arguments);
    try { if (hasState()) { const t = T(); t.active = null; t.offers = []; refreshOffers(); if (!t.offers.some((o) => o.kind === "tour")) t.offers.push(mkOffer("tour")); mail("finance", "Partenariats", "Propositions de tournée d'été", `<p>Des clubs étrangers vous invitent pour la pré-saison : consultez l'onglet Finances.</p>`); } } catch (e) { console.warn("tours roll", e); }
    return r;
  };
  const oF = window.renderFinance;
  if (typeof oF === "function") window.renderFinance = function () { const b = oF.apply(this, arguments); try { return b + panel(); } catch (e) { return b; } };
  window.dsTours = { T, accept, decline, refreshOffers, freeDays, mkOffer, panel, DEST, MODES, netOf };
})();
