// =====================================================================
// EFFICACITÉ : sauvegardes regroupées (la sérialisation de l'état pèse ~5 Mo)
//  - 1ʳᵉ sauvegarde immédiate, puis les suivantes (< 0,6 s) sont regroupées en une seule
//  - sauvegarde forcée quand on quitte la page, qu'on change d'onglet du navigateur,
//    qu'on retourne au menu, change d'emplacement, exporte ou supprime
// =====================================================================
(function () {
  "use strict";
  const orig = window.saveGame;
  let last = -1e9, timer = null, pending = false;
  window.saveGame = function () {
    const now = performance.now();
    if (now - last > 600 && !pending) { last = now; return orig.apply(this, arguments); }
    pending = true;
    if (!timer) timer = setTimeout(() => { timer = null; flush(); }, Math.max(100, 600 - (now - last)));
    return true;
  };
  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending) return;
    pending = false; last = performance.now();
    try { if (typeof state !== "undefined" && state && state.ds) orig(); } catch (e) { console.warn("sauvegarde", e); }
  }
  window.dsFlushSave = flush;
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  ["renderMenu", "setSaveSlot", "exportSaveToFile", "deleteSave", "importSaveFromJSON"].forEach((n) => {
    const f = window[n]; if (typeof f !== "function") return;
    window[n] = function () { flush(); return f.apply(this, arguments); };
  });
})();
