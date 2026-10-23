// =====================================================================
// BLOC 18 (3/4) : CRÉER SON PROPRE CLUB
//  - Nom, ville, surnom, pays de départ et division de départ
//  - Logo personnalisé (forme, deux couleurs, emblème, initiales)
//  - Maillots domicile / extérieur (couleurs et motif)
//  - Stade (nom et capacité)
//  Le club créé prend la place d'un club existant de la division choisie (le calendrier reste cohérent).
//  Les maillots et le stade sont modifiables ensuite depuis l'onglet « Club ».
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ready = () => typeof state !== "undefined" && state && state.countries && Object.keys(state.countries).length;
  const money = (v) => fmtMoney(Math.round(v));
  const toast = (t) => { try { window.dsToast ? window.dsToast(t) : null; } catch (e) {} };

  const SHAPES = { shield: "🛡️ Écusson", circle: "⚫ Rond", star: "⭐ Étoile", diamond: "🔷 Losange" };
  const EMBLEMS = { none: "Aucun", ball: "Ballon", star: "Étoile", bolt: "Éclair", crown: "Couronne", wave: "Vagues", tower: "Tour" };
  const PATTERNS = { uni: "Uni", rayures: "Rayures verticales", bande: "Bande horizontale", moities: "Deux moitiés", cerceaux: "Cerceaux" };
  const SHAPE_PATH = {
    shield: (f, s) => `<path d="M20 2 L36 8 V20 C36 30 28 36 20 38 C12 36 4 30 4 20 V8 Z" fill="${f}" stroke="${s}" stroke-width="2"/>`,
    circle: (f, s) => `<circle cx="20" cy="20" r="17" fill="${f}" stroke="${s}" stroke-width="2"/>`,
    star: (f, s) => `<path d="M20 2 L24.5 15 L38 15 L27 23 L31 36 L20 28 L9 36 L13 23 L2 15 L15.5 15 Z" fill="${f}" stroke="${s}" stroke-width="1.5"/>`,
    diamond: (f, s) => `<path d="M20 2 L38 20 L20 38 L2 20 Z" fill="${f}" stroke="${s}" stroke-width="2"/>`
  };
  const EMBLEM_SVG = {
    ball: (c, b) => `<circle cx="20" cy="14" r="6.5" fill="${c}"/><path d="M20 10 L23.4 12.5 L22.1 16.5 L17.9 16.5 L16.6 12.5 Z" fill="${b}"/>`,
    star: (c) => `<path d="M20 7 L21.9 12 L27 12 L23 15.2 L24.4 20 L20 17.2 L15.6 20 L17 15.2 L13 12 L18.1 12 Z" fill="${c}"/>`,
    bolt: (c) => `<path d="M22.5 6 L14.5 15.5 L19.5 15.5 L17.5 22 L26 12 L21 12 Z" fill="${c}"/>`,
    crown: (c) => `<path d="M12 19 L13 9 L17 13 L20 8 L23 13 L27 9 L28 19 Z" fill="${c}"/>`,
    wave: (c) => `<path d="M11 11 q3 -3 6 0 t6 0 t6 0 M11 16 q3 -3 6 0 t6 0 t6 0" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    tower: (c) => `<path d="M14.5 20 V9 H17 V12 H19 V9 H21 V12 H23 V9 H25.5 V20 Z" fill="${c}"/>`
  };
  const hexOk = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v || "") ? v : d);

  function initialsOf(name) { const w = String(name || "").split(/\s+/).filter(Boolean); return (w.length > 1 ? w.map((x) => x[0]).join("") : String(name || "??").slice(0, 2)).slice(0, 3).toUpperCase(); }

  function logoSvg(cc, name, size) {
    const c1 = hexOk(cc.c1, "#2C4A6E"), c2 = hexOk(cc.c2, "#F4EFE2");
    const ini = esc((cc.initials || initialsOf(name)).slice(0, 3));
    const em = cc.emblem && cc.emblem !== "none" && EMBLEM_SVG[cc.emblem];
    return `<svg width="${size || 40}" height="${size || 40}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${(SHAPE_PATH[cc.shape] || SHAPE_PATH.shield)(c1, c2)}${em ? EMBLEM_SVG[cc.emblem](c2, c1) : ""}<text x="20" y="${em ? 31 : 24.5}" font-family="Big Shoulders Display, sans-serif" font-size="${em ? 9 : 13}" font-weight="700" fill="${c2}" text-anchor="middle">${ini}</text></svg>`;
  }
  let JID = 0;
  function jerseySvg(k, size) {
    const a = hexOk(k.c1, "#2C4A6E"), b = hexOk(k.c2, "#F4EFE2"), id = "jc" + (++JID);
    const body = "M18 6 L8 12 L2 24 L11 28 L14 22 L14 54 H46 V22 L49 28 L58 24 L52 12 L42 6 Q30 14 18 6 Z";
    const pat = ({
      rayures: `<rect x="17" y="0" width="6" height="60" fill="${b}"/><rect x="29" y="0" width="6" height="60" fill="${b}"/><rect x="41" y="0" width="6" height="60" fill="${b}"/>`,
      bande: `<rect x="0" y="28" width="60" height="9" fill="${b}"/>`,
      moities: `<rect x="30" y="0" width="30" height="60" fill="${b}"/>`,
      cerceaux: `<rect x="0" y="18" width="60" height="6" fill="${b}"/><rect x="0" y="31" width="60" height="6" fill="${b}"/><rect x="0" y="44" width="60" height="6" fill="${b}"/>`
    })[k.pat] || "";
    return `<svg width="${size || 56}" height="${size || 56}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs><path d="${body}" fill="${a}"/><g clip-path="url(#${id})">${pat}</g><path d="${body}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/><path d="M24 6 Q30 14 36 6" stroke="${b}" fill="none" stroke-width="2.2"/></svg>`;
  }

  // ---------- logo personnalisé dans toute l'interface ----------
  const origLogo = window.clubLogoSvg;
  window.clubLogoSvg = function (club) {
    if (club && club.cc) { try { return logoSvg(club.cc, club.name, 40); } catch (e) {} }
    return origLogo.apply(this, arguments);
  };

  // ---------- choix du club remplacé ----------
  function tiersOf(country) {
    const set = new Set(); Object.values(country.leagues).forEach((l) => set.add(l.tier)); return [...set].sort((a, b) => a - b);
  }
  function replacedFor(countryKey, tier) {
    const country = state.countries[countryKey]; if (!country) return null;
    const list = [];
    Object.values(country.leagues).forEach((l) => { if (l.tier === tier) l.clubs.forEach((c) => { if (!(state.userClubIds || []).includes(c.id)) list.push(c); }); });
    return list.sort((a, b) => a.tierFactor - b.tierFactor)[0] || null;
  }
  function tierLabel(countryKey, tier) {
    const n = (LEAGUE_NAMES[countryKey] && LEAGUE_NAMES[countryKey]["d" + tier]) || `Division ${tier}`;
    return `Division ${tier} — ${n}`;
  }

  // ---------- application ----------
  function applyIdentity(club, f) {
    club.name = f.name; club.city = f.city || club.city; club.nickname = f.nickname || "";
    club.cc = { c1: f.c1, c2: f.c2, shape: f.shape, emblem: f.emblem, initials: (f.initials || "").toUpperCase().slice(0, 3), home: { c1: f.h1, c2: f.h2, pat: f.hp }, away: { c1: f.a1, c2: f.a2, pat: f.ap } };
    club.kitColor = f.h1; club.logoColor = f.c1; club.logoShape = f.shape;
    delete club.logoUrl;
    if (f.stadium) club.stadiumName = f.stadium;
    if (f.capacity) club.stadiumCapacity = f.capacity;
  }
  function create(f) {
    const err = validate(f, false); if (err) return { ok: false, reason: err };
    const target = replacedFor(f.country, f.tier); if (!target) return { ok: false, reason: "Aucun club disponible dans cette division." };
    const was = target.name;
    applyIdentity(target, f);
    target.custom = true; target.trophies = []; target.records = { biggestWin: null, topScorerName: null, topScorerGoals: 0 };
    setUserClub(target.id);
    state.log.unshift({ date: fmtDate(state.date), text: `Fondation de ${target.name} (${tierLabel(f.country, f.tier)}), qui reprend la place de ${was}.` });
    return { ok: true, club: target, replaced: was };
  }
  function validate(f, edit) {
    const n = (f.name || "").trim();
    if (n.length < 2 || n.length > 28) return "Le nom du club doit faire entre 2 et 28 caractères.";
    if (!edit) {
      const lower = n.toLowerCase();
      if (allClubs().some((c) => c.name.toLowerCase() === lower)) return "Un club porte déjà ce nom.";
    } else if (allClubs().some((c) => c.name.toLowerCase() === n.toLowerCase() && c.id !== userClub().id)) return "Un club porte déjà ce nom.";
    if ((f.initials || "").length > 3) return "Les initiales sont limitées à 3 lettres.";
    return null;
  }

  // ---------- formulaire ----------
  let root = null;
  function rootEl() { if (!root || !document.body.contains(root)) { root = document.createElement("div"); root.id = "cc-root"; document.body.appendChild(root); } return root; }
  let FORM = null, MODE = "create";
  function defaults(country) {
    const tiers = tiersOf(state.countries[country]);
    return { name: "", city: "", nickname: "", country, tier: tiers[tiers.length - 1], c1: "#2C4A6E", c2: "#F4EFE2", shape: "shield", emblem: "star", initials: "", h1: "#2C4A6E", h2: "#F4EFE2", hp: "rayures", a1: "#F4EFE2", a2: "#2C4A6E", ap: "uni", stadium: "", capacity: 0 };
  }
  function capRange(f) {
    const t = replacedFor(f.country, f.tier);
    const base = t ? t.stadiumCapacity : 8000;
    return { min: 1000, max: Math.max(3000, Math.round(base * 1.4 / 500) * 500), base: Math.round(base / 500) * 500 };
  }
  function formHTML() {
    const f = FORM, edit = MODE === "edit";
    const countries = Object.values(state.countries);
    const tiers = tiersOf(state.countries[f.country]);
    const rep = edit ? null : replacedFor(f.country, f.tier);
    const cr = edit ? null : capRange(f);
    if (!edit && !f.capacity) f.capacity = cr.base;
    const sel = (id, opts, cur) => `<select id="${id}">${Object.entries(opts).map(([k, l]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const col = (id, v, l) => `<label class="cc-col"><span>${l}</span><input type="color" id="${id}" value="${hexOk(v, "#000000")}"></label>`;
    return `<div class="modal-backdrop"><div class="modal dossier cc-modal">
      <h3 class="panel-subtitle" style="margin-top:0">${edit ? "Identité, maillots et stade" : "✨ Créer mon club"}</h3>
      <div class="cc-preview" id="cc-preview">${previewHTML()}</div>
      <label class="field"><span>Nom du club</span><input id="cc-name" maxlength="28" value="${esc(f.name)}" placeholder="ex. Olympique du Littoral"></label>
      <label class="field"><span>Ville</span><input id="cc-city" maxlength="28" value="${esc(f.city)}" placeholder="ex. Port-Saint-Louis"></label>
      <label class="field"><span>Surnom (facultatif)</span><input id="cc-nick" maxlength="24" value="${esc(f.nickname)}"></label>
      ${edit ? "" : `<label class="field"><span>Pays de départ</span>${sel("cc-country", Object.fromEntries(countries.map((c) => [c.key, c.label])), f.country)}</label>
      <label class="field"><span>Division de départ</span>${sel("cc-tier", Object.fromEntries(tiers.map((t) => [t, tierLabel(f.country, t)])), String(f.tier))}</label>
      <p class="hint" id="cc-rep">${rep ? `Votre club prend la place de <b>${esc(rep.name)}</b> dans ce championnat (effectif, calendrier et niveau conservés).` : ""}</p>`}
      <h4 class="dos-h">Logo</h4>
      <div class="cc-row">${col("cc-c1", f.c1, "Couleur principale")}${col("cc-c2", f.c2, "Couleur secondaire")}</div>
      <label class="field"><span>Forme</span>${sel("cc-shape", SHAPES, f.shape)}</label>
      <label class="field"><span>Emblème</span>${sel("cc-emblem", EMBLEMS, f.emblem)}</label>
      <label class="field"><span>Initiales (3 max.)</span><input id="cc-ini" maxlength="3" value="${esc(f.initials)}" placeholder="auto"></label>
      <h4 class="dos-h">Maillot domicile</h4>
      <div class="cc-row">${col("cc-h1", f.h1, "Couleur principale")}${col("cc-h2", f.h2, "Couleur secondaire")}</div>
      <label class="field"><span>Motif</span>${sel("cc-hp", PATTERNS, f.hp)}</label>
      <h4 class="dos-h">Maillot extérieur</h4>
      <div class="cc-row">${col("cc-a1", f.a1, "Couleur principale")}${col("cc-a2", f.a2, "Couleur secondaire")}</div>
      <label class="field"><span>Motif</span>${sel("cc-ap", PATTERNS, f.ap)}</label>
      <h4 class="dos-h">Stade</h4>
      <label class="field"><span>Nom du stade</span><input id="cc-stad" maxlength="32" value="${esc(f.stadium)}" placeholder="ex. Stade du Port"></label>
      ${edit ? "" : `<label class="field"><span>Capacité : <b id="cc-cap-v">${f.capacity.toLocaleString("fr-FR")}</b> places</span><input type="range" id="cc-cap" min="${cr.min}" max="${cr.max}" step="500" value="${f.capacity}"></label>`}
      <p class="result-bad" id="cc-err"></p>
      <div class="creation-footer"><button class="btn btn-ghost" data-cc="close">Annuler</button><button class="btn btn-primary" data-cc="ok">${edit ? "Enregistrer" : "Fonder le club"}</button></div>
    </div></div>`;
  }
  function previewHTML() {
    const f = FORM; const nm = f.name || "Mon club";
    const cc = { c1: f.c1, c2: f.c2, shape: f.shape, emblem: f.emblem, initials: f.initials };
    return `<div class="cc-logo">${logoSvg(cc, nm, 84)}</div><div class="cc-kits"><div>${jerseySvg({ c1: f.h1, c2: f.h2, pat: f.hp }, 64)}<small>Domicile</small></div><div>${jerseySvg({ c1: f.a1, c2: f.a2, pat: f.ap }, 64)}<small>Extérieur</small></div></div><div class="cc-pname"><b>${esc(nm)}</b><small>${esc(f.stadium || "Stade à nommer")}</small></div>`;
  }
  function readForm() {
    const g = (id) => { const e = document.getElementById(id); return e ? e.value : ""; };
    const f = FORM;
    f.name = g("cc-name").trim(); f.city = g("cc-city").trim(); f.nickname = g("cc-nick").trim(); f.initials = g("cc-ini").trim();
    f.c1 = g("cc-c1"); f.c2 = g("cc-c2"); f.shape = g("cc-shape"); f.emblem = g("cc-emblem");
    f.h1 = g("cc-h1"); f.h2 = g("cc-h2"); f.hp = g("cc-hp"); f.a1 = g("cc-a1"); f.a2 = g("cc-a2"); f.ap = g("cc-ap"); f.stadium = g("cc-stad").trim();
    if (MODE === "create") { f.capacity = parseInt(g("cc-cap"), 10) || f.capacity; }
  }
  function open(mode) {
    MODE = mode || "create";
    if (MODE === "edit") {
      const c = userClub(); const cc = c.cc || {};
      FORM = { name: c.name, city: c.city, nickname: c.nickname || "", country: c.countryKey, tier: c.division, c1: cc.c1 || c.logoColor || "#2C4A6E", c2: cc.c2 || "#F4EFE2", shape: cc.shape || c.logoShape || "shield", emblem: cc.emblem || "none", initials: cc.initials || "", h1: (cc.home || {}).c1 || c.kitColor || "#2C4A6E", h2: (cc.home || {}).c2 || "#F4EFE2", hp: (cc.home || {}).pat || "uni", a1: (cc.away || {}).c1 || "#F4EFE2", a2: (cc.away || {}).c2 || c.kitColor || "#2C4A6E", ap: (cc.away || {}).pat || "uni", stadium: c.stadiumName || "", capacity: c.stadiumCapacity };
    } else FORM = defaults(Object.keys(state.countries)[0]);
    rootEl().innerHTML = formHTML();
  }
  function close() { rootEl().innerHTML = ""; }

  document.addEventListener("input", (e) => {
    if (!e.target.closest || !e.target.closest("#cc-root") || !FORM) return;
    readForm();
    const pv = document.getElementById("cc-preview"); if (pv) pv.innerHTML = previewHTML();
    const cv = document.getElementById("cc-cap-v"); if (cv) cv.textContent = FORM.capacity.toLocaleString("fr-FR");
  });
  document.addEventListener("change", (e) => {
    if (!e.target.closest || !e.target.closest("#cc-root") || !FORM || MODE !== "create") return;
    if (e.target.id === "cc-country" || e.target.id === "cc-tier") {
      readForm();
      const nc = document.getElementById("cc-country").value;
      if (nc !== FORM.country) { FORM.country = nc; const t = tiersOf(state.countries[nc]); FORM.tier = t[t.length - 1]; } else FORM.tier = parseInt(document.getElementById("cc-tier").value, 10);
      FORM.capacity = 0; const keep = FORM; rootEl().innerHTML = formHTML(); FORM = keep;
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-cc]"); if (!b || typeof state === "undefined") return;
    const k = b.getAttribute("data-cc");
    if (k === "open") { open("create"); }
    else if (k === "edit") { open("edit"); }
    else if (k === "close") close();
    else if (k === "ok" && FORM) {
      readForm(); const err = document.getElementById("cc-err");
      if (MODE === "edit") {
        const e1 = validate(FORM, true); if (e1) { err.textContent = e1; return; }
        const c = userClub(); applyIdentity(c, Object.assign({}, FORM, { capacity: 0 }));
        try { saveGame(); } catch (x) {} close(); toast("Identité du club mise à jour"); try { render(); } catch (x) {}
        return;
      }
      const mp = ui.multiplayer && (state.userClubIds || []).length < 4;
      const r = create(FORM);
      if (!r.ok) { err.textContent = r.reason; return; }
      try { saveGame(); } catch (x) {}
      close(); ui.firedNotice = false;
      if (mp && (state.userClubIds || []).length < 4) render(); else { ui.screen = "dashboard"; ui.tab = "overview"; render(); }
      toast(`${r.club.name} est fondé !`);
    }
  });

  // ---------- intégration à l'écran de choix du club ----------
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (typeof ui !== "undefined" && ui.screen === "clubselect" && ready() && !document.getElementById("cc-open")) {
        const tabs = document.getElementById("league-country-tabs");
        if (tabs) tabs.insertAdjacentHTML("beforebegin", `<div class="cc-cta"><button class="btn btn-primary" id="cc-open" data-cc="open">✨ Créer mon propre club</button><span class="hint">Nom, pays, logo, maillots, stade : partez d'une page blanche.</span></div>`);
      }
    } catch (e) { console.error(e); }
    return r;
  };

  // ---------- onglet Club : maillots et stade ----------
  const origClub = window.renderClubTab;
  if (typeof origClub === "function") window.renderClubTab = function () {
    const html = origClub.apply(this, arguments);
    try {
      const c = userClub(); if (!c) return html;
      const cc = c.cc || {}; const h = cc.home || { c1: c.kitColor || "#2C4A6E", c2: "#F4EFE2", pat: "uni" }, a = cc.away || { c1: "#F4EFE2", c2: c.kitColor || "#2C4A6E", pat: "uni" };
      return html + `<div class="fm-dark fm-panel cc-panel"><h3 class="panel-subtitle">👕 Maillots &amp; stade</h3>
        <div class="cc-kits">${`<div>${jerseySvg(h, 70)}<small>Domicile</small></div><div>${jerseySvg(a, 70)}<small>Extérieur</small></div>`}<div class="cc-pname"><b>${esc(c.stadiumName || "Stade municipal")}</b><small>${(c.stadiumCapacity || 0).toLocaleString("fr-FR")} places · ${esc(c.city)}</small></div></div>
        <button class="btn btn-small btn-ghost" data-cc="edit">Modifier l'identité, les maillots et le stade</button></div>`;
    } catch (e) { console.error(e); return html; }
  };

  window.dsCreator = { create, validate, replacedFor, logoSvg, jerseySvg, tiersOf, open, close, applyIdentity };
})();
