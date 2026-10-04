/* ============================================================
   FM-EXTRA.JS — Ajouts « façon Football Manager »
   - Calendrier (tableau des rencontres + fiche du match sélectionné)
   - Équipe réserve et U19 : calendrier + effectif + compétition
   - Boîte de réception à deux colonnes (liste des messages / lecture)
   Chargé après app.js : redéfinit renderCalendar et renderInbox,
   et ajoute renderSubTeamTab (voir index.html).
   ============================================================ */

const FX_KIND = {
  u19: { label: "U19", short: "U19", suffix: " U19", delta: 16, ageMin: 16, ageMax: 19, ageLimit: 19, dayOffset: -1, comp: "Championnat U19" },
  res: { label: "Équipe réserve", short: "Réserve", suffix: " B", delta: 8, ageMin: 18, ageMax: 23, ageLimit: 23, dayOffset: 1, comp: "Championnat réserve" }
};
const FX_SQUAD_SIZE = 22;
const FX_QUOTAS = { GB: 3, DEF: 7, MIL: 7, ATT: 5 };

// ---------------------------------------------------------------
// OUTILS COMMUNS
// ---------------------------------------------------------------
function fxDay(iso) { return String(iso).slice(0, 10); }
function fxDateShort(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}
function fxMonthLabel(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).toUpperCase();
}
function fxTime(iso, a, b) {
  const h = ["15:00", "17:45", "20:00", "21:00"];
  const d = new Date(iso).getUTCDate();
  return h[Math.abs(a * 31 + b * 17 + d) % h.length];
}
function fxLogo(club) { return club ? `<span class="fx-logo">${clubLogoSvg(club)}</span>` : `<span class="fx-logo"></span>`; }
function fxTop11Avg(players) {
  const top = players.map(p => p.overall).sort((a, b) => b - a).slice(0, 11);
  return top.length ? top.reduce((s, v) => s + v, 0) / top.length : 40;
}
function fxRefresh() {
  const content = document.getElementById("tab-content");
  if (!content) return;
  const t = ui.tab;
  content.innerHTML = t === "calendar" ? renderCalendar() : t === "inbox" ? renderInbox() : (t === "reserve" || t === "u19") ? renderSubTeamTab(t === "reserve" ? "res" : "u19") : content.innerHTML;
  attachTabHandlers();
}
function fxControls() {
  return state.seasonComplete ? `
    <div class="season-banner">
      <strong>Saison terminée.</strong> Consultez vos finances et votre boîte de réception, puis lancez la saison suivante quand vous êtes prêt.
      <button class="btn btn-primary" id="next-season-btn">Passer à la saison suivante</button>
    </div>` : `
    <div class="calendar-controls">
      <button class="btn btn-primary" id="advance-day">Avancer d'un jour</button>
      <button class="btn btn-ghost" id="advance-event">Avancer jusqu'au prochain évènement</button>
      <button class="btn btn-ghost" id="advance-week">Simulation rapide (7 jours)</button>
    </div>`;
}
function fxSubNav(items, current, attr) {
  return `<div class="fx-subnav">${items.map(([k, l]) => `<button class="fx-subtab ${k === current ? "on" : ""}" ${attr}="${k}">${l}</button>`).join("")}</div>`;
}

