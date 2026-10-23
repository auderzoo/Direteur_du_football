// ===================================================================
// BLOC 21 (2/4) — SÉLECTIONNEUR : calendrier, compétitions, matchs, convocations
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.__ntInternal) return;
  const I = window.__ntInternal, D = window.dsNationsData;
  const { N, active, myKey, myNat, rating, team, oppClub, myClub, mySquad, eligible, injectDiaspora, ageTeams, cl, ri, rf, pk, dkey, todayKey, hasState, hu } = I;
  const nat = D.nat;
  const addDays = (k, n) => dkey(new Date(k).getTime() + n * 864e5);
  const md = (y, m, d) => dkey(Date.UTC(y, m - 1, d));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const poisson = (l) => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const toast = (t) => { try { window.dsToast && window.dsToast(t); } catch (e) {} };
  const news = (t) => { const S = N(); S.news = S.news || []; S.news.unshift({ date: fmtDate(state.date), text: t }); if (S.news.length > 80) S.news.length = 80; };

  // ---------------------------------------------------------------
  // Fenêtres internationales
  // ---------------------------------------------------------------
  const WIN = [[9, 5, 9, 13, "Trêve de septembre"], [10, 10, 10, 18, "Trêve d'octobre"], [11, 9, 11, 17, "Trêve de novembre"], [3, 20, 3, 28, "Trêve de mars"], [6, 1, 6, 9, "Trêve de juin"]];
  function windowsOfYear(y) {
    return WIN.map(([m1, d1, m2, d2, label]) => {
      const start = md(y, m1, d1);
      let end = md(y, m2, d2), lab = label;
      const sh = (typeof state !== "undefined" && state && state.nt && state.nt.shortJune && state.nt.shortJune[y]);
      if (m1 === 6 && y % 2 === 0 && !sh) { end = md(y, 7, 22); lab = y % 4 === 2 ? "Coupe du monde" : "Tournoi continental"; }
      return { start, end, label: lab, days: [addDays(start, 3), addDays(start, 7)], y };
    });
  }
  function allWindows() { const y = new Date(state.date).getUTCFullYear(); return [].concat(windowsOfYear(y - 1), windowsOfYear(y), windowsOfYear(y + 1)); }
  const windowAt = (dk) => allWindows().find((w) => w.start <= dk && dk <= w.end) || null;
  const nextWindow = (dk) => allWindows().find((w) => w.end >= dk) || null;

  // ---------------------------------------------------------------
  // Fabrication des compétitions
  // ---------------------------------------------------------------
  const KIND_LABEL = { nl: "Ligue des nations", wcq: "Éliminatoires Coupe du monde", contq: "Éliminatoires continentales", cont: "Phase finale continentale", wc: "Coupe du monde", fr: "Match amical" };
  function addMatch(o) { const S = N(); const m = Object.assign({ id: S.nid++, played: false, hg: null, ag: null, pen: null }, o); S.matches.push(m); return m; }
  const RR = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  function groupMatches(comp, gi, dates, double) {
    const t = comp.groups[gi].teams;
    const rounds = RR.length * (double ? 2 : 1);
    for (let r = 0; r < rounds; r++) {
      const sw = r >= 3;
      RR[r % 3].forEach(([a, b]) => addMatch({ comp: comp.id, g: gi, stage: "G", date: dates[r], home: sw ? t[b] : t[a], away: sw ? t[a] : t[b], neutral: !!comp.neutral, round: r + 1 }));
    }
  }
  function confTeams(conf) {
    const me = myKey();
    let s = D.ORDER.filter((k) => nat(k).conf === conf).sort((a, b) => nat(b).base - nat(a).base);
    const n = Math.floor(s.length / 4) * 4;
    for (let drop = s.length - n; drop > 0; drop--) for (let j = s.length - 1; j >= 0; j--) if (s[j] !== me) { s.splice(j, 1); break; }
    return s;
  }
  function makeGroups(teams, mode, first) {
    const g = teams.length / 4;
    const f = first || [];
    const sorted = teams.slice().sort((a, b) => (f.includes(b) - f.includes(a)) || (rating(b) - rating(a)));
    const groups = Array.from({ length: g }, () => []);
    if (mode === "tiers") sorted.forEach((k, i) => groups[Math.floor(i / 4)].push(k));
    else for (let pot = 0; pot < 4; pot++) shuffle(sorted.slice(pot * g, (pot + 1) * g)).forEach((k, i) => groups[i].push(k));
    return groups.map((t, i) => ({ name: "Groupe " + String.fromCharCode(65 + i), teams: t }));
  }
  function newComp(kind, y, conf, label, extra) {
    const S = N(); const c = Object.assign({ id: S.nid++, kind, year: y, conf: conf || null, label, groups: [], stage: "G", done: false, champion: null, lastStage: null, created: todayKey() }, extra || {});
    S.comps.push(c); return c;
  }
  function autumnDays(y) { return [].concat(windowsOfYear(y).slice(0, 3).map((w) => w.days)).reduce((a, b) => a.concat(b), []); }

  function ensureYear(y) {
    const S = N(); S.sched = S.sched || {};
    if (S.sched[y]) return; S.sched[y] = true;
    const kind = y % 4 === 3 ? "contq" : y % 4 === 1 ? "wcq" : "nl";
    const days = autumnDays(y).filter(() => true);
    if (days[0] > todayKey() || true) {
      Object.keys(D.CONF_LABEL).forEach((conf) => {
        const teams = confTeams(conf); if (teams.length < 4) return;
        const c = newComp(kind, y, conf, `${KIND_LABEL[kind]} — ${conf}`, { double: true, neutral: false });
        c.label = kind === "nl" ? `Ligue des nations ${conf} ${y}` : kind === "wcq" ? `Éliminatoires Coupe du monde ${y + 1} — ${conf}` : `Éliminatoires ${D.CONT_NAME[conf]} ${y + 1}`;
        c.groups = makeGroups(teams, kind === "nl" ? "tiers" : "pots");
        c.groups.forEach((g, gi) => groupMatches(c, gi, days, true));
      });
    }
    // amicaux de la sélection gérée : mars et juin
    const w = windowsOfYear(y);
    [w[3], w[4]].forEach((win) => {
      if (win.days[0] < todayKey() || (win.y % 2 === 0 && win === w[4] && false)) return;
      scheduleFriendlies(win);
    });
    // tournoi : le tirage se fait au 2 janvier de l'année du tournoi
    pruneOld();
  }
  function scheduleFriendlies(win) {
    const S = N(); const me = myKey(); if (!me) return;
    const rm = rating(me);
    const used = new Set(S.matches.filter((m) => m.comp === 0 && m.date.slice(0, 4) === win.start.slice(0, 4)).map((m) => (m.home === me ? m.away : m.home)));
    win.days.forEach((d, i) => {
      if (S.matches.some((m) => m.date === d && (m.home === me || m.away === me))) return;
      let cand = D.ORDER.filter((k) => k !== me && !used.has(k) && Math.abs(rating(k) - rm) <= 14 && nat(k).base >= 30);
      if (!cand.length) cand = D.ORDER.filter((k) => k !== me && !used.has(k));
      const opp = pk(cand); used.add(opp);
      const home = i === 0 ? me : opp;
      addMatch({ comp: 0, g: null, stage: "F", date: d, home, away: home === me ? opp : me, neutral: false, friendly: true });
    });
  }
  function pruneOld() {
    const S = N(); const cut = addDays(todayKey(), -900);
    S.comps = S.comps.filter((c) => !(c.done && c.created < cut));
    const ids = new Set(S.comps.map((c) => c.id)); ids.add(0);
    S.matches = S.matches.filter((m) => ids.has(m.comp) && m.date >= cut);
  }

  // ---------------------------------------------------------------
  // Classements
  // ---------------------------------------------------------------
  function table(comp, gi) {
    const g = comp.groups[gi]; const rows = {};
    g.teams.forEach((k) => { rows[k] = { k, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    N().matches.forEach((m) => {
      if (m.comp !== comp.id || m.g !== gi || m.stage !== "G" || !m.played) return;
      const a = rows[m.home], b = rows[m.away]; if (!a || !b) return;
      a.p++; b.p++; a.gf += m.hg; a.ga += m.ag; b.gf += m.ag; b.ga += m.hg;
      if (m.hg > m.ag) { a.w++; b.l++; a.pts += 3; } else if (m.hg < m.ag) { b.w++; a.l++; b.pts += 3; } else { a.d++; b.d++; a.pts++; b.pts++; }
    });
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || rating(y.k) - rating(x.k));
  }
  function rankAll(comp) {
    const out = [];
    comp.groups.forEach((g, gi) => table(comp, gi).forEach((r, pos) => out.push(Object.assign({ pos, gi }, r))));
    return out.sort((a, b) => a.pos - b.pos || b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || rating(b.k) - rating(a.k));
  }

  // ---------------------------------------------------------------
  // Phases finales
  // ---------------------------------------------------------------
  function qualifiedWC(y) {
    const S = N(); const hosts = D.WC_HOSTS[y] || []; let all = [];
    Object.keys(D.WC_SLOTS).forEach((conf) => {
      const slots = D.WC_SLOTS[conf];
      const q = S.comps.find((c) => c.kind === "wcq" && c.year === y - 1 && c.conf === conf);
      let list = q ? rankAll(q).map((r) => r.k) : D.ORDER.filter((k) => nat(k).conf === conf).sort((a, b) => rating(b) - rating(a));
      list = list.slice(0, slots);
      hosts.filter((h) => nat(h) && nat(h).conf === conf).forEach((h) => { if (!list.includes(h)) { for (let j = list.length - 1; j >= 0; j--) if (!hosts.includes(list[j])) { list[j] = h; break; } } });
      all = all.concat(list);
    });
    return all;
  }
  function makeTournament(y) {
    const S = N(); S.tourney = S.tourney || {}; if (S.tourney[y]) return; S.tourney[y] = true;
    const wins = windowsOfYear(y)[4];
    if (y % 4 === 2) {
      const teams = qualifiedWC(y); if (teams.length < 48) { while (teams.length < 48) teams.push(pk(D.ORDER.filter((k) => !teams.includes(k)))); }
      const c = newComp("wc", y, null, `Coupe du monde ${y}`, { neutral: true, size: 48, qualified: teams.slice() });
      c.groups = makeGroups(teams, "pots", D.WC_HOSTS[y] || []);
      const gd = [md(y, 6, 11), md(y, 6, 16), md(y, 6, 21)];
      c.groups.forEach((g, gi) => groupMatches(c, gi, gd, false));
      c.nextDate = addDays(gd[2], 6); c.gap = 5;
      news(`Tirage au sort de la Coupe du monde ${y} : ${teams.includes(myKey()) ? "votre sélection est qualifiée." : "votre sélection n'est pas qualifiée."}`);
      if (!teams.includes(myKey())) markEnd(c, null);
    } else {
      const conf = myNat().conf; const q = S.comps.find((c) => c.kind === "contq" && c.year === y - 1 && c.conf === conf);
      const all = confTeams(conf); const size = all.length >= 16 ? 16 : 8;
      const list = (q ? rankAll(q).map((r) => r.k) : all.slice().sort((a, b) => rating(b) - rating(a))).slice(0, size);
      const c = newComp("cont", y, conf, `${D.CONT_NAME[conf]} ${y}`, { neutral: true, size, qualified: list.slice() });
      c.groups = makeGroups(list, "pots");
      const gd = [md(y, 6, 12), md(y, 6, 16), md(y, 6, 20)];
      c.groups.forEach((g, gi) => groupMatches(c, gi, gd, false));
      c.nextDate = addDays(gd[2], 5); c.gap = 4;
      news(`Tirage au sort : ${c.label} — ${list.includes(myKey()) ? "votre sélection est qualifiée." : "votre sélection n'est pas qualifiée."}`);
      if (!list.includes(myKey())) markEnd(c, null);
    }
  }
  function markEnd(c) { c.userOut = true; const S = N(); S.shortJune = S.shortJune || {}; S.shortJune[c.year] = true; }

  const stageLabel = (n) => (n >= 32 ? "1/16 de finale" : n === 16 ? "Huitièmes de finale" : n === 8 ? "Quarts de finale" : n === 4 ? "Demi-finales" : "Finale");
  const stageNum = (n) => ({ 32: 1, 16: 2, 8: 3, 4: 4, 2: 5 }[n] || 0);
  function seedOrder(n) { let a = [1]; while (a.length < n) a = a.flatMap((x) => [x, a.length * 2 + 1 - x]); return a.map((x) => x - 1); }
  function koRound(comp, teams, date, groupOf) {
    const n = teams.length; const ord = seedOrder(n);
    let pairs = [];
    for (let i = 0; i < n / 2; i++) { const s = ord[i * 2], t = ord[i * 2 + 1]; pairs.push([teams[s], teams[t]]); }
    if (groupOf) {
      pairs.forEach((p, i) => {
        if (groupOf[p[0]] === groupOf[p[1]] && pairs.length > 1) { const j = (i + 1) % pairs.length; const t = pairs[j][1]; pairs[j][1] = p[1]; p[1] = t; }
      });
    }
    comp.lastStage = "K" + n;
    pairs.forEach(([a, b]) => addMatch({ comp: comp.id, g: null, stage: "K" + n, date, home: a, away: b, neutral: true, ko: true }));
  }
  const winnerOf = (m) => (m.hg > m.ag ? m.home : m.hg < m.ag ? m.away : (m.pen && m.pen[0] > m.pen[1]) ? m.home : m.away);
  function progress(comp) {
    if (comp.done) return;
    const S = N(); const ms = S.matches.filter((m) => m.comp === comp.id);
    if (!ms.length || ms.some((m) => !m.played)) return;
    if (comp.stage === "G") {
      if (comp.kind === "wcq" || comp.kind === "contq" || comp.kind === "nl") { comp.done = true; finalizeQual(comp); return; }
      const all = rankAll(comp); const groupOf = {}; all.forEach((r) => { groupOf[r.k] = r.gi; });
      let teams;
      if (comp.kind === "wc") {
        const win = all.filter((r) => r.pos === 0), run = all.filter((r) => r.pos === 1), thr = all.filter((r) => r.pos === 2).slice(0, 8);
        teams = win.concat(run, thr).map((r) => r.k);
      } else {
        const per = comp.groups.length;
        teams = all.filter((r) => r.pos < 2).map((r) => r.k); if (per === 0) teams = [];
      }
      comp.stage = "K"; comp.advanced = teams.slice();
      koRound(comp, teams, comp.nextDate, groupOf);
      comp.nextDate = addDays(comp.nextDate, comp.gap);
      if (!teams.includes(myKey()) && !comp.userOut && comp.qualified.includes(myKey())) { comp.userOut = true; comp.userStage = 0; }
      return;
    }
    const last = ms.filter((m) => m.stage === comp.lastStage);
    const winners = last.map(winnerOf);
    if (last.length === 1) { comp.champion = winners[0]; comp.done = true; finalizeTournament(comp); return; }
    const next = winners.length;
    koRound(comp, winners, comp.nextDate, null);
    comp.nextDate = addDays(comp.nextDate, next === 2 ? comp.gap + 2 : comp.gap);
  }
  function userStage(comp) {
    const me = myKey(); const ms = N().matches.filter((m) => m.comp === comp.id && (m.home === me || m.away === me));
    if (!ms.length) return null;
    let best = 0; let eliminated = false;
    ms.forEach((m) => { if (m.stage[0] === "K") { const n = parseInt(m.stage.slice(1), 10); best = Math.max(best, stageNum(n)); } });
    if (comp.champion === me) return { num: 6, text: "Vainqueur" };
    if (best === 0) return { num: 0, text: "Éliminé en phase de groupes" };
    if (best === 5) return { num: 5, text: "Finaliste" };
    return { num: best, text: "Éliminé en " + stageLabel(best === 1 ? 32 : best === 2 ? 16 : best === 3 ? 8 : best === 4 ? 4 : 2).toLowerCase().replace("finale", "finale") };
  }
  function finalizeTournament(comp) {
    const S = N(); const me = myKey();
    news(`${comp.label} : ${D.nName(comp.champion)} est sacré !`);
    S.history = S.history || [];
    const us = userStage(comp);
    if (us) {
      const target = S.obj ? Math.min(S.obj.target, comp.kind === "wc" ? 6 : 5) : 1;
      const ok = us.num >= target;
      S.history.unshift({ year: comp.year, comp: comp.label, result: us.text, ok, nat: D.nName(me) });
      if (comp.champion === me) { S.honors = S.honors || []; S.honors.unshift({ year: comp.year, comp: comp.label }); }
      adjustConf(ok ? 18 + us.num * 2 : -24 + us.num * 3, `${comp.label} : ${us.text.toLowerCase()} — objectif ${ok ? "atteint" : "manqué"}.`);
    }
    // les ratings évoluent : le champion gagne en prestige
    S.rate[comp.champion] = cl((S.rate[comp.champion] || 60) + 1.5, 1, 99);
    setObjective();
  }
  function finalizeQual(comp) {
    const S = N(); const me = myKey();
    if (comp.kind === "nl") { const r = rankAll(comp); const mine = r.find((x) => x.k === me); if (mine) { news(`${comp.label} : ${mine.pos + 1}ᵉ de son groupe (${mine.pts} pts).`); adjustConf(mine.pos === 0 ? 6 : mine.pos === 3 ? -6 : 0, null); } return; }
    if (!(nat(me).conf === comp.conf)) return;
    const r = rankAll(comp);
    const slots = comp.kind === "wcq" ? D.WC_SLOTS[comp.conf] : (confTeams(comp.conf).length >= 16 ? 16 : 8);
    const hosts = comp.kind === "wcq" ? (D.WC_HOSTS[comp.year + 1] || []) : [];
    const idx = r.findIndex((x) => x.k === me);
    const ok = idx >= 0 && (idx < slots || hosts.includes(me));
    S.history = S.history || [];
    S.history.unshift({ year: comp.year, comp: comp.label, result: ok ? "Qualifié" : "Non qualifié", ok, nat: D.nName(me) });
    news(`${comp.label} : ${ok ? "qualification obtenue !" : "élimination, la sélection ne se qualifie pas."}`);
    adjustConf(ok ? 12 : -22, null);
    if (comp.kind === "wcq") {
      // les autres sélections qualifiées apparaissent dans « Compétitions »
    }
  }
  function adjustConf(d, text) {
    const S = N(); S.conf = cl((S.conf == null ? 60 : S.conf) + d, 0, 100);
    if (text) news(text + ` (confiance de la fédération ${d >= 0 ? "+" : ""}${Math.round(d)})`);
    if (S.conf <= 4 && !S.fired) { S.fired = true; news("La fédération met fin à vos fonctions de sélectionneur."); }
  }
  function setObjective() {
    const S = N(); const me = myKey();
    const rank = D.ORDER.slice().sort((a, b) => rating(b) - rating(a)).indexOf(me) + 1;
    S.obj = rank <= 4 ? { target: 4, text: "Atteindre les demi-finales d'un grand tournoi" } : rank <= 12 ? { target: 3, text: "Atteindre les quarts de finale" } : rank <= 24 ? { target: 2, text: "Atteindre les huitièmes de finale" } : rank <= 48 ? { target: 1, text: "Sortir de la phase de groupes" } : { target: 0, text: "Se qualifier et faire bonne figure" };
    S.obj.rank = rank;
  }

  // ---------------------------------------------------------------
  // Simulation des matchs
  // ---------------------------------------------------------------
  function simAI(m) {
    const a = rating(m.home), b = rating(m.away), adv = m.neutral ? 0 : 0.22;
    let hg = poisson(cl(1.25 + (a - b) / 28 + adv, 0.12, 4.2)), ag = poisson(cl(1.0 + (b - a) / 28 - adv * 0.5, 0.1, 3.8));
    m.hg = hg; m.ag = ag; m.played = true;
    if (m.ko && hg === ag) {
      const eh = poisson(0.45), ea = poisson(0.4);
      if (eh !== ea) { m.hg += eh; m.ag += ea; m.et = true; }
      else { m.et = true; const ph = 0.5 + (a - b) / 220; const w = Math.random() < ph; const ws = ri(3, 5), ls = ri(1, ws - 1); m.pen = w ? [ws, ls] : [ls, ws]; }
    }
    elo(m);
  }
  function elo(m) {
    const S = N(); const a = S.rate[m.home] == null ? nat(m.home).base : S.rate[m.home], b = S.rate[m.away] == null ? nat(m.away).base : S.rate[m.away];
    const e = 1 / (1 + Math.pow(10, -(a - b) / 22));
    const s = m.hg > m.ag ? 1 : m.hg < m.ag ? 0 : (m.pen ? (m.pen[0] > m.pen[1] ? 0.75 : 0.25) : 0.5);
    const K = m.friendly ? 0.8 : 1.6; const d = (s - e) * K;
    S.rate[m.home] = cl(a + d, 1, 99); S.rate[m.away] = cl(b - d, 1, 99);
  }
  function validateSquad() {
    const S = N(); const me = myNat();
    S.squad = (S.squad || []).filter((id) => { const p = getPlayer(id); return p && p.nationality === me.label; });
    S.xi = (S.xi || []).filter((id) => S.squad.includes(id));
    if (S.squad.length < 20) autoFill();
    if (!S.squad.includes(S.captain)) S.captain = null;
  }
  function posNeeds() { return { GB: 3, DEF: 8, MIL: 8, ATT: 7 }; }
  function autoFill(max) {
    const S = N(); const need = posNeeds(); const cap = max || 26; const dk = todayKey();
    const pool = eligible(myKey()).filter((p) => p.age >= 17);
    const score = (p) => p.overall + Math.min(4, (p.internationalCaps || 0) * 0.05) - ((p.injuredUntil && p.injuredUntil >= dk) ? 12 : 0) + (p.form || 0) * 0.3;
    const cur = new Set((S.squad || []).filter((id) => getPlayer(id)));
    const have = { GB: 0, DEF: 0, MIL: 0, ATT: 0 };
    cur.forEach((id) => { const p = getPlayer(id); if (p) have[p.position]++; });
    ["GB", "DEF", "MIL", "ATT"].forEach((pos) => {
      pool.filter((p) => p.position === pos && !cur.has(p.id)).sort((a, b) => score(b) - score(a)).forEach((p) => { if (have[pos] < need[pos] && cur.size < cap) { cur.add(p.id); have[pos]++; } });
    });
    pool.filter((p) => !cur.has(p.id)).sort((a, b) => score(b) - score(a)).forEach((p) => { if (cur.size < cap && cur.size < 23) cur.add(p.id); });
    S.squad = Array.from(cur);
    syncCallups();
    return S.squad.length;
  }
  function setCalled(pid, on) {
    const S = N(); const p = getPlayer(pid); if (!p) return false;
    S.squad = S.squad || [];
    if (on) { if (S.squad.includes(pid)) return true; if (S.squad.length >= 26) return false; if (p.nationality !== myNat().label) return false; S.squad.push(pid); }
    else { S.squad = S.squad.filter((x) => x !== pid); S.xi = (S.xi || []).filter((x) => x !== pid); if (S.captain === pid) S.captain = null; if (p.intl && p.intl.nt) delete p.intl; }
    syncCallups(); return true;
  }
  function syncCallups() {
    const S = N(); const w = windowAt(todayKey()); if (!w) return;
    mySquad().forEach((p) => { p.intl = { from: w.start, until: w.end, nation: myNat().label, nt: true }; });
  }
  function onWindowStart(w) {
    const S = N(); validateSquad();
    eligible(myKey()).forEach((p) => { if (p.intl && !S.squad.includes(p.id)) delete p.intl; });
    syncCallups();
    // la force réelle de la sélection nourrit son classement
    const sq = mySquad().sort((a, b) => b.overall - a.overall).slice(0, 11);
    if (sq.length >= 11) { const R = (sq.reduce((s, p) => s + p.overall, 0) / 11 - 40) / 0.45; S.rate[myKey()] = cl(S.rate[myKey()] * 0.6 + R * 0.4, 1, 99); }
    news(`${w.label} : ${S.squad.length} joueurs convoqués, ils quittent leur club.`);
  }
  function onWindowEnd(w) {
    mySquad().forEach((p) => { if (p.intl && p.intl.nt) delete p.intl; });
    eligible(myKey()).forEach((p) => { if (p.intl && p.intl.nt) delete p.intl; });
  }
  function updateMd() {
    const S = N(); const me = myKey(); S.mdSet = {};
    S.matches.forEach((m) => { if (!m.played && (m.home === me || m.away === me)) S.mdSet[m.date] = true; });
  }
  function userMatchOn(dk) { const S = N(), me = myKey(); return S.matches.find((m) => !m.played && m.date === dk && (m.home === me || m.away === me)) || null; }
  function compOf(m) { return m.comp ? N().comps.find((c) => c.id === m.comp) : null; }
  function matchLabel(m) {
    const c = compOf(m); if (!c) return "Match amical international";
    if (m.stage === "G") return `${c.label} — ${c.groups[m.g] ? c.groups[m.g].name : ""}${m.round ? ", journée " + m.round : ""}`;
    return `${c.label} — ${stageLabel(parseInt(m.stage.slice(1), 10))}`;
  }

  function playUser(m) {
    const S = N(), me = myKey(); validateSquad();
    const homeMine = m.home === me, oppKey = homeMine ? m.away : m.home;
    const mine = myClub(), opp = oppClub(oppKey);
    const home = homeMine ? mine : opp, away = homeMine ? opp : mine;
    const snaps = mine.players.map((p) => [p, Object.assign({}, p.seasonStats || { matches: 0, goals: 0, assists: 0 }), p.motmCount || 0]);
    const res = simulateMatch(home, away);
    snaps.forEach(([p, s, mm]) => { p.seasonStats = s; p.motmCount = mm; });
    S.form = mine.formStreak || S.form;
    m.hg = res.homeGoals; m.ag = res.awayGoals; m.played = true;
    if (m.ko && m.hg === m.ag) {
      const rh = rating(m.home), ra = rating(m.away);
      const eh = poisson(0.4), ea = poisson(0.35);
      m.et = true;
      if (eh !== ea) { m.hg += eh; m.ag += ea; } else { const w = Math.random() < 0.5 + (rh - ra) / 220; const ws = ri(3, 5), ls = ri(1, ws - 1); m.pen = w ? [ws, ls] : [ls, ws]; }
    }
    // sélections et buts internationaux
    const lineMine = homeMine ? res.homeLineup : res.awayLineup, scMine = homeMine ? res.homeScorers : res.awayScorers;
    lineMine.forEach((l) => { const p = mine.players.find((x) => x.id === l.id); if (p) { p.internationalCaps = (p.internationalCaps || 0) + 1; p.morale = cl((p.morale || 70) + (((homeMine ? m.hg > m.ag : m.ag > m.hg)) ? 4 : (m.hg === m.ag ? 0 : -3)), 20, 100); } });
    scMine.forEach((g) => { const p = mine.players.find((x) => `${x.firstName} ${x.lastName}` === g.name); if (p) p.intlGoals = (p.intlGoals || 0) + 1; });
    elo(m);
    const mg = homeMine ? m.hg : m.ag, og = homeMine ? m.ag : m.hg;
    const res3 = mg > og ? "V" : mg < og ? "D" : "N";
    const rm = rating(me), ro = rating(oppKey);
    const exp = 1 / (1 + Math.pow(10, -(rm - ro) / 22));
    adjustConf(((res3 === "V" ? 1 : res3 === "N" ? 0.5 : 0) - exp) * (m.friendly ? 3 : 7), null);
    const slim = (lu) => lu.map((l) => ({ id: l.id, name: l.name, position: l.position, rating: l.rating }));
    S.reports = S.reports || [];
    const rep = { id: m.id, date: fmtDate(state.date), dkey: todayKey(), label: matchLabel(m), home: nat(m.home).label, away: nat(m.away).label, hg: m.hg, ag: m.ag, pen: m.pen, et: !!m.et, userHome: homeMine, res3,
      homeScorers: res.homeScorers.map((g) => ({ name: g.name, minute: g.minute, assist: g.assistName || null })), awayScorers: res.awayScorers.map((g) => ({ name: g.name, minute: g.minute, assist: g.assistName || null })),
      homeCards: res.homeCards, awayCards: res.awayCards, stats: res.stats, motm: res.motm, homeLineup: slim(res.homeLineup), awayLineup: slim(res.awayLineup), shown: false };
    S.reports.unshift(rep); if (S.reports.length > 40) S.reports.length = 40;
    S.report = rep.id;
    state.lastMatchResult = { homeName: nat(m.home).label, awayName: nat(m.away).label, homeGoals: res.homeGoals, awayGoals: res.awayGoals, isHome: homeMine, homeScorers: res.homeScorers, awayScorers: res.awayScorers,
      homeLineup: res.homeLineup, awayLineup: res.awayLineup, homeBench: res.homeBench, awayBench: res.awayBench, homeSubs: res.homeSubs, awaySubs: res.awaySubs, homeCards: res.homeCards, awayCards: res.awayCards, motm: res.motm, stats: res.stats };
    news(`${rep.label} : ${rep.home} ${rep.hg}-${rep.ag} ${rep.away}${rep.pen ? ` (t.a.b. ${rep.pen[0]}-${rep.pen[1]})` : ""}.`);
    return rep;
  }

  // ---------------------------------------------------------------
  // Boucle quotidienne
  // ---------------------------------------------------------------
  function ntDay() {
    const S = N(); if (!S || S.fired === true && false) return;
    const dk = todayKey(), y = new Date(state.date).getUTCFullYear();
    ensureYear(y); ensureYear(y + 1);
    if (dk >= md(y, 1, 2) && dk < md(y, 6, 8) && y % 2 === 0) makeTournament(y);
    if (dk >= md(y, 1, 2)) ageTeams();
    const wins = allWindows();
    wins.forEach((w) => { if (w.start === dk) onWindowStart(w); });
    updateMd();
    // matchs du jour
    const today = S.matches.filter((m) => !m.played && m.date === dk);
    today.forEach((m) => { if (active() && (m.home === myKey() || m.away === myKey())) playUser(m); else simAI(m); });
    // phases suivantes
    S.comps.filter((c) => !c.done).forEach(progress);
    wins.forEach((w) => { if (w.end === dk) onWindowEnd(w); });
    updateMd();
  }
  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    if (hasState() && state.nt && state.nt.nat) { try { ntDay(); } catch (e) { console.warn("sélection/jour", e); } }
    return r;
  };

  // ---------------------------------------------------------------
  // Démarrage / changement de sélection
  // ---------------------------------------------------------------
  function startNT(key) {
    const prev = state.nt;
    const first = !prev;
    const S = state.nt = prev || { v: 1, rate: {}, teams: {}, comps: [], matches: [], reports: [], news: [], history: [], honors: [], nid: 1, sched: {}, tourney: {}, mdSet: {}, conf: 60 };
    S.nat = key; S.fired = false; S.squad = []; S.xi = []; S.captain = null; S.conf = 60; S.report = null;
    S.tactics = { formation: "4-3-3", mentality: "equilibre" }; S.style = "equilibre"; S.form = { type: null, count: 0 };
    D.ORDER.forEach((k) => { if (S.rate[k] == null) S.rate[k] = nat(k).base; });
    // en cas de changement de sélection : on retire les anciens amicaux
    if (!first) S.matches = S.matches.filter((m) => !(m.comp === 0 && !m.played));
    state.userClubId = null; state.userClubIds = [];
    state.ds.fired = false;
    injectDiaspora(key);
    autoFill();
    setObjective();
    ensureYear(new Date(state.date).getUTCFullYear()); ensureYear(new Date(state.date).getUTCFullYear() + 1);
    updateMd();
    news(`${state.ds.name} est nommé sélectionneur de ${nat(key).label}. Objectif : ${S.obj.text.toLowerCase()}.`);
    return S;
  }
  function setTactics(f, m) { const S = N(); if (f) S.tactics.formation = f; if (m) S.tactics.mentality = m; }
  function setXI(ids) { const S = N(); S.xi = ids.slice(0, 11); }
  function buildPreMatch(m) {
    const me = myKey(); const homeMine = m.home === me; const oppKey = homeMine ? m.away : m.home;
    const mine = myClub(), opp = oppClub(oppKey);
    return { kind: "nt", nt: true, matchId: m.id, label: matchLabel(m), dateKey: m.date, home: { id: homeMine ? -1 : opp.id, name: nat(m.home).label, club: homeMine ? mine : opp, ghost: false }, away: { id: homeMine ? opp.id : -1, name: nat(m.away).label, club: homeMine ? opp : mine, ghost: false }, userHome: homeMine };
  }

  window.dsNT = { N, active, myKey, startNT, ensureYear, makeTournament, windowsOfYear, allWindows, windowAt, nextWindow, table, rankAll, progress, userMatchOn, compOf, matchLabel, stageLabel, setCalled, autoFill, validateSquad, setTactics, setXI, buildPreMatch,
    playUser, ntDay, simAI, elo, setObjective, adjustConf, userStage, confTeams, KIND_LABEL, news, addDays, md, winnerOf };
})();
