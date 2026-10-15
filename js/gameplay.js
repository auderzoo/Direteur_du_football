// =====================================================================
// GAMEPLAY DS (bloc 2) :
//  - objectifs de saison négociés avec le président (bonus / malus de réputation)
//  - rapport d'adversaire avant chaque match + pistes de recrutement
//  - mode carrière : offres d'autres clubs selon la réputation du DS
//  - staff : fatigue, loyauté, débauchage par d'autres clubs
// (la négociation à plusieurs tours avec l'agent est dans app.js : openNegotiation)
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = () => new Date(state.date).toISOString().slice(0, 10);
  function root() { let r = document.getElementById("gp-root"); if (!r) { r = document.createElement("div"); r.id = "gp-root"; document.body.appendChild(r); } return r; }
  function closeGP() { root().innerHTML = ""; }
  function showModal(html) { root().innerHTML = `<div class="modal-backdrop"><div class="modal dossier gp-modal">${html}</div></div>`; }
  const modalOpen = () => !!root().querySelector(".modal-backdrop");
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };

  // ===================================================================
  // 1. OBJECTIFS NÉGOCIÉS AVEC LE PRÉSIDENT
  // ===================================================================
  const OBJ_LABEL = {
    maintien: "Assurer le maintien", milieu: "Terminer dans la première moitié du tableau",
    top6: "Finir dans le top 6", top3: "Viser le podium (top 3)", titre: "Remporter le championnat"
  };
  function objLadder(club) { return club.division === 1 ? ["maintien", "milieu", "top6", "top3", "titre"] : ["maintien", "milieu", "promotion", "titre"]; }
  function objLabel(club, type) {
    if (type === "promotion") {
      const top = (LEAGUE_NAMES[club.countryKey] && LEAGUE_NAMES[club.countryKey].d1) || "Élite";
      return `Monter en division ${club.division - 1 === 1 ? "1 (" + top + ")" : club.division - 1}`;
    }
    return OBJ_LABEL[type] || type;
  }
  // évaluation : on étend les types (titre) et on corrige « milieu » (finir trop haut n'est pas un échec)
  window.evaluateObjective = function (club, rank, total) {
    switch (club.objectiveType) {
      case "titre": return rank === 1;
      case "top3": return rank <= 3;
      case "top6": return rank <= 6;
      case "maintien": return rank <= total - 2;
      case "promotion": return rank <= 2;
      case "milieu": return rank <= Math.ceil(total * 0.6);
      default: return true;
    }
  };
  const STANCES = {
    ambitieux: { label: "Ambitieux", step: 1, ok: 4, ko: -2, budget: 0.08, blurb: "Vous visez plus haut que le conseil. Enveloppe de transferts +8 % tout de suite." },
    realiste: { label: "Réaliste", step: 0, ok: 1, ko: 0, budget: 0, blurb: "Objectif proposé par le conseil, sans surprise." },
    prudent: { label: "Prudent", step: -1, ok: -1, ko: -2, budget: 0, blurb: "Vous visez plus bas : moins de pression, mais peu de gloire (et la honte si vous échouez)." }
  };
  function stanceType(club, st) {
    const lad = objLadder(club);
    let base = lad.indexOf(club.objectiveBase); if (base < 0) base = Math.min(1, lad.length - 1);
    const idx = Math.max(0, Math.min(lad.length - 1, base + STANCES[st].step));
    return lad[idx];
  }
  function ensureBoard() {
    const uc = userClub(); if (!uc || !state.ds) return;
    const year = state.season.year;
    if (!uc.objectiveType) assignObjective(uc);
    if (uc.boardYear === year) return;
    if (uc.boardBaseYear !== year) {
      uc.objectiveBase = uc.objectiveType; uc.boardBaseYear = year; uc.objectiveStance = "realiste"; uc.boardRolls = {};
    }
    state.pendingBoard = uc.id;
    if (!modalOpen() && !document.querySelector("#match-modal .modal-backdrop")) openBoard(uc);
  }
  function ownerLine(club) {
    const o = club.owner || {};
    return `${esc(o.label || "Le président")} — ${esc(o.description || "")}`;
  }
  function openBoard(club) {
    club = club || userClub();
    if (!club.objectiveBase) club.objectiveBase = club.objectiveType;
    const cur = club.objectiveStance || "realiste";
    const opts = ["ambitieux", "realiste", "prudent"].map((st) => ({ st, type: stanceType(club, st) }))
      .filter((o, i, arr) => o.st === "realiste" || o.type !== arr.find((x) => x.st === "realiste").type);
    const locked = club.played > 0 && club.boardYear === state.season.year;
    showModal(`
      <h3>🤝 Entretien avec le président</h3>
      <p class="hint">${ownerLine(club)}</p>
      <p>Pour la saison ${state.season.year}, le conseil attend de <b>${esc(club.name)}</b> : <b>${esc(objLabel(club, club.objectiveBase))}</b>.</p>
      <p class="hint">Vous pouvez négocier l'ambition affichée. Réputation de DS : <b>${state.ds.reputation}</b>/100. ${locked ? "<b>Le championnat a commencé : l'objectif est figé.</b>" : ""}</p>
      <div class="stance-list">
        ${opts.map((o) => {
          const s = STANCES[o.st];
          return `<button class="stance-card ${o.st === cur ? "active" : ""}" ${locked ? "disabled" : ""} data-gp="board:${o.st}">
            <b>${s.label}</b> — ${esc(objLabel(club, o.type))}
            <span class="hint">${s.blurb}</span>
            <span class="hint">Réputation en fin de saison : réussite <b>${s.ok >= 0 ? "+" : ""}${s.ok}</b> · échec <b>${s.ko >= 0 ? "+" : ""}${s.ko}</b> (en plus du bilan habituel)</span>
          </button>`;
        }).join("")}
      </div>
      <div id="board-msg"></div>
      <div class="creation-footer"><button class="btn btn-ghost" data-gp="board-default">${state.pendingBoard ? "Accepter l'objectif proposé" : "Fermer"}</button></div>`);
  }
  function chooseStance(st) {
    const club = userClub(); const year = state.season.year;
    if (club.played > 0 && club.boardYear === year) return;
    club.boardRolls = club.boardRolls || {};
    let final = st, text = "";
    if (club.boardRolls[st] === undefined) {
      let ok = true;
      const o = club.owner || { type: "local" }, rep = state.ds.reputation || 0;
      if (st === "prudent") {
        const p = o.type === "ambitieux" ? 0.15 + rep / 300 : o.type === "investisseur" ? 0.45 + rep / 300 : 0.85;
        ok = Math.random() < p;
      } else if (st === "ambitieux") ok = o.type === "patient" ? Math.random() < 0.8 : true;
      club.boardRolls[st] = ok;
    }
    if (!club.boardRolls[st]) { final = "realiste"; text = "Le président refuse un objectif aussi timide : « Nous avons des ambitions. » L'objectif réaliste est maintenu."; }
    else if (st === "ambitieux") text = "Le président sourit : « Voilà l'état d'esprit que j'attendais. »";
    else if (st === "prudent") text = "Le président accepte, un peu déçu : « Soit. Mais je ne veux pas d'excuses. »";
    else text = "Objectif confirmé.";
    applyStance(club, final);
    openBoard(club);
    const box = document.getElementById("board-msg"); if (box) box.innerHTML = `<p class="result-mid">${text}</p>`;
  }
  function applyStance(club, st) {
    const year = state.season.year;
    // annule l'éventuelle enveloppe déjà accordée si on change d'avis
    if (club.boardBonusYear === year && club.boardBonusAmt && st !== "ambitieux") { club.budget -= club.boardBonusAmt; club.boardBonusAmt = 0; club.boardBonusYear = null; }
    club.objectiveStance = st;
    club.objectiveType = stanceType(club, st);
    club.objectiveLabel = objLabel(club, club.objectiveType);
    if (st === "ambitieux" && club.boardBonusYear !== year) {
      const amt = Math.round(Math.max(club.budget, 0) * STANCES.ambitieux.budget / 10000) * 10000;
      club.budget += amt; club.boardBonusAmt = amt; club.boardBonusYear = year;
    }
    club.boardYear = year; state.pendingBoard = null;
    note(`Entretien avec le président (${club.name}) : objectif ${STANCES[st].label.toLowerCase()} — ${club.objectiveLabel}.`);
  }
  window.applyObjectiveStance = function (uc, success) {
    const st = STANCES[uc.objectiveStance || "realiste"]; if (!st) return;
    const d = success ? st.ok : st.ko; if (!d) return;
    state.ds.reputation = clamp(state.ds.reputation + d, 0, 100);
    note(`Bonus/malus d'objectif (${st.label.toLowerCase()}) : ${d > 0 ? "+" : ""}${d} de réputation.`);
  };

  // ===================================================================
  // 2. RAPPORT D'ADVERSAIRE
  // ===================================================================
  const LINES = { GB: ["Gardien", 1], DEF: ["Défense", 4], MIL: ["Milieu", 3], ATT: ["Attaque", 3] };
  function lineAvg(c, pos, healthyOnly) {
    const t = today();
    const arr = c.players.filter((p) => p.position === pos && (!healthyOnly || ((!p.injuredUntil || p.injuredUntil < t) && !(p.suspendedMatches > 0))))
      .map((p) => p.overall).sort((a, b) => b - a).slice(0, LINES[pos][1]);
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }
  function seeded(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const STYLE_TXT = {
    possession: ["Possession", "Ils gardent le ballon : pressez haut et fermez l'axe."],
    contre: ["Contre-attaque", "Ils attendent derrière : soyez prudents sur les pertes de balle."],
    direct: ["Jeu direct", "Longs ballons vers l'avant : une défense solide dans les duels est précieuse."],
    equilibre: ["Équilibré", "Pas de point faible évident dans l'approche."]
  };
  function leagueLineAvg(club, pos) {
    const league = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
    const vals = league.clubs.map((c) => lineAvg(c, pos, false)).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  function openOppo() {
    const club = userClub(); const next = getNextFixture(club);
    if (!next) { showModal(`<h3>📋 Rapport d'adversaire</h3><p class="hint">Aucun match programmé pour l'instant.</p><div class="creation-footer"><button class="btn btn-ghost" data-gp="close">Fermer</button></div>`); return; }
    const opp = next.home.id === club.id ? next.away : next.home;
    const q = typeof staffEffect === "function" ? staffEffect(club, "analyste") : 0;
    const rnd = seeded(opp.id * 7919 + (state.dayCounter || 0) * 31);
    const amp = (1 - q) * 6;
    const fz = (v) => Math.round(v + (rnd() * 2 - 1) * amp);
    const reliab = Math.round(60 + q * 40);
    const form = getRecentForm(opp, 5);
    const st = leagueStandingOf(opp);
    const t = today();
    const abs = opp.players.filter((p) => (p.injuredUntil && p.injuredUntil >= t) || p.suspendedMatches > 0);
    const key = [...opp.players].sort((a, b) => b.overall - a.overall).slice(0, 3);
    const styleInfo = STYLE_TXT[opp.playstyle] || STYLE_TXT.equilibre;
    const rows = Object.keys(LINES).map((pos) => ({ pos, label: LINES[pos][0], theirs: lineAvg(opp, pos, true), mine: lineAvg(club, pos, true), league: leagueLineAvg(club, pos) }));
    const advice = [];
    const best = rows.slice().sort((a, b) => (a.theirs - a.mine) - (b.theirs - b.mine))[0];
    rows.forEach((r) => {
      if (r.pos === "ATT" && r.mine - lineAvg(opp, "DEF", true) > 3) advice.push(`Leur défense (${fz(lineAvg(opp, "DEF", true))}) est fragile face à votre attaque (${Math.round(r.mine)}) : jouez vers l'avant.`);
      if (r.pos === "DEF" && lineAvg(opp, "ATT", true) - r.mine > 3) advice.push(`Leur attaque (${fz(lineAvg(opp, "ATT", true))}) dépasse votre défense (${Math.round(r.mine)}) : couvrez-vous.`);
    });
    if (abs.length >= 3) advice.push(`${abs.length} absents chez eux : bon moment pour les affronter.`);
    advice.push(styleInfo[1]);
    // pistes de recrutement : lignes où l'on est sous la moyenne du championnat
    const gaps = rows.map((r) => ({ ...r, gap: r.league - lineAvg(club, r.pos, false) })).filter((r) => r.gap > 1.5).sort((a, b) => b.gap - a.gap);
    showModal(`
      <h3>📋 Rapport d'adversaire — ${esc(opp.name)}</h3>
      <p class="hint">${fmtDate(new Date(next.date))} · ${next.home.id === club.id ? "à domicile" : "à l'extérieur"} · fiabilité du rapport ${reliab} %${q < 0.3 ? " (recrutez un analyste vidéo pour l'améliorer)" : ""}</p>
      <div class="form-strip">${form.map((m) => `<span class="fchip f${m.result}">${m.result === "W" ? "V" : m.result === "D" ? "N" : "D"}</span>`).join("") || "<span class='hint'>Aucun match joué</span>"}<span class="hint" style="margin-left:8px;">${st.rank}ᵉ / ${st.total} · style ${styleInfo[0]}</span></div>
      <h4 class="panel-subtitle">Forces par ligne (disponibles)</h4>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>Ligne</th><th>${esc(opp.name)}</th><th>Vous</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${r.label}</td><td>${fz(r.theirs)}</td><td>${Math.round(r.mine)}</td></tr>`).join("")}
      </tbody></table></div>
      <h4 class="panel-subtitle">Joueurs à surveiller</h4>
      <p>${key.map((p) => `${esc(p.firstName[0])}. ${esc(p.lastName)} (${p.position}, ~${fz(p.overall)})`).join(" · ")}</p>
      ${abs.length ? `<p class="hint">Absents : ${abs.slice(0, 6).map((p) => `${esc(p.lastName)} (${p.suspendedMatches > 0 ? "suspendu" : "blessé"})`).join(", ")}.</p>` : ""}
      <h4 class="panel-subtitle">Conseils</h4>
      <ul>${advice.map((a) => `<li>${a}</li>`).join("")}</ul>
      <h4 class="panel-subtitle">Plan de recrutement</h4>
      ${gaps.length ? `<p class="hint">Vos lignes sous la moyenne du championnat :</p>
        <div class="gap-list">${gaps.map((g) => `<button class="btn btn-small btn-ghost" data-gp="goto-market:${g.pos}">${g.label} (−${g.gap.toFixed(1)}) → chercher</button>`).join(" ")}</div>`
        : `<p class="hint">Aucune ligne ne traîne sous la moyenne du championnat : misez sur les opportunités ou la relève.</p>`}
      <div class="creation-footer"><button class="btn btn-primary" data-gp="close">Fermer</button></div>`);
  }

  // ===================================================================
  // 3. MODE CARRIÈRE : OFFRES SELON LA RÉPUTATION
  // ===================================================================
  window.generateJobOffers = function () {
    if (!state.ds) return;
    const cur = userClub(); if (!cur) return;
    state.inbox.forEach((o) => { if (o.type === "job_offer" && !o.resolved && o.expiresDay && state.dayCounter > o.expiresDay) { o.resolved = true; o.accepted = false; o.expired = true; } });
    if (state.inbox.filter((o) => o.type === "job_offer" && !o.resolved).length >= 2) return;
    const r = state.ds.reputation || 0;
    let prob = 0.04 + (r / 100) * 0.30 + (cur.lastObjectiveMet === true ? 0.06 : 0) - (state.ds.failStreak || 0) * 0.04;
    prob = clamp(prob, 0.02, 0.45);
    if (Math.random() > prob) return;
    const aspire = 35 + r * 0.55;
    let lo, hi;
    if (r < 30) { lo = cur.reputation - 18; hi = cur.reputation + 2; }
    else { lo = cur.reputation - 5; hi = Math.max(cur.reputation + 6, aspire); }
    const pendingIds = state.inbox.filter((o) => o.type === "job_offer" && !o.resolved).map((o) => o.clubId);
    const cands = allClubs().filter((c) => !isUserClub(c.id) && c.id !== cur.id && !pendingIds.includes(c.id) && c.reputation >= lo && c.reputation <= Math.max(Math.min(hi, aspire + 5), cur.reputation + 2));
    if (!cands.length) return;
    const target = pick(cands);
    const kind = target.reputation > cur.reputation + 3 ? "ascension" : target.reputation < cur.reputation - 3 ? "rebond" : "lateral";
    const reasons = {
      ascension: `Votre réputation (${r}/100) attire ${target.name}, qui vise plus haut.`,
      rebond: `${target.name} mise sur vous pour rebondir et redresser le projet.`,
      lateral: `${target.name} vous propose un nouveau défi de même standing.`
    };
    const terms = {
      kind, years: randInt(2, 4), reason: reasons[kind], objective: target.objectiveLabel || "—",
      budgetBoostPct: kind === "ascension" ? randInt(3, 12) : kind === "rebond" ? randInt(8, 20) : randInt(0, 8)
    };
    state.inbox.unshift({ id: nextId(), type: "job_offer", clubId: target.id, date: fmtDate(state.date), resolved: false, terms, expiresDay: state.dayCounter + 21 });
  };
  window.jobTermsHTML = function (o) {
    const t = o.terms; if (!t) return "";
    const kind = { ascension: "Ascension", rebond: "Rebond", lateral: "Latéral" }[t.kind] || "";
    const left = o.expiresDay ? Math.max(0, o.expiresDay - (state.dayCounter || 0)) : null;
    return `<div class="hint job-terms"><b>${kind}</b> — ${esc(t.reason)}<br/>Contrat ${t.years} ans · objectif : ${esc(t.objective)}${t.budgetBoostPct ? ` · enveloppe de transferts +${t.budgetBoostPct} %` : ""}${left !== null ? ` · réponse attendue sous ${left} j` : ""}</div>`;
  };
  const origResolve = window.resolveJobOffer;
  window.resolveJobOffer = function (offerId, accept) {
    const offer = state.inbox.find((o) => o.id === offerId);
    const fresh = offer && !offer.resolved;
    const r = origResolve.apply(this, arguments);
    if (accept && fresh && offer.terms) {
      const nc = getClub(offer.clubId);
      if (nc) {
        if (offer.terms.budgetBoostPct) nc.budget += Math.round(Math.max(nc.budget, 0) * offer.terms.budgetBoostPct / 100 / 10000) * 10000;
        if (offer.terms.kind === "ascension") state.ds.reputation = clamp(state.ds.reputation + 2, 0, 100);
        note(`Vous signez ${offer.terms.years} ans à ${nc.name} (${offer.terms.kind}).`);
      }
    }
    return r;
  };

  // ===================================================================
  // 4. STAFF : FATIGUE, LOYAUTÉ, DÉBAUCHAGE
  // ===================================================================
  const WORK = { entraineur: 1.2, adjoint: 1, preparateur: 1.1, kine: 1, recruteur: 0.8, gardiens: 0.8, analyste: 1.1, directeurFormation: 0.6 };
  function ensureStaff(s) {
    if (s.fatigue === undefined) s.fatigue = randInt(5, 25);
    if (s.loyalty === undefined) s.loyalty = randInt(40, 90);
    return s;
  }
  const origEffect = window.staffEffect;
  window.staffEffect = function (club, role) {
    const base = origEffect.apply(this, arguments);
    const list = (club.staff || []).filter((s) => s.role === role);
    if (!list.length) return base;
    const avg = list.reduce((a, s) => a + (s.fatigue || 0), 0) / list.length;
    return base * (1 - clamp((avg - 55) / 100, 0, 0.4));
  };
  function staffWeekly() {
    const club = userClub(); if (!club || !club.staff) return;
    const played = club.played || 0;
    const matches = Math.max(0, played - (state.gpPlayedMark || 0)); state.gpPlayedMark = played;
    const year = new Date(state.date).getFullYear();
    club.staff.forEach((s) => {
      ensureStaff(s);
      const w = WORK[s.role] || 1;
      let df = 2 + 3.5 * matches * w - 4 - (matches === 0 ? 4 : 0);
      if (s.restUntilDay && s.restUntilDay > state.dayCounter) df -= 6;
      s.fatigue = clamp(Math.round(s.fatigue + df), 0, 100);
      const ratio = s.wage / Math.max(1, staffWageFor(staffAbility(s), s.role));
      let dl = 0;
      if (ratio >= 1.05) dl += 0.4; else if (ratio < 0.9) dl -= 0.8;
      if (s.fatigue > 70) dl -= 1;
      if (club.lastObjectiveMet === true) dl += 0.2;
      if (s.contractEndYear && s.contractEndYear - year <= 1) dl -= 0.3;
      s.loyalty = clamp(s.loyalty + dl, 5, 98);
    });
    checkPoach(club);
  }
  function checkPoach(club) {
    const pp = state.pendingPoach;
    if (pp && state.dayCounter > pp.expiresDay) { staffLeaves(club, pp); state.pendingPoach = null; }
    if (state.pendingPoach) return;
    const cand = club.staff.filter((s) => ensureStaff(s).loyalty < 45 && staffAbility(s) >= 10 && !(s.poachCooldown > state.dayCounter));
    if (!cand.length) return;
    const s = pick(cand);
    if (Math.random() > 0.35 - s.loyalty / 200) return;
    const suitors = allClubs().filter((c) => !isUserClub(c.id) && c.id !== club.id && c.reputation >= club.reputation - 5);
    if (!suitors.length) return;
    const suitor = pick(suitors);
    s.poachCooldown = state.dayCounter + 60;
    state.pendingPoach = { staffId: s.id, clubId: club.id, suitorId: suitor.id, wage: Math.round(s.wage * randInt(120, 160) / 100 / 100) * 100, expiresDay: state.dayCounter + 10 };
  }
  function staffLeaves(club, pp) {
    const s = (club.staff || []).find((x) => x.id === pp.staffId); const suitor = getClub(pp.suitorId);
    if (!s || !suitor) return;
    club.staff = club.staff.filter((x) => x.id !== s.id);
    if (club.scouting && club.scouting.assignments) delete club.scouting.assignments[s.id];
    s.clubId = suitor.id; s.wage = pp.wage; s.contractEndYear = new Date(state.date).getFullYear() + 3;
    suitor.staff = suitor.staff || []; suitor.staff.push(s);
    note(`${s.firstName} ${s.lastName} (${STAFF_ROLES[s.role].label}) a été débauché par ${suitor.name}.`);
    state.news.unshift({ date: fmtDate(state.date), text: `${s.firstName} ${s.lastName} quitte ${club.name} pour rejoindre le staff de ${suitor.name}.` });
  }
  function openPoach() {
    const pp = state.pendingPoach; if (!pp) return;
    const club = getClub(pp.clubId); const s = club && club.staff.find((x) => x.id === pp.staffId); const suitor = getClub(pp.suitorId);
    if (!s || !suitor) { state.pendingPoach = null; return; }
    const left = Math.max(0, pp.expiresDay - state.dayCounter);
    showModal(`
      <h3>🕵️ Un club veut débaucher votre ${esc(STAFF_ROLES[s.role].label.toLowerCase())}</h3>
      <p><b>${esc(suitor.name)}</b> propose à <b>${esc(s.firstName)} ${esc(s.lastName)}</b> un contrat à <b>${fmtMoney(pp.wage)}/mois</b> (actuellement ${fmtMoney(s.wage)}).</p>
      <p class="hint">Loyauté ${Math.round(s.loyalty)}/100 · fatigue ${Math.round(s.fatigue)}/100 · décision attendue sous ${left} jour(s) — sans réponse, il partira.</p>
      <div id="poach-msg"></div>
      <div class="creation-footer">
        <button class="btn btn-ghost" data-gp="poach-go">Le laisser partir</button>
        <button class="btn btn-primary" data-gp="poach-keep">Retenir (aligner ${fmtMoney(pp.wage)})</button>
      </div>`);
  }
  function poachKeep() {
    const pp = state.pendingPoach; const club = getClub(pp.clubId); const s = club.staff.find((x) => x.id === pp.staffId);
    if (staffWageBill(club) - s.wage + pp.wage > staffBudget(club)) {
      const m = document.getElementById("poach-msg"); if (m) m.innerHTML = `<p class="result-bad">Budget staff insuffisant (${fmtMoney(staffBudget(club))}/mois). Libérez de la marge ou laissez-le partir.</p>`; return;
      return;
    }
    s.wage = pp.wage; s.loyalty = 75; s.contractEndYear = new Date(state.date).getFullYear() + 3;
    note(`${s.firstName} ${s.lastName} reste au club avec un salaire de ${fmtMoney(pp.wage)}/mois.`);
    state.pendingPoach = null; closeGP(); render();
  }
  function poachGo() { const pp = state.pendingPoach; const club = getClub(pp.clubId); staffLeaves(club, pp); state.pendingPoach = null; closeGP(); saveGame(); render(); }
  function ensurePoach() {
    if (!state.pendingPoach || modalOpen() || document.querySelector("#match-modal .modal-backdrop")) return;
    const club = userClub();
    if (state.dayCounter > state.pendingPoach.expiresDay) { staffLeaves(club, state.pendingPoach); state.pendingPoach = null; return; }
    openPoach();
  }
  function bar(v, bad) { const col = bad ? (v > 70 ? "#8B3A2B" : v > 45 ? "#B9862E" : "#2E6B3E") : (v < 35 ? "#8B3A2B" : v < 55 ? "#B9862E" : "#2E6B3E"); return `<div class="wage-bar"><div class="wage-bar-fill" style="width:${Math.round(v)}%;background:${col}"></div></div>`; }
  function staffMoralHTML() {
    const club = userClub(); if (!club || !(club.staff || []).length) return "";
    return `<h3 class="panel-subtitle">Forme et loyauté du staff</h3>
      <p class="hint">La fatigue grimpe avec les matchs et réduit l'efficacité au-delà de 55. Un salaire sous le marché ou un staff épuisé fait chuter la loyauté : d'autres clubs peuvent alors le débaucher.</p>
      <div class="table-scroll"><table class="squad-table"><thead><tr><th>Membre</th><th>Fatigue</th><th>Loyauté</th><th></th></tr></thead><tbody>
      ${club.staff.map((s) => { ensureStaff(s); const cd = s.restCooldown && s.restCooldown > state.dayCounter;
        return `<tr><td>${STAFF_ROLES[s.role].icon} ${esc(s.firstName)} ${esc(s.lastName)}<br/><span class="hint">${STAFF_ROLES[s.role].label}</span></td>
          <td style="min-width:90px">${bar(s.fatigue, true)}<span class="hint">${Math.round(s.fatigue)}</span></td>
          <td style="min-width:90px">${bar(s.loyalty, false)}<span class="hint">${Math.round(s.loyalty)}</span></td>
          <td><button class="btn btn-small btn-ghost" data-gp="staffrest:${s.id}" ${cd ? "disabled" : ""}>${cd ? "Repos indispo." : "Accorder du repos"}</button></td></tr>`; }).join("")}
      </tbody></table></div>`;
  }
  const origStaffTab = window.renderStaffTab;
  window.renderStaffTab = function () { return origStaffTab.apply(this, arguments) + staffMoralHTML(); };
  function staffRest(id) {
    const club = userClub(); const s = club.staff.find((x) => x.id === id); if (!s) return;
    s.fatigue = Math.max(0, s.fatigue - 30); s.loyalty = clamp(s.loyalty + 2, 5, 98);
    s.restUntilDay = state.dayCounter + 7; s.restCooldown = state.dayCounter + 21;
    if (window.dsToast) dsToast("Repos accordé ✓");
    saveGame(); render();
  }

  // ===================================================================
  // Intégration : boucle quotidienne, rendu, clics
  // ===================================================================
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (state.dayCounter % 7 === 0) staffWeekly(); } catch (e) { console.warn("staffWeekly", e); }
    return r;
  };

  function decorateOverview() {
    if (ui.tab !== "overview") return;
    const club = userClub(); if (!club) return;
    document.querySelectorAll("#tab-content .hero-card").forEach((card) => {
      const title = (card.querySelector(".hero-card-title") || {}).textContent || "";
      if (/prochain match/i.test(title) && !card.querySelector("[data-gp=oppo]")) {
        const next = getNextFixture(club);
        if (next) {
          const days = Math.round((new Date(next.date) - new Date(today())) / 86400000);
          card.insertAdjacentHTML("beforeend", `<div style="margin-top:8px"><button class="btn btn-small btn-ghost" data-gp="oppo">📋 Rapport d'adversaire${days >= 0 && days <= 2 ? ` · J-${days}` : ""}</button></div>`);
        }
      }
      if (/objectif/i.test(title) && !card.querySelector("[data-gp=board-open]")) {
        const st = STANCES[club.objectiveStance || "realiste"];
        card.insertAdjacentHTML("beforeend", `<div class="hero-card-sub">Posture : ${st.label}</div>${club.played === 0 ? `<div style="margin-top:6px"><button class="btn btn-small btn-ghost" data-gp="board-open">🤝 Discuter avec le président</button></div>` : ""}`);
      }
    });
  }
  const origRender = window.render;
  window.render = function () {
    const r = origRender.apply(this, arguments);
    try {
      if (ui.screen === "dashboard" && state && state.ds && userClub()) {
        decorateOverview();
        ensureBoard();
        ensurePoach();
      }
    } catch (e) { console.warn("gameplay post-render", e); }
    return r;
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-gp]"); if (!b) return;
    const [cmd, arg] = b.dataset.gp.split(":");
    switch (cmd) {
      case "close": closeGP(); break;
      case "oppo": openOppo(); break;
      case "board-open": openBoard(userClub()); break;
      case "board": chooseStance(arg); break;
      case "board-default": { const c = userClub(); if (state.pendingBoard) { applyStance(c, c.objectiveStance || "realiste"); saveGame(); } closeGP(); render(); break; }
      case "goto-market": ui.search = Object.assign(defaultSearch(), { pos: arg, sort: "level" }); ui.tab = "market"; closeGP(); render(); window.scrollTo(0, 0); break;
      case "staffrest": staffRest(parseInt(arg, 10)); break;
      case "poach-keep": poachKeep(); break;
      case "poach-go": poachGo(); break;
    }
  });

  window.gp = { ensureBoard, openBoard, chooseStance, applyStance, openOppo, staffWeekly, objLadder, stanceType, openPoach, checkPoach, STANCES };
})();
