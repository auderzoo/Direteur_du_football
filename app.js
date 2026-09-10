/* ============================================================
   APP.JS — Interface utilisateur
   ============================================================ */

const app = document.getElementById("app");
const ui = { screen: "menu", tab: "overview", selectedCountries: [], marketFilter: {} };

function dsAvatarEmoji(id) {
  const a = DS_AVATARS.find(x => x.id === id);
  return a ? a.emoji : "🧢";
}

function render() {
  if (ui.screen === "menu") return renderMenu();
  if (ui.screen === "creation") return renderCreation();
  if (ui.screen === "clubselect") return renderClubSelect();
  if (ui.screen === "dashboard") {
    if (state && state.ds && state.ds.fired) { ui.screen = "clubselect"; ui.firedNotice = true; return renderClubSelect(); }
    return renderDashboard();
  }
}

// ---------------------------------------------------------------
// ÉCRAN : MENU D'ACCUEIL
// ---------------------------------------------------------------
function renderMenu() {
  app.innerHTML = `
    <div class="menu-screen">
      <div class="menu-mark">DS</div>
      <h1 class="menu-title">Directeur Sportif</h1>
      <p class="menu-sub">Bâtissez un club, pas une équipe. Recrutez, négociez, faites grandir un projet.</p>
      <div class="menu-actions">
        <button class="btn btn-primary" id="btn-new">Nouvelle carrière</button>
        <button class="btn btn-ghost" id="btn-continue" ${hasSave() ? "" : "disabled"}>Continuer la carrière</button>
      </div>
      ${hasSave() ? `<button class="link-danger" id="btn-delete">Supprimer la sauvegarde</button>` : ""}
    </div>
  `;
  document.getElementById("btn-new").onclick = () => { ui.screen = "creation"; render(); };
  const c = document.getElementById("btn-continue");
  if (c) c.onclick = () => { loadGame(); ui.screen = "dashboard"; ui.tab = "overview"; render(); };
  const d = document.getElementById("btn-delete");
  if (d) d.onclick = () => { deleteSave(); render(); };
}

