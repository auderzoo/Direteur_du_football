// ===================================================================
// BLOC 20 (3/3) — SAISONNALITÉ : trêves internationales, sélections, charge & fatigue
//  - à chaque trêve, les meilleurs joueurs de chaque nation (tous clubs) sont convoqués
//    et deviennent INDISPONIBLES (coupes comprises) ; préavis de 3 jours
//  - le DS peut demander un forfait pour un joueur fatigué ou blessé (la fédération
//    peut refuser), les matchs des sélections sont joués : résultats, buteurs, retours
//  - charge de travail : 3 matchs en 9 jours = fatigue accrue + risque de blessure
//  - repos : « mettre au repos » 5 jours (fatigue en baisse, indisponible)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const ready = () => typeof state !== "undefined" && state && state.ds && state.countries;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const dkey = (d) => new Date(d).toISOString().slice(0, 10);
  const todayKey = () => dkey(state.date);
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mail = (folder, sub, html) => { try { window.dsMail && window.dsMail(folder, "Fédération", sub, html); } catch (e) {} };
  const userIds = () => (state.userClubIds && state.userClubIds.length ? state.userClubIds : (state.userClubId != null ? [state.userClubId] : []));
  const isMine = (clubId) => userIds().includes(clubId);
  function K() { if (!state.cal) state.cal = { called: {}, results: [], withdraw: {}, noticed: {} }; return state.cal; }

  // ---------------------------------------------------------------
  // Disponibilité : sélection, repos
  // ---------------------------------------------------------------
  const origAvail = window.isAvailable;
  if (typeof origAvail === "function") window.isAvailable = function (p, dateKey) {
    if (p && ((p.intl && dateKey && p.intl.until && p.intl.until >= dateKey && (!p.intl.from || p.intl.from <= dateKey)) || (p.restUntil && dateKey && p.restUntil >= dateKey))) return false;
    return origAvail.apply(this, arguments);
  };

  // ---------------------------------------------------------------
  // Convocations
  // ---------------------------------------------------------------
  function nations() {
    const by = {};
    allClubs().forEach((c) => c.players.forEach((p) => {
      if (p.onLoan && false) return;
      (by[p.nationality] = by[p.nationality] || []).push(p);
    }));
    const out = {};
    Object.keys(by).forEach((n) => {
      const list = by[n].filter((p) => p.overall >= 58 && p.age >= 18).sort((a, b) => (b.overall + (b.internationalCaps || 0) * 0.15) - (a.overall + (a.internationalCaps || 0) * 0.15)).slice(0, 18);
      if (list.length >= 8) out[n] = list;
    });
    return out;
  }
  function selection(b) {
    const S = K(), nat = nations(), called = [];
    Object.keys(nat).forEach((n) => nat[n].forEach((p) => {
      if (S.withdraw[p.id] || (p.injuredUntil && p.injuredUntil >= b.start)) return;
      called.push({ pid: p.id, clubId: p.clubId, nation: n });
    }));
    return called;
  }
  function notice(b) {
    const S = K(); if (S.noticed[b.end]) return; S.noticed[b.end] = true;
    const sel = selection(b);
    S.pending = { end: b.end, start: b.start, label: b.label, list: sel };
    userIds().forEach((id) => {
      const mine = sel.filter((x) => x.clubId === id).map((x) => getPlayer(x.pid)).filter(Boolean);
      if (mine.length) mail("players", "Convocations en sélection", `<p>${esc(b.label)} : <b>${mine.map((p) => esc(p.firstName[0] + ". " + p.lastName) + " (" + esc(p.nationality) + ")").join(", ")}</b> sont convoqués.</p><p class="hint">Onglet Calendrier ▸ « Sélections » : vous pouvez demander un forfait pour un joueur fatigué ou blessé (la fédération peut refuser).</p>`);
    });
  }
  function callUp(b) {
    const S = K();
    const sel = (S.pending && S.pending.end === b.end ? S.pending.list : selection(b)).filter((x) => !S.withdraw[x.pid]);
    S.called[b.end] = sel;
    sel.forEach((x) => { const p = getPlayer(x.pid); if (p) p.intl = { from: b.start, until: b.end, nation: x.nation }; });
    S.pending = null;
  }
  function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
  function callBack(b) {
    const S = K(), sel = S.called[b.end] || [];
    const by = {};
    sel.forEach((x) => { const p = getPlayer(x.pid); if (p) (by[x.nation] = by[x.nation] || []).push(p); });
    const strength = (list) => { const t = list.slice().sort((a, b2) => b2.overall - a.overall).slice(0, 11); while (t.length < 11) t.push({ overall: 55 }); return t.reduce((s, p) => s + p.overall, 0) / 11; };
    const ns = Object.keys(by).filter((n) => by[n].length >= 8);
    const results = [];
    // deux journées de matchs internationaux
    for (let r = 0; r < 2; r++) {
      const pool = ns.slice().sort(() => Math.random() - 0.5);
      while (pool.length >= 2) {
        const a = pool.pop(), c2 = pool.pop();
        const sa = strength(by[a]), sb = strength(by[c2]);
        const ga = poisson(cl(1.25 + (sa - sb) / 25, 0.2, 3.5)), gb = poisson(cl(1.1 - (sa - sb) / 25, 0.2, 3.2));
        const scorers = [];
        [[a, ga], [c2, gb]].forEach(([n, g]) => { for (let i = 0; i < g; i++) { const pl = by[n].filter((p) => p.position === "ATT" || p.position === "MIL"); const s = pl.length ? pl[ri(0, pl.length - 1)] : null; if (s) { s.internationalGoals = (s.internationalGoals || 0) + 1; scorers.push({ id: s.id, name: s.lastName, club: s.clubId }); } } });
        results.push({ a, b: c2, ga, gb, scorers });
      }
    }
    S.results.unshift({ label: b.label, end: b.end, list: results });
    if (S.results.length > 8) S.results.length = 8;
    // retours : fatigue, caps, moral
    const hurtByClub = {};
    sel.forEach((x) => {
      const p = getPlayer(x.pid); if (!p) return;
      const starter = by[x.nation] && by[x.nation].slice().sort((a, b2) => b2.overall - a.overall).indexOf(p) < 11;
      p.fatigue = cl((p.fatigue || 0) + (starter ? ri(8, 14) : ri(2, 5)), 0, 100);
      if (starter) p.internationalCaps = (p.internationalCaps || 0) + 0; // les sélections sont déjà comptées par le calendrier réel
      if (!p.intl) return; // déjà rentré (réalisme.js)
      delete p.intl;
    });
    sel.forEach((x) => { const p = getPlayer(x.pid); if (p) delete p.intl; });
    // compte rendu pour le DS
    userIds().forEach((id) => {
      const mine = sel.filter((x) => x.clubId === id).map((x) => getPlayer(x.pid)).filter(Boolean);
      if (!mine.length) return;
      const goals = [];
      results.forEach((m) => m.scorers.forEach((s) => { if (s.club === id) goals.push(s.name); }));
      mail("players", "Retour de sélection", `<p>${esc(b.label)} terminée. Vos internationaux sont de retour (${mine.map((p) => esc(p.lastName)).join(", ")}).${goals.length ? ` Buteurs avec leur sélection : <b>${[...new Set(goals)].map(esc).join(", ")}</b> (moral en hausse).` : ""}</p>`);
      goals.forEach((n) => { const p = mine.find((q) => q.lastName === n); if (p) p.morale = Math.min(100, p.morale + 6); });
    });
  }

  // ---------------------------------------------------------------
  // Forfait
  // ---------------------------------------------------------------
  function withdraw(pid) {
    const S = K(), p = getPlayer(pid);
    if (!p || !S.pending) return { ok: false, reason: "Aucune convocation en attente." };
    if (S.withdraw[pid]) return { ok: false, reason: "Forfait déjà demandé." };
    const hurt = p.injuredUntil && p.injuredUntil >= todayKey();
    const tired = (p.fatigue || 0) >= 55;
    const rep = state.ds.reputation || 30;
    const chance = hurt ? 0.95 : tired ? 0.6 + rep / 400 : 0.12;
    if (Math.random() < chance) {
      S.withdraw[pid] = true; S.pending.list = S.pending.list.filter((x) => x.pid !== pid);
      return { ok: true, granted: true };
    }
    p.morale = Math.max(20, p.morale - 4);
    return { ok: true, granted: false };
  }

  // ---------------------------------------------------------------
  // Charge de travail
  // ---------------------------------------------------------------
  const origTrack = window.trackMatchesPlayed;
  function mark(p) {
    const d = state.dayCounter || 0;
    p.recent = (p.recent || []).filter((x) => d - x <= 14); p.recent.push(d);
  }
  if (typeof origTrack === "function") window.trackMatchesPlayed = function (lineup) {
    const r = origTrack.apply(this, arguments);
    try { lineup.forEach((p) => { mark(p); const n = congestion(p); if (n >= 3) p.fatigue = cl((p.fatigue || 0) + 5, 0, 100); }); } catch (e) {}
    return r;
  };
  function congestion(p) { const d = state.dayCounter || 0; return (p.recent || []).filter((x) => d - x <= 9).length; }
  const origInj = window.maybeInjure;
  if (typeof origInj === "function") window.maybeInjure = function (club, dateKey) {
    const r = origInj.apply(this, arguments);
    try {
      const tired = club.players.filter((p) => !p.onLoan && congestion(p) >= 3 && (p.fatigue || 0) >= 50 && isAvailable(p, dateKey));
      tired.forEach((p) => {
        if (Math.random() < 0.03 + ((p.fatigue || 0) - 50) * 0.0008) {
          const days = ri(6, 24);
          p.injuredUntil = dkey(state.date.getTime() + days * 864e5);
          p.injury = { type: "Blessure de fatigue (calendrier chargé)", days, date: todayKey() };
          if (isMine(club.id)) note(`${p.firstName} ${p.lastName} se blesse : calendrier trop chargé (${Math.max(1, Math.round(days / 7))} sem.).`);
        }
      });
    } catch (e) {}
    return r;
  };
  function rest(pid) {
    const p = getPlayer(pid); if (!p) return { ok: false };
    p.restUntil = dkey(state.date.getTime() + 5 * 864e5); p.fatigue = cl((p.fatigue || 0) - 25, 0, 100);
    return { ok: true };
  }

  // ---------------------------------------------------------------
  // Interface (onglet Calendrier)
  // ---------------------------------------------------------------
  function riskChip(p) {
    const n = congestion(p), f = p.fatigue || 0;
    if (n >= 3 && f >= 60) return ["Très élevé", "bad"];
    if (n >= 3 || f >= 70) return ["Élevé", "mid"];
    if (n >= 2 || f >= 45) return ["Modéré", "mid"];
    return ["Faible", "ok"];
  }
  function panelHTML() {
    const club = userClub(); if (!club) return "";
    const S = K();
    const pend = S.pending;
    const upcoming = (state.intlBreaks || []).filter((b) => b.end >= todayKey()).slice(0, 2);
    const nowIntl = club.players.filter((p) => p.intl);
    let called = "";
    if (pend) {
      const mine = pend.list.filter((x) => x.clubId === club.id).map((x) => getPlayer(x.pid)).filter(Boolean);
      called = `<h4 class="co-h">Convocations — ${esc(pend.label)} (départ le ${fmtDate(new Date(pend.start))})</h4>
        ${mine.length ? `<table class="squad-table co-tbl"><thead><tr><th>Joueur</th><th>Sélection</th><th>Fatigue</th><th>Santé</th><th></th></tr></thead><tbody>${mine.map((p) => `<tr><td>${esc(p.firstName[0] + ". " + p.lastName)}</td><td>${esc(p.nationality)}</td><td>${Math.round(p.fatigue || 0)}</td><td>${p.injuredUntil && p.injuredUntil >= todayKey() ? "blessé" : "apte"}</td><td><button class="btn btn-small" data-cal="withdraw" data-id="${p.id}">Demander forfait</button></td></tr>`).join("")}</tbody></table>` : `<p class="hint">Aucun de vos joueurs n'est convoqué.</p>`}`;
    } else if (nowIntl.length) {
      called = `<h4 class="co-h">En sélection actuellement</h4><p class="hint">${nowIntl.map((p) => esc(p.lastName) + " (" + esc(p.nationality) + ")").join(", ")} — de retour le ${fmtDate(new Date(nowIntl[0].intl.until))}.</p>`;
    }
    const load = club.players.filter((p) => !p.onLoan).map((p) => ({ p, n: congestion(p), f: p.fatigue || 0 })).sort((a, b) => (b.f + b.n * 8) - (a.f + a.n * 8)).slice(0, 10);
    const res = S.results[0];
    const resHTML = res ? `<h4 class="co-h">Dernières sélections — ${esc(res.label)}</h4><div class="cal-res">${res.list.slice(0, 8).map((m) => `<span>${esc(m.a)} <b>${m.ga}-${m.gb}</b> ${esc(m.b)}</span>`).join("")}</div>` : "";
    return `<section class="panel co-panel" id="cal2"><h3 class="panel-subtitle">🌍 Sélections & charge de travail</h3>
      <p class="hint" style="margin-top:0">${upcoming.length ? "Prochaine trêve : " + upcoming.map((b) => esc(b.label) + " (" + fmtDate(new Date(b.start)) + ")").join(" · ") : "Pas de trêve à venir."} Les internationaux sont indisponibles pendant la trêve, y compris en coupe.</p>
      ${called}${resHTML}
      <h4 class="co-h">Charge de travail (matchs sur 9 jours · fatigue)</h4>
      <table class="squad-table co-tbl"><thead><tr><th>Joueur</th><th>Poste</th><th>Matchs 9 j</th><th>Fatigue</th><th>Risque</th><th></th></tr></thead><tbody>
      ${load.map(({ p, n, f }) => { const [l, c] = riskChip(p); const resting = p.restUntil && p.restUntil >= todayKey(); return `<tr><td>${esc(p.firstName[0] + ". " + p.lastName)}</td><td>${p.position}</td><td>${n}</td><td>${Math.round(f)}</td><td><span class="co-chip ${c}">${l}</span></td><td>${resting ? `<span class="hint">au repos</span>` : `<button class="btn btn-small" data-cal="rest" data-id="${p.id}">Repos 5 j</button>`}</td></tr>`; }).join("")}
      </tbody></table>
      <p class="hint">Trois matchs en neuf jours augmentent la fatigue et le risque de blessure. L'entraîneur fait plus ou moins tourner selon sa qualité de rotation.</p></section>`;
  }
  const origCal = window.renderCalendar;
  if (typeof origCal === "function") window.renderCalendar = function () {
    const html = origCal.apply(this, arguments);
    try { return ready() && userClub() ? html + panelHTML() : html; } catch (e) { console.error(e); return html; }
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-cal]"); if (!b || !ready()) return;
    const id = parseInt(b.dataset.id, 10);
    if (b.dataset.cal === "withdraw") { const r = withdraw(id); if (window.dsToast) dsToast(!r.ok ? r.reason : r.granted ? "Forfait accordé" : "La fédération refuse le forfait"); }
    else if (b.dataset.cal === "rest") { rest(id); if (window.dsToast) dsToast("Joueur mis au repos 5 jours"); }
    try { saveGame(); } catch (x) {} render();
  });

  // ---------------------------------------------------------------
  // Intégration
  // ---------------------------------------------------------------
  const origAdv = window.advanceDay;
  if (typeof origAdv === "function") window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      if (!ready()) return r;
      const t = todayKey(), d3 = dkey(state.date.getTime() + 3 * 864e5);
      (state.intlBreaks || []).forEach((b) => {
        if (b.start === d3) notice(b);
        if (b.start === t) callUp(b);
        if (b.end === t) callBack(b);
      });
      // match de coupe du club : charge de travail
      if (state.lastCupResult) userIds().forEach((id) => { const c = getClub(id); if (c && state.lastCupResult && (state.lastCupResult.homeName === c.name || state.lastCupResult.awayName === c.name)) buildLineup(c, t).forEach((p) => { mark(p); p.fatigue = cl((p.fatigue || 0) + ri(10, 16), 0, 100); }); });
      // récupération supplémentaire des joueurs au repos
      userIds().forEach((id) => { const c = getClub(id); if (c) c.players.forEach((p) => { if (p.restUntil && p.restUntil >= t) p.fatigue = cl((p.fatigue || 0) - 4, 0, 100); }); });
    } catch (e) { console.warn("calendrier2", e); }
    return r;
  };

  window.dsCal = { K, selection, notice, callUp, callBack, withdraw, rest, congestion, nations, panelHTML };
})();
