// =====================================================================
// BLOC 18 (4/4) : MODE DÉFI ET SCÉNARIOS
//  Trois départs imposés, chacun avec des objectifs chiffrés et une note finale (S à D) :
//   1. Club en faillite à sauver (2 saisons)
//   2. Remontée depuis les divisions inférieures (3 saisons)
//   3. Club formateur sans budget (3 saisons)
//  Accès : menu principal ▸ « Mode défi ». Suivi dans l'onglet Club.
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (v) => fmtMoney(Math.round(v));
  const mail = (f, s, sub, html) => { try { dsMail(f, s, sub, html); } catch (e) {} };
  const hasState = () => typeof state !== "undefined" && state && state.ds;

  const nTiers = (ck) => (typeof DIVISION_COUNT !== "undefined" && DIVISION_COUNT[ck]) || 2;
  const tierName = (ck, t) => (LEAGUE_NAMES[ck] && LEAGUE_NAMES[ck]["d" + t]) || `Division ${t}`;
  function gradeOf(score) { return score >= 90 ? "S" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D"; }

  function clubsOfTier(country, tier) {
    const out = [];
    Object.values(state.countries[country].leagues).forEach((l) => { if (l.tier === tier) out.push(...l.clubs); });
    return out.sort((a, b) => b.tierFactor - a.tierFactor);
  }
  const homegrownValue = (club) => club.players.filter((p) => p.formedAt === club.id).reduce((s, p) => s + (p.value || 0), 0);

  // ---------- définitions ----------
  const SCEN = {
    faillite: {
      icon: "🆘", title: "Sauver le club de la faillite", seasons: 2,
      desc: "Le club est endetté jusqu'au cou. Remettez la trésorerie à flot et évitez la relégation en 2 saisons.",
      start(ck) { const t = nTiers(ck) >= 2 ? 2 : 1; return `Début en ${tierName(ck, t)}, trésorerie négative.`; },
      goals: (sc) => ["Trésorerie positive à la fin de la 2ᵉ saison", "Éviter la relégation chaque saison", "Finir dans la première moitié du tableau en dernière saison", "Bonus : +2 M€ de trésorerie"],
      pick(ck) { const t = nTiers(ck) >= 2 ? 2 : 1; const l = clubsOfTier(ck, t); return l[Math.floor(l.length * 0.6)] || l[l.length - 1]; },
      setup(club, sc) {
        const debt = clamp(Math.round(club.wageBudgetMonthly * 3 / 100000) * 100000, 2500000, 8000000);
        club.budget = -debt; sc.base = { debt };
        try { fm24.F().board.conf = 38; } catch (e) {}
      },
      score(sc, club, final) {
        const parts = [];
        const relegs = sc.hist.filter((h) => h.relegated).length, yrs = Math.min(2, sc.hist.length);
        parts.push(["Maintien sportif", Math.round(40 * (yrs - relegs) / 2), 40]);
        parts.push(["Trésorerie remise à flot", club.budget >= 0 ? 30 : club.budget > -1000000 ? 12 : 0, 30]);
        parts.push(["Bonus de trésorerie (+2 M€)", club.budget >= 2000000 ? 10 : 0, 10]);
        const last = sc.hist[sc.hist.length - 1];
        parts.push(["Première moitié du tableau", last && last.rank <= last.total / 2 ? 20 : 0, 20]);
        return parts;
      },
      live(sc, club) { return [`Trésorerie : <b>${money(club.budget)}</b> (objectif : positive)`, `Dette initiale : ${money(sc.base.debt)}`]; }
    },
    remontee: {
      icon: "🧗", title: "La remontée", seasons: 3,
      desc: "Parti des divisions inférieures, montez de deux paliers en 3 saisons (un seul si le pays n'a que 2 divisions). Plus c'est rapide, meilleure est la note.",
      start(ck) { const t0 = Math.min(4, nTiers(ck)); return `Début en ${tierName(ck, t0)} (division ${t0}) ; objectif : ${tierName(ck, Math.max(1, t0 - Math.min(2, t0 - 1)))}.`; },
      goals: (sc) => [`Atteindre ${sc.targetLabel} en 3 saisons maximum`, "Bonus de rapidité (accession dès la saison 1 ou 2)", "Bonus : atteindre l'élite", "Garder une trésorerie positive"],
      pick(ck) { const t = Math.min(4, nTiers(ck)); const l = clubsOfTier(ck, t); return l[Math.floor(l.length * 0.3)] || l[0]; },
      setup(club, sc) {
        sc.base = { t0: club.division };
        sc.target = Math.max(1, club.division - Math.min(2, club.division - 1));
        sc.targetLabel = tierName(club.countryKey, sc.target);
      },
      score(sc, club, final) {
        const climbed = clamp(sc.base.t0 - club.division, 0, sc.base.t0 - sc.target);
        const need = Math.max(1, sc.base.t0 - sc.target);
        const parts = [["Paliers gravis", Math.round(60 * climbed / need), 60]];
        const reached = club.division <= sc.target;
        const k = sc.reachedIn || (reached ? sc.hist.length : 0);
        parts.push(["Rapidité", reached ? Math.max(0, 20 - (k - 1) * 10) : 0, 20]);
        parts.push(["Élite atteinte", club.division === 1 && sc.target > 1 ? 10 : 0, 10]);
        parts.push(["Finances saines", club.budget >= 0 ? 10 : 0, 10]);
        return parts;
      },
      live(sc, club) { return [`Division actuelle : <b>${esc(tierName(club.countryKey, club.division))}</b> (n°${club.division}) — objectif : ${esc(sc.targetLabel)}`, `Départ : division ${sc.base.t0}`]; },
      reached(sc, club) { return club.division <= sc.target; }
    },
    formateur: {
      icon: "🎓", title: "Club formateur sans budget", seasons: 3,
      desc: "Pas un euro pour recruter : votre salut, c'est le centre de formation. Créez de la valeur avec vos jeunes (ventes et valeur des joueurs formés au club).",
      start(ck) { const t = nTiers(ck) >= 2 ? 2 : 1; return `Début en ${tierName(ck, t)}, trésorerie de 250 k€, centre de formation niveau 4.`; },
      goals: (sc) => [`Créer ${money(sc.target || 0)} de valeur avec des joueurs formés au club`, "Ne jamais descendre", "Terminer avec une trésorerie positive"],
      pick(ck) { const t = nTiers(ck) >= 2 ? 2 : 1; const l = clubsOfTier(ck, t); return l[Math.floor(l.length * 0.5)] || l[0]; },
      setup(club, sc) {
        club.budget = 250000; club.wageBudgetMonthly = Math.round(club.wageBudgetMonthly * 0.6); club.wageAnchor = club.wageBudgetMonthly;
        club.trainingCenterLevel = 4;
        sc.base = { hg: homegrownValue(club) };
        sc.target = club.division === 1 ? 15000000 : club.division === 2 ? 8000000 : 5000000;
        sc.sales = 0;
      },
      created(sc, club) { return Math.max(0, homegrownValue(club) - sc.base.hg + (sc.sales || 0)); },
      score(sc, club) {
        const v = this.created(sc, club);
        const relegs = sc.hist.filter((h) => h.relegated).length;
        const parts = [["Valeur créée par la formation", Math.min(70, Math.round(60 * v / sc.target) + (v >= sc.target * 1.5 ? 10 : 0)), 70]];
        parts.push(["Finances", club.budget >= 0 ? 20 : club.budget > -1000000 ? 10 : 0, 20]);
        parts.push(["Maintien sportif", Math.max(0, 10 - relegs * 5), 10]);
        return parts;
      },
      live(sc, club) { const v = this.created(sc, club); return [`Valeur créée : <b>${money(v)}</b> / ${money(sc.target)} (dont ventes ${money(sc.sales || 0)})`, `Trésorerie : ${money(club.budget)}`]; }
    }
  };

  // ---------- démarrage ----------
  function start(id, country, dsName) {
    const S = SCEN[id]; if (!S || !COUNTRIES[country]) return { ok: false };
    newGame(dsName || "Directeur Sportif", DS_AVATARS[0].id, [country], "france", "generaliste", "normal");
    const club = S.pick(country);
    setUserClub(club.id);
    const sc = { id, country, clubId: club.id, y0: state.season.year, seasons: S.seasons, hist: [], done: false, shown: false, sales: 0 };
    S.setup(club, sc);
    state.sc = sc;
    state.log.unshift({ date: fmtDate(state.date), text: `Défi « ${S.title} » : ${S.start(country)}` });
    try { saveGame(); } catch (e) {}
    ui.selectedCountries = [country]; ui.screen = "dashboard"; ui.tab = "overview";
    return { ok: true, club };
  }

  // ---------- suivi ----------
  const origTransfer = window.transferPlayer;
  window.transferPlayer = function (player, fromId, toId, fee) {
    const r = origTransfer.apply(this, arguments);
    try { const sc = hasState() && state.sc; if (sc && !sc.done && fromId === sc.clubId && player.formedAt === sc.clubId && toId !== sc.clubId) sc.sales = (sc.sales || 0) + (fee || 0); } catch (e) {}
    return r;
  };

  function finalize(sc, club, failedWhy) {
    const S = SCEN[sc.id];
    const parts = S.score(sc, club, true);
    let score = parts.reduce((s, p) => s + p[1], 0);
    if (failedWhy) score = Math.round(score * 0.5);
    score = clamp(Math.round(score), 0, 100);
    sc.done = true; sc.score = score; sc.grade = gradeOf(score); sc.parts = parts; sc.failedWhy = failedWhy || null; sc.doneYear = state.season.year;
    mail("club", "Défi", `🎯 Défi terminé : note ${sc.grade} (${score}/100)`, resultHTML(sc));
    state.log.unshift({ date: fmtDate(state.date), text: `Défi « ${S.title} » terminé : note ${sc.grade} (${score}/100).` });
  }

  const origRoll = window.seasonRollover;
  window.seasonRollover = function () {
    const sc = hasState() && state.sc; let pre = null;
    if (sc && !sc.done) { const c = getClub(sc.clubId); if (c) { const st = leagueStandingOf(c); pre = { div: c.division, rank: st.rank, total: st.total }; } }
    const r = origRoll.apply(this, arguments);
    try {
      if (sc && !sc.done && pre) {
        const club = getClub(sc.clubId); const S = SCEN[sc.id];
        sc.hist.push({ year: state.season.year - 1, rank: pre.rank, total: pre.total, div: pre.div, relegated: club.division > pre.div, promoted: club.division < pre.div, budget: club.budget });
        if (state.ds.fired || !isUserClub(sc.clubId)) { finalize(sc, club, "Limogé par le club"); }
        else {
          if (S.reached && !sc.reachedIn && S.reached(sc, club)) sc.reachedIn = sc.hist.length;
          if (sc.hist.length >= sc.seasons || (S.reached && S.reached(sc, club))) finalize(sc, club);
          else mail("club", "Défi", `🎯 Défi « ${S.title} » : bilan de la saison ${sc.hist.length}/${sc.seasons}`, `<p>${sc.hist.length} saison(s) sur ${sc.seasons}.</p><ul>${S.live(sc, club).map((x) => `<li>${x}</li>`).join("")}</ul>`);
        }
      }
    } catch (e) { console.error("défi", e); }
    return r;
  };

  // ---------- affichage ----------
  function resultHTML(sc) {
    const S = SCEN[sc.id];
    return `<p><b>${esc(S.title)}</b> — note finale : <b>${sc.grade}</b> (${sc.score}/100)${sc.failedWhy ? ` — ${esc(sc.failedWhy)}` : ""}.</p><table class="fx-mini"><tbody>${(sc.parts || []).map((p) => `<tr><td>${esc(p[0])}</td><td>${p[1]} / ${p[2]}</td></tr>`).join("")}</tbody></table>`;
  }
  function panelHTML() {
    const sc = state.sc; if (!sc) return "";
    const S = SCEN[sc.id]; const club = getClub(sc.clubId) || userClub();
    const yrs = Math.min(sc.seasons, state.season.year - sc.y0 + (sc.done ? 0 : 0));
    const proj = sc.done ? null : S.score(sc, club, false).reduce((s, p) => s + p[1], 0);
    return `<div class="fm-dark fm-panel sc-panel"><h3 class="panel-subtitle">${S.icon} Défi : ${esc(S.title)} ${sc.done ? `<span class="dos-v dos-${sc.score >= 60 ? "ok" : "ko"}">Note ${sc.grade}</span>` : ""}</h3>
      <p class="hint">${esc(S.desc)}</p>
      ${sc.done ? resultHTML(sc) : `<p class="hint">Saison ${Math.min(sc.seasons, state.season.year - sc.y0 + 1)} sur ${sc.seasons}.</p><ul class="dos-list">${S.live(sc, club).map((x) => `<li>${x}</li>`).join("")}</ul>
      <p class="hint">Objectifs : ${S.goals(sc).map(esc).join(" · ")}</p><p class="hint">Note provisoire : <b>${gradeOf(proj)}</b> (${Math.round(proj)}/100)</p>`}</div>`;
  }
  const origClub = window.renderClubTab;
  if (typeof origClub === "function") window.renderClubTab = function () {
    const html = origClub.apply(this, arguments);
    try { return hasState() && state.sc ? html + panelHTML() : html; } catch (e) { console.error(e); return html; }
  };

  // ---------- menu principal ----------
  let root = null;
  const rootEl = () => { if (!root || !document.body.contains(root)) { root = document.createElement("div"); root.id = "sc-root"; document.body.appendChild(root); } return root; };
  let SEL = { id: "faillite", country: "france" };
  function menuHTML() {
    const opts = Object.entries(COUNTRIES).map(([k, c]) => `<option value="${k}" ${k === SEL.country ? "selected" : ""}>${esc(c.label)}</option>`).join("");
    return `<div class="modal-backdrop"><div class="modal dossier sc-modal"><h3 class="panel-subtitle" style="margin-top:0">🎯 Mode défi</h3>
      <p class="hint">Un départ imposé, des objectifs précis, une note finale de S à D.</p>
      ${Object.entries(SCEN).map(([id, S]) => `<button class="spec-card sc-card ${SEL.id === id ? "selected" : ""}" data-scn="pick:${id}"><span class="spec-name">${S.icon} ${esc(S.title)} <small>(${S.seasons} saisons)</small></span><span class="spec-desc">${esc(S.desc)}</span>${SEL.id === id ? `<span class="spec-desc"><b>${esc(S.start(SEL.country))}</b></span>` : ""}</button>`).join("")}
      <label class="field"><span>Pays</span><select id="sc-country" data-scn="country">${opts}</select></label>
      <label class="field"><span>Votre nom</span><input id="sc-name" maxlength="24" value="Directeur Sportif"></label>
      <div class="creation-footer"><button class="btn btn-ghost" data-scn="close">Annuler</button><button class="btn btn-primary" data-scn="go">Lancer le défi</button></div></div></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-scn]"); if (!b) return;
    const [k, v] = b.getAttribute("data-scn").split(":");
    if (k === "open") rootEl().innerHTML = menuHTML();
    else if (k === "close") rootEl().innerHTML = "";
    else if (k === "pick") { SEL.id = v; rootEl().innerHTML = menuHTML(); }
    else if (k === "go") {
      const name = (document.getElementById("sc-name") || {}).value || "Directeur Sportif";
      rootEl().innerHTML = ""; start(SEL.id, SEL.country, name.trim() || "Directeur Sportif"); render();
    } else if (k === "res") { rootEl().innerHTML = ""; }
  });
  document.addEventListener("change", (e) => {
    const s = e.target.closest && e.target.closest("select[data-scn]"); if (!s) return;
    SEL.country = s.value; rootEl().innerHTML = menuHTML();
  });

  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (ui.screen === "menu" && !document.getElementById("sc-open")) {
        const m = document.querySelector(".menu-actions");
        if (m) m.insertAdjacentHTML("afterend", `<div class="menu-actions" style="margin-top:10px;"><button class="btn btn-ghost" id="sc-open" data-scn="open">🎯 Mode défi</button></div>`);
      }
      if (ui.screen === "dashboard" && hasState() && state.sc && state.sc.done && !state.sc.shown) {
        state.sc.shown = true;
        rootEl().innerHTML = `<div class="modal-backdrop"><div class="modal dossier sc-modal"><h3 class="panel-subtitle" style="margin-top:0">🎯 Défi terminé</h3><div class="sc-grade">${state.sc.grade}</div>${resultHTML(state.sc)}<p class="hint">Vous pouvez poursuivre la partie normalement.</p><div class="creation-footer"><button class="btn btn-primary" data-scn="res">Continuer</button></div></div></div>`;
      }
    } catch (e) { console.error(e); }
    return r;
  };

  window.dsScen = { SCEN, start, finalize, gradeOf, panelHTML, homegrownValue };
})();
