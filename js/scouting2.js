// =====================================================================
// BLOC 18 (2/4) : SCOUTING SUR LE TERRAIN
//  - Envoyer un recruteur voir un match précis ou un tournoi de jeunes.
//  - Rapports nettement plus fiables sur les joueurs observés.
//  - Le recruteur est absent pendant sa mission : son travail de fond (pays assigné) est suspendu.
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
  const toast = (t) => { try { window.dsToast && window.dsToast(t); } catch (e) {} };
  const dkey = (d) => new Date(d).toISOString().slice(0, 10);
  const POSL = { GB: "gardien", DEF: "défenseur", MIL: "milieu", ATT: "attaquant" };

  const F = (club) => { const sc = ensureScouting(club); sc.field = sc.field || { missions: [], seq: 0 }; return sc.field; };
  const UI = () => { ui.sc2 = ui.sc2 || { kind: "match", country: "", scout: 0, match: "" }; return ui.sc2; };

  function freeScouts(club) {
    const busy = new Set(F(club).missions.filter((m) => m.status === "active").map((m) => m.scoutId));
    return staffByRole(club, "recruteur").filter((s) => !busy.has(s.id));
  }

  // matchs à venir (10 jours) d'un pays, les plus intéressants d'abord
  function upcoming(country, days) {
    const c = state.countries[country]; if (!c) return [];
    const t0 = dkey(state.date), t1 = dkey(new Date(state.date.getTime() + (days || 10) * 86400000));
    const out = [];
    Object.entries(c.leagues).forEach(([lk, lg]) => lg.fixtures.forEach((r, ri) => {
      const d = r.date.slice(0, 10); if (d <= t0 || d > t1) return;
      r.matches.forEach((m, mi) => {
        if (m.played) return;
        const h = getClub(m.home), a = getClub(m.away); if (!h || !a) return;
        out.push({ key: `${lk}:${ri}:${mi}`, date: d, home: h, away: a, hype: h.reputation + a.reputation + (h.tierFactor > 0.7 ? 20 : 0) });
      });
    }));
    return out.sort((x, y) => y.hype - x.hype).slice(0, 14);
  }
  function findMatch(country, key) {
    const [lk, ri, mi] = key.split(":"); const c = state.countries[country];
    const lg = c && c.leagues[lk]; const r = lg && lg.fixtures[+ri]; const m = r && r.matches[+mi];
    return m ? { m, date: r.date.slice(0, 10) } : null;
  }

  function costOf(club, kind, country) {
    const abroad = country !== club.countryKey;
    return Math.round((kind === "tournoi" ? 12000 : 3000) * (abroad ? 2.2 : 1) / 500) * 500;
  }

  function start(scoutId, kind, country, matchKey) {
    const club = userClub(); const f = F(club); const sc = ensureScouting(club);
    const scout = freeScouts(club).find((s) => s.id === scoutId);
    if (!scout) return { ok: false, reason: "Ce recruteur n'est pas disponible." };
    if (!state.countries[country]) return { ok: false, reason: "Choisissez un pays." };
    const cost = costOf(club, kind, country);
    if (club.budget < cost) return { ok: false, reason: `Frais de mission : ${money(cost)} (trésorerie insuffisante).` };
    const m = { id: ++f.seq, scoutId, scoutName: pn(scout), kind, country, startDay: day(), cost, status: "active", prevAssign: sc.assignments[scoutId] || null };
    if (kind === "match") {
      const fm = findMatch(country, matchKey); if (!fm) return { ok: false, reason: "Choisissez un match." };
      const left = Math.max(1, Math.round((new Date(fm.date) - new Date(dkey(state.date))) / 86400000));
      m.matchKey = matchKey; m.home = fm.m.home; m.away = fm.m.away; m.matchDate = fm.date; m.endDay = day() + left + 1;
    } else { m.endDay = day() + 7; }
    club.budget -= cost;
    delete sc.assignments[scoutId]; // le recruteur quitte son poste d'observation habituel
    f.missions.unshift(m); if (f.missions.length > 30) f.missions.length = 30;
    const lbl = kind === "match" ? `${(getClub(m.home) || {}).name} – ${(getClub(m.away) || {}).name}` : `tournoi de jeunes (${state.countries[country].label})`;
    note(`${m.scoutName} part en mission : ${lbl} (retour dans ${m.endDay - day()} j, frais ${money(cost)}).`);
    return { ok: true, mission: m };
  }

  function reliability(scout, kind) {
    const a = scout.attributes || {};
    const skill = ((a.jugementNiveau || 8) + (a.jugementPotentiel || 8) + (a.observation || 8)) / 3;
    return clamp(Math.round(58 + skill * 1.8 + (kind === "match" ? 6 : 0)), 55, 96);
  }
  function sharpen(rep, p) { // rapport « terrain » : fourchette de potentiel resserrée
    if (!rep.d) return;
    rep.d.lo = clamp(p.potential - 1, p.overall, 99); rep.d.hi = clamp(p.potential + 1, rep.d.lo, 99);
    rep.d.conf = rep.pk; rep.field = true;
  }

  function finish(m) {
    const club = userClub(); const sc = ensureScouting(club);
    const scout = staffByRole(club, "recruteur").find((s) => s.id === m.scoutId);
    m.status = "done"; m.endedDay = day();
    if (m.prevAssign && scout) sc.assignments[m.scoutId] = m.prevAssign;
    if (!scout) { m.summary = "Le recruteur a quitté le staff avant la fin de la mission."; return; }
    const pk = reliability(scout, m.kind);
    const lines = []; let reports = 0;
    const seen = (p, pc, extra) => {
      sc.known[p.id] = Math.max(sc.known[p.id] || 0, pk);
      const rep = makeScoutReport(club, scout, p, pc, pk); sharpen(rep, p); reports++;
      lines.push(`<li><b>${esc(pn(p))}</b> (${POSL[p.position]}, ${p.age} ans, ${esc(pc.name)}) — avis « <b>${esc(rep.verdict)}</b> »${extra ? " · " + extra : ""}</li>`);
      return rep;
    };
    if (m.kind === "match") {
      const h = getClub(m.home), a = getClub(m.away);
      const fm = findMatch(m.country, m.matchKey); const mm = fm && fm.m;
      const score = mm && mm.played ? `${h.name} ${mm.homeGoals}-${mm.awayGoals} ${a.name}` : `${h.name} – ${a.name}`;
      const pool = h.players.concat(a.players).filter((p) => !p.onLoan || p.onLoan.toClubId === p.clubId);
      const avg = pool.reduce((s, p) => s + p.overall, 0) / Math.max(1, pool.length);
      const pick4 = pool.map((p) => ({ p, w: (p.potential - 55) + (p.age <= 22 ? 8 : 0) + (sc.known[p.id] >= 70 ? -12 : 0) + Math.random() * 14 })).sort((x, y) => y.w - x.w).slice(0, 4).map((x) => x.p);
      pick4.forEach((p) => { const note0 = clamp(Math.round((6.2 + (p.overall - avg) / 7 + (Math.random() - 0.5) * 1.6) * 10) / 10, 4.5, 9.5); seen(p, getClub(p.clubId), `note du match ${note0.toFixed(1)}/10`); });
      m.summary = `Match observé : ${score}. ${reports} joueur(s) évalué(s) en direct (fiabilité ${pk} %).`;
      mail("scout", m.scoutName, `🎯 Mission terminée : ${h.name} – ${a.name}`, `<p>${esc(m.summary)}</p><ul>${lines.join("")}</ul><p class="hint">Les rapports détaillés sont dans votre onglet Scouting et votre boîte de réception. Des observations en direct sont plus fiables que le travail de fond d'un recruteur.</p>`);
    } else {
      const c = state.countries[m.country];
      const all = []; Object.values(c.leagues).forEach((lg) => lg.clubs.forEach((pc) => { if (pc.id !== club.id) pc.players.forEach((p) => { if (p.age <= 20) all.push({ p, pc, w: Math.max(1, p.potential - 55) + Math.random() * 14 + (sc.known[p.id] >= 70 ? -10 : 0) }); }); }));
      all.sort((x, y) => y.w - x.w).slice(0, 6).forEach((x) => seen(x.p, x.pc, `potentiel ${x.p.potential}`));
      sc.knowledge[m.country] = clamp((sc.knowledge[m.country] || 0) + 6, 0, 100);
      m.summary = `Tournoi de jeunes (${c.label}) : ${reports} espoir(s) repéré(s), connaissance du pays en hausse (fiabilité ${pk} %).`;
      mail("scout", m.scoutName, `🎯 Tournoi de jeunes terminé — ${c.label}`, `<p>${esc(m.summary)}</p><ul>${lines.join("")}</ul>`);
    }
    m.reports = reports;
    note(`${m.scoutName} est de retour : ${m.summary}`);
  }

  function tick() {
    const club = userClub(); if (!club) return;
    F(club).missions.filter((m) => m.status === "active" && day() >= m.endDay).forEach((m) => { try { finish(m); } catch (e) { console.error("mission", e); m.status = "done"; } });
  }

  // ---------- interface (onglet Scouting) ----------
  function panelHTML() {
    const club = userClub(); const f = F(club); const u = UI();
    const free = freeScouts(club);
    const countries = Object.values(state.countries);
    if (!u.country || !state.countries[u.country]) u.country = club.countryKey;
    if (!free.some((s) => s.id === +u.scout)) u.scout = free[0] ? free[0].id : 0;
    const active = f.missions.filter((m) => m.status === "active");
    const done = f.missions.filter((m) => m.status === "done").slice(0, 4);
    const matches = u.kind === "match" ? upcoming(u.country, 10) : [];
    if (u.kind === "match" && !matches.some((x) => x.key === u.match)) u.match = matches[0] ? matches[0].key : "";
    const cost = costOf(club, u.kind, u.country);
    const act = active.map((m) => `<li>🧳 <b>${esc(m.scoutName)}</b> — ${m.kind === "match" ? esc(`${(getClub(m.home) || {}).name} – ${(getClub(m.away) || {}).name}`) : esc(`tournoi de jeunes (${state.countries[m.country].label})`)} · retour dans ${Math.max(0, m.endDay - day())} j</li>`).join("");
    const old = done.map((m) => `<li class="hint">${esc(m.summary || "")}</li>`).join("");
    const form = !staffByRole(club, "recruteur").length ? `<p class="hint">Engagez d'abord un recruteur (onglet Staff).</p>`
      : !free.length ? `<p class="hint">Tous vos recruteurs sont déjà en mission.</p>`
      : `<div class="sc2-form">
          <label class="field"><span>Recruteur</span><select data-sc2="scout">${free.map((s) => `<option value="${s.id}" ${s.id === +u.scout ? "selected" : ""}>${esc(pn(s))}${(ensureScouting(club).assignments[s.id] || {}).country ? " (quitte son poste)" : ""}</option>`).join("")}</select></label>
          <div class="eu-subnav"><button class="${u.kind === "match" ? "on" : ""}" data-sc2="kind:match">⚽ Observer un match</button><button class="${u.kind === "tournoi" ? "on" : ""}" data-sc2="kind:tournoi">🏆 Tournoi de jeunes</button></div>
          <label class="field"><span>Pays</span><select data-sc2="country">${countries.map((c) => `<option value="${c.key}" ${c.key === u.country ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label>
          ${u.kind === "match" ? (matches.length ? `<label class="field"><span>Match (10 prochains jours)</span><select data-sc2="match">${matches.map((x) => `<option value="${x.key}" ${x.key === u.match ? "selected" : ""}>${esc(x.date.slice(5).split("-").reverse().join("/"))} — ${esc(x.home.name)} – ${esc(x.away.name)}</option>`).join("")}</select></label>` : `<p class="hint">Aucun match dans ce pays dans les 10 prochains jours.</p>`)
            : `<p class="hint">Une semaine sur place : jusqu'à 6 espoirs de moins de 21 ans évalués, et la connaissance du pays progresse.</p>`}
          <p class="hint">Frais de mission : <b>${money(cost)}</b>. Pendant sa mission, le recruteur n'alimente plus son pays assigné.</p>
          <button class="btn btn-primary" data-sc2="go" ${u.kind === "match" && !matches.length ? "disabled" : ""}>Envoyer en mission</button></div>`;
    return `<div class="fm-dark fm-panel sc2"><h3 class="panel-subtitle">🎯 Missions sur le terrain</h3>
      <p class="hint">Un recruteur sur place juge bien mieux un joueur qu'un travail de fond : fourchettes de potentiel resserrées et connaissance quasi complète des joueurs vus.</p>
      ${active.length ? `<ul class="dos-list">${act}</ul>` : ""}${form}${old ? `<h4 class="dos-h">Dernières missions</h4><ul class="dos-list">${old}</ul>` : ""}</div>`;
  }
  const origTab = window.renderScoutingTab;
  window.renderScoutingTab = function () {
    const html = origTab.apply(this, arguments);
    try { return ready() ? html + panelHTML() : html; } catch (e) { console.error(e); return html; }
  };
  const rerender = () => { const c = document.getElementById("tab-content"); if (c && ui.tab === "scouting") c.innerHTML = renderScoutingTab(); else { try { render(); } catch (e) {} } };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("button[data-sc2]"); if (!b || b.disabled || !ready()) return;
    const [k, v] = b.getAttribute("data-sc2").split(":"); const u = UI();
    if (k === "kind") { u.kind = v; rerender(); }
    else if (k === "go") {
      const r = start(+u.scout, u.kind, u.country, u.match);
      toast(r.ok ? "Recruteur parti en mission" : r.reason); try { saveGame(); } catch (x) {} rerender();
    }
  });
  document.addEventListener("change", (e) => {
    const s = e.target.closest && e.target.closest("select[data-sc2]"); if (!s || !ready()) return;
    const u = UI(); u[s.getAttribute("data-sc2")] = s.value; if (s.getAttribute("data-sc2") === "country") u.match = ""; rerender();
  });

  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (ready()) tick(); } catch (e) { console.error("scouting terrain", e); }
    return r;
  };
  window.dsField = { start, tick, finish, upcoming, freeScouts, reliability, F, costOf };
})();
