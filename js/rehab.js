// ===================================================================
// BLOC 23 (4/4) — BLESSURES DE LONGUE DURÉE : rééducation, rechutes, prêt de convalescence
//  - blessure grave (28 jours ou plus) => dossier médical : programme de rééducation à choisir
//      standard / intensif (retour plus tôt, rechute plus probable) / prudent (plus long, rechute rare)
//  - risque de rechute selon le type de blessure, l'âge, le terrain médical (centre médical) et le programme
//  - au retour : reprise progressive (fatigue) ou rechute
//  - garder le joueur ou le prêter pour se refaire une condition (le club d'accueil a son propre centre médical)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pk = (a) => a[Math.floor(Math.random() * a.length)];
  const hasState = () => typeof state !== "undefined" && state && state.ds && state.countries && typeof userClub === "function" && !!userClub();
  const day = () => state.dayCounter || 0;
  const dk = (d) => new Date(d).toISOString().slice(0, 10);
  const tk = () => dk(state.date);
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const toast = (t) => { try { window.dsToast && window.dsToast(t); } catch (e) {} };
  const LONG = 28;
  const PROG = {
    standard: { label: "Standard", f: 1, r: 1, hint: "Durée normale, risque de rechute normal." },
    intensive: { label: "Intensif", f: 0.8, r: 1.9, hint: "Retour environ 20 % plus tôt, mais rechute presque deux fois plus probable." },
    prudent: { label: "Prudent", f: 1.15, r: 0.45, hint: "15 % plus long, rechute très improbable." }
  };
  const R = () => { state.rehab = state.rehab || { ids: [], loaned: {}, done: [] }; return state.rehab; };
  const medical = (club) => { try { return window.dsTraining.fac(club).medical; } catch (e) { return 1; } };
  const userIds = () => state.userClubIds || [];
  function findPlayer(pid) {
    for (const id of userIds()) { const c = getClub(id); const p = c && c.players.find((x) => x.id === pid); if (p) return { p, club: c }; }
    const lc = R().loaned[pid]; if (lc != null) { const c = getClub(lc); const p = c && c.players.find((x) => x.id === pid); if (p) return { p, club: c, away: true }; }
    return null;
  }
  const remaining = (p) => Math.max(0, Math.round((new Date(p.injuredUntil) - new Date(tk())) / 864e5));
  function riskOf(club, p) {
    const rh = p.rehab, t = (p.injury && p.injury.type) || "";
    let r = /ligament|croisé/i.test(t) ? 13 : /fracture/i.test(t) ? 6 : /genou|lésion/i.test(t) ? 10 : 8;
    r += p.age > 30 ? 4 : p.age > 27 ? 2 : 0;
    r += (p.injuryHistory || []).length * 1.2 + (p.profile && p.profile.k === "fragile" ? 4 : 0);
    const med = rh && rh.loanMed != null ? rh.loanMed : medical(club);
    r -= (med - 1) * 1.6;
    r *= PROG[(rh && rh.program) || "standard"].r;
    return Math.round(cl(r, 1, 45));
  }
  function open(p, club) {
    p.rehab = { sig: (p.injury && p.injury.type) + "|" + (p.injury && p.injury.date), program: null, auto: day() + 6, base: p.injury.days, loan: null, relapses: (p.rehab && p.rehab.relapses) || 0, loanMed: null };
    const R0 = R(); if (!R0.ids.includes(p.id)) R0.ids.push(p.id);
    const msg = `🩺 ${p.firstName} ${p.lastName} : ${p.injury.type.toLowerCase()}, absent environ ${Math.round(remaining(p) / 7)} semaines. Choisissez son programme de rééducation (onglet Staff).`;
    note(msg); mail("match", "Staff médical", `Blessure longue : ${p.lastName}`, `<p>${esc(msg)}</p><p class="hint">Risque de rechute estimé : ${riskOf(club, p)} % (programme standard).</p>`);
  }
  function setProgram(pid, key) {
    const f = findPlayer(pid); if (!f) return { ok: false, msg: "Joueur introuvable." };
    const p = f.p, rh = p.rehab; if (!rh) return { ok: false, msg: "Pas de dossier de rééducation." };
    if (rh.program) return { ok: false, msg: "Le programme est déjà fixé." };
    const pr = PROG[key]; if (!pr) return { ok: false };
    rh.program = key;
    const rem = remaining(p), ns = Math.max(1, Math.round(rem * pr.f));
    p.injuredUntil = dk(new Date(tk()).getTime() + ns * 864e5);
    const t = `Rééducation ${pr.label.toLowerCase()} pour ${p.lastName} : retour prévu dans ${ns} jours (risque de rechute ${riskOf(f.club, p)} %).`;
    note(t); return { ok: true, msg: t };
  }
  // ---------- prêt de convalescence ----------
  function loanOptions(club, p) {
    const aff = ((club.scouting && club.scouting.affiliates) || []).map((a) => getClub(a.clubId)).filter(Boolean);
    const others = allClubs().filter((c) => !isUserClub(c.id) && c.countryKey === club.countryKey && c.reputation <= club.reputation - 3 && c.players.length < 31);
    others.sort((a, b) => b.reputation - a.reputation);
    return [...aff.filter((c) => c.id !== club.id), ...others.filter((c) => !aff.includes(c))].slice(0, 4);
  }
  function loanOut(pid, toId) {
    const f = findPlayer(pid); if (!f || f.away) return { ok: false, msg: "Joueur introuvable." };
    const p = f.p, club = f.club, to = getClub(toId); if (!to) return { ok: false, msg: "Club introuvable." };
    if (!p.rehab) return { ok: false, msg: "Pas de dossier de rééducation." };
    if (remaining(p) < 14) return { ok: false, msg: "Trop proche du retour : un prêt n'aurait plus de sens." };
    const aff = ((club.scouting && club.scouting.affiliates) || []).some((a) => a.clubId === to.id);
    if (!aff && Math.random() > 0.7) return { ok: false, msg: `${to.name} refuse d'accueillir un joueur blessé.` };
    const weeks = Math.max(6, Math.ceil(remaining(p) / 7) + 4);
    try { loanPlayerOut(p, to.id, weeks, null); } catch (e) { return { ok: false, msg: "Prêt impossible." }; }
    p.rehab.loan = to.id; p.rehab.loanMed = medical(to); R().loaned[p.id] = to.id;
    const t = `${p.firstName} ${p.lastName} part se refaire une santé à ${to.name} (${weeks} semaines) : il y retrouvera du rythme dès son retour.`;
    note(t); return { ok: true, msg: t };
  }
  // ---------- boucle quotidienne ----------
  function daily() {
    const R0 = R();
    // 1) détection des nouvelles blessures graves
    userIds().forEach((id) => {
      const c = getClub(id); if (!c) return;
      c.players.forEach((p) => {
        if (!p.injuredUntil || p.injuredUntil < tk() || !p.injury) return;
        const sig = p.injury.type + "|" + p.injury.date;
        if ((!p.rehab || p.rehab.sig !== sig) && p.injury.days >= LONG && remaining(p) >= 14) open(p, c);
      });
    });
    // 2) programme par défaut, retour de blessure
    R0.ids = R0.ids.filter((pid) => {
      const f = findPlayer(pid); if (!f || !f.p.rehab) return false;
      const p = f.p, rh = p.rehab, club = f.club;
      if (!rh.program && day() >= rh.auto) { rh.program = "standard"; }
      if (p.injuredUntil && p.injuredUntil >= tk()) return true;
      // le joueur est rétabli
      const risk = riskOf(f.club, p), home = rh.loan != null ? getClub(userIds()[0]) : club;
      if (Math.random() * 100 < risk) {
        const days = ri(14, 35); p.injuredUntil = dk(new Date(tk()).getTime() + days * 864e5);
        p.injury = { type: "Rechute — " + (p.injury.type || "blessure"), days, date: tk() };
        p.injuryHistory = p.injuryHistory || []; p.injuryHistory.unshift({ type: p.injury.type, days, year: state.season.year });
        const n = (rh.relapses || 0) + 1;
        p.rehab = { sig: p.injury.type + "|" + p.injury.date, program: "prudent", auto: day(), base: days, loan: rh.loan, loanMed: rh.loanMed, relapses: n };
        const t = `⚠️ Rechute pour ${p.firstName} ${p.lastName}${rh.loan != null ? " (chez " + (getClub(rh.loan) || {}).name + ")" : ""} : encore ${days} jours d'absence.`;
        note(t); mail("match", "Staff médical", `Rechute : ${p.lastName}`, `<p>${esc(t)}</p><p class="hint">Programme prudent appliqué d'office.</p>`);
        return true;
      }
      const away = rh.loan != null;
      p.fatigue = away ? 0 : cl((p.fatigue || 0) + 25, 0, 100);
      if (away) p.form = cl((p.form || 0) + 3, -10, 10);
      const t = `✅ ${p.firstName} ${p.lastName} est rétabli${away ? " et a retrouvé du rythme" : " : reprise progressive"}.`;
      note(t); mail("match", "Staff médical", `Retour de blessure : ${p.lastName}`, `<p>${esc(t)}</p>`);
      R0.done.unshift({ name: p.firstName + " " + p.lastName, type: (p.injury && p.injury.type) || "", year: state.season.year, relapses: rh.relapses || 0, loan: away });
      R0.done.length = Math.min(R0.done.length, 10);
      delete R0.loaned[pid]; p.rehab = null; return false;
    });
  }
  // ---------- interface (onglet Staff) ----------
  function panel() {
    const club = userClub(); if (!club) return "";
    const R0 = R();
    const rows = R0.ids.map((pid) => findPlayer(pid)).filter((x) => x && x.p.rehab);
    const card = (f) => {
      const p = f.p, rh = p.rehab, rem = remaining(p), tot = Math.max(rem, rh.base || rem), pct = Math.round((1 - rem / tot) * 100);
      const pg = rh.program ? PROG[rh.program] : null;
      const opts = !f.away && rh.loan == null && rem >= 14 ? loanOptions(club, p) : [];
      return `<div class="rh-row"><div><b>${esc(p.firstName + " " + p.lastName)}</b> <span class="hint">${esc((p.injury && p.injury.type) || "")} · ${rem} jours restants${f.away ? " · en prêt chez " + esc(f.club.name) : ""}${rh.relapses ? " · " + rh.relapses + " rechute(s)" : ""}</span>
        <div class="rh-bar"><i style="width:${cl(pct, 3, 100)}%"></i></div>
        <p class="hint" style="margin:2px 0">Risque de rechute : <b>${riskOf(f.club, p)} %</b>${pg ? " · programme " + pg.label.toLowerCase() : ""}</p>
        ${!rh.program ? `<div class="rh-prog">${Object.entries(PROG).map(([k, v]) => `<button class="btn btn-small ${k === "standard" ? "btn-primary" : "btn-ghost"}" data-rh="prog" data-id="${p.id}" data-k="${k}" title="${esc(v.hint)}">${v.label}</button>`).join(" ")}<span class="hint"> (choix définitif)</span></div>` : ""}
        ${opts.length ? `<div class="rh-loan"><span class="hint">Prêt de convalescence :</span> ${opts.map((c) => `<button class="btn btn-small btn-ghost" data-rh="loan" data-id="${p.id}" data-to="${c.id}">${esc(c.name)} (méd. ${medical(c)}★)</button>`).join(" ")}</div>` : ""}
      </div></div>`;
    };
    return `<div class="dossier rh-card" id="rh-panel"><h3 class="panel-subtitle">🩺 Rééducation et blessures longues</h3>
      <p class="hint">Votre centre médical : niveau ${medical(club)}. Les blessures de ${LONG} jours ou plus ouvrent un dossier : choisissez un programme, et décidez de garder le joueur ou de le prêter pour retrouver du rythme (le club d'accueil a son propre niveau médical).</p>
      ${rows.length ? rows.map(card).join("") : `<p class="hint">Aucun joueur en rééducation longue durée.</p>`}
      ${R0.done.length ? `<p class="hint">Derniers retours : ${R0.done.slice(0, 3).map((d) => esc(d.name) + (d.relapses ? " (" + d.relapses + " rechute)" : "")).join(", ")}</p>` : ""}
      <p class="hint" id="rh-msg"></p></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("button[data-rh]"); if (!b || !hasState()) return;
    const id = parseInt(b.dataset.id, 10);
    const r = b.dataset.rh === "prog" ? setProgram(id, b.dataset.k) : loanOut(id, parseInt(b.dataset.to, 10));
    toast(r.msg); try { saveGame(); render(); } catch (x) {}
  });
  const oAdv = window.advanceDay;
  if (typeof oAdv === "function") window.advanceDay = function () {
    const r = oAdv.apply(this, arguments);
    try { if (hasState()) daily(); } catch (e) { console.warn("rehab", e); }
    return r;
  };
  const oS = window.renderStaffTab;
  if (typeof oS === "function") window.renderStaffTab = function () { const b = oS.apply(this, arguments); try { return b + panel(); } catch (e) { return b; } };
  window.dsRehab = { R, daily, open, setProgram, loanOut, loanOptions, riskOf, panel, PROG, remaining };
})();
