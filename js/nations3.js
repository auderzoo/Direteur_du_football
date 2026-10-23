// ===================================================================
// BLOC 21 (3/4) — SÉLECTIONNEUR : interface (accueil, sélection, tactique, calendrier,
// compétitions, adversaire, classement, fédération), « Continuer », rapport de match
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.dsNT) return;
  const I = window.__ntInternal, D = window.dsNationsData, T = window.dsNT;
  const { N, active, myKey, myNat, rating, eligible, mySquad, esc, cl, todayKey, hasState, myClub } = I;
  const nat = D.nat;
  const fd = (k) => fmtDate(new Date(k));
  const isNT = () => hasState() && state.nt && state.nt.nat && typeof ui !== "undefined" && ui.screen === "dashboard";
  const TABS = [["home", "Accueil"], ["squad", "Sélection"], ["tactics", "Tactique"], ["calendar", "Calendrier"], ["comps", "Compétitions"], ["opp", "Adversaire"], ["rank", "Classement"], ["fed", "Fédération"]];
  const POS = { GB: "Gardien", DEF: "Défenseur", MIL: "Milieu", ATT: "Attaquant" };
  const STYLES = { equilibre: "Équilibré", possession: "Possession", contre: "Contre-attaque", direct: "Jeu direct" };
  const flag = (k) => `<span class="nt-flag" title="${esc(D.nName(k))}">${nat(k) ? nat(k).flag : ""}</span>`;
  const chipN = (k, strong) => `<span class="nt-nat${strong ? " me" : ""}" style="border-left-color:${nat(k) ? nat(k).c1 : "#888"}">${flag(k)} ${esc(D.nName(k))}</span>`;
  const rankOf = (k) => D.ORDER.slice().sort((a, b) => rating(b) - rating(a)).indexOf(k) + 1;
  const stars = (r) => { const s = Math.round(cl(r, 0, 100) / 20 * 2) / 2; return "★".repeat(Math.floor(s)) + (s % 1 ? "½" : "") + "☆".repeat(5 - Math.ceil(s)); };
  const diffLabel = (r) => (r >= 84 ? ["Très difficile", "Favori au titre, attentes énormes"] : r >= 72 ? ["Difficile", "Candidat aux quarts"] : r >= 58 ? ["Moyen", "Outsider, qualification possible"] : r >= 40 ? ["Facile", "Belle marge de progression"] : ["Mission impossible", "Petite nation : chaque point compte"]);

  // ---------------------------------------------------------------
  // Sélecteur de nations (réutilisé par la création de partie)
  // ---------------------------------------------------------------
  function pickerHTML(sel, q, conf) {
    const list = D.playable().filter((n) => (!conf || n.conf === conf) && (!q || (n.label + " " + n.conf).toLowerCase().includes(q.toLowerCase())));
    const cf = ["", "UEFA", "CAF", "AFC", "CONMEBOL", "CONCACAF", "OFC"];
    return `<div class="nt-picker"><div class="nt-pk-tools"><input type="search" id="ntpk-q" placeholder="🔎 Rechercher un pays" value="${esc(q || "")}" autocomplete="off"/>
      <div class="nt-pk-conf">${cf.map((c) => `<button type="button" class="tab-chip ${((conf || "") === c) ? "active" : ""}" data-ntpk-conf="${c}">${c || "Tous"}</button>`).join("")}</div></div>
      <div class="nt-pk-grid">${list.sort((a, b) => b.base - a.base).map((n) => { const dl = diffLabel(n.base); return `<button type="button" class="nt-card ${sel === n.key ? "selected" : ""}" data-ntpick="${n.key}" style="border-top-color:${n.c1}">
        <span class="nt-card-flag">${n.flag}</span><span class="nt-card-name">${esc(n.label)}</span><span class="nt-card-meta">${n.conf} · ${stars(n.base)}</span><span class="nt-card-diff">${dl[0]}</span></button>`; }).join("") || `<p class="hint">Aucun pays ne correspond.</p>`}</div></div>`;
  }

  // ---------------------------------------------------------------
  // Rendu principal
  // ---------------------------------------------------------------
  function nextUserMatch() { const S = N(), me = myKey(); return S.matches.filter((m) => !m.played && (m.home === me || m.away === me)).sort((a, b) => a.date.localeCompare(b.date))[0] || null; }
  function topBar() {
    const S = N(), k = myKey(), n = nat(k), nm = nextUserMatch(), w = T.nextWindow(todayKey());
    const conf = Math.round(S.conf);
    const nxt = nm ? `Prochain match : ${fd(nm.date)}` : w ? `Prochaine trêve : ${fd(w.start)}` : "";
    return `<header class="nt-top"><div class="nt-id"><span class="nt-crest" style="background:${n.c1};color:${n.c2}">${n.flag}</span><div><div class="nt-name">${esc(n.label)}</div><div class="nt-sub">Sélectionneur ${esc(state.ds.name)} · ${rankOf(k)}ᵉ mondial</div></div></div>
      <div class="nt-date"><b>${esc(fmtDate(state.date))}</b><small>${esc(nxt)}</small></div>
      <div class="nt-conf" title="Confiance de la fédération"><span>Confiance fédération</span><div class="nt-meter"><i style="width:${conf}%;background:${conf < 30 ? "#c0392b" : conf < 55 ? "#e0a64a" : "#2f8f4e"}"></i></div><b>${conf}</b></div>
      <div class="nt-cont"><button class="btn btn-primary" data-nt="cont:event" id="nt-cont">Continuer ▶</button>
        <span class="nt-adv"><button class="btn btn-ghost btn-small" data-nt="cont:day">+1 jour</button><button class="btn btn-ghost btn-small" data-nt="cont:week">+1 semaine</button><button class="btn btn-ghost btn-small" data-nt="cont:match">Prochain match</button><button class="btn btn-ghost btn-small" data-nt="menu">Menu</button></span></div></header>`;
  }
  function renderNT() {
    const S = N();
    if (S.fired) return renderFired();
    const tab = ui.ntTab || "home";
    app.innerHTML = `<div class="nt-root">${topBar()}
      <nav class="nt-tabs" role="tablist">${TABS.map(([k, l]) => `<button class="nt-tab ${tab === k ? "on" : ""}" role="tab" data-nt="tab:${k}">${l}</button>`).join("")}</nav>
      <section class="dossier main-panel nt-body" id="nt-content">${bodyFor(tab)}</section>
      <div class="nt-bottom"><button class="btn btn-primary" data-nt="cont:event">Continuer ▶</button></div>
      <div id="match-modal"></div><div id="player-modal"></div></div>`;
    afterRender();
  }
  function bodyFor(tab) {
    try {
      if (tab === "squad") return squadTab();
      if (tab === "tactics") return tacticsTab();
      if (tab === "calendar") return calendarTab();
      if (tab === "comps") return compsTab();
      if (tab === "opp") return oppTab();
      if (tab === "rank") return rankTab();
      if (tab === "fed") return fedTab();
      return homeTab();
    } catch (e) { console.error(e); return `<p class="result-bad">Erreur d'affichage : ${esc(e.message)}</p>`; }
  }
  function afterRender() {
    const S = N();
    try {
      const pv = window.dsPrematch && window.dsPrematch.viewer && window.dsPrematch.viewer();
      const busy = pv || document.querySelector("#pm-root .pm-back");
      if (S.report != null && !busy) showReport(S.report);
    } catch (e) { console.warn(e); }
  }

  // ---------------------------------------------------------------
  // Accueil
  // ---------------------------------------------------------------
  const resChip = (r) => `<span class="nt-res ${r.res3}">${r.res3}</span>`;
  function matchCard(m, big) {
    const me = myKey(), homeMine = m.home === me, opp = homeMine ? m.away : m.home;
    const a = rating(me), b = rating(opp), e = 1 / (1 + Math.pow(10, -(a - b) / 22));
    const fav = e > 0.62 ? "Vous êtes favori" : e < 0.38 ? "Vous êtes outsider" : "Match équilibré";
    return `<div class="nt-match ${big ? "big" : ""}"><div class="nt-mc-lab">${esc(T.matchLabel(m))}</div>
      <div class="nt-mc-vs">${chipN(m.home, m.home === me)} <b>vs</b> ${chipN(m.away, m.away === me)}</div>
      <div class="nt-mc-meta">${esc(fd(m.date))} · ${m.neutral ? "terrain neutre" : homeMine ? "à domicile" : "à l'extérieur"} · ${fav}</div></div>`;
  }
  function homeTab() {
    const S = N(), me = myKey(), nm = nextUserMatch();
    const sq = mySquad(), hurt = sq.filter((p) => p.injuredUntil && p.injuredUntil >= todayKey()).length;
    const xi = sq.slice().sort((a, b) => b.overall - a.overall).slice(0, 11);
    const avg = xi.length ? Math.round(xi.reduce((s, p) => s + p.overall, 0) / xi.length) : 0;
    const w = T.nextWindow(todayKey());
    const recent = (S.reports || []).slice(0, 5);
    return `<div class="nt-grid">
      <div class="panel"><h3 class="panel-subtitle">Prochain match</h3>${nm ? matchCard(nm, true) : `<p class="hint">Aucun match programmé. Appuyez sur Continuer.</p>`}
        ${w ? `<p class="hint">🗓️ ${esc(w.label)} : du ${esc(fd(w.start))} au ${esc(fd(w.end))}.</p>` : ""}</div>
      <div class="panel"><h3 class="panel-subtitle">Objectif de la fédération</h3><p><b>${esc(S.obj ? S.obj.text : "—")}</b></p><p class="hint">Classement mondial : ${rankOf(me)}ᵉ · niveau de la sélection : ${avg} (moyenne des 11 meilleurs convoqués).</p>
        <p class="hint">Convoqués : ${sq.length}/26 ${hurt ? `· <span class="result-bad">${hurt} blessé(s)</span>` : ""}</p></div>
      <div class="panel"><h3 class="panel-subtitle">Derniers résultats</h3>${recent.length ? recent.map((r) => `<div class="nt-row">${resChip(r)} <span>${esc(r.home)} <b>${r.hg}-${r.ag}</b> ${esc(r.away)}${r.pen ? ` <small>(t.a.b. ${r.pen[0]}-${r.pen[1]})</small>` : ""}</span><small>${esc(r.label)}</small></div>`).join("") : `<p class="hint">Aucun match joué pour l'instant.</p>`}</div>
      <div class="panel"><h3 class="panel-subtitle">Actualité</h3>${(S.news || []).slice(0, 8).map((n) => `<div class="nt-row"><b>${esc(n.date)}</b><span>${esc(n.text)}</span></div>`).join("") || `<p class="hint">Rien à signaler.</p>`}</div></div>`;
  }

  // ---------------------------------------------------------------
  // Sélection (convocations)
  // ---------------------------------------------------------------
  const sqf = () => (ui.ntSq = ui.ntSq || { pos: "", q: "", only: false });
  function playerState(p) {
    if (p.injuredUntil && p.injuredUntil >= todayKey()) return ["Blessé", "bad"];
    if (p.suspendedMatches > 0) return ["Suspendu", "bad"];
    if ((p.fatigue || 0) >= 55) return ["Fatigué", "mid"];
    return ["Apte", "ok"];
  }
  function clubName(p) { try { const c = getClub(p.clubId); return c ? c.name : "—"; } catch (e) { return "—"; } }
  function squadRows() {
    const S = N(), f = sqf(); const set = new Set(S.squad);
    let list = eligible(myKey());
    if (f.pos) list = list.filter((p) => p.position === f.pos);
    if (f.only) list = list.filter((p) => set.has(p.id));
    if (f.q) { const q = f.q.toLowerCase(); list = list.filter((p) => (p.firstName + " " + p.lastName + " " + clubName(p)).toLowerCase().includes(q)); }
    list.sort((a, b) => (set.has(b.id) - set.has(a.id)) || b.overall - a.overall);
    const more = Math.max(0, list.length - 100); list = list.slice(0, 100);
    const rows = list.map((p) => {
      const st = playerState(p), on = set.has(p.id);
      return `<tr class="${on ? "nt-on" : ""}"><td class="ct-title"><a href="#" data-nt="player:${p.id}">${esc(p.firstName + " " + p.lastName)}</a>${S.captain === p.id ? ` <span title="Capitaine">©</span>` : ""}</td>
        <td data-label="Poste">${p.position}</td><td data-label="Âge">${p.age}</td><td data-label="Niveau"><b>${p.overall}</b> <small>/${p.potential}</small></td><td data-label="Club">${esc(clubName(p))}</td>
        <td data-label="Sél. / buts">${p.internationalCaps || 0} / ${p.intlGoals || 0}</td><td data-label="État"><span class="nt-st ${st[1]}">${st[0]}</span></td>
        <td><button class="btn btn-small ${on ? "btn-ghost" : "btn-primary"}" data-nt="call:${p.id}:${on ? 0 : 1}">${on ? "Retirer" : "Convoquer"}</button></td></tr>`;
    }).join("");
    return { rows, more, total: eligible(myKey()).length };
  }
  function squadTab() {
    const S = N(), f = sqf(); const sq = mySquad();
    const cnt = { GB: 0, DEF: 0, MIL: 0, ATT: 0 }; sq.forEach((p) => cnt[p.position]++);
    const r = squadRows();
    return `<h3 class="panel-subtitle">Sélection — ${S.squad.length}/26 convoqués</h3>
      <p class="hint">GB ${cnt.GB} · DEF ${cnt.DEF} · MIL ${cnt.MIL} · ATT ${cnt.ATT}. Les convoqués quittent leur club pendant la trêve (fatigue et blessures possibles). ${r.total} joueurs éligibles dans le monde simulé.</p>
      <div class="nt-tools"><select data-ntset="pos"><option value="">Tous postes</option>${Object.keys(POS).map((p) => `<option value="${p}" ${f.pos === p ? "selected" : ""}>${POS[p]}</option>`).join("")}</select>
        <input type="search" id="nt-q" placeholder="🔎 Nom ou club" value="${esc(f.q)}" autocomplete="off"/>
        <label class="chk"><input type="checkbox" data-ntset="only" ${f.only ? "checked" : ""}> Convoqués seulement</label>
        <button class="btn btn-small btn-primary" data-nt="auto">⚙️ Convocation automatique</button><button class="btn btn-small btn-ghost" data-nt="clear">Tout retirer</button></div>
      <div class="table-scroll"><table class="squad-table cards-tbl"><thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Niveau</th><th>Club</th><th>Sél./buts</th><th>État</th><th></th></tr></thead><tbody id="nt-sq-body">${r.rows}</tbody></table></div>
      ${r.more ? `<p class="hint">… et ${r.more} autres joueurs (utilisez les filtres).</p>` : ""}`;
  }
  function refreshSquadBody() { const b = document.getElementById("nt-sq-body"); if (b) b.innerHTML = squadRows().rows; }

  // ---------------------------------------------------------------
  // Tactique
  // ---------------------------------------------------------------
  function pitchSvg(xi) {
    const by = { GB: [], DEF: [], MIL: [], ATT: [] }; xi.forEach((p) => by[p.position].push(p));
    const xs = { GB: 8, DEF: 28, MIL: 52, ATT: 80 };
    let dots = "";
    Object.keys(by).forEach((k) => by[k].forEach((p, i) => { const n = by[k].length; const y = k === "GB" ? 34 : (i + 1) * 68 / (n + 1);
      dots += `<g><circle cx="${xs[k]}" cy="${y.toFixed(1)}" r="3.6" fill="${nat(myKey()).c1}" stroke="#fff" stroke-width=".4"/><text x="${xs[k]}" y="${(y + 1.1).toFixed(1)}" text-anchor="middle" font-size="3" font-weight="700" fill="${nat(myKey()).c2}" font-family="sans-serif">${p.overall}</text><text x="${xs[k]}" y="${(y + 7).toFixed(1)}" text-anchor="middle" font-size="2.6" fill="#fff" font-family="sans-serif">${esc(p.lastName.slice(0, 11))}</text></g>`; }));
    return `<svg class="nt-pitch" viewBox="0 0 105 68" role="img" aria-label="Composition"><rect width="105" height="68" fill="#3f7d3a"/><g fill="none" stroke="#e9f3e2" stroke-width=".4" opacity=".85"><rect x=".5" y=".5" width="104" height="67"/><line x1="52.5" y1=".5" x2="52.5" y2="67.5"/><circle cx="52.5" cy="34" r="9.15"/><rect x=".5" y="13.8" width="16.5" height="40.3"/><rect x="88" y="13.8" width="16.5" height="40.3"/></g>${dots}</svg>`;
  }
  function tacticsTab() {
    const S = N(), club = myClub(), dk = todayKey();
    const xi = buildLineup(club, dk);
    const set = new Set(S.xi || []);
    const sq = mySquad().sort((a, b) => ["GB", "DEF", "MIL", "ATT"].indexOf(a.position) - ["GB", "DEF", "MIL", "ATT"].indexOf(b.position) || b.overall - a.overall);
    return `<h3 class="panel-subtitle">Tactique</h3>
      <div class="nt-tools"><label>Formation <select data-ntset="formation">${FORMATIONS.map((f) => `<option ${f === S.tactics.formation ? "selected" : ""}>${f}</option>`).join("")}</select></label>
        <label>Mentalité <select data-ntset="mentality">${MENTALITIES.map((f) => `<option ${f === S.tactics.mentality ? "selected" : ""}>${f}</option>`).join("")}</select></label>
        <label>Style <select data-ntset="style">${Object.keys(STYLES).map((f) => `<option value="${f}" ${f === S.style ? "selected" : ""}>${STYLES[f]}</option>`).join("")}</select></label>
        <label>Capitaine <select data-ntset="captain"><option value="">—</option>${sq.map((p) => `<option value="${p.id}" ${S.captain === p.id ? "selected" : ""}>${esc(p.lastName)}</option>`).join("")}</select></label></div>
      ${pitchSvg(xi)}
      <p class="hint">${set.size ? `Composition manuelle : ${set.size}/11 titulaires choisis ${set.size === 11 ? "(valide si 1 gardien)" : "(incomplète : la composition automatique s'applique)"}.` : "Composition automatique : les meilleurs joueurs aptes à chaque poste."} <button class="btn btn-small btn-ghost" data-nt="xi-auto">Revenir à l'automatique</button></p>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>Titulaire</th><th>Joueur</th><th>Poste</th><th>Niveau</th><th>Forme</th><th>Fatigue</th><th>État</th></tr></thead><tbody>${sq.map((p) => { const st = playerState(p); return `<tr><td><input type="checkbox" data-ntxi="${p.id}" ${set.has(p.id) ? "checked" : ""} aria-label="Titulaire"></td><td><a href="#" data-nt="player:${p.id}">${esc(p.firstName + " " + p.lastName)}</a></td><td>${p.position}</td><td>${p.overall}</td><td>${p.form > 0 ? "+" : ""}${p.form || 0}</td><td>${Math.round(p.fatigue || 0)}%</td><td><span class="nt-st ${st[1]}">${st[0]}</span></td></tr>`; }).join("") || `<tr><td colspan="7" class="hint">Aucun joueur convoqué.</td></tr>`}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------
  // Calendrier
  // ---------------------------------------------------------------
  function calendarTab() {
    const S = N(), me = myKey();
    const mine = S.matches.filter((m) => m.home === me || m.away === me).sort((a, b) => a.date.localeCompare(b.date));
    const up = mine.filter((m) => !m.played).slice(0, 18), done = mine.filter((m) => m.played).slice(-12).reverse();
    const row = (m) => `<tr><td>${esc(fd(m.date))}</td><td>${esc(T.matchLabel(m))}</td><td>${chipN(m.home, m.home === me)} – ${chipN(m.away, m.away === me)}</td><td>${m.played ? `<b>${m.hg}-${m.ag}</b>${m.pen ? ` <small>(tab ${m.pen[0]}-${m.pen[1]})</small>` : ""}` : `<span class="hint">${rating(m.home === me ? m.away : m.home) > rating(me) + 6 ? "outsider" : rating(m.home === me ? m.away : m.home) < rating(me) - 6 ? "favori" : "équilibré"}</span>`}</td></tr>`;
    const ws = T.allWindows().filter((w) => w.end >= todayKey()).slice(0, 4);
    return `<h3 class="panel-subtitle">À venir</h3><div class="table-scroll"><table class="squad-table"><thead><tr><th>Date</th><th>Compétition</th><th>Match</th><th></th></tr></thead><tbody>${up.map(row).join("") || `<tr><td colspan="4" class="hint">Rien de programmé pour l'instant (le calendrier se complète au fil des saisons).</td></tr>`}</tbody></table></div>
      <h3 class="panel-subtitle">Trêves internationales</h3><p class="hint">${ws.map((w) => `${esc(w.label)} : ${esc(fd(w.start))} → ${esc(fd(w.end))}`).join("<br>")}</p>
      <h3 class="panel-subtitle">Derniers matchs</h3><div class="table-scroll"><table class="squad-table"><tbody>${done.map(row).join("") || `<tr><td class="hint">Aucun match joué.</td></tr>`}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------
  // Compétitions
  // ---------------------------------------------------------------
  function relevantComps() {
    const S = N(), conf = myNat().conf;
    return S.comps.filter((c) => c.kind === "wc" || c.kind === "cont" || c.conf === conf).sort((a, b) => (b.year - a.year) || (a.done - b.done) || a.id - b.id);
  }
  function groupTable(c, gi, me) {
    const t = T.table(c, gi);
    const sizeQual = c.kind === "wc" ? 2 : c.kind === "cont" ? 2 : 1;
    return `<div class="nt-grp"><h4>${esc(c.groups[gi].name)}</h4><table class="squad-table nt-gt"><thead><tr><th>#</th><th>Équipe</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>Pts</th></tr></thead><tbody>${t.map((r, i) => `<tr class="${r.k === me ? "nt-me" : ""} ${i < sizeQual ? "nt-q" : ""}"><td>${i + 1}</td><td>${chipN(r.k, r.k === me)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`).join("")}</tbody></table></div>`;
  }
  function compsTab() {
    const S = N(), me = myKey(); const list = relevantComps();
    if (!list.length) return `<p class="hint">Aucune compétition pour l'instant.</p>`;
    const cur = list.find((c) => c.id === ui.ntComp) || list.find((c) => !c.done) || list[0];
    const mine = cur.groups.findIndex((g) => g.teams.includes(me));
    const ms = S.matches.filter((m) => m.comp === cur.id);
    const ko = ms.filter((m) => m.stage[0] === "K");
    const stages = Array.from(new Set(ko.map((m) => m.stage)));
    const mg = ms.filter((m) => m.stage === "G" && m.g === mine).sort((a, b) => a.date.localeCompare(b.date));
    const sel = `<select data-ntset="comp">${list.map((c) => `<option value="${c.id}" ${c.id === cur.id ? "selected" : ""}>${esc(c.label)}${c.done ? " ✔" : ""}</option>`).join("")}</select>`;
    const us = cur.done ? T.userStage(cur) : null;
    return `<h3 class="panel-subtitle">Compétitions</h3><div class="nt-tools">${sel}</div>
      <p class="hint">${cur.done ? `Terminée${cur.champion ? ` — vainqueur : ${esc(D.nName(cur.champion))}` : ""}${us ? ` · votre parcours : ${esc(us.text)}` : ""}.` : (cur.userOut ? "Votre sélection n'est pas dans cette compétition." : "En cours.")} ${cur.kind === "wc" ? "48 équipes · 12 groupes · les 2 premiers et les 8 meilleurs 3ᵉ se qualifient." : cur.kind === "cont" ? "Phase finale à 16 (ou 8) équipes." : ""}</p>
      ${mine >= 0 ? `<h4 class="nt-h4">Votre groupe</h4>${groupTable(cur, mine, me)}<div class="table-scroll"><table class="squad-table"><tbody>${mg.map((m) => `<tr><td>${esc(fd(m.date))}</td><td>${chipN(m.home, m.home === me)}</td><td><b>${m.played ? m.hg + "-" + m.ag : "–"}</b></td><td>${chipN(m.away, m.away === me)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${stages.map((s) => `<h4 class="nt-h4">${esc(T.stageLabel(parseInt(s.slice(1), 10)))}</h4><div class="table-scroll"><table class="squad-table"><tbody>${ko.filter((m) => m.stage === s).map((m) => `<tr><td>${esc(fd(m.date))}</td><td>${chipN(m.home, m.home === me)}</td><td><b>${m.played ? m.hg + "-" + m.ag : "–"}</b>${m.pen ? ` <small>tab ${m.pen[0]}-${m.pen[1]}</small>` : ""}</td><td>${chipN(m.away, m.away === me)}</td></tr>`).join("")}</tbody></table></div>`).join("")}
      <details class="nx" ${mine < 0 ? "open" : ""}><summary>Tous les groupes (${cur.groups.length})</summary><div class="nt-grps">${cur.groups.map((g, gi) => groupTable(cur, gi, me)).join("")}</div></details>`;
  }

  // ---------------------------------------------------------------
  // Adversaire
  // ---------------------------------------------------------------
  function oppTab() {
    const S = N(), me = myKey(), nm = nextUserMatch();
    if (!nm) return `<p class="hint">Aucun adversaire connu pour l'instant.</p>`;
    const ok = nm.home === me ? nm.away : nm.home; const n = nat(ok);
    const t = I.team(ok); const xi = t.players.slice().sort((a, b) => b.overall - a.overall);
    const best = xi.slice(0, 11), avg = Math.round(best.reduce((s, p) => s + p.overall, 0) / 11);
    const past = S.matches.filter((m) => m.played && ((m.home === ok) || (m.away === ok))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const h2h = S.matches.filter((m) => m.played && ((m.home === ok && m.away === me) || (m.home === me && m.away === ok)));
    return `<h3 class="panel-subtitle">Rapport sur ${flag(ok)} ${esc(n.label)}</h3>${matchCard(nm, false)}
      <div class="nt-grid"><div class="panel"><h4>Profil</h4><p>Classement mondial : <b>${rankOf(ok)}ᵉ</b> (vous : ${rankOf(me)}ᵉ)<br>Style : <b>${esc(STYLES[t.style] || t.style)}</b> · formation <b>${esc(t.formation)}</b><br>Niveau des 11 : <b>${avg}</b> ${stars(rating(ok))}</p>
        <p class="hint">${avg > xiAvg() + 3 ? "Équipe supérieure sur le papier : prudence." : avg < xiAvg() - 3 ? "Vous êtes supérieur : imposez votre jeu." : "Rapport de force équilibré."}</p></div>
        <div class="panel"><h4>Joueurs à surveiller</h4>${best.slice(0, 5).map((p) => `<div class="nt-row"><span>${esc(p.firstName + " " + p.lastName)}</span><small>${p.position} · ${p.overall}</small></div>`).join("")}</div>
        <div class="panel"><h4>Forme récente</h4>${past.map((m) => `<div class="nt-row"><span>${esc(D.nName(m.home))} <b>${m.hg}-${m.ag}</b> ${esc(D.nName(m.away))}</span><small>${esc(fd(m.date))}</small></div>`).join("") || `<p class="hint">Pas de match récent connu.</p>`}</div>
        <div class="panel"><h4>Confrontations directes</h4>${h2h.map((m) => `<div class="nt-row"><span>${esc(D.nName(m.home))} <b>${m.hg}-${m.ag}</b> ${esc(D.nName(m.away))}</span><small>${esc(fd(m.date))}</small></div>`).join("") || `<p class="hint">Aucun précédent dans cette partie.</p>`}</div></div>`;
  }
  const xiAvg = () => { const x = mySquad().sort((a, b) => b.overall - a.overall).slice(0, 11); return x.length ? x.reduce((s, p) => s + p.overall, 0) / x.length : 50; };

  // ---------------------------------------------------------------
  // Classement mondial
  // ---------------------------------------------------------------
  function rankTab() {
    const me = myKey(); const all = D.ORDER.slice().sort((a, b) => rating(b) - rating(a));
    const top = all.slice(0, 60); const myPos = all.indexOf(me) + 1;
    return `<h3 class="panel-subtitle">Classement mondial des sélections</h3><p class="hint">Points de force (échelle maison, mis à jour après chaque match). Votre rang : ${myPos}ᵉ.</p>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>#</th><th>Nation</th><th>Confédération</th><th>Force</th></tr></thead><tbody>${top.map((k, i) => `<tr class="${k === me ? "nt-me" : ""}"><td>${i + 1}</td><td>${chipN(k, k === me)}</td><td>${nat(k).conf}</td><td><b>${rating(k).toFixed(1)}</b></td></tr>`).join("")}${myPos > 60 ? `<tr class="nt-me"><td>${myPos}</td><td>${chipN(me, true)}</td><td>${nat(me).conf}</td><td><b>${rating(me).toFixed(1)}</b></td></tr>` : ""}</tbody></table></div>`;
  }

  // ---------------------------------------------------------------
  // Fédération
  // ---------------------------------------------------------------
  function fedTab() {
    const S = N(); const ch = state.ds.character || {};
    return `<h3 class="panel-subtitle">Fédération</h3>
      <div class="nt-grid"><div class="panel"><h4>Confiance</h4><div class="nt-meter big"><i style="width:${Math.round(S.conf)}%"></i></div><p class="hint">Elle monte avec les victoires et les qualifications, baisse avec les contre-performances. Sous 5, la fédération vous limoge.</p>
        <p><b>Objectif :</b> ${esc(S.obj ? S.obj.text : "—")}</p></div>
      <div class="panel"><h4>Palmarès</h4>${(S.honors || []).map((h) => `<div class="nt-row">🏆 <span>${esc(h.comp)}</span></div>`).join("") || `<p class="hint">Aucun titre pour l'instant.</p>`}
        <h4>Parcours</h4>${(S.history || []).slice(0, 10).map((h) => `<div class="nt-row"><span>${esc(h.comp)}</span><small class="${h.ok ? "result-good" : "result-bad"}">${esc(h.result)}</small></div>`).join("") || `<p class="hint">Aucune compétition terminée.</p>`}</div>
      <div class="panel"><h4>Votre profil</h4><p>${esc(state.ds.name)} · ${esc(ch.nationalite || "")} ${ch.bornCountry ? `(né en ${esc(ch.bornCountry)})` : ""}</p><p class="hint">${esc(ch.summary || "")}</p>
        <button class="btn btn-small btn-ghost" data-nt="resign">Démissionner et choisir une autre sélection</button></div>
      <div class="panel"><h4>Actualité</h4>${(S.news || []).slice(0, 20).map((n) => `<div class="nt-row"><b>${esc(n.date)}</b><span>${esc(n.text)}</span></div>`).join("")}</div></div>`;
  }

  // ---------------------------------------------------------------
  // Fiche joueur (légère)
  // ---------------------------------------------------------------
  const ATTR = { vitesse: "Vitesse", acceleration: "Accélération", tir: "Tir", passe: "Passe", dribble: "Dribble", tacle: "Tacle", placement: "Placement", physique: "Physique", endurance: "Endurance", puissance: "Puissance", jeuDeTete: "Jeu de tête", technique: "Technique", vision: "Vision", decision: "Décision", concentration: "Concentration", leadership: "Leadership", agressivite: "Agressivité", sangFroid: "Sang-froid", reflexes: "Réflexes", relance: "Relance" };
  function playerSheet(id) {
    const p = getPlayer(id); if (!p) return;
    const st = playerState(p), S = N();
    const at = p.attributes || {};
    const el = document.getElementById("player-modal"); if (!el) return;
    el.innerHTML = `<div class="modal-backdrop" data-nt="pclose"><div class="modal dossier nt-pmodal" role="dialog"><button class="btn btn-small btn-ghost nt-x" data-nt="pclose">✕</button>
      <h3>${esc(p.firstName + " " + p.lastName)}</h3><p class="hint">${POS[p.position]} · ${p.age} ans · ${esc(p.nationality)} · ${esc(clubName(p))}</p>
      <div class="nt-pstats"><div><b>${p.overall}</b><small>Niveau</small></div><div><b>${p.potential}</b><small>Potentiel</small></div><div><b>${p.internationalCaps || 0}</b><small>Sélections</small></div><div><b>${p.intlGoals || 0}</b><small>Buts</small></div><div><span class="nt-st ${st[1]}">${st[0]}</span><small>État</small></div></div>
      <div class="nt-attrs">${Object.keys(ATTR).map((k) => `<div class="nt-at"><span>${ATTR[k]}</span><i style="width:${(at[k] || 0) * 5}%"></i><b>${at[k] || "–"}</b></div>`).join("")}</div>
      <p class="hint">Forme ${p.form > 0 ? "+" : ""}${p.form || 0} · moral ${Math.round(p.morale || 0)} · fatigue ${Math.round(p.fatigue || 0)}% ${p.injuredUntil && p.injuredUntil >= todayKey() ? `· blessé jusqu'au ${esc(fd(p.injuredUntil))}` : ""}</p>
      <div class="nt-tools"><button class="btn btn-small ${S.squad.includes(p.id) ? "btn-ghost" : "btn-primary"}" data-nt="call:${p.id}:${S.squad.includes(p.id) ? 0 : 1}:close">${S.squad.includes(p.id) ? "Retirer de la sélection" : "Convoquer"}</button></div></div></div>`;
  }

  // ---------------------------------------------------------------
  // Rapport de match
  // ---------------------------------------------------------------
  function showReport(mid) {
    const S = N(); const r = (S.reports || []).find((x) => x.id === mid); if (!r) { S.report = null; return; }
    const el = document.getElementById("match-modal"); if (!el) return;
    const keyOf = (l) => { const n = D.natByLabel(l); return n ? n.key : null; };
    const hk = keyOf(r.home), ak = keyOf(r.away), s = r.stats;
    const row = (l, a, b) => `<tr><td>${a}</td><td>${l}</td><td>${b}</td></tr>`;
    const sc = (arr) => arr.map((g) => `<div>⚽ ${esc(g.name)} <small>${g.minute}'${g.assist ? " · passe " + esc(g.assist) : ""}</small></div>`).join("") || `<div class="hint">—</div>`;
    const cards = (arr) => (arr || []).filter((c) => c.type !== "suspension").map((c) => `<div>${c.type === "red" ? "🟥" : "🟨"} ${esc(c.name)} <small>${c.minute ? c.minute + "'" : ""}</small></div>`).join("");
    const lu = (arr) => arr.map((l) => `<div class="nt-lu"><span>${l.position}</span><span>${esc(l.name)}${r.motm === l.name ? " ⭐" : ""}</span><b>${l.rating != null ? Number(l.rating).toFixed(1) : ""}</b></div>`).join("");
    const verdict = r.res3 === "V" ? "Victoire" : r.res3 === "N" ? "Match nul" : "Défaite";
    let comm = "";
    try { if (window.dsCommentary) comm = window.dsCommentary.htmlFromReport(r); } catch (e) { console.warn(e); }
    el.innerHTML = `<div class="modal-backdrop"><div class="modal dossier nt-report" role="dialog" aria-label="Compte rendu"><div class="nt-rp-head"><small>${esc(r.label)} · ${esc(r.date)}</small>
      <div class="nt-rp-score">${hk ? flag(hk) : ""} <b>${esc(r.home)}</b> <span class="nt-rp-sc">${r.hg} – ${r.ag}</span> <b>${esc(r.away)}</b> ${ak ? flag(ak) : ""}</div>
      <div class="nt-rp-v ${r.res3}">${verdict}${r.pen ? ` — vainqueur aux tirs au but (${r.pen[0]}-${r.pen[1]})` : r.et ? " (après prolongation)" : ""}</div></div>
      <div class="nt-rp-cols"><div>${sc(r.homeScorers)}${cards(r.homeCards)}</div><div>${sc(r.awayScorers)}${cards(r.awayCards)}</div></div>
      ${s ? `<table class="pmv-st nt-rp-st">${row("Possession", s.home.possession + "%", s.away.possession + "%")}${row("Tirs (cadrés)", s.home.shots + " (" + s.home.onTarget + ")", s.away.shots + " (" + s.away.onTarget + ")")}${row("xG", s.home.xg, s.away.xg)}${row("Corners", s.home.corners, s.away.corners)}${row("Fautes", s.home.fouls, s.away.fouls)}</table>` : ""}
      ${comm}
      <details class="nx"><summary>Notes des joueurs</summary><div class="nt-rp-cols"><div><b>${esc(r.home)}</b>${lu(r.homeLineup)}</div><div><b>${esc(r.away)}</b>${lu(r.awayLineup)}</div></div></details>
      ${r.motm ? `<p class="hint">Homme du match : <b>${esc(r.motm)}</b></p>` : ""}
      <div class="nt-actions"><button class="btn btn-primary" data-nt="report-ok">Continuer</button></div></div></div>`;
  }

  // ---------------------------------------------------------------
  // Mise au chômage technique : limogeage et choix d'une nouvelle sélection
  // ---------------------------------------------------------------
  function renderFired() {
    ui.ntPick = ui.ntPick || { q: "", conf: "" };
    app.innerHTML = `<div class="nt-root"><div class="dossier main-panel nt-body"><h2 class="section-title">Vous avez été limogé</h2><p>La fédération met fin à vos fonctions. Votre réputation vous suit : choisissez une nouvelle sélection pour rebondir.</p>
      ${pickerHTML(null, ui.ntPick.q, ui.ntPick.conf)}<div class="nt-actions"><button class="btn btn-ghost" data-nt="menu">Retour au menu</button></div></div></div>`;
  }

  // ---------------------------------------------------------------
  // Continuer
  // ---------------------------------------------------------------
  const overlayOpen = () => !!document.querySelector(".modal-backdrop, #pm-root .pm-back, #pm-root .pm-viewer");
  function ntContinue(mode) {
    const S = N(); if (!S || S.fired || !hasState()) return;
    if (overlayOpen()) return;
    mode = mode || "event";
    const max = mode === "day" ? 1 : mode === "week" ? 7 : 120;
    let days = 0, reason = "";
    for (let i = 0; i < max; i++) {
      const um = T.userMatchOn(T.addDays(todayKey(), 1));
      if (um && window.dsPrematch && window.dsPrematch.enabled() && window.dsPrematch.openPre) {
        try { saveGame(); } catch (e) {}
        render(); window.dsPrematch.openPre(T.buildPreMatch(um)); return;
      }
      const startNews = (S.news || []).length;
      advanceDay(); days++;
      if (state.seasonComplete) { try { triggerNextSeason(); } catch (e) { console.warn("saison", e); state.seasonComplete = false; } }
      if (S.fired) { reason = "Limogé"; break; }
      if (S.report != null) { reason = "Match joué"; break; }
      if (mode === "day") break;
      if (mode === "match" && !nextUserMatch()) { reason = "Aucun match programmé"; break; }
      const w = T.allWindows().find((x) => x.start === todayKey());
      if (w && mode === "event") { reason = "Convocations : " + w.label; break; }
      if ((S.news || []).length > startNews && mode === "event" && /Tirage au sort|Fédération|éliminatoires|qualification/i.test(S.news[0].text)) { reason = "Information de la fédération"; break; }
    }
    try { saveGame(); } catch (e) {}
    render();
    try { window.dsToast && window.dsToast(`${days} jour${days > 1 ? "s" : ""}${reason ? " · " + reason : ""}`); } catch (e) {}
  }
  const origCont = window.dsContinue;
  window.dsContinue = function (mode) {
    if (isNT()) return ntContinue(mode);
    return origCont ? origCont.apply(this, arguments) : undefined;
  };
  const origRender = window.render;
  window.render = function () {
    if (isNT()) { try { return renderNT(); } catch (e) { console.error(e); app.innerHTML = `<div class="dossier"><p class="result-bad">Erreur : ${esc(e.message)}</p><button class="btn" onclick="ui.screen='menu';render()">Menu</button></div>`; return; } }
    return origRender.apply(this, arguments);
  };

  // ---------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const pk = e.target.closest && e.target.closest("[data-ntpick]");
    if (pk && hasState() && state.nt && state.nt.fired) { T.startNT(pk.dataset.ntpick); try { saveGame(); } catch (x) {} render(); return; }
    const kc = e.target.closest && e.target.closest("[data-ntpk-conf]");
    if (kc && hasState() && state.nt && state.nt.fired) { ui.ntPick.conf = kc.dataset.ntpkConf; render(); return; }
    const b = e.target.closest && e.target.closest("[data-nt]"); if (!b || !hasState() || !state.nt) return;
    const a = b.dataset.nt.split(":");
    if (a[0] === "pclose") { if (e.target === b || b.classList.contains("nt-x")) { const pm = document.getElementById("player-modal"); if (pm) pm.innerHTML = ""; } return; }
    e.preventDefault();
    const S = N();
    if (a[0] === "tab") { ui.ntTab = a[1]; render(); window.scrollTo(0, 0); }
    else if (a[0] === "cont") window.dsContinue(a[1]);
    else if (a[0] === "menu") { try { saveGame(); } catch (x) {} ui.screen = "menu"; render(); }
    else if (a[0] === "player") playerSheet(parseInt(a[1], 10));
    else if (a[0] === "call") {
      const ok = T.setCalled(parseInt(a[1], 10), a[2] === "1");
      if (!ok && a[2] === "1") { try { window.dsToast && window.dsToast("Effectif complet (26 maximum)"); } catch (x) {} }
      if (a[3] === "close") { const pm = document.getElementById("player-modal"); if (pm) pm.innerHTML = ""; }
      if ((ui.ntTab || "home") === "squad") render(); else refreshSquadBody();
    }
    else if (a[0] === "auto") { S.squad = []; S.xi = []; T.autoFill(); render(); }
    else if (a[0] === "clear") { S.squad.slice().forEach((id) => T.setCalled(id, false)); S.xi = []; render(); }
    else if (a[0] === "xi-auto") { S.xi = []; render(); }
    else if (a[0] === "report-ok") { S.report = null; const m = document.getElementById("match-modal"); if (m) m.innerHTML = ""; try { saveGame(); } catch (x) {} render(); }
    else if (a[0] === "resign") { if (confirm("Démissionner de votre poste de sélectionneur ?")) { S.fired = true; render(); } }
  });
  document.addEventListener("change", (e) => {
    if (!isNT()) return;
    const x = e.target; const S = N();
    if (x.dataset && x.dataset.ntset) {
      const k = x.dataset.ntset;
      if (k === "pos") { sqf().pos = x.value; refreshSquadBody(); }
      else if (k === "only") { sqf().only = x.checked; refreshSquadBody(); }
      else if (k === "formation") { T.setTactics(x.value, null); S.xi = []; render(); }
      else if (k === "mentality") { T.setTactics(null, x.value); render(); }
      else if (k === "style") { S.style = x.value; render(); }
      else if (k === "captain") { S.captain = x.value ? parseInt(x.value, 10) : null; render(); }
      else if (k === "comp") { ui.ntComp = parseInt(x.value, 10); render(); }
    } else if (x.dataset && x.dataset.ntxi) {
      const id = parseInt(x.dataset.ntxi, 10); S.xi = S.xi || [];
      if (x.checked) { if (S.xi.length >= 11) { x.checked = false; try { window.dsToast && window.dsToast("11 titulaires maximum"); } catch (e2) {} return; } S.xi.push(id); } else S.xi = S.xi.filter((v) => v !== id);
      render();
    }
  });
  let qT = null;
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "nt-q" && isNT()) { sqf().q = e.target.value; clearTimeout(qT); qT = setTimeout(refreshSquadBody, 150); }
    if (e.target && e.target.id === "ntpk-q" && hasState() && state.nt && state.nt.fired) { ui.ntPick.q = e.target.value; clearTimeout(qT); qT = setTimeout(() => { render(); const i = document.getElementById("ntpk-q"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200); }
  });

  // correction du pré-match : tactique de la sélection
  window.dsNTSetTactics = (f, m) => { T.setTactics(f, m); };
  window.dsNationsUI = { pickerHTML, diffLabel, stars, renderNT, showReport, ntContinue, playerSheet };
})();
