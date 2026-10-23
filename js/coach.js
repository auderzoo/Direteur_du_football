// ===================================================================
// BLOC 20 (1/3) — L'ENTRAÎNEUR : choix, limogeage, style de jeu
//  - chaque club du joueur a un entraîneur (style, formation préférée, qualités, contrat, confiance)
//  - marché des entraîneurs : on négocie salaire et durée ; on peut limoger (indemnité)
//  - son style influence : la composition (joueurs adaptés préférés, rotation, jeunes),
//    la formation (option « laisser l'entraîneur choisir »), la force de l'équipe
//    (adéquation effectif/style) et le PROFIL DE RECRUTEMENT demandé au DS
//  - confiance : résultats, soutien du DS, renforts conformes à son style
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const ready = () => typeof state !== "undefined" && state && state.ds && state.countries;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const day = () => (state.dayCounter || 0);
  const year = () => new Date(state.date).getUTCFullYear();
  const money = (v) => (typeof fmtMoney === "function" ? fmtMoney(v) : Math.round(v) + " €");
  const mail = (sub, html) => { try { window.dsMail && window.dsMail("club", "Entraîneur", sub, html); } catch (e) {} };

  // ---------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------
  const STYLES = {
    possession: { label: "Possession", desc: "Circulation de balle, patience, relance courte.", attrs: ["passe", "technique", "vision", "decision"], gk: ["relance", "reflexes"], form: ["4-3-3", "4-4-2"], play: "possession" },
    contre: { label: "Contre-attaque", desc: "Bloc bas, transitions rapides, vitesse devant.", attrs: ["vitesse", "acceleration", "dribble", "sangFroid"], gk: ["reflexes", "placement"], form: ["5-3-2", "4-4-2"], play: "contre" },
    direct: { label: "Jeu direct", desc: "Longs ballons, duels, jeu de tête, physique.", attrs: ["puissance", "jeuDeTete", "physique", "tir"], gk: ["reflexes", "puissance"], form: ["4-4-2", "3-5-2"], play: "direct" },
    pressing: { label: "Pressing haut", desc: "Intensité, récupération haute, endurance.", attrs: ["endurance", "agressivite", "vitesse", "tacle"], gk: ["reflexes", "relance"], form: ["4-3-3", "3-5-2"], play: "equilibre" },
    equilibre: { label: "Équilibré", desc: "S'adapte à l'adversaire, aucun point faible marqué.", attrs: ["decision", "concentration", "passe", "tacle"], gk: ["reflexes", "placement"], form: ["4-4-2", "4-3-3"], play: "equilibre" }
  };
  const ATTR_FR = { vitesse: "vitesse", acceleration: "accélération", tir: "tir", passe: "passe", dribble: "dribble", tacle: "tacle", placement: "placement", physique: "physique", endurance: "endurance", puissance: "puissance", jeuDeTete: "jeu de tête", technique: "technique", vision: "vision", decision: "décision", concentration: "concentration", leadership: "leadership", agressivite: "agressivité", sangFroid: "sang-froid", reflexes: "réflexes", relance: "relance" };
  const POS_LABEL = { GB: "gardien", DEF: "défenseur", MIL: "milieu", ATT: "attaquant" };

  // ---------------------------------------------------------------
  // État
  // ---------------------------------------------------------------
  function C() {
    if (!state.coach) state.coach = { byClub: {}, market: [], seq: 1, auto: false, lastMarket: 0 };
    const c = state.coach; if (!c.byClub) c.byClub = {}; if (!c.market) c.market = []; return c;
  }
  const userIds = () => (state.userClubIds && state.userClubIds.length ? state.userClubIds : (state.userClubId != null ? [state.userClubId] : []));
  function makeCoach(countryKey, quality, opts) {
    opts = opts || {};
    const country = COUNTRIES[countryKey] || COUNTRIES[Object.keys(COUNTRIES)[0]];
    const pool = NAME_POOLS[country.pool];
    const q = cl(quality, 0.05, 1);
    const style = opts.style || ["possession", "contre", "direct", "pressing", "equilibre"][ri(0, 4)];
    const a = () => cl(Math.round(4.5 + q * 11 + (Math.random() - 0.5) * 5), 1, 20);
    const attrs = { tactique: a(), motivation: a(), jeunes: a(), discipline: a(), rotation: a() };
    const age = ri(36, 65), rep = cl(Math.round(20 + q * 70 + ri(-6, 6)), 5, 99);
    const ab = (attrs.tactique * 2 + attrs.motivation + attrs.jeunes + attrs.discipline) / 5;
    const f = STYLES[style].form;
    return {
      id: C().seq++, firstName: pick(pool.first), lastName: pick(pool.last), nationality: country.label, age, style, formation: f[ri(0, f.length - 1)],
      attrs, rep, ab: Math.round(ab * 10) / 10, wage: Math.max(3000, Math.round((rep * rep * 2.2 + ab * 1500) / 500) * 500),
      years: ri(1, 3), until: year() + ri(1, 3), conf: 60, hist: [], since: null
    };
  }
  function ensureCoach(club) {
    const S = C();
    if (!club) return null;
    if (!S.byClub[club.id]) {
      const c = makeCoach(club.countryKey, (club.tierFactor || 0.4) + (Math.random() - 0.5) * 0.2);
      c.since = fmtDate(state.date); c.conf = 62; S.byClub[club.id] = c;
      applyStyle(club, c, true);
    }
    return S.byClub[club.id];
  }
  const coachOf = (club) => (ready() && club && isUserClub(club.id)) ? ensureCoach(club) : null;
  function applyStyle(club, c, silent) {
    club.playstyle = STYLES[c.style].play;
  }
  function fillMarket() {
    const S = C();
    S.market = S.market.filter((c) => !c.hired);
    const keys = Object.keys(state.countries);
    while (S.market.length < 8 + keys.length * 2) {
      const ck = keys[ri(0, keys.length - 1)];
      const c = makeCoach(ck, 0.1 + Math.random() * 0.88);
      c.until = null; c.free = true;
      S.market.push(c);
    }
    S.lastMarket = day();
  }

  // ---------------------------------------------------------------
  // Adéquation joueur / style
  // ---------------------------------------------------------------
  function fitOf(p, c) {
    const st = STYLES[c.style];
    const keys = p.position === "GB" ? st.gk : st.attrs;
    const a = p.attributes || {};
    const vals = keys.map((k) => (a[k] != null ? a[k] : Math.round(p.overall / 5)));
    return cl(vals.reduce((s, v) => s + v, 0) / vals.length / 20, 0, 1);
  }
  function squadFit(club, c) {
    const q = (typeof FORMATION_QUOTAS !== "undefined" && FORMATION_QUOTAS[(window.getTactics ? getTactics(club).formation : "4-4-2")]) || { DEF: 4, MIL: 4, ATT: 2 };
    const out = {};
    const base = { GB: 1, DEF: q.DEF, MIL: q.MIL, ATT: q.ATT };
    Object.keys(base).forEach((pos) => {
      const top = club.players.filter((p) => p.position === pos && !p.onLoan).sort((a, b) => b.overall - a.overall).slice(0, base[pos]);
      out[pos] = top.length ? top.reduce((s, p) => s + fitOf(p, c), 0) / top.length : 0.5;
    });
    const all = Object.values(out);
    out.avg = all.reduce((s, v) => s + v, 0) / all.length;
    return out;
  }
  // bonus de force (±) appliqué aux notes d'attaque et de défense
  function strengthBonus(club, c) {
    const sf = squadFit(club, c).avg;
    const b = (c.attrs.tactique - 10) * 0.12 + (sf - 0.55) * 7 + (c.attrs.motivation - 10) * 0.05 + (c.conf - 50) * 0.01;
    return cl(b, -3, 3.5);
  }

  // ---------------------------------------------------------------
  // Hooks moteur
  // ---------------------------------------------------------------
  const origLineup = window.buildLineup;
  if (typeof origLineup === "function") window.buildLineup = function (club, dateKey) {
    const c = coachOf(club);
    if (!c) return origLineup.apply(this, arguments);
    const t = getTactics(club);
    const q = FORMATION_QUOTAS[t.formation] || FORMATION_QUOTAS["4-4-2"];
    const score = (p) => {
      let s = p.overall + (fitOf(p, c) - 0.55) * 9;
      if (p.age <= 21) s += (c.attrs.jeunes - 10) * 0.3;
      const f = p.fatigue || 0;
      if (f > 60) s -= (f - 60) * (c.attrs.rotation / 10) * 0.35;
      return s;
    };
    const avail = (code) => club.players.filter((p) => p.position === code && isAvailable(p, dateKey)).sort((a, b) => score(b) - score(a));
    return [].concat(avail("GB").slice(0, 1), avail("DEF").slice(0, q.DEF), avail("MIL").slice(0, q.MIL), avail("ATT").slice(0, q.ATT));
  };
  const origTactics = window.getTactics;
  if (typeof origTactics === "function") window.getTactics = function (club) {
    const t = origTactics.apply(this, arguments);
    try {
      if (ready() && C().auto && club && isUserClub(club.id)) { const c = ensureCoach(club); return { formation: c.formation, mentality: t.mentality }; }
    } catch (e) {}
    return t;
  };
  const origRatings = window.computeMatchRatings;
  if (typeof origRatings === "function") window.computeMatchRatings = function (club) {
    const r = origRatings.apply(this, arguments);
    try {
      const c = coachOf(club);
      if (c) { const b = strengthBonus(club, c); r.attackRating += b; r.defenseRating += b; }
    } catch (e) {}
    return r;
  };
  const origFin = window.runMonthlyFinanceTick;
  if (typeof origFin === "function") window.runMonthlyFinanceTick = function () {
    const r = origFin.apply(this, arguments);
    try { userIds().forEach((id) => { const cb = getClub(id), c = cb && C().byClub[id]; if (c && !c.interim) cb.budget -= c.wage; }); } catch (e) {}
    return r;
  };

  // ---------------------------------------------------------------
  // Confiance, démission, demandes
  // ---------------------------------------------------------------
  function weekly() {
    const S = C();
    userIds().forEach((id) => {
      const club = getClub(id); if (!club) return;
      const c = ensureCoach(club);
      const snap = c.snap || { w: club.won, d: club.draw, l: club.lost };
      const dw = club.won - snap.w, dd = club.draw - snap.d, dl = club.lost - snap.l;
      c.snap = { w: club.won, d: club.draw, l: club.lost };
      c.conf = cl(c.conf + dw * 4 + dd * 0.5 - dl * 5 + (c.attrs.motivation - 10) * 0.05 + 0.2, 0, 100);
      c.rec = c.rec || { w: 0, d: 0, l: 0 }; c.rec.w += dw; c.rec.d += dd; c.rec.l += dl;
      // joueurs : la motivation de l'entraîneur soutient le moral
      if (c.attrs.motivation >= 13) club.players.forEach((p) => { if (p.morale < 75) p.morale = Math.min(100, p.morale + 0.5); });
      // démission
      if (!c.interim && c.conf < 12) {
        c.low = (c.low || 0) + 1;
        if (c.low >= 3) { resign(club, c); return; }
      } else c.low = 0;
      // contrat expirant
      if (!c.interim && c.until && year() >= c.until && !c.warnedExp && state.date.getUTCMonth() >= 4) {
        c.warnedExp = true; mail("Contrat de l'entraîneur", `<p><b>${esc(c.firstName + " " + c.lastName)}</b> arrive en fin de contrat. Prolongez-le dans l'onglet Staff ou préparez son remplaçant.</p>`);
      }
      // demande de renfort
      if (day() - (c.lastReq || -999) > 60 && !c.interim) {
        const sf = squadFit(club, c);
        const worst = ["DEF", "MIL", "ATT", "GB"].sort((a, b) => sf[a] - sf[b])[0];
        if (sf[worst] < 0.5) {
          c.lastReq = day();
          const keys = (worst === "GB" ? STYLES[c.style].gk : STYLES[c.style].attrs).map((k) => ATTR_FR[k]).join(", ");
          mail("Demande de recrutement", `<p>« Pour jouer <b>${esc(STYLES[c.style].label.toLowerCase())}</b>, j'ai besoin d'un <b>${POS_LABEL[worst]}</b> au profil adapté (${esc(keys)}). Mon effectif actuel ne s'y prête pas. »</p><p class="hint">Consultez l'onglet Scouting ▸ « Profil de l'entraîneur » pour des pistes.</p>`);
        }
      }
    });
    if (day() - S.lastMarket > 45) fillMarket();
  }
  function resign(club, c) {
    mail("Démission de l'entraîneur", `<p><b>${esc(c.firstName + " " + c.lastName)}</b> a quitté ${esc(club.name)} : « Je n'ai plus la confiance nécessaire pour continuer. » Un intérimaire assure la suite ; engagez un nouvel entraîneur dans l'onglet Staff.</p>`);
    try { state.news.unshift({ date: fmtDate(state.date), text: `${club.name} : l'entraîneur ${c.lastName} démissionne.` }); } catch (e) {}
    C().byClub[club.id] = interim(club, c);
  }
  function interim(club, prev) {
    const c = makeCoach(club.countryKey, 0.3, { style: "equilibre" });
    c.interim = true; c.wage = 0; c.conf = 50; c.firstName = "Intérim"; c.lastName = "(adjoint)"; c.until = null; c.since = fmtDate(state.date);
    c.attrs = { tactique: 8, motivation: 8, jeunes: 8, discipline: 8, rotation: 8 };
    applyStyle(club, c); return c;
  }

  // ---------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------
  function hire(clubId, coachId, years, wage) {
    const club = getClub(clubId), S = C();
    const cand = S.market.find((x) => x.id === coachId);
    if (!club || !cand) return { ok: false, reason: "Candidat introuvable." };
    years = cl(parseInt(years, 10) || 2, 1, 4);
    const ask = cand.wage;
    wage = Math.round(parseFloat(wage) || ask);
    const prestige = cand.rep - (club.reputation || 40);
    // plus il est réputé par rapport au club, plus il exige
    const need = Math.round(ask * (prestige > 15 ? 1.1 : prestige < -15 ? 0.85 : 1));
    if (wage < need * 0.9) return { ok: false, reason: `${cand.lastName} refuse : il attend environ ${money(need)} par mois.` };
    if (prestige > 25 && club.division > 1 && Math.random() < 0.4) return { ok: false, reason: `${cand.lastName} ne souhaite pas rejoindre un club de ce niveau pour l'instant.` };
    const fee = wage * 2;
    if (club.budget < fee) return { ok: false, reason: `Trésorerie insuffisante : prime de signature ${money(fee)}.` };
    const old = S.byClub[club.id];
    if (old && !old.interim) { const comp = severance(old); if (comp > 0) club.budget -= comp; }
    club.budget -= fee;
    cand.hired = true; cand.wage = wage; cand.years = years; cand.until = year() + years; cand.since = fmtDate(state.date); cand.free = false; cand.conf = 65; cand.low = 0;
    cand.snap = { w: club.won, d: club.draw, l: club.lost }; cand.rec = { w: 0, d: 0, l: 0 };
    S.byClub[club.id] = cand; S.market = S.market.filter((x) => x !== cand);
    applyStyle(club, cand);
    if (C().auto) { /* la formation suivra via getTactics */ } else { try { setUserTactics && club.id === state.userClubId && setUserTactics(cand.formation, getTactics(club).mentality); } catch (e) {} }
    try { state.news.unshift({ date: fmtDate(state.date), text: `${club.name} nomme ${cand.firstName} ${cand.lastName} (${STYLES[cand.style].label}) comme entraîneur.` }); } catch (e) {}
    mail("Nouvel entraîneur", `<p><b>${esc(cand.firstName + " " + cand.lastName)}</b> prend les rênes de ${esc(club.name)} (contrat ${years} an${years > 1 ? "s" : ""}, ${money(wage)}/mois). Style : <b>${esc(STYLES[cand.style].label)}</b>, formation préférée ${esc(cand.formation)}.</p>`);
    fillMarket();
    return { ok: true };
  }
  function severance(c) {
    if (!c || c.interim) return 0;
    const monthsLeft = Math.max(2, ((c.until || year()) - year()) * 12 + (5 - state.date.getUTCMonth()));
    return Math.round(c.wage * Math.min(monthsLeft, 24) * 0.8);
  }
  function fire(clubId) {
    const club = getClub(clubId), c = C().byClub[clubId];
    if (!club || !c || c.interim) return { ok: false, reason: "Aucun entraîneur à limoger." };
    const comp = severance(c);
    club.budget -= comp;
    c.free = true; c.until = null; c.hired = false; c.conf = 50; c.snap = null; c.rec = null;
    C().market.push(c);
    C().byClub[clubId] = interim(club, c);
    // les joueurs fidèles à lui réagissent
    club.players.forEach((p) => { if ((p.loyalty || 50) > 75 && Math.random() < 0.25) p.morale = Math.max(20, p.morale - 4); });
    try { state.news.unshift({ date: fmtDate(state.date), text: `${club.name} limoge son entraîneur ${c.lastName}.` }); } catch (e) {}
    mail("Entraîneur limogé", `<p>${esc(c.firstName + " " + c.lastName)} a été remercié (indemnité : <b>${money(comp)}</b>). Un adjoint assure l'intérim jusqu'à l'arrivée d'un nouvel entraîneur.</p>`);
    return { ok: true, comp };
  }
  function talk(clubId) {
    const club = getClub(clubId), c = C().byClub[clubId];
    if (!c || c.interim) return { ok: false, reason: "Pas d'entraîneur en poste." };
    if (day() - (c.lastTalk || -99) < 21) return { ok: false, reason: "Vous lui avez déjà parlé récemment." };
    c.lastTalk = day(); c.conf = cl(c.conf + 12, 0, 100); c.low = 0;
    return { ok: true };
  }
  function extend(clubId, years) {
    const club = getClub(clubId), c = C().byClub[clubId];
    if (!c || c.interim) return { ok: false, reason: "Pas d'entraîneur en poste." };
    const raise = Math.round(c.wage * (c.conf >= 60 ? 1.05 : 1.15) / 500) * 500;
    c.until = Math.max(c.until || year(), year()) + cl(years || 1, 1, 3); c.wage = raise; c.warnedExp = false; c.conf = cl(c.conf + 5, 0, 100);
    return { ok: true, wage: raise };
  }

  // ---------------------------------------------------------------
  // Interface : onglet Staff
  // ---------------------------------------------------------------
  const bar = (v, max) => `<div class="co-bar"><i style="width:${Math.round(v / (max || 20) * 100)}%"></i></div>`;
  function stylePick(sel) { return Object.keys(STYLES).map((k) => `<option value="${k}" ${sel === k ? "selected" : ""}>${STYLES[k].label}</option>`).join(""); }
  function coachCard(club, c) {
    const sf = squadFit(club, c);
    const bonus = strengthBonus(club, c);
    return `<div class="co-card">
      <div class="co-top"><div><b class="co-name">${esc(c.firstName + " " + c.lastName)}</b>${c.interim ? ` <span class="hint">(intérim)</span>` : ""}<br><span class="hint">${esc(c.nationality)} · ${c.age} ans · réputation ${c.rep}</span></div>
        <div class="co-style"><b>${esc(STYLES[c.style].label)}</b><br><span class="hint">${esc(STYLES[c.style].desc)}</span></div></div>
      <div class="co-grid">
        ${["tactique", "motivation", "jeunes", "discipline", "rotation"].map((k) => `<div><span class="hint">${k === "jeunes" ? "Jeunes" : k[0].toUpperCase() + k.slice(1)}</span>${bar(c.attrs[k])}<small>${c.attrs[k]}/20</small></div>`).join("")}
      </div>
      <p class="hint" style="margin:6px 0">Formation préférée <b>${esc(c.formation)}</b> · ${c.interim ? "intérim" : `contrat jusqu'en ${c.until} · ${money(c.wage)}/mois`} · bilan ${c.rec ? c.rec.w + "V " + c.rec.d + "N " + c.rec.l + "D" : "—"}</p>
      <div class="co-conf"><span class="hint">Confiance</span>${bar(c.conf, 100)}<small>${Math.round(c.conf)}%</small></div>
      <p class="hint" style="margin:6px 0">Adéquation de l'effectif avec son style : <b>${Math.round(sf.avg * 100)}%</b> (GB ${Math.round(sf.GB * 100)} · DEF ${Math.round(sf.DEF * 100)} · MIL ${Math.round(sf.MIL * 100)} · ATT ${Math.round(sf.ATT * 100)}) → effet sur la force de l'équipe : <b class="${bonus >= 0 ? "result-good" : "result-bad"}">${bonus >= 0 ? "+" : ""}${bonus.toFixed(1)}</b></p>
      <div class="co-actions">
        ${c.interim ? "" : `<button class="btn btn-small" data-co="talk">💬 Lui parler / le soutenir</button><button class="btn btn-small" data-co="extend">✍️ Prolonger (+1 an)</button><button class="btn btn-small btn-ghost" data-co="fire">🚪 Limoger (${money(severance(c))})</button>`}
        <label class="co-auto"><input type="checkbox" data-co="auto" ${C().auto ? "checked" : ""}> Laisser l'entraîneur choisir la formation</label>
      </div></div>`;
  }
  function marketHTML(club) {
    const list = C().market.slice().sort((a, b) => b.rep - a.rep).slice(0, 12);
    return `<h4 class="co-h">Entraîneurs disponibles</h4>
      <div class="table-scroll"><table class="squad-table co-tbl"><thead><tr><th>Nom</th><th>Âge</th><th>Style</th><th>Tact.</th><th>Mot.</th><th>Jeunes</th><th>Rép.</th><th>Salaire / mois</th><th></th></tr></thead><tbody>
      ${list.map((c) => `<tr><td>${esc(c.firstName + " " + c.lastName)}<br><span class="hint">${esc(c.nationality)}</span></td><td>${c.age}</td><td>${esc(STYLES[c.style].label)}<br><span class="hint">${esc(c.formation)}</span></td><td>${c.attrs.tactique}</td><td>${c.attrs.motivation}</td><td>${c.attrs.jeunes}</td><td>${c.rep}</td><td>${money(c.wage)}</td><td><button class="btn btn-small" data-co="negotiate" data-id="${c.id}">Négocier</button></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function panelHTML() {
    const club = userClub(); if (!club) return "";
    const c = ensureCoach(club); if (!C().market.length) fillMarket();
    return `<section class="panel co-panel" id="co-panel"><h3 class="panel-subtitle">🧑‍🏫 Entraîneur principal</h3>
      <p class="hint">Son style décide des joueurs alignés, de la formation (si vous le laissez faire) et du type de profils à recruter. Un effectif adapté à son style rend l'équipe plus forte ; sa confiance dépend des résultats et de votre soutien.</p>
      ${coachCard(club, c)}
      <div id="co-neg"></div>
      ${marketHTML(club)}</section>`;
  }
  const origStaff = window.renderStaffTab;
  if (typeof origStaff === "function") window.renderStaffTab = function () {
    const html = origStaff.apply(this, arguments);
    try { return ready() && userClub() ? html + panelHTML() : html; } catch (e) { console.error(e); return html; }
  };

  // ---------------------------------------------------------------
  // Interface : profil de recrutement (onglet Scouting)
  // ---------------------------------------------------------------
  function targets(club, c, pos, n) {
    const out = [];
    const minOvr = Math.max(40, (club.players.filter((p) => p.position === pos).sort((a, b) => b.overall - a.overall)[2] || { overall: 50 }).overall - 2);
    allClubs().forEach((cl2) => {
      if (cl2.id === club.id) return;
      cl2.players.forEach((p) => {
        if (p.position !== pos || p.onLoan || p.overall < minOvr || p.age > 32) return;
        const f = fitOf(p, c);
        if (f < 0.6) return;
        out.push({ p, club: cl2, f, s: f * 100 + p.overall * 0.6 - (p.value || 0) / 4e6 });
      });
    });
    return out.sort((a, b) => b.s - a.s).slice(0, n);
  }
  function profileHTML() {
    const club = userClub(); if (!club) return "";
    const c = ensureCoach(club), st = STYLES[c.style], sf = squadFit(club, c);
    const need = ["GB", "DEF", "MIL", "ATT"].sort((a, b) => sf[a] - sf[b]);
    const pos = need[0];
    const rows = targets(club, c, pos, 6);
    return `<section class="panel co-panel"><h3 class="panel-subtitle">🧠 Profil de l'entraîneur (${esc(st.label)})</h3>
      <p class="hint" style="margin-top:0">${esc(c.lastName)} recherche des joueurs avec : <b>${st.attrs.map((k) => ATTR_FR[k]).join(" · ")}</b>${c.attrs.jeunes >= 14 ? " · aime lancer les jeunes" : ""}. Gardien : ${st.gk.map((k) => ATTR_FR[k]).join(", ")}.</p>
      <div class="co-need">${need.map((p) => `<span class="co-chip ${sf[p] < 0.5 ? "bad" : sf[p] < 0.6 ? "mid" : "ok"}">${POS_LABEL[p]} ${Math.round(sf[p] * 100)}%</span>`).join("")}</div>
      <h4 class="co-h">Priorité : ${POS_LABEL[pos]} au profil adapté</h4>
      ${rows.length ? `<table class="squad-table co-tbl"><thead><tr><th>Joueur</th><th>Club</th><th>Âge</th><th>Niv.</th><th>Adéquation</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.p.firstName[0] + ". " + r.p.lastName)}</td><td>${esc(r.club.name)}</td><td>${r.p.age}</td><td>${r.p.overall}</td><td><b>${Math.round(r.f * 100)}%</b></td><td><button class="btn btn-small" data-playercard="${r.p.id}">Fiche</button></td></tr>`).join("")}</tbody></table>` : `<p class="hint">Aucune cible évidente pour l'instant.</p>`}
    </section>`;
  }
  const origScout = window.renderScoutingTab;
  if (typeof origScout === "function") window.renderScoutingTab = function () {
    const html = origScout.apply(this, arguments);
    try { return ready() && userClub() ? html + profileHTML() : html; } catch (e) { console.error(e); return html; }
  };
  // fiche joueur : adéquation avec le style de l'entraîneur
  const origCard = window.openPlayerCard;
  if (typeof origCard === "function") window.openPlayerCard = function (id) {
    const r = origCard.apply(this, arguments);
    try {
      const p = getPlayer(id), club = userClub(); const m = document.getElementById("player-modal");
      if (p && club && m && m.firstElementChild) {
        const c = ensureCoach(club), f = Math.round(fitOf(p, c) * 100);
        const box = m.querySelector(".modal");
        if (box && !box.querySelector(".co-fit")) box.insertAdjacentHTML("beforeend", `<p class="co-fit hint">🧠 Adéquation avec le style de ${esc(c.lastName)} (${esc(STYLES[c.style].label)}) : <b class="${f >= 65 ? "result-good" : f < 50 ? "result-bad" : ""}">${f}%</b></p>`);
      }
    } catch (e) {}
    return r;
  };

  // ---------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------
  function root() { let r = document.getElementById("co-root"); if (!r) { r = document.createElement("div"); r.id = "co-root"; document.body.appendChild(r); } return r; }
  function negForm(id) {
    const cand = C().market.find((x) => x.id === id); if (!cand) return;
    const club = userClub();
    document.getElementById("co-neg").innerHTML = `<div class="co-negbox"><h4 class="co-h">Négocier avec ${esc(cand.firstName + " " + cand.lastName)}</h4>
      <p class="hint">${esc(STYLES[cand.style].label)} · ${esc(cand.formation)} · il demande environ ${money(cand.wage)}/mois. Prime de signature : 2 mois de salaire${C().byClub[club.id] && !C().byClub[club.id].interim ? ` + indemnité de limogeage de l'entraîneur actuel (${money(severance(C().byClub[club.id]))})` : ""}.</p>
      <label>Salaire mensuel <input type="number" id="co-wage" value="${cand.wage}" step="500" min="1000"></label>
      <label>Durée <select id="co-years"><option>1</option><option selected>2</option><option>3</option><option>4</option></select> an(s)</label>
      <button class="btn btn-primary" data-co="sign" data-id="${cand.id}">Proposer le contrat</button>
      <p class="hint" id="co-msg"></p></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-co]"); if (!b || !ready()) return;
    const a = b.dataset.co, club = userClub();
    if (a === "auto") return;
    const rerender = () => { try { saveGame(); } catch (x) {} render(); };
    if (a === "negotiate") negForm(parseInt(b.dataset.id, 10));
    else if (a === "sign") {
      const r = hire(club.id, parseInt(b.dataset.id, 10), document.getElementById("co-years").value, document.getElementById("co-wage").value);
      if (r.ok) { rerender(); if (window.dsToast) dsToast("Nouvel entraîneur engagé"); } else { const m = document.getElementById("co-msg"); if (m) m.textContent = "❌ " + r.reason; }
    } else if (a === "fire") { if (confirm("Limoger l'entraîneur ? Une indemnité sera versée.")) { const r = fire(club.id); if (r.ok) rerender(); } }
    else if (a === "talk") { const r = talk(club.id); if (window.dsToast) dsToast(r.ok ? "Confiance renforcée" : r.reason); rerender(); }
    else if (a === "extend") { const r = extend(club.id, 1); if (window.dsToast) dsToast(r.ok ? "Contrat prolongé" : r.reason); rerender(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target.closest && e.target.closest('[data-co="auto"]'); if (!t || !ready()) return;
    C().auto = !!t.checked; try { saveGame(); } catch (x) {}
  });

  // tick hebdomadaire + changement de saison
  const origAdv = window.advanceDay;
  if (typeof origAdv === "function") window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (ready() && state.dayCounter % 7 === 0) weekly(); } catch (e) { console.warn("entraîneur", e); }
    return r;
  };
  const origRoll = window.seasonRollover;
  if (typeof origRoll === "function") window.seasonRollover = function () {
    const r = origRoll.apply(this, arguments);
    try {
      userIds().forEach((id) => {
        const club = getClub(id), c = club && C().byClub[id]; if (!club || !c) return;
        c.snap = { w: 0, d: 0, l: 0 }; c.warnedExp = false; c.hist.push({ year: year(), rec: c.rec }); c.rec = { w: 0, d: 0, l: 0 };
        if (!c.interim && c.until && year() > c.until) { // contrat échu : il part libre
          mail("Fin de contrat", `<p>${esc(c.firstName)} ${esc(c.lastName)} quitte le club à l'expiration de son contrat. Un intérimaire est nommé.</p>`);
          c.free = true; c.until = null; C().market.push(c); C().byClub[id] = interim(club, c);
        }
      });
      fillMarket();
    } catch (e) { console.warn("coach/saison", e); }
    return r;
  };

  window.dsCoach = { STYLES, C, ensureCoach, makeCoach, fitOf, squadFit, strengthBonus, hire, fire, talk, extend, severance, fillMarket, weekly, resign, coachOf };
})();
