// =====================================================================
// CENTRE DE FORMATION ÉVOLUÉ
//  - détection par région (France + étranger) : investissement par zone, connaissance qui monte
//  - prospects de 14-17 ans repérés chaque semaine (à signer vite : les rivaux guettent)
//  - « wonderkids maison » : chance chaque saison, selon centre, régions et directeur de formation
//  - promotion des plus prometteurs en équipe première
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const day = () => state.dayCounter || 0;
  const DOM = [["capitale", "Région de la capitale", 1.0, 1.25], ["nord", "Nord", 0.95, 0.9], ["sud", "Sud", 1.05, 0.9], ["est", "Est", 0.95, 0.85], ["ouest", "Ouest", 1.0, 0.85]];
  const FOR = [["afrique", "Afrique de l'Ouest", 1.2, 1.1, "france", ["Sénégal", "Mali", "Côte d'Ivoire", "Cameroun", "Guinée"]], ["amsud", "Amérique du Sud", 1.15, 1.2, "bresil", null], ["esteu", "Europe de l'Est", 1.0, 0.9, "pologne", null]];
  const REGIONS = DOM.map(([k, l, t, c]) => ({ k, label: l, talent: t, cost: c, foreign: false })).concat(FOR.map(([k, l, t, c, ck, nats]) => ({ k, label: l, talent: t, cost: c, foreign: true, ck, nats })));
  const A = () => { const s = (state.academy = state.academy || { regions: {}, prospects: [], wk: 0, history: [] }); REGIONS.forEach((r) => { if (!s.regions[r.k]) s.regions[r.k] = { lvl: 0, know: r.foreign ? 5 : 25 }; }); return s; };
  const stars = (o) => { const n = Math.round(Math.max(0.5, Math.min(5, (o - 38) / 50 * 5)) * 2) / 2; return "★".repeat(Math.floor(n)) + (n % 1 ? "½" : ""); };

  function gen(reg, club, quality) {
    const ck = reg.foreign ? reg.ck : club.countryKey, pos = pick(["GB", "DEF", "DEF", "MIL", "MIL", "ATT", "ATT"]);
    const p = generatePlayer(ck, pos, 0.5);
    if (reg.nats) p.nationality = pick(reg.nats);
    p.age = rnd(14, 17);
    const A0 = A().regions[reg.k];
    const tc = club.trainingCenterLevel || 1;
    const pot = Math.max(55, Math.min(97, Math.round(58 + reg.talent * 6 + (Math.random() + Math.random() - 1) * 16 + quality * 4 + tc * 0.8 + (Math.random() < 0.04 ? 14 : 0))));
    p.overall = Math.max(28, Math.min(pot - 8, Math.round(pot - rnd(22, 34) + (p.age - 14) * 2)));
    p.potential = pot;
    p.value = computeValue(p);
    p.wage = Math.max(300, Math.round(p.value * 0.002 / 100) * 100);
    p.clubId = club.id; p.academyRegion = reg.k; p.contractEndYear = new Date(state.date).getFullYear() + 3;
    const jn = Math.round(10 - A0.know / 12);
    const price = Math.round((15000 + Math.max(0, pot - 62) * 4500) * reg.cost * (reg.foreign ? 1.6 : 1) / 1000) * 1000;
    return { id: "pr" + Math.floor(Math.random() * 1e9), p, region: reg.k, until: day() + 42, price, jn, seen: fmtDate(state.date) };
  }

  function weekly() {
    const club = userClub(); if (!club) return;
    const s = A();
    s.prospects = s.prospects.filter((x) => {
      if (x.until < day()) { mail("players", "Centre de formation", `Piste perdue : ${x.p.firstName} ${x.p.lastName}`, `<p>Un rival a signé <b>${esc(x.p.firstName)} ${esc(x.p.lastName)}</b> (${esc(regLabel(x.region))}) avant vous.</p>`); return false; }
      return true;
    });
    const sta = (typeof staffEffect === "function" ? staffEffect(club, "directeurFormation") : 0) || 0;
    let cost = 0;
    REGIONS.forEach((r) => {
      const st = s.regions[r.k]; if (!st.lvl) { st.know = Math.max(r.foreign ? 3 : 15, st.know - 0.4); return; }
      cost += st.lvl * (r.foreign ? 3500 : 2000);
      st.know = Math.min(100, st.know + st.lvl * 1.6 + sta * 1.5);
      const chance = 0.1 + st.lvl * 0.1 + st.know / 400;
      if (Math.random() < chance && s.prospects.length < 14) {
        const pr = gen(r, club, (st.lvl - 1) * 0.6 + st.know / 60);
        s.prospects.unshift(pr);
        if (pr.p.potential >= 82) mail("players", "Centre de formation", `Pépite repérée : ${pr.p.firstName} ${pr.p.lastName}`, `<p>Nos détecteurs (<b>${esc(r.label)}</b>) ont repéré <b>${esc(pr.p.firstName)} ${esc(pr.p.lastName)}</b>, ${pr.p.age} ans (${pr.p.position}). Potentiel estimé : ${stars(pr.p.potential - pr.jn)}–${stars(pr.p.potential + pr.jn)}. À signer rapidement (${fmtMoney(pr.price)}).</p>`);
      }
    });
    if (cost) club.budget -= cost;
  }
  const regLabel = (k) => (REGIONS.find((r) => r.k === k) || {}).label || k;

  function sign(id) {
    const club = userClub(), s = A(), i = s.prospects.findIndex((x) => x.id === id); if (i < 0) return "Piste introuvable.";
    const pr = s.prospects[i];
    if (club.budget < pr.price) return "Budget insuffisant.";
    club.budget -= pr.price;
    const st = fxEnsureSubTeams(club); st.u19.players.push(pr.p);
    s.prospects.splice(i, 1);
    note(`Centre de formation : ${pr.p.firstName} ${pr.p.lastName} (${pr.p.age} ans, ${regLabel(pr.region)}) rejoint les U19 (${fmtMoney(pr.price)}).`);
    return `${pr.p.firstName} ${pr.p.lastName} signe chez les U19.`;
  }
  function wonder() {
    const club = userClub(); if (!club) return;
    const s = A(), tc = club.trainingCenterLevel || 1;
    const inv = REGIONS.reduce((n, r) => n + s.regions[r.k].lvl, 0);
    const sta = (typeof staffEffect === "function" ? staffEffect(club, "directeurFormation") : 0) || 0;
    const chance = Math.min(0.4, 0.05 + 0.03 * (tc - 1) + 0.012 * inv + sta * 0.06);
    if (Math.random() > chance) return;
    const p = generatePlayer(club.countryKey, pick(["ATT", "MIL", "MIL", "DEF"]), 0.6);
    p.age = 16 + rnd(0, 1); p.potential = rnd(88, 96); p.overall = rnd(52, 64); p.wonderkid = true; p.homegrown = true;
    p.clubId = club.id; p.value = computeValue(p); p.wage = Math.max(500, Math.round(p.value * 0.002 / 100) * 100); p.contractEndYear = new Date(state.date).getFullYear() + 3;
    p.seasonStats = { matches: 0, goals: 0, assists: 0 };
    fxEnsureSubTeams(club).u19.players.push(p);
    note(`🌟 Wonderkid maison : ${p.firstName} ${p.lastName} (${p.age} ans, ${p.position}) sort du centre de formation !`);
    mail("players", "Centre de formation", `🌟 Un joueur exceptionnel sort du centre : ${p.firstName} ${p.lastName}`, `<p>Le centre de formation de <b>${esc(club.name)}</b> a formé <b>${esc(p.firstName)} ${esc(p.lastName)}</b> (${p.age} ans, ${p.position}), considéré comme un futur crack (potentiel estimé ${stars(p.potential - 3)}–${stars(p.potential + 2)}). Soignez son développement : plan individuel, mentorat, prêt bien choisi.</p>`);
    s.history.unshift({ year: state.season.year, name: `${p.firstName} ${p.lastName}`, pot: p.potential }); if (s.history.length > 12) s.history.length = 12;
  }

  function panel() {
    const club = userClub(), s = A();
    const st = fxEnsureSubTeams(club);
    const top = st.u19.players.concat(st.res.players).filter((p) => p.age <= 19).sort((a, b) => (b.potential + b.overall * 0.3 + (b.wonderkid ? 100 : 0)) - (a.potential + a.overall * 0.3 + (a.wonderkid ? 100 : 0))).slice(0, 8);
    const regRows = REGIONS.map((r) => { const g = s.regions[r.k]; return `<tr><td>${esc(r.label)}${r.foreign ? " 🌍" : ""}</td><td>${stars(52 + r.talent * 10)}</td><td>${Math.round(g.know)}%</td><td><select data-ac-lvl="${r.k}">${[0, 1, 2, 3].map((l) => `<option value="${l}" ${g.lvl === l ? "selected" : ""}>${["Aucun", "Léger", "Soutenu", "Intensif"][l]}</option>`).join("")}</select></td><td>${g.lvl ? fmtMoney(g.lvl * (r.foreign ? 3500 : 2000)) + "/sem." : "—"}</td></tr>`; }).join("");
    const prosp = s.prospects.map((x) => `<tr><td>${window.dsFace ? `<span class="ds-face-row">${dsFace(x.p, "ds-face-sm")}</span>` : ""}<b>${esc(x.p.firstName)} ${esc(x.p.lastName)}</b></td><td>${x.p.age}</td><td>${x.p.position}</td><td>${esc(x.p.nationality)}</td><td>${esc(regLabel(x.region))}</td><td>${stars(x.p.overall)} <span class="hint">actuel</span></td><td>${stars(x.p.potential - x.jn)}–${stars(x.p.potential + x.jn)}</td><td>${Math.max(0, Math.ceil((x.until - day()) / 7))} sem.</td><td><button class="btn btn-small btn-primary" data-ac="sign:${x.id}">Signer (${fmtMoney(x.price)})</button> <button class="btn btn-small btn-ghost" data-ac="skip:${x.id}">Passer</button></td></tr>`).join("");
    const promo = top.map((p) => `<tr><td>${window.dsFace ? `<span class="ds-face-row">${dsFace(p, "ds-face-sm")}</span>` : ""}${p.wonderkid ? "🌟 " : ""}<b>${esc(p.firstName)} ${esc(p.lastName)}</b></td><td>${p.age}</td><td>${p.position}</td><td>${p.overall} / ${p.potential}</td><td>${p.overall >= (club.players.filter((x) => x.position === p.position).map((x) => x.overall).sort((a, b) => b - a)[2] || 60) - 4 ? "Prêt pour l'équipe 1" : p.overall >= 55 ? "À surveiller" : "En apprentissage"}</td><td><button class="btn btn-small btn-ghost" data-ac="promote:${p.id}">Promouvoir en équipe première</button></td></tr>`).join("");
    return `<div class="fm-dark fm-panel ac-panel">
      <h2 class="fm-title">Centre de formation <span>niveau ${club.trainingCenterLevel || 1} · détection par région</span></h2>
      <p class="hint">Investissez dans une région pour y repérer des jeunes. Plus la connaissance est élevée, plus les estimations de potentiel sont précises. Chaque saison, une chance de « wonderkid maison » (centre, régions suivies, directeur de formation).</p>
      <div class="table-scroll"><table class="fx-mini"><thead><tr><th>Région</th><th>Vivier</th><th>Connaissance</th><th>Investissement</th><th>Coût</th></tr></thead><tbody>${regRows}</tbody></table></div>
      <h3 class="panel-subtitle">Prospects repérés (${s.prospects.length})</h3>
      ${s.prospects.length ? `<div class="table-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Âge</th><th>Poste</th><th>Nation</th><th>Région</th><th>Niveau</th><th>Potentiel estimé</th><th>Délai</th><th></th></tr></thead><tbody>${prosp}</tbody></table></div>` : `<p class="hint">Aucun prospect pour l'instant : investissez dans au moins une région et laissez passer quelques semaines.</p>`}
      <h3 class="panel-subtitle">Les plus prometteurs du club</h3>
      <div class="table-scroll"><table class="fx-mini"><thead><tr><th>Joueur</th><th>Âge</th><th>Poste</th><th>Niv. / Pot.</th><th>Avis</th><th></th></tr></thead><tbody>${promo || "<tr><td colspan='6'>Aucun jeune.</td></tr>"}</tbody></table></div>
      ${s.history.length ? `<p class="hint">Wonderkids maison : ${s.history.map((h) => `${esc(h.name)} (saison ${h.year})`).join(" · ")}</p>` : ""}
    </div>`;
  }
  const origSub = window.renderSubTeamTab;
  window.renderSubTeamTab = function (kind) {
    const base = origSub.apply(this, arguments);
    try { return kind === "u19" ? panel() + base : base; } catch (e) { console.error(e); return base; }
  };

  document.addEventListener("change", (e) => {
    const t = e.target; if (!t || !t.dataset || t.dataset.acLvl === undefined || !state || !state.ds) return;
    A().regions[t.dataset.acLvl].lvl = parseInt(t.value, 10) || 0; try { saveGame(); } catch (x) {} render();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-ac]"); if (!b || !state || !state.ds) return;
    const [cmd, id] = b.dataset.ac.split(":");
    let msg = null;
    if (cmd === "sign") msg = sign(id);
    else if (cmd === "skip") { const s = A(); s.prospects = s.prospects.filter((x) => x.id !== id); }
    else if (cmd === "promote") { const pid = parseInt(id, 10), st = fxEnsureSubTeams(userClub()); const k = st.u19.players.some((p) => p.id === pid) ? "u19" : "res"; fxPromote(k, pid, "first"); msg = "Promu en équipe première."; }
    try { saveGame(); } catch (x) {}
    if (msg && window.dsToast) window.dsToast(msg);
    render();
  });

  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (state.ds && userClub() && day() % 7 === 4) weekly(); } catch (e) { console.error("académie", e); }
    return r;
  };
  const origRoll = window.seasonRollover;
  window.seasonRollover = function () {
    const r = origRoll.apply(this, arguments);
    try { wonder(); } catch (e) { console.error("wonderkid", e); }
    return r;
  };
  window.dsAcademy = { A, gen, weekly, sign, wonder, REGIONS, panel };
})();
