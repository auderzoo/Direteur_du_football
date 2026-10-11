// =====================================================================
// MOBILE & CONFORT (chargé en dernier) :
//  - 3 emplacements de sauvegarde + export automatique en fin de saison
//  - gestes : glisser pour changer d'onglet, tirer pour actualiser
//  - tableaux : indication de rotation + mode plein écran (idéal en paysage)
//  - graphiques compacts : classement, budget, niveau moyen, forme
// =====================================================================
(function () {
  "use strict";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  // ---------- Toast ----------
  function toast(msg) {
    let t = document.getElementById("ds-toast");
    if (!t) { t = document.createElement("div"); t.id = "ds-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = "show";
    clearTimeout(toast._h); toast._h = setTimeout(() => { t.className = ""; }, 1800);
  }
  window.dsToast = toast;

  // ---------- Emplacements de sauvegarde ----------
  const origSave = window.saveGame;
  window.saveGame = function () {
    const ok = origSave.apply(this, arguments);
    try {
      if (state && state.ds && state.date && userClub()) {
        const slot = currentSlot();
        lsSet("ds_meta_" + slot, JSON.stringify({
          club: userClub().name, season: state.season.year,
          date: new Date(state.date).toISOString().slice(0, 10), ts: Date.now()
        }));
        // export automatique à chaque changement de saison
        if (lsGet("ds_autoexport") === "1") {
          const key = "ds_lastexp_" + slot, last = lsGet(key);
          if (last === null) lsSet(key, String(state.season.year));
          else if (last !== String(state.season.year)) { lsSet(key, String(state.season.year)); exportSaveToFile(); toast("Sauvegarde exportée"); }
        }
      }
    } catch (e) { console.warn("meta sauvegarde :", e); }
    return ok;
  };
  const origDelete = window.deleteSave;
  window.deleteSave = function () { lsDel("ds_meta_" + currentSlot()); lsDel("ds_lastexp_" + currentSlot()); return origDelete.apply(this, arguments); };

  function slotLabel(n) {
    let m = null; try { m = JSON.parse(lsGet("ds_meta_" + n)); } catch (e) {}
    if (n === currentSlot() && hasSave() && !m) return "Partie en cours";
    return m ? `${m.club} · saison ${m.season}` : "Vide";
  }
  const origMenu = window.renderMenu;
  window.renderMenu = function () {
    origMenu.apply(this, arguments);
    const actions = document.querySelector(".menu-actions");
    if (!actions) return;
    const cur = currentSlot();
    const box = document.createElement("div");
    box.className = "slot-box";
    box.innerHTML = `
      <div class="slot-row">${[1, 2, 3].map(n => `
        <button class="slot-btn ${n === cur ? "active" : ""}" data-slot="${n}">
          <b>Emplacement ${n}</b><span>${slotLabel(n)}</span>
        </button>`).join("")}</div>
      <label class="slot-auto"><input type="checkbox" id="auto-export" ${lsGet("ds_autoexport") === "1" ? "checked" : ""}/> Exporter automatiquement la sauvegarde à chaque fin de saison</label>`;
    actions.parentNode.insertBefore(box, actions);
    box.querySelectorAll(".slot-btn").forEach(b => {
      b.onclick = () => { setSaveSlot(parseInt(b.dataset.slot, 10)).then(() => render(), () => render()); };
    });
    box.querySelector("#auto-export").onchange = (e) => lsSet("ds_autoexport", e.target.checked ? "1" : "0");
    const nb = document.getElementById("btn-new");
    if (nb) {
      const go = nb.onclick;
      nb.onclick = () => { if (hasSave() && !confirm(`L'emplacement ${cur} contient déjà une partie. La remplacer par une nouvelle carrière ?`)) return; go(); };
    }
  };

  // ---------- Historique pour les graphiques ----------
  function snapshot() {
    const c = userClub(); if (!c || !state) return;
    if (!state.hist) state.hist = [];
    const last = state.hist[state.hist.length - 1];
    if (last && state.dayCounter - last.d < 7) return;
    const top = [...c.players].sort((a, b) => b.overall - a.overall).slice(0, 14);
    const st = leagueStandingOf(c);
    state.hist.push({
      d: state.dayCounter, t: new Date(state.date).toISOString().slice(0, 10),
      budget: Math.round(c.budget), wage: Math.round(c.wageBill || 0),
      ovr: +(top.reduce((s, p) => s + p.overall, 0) / Math.max(1, top.length)).toFixed(1),
      rank: st.rank, total: st.total
    });
    if (state.hist.length > 150) state.hist.shift();
  }
  const origAdv = window.advanceDay;
  window.advanceDay = function () { const r = origAdv.apply(this, arguments); try { snapshot(); } catch (e) {} return r; };

  function spark(vals, { fmt = (v) => v, invert = false, color = "var(--brass-dark)" } = {}) {
    if (vals.length < 2) return `<div class="spark-empty">Disponible après une semaine de jeu</div>`;
    const W = 150, H = 38, P = 4;
    const mn = Math.min(...vals), mx = Math.max(...vals), span = (mx - mn) || 1;
    const pts = vals.map((v, i) => {
      const x = P + (i / (vals.length - 1)) * (W - 2 * P);
      let y = (v - mn) / span; if (!invert) y = 1 - y;
      return [x, P + y * (H - 2 * P)];
    });
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="tendance">
      <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ")}"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="${color}"/></svg>`;
  }
  function trendCard(title, vals, fmt, opts) {
    const last = vals.length ? vals[vals.length - 1] : null, first = vals.length ? vals[0] : null;
    let delta = "";
    if (vals.length > 1) {
      const dv = last - first, good = opts && opts.invert ? dv < 0 : dv > 0;
      if (dv !== 0) delta = `<span class="trend-delta ${good ? "up" : "down"}">${good ? "▲ " : "▼ "}${fmt(Math.abs(dv))}</span>`;
    }
    return `<div class="trend-card"><div class="trend-top"><span class="trend-title">${title}</span>${delta}</div>
      <div class="trend-val">${last === null ? "–" : fmt(last)}</div>${spark(vals, Object.assign({ fmt }, opts))}</div>`;
  }
  const money = (v) => (typeof fmtMoney === "function" ? fmtMoney(v) : String(v));
  function formStrip() {
    const f = getRecentForm(userClub(), 8);
    if (!f.length) return "";
    return `<div class="form-strip" aria-label="Forme récente">${f.map(m => `<span class="fchip f${m.result}" title="${m.opponent ? m.opponent.name : ""} ${m.gf}-${m.ga}">${m.result === "W" ? "V" : m.result === "D" ? "N" : "D"}</span>`).join("")}</div>`;
  }
  function trendsHTML(which) {
    try {
      const h = (state.hist || []).slice(-26);
      if (which === "finance") {
        return `<h3 class="panel-subtitle">Tendances financières</h3><div class="trend-grid">
          ${trendCard("Budget", h.map(x => x.budget), money)}
          ${trendCard("Masse salariale", h.map(x => x.wage), money, { invert: true, color: "var(--rust)" })}</div>`;
      }
      return `<h3 class="panel-subtitle">Tendances</h3>${formStrip()}<div class="trend-grid">
        ${trendCard("Classement", h.map(x => x.rank), (v) => Math.round(v) + "ᵉ", { invert: true })}
        ${trendCard("Niveau moyen", h.map(x => x.ovr), (v) => (+v).toFixed(1))}
        ${trendCard("Budget", h.map(x => x.budget), money)}</div>`;
    } catch (e) { return ""; }
  }
  const origOv = window.renderOverview;
  window.renderOverview = function () { return origOv.apply(this, arguments) + trendsHTML("overview"); };
  const origFin = window.renderFinance;
  window.renderFinance = function () { return origFin.apply(this, arguments) + trendsHTML("finance"); };

  // ---------- Tableaux : plein écran / paysage ----------
  function openTableFull(table) {
    closeTableFull();
    const ov = document.createElement("div");
    ov.id = "table-full";
    ov.innerHTML = `<div class="tf-bar"><b>Mode tableau</b><span class="tf-hint">Tournez le téléphone en paysage</span><button class="btn btn-small" id="tf-close">✕ Fermer</button></div>
      <div class="tf-body"></div>`;
    const dark = !!table.closest(".fm-dark");
    if (dark) ov.classList.add("tf-dark");
    const body = ov.querySelector(".tf-body");
    const wrap = document.createElement("div"); if (dark) wrap.className = "fm-dark";
    wrap.appendChild(table.cloneNode(true)); body.appendChild(wrap);
    document.body.appendChild(ov);
    document.body.classList.add("tf-open");
    ov.querySelector("#tf-close").onclick = closeTableFull;
  }
  function closeTableFull() {
    const o = document.getElementById("table-full"); if (o) o.remove();
    document.body.classList.remove("tf-open");
  }
  function decorateTables() {
    const root = document.getElementById("tab-content"); if (!root) return;
    root.querySelectorAll("table").forEach(t => {
      if (t.dataset.tfDone) return;
      const cols = t.querySelectorAll("tr:first-child > *").length;
      if (cols < 6) return;
      t.dataset.tfDone = "1";
      const bar = document.createElement("div");
      bar.className = "rot-hint";
      bar.innerHTML = `<button type="button" class="btn btn-ghost btn-small">⛶ Tableau plein écran</button><span>ou pivotez le téléphone</span>`;
      bar.querySelector("button").onclick = () => openTableFull(t);
      const host = t.closest(".table-scroll, .fx-tablewrap") || t;
      host.parentNode.insertBefore(bar, host);
    });
  }
  window.addEventListener("orientationchange", () => setTimeout(() => window.scrollBy(0, 0), 200));
  const origRender = window.render;
  window.render = function () { closeTableFull(); const r = origRender.apply(this, arguments); try { decorateTables(); } catch (e) {} return r; };

  // ---------- Gestes ----------
  const TAB_ORDER = ["overview", "squad", "market", "scouting", "staff", "dynamics", "hub", "calendar", "cups", "reserve", "u19", "club", "inbox", "finance"];
  let g = null;
  const blocked = (el) => !!(el.closest && el.closest("input,select,textarea,.modal,#table-full,#match-modal:not(:empty),.fx-maillist,.search-results"));
  function inHScroll(el) {
    while (el && el !== document.body) {
      if (el.scrollWidth > el.clientWidth + 4) { const o = getComputedStyle(el).overflowX; if (o === "auto" || o === "scroll") return true; }
      el = el.parentElement;
    }
    return false;
  }
  function ptrEl() { let e = document.getElementById("ptr"); if (!e) { e = document.createElement("div"); e.id = "ptr"; e.textContent = "↻"; document.body.appendChild(e); } return e; }
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || typeof ui === "undefined" || ui.screen !== "dashboard") { g = null; return; }
    const t = e.touches[0], el = e.target;
    g = { x: t.clientX, y: t.clientY, t: Date.now(), top: window.scrollY <= 0, ok: !blocked(el), h: inHScroll(el), pull: 0 };
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!g || !g.ok) return;
    const t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
    if (g.top && window.scrollY <= 0 && dy > 10 && Math.abs(dx) < dy) {
      g.pull = dy; const p = ptrEl(); p.style.transform = `translate(-50%, ${Math.min(dy, 120) - 50}px) rotate(${dy * 3}deg)`; p.style.opacity = Math.min(1, dy / 90);
    }
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!g) return;
    const t = e.changedTouches[0], dx = t.clientX - g.x, dy = t.clientY - g.y, dt = Date.now() - g.t;
    const p = document.getElementById("ptr"); if (p) { p.style.opacity = 0; p.style.transform = "translate(-50%, -60px)"; }
    const gg = g; g = null;
    if (!gg.ok) return;
    if (gg.pull > 90 && Math.abs(dx) < 60) { try { saveGame(); } catch (er) {} render(); toast("Actualisé ✓"); return; }
    if (!gg.h && Math.abs(dx) > 80 && Math.abs(dy) < 50 && dt < 700) {
      const i = TAB_ORDER.indexOf(ui.tab); if (i < 0) return;
      const n = i + (dx < 0 ? 1 : -1);
      if (n < 0 || n >= TAB_ORDER.length) return;
      ui.tab = TAB_ORDER[n]; ui.moreOpen = false; render(); window.scrollTo(0, 0);
    }
  }, { passive: true });
})();