// ---------------------------------------------------------------
// ÉQUIPES U19 / RÉSERVE — génération, saison, simulation
// ---------------------------------------------------------------
function fxGenPlayer(club, kind, pos, base) {
  const K = FX_KIND[kind];
  const p = generatePlayer(club.countryKey, pos, club.tierFactor || 0.4);
  p.age = randInt(K.ageMin, K.ageMax);
  p.overall = clamp(Math.round(base + randInt(-6, 6)), 30, 85);
  p.potential = clamp(p.overall + (kind === "u19" ? randInt(4, 18) : randInt(1, 10)), p.overall, 94);
  p.contractEndYear = state.season.year + randInt(1, 3);
  p.value = computeValue(p);
  p.wage = Math.max(300, Math.round(p.value * 0.002 / 100) * 100);
  p.clubId = club.id;
  p.seasonStats = { matches: 0, goals: 0, assists: 0 };
  p.morale = randInt(60, 90);
  return p;
}
function fxBaseLevel(club, kind) {
  const first = [...club.players].sort((a, b) => b.overall - a.overall).slice(0, 14).map(p => p.overall);
  const avg = first.length ? first.reduce((s, v) => s + v, 0) / first.length : 55;
  return avg - FX_KIND[kind].delta;
}
function fxGenSquad(club, kind) {
  const base = fxBaseLevel(club, kind), out = [];
  Object.keys(FX_QUOTAS).forEach(pos => { for (let i = 0; i < FX_QUOTAS[pos]; i++) out.push(fxGenPlayer(club, kind, pos, base)); });
  return out;
}
function fxRollSquad(club, kind, t) {
  const K = FX_KIND[kind], base = fxBaseLevel(club, kind);
  t.players.forEach(p => {
    p.age++;
    const gain = p.age <= 20 ? randInt(0, 4) : randInt(0, 2);
    p.overall = clamp(p.overall + gain, 30, Math.max(p.overall, p.potential));
    p.value = computeValue(p);
    p.seasonStats = { matches: 0, goals: 0, assists: 0 };
  });
  t.players = t.players.filter(p => p.age <= K.ageLimit);
  const count = pos => t.players.filter(p => p.position === pos).length;
  while (t.players.length < FX_SQUAD_SIZE) {
    const pos = Object.keys(FX_QUOTAS).sort((a, b) => (count(a) - FX_QUOTAS[a]) - (count(b) - FX_QUOTAS[b]))[0];
    t.players.push(fxGenPlayer(club, kind, pos, base));
  }
}
function fxBuildLeague(club, kind, t) {
  const K = FX_KIND[kind];
  const league = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
  t.lk = clubLeagueKey(club);
  t.leagueName = league.name;
  t.table = league.clubs.map(c => ({ id: c.id, name: c.name, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 }));
  t.rounds = league.fixtures.map(r => ({
    date: new Date(new Date(r.date).getTime() + K.dayOffset * 86400000).toISOString(),
    matches: r.matches.map(m => ({ home: m.home, away: m.away, played: false, homeGoals: null, awayGoals: null }))
  }));
}
function fxEnsureSubTeams(club) {
  if (!state.subTeams) state.subTeams = {};
  const st = state.subTeams[club.id] || (state.subTeams[club.id] = {});
  const yr = state.season.year, lk = clubLeagueKey(club);
  ["u19", "res"].forEach(kind => {
    let t = st[kind];
    if (!t) {
      t = st[kind] = { players: fxGenSquad(club, kind), season: yr };
      fxBuildLeague(club, kind, t);
      fxPlayDue(club, kind, t, fxDay(state.date.toISOString()));
    } else if (t.season !== yr || t.lk !== lk) {
      fxRollSquad(club, kind, t);
      t.season = yr;
      fxBuildLeague(club, kind, t);
      fxPlayDue(club, kind, t, fxDay(state.date.toISOString()));
    }
  });
  return st;
}
function fxStrength(club, kind, t, id, cache) {
  if (id === club.id) return fxTop11Avg(t.players);
  if (cache[id] == null) {
    const c = getClub(id);
    cache[id] = (c ? fxTop11Avg(c.players) : 50) - FX_KIND[kind].delta;
  }
  return cache[id];
}
function fxApply(row, gf, ga) {
  row.played++; row.gf += gf; row.ga += ga;
  if (gf > ga) { row.won++; row.points += 3; } else if (gf < ga) row.lost++; else { row.draw++; row.points += 1; }
}
function fxRandomName(club) {
  const pool = NAME_POOLS[COUNTRIES[club.countryKey].pool];
  return pick(pool.first).charAt(0) + ". " + pick(pool.last);
}
function fxSimMatch(club, kind, t, m, cache) {
  const sh = fxStrength(club, kind, t, m.home, cache) + 2, sa = fxStrength(club, kind, t, m.away, cache);
  const diff = sh - sa;
  m.homeGoals = Math.max(0, Math.round(gaussianAround(1.35 + diff / 30, 1.05)));
  m.awayGoals = Math.max(0, Math.round(gaussianAround(1.15 - diff / 30, 1.05)));
  m.played = true;
  fxApply(t.table.find(r => r.id === m.home), m.homeGoals, m.awayGoals);
  fxApply(t.table.find(r => r.id === m.away), m.awayGoals, m.homeGoals);
  if (m.home === club.id || m.away === club.id) {
    const mine = m.home === club.id;
    const mkSide = (goals, isMine) => {
      const list = [];
      for (let i = 0; i < goals; i++) {
        const minute = randInt(2, 90);
        if (isMine) {
          const w = t.players.map(p => ({ p, w: { ATT: 5, MIL: 2, DEF: 0.6, GB: 0 }[p.position] * (0.6 + p.overall / 100) }));
          const tot = w.reduce((s, x) => s + x.w, 0);
          let r = Math.random() * tot, sc = w[0].p;
          for (const x of w) { r -= x.w; if (r <= 0) { sc = x.p; break; } }
          sc.seasonStats.goals++;
          let assistName = null;
          if (Math.random() < 0.65) {
            const others = t.players.filter(p => p !== sc && p.position !== "GB");
            const a = others[randInt(0, others.length - 1)];
            if (a) { a.seasonStats.assists++; assistName = a.lastName; }
          }
          list.push({ name: `${sc.firstName.charAt(0)}. ${sc.lastName}`, minute, assistName });
        } else list.push({ name: fxRandomName(club), minute, assistName: null });
      }
      return list.sort((a, b) => a.minute - b.minute);
    };
    m.report = { homeScorers: mkSide(m.homeGoals, mine), awayScorers: mkSide(m.awayGoals, !mine) };
    [...t.players].sort((a, b) => b.overall - a.overall).slice(0, 14).forEach(p => p.seasonStats.matches++);
  }
}
function fxPlayDue(club, kind, t, todayKey, cache) {
  cache = cache || {};
  t.rounds.forEach(r => {
    if (fxDay(r.date) > todayKey) return;
    r.matches.forEach(m => { if (!m.played) fxSimMatch(club, kind, t, m, cache); });
  });
}
function tickSubTeams(todayKey) {
  (state.userClubIds || []).forEach(id => {
    const club = getClub(id);
    if (!club) return;
    const st = fxEnsureSubTeams(club);
    ["u19", "res"].forEach(kind => fxPlayDue(club, kind, st[kind], todayKey));
  });
}
function fxPromote(kind, playerId, dest) {
  const club = userClub(), st = fxEnsureSubTeams(club), t = st[kind];
  const i = t.players.findIndex(p => p.id === playerId);
  if (i < 0) return;
  const p = t.players.splice(i, 1)[0];
  if (dest === "res") {
    st.res.players.push(p);
    state.log.unshift({ date: fmtDate(state.date), text: `${p.firstName} ${p.lastName} rejoint l'équipe réserve.` });
  } else {
    p.contractEndYear = state.season.year + 3;
    p.clubId = club.id; p.listed = false;
    club.players.push(p);
    state.log.unshift({ date: fmtDate(state.date), text: `${p.firstName} ${p.lastName} (${p.age} ans, ${p.position}) est promu en équipe première.` });
  }
}

