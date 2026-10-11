/* ============================================================
   FM-UI.JS — Rendus « façon Football Manager »
   - fmMatchHTML      : résumé de match (feuilles + stats + terrain)
   - fmPlayerTopHTML  : en-tête et attributs de la fiche joueur
   - fmSquadTableHTML : tableau de l'effectif
   Chargé avant app.js (voir index.html).
   ============================================================ */

function fmEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function fmRtClass(v) {
  if (v == null) return "rt-na";
  return v >= 8 ? "rt-top" : v >= 7 ? "rt-good" : v >= 6 ? "rt-mid" : v >= 5 ? "rt-low" : "rt-bad";
}
function fmPosClass(pos) { return { GB: "pos-gb", DEF: "pos-def", MIL: "pos-mil", ATT: "pos-att" }[pos] || "pos-mil"; }
const FM_POS_LABEL = { GB: "Gardien", DEF: "Défenseur", MIL: "Milieu", ATT: "Attaquant" };

// ---------------- Mini terrain avec les titulaires ----------------
function fmPitchSVG(lineup, color) {
  const rows = { ATT: [], MIL: [], DEF: [], GB: [] };
  (lineup || []).forEach(p => (rows[p.position] || rows.MIL).push(p));
  const ys = { ATT: 26, MIL: 58, DEF: 92, GB: 120 };
  let dots = "";
  Object.keys(rows).forEach(k => {
    const n = rows[k].length;
    rows[k].forEach((p, i) => {
      const x = (i + 1) * 100 / (n + 1), y = ys[k];
      const last = fmEsc((p.name || "").split(" ").slice(-1)[0].slice(0, 9));
      const rt = p.rating != null ? p.rating.toFixed(1) : "–";
      dots += `<circle cx="${x}" cy="${y}" r="6.2" fill="${color}" stroke="#fff" stroke-width="0.6"/>
        <text x="${x}" y="${y + 1.6}" text-anchor="middle" font-size="4.6" font-weight="700" fill="#fff">${rt}</text>
        <text x="${x}" y="${y + 11}" text-anchor="middle" font-size="4.6" fill="#e6e6ee">${last}</text>`;
    });
  });
  return `<svg class="fm-pitch" viewBox="0 0 100 134" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="98" height="132" rx="2" fill="#1f3d2b" stroke="#4d7a5d" stroke-width="0.8"/>
    <path d="M1 1 H99" stroke="#4d7a5d" stroke-width="0.8"/>
    <path d="M38 1 A12 12 0 0 0 62 1" fill="none" stroke="#4d7a5d" stroke-width="0.6"/>
    <rect x="25" y="104" width="50" height="29" fill="none" stroke="#4d7a5d" stroke-width="0.6"/>
    <rect x="38" y="120" width="24" height="13" fill="none" stroke="#4d7a5d" stroke-width="0.6"/>
    ${dots}
  </svg>`;
}

// Terrain avec la zone du poste mise en évidence (fiche joueur)
function fmPosPitch(pos) {
  const zones = { ATT: [2, 24], MIL: [4, 54], DEF: [4, 88], GB: [1, 118] };
  let dots = "";
  Object.keys(zones).forEach(k => {
    const [n, y] = zones[k];
    for (let i = 0; i < n; i++) {
      const x = (i + 1) * 100 / (n + 1);
      dots += `<circle cx="${x}" cy="${y}" r="${k === pos ? 6 : 4}" fill="${k === pos ? "#e99a2c" : "#4a4a5e"}" ${k === pos ? 'stroke="#fff" stroke-width="0.8"' : ""}/>`;
    }
  });
  return `<svg class="fm-pitch fm-pitch-sm" viewBox="0 0 100 134" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="98" height="132" rx="2" fill="#16161d" stroke="#5a5a70" stroke-width="0.8"/>
    <rect x="25" y="104" width="50" height="29" fill="none" stroke="#5a5a70" stroke-width="0.6"/>
    <path d="M38 1 A12 12 0 0 0 62 1" fill="none" stroke="#5a5a70" stroke-width="0.6"/>${dots}</svg>`;
}