// ---------------------------------------------------------------
// ÉCRAN : CRÉATION DU DIRECTEUR SPORTIF
// ---------------------------------------------------------------
function renderCreation() {
  const countryEntries = Object.entries(COUNTRIES);
  const specEntries = Object.entries(DS_SPECIALIZATIONS);
  app.innerHTML = `
    <div class="creation-screen">
      <h2 class="section-title">Votre profil</h2>
      <div class="dossier">
        <label class="field">
          <span>Nom du directeur sportif</span>
          <input type="text" id="ds-name" maxlength="24" placeholder="ex. Alex Fontaine" />
        </label>
        <label class="field">
          <span>Nationalité</span>
          <select id="ds-nationality">
            ${countryEntries.map(([key, c]) => `<option value="${key}">${c.label}</option>`).join("")}
          </select>
        </label>
        <div class="field">
          <span>Emblème</span>
          <div class="avatar-picker" id="avatar-picker"></div>
        </div>
      </div>

      <h2 class="section-title">Spécialisation</h2>
      <p class="hint">Votre profil influence durablement la gestion de votre club.</p>
      <div class="spec-grid" id="spec-grid">
        ${specEntries.map(([key, s], i) => `
          <button class="spec-card ${i === 0 ? "selected" : ""}" data-spec="${key}">
            <span class="spec-name">${s.label}</span>
            <span class="spec-desc">${s.desc}</span>
          </button>
        `).join("")}
      </div>

      <h2 class="section-title">Difficulté</h2>
      <div class="spec-grid" id="diff-grid">
        ${Object.entries(DS_DIFFICULTIES).map(([key, d], i) => `
          <button class="spec-card ${i === 1 ? "selected" : ""}" data-diff="${key}">
            <span class="spec-name">${d.label}</span>
            <span class="spec-desc">${d.desc}</span>
          </button>
        `).join("")}
      </div>

      <h2 class="section-title">Marchés suivis <span class="count-tag">${ui.selectedCountries.length} / 5</span></h2>
      <p class="hint">Choisissez jusqu'à 5 pays. Chacun ouvre deux championnats (Élite et Nationale), une coupe nationale, et une coupe continentale si vous en choisissez au moins 2.</p>
      <div class="country-grid" id="country-grid">
        ${countryEntries.map(([key, c]) => `
          <button class="country-chip" data-key="${key}">${c.label}</button>
        `).join("")}
      </div>

      <div class="creation-footer">
        <button class="btn btn-ghost" id="back-menu">Retour</button>
        <button class="btn btn-primary" id="btn-confirm-countries" disabled>Continuer</button>
      </div>
    </div>
  `;

  const picker = document.getElementById("avatar-picker");
  let chosenSeed = DS_AVATARS[0].id;
  picker.innerHTML = DS_AVATARS.map((a, i) => `<button class="avatar-portrait ${i === 0 ? "active" : ""}" title="${a.label}" data-seed="${a.id}">${a.emoji}</button>`).join("");
  picker.querySelectorAll(".avatar-portrait").forEach(btn => {
    btn.onclick = () => {
      picker.querySelectorAll(".avatar-portrait").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      chosenSeed = btn.dataset.seed;
    };
  });

  let chosenSpec = specEntries[0][0];
  const specGrid = document.getElementById("spec-grid");
  specGrid.querySelectorAll(".spec-card").forEach(card => {
    card.onclick = () => {
      specGrid.querySelectorAll(".spec-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      chosenSpec = card.dataset.spec;
    };
  });

  let chosenDiff = "normal";
  const diffGrid = document.getElementById("diff-grid");
  diffGrid.querySelectorAll(".spec-card").forEach(card => {
    card.onclick = () => {
      diffGrid.querySelectorAll(".spec-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      chosenDiff = card.dataset.diff;
    };
  });

  const grid = document.getElementById("country-grid");
  grid.querySelectorAll(".country-chip").forEach(chip => {
    if (ui.selectedCountries.includes(chip.dataset.key)) chip.classList.add("selected");
    chip.onclick = () => {
      const key = chip.dataset.key;
      const idx = ui.selectedCountries.indexOf(key);
      if (idx >= 0) {
        ui.selectedCountries.splice(idx, 1);
        chip.classList.remove("selected");
      } else {
        if (ui.selectedCountries.length >= 5) return;
        ui.selectedCountries.push(key);
        chip.classList.add("selected");
      }
      document.querySelector(".count-tag").textContent = `${ui.selectedCountries.length} / 5`;
      document.getElementById("btn-confirm-countries").disabled = ui.selectedCountries.length === 0;
    };
  });

  document.getElementById("back-menu").onclick = () => { ui.screen = "menu"; render(); };
  document.getElementById("btn-confirm-countries").onclick = () => {
    const name = document.getElementById("ds-name").value.trim() || "Directeur Sportif";
    const nationality = document.getElementById("ds-nationality").value;
    newGame(name, chosenSeed, ui.selectedCountries, nationality, chosenSpec, chosenDiff);
    ui.screen = "clubselect";
    render();
  };
}

// ---------------------------------------------------------------
// ÉCRAN : CHOIX DU CLUB DE DÉPART
// ---------------------------------------------------------------
function renderClubSelect() {
  const countries = Object.values(state.countries);
  app.innerHTML = `
    <div class="clubselect-screen">
      <h2 class="section-title">Choisissez votre club</h2>
      ${ui.firedNotice ? `<p class="result-bad">Vous avez été démis de vos fonctions. Choisissez un nouveau club pour rebondir.</p>` : ""}
      <p class="hint">Un petit club en Division Nationale offre plus de marge de progression ; un club d'Élite, plus de moyens dès le départ.</p>
      <div class="league-tabs" id="league-country-tabs">
        ${countries.map((c, i) => `<button class="tab-chip ${i === 0 ? "active" : ""}" data-country="${c.key}">${c.label}</button>`).join("")}
      </div>
      <div id="club-list-wrap"></div>
      <div class="creation-footer">
        <button class="btn btn-ghost" id="back-creation">Retour</button>
      </div>
    </div>
  `;

  function renderClubList(countryKey) {
    const country = state.countries[countryKey];
    const wrap = document.getElementById("club-list-wrap");
    wrap.innerHTML = ["d1", "d2"].map(divKey => {
      const league = country.leagues[divKey];
      return `
        <h3 class="league-name">${league.name}</h3>
        <div class="club-grid">
          ${league.clubs.map(club => `
            <button class="club-card" data-club="${club.id}">
              <span class="club-name">${club.name}</span>
              <span class="club-meta">${club.city} · Réputation ${club.reputation}</span>
              <span class="club-meta">Budget ${fmtMoneyRaw(club.budget, COUNTRIES[countryKey].currency)}</span>
            </button>
          `).join("")}
        </div>
      `;
    }).join("");
    wrap.querySelectorAll(".club-card").forEach(cardEl => {
      cardEl.onclick = () => {
        setUserClub(parseInt(cardEl.dataset.club, 10));
        ui.firedNotice = false;
        saveGame();
        ui.screen = "dashboard";
        ui.tab = "overview";
        render();
      };
    });
  }

  const tabs = document.getElementById("league-country-tabs");
  tabs.querySelectorAll(".tab-chip").forEach(t => {
    t.onclick = () => {
      tabs.querySelectorAll(".tab-chip").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      renderClubList(t.dataset.country);
    };
  });
  renderClubList(countries[0].key);

  document.getElementById("back-creation").onclick = () => { ui.screen = "creation"; render(); };
}

function fmtMoneyRaw(v, cur) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M${cur}`;
  return `${Math.round(v / 1000)} k${cur}`;
}

// ---------------------------------------------------------------
// ÉCRAN : TABLEAU DE BORD
// ---------------------------------------------------------------
function renderDashboard() {
  const club = userClub();
  const win = currentWindow();
  app.innerHTML = `
    <div class="scoreboard">
      <div class="sb-left">
        <div class="sb-club">${club.name}</div>
        <div class="sb-sub">${COUNTRIES[club.countryKey].label} · ${club.division === 1 ? "Élite" : "Nationale"}</div>
      </div>
      <div class="sb-center">
        <div class="sb-date">${fmtDate(state.date)} · Saison ${state.season.year}</div>
        <div class="sb-window ${win ? "open" : "closed"}">${win ? `${win.name} — ouvert` : "Mercato fermé"}</div>
      </div>
      <div class="sb-right">
        <div class="sb-budget">${fmtMoney(club.budget)}</div>
        <div class="sb-sub">Budget disponible</div>
      </div>
    </div>

    <div class="game-body">
      <nav class="folder-tabs">
        ${tabButton("overview", "Vue d'ensemble")}
        ${tabButton("squad", "Effectif")}
        ${tabButton("market", "Marché des transferts")}
        ${tabButton("calendar", "Calendrier")}
        ${tabButton("cups", "Coupes")}
        ${tabButton("club", "Club")}
        ${tabButton("inbox", "Boîte de réception" + (unreadCount() ? ` (${unreadCount()})` : ""))}
        ${tabButton("finance", "Finances")}
      </nav>
      <section class="dossier main-panel" id="tab-content"></section>
    </div>
    <div id="match-modal"></div>
    <div id="player-modal"></div>
  `;

  document.querySelectorAll(".folder-tabs .tab-btn").forEach(btn => {
    btn.onclick = () => { ui.tab = btn.dataset.tab; render(); };
  });

  const content = document.getElementById("tab-content");
  if (ui.tab === "overview") content.innerHTML = renderOverview();
  if (ui.tab === "squad") content.innerHTML = renderSquad();
  if (ui.tab === "market") content.innerHTML = renderMarket();
  if (ui.tab === "calendar") content.innerHTML = renderCalendar();
  if (ui.tab === "cups") content.innerHTML = renderCups();
  if (ui.tab === "club") content.innerHTML = renderClubTab();
  if (ui.tab === "inbox") content.innerHTML = renderInbox();
  if (ui.tab === "finance") content.innerHTML = renderFinance();

  attachTabHandlers();
  maybeShowMatchModal();
}

function unreadCount() {
  return state.inbox.filter(o => !o.resolved).length;
}

function maybeShowMatchModal() {
  const modal = document.getElementById("match-modal");
  if (!modal) return;
  const r = state.lastMatchResult;
  const cr = state.lastCupResult;
  if ((!r && !cr) || ui.matchModalShown) { modal.innerHTML = ""; return; }
  if (r) {
    const won = r.isHome ? r.homeGoals > r.awayGoals : r.awayGoals > r.homeGoals;
    const lost = r.isHome ? r.homeGoals < r.awayGoals : r.awayGoals < r.homeGoals;
    const resultClass = won ? "result-good" : lost ? "result-bad" : "result-mid";
    const scorersTxt = [...(r.homeScorers || []), ...(r.awayScorers || [])];
    const cardsTxt = [...(r.homeCards || []), ...(r.awayCards || [])]
      .map(c => `${c.name} ${c.type === "red" ? "🟥" : c.type === "suspension" ? "🟨🟨 (suspendu)" : "🟨"}`);
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal dossier score-modal">
          <h3>Résultat du match</h3>
          <div class="score-line">
            <span>${r.homeName}</span>
            <span class="score-num">${r.homeGoals} - ${r.awayGoals}</span>
            <span>${r.awayName}</span>
          </div>
          ${scorersTxt.length ? `<p class="hint">Buteurs : ${scorersTxt.join(", ")}</p>` : ""}
          ${cardsTxt.length ? `<p class="hint">Cartons : ${cardsTxt.join(", ")}</p>` : ""}
          <p class="${resultClass}">${won ? "Victoire !" : lost ? "Défaite." : "Match nul."}</p>
          <details style="text-align:left;margin-bottom:14px;">
            <summary style="cursor:pointer;color:var(--brass-dark);font-weight:600;">Feuille de match</summary>
            <div class="calendar-columns" style="margin-top:10px;">
              <div>
                <p class="hint"><strong>${r.homeName}</strong></p>
                ${(r.homeLineup || []).map(pl => `<div class="log-row">${pl.position} — ${pl.name}</div>`).join("")}
              </div>
              <div>
                <p class="hint"><strong>${r.awayName}</strong></p>
                ${(r.awayLineup || []).map(pl => `<div class="log-row">${pl.position} — ${pl.name}</div>`).join("")}
              </div>
            </div>
          </details>
          <button class="btn btn-primary" id="close-match-modal">Continuer</button>
        </div>
      </div>
    `;
  } else if (cr) {
    const resultClass = cr.won ? "result-good" : "result-bad";
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal dossier score-modal">
          <h3>${cr.cupLabel}</h3>
          <div class="score-line">
            <span>${cr.homeName}</span>
            <span class="score-num">${cr.homeGoals} - ${cr.awayGoals}</span>
            <span>${cr.awayName}</span>
          </div>
          <p class="${resultClass}">${cr.won ? "Qualifié pour le tour suivant !" : "Éliminé."}${cr.penalties ? " (aux tirs au but)" : ""}</p>
          <button class="btn btn-primary" id="close-match-modal">Continuer</button>
        </div>
      </div>
    `;
  }
  document.getElementById("close-match-modal").onclick = () => { ui.matchModalShown = true; modal.innerHTML = ""; };
}

function tabButton(key, label) {
  return `<button class="tab-btn ${ui.tab === key ? "active" : ""}" data-tab="${key}">${label}</button>`;
}

function renderOverview() {
  const club = userClub();
  const pendingOffers = state.inbox.filter(o => !o.resolved);
  const wagePct = Math.round((club.wageBill / club.wageBudgetMonthly) * 100);
  return `
    <h2 class="panel-title">Rapport — ${fmtDate(state.date)}</h2>
    <p class="hint">${dsAvatarEmoji(state.ds.avatarSeed)} ${state.ds.name} (${COUNTRIES[state.ds.nationality] ? COUNTRIES[state.ds.nationality].label : ""}) · ${DS_SPECIALIZATIONS[state.ds.specialization] ? DS_SPECIALIZATIONS[state.ds.specialization].label : ""}${state.ds.failStreak ? ` · <span class="result-bad">objectif manqué ${state.ds.failStreak} saison(s) de suite</span>` : ""}</p>
    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${club.players.length}</span><span class="stat-label">Joueurs sous contrat</span></div>
      <div class="stat-block"><span class="stat-num">${club.won}-${club.draw}-${club.lost}</span><span class="stat-label">V-N-D (saison)</span></div>
      <div class="stat-block"><span class="stat-num">${pendingOffers.length}</span><span class="stat-label">Offres en attente</span></div>
      <div class="stat-block"><span class="stat-num">${wagePct}%</span><span class="stat-label">Masse salariale utilisée</span></div>
    </div>

    <h3 class="panel-subtitle">Journal du club</h3>
    <div class="log-list">
      ${state.log.slice(0, 14).map(l => `<div class="log-row"><span class="log-date">${l.date}</span>${l.text}</div>`).join("") || `<p class="hint">Rien à signaler pour l'instant.</p>`}
    </div>
  `;
}

function renderSquad() {
  const club = userClub();
  const rows = [...club.players].filter(p => !p.onLoan).sort((a, b) => b.overall - a.overall);
  const loanedIn = club.players.filter(p => p.onLoan && p.onLoan.toClubId === club.id);
  const wagePct = clampPct(Math.round((club.wageBill / club.wageBudgetMonthly) * 100));
  return `
    <h2 class="panel-title">Effectif — ${club.name}</h2>
    <div class="wage-bar-wrap">
      <div class="wage-bar-label">Masse salariale mensuelle : ${fmtMoney(club.wageBill)} / ${fmtMoney(club.wageBudgetMonthly)}</div>
      <div class="wage-bar"><div class="wage-bar-fill ${wagePct >= 95 ? "danger" : wagePct >= 75 ? "warn" : ""}" style="width:${wagePct}%"></div></div>
    </div>
    <table class="squad-table">
      <thead><tr><th>Joueur</th><th>Poste</th><th>Âge</th><th>Global</th><th>Potentiel</th><th>Valeur</th><th>Salaire/mois</th><th>État</th><th>Listé</th><th></th></tr></thead>
      <tbody>
        ${rows.map(p => {
          const today = state.date.toISOString().slice(0, 10);
          const injured = p.injuredUntil && p.injuredUntil >= today;
          const suspended = p.suspendedMatches > 0;
          let etat = "Disponible";
          if (injured) etat = `Blessé jusqu'au ${fmtDate(new Date(p.injuredUntil))}`;
          else if (suspended) etat = `Suspendu (${p.suspendedMatches} match${p.suspendedMatches > 1 ? "s" : ""})`;
          else if (p.yellowCards) etat = `${p.yellowCards} carton(s) jaune(s)`;
          return `
          <tr class="${injured ? "injured-row" : ""}">
            <td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-playercard="${p.id}">${p.firstName} ${p.lastName}</button>${p.releaseClause ? " 🔓" : ""}</td>
            <td>${p.position}</td>
            <td>${p.age}</td>
            <td>${p.overall}</td>
            <td>${p.potential}</td>
            <td>${fmtMoney(p.value)}</td>
            <td>${fmtMoney(p.wage)}</td>
            <td>${etat}</td>
            <td><button class="toggle-list ${p.listed ? "on" : ""}" data-listtoggle="${p.id}">${p.listed ? "Oui" : "Non"}</button></td>
            <td>
              <button class="btn btn-small btn-ghost" data-scout="${p.id}">Scouter</button>
              <button class="btn btn-small btn-ghost" data-loanout="${p.id}">Prêter</button>
            </td>
          </tr>
        `;
        }).join("")}
      </tbody>
    </table>
    ${loanedIn.length ? `
      <h3 class="panel-subtitle">Joueurs prêtés à ${club.name}</h3>
      <table class="squad-table">
        <thead><tr><th>Joueur</th><th>Poste</th><th>Club d'origine</th><th>Retour</th><th>Option d'achat</th><th></th></tr></thead>
        <tbody>
          ${loanedIn.map(p => {
            const from = getClub(p.onLoan.fromClubId);
            return `<tr>
              <td>${p.firstName} ${p.lastName}</td>
              <td>${p.position}</td>
              <td>${from ? from.name : "?"}</td>
              <td>${fmtDate(new Date(p.onLoan.until))}</td>
              <td>${p.onLoan.buyOption ? fmtMoney(p.onLoan.buyOption) : "—"}</td>
              <td>${p.onLoan.buyOption ? `<button class="btn btn-small btn-primary" data-buyloan="${p.id}">Lever l'option</button>` : ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    ` : ""}
    <div id="scout-modal"></div>
    <div id="loan-modal"></div>
  `;
}
function clampPct(v) { return Math.max(0, Math.min(100, v)); }

function renderMarket() {
  const club = userClub();
  const others = allClubs().filter(c => c.id !== club.id);
  let players = [];
  others.forEach(c => c.players.forEach(p => players.push(p)));

  const f = ui.marketFilter;
  const nameQuery = (f.q || "").toLowerCase();
  players = players.filter(p => {
    if (f.pos && p.position !== f.pos) return false;
    if (nameQuery && !(`${p.firstName} ${p.lastName}`.toLowerCase().includes(nameQuery))) return false;
    return true;
  });
  players.sort((a, b) => b.overall - a.overall);
  players = players.slice(0, 60);

  const win = currentWindow();

  return `
    <h2 class="panel-title">Marché des transferts</h2>
    ${!win ? `<p class="hint">Le mercato est fermé. Vous pouvez consulter le marché mais aucune offre ne peut être conclue.</p>` : ""}
    <div class="market-filters">
      <input type="text" id="market-q" placeholder="Rechercher un joueur…" value="${f.q || ""}" />
      <select id="market-pos">
        <option value="">Tous postes</option>
        <option value="GB">Gardien</option>
        <option value="DEF">Défenseur</option>
        <option value="MIL">Milieu</option>
        <option value="ATT">Attaquant</option>
      </select>
    </div>
    <table class="squad-table">
      <thead><tr><th>Joueur</th><th>Club</th><th>Poste</th><th>Âge</th><th>Global</th><th>Valeur</th><th>Clause</th><th></th></tr></thead>
      <tbody>
        ${players.map(p => {
          const c = getClub(p.clubId);
          const isOnLoan = !!p.onLoan;
          return `
          <tr>
            <td><button class="link-danger" style="color:var(--brass-dark);margin:0;" data-playercard="${p.id}">${p.firstName} ${p.lastName}</button></td>
            <td>${c ? c.name : "?"}${isOnLoan ? " (prêté)" : ""}</td>
            <td>${p.position}</td>
            <td>${p.age}</td>
            <td>${p.overall}</td>
            <td>${fmtMoney(p.value)}</td>
            <td>${p.releaseClause ? fmtMoney(p.releaseClause) : "—"}</td>
            <td>
              <button class="btn btn-small btn-ghost" data-scout="${p.id}">Scouter</button>
              <button class="btn btn-small btn-primary" data-negotiate="${p.id}" ${win ? "" : "disabled"}>Négocier</button>
              ${!isOnLoan ? `<button class="btn btn-small btn-ghost" data-loanin="${p.id}" ${win ? "" : "disabled"}>Emprunter</button>` : ""}
            </td>
          </tr>
        `;
        }).join("")}
      </tbody>
    </table>
    <div id="negotiation-modal"></div>
    <div id="scout-modal"></div>
    <div id="loan-modal"></div>
  `;
}

function renderCalendar() {
  const club = userClub();
  const country = state.countries[club.countryKey];
  const leagueKey = club.division === 1 ? "d1" : "d2";
  const league = country.leagues[leagueKey];
  const standings = [...league.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

  const upcoming = [];
  league.fixtures.forEach(round => {
    round.matches.forEach(m => {
      if ((m.home === club.id || m.away === club.id)) {
        upcoming.push({ date: round.date, home: getClub(m.home), away: getClub(m.away), played: m.played, homeGoals: m.homeGoals, awayGoals: m.awayGoals });
      }
    });
  });
  const nextFixtures = upcoming.filter(f => !f.played).slice(0, 5);
  const recentResults = upcoming.filter(f => f.played).slice(-5).reverse();

  return `
    <h2 class="panel-title">${league.name}</h2>
    <p class="hint">${fmtDate(state.date)} — Saison ${state.season.year}</p>
    ${state.seasonComplete ? `
      <div class="season-banner">
        <strong>Saison terminée.</strong> Consultez vos finances et votre boîte de réception, puis lancez la saison suivante quand vous êtes prêt.
        <button class="btn btn-primary" id="next-season-btn">Passer à la saison suivante</button>
      </div>
    ` : `
      <div class="calendar-controls">
        <button class="btn btn-primary" id="advance-day">Avancer d'un jour</button>
        <button class="btn btn-ghost" id="advance-event">Avancer jusqu'au prochain évènement</button>
      </div>
    `}

    <div class="calendar-columns">
      <div>
        <h3 class="panel-subtitle">Prochains matchs</h3>
        <div class="fixture-list">
          ${nextFixtures.map(f => `
            <div class="fixture-row"><span class="fixture-date">${fmtDate(new Date(f.date))}</span>${f.home.name} — ${f.away.name}</div>
          `).join("") || `<p class="hint">Aucun match programmé.</p>`}
        </div>
        <h3 class="panel-subtitle">Derniers résultats</h3>
        <div class="fixture-list">
          ${recentResults.map(f => `
            <div class="fixture-row"><span class="fixture-date">${fmtDate(new Date(f.date))}</span>${f.home.name} ${f.homeGoals}-${f.awayGoals} ${f.away.name}</div>
          `).join("") || `<p class="hint">Pas encore de match joué.</p>`}
        </div>
      </div>
      <div>
        <h3 class="panel-subtitle">Classement</h3>
        <table class="squad-table standings">
          <thead><tr><th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Pts</th></tr></thead>
          <tbody>
            ${standings.map((c, i) => `
              <tr class="${c.id === club.id ? "me" : ""} ${club.division === 1 && i >= standings.length - 2 ? "relegation" : ""} ${club.division === 2 && i < 2 ? "promotion" : ""}">
                <td>${i + 1}</td><td>${c.name}</td><td>${c.played}</td><td>${c.won}</td><td>${c.draw}</td><td>${c.lost}</td><td>${c.gf}</td><td>${c.ga}</td><td>${c.points}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p class="hint">${club.division === 1 ? "Les 2 dernières places descendent en division inférieure." : "Les 2 premières places montent en division supérieure."}</p>
      </div>
    </div>
  `;
}

function renderCups() {
  const club = userClub();
  const nationalCup = state.cups.national[club.countryKey];
  const continentalCup = state.cups.continental;

  function renderCupBlock(cup) {
    if (!cup) return `<p class="hint">Pas assez de pays sélectionnés pour cette compétition.</p>`;
    if (cup.champion) {
      const champ = getClub(cup.champion);
      return `<p class="result-good">Vainqueur : <strong>${champ ? champ.name : "?"}</strong></p>`;
    }
    const round = cup.rounds[cup.rounds.length - 1];
    const label = cupRoundLabel(round.matches.length);
    const involvesUser = round.matches.some(m => m.home === club.id || m.away === club.id);
    return `
      <p class="hint">Tour en cours : ${label} — ${fmtDate(new Date(round.date))}</p>
      <div class="fixture-list">
        ${round.matches.map(m => {
          const home = getClub(m.home), away = getClub(m.away);
          if (!home || !away) return "";
          const isUser = home.id === club.id || away.id === club.id;
          const score = m.played ? `${m.homeGoals} - ${m.awayGoals}${m.winner === m.home ? " (V)" : m.winner === m.away ? "" : ""}` : "à jouer";
          return `<div class="fixture-row ${isUser ? "me-row" : ""}">${home.name} ${score} ${away.name}</div>`;
        }).join("")}
      </div>
    `;
  }

  return `
    <h2 class="panel-title">Coupes</h2>
    <h3 class="panel-subtitle">${nationalCup ? nationalCup.label : "Coupe Nationale"}</h3>
    ${renderCupBlock(nationalCup)}
    <h3 class="panel-subtitle">Coupe Continentale</h3>
    ${renderCupBlock(continentalCup)}
  `;
}

function renderClubTab() {
  const club = userClub();
  return `
    <h2 class="panel-title">Le club</h2>

    <h3 class="panel-subtitle">Profil du directeur sportif</h3>
    <p class="hint" style="font-size:34px;line-height:1;margin-bottom:10px;">${dsAvatarEmoji(state.ds.avatarSeed)}</p>
    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${state.ds.reputation}</span><span class="stat-label">Réputation DS</span></div>
      <div class="stat-block"><span class="stat-num">${DS_SPECIALIZATIONS[state.ds.specialization].label}</span><span class="stat-label">Spécialisation</span></div>
      <div class="stat-block"><span class="stat-num">${DS_DIFFICULTIES[state.ds.difficulty].label}</span><span class="stat-label">Difficulté</span></div>
      <div class="stat-block"><span class="stat-num">${COUNTRIES[state.ds.nationality] ? COUNTRIES[state.ds.nationality].label : "—"}</span><span class="stat-label">Nationalité</span></div>
    </div>

    <h3 class="panel-subtitle">Objectif de la saison ${state.season.year}</h3>
    <p class="hint">${club.objectiveLabel || "Aucun objectif défini."}${state.ds.failStreak ? ` — <span class="result-bad">attention, ${state.ds.failStreak} saison(s) manquée(s) d'affilée ; un renvoi survient après 2 échecs consécutifs.</span>` : ""}</p>

    <h3 class="panel-subtitle">Arbre de compétences <span class="count-tag">${state.ds.skillPoints} point(s) disponible(s)</span></h3>
    <div class="spec-grid">
      ${Object.entries(DS_SKILL_TREE).map(([key, s]) => {
        const lvl = state.ds.skills[key] || 0;
        const maxed = lvl >= s.max;
        return `
        <div class="spec-card">
          <span class="spec-name">${s.label} — ${lvl}/${s.max}</span>
          <span class="spec-desc">${s.desc}</span>
          <button class="btn btn-small btn-primary" data-skillup="${key}" ${(maxed || state.ds.skillPoints <= 0) ? "disabled" : ""}>${maxed ? "Maximum atteint" : "Améliorer"}</button>
        </div>`;
      }).join("")}
    </div>

    <h3 class="panel-subtitle">Identité du club</h3>
    <div class="dossier">
      <label class="field">
        <span>Nom du club</span>
        <input type="text" id="club-name-input" value="${club.name}" maxlength="30" />
      </label>
      <div class="field">
        <span>Couleur du maillot</span>
        <div class="avatar-picker" id="kit-picker"></div>
      </div>
      <button class="btn btn-primary btn-small" id="save-identity">Enregistrer</button>
    </div>

    <h3 class="panel-subtitle">Tactique</h3>
    <div class="dossier">
      <label class="field">
        <span>Formation</span>
        <select id="formation-select">
          ${FORMATIONS.map(f => `<option value="${f}" ${club.tactics.formation === f ? "selected" : ""}>${f}</option>`).join("")}
        </select>
      </label>
      <label class="field">
        <span>Mentalité</span>
        <select id="mentality-select">
          ${MENTALITIES.map(m => `<option value="${m}" ${club.tactics.mentality === m ? "selected" : ""}>${m === "offensif" ? "Offensive" : m === "defensif" ? "Défensive" : "Équilibrée"}</option>`).join("")}
        </select>
      </label>
      <p class="hint">Une mentalité offensive renforce l'attaque mais fragilise la défense, et inversement pour une mentalité défensive.</p>
      <button class="btn btn-primary btn-small" id="save-tactics">Appliquer</button>
    </div>
  `;
}

function renderInbox() {
  const pendingOffers = state.inbox.filter(o => !o.resolved && o.type !== "job_offer");
  const resolvedOffers = state.inbox.filter(o => o.resolved && o.type !== "job_offer").slice(0, 8);
  const pendingJobs = state.inbox.filter(o => !o.resolved && o.type === "job_offer");
  return `
    <h2 class="panel-title">Boîte de réception</h2>

    ${pendingJobs.length ? `
      <h3 class="panel-subtitle">Offres pour vous recruter</h3>
      <div class="offer-list">
        ${pendingJobs.map(o => {
          const target = getClub(o.clubId);
          if (!target) return "";
          return `
            <div class="offer-row">
              <div>
                <strong>${target.name}</strong> souhaite vous recruter comme directeur sportif.
                <div class="hint">Réputation du club : ${target.reputation} · ${COUNTRIES[target.countryKey].label} · ${o.date}</div>
              </div>
              <div class="offer-actions">
                <button class="btn btn-small btn-primary" data-jobaccept="${o.id}">Accepter</button>
                <button class="btn btn-small btn-ghost" data-jobreject="${o.id}">Refuser</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    ` : ""}

    <h3 class="panel-subtitle">Offres reçues pour vos joueurs listés</h3>
    ${pendingOffers.length ? `
      <div class="offer-list">
        ${pendingOffers.map(o => {
          const p = getPlayer(o.playerId);
          const buyer = getClub(o.fromClubId);
          if (!p || !buyer) return "";
          return `
            <div class="offer-row">
              <div>
                <strong>${p.firstName} ${p.lastName}</strong> (${p.position}, ${p.overall} global)
                <div class="hint">Offre de ${buyer.name} : ${fmtMoney(o.amount)} — valeur estimée ${fmtMoney(p.value)} — ${o.date}</div>
              </div>
              <div class="offer-actions">
                <button class="btn btn-small btn-primary" data-accept="${o.id}">Accepter</button>
                <button class="btn btn-small btn-ghost" data-reject="${o.id}">Refuser</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    ` : `<p class="hint">Aucune offre en attente.</p>`}

    ${resolvedOffers.length ? `
      <h3 class="panel-subtitle">Historique des offres</h3>
      <div class="log-list">
        ${resolvedOffers.map(o => {
          const p = getPlayer(o.playerId) || { firstName: "Joueur", lastName: "parti" };
          return `<div class="log-row"><span class="log-date">${o.date}</span>${p.firstName} ${p.lastName} — offre ${fmtMoney(o.amount)} ${o.accepted ? "acceptée" : "refusée"}</div>`;
        }).join("")}
      </div>
    ` : ""}

    <h3 class="panel-subtitle">Actualités mondiales</h3>
    <div class="log-list">
      ${state.news.slice(0, 20).map(n => `<div class="log-row"><span class="log-date">${n.date}</span>${n.text}</div>`).join("") || `<p class="hint">Rien à signaler.</p>`}
    </div>
  `;
}

function renderFinance() {
  const club = userClub();
  return `
    <h2 class="panel-title">Finances — ${club.name}</h2>
    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.budget)}</span><span class="stat-label">Trésorerie</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.sponsorIncome)}</span><span class="stat-label">Sponsoring / mois</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.wageBill)}</span><span class="stat-label">Salaires / mois</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.wageBudgetMonthly)}</span><span class="stat-label">Plafond salarial</span></div>
      <div class="stat-block"><span class="stat-num">${(club.stadiumCapacity || 0).toLocaleString("fr-FR")}</span><span class="stat-label">Capacité du stade</span></div>
      <div class="stat-block"><span class="stat-num">${club.lastAttendance ? club.lastAttendance.toLocaleString("fr-FR") : "—"}</span><span class="stat-label">Dernière affluence estimée</span></div>
    </div>
    <h3 class="panel-subtitle">Historique mensuel</h3>
    <table class="squad-table">
      <thead><tr><th>Mois</th><th>Sponsoring</th><th>Billetterie</th><th>Merchandising</th><th>Droits TV</th><th>Salaires</th><th>Transferts (net)</th><th>Solde</th><th>Trésorerie après</th></tr></thead>
      <tbody>
        ${club.financeHistory.map(h => `
          <tr>
            <td>${h.month}</td>
            <td>${fmtMoney(h.sponsor)}</td>
            <td>${fmtMoney(h.ticketing)}</td>
            <td>${fmtMoney(h.merchandising || 0)}</td>
            <td>${fmtMoney(h.tvRights || 0)}</td>
            <td>${fmtMoney(h.wages)}</td>
            <td class="${h.transfersNet >= 0 ? "result-good" : "result-bad"}">${fmtMoney(h.transfersNet)}</td>
            <td class="${h.balanceChange >= 0 ? "result-good" : "result-bad"}">${fmtMoney(h.balanceChange)}</td>
            <td>${fmtMoney(h.budgetAfter)}</td>
          </tr>
        `).join("") || `<tr><td colspan="9" class="hint">Pas encore de bilan mensuel.</td></tr>`}
      </tbody>
    </table>
    <p class="hint">Les primes de coupes apparaissent désormais dans les droits TV du mois où elles sont perçues (revenus "autres" fusionnés).</p>
  `;
}

function attachTabHandlers() {
  const advDayBtn = document.getElementById("advance-day");
  if (advDayBtn) advDayBtn.onclick = () => { ui.matchModalShown = false; advanceDay(); saveGame(); render(); };
  const advEventBtn = document.getElementById("advance-event");
  if (advEventBtn) advEventBtn.onclick = () => { ui.matchModalShown = false; advanceToNextEvent(); saveGame(); render(); };
  const nextSeasonBtn = document.getElementById("next-season-btn");
  if (nextSeasonBtn) nextSeasonBtn.onclick = () => { triggerNextSeason(); saveGame(); render(); };

  const kitPicker = document.getElementById("kit-picker");
  if (kitPicker) {
    const club = userClub();
    const colors = ["#B9862E", "#8B3A2B", "#3C6E52", "#2C4A6E", "#6E4A2C", "#4A3C6E", "#1B2A22"];
    kitPicker.innerHTML = colors.map(c => `<button class="avatar-dot ${club.kitColor === c ? "active" : ""}" style="background:${c}" data-kit="${c}"></button>`).join("");
    let chosenKit = club.kitColor;
    kitPicker.querySelectorAll(".avatar-dot").forEach(btn => {
      btn.onclick = () => { kitPicker.querySelectorAll(".avatar-dot").forEach(b => b.classList.remove("active")); btn.classList.add("active"); chosenKit = btn.dataset.kit; };
    });
    const saveIdBtn = document.getElementById("save-identity");
    if (saveIdBtn) saveIdBtn.onclick = () => {
      const newName = document.getElementById("club-name-input").value.trim();
      if (newName) club.name = newName;
      club.kitColor = chosenKit;
      saveGame(); render();
    };
  }
  const saveTacticsBtn = document.getElementById("save-tactics");
  if (saveTacticsBtn) saveTacticsBtn.onclick = () => {
    setUserTactics(document.getElementById("formation-select").value, document.getElementById("mentality-select").value);
    saveGame(); render();
  };

  document.querySelectorAll("[data-listtoggle]").forEach(btn => {
    btn.onclick = () => {
      const p = getPlayer(parseInt(btn.dataset.listtoggle, 10));
      p.listed = !p.listed;
      saveGame();
      render();
    };
  });

  document.querySelectorAll("[data-accept]").forEach(btn => {
    btn.onclick = () => { resolveIncomingOffer(parseInt(btn.dataset.accept, 10), true); saveGame(); render(); };
  });
  document.querySelectorAll("[data-reject]").forEach(btn => {
    btn.onclick = () => { resolveIncomingOffer(parseInt(btn.dataset.reject, 10), false); saveGame(); render(); };
  });

  const q = document.getElementById("market-q");
  if (q) q.oninput = () => { ui.marketFilter.q = q.value; document.getElementById("tab-content").innerHTML = renderMarket(); attachTabHandlers(); };
  const posSel = document.getElementById("market-pos");
  if (posSel) posSel.onchange = () => { ui.marketFilter.pos = posSel.value; document.getElementById("tab-content").innerHTML = renderMarket(); attachTabHandlers(); };

  document.querySelectorAll("[data-negotiate]").forEach(btn => {
    btn.onclick = () => openNegotiation(parseInt(btn.dataset.negotiate, 10));
  });

  document.querySelectorAll("[data-skillup]").forEach(btn => {
    btn.onclick = () => { upgradeSkill(btn.dataset.skillup); saveGame(); render(); };
  });

  document.querySelectorAll("[data-jobaccept]").forEach(btn => {
    btn.onclick = () => { resolveJobOffer(parseInt(btn.dataset.jobaccept, 10), true); saveGame(); render(); };
  });
  document.querySelectorAll("[data-jobreject]").forEach(btn => {
    btn.onclick = () => { resolveJobOffer(parseInt(btn.dataset.jobreject, 10), false); saveGame(); render(); };
  });

  document.querySelectorAll("[data-scout]").forEach(btn => {
    btn.onclick = () => openScoutReport(parseInt(btn.dataset.scout, 10));
  });

  document.querySelectorAll("[data-playercard]").forEach(btn => {
    btn.onclick = () => openPlayerCard(parseInt(btn.dataset.playercard, 10));
  });

  document.querySelectorAll("[data-loanout]").forEach(btn => {
    btn.onclick = () => openLoanOutModal(parseInt(btn.dataset.loanout, 10));
  });
  document.querySelectorAll("[data-loanin]").forEach(btn => {
    btn.onclick = () => openLoanInModal(parseInt(btn.dataset.loanin, 10));
  });
  document.querySelectorAll("[data-buyloan]").forEach(btn => {
    btn.onclick = () => {
      const res = exerciseLoanBuyOption(parseInt(btn.dataset.buyloan, 10));
      if (!res.ok) { alert(res.reason); return; }
      saveGame(); render();
    };
  });
}

// ---------------------------------------------------------------
// RAPPORT DE SCOUTING (style FM, attributs 1-20)
// ---------------------------------------------------------------
function attrLabel(key) {
  return {
    vitesse: "Vitesse", acceleration: "Accélération", tir: "Tir", passe: "Passe", dribble: "Dribble",
    tacle: "Tacle", placement: "Placement", physique: "Physique", endurance: "Endurance", puissance: "Puissance",
    jeuDeTete: "Jeu de tête", technique: "Technique", vision: "Vision", decision: "Décision",
    concentration: "Concentration", leadership: "Leadership", agressivite: "Agressivité",
    sangFroid: "Sang-froid", reflexes: "Réflexes", relance: "Relance",
    defense: "Défense"
  }[key] || key;
}

// ---------------------------------------------------------------
// FICHE JOUEUR COMPLÈTE (attributs 1-20, contrat, salaire, valeur, stats par saison)
// ---------------------------------------------------------------
function openPlayerCard(playerId) {
  const p = getPlayer(playerId);
  if (!p) return;
  let modal = document.getElementById("player-modal");
  if (!modal) return;
  const club = getClub(p.clubId);
  const scouted = scoutedAttributes(p);
  const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
  const attrEntries = Object.entries(scouted);
  const half = Math.ceil(attrEntries.length / 2);
  const col = arr => arr.map(([k, v]) => `
    <div class="wage-bar-wrap">
      <div class="wage-bar-label">${attrLabel(k)} — ${v.value}${v.approx ? " (approx.)" : ""} / 20</div>
      <div class="wage-bar"><div class="wage-bar-fill" style="width:${v.value / 20 * 100}%"></div></div>
    </div>`).join("");

  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal dossier" style="max-width:640px;">
        <h3>${p.firstName} ${p.lastName}</h3>
        <p class="hint">${p.position} · ${p.age} ans · ${p.nationality} · Global ${p.overall} · Potentiel ${p.potential}${p.releaseClause ? " · 🔓 clause" : ""}</p>
        <div class="overview-grid" style="margin-bottom:18px;">
          <div class="stat-block"><span class="stat-num" style="font-size:18px;">${club ? club.name : "Libre"}</span><span class="stat-label">Club</span></div>
          <div class="stat-block"><span class="stat-num" style="font-size:18px;">${p.contractEndYear || "—"}</span><span class="stat-label">Contrat jusqu'en</span></div>
          <div class="stat-block"><span class="stat-num" style="font-size:18px;">${fmtMoney(p.wage)}</span><span class="stat-label">Salaire / mois</span></div>
          <div class="stat-block"><span class="stat-num" style="font-size:18px;">${fmtMoney(p.value)}</span><span class="stat-label">Valeur de transfert</span></div>
        </div>
        <h3 class="panel-subtitle" style="margin-top:0;">Attributs (échelle 1-20)</h3>
        <div class="calendar-columns">
          <div>${col(attrEntries.slice(0, half))}</div>
          <div>${col(attrEntries.slice(half))}</div>
        </div>
        <h3 class="panel-subtitle">Statistiques par saison</h3>
        <table class="squad-table">
          <thead><tr><th>Saison</th><th>Club</th><th>Global</th><th>Matchs</th><th>Buts</th><th>Passes déc.</th></tr></thead>
          <tbody>
            <tr class="me"><td>${state.season.year} (en cours)</td><td>${club ? club.name : "—"}</td><td>${p.overall}</td><td>${st.matches}</td><td>${st.goals}</td><td>${st.assists}</td></tr>
            ${(p.history || []).map(h => `<tr><td>${h.year}</td><td>${h.club}</td><td>${h.overall}</td><td>${h.matches}</td><td>${h.goals}</td><td>${h.assists}</td></tr>`).join("") || ""}
          </tbody>
        </table>
        <p class="hint">Agent : ${p.agent.name} (${p.agent.agency}) · commission ${p.agent.commissionPct}%.${p.releaseClause ? ` Clause libératoire : ${fmtMoney(p.releaseClause)}.` : ""}</p>
        <div class="creation-footer">
          <button class="btn btn-primary" id="close-player-card">Fermer</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-player-card").onclick = () => { modal.innerHTML = ""; };
}
function openScoutReport(playerId) {
  const p = getPlayer(playerId);
  const modal = document.getElementById("scout-modal");
  if (!modal) return;
  const scouted = scoutedAttributes(p);
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal dossier">
        <h3>Rapport de scouting — ${p.firstName} ${p.lastName}</h3>
        <p class="hint">${p.position} · ${p.age} ans · ${p.nationality} · Global ${p.overall} · Potentiel ${p.potential}</p>
        ${Object.entries(scouted).map(([k, v]) => `
          <div class="wage-bar-wrap">
            <div class="wage-bar-label">${attrLabel(k)} — ${v.value}${v.approx ? " (approx.)" : ""} / 20</div>
            <div class="wage-bar"><div class="wage-bar-fill" style="width:${v.value / 20 * 100}%"></div></div>
          </div>
        `).join("")}
        <p class="hint">Agent : ${p.agent.name} (${p.agent.agency}) · commission ${p.agent.commissionPct}%.</p>
        ${p.releaseClause ? `<p class="hint">Clause libératoire : ${fmtMoney(p.releaseClause)}.</p>` : ""}
        <div class="creation-footer">
          <button class="btn btn-primary" id="close-scout">Fermer</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-scout").onclick = () => { modal.innerHTML = ""; };
}

// ---------------------------------------------------------------
// PRÊTS — sortant (un de mes joueurs) et entrant (joueur adverse)
// ---------------------------------------------------------------
function openLoanOutModal(playerId) {
  const p = getPlayer(playerId);
  const modal = document.getElementById("loan-modal");
  if (!modal) return;
  const club = userClub();
  const others = allClubs().filter(c => c.id !== club.id);
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal dossier">
        <h3>Prêter ${p.firstName} ${p.lastName}</h3>
        <label class="field">
          <span>Club receveur</span>
          <select id="loan-target">${others.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
        </label>
        <label class="field">
          <span>Durée du prêt (semaines)</span>
          <input type="number" id="loan-weeks" value="20" min="4" max="40" />
        </label>
        <label class="field">
          <span>Option d'achat (optionnel)</span>
          <input type="number" id="loan-buyoption" value="0" step="10000" />
        </label>
        <div class="creation-footer">
          <button class="btn btn-ghost" id="close-loan">Annuler</button>
          <button class="btn btn-primary" id="confirm-loanout">Confirmer le prêt</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-loan").onclick = () => { modal.innerHTML = ""; };
  document.getElementById("confirm-loanout").onclick = () => {
    const toClubId = parseInt(document.getElementById("loan-target").value, 10);
    const weeks = parseInt(document.getElementById("loan-weeks").value, 10) || 20;
    const buyOption = parseInt(document.getElementById("loan-buyoption").value, 10) || null;
    loanPlayerOut(p, toClubId, weeks, buyOption);
    saveGame();
    modal.innerHTML = "";
    document.getElementById("tab-content").innerHTML = renderSquad();
    attachTabHandlers();
  };
}

function openLoanInModal(playerId) {
  const p = getPlayer(playerId);
  const seller = getClub(p.clubId);
  const modal = document.getElementById("loan-modal");
  if (!modal) return;
  const club = userClub();
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal dossier">
        <h3>Emprunter ${p.firstName} ${p.lastName}</h3>
        <p class="hint">Prêté par ${seller.name}. Une option d'achat facultative peut être fixée dès maintenant.</p>
        <label class="field">
          <span>Durée du prêt (semaines)</span>
          <input type="number" id="loan-weeks" value="20" min="4" max="40" />
        </label>
        <label class="field">
          <span>Option d'achat (optionnel)</span>
          <input type="number" id="loan-buyoption" value="${p.value}" step="10000" />
        </label>
        <div class="creation-footer">
          <button class="btn btn-ghost" id="close-loan">Annuler</button>
          <button class="btn btn-primary" id="confirm-loanin">Confirmer le prêt</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-loan").onclick = () => { modal.innerHTML = ""; };
  document.getElementById("confirm-loanin").onclick = () => {
    const weeks = parseInt(document.getElementById("loan-weeks").value, 10) || 20;
    const buyOption = parseInt(document.getElementById("loan-buyoption").value, 10) || null;
    loanPlayerOut(p, club.id, weeks, buyOption);
    saveGame();
    modal.innerHTML = "";
    document.getElementById("tab-content").innerHTML = renderMarket();
    attachTabHandlers();
  };
}

// ---------------------------------------------------------------
// NÉGOCIATION — style FM : plusieurs tours pour le prix, puis contrat + prime
// ---------------------------------------------------------------
function openNegotiation(playerId) {
  const p = getPlayer(playerId);
  const seller = getClub(p.clubId);
  const modal = document.getElementById("negotiation-modal");
  const neg = { round: 1, maxRounds: 4, agreedFee: null, history: [], viaClause: false, sellOnNote: "" };

  function renderFeeStep(currentAsk, note) {
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal dossier">
          <h3>Négociation du transfert — ${p.firstName} ${p.lastName}</h3>
          <p class="hint">${seller.name} estime ce joueur à environ ${fmtMoney(p.value)}. Tour ${neg.round} / ${neg.maxRounds}. Agent : ${p.agent.name} (${p.agent.agency}, commission ${p.agent.commissionPct}%).</p>
          ${p.releaseClause ? `<p class="hint">Clause libératoire : ${fmtMoney(p.releaseClause)} — payable immédiatement, sans négociation.</p>` : ""}
          ${neg.history.length ? `<div class="log-list">${neg.history.map(h => `<div class="log-row">${h}</div>`).join("")}</div>` : ""}
          <label class="field">
            <span>Votre offre</span>
            <input type="number" id="offer-amount" value="${currentAsk}" step="10000" />
          </label>
          ${note ? `<p class="result-mid">${note}</p>` : ""}
          <div class="creation-footer">
            <button class="btn btn-ghost" id="close-negotiation">Abandonner</button>
            <div style="display:flex;gap:8px;">
              ${p.releaseClause ? `<button class="btn btn-ghost" id="pay-clause">Payer la clause</button>` : ""}
              <button class="btn btn-primary" id="send-offer">Envoyer l'offre</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById("close-negotiation").onclick = () => { modal.innerHTML = ""; };
    const clauseBtn = document.getElementById("pay-clause");
    if (clauseBtn) clauseBtn.onclick = () => {
      const res = payReleaseClause(p.id);
      if (!res.ok) { renderFeeStep(currentAsk, res.reason); return; }
      neg.agreedFee = res.amount;
      neg.viaClause = true;
      neg.history.push(`Clause libératoire payée : ${fmtMoney(res.amount)}.`);
      renderContractStep();
    };
    document.getElementById("send-offer").onclick = () => {
      const amount = parseInt(document.getElementById("offer-amount").value, 10);
      const club = userClub();
      if (amount > club.budget) {
        renderFeeStep(amount, `Budget insuffisant pour cette offre (trésorerie : ${fmtMoney(club.budget)}).`);
        return;
      }
      const res = evaluateOffer(p, amount, true);
      if (res.accept) {
        neg.agreedFee = amount;
        neg.history.push(`Vous : ${fmtMoney(amount)} — accepté par ${seller.name}.`);
        if (Math.random() < 0.25) {
          const pct = randInt(10, 20);
          neg.sellOnPct = pct;
          neg.sellOnNote = `${seller.name} exige une clause de revente future de ${pct}% en cas de nouvelle vente.`;
        }
        renderContractStep();
      } else if (res.counter && neg.round < neg.maxRounds) {
        neg.history.push(`Vous : ${fmtMoney(amount)} — refusé. Contre-offre de ${seller.name} : ${fmtMoney(res.counter)}.`);
        neg.round++;
        renderFeeStep(res.counter);
      } else {
        neg.history.push(`Vous : ${fmtMoney(amount)} — négociation rompue par ${seller.name}.`);
        renderFeeStep(amount, `${seller.name} met fin aux discussions. Revenez plus tard avec une meilleure offre.`);
        document.getElementById("send-offer").disabled = true;
      }
    };
  }

  function renderContractStep() {
    const club = userClub();
    const demand = computeWageDemand(p);
    const commission = Math.round(neg.agreedFee * p.agent.commissionPct / 100 / 500) * 500;
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal dossier">
          <h3>Contrat — ${p.firstName} ${p.lastName}</h3>
          <p class="hint">Transfert accepté à ${fmtMoney(neg.agreedFee)}. Le joueur demande environ ${fmtMoney(demand)} / mois.</p>
          <p class="hint">Commission de l'agent ${p.agent.name} (${p.agent.commissionPct}%) : ${fmtMoney(commission)}, à régler à la signature.</p>
          ${neg.sellOnNote ? `<p class="hint">${neg.sellOnNote}</p>` : ""}
          <label class="field">
            <span>Salaire proposé / mois</span>
            <input type="number" id="wage-offer" value="${demand}" step="500" />
          </label>
          <label class="field">
            <span>Prime à la signature (optionnelle)</span>
            <input type="number" id="bonus-offer" value="0" step="10000" />
          </label>
          <p class="hint">Plafond salarial actuel : ${fmtMoney(club.wageBill)} / ${fmtMoney(club.wageBudgetMonthly)}. Trésorerie : ${fmtMoney(club.budget)}.</p>
          <div id="contract-result"></div>
          <div class="creation-footer">
            <button class="btn btn-ghost" id="close-negotiation">Abandonner</button>
            <button class="btn btn-primary" id="send-contract">Proposer le contrat</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("close-negotiation").onclick = () => { modal.innerHTML = ""; };
    let attempts = 0;
    document.getElementById("send-contract").onclick = () => {
      const wageOffer = parseInt(document.getElementById("wage-offer").value, 10);
      const bonusOffer = parseInt(document.getElementById("bonus-offer").value, 10) || 0;
      const resultBox = document.getElementById("contract-result");

      if (neg.agreedFee + bonusOffer + commission > club.budget) {
        resultBox.innerHTML = `<p class="result-bad">Trésorerie insuffisante pour couvrir le transfert, la prime et la commission de l'agent.</p>`;
        return;
      }
      if (!canAffordWage(club, wageOffer)) {
        resultBox.innerHTML = `<p class="result-bad">Ce salaire dépasserait votre plafond salarial mensuel (${fmtMoney(club.wageBudgetMonthly)}).</p>`;
        return;
      }
      attempts++;
      const contractRes = evaluateContractOffer(p, wageOffer, bonusOffer, demand, true);
      if (contractRes.accept) {
        transferPlayer(p, seller.id, club.id, neg.agreedFee, { wage: wageOffer, bonus: bonusOffer, payCommission: true, newSellOnPct: neg.sellOnPct || null });
        saveGame();
        resultBox.innerHTML = `<p class="result-good">${p.firstName} ${p.lastName} signe pour ${fmtMoney(wageOffer)}/mois${bonusOffer ? ` + ${fmtMoney(bonusOffer)} de prime` : ""} !</p>`;
        document.getElementById("send-contract").disabled = true;
        setTimeout(() => { modal.innerHTML = ""; document.getElementById("tab-content").innerHTML = renderMarket(); attachTabHandlers(); }, 1100);
      } else if (attempts >= 3) {
        resultBox.innerHTML = `<p class="result-bad">${p.firstName} ${p.lastName} refuse ce contrat et le transfert échoue.</p>`;
        document.getElementById("send-contract").disabled = true;
      } else {
        resultBox.innerHTML = `<p class="result-mid">Le joueur juge l'offre insuffisante. Essayez un salaire ou une prime plus élevés (tentative ${attempts}/3).</p>`;
      }
    };
  }

  renderFeeStep(p.value);
}

render();
