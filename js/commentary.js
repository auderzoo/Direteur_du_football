// ===================================================================
// BLOC 21 (5/5) — COMMENTAIRES DE MATCH
//  - banque de phrases variées (buts selon le contexte, arrêts, tirs contrés, poteaux, cartons, changements…)
//  - « Fil du match » dans le compte rendu : frise chronologique + commentaires minute par minute
//    reconstitués à partir des vrais événements du match (buteurs, passeurs, cartons, remplacements, stats)
//  - mêmes phrases utilisées en direct par le visualiseur 2D (prematch.js)
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------------------------------------------------------------
  // Générateur pseudo-aléatoire déterministe (le même match raconte la même histoire)
  // ---------------------------------------------------------------
  function seedOf(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pickR = (R, arr) => arr[Math.floor(R() * arr.length)];
  const last = (n) => { const s = String(n || "").trim().split(/\s+/); return s.length > 1 ? s.slice(1).join(" ") : s[0] || ""; };
  const fill = (tpl, c) => tpl.replace(/\{(\w+)\}/g, (m, k) => (c[k] != null ? c[k] : ""));

  // ---------------------------------------------------------------
  // Banque de phrases
  // ---------------------------------------------------------------
  const B = {
    kickoff: [
      "Coup d'envoi ! {home} reçoit {away}, l'arbitre lance la rencontre.",
      "C'est parti au {stade} : {home} – {away}, les deux équipes sont prêtes.",
      "L'arbitre siffle le coup d'envoi. {home} engage."
    ],
    goalOpen: [
      "BUT ! {scorer} ouvre le score pour {team} !{assist}",
      "{scorer} fait trembler les filets, {team} frappe le premier !{assist}",
      "Le verrou saute : {scorer} donne l'avantage à {team} !{assist}",
      "Ouverture du score ! {scorer} ne tremble pas et trompe {gk}.{assist}"
    ],
    goalEqual: [
      "ÉGALISATION ! {scorer} remet {team} à hauteur !{assist}",
      "{team} revient à égalité grâce à {scorer} !{assist}",
      "Le match est relancé : {scorer} égalise !{assist}"
    ],
    goalLead: [
      "RETOURNEMENT ! {scorer} donne l'avantage à {team} !{assist}",
      "{team} passe devant ! {scorer} est le héros du moment.{assist}",
      "{scorer} fait basculer la rencontre en faveur de {team} !{assist}"
    ],
    goalExtend: [
      "{scorer} double la mise pour {team} !{assist}",
      "Encore un but ! {scorer} creuse l'écart.{assist}",
      "{team} accélère : {scorer} aggrave la marque !{assist}",
      "Sans pitié, {scorer} enfonce le clou pour {team}.{assist}"
    ],
    goalConsol: [
      "{scorer} réduit l'écart pour {team}, un but qui fait du bien.{assist}",
      "Pas de panique : {scorer} redonne espoir à {team} !{assist}",
      "{scorer} sauve l'honneur pour {team}.{assist}"
    ],
    goalLate: [
      "À LA DERNIÈRE MINUTE ! {scorer} fait exploser {team} !{assist}",
      "Dans le money-time, {scorer} frappe encore ! {team} y croit jusqu'au bout.{assist}"
    ],
    save: [
      "{gk} s'interpose sur la frappe de {shooter} !",
      "Belle parade de {gk}, qui détourne le tir de {shooter}.",
      "{shooter} cadre, mais {gk} est vigilant et capte.",
      "Gros arrêt de {gk} devant {shooter} !",
      "{gk} repousse du bout des gants la tentative de {shooter}."
    ],
    block: [
      "{shooter} tente sa chance, mais la défense contre.",
      "Tir de {shooter} contré in extremis par {def}.",
      "{def} se jette et bloque la frappe de {shooter}."
    ],
    miss: [
      "{shooter} décroche une frappe… à côté du cadre.",
      "Occasion pour {shooter} qui manque sa cible !",
      "{shooter} s'y prend mal, le ballon passe au-dessus.",
      "Ça frôle le poteau ! {shooter} était pourtant bien placé."
    ],
    post: [
      "POTEAU ! {shooter} tutoie le cadre, {gk} était battu !",
      "La barre transversale sauve {opp} sur la frappe de {shooter} !"
    ],
    yellow: [
      "Carton jaune pour {name} ({team}) après une faute en retard.",
      "{name} ({team}) est averti par l'arbitre.",
      "L'arbitre sort le jaune : {name} ({team}) devra se méfier."
    ],
    red: [
      "CARTON ROUGE ! {name} ({team}) est expulsé, {team} jouera à dix.",
      "Expulsion de {name} ({team}) ! Le match prend un tournant.",
      "Rouge direct pour {name} : {team} est réduit à dix."
    ],
    sub: [
      "Changement chez {team} : {inn} entre à la place de {out}.",
      "{team} fait entrer {inn} pour remplacer {out}.",
      "{out} sort sous les applaudissements, {inn} prend le relais ({team})."
    ],
    ht: [
      "Mi-temps : {score}. Les équipes rejoignent les vestiaires.",
      "L'arbitre siffle la pause, {score} à la mi-temps."
    ],
    htEven: ["Mi-temps : {score}, rien n'est joué.", "Pause sur un score de {score} : match équilibré."],
    ft: [
      "Fin du match ! {home} {hg} – {ag} {away}.",
      "Le coup de sifflet final retentit : {home} {hg} – {ag} {away}."
    ],
    added: ["{n} minutes de temps additionnel annoncées.", "L'arbitre indique {n} minutes de temps additionnel."],
    tenMen: ["{team} évolue à dix, {opp} en profite pour pousser.", "À dix contre onze, {team} serre les rangs."]
  };

  // phrase en direct (visualiseur 2D)
  function say(kind, ctx, R) {
    const arr = B[kind]; if (!arr) return "";
    const rr = R || Math.random;
    return fill(pickR(rr, arr), ctx || {});
  }
  function goalKind(minute, mine, other, isLateAllowed) {
    // mine/other = buts de l'équipe AVANT ce but ; on déduit le contexte
    const after = mine + 1;
    if (isLateAllowed && minute >= 86 && after >= other) return "goalLate";
    if (mine === 0 && other === 0) return "goalOpen";
    if (after === other) return "goalEqual";
    if (mine < other && after > other) return "goalLead";
    if (mine < other) return "goalConsol";
    if (mine === other && after > other) return "goalLead";
    return "goalExtend";
  }

  // ---------------------------------------------------------------
  // Normalisation d'un compte rendu (club ou sélection)
  // ---------------------------------------------------------------
  function norm(r) {
    const A = (x) => (Array.isArray(x) ? x : []);
    const hg = r.homeGoals != null ? r.homeGoals : r.hg, ag = r.awayGoals != null ? r.awayGoals : r.ag;
    const goal = (g) => ({ name: g.name, minute: g.minute, assist: g.assistName || g.assist || null });
    return {
      home: r.homeName || r.home || "Domicile", away: r.awayName || r.away || "Extérieur", hg: hg || 0, ag: ag || 0,
      hs: A(r.homeScorers).map(goal), as: A(r.awayScorers).map(goal),
      hc: A(r.homeCards), ac: A(r.awayCards), hsub: A(r.homeSubs), asub: A(r.awaySubs),
      hl: A(r.homeLineup), al: A(r.awayLineup), stats: r.stats || null, motm: r.motm || null, comp: r.label || r.cupLabel || ""
    };
  }

  // ---------------------------------------------------------------
  // Construction du fil du match
  // ---------------------------------------------------------------
  function build(r0) {
    const r = norm(r0);
    const R = rng(seedOf(r.home + "|" + r.away + "|" + r.hg + "-" + r.ag + "|" + (r.hs.concat(r.as).map((g) => g.name + g.minute).join(","))));
    const ev = [];
    const gkOf = (lu) => { const g = lu.find((p) => p.position === "GB"); return g ? last(g.name) : "le gardien"; };
    const names = (lu, pos) => lu.filter((p) => pos.includes(p.position)).map((p) => last(p.name));
    const hGK = gkOf(r.hl), aGK = gkOf(r.al);
    const hAtt = names(r.hl, ["ATT", "MIL"]), aAtt = names(r.al, ["ATT", "MIL"]);
    const hDef = names(r.hl, ["DEF"]), aDef = names(r.al, ["DEF"]);
    const fb = (arr, d) => (arr.length ? arr : [d]);
    const ctxBase = { home: r.home, away: r.away, stade: "stade" };
    const used = new Set();
    const free = (m, span) => { let x = m, t = 0; while (used.has(x) && t++ < 30) x = Math.max(1, Math.min(89, x + (R() < 0.5 ? -1 : 1) * (1 + Math.floor(R() * 3)))); used.add(x); return x; };

    ev.push({ minute: 0, type: "info", side: "", icon: "🏁", text: say("kickoff", ctxBase, R) });

    // buts (dans l'ordre chronologique avec contexte du score)
    const goals = r.hs.map((g) => ({ ...g, side: "h" })).concat(r.as.map((g) => ({ ...g, side: "a" }))).sort((x, y) => x.minute - y.minute);
    let sh = 0, sa = 0;
    goals.forEach((g) => {
      used.add(g.minute);
      const mine = g.side === "h" ? sh : sa, other = g.side === "h" ? sa : sh;
      const kind = goalKind(g.minute, mine, other, true);
      if (g.side === "h") sh++; else sa++;
      const team = g.side === "h" ? r.home : r.away;
      const ctx = { scorer: g.name, team, gk: g.side === "h" ? aGK : hGK, assist: g.assist ? ` Passe décisive de ${g.assist}.` : "" };
      ev.push({ minute: g.minute, type: "goal", side: g.side, icon: "⚽", text: say(kind, ctx, R), score: sh + " – " + sa, key: true });
    });

    // occasions non transformées
    const S = r.stats;
    function chances(side) {
      const own = side === "h" ? r.hg : r.ag, st = S ? (side === "h" ? S.home : S.away) : null;
      const shots = st ? st.shots : own + 4, onT = st ? st.onTarget : own + 2, blocked = st ? st.blocked : 1, off = st ? st.offTarget : 1;
      const saves = Math.max(0, onT - own);
      const pool = [];
      for (let i = 0; i < Math.min(saves, 4); i++) pool.push("save");
      for (let i = 0; i < Math.min(blocked, 2); i++) pool.push("block");
      for (let i = 0; i < Math.min(off, 3); i++) pool.push(R() < 0.18 ? "post" : "miss");
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const cap = Math.min(pool.length, shots > 14 ? 6 : 5);
      pool.slice(0, cap).forEach((k) => {
        const m = free(2 + Math.floor(R() * 86));
        const shooter = pickR(R, fb(side === "h" ? hAtt : aAtt, side === "h" ? r.home : r.away));
        const ctx = { shooter, gk: side === "h" ? aGK : hGK, def: pickR(R, fb(side === "h" ? aDef : hDef, "un défenseur")), opp: side === "h" ? r.away : r.home };
        ev.push({ minute: m, type: k, side, icon: k === "save" ? "🧤" : k === "block" ? "🛡️" : k === "post" ? "🥅" : "💨", text: say(k, ctx, R) });
      });
    }
    chances("h"); chances("a");

    // cartons
    const cardEv = (arr, side, team, opp) => arr.forEach((c) => {
      if (c.type === "suspension") return;
      const m = c.minute || free(20 + Math.floor(R() * 65)); used.add(m);
      ev.push({ minute: m, type: c.type, side, icon: c.type === "red" ? "🟥" : "🟨", text: say(c.type === "red" ? "red" : "yellow", { name: c.name, team }, R), key: true });
      if (c.type === "red" && m < 85) ev.push({ minute: Math.min(89, m + 1), type: "info", side, icon: "ℹ️", text: say("tenMen", { team, opp }, R) });
    });
    cardEv(r.hc, "h", r.home, r.away); cardEv(r.ac, "a", r.away, r.home);

    // remplacements
    const subEv = (arr, side, team) => arr.forEach((s) => ev.push({ minute: s.minute || 60, type: "sub", side, icon: "🔄", text: say("sub", { team, inn: s.inName, out: s.outName }, R) }));
    subEv(r.hsub, "h", r.home); subEv(r.asub, "a", r.away);

    // mi-temps / fin
    let h1 = 0, a1 = 0; goals.forEach((g) => { if (g.minute <= 45) { if (g.side === "h") h1++; else a1++; } });
    const sc1 = h1 + " – " + a1;
    ev.push({ minute: 45, type: "info", side: "", icon: "⏸️", text: say(h1 === a1 ? "htEven" : "ht", { score: sc1 }, R), score: sc1, order: 5 });
    ev.push({ minute: 90, type: "info", side: "", icon: "⏱️", text: say("added", { n: 2 + Math.floor(R() * 4) }, R), order: 1 });
    ev.push({ minute: 90, type: "info", side: "", icon: "🏁", text: say("ft", { home: r.home, away: r.away, hg: r.hg, ag: r.ag }, R), score: r.hg + " – " + r.ag, key: true, order: 9 });

    // bilan
    if (S) {
      const xh = Number(S.home.xg) || 0, xa = Number(S.away.xg) || 0;
      let note = "";
      if (r.hg > r.ag && xa > xh + 0.6) note = `${r.home} gagne en étant moins dangereux (xG ${xh} contre ${xa}) : une victoire très efficace.`;
      else if (r.ag > r.hg && xh > xa + 0.6) note = `${r.away} s'impose malgré une domination adverse dans les occasions (xG ${xa} contre ${xh}).`;
      else if (r.hg === r.ag && Math.abs(xh - xa) > 0.9) note = `Nul sévère pour ${xh > xa ? r.home : r.away}, plus dangereux (xG ${Math.max(xh, xa)} contre ${Math.min(xh, xa)}).`;
      else if (S.home.possession >= 60) note = `${r.home} a monopolisé le ballon (${S.home.possession} % de possession).`;
      else if (S.away.possession >= 60) note = `${r.away} a monopolisé le ballon (${S.away.possession} % de possession).`;
      if (note) ev.push({ minute: 90, type: "info", side: "", icon: "📊", text: note, order: 10 });
    }
    if (r.motm) ev.push({ minute: 90, type: "info", side: "", icon: "⭐", text: `Homme du match : ${r.motm}.`, order: 11 });
    ev.sort((x, y) => x.minute - y.minute || (x.order || 3) - (y.order || 3));
    return { ev, meta: r };
  }

  // ---------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------
  function barHTML(T) {
    const mk = T.ev.filter((e) => ["goal", "yellow", "red"].includes(e.type)).map((e) => `<i class="cm-mk ${e.side} ${e.type}" style="left:${Math.min(98, e.minute / 90 * 100)}%" title="${e.minute}' ${esc(e.text)}">${e.icon}</i>`).join("");
    return `<div class="cm-bar" aria-hidden="true"><span class="cm-ht"></span><span class="cm-t0">0'</span><span class="cm-t45">45'</span><span class="cm-t90">90'</span>${mk}</div>`;
  }
  function rowHTML(e) {
    return `<div class="cm-row ${e.side} ${e.type} ${e.key ? "key" : ""}" data-cmk="${e.key ? 1 : 0}"><b class="cm-min">${e.minute}'</b><span class="cm-ic">${e.icon}</span><span class="cm-tx">${esc(e.text)}${e.score && e.type === "goal" ? ` <em class="cm-sc">${e.score}</em>` : ""}</span></div>`;
  }
  function htmlFromReport(r) {
    const T = build(r);
    const m = T.meta;
    return `<div class="cm-wrap" data-cm="1"><h4 class="fm-h">Fil du match</h4>
      <div class="cm-legend"><span>${esc(m.home)}</span><span class="cm-sp"></span><span>${esc(m.away)}</span></div>
      ${barHTML(T)}
      <div class="cm-tools" role="tablist"><button type="button" class="cm-tab on" data-cmf="key">Temps forts</button><button type="button" class="cm-tab" data-cmf="all">Tout le match</button></div>
      <div class="cm-list" data-mode="key">${T.ev.map(rowHTML).join("")}</div></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-cmf]"); if (!b) return;
    const w = b.closest(".cm-wrap"); if (!w) return;
    w.querySelectorAll(".cm-tab").forEach((x) => x.classList.toggle("on", x === b));
    w.querySelector(".cm-list").setAttribute("data-mode", b.dataset.cmf);
  });

  // Compte rendu des clubs : on ajoute le fil du match au-dessus du bouton « Continuer »
  const origMatchHTML = window.fmMatchHTML;
  if (typeof origMatchHTML === "function") {
    window.fmMatchHTML = function (r) {
      const html = origMatchHTML.apply(this, arguments);
      try {
        const block = htmlFromReport(r);
        const i = html.indexOf('<button class="btn btn-primary fm-continue"');
        return i < 0 ? html : html.slice(0, i) + block + html.slice(i);
      } catch (e) { console.warn("commentary", e); return html; }
    };
  }

  window.dsCommentary = { say, build, htmlFromReport, goalKind, B };
})();
