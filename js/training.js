// ===================================================================
// BLOC 22 (3/4) — CENTRE D'ENTRAÎNEMENT : niveaux d'équipement
//  - Terrains et salle de musculation : accélèrent la progression des joueurs de 23 ans ou moins
//  - Pôle jeunes (internat, suivi scolaire) : accélère encore les moins de 20 ans
//  - Centre médical : blessures moins fréquentes et plus courtes, meilleure récupération de la fatigue
//  - travaux de 45 jours par niveau, entretien mensuel, tous les clubs ont leurs propres niveaux (selon leur standing)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const money = (v) => { try { return fmtMoney(v); } catch (e) { return Math.round(v) + " €"; } };
  const hasState = () => typeof state !== "undefined" && state && state.ds && state.countries;
  const day = () => state.dayCounter || 0;
  const KEYS = {
    grounds: { name: "Terrains et salle de musculation", icon: "🏋️", desc: "Les joueurs de 23 ans ou moins progressent plus vite." },
    dorm: { name: "Pôle jeunes (internat)", icon: "🏠", desc: "Encadrement renforcé : surtout pour les moins de 20 ans." },
    medical: { name: "Centre médical", icon: "🩺", desc: "Moins de blessures, plus courtes, fatigue mieux récupérée." }
  };
  const LV = ["", "Basique", "Correct", "Moderne", "Élite", "Référence mondiale"];

  function fac(club) {
    if (!club.fac) {
      const tf = club.tierFactor != null ? club.tierFactor : 0.4, r = () => Math.floor(Math.random() * 2);
      const base = cl(1 + Math.round(tf * 3.4), 1, 5);
      club.fac = { grounds: cl(base + r() - 0, 1, 5), dorm: cl(base - 1 + r(), 1, 5), medical: cl(base - 1 + r(), 1, 5), queue: [], spent: 0, gains: 0 };
      if (isUserClub(club.id)) { club.fac.grounds = cl(Math.min(club.fac.grounds, 3), 1, 3); club.fac.dorm = Math.min(club.fac.dorm, 2); club.fac.medical = Math.min(club.fac.medical, 2); }
    }
    return club.fac;
  }
  const costOf = (club, k, to) => Math.round((k === "medical" ? 0.8 : k === "dorm" ? 0.9 : 1) * 700000 * to * to * (0.35 + (club.tierFactor != null ? club.tierFactor : 0.4)) / 10000) * 10000;
  const upkeep = (club) => { const f = fac(club); return Math.round((f.grounds + f.dorm + f.medical) * 1800 * (0.4 + (club.tierFactor || 0.4)) / 100) * 100; };
  function startWorks(club, k) {
    const f = fac(club), cur = f[k], queued = f.queue.some((q) => q.key === k);
    if (cur >= 5) return { ok: false, msg: "Niveau maximum déjà atteint." };
    if (queued) return { ok: false, msg: "Des travaux sont déjà en cours sur cet équipement." };
    const to = cur + 1, cost = costOf(club, k, to);
    if (club.budget < cost) return { ok: false, msg: `Budget insuffisant (${money(cost)} nécessaires).` };
    club.budget -= cost; f.spent += cost; f.queue.push({ key: k, to, done: day() + 45 });
    try { state.log.unshift({ date: fmtDate(state.date), text: `Travaux lancés : ${KEYS[k].name}, niveau ${to} (${money(cost)}, 45 jours).` }); } catch (e) {}
    return { ok: true, msg: `Travaux lancés : ${KEYS[k].name} → niveau ${to} (${money(cost)}, livraison dans 45 jours).` };
  }
  // -------- effets --------
  function youthBoost(f, p) {
    if (p.age > 23 || p.overall >= p.potential) return 0;
    return 0.006 * (f.grounds - 1) + (p.age <= 19 ? 0.005 * (f.dorm - 1) : p.age <= 21 ? 0.002 * (f.dorm - 1) : 0);
  }
  function weekly() {
    allClubs().forEach((c) => {
      const f = fac(c), me = isUserClub(c.id);
      if (me && f.queue.length) {
        f.queue = f.queue.filter((q) => {
          if (day() < q.done) return true;
          f[q.key] = Math.max(f[q.key], q.to);
          const t = `${KEYS[q.key].name} : travaux terminés, niveau ${q.to} (${LV[q.to]}).`;
          try { state.log.unshift({ date: fmtDate(state.date), text: t }); dsMail("news", "Direction du club", "Travaux terminés", `<p>${esc(t)}</p><p class="hint">${esc(KEYS[q.key].desc)}</p>`); } catch (e) {} return false;
        });
      }
      c.players.forEach((p) => {
        const b = youthBoost(f, p);
        if (b > 0 && Math.random() < b) { p.overall = Math.min(p.potential, p.overall + 1); if (me) { f.gains++; if (p.age <= 21 && Math.random() < 0.5) { try { state.log.unshift({ date: fmtDate(state.date), text: `🏋️ ${p.firstName} ${p.lastName} progresse grâce aux installations : niveau ${p.overall}.` }); } catch (e) {} } } }
        if (f.medical > 1 && p.fatigue > 0) p.fatigue = Math.max(0, p.fatigue - (f.medical - 1) * 0.6);
      });
    });
  }
  function monthly() { const c = userClub(); if (c) c.budget -= upkeep(c); }
  // -------- interface (onglet Finance) --------
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  function panel() {
    const club = userClub(); if (!club) return "";
    const f = fac(club);
    const rows = Object.keys(KEYS).map((k) => {
      const q = f.queue.find((x) => x.key === k), lvl = f[k], next = lvl + 1;
      return `<div class="tr-row"><div class="tr-ic">${KEYS[k].icon}</div><div class="tr-tx"><b>${KEYS[k].name}</b> <span class="tr-st">${stars(lvl)}</span> <span class="hint">${LV[lvl]}</span><p class="hint" style="margin:2px 0 0">${KEYS[k].desc}</p>
        ${q ? `<p class="hint result-good">Travaux en cours : niveau ${q.to} dans ${Math.max(0, q.done - day())} jours</p>` : ""}</div>
        <button class="btn btn-small btn-primary" data-tr="${k}" ${lvl >= 5 || q ? "disabled" : ""}>${lvl >= 5 ? "Max" : q ? "En cours" : "Niv. " + next + " · " + money(costOf(club, k, next))}</button></div>`;
    }).join("");
    const est = ((0.006 * (f.grounds - 1)) * 40).toFixed(1), est2 = ((0.006 * (f.grounds - 1) + 0.005 * (f.dorm - 1)) * 40).toFixed(1);
    return `<div class="dossier tr-card" id="tr-panel"><h3 class="panel-subtitle">🏟️ Centre d'entraînement</h3>
      <p class="hint">Progression supplémentaire estimée par an : <b>+${est}</b> pour un joueur de 21-23 ans, <b>+${est2}</b> pour un moins de 20 ans. Progressions dues aux installations depuis le début : <b>${f.gains}</b>. Entretien : ${money(upkeep(club))} / mois. Le centre de formation (jeunes générés) s'améliore juste au-dessus.</p>
      ${rows}<p class="hint" id="tr-msg"></p></div>`;
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-tr]"); if (!t || !hasState() || t.disabled) return;
    const r = startWorks(userClub(), t.dataset.tr); try { saveGame(); } catch (x) {}
    try { window.dsToast && window.dsToast(r.msg); } catch (x) {} try { render(); } catch (x) {}
  });
  // -------- branchements --------
  const oF = window.renderFinance;
  if (typeof oF === "function") window.renderFinance = function () { const b = oF.apply(this, arguments); try { return b + panel(); } catch (e) { return b; } };
  const oAdv = window.advanceDay;
  if (typeof oAdv === "function") window.advanceDay = function () {
    const r = oAdv.apply(this, arguments);
    try { if (hasState() && day() % 7 === 5) weekly(); } catch (e) { console.warn("training", e); }
    return r;
  };
  const oMon = window.runMonthlyFinanceTick;
  if (typeof oMon === "function") window.runMonthlyFinanceTick = function () { const r = oMon.apply(this, arguments); try { monthly(); } catch (e) {} return r; };
  const oRisk = window.injuryRiskMult, oDur = window.injuryDurationMult;
  if (typeof oRisk === "function") window.injuryRiskMult = function (club) { let v = oRisk.apply(this, arguments); try { v *= 1 - 0.035 * (fac(club).medical - 1); } catch (e) {} return v; };
  if (typeof oDur === "function") window.injuryDurationMult = function (club) { let v = oDur.apply(this, arguments); try { v *= 1 - 0.07 * (fac(club).medical - 1); } catch (e) {} return v; };
  window.dsTraining = { fac, startWorks, weekly, costOf, upkeep, KEYS, panel };
})();
