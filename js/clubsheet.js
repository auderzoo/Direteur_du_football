// ===================================================================
// BLOC 21 (6/6) — FICHE DE CLUB (style FM24) : Aperçu · Calendrier · Effectif (sans niveau) · Compétitions
// Ouverte par « ⓘ » (choix du club), par un clic sur un club d'un classement, ou window.dsClubSheet.open(id)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const EUL = { ucl: "Ligue des champions", uel: "Ligue Europa", uecl: "Ligue Europa Conférence" };
  const POS = { GB: "Gardiens", DEF: "Défenseurs", MIL: "Milieux", ATT: "Attaquants" };
  let cur = null, tab = "apercu";

  const clubById = (id) => { try { return getClub(id); } catch (e) { return null; } };
  const fd = (k) => { try { return fmtDate(new Date(k)); } catch (e) { return String(k).slice(0, 10); } };
  const leagueOf = (c) => state.countries[c.countryKey].leagues[clubLeagueKey(c)];
  const logo = (c) => { try { return clubLogoSvg(c); } catch (e) { return ""; } };

  function rankOf(c) { const lg = leagueOf(c); const s = getLeagueStandings(c.countryKey, clubLeagueKey(c)); return { lg, s, rank: s.findIndex((x) => x.id === c.id) + 1 }; }

  function fixtures(c) {
    const out = [];
    leagueOf(c).fixtures.forEach((r, i) => r.matches.forEach((m) => { if (m.home === c.id || m.away === c.id) out.push({ date: r.date, round: i + 1, m, comp: leagueOf(c).name }); }));
    try {
      const cups = state.cups || {};
      const add = (cup) => cup && cup.rounds && cup.rounds.forEach((r, i) => r.matches.forEach((m) => { if (m.home === c.id || m.away === c.id) out.push({ date: m.date || r.date, round: i + 1, m, comp: cup.label || "Coupe" }); }));
      add(cups.national && cups.national[c.countryKey]); add(cups.continental);
    } catch (e) {}
    try {
      const e = state.euro; if (e && e.comps) Object.keys(e.comps).forEach((k) => { const cp = e.comps[k]; (cp.matches || []).concat(cp.ko || []).forEach((m) => { if (m.home === c.id || m.away === c.id) out.push({ date: m.date, round: "", m, comp: EUL[k] || k.toUpperCase() }); }); });
    } catch (e) {}
    return out.filter((f) => f.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  function resultOf(c, f) {
    const m = f.m; if (!m.played && m.homeGoals == null) return null;
    const home = m.home === c.id, gf = home ? m.homeGoals : m.awayGoals, ga = home ? m.awayGoals : m.homeGoals;
    if (gf == null) return null;
    return { gf, ga, r: gf > ga ? "V" : gf < ga ? "D" : "N" };
  }
  const nameOf = (id) => { const x = clubById(id); if (x) return x.name; try { const g = state.euro && Object.values(state.euro.ghosts || {}).flat().find((q) => q.id === id); if (g) return g.name; } catch (e) {} return "—"; };

  function head(c) {
    const { lg, rank } = rankOf(c);
    return `<div class="cs-head"><div class="cs-logo">${logo(c)}</div><div><h2>${esc(c.name)}</h2>
      <p class="hint">${esc(c.city || "")} · ${esc(lg.name)} · ${rank}ᵉ au classement</p></div>
      <button type="button" class="cs-x" data-csx aria-label="Fermer">✕</button></div>
      <div class="cs-tabs">${[["apercu", "Aperçu"], ["cal", "Calendrier"], ["squad", "Effectif"], ["comp", "Compétitions"]].map(([k, l]) => `<button type="button" class="tab-chip ${tab === k ? "active" : ""}" data-cst="${k}">${l}</button>`).join("")}</div>`;
  }
  function pApercu(c) {
    const { lg, s, rank } = rankOf(c); const me = s.find((x) => x.id === c.id) || c;
    const fx = fixtures(c), done = fx.filter((f) => resultOf(c, f)).slice(-5), next = fx.filter((f) => !resultOf(c, f))[0];
    const form = done.map((f) => { const r = resultOf(c, f); return `<span class="cs-f cs-${r.r}">${r.r}</span>`; }).join("");
    const rep = c.reputation || 0, stars = Math.max(1, Math.min(5, Math.round(rep / 20)));
    const top = c.players.filter((p) => p.seasonStats && p.seasonStats.goals).sort((a, b) => b.seasonStats.goals - a.seasonStats.goals)[0];
    return `<div class="cs-grid">
      <div class="dossier"><h3 class="panel-subtitle">Le club</h3><p class="hint">Réputation : ${"★".repeat(stars)}${"☆".repeat(5 - stars)}<br>Stade : ${esc(c.stadiumName || c.stadium || "—")}${c.stadiumCapacity ? " (" + Number(c.stadiumCapacity).toLocaleString("fr-FR") + " places)" : ""}<br>Effectif : ${c.players.length} joueurs<br>${c.id === (state.userClubIds || [])[0] ? "Votre club." : ""}</p></div>
      <div class="dossier"><h3 class="panel-subtitle">Saison</h3><p class="hint">${rank}ᵉ · ${me.points || 0} pts · ${me.won || 0}V ${me.draw || 0}N ${me.lost || 0}D · ${me.gf || 0}-${me.ga || 0}</p><p>${form || '<span class="hint">Aucun match joué</span>'}</p>
        ${top ? `<p class="hint">Meilleur buteur : ${esc(top.firstName + " " + top.lastName)} (${top.seasonStats.goals})</p>` : ""}</div>
      <div class="dossier"><h3 class="panel-subtitle">Palmarès</h3>${(() => { const g = {}; (c.trophies || []).forEach((t) => { g[t.competition] = (g[t.competition] || 0) + 1; }); const e = Object.entries(g).sort((x, y) => y[1] - x[1]); return e.length ? `<p class="hint">${e.slice(0, 6).map(([k, n]) => `🏆 ${n}× ${esc(k)}`).join("<br>")}</p>` : '<p class="hint">Aucun titre enregistré depuis le début de la partie.</p>'; })()}</div>
      <div class="dossier"><h3 class="panel-subtitle">Prochain match</h3>${next ? `<p>${fd(next.date)} · ${esc(next.comp)}<br><b>${esc(nameOf(next.m.home))} – ${esc(nameOf(next.m.away))}</b></p>` : '<p class="hint">Aucun match programmé.</p>'}</div></div>`;
  }
  function pCal(c) {
    const fx = fixtures(c);
    return `<div class="table-wrap"><table class="fm-table"><thead><tr><th>Date</th><th>Compétition</th><th>Domicile</th><th></th><th>Extérieur</th><th></th></tr></thead><tbody>
      ${fx.map((f) => { const r = resultOf(c, f); const sc = r ? `${f.m.homeGoals} – ${f.m.awayGoals}` : "—"; return `<tr><td>${fd(f.date)}</td><td>${esc(f.comp)}${f.round ? " · J" + f.round : ""}</td><td class="${f.m.home === c.id ? "me" : ""}">${esc(nameOf(f.m.home))}</td><td>${sc}</td><td class="${f.m.away === c.id ? "me" : ""}">${esc(nameOf(f.m.away))}</td><td>${r ? `<span class="cs-f cs-${r.r}">${r.r}</span>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="6" class="hint">Calendrier non disponible.</td></tr>`}</tbody></table></div>`;
  }
  function pSquad(c) {
    // volontairement SANS niveau, potentiel ni valeur : on ne voit que l'identité et le temps de jeu
    const groups = ["GB", "DEF", "MIL", "ATT"].map((k) => [k, c.players.filter((p) => p.position === k).sort((a, b) => (b.seasonStats ? b.seasonStats.matches : 0) - (a.seasonStats ? a.seasonStats.matches : 0))]);
    return `<p class="hint">Comme dans la vraie vie, vous ne voyez pas le niveau des joueurs d'un autre club : utilisez vos recruteurs pour les évaluer.</p>
      ${groups.map(([k, a]) => `<h3 class="panel-subtitle">${POS[k]} <span class="count-tag">${a.length}</span></h3><div class="table-wrap"><table class="fm-table"><thead><tr><th>Joueur</th><th>Âge</th><th>Nationalité</th><th>Matchs</th><th>Buts</th><th>Passes</th></tr></thead><tbody>
        ${a.map((p) => `<tr><td>${esc(p.firstName + " " + p.lastName)}</td><td>${p.age}</td><td>${esc(p.nationality || "")}</td><td>${(p.seasonStats && p.seasonStats.matches) || 0}</td><td>${(p.seasonStats && p.seasonStats.goals) || 0}</td><td>${(p.seasonStats && p.seasonStats.assists) || 0}</td></tr>`).join("")}</tbody></table></div>`).join("")}`;
  }
  function pComp(c) {
    const { lg, s, rank } = rankOf(c);
    const rows = [`<tr><td>${esc(lg.name)}</td><td>${rank}ᵉ / ${s.length}</td></tr>`];
    try { (allCupStatusesFor(c) || []).forEach((x) => rows.push(`<tr><td>${esc(x.label)}</td><td>${x.state === "champion" ? "🏆 vainqueur" : x.state === "eliminated" ? "éliminé" : x.state === "scheduled" ? "match programmé" : "en lice"}</td></tr>`)); } catch (e) {}
    try {
      const e = state.euro; if (e && e.comps) Object.keys(e.comps).forEach((k) => { const cp = e.comps[k]; if (cp.teams && cp.teams.includes(c.id)) rows.push(`<tr><td>${esc(EUL[k] || k.toUpperCase())}</td><td>${esc({ lp: "phase de championnat", out: "éliminé", ko: "phases finales" }[cp.stage[c.id]] || cp.stage[c.id] || "qualifié")}</td></tr>`); });
    } catch (e) {}
    const mini = s.map((x, i) => `<tr class="${x.id === c.id ? "me" : ""}"><td>${i + 1}</td><td>${esc(x.name)}</td><td>${x.played || 0}</td><td>${x.points || 0}</td></tr>`).join("");
    return `<h3 class="panel-subtitle">Engagements</h3><div class="table-wrap"><table class="fm-table"><thead><tr><th>Compétition</th><th>Situation</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
      <h3 class="panel-subtitle">Classement</h3><div class="table-wrap"><table class="fm-table"><thead><tr><th>#</th><th>Club</th><th>J</th><th>Pts</th></tr></thead><tbody>${mini}</tbody></table></div>`;
  }
  function draw() {
    const root = document.getElementById("cs-root"); if (!root || !cur) return;
    const c = cur, body = { apercu: pApercu, cal: pCal, squad: pSquad, comp: pComp }[tab](c);
    root.innerHTML = `<div class="cs-back" data-csx="1"><div class="cs-modal" role="dialog" aria-modal="true" aria-label="Fiche du club">${head(c)}<div class="cs-body">${body}</div></div></div>`;
  }
  function open(id, t) {
    const c = clubById(id); if (!c) return;
    cur = c; tab = t || "apercu";
    let root = document.getElementById("cs-root");
    if (!root) { root = document.createElement("div"); root.id = "cs-root"; document.body.appendChild(root); }
    draw();
  }
  function close() { const r = document.getElementById("cs-root"); if (r) r.innerHTML = ""; cur = null; }

  document.addEventListener("click", (e) => {
    const x = e.target.closest && e.target.closest("[data-csx]");
    if (x && (x.matches("button") || e.target === x)) { close(); return; }
    const t = e.target.closest && e.target.closest("[data-cst]");
    if (t) { tab = t.dataset.cst; draw(); const b = document.querySelector("#cs-root .cs-modal"); if (b) b.scrollTop = 0; return; }
    const i = e.target.closest && e.target.closest("[data-clubsheet]");
    if (i) { e.preventDefault(); e.stopPropagation(); open(parseInt(i.dataset.clubsheet, 10)); }
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  // Lignes de classement cliquables : on repère le club par son nom
  function linkRows() {
    if (typeof state === "undefined" || !state || !state.countries) return;
    const map = {}; try { allClubs().forEach((c) => { map[c.name] = c.id; }); } catch (e) { return; }
    document.querySelectorAll("#app table tbody tr:not([data-clubsheet])").forEach((tr) => {
      const nm = (x) => { const k = x.cloneNode(true); k.querySelectorAll("svg,img").forEach((e) => e.remove()); return k.textContent.replace(/\s+/g, " ").trim(); };
      const td = [...tr.cells].find((x) => x.querySelector("svg,img") && map[nm(x)] != null);
      if (td) { tr.dataset.clubsheet = map[nm(td)]; tr.classList.add("cs-row"); tr.title = "Fiche du club"; }
    });
  }
  const origRender = window.render;
  if (typeof origRender === "function") window.render = function () { const r = origRender.apply(this, arguments); try { linkRows(); } catch (e) {} return r; };
  window.dsClubSheet = { open, close, linkRows };
})();
