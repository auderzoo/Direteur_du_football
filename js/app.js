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
  try {
    if (ui.screen === "menu") return renderMenu();
    if (ui.screen === "creation") return renderCreation();
    if (ui.screen === "clubselect") return renderClubSelect();
    if (ui.screen === "dashboard") {
      if (state && state.ds && state.ds.fired && (!state.userClubIds || state.userClubIds.length === 0)) { ui.screen = "clubselect"; ui.firedNotice = true; return renderClubSelect(); }
      if (state && state.ds) state.ds.fired = false;
      return renderDashboard();
    }
  } catch (e) {
    console.error("Erreur de rendu :", e);
    app.innerHTML = `
      <div style="max-width:700px;margin:60px auto;padding:24px;background:#EDE4D0;color:#20241C;border-radius:4px;font-family:monospace;">
        <h2 style="margin-top:0;">Une erreur est survenue</h2>
        <p>Ouvrez la console du navigateur (F12) pour le détail. Vous pouvez réessayer ou revenir au menu.</p>
        <pre style="white-space:pre-wrap;background:#F4EFE2;padding:12px;border-radius:3px;font-size:12px;">${(e && e.stack) || e}</pre>
        <button class="btn btn-primary btn-small" onclick="ui.screen='menu';render();">Retour au menu</button>
      </div>
    `;
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
      <div class="menu-actions" style="margin-top:10px;">
        <button class="btn btn-ghost btn-small" id="btn-export" ${hasSave() ? "" : "disabled"}>Exporter la sauvegarde</button>
        <button class="btn btn-ghost btn-small" id="btn-import">Importer une sauvegarde</button>
        <input type="file" id="import-file-input" accept="application/json" style="display:none;" />
      </div>
      ${hasSave() ? `<button class="link-danger" id="btn-delete">Supprimer la sauvegarde</button>` : ""}
    </div>
  `;
  document.getElementById("btn-new").onclick = () => { ui.screen = "creation"; render(); };
  const c = document.getElementById("btn-continue");
  if (c) c.onclick = () => { loadGame(); ui.screen = "dashboard"; ui.tab = "overview"; render(); };
  const d = document.getElementById("btn-delete");
  if (d) d.onclick = () => { deleteSave(); render(); };
  const exp = document.getElementById("btn-export");
  if (exp) exp.onclick = () => exportSaveToFile();
  const imp = document.getElementById("btn-import");
  const fileInput = document.getElementById("import-file-input");
  imp.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSaveFromJSON(reader.result);
        ui.screen = "dashboard"; ui.tab = "overview"; render();
      } catch (e) {
        alert("Fichier de sauvegarde invalide.");
      }
    };
    reader.readAsText(file);
  };
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

      <h2 class="section-title">Mode de jeu</h2>
      <div class="dossier">
        <label class="field" style="flex-direction:row;align-items:center;gap:10px;">
          <input type="checkbox" id="mp-toggle" style="width:auto;" />
          <span>Multijoueur local (hotseat) — plusieurs DS se relaient sur le même appareil, chacun avec son propre club</span>
        </label>
        <p class="hint" style="margin:0;">Après avoir cliqué sur « Continuer », vous choisirez un club pour chaque DS (2 à 4). Laissez décoché pour une carrière classique à un seul club.</p>
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
    ui.multiplayer = document.getElementById("mp-toggle").checked;
    ui.mpChosenCount = 0;
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
  const mpActive = ui.multiplayer && (state.userClubIds || []).length < 4;
  const chosenNames = (state.userClubIds || []).map(id => getClub(id)?.name).filter(Boolean);
  app.innerHTML = `
    <div class="clubselect-screen">
      <h2 class="section-title">Choisissez votre club</h2>
      ${ui.firedNotice ? `<p class="result-bad">Vous avez été démis de vos fonctions. Choisissez un nouveau club pour rebondir.</p>` : ""}
      <p class="hint">Un petit club en Division Nationale offre plus de marge de progression ; un club d'Élite, plus de moyens dès le départ.</p>
      ${ui.multiplayer ? `
        <div class="season-banner">
          <strong>Mode hotseat</strong> — DS déjà installés : ${chosenNames.length ? chosenNames.join(", ") : "aucun pour l'instant"} (${chosenNames.length}/4).
          ${chosenNames.length >= 1 ? `<button class="btn btn-primary btn-small" id="btn-start-mp">Lancer la partie avec ces clubs</button>` : ""}
        </div>
      ` : ""}
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
    wrap.innerHTML = Object.keys(country.leagues).sort((a, b) => country.leagues[a].tier - country.leagues[b].tier).map(divKey => {
      const league = country.leagues[divKey];
      return `
        <h3 class="league-name">${league.name}</h3>
        <div class="club-grid">
          ${league.clubs.map(club => `
            <button class="club-card" data-club="${club.id}" ${(state.userClubIds || []).includes(club.id) ? "disabled" : ""}>
              <span style="display:flex;align-items:center;gap:8px;">${clubLogoSvg(club)}<span class="club-name">${club.name}${(state.userClubIds || []).includes(club.id) ? " ✓" : ""}</span></span>
              <span class="club-meta">${club.city} · Réputation ${club.reputation}</span>
              <span class="club-meta">Budget ${fmtMoneyRaw(club.budget, COUNTRIES[countryKey].currency)}</span>
            </button>
          `).join("")}
        </div>
      `;
    }).join("");
    wrap.querySelectorAll(".club-card").forEach(cardEl => {
      cardEl.onclick = () => {
        try {
          setUserClub(parseInt(cardEl.dataset.club, 10));
          ui.firedNotice = false;
          saveGame();
        } catch (e) {
          console.error("Erreur au choix du club :", e);
          alert("Erreur lors du choix du club : " + (e && e.message ? e.message : e));
          return;
        }
        if (mpActive && (state.userClubIds || []).length < 4) {
          render(); // reste sur l'écran de sélection pour le DS suivant
        } else {
          ui.screen = "dashboard";
          ui.tab = "overview";
          render();
        }
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
  const startMpBtn = document.getElementById("btn-start-mp");
  if (startMpBtn) startMpBtn.onclick = () => { ui.screen = "dashboard"; ui.tab = "overview"; render(); };
}

function fmtMoneyRaw(v, cur) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M${cur}`;
  return `${Math.round(v / 1000)} k${cur}`;
}

// ---------------------------------------------------------------
// ÉCRAN : TABLEAU DE BORD
// ---------------------------------------------------------------
function divisionLabel(club) {
  const names = LEAGUE_NAMES[club.countryKey];
  const base = (names && names["d" + club.division]) || (club.division === 1 ? "Élite" : "Nationale");
  return club.group ? `${base} (Gr. ${club.group})` : base;
}
function divisionCount(club) {
  return DIVISION_COUNT[club.countryKey] || 2;
}

function clubLogoSvg(club) {
  const color = club.logoColor || club.kitColor || "#B9862E";
  const shape = club.logoShape || "shield";
  const initials = (club.name || "??").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const shapes = {
    shield: `<path d="M20 2 L36 8 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V8 Z" fill="${color}" />`,
    circle: `<circle cx="20" cy="20" r="18" fill="${color}" />`,
    star: `<path d="M20 2 L24.5 15 L38 15 L27 23 L31 36 L20 28 L9 36 L13 23 L2 15 L15.5 15 Z" fill="${color}" />`,
    diamond: `<path d="M20 2 L38 20 L20 38 L2 20 Z" fill="${color}" />`
  };
  return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    ${shapes[shape] || shapes.shield}
    <text x="20" y="24" font-family="Big Shoulders Display, sans-serif" font-size="13" font-weight="700" fill="#F4EFE2" text-anchor="middle">${initials}</text>
  </svg>`;
}

function renderDashboard() {
  const club = userClub();
  const win = currentWindow();
  const myClubs = (state.userClubIds || []).map(id => getClub(id)).filter(Boolean);
  app.innerHTML = `
    <div class="scoreboard">
      <div class="sb-left">
        ${clubLogoSvg(club)}
        <div>
          <div class="sb-club">${club.name}${club.nickname ? ` "${club.nickname}"` : ""}</div>
          <div class="sb-sub">${COUNTRIES[club.countryKey].label} · ${divisionLabel(club)}</div>
          ${myClubs.length > 1 ? `
            <select id="club-switcher" style="margin-top:6px;font-size:12px;padding:4px 6px;">
              ${myClubs.map(c => `<option value="${c.id}" ${c.id === club.id ? "selected" : ""}>${c.name}</option>`).join("")}
            </select>
          ` : ""}
        </div>
      </div>
      <div class="sb-center">
        <div class="sb-date">${fmtDate(state.date)} · Saison ${state.season.year}</div>
        <div class="sb-window ${win ? "open" : "closed"}">${win ? `${win.name} — ouvert` : "Mercato fermé"}</div>
      </div>
      <div class="sb-search">
        <input type="text" id="global-search" placeholder="Rechercher un joueur ou un club…" autocomplete="off" value="${ui.searchQuery || ""}" />
        ${ui.searchQuery ? renderSearchResults(ui.searchQuery) : ""}
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
        ${tabButton("market", "Recrutement")}
        ${tabButton("scouting", "Scouting")}
        ${tabButton("staff", "Staff")}
        ${tabButton("calendar", "Calendrier")}
        ${tabButton("cups", "Compétitions")}
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
  if (ui.tab === "scouting") content.innerHTML = renderScoutingTab();
  if (ui.tab === "staff") content.innerHTML = renderStaffTab();
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
    const allGoals = [...(r.homeScorers || []), ...(r.awayScorers || [])].sort((a, b) => a.minute - b.minute);
    const cardsTxt = [...(r.homeCards || []), ...(r.awayCards || [])]
      .map(c => `${c.name} ${c.type === "red" ? `🟥${c.minute ? ` (${c.minute}')` : ""}` : c.type === "suspension" ? "🟨🟨 (suspendu)" : `🟨${c.minute ? ` (${c.minute}')` : ""}`}`);

    function ratingClass(v) { return v >= 7.3 ? "result-good" : v < 5.8 ? "result-bad" : ""; }
    function lineupColumn(teamName, lineup, subs, isHome) {
      const subbedOff = new Set((subs || []).map(s => s.outId));
      return `
        <p class="hint" style="margin:0 0 6px;"><strong>${teamName}</strong></p>
        <div class="matchsheet-list">
          ${(lineup || []).map(pl => {
            const sub = (subs || []).find(s => s.outId === pl.id);
            return `<div class="matchsheet-row">
              <span class="ms-pos">${pl.position}</span><span class="ms-name">${pl.name}</span>
              <span class="ms-rating ${ratingClass(pl.rating)}">${pl.rating != null ? pl.rating.toFixed(1) : "—"}</span>
              ${sub ? `<span class="ms-sub-note">⇄ ${sub.minute}' ${sub.inName}</span>` : ""}
            </div>`;
          }).join("")}
          ${(subs || []).map(s => `<div class="matchsheet-row matchsheet-row-in">
              <span class="ms-pos">${s.position}</span><span class="ms-name">↳ ${s.inName}</span>
              <span class="ms-rating ${ratingClass((isHome ? r.homeBench : r.awayBench).find(b => b.id === s.inId) ? (isHome ? r.homeBench : r.awayBench).find(b => b.id === s.inId).rating : null)}">${(() => { const b = (isHome ? r.homeBench : r.awayBench).find(bb => bb.id === s.inId); return b && b.rating != null ? b.rating.toFixed(1) : "—"; })()}</span>
              <span class="ms-sub-note">entré à la ${s.minute}'</span>
            </div>`).join("")}
        </div>`;
    }

    modal.innerHTML = fmMatchHTML(r);
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

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return "";
  const clubs = allClubs().filter(c => c.name.toLowerCase().includes(q)).slice(0, 6);
  const players = [];
  allClubs().forEach(c => c.players.forEach(p => {
    if (players.length >= 8) return;
    const full = `${p.firstName} ${p.lastName}`.toLowerCase();
    if (full.includes(q)) players.push({ p, club: c });
  }));
  if (!clubs.length && !players.length) return `<div class="search-results"><p class="hint" style="padding:10px;">Aucun résultat.</p></div>`;
  return `
    <div class="search-results">
      ${clubs.length ? `<div class="search-group-label">Clubs</div>` + clubs.map(c => `<button class="search-result-row" data-searchclub="${c.id}">${c.name} <span class="hint">${COUNTRIES[c.countryKey].label} · ${divisionLabel(c)}</span></button>`).join("") : ""}
      ${players.length ? `<div class="search-group-label">Joueurs</div>` + players.map(({ p, club }) => `<button class="search-result-row" data-searchplayer="${p.id}">${p.firstName} ${p.lastName} <span class="hint">${p.position} · ${club.name}</span></button>`).join("") : ""}
    </div>
  `;
}

function reputationSparkline(history) {
  const data = (history && history.length ? history : [{ year: 1, reputation: 30 }]).slice(-15);
  const w = 560, h = 90, pad = 10;
  const maxYear = data.length - 1 || 1;
  const points = data.map((d, i) => {
    const x = pad + (i / maxYear) * (w - pad * 2);
    const y = h - pad - (d.reputation / 100) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = data[data.length - 1];
  return `
    <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="background:var(--chalk);border-radius:3px;">
      <polyline points="${points}" fill="none" stroke="var(--brass-dark)" stroke-width="2.5" />
      ${data.map((d, i) => {
        const x = pad + (i / maxYear) * (w - pad * 2);
        const y = h - pad - (d.reputation / 100) * (h - pad * 2);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--brass)"><title>Saison ${d.year} : ${d.reputation}</title></circle>`;
      }).join("")}
    </svg>
    <p class="hint" style="margin:4px 0 0;">Réputation actuelle : ${last.reputation}/100 (saison ${last.year})</p>
  `;
}

function tabButton(key, label) {
  const icons = {
    overview: "📊", squad: "👥", market: "💱", calendar: "📅",
    cups: "🏆", club: "🏟️", inbox: "📥", finance: "💰", scouting: "🔭", staff: "🧑‍🏫"
  };
  return `<button class="tab-btn ${ui.tab === key ? "active" : ""}" data-tab="${key}"><span class="tab-icon">${icons[key] || "•"}</span>${label}</button>`;
}

function renderOverview() {
  const club = userClub();
  const pendingOffers = state.inbox.filter(o => !o.resolved);
  const wagePct = Math.round((club.wageBill / club.wageBudgetMonthly) * 100);
  const next = getNextFixture(club);
  const form = getRecentForm(club, 5);
  const rival = getRivalClub(club);
  const objectiveDone = club.objectiveProgressHint || null;

  const formBadges = form.length
    ? form.map(f => `<span class="form-badge form-${f.result}" title="${f.gf}-${f.ga} vs ${f.opponent ? f.opponent.name : "?"}">${f.result}</span>`).join("")
    : `<span class="hint">Aucun match joué pour l'instant.</span>`;

  return `
    <h2 class="panel-title">Vue d'ensemble — ${fmtDate(state.date)}</h2>
    <p class="hint">${dsAvatarEmoji(state.ds.avatarSeed)} ${state.ds.name} (${COUNTRIES[state.ds.nationality] ? COUNTRIES[state.ds.nationality].label : ""}) · ${DS_SPECIALIZATIONS[state.ds.specialization] ? DS_SPECIALIZATIONS[state.ds.specialization].label : ""}${state.ds.failStreak ? ` · <span class="result-bad">objectif manqué ${state.ds.failStreak} saison(s) de suite</span>` : ""}</p>

    <div class="overview-hero">
      <div class="hero-card">
        <div class="hero-card-title">Prochain match</div>
        ${next ? `
          <div class="hero-card-main">${next.home.id === club.id ? "🏠" : "✈️"} ${next.home.name === club.name ? "" : ""}${next.home.name} <span class="hint">vs</span> ${next.away.name}</div>
          <div class="hero-card-sub">${fmtDate(new Date(next.date))} · ${divisionLabel(club)}</div>
        ` : `<div class="hero-card-main">Aucun match programmé</div>`}
      </div>
      <div class="hero-card">
        <div class="hero-card-title">Forme récente</div>
        <div class="hero-card-main">${formBadges}</div>
        <div class="hero-card-sub">${club.formStreak && club.formStreak.type ? `Série en cours : ${club.formStreak.count} ${club.formStreak.type === "W" ? "victoire(s)" : club.formStreak.type === "L" ? "défaite(s)" : "nul(s)"}` : "Pas de série en cours"}</div>
      </div>
      <div class="hero-card">
        <div class="hero-card-title">Objectif de la saison</div>
        <div class="hero-card-main">${club.objectiveLabel || "—"}</div>
        <div class="hero-card-sub">Réputation DS : ${state.ds.reputation}/100${rival ? ` · Rival : ${rival.name}` : ""}</div>
      </div>
    </div>

    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${club.players.length}</span><span class="stat-label">Joueurs sous contrat</span></div>
      <div class="stat-block"><span class="stat-num">${club.won}-${club.draw}-${club.lost}</span><span class="stat-label">V-N-D (saison)</span></div>
      <div class="stat-block"><span class="stat-num">${pendingOffers.length}</span><span class="stat-label">Offres en attente</span></div>
      <div class="stat-block"><span class="stat-num">${wagePct}%</span><span class="stat-label">Masse salariale utilisée</span></div>
    </div>

    <h3 class="panel-subtitle">Journal du club <button class="link-danger" style="margin:0 0 0 8px;" id="toggle-notif-settings">réglages des notifications</button></h3>
    ${ui.showNotifSettings ? `
      <div class="dossier" id="notif-settings-box" style="margin-bottom:16px;">
        <label class="field" style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="notif-blessures" style="width:auto;" ${state.notifSettings.blessures ? "checked" : ""} /><span>Blessures et cartons</span></label>
        <label class="field" style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="notif-transferts" style="width:auto;" ${state.notifSettings.transferts ? "checked" : ""} /><span>Transferts et prêts</span></label>
        <label class="field" style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="notif-resultats" style="width:auto;" ${state.notifSettings.resultats ? "checked" : ""} /><span>Résultats de match</span></label>
      </div>
    ` : ""}
    <div class="log-list">
      ${filterLogEntries(state.log).slice(0, 14).map(l => `<div class="log-row"><span class="log-date">${l.date}</span>${l.text}</div>`).join("") || `<p class="hint">Rien à signaler pour l'instant (ou masqué par vos réglages de notifications).</p>`}
    </div>
  `;
}

function filterLogEntries(entries) {
  const s = state.notifSettings || { blessures: true, transferts: true, resultats: true };
  return entries.filter(l => {
    const t = l.text.toLowerCase();
    if (!s.blessures && (t.includes("bless") || t.includes("carton") || t.includes("suspendu"))) return false;
    if (!s.transferts && (t.includes("transfert") || t.includes("prêt") || t.includes("prêté") || t.includes("clause") || t.includes("signe"))) return false;
    if (!s.resultats && t.startsWith("résultat")) return false;
    return true;
  });
}

function renderSquad() {
  const club = userClub();
  const rows = [...club.players].filter(p => !p.onLoan).sort((a, b) => b.overall - a.overall);
  const loanedIn = club.players.filter(p => p.onLoan && p.onLoan.toClubId === club.id);
  const wagePct = clampPct(Math.round((club.wageBill / club.wageBudgetMonthly) * 100));
  return `
    <div class="fm-dark fm-panel">
    <h2 class="fm-title">Effectif <span>${club.name} · ${rows.length} joueurs</span></h2>
    <div class="wage-bar-wrap">
      <div class="wage-bar-label">Masse salariale mensuelle : ${fmtMoney(club.wageBill)} / ${fmtMoney(club.wageBudgetMonthly)}</div>
      <div class="wage-bar"><div class="wage-bar-fill ${wagePct >= 95 ? "danger" : wagePct >= 75 ? "warn" : ""}" style="width:${wagePct}%"></div></div>
    </div>
    ${fmSquadTableHTML(rows, state.date.toISOString().slice(0, 10))}
    ${(() => {
      const unavailable = rows.filter(p => (p.injuredUntil && p.injuredUntil >= state.date.toISOString().slice(0, 10)) || p.suspendedMatches > 0);
      if (!unavailable.length) return "";
      return `
        <h3 class="panel-subtitle">Centre médical &amp; discipline</h3>
        <table class="squad-table">
          <thead><tr><th>Joueur</th><th>Poste</th><th>Motif</th><th>Retour estimé</th></tr></thead>
          <tbody>
            ${unavailable.map(p => {
              const injured = p.injuredUntil && p.injuredUntil >= state.date.toISOString().slice(0, 10);
              return `<tr class="injured-row"><td>${p.firstName} ${p.lastName}</td><td>${p.position}</td>
                <td>${injured ? "Blessure" : "Suspension"}</td>
                <td>${injured ? fmtDate(new Date(p.injuredUntil)) : `${p.suspendedMatches} match(s) restant(s)`}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      `;
    })()}
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
    </div>
    <div id="scout-modal"></div>
    <div id="loan-modal"></div>
  `;
}
function clampPct(v) { return Math.max(0, Math.min(100, v)); }

function renderCalendar() {
  const club = userClub();
  const country = state.countries[club.countryKey];
  const leagueKey = clubLeagueKey(club);
  const league = country.leagues[leagueKey];
  const standings = [...league.clubs].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

  // classement consulté (par défaut celui du club, mais navigable vers n'importe quel pays/division)
  ui.standingsCountry = ui.standingsCountry || club.countryKey;
  ui.standingsDiv = ui.standingsDiv || leagueKey;
  if (!state.countries[ui.standingsCountry]) ui.standingsCountry = club.countryKey;
  if (!state.countries[ui.standingsCountry].leagues[ui.standingsDiv]) ui.standingsDiv = "d1";
  const viewedCountry = state.countries[ui.standingsCountry];
  const viewedLeague = viewedCountry.leagues[ui.standingsDiv];
  const viewedStandings = getLeagueStandings(ui.standingsCountry, ui.standingsDiv);
  const viewedDivCount = DIVISION_COUNT[ui.standingsCountry] || 2;
  const viewedDivNum = parseInt(ui.standingsDiv.slice(1), 10);
  const isOwnLeague = ui.standingsCountry === club.countryKey && ui.standingsDiv === leagueKey;

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
        <button class="btn btn-ghost" id="advance-week">Simulation rapide (7 jours)</button>
      </div>
    `}

    <div class="calendar-columns">
      <div>
        <h3 class="panel-subtitle">Prochains matchs</h3>
        <div class="fixture-list">
          ${nextFixtures.map(f => `
            <div class="fixture-row">
              <span class="fixture-date">${fmtDate(new Date(f.date))}</span>${f.home.name} — ${f.away.name}
              <button class="link-danger" style="margin:0 0 0 8px;font-size:12px;" data-h2h="${f.home.id}:${f.away.id}">confrontations directes</button>
            </div>
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
        <div class="market-filters" style="margin-bottom:12px;">
          <select id="standings-country">
            ${Object.values(state.countries).map(c => `<option value="${c.key}" ${c.key === ui.standingsCountry ? "selected" : ""}>${c.label}</option>`).join("")}
          </select>
          <select id="standings-div">
            ${Object.keys(viewedCountry.leagues).sort((a, b) => viewedCountry.leagues[a].tier - viewedCountry.leagues[b].tier || a.localeCompare(b)).map(dk => `<option value="${dk}" ${dk === ui.standingsDiv ? "selected" : ""}>${viewedCountry.leagues[dk].name}</option>`).join("")}
          </select>
        </div>
        <table class="squad-table standings">
          <thead><tr><th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Pts</th></tr></thead>
          <tbody>
            ${viewedStandings.map((c, i) => `
              <tr class="${c.id === club.id ? "me" : ""} ${viewedDivNum === 1 && i >= viewedStandings.length - 2 ? "relegation" : ""} ${viewedDivNum === viewedDivCount && i < 2 ? "promotion" : ""} ${viewedDivNum !== 1 && viewedDivNum !== viewedDivCount ? (i >= viewedStandings.length - 2 ? "relegation" : i < 2 ? "promotion" : "") : ""}">
                <td>${i + 1}</td><td>${c.name}</td><td>${c.played}</td><td>${c.won}</td><td>${c.draw}</td><td>${c.lost}</td><td>${c.gf}</td><td>${c.ga}</td><td>${c.points}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p class="hint">${
          viewedDivNum === 1 ? "Les 2 dernières places descendent en division inférieure."
          : viewedDivNum === viewedDivCount ? "Les 2 premières places montent en division supérieure."
          : "Les 2 premières places montent, les 2 dernières descendent."
        }${isOwnLeague ? "" : " (vous consultez un autre championnat)"}</p>

        ${viewedLeague.lastSeasonBestPlayer ? `<p class="hint">🏅 Meilleur joueur la saison passée : <strong>${viewedLeague.lastSeasonBestPlayer.name}</strong> (${viewedLeague.lastSeasonBestPlayer.club}) — ${viewedLeague.lastSeasonBestPlayer.goals} buts, ${viewedLeague.lastSeasonBestPlayer.assists} passes déc.</p>` : ""}

        <h3 class="panel-subtitle">Meilleurs buteurs</h3>
        <table class="squad-table">
          <thead><tr><th>Joueur</th><th>Club</th><th>Buts</th><th>Passes déc.</th></tr></thead>
          <tbody>
            ${getLeagueTopScorers(ui.standingsCountry, ui.standingsDiv, 8).map(s => `<tr><td>${s.name}</td><td>${s.club}</td><td>${s.goals}</td><td>${s.assists}</td></tr>`).join("") || `<tr><td colspan="4" class="hint">Pas encore de buts marqués cette saison.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCups() {
  const club = userClub();
  const country = state.countries[club.countryKey];
  const leagueKey = clubLeagueKey(club);
  const league = country.leagues[leagueKey];
  const standings = getLeagueStandings(club.countryKey, leagueKey);
  const rank = standings.findIndex(c => c.id === club.id) + 1;
  const nationalCup = state.cups.national[club.countryKey];
  const continentalCup = state.cups.continental;

  function cupStatusCard(label, cup) {
    const st = clubCupStatus(cup, club.id);
    if (!cup) return `<div class="hero-card"><div class="hero-card-title">${label}</div><p class="hint" style="margin:0;">Compétition non disputée cette saison (pas assez de pays sélectionnés).</p></div>`;
    if (!st) return `<div class="hero-card"><div class="hero-card-title">${label}</div><p class="hint" style="margin:0;">${club.name} n'est pas engagé cette saison.</p></div>`;
    if (st.state === "champion") return `<div class="hero-card" style="border-left-color:var(--brass);"><div class="hero-card-title">${label}</div><div class="hero-card-main">🏆 Vainqueur !</div></div>`;
    if (st.state === "eliminated") {
      const home = getClub(st.match.home), away = getClub(st.match.away);
      return `<div class="hero-card"><div class="hero-card-title">${label}</div><div class="hero-card-main">Éliminé — ${cupRoundLabel(cup.rounds[st.roundIdx].matches.length)}</div>
        <div class="hero-card-sub">${home.name} ${st.match.homeGoals} - ${st.match.awayGoals} ${away.name}${st.match.penalties ? " (tab)" : ""}</div></div>`;
    }
    if (st.state === "scheduled") {
      const home = getClub(st.match.home), away = getClub(st.match.away);
      const opp = home.id === club.id ? away : home;
      return `<div class="hero-card" style="border-left-color:var(--brass);"><div class="hero-card-title">${label}</div><div class="hero-card-main">${cupRoundLabel(cup.rounds[st.roundIdx].matches.length)}</div>
        <div class="hero-card-sub">${home.id === club.id ? "🏠" : "✈️"} vs ${opp.name} — ${fmtDate(new Date(cup.rounds[st.roundIdx].date))}</div></div>`;
    }
    return `<div class="hero-card"><div class="hero-card-title">${label}</div><div class="hero-card-main">Qualifié</div><div class="hero-card-sub">En attente du tirage du tour suivant</div></div>`;
  }

  function renderBracket(cup) {
    if (!cup) return "";
    const round = cup.rounds[cup.rounds.length - 1];
    const label = cupRoundLabel(round.matches.length);
    return `
      <p class="hint">Tour en cours : ${label} — ${fmtDate(new Date(round.date))}${cup.champion ? ` · Vainqueur : ${getClub(cup.champion).name}` : ""}</p>
      <div class="fixture-list">
        ${round.matches.map(m => {
          const home = getClub(m.home), away = getClub(m.away);
          if (!home || !away) return "";
          const isUser = home.id === club.id || away.id === club.id;
          const score = m.played ? `${m.homeGoals} - ${m.awayGoals}` : "à jouer";
          return `<div class="fixture-row ${isUser ? "me-row" : ""}">${clubLogoSvg(home)} <span style="margin:0 6px;">${home.name}</span> <strong>${score}</strong> <span style="margin:0 6px;">${away.name}</span> ${clubLogoSvg(away)}</div>`;
        }).join("")}
      </div>`;
  }

  return `
    <h2 class="panel-title">Compétitions — ${club.name}</h2>
    <p class="hint">Toutes les compétitions dans lesquelles votre club est engagé cette saison.</p>
    <div class="overview-hero" style="grid-template-columns:repeat(3,1fr);">
      <div class="hero-card" style="border-left-color:var(--brass);">
        <div class="hero-card-title">${league.name}</div>
        <div class="hero-card-main">${rank}${rank === 1 ? "re" : "e"} place</div>
        <div class="hero-card-sub">${club.played} matchs · ${club.points} pts</div>
      </div>
      ${cupStatusCard(nationalCup ? nationalCup.label : "Coupe Nationale", nationalCup)}
      ${cupStatusCard("Coupe Continentale", continentalCup)}
    </div>

    <h3 class="panel-subtitle">${league.name} — classement complet</h3>
    <div class="table-scroll"><table class="squad-table standings">
      <thead><tr><th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Pts</th></tr></thead>
      <tbody>
        ${standings.map((c, i) => `<tr class="${c.id === club.id ? "me" : ""}"><td>${i + 1}</td><td>${clubLogoSvg(c)} ${c.name}</td><td>${c.played}</td><td>${c.won}</td><td>${c.draw}</td><td>${c.lost}</td><td>${c.gf}</td><td>${c.ga}</td><td>${c.points}</td></tr>`).join("")}
      </tbody>
    </table></div>

    ${nationalCup ? `<h3 class="panel-subtitle">${nationalCup.label}</h3>${renderBracket(nationalCup)}` : ""}
    ${continentalCup ? `<h3 class="panel-subtitle">Coupe Continentale</h3>${renderBracket(continentalCup)}` : ""}
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
      <label class="field">
        <span>Surnom</span>
        <input type="text" id="club-nickname-input" value="${club.nickname || ""}" maxlength="24" placeholder="ex. Les Lions" />
      </label>
      <label class="field">
        <span>Hymne</span>
        <input type="text" id="club-anthem-input" value="${club.anthem || ""}" maxlength="60" placeholder="ex. Debout, fiers et unis !" />
      </label>
      <div class="field">
        <span>Couleur du maillot</span>
        <div class="avatar-picker" id="kit-picker"></div>
      </div>
      <div class="field">
        <span>Logo</span>
        <div class="avatar-picker" id="logo-shape-picker"></div>
        <div style="margin-top:8px;">${clubLogoSvg(club)}</div>
      </div>
      <button class="btn btn-primary btn-small" id="save-identity">Enregistrer</button>
    </div>

    <h3 class="panel-subtitle">Records du club</h3>
    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num" style="font-size:16px;">${club.records && club.records.biggestWin ? `${club.records.biggestWin.score} vs ${club.records.biggestWin.opponent}` : "—"}</span><span class="stat-label">Plus large victoire</span></div>
      <div class="stat-block"><span class="stat-num" style="font-size:16px;">${club.records && club.records.topScorerName ? club.records.topScorerName : "—"}</span><span class="stat-label">Meilleur buteur (une saison)</span></div>
      <div class="stat-block"><span class="stat-num">${club.records ? club.records.topScorerGoals : 0}</span><span class="stat-label">Buts sur une saison</span></div>
      <div class="stat-block"><span class="stat-num" style="font-size:16px;">${(() => { const r = getRivalClub(club); return r ? r.name : "Aucun identifié"; })()}</span><span class="stat-label">Rival historique</span></div>
    </div>

    <h3 class="panel-subtitle">Palmarès</h3>
    ${(club.trophies || []).length ? `
      <table class="squad-table">
        <thead><tr><th>Saison</th><th>Trophée</th></tr></thead>
        <tbody>
          ${club.trophies.map(t => `<tr><td>${t.year}</td><td>🏆 ${t.competition}</td></tr>`).join("")}
        </tbody>
      </table>
    ` : `<p class="hint">Aucun trophée pour l'instant — à vous d'écrire l'histoire du club.</p>`}

    <h3 class="panel-subtitle">Propriétaire</h3>
    <div class="dossier">
      <p style="margin:0 0 4px;font-weight:600;">${club.owner ? club.owner.label : "—"}${club.owner && club.owner.forSale ? ` <span class="result-bad">— club à vendre</span>` : ""}</p>
      <p class="hint" style="margin:0;">${club.owner ? club.owner.description : ""}</p>
      <p class="hint" style="margin:6px 0 0;">Patience : ${club.owner ? Math.max(0, club.owner.patience - club.owner.badSeasons) : "—"} / ${club.owner ? club.owner.patience : "—"} saison(s) restantes avant mise en vente${club.owner && club.owner.badSeasons > 0 ? ` (${club.owner.badSeasons} saison(s) décevante(s) déjà comptabilisée(s))` : ""}.</p>
    </div>

    <h3 class="panel-subtitle">Carrière de ${state.ds.name}</h3>
    <div class="dossier">
      <p class="hint" style="margin:0 0 8px;">Réputation dans le temps</p>
      ${reputationSparkline(state.ds.reputationHistory)}
      ${(state.ds.careerHistory || []).length ? `
        <table class="squad-table" style="margin-top:14px;">
          <thead><tr><th>Saison</th><th>Club</th><th>Division</th><th>Pays</th><th>Classement</th><th>Objectif</th></tr></thead>
          <tbody>
            ${state.ds.careerHistory.slice(0, 12).map(h => `<tr><td>${h.year}</td><td>${h.club}</td><td>${h.division}</td><td>${h.country}</td><td>${h.rank}ᵉ</td><td class="${h.success ? "result-good" : "result-bad"}">${h.success ? "✓ atteint" : "✗ manqué"}</td></tr>`).join("")}
          </tbody>
        </table>
      ` : `<p class="hint">Première saison — l'histoire commence.</p>`}
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
  const pendingOffers = state.inbox.filter(o => !o.resolved && o.type !== "job_offer" && o.type !== "player_event");
  const resolvedOffers = state.inbox.filter(o => o.resolved && o.type !== "job_offer" && o.type !== "player_event").slice(0, 8);
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
            <div class="offer-row priority-high">
              <div>
                <span class="priority-chip priority-chip-high">Opportunité de carrière</span><br/>
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

    ${renderPlayerEventsSection()}

    <h3 class="panel-subtitle">Offres reçues pour vos joueurs listés</h3>
    ${pendingOffers.length ? `
      <div class="offer-list">
        ${pendingOffers.map(o => {
          const p = getPlayer(o.playerId);
          const buyer = getClub(o.fromClubId);
          if (!p || !buyer) return "";
          const ratio = o.amount / Math.max(1, p.value);
          const priority = ratio >= 0.9 ? "high" : ratio >= 0.6 ? "medium" : "low";
          const priorityLabel = priority === "high" ? "Offre excellente" : priority === "medium" ? "Offre correcte" : "Offre faible";
          return `
            <div class="offer-row priority-${priority}">
              <div>
                <span class="priority-chip priority-chip-${priority}">${priorityLabel}</span><br/>
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
  const totalDebt = (club.loans || []).reduce((s, l) => s + l.remaining, 0);
  return `
    <h2 class="panel-title">Finances — ${club.name}</h2>
    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.budget)}</span><span class="stat-label">Trésorerie</span></div>
      <div class="stat-block"><span class="stat-num">${club.sponsorContract ? fmtMoney(club.sponsorContract.amount) : fmtMoney(club.sponsorIncome)}</span><span class="stat-label">Sponsoring / mois</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.wageBill)}</span><span class="stat-label">Salaires / mois</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(club.wageBudgetMonthly)}</span><span class="stat-label">Plafond salarial</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(getTransferBudget(club))}</span><span class="stat-label">Budget de transferts</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(wageBudgetRemaining(club))}</span><span class="stat-label">Marge salariale / mois</span></div>
      <div class="stat-block"><span class="stat-num">${fmtMoney(staffWageBill(club))}</span><span class="stat-label">Staff / mois</span></div>
      <div class="stat-block"><span class="stat-num ${totalDebt > 0 ? "result-bad" : ""}">${fmtMoney(totalDebt)}</span><span class="stat-label">Dette bancaire</span></div>
    </div>

    <h3 class="panel-subtitle">Sponsor maillot</h3>
    <div class="dossier">
      ${club.sponsorContract ? `<p class="hint" style="margin-top:0;">Contrat actuel : <strong>${club.sponsorContract.name}</strong> — ${fmtMoney(club.sponsorContract.amount)}/mois, encore ${club.sponsorContract.monthsLeft} mois.</p>` : ""}
      ${club.pendingSponsorOffers ? `
        <p class="hint">Votre contrat arrive à échéance — choisissez votre prochain sponsor :</p>
        <div class="calendar-columns" style="grid-template-columns:repeat(3,1fr);">
          ${club.pendingSponsorOffers.map((o, i) => `
            <div class="stat-block" style="text-align:left;">
              <strong>${o.name}</strong>
              <p class="hint" style="margin:6px 0;">${fmtMoney(o.amount)}/mois<br/>Durée : ${o.months} mois<br/>Total : ${fmtMoney(o.amount * o.months)}</p>
              <button class="btn btn-primary btn-small" data-sponsorchoice="${i}">Signer</button>
            </div>
          `).join("")}
        </div>
      ` : `<p class="hint">Pas de nouvelle offre pour l'instant — revenez à l'échéance du contrat.</p>`}
    </div>

    ${(club.loans || []).length ? `
      <h3 class="panel-subtitle">Emprunt en cours</h3>
      <div class="dossier">
        <table class="squad-table">
          <thead><tr><th>Capital initial</th><th>Restant dû</th><th>Mensualité</th><th>Mois restants</th></tr></thead>
          <tbody>
            ${club.loans.map(l => `<tr><td>${fmtMoney(l.principal)}</td><td>${fmtMoney(l.remaining)}</td><td>${fmtMoney(l.monthlyPayment)}</td><td>${l.monthsLeft}</td></tr>`).join("")}
          </tbody>
        </table>
        <p class="hint" style="margin:8px 0 0;">Contracté par la présidence du club ; vous ne gérez pas ces emprunts en tant que directeur sportif, mais leurs mensualités pèsent sur la trésorerie.</p>
      </div>
    ` : `<p class="hint">Les emprunts bancaires relèvent de la présidence du club, pas du directeur sportif : vous ne pouvez pas en contracter depuis cet écran.</p>`}

    <div class="overview-grid">
      <div class="stat-block"><span class="stat-num">${(club.stadiumCapacity || 0).toLocaleString("fr-FR")}</span><span class="stat-label">Capacité du stade</span></div>
      <div class="stat-block"><span class="stat-num">${club.lastAttendance ? club.lastAttendance.toLocaleString("fr-FR") : "—"}</span><span class="stat-label">Dernière affluence estimée</span></div>
      <div class="stat-block"><span class="stat-num">${club.trainingCenterLevel || 1}/5</span><span class="stat-label">Niveau du centre de formation</span></div>
    </div>

    <h3 class="panel-subtitle">Infrastructures</h3>
    <div class="dossier">
      <div class="calendar-columns">
        <div>
          <p class="hint" style="margin-top:0;">Agrandir le stade augmente durablement la billetterie.</p>
          <label class="field">
            <span>Places supplémentaires</span>
            <input type="number" id="stadium-extra-seats" value="1000" min="500" step="500" />
          </label>
          <p class="hint" id="stadium-cost-preview"></p>
          <button class="btn btn-primary btn-small" id="invest-stadium">Lancer les travaux</button>
        </div>
        <div>
          <p class="hint" style="margin-top:0;">Un centre de formation plus développé produit des jeunes plus nombreux et mieux formés (niveau ${club.trainingCenterLevel || 1}/5).</p>
          <p class="hint">Coût du niveau suivant : ${(club.trainingCenterLevel || 1) >= 5 ? "niveau maximum atteint" : fmtMoney(trainingCenterCost(club))}</p>
          <button class="btn btn-primary btn-small" id="invest-training" ${(club.trainingCenterLevel || 1) >= 5 ? "disabled" : ""}>Améliorer le centre de formation</button>
        </div>
      </div>
      <p class="hint" id="infra-result" style="margin:10px 0 0;"></p>
    </div>
    <h3 class="panel-subtitle">Historique mensuel</h3>
    <table class="squad-table">
      <thead><tr><th>Mois</th><th>Sponsoring</th><th>Billetterie</th><th>Merchandising</th><th>Droits TV</th><th>Salaires</th><th>Staff</th><th>Transferts (net)</th><th>Solde</th><th>Trésorerie après</th></tr></thead>
      <tbody>
        ${club.financeHistory.map(h => `
          <tr>
            <td>${h.month}</td>
            <td>${fmtMoney(h.sponsor)}</td>
            <td>${fmtMoney(h.ticketing)}</td>
            <td>${fmtMoney(h.merchandising || 0)}</td>
            <td>${fmtMoney(h.tvRights || 0)}</td>
            <td>${fmtMoney(h.wages)}</td>
            <td>${fmtMoney(h.staffWages || 0)}</td>
            <td class="${h.transfersNet >= 0 ? "result-good" : "result-bad"}">${fmtMoney(h.transfersNet)}</td>
            <td class="${h.balanceChange >= 0 ? "result-good" : "result-bad"}">${fmtMoney(h.balanceChange)}</td>
            <td>${fmtMoney(h.budgetAfter)}</td>
          </tr>
        `).join("") || `<tr><td colspan="10" class="hint">Pas encore de bilan mensuel.</td></tr>`}
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
  const advWeekBtn = document.getElementById("advance-week");
  if (advWeekBtn) advWeekBtn.onclick = () => {
    ui.matchModalShown = false;
    const res = advanceMultipleDays(7);
    saveGame();
    render();
    if (res.matchesPlayed || res.offersReceived) {
      alert(`Simulation rapide : ${res.matchesPlayed} match(s) joué(s), ${res.offersReceived} nouvelle(s) offre(s) en boîte de réception.`);
    }
  };
  document.querySelectorAll("[data-h2h]").forEach(btn => {
    btn.onclick = () => {
      const [id1, id2] = btn.dataset.h2h.split(":").map(x => parseInt(x, 10));
      openH2HModal(id1, id2);
    };
  });

  const clubSwitcher = document.getElementById("club-switcher");
  if (clubSwitcher) clubSwitcher.onchange = () => {
    switchActiveClub(parseInt(clubSwitcher.value, 10));
    ui.tab = "overview";
    saveGame();
    render();
  };

  const standingsCountrySel = document.getElementById("standings-country");
  if (standingsCountrySel) standingsCountrySel.onchange = () => {
    ui.standingsCountry = standingsCountrySel.value;
    ui.standingsDiv = "d1";
    render();
  };
  const standingsDivSel = document.getElementById("standings-div");
  if (standingsDivSel) standingsDivSel.onchange = () => {
    ui.standingsDiv = standingsDivSel.value;
    render();
  };

  const searchInput = document.getElementById("global-search");
  const stadiumInput = document.getElementById("stadium-extra-seats");
  if (stadiumInput) {
    const club = userClub();
    const updatePreview = () => {
      const seats = parseInt(stadiumInput.value, 10) || 0;
      document.getElementById("stadium-cost-preview").textContent = `Coût estimé : ${fmtMoney(stadiumUpgradeCost(club, seats))}`;
    };
    stadiumInput.oninput = updatePreview;
    updatePreview();
    document.getElementById("invest-stadium").onclick = () => {
      const seats = parseInt(stadiumInput.value, 10) || 0;
      const res = investInStadium(club.id, seats);
      const box = document.getElementById("infra-result");
      box.textContent = res.ok ? `Travaux lancés : +${seats.toLocaleString("fr-FR")} places pour ${fmtMoney(res.cost)}.` : `Budget insuffisant (${fmtMoney(res.cost || 0)} nécessaires).`;
      box.className = res.ok ? "hint result-good" : "hint result-bad";
      saveGame();
      if (res.ok) { document.getElementById("tab-content").innerHTML = renderFinance(); attachTabHandlers(); }
    };
    const trainingBtn = document.getElementById("invest-training");
    if (trainingBtn) trainingBtn.onclick = () => {
      const res = investInTrainingCenter(club.id);
      const box = document.getElementById("infra-result");
      box.textContent = res.ok ? `Centre de formation amélioré (niveau ${club.trainingCenterLevel}).` : res.reason === "max" ? "Niveau maximum déjà atteint." : `Budget insuffisant (${fmtMoney(res.cost || 0)} nécessaires).`;
      box.className = res.ok ? "hint result-good" : "hint result-bad";
      saveGame();
      if (res.ok) { document.getElementById("tab-content").innerHTML = renderFinance(); attachTabHandlers(); }
    };
  }
  document.querySelectorAll("[data-sponsorchoice]").forEach(btn => {
    btn.onclick = () => {
      const club = userClub();
      chooseSponsorOffer(club.id, parseInt(btn.dataset.sponsorchoice, 10), club.pendingSponsorOffers);
      saveGame();
      document.getElementById("tab-content").innerHTML = renderFinance();
      attachTabHandlers();
    };
  });
  if (searchInput) {
    searchInput.oninput = () => { ui.searchQuery = searchInput.value; render(); searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); };
    document.querySelectorAll("[data-searchplayer]").forEach(btn => {
      btn.onclick = () => { openPlayerCard(parseInt(btn.dataset.searchplayer, 10)); ui.searchQuery = ""; render(); };
    });
    document.querySelectorAll("[data-searchclub]").forEach(btn => {
      btn.onclick = () => {
        const c = getClub(parseInt(btn.dataset.searchclub, 10));
        if (c) { ui.standingsCountry = c.countryKey; ui.standingsDiv = clubLeagueKey(c); ui.tab = "calendar"; ui.searchQuery = ""; }
        render();
      };
    });
  }
  const nextSeasonBtn = document.getElementById("next-season-btn");
  if (nextSeasonBtn) nextSeasonBtn.onclick = () => { triggerNextSeason(); saveGame(); render(); };

  const toggleNotifBtn = document.getElementById("toggle-notif-settings");
  if (toggleNotifBtn) toggleNotifBtn.onclick = () => { ui.showNotifSettings = !ui.showNotifSettings; render(); };
  ["blessures", "transferts", "resultats"].forEach(key => {
    const cb = document.getElementById(`notif-${key}`);
    if (cb) cb.onchange = () => { state.notifSettings[key] = cb.checked; saveGame(); render(); };
  });

  const kitPicker = document.getElementById("kit-picker");
  if (kitPicker) {
    const club = userClub();
    const colors = ["#B9862E", "#8B3A2B", "#3C6E52", "#2C4A6E", "#6E4A2C", "#4A3C6E", "#1B2A22"];
    kitPicker.innerHTML = colors.map(c => `<button class="avatar-dot ${club.kitColor === c ? "active" : ""}" style="background:${c}" data-kit="${c}"></button>`).join("");
    let chosenKit = club.kitColor;
    kitPicker.querySelectorAll(".avatar-dot").forEach(btn => {
      btn.onclick = () => { kitPicker.querySelectorAll(".avatar-dot").forEach(b => b.classList.remove("active")); btn.classList.add("active"); chosenKit = btn.dataset.kit; };
    });
    const logoPicker = document.getElementById("logo-shape-picker");
    const shapeLabels = { shield: "🛡️", circle: "⚫", star: "⭐", diamond: "🔷" };
    let chosenShape = club.logoShape || "shield";
    if (logoPicker) {
      logoPicker.innerHTML = Object.keys(shapeLabels).map(s => `<button class="avatar-portrait ${chosenShape === s ? "active" : ""}" data-shape="${s}">${shapeLabels[s]}</button>`).join("");
      logoPicker.querySelectorAll(".avatar-portrait").forEach(btn => {
        btn.onclick = () => { logoPicker.querySelectorAll(".avatar-portrait").forEach(b => b.classList.remove("active")); btn.classList.add("active"); chosenShape = btn.dataset.shape; };
      });
    }
    const saveIdBtn = document.getElementById("save-identity");
    if (saveIdBtn) saveIdBtn.onclick = () => {
      const newName = document.getElementById("club-name-input").value.trim();
      if (newName) club.name = newName;
      club.nickname = document.getElementById("club-nickname-input").value.trim();
      club.anthem = document.getElementById("club-anthem-input").value.trim();
      club.kitColor = chosenKit;
      club.logoColor = chosenKit;
      club.logoShape = chosenShape;
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
  attachRecruitHandlers();
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
// CONFRONTATIONS DIRECTES ENTRE DEUX CLUBS
// ---------------------------------------------------------------
function openH2HModal(id1, id2) {
  const modal = document.getElementById("player-modal");
  if (!modal) return;
  const c1 = getClub(id1), c2 = getClub(id2);
  const history = getH2H(id1, id2);
  let w1 = 0, w2 = 0, draws = 0;
  history.forEach(h => {
    if (h.homeGoals === h.awayGoals) draws++;
    else if ((h.homeGoals > h.awayGoals) === (h.homeId === id1)) w1++;
    else w2++;
  });
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal dossier" style="max-width:520px;">
        <h3>${c1 ? c1.name : "?"} vs ${c2 ? c2.name : "?"}</h3>
        <div class="overview-grid" style="margin-bottom:16px;">
          <div class="stat-block"><span class="stat-num">${w1}</span><span class="stat-label">Victoires ${c1 ? c1.name : ""}</span></div>
          <div class="stat-block"><span class="stat-num">${draws}</span><span class="stat-label">Nuls</span></div>
          <div class="stat-block"><span class="stat-num">${w2}</span><span class="stat-label">Victoires ${c2 ? c2.name : ""}</span></div>
        </div>
        <table class="squad-table">
          <thead><tr><th>Date</th><th>Compétition</th><th>Résultat</th></tr></thead>
          <tbody>
            ${history.map(h => `<tr><td>${h.date}</td><td>${h.competition}</td><td>${getClub(h.homeId)?.name || "?"} ${h.homeGoals}-${h.awayGoals} ${getClub(h.awayId)?.name || "?"}</td></tr>`).join("") || `<tr><td colspan="3" class="hint">Aucune confrontation enregistrée pour l'instant.</td></tr>`}
          </tbody>
        </table>
        <div class="creation-footer">
          <button class="btn btn-primary" id="close-h2h">Fermer</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-h2h").onclick = () => { modal.innerHTML = ""; };
}


const ATTR_CATEGORIES = {
  "Technique": ["technique", "passe", "dribble", "tir", "jeuDeTete"],
  "Physique": ["vitesse", "acceleration", "physique", "endurance", "puissance", "agressivite"],
  "Défense & Placement": ["tacle", "placement", "concentration"],
  "Mental": ["vision", "decision", "leadership", "sangFroid"],
  "Gardien": ["reflexes", "relance"]
};

function openPlayerCard(playerId) {
  const p = getPlayer(playerId);
  if (!p) return;
  let modal = document.getElementById("player-modal");
  if (!modal) return;
  const club = getClub(p.clubId);
  const st = p.seasonStats || { matches: 0, goals: 0, assists: 0 };
  const own = !!(club && isUserClub(club.id));
  const pk = own ? 100 : knowledgeOfPlayerForUser(p);
  const scouted = scoutedAttributes(p, pk);
  const sview = playerStarView(p, pk);
  const exactNums = own || pk >= 90;

  const categoryBlocks = Object.entries(ATTR_CATEGORIES).map(([label, keys]) => {
    const rows = keys.filter(k => scouted[k]).map(k => {
      const v = scouted[k];
      return `
        <div class="wage-bar-wrap">
          <div class="wage-bar-label">${attrLabel(k)} — ${v.value}${v.approx ? " (approx.)" : ""} / 20</div>
          <div class="wage-bar"><div class="wage-bar-fill ${v.value >= 15 ? "" : v.value <= 8 ? "danger" : "warn"}" style="width:${v.value / 20 * 100}%"></div></div>
        </div>`;
    }).join("");
    if (!rows) return "";
    return `<div style="margin-bottom:14px;"><div class="panel-subtitle" style="margin:0 0 8px;font-size:14px;">${label}</div>${rows}</div>`;
  }).join("");

  const teammates = club ? club.players.filter(t => t.id !== p.id) : [];

  modal.innerHTML = `
    <div class="modal-backdrop fm-backdrop">
      <div class="modal fm-modal fm-dark fm-player">
        ${fmPlayerTopHTML(p, club, own, pk, scouted, sview, exactNums, st)}

        <h3 class="panel-subtitle">Statistiques par saison</h3>
        <table class="squad-table">
          <thead><tr><th>Saison</th><th>Club</th><th>Global</th><th>Matchs</th><th>Buts</th><th>Passes déc.</th></tr></thead>
          <tbody>
            <tr class="me"><td>${state.season.year} (en cours)</td><td>${club ? club.name : "—"}</td><td>${p.overall}</td><td>${st.matches}</td><td>${st.goals}</td><td>${st.assists}</td></tr>
            ${(p.history || []).map(h => `<tr><td>${h.year}</td><td>${h.club}</td><td>${h.overall}</td><td>${h.matches}</td><td>${h.goals}</td><td>${h.assists}</td></tr>`).join("") || ""}
          </tbody>
        </table>
        <p class="hint">Agent : ${p.agent.name} (${p.agent.agency}) · commission ${p.agent.commissionPct}%.${p.releaseClause ? ` Clause libératoire : ${fmtMoney(p.releaseClause)}.` : ""}</p>

        ${club && isUserClub(club.id) ? `
        <h3 class="panel-subtitle">Management</h3>
        <div class="dossier" style="margin-bottom:12px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <button class="btn btn-ghost btn-small" id="talk-encourager">Encourager</button>
            <button class="btn btn-ghost btn-small" id="talk-feliciter">Féliciter</button>
            <button class="btn btn-ghost btn-small" id="talk-recadrer">Recadrer</button>
          </div>
          <p class="hint" id="talk-result" style="margin:0 0 12px;"></p>
          <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
            <label class="field" style="margin:0;"><span>Nouveau salaire/mois</span><input type="number" id="renewal-wage" value="${Math.round(p.wage * 1.15)}" style="width:140px;" /></label>
            <label class="field" style="margin:0;"><span>Durée (ans)</span><input type="number" id="renewal-years" value="2" min="1" max="5" style="width:80px;" /></label>
            <button class="btn btn-primary btn-small" id="propose-renewal">Proposer une prolongation</button>
          </div>
          <p class="hint" id="renewal-result" style="margin:8px 0 0;"></p>
        </div>
        ${teammates.length ? `
        <div class="field" style="max-width:320px;">
          <span>Comparer à un coéquipier</span>
          <select id="compare-select">
            <option value="">— choisir —</option>
            ${teammates.map(t => `<option value="${t.id}">${t.firstName} ${t.lastName} (${t.position})</option>`).join("")}
          </select>
        </div>
        ` : ""}
        ` : ""}

        <div class="creation-footer">
          <button class="btn btn-primary" id="close-player-card">Fermer</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-player-card").onclick = () => { modal.innerHTML = ""; };

  ["encourager", "feliciter", "recadrer"].forEach(tone => {
    const btn = document.getElementById("talk-" + tone);
    if (btn) btn.onclick = () => {
      const res = talkToPlayer(p.id, tone);
      document.getElementById("talk-result").textContent = res.message + ` (moral : ${res.morale}%)`;
      saveGame();
    };
  });
  const renewBtn = document.getElementById("propose-renewal");
  if (renewBtn) renewBtn.onclick = () => {
    const wage = parseInt(document.getElementById("renewal-wage").value, 10) || p.wage;
    const years = parseInt(document.getElementById("renewal-years").value, 10) || 1;
    const res = confirmRenewal(p.id, wage, years);
    const box = document.getElementById("renewal-result");
    box.textContent = res.accepted
      ? `${p.firstName} ${p.lastName} a accepté ! Contrat prolongé jusqu'en ${p.contractEndYear}.`
      : `${p.firstName} ${p.lastName} a refusé cette offre.`;
    box.className = res.accepted ? "hint result-good" : "hint result-bad";
    saveGame();
    if (res.accepted) openPlayerCard(p.id);
  };
  const compareSel = document.getElementById("compare-select");
  if (compareSel) compareSel.onchange = () => {
    if (compareSel.value) openPlayerComparison(p.id, parseInt(compareSel.value, 10));
  };
}

// ---------------------------------------------------------------
// COMPARAISON DE DEUX JOUEURS
// ---------------------------------------------------------------
function openPlayerComparison(idA, idB) {
  const a = getPlayer(idA), b = getPlayer(idB);
  const modal = document.getElementById("player-modal");
  if (!a || !b || !modal) return;
  const attrsA = scoutedAttributes(a), attrsB = scoutedAttributes(b);
  const keys = Object.keys(attrsA).filter(k => attrsB[k]);
  modal.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal dossier" style="max-width:600px;">
        <h3>${a.firstName} ${a.lastName} <span class="hint">vs</span> ${b.firstName} ${b.lastName}</h3>
        <table class="squad-table">
          <thead><tr><th>Attribut</th><th>${a.lastName}</th><th></th><th>${b.lastName}</th></tr></thead>
          <tbody>
            ${keys.map(k => {
              const va = attrsA[k].value, vb = attrsB[k].value;
              return `<tr><td>${attrLabel(k)}</td><td class="${va > vb ? "result-good" : va < vb ? "result-bad" : ""}">${va}</td><td>vs</td><td class="${vb > va ? "result-good" : vb < va ? "result-bad" : ""}">${vb}</td></tr>`;
            }).join("")}
            <tr class="me"><td>Global</td><td>${a.overall}</td><td></td><td>${b.overall}</td></tr>
            <tr><td>Potentiel</td><td>${a.potential}</td><td></td><td>${b.potential}</td></tr>
            <tr><td>Salaire</td><td>${fmtMoney(a.wage)}</td><td></td><td>${fmtMoney(b.wage)}</td></tr>
            <tr><td>Valeur</td><td>${fmtMoney(a.value)}</td><td></td><td>${fmtMoney(b.value)}</td></tr>
          </tbody>
        </table>
        <div class="creation-footer">
          <button class="btn btn-primary" id="close-compare">Fermer</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("close-compare").onclick = () => { modal.innerHTML = ""; };
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
        <p class="hint">${p.position} · ${p.age} ans · ${p.nationality} · ${starsPair(playerStarView(p, knowledgeOfPlayerForUser(p)))} · connaissance ${Math.round(knowledgeOfPlayerForUser(p))}%</p>
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
      if (amount > getTransferBudget(club)) {
        renderFeeStep(amount, `Au-delà de votre budget de transferts (${fmtMoney(getTransferBudget(club))}), calculé d'après vos finances.`);
        return;
      }
      const res = evaluateOffer(p, amount, true);
      if (res.accept) {
        // le joueur peut refuser le transfert selon son attachement au club (loyauté)
        const refuseChance = clamp(((p.loyalty || 40) - 30) / 140, 0.02, 0.55);
        if (Math.random() < refuseChance) {
          neg.history.push(`Vous : ${fmtMoney(amount)} — accepté par ${seller.name}, mais ${p.firstName} ${p.lastName} refuse personnellement ce transfert (fort attachement au club).`);
          renderFeeStep(amount, `${p.firstName} ${p.lastName} ne souhaite pas quitter ${seller.name} pour l'instant. Réessayez plus tard ou visez un autre joueur.`);
          document.getElementById("send-offer").disabled = true;
          return;
        }
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

      if (neg.agreedFee + bonusOffer + commission > getTransferBudget(club) && !neg.viaClause) {
        resultBox.innerHTML = `<p class="result-bad">Budget de transferts insuffisant (${fmtMoney(getTransferBudget(club))}) pour couvrir le transfert, la prime et la commission de l'agent.</p>`;
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

// Charge d'abord la sauvegarde (IndexedDB), puis affiche le menu
function startApp() {
try {
  render();
} catch (e) {
  console.error("Erreur au démarrage :", e);
  document.getElementById("app").innerHTML = `
    <div style="max-width:700px;margin:60px auto;padding:24px;background:#EDE4D0;color:#20241C;border-radius:4px;font-family:monospace;">
      <h2 style="margin-top:0;">Le jeu n'a pas pu démarrer</h2>
      <p>Une erreur JavaScript a empêché le chargement. Ouvrez la console du navigateur (F12) pour plus de détails.</p>
      <pre style="white-space:pre-wrap;background:#F4EFE2;padding:12px;border-radius:3px;font-size:12px;">${(e && e.stack) || e}</pre>
    </div>
  `;
}
}
initStorage().then(startApp, startApp);
window.addEventListener("error", (ev) => {
  console.error("Erreur non interceptée :", ev.error || ev.message);
});
