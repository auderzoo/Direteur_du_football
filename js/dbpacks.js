// =====================================================================
// BASES DE DONNÉES PERSONNALISÉES — vrais noms, vrais logos, vrais joueurs
// Le joueur dépose un fichier .json (+ images de logos) : le jeu renomme les clubs,
// affiche les logos et peut renommer les joueurs. Rien n'est écrit en dur dans le code.
//  - Import manuel : menu principal ▸ « Bases de données » (ou Bureau du DS)
//  - Chargement automatique : fichiers listés dans databases/packs.json (hébergés avec le jeu)
// Format : voir databases/LISEZMOI.md et databases/modele.json
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  let PACKS = [], IMGS = {}, INDEX = {}, SIG = 1, READY = false;

  // ---------- stockage (IndexedDB, repli mémoire) ----------
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open("ds_packs", 1);
        r.onupgradeneeded = () => { r.result.createObjectStore("packs", { keyPath: "id" }); r.result.createObjectStore("imgs", { keyPath: "k" }); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  const tx = (store, mode, fn) => idb().then((db) => new Promise((res, rej) => { const t = db.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined); t.onerror = () => rej(t.error); })).catch(() => undefined);
  const saveAll = () => tx("packs", "readwrite", (s) => { PACKS.filter((p) => !p.builtin).forEach((p) => s.put(p)); });

  function rebuild() {
    INDEX = {};
    PACKS.filter((p) => p.enabled !== false).forEach((p) => (p.clubs || []).forEach((c) => { if (c && c.match) INDEX[norm(c.match)] = c; }));
    SIG++;
  }
  function resolveLogo(l) {
    if (!l) return null;
    if (/^(data:|https?:|\/|\.\/|\.\.\/)/.test(l) || l.indexOf("/") >= 0) return l;
    return IMGS[l.toLowerCase()] || "logos/" + l;
  }

  // ---------- application à la partie en cours ----------
  function applyPlayers(club, e) {
    const list = Array.isArray(e.players) ? e.players : [];
    if (!list.length || club.packPlayersDone) return;
    const used = new Set();
    list.forEach((q) => {
      const pos = String(q.pos || q.position || "").toUpperCase();
      const p = club.players.find((x) => !used.has(x.id) && !x.packed && (!pos || x.position === pos));
      if (!p) return;
      used.add(p.id); p.packed = true;
      if (q.first || q.prenom) p.firstName = String(q.first || q.prenom);
      if (q.last || q.nom) p.lastName = String(q.last || q.nom);
      if (q.age) p.age = Math.max(15, Math.min(42, parseInt(q.age, 10) || p.age));
      if (q.nationality || q.nationalite) p.nationality = String(q.nationality || q.nationalite);
      if (q.overall) { p.overall = Math.max(30, Math.min(95, parseInt(q.overall, 10) || p.overall)); p.potential = Math.max(p.potential, p.overall); try { p.value = computeValue(p); } catch (x) {} }
    });
    club.packPlayersDone = true;
  }
  function applyPacks() {
    if (typeof state === "undefined" || !state) return 0;
    let n = 0;
    try {
      allClubs().forEach((c) => {
        const base = c.baseName || c.name;
        const e = INDEX[norm(base)];
        if (!e) {
          if (c.baseName) { c.name = c.baseName; delete c.logoUrl; delete c.baseName; }
          return;
        }
        c.baseName = base;
        if (e.name) c.name = String(e.name);
        if (e.short) c.shortName = String(e.short);
        c.logoUrl = resolveLogo(e.logo) || undefined;
        if (e.color && /^#[0-9a-f]{3,8}$/i.test(e.color)) { c.kitColor = e.color; c.logoColor = e.color; }
        if (e.stadium) c.stadiumName = String(e.stadium);
        applyPlayers(c, e);
        n++;
      });
    } catch (err) { console.warn("dbpacks/apply", err); }
    state.packSig = SIG;
    return n;
  }

  // ---------- logo : on garde le SVG pour que le CSS existant continue de s'appliquer ----------
  const origLogo = window.clubLogoSvg;
  window.clubLogoSvg = function (club) {
    if (club && club.logoUrl) return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><image href="${esc(club.logoUrl)}" x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid meet"/></svg>`;
    return origLogo.apply(this, arguments);
  };

  // ---------- API ----------
  function validate(obj) {
    const clubs = Array.isArray(obj) ? obj : obj && obj.clubs;
    if (!Array.isArray(clubs)) throw new Error("Le fichier doit contenir une liste « clubs ».");
    const ok = clubs.filter((c) => c && typeof c === "object" && c.match);
    if (!ok.length) throw new Error("Aucun club avec le champ « match » (nom actuel du club dans le jeu).");
    return { name: (obj && obj.name) || "Base sans nom", author: (obj && obj.author) || "", clubs: ok };
  }
  function addPack(obj, filename) {
    const v = validate(obj);
    const id = "p" + Date.now() + Math.floor(Math.random() * 1000);
    const pack = { id, name: v.name === "Base sans nom" && filename ? filename : v.name, author: v.author, clubs: v.clubs, enabled: true, builtin: false };
    PACKS.push(pack); rebuild(); saveAll(); return pack;
  }
  function removePack(id) { PACKS = PACKS.filter((p) => p.id !== id); rebuild(); tx("packs", "readwrite", (s) => { s.delete(id); }); }
  function togglePack(id) { const p = PACKS.find((x) => x.id === id); if (p) { p.enabled = p.enabled === false; rebuild(); saveAll(); } }
  function downscale(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        if (/svg/.test(file.type)) return res(fr.result);
        const img = new Image();
        img.onload = () => { const k = Math.min(1, 160 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/png")); };
        img.onerror = () => rej(new Error("image illisible : " + file.name)); img.src = fr.result;
      };
      fr.onerror = () => rej(fr.error); fr.readAsDataURL(file);
    });
  }
  async function importFiles(files) {
    const out = { packs: 0, images: 0, errors: [] };
    for (const f of Array.from(files)) {
      try {
        if (/\.json$/i.test(f.name) || f.type === "application/json") { addPack(JSON.parse(await f.text()), f.name.replace(/\.json$/i, "")); out.packs++; }
        else if (/^image\//.test(f.type) || /\.(png|jpe?g|svg|webp|gif)$/i.test(f.name)) {
          const data = await downscale(f); IMGS[f.name.toLowerCase()] = data; out.images++;
          await tx("imgs", "readwrite", (s) => { s.put({ k: f.name.toLowerCase(), v: data }); });
        } else out.errors.push(f.name + " : type non pris en charge");
      } catch (e) { out.errors.push(f.name + " : " + e.message); }
    }
    rebuild(); applyPacks(); return out;
  }
  function templateJSON() {
    const clubs = [];
    const add = (country, league, pool) => (pool || []).forEach((n) => clubs.push({ match: n, name: "", short: "", logo: "", color: "", stadium: "", players: [] }));
    [["CLUB_POOLS_D1", "d1"], ["CLUB_POOLS_D2", "d2"], ["CLUB_POOLS_D3", "d3"], ["CLUB_POOLS_D4", "d4"], ["CLUB_POOLS_D5", "d5"]].forEach(([v, k]) => {
      let P; try { P = eval(v); } catch (e) { return; }
      Object.keys(P || {}).forEach((country) => {
        const pool = P[country];
        if (Array.isArray(pool)) add(country, k, pool); else Object.keys(pool || {}).forEach((g) => add(country, k + g, pool[g]));
      });
    });
    return { format: "ds-pack", version: 1, name: "Ma base de données", author: "", aide: "Pour chaque club : « match » = nom actuel dans le jeu (ne pas modifier). Remplissez « name » (vrai nom), « logo » (nom d'un fichier image importé, ou chemin logos/xxx.png, ou URL), « color » (#RRGGBB), « stadium ». « players » : liste facultative [{\"first\":\"\",\"last\":\"\",\"pos\":\"GB|DEF|MIL|ATT\",\"age\":25,\"nationality\":\"\",\"overall\":70}]. Supprimez les clubs que vous ne modifiez pas.", clubs };
  }
  function download(name, text) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- interface ----------
  function root() { let r = document.getElementById("pk-root"); if (!r) { r = document.createElement("div"); r.id = "pk-root"; document.body.appendChild(r); } return r; }
  function matched(p) { if (typeof state === "undefined" || !state) return null; const names = new Set(allClubs().map((c) => norm(c.baseName || c.name))); return p.clubs.filter((c) => names.has(norm(c.match))).length; }
  function open(msg) {
    const rows = PACKS.map((p) => { const m = matched(p); return `<tr><td><b>${esc(p.name)}</b>${p.author ? `<br><span class="hint">${esc(p.author)}</span>` : ""}${p.builtin ? ` <span class="hint">(fourni avec le jeu)</span>` : ""}</td><td>${p.clubs.length}${m != null ? ` <span class="hint">(${m} dans cette partie)</span>` : ""}</td><td><button class="btn btn-small ${p.enabled === false ? "btn-ghost" : "btn-primary"}" data-pk="toggle:${p.id}">${p.enabled === false ? "Désactivée" : "Active"}</button>${p.builtin ? "" : ` <button class="btn btn-small btn-ghost" data-pk="del:${p.id}">Supprimer</button>`}</td></tr>`; }).join("");
    root().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">
      <h3>📂 Bases de données</h3>
      <p class="hint">Importez un fichier <b>.json</b> (vrais noms, logos, joueurs) et vos <b>images de logos</b>. Le fichier à remplir se télécharge ci-dessous. Vos données restent sur cet appareil.</p>
      ${msg ? `<p class="${msg.errors && msg.errors.length ? "result-bad" : "result-good"}">${esc(msg.text)}</p>` : ""}
      ${rows ? `<table class="fx-mini"><thead><tr><th>Base</th><th>Clubs</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="hint">Aucune base installée.</p>`}
      <p class="hint">${Object.keys(IMGS).length} logo(s) importé(s).</p>
      <input type="file" id="pk-file" multiple accept=".json,application/json,image/*" style="display:none" />
      <div class="creation-footer"><button class="btn btn-ghost" data-pk="close">Fermer</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-pk="tpl">⬇ Télécharger le modèle</button><button class="btn btn-primary" data-pk="pick">⬆ Importer (JSON + logos)</button></div></div>
    </div></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-pk], #btn-packs");
    if (!b) return;
    if (b.id === "btn-packs") return open();
    const [k, id] = b.getAttribute("data-pk").split(":");
    if (k === "close") { root().innerHTML = ""; try { render(); } catch (x) {} }
    else if (k === "tpl") download("modele-base-de-donnees.json", JSON.stringify(templateJSON(), null, 1));
    else if (k === "pick") document.getElementById("pk-file").click();
    else if (k === "toggle") { togglePack(id); applyPacks(); open(); }
    else if (k === "del") { removePack(id); applyPacks(); open(); }
  });
  document.addEventListener("change", async (e) => {
    if (!e.target || e.target.id !== "pk-file") return;
    const r = await importFiles(e.target.files);
    open({ errors: r.errors, text: `${r.packs} base(s) et ${r.images} logo(s) importés.${r.errors.length ? " Problèmes : " + r.errors.join(" ; ") : ""}` });
  });

  // ---------- intégration ----------
  window.dsPacksOpen = () => open();
  const origRender = window.render;
  window.render = function () {
    try { if (typeof state !== "undefined" && state && state.packSig !== SIG && READY) applyPacks(); } catch (e) {}
    const r = origRender.apply(this, arguments);
    try {
      const a = document.getElementById("import-file-input");
      if (a && !document.getElementById("btn-packs")) a.parentNode.insertAdjacentHTML("beforeend", `<button class="btn btn-ghost btn-small" id="btn-packs">📂 Bases de données</button>`);
    } catch (e) {}
    return r;
  };
  const origBureau = window.renderBureau;
  if (origBureau) window.renderBureau = function () {
    return origBureau.apply(this, arguments) + `<div class="fm-dark fm-panel"><h3 class="panel-subtitle">📂 Bases de données</h3><p class="hint">Vrais noms, logos et joueurs importés par vos soins.</p><button class="btn btn-primary btn-small" id="btn-packs">Gérer les bases</button></div>`;
  };
  window.dsPacks = { addPack, removePack, togglePack, importFiles, templateJSON, applyPacks, list: () => PACKS, norm };

  async function boot() {
    try {
      const db = await idb();
      await new Promise((res) => {
        const t = db.transaction(["packs", "imgs"], "readonly");
        t.objectStore("packs").getAll().onsuccess = (ev) => { PACKS = ev.target.result || []; };
        t.objectStore("imgs").getAll().onsuccess = (ev) => { (ev.target.result || []).forEach((i) => { IMGS[i.k] = i.v; }); };
        t.oncomplete = res; t.onerror = res;
      });
    } catch (e) {}
    try {
      const r = await fetch("databases/packs.json", { cache: "no-cache" });
      if (r.ok) {
        const files = await r.json();
        for (const f of Array.isArray(files) ? files : []) {
          try { const o = await (await fetch("databases/" + f, { cache: "no-cache" })).json(); const v = validate(o); PACKS.push({ id: "b_" + f, name: v.name, author: v.author, clubs: v.clubs, enabled: true, builtin: true }); } catch (e) { console.warn("pack intégré illisible", f, e); }
        }
      }
    } catch (e) {}
    READY = true; rebuild();
    try { if (typeof state !== "undefined" && state) { applyPacks(); render(); } } catch (e) {}
  }
  boot();
})();