// ---------------- Résumé de match ----------------
function fmFallbackStats(r) {
  const mk = (g, og) => ({ possession: 50, shots: g * 3 + 6, onTarget: g + 3, offTarget: 3, blocked: 1, xg: Math.round((g * 0.8 + 0.4) * 100) / 100, corners: 4, fouls: 11, offsides: 2, passes: 380, passAcc: 80, yellow: 0, red: 0 });
  return { home: mk(r.homeGoals, r.awayGoals), away: mk(r.awayGoals, r.homeGoals) };
}

function fmMatchHTML(r) {
  const clubs = allClubs();
  const homeClub = clubs.find(c => c.name === r.homeName), awayClub = clubs.find(c => c.name === r.awayName);
  const s = r.stats || fmFallbackStats(r);
  const won = r.isHome ? r.homeGoals > r.awayGoals : r.awayGoals > r.homeGoals;
  const lost = r.isHome ? r.homeGoals < r.awayGoals : r.awayGoals < r.homeGoals;
  const verdictCls = won ? "good" : lost ? "bad" : "mid";
  const sortG = a => (a || []).slice().sort((x, y) => x.minute - y.minute);

  function lineupCol(name, club, lineup, subs, bench, scorers, cards, mine) {
    const goalsBy = {}, assistsBy = {};
    (scorers || []).forEach(g => { goalsBy[g.name] = (goalsBy[g.name] || 0) + 1; if (g.assistName) assistsBy[g.assistName] = (assistsBy[g.assistName] || 0) + 1; });
    const yel = {}, red = {};
    (cards || []).forEach(c => { if (c.type === "red") red[c.name] = 1; else if (c.type === "yellow") yel[c.name] = 1; });
    const subByOut = {}; (subs || []).forEach(x => { subByOut[x.outId] = x; });
    const icons = n => `${goalsBy[n] ? `<span class="fm-ev" title="Buts">${"⚽".repeat(goalsBy[n])}</span>` : ""}${assistsBy[n] ? `<span class="fm-ev" title="Passes décisives">👟</span>` : ""}${yel[n] ? `<span class="fm-card y"></span>` : ""}${red[n] ? `<span class="fm-card r"></span>` : ""}`;
    return `
      <aside class="fm-team ${mine ? "mine" : ""}">
        <div class="fm-team-head">${club ? clubLogoSvg(club) : ""}<span>${fmEsc(name)}</span></div>
        <div class="fm-plist">
          ${(lineup || []).map(pl => {
            const sb = subByOut[pl.id];
            return `<div class="fm-prow ${pl.name === r.motm ? "motm" : ""}">
              <span class="fm-pos ${fmPosClass(pl.position)}">${pl.position}</span>
              <span class="fm-pname">${fmEsc(pl.name)}${icons(pl.name)}${sb ? `<em class="fm-subout" title="Remplacé">⇄ ${sb.minute}'</em>` : ""}</span>
              <span class="fm-rt ${fmRtClass(pl.rating)}">${pl.rating != null ? pl.rating.toFixed(1) : "–"}</span>
            </div>`;
          }).join("")}
          ${(subs || []).length ? `<div class="fm-sep">Remplaçants entrés</div>` : ""}
          ${(subs || []).map(x => {
            const b = (bench || []).find(bb => bb.id === x.inId);
            return `<div class="fm-prow fm-in">
              <span class="fm-pos ${fmPosClass(x.position)}">${x.position}</span>
              <span class="fm-pname">${fmEsc(x.inName)}${icons(x.inName)}<em class="fm-subout">↳ ${x.minute}'</em></span>
              <span class="fm-rt ${fmRtClass(b ? b.rating : null)}">${b && b.rating != null ? b.rating.toFixed(1) : "–"}</span>
            </div>`;
          }).join("")}
        </div>
        ${fmPitchSVG(lineup, mine ? "#c0392b" : "#2f6fd0")}
      </aside>`;
  }

  function statRow(label, h, a, suffix, decimals) {
    const f = v => (decimals ? v.toFixed(decimals) : v) + (suffix || "");
    const tot = (h + a) || 1;
    const zero = (h + a) === 0;
    const hp = zero ? 50 : Math.round(h / tot * 100);
    const hLead = h > a, aLead = a > h;
    return `<div class="fm-stat">
      <span class="fm-sv ${hLead ? "lead" : ""}">${f(h)}</span>
      <div class="fm-smid"><span class="fm-slabel">${label}</span>
        <div class="fm-strack ${zero ? "zero" : ""}"><i class="h" style="width:${hp}%"></i><i class="a" style="width:${100 - hp}%"></i></div></div>
      <span class="fm-sv ${aLead ? "lead" : ""}">${f(a)}</span>
    </div>`;
  }
  const H = s.home, A = s.away;
  const scorerLi = (g, side) => `<li class="${side}">${side === "l" ? "" : "⚽ "}${fmEsc(g.name)} <b>${g.minute}'</b>${g.assistName ? ` <small>(${fmEsc(g.assistName)})</small>` : ""}${side === "l" ? " ⚽" : ""}</li>`;

  return `
    <div class="modal-backdrop fm-backdrop">
      <div class="modal fm-modal fm-dark fm-match">
        <div class="fm-grid">
          ${lineupCol(r.homeName, homeClub, r.homeLineup, r.homeSubs, r.homeBench, r.homeScorers, r.homeCards, r.isHome)}
          <section class="fm-center">
            <div class="fm-comp">Résultat du match</div>
            <div class="fm-score">
              <div class="fm-sname r">${fmEsc(r.homeName)}</div>
              <div class="fm-sbox">${r.homeGoals} <span>-</span> ${r.awayGoals}</div>
              <div class="fm-sname">${fmEsc(r.awayName)}</div>
            </div>
            <div class="fm-verdict ${verdictCls}">${won ? "Victoire !" : lost ? "Défaite" : "Match nul"}</div>
            <div class="fm-scorers">
              <ul>${sortG(r.homeScorers).map(g => scorerLi(g, "l")).join("")}</ul>
              <ul>${sortG(r.awayScorers).map(g => scorerLi(g, "r")).join("")}</ul>
            </div>
            ${r.motm ? `<div class="fm-motm">⭐ Homme du match : <b>${fmEsc(r.motm)}</b></div>` : ""}
            <h4 class="fm-h">Statistiques</h4>
            <div class="fm-stats">
              ${statRow("Possession", H.possession, A.possession, "%")}
              ${statRow("Tirs", H.shots, A.shots)}
              ${statRow("Tirs cadrés", H.onTarget, A.onTarget)}
              ${statRow("Tirs non cadrés", H.offTarget, A.offTarget)}
              ${statRow("Tirs bloqués", H.blocked, A.blocked)}
              ${statRow("Buts attendus (xG)", H.xg, A.xg, "", 2)}
              ${statRow("Corners", H.corners, A.corners)}
              ${statRow("Fautes", H.fouls, A.fouls)}
              ${statRow("Hors-jeu", H.offsides, A.offsides)}
              ${statRow("Passes", H.passes, A.passes)}
              ${statRow("Précision des passes", H.passAcc, A.passAcc, "%")}
              ${statRow("Cartons jaunes", H.yellow, A.yellow)}
              ${statRow("Cartons rouges", H.red, A.red)}
            </div>
            <button class="btn btn-primary fm-continue" id="close-match-modal">Continuer</button>
          </section>
          ${lineupCol(r.awayName, awayClub, r.awayLineup, r.awaySubs, r.awayBench, r.awayScorers, r.awayCards, !r.isHome)}
        </div>
      </div>
    </div>`;
}

