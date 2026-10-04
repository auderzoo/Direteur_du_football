/* =====================================================================
   INTERFACE DE RECRUTEMENT : recherche multicritères, réseau de scouts,
   rapports, clubs affiliés, staff technique, événements de joueurs.
   ===================================================================== */

const ALL_ATTR_KEYS = ["vitesse", "acceleration", "tir", "passe", "dribble", "tacle", "placement", "physique", "endurance", "puissance",
  "jeuDeTete", "technique", "vision", "decision", "concentration", "leadership", "agressivite", "sangFroid", "reflexes", "relance"];

function defaultSearch() {
  return { q: "", country: "", tier: "", pos: "", ageMin: "", ageMax: "", levelMin: "", potMin: "", valueMax: "", contractMax: "",
    nationality: "", attrs: [{ key: "", min: 12 }, { key: "", min: 12 }, { key: "", min: 12 }], affiliatesOnly: false,
    listedOnly: false, onLoanOnly: false, unhappyOnly: false, sort: "level" };
}

// ---------- Étoiles façon Football Manager ----------
function starsHtml(value5) {
  const v = clamp(value5 || 0, 0, 5);
  return `<span class="stars" title="${v} / 5"><span class="stars-fill" style="width:${v / 5 * 100}%">★★★★★</span>★★★★★</span>`;
}
// niveau (plein) + fourchette de potentiel (clair) sur une seule rangée
function starsPair(view) {
  const lo = view.exact ? view.levelMid : view.level[0], hi = view.exact ? view.levelMid : view.level[1];
  const cur = view.exact ? view.levelMid : (lo + hi) / 2;
  return `<span class="stars stars-pair" title="Niveau ${lo}–${hi} · Potentiel ${view.potential[0]}–${view.potential[1]}">
    <span class="stars-pot-hi" style="width:${view.potential[1] / 5 * 100}%">★★★★★</span>
    <span class="stars-pot-lo" style="width:${view.potential[0] / 5 * 100}%">★★★★★</span>
    <span class="stars-fill" style="width:${cur / 5 * 100}%">★★★★★</span>★★★★★</span>`;
}
function knowledgeBadge(pk) {
  const cls = pk >= 80 ? "k-high" : pk >= 50 ? "k-mid" : "k-low";
  return `<span class="k-badge ${cls}" title="Connaissance du joueur">${Math.round(pk)}%</span>`;
}

