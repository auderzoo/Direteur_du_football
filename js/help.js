// =====================================================================
// AIDE (bloc 4) : glossaire, infobulles automatiques sur les termes techniques,
// visite guidée interactive (projecteur sur l'interface, actions à réaliser).
// =====================================================================
(function () {
  "use strict";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isPhone = () => window.matchMedia && window.matchMedia("(max-width: 720px)").matches;

  // ------------------------------------------------------------------
  // GLOSSAIRE : [terme affiché, définition, variantes éventuelles]
  // ------------------------------------------------------------------
  const GLOSSARY = [
    ["Réputation", "Notoriété d'un club (0-100) ou de votre directeur sportif. Elle attire les bons joueurs, les sponsors et les offres de carrière."],
    ["Potentiel", "Niveau maximal qu'un joueur peut atteindre. Pour un joueur peu connu, ce n'est qu'une fourchette estimée par vos recruteurs."],
    ["Niveau", "Qualité actuelle d'un joueur, affichée en étoiles (de 0,5 à 5). Plus la connaissance du joueur est faible, plus la fourchette est large."],
    ["Fatigue", "Usure physique d'un joueur (0-100). Elle monte avec les matchs et fait croître le risque de blessure ; le repos et le préparateur physique la réduisent."],
    ["Forme", "Dynamique récente d'un joueur ou du club (séries de victoires ou de défaites). Elle donne un petit bonus ou malus en match."],
    ["Moral", "État d'esprit d'un joueur. Il influence légèrement son rendement ; il dépend du temps de jeu, du salaire et de l'ambiance."],
    ["Bonheur", "Satisfaction globale d'un joueur dans le club (0-100). Sous 38 pendant plusieurs semaines, il vient vous voir pour se plaindre."],
    ["Cohésion", "Ambiance générale du groupe : moyenne du bonheur des titulaires, modulée par le capitaine."],
    ["Statut", "Rôle promis à un joueur (cadre, titulaire, rotation, remplaçant, espoir) qui fixe le temps de jeu qu'il attend."],
    ["Loyauté", "Attachement d'un joueur ou d'un membre du staff au club. Une loyauté basse favorise les départs et les débauchages."],
    ["Mentorat", "Un joueur expérimenté (28 ans et plus) accompagne un jeune : celui-ci progresse davantage chaque saison."],
    ["Mercato", "Période pendant laquelle les transferts sont autorisés (été et hiver). Hors fenêtre, aucune arrivée ni aucun départ."],
    ["Fenêtres de transfert", "Dates d'ouverture du mercato. Dernier jour : les clubs paniquent et les offres de dernière minute fusent."],
    ["Masse salariale", "Total des salaires mensuels versés aux joueurs. Elle ne peut pas dépasser le budget salarial du club (+5 %)."],
    ["Budget salarial", "Plafond mensuel de salaires fixé par le club. Dépasser la masse salariale autorisée bloque les signatures."],
    ["Plafond salarial", "Limite de masse salariale que le club peut supporter chaque mois."],
    ["Enveloppe de transferts", "Part de la trésorerie que le conseil vous autorise à dépenser en transferts (après réserve pour les salaires et dettes)."],
    ["Trésorerie", "Argent disponible dans les caisses du club."],
    ["Budget conseillé", "Montant raisonnable à investir en recrutement, calculé à partir de la trésorerie et du profil du président."],
    ["Clause libératoire", "Prix fixé dans le contrat : tout club qui le paie peut recruter le joueur sans l'accord de son club."],
    ["Clause de revente", "Pourcentage de la prochaine vente d'un joueur reversé à son ancien club."],
    ["Option d'achat", "Droit (non obligatoire) d'acheter définitivement un joueur prêté, à un prix fixé à l'avance."],
    ["Obligation d'achat", "Le club d'accueil doit acheter le joueur prêté si une condition est remplie (ex. un nombre de matchs joués)."],
    ["Indemnité de formation", "Somme versée au club qui a formé un joueur. Vendre un joueur formé chez vous rapporte 10 % du prix en bonus."],
    ["Solidarité", "Mécanisme qui reverse 3 % d'un transfert au club formateur d'un jeune de 23 ans ou moins."],
    ["Formé au club", "Joueur sorti du centre de formation. Les supporters l'adorent ; en avoir au moins 4 est recommandé."],
    ["Prime à la signature", "Somme versée une seule fois au joueur quand il signe son contrat."],
    ["Commission", "Pourcentage du transfert versé à l'agent du joueur (3 à 8 % en général) ; elle se négocie."],
    ["Agent", "Représentant du joueur : il défend son salaire, sa prime et sa commission, mais sa patience est limitée."],
    ["Contre-offre", "Réponse de l'agent ou du club quand votre proposition est insuffisante : il se rapproche de votre offre."],
    ["Fin de contrat", "Année où le contrat expire. Un joueur libre peut partir gratuitement : mieux vaut prolonger ou vendre avant."],
    ["Joueur libre", "Joueur sans club ou en fin de contrat : il peut être recruté sans indemnité de transfert."],
    ["Prêt", "Un joueur est confié à un autre club pour une durée donnée ; il revient ensuite, sauf achat."],
    ["Liste des transferts", "Joueurs que vous acceptez de vendre : ils reçoivent des offres d'autres clubs."],
    ["Liste de suivi", "Votre liste de joueurs à surveiller (shortlist) pour les recruter ou suivre leur évolution."],
    ["Scouting", "Réseau de recruteurs qui observent les joueurs et font progresser votre connaissance des pays et des championnats."],
    ["Recruteur", "Membre du staff chargé de découvrir des joueurs et de produire des rapports de scouting."],
    ["Analyste vidéo", "Spécialiste qui fiabilise les rapports de scouting et les rapports d'adversaire."],
    ["Directeur de la formation", "Responsable du centre de formation : il améliore la qualité des jeunes promus chaque saison."],
    ["Kinésithérapeute", "Soigne les blessés : blessures plus rares et plus courtes."],
    ["Préparateur physique", "Accélère la récupération de la fatigue et diminue le risque de blessure."],
    ["Connaissance", "Niveau d'information que vous avez sur un joueur (0-100 %). Faible : fourchettes larges et attributs masqués."],
    ["Fiabilité", "Précision d'un rapport. Un rapport peu fiable peut sous-estimer ou surestimer un joueur."],
    ["Observation", "Mission d'un recruteur sur un joueur précis pour améliorer votre connaissance."],
    ["Affiliation", "Accord avec un club partenaire : il prête ou vous laisse observer ses jeunes."],
    ["Confiance du conseil", "Jauge (0-100) qui mesure la satisfaction du conseil : résultats, finances, supporters et presse."],
    ["Objectif de saison", "Résultat attendu par le président (maintien, top 6, podium, titre, promotion…). Le rater coûte de la réputation."],
    ["Posture", "Votre attitude face au président : ambitieuse (plus de risque, plus de gain), réaliste ou prudente."],
    ["Maintien", "Éviter la relégation en fin de saison."],
    ["Promotion", "Monter dans la division supérieure : généralement les deux premiers (ou le vainqueur d'une poule)."],
    ["Relégation", "Descendre en division inférieure : les derniers du classement."],
    ["Poule", "Groupe géographique d'un championnat à plusieurs groupes (National, National 2) ; seul le vainqueur de chaque poule monte."],
    ["Trêve internationale", "Pause du championnat pour les matchs des sélections nationales ; vos internationaux partent, avec un risque de blessure."],
    ["Ligue des Champions", "Grande coupe d'Europe : réservée aux 4 meilleurs de l'élite de chaque pays suivi."],
    ["Ligue Europa", "Seconde coupe d'Europe : pour les 5ᵉ et 6ᵉ de l'élite de chaque pays suivi."],
    ["Coupe Nationale", "Compétition à élimination directe ouverte à l'élite et aux meilleurs clubs de D2."],
    ["Wonderkid", "Jeune joueur au potentiel exceptionnel."],
    ["Prodige", "Profil de jeune très précoce au plafond très élevé, mais sous forte pression."],
    ["Éclosion tardive", "Profil dont le potentiel est sous-estimé : il explose vers 21-23 ans."],
    ["Talent fragile", "Jeune très doué mais sujet aux blessures."],
    ["Régen", "Joueur généré pour renouveler les générations, parfois le fils d'une ancienne légende."],
    ["Risque de blessure", "Probabilité de se blesser : elle dépend de la charge (fatigue), de l'âge, du poste et de la période de la saison."],
    ["Presse", "Humeur des médias envers le club. Elle influence votre réputation de directeur sportif."],
    ["Tribunes", "Humeur des supporters. Elle influence l'affluence au stade et donc les recettes."],
    ["Mentalité", "Style de jeu de l'équipe : offensive, équilibrée ou défensive."],
    ["Possession", "Style de jeu basé sur la conservation du ballon."],
    ["Contre-attaque", "Style de jeu qui attend derrière et frappe vite en transition."],
    ["Jeu direct", "Style de jeu basé sur de longs ballons vers l'avant."],
    ["V-N-D", "Victoires, nuls, défaites."],
    ["Focus recrutement", "Analyse de vos besoins par poste (effectif, niveau, âge, contrats) pour guider vos recherches."],
    ["Planificateur d'effectif", "Vue d'ensemble de l'âge, des contrats et des salaires pour anticiper les saisons à venir."],
    ["Pyramide des âges", "Répartition des joueurs par tranche d'âge."],
    ["Hub de données", "Tableau de bord d'analyse : confiance du conseil, besoins de recrutement, planification et projections."],
    ["Vestiaire", "Onglet qui regroupe statuts, bonheur, promesses et mentorat de vos joueurs."],
    ["Capitaine", "Leader du vestiaire : s'il est mécontent, la cohésion baisse ; s'il est heureux, elle monte."],
    ["Promesse", "Engagement pris envers un joueur (temps de jeu, statut). Tenue : bonheur et loyauté montent ; rompue : colère."],
    ["Honoraires", "Frais versés à l'agent lors d'un transfert."]
  ];
  const GL = {};
  GLOSSARY.forEach(([t, d]) => { GL[t.toLowerCase()] = { t, d }; });
  const TERMS = GLOSSARY.map((g) => g[0]).sort((a, b) => b.length - a.length);
  let RX = null;
  try {
    RX = new RegExp("(?<![\\p{L}\\p{N}])(" + TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![\\p{L}\\p{N}])", "giu");
  } catch (e) { RX = null; }

  // ------------------------------------------------------------------
  // INFOBULLES AUTOMATIQUES
  // ------------------------------------------------------------------
  const SKIP = "button, a, summary, select, option, input, textarea, script, style, label.field, .gl, #help-root, .tour-card, [data-playercard], [onclick], .tf-body, svg, th.sortable";
  function decorate(rootEl) {
    if (!RX || !rootEl) return;
    const fc = rootEl.firstElementChild; if (!fc || fc.dataset.gl) return; fc.dataset.gl = "1";
    const seen = new Set(); const nodes = [];
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || n.nodeValue.trim().length < 4) return NodeFilter.FILTER_REJECT;
        const el = n.parentElement; if (!el || el.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((node) => {
      const text = node.nodeValue; RX.lastIndex = 0;
      let m, last = 0, frag = null;
      while ((m = RX.exec(text))) {
        const key = m[1].toLowerCase(); if (seen.has(key) || !GL[key]) continue;
        seen.add(key);
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const sp = document.createElement("span"); sp.className = "gl"; sp.dataset.term = key; sp.tabIndex = 0; sp.textContent = m[1]; frag.appendChild(sp);
        last = m.index + m[1].length;
      }
      if (frag) { if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag, node); }
    });
  }
  const ROOTS = "#tab-content, #player-modal, #gp-root, #rz-root, #fm-root, #match-modal, #loan-modal";
  let busy = false, scheduled = false, obs = null;
  function run() {
    scheduled = false; if (busy) return; busy = true;
    if (obs) obs.disconnect();
    try { document.querySelectorAll(ROOTS).forEach(decorate); } catch (e) { console.warn("infobulles", e); }
    if (obs) obs.observe(document.body, { childList: true, subtree: true });
    busy = false;
  }
  function schedule() { if (scheduled) return; scheduled = true; (window.requestAnimationFrame || setTimeout)(run); }
  obs = new MutationObserver(schedule); obs.observe(document.body, { childList: true, subtree: true });

  let tip = null, tipFor = null, tipAt = 0;
  function showTip(el) {
    const g = GL[el.dataset.term]; if (!g) return;
    if (!tip) { tip = document.createElement("div"); tip.id = "gl-tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    tip.innerHTML = `<b>${esc(g.t)}</b><span>${esc(g.d)}</span>`; tip.style.display = "block"; tipFor = el; tipAt = Date.now();
    const r = el.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 20); tip.style.width = w + "px";
    let x = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width / 2 - w / 2));
    tip.style.left = x + "px";
    const h = tip.offsetHeight; let y = r.bottom + 8; if (y + h > window.innerHeight - 10) y = Math.max(10, r.top - h - 8);
    tip.style.top = y + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; tipFor = null; }
  document.addEventListener("click", (e) => {
    const g = e.target.closest && e.target.closest(".gl");
    if (g) { if (tipFor === g && Date.now() - tipAt > 400) hideTip(); else showTip(g); e.stopPropagation(); return; }
    hideTip();
  }, true);
  document.addEventListener("mouseover", (e) => { const g = e.target.closest && e.target.closest(".gl"); if (g && window.matchMedia("(hover: hover)").matches) showTip(g); });
  document.addEventListener("mouseout", (e) => { const g = e.target.closest && e.target.closest(".gl"); if (g && window.matchMedia("(hover: hover)").matches) hideTip(); });
  document.addEventListener("focusin", (e) => { const g = e.target.closest && e.target.closest(".gl"); if (g) showTip(g); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });

  // ------------------------------------------------------------------
  // PANNEAU D'AIDE + GLOSSAIRE
  // ------------------------------------------------------------------
  let helpRoot = null;
  function hroot() { if (!helpRoot || !document.body.contains(helpRoot)) { helpRoot = document.createElement("div"); helpRoot.id = "help-root"; document.body.appendChild(helpRoot); } return helpRoot; }
  function hshow(html) { hroot().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">${html}</div></div>`; }
  function hclose() { hroot().innerHTML = ""; }
  function openHelp() {
    const inGame = typeof ui !== "undefined" && ui.screen === "dashboard";
    hshow(`<h3>❓ Aide</h3>
      <div class="stance-list">
        ${inGame ? `<button class="stance-card" data-help="tour"><b>🧭 Visite guidée interactive</b><span class="hint">Découvrez l'interface en pratiquant (2 minutes).</span></button>` : ""}
        <button class="stance-card" data-help="glossary"><b>📖 Glossaire</b><span class="hint">${GLOSSARY.length} termes expliqués. Dans le jeu, touchez un terme souligné en pointillés pour voir sa définition.</span></button>
        <button class="stance-card" data-help="gestures"><b>👆 Gestes et astuces</b><span class="hint">Navigation au doigt, tableaux plein écran, sauvegardes.</span></button>
      </div>
      <div class="creation-footer"><button class="btn btn-ghost" data-help="close">Fermer</button></div>`);
  }
  function openGlossary(filter) {
    const f = (filter || "").toLowerCase();
    const list = GLOSSARY.filter(([t, d]) => !f || t.toLowerCase().includes(f) || d.toLowerCase().includes(f)).sort((a, b) => a[0].localeCompare(b[0], "fr"));
    hshow(`<h3>📖 Glossaire</h3>
      <input type="search" id="gloss-q" class="club-search" placeholder="Rechercher un terme…" value="${esc(filter || "")}" autocomplete="off" />
      <div class="gloss-list">${list.map(([t, d]) => `<div class="gloss-item"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("") || `<p class="hint">Aucun terme trouvé.</p>`}</div>
      <div class="creation-footer"><button class="btn btn-ghost" data-help="help">Retour</button><button class="btn btn-primary" data-help="close">Fermer</button></div>`);
    const q = document.getElementById("gloss-q"); if (q) { q.focus(); q.oninput = () => { const pos = q.value; openGlossary(pos); const q2 = document.getElementById("gloss-q"); if (q2) { q2.focus(); q2.setSelectionRange(pos.length, pos.length); } }; }
  }
  function openGestures() {
    hshow(`<h3>👆 Gestes et astuces</h3>
      <ul class="help-ul">
        <li><b>Glisser à gauche / à droite</b> sur un écran : changer d'onglet.</li>
        <li><b>Tirer vers le bas</b> depuis le haut de l'écran : actualiser et sauvegarder.</li>
        <li><b>▶ Jour +1</b> (barre du bas) : avancer d'un jour. « Plus » ouvre les autres onglets.</li>
        <li><b>Tableau plein écran</b> : bouton au-dessus des grands tableaux ; tournez le téléphone en paysage.</li>
        <li><b>Termes soulignés</b> : touchez-les pour une définition.</li>
        <li><b>Sauvegardes</b> : 3 emplacements dans le menu, avec export automatique de fin de saison en option.</li>
      </ul><div class="creation-footer"><button class="btn btn-ghost" data-help="help">Retour</button><button class="btn btn-primary" data-help="close">Fermer</button></div>`);
  }

  // ------------------------------------------------------------------
  // VISITE GUIDÉE INTERACTIVE
  // ------------------------------------------------------------------
  function tabTarget(key) {
    if (isPhone()) return document.querySelector(`.bottom-nav [data-mtab="${key}"]`) || document.querySelector(`.more-item[data-mtab="${key}"]`) || document.getElementById("bn-more");
    return document.querySelector(`.folder-tabs [data-tab="${key}"]`);
  }
  const moreHint = (key) => (isPhone() && !document.querySelector(`.bottom-nav [data-mtab="${key}"]`) ? " (ouvrez d'abord « Plus »)" : "");
  const clickTab = (key, label, text) => ({ title: label, text: () => `👉 Touchez l'onglet « ${label} »${moreHint(key)}. ${text}`, target: () => tabTarget(key), wait: { tab: key } });
  const STEPS = [
    { title: "Bienvenue, directeur sportif !", text: () => "Vous ne coachez pas l'équipe : vous bâtissez l'effectif. Recruter, négocier, former, gérer le budget et le vestiaire. Cette visite dure 2 minutes ; vous pouvez la quitter à tout moment.", target: null, wait: "next" },
    { title: "Votre tableau de bord", text: () => "En haut : votre club, la date, l'état du mercato et votre trésorerie. C'est votre boussole.", target: () => document.querySelector(".scoreboard"), wait: "next", tab: "overview" },
    { title: "Vue d'ensemble", text: () => "Prochain match (avec rapport d'adversaire), forme, objectif fixé par le président, tendances et humeur des médias.", target: () => document.querySelector("#tab-content .hero-card"), wait: "next", tab: "overview" },
    clickTab("squad", "Effectif", "Vous y voyez vos joueurs, leur niveau, leur contrat."),
    { title: "Votre effectif", text: () => "Chaque joueur a un niveau, un potentiel, un contrat. Plus bas : le risque de blessure et les statuts juridiques (formé au club, prêts, clauses). Touchez un joueur pour sa fiche.", target: () => document.getElementById("tab-content"), wait: "next" },
    clickTab("market", "Recrutement", "C'est ici que vous cherchez et recrutez."),
    { title: "Le marché", text: () => "Filtrez par poste, âge, niveau, valeur. Plus vous connaissez un joueur (scouting), plus la fiche est précise. La négociation se déroule avec le club, puis avec l'agent, en plusieurs tours.", target: () => document.getElementById("tab-content"), wait: "next" },
    clickTab("staff", "Staff", "Vos recruteurs, kinés, préparateurs, analystes…"),
    { title: "Votre staff", text: () => "Le staff fait progresser les jeunes, soigne, observe. Attention à la fatigue et à la loyauté : un club rival peut débaucher un membre mécontent.", target: () => document.getElementById("tab-content"), wait: "next" },
    clickTab("dynamics", "Vestiaire", "Statuts, bonheur et promesses de vos joueurs."),
    { title: "Le vestiaire", text: () => "Promettre un statut, c'est s'engager sur le temps de jeu. Un joueur qui joue moins que prévu devient mécontent. Le mentorat associe un ancien à un jeune pour le faire progresser.", target: () => document.getElementById("tab-content"), wait: "next" },
    clickTab("hub", "Hub de données", "L'analyse de votre club."),
    { title: "Hub de données", text: () => "Confiance du conseil, focus recrutement (vos priorités par poste, avec un bouton pour lancer la recherche), pyramide des âges, fins de contrat et projection de la saison prochaine.", target: () => document.getElementById("tab-content"), wait: "next" },
    isPhone()
      ? { title: "Faire avancer le temps", text: () => "👉 Touchez « Jour +1 » pour avancer d'un jour. Les matchs se jouent automatiquement aux dates prévues.", target: () => document.getElementById("bn-advance"), wait: { day: true } }
      : clickTab("calendar", "Calendrier", "Vous y faites avancer le temps."),
    ...(isPhone() ? [] : [{ title: "Faire avancer le temps", text: () => "👉 Cliquez sur « Avancer d'un jour » : les matchs se jouent automatiquement aux dates prévues.", target: () => document.getElementById("advance-day"), wait: { day: true } }]),
    clickTab("inbox", "Boîte de réception", "Offres, entretiens, décisions à prendre."),
    { title: "Votre boîte de réception", text: () => "Offres reçues pour vos joueurs, offres de carrière, événements de joueurs : c'est là que vous recevrez les décisions importantes.", target: () => document.getElementById("tab-content"), wait: "next" },
    { title: "Vous êtes prêt !", text: () => "Le bouton ❓ reste disponible : visite guidée, glossaire et astuces. Touchez les termes soulignés pour leur définition. Bonne carrière !", target: () => document.getElementById("help-fab"), wait: "next" }
  ];
  let tour = null, tourTimer = null, spot = null, card = null;
  function stopTour(done) {
    if (tourTimer) clearInterval(tourTimer); tourTimer = null; tour = null;
    if (spot) spot.remove(); if (card) card.remove(); spot = card = null;
    if (done) lsSet("ds_tour_done", "1");
  }
  function startTour() {
    hclose(); stopTour(false);
    if (typeof ui === "undefined" || ui.screen !== "dashboard") return;
    tour = { i: 0, day: state.dayCounter };
    spot = document.createElement("div"); spot.className = "tour-spot"; document.body.appendChild(spot);
    card = document.createElement("div"); card.className = "tour-card"; document.body.appendChild(card);
    card.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tour]"); if (!b) return;
      if (b.dataset.tour === "skip") stopTour(true); else if (b.dataset.tour === "next") nextStep(); else if (b.dataset.tour === "prev") prevStep();
    });
    renderStep(); tourTimer = setInterval(tick, 250);
  }
  function stepAt(i) { return STEPS[i]; }
  function nextStep() { if (!tour) return; tour.i++; if (tour.i >= STEPS.length) { stopTour(true); return; } renderStep(); }
  function prevStep() { if (!tour || tour.i === 0) return; tour.i--; renderStep(); }
  function renderStep() {
    const s = stepAt(tour.i); if (!s) return;
    if (s.tab && ui.tab !== s.tab) { ui.tab = s.tab; ui.moreOpen = false; render(); }
    if (s.wait && s.wait.day) tour.day = state.dayCounter;
    const waiting = s.wait !== "next";
    card.innerHTML = `<div class="tour-step">Étape ${tour.i + 1} / ${STEPS.length}</div><b>${esc(s.title)}</b><p>${esc(s.text())}</p>
      <div class="tour-btns"><button class="btn btn-ghost btn-small" data-tour="skip">Quitter</button>${tour.i > 0 ? `<button class="btn btn-ghost btn-small" data-tour="prev">←</button>` : ""}<button class="btn btn-primary btn-small" data-tour="next">${waiting ? "Passer" : tour.i === STEPS.length - 1 ? "Terminer" : "Suivant"}</button></div>`;
    place();
  }
  function place() {
    if (!tour) return; const s = stepAt(tour.i); const el = s.target ? s.target() : null;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) {
        const big = r.height > window.innerHeight * 0.6;
        if (!big && (r.top < 0 || r.bottom > window.innerHeight)) el.scrollIntoView({ block: "center", behavior: "auto" });
        const r2 = el.getBoundingClientRect(); const h = big ? Math.min(r2.height, window.innerHeight * 0.5) : r2.height;
        spot.style.display = "block"; spot.style.left = (r2.left - 6) + "px"; spot.style.top = (Math.max(0, r2.top) - 6) + "px"; spot.style.width = (r2.width + 12) + "px"; spot.style.height = (h + 12) + "px";
        const low = r2.top > window.innerHeight * 0.5;
        card.style.top = low ? "12px" : "auto"; card.style.bottom = low ? "auto" : (isPhone() ? "78px" : "20px");
        return;
      }
    }
    spot.style.display = "block"; spot.style.left = "50%"; spot.style.top = "50%"; spot.style.width = "0"; spot.style.height = "0";
    card.style.top = "auto"; card.style.bottom = isPhone() ? "78px" : "20px";
  }
  function tick() {
    if (!tour) return; if (ui.screen !== "dashboard") { stopTour(false); return; }
    const s = stepAt(tour.i); if (!s) return;
    if (s.wait && s.wait.tab && ui.tab === s.wait.tab) { nextStep(); return; }
    if (s.wait && s.wait.day && state.dayCounter > tour.day) { nextStep(); return; }
    const sig = s.text(); const p = card && card.querySelector("p"); if (p && p.textContent !== sig) p.textContent = sig;
    place();
  }
  window.addEventListener("resize", () => place());

  // ------------------------------------------------------------------
  // INTÉGRATION
  // ------------------------------------------------------------------
  let fab = null;
  function ensureFab() {
    if (!fab || !document.body.contains(fab)) { fab = document.createElement("button"); fab.id = "help-fab"; fab.type = "button"; fab.setAttribute("aria-label", "Aide"); fab.textContent = "?"; fab.dataset.help = "help"; document.body.appendChild(fab); }
    fab.style.display = (typeof ui !== "undefined" && ui.screen === "dashboard") ? "flex" : "none";
  }
  const anyModal = () => !!document.querySelector("#gp-root .modal-backdrop, #rz-root .modal-backdrop, #fm-root .modal-backdrop, #match-modal .modal-backdrop, #player-modal .modal-backdrop, #help-root .modal-backdrop");
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      ensureFab();
      if (ui.screen === "dashboard" && state && state.ds && !tour && !lsGet("ds_tour_offer") && ui.tab === "overview" && !anyModal() && (state.dayCounter || 0) < 3) {
        lsSet("ds_tour_offer", "1");
        hshow(`<h3>🧭 Visite guidée ?</h3><p>Voulez-vous une visite interactive de 2 minutes pour découvrir l'interface ? Vous pouvez la relancer à tout moment avec le bouton ❓.</p>
          <div class="creation-footer"><button class="btn btn-ghost" data-help="close">Plus tard</button><button class="btn btn-primary" data-help="tour">Commencer</button></div>`);
      }
      if (ui.screen === "menu") {
        const act = document.querySelector(".menu-actions"); const box = document.querySelector(".menu-screen");
        if (box && !box.querySelector("#btn-help")) { const b = document.createElement("button"); b.id = "btn-help"; b.className = "btn btn-ghost btn-small"; b.style.marginTop = "10px"; b.textContent = "❓ Aide et glossaire"; b.dataset.help = "help"; (act && act.parentNode) ? act.parentNode.appendChild(b) : box.appendChild(b); }
      }
    } catch (e) { console.warn("aide", e); }
    return r;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-help]"); if (!b) return;
    const c = b.dataset.help;
    if (c === "close") hclose(); else if (c === "help") openHelp(); else if (c === "glossary") openGlossary(); else if (c === "gestures") openGestures(); else if (c === "tour") startTour();
  });
  ensureFab();
  window.dsHelp = { GLOSSARY, GL, decorate, startTour, stopTour, openHelp, openGlossary, STEPS, tourState: () => tour };
})();