// ---------------------------------------------------------------
// TABLEAU DES RENCONTRES (commun équipe 1 / U19 / réserve)
// ---------------------------------------------------------------
function fxEntryFromMatch(club, iso, m, comp, extra) {
  const home = getClub(m.home), away = getClub(m.away);
  const userHome = m.home === club.id;
  return Object.assign({
    key: `${iso}|${m.home}|${m.away}|${comp}`, date: iso, time: fxTime(iso, m.home, m.away),
    homeClub: home, awayClub: away, homeName: home ? home.name : "?", awayName: away ? away.name : "?",
    userHome, played: !!m.played, hg: m.homeGoals, ag: m.awayGoals, pens: m.pens, comp, report: m.report || null
  }, extra || {});
}
function fxFirstTeamEntries(club) {
  const out = [];
  const league = state.countries[club.countryKey].leagues[clubLeagueKey(club)];
  league.fixtures.forEach((round, i) => {
    round.matches.forEach(m => {
      if (m.home === club.id || m.away === club.id) out.push(fxEntryFromMatch(club, round.date, m, `${league.name} — Journée ${i + 1}`));
    });
  });
  const cups = [state.cups.national[club.countryKey], state.cups.continental].filter(Boolean);
  cups.forEach(cup => {
    cup.rounds.forEach(round => {
      round.matches.forEach(m => {
        if (m.home === club.id || m.away === club.id) {
          const e = fxEntryFromMatch(club, round.date, m, `${cup.label} — ${cupRoundLabel(round.matches.length)}`);
          if (m.pens) e.comp += " (t.a.b.)";
          out.push(e);
        }
      });
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function fxSubEntries(club, kind) {
  const t = fxEnsureSubTeams(club)[kind], K = FX_KIND[kind], out = [];
  t.rounds.forEach((round, i) => {
    round.matches.forEach(m => {
      if (m.home === club.id || m.away === club.id) {
        const e = fxEntryFromMatch(club, round.date, m, `${K.comp} — Journée ${i + 1}`);
        e.homeName += K.suffix; e.awayName += K.suffix;
        out.push(e);
      }
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function fxOutcome(e) {
  if (!e.played) return null;
  const my = e.userHome ? e.hg : e.ag, op = e.userHome ? e.ag : e.hg;
  return my > op ? "w" : my < op ? "l" : "d";
}
function fxDetailHTML(e, club, ctx) {
  if (!e) return `<p class="hint">Aucune rencontre.</p>`;
  const oc = fxOutcome(e);
  const verdict = oc === "w" ? "Victoire" : oc === "l" ? "Défaite" : oc === "d" ? "Match nul" : "À venir";
  const sc = (list, side) => (list || []).map(g => `<li class="${side}">${side === "r" ? "⚽ " : ""}${fmEsc(g.name)} <b>${g.minute}'</b>${g.assistName ? ` <small>(${fmEsc(g.assistName)})</small>` : ""}${side === "l" ? " ⚽" : ""}</li>`).join("");
  const rep = e.report;
  const myLineup = rep && rep.homeLineup ? (e.userHome ? rep.homeLineup : rep.awayLineup) : null;
  return `
    <div class="fx-det-comp">${fmEsc(e.comp)}</div>
    <div class="fx-det-score">
      <div class="fx-det-team">${fxLogo(e.homeClub)}<span>${fmEsc(e.homeName)}</span></div>
      <div class="fx-det-box ${oc || "none"}">${e.played ? `${e.hg} - ${e.ag}` : "vs"}</div>
      <div class="fx-det-team">${fxLogo(e.awayClub)}<span>${fmEsc(e.awayName)}</span></div>
    </div>
    <div class="fx-det-verdict ${oc || "none"}">${verdict}</div>
    ${rep && (rep.homeScorers.length || rep.awayScorers.length) ? `<div class="fx-det-scorers"><ul>${sc(rep.homeScorers, "l")}</ul><ul>${sc(rep.awayScorers, "r")}</ul></div>` : ""}
    <div class="fx-det-meta">${fxDateShort(e.date)} · ${e.time}<br/>Stade de ${fmEsc((e.homeClub ? e.homeClub.name : e.homeName))}</div>
    ${rep && rep.motm ? `<div class="fx-det-motm">⭐ Homme du match : <b>${fmEsc(rep.motm)}</b></div>` : ""}
    ${myLineup ? `<div class="fx-ratings">${myLineup.map(p => `<div class="fx-rate-row"><span class="fm-pos ${fmPosClass(p.pos)}">${p.pos}</span><span class="fx-rate-name">${fmEsc(p.name)}</span><span class="fm-rt ${fmRtClass(p.rating)}">${p.rating != null ? p.rating.toFixed(1) : "–"}</span></div>`).join("")}</div>` : ""}
    ${!e.played && ctx === "first" ? `<button class="btn btn-small btn-ghost" data-h2h="${e.homeClub ? e.homeClub.id : 0}:${e.awayClub ? e.awayClub.id : 0}">Confrontations directes</button>` : ""}
    ${e.played && !rep ? `<p class="hint">Pas de compte rendu détaillé pour ce match.</p>` : ""}`;
}
function fxFixturesHTML(entries, ctx, club) {
  ui.fxSel = ui.fxSel || {};
  let sel = entries.find(e => e.key === ui.fxSel[ctx]);
  if (!sel) {
    const played = entries.filter(e => e.played);
    sel = played.length ? played[played.length - 1] : entries[0];
  }
  let lastMonth = "";
  const rows = entries.map(e => {
    const m = fxMonthLabel(e.date);
    const head = m !== lastMonth ? `<tr class="fx-month"><td colspan="6">${m}</td></tr>` : "";
    lastMonth = m;
    const opp = e.userHome ? e.awayClub : e.homeClub, oppName = e.userHome ? e.awayName : e.homeName, oc = fxOutcome(e);
    return `${head}<tr class="fx-row ${sel && sel.key === e.key ? "sel" : ""}" data-fxmatch="${fmEsc(e.key)}" data-fxctx="${ctx}">
      <td class="fx-c-date">${fxDateShort(e.date)}</td>
      <td class="fx-c-time">${e.time}</td>
      <td class="fx-c-opp">${fxLogo(opp)}<span>${fmEsc(oppName)}</span></td>
      <td class="fx-c-lieu"><span class="fx-venue ${e.userHome ? "d" : "e"}">${e.userHome ? "D" : "E"}</span></td>
      <td class="fx-c-res">${e.played ? `<i class="fx-dot ${oc}"></i>${e.hg} - ${e.ag}${e.pens ? " <small>(tab)</small>" : ""}` : `<span class="fx-dim">—</span>`}</td>
      <td class="fx-c-comp">${fmEsc(e.comp)}</td>
    </tr>`;
  }).join("");
  return `
    <div class="fx-split">
      <div class="fx-tablewrap" id="fx-tablewrap">
        <table class="fx-table">
          <thead><tr><th>Date</th><th>Heure</th><th>Adversaire</th><th>Lieu</th><th>Résultat</th><th>Compétition</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" class="fx-dim">Aucune rencontre programmée.</td></tr>`}</tbody>
        </table>
      </div>
      <aside class="fx-detail">${fxDetailHTML(sel, club, ctx)}</aside>
    </div>`;
}

// ---------------------------------------------------------------
// ONGLET CALENDRIER (équipe première)
// ---------------------------------------------------------------
function renderCalendar() {
  const club = userClub();
  const view = ui.calView || "fixtures";
  return `
    <div class="fm-dark fm-panel">
      <h2 class="fm-title">Calendrier <span>${fmEsc(club.name)} · ${fmtDate(state.date)} · Saison ${state.season.year}</span></h2>
      ${fxControls()}
      ${fxSubNav([["fixtures", "Rencontres"], ["table", "Classements"]], view, "data-fxcal")}
      ${view === "table" ? `<div class="fx-classic">${renderCalendarClassic("table")}</div>` : fxFixturesHTML(fxFirstTeamEntries(club), "first", club)}
    </div>`;
}

// ---------------------------------------------------------------
// ONGLETS ÉQUIPE RÉSERVE / U19
// ---------------------------------------------------------------
function fxSquadTable(kind, t, club) {
  const K = FX_KIND[kind];
  const rows = [...t.players].sort((a, b) => b.overall - a.overall);
  return `
    <div class="table-scroll"><table class="fm-table fx-squad">
      <thead><tr><th>Poste</th><th>Nom</th><th>Âge</th><th>Niveau</th><th>Potentiel</th><th>Matchs</th><th>Buts</th><th>Passes déc.</th><th>Salaire</th><th>Valeur</th><th></th></tr></thead>
      <tbody>${rows.map(p => `<tr>
        <td><span class="fm-pos ${fmPosClass(p.position)}">${p.position}</span></td>
        <td class="fm-nm">${fmEsc(p.firstName)} <b>${fmEsc(p.lastName)}</b></td>
        <td>${p.age}</td>
        <td>${starsHtml(overallStars(p.overall))}</td>
        <td>${starsHtml(overallStars(p.potential))}</td>
        <td>${p.seasonStats.matches}</td><td>${p.seasonStats.goals}</td><td>${p.seasonStats.assists}</td>
        <td>${fmtMoney(p.wage)}</td>
        <td><span class="fm-pill">${fmtMoney(p.value)}</span></td>
        <td class="fm-actions">
          ${kind === "u19" ? `<button class="btn btn-small btn-ghost" data-fxpromote="u19:${p.id}:res">→ Réserve</button>` : ""}
          <button class="btn btn-small btn-primary" data-fxpromote="${kind}:${p.id}:pro">Promouvoir en équipe 1</button>
        </td>
      </tr>`).join("")}</tbody>
    </table></div>`;
}
function fxCompHTML(kind, t, club) {
  const K = FX_KIND[kind];
  const table = [...t.table].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const top = [...t.players].filter(p => p.seasonStats.goals > 0).sort((a, b) => b.seasonStats.goals - a.seasonStats.goals).slice(0, 8);
  return `
    <h3 class="panel-subtitle">${fmEsc(K.comp)} — ${fmEsc(t.leagueName)}</h3>
    <table class="squad-table standings">
      <thead><tr><th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff.</th><th>Pts</th></tr></thead>
      <tbody>${table.map((c, i) => `<tr class="${c.id === club.id ? "me" : ""}">
        <td>${i + 1}</td><td>${fmEsc(c.name + K.suffix)}</td><td>${c.played}</td><td>${c.won}</td><td>${c.draw}</td><td>${c.lost}</td><td>${c.gf}</td><td>${c.ga}</td><td>${c.gf - c.ga}</td><td><b>${c.points}</b></td>
      </tr>`).join("")}</tbody>
    </table>
    <h3 class="panel-subtitle">Meilleurs buteurs de votre équipe</h3>
    <table class="squad-table">
      <thead><tr><th>Joueur</th><th>Poste</th><th>Buts</th><th>Passes déc.</th></tr></thead>
      <tbody>${top.map(p => `<tr><td>${fmEsc(p.firstName)} ${fmEsc(p.lastName)}</td><td>${p.position}</td><td>${p.seasonStats.goals}</td><td>${p.seasonStats.assists}</td></tr>`).join("") || `<tr><td colspan="4" class="hint">Pas encore de buts marqués cette saison.</td></tr>`}</tbody>
    </table>`;
}
function renderSubTeamTab(kind) {
  const club = userClub(), K = FX_KIND[kind];
  const t = fxEnsureSubTeams(club)[kind];
  ui.subView = ui.subView || {};
  const view = ui.subView[kind] || "calendar";
  let body = "";
  if (view === "calendar") body = fxFixturesHTML(fxSubEntries(club, kind), kind, club);
  else if (view === "squad") body = `<p class="hint">${t.players.length} joueurs · moyenne des 11 meilleurs : ${Math.round(fxTop11Avg(t.players))}. Les jeunes qui progressent peuvent être promus.</p>${fxSquadTable(kind, t, club)}`;
  else body = fxCompHTML(kind, t, club);
  return `
    <div class="fm-dark fm-panel" data-fxkind="${kind}">
      <h2 class="fm-title">${K.label} <span>${fmEsc(club.name)} · ${fmtDate(state.date)} · Saison ${state.season.year}</span></h2>
      ${fxControls()}
      ${fxSubNav([["calendar", "Calendrier"], ["squad", "Effectif"], ["comp", "Compétition"]], view, "data-fxsub")}
      ${body}
    </div>`;
}

// ---------------------------------------------------------------
// BOÎTE DE RÉCEPTION (liste + lecture)
// ---------------------------------------------------------------
function fxInboxMessages() {
  const club = userClub();
  const msgs = [];
  const today = state.date.toISOString().slice(0, 10);

  state.inbox.filter(o => !o.resolved && o.type === "job_offer").forEach(o => {
    const target = getClub(o.clubId);
    if (target) msgs.push({ key: "inb:" + o.id, kind: "job", unread: true, sender: "Conseil d'administration", subject: `Offre de ${target.name}`, date: o.date, o });
  });
  state.inbox.filter(o => !o.resolved && o.type === "player_event").forEach(o => {
    const p = getPlayer(o.playerId);
    if (p) msgs.push({ key: "inb:" + o.id, kind: "event", unread: true, sender: `${p.firstName} ${p.lastName}`, subject: "Demande d'un joueur", date: o.date, o });
  });
  state.inbox.filter(o => !o.resolved && o.type !== "job_offer" && o.type !== "player_event").forEach(o => {
    const p = getPlayer(o.playerId), buyer = getClub(o.fromClubId);
    if (p && buyer) msgs.push({ key: "inb:" + o.id, kind: "offer", unread: true, sender: buyer.name, subject: `Offre pour ${p.firstName} ${p.lastName}`, date: o.date, o });
  });

  const unavailable = club.players.filter(p => !p.onLoan && ((p.injuredUntil && p.injuredUntil >= today) || p.suspendedMatches > 0));
  msgs.push({ key: "med", kind: "med", unread: unavailable.length > 0, sender: "Centre médical", subject: `Point médical : ${unavailable.length} indisponible(s)`, date: fmtDate(state.date), unavailable });

  state.inbox.filter(o => o.resolved && o.type !== "job_offer" && o.type !== "player_event").slice(0, 8).forEach(o => {
    const p = getPlayer(o.playerId) || { firstName: "Joueur", lastName: "parti" };
    msgs.push({ key: "inb:" + o.id, kind: "done", sender: "Direction sportive", subject: `Offre ${o.accepted ? "acceptée" : "refusée"} : ${p.firstName} ${p.lastName}`, date: o.date, text: `Offre de ${fmtMoney(o.amount)} pour ${p.firstName} ${p.lastName} : ${o.accepted ? "acceptée" : "refusée"}.` });
  });
  state.log.slice(0, 40).forEach((l, i) => {
    const isRes = /^Résultat/.test(l.text);
    msgs.push({ key: "log:" + i, kind: "log", sender: isRes ? "Secrétariat du club" : "Direction", subject: l.text.length > 70 ? l.text.slice(0, 68) + "…" : l.text, date: l.date, text: l.text });
  });
  return msgs;
}
function fxMsgBody(m) {
  if (m.kind === "job") {
    const o = m.o, target = getClub(o.clubId);
    return `<div class="fx-callout">Opportunité de carrière</div>
      <p><b>${fmEsc(target.name)}</b> souhaite vous recruter comme directeur sportif.</p>
      <p class="hint">Réputation du club : ${target.reputation} · ${COUNTRIES[target.countryKey].label} · ${o.date}</p>
      <div class="offer-actions"><button class="btn btn-small btn-primary" data-jobaccept="${o.id}">Accepter</button> <button class="btn btn-small btn-ghost" data-jobreject="${o.id}">Refuser</button></div>`;
  }
  if (m.kind === "event") {
    const ev = m.o, p = getPlayer(ev.playerId);
    return `<div class="fx-callout">À traiter</div>
      <p>${PLAYER_EVENT_TEXT[ev.kind](p)}</p>
      <p class="hint">${p.position} · ${p.overall} · moral ${p.morale}% · salaire ${fmtMoney(p.wage)}/mois · contrat ${p.contractEndYear} · ${ev.date}</p>
      <div class="offer-actions" style="flex-wrap:wrap;">${playerEventChoices(ev).map(([c, l]) => `<button class="btn btn-small ${c === "refuse" || c === "ignore" ? "btn-ghost" : "btn-primary"}" data-evchoice="${ev.id}:${c}">${l}</button>`).join("")}
      <button class="btn btn-small btn-ghost" data-playercard="${p.id}">Fiche</button></div>`;
  }
  if (m.kind === "offer") {
    const o = m.o, p = getPlayer(o.playerId), buyer = getClub(o.fromClubId);
    const ratio = o.amount / Math.max(1, p.value);
    const label = ratio >= 0.9 ? "Offre excellente" : ratio >= 0.6 ? "Offre correcte" : "Offre faible";
    return `<div class="fx-callout">${label}</div>
      <p><b>${fmEsc(buyer.name)}</b> propose <b>${fmtMoney(o.amount)}</b> pour <b>${fmEsc(p.firstName)} ${fmEsc(p.lastName)}</b> (${p.position}, ${p.overall} global).</p>
      <p class="hint">Valeur estimée ${fmtMoney(p.value)} · ${o.date}</p>
      <div class="offer-actions"><button class="btn btn-small btn-primary" data-accept="${o.id}">Accepter</button> <button class="btn btn-small btn-ghost" data-reject="${o.id}">Refuser</button></div>`;
  }
  if (m.kind === "med") {
    const today = state.date.toISOString().slice(0, 10);
    return `<div class="fx-callout">Le centre médical est le lieu où vous suivez l'état physique de vos joueurs.</div>
      <p>Voici le point sur les joueurs indisponibles de ${fmEsc(userClub().name)}.</p>
      ${m.unavailable.length ? `<table class="fx-mini"><thead><tr><th>Joueur</th><th>Poste</th><th>Motif</th><th>Retour</th></tr></thead><tbody>
        ${m.unavailable.map(p => { const inj = p.injuredUntil && p.injuredUntil >= today; return `<tr><td>${fmEsc(p.firstName)} <b>${fmEsc(p.lastName)}</b></td><td>${p.position}</td><td>${inj ? "Blessure" : "Suspension"}</td><td>${inj ? fmtDate(new Date(p.injuredUntil)) : p.suspendedMatches + " match(s)"}</td></tr>`; }).join("")}
      </tbody></table>` : `<p class="hint">Aucun blessé ni suspendu : tout l'effectif est disponible.</p>`}`;
  }
  return `<p>${fmEsc(m.text)}</p><p class="hint">${m.date}</p>`;
}
function renderInbox() {
  ui.inboxView = ui.inboxView || "inbox";
  let body;
  if (ui.inboxView === "world") {
    body = `<div class="fx-newslist">${state.news.slice(0, 40).map(n => `<div class="fx-newsrow"><span class="fx-newsdate">${n.date}</span>${fmEsc(n.text)}</div>`).join("") || `<p class="hint">Rien à signaler.</p>`}</div>`;
  } else {
    const msgs = fxInboxMessages();
    let sel = msgs.find(m => m.key === ui.inboxSel) || msgs[0];
    body = `
      <div class="fx-mail">
        <div class="fx-maillist">${msgs.map(m => `
          <button class="fx-mailitem ${m.unread ? "unread" : ""} ${sel && sel.key === m.key ? "sel" : ""}" data-msg="${fmEsc(m.key)}">
            <span class="fx-mfrom">${fmEsc(m.sender)}<em>${fmEsc(m.date)}</em></span>
            <span class="fx-msub">${fmEsc(m.subject)}</span>
          </button>`).join("")}</div>
        <article class="fx-mailread">
          ${sel ? `<div class="fx-rfrom">De : ${fmEsc(sel.sender)}</div><h3 class="fx-rsub">${fmEsc(sel.subject)}</h3><div class="fx-rdate">${fmEsc(sel.date)}</div>${fxMsgBody(sel)}` : `<p class="hint">Aucun message.</p>`}
        </article>
      </div>`;
  }
  const pending = state.inbox.filter(o => !o.resolved).length;
  return `
    <div class="fm-dark fm-panel">
      <h2 class="fm-title">Boîte de réception <span>${pending ? pending + " à traiter" : "Tout est à jour"}</span></h2>
      ${fxSubNav([["inbox", "Boîte de réception"], ["world", "Autour du monde"]], ui.inboxView, "data-fxinbox")}
      ${ui.eventMessage ? `<p class="hint result-good">${ui.eventMessage}</p>` : ""}
      ${body}
    </div>`;
}

// ---------------------------------------------------------------
// GESTION DES CLICS (ajoutée à attachTabHandlers)
// ---------------------------------------------------------------
const fxOriginalAttach = attachTabHandlers;
attachTabHandlers = function () {
  fxOriginalAttach();
  document.querySelectorAll("[data-fxcal]").forEach(b => { b.onclick = () => { ui.calView = b.dataset.fxcal; fxRefresh(); }; });
  document.querySelectorAll("[data-fxsub]").forEach(b => {
    b.onclick = () => { const k = b.closest("[data-fxkind]").dataset.fxkind; ui.subView = ui.subView || {}; ui.subView[k] = b.dataset.fxsub; fxRefresh(); };
  });
  document.querySelectorAll("[data-fxinbox]").forEach(b => { b.onclick = () => { ui.inboxView = b.dataset.fxinbox; fxRefresh(); }; });
  document.querySelectorAll("[data-msg]").forEach(b => { b.onclick = () => { ui.inboxSel = b.dataset.msg; fxRefresh(); }; });
  document.querySelectorAll("[data-fxmatch]").forEach(r => {
    r.onclick = () => { ui.fxSel = ui.fxSel || {}; ui.fxSel[r.dataset.fxctx] = r.dataset.fxmatch; fxRefresh(); };
  });
  document.querySelectorAll("[data-fxpromote]").forEach(b => {
    b.onclick = () => {
      const [kind, id, dest] = b.dataset.fxpromote.split(":");
      fxPromote(kind, parseInt(id, 10), dest);
      saveGame();
      render();
    };
  });
  const wrap = document.getElementById("fx-tablewrap"), sel = wrap && wrap.querySelector("tr.sel");
  if (wrap && sel) wrap.scrollTop = Math.max(0, sel.offsetTop - wrap.clientHeight / 2);
};