// ---------- Marché / recherche ----------
function renderMarket() {
  const club = userClub();
  ensureScouting(club);
  const f = ui.search = ui.search || defaultSearch();
  const win = currentWindow();
  const rows = searchPlayers(club, {
    q: f.q, country: f.country, tier: f.tier, pos: f.pos, ageMin: parseInt(f.ageMin, 10) || 0, ageMax: parseInt(f.ageMax, 10) || 0,
    levelMin: parseFloat(f.levelMin) || 0, potMin: parseFloat(f.potMin) || 0, valueMax: parseInt(f.valueMax, 10) || 0,
    contractMax: parseInt(f.contractMax, 10) || 0, nationality: f.nationality,
    attrs: f.attrs.map(a => ({ key: a.key, min: parseInt(a.min, 10) || 0 })), affiliatesOnly: f.affiliatesOnly,
    listedOnly: f.listedOnly, onLoanOnly: f.onLoanOnly, unhappyOnly: f.unhappyOnly, sort: f.sort
  });
  const shown = rows.slice(0, 50);
  const sc = club.scouting;
  const tb = getTransferBudget(club);
  const year = new Date(state.date).getFullYear();
  const countryOpts = Object.values(state.countries).map(c => `<option value="${c.key}" ${f.country === c.key ? "selected" : ""}>${c.label}</option>`).join("");
  const maxTier = f.country ? (DIVISION_COUNT[f.country] || 2) : Math.max(...Object.keys(state.countries).map(k => DIVISION_COUNT[k] || 2));
  const tierOpts = Array.from({ length: maxTier }, (_, i) => `<option value="${i + 1}" ${String(f.tier) === String(i + 1) ? "selected" : ""}>${f.country && LEAGUE_NAMES[f.country] ? LEAGUE_NAMES[f.country]["d" + (i + 1)] || "Division " + (i + 1) : "Division " + (i + 1)}</option>`).join("");
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const starOpts = [["", "Indifférent"], ["1", "★ 1+"], ["2", "★★ 2+"], ["3", "★★★ 3+"], ["3.5", "3,5+"], ["4", "★★★★ 4+"], ["4.5", "4,5+"]];
  const attrOpts = a => `<option value="">— critère —</option>` + ALL_ATTR_KEYS.map(k => `<option value="${k}" ${a.key === k ? "selected" : ""}>${attrLabel(k)}</option>`).join("");

  return `
    <h2 class="panel-title">Recrutement — recherche de joueurs</h2>
    ${!win ? `<p class="hint">Le mercato est fermé : vous pouvez chercher et suivre des joueurs, mais aucune offre ne peut être conclue.</p>` : ""}
    <div class="overview-grid" style="margin-bottom:14px;">
      <div class="stat-block"><span class="stat-num">${fmtMoney(tb)}</span><span class="stat-label">Budget de transferts</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(wageBudgetRemaining(club))}</span><span class="stat-label">Marge salariale / mois</span></div>
      <div class="stat-block"><span class="stat-num">${rows.length}</span><span class="stat-label">Joueurs correspondants</span></div>
      <div class="stat-block"><span class="stat-num">${sc.shortlist.length}</span><span class="stat-label">Dans ma liste</span></div>
    </div>
    <p class="hint">Vous ne voyez que les joueurs que votre réseau connaît. Envoyez des recruteurs dans d'autres pays (onglet Scouting) pour élargir votre vision ; la précision de chaque fiche dépend de la connaissance affichée.</p>

    <div class="dossier search-panel">
      <div class="search-grid">
        <label class="field"><span>Nom</span><input type="text" id="s-q" value="${f.q}" placeholder="Nom du joueur" /></label>
        <label class="field"><span>Pays du club</span><select id="s-country"><option value="">Tous</option>${countryOpts}</select></label>
        <label class="field"><span>Division</span><select id="s-tier"><option value="">Toutes</option>${tierOpts}</select></label>
        <label class="field"><span>Poste</span>${sel("s-pos", [["", "Tous"], ["GB", "Gardien"], ["DEF", "Défenseur"], ["MIL", "Milieu"], ["ATT", "Attaquant"]], f.pos)}</label>
        <label class="field"><span>Âge min</span><input type="number" id="s-agemin" value="${f.ageMin}" min="15" max="45" /></label>
        <label class="field"><span>Âge max</span><input type="number" id="s-agemax" value="${f.ageMax}" min="15" max="45" /></label>
        <label class="field"><span>Niveau (étoiles)</span>${sel("s-level", starOpts, f.levelMin)}</label>
        <label class="field"><span>Potentiel (étoiles)</span>${sel("s-pot", starOpts, f.potMin)}</label>
        <label class="field"><span>Valeur max</span>${sel("s-value", [["", "Indifférent"], ["500000", "500 k"], ["1000000", "1 M"], ["3000000", "3 M"], ["10000000", "10 M"], ["30000000", "30 M"], ["100000000", "100 M"]], f.valueMax)}</label>
        <label class="field"><span>Contrat expirant avant fin</span>${sel("s-contract", [["", "Indifférent"], [String(year), String(year)], [String(year + 1), String(year + 1)], [String(year + 2), String(year + 2)]], f.contractMax)}</label>
        <label class="field"><span>Nationalité</span><input type="text" id="s-nat" value="${f.nationality}" placeholder="ex. France" /></label>
        <label class="field"><span>Trier par</span>${sel("s-sort", [["level", "Niveau"], ["potential", "Potentiel"], ["value", "Valeur"], ["age", "Âge (plus jeunes)"]], f.sort)}</label>
      </div>
      <p class="hint" style="margin:6px 0;">Caractéristiques recherchées (échelle 1-20) :</p>
      <div class="search-grid">
        ${f.attrs.map((a, i) => `<div style="display:flex;gap:6px;"><select id="s-attr-${i}" style="flex:1;">${attrOpts(a)}</select><input type="number" id="s-attrmin-${i}" value="${a.min}" min="1" max="20" style="width:64px;" /></div>`).join("")}
      </div>
      <div class="search-flags">
        <label><input type="checkbox" id="s-aff" style="width:auto;" ${f.affiliatesOnly ? "checked" : ""} /> Clubs affiliés / parent uniquement</label>
        <label><input type="checkbox" id="s-listed" style="width:auto;" ${f.listedOnly ? "checked" : ""} /> Sur la liste des transferts</label>
        <label><input type="checkbox" id="s-loan" style="width:auto;" ${f.onLoanOnly ? "checked" : ""} /> Actuellement prêté</label>
        <label><input type="checkbox" id="s-unhappy" style="width:auto;" ${f.unhappyOnly ? "checked" : ""} /> Joueur mécontent (moral &lt; 40 %)</label>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-small" id="s-apply">Rechercher</button>
        <button class="btn btn-ghost btn-small" id="s-reset" style="color:var(--ink);border-color:var(--line);">Réinitialiser</button>
      </div>
    </div>

    <div class="table-scroll"><table class="squad-table">
      <thead><tr><th></th><th>Joueur</th><th>Club</th><th>Poste</th><th>Âge</th><th>Niveau / potentiel</th><th>Connaissance</th><th>Valeur</th><th>Contrat</th><th>Actions</th></tr></thead>
      <tbody>
        ${shown.map(({ p, club: c, pk, view }) => {
          const onList = sc.shortlist.includes(p.id);
          return `
          <tr>
            <td><button class="star-btn ${onList ? "on" : ""}" data-shortlist="${p.id}" title="Ma liste">${onList ? "★" : "☆"}</button></td>
            <td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-playercard="${p.id}">${p.firstName} ${p.lastName}</button>${p.listed ? ` <span class="k-badge k-mid" title="Sur liste des transferts">Listé</span>` : ""}${p.onLoan ? ` <span class="k-badge k-mid">Prêté</span>` : ""}${p.morale !== undefined && p.morale < 40 ? ` <span class="k-badge k-low" title="Joueur mécontent">Mécontent</span>` : ""}</td>
            <td>${c.name}${p.onLoan ? " (prêté)" : ""}${isAffiliated(club, c.id) ? " 🤝" : ""}<div class="hint" style="margin:0;font-size:11px;">${COUNTRIES[c.countryKey].label} · ${divisionLabel(c)}</div></td>
            <td>${p.position}</td>
            <td>${p.age}</td>
            <td>${starsPair(view)}</td>
            <td>${knowledgeBadge(pk)}</td>
            <td>${fmtMoney(p.value)}</td>
            <td>${p.contractEndYear || "—"}</td>
            <td class="actions-cell">
              ${pk < 90 ? `<button class="btn btn-small btn-ghost" data-observe="${p.id}" title="Un recruteur l'observe 3 semaines">Observer</button>` : ""}
              <button class="btn btn-small btn-primary" data-negotiate="${p.id}" ${win ? "" : "disabled"}>Négocier</button>
              ${!p.onLoan ? `<button class="btn btn-small btn-ghost" data-loanin="${p.id}" ${win ? "" : "disabled"}>Emprunter</button>` : ""}
            </td>
          </tr>`;
        }).join("") || `<tr><td colspan="10" class="hint">Aucun joueur ne correspond — élargissez vos critères ou envoyez des recruteurs découvrir de nouveaux pays.</td></tr>`}
      </tbody>
    </table></div>
    ${rows.length > 50 ? `<p class="hint">50 premiers résultats affichés sur ${rows.length} : affinez la recherche.</p>` : ""}
    <p class="hint" id="observe-result"></p>
    <div id="negotiation-modal"></div>
    <div id="scout-modal"></div>
    <div id="loan-modal"></div>
  `;
}

