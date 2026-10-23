// =====================================================================
// RUMEURS & INDISCRÉTIONS
//  - la presse annonce des intérêts de clubs, des départs, des clauses, des joueurs sur le marché…
//  - chaque rumeur a une source plus ou moins fiable ; certaines sont fausses
//  - on peut vérifier une source (payant, pas infaillible), réagir (parfois pour rien : piège !)
//  - on peut aussi faire fuiter une fausse information pour faire monter la cote d'un joueur (bluff)
//  - les rumeurs arrivent dans le dossier « Rumeurs » de la boîte de réception
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const note = (text) => { try { state.log.unshift({ date: fmtDate(state.date), text }); } catch (e) {} };
  const day = () => state.dayCounter || 0;
  const SOURCES = [
    { k: "pro", label: "Journaliste réputé", rel: 0.82, stars: "★★★" },
    { k: "agent", label: "Entourage d'un agent", rel: 0.62, stars: "★★☆" },
    { k: "tab", label: "Tabloïd", rel: 0.42, stars: "★☆☆" },
    { k: "social", label: "Réseaux sociaux", rel: 0.3, stars: "☆☆☆" }
  ];
  const R = () => (state.rumors = state.rumors || { list: [], seq: 0, leakCd: 0 });
  const fmtM = (v) => fmtMoney(v);
  const pName = (p) => `${p.firstName} ${p.lastName}`;

  function pickSource() { const r = Math.random(); return r < 0.25 ? SOURCES[0] : r < 0.55 ? SOURCES[1] : r < 0.85 ? SOURCES[2] : SOURCES[3]; }

  // ---------- génération ----------
  function make() {
    const club = userClub(); if (!club) return;
    const k = rnd(1, 100), src = pickSource(), truth = Math.random() < src.rel;
    const others = allClubs().filter((c) => c.id !== club.id);
    if (!others.length) return;
    const rec = { id: ++R().seq, day: day(), date: fmtDate(state.date), src: src.k, truth, status: "open", resolveDay: day() + rnd(7, 21), verified: null, reacted: false };
    if (k <= 28) { // intérêt d'un club pour un de vos joueurs
      const p = club.players.filter((x) => !x.onLoan && x.overall >= 58).sort(() => Math.random() - 0.5)[0]; if (!p) return;
      const b = others.filter((c) => c.budget > p.value * 0.8).sort(() => Math.random() - 0.5)[0] || others[0];
      Object.assign(rec, { kind: "interest", playerId: p.id, clubId: b.id, own: true, amount: Math.round(p.value * (0.95 + Math.random() * 0.35) / 10000) * 10000 });
    } else if (k <= 45) { // un de vos joueurs voudrait partir
      const p = club.players.filter((x) => !x.onLoan).sort((a, b) => (a.happy || 60) - (b.happy || 60))[rnd(0, 3)]; if (!p) return;
      Object.assign(rec, { kind: "unrest", playerId: p.id, own: true });
    } else if (k <= 65) { // clause libératoire d'un joueur ailleurs
      const c = others[rnd(0, others.length - 1)], p = c.players.filter((x) => x.releaseClause)[0] || c.players[rnd(0, c.players.length - 1)]; if (!p) return;
      const real = p.releaseClause || null;
      rec.truth = !!real && rec.truth;
      const shown = rec.truth ? real : Math.round(p.value * (1.2 + Math.random() * 0.8) / 10000) * 10000;
      Object.assign(rec, { kind: "clause", playerId: p.id, clubId: c.id, amount: shown, real });
    } else if (k <= 82) { // un joueur serait sur le marché
      const c = others[rnd(0, others.length - 1)], p = c.players.filter((x) => !x.listed && x.overall >= 60).sort(() => Math.random() - 0.5)[0]; if (!p) return;
      Object.assign(rec, { kind: "forsale", playerId: p.id, clubId: c.id });
    } else { // un rival ciblerait une de vos pistes
      const sc = (club.scouting && club.scouting.shortlist) || [];
      const id = sc.length ? sc[rnd(0, sc.length - 1)] : null;
      let p = id ? getPlayer(id) : null; if (!p) { const c = others[rnd(0, others.length - 1)]; p = c.players[rnd(0, c.players.length - 1)]; }
      if (!p) return;
      const b = others.filter((c) => c.id !== p.clubId).sort(() => Math.random() - 0.5)[0]; if (!b) return;
      Object.assign(rec, { kind: "rival", playerId: p.id, clubId: b.id });
    }
    R().list.unshift(rec); if (R().list.length > 40) R().list.length = 40;
  }

  // ---------- texte ----------
  function srcOf(r) { return SOURCES.find((s) => s.k === r.src) || SOURCES[2]; }
  function headline(r) {
    const p = getPlayer(r.playerId), c = getClub(r.clubId); if (!p) return "Rumeur";
    if (r.kind === "interest") return `${c ? c.name : "Un club"} sur ${pName(p)} ?`;
    if (r.kind === "unrest") return `${pName(p)} voudrait partir ?`;
    if (r.kind === "clause") return `Clause de ${pName(p)} : ${fmtM(r.amount)} ?`;
    if (r.kind === "forsale") return `${pName(p)} bientôt sur le marché ?`;
    return `${c ? c.name : "Un club"} ciblerait ${pName(p)}`;
  }
  function body(r) {
    const p = getPlayer(r.playerId), c = getClub(r.clubId), s = srcOf(r); if (!p) return "<p>Joueur introuvable.</p>";
    const t = { interest: `Selon ${s.label.toLowerCase()}, <b>${esc(c ? c.name : "un club")}</b> prépare une offensive pour <b>${esc(pName(p))}</b> (valeur estimée ${fmtM(p.value)}).`,
      unrest: `D'après ${s.label.toLowerCase()}, <b>${esc(pName(p))}</b> serait agacé par son rôle et songerait à quitter votre club.`,
      clause: `${esc(s.label)} affirme que la clause libératoire de <b>${esc(pName(p))}</b> (${esc(c ? c.name : "?")}) serait de <b>${fmtM(r.amount)}</b>.`,
      forsale: `${esc(s.label)} indique que <b>${esc(c ? c.name : "?")}</b> pourrait céder <b>${esc(pName(p))}</b> (${p.position}, ${p.overall}) dès le prochain mercato.`,
      rival: `${esc(s.label)} révèle que <b>${esc(c ? c.name : "un rival")}</b> s'intéresse aussi à <b>${esc(pName(p))}</b>, l'un de vos dossiers.` }[r.kind];
    let h = `<p>${t}</p><p class="hint">Source : ${esc(s.label)} · fiabilité ${s.stars}</p>`;
    if (r.verified) h += `<p class="${r.verified.says ? "result-good" : "result-bad"}">🔎 Vérification : ${r.verified.says ? "l'information paraît <b>fondée</b>" : "l'information paraît <b>fausse</b>"} (confiance ${r.verified.conf} %).</p>`;
    if (r.status === "confirmed") h += `<p class="result-good"><b>✔ Confirmée.</b> ${esc(r.outcome || "")}</p>`;
    if (r.status === "denied") h += `<p class="result-mid"><b>✘ Démentie / sans suite.</b> ${esc(r.outcome || "")}</p>`;
    if (r.reacted) h += `<p class="hint">Vous avez réagi : ${esc(r.reaction)}</p>`;
    if (r.status === "open") {
      const act = [];
      if (!r.verified) act.push(`<button class="btn btn-small btn-ghost" data-rm="verify:${r.id}">🔎 Vérifier la source (${fmtM(25000)})</button>`);
      if (!r.reacted) {
        if (r.kind === "interest") act.push(`<button class="btn btn-small btn-primary" data-rm="react:${r.id}">Revaloriser le joueur (+10 % de salaire)</button>`);
        if (r.kind === "unrest") act.push(`<button class="btn btn-small btn-primary" data-rm="react:${r.id}">Recevoir le joueur (promesse de temps de jeu)</button>`);
        if (r.kind === "clause") act.push(`<button class="btn btn-small btn-primary" data-rm="react:${r.id}">Préparer le montant (réserver le budget)</button>`);
        if (r.kind === "forsale") act.push(`<button class="btn btn-small btn-primary" data-rm="react:${r.id}">Contacter le club (sonder le prix)</button>`);
        if (r.kind === "rival") act.push(`<button class="btn btn-small btn-primary" data-rm="react:${r.id}">Accélérer le dossier (+8 % de crédit de confiance)</button>`);
      }
      act.push(`<button class="btn btn-small btn-ghost" data-rm="ignore:${r.id}">Ne rien faire</button>`);
      h += `<div class="offer-actions" style="flex-wrap:wrap">${act.join(" ")}</div><p class="hint">Réagir à une rumeur fausse est du temps (et de l'argent) perdu.</p>`;
    }
    return h;
  }

  // ---------- résolution ----------
  function resolve(r) {
    const p = getPlayer(r.playerId), club = userClub(), c = getClub(r.clubId); if (!p || !club) { r.status = "denied"; r.outcome = "Le joueur n'est plus concerné."; return; }
    if (r.truth) {
      r.status = "confirmed";
      if (r.kind === "interest") {
        if (c && currentWindow() && c.budget >= r.amount && p.clubId === club.id) { state.inbox.unshift({ id: nextId(), type: "offer_incoming", playerId: p.id, fromClubId: c.id, amount: r.amount, date: fmtDate(state.date), resolved: false }); r.outcome = `${c.name} dépose une offre de ${fmtM(r.amount)}.`; }
        else r.outcome = `${c ? c.name : "Le club"} reviendra à la charge au prochain mercato.`;
        if (r.reacted) r.outcome += " Votre revalorisation a rassuré le joueur.";
      } else if (r.kind === "unrest") {
        if (!r.reacted) { p.happy = Math.max(0, (p.happy == null ? 62 : p.happy) - 18); p.unhappyWeeks = Math.max(p.unhappyWeeks || 0, 2); r.outcome = `${pName(p)} est mécontent.`; } else r.outcome = `Grâce à votre discussion, ${pName(p)} reste motivé.`;
      } else if (r.kind === "clause") r.outcome = "Le montant annoncé est exact.";
      else if (r.kind === "forsale") { p.listed = true; r.outcome = `${pName(p)} est désormais proposé à la vente.`; }
      else { p.value = Math.round(p.value * 1.1 / 1000) * 1000; r.outcome = `La concurrence fait monter le prix de ${pName(p)} (valeur ${fmtM(p.value)}).`; }
    } else {
      r.status = "denied";
      r.outcome = r.reacted ? "C'était une fausse piste : vous avez agi pour rien." : "Aucune suite : c'était une fausse rumeur.";
      if (r.reacted && r.kind === "interest") r.outcome += " Vous avez payé un salaire plus élevé sans nécessité.";
    }
    state.news.unshift({ date: fmtDate(state.date), text: `Rumeur ${r.status === "confirmed" ? "confirmée" : "démentie"} : ${headline(r)}` });
  }

  // ---------- actions ----------
  function verify(r) {
    const club = userClub(); if (r.verified || club.budget < 25000) return "Budget insuffisant.";
    club.budget -= 25000;
    const net = (state.ds && state.ds.skills ? (state.ds.skills.scouting || 0) : 0) * 6 + (state.ds ? state.ds.reputation || 30 : 30) * 0.2 + (window.dsNet ? dsNet("press") * 0.15 : 0);
    const acc = Math.min(0.95, 0.62 + net / 100 + (window.dsNetBonus ? dsNetBonus("Journaliste") * 0.15 : 0)), ok = Math.random() < acc;
    r.verified = { says: ok ? r.truth : !r.truth, conf: Math.round(acc * 100) };
    return null;
  }
  function react(r) {
    const club = userClub(), p = getPlayer(r.playerId); if (!p || r.reacted) return;
    r.reacted = true;
    if (r.kind === "interest") { const w = Math.round(p.wage * 1.1 / 100) * 100; if (typeof canAffordWage === "function" && !canAffordWage(club, w - p.wage)) { r.reacted = false; return "Plafond salarial atteint."; } p.wage = w; recomputeWageBill(club); p.happy = Math.min(100, (p.happy == null ? 62 : p.happy) + 8); r.reaction = `salaire porté à ${fmtM(w)}/mois.`; }
    else if (r.kind === "unrest") { p.happy = Math.min(100, (p.happy == null ? 62 : p.happy) + 12); p.promise = { kind: "minutes", need: 0.5, startPlayed: club.played || 0, startM: (p.seasonStats || {}).matches || 0, untilDay: day() + 56 }; r.reaction = "promesse de temps de jeu (50 % des matchs sur 8 semaines)."; }
    else if (r.kind === "clause") { r.reaction = "budget mis de côté, vous suivez le dossier."; }
    else if (r.kind === "forsale") { club.budget -= 10000; r.reaction = `sondage discret (${fmtM(10000)}). Valeur estimée ${fmtM(p.value)}.`; }
    else { if (state.ds) state.ds.reputation = Math.min(100, (state.ds.reputation || 30) + 0); p.value = Math.round(p.value * 0.97 / 1000) * 1000; r.reaction = "vous prenez de l'avance auprès de l'agent."; }
    return null;
  }
  // bluff : faire fuiter un faux intérêt pour gonfler la cote d'un de vos joueurs
  function leak(pid) {
    const club = userClub(), p = getPlayer(pid), s = R();
    if (!p || p.clubId !== club.id) return "Joueur introuvable.";
    if (s.leakCd > day()) return `Votre dernière fuite est trop récente (encore ${s.leakCd - day()} jours).`;
    s.leakCd = day() + 30;
    const caught = Math.random() < Math.max(0.12, 0.35 - (window.dsNet ? dsNet("press") / 400 : 0));
    if (caught) {
      if (state.media) { state.media.press = Math.max(0, (state.media.press || 55) - 8); state.media.fans = Math.max(0, (state.media.fans || 60) - 3); }
      p.happy = Math.max(0, (p.happy == null ? 62 : p.happy) - 6);
      note(`🗞️ Fuite démasquée : la presse accuse votre club d'avoir lancé une fausse rumeur sur ${pName(p)}. Image écornée.`);
      return `Fuite démasquée ! La presse vous en veut et ${pName(p)} est gêné.`;
    }
    p.hype = day() + 28;
    p.value = Math.round(p.value * 1.08 / 1000) * 1000;
    note(`🗞️ Fausse indiscrétion bien placée : la cote de ${pName(p)} grimpe (valeur ${fmtM(p.value)}).`);
    if (p.listed && currentWindow()) state.inbox.unshift({ id: nextId(), type: "offer_incoming", playerId: p.id, fromClubId: pick(allClubs().filter((c) => c.id !== club.id)).id, amount: Math.round(p.value * 1.05 / 10000) * 10000, date: fmtDate(state.date), resolved: false });
    return `La fuite prend : la cote de ${pName(p)} augmente.`;
  }

  // ---------- messages dynamiques pour la boîte de réception ----------
  window.dsExtraMessages = function () {
    const out = [], s = R();
    const club = userClub();
    s.list.forEach((r) => {
      const p = getPlayer(r.playerId); if (!p) return;
      out.push({ key: "rum:" + r.id, kind: "mail", folder: "rumors", action: r.status === "open" && !r.reacted && false, icon: "🗞️", sender: srcOf(r).label, subject: headline(r), date: r.date, html: body(r), pid: p.id });
    });
    if (club) {
      const top = club.players.filter((p) => !p.onLoan).sort((a, b) => b.value - a.value).slice(0, 6);
      out.push({ key: "rum:leak", kind: "mail", folder: "rumors", icon: "🕵️", sender: "Cellule presse", subject: "Faire fuiter une information (bluff)", date: fmtDate(state.date), html:
        `<p>Vous pouvez glisser à la presse un <b>faux intérêt</b> pour un de vos joueurs afin de faire monter sa cote. Risque : 35 % que la manœuvre soit démasquée (image de la presse et des supporters entamée). Une fuite tous les 30 jours.</p>
         <p class="hint">${s.leakCd > day() ? `Prochaine fuite possible dans ${s.leakCd - day()} jours.` : "Prête."}</p>
         <div class="offer-actions" style="flex-wrap:wrap">${top.map((p) => `<button class="btn btn-small btn-ghost" data-rm="leak:${p.id}">${esc(pName(p))} (${fmtM(p.value)})</button>`).join(" ")}</div>` });
    }
    return out;
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-rm]"); if (!b || !state || !state.ds) return;
    const [cmd, id] = b.dataset.rm.split(":"), n = parseInt(id, 10);
    let msg = null;
    if (cmd === "leak") msg = leak(n);
    else {
      const r = R().list.find((x) => x.id === n); if (!r) return;
      if (cmd === "verify") msg = verify(r);
      else if (cmd === "react") msg = react(r);
      else if (cmd === "ignore") { r.ignored = true; r.status = "open"; r.resolveDay = Math.min(r.resolveDay, day() + 3); }
    }
    try { saveGame(); } catch (x) {}
    if (msg && window.dsToast) window.dsToast(msg);
    render();
  });

  // ---------- branchement ----------
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try {
      if (state.ds && userClub()) {
        const s = R();
        s.list.forEach((x) => { if (x.status === "open" && x.resolveDay <= day()) resolve(x); });
        if (day() % 5 === 2 && Math.random() < 0.8) { make(); if (Math.random() < 0.3) make(); }
      }
    } catch (e) { console.error("rumeurs", e); }
    return r;
  };
  window.dsRumors = { make, resolve, verify, react, leak, R, headline };
})();
