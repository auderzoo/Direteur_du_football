// =====================================================================
// CONFORT TÉLÉPHONE (bloc 15)
//  1. Tableaux larges -> cartes (bascule « Cartes / Tableau »)
//  2. Textes minuscules agrandis (CSS)
//  3. Filtres du Marché repliés par défaut
//  4. Retour haptique sur les actions importantes (Android : vibration ; iOS : micro-tap Safari 17.4+)
// =====================================================================
(function () {
  "use strict";
  const phone = () => window.matchMedia("(max-width: 720px)").matches;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 1. cartes ----------
  const cardsOn = () => lsGet("ds_cards", "1") === "1";
  function syncBody() { document.body.classList.toggle("cards-on", phone() && cardsOn()); }
  function labelTables(root) {
    root.querySelectorAll("table").forEach((t) => {
      if (t.dataset.ct || t.classList.contains("standings") || t.classList.contains("no-cards")) return;
      const ths = [...t.querySelectorAll("thead th, tr:first-child th")];
      if (ths.length < 4) return;
      t.dataset.ct = "1"; t.classList.add("cards-tbl");
      const labels = ths.map((h) => h.textContent.trim());
      t.querySelectorAll("tbody tr").forEach((tr) => {
        const tds = [...tr.children].filter((c) => c.tagName === "TD");
        let ti = tds.findIndex((c) => c.querySelector("[data-playercard],[data-club],a,button.link-danger"));
        if (ti < 0) ti = 0;
        tds.forEach((td, i) => {
          if (labels[i]) td.setAttribute("data-label", labels[i]);
          if (i === ti) td.classList.add("ct-title");
          if (!td.textContent.trim() && !td.querySelector("button,input,select,img,svg")) td.classList.add("ct-empty");
        });
      });
    });
  }
  function toggleBar(root) {
    if (!phone() || root.querySelector(".cards-toggle") || !root.querySelector("table.cards-tbl")) return;
    const d = document.createElement("div"); d.className = "cards-toggle";
    d.innerHTML = `<button type="button" data-cards="1" class="${cardsOn() ? "on" : ""}">▦ Cartes</button><button type="button" data-cards="0" class="${cardsOn() ? "" : "on"}">☰ Tableau</button>`;
    root.insertBefore(d, root.firstChild);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-cards]"); if (!b) return;
    lsSet("ds_cards", b.getAttribute("data-cards")); syncBody();
    document.querySelectorAll(".cards-toggle button").forEach((x) => x.classList.toggle("on", x.getAttribute("data-cards") === b.getAttribute("data-cards")));
  });

  // ---------- 3. filtres du marché repliés ----------
  const U = () => (typeof ui !== "undefined" ? ui : (window.__ui = window.__ui || {}));
  function foldFilters(root) {
    const panel = root.querySelector(".search-panel");
    if (!panel || !phone() || panel.parentNode.classList.contains("mk-fold-body")) return;
    let n = 0;
    panel.querySelectorAll("input,select").forEach((el) => {
      if (el.type === "checkbox") { if (el.checked) n++; }
      else if (el.tagName === "SELECT") { if (el.selectedIndex > 0) n++; }
      else if (String(el.value || "").trim() !== "" && el.type !== "hidden") n++;
    });
    const det = document.createElement("details"); det.className = "mk-fold";
    if (U().mkFiltOpen) det.open = true;
    det.innerHTML = `<summary>🔎 Filtres <span class="hint">${n ? n + " actif(s)" : "aucun"} — touchez pour modifier</span></summary><div class="mk-fold-body"></div>`;
    panel.parentNode.insertBefore(det, panel);
    det.querySelector(".mk-fold-body").appendChild(panel);
    det.addEventListener("toggle", () => { U().mkFiltOpen = det.open; });
    panel.addEventListener("click", (ev) => { if (ev.target.closest("button")) U().mkFiltOpen = false; });
  }

  let busy = false;
  function pass() {
    if (busy) return; busy = true;
    try { const c = document.getElementById("tab-content"); if (c) { labelTables(c); foldFilters(c); toggleBar(c); } syncBody(); } catch (e) { console.warn("mobile2", e); }
    busy = false;
  }
  new MutationObserver(pass).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", syncBody);
  syncBody();

  // ---------- 4. haptique ----------
  const hapticOn = () => lsGet("ds_haptic", "1") === "1";
  let sw = null;
  function haptic(kind) {
    if (!hapticOn()) return;
    const pat = { tap: 12, good: [18], bad: [30, 60, 30], big: [40, 40, 90] }[kind] || 12;
    try { if (navigator.vibrate) { navigator.vibrate(pat); return; } } catch (e) {}
    // iOS Safari 17.4+ : un interrupteur natif produit un léger retour haptique (uniquement dans un geste tactile)
    try {
      if (!sw) {
        sw = document.createElement("label"); sw.setAttribute("aria-hidden", "true");
        sw.style.cssText = "position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none";
        sw.innerHTML = '<input type="checkbox" switch>'; document.body.appendChild(sw);
      }
      const n = Array.isArray(pat) ? pat.length : 1;
      for (let i = 0; i < Math.min(n, 3); i++) setTimeout(() => { try { sw.click(); } catch (e) {} }, i * 110);
    } catch (e) {}
  }
  window.dsHaptic = haptic;
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId) {
    const r = origTransfer.apply(this, arguments);
    try { if (typeof isUserClub === "function" && (isUserClub(toId) !== isUserClub(fromId))) haptic("good"); } catch (e) {}
    return r;
  };
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const before = state && state.mx && state.mx.dd ? state.mx.dd.date : null;
    const r = origAdv.apply(this, arguments);
    try {
      const dd = state && state.mx && state.mx.dd;
      if (dd && dd.date !== before) haptic("big");
      if (state && state.lastMatchResult && state.lastMatchResult !== window.__lastHapt) { window.__lastHapt = state.lastMatchResult; haptic("tap"); }
    } catch (e) {}
    return r;
  };
  // échec de dossier / clôture : on écoute le message de résultat injecté par le mercato
  new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const t = (n.matches && n.matches(".result-bad") ? n : n.querySelector && n.querySelector(".result-bad"));
      if (t && /hors délai|tombe à l'eau|quitte la table|rompu/i.test(t.textContent)) haptic("bad");
      const g = (n.matches && n.matches(".result-good") ? n : n.querySelector && n.querySelector(".result-good"));
      if (g) haptic("good");
    }));
  }).observe(document.body, { childList: true, subtree: true });
  // réglage dans la fenêtre « Réglages »
  new MutationObserver(() => {
    const s = document.getElementById("set-size");
    if (!s || document.getElementById("set-vib")) return;
    const f = s.closest(".field") || s.parentNode;
    f.insertAdjacentHTML("afterend", `<label class="field"><span><input type="checkbox" id="set-vib" ${hapticOn() ? "checked" : ""}> Retour haptique (vibrations)</span></label>`);
    document.getElementById("set-vib").addEventListener("change", (e) => { lsSet("ds_haptic", e.target.checked ? "1" : "0"); if (e.target.checked) haptic("tap"); });
  }).observe(document.body, { childList: true, subtree: true });
})();
