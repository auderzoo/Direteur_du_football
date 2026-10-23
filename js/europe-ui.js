// =====================================================================
// ONGLET « EUROPE » : parcours, phase de ligue, tableau final, coefficients, récompenses
// =====================================================================
(function () {
  "use strict";
  const E = () => window.dsEurope;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mine = (id) => (state.userClubIds || []).includes(id);
  const nm = (id) => esc(E().nameOf(id));
  const cn = (id) => `<span class="${mine(id) ? "eu-mine" : ""}">${nm(id)}</span>`;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const assocLabel = (id) => { const k = (function () { const eu = E().EU(); if (typeof id === "string") { const g = eu.clubs[id]; return g && g.assoc; } const c = getClub(id); return c && ({ france: "france", angleterre: "england", espagne: "spain", italie: "italy", allemagne: "germany", portugal: "portugal", belgique: "belgium", turquie: "turkey", suisse: "switzerland", norvege: "norway", irlande: "ireland", irlandeNord: "nireland", roumanie: "romania", pologne: "poland", suede: "sweden", islande: "iceland" })[c.countryKey]; })(); const a = k && E().A.find((x) => x.key === k); return a ? a.code : "—"; };

  const VIEWS = [["me", "Mon parcours"], ["league", "Phase de ligue"], ["ko", "Tableau final"], ["coef", "Coefficients"], ["awards", "Récompenses"]];

  function compBy(id) { const eu = E().EU(); return eu.comps && eu.comps.find((c) => c.id === id); }
  function selComp() { const id = ui.euComp || "ucl"; return compBy(id) || (E().EU().comps || [])[0]; }
  function compTabs(cur) { return `<div class="fx-subnav">${["ucl", "uel", "uecl"].map((k) => `<button class="fx-subtab ${k === cur ? "on" : ""}" data-eucomp="${k}">${E().COMPS[k].short}</button>`).join("")}</div>`; }

  function stageOf(comp, id) { const eu = E().EU(); return eu.reach[comp.id] && eu.reach[comp.id][id]; }
  function statusText(comp, id) {
    const st = stageOf(comp, id), L = E().STAGE_LABEL;
    if (comp.done) return comp.champion === id ? "🏆 Vainqueur" : st === "final" ? "Finaliste" : `Éliminé (${L[st] || "—"})`;
    if (comp.stage === "league") return "Phase de ligue en cours";
    const r = comp.rounds[comp.rounds.length - 1];
    if (r && r.ties.some((t) => t.a === id || t.b === id)) return `En lice : ${r.label.toLowerCase()}`;
    return `Éliminé (${L[st] || "—"})`;
  }

  // ---------- 1. Mon parcours ----------
  function viewMe() {
    const eu = E().EU(), ids = state.userClubIds || [];
    if (!eu.comps) return `<p class="hint">Aucune coupe d'Europe en cours (elles reprennent à la prochaine saison).</p>`;
    let html = "";
    ids.forEach((uid) => {
      const rows = eu.comps.filter((c) => c.teams.includes(uid));
      html += `<h3 class="panel-subtitle">${nm(uid)}</h3>`;
      if (!rows.length) {
        const a = E().rankedAssocs(), cc = (getClub(uid) || {}).countryKey;
        html += `<p class="hint">Non qualifié pour une coupe d'Europe cette saison. Finissez dans les premières places du championnat (et gagnez la coupe nationale) pour vous qualifier : le nombre de places dépend du coefficient de votre pays — voir l'onglet « Coefficients ».</p>`;
        return;
      }
      rows.forEach((c) => {
        const cfg = E().COMPS[c.id];
        const tb = c.stage === "league" ? E().table(c) : null, rank = c.seed ? c.seed.indexOf(uid) + 1 : tb ? tb.findIndex((r) => r.id === uid) + 1 : 0;
        const mat = [];
        c.fx.filter((f) => f.home === uid || f.away === uid).sort((a, b) => a.md - b.md).forEach((f) => mat.push([`J${f.md + 1}`, f]));
        c.rounds.forEach((r) => r.ties.forEach((t) => { if (t.a === uid || t.b === uid) t.legs.forEach((l, i) => mat.push([r.label + (t.legs.length > 1 ? (i ? " retour" : " aller") : ""), l])); }));
        html += `<div class="eu-card"><div class="eu-cardhead"><b>${cfg.name}</b><span>${esc(statusText(c, uid))}${rank ? ` · ${rank}ᵉ de la phase de ligue` : ""} · pot ${c.pot[uid] + 1}</span></div>
          <div class="table-scroll"><table class="fx-mini"><thead><tr><th>Tour</th><th>Date</th><th>Rencontre</th><th>Score</th></tr></thead><tbody>
          ${mat.map(([l, f]) => `<tr><td>${esc(l)}</td><td>${esc(fmtDate(new Date(f.date)))}</td><td>${cn(f.home)} – ${cn(f.away)}</td><td>${f.played ? `<b>${f.hg}-${f.ag}</b>` : "—"}</td></tr>`).join("")}
          </tbody></table></div></div>`;
      });
    });
    return html || `<p class="hint">Aucun club.</p>`;
  }

  // ---------- 2. Phase de ligue ----------
  function viewLeague() {
    const c = selComp(); if (!c) return `<p class="hint">Aucune édition en cours.</p>`;
    const tb = E().table(c), cfg = E().COMPS[c.id];
    const played = c.fx.filter((f) => f.played).length;
    const maxMd = c.fx.reduce((m, f) => Math.max(m, f.md), 0);
    let md = typeof ui.euMd === "number" ? ui.euMd : (function () { const done = c.fx.filter((f) => f.played).map((f) => f.md); return done.length ? Math.max(...done) : 0; })();
    md = Math.max(0, Math.min(maxMd, md));
    const zone = (i) => (i < 8 ? "eu-q8" : i < 24 ? "eu-po" : "eu-out");
    return `${compTabs(c.id)}
      <p class="hint">${cfg.name} : 36 clubs, ${cfg.nMD} matchs chacun (pas de poules). 1ᵉʳ–8ᵉ : huitièmes · 9ᵉ–24ᵉ : barrages · 25ᵉ–36ᵉ : éliminés. ${played}/${c.fx.length} matchs joués.</p>
      <div class="table-scroll"><table class="fx-mini eu-table"><thead><tr><th>#</th><th>Club</th><th>Pays</th><th>J</th><th>V</th><th>N</th><th>D</th><th>Bp</th><th>Bc</th><th>Diff</th><th>Pts</th></tr></thead><tbody>
      ${tb.map((r, i) => `<tr class="${zone(i)} ${mine(r.id) ? "eu-rowmine" : ""}"><td>${i + 1}</td><td>${nm(r.id)}</td><td>${assocLabel(r.id)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? "+" : ""}${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`).join("")}
      </tbody></table></div>
      <h3 class="panel-subtitle">Journée ${md + 1}</h3>
      <div class="eu-mdnav"><button class="btn btn-small btn-ghost" data-eumd="${md - 1}" ${md <= 0 ? "disabled" : ""}>‹</button><span>Journée ${md + 1} / ${maxMd + 1} · ${esc(fmtDate(new Date(c.dates[md])))}</span><button class="btn btn-small btn-ghost" data-eumd="${md + 1}" ${md >= maxMd ? "disabled" : ""}>›</button></div>
      <div class="table-scroll"><table class="fx-mini"><tbody>
      ${c.fx.filter((f) => f.md === md).map((f) => `<tr class="${mine(f.home) || mine(f.away) ? "eu-rowmine" : ""}"><td style="text-align:right">${nm(f.home)}</td><td style="text-align:center"><b>${f.played ? f.hg + " - " + f.ag : "vs"}</b></td><td>${nm(f.away)}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  // ---------- 3. Tableau final ----------
  function viewKo() {
    const c = selComp(); if (!c) return `<p class="hint">Aucune édition en cours.</p>`;
    const cfg = E().COMPS[c.id];
    let html = compTabs(c.id);
    if (!c.rounds.length) return html + `<p class="hint">La phase à élimination directe commencera après la phase de ligue (fin ${esc(fmtDate(new Date(c.dates[c.dates.length - 1])))}). Barrages : 9ᵉ–24ᵉ ; huitièmes : 1ᵉʳ–8ᵉ + vainqueurs des barrages.</p>`;
    c.rounds.forEach((r) => {
      html += `<h3 class="panel-subtitle">${r.label}</h3><div class="eu-ties">${r.ties.map((t) => {
        const ls = t.legs.map((l) => (l.played ? `${l.hg}-${l.ag}` : esc(fmtDate(new Date(l.date)).slice(0, 6)))).join(" · ");
        const w = t.w;
        return `<div class="eu-tie ${mine(t.a) || mine(t.b) ? "eu-rowmine" : ""}"><div class="${w === t.a ? "eu-win" : ""}">${nm(t.a)}</div><div class="${w === t.b ? "eu-win" : ""}">${nm(t.b)}</div><div class="eu-agg">${ls}${t.agg ? ` · <b>${t.agg[0]}-${t.agg[1]}</b>${t.pen ? " (t.a.b.)" : ""}` : ""}</div></div>`;
      }).join("")}</div>`;
    });
    if (c.done) html += `<p class="eu-champ">🏆 Vainqueur : <b>${nm(c.champion)}</b></p>`;
    return html;
  }

  // ---------- 4. Coefficients ----------
  function viewCoef() {
    const eu = E().EU(), ra = E().rankedAssocs();
    const curPts = {};
    Object.keys(eu.seasonPts).forEach((id) => { const k = isNaN(+id) ? id : +id; const a = assocLabel(k); (curPts[a] = curPts[a] || []).push(eu.seasonPts[id]); });
    const sorted = ra.map((x, i) => ({ ...x, i }));
    const clubs = Object.values(eu.clubs).map((c) => ({ id: c.id, coef: E().clubCoef(c.id), cur: eu.seasonPts[c.id] || 0 })).sort((a, b) => b.coef - a.coef).slice(0, 40);
    // les clubs de vos pays qui n'ont pas encore d'entrée sont créés à la demande
    const yrs = [0, 1, 2, 3, 4].map((k) => `S-${4 - k}`);
    return `<p class="hint">Valeurs de départ arrondies d'après le classement UEFA 2024-25 ; elles évoluent ensuite avec les résultats de vos clubs et des clubs simulés (victoire 2 pts, nul 1 ; bonus par tour et selon la place en phase de ligue ; Conférence : moitié). Le coefficient d'un pays = points de ses clubs ÷ nombre de clubs engagés, sur 5 saisons.</p>
      <h3 class="panel-subtitle">Classement des associations</h3>
      <div class="table-scroll"><table class="fx-mini"><thead><tr><th>#</th><th>Pays</th>${yrs.map((y) => `<th>${y}</th>`).join("")}<th>Total</th><th>Moy. saison</th><th title="Places pour la saison à venir">LDC / UEL / UECL</th></tr></thead><tbody>
      ${sorted.map((x) => {
        const sl = E().slotsFor(x.i + 1, x.a.key), cur = curPts[x.a.code] || [], mean = cur.length ? cur.reduce((s, v) => s + v, 0) / cur.length : 0;
        const mineA = (state.userClubIds || []).some((u) => assocLabel(u) === x.a.code);
        return `<tr class="${mineA ? "eu-rowmine" : ""}"><td>${x.i + 1}</td><td><b>${esc(x.a.label)}</b></td>${eu.assoc[x.a.key].hist.map((v) => `<td>${f2(v)}</td>`).join("")}<td><b>${f2(x.s)}</b></td><td>${f2(mean)}</td><td>${sl.ucl} / ${sl.uel} / ${sl.uecl}</td></tr>`;
      }).join("")}
      </tbody></table></div>
      <p class="hint">Les deux associations avec la meilleure moyenne cette saison gagnent une place de plus en LDC la saison suivante : actuellement ${E().EU().eps.map((k) => esc(E().A.find((a) => a.key === k).label)).join(" et ")}.</p>
      <h3 class="panel-subtitle">Coefficients des clubs (top 40)</h3>
      <div class="table-scroll"><table class="fx-mini"><thead><tr><th>#</th><th>Club</th><th>Pays</th><th>5 ans</th><th>Cette saison</th></tr></thead><tbody>
      ${clubs.map((c, i) => `<tr class="${mine(c.id) ? "eu-rowmine" : ""}"><td>${i + 1}</td><td>${nm(c.id)}</td><td>${assocLabel(c.id)}</td><td>${f1(c.coef)}</td><td>${f2(c.cur)}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  // ---------- 5. Récompenses ----------
  const AW = [["ballon", "Ballon d'or"], ["golden", "Golden Boy"], ["scorer", "Meilleur buteur"], ["assist", "Meilleur passeur"], ["uclscorer", "Buteurs LDC"], ["keeper", "Meilleur gardien"], ["coach", "Entraîneur"], ["history", "Palmarès"]];
  function viewAwards() {
    const eu = E().EU(), cur = ui.euAw || "ballon", lv = E().liveAwards();
    const nav = `<div class="fx-subnav">${AW.map(([k, l]) => `<button class="fx-subtab ${k === cur ? "on" : ""}" data-euaw="${k}">${l}</button>`).join("")}</div>`;
    const who = (c) => `<span class="${c.mine ? "eu-mine" : ""}">${esc(c.name)}</span>`;
    const tbl = (rows, cols, rowf) => `<div class="table-scroll"><table class="fx-mini"><thead><tr><th>#</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td>${rowf(r).map((x) => `<td>${x}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="9">Pas encore de données.</td></tr>`}</tbody></table></div>`;
    let body = "";
    const live = `<p class="hint">Classement en direct de la saison ${state.season.year} — attribué à la fin de la saison (après les finales).</p>`;
    if (cur === "ballon") body = live + tbl(lv.ballon, ["Joueur", "Club", "Poste", "Âge", "Niv.", "Buts", "Passes", "Europe", "Score"], (r) => [who(r.c), esc(r.c.club), r.c.pos, r.c.age, r.c.ovr, r.c.dg + r.c.eg, r.c.da + r.c.ea, `${r.c.eg}b ${r.c.ea}p`, f1(r.s)]);
    else if (cur === "golden") body = live + `<p class="hint">Réservé aux joueurs de 21 ans ou moins.</p>` + tbl(lv.golden, ["Joueur", "Club", "Poste", "Âge", "Niv.", "Pot.", "Buts", "Passes"], (r) => [who(r.c), esc(r.c.club), r.c.pos, r.c.age, r.c.ovr, r.c.pot, r.c.dg + r.c.eg, r.c.da + r.c.ea]);
    else if (cur === "scorer") body = live + `<p class="hint">Buts en championnat + coupes d'Europe (joueurs de vos pays et stars des autres championnats).</p>` + tbl(lv.scorer, ["Joueur", "Club", "Poste", "Championnat", "Europe", "Total"], (r) => [who(r.c), esc(r.c.club), r.c.pos, r.c.dg, r.c.eg, `<b>${r.c.dg + r.c.eg}</b>`]);
    else if (cur === "assist") body = live + tbl(lv.assist, ["Joueur", "Club", "Poste", "Championnat", "Europe", "Total"], (r) => [who(r.c), esc(r.c.club), r.c.pos, r.c.da, r.c.ea, `<b>${r.c.da + r.c.ea}</b>`]);
    else if (cur === "uclscorer") body = `<p class="hint">Meilleurs buteurs de la Ligue des Champions cette saison.</p>` + tbl(lv.uclscorer, ["Joueur", "Club", "Poste", "Buts", "Passes"], (s) => [esc(s.name), esc(s.club), s.pos, `<b>${s.c.ucl[0]}</b>`, s.c.ucl[1]]);
    else if (cur === "keeper") body = live + tbl(lv.keeper, ["Gardien", "Club", "Niv.", "Clean sheets (Europe)"], (r) => [who(r.c), esc(r.c.club), r.c.ovr, eu.cs[r.c.cid] || 0]);
    else if (cur === "coach") body = live + `<p class="hint">Résultats par rapport aux attentes, parcours européen et titres.</p>` + tbl(lv.coach, ["Entraîneur", "Club", "Score"], (r) => [esc(r.name), esc(r.club), f1(r.s)]);
    else body = eu.history.length ? eu.history.map((h) => `<div class="eu-card"><div class="eu-cardhead"><b>Saison ${h.season}</b></div>
        <div class="table-scroll"><table class="fx-mini"><tbody>
        ${h.ballon[0] ? `<tr><td>Ballon d'or</td><td><b>${esc(h.ballon[0].name)}</b> (${esc(h.ballon[0].club)})</td></tr>` : ""}
        ${h.golden[0] ? `<tr><td>Golden Boy</td><td>${esc(h.golden[0].name)} (${esc(h.golden[0].club)})</td></tr>` : ""}
        ${h.scorer[0] ? `<tr><td>Meilleur buteur</td><td>${esc(h.scorer[0].name)} — ${h.scorer[0].dg + h.scorer[0].eg} buts</td></tr>` : ""}
        ${h.assist[0] ? `<tr><td>Meilleur passeur</td><td>${esc(h.assist[0].name)} — ${h.assist[0].da + h.assist[0].ea} passes</td></tr>` : ""}
        ${h.keeper[0] ? `<tr><td>Meilleur gardien</td><td>${esc(h.keeper[0].name)} (${esc(h.keeper[0].club)})</td></tr>` : ""}
        ${h.coach[0] ? `<tr><td>Meilleur entraîneur</td><td>${esc(h.coach[0].name)} (${esc(h.coach[0].club)})</td></tr>` : ""}
        ${h.winners.map((w) => `<tr><td>${esc(E().COMPS[w.id].name)}</td><td>${esc(w.name)}</td></tr>`).join("")}
        ${h.dom.map((d) => `<tr><td>Champion ${esc(d.country)}</td><td>${esc(d.name)}</td></tr>`).join("")}
        </tbody></table></div></div>`).join("") : `<p class="hint">Le palmarès se remplira à la fin de la première saison.</p>`;
    return nav + body;
  }

  window.renderEurope = function () {
    ui.euView = ui.euView || "me";
    let body;
    try { body = ({ me: viewMe, league: viewLeague, ko: viewKo, coef: viewCoef, awards: viewAwards })[ui.euView](); } catch (e) { console.error(e); body = `<p class="hint">Erreur d'affichage.</p>`; }
    const eu = E().EU();
    return `<div class="fm-dark fm-panel eu">
      <h2 class="fm-title">Europe <span>${eu.comps ? "Saison " + state.season.year : "—"}</span></h2>
      ${fxSubNav(VIEWS, ui.euView, "data-euview")}
      ${body}</div>`;
  };

  function refresh() { const c = document.getElementById("tab-content"); if (c && ui.tab === "europe") c.innerHTML = renderEurope(); }
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-euview],[data-eucomp],[data-euaw],[data-eumd]");
    if (!t) return;
    if (t.dataset.euview) ui.euView = t.dataset.euview;
    if (t.dataset.eucomp) { ui.euComp = t.dataset.eucomp; ui.euMd = undefined; }
    if (t.dataset.euaw) ui.euAw = t.dataset.euaw;
    if (t.dataset.eumd !== undefined) ui.euMd = parseInt(t.dataset.eumd, 10);
    refresh();
  });
})();