// ---------- Onglet Scouting : réseau par pays, rapports, liste, affiliations ----------
function renderScoutingTab() {
  const club = userClub();
  const sc = ensureScouting(club);
  const scouts = staffByRole(club, "recruteur");
  const countries = Object.values(state.countries);
  const posOpts = cur => [["", "Tous postes"], ["GB", "Gardiens"], ["DEF", "Défenseurs"], ["MIL", "Milieux"], ["ATT", "Attaquants"]].map(([v, l]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${l}</option>`).join("");
  const ageOpts = cur => [["0", "Tous âges"], ["21", "21 ans max"], ["23", "23 ans max"], ["28", "28 ans max"]].map(([v, l]) => `<option value="${v}" ${String(cur || 0) === v ? "selected" : ""}>${l}</option>`).join("");
  const reports = sc.reports.slice(0, 12);
  const short = sc.shortlist.map(id => getPlayer(id)).filter(Boolean);
  const parents = sc.affiliates.filter(a => a.type === "parent"), affs = sc.affiliates.filter(a => a.type === "affilie");
  const candType = ui.affType || "affilie";
  const cands = affiliationCandidates(club, candType).slice(0, 25);

  return `
    <h2 class="panel-title">Scouting — réseau de recruteurs</h2>
    <h3 class="panel-subtitle">Connaissance des pays</h3>
    <div class="dossier">
      ${countries.map(c => {
        const k = Math.round(sc.knowledge[c.key] || 0);
        const workers = scouts.filter(s => sc.assignments[s.id] && sc.assignments[s.id].country === c.key).length;
        return `<div class="wage-bar-wrap"><div class="wage-bar-label">${c.label} — ${k}%${workers ? ` · ${workers} recruteur(s) sur place` : ""}${c.key === club.countryKey ? " · pays d'origine" : ""}</div>
          <div class="wage-bar"><div class="wage-bar-fill ${k >= 60 ? "" : k >= 30 ? "warn" : "danger"}" style="width:${k}%"></div></div></div>`;
      }).join("")}
      <p class="hint" style="margin:6px 0 0;">Plus la connaissance d'un pays est élevée, plus vous voyez de joueurs (jusqu'aux divisions inférieures) et plus leurs fiches sont précises.</p>
    </div>

    <h3 class="panel-subtitle">Mes recruteurs (${scouts.length}/${STAFF_ROLES.recruteur.max})</h3>
    ${scouts.length ? `<div class="staff-grid">${scouts.map(s => {
      const m = sc.assignments[s.id] || {};
      return `<div class="staff-card">
        <div style="display:flex;justify-content:space-between;gap:8px;"><button class="link-danger" style="color:var(--brass-dark);margin:0;font-weight:700;" data-staffcard="${s.id}">${s.firstName} ${s.lastName}</button>${starsHtml(staffStars(s))}</div>
        <p class="hint" style="margin:2px 0 8px;">${s.nationality} · réseau ${s.attributes.reseau}/20 · jugement ${s.attributes.jugementNiveau}/20</p>
        <label class="field" style="margin-bottom:8px;"><span>Mission : pays</span>
          <select data-scoutcountry="${s.id}"><option value="">— En repos —</option>${countries.map(c => `<option value="${c.key}" ${m.country === c.key ? "selected" : ""}>${c.label}</option>`).join("")}</select></label>
        <div style="display:flex;gap:6px;">
          <select data-scoutpos="${s.id}" style="flex:1;">${posOpts(m.position || "")}</select>
          <select data-scoutage="${s.id}" style="flex:1;">${ageOpts(m.maxAge)}</select>
        </div></div>`;
    }).join("")}</div>` : `<p class="hint">Aucun recruteur dans votre staff. Engagez-en depuis l'onglet Staff.</p>`}

    <h3 class="panel-subtitle">Rapports de scouting</h3>
    ${reports.length ? `<div class="offer-list">${reports.map(r => {
      const p = getPlayer(r.playerId), c = getClub(r.clubId);
      if (!p) return "";
      const cls = r.verdict === "Recruter" ? "high" : r.verdict === "À suivre" ? "medium" : "low";
      return `<div class="offer-row priority-${cls}"><div>
        <span class="priority-chip priority-chip-${cls}">${r.verdict}</span> <strong>${p.firstName} ${p.lastName}</strong> <span class="hint">· ${c ? c.name : "?"} · ${r.date} · ${r.scoutName}</span>
        <div class="hint" style="margin:4px 0 0;">${r.text}</div></div>
        <div class="offer-actions"><button class="btn btn-small btn-ghost" data-playercard="${p.id}">Fiche</button></div></div>`;
    }).join("")}</div>` : `<p class="hint">Pas encore de rapport : assignez un recruteur à un pays et laissez le temps passer.</p>`}

    <h3 class="panel-subtitle">Ma liste de joueurs suivis</h3>
    ${short.length ? `<table class="squad-table"><thead><tr><th>Joueur</th><th>Club</th><th>Poste</th><th>Âge</th><th>Niveau / potentiel</th><th>Valeur</th><th></th></tr></thead><tbody>
      ${short.map(p => { const c = getClub(p.clubId); const pk = knowledgeOfPlayerForUser(p); return `<tr>
        <td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-playercard="${p.id}">${p.firstName} ${p.lastName}</button></td>
        <td>${c ? c.name : "?"}</td><td>${p.position}</td><td>${p.age}</td><td>${starsPair(playerStarView(p, pk))}</td><td>${fmtMoney(p.value)}</td>
        <td><button class="btn btn-small btn-ghost" data-shortlist="${p.id}">Retirer</button></td></tr>`; }).join("")}
    </tbody></table>` : `<p class="hint">Utilisez l'étoile ☆ dans la recherche pour suivre un joueur.</p>`}

    <h3 class="panel-subtitle">Clubs affiliés et club parent</h3>
    <div class="dossier">
      <p class="hint" style="margin-top:0;">Un club affilié (équipe partenaire) ou un club parent vous offre une visibilité totale sur son effectif et des prêts sans indemnité entre vos deux clubs.</p>
      ${sc.affiliates.length ? `<table class="squad-table"><thead><tr><th>Club</th><th>Lien</th><th>Division</th><th>Depuis</th><th></th></tr></thead><tbody>
        ${sc.affiliates.map(a => { const c = getClub(a.clubId); return c ? `<tr><td>${c.name}</td><td>${a.type === "parent" ? "Club parent" : "Club affilié"}</td><td>${divisionLabel(c)}</td><td>${a.since}</td><td><button class="btn btn-small btn-ghost" data-endaff="${c.id}">Rompre</button></td></tr>` : ""; }).join("")}
      </tbody></table>` : `<p class="hint">Aucune affiliation pour l'instant.</p>`}
      <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-top:10px;">
        <label class="field" style="margin:0;"><span>Type</span>
          <select id="aff-type"><option value="affilie" ${candType === "affilie" ? "selected" : ""}>Club affilié (équipe partenaire)</option><option value="parent" ${candType === "parent" ? "selected" : ""}>Club parent (plus grand)</option></select></label>
        <label class="field" style="margin:0;min-width:220px;"><span>Club</span>
          <select id="aff-club">${cands.map(c => `<option value="${c.id}">${c.name} — ${divisionLabel(c)} (${fmtMoney(affiliationCost(club, c, candType))})</option>`).join("") || "<option value=''>Aucun club disponible</option>"}</select></label>
        <button class="btn btn-primary btn-small" id="aff-propose" ${cands.length ? "" : "disabled"}>Proposer un partenariat</button>
      </div>
      <p class="hint" id="aff-result" style="margin:8px 0 0;"></p>
      <p class="hint" style="margin:0;">${parents.length}/1 club parent · ${affs.length}/2 clubs affiliés</p>
    </div>
  `;
}

// ---------- Staff ----------
function renderStaffTab() {
  const club = userClub();
  const bill = staffWageBill(club), budget = staffBudget(club);
  const roleFilter = ui.staffRole || "";
  const market = (state.staffMarket || []).filter(s => !roleFilter || s.role === roleFilter)
    .sort((a, b) => staffAbility(b) - staffAbility(a)).slice(0, 24);
  const year = new Date(state.date).getFullYear();
  return `
    <h2 class="panel-title">Staff technique — ${club.name}</h2>
    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${(club.staff || []).length}</span><span class="stat-label">Membres du staff</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(bill)}</span><span class="stat-label">Masse salariale staff / mois</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(Math.max(0, budget - bill))}</span><span class="stat-label">Marge du budget staff</span></div>
    </div>
    <p class="hint">Le budget staff représente 10 % de votre plafond salarial (${fmtMoney(budget)}/mois). Les salaires du staff sont prélevés chaque mois.</p>
    <div class="table-scroll"><table class="squad-table">
      <thead><tr><th>Poste</th><th>Nom</th><th>Niveau</th><th>Potentiel</th><th>Âge</th><th>Salaire</th><th>Contrat</th><th>Effet</th><th></th></tr></thead>
      <tbody>
        ${STAFF_ROLE_ORDER.map(role => {
          const list = staffByRole(club, role);
          const r = STAFF_ROLES[role];
          if (!list.length) return `<tr class="staff-empty"><td>${r.icon} ${r.label}</td><td colspan="8" class="hint">Poste vacant — ${r.effect}</td></tr>`;
          return list.map(s => `<tr>
            <td>${r.icon} ${r.label}</td>
            <td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-staffcard="${s.id}">${s.firstName} ${s.lastName}</button></td>
            <td>${starsHtml(staffStars(s))}</td><td>${starsHtml(staffPotentialStars(s))}</td><td>${s.age}</td><td>${fmtMoney(s.wage)}</td>
            <td class="${s.contractEndYear <= year ? "result-bad" : ""}">${s.contractEndYear}</td>
            <td class="hint" style="font-size:12px;">${r.effect}</td>
            <td><button class="btn btn-small btn-ghost" data-staffrenew="${s.id}">Prolonger</button> <button class="btn btn-small btn-ghost" data-staffrelease="${s.id}">Licencier</button></td></tr>`).join("");
        }).join("")}
      </tbody></table></div>

    <h3 class="panel-subtitle">Recruter du staff</h3>
    <div class="market-filters">
      <select id="staff-role"><option value="">Tous les postes</option>${STAFF_ROLE_ORDER.map(r => `<option value="${r}" ${roleFilter === r ? "selected" : ""}>${STAFF_ROLES[r].label}</option>`).join("")}</select>
    </div>
    <div class="table-scroll"><table class="squad-table">
      <thead><tr><th>Poste</th><th>Nom</th><th>Nationalité</th><th>Niveau</th><th>Potentiel</th><th>Âge</th><th>Salaire</th><th></th></tr></thead>
      <tbody>
        ${market.map(s => `<tr>
          <td>${STAFF_ROLES[s.role].icon} ${STAFF_ROLES[s.role].label}</td>
          <td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-staffcard="${s.id}">${s.firstName} ${s.lastName}</button></td>
          <td>${s.nationality}</td><td>${starsHtml(staffStars(s))}</td><td>${starsHtml(staffPotentialStars(s))}</td><td>${s.age}</td><td>${fmtMoney(s.wage)}</td>
          <td><button class="btn btn-small btn-primary" data-staffhire="${s.id}">Engager</button></td></tr>`).join("") || `<tr><td colspan="8" class="hint">Aucun candidat disponible.</td></tr>`}
      </tbody></table></div>
    <p class="hint" id="staff-result"></p>
  `;
}

function openStaffCard(staffId) {
  const s = getStaffMember(staffId);
  const modal = document.getElementById("player-modal");
  if (!s || !modal) return;
  const r = STAFF_ROLES[s.role];
  const club = s.clubId ? getClub(s.clubId) : null;
  modal.innerHTML = `
    <div class="modal-backdrop"><div class="modal dossier" style="max-width:620px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
        <div style="font-size:34px;">${r.icon}</div>
        <div><h3 style="margin:0;">${s.firstName} ${s.lastName}</h3>
          <p class="hint" style="margin:2px 0 0;">${r.label} · ${s.age} ans · ${s.nationality}</p></div>
      </div>
      <div class="overview-grid" style="margin-bottom:14px;">
        <div class="stat-block"><span class="stat-num" style="font-size:16px;">${starsHtml(staffStars(s))}</span><span class="stat-label">Niveau</span></div>
        <div class="stat-block"><span class="stat-num" style="font-size:16px;">${starsHtml(staffPotentialStars(s))}</span><span class="stat-label">Potentiel</span></div>
        <div class="stat-block"><span class="stat-num" style="font-size:16px;">${club ? club.name : "Libre"}</span><span class="stat-label">Club</span></div>
        <div class="stat-block"><span class="stat-num" style="font-size:16px;">${fmtMoney(s.wage)}</span><span class="stat-label">Salaire / mois</span></div>
        <div class="stat-block"><span class="stat-num" style="font-size:16px;">${s.contractEndYear || "—"}</span><span class="stat-label">Contrat jusqu'en</span></div>
        <div class="stat-block"><span class="stat-num" style="font-size:16px;">${s.morale}%</span><span class="stat-label">Moral</span></div>
      </div>
      <p class="hint" style="margin-top:0;"><strong>Apport pour le club :</strong> ${r.effect}.</p>
      <h3 class="panel-subtitle" style="margin-top:0;">Attributs (échelle 1-20)</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
        ${r.attrs.map(k => { const v = s.attributes[k]; return `<div class="wage-bar-wrap"><div class="wage-bar-label">${STAFF_ATTR_LABELS[k] || k} — ${v} / 20</div>
          <div class="wage-bar"><div class="wage-bar-fill ${v >= 15 ? "" : v <= 8 ? "danger" : "warn"}" style="width:${v / 20 * 100}%"></div></div></div>`; }).join("")}
      </div>
      <div class="creation-footer"><button class="btn btn-primary" id="close-staff-card">Fermer</button></div>
    </div></div>`;
  document.getElementById("close-staff-card").onclick = () => { modal.innerHTML = ""; };
}

// ---------- Événements de joueurs (boîte de réception) ----------
const PLAYER_EVENT_TEXT = {
  raise: p => `<strong>${p.firstName} ${p.lastName}</strong> demande une augmentation de salaire.`,
  leave: p => `<strong>${p.firstName} ${p.lastName}</strong> souhaite quitter le club.`,
  refused_transfer: p => `<strong>${p.firstName} ${p.lastName}</strong> est mécontent : vous avez refusé une offre pour lui.`,
  loan_request: p => `<strong>${p.firstName} ${p.lastName}</strong> demande à être prêté pour jouer davantage.`
};
function renderPlayerEventsSection() {
  const evs = state.inbox.filter(o => o.type === "player_event" && !o.resolved);
  const msg = ui.eventMessage ? `<p class="hint result-good">${ui.eventMessage}</p>` : "";
  if (!evs.length) return msg;
  return `
    <h3 class="panel-subtitle">Vos joueurs</h3>${msg}
    <div class="offer-list">${evs.map(ev => {
      const p = getPlayer(ev.playerId);
      if (!p) return "";
      const hot = ev.kind === "leave" || ev.kind === "refused_transfer";
      return `<div class="offer-row priority-${hot ? "high" : "medium"}"><div>
        <span class="priority-chip priority-chip-${hot ? "high" : "medium"}">${hot ? "Urgent" : "À traiter"}</span><br/>
        ${PLAYER_EVENT_TEXT[ev.kind](p)}
        <div class="hint">${p.position} · ${p.overall} · moral ${p.morale}% · salaire ${fmtMoney(p.wage)}/mois · contrat ${p.contractEndYear} · ${ev.date}</div></div>
        <div class="offer-actions" style="flex-wrap:wrap;">${playerEventChoices(ev).map(([c, l]) => `<button class="btn btn-small ${c === "refuse" || c === "ignore" ? "btn-ghost" : "btn-primary"}" data-evchoice="${ev.id}:${c}">${l}</button>`).join("")}
        <button class="btn btn-small btn-ghost" data-playercard="${p.id}">Fiche</button></div></div>`;
    }).join("")}</div>`;
}

// ---------- Câblage ----------
function refreshTab(fn) {
  document.getElementById("tab-content").innerHTML = fn();
  attachTabHandlers();
}
function readSearchForm() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : ""; };
  const chk = id => { const el = document.getElementById(id); return !!(el && el.checked); };
  ui.search = {
    q: g("s-q"), country: g("s-country"), tier: g("s-tier"), pos: g("s-pos"), ageMin: g("s-agemin"), ageMax: g("s-agemax"),
    levelMin: g("s-level"), potMin: g("s-pot"), valueMax: g("s-value"), contractMax: g("s-contract"), nationality: g("s-nat"),
    attrs: [0, 1, 2].map(i => ({ key: g("s-attr-" + i), min: g("s-attrmin-" + i) || 12 })),
    affiliatesOnly: chk("s-aff"), listedOnly: chk("s-listed"), onLoanOnly: chk("s-loan"), unhappyOnly: chk("s-unhappy"),
    sort: g("s-sort") || "level"
  };
}
function attachRecruitHandlers() {
  const club = userClub();
  const $ = id => document.getElementById(id);
  if ($("s-apply")) {
    $("s-apply").onclick = () => { readSearchForm(); refreshTab(renderMarket); };
    $("s-reset").onclick = () => { ui.search = defaultSearch(); refreshTab(renderMarket); };
    $("s-country").onchange = () => { readSearchForm(); ui.search.tier = ""; refreshTab(renderMarket); };
    ["s-q", "s-nat", "s-agemin", "s-agemax"].forEach(id => { $(id).onkeydown = e => { if (e.key === "Enter") { readSearchForm(); refreshTab(renderMarket); } }; });
  }
  document.querySelectorAll("[data-shortlist]").forEach(b => {
    b.onclick = () => {
      toggleShortlist(club.id, parseInt(b.dataset.shortlist, 10)); saveGame();
      if (ui.tab === "market") { readSearchForm(); refreshTab(renderMarket); } else refreshTab(renderScoutingTab);
    };
  });
  document.querySelectorAll("[data-observe]").forEach(b => {
    b.onclick = () => {
      const res = requestObservation(club.id, parseInt(b.dataset.observe, 10));
      const box = $("observe-result");
      box.textContent = res.ok ? "Un recruteur va observer ce joueur pendant 3 semaines (rapport à la clé)." : res.reason;
      box.className = "hint " + (res.ok ? "result-good" : "result-bad");
      if (res.ok) { b.disabled = true; saveGame(); }
    };
  });
  document.querySelectorAll("[data-scoutcountry],[data-scoutpos],[data-scoutage]").forEach(el => {
    el.onchange = () => {
      const id = parseInt(el.dataset.scoutcountry || el.dataset.scoutpos || el.dataset.scoutage, 10);
      const cur = club.scouting.assignments[id] || {};
      const country = document.querySelector(`[data-scoutcountry="${id}"]`).value;
      const pos = document.querySelector(`[data-scoutpos="${id}"]`).value;
      const age = document.querySelector(`[data-scoutage="${id}"]`).value;
      assignScout(club.id, id, country, pos, age); saveGame();
    };
  });
  document.querySelectorAll("[data-staffcard]").forEach(b => { b.onclick = () => openStaffCard(parseInt(b.dataset.staffcard, 10)); });
  document.querySelectorAll("[data-staffhire]").forEach(b => {
    b.onclick = () => {
      const res = hireStaff(club.id, parseInt(b.dataset.staffhire, 10), 2); saveGame();
      if (res.ok) refreshTab(renderStaffTab); else { const box = $("staff-result"); box.textContent = res.reason; box.className = "hint result-bad"; }
    };
  });
  document.querySelectorAll("[data-staffrelease]").forEach(b => {
    b.onclick = () => {
      const s = getStaffMember(parseInt(b.dataset.staffrelease, 10));
      if (!confirm(`Licencier ${s.firstName} ${s.lastName} ? Indemnité : ${fmtMoney(s.wage * 3)}.`)) return;
      releaseStaff(club.id, s.id); saveGame(); refreshTab(renderStaffTab);
    };
  });
  document.querySelectorAll("[data-staffrenew]").forEach(b => {
    b.onclick = () => {
      const res = renewStaff(club.id, parseInt(b.dataset.staffrenew, 10)); saveGame();
      if (res.ok) refreshTab(renderStaffTab); else { const box = $("staff-result"); box.textContent = res.reason; box.className = "hint result-bad"; }
    };
  });
  if ($("staff-role")) $("staff-role").onchange = () => { ui.staffRole = $("staff-role").value; refreshTab(renderStaffTab); };
  if ($("aff-type")) $("aff-type").onchange = () => { ui.affType = $("aff-type").value; refreshTab(renderScoutingTab); };
  if ($("aff-propose")) $("aff-propose").onclick = () => {
    const targetId = parseInt($("aff-club").value, 10);
    const res = requestAffiliation(club.id, targetId, $("aff-type").value); saveGame();
    if (!res.ok) { const box = $("aff-result"); box.textContent = res.reason; box.className = "hint result-bad"; return; }
    ui.affMessage = res.accepted ? "Partenariat conclu !" : "Le club a décliné votre proposition.";
    refreshTab(renderScoutingTab);
    const box = $("aff-result"); if (box) { box.textContent = ui.affMessage; box.className = "hint " + (res.accepted ? "result-good" : "result-bad"); }
  };
  document.querySelectorAll("[data-endaff]").forEach(b => { b.onclick = () => { endAffiliation(club.id, parseInt(b.dataset.endaff, 10)); saveGame(); refreshTab(renderScoutingTab); }; });
  document.querySelectorAll("[data-evchoice]").forEach(b => {
    b.onclick = () => {
      const [id, choice] = b.dataset.evchoice.split(":");
      const res = resolvePlayerEvent(parseInt(id, 10), choice);
      ui.eventMessage = res.message || "";
      saveGame(); render();
    };
  });
}
