// =====================================================================
// AIDE : tutoriel interactif (surbrillance + étapes à réaliser) et
// infobulles pour chaque terme technique (glossaire).
// =====================================================================
(function () {
  "use strict";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isMobile = () => window.matchMedia("(max-width: 720px)").matches;

  // ---------------------------------------------------------------
  // GLOSSAIRE
  // ---------------------------------------------------------------
  const GLOSS = [
    { t: ["réputation"], n: "Réputation", d: "Votre notoriété de directeur sportif (0-100) et celle du club. Elle attire de meilleures offres d'emploi, de meilleurs joueurs et facilite les négociations." },
    { t: ["enveloppe de transferts", "budget de transferts", "budget disponible"], n: "Budget de transferts", d: "L'argent que le club peut réellement dépenser en indemnités de transfert, après avoir gardé une réserve pour payer les salaires." },
    { t: ["masse salariale"], n: "Masse salariale", d: "Somme des salaires mensuels des joueurs. Elle ne doit pas dépasser le plafond fixé par le club." },
    { t: ["plafond salarial", "budget salarial"], n: "Plafond salarial", d: "Montant mensuel maximal de salaires que le club accepte de payer. Au-delà, vous ne pouvez plus recruter." },
    { t: ["clause libératoire"], n: "Clause libératoire", d: "Montant fixé au contrat : si un club le verse, le joueur peut partir sans négociation avec son club actuel." },
    { t: ["clause de revente", "clauses de revente"], n: "Clause de revente", d: "Pourcentage d'une future vente reversé à l'ancien club du joueur." },
    { t: ["option d'achat"], n: "Option d'achat", d: "Dans un prêt : droit (mais pas obligation) d'acheter définitivement le joueur à un prix fixé d'avance." },
    { t: ["obligation d'achat"], n: "Obligation d'achat", d: "Dans un prêt : l'achat devient automatique si une condition est remplie (ici, un nombre de matchs joués)." },
    { t: ["prêt", "prêté", "prêts"], n: "Prêt", d: "Un joueur est confié temporairement à un autre club, qui paie son salaire. Il revient à la fin du prêt, sauf achat." },
    { t: ["formé au club", "formés au club", "joueur formé"], n: "Formé au club", d: "Joueur issu du centre de formation. Les supporters les adorent, et leur vente rapporte une indemnité de formation (10 %)." },
    { t: ["indemnité de formation"], n: "Indemnité de formation", d: "Somme reçue quand vous vendez un joueur que vous avez formé." },
    { t: ["solidarité"], n: "Mécanisme de solidarité", d: "3 % d'un transfert sont reversés au club qui a formé un joueur de moins de 23 ans." },
    { t: ["potentiel"], n: "Potentiel", d: "Niveau maximal estimé qu'un joueur peut atteindre. Plus votre réseau de scouting est bon, plus l'estimation est précise." },
    { t: ["fatigue"], n: "Fatigue", d: "Usure physique (0-100). Elle monte avec les matchs, baisse avec le repos, et augmente le risque de blessure." },
    { t: ["loyauté"], n: "Loyauté", d: "Attachement d'une personne au club. Une faible loyauté facilite un départ ou un débauchage." },
    { t: ["moral"], n: "Moral", d: "Humeur d'un joueur. Il baisse s'il joue moins que prévu et influence légèrement le niveau de l'équipe." },
    { t: ["cohésion"], n: "Cohésion", d: "Esprit de groupe, calculé à partir du moral moyen, des cadres et du nombre de mécontents." },
    { t: ["scouting", "recrutement"], n: "Scouting", d: "Observation des joueurs par vos recruteurs. Il détermine ce que vous savez d'un joueur (niveau, potentiel, attributs)." },
    { t: ["recruteur", "recruteurs"], n: "Recruteur", d: "Membre du staff qui observe des joueurs dans un pays. Son réseau et son jugement améliorent la précision des rapports." },
    { t: ["analyste vidéo"], n: "Analyste vidéo", d: "Rend les rapports de scouting et d'adversaire plus fiables." },
    { t: ["shortlist", "ma liste"], n: "Shortlist", d: "Votre liste de joueurs à suivre. Elle sert de base pour demander des observations ou des négociations." },
    { t: ["agent"], n: "Agent", d: "Représentant du joueur. Il négocie son salaire, sa prime et sa propre commission." },
    { t: ["commission"], n: "Commission", d: "Pourcentage du transfert versé à l'agent à la signature." },
    { t: ["prime à la signature"], n: "Prime à la signature", d: "Somme versée une seule fois au joueur quand il signe son contrat." },
    { t: ["fin de contrat"], n: "Fin de contrat", d: "Un joueur dont le contrat expire peut partir libre ; en dernière année, il peut signer ailleurs." },
    { t: ["mercato"], n: "Mercato", d: "Période pendant laquelle les transferts sont autorisés (été et hiver)." },
    { t: ["trêve internationale", "trêves internationales"], n: "Trêve internationale", d: "Pause du championnat pendant laquelle les joueurs rejoignent leur sélection nationale." },
    { t: ["objectif de la saison", "objectif de saison"], n: "Objectif de saison", d: "Mission fixée par le conseil. Vous pouvez la négocier au début de la saison." },
    { t: ["confiance du conseil"], n: "Confiance du conseil", d: "Jauge qui compare votre classement à l'objectif. Trop basse, elle entraîne des avertissements et des malus." },
    { t: ["tribunes", "supporters"], n: "Tribunes", d: "Humeur des supporters. Elle influence l'affluence au stade et donc les recettes." },
    { t: ["presse"], n: "Presse", d: "Image du club dans les médias. Elle influence votre réputation de directeur sportif." },
    { t: ["planificateur d'effectif"], n: "Planificateur", d: "Compare vos titulaires au reste du championnat et projette l'effectif sur 3 ans pour repérer les besoins." },
    { t: ["possession"], n: "Possession", d: "Style de jeu qui garde le ballon. Pourcentage du temps de balle dans les statistiques de match." },
    { t: ["contre-attaque"], n: "Contre-attaque", d: "Style de jeu qui attend derrière puis frappe vite." },
    { t: ["jeu direct"], n: "Jeu direct", d: "Style de jeu aux longs ballons vers l'avant." },
    { t: ["mentalité"], n: "Mentalité", d: "Offensive, équilibrée ou défensive : renforce l'attaque ou la défense au détriment de l'autre." },
    { t: ["xg", "buts attendus"], n: "xG (buts attendus)", d: "Nombre de buts qu'une équipe aurait dû marquer d'après la qualité de ses occasions." },
    { t: ["data hub"], n: "Data hub", d: "Statistiques avancées de vos derniers matchs." },
    { t: ["hotseat"], n: "Hotseat", d: "Mode multijoueur local : plusieurs directeurs sportifs se relaient sur le même appareil." },
    { t: ["club affilié", "clubs affiliés", "club parent"], n: "Club affilié", d: "Club partenaire où vous pouvez envoyer des joueurs ; le club parent vous donne accès à son vivier." },
    { t: ["équipe réserve"], n: "Équipe réserve", d: "Équipe de jeunes et de remplaçants qui joue son propre championnat." },
    { t: ["kinésithérapeute", "kiné"], n: "Kinésithérapeute", d: "Réduit le nombre et la durée des blessures." },
    { t: ["préparateur physique"], n: "Préparateur physique", d: "Améliore la récupération et limite les blessures." },
    { t: ["blessure", "blessures"], n: "Blessure", d: "Indisponibilité d'un joueur. Le risque dépend de la charge, de l'âge, du poste et de la période de la saison." },
    { t: ["régen", "régens"], n: "Régen", d: "Joueur généré (par exemple le fils d'une légende) qui remplace les retraités." },
    { t: ["wonderkid", "wonderkids"], n: "Wonderkid", d: "Très jeune joueur au potentiel exceptionnel." },
    { t: ["éclosion tardive"], n: "Éclosion tardive", d: "Joueur dont le potentiel est sous-estimé : il explose vers 21-23 ans." },
    { t: ["coupe nationale"], n: "Coupe nationale", d: "Compétition à élimination directe ouverte aux clubs de haut niveau du pays." },
    { t: ["ligue des champions"], n: "Ligue des Champions", d: "Coupe d'Europe des meilleurs clubs (4 premiers de l'élite de chaque pays suivi)." },
    { t: ["ligue europa"], n: "Ligue Europa", d: "Deuxième coupe d'Europe (5ᵉ et 6ᵉ de l'élite)." }
  ];
  const VARIANTS = new Map();
  GLOSS.forEach((g) => g.t.forEach((v) => VARIANTS.set(v.toLowerCase(), g)));
  const RX = new RegExp("(?<![\\p{L}\\p{N}])(" + [...VARIANTS.keys()].sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![\\p{L}\\p{N}])", "giu");
  const SKIP = "SCRIPT,STYLE,TEXTAREA,INPUT,SELECT,OPTION,BUTTON,A,H1,H2,H3,H4,SVG,ABBR,CODE,TH,.tab-btn,.bn-btn,.more-item,.tuto-card,#help-menu,#gloss-tip,.tf-bar";
  const skipEl = (el) => el.closest && el.closest(SKIP);
  const glossOn = () => lsGet("ds_gloss_off") !== "1";

  function decorate(rootEl, perTerm) {
    if (!rootEl || !glossOn()) return;
    const counts = {};
    rootEl.querySelectorAll("abbr.gloss").forEach((a) => { counts[a.dataset.k] = (counts[a.dataset.k] || 0) + 1; });
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim().length > 3 && n.parentElement && !skipEl(n.parentElement)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((node) => {
      const text = node.nodeValue; RX.lastIndex = 0; let m, last = 0, frag = null;
      while ((m = RX.exec(text))) {
        const g = VARIANTS.get(m[1].toLowerCase()); if (!g) continue;
        if ((counts[g.n] || 0) >= perTerm) continue;
        counts[g.n] = (counts[g.n] || 0) + 1;
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const a = document.createElement("abbr"); a.className = "gloss"; a.dataset.k = g.n; a.tabIndex = 0; a.textContent = m[1];
        frag.appendChild(a); last = m.index + m[1].length;
      }
      if (frag) { frag.appendChild(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag, node); }
    });
  }
  const TARGETS = [["#tab-content", 2], ["#player-modal", 1], ["#gp-root", 1], ["#rz-root", 1], ["#dp-root", 1], ["#match-modal", 1], ["#loan-modal", 1], [".menu-screen", 1]];
  let obs = null, timer = null;
  function pass() {
    timer = null; if (obs) obs.disconnect();
    try { TARGETS.forEach(([sel, per]) => document.querySelectorAll(sel).forEach((el) => decorate(el, per))); } catch (e) { console.warn("glossaire", e); }
    if (obs) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function schedule() { if (!timer) timer = setTimeout(pass, 120); }
  obs = new MutationObserver((muts) => { if (muts.some((m) => !(m.target.id === "gloss-tip" || (m.target.closest && m.target.closest("#gloss-tip, .tuto-card, #help-menu, #help-fab, .tuto-spot, #ds-toast, #ptr")))) ) schedule(); });

  // infobulle
  let tipEl = null, tipFor = null;
  function showTip(el) {
    const g = GLOSS.find((x) => x.n === el.dataset.k); if (!g) return;
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.id = "gloss-tip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl); }
    tipEl.innerHTML = `<b>${esc(g.n)}</b><span>${esc(g.d)}</span>`; tipEl.style.display = "block"; tipFor = el;
    const r = el.getBoundingClientRect(), tw = Math.min(300, window.innerWidth - 20);
    tipEl.style.width = tw + "px";
    let left = clampN(r.left + r.width / 2 - tw / 2, 10, window.innerWidth - tw - 10);
    tipEl.style.left = left + "px";
    const below = r.bottom + 8; const h = tipEl.offsetHeight;
    tipEl.style.top = (below + h > window.innerHeight - 10 ? Math.max(10, r.top - h - 8) : below) + "px";
  }
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function hideTip() { if (tipEl) tipEl.style.display = "none"; tipFor = null; }
  document.addEventListener("click", (e) => {
    const g = e.target.closest && e.target.closest("abbr.gloss");
    if (g) { e.preventDefault(); e.stopPropagation(); if (tipFor === g) hideTip(); else showTip(g); return; }
    if (!(e.target.closest && e.target.closest("#gloss-tip"))) hideTip();
  }, true);
  document.addEventListener("mouseover", (e) => { const g = e.target.closest && e.target.closest("abbr.gloss"); if (g && !isMobile() && tipFor !== g) showTip(g); });
  document.addEventListener("mouseout", (e) => { const g = e.target.closest && e.target.closest("abbr.gloss"); if (g && !isMobile()) hideTip(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); if (e.key === "Enter" && e.target.classList && e.target.classList.contains("gloss")) showTip(e.target); });
  window.addEventListener("scroll", hideTip, { passive: true });

  // ---------------------------------------------------------------
  // TUTORIEL INTERACTIF
  // ---------------------------------------------------------------
  const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const tabTarget = (tab) => {
    const d = document.querySelector(`.tab-btn[data-tab="${tab}"]`); if (vis(d)) return d;
    const m = document.querySelector(`.bn-btn[data-mtab="${tab}"]`); if (vis(m)) return m;
    return document.getElementById("bn-more");
  };
  const STEPS = [
    { c: true, t: "Bienvenue, Directeur Sportif 👋", x: "Vous ne coachez pas : vous bâtissez l'effectif, négociez les transferts, gérez le staff et répondez au président. Ce tutoriel dure 2 minutes et vous fait toucher chaque écran. Les mots soulignés en pointillés ont une définition : touchez-les." },
    { sel: () => document.querySelector(".scoreboard"), tab: "overview", t: "Votre tableau de bord", x: "Club, date, fenêtre de mercato et budget disponible. La barre de recherche trouve un joueur ou un club dans le monde entier." },
    { sel: () => (isMobile() ? document.getElementById("bn-advance") : document.getElementById("advance-day")), tab: () => (isMobile() ? "overview" : "calendar"), wait: "day", t: "À vous : faire avancer le temps", x: () => (isMobile() ? "Touchez « Jour +1 » dans la barre du bas." : "Cliquez sur « Avancer d'un jour ».") + " Les matchs, transferts et événements se déclenchent au fil des jours." },
    { sel: () => tabTarget("squad"), tab: "squad", t: "Effectif", x: "Vos joueurs, le planificateur (besoins par poste, projection à 3 ans), le vestiaire (moral, cohésion), les plans de développement et les risques de blessure." },
    { sel: () => tabTarget("market"), tab: "market", t: "Recrutement", x: "Recherchez des joueurs par poste, âge, valeur. Ce que vous voyez dépend de votre réseau : les étoiles sont des fourchettes tant qu'un joueur est mal connu. Négociez avec le club, puis avec l'agent." },
    { sel: () => tabTarget("scouting"), tab: "scouting", t: "Scouting", x: "Affectez vos recruteurs à des pays ou des joueurs. La « réunion de recrutement » ci-dessous vous propose des cibles pour vos postes prioritaires." },
    { sel: () => tabTarget("staff"), tab: "staff", t: "Staff", x: "Engagez entraîneurs, kinés, recruteurs… Surveillez leur fatigue et leur loyauté : un staff mal payé peut être débauché." },
    { sel: () => tabTarget("inbox"), tab: "inbox", t: "Messages", x: "Offres de transfert reçues, événements de joueurs, propositions d'autres clubs pour vous recruter : tout arrive ici." },
    { sel: () => tabTarget("club"), tab: "club", t: "Club, conseil et médias", x: "Votre objectif de saison, la confiance du conseil, l'humeur de la presse et des tribunes, les statistiques avancées de vos matchs." },
    { sel: () => tabTarget("finance"), tab: "finance", t: "Finances", x: "Recettes, salaires, dettes et sponsors. Un budget sain vous permet de recruter ; un déficit vous bride." },
    { sel: () => document.querySelector("#tab-content"), tab: "squad", wait: "player", t: "À vous : ouvrir une fiche joueur", x: "Touchez le nom d'un joueur dans l'effectif pour ouvrir sa fiche : attributs, contrat, statuts, historique." },
    { c: true, t: "C'est parti ! 🚀", x: "Le bouton « ? » en bas à droite rouvre ce tutoriel et le glossaire à tout moment. Sauvegardez dans l'un des 3 emplacements depuis le menu, et exportez régulièrement votre partie. Bon mercato !" }
  ];
  let tuto = null, spot = null, card = null, tick = null;
  function dashboardReady() { return typeof ui !== "undefined" && ui.screen === "dashboard" && typeof state !== "undefined" && state && state.ds; }
  const anyModal = () => !!document.querySelector("#gp-root .modal-backdrop, #rz-root .modal-backdrop, #match-modal .modal-backdrop, #player-modal .modal-backdrop, #dp-root .modal-backdrop, #loan-modal .modal-backdrop");
  function startTuto(force) {
    if (tuto) return;
    tuto = { i: 0, day0: null }; mountCard(); gotoStep(0);
    if (!tick) tick = setInterval(update, 350);
  }
  function mountCard() {
    if (!document.getElementById("tuto-root")) { const r = document.createElement("div"); r.id = "tuto-root"; document.body.appendChild(r); }
    document.getElementById("tuto-root").innerHTML = `<div class="tuto-spot"></div><div class="tuto-card" role="dialog" aria-live="polite"></div>`;
    spot = document.querySelector(".tuto-spot"); card = document.querySelector(".tuto-card");
  }
  function endTuto(done) {
    if (done) lsSet("ds_tuto_v1", "1");
    tuto = null; clearInterval(tick); tick = null;
    const r = document.getElementById("tuto-root"); if (r) r.innerHTML = "";
  }
  const val = (v) => (typeof v === "function" ? v() : v);
  function gotoStep(i) {
    tuto.i = i; const s = STEPS[i]; if (!s) return endTuto(true);
    tuto.waited = false; tuto.day0 = state.dayCounter;
    const tab = val(s.tab);
    if (tab && ui.tab !== tab) { ui.tab = tab; ui.moreOpen = false; render(); window.scrollTo(0, 0); }
    const pm = document.getElementById("player-modal"); if (pm && s.wait !== "player" && pm.innerHTML) pm.innerHTML = "";
    draw(); update();
  }
  function draw() {
    const s = STEPS[tuto.i]; const last = tuto.i === STEPS.length - 1;
    card.innerHTML = `<div class="tuto-top"><span class="tuto-n">${tuto.i + 1}/${STEPS.length}</span><button class="tuto-x" data-tuto="skip" aria-label="Fermer le tutoriel">✕</button></div>
      <h4>${esc(s.t)}</h4><p>${esc(val(s.x))}</p>
      <div class="tuto-actions">
        ${tuto.i > 0 ? `<button class="btn btn-small btn-ghost" data-tuto="prev">Précédent</button>` : `<button class="btn btn-small btn-ghost" data-tuto="skip">Passer</button>`}
        <button class="btn btn-small btn-primary" data-tuto="next" ${s.wait && !tuto.waited ? "disabled" : ""}>${last ? "Terminer" : s.wait && !tuto.waited ? "En attente de votre action…" : "Suivant"}</button>
      </div>${s.wait && !tuto.waited ? `<button class="tuto-link" data-tuto="force">Passer cette étape</button>` : ""}`;
  }
  function update() {
    if (!tuto || !card) return;
    const s = STEPS[tuto.i]; if (!s) return;
    if (!dashboardReady()) return;
    if (s.wait && !tuto.waited) {
      const ok = s.wait === "day" ? state.dayCounter > tuto.day0 : !!document.querySelector("#player-modal .modal");
      if (ok) { tuto.waited = true; draw(); if (s.wait === "day") setTimeout(() => { if (tuto && STEPS[tuto.i] === s) next(); }, 700); }
    }
    const el = s.c ? null : s.sel && s.sel();
    if (el && vis(el)) {
      const r = el.getBoundingClientRect(); const pad = 6;
      Object.assign(spot.style, { display: "block", left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: Math.min(r.height, window.innerHeight * 0.55) + pad * 2 + "px" });
      const mid = r.top + Math.min(r.height, window.innerHeight * 0.55) / 2;
      card.classList.toggle("tuto-top-pos", mid > window.innerHeight * 0.5);
      card.classList.remove("tuto-center");
    } else { spot.style.display = "none"; card.classList.add("tuto-center"); card.classList.remove("tuto-top-pos"); }
  }
  function next() { if (!tuto) return; if (tuto.i >= STEPS.length - 1) endTuto(true); else gotoStep(tuto.i + 1); }
  function prev() { if (tuto && tuto.i > 0) gotoStep(tuto.i - 1); }
  window.addEventListener("resize", () => { if (tuto) update(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-tuto]"); if (!b) return;
    const c = b.dataset.tuto;
    if (c === "next") next(); else if (c === "prev") prev(); else if (c === "skip") endTuto(true);
    else if (c === "force") { tuto.waited = true; next(); }
  });

  // ---------------------------------------------------------------
  // BOUTON D'AIDE + GLOSSAIRE
  // ---------------------------------------------------------------
  function ensureFab() {
    let f = document.getElementById("help-fab");
    const show = dashboardReady() || (typeof ui !== "undefined" && ui.screen === "menu");
    if (!show) { if (f) f.remove(); const m = document.getElementById("help-menu"); if (m) m.remove(); return; }
    if (!f) { f = document.createElement("button"); f.id = "help-fab"; f.type = "button"; f.setAttribute("aria-label", "Aide"); f.textContent = "?"; document.body.appendChild(f); f.onclick = toggleHelp; }
  }
  function toggleHelp() {
    let m = document.getElementById("help-menu"); if (m) { m.remove(); return; }
    m = document.createElement("div"); m.id = "help-menu";
    m.innerHTML = `<button data-help="tuto">▶ Tutoriel interactif</button><button data-help="gloss">📖 Glossaire</button><button data-help="toggle">${glossOn() ? "🔕 Masquer" : "🔔 Afficher"} les infobulles</button>`;
    document.body.appendChild(m);
  }
  function openGlossary() {
    let r = document.getElementById("gloss-root"); if (!r) { r = document.createElement("div"); r.id = "gloss-root"; document.body.appendChild(r); }
    const list = [...GLOSS].sort((a, b) => a.n.localeCompare(b.n, "fr"));
    r.innerHTML = `<div class="modal-backdrop" style="z-index:90"><div class="modal dossier"><h3>📖 Glossaire</h3>
      <input type="search" id="gloss-search" class="club-search" placeholder="Rechercher un terme…" autocomplete="off" />
      <div id="gloss-list">${list.map((g) => `<div class="gloss-item" data-s="${esc((g.n + " " + g.t.join(" ")).toLowerCase())}"><b>${esc(g.n)}</b><span>${esc(g.d)}</span></div>`).join("")}</div>
      <div class="creation-footer"><button class="btn btn-primary" data-help="closegloss">Fermer</button></div></div></div>`;
    document.getElementById("gloss-search").oninput = (e) => {
      const q = e.target.value.trim().toLowerCase(); r.querySelectorAll(".gloss-item").forEach((it) => { it.style.display = !q || it.dataset.s.includes(q) ? "" : "none"; });
    };
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-help]");
    const menu = document.getElementById("help-menu");
    if (!b) { if (menu && !(e.target.closest && e.target.closest("#help-fab"))) menu.remove(); return; }
    const c = b.dataset.help; if (menu) menu.remove();
    if (c === "tuto") { if (dashboardReady()) startTuto(true); else if (window.dsToast) dsToast("Lancez d'abord une carrière"); }
    else if (c === "gloss") openGlossary();
    else if (c === "closegloss") { const r = document.getElementById("gloss-root"); if (r) r.innerHTML = ""; }
    else if (c === "toggle") {
      lsSet("ds_gloss_off", glossOn() ? "1" : "0");
      if (!glossOn()) document.querySelectorAll("abbr.gloss").forEach((a) => a.replaceWith(document.createTextNode(a.textContent)));
      else schedule();
      if (window.dsToast) dsToast(glossOn() ? "Infobulles activées" : "Infobulles masquées");
    }
  });

  // ---------------------------------------------------------------
  // INTÉGRATION
  // ---------------------------------------------------------------
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      ensureFab(); schedule();
      if (dashboardReady() && !tuto && lsGet("ds_tuto_v1") !== "1" && !anyModal() && !window.__tutoSoon) {
        window.__tutoSoon = setTimeout(() => { window.__tutoSoon = null; if (dashboardReady() && !tuto && lsGet("ds_tuto_v1") !== "1" && !anyModal()) startTuto(false); }, 700);
      }
    } catch (e) { console.warn("aide", e); }
    return r;
  };
  schedule();
  window.tutorial = { start: () => startTuto(true), end: () => endTuto(true), STEPS, GLOSS, decorate, pass, get active() { return !!tuto; }, get step() { return tuto ? tuto.i : -1; }, next };
})();
