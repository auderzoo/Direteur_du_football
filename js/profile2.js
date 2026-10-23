// ===================================================================
// BLOC 21 (4/4) — CRÉATION DE PARTIE EN PLUSIEURS ÉTAPES
//  - rôle : directeur sportif d'un club OU sélectionneur d'une équipe nationale
//  - profil détaillé : identité, nationalité, pays de naissance, apparence, tenue, parcours, style, favoris
//  - marchés suivis et CHAMPIONNATS JOUABLES (les autres sont simulés mais non jouables)
//  - écran de choix du club filtré sur les championnats jouables
//  - carte « Mon profil » dans l'onglet Club
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const D = () => window.dsNationsData;
  const hasState = () => typeof state !== "undefined" && state && state.ds;

  // ---------------------------------------------------------------
  // Données de personnalisation
  // ---------------------------------------------------------------
  const SKIN = ["#f5d5b8", "#e8b98d", "#c68a5e", "#8d5a3b", "#5a3a28"];
  const HAIRC = ["#1b1b1b", "#5a3825", "#b5853a", "#c9c9c9", "#a33a1e"];
  const HAIRS = [["court", "Court"], ["long", "Mi-long"], ["chauve", "Rasé"], ["barbe", "Court + barbe"]];
  const OUTFITS = [["costume", "Costume cravate"], ["blazer", "Blazer décontracté"], ["polo", "Polo du club"], ["survet", "Survêtement"], ["manteau", "Long manteau"]];
  const COLORS = ["#1f2a44", "#7a1f2b", "#1e5a3a", "#2b2b2b", "#b9862e", "#2d6a9f", "#6b3fa0", "#e8e2d0"];
  const BACKGROUNDS = {
    pro: { label: "Ancien joueur professionnel", desc: "Respecté des vestiaires : réputation de départ +6.", rep: 6 },
    coach: { label: "Ancien entraîneur", desc: "Regard tactique : +1 point de compétence à investir.", pts: 1 },
    data: { label: "Analyste data", desc: "Œil pour les chiffres : +1 point de compétence à investir.", pts: 1 },
    agent: { label: "Ancien agent de joueurs", desc: "Carnet d'adresses : +1 point de compétence à investir.", pts: 1 },
    exec: { label: "Cadre de club / dirigeant", desc: "Rigueur de gestion : +1 point de compétence à investir.", pts: 1 },
    auto: { label: "Autodidacte passionné", desc: "Parcours atypique : +1 point de compétence, réputation +2.", pts: 1, rep: 2 }
  };
  const PHILS = { possession: "Possession et jeu de position", pressing: "Pressing haut, intensité", contre: "Contre-attaque rapide", direct: "Jeu direct, duels", equilibre: "Équilibre avant tout", jeunes: "Formation et jeunes talents" };
  const DEFAULT_WORLD = ["france", "angleterre", "espagne", "italie", "allemagne"];

  function newWz() {
    return {
      step: 0, role: "club", name: "", age: 42, nat: "France", birth: "France", avatar: (typeof DS_AVATARS !== "undefined" ? DS_AVATARS[0].id : "tacticien"),
      skin: 1, hairC: 1, hairS: "court", outfit: "costume", color: COLORS[0], bg: "pro", phil: "equilibre", favClub: "", favNat: "France",
      spec: Object.keys(DS_SPECIALIZATIONS)[0], diff: "normal", mp: false, ntNat: null, ntQ: "", ntConf: "", playable: {}
    };
  }
  const W = () => (ui.wz = ui.wz || newWz());

  // ---------------------------------------------------------------
  // Figurine du personnage (SVG)
  // ---------------------------------------------------------------
  function figure(p, size) {
    const skin = SKIN[p.skin] || SKIN[1], hair = HAIRC[p.hairC] || HAIRC[1], col = p.color || COLORS[0];
    const dark = "#20241C";
    let body = "";
    if (p.outfit === "survet") body = `<path d="M22 150 L26 100 Q60 86 94 100 L98 150Z" fill="${col}"/><rect x="58" y="96" width="4" height="54" fill="#fff" opacity=".8"/><path d="M26 100 L10 140 M94 100 L110 140" stroke="${col}" stroke-width="12" stroke-linecap="round"/><path d="M26 100 L10 140 M94 100 L110 140" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    else if (p.outfit === "polo") body = `<path d="M22 150 L26 100 Q60 86 94 100 L98 150Z" fill="${col}"/><path d="M50 92 L60 108 L70 92Z" fill="#fff"/><circle cx="60" cy="122" r="3" fill="#fff" opacity=".5"/><path d="M26 100 L12 138 M94 100 L108 138" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`;
    else if (p.outfit === "blazer") body = `<path d="M22 150 L26 100 Q60 86 94 100 L98 150Z" fill="${col}"/><path d="M48 92 L60 150 L72 92Z" fill="#f4efe2"/><path d="M48 92 L60 118 L46 150 M72 92 L60 118 L74 150" stroke="${dark}" stroke-width="1.2" fill="none" opacity=".5"/><path d="M26 100 L12 140 M94 100 L108 140" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`;
    else if (p.outfit === "manteau") body = `<path d="M18 150 L24 98 Q60 84 96 98 L102 150Z" fill="${col}"/><path d="M60 92 L60 150" stroke="${dark}" stroke-width="1.5" opacity=".5"/><path d="M46 92 L60 110 L74 92" fill="#e8e2d0"/><circle cx="64" cy="118" r="2" fill="${dark}"/><circle cx="64" cy="132" r="2" fill="${dark}"/><path d="M24 98 L10 144 M96 98 L110 144" stroke="${col}" stroke-width="13" stroke-linecap="round"/>`;
    else body = `<path d="M22 150 L26 100 Q60 86 94 100 L98 150Z" fill="${col}"/><path d="M48 92 L60 150 L72 92Z" fill="#fff"/><path d="M57 98 L63 98 L65 140 L60 146 L55 140Z" fill="#8b3a2b"/><path d="M26 100 L12 140 M94 100 L108 140" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`;
    let hairSvg = "";
    if (p.hairS === "long") hairSvg = `<path d="M38 52 Q40 22 60 22 Q82 22 82 52 L84 78 L76 70 L76 46 L44 46 L44 70 L36 78Z" fill="${hair}"/>`;
    else if (p.hairS === "chauve") hairSvg = "";
    else hairSvg = `<path d="M40 50 Q40 24 60 24 Q80 24 80 50 Q70 38 60 40 Q50 38 40 50Z" fill="${hair}"/>`;
    const beard = p.hairS === "barbe" ? `<path d="M42 58 Q42 84 60 86 Q78 84 78 58 Q70 72 60 72 Q50 72 42 58Z" fill="${hair}"/>` : "";
    return `<svg class="pf-fig" viewBox="0 0 120 150" width="${size || 96}" height="${Math.round((size || 96) * 1.25)}" role="img" aria-label="Aperçu du personnage">
      ${body}<rect x="54" y="80" width="12" height="14" rx="3" fill="${skin}"/>
      <ellipse cx="60" cy="56" rx="21" ry="26" fill="${skin}"/>${hairSvg}${beard}
      <circle cx="52" cy="54" r="2" fill="${dark}"/><circle cx="68" cy="54" r="2" fill="${dark}"/>
      <path d="M53 66 Q60 71 67 66" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
  }

  // ---------------------------------------------------------------
  // Listes
  // ---------------------------------------------------------------
  function allNationLabels() { const d = D(); return d ? d.ORDER.map((k) => d.nat(k).label).sort((a, b) => a.localeCompare(b, "fr")) : Object.values(COUNTRIES).map((c) => c.label); }
  function engineNatKey(label) { const e = Object.entries(COUNTRIES).find(([, c]) => c.label === label); return e ? e[0] : "france"; }
  function realClubNames() {
    const out = [];
    ["CLUB_POOLS_D1", "CLUB_POOLS_D2"].forEach((v) => { try { const P = eval(v); Object.values(P).forEach((a) => a.forEach((n) => out.push(n))); } catch (e) {} });
    return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b, "fr"));
  }
  function tiersOf(ck) { return Array.from({ length: (typeof DIVISION_COUNT !== "undefined" && DIVISION_COUNT[ck]) || 2 }, (_, i) => i + 1); }
  function leagueName(ck, t) { const n = (typeof LEAGUE_NAMES !== "undefined" && LEAGUE_NAMES[ck]) || {}; return n["d" + t] || `Division ${t}`; }
  function defaultPlayable(ck) { return tiersOf(ck).filter((t) => t <= 2); }
  function ensurePlayable(w) {
    ui.selectedCountries.forEach((ck) => { if (!w.playable[ck]) w.playable[ck] = defaultPlayable(ck); });
    Object.keys(w.playable).forEach((ck) => { if (!ui.selectedCountries.includes(ck)) delete w.playable[ck]; });
  }

  // ---------------------------------------------------------------
  // Étapes
  // ---------------------------------------------------------------
  const STEPS = ["Rôle et identité", "Apparence", "Parcours et style", "Monde de jeu", "Championnats jouables", "Récapitulatif"];
  const stepsFor = (w) => (w.role === "nt" ? [0, 1, 2, 3, 5] : [0, 1, 2, 3, 4, 5]);

  function chips(items, cur, attr) {
    return items.map(([k, l]) => `<button type="button" class="country-chip ${String(cur) === String(k) ? "selected" : ""}" data-wz-set="${attr}" data-v="${esc(k)}">${esc(l)}</button>`).join("");
  }
  function sel(id, opts, cur) { return `<select id="${id}" data-wz-f="${id.replace("wz-", "")}">${opts.map((o) => `<option value="${esc(o)}" ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`; }

  function stepIdentity(w) {
    return `<h2 class="section-title">Votre rôle</h2>
      <div class="spec-grid">
        <button type="button" class="spec-card ${w.role === "club" ? "selected" : ""}" data-wz-set="role" data-v="club"><span class="spec-name">🏟️ Directeur sportif d'un club</span><span class="spec-desc">Recrutement, contrats, scouting, centre de formation : vous bâtissez l'effectif d'un club.</span></button>
        <button type="button" class="spec-card ${w.role === "nt" ? "selected" : ""}" data-wz-set="role" data-v="nt"><span class="spec-name">🌍 Sélectionneur national</span><span class="spec-desc">Vous dirigez une équipe nationale : convocations, éliminatoires, tournois continentaux et Coupe du monde.</span></button>
      </div>
      <h2 class="section-title">Identité</h2>
      <div class="dossier">
        <label class="field"><span>Nom du personnage</span><input type="text" id="wz-name" data-wz-f="name" maxlength="24" placeholder="ex. Alex Fontaine" value="${esc(w.name)}"/></label>
        <label class="field"><span>Âge : <b id="wz-age-v">${w.age}</b> ans</span><input type="range" id="wz-age" data-wz-f="age" min="28" max="70" value="${w.age}"/></label>
        <label class="field"><span>Nationalité</span>${sel("wz-nat", allNationLabels(), w.nat)}</label>
        <label class="field"><span>Pays de naissance</span>${sel("wz-birth", allNationLabels(), w.birth)}</label>
      </div>`;
  }
  function stepLook(w) {
    return `<h2 class="section-title">Apparence et tenue</h2>
      <div class="pf-look"><div class="pf-prev" id="pf-prev">${figure(w, 150)}</div>
      <div class="pf-opts">
        <div class="field"><span>Teint</span><div class="pf-sw">${SKIN.map((c, i) => `<button type="button" class="pf-dot ${w.skin === i ? "on" : ""}" style="background:${c}" data-wz-set="skin" data-v="${i}" aria-label="Teint ${i + 1}"></button>`).join("")}</div></div>
        <div class="field"><span>Cheveux</span><div class="pf-sw">${HAIRC.map((c, i) => `<button type="button" class="pf-dot ${w.hairC === i ? "on" : ""}" style="background:${c}" data-wz-set="hairC" data-v="${i}" aria-label="Couleur de cheveux ${i + 1}"></button>`).join("")}</div>
          <div class="country-grid">${chips(HAIRS, w.hairS, "hairS")}</div></div>
        <div class="field"><span>Tenue</span><div class="country-grid">${chips(OUTFITS, w.outfit, "outfit")}</div></div>
        <div class="field"><span>Couleur de la tenue</span><div class="pf-sw">${COLORS.map((c) => `<button type="button" class="pf-dot ${w.color === c ? "on" : ""}" style="background:${c}" data-wz-set="color" data-v="${c}" aria-label="Couleur ${c}"></button>`).join("")}</div></div>
        <div class="field"><span>Emblème</span><div class="avatar-picker">${DS_AVATARS.map((a) => `<button type="button" class="avatar-portrait ${w.avatar === a.id ? "active" : ""}" title="${a.label}" data-wz-set="avatar" data-v="${a.id}">${a.emoji}</button>`).join("")}</div></div>
      </div></div>`;
  }
  function stepPath(w) {
    const names = realClubNames();
    return `<h2 class="section-title">Parcours</h2>
      <div class="spec-grid">${Object.entries(BACKGROUNDS).map(([k, b]) => `<button type="button" class="spec-card ${w.bg === k ? "selected" : ""}" data-wz-set="bg" data-v="${k}"><span class="spec-name">${esc(b.label)}</span><span class="spec-desc">${esc(b.desc)}</span></button>`).join("")}</div>
      <h2 class="section-title">Philosophie de jeu</h2>
      <div class="country-grid">${chips(Object.entries(PHILS), w.phil, "phil")}</div>
      <h2 class="section-title">Favoris</h2>
      <div class="dossier">
        <label class="field"><span>Club de cœur ${w.role === "club" ? "(un petit bonus de réputation si vous le dirigez)" : ""}</span><input type="text" id="wz-favClub" data-wz-f="favClub" list="wz-clubs" placeholder="Commencez à taper un nom de club" value="${esc(w.favClub)}" autocomplete="off"/><datalist id="wz-clubs">${names.map((n) => `<option value="${esc(n)}"></option>`).join("")}</datalist></label>
        <label class="field"><span>Sélection de cœur</span>${sel("wz-favNat", allNationLabels(), w.favNat)}</label>
      </div>
      <h2 class="section-title">Spécialisation</h2>
      <div class="spec-grid">${Object.entries(DS_SPECIALIZATIONS).map(([k, s]) => `<button type="button" class="spec-card ${w.spec === k ? "selected" : ""}" data-wz-set="spec" data-v="${k}"><span class="spec-name">${s.label}</span><span class="spec-desc">${s.desc}</span></button>`).join("")}</div>
      <h2 class="section-title">Difficulté</h2>
      <div class="spec-grid">${Object.entries(DS_DIFFICULTIES).map(([k, d]) => `<button type="button" class="spec-card ${w.diff === k ? "selected" : ""}" data-wz-set="diff" data-v="${k}"><span class="spec-name">${d.label}</span><span class="spec-desc">${d.desc}</span></button>`).join("")}</div>`;
  }
  function stepWorld(w) {
    const countries = Object.entries(COUNTRIES);
    let html = "";
    if (w.role === "nt") {
      const d = D(), ui2 = window.dsNationsUI;
      const cf = ["", "UEFA", "CAF", "AFC", "CONMEBOL", "CONCACAF", "OFC"];
      const list = d ? d.playable().filter((n) => (!w.ntConf || n.conf === w.ntConf) && (!w.ntQ || (n.label + " " + n.conf).toLowerCase().includes(w.ntQ.toLowerCase()))).sort((a, b) => b.base - a.base) : [];
      html += `<h2 class="section-title">Quelle sélection dirigez-vous ?</h2>
        <p class="hint">${d ? d.playable().length : 0} sélections disponibles, dont toutes celles du Mondial 2026. Les étoiles indiquent la force de l'équipe : plus il y en a, plus les attentes sont hautes.</p>
        <div class="nt-pk-tools"><input type="search" id="wz-ntq" data-wz-f="ntQ" placeholder="🔎 Rechercher un pays" value="${esc(w.ntQ)}" autocomplete="off"/>
        <div class="nt-pk-conf">${cf.map((c) => `<button type="button" class="tab-chip ${w.ntConf === c ? "active" : ""}" data-wz-conf="${c}">${c || "Tous"}</button>`).join("")}</div></div>
        <div class="nt-pk-grid" id="wz-ntgrid">${list.map((n) => { const dl = ui2 ? ui2.diffLabel(n.base) : [""]; return `<button type="button" class="nt-card ${w.ntNat === n.key ? "selected" : ""}" data-wz-nat="${n.key}" style="border-top-color:${n.c1}"><span class="nt-card-flag">${n.flag}</span><span class="nt-card-name">${esc(n.label)}</span><span class="nt-card-meta">${n.conf} · ${ui2 ? ui2.stars(n.base) : ""}</span><span class="nt-card-diff">${dl[0]}</span></button>`; }).join("") || `<p class="hint">Aucun pays trouvé.</p>`}</div>`;
    }
    html += `<h2 class="section-title">${w.role === "nt" ? "Championnats simulés (vivier de joueurs)" : "Marchés suivis"} <span class="count-tag">${ui.selectedCountries.length} / 5</span></h2>
      <p class="hint">${w.role === "nt" ? "Les joueurs de votre sélection évoluent dans ces championnats. Choisissez jusqu'à 5 pays (France, Angleterre, Espagne, Italie et Allemagne par défaut)." : "Choisissez jusqu'à 5 pays. Chacun ouvre plusieurs divisions, une coupe nationale ; une coupe continentale existe dès 2 pays."}</p>
      <div class="country-grid" id="wz-countries">${countries.map(([k, c]) => `<button type="button" class="country-chip ${ui.selectedCountries.includes(k) ? "selected" : ""}" data-wz-country="${k}">${c.label}</button>`).join("")}</div>`;
    if (w.role === "club") html += `<h2 class="section-title">Mode de jeu</h2><div class="dossier"><label class="field" style="flex-direction:row;align-items:center;gap:10px;"><input type="checkbox" id="wz-mp" data-wz-f="mp" style="width:auto;" ${w.mp ? "checked" : ""}/><span>Multijoueur local (hotseat) : plusieurs DS se relaient sur le même appareil, chacun avec son club</span></label></div>`;
    return html;
  }
  function stepLeagues(w) {
    ensurePlayable(w);
    const cs = ui.selectedCountries;
    return `<h2 class="section-title">Championnats jouables</h2>
      <p class="hint">Cochez les divisions dans lesquelles vous pourrez prendre un club (au départ, puis en cours de carrière). Les autres divisions restent <b>simulées</b> — promotions, relégations, coupes et Europe comprises — mais vous ne pourrez ni les entraîner ni y recevoir d'offre.</p>
      <div class="wz-quick"><button type="button" class="btn btn-ghost btn-small" data-wz-q="top">Élites uniquement</button><button type="button" class="btn btn-ghost btn-small" data-wz-q="two">Deux premières divisions</button><button type="button" class="btn btn-ghost btn-small" data-wz-q="all">Tout jouable</button></div>
      ${cs.map((ck) => `<div class="dossier wz-lg"><h3 class="panel-subtitle">${esc(COUNTRIES[ck].label)}</h3><div class="country-grid">${tiersOf(ck).map((t) => `<button type="button" class="country-chip ${w.playable[ck].includes(t) ? "selected" : ""}" data-wz-tier="${ck}:${t}">${esc(leagueName(ck, t))}</button>`).join("")}</div></div>`).join("")}
      <p class="hint" id="wz-lgn"></p>`;
  }
  function stepRecap(w) {
    const bg = BACKGROUNDS[w.bg];
    ensurePlayable(w);
    const nt = w.role === "nt" && D() ? D().nat(w.ntNat) : null;
    return `<h2 class="section-title">Récapitulatif</h2>
      <div class="dossier pf-recap"><div class="pf-prev">${figure(w, 120)}</div><div>
        <h3 style="margin:0 0 6px">${esc(w.name || "Directeur Sportif")}</h3>
        <p class="hint" style="margin:0">${w.age} ans · ${esc(w.nat)} · né(e) en ${esc(w.birth)}<br>${esc(bg.label)} · ${esc(PHILS[w.phil])}<br>Club de cœur : ${esc(w.favClub || "—")} · Sélection de cœur : ${esc(w.favNat)}</p>
        <p style="margin:8px 0 0"><b>${w.role === "nt" ? "Sélectionneur : " + (nt ? nt.flag + " " + esc(nt.label) : "(aucune sélection choisie)") : "Directeur sportif d'un club"}</b></p>
        <p class="hint" style="margin:4px 0 0">Marchés : ${ui.selectedCountries.map((k) => COUNTRIES[k].label).join(", ") || "—"}</p>
        ${w.role === "club" ? `<p class="hint" style="margin:4px 0 0">Jouables : ${ui.selectedCountries.map((k) => `${COUNTRIES[k].label} (${(w.playable[k] || []).map((t) => leagueName(k, t)).join(", ") || "aucune"})`).join(" · ")}</p>` : ""}
      </div></div>`;
  }

  function renderWizard() {
    const w = W();
    if (!ui.selectedCountries.length && !w.__init) { ui.selectedCountries = DEFAULT_WORLD.slice(); w.__init = true; }
    const order = stepsFor(w);
    if (!order.includes(w.step)) w.step = order[0];
    const idx = order.indexOf(w.step), last = idx === order.length - 1;
    const body = [stepIdentity, stepLook, stepPath, stepWorld, stepLeagues, stepRecap][w.step](w);
    app.innerHTML = `<div class="creation-screen wz">
      <div class="wz-prog" aria-label="Progression">${order.map((s, i) => `<span class="wz-st ${i === idx ? "on" : i < idx ? "done" : ""}">${i + 1}. ${STEPS[s]}</span>`).join("")}</div>
      ${body}
      <div class="creation-footer"><button class="btn btn-ghost" id="wz-back">${idx === 0 ? "Retour au menu" : "Précédent"}</button>
      <button class="btn btn-primary" id="wz-next">${last ? (w.role === "nt" ? "Prendre la sélection" : "Choisir mon club") : "Suivant"}</button></div></div>`;
    window.scrollTo(0, 0);
    updateLgCount();
  }
  function updateLgCount() {
    const el = document.getElementById("wz-lgn"); if (!el) return;
    const w = W(); const n = Object.values(w.playable).reduce((s, a) => s + a.length, 0);
    el.textContent = n ? `${n} division${n > 1 ? "s" : ""} jouable${n > 1 ? "s" : ""}.` : "Choisissez au moins une division jouable.";
    el.className = "hint" + (n ? "" : " result-bad");
  }
  function validate(w) {
    if (w.step === 3) {
      if (w.role === "nt" && !w.ntNat) return "Choisissez la sélection que vous voulez diriger.";
      if (!ui.selectedCountries.length) return "Choisissez au moins un pays.";
    }
    if (w.step === 4) { ensurePlayable(w); if (!Object.values(w.playable).some((a) => a.length)) return "Choisissez au moins une division jouable."; }
    return "";
  }
  const toast = (t) => { try { window.dsToast ? window.dsToast(t) : alert(t); } catch (e) {} };

  // ---------------------------------------------------------------
  // Lancement
  // ---------------------------------------------------------------
  function applyProfile(w) {
    const ds = state.ds, bg = BACKGROUNDS[w.bg];
    ds.nationalityLabel = w.nat;
    ds.profile = { age: w.age, nat: w.nat, birth: w.birth, skin: w.skin, hairC: w.hairC, hairS: w.hairS, outfit: w.outfit, color: w.color, bg: w.bg, phil: w.phil, favClub: w.favClub, favNat: w.favNat, role: w.role };
    if (bg.rep) ds.reputation = (ds.reputation || 30) + bg.rep;
    if (bg.pts) ds.skillPoints = (ds.skillPoints || 0) + bg.pts;
    try { ds.reputationHistory[0].reputation = ds.reputation; } catch (e) {}
  }
  function launch() {
    const w = W();
    const name = w.name.trim() || "Directeur Sportif";
    const natKey = engineNatKey(w.nat);
    ui.multiplayer = w.role === "club" && w.mp; ui.mpChosenCount = 0;
    newGame(name, w.avatar, ui.selectedCountries.slice(), natKey, w.spec, w.diff);
    applyProfile(w);
    if (w.role === "club") {
      ensurePlayable(w);
      state.playable = {}; ui.selectedCountries.forEach((ck) => { state.playable[ck] = (w.playable[ck] || []).slice(); });
      ui.screen = "clubselect"; render();
    } else {
      state.playable = null;
      window.dsNT.startNT(w.ntNat);
      ui.screen = "dashboard"; ui.tab = "overview"; ui.ntTab = "home";
      try { saveGame(); } catch (e) {}
      render();
    }
  }

  document.addEventListener("click", (e) => {
    if (typeof ui === "undefined" || ui.screen !== "creation" || !ui.wz) return;
    const t = e.target.closest && e.target.closest("button, [data-wz-nat]"); if (!t) return;
    const w = W();
    if (t.id === "wz-back") {
      const order = stepsFor(w), i = order.indexOf(w.step);
      if (i <= 0) { ui.screen = "menu"; render(); } else { w.step = order[i - 1]; renderWizard(); }
      return;
    }
    if (t.id === "wz-next") {
      const err = validate(w); if (err) { toast(err); return; }
      const order = stepsFor(w), i = order.indexOf(w.step);
      if (i === order.length - 1) launch(); else { w.step = order[i + 1]; renderWizard(); }
      return;
    }
    if (t.dataset.wzSet) {
      const k = t.dataset.wzSet; let v = t.dataset.v;
      if (k === "skin" || k === "hairC") v = parseInt(v, 10);
      w[k] = v;
      if (k === "role") { renderWizard(); return; }
      renderWizard(); return;
    }
    if (t.dataset.wzCountry) {
      const k = t.dataset.wzCountry, i = ui.selectedCountries.indexOf(k);
      if (i >= 0) ui.selectedCountries.splice(i, 1); else if (ui.selectedCountries.length < 5) ui.selectedCountries.push(k); else { toast("5 pays maximum"); return; }
      renderWizard(); return;
    }
    if (t.dataset.wzNat) { w.ntNat = t.dataset.wzNat; renderWizard(); return; }
    if (t.dataset.wzConf !== undefined) { w.ntConf = t.dataset.wzConf; renderWizard(); return; }
    if (t.dataset.wzTier) {
      const [ck, tt] = t.dataset.wzTier.split(":"), n = parseInt(tt, 10), a = w.playable[ck] = w.playable[ck] || [];
      const i = a.indexOf(n); if (i >= 0) a.splice(i, 1); else a.push(n);
      t.classList.toggle("selected"); updateLgCount(); return;
    }
    if (t.dataset.wzQ) {
      ui.selectedCountries.forEach((ck) => { w.playable[ck] = t.dataset.wzQ === "top" ? [1] : t.dataset.wzQ === "two" ? tiersOf(ck).filter((x) => x <= 2) : tiersOf(ck); });
      renderWizard();
    }
  });
  const onField = (e) => {
    if (typeof ui === "undefined" || ui.screen !== "creation" || !ui.wz) return;
    const f = e.target.dataset && e.target.dataset.wzF; if (!f) return;
    const w = W();
    w[f] = e.target.type === "checkbox" ? e.target.checked : e.target.type === "range" ? parseInt(e.target.value, 10) : e.target.value;
    if (f === "age") { const v = document.getElementById("wz-age-v"); if (v) v.textContent = w.age; }
    if (f === "ntQ" && e.type === "input") { const keep = e.target.selectionStart; renderWizard(); const i = document.getElementById("wz-ntq"); if (i) { i.focus(); try { i.setSelectionRange(keep, keep); } catch (x) {} } }
  };
  document.addEventListener("input", onField);
  document.addEventListener("change", onField);

  window.renderCreation = function () { ui.wz = ui.wz || newWz(); ui.wz.step = 0; renderWizard(); };
  // « Nouvelle carrière » repart d'un formulaire neuf
  document.addEventListener("click", (e) => { if (e.target && e.target.id === "btn-new") { ui.wz = null; } }, true);

  // ---------------------------------------------------------------
  // Championnats jouables : filtre
  // ---------------------------------------------------------------
  function isPlayableClub(c) {
    if (!c) return false;
    if (typeof state === "undefined" || !state || !state.playable) return true;
    const a = state.playable[c.countryKey];
    return !!a && a.includes(c.division);
  }
  window.dsPlayableClub = isPlayableClub;
  window.dsPlayable = { club: isPlayableClub, tiers: (ck) => (state.playable && state.playable[ck]) || null };

  // ---------------------------------------------------------------
  // Écran de choix du club (filtré)
  // ---------------------------------------------------------------
  window.renderClubSelect = function () {
    const playable = state.playable;
    const countries = Object.values(state.countries).filter((c) => !playable || (playable[c.key] && playable[c.key].length));
    const mpActive = ui.multiplayer && (state.userClubIds || []).length < 4;
    const chosenNames = (state.userClubIds || []).map((id) => { const c = getClub(id); return c && c.name; }).filter(Boolean);
    const fav = ((state.ds.profile && state.ds.profile.favClub) || "").trim().toLowerCase();
    const simulated = playable ? Object.keys(state.countries).map((ck) => { const all = Object.values(state.countries[ck].leagues).map((l) => l.tier); const ok = playable[ck] || []; const sim = Array.from(new Set(all)).filter((t) => !ok.includes(t)); return sim.length ? `${COUNTRIES[ck].label} : ${sim.map((t) => leagueName(ck, t)).join(", ")}` : ""; }).filter(Boolean) : [];
    app.innerHTML = `<div class="clubselect-screen">
      <h2 class="section-title">Choisissez votre club</h2>
      ${ui.firedNotice ? `<p class="result-bad">Vous avez été démis de vos fonctions. Choisissez un nouveau club pour rebondir.</p>` : ""}
      <p class="hint">Un petit club offre plus de marge de progression ; un club d'élite, plus de moyens dès le départ. Touchez « ⓘ » pour consulter la fiche d'un club (calendrier, effectif, compétitions).</p>
      ${simulated.length ? `<p class="hint">Divisions simulées, non jouables : ${esc(simulated.join(" · "))}.</p>` : ""}
      ${ui.multiplayer ? `<div class="season-banner"><strong>Mode hotseat</strong> — DS déjà installés : ${chosenNames.length ? esc(chosenNames.join(", ")) : "aucun pour l'instant"} (${chosenNames.length}/4). ${chosenNames.length >= 1 ? `<button class="btn btn-primary btn-small" id="btn-start-mp">Lancer la partie avec ces clubs</button>` : ""}</div>` : ""}
      <div class="league-tabs" id="league-country-tabs">${countries.map((c, i) => `<button class="tab-chip ${i === 0 ? "active" : ""}" data-country="${c.key}">${esc(c.label)}</button>`).join("")}</div>
      <input type="search" id="club-search" class="club-search" placeholder="🔎 Rechercher un club ou une ville…" autocomplete="off" />
      <div id="club-list-wrap"></div>
      <div class="creation-footer"><button class="btn btn-ghost" id="back-creation">Retour</button></div></div>`;

    function list(ck) {
      const country = state.countries[ck], wrap = document.getElementById("club-list-wrap");
      const ok = playable ? playable[ck] || [] : null;
      const keys = Object.keys(country.leagues).filter((k) => !ok || ok.includes(country.leagues[k].tier)).sort((a, b) => country.leagues[a].tier - country.leagues[b].tier || a.localeCompare(b));
      wrap.innerHTML = keys.map((dk, di) => {
        const lg = country.leagues[dk];
        return `<details class="league-fold" ${di === 0 ? "open" : ""}><summary class="league-name">${esc(lg.name)} <span class="count-tag">${lg.clubs.length}</span></summary><div class="club-grid">
          ${lg.clubs.map((club) => { const isFav = fav && club.name.toLowerCase().includes(fav); const taken = (state.userClubIds || []).includes(club.id);
            return `<div class="club-card-wrap"><button class="club-card" data-club="${club.id}" data-q="${esc((club.name + " " + club.city).toLowerCase())}" ${taken ? "disabled" : ""}>${clubLogoSvg(club)}<span class="club-card-txt"><span class="club-name">${isFav ? "⭐ " : ""}${esc(club.name)}${taken ? " ✓" : ""}</span><span class="club-meta">${esc(club.city)} · Rép. ${club.reputation} · ${fmtMoneyRaw(club.budget, COUNTRIES[ck].currency)}</span></span></button><button type="button" class="cs-info" data-clubsheet="${club.id}" aria-label="Fiche du club ${esc(club.name)}">ⓘ</button></div>`; }).join("")}
        </div></details>`;
      }).join("") || `<p class="hint">Aucune division jouable dans ce pays.</p>`;
      const si = document.getElementById("club-search");
      if (si) si.oninput = () => applyClubFilter(si.value);
      if (si && si.value) applyClubFilter(si.value);
      wrap.querySelectorAll(".club-card").forEach((el) => {
        el.onclick = () => {
          try { setUserClub(parseInt(el.dataset.club, 10)); ui.firedNotice = false; saveGame(); } catch (err) { console.error("Erreur au choix du club :", err); return; }
          if (mpActive && (state.userClubIds || []).length < 4) render(); else { ui.screen = "dashboard"; ui.tab = "overview"; render(); }
        };
      });
    }
    window.scrollTo(0, 0);
    const tabs = document.getElementById("league-country-tabs");
    tabs.querySelectorAll(".tab-chip").forEach((t) => { t.onclick = () => { tabs.querySelectorAll(".tab-chip").forEach((x) => x.classList.remove("active")); t.classList.add("active"); list(t.dataset.country); }; });
    if (countries.length) list(countries[0].key);
    document.getElementById("back-creation").onclick = () => { ui.screen = ui.wz ? "creation" : "menu"; if (ui.wz) { ui.wz.step = 4; renderWizard(); } else render(); };
    const sm = document.getElementById("btn-start-mp"); if (sm) sm.onclick = () => { ui.screen = "dashboard"; ui.tab = "overview"; render(); };
  };

  // Le club de cœur apporte un petit bonus de réputation
  const origSet = window.setUserClub;
  window.setUserClub = function (id) {
    const r = origSet.apply(this, arguments);
    try {
      const p = state.ds.profile, c = getClub(id);
      if (p && p.favClub && c && !state.ds.favDone && c.name.toLowerCase().includes(p.favClub.trim().toLowerCase()) && p.favClub.trim().length > 2) {
        state.ds.favDone = true; state.ds.reputation = (state.ds.reputation || 30) + 2;
        try { state.news.unshift({ date: fmtDate(state.date), text: `${state.ds.name} prend les rênes de son club de cœur, ${c.name} : la ferveur est au rendez-vous.` }); } catch (e) {}
      }
    } catch (e) {}
    return r;
  };

  // Offres d'emploi : seulement les clubs des divisions jouables (corrigé aussi dans dossiers.js, gameplay.js et engine.js)
  // ---------------------------------------------------------------
  // Carte « Mon profil » (onglet Club)
  // ---------------------------------------------------------------
  const origClubTab = window.renderClubTab;
  window.renderClubTab = function () {
    const base = origClubTab ? origClubTab.apply(this, arguments) : "";
    try {
      const p = state.ds && state.ds.profile; if (!p) return base;
      const bg = BACKGROUNDS[p.bg] || {};
      return `<div class="dossier pf-card"><div class="pf-prev">${figure(p, 84)}</div><div><h3 style="margin:0 0 4px">${esc(state.ds.name)}</h3>
        <p class="hint" style="margin:0">${p.age} ans · ${esc(p.nat)} · né(e) en ${esc(p.birth)}<br>${esc(bg.label || "")} · ${esc(PHILS[p.phil] || "")}<br>Club de cœur : ${esc(p.favClub || "—")} · Sélection de cœur : ${esc(p.favNat || "—")}</p></div></div>` + base;
    } catch (e) { return base; }
  };
  window.dsProfile = { figure, BACKGROUNDS, PHILS, isPlayableClub };
})();