// ---------------- Fiche joueur : en-tête + attributs ----------------
const FM_ATTR_GROUPS = [
  [["Technique", ["technique", "passe", "dribble", "tir", "jeuDeTete"]], ["Gardien", ["reflexes", "relance"]]],
  [["Mental", ["vision", "decision", "concentration", "leadership", "sangFroid", "agressivite"]]],
  [["Physique", ["vitesse", "acceleration", "endurance", "puissance", "physique"]], ["Défense", ["tacle", "placement"]]]
];
function fmValClass(v) { return v >= 16 ? "v-top" : v >= 13 ? "v-good" : v >= 10 ? "v-mid" : v >= 7 ? "v-low" : "v-bad"; }

function fmPlayerTopHTML(p, club, own, pk, scouted, sview, exactNums, st) {
  const kit = (club && (club.kitColor || club.logoColor)) || "#2d6cdf";
  const num = p.shirtNumber || ((p.id * 7) % 30) + 1;
  const keys = Object.keys(scouted || {}).filter(k => scouted[k]);
  const ranked = keys.map(k => ({ k, v: scouted[k].value })).sort((a, b) => b.v - a.v);
  const pros = ranked.filter(x => x.v >= 14).slice(0, 3);
  const cons = ranked.slice().reverse().filter(x => x.v <= 9).slice(0, 3);
  const chip = (x, cls) => `<span class="fm-chip ${cls}" title="${fmEsc(attrLabel(x.k))} : ${x.v}/20">${fmEsc(attrLabel(x.k))}</span>`;

  const moral = own ? (p.morale || 60) : null, fat = own ? (p.fatigue || 0) : null;
  const moralTxt = moral == null ? "?" : moral >= 75 ? "Excellent" : moral >= 55 ? "Bon" : moral >= 40 ? "Moyen" : "Mauvais";
  const moralCls = moral == null ? "" : moral >= 55 ? "ok" : moral >= 40 ? "mid" : "bad";
  const cond = fat == null ? null : 100 - fat;
  const bar = (v, cls) => v == null ? `<span class="fm-dim">?</span>` : `<span class="fm-mbar"><i class="${cls}" style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
  const info = (label, val) => `<div class="fm-info"><span>${label}</span><b>${val}</b></div>`;

  const cols = FM_ATTR_GROUPS.map(groups => `
    <div class="fm-acol">
      ${groups.map(([label, ks]) => {
        const rows = ks.filter(k => scouted[k]);
        if (!rows.length) return "";
        return `<div class="fm-ahead">${label}</div>
          ${rows.map(k => `<div class="fm-arow"><span>${fmEsc(attrLabel(k))}</span><span class="fm-v ${fmValClass(scouted[k].value)}">${scouted[k].value}${scouted[k].approx ? "~" : ""}</span></div>`).join("")}`;
      }).join("")}
    </div>`).join("");

  return `
    <div class="fm-ptop">
      <div class="fm-portrait" style="--kit:${kit}">
        <div class="fm-pname-tag">${fmEsc(p.lastName).toUpperCase()}</div>
        <div class="fm-shirt">${num}</div>
        <div class="fm-bust"></div>
      </div>
      <div class="fm-pinfo">
        <div class="fm-pcol">
          ${info("Nationalité", fmEsc(p.nationality))}
          ${info("Âge", `${p.age} ans`)}
          ${info("Poste", `${FM_POS_LABEL[p.position] || p.position}`)}
          ${info("Moral", `<span class="fm-dot ${moralCls}"></span>${moralTxt}${moral != null ? ` (${moral}%)` : ""}`)}
          ${info("Condition physique", bar(cond, cond != null && cond < 50 ? "bad" : "ok"))}
        </div>
        <div class="fm-pcol">
          ${info("Club", club ? fmEsc(club.name) : "Libre")}
          ${info("Contrat", p.contractEndYear ? `jusqu'en ${p.contractEndYear}` : "—")}
          ${info("Salaire", `${fmtMoney(p.wage)}/mois`)}
          ${info("Valeur", `<span class="fm-pill">${fmtMoney(p.value)}</span>`)}
          ${info("Sélections", p.internationalCaps ? p.internationalCaps : "Aucune")}
        </div>
      </div>
      <div class="fm-prating">
        <div class="fm-rrow"><span>Niveau / Potentiel</span><b>${starsPair(sview)}</b></div>
        <div class="fm-rrow"><span>Connaissance</span><b>${knowledgeBadge(pk)}</b></div>
        ${exactNums ? `<div class="fm-rrow"><span>Global</span><b>${p.overall} / ${p.potential}</b></div>` : ""}
        <div class="fm-proscons">
          <div><div class="fm-pc-title">Pour</div>${pros.length ? pros.map(x => chip(x, "good")).join("") : `<span class="fm-dim">—</span>`}</div>
          <div><div class="fm-pc-title">Contre</div>${cons.length ? cons.map(x => chip(x, "bad")).join("") : `<span class="fm-dim">—</span>`}</div>
        </div>
      </div>
    </div>
    <div class="fm-pbody">
      <div class="fm-posbox"><div class="fm-ahead">Poste</div>${fmPosPitch(p.position)}
        <div class="fm-role"><span class="fm-pos ${fmPosClass(p.position)}">${p.position}</span> ${FM_POS_LABEL[p.position] || ""}</div></div>
      <div class="fm-attrs">${cols}</div>
    </div>
    <div class="fm-legend"><span class="fm-v v-top">16+</span> <span class="fm-v v-good">13-15</span> <span class="fm-v v-mid">10-12</span> <span class="fm-v v-low">7-9</span> <span class="fm-v v-bad">≤6</span>${own ? "" : ` <span class="fm-dim">~ = valeur approximative (joueur peu connu)</span>`}</div>`;
}

// ---------------- Effectif ----------------
function fmSquadTableHTML(rows, today) {
  const stat = p => {
    const injured = p.injuredUntil && p.injuredUntil >= today;
    const suspended = p.suspendedMatches > 0;
    if (injured) return { cls: "inj", txt: `Blessé jusqu'au ${fmtDate(new Date(p.injuredUntil))}` };
    if (suspended) return { cls: "sus", txt: `Suspendu (${p.suspendedMatches})` };
    if (p.yellowCards) return { cls: "yel", txt: `${p.yellowCards} jaune(s)` };
    return { cls: "ok", txt: "Disponible" };
  };
  return `
    <div class="table-scroll">
    <table class="fm-table">
      <thead><tr>
        <th></th><th>Poste</th><th>Nom</th><th>Âge</th><th>Nat.</th><th>Niveau</th><th>Potentiel</th><th>Moral</th><th>État</th><th>Salaire</th><th>Valeur</th><th>Listé</th><th></th>
      </tr></thead>
      <tbody>
        ${rows.map(p => {
          const st = stat(p);
          const mor = p.morale !== undefined ? p.morale : 60;
          return `<tr class="${st.cls}">
            <td><span class="fm-state ${st.cls}" title="${fmEsc(st.txt)}"></span></td>
            <td><span class="fm-pos ${fmPosClass(p.position)}">${p.position}</span></td>
            <td class="fm-nm"><button class="fm-namebtn" data-playercard="${p.id}">${fmEsc(p.firstName)} <b>${fmEsc(p.lastName)}</b></button>${p.releaseClause ? " 🔓" : ""}</td>
            <td>${p.age}</td>
            <td class="fm-dim">${fmEsc(p.nationality)}</td>
            <td>${starsHtml(overallStars(p.overall))}</td>
            <td>${starsHtml(overallStars(p.potential))}</td>
            <td><span class="fm-mbar sm"><i class="${mor >= 55 ? "ok" : mor >= 40 ? "mid" : "bad"}" style="width:${mor}%"></i></span></td>
            <td class="fm-st ${st.cls}">${fmEsc(st.txt)}</td>
            <td>${fmtMoney(p.wage)}</td>
            <td><span class="fm-pill">${fmtMoney(p.value)}</span></td>
            <td><button class="toggle-list ${p.listed ? "on" : ""}" data-listtoggle="${p.id}">${p.listed ? "Oui" : "Non"}</button></td>
            <td class="fm-actions">
              <button class="btn btn-small btn-ghost" data-scout="${p.id}">Scouter</button>
              <button class="btn btn-small btn-ghost" data-loanout="${p.id}">Prêter</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    </div>`;
}
