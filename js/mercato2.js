// ===================================================================
// BLOC 23 (3/4) — MERCATO EN DIRECT : classement des transferts et offres surprises
//  - journal de TOUS les transferts du monde simulé (fenêtre d'été / d'hiver)
//  - classement : plus gros transferts, meilleures affaires, plus gros départs de votre club
//  - 72 dernières heures : offres surprises (chèque XXL, échange, prêt avec option), bombes entre grands clubs,
//    dossiers que l'on vous coiffe au poteau ; bilan classé envoyé à la fermeture
// ===================================================================
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pk = (a) => a[Math.floor(Math.random() * a.length)];
  const hasState = () => typeof state !== "undefined" && state && state.ds && state.countries && typeof userClub === "function" && !!userClub();
  const day = () => state.dayCounter || 0;
  const money = (v) => { try { return fmtMoney(v); } catch (e) { return Math.round(v) + " €"; } };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const POS = { GB: "G", DEF: "D", MIL: "M", ATT: "A" };
  const M2 = () => { state.mk = state.mk || { log: [], bilan: {}, surprise: {}, last: null }; return state.mk; };

  function winLabel(date) { try { const w = currentWindow(date || state.date); return w ? w.name : null; } catch (e) { return null; } }
  function winKey(date) { const w = winLabel(date); if (!w) return null; const d = new Date(date || state.date); return w + " " + (d.getUTCMonth() < 4 ? d.getUTCFullYear() - 1 : d.getUTCFullYear()); }
  function daysToClose() {
    if (!winLabel()) return null;
    for (let k = 1; k <= 120; k++) { if (!winLabel(new Date(state.date.getTime() + k * 864e5))) return k - 1; }
    return null;
  }

  // ---------- journal ----------
  const oTr = window.transferPlayer;
  if (typeof oTr === "function") window.transferPlayer = function (player, fromId, toId, fee) {
    let from = null, to = null; try { from = getClub(fromId); to = getClub(toId); } catch (e) {}
    const r = oTr.apply(this, arguments);
    try {
      if (hasState() && from && to && fee > 0) {
        const L = M2().log;
        L.unshift({ day: day(), date: fmtDate(state.date), key: winKey() || "hors fenêtre", pid: player.id, name: `${player.firstName} ${player.lastName}`, pos: player.position, age: player.age, ovr: player.overall, value: player.value || fee, fee,
          from: from.name, to: to.name, fid: from.id, tid: to.id, hour: ri(8, 23), mine: isUserClub(from.id) ? "out" : isUserClub(to.id) ? "in" : "" });
        if (L.length > 400) L.length = 400;
      }
    } catch (e) {}
    return r;
  };

  // ---------- classements ----------
  function rank(key) {
    const L = M2().log.filter((x) => x.key === key);
    const top = L.slice().sort((a, b) => b.fee - a.fee).slice(0, 8);
    const deals = L.filter((x) => x.ovr >= 62 && x.fee > 0).map((x) => ({ ...x, score: (x.value / x.fee) * (x.ovr / 70) })).filter((x) => x.value >= x.fee * 1.1).sort((a, b) => b.score - a.score).slice(0, 5);
    const mine = L.filter((x) => x.mine).sort((a, b) => b.fee - a.fee).slice(0, 5);
    const spend = {}; L.forEach((x) => { spend[x.to] = (spend[x.to] || 0) + x.fee; });
    const big = Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { L, top, deals, mine, big };
  }
  function keys() { const s = []; M2().log.forEach((x) => { if (!s.includes(x.key)) s.push(x.key); }); return s; }

  // ---------- 72 dernières heures ----------
  function surprises() {
    const club = userClub(), d = daysToClose(), M = M2(), today = fmtDate(state.date);
    if (d == null || d > 3 || M.surprise[today]) return;
    M.surprise[today] = true;
    const others = allClubs().filter((c) => !isUserClub(c.id));
    const tag = d === 0 ? "dernier jour" : d === 1 ? "dernières 48 heures" : "dernières 72 heures";
    // 1) offre surprise pour un cadre
    if (Math.random() < 0.55) {
      const cand = club.players.filter((p) => !p.onLoan).sort((a, b) => b.value - a.value).slice(0, 7);
      const p = cand.length ? pk(cand) : null;
      const buyers = p ? others.filter((c) => c.budget >= p.value * 1.3 && c.reputation >= club.reputation - 8) : [];
      if (p && buyers.length && !state.inbox.some((o) => o.type === "offer_incoming" && !o.resolved && o.playerId === p.id)) {
        const b = pk(buyers), kind = pk(["xxl", "xxl", "swap", "loan"]);
        let amount = Math.round(p.value * (kind === "xxl" ? ri(130, 175) : ri(110, 130)) / 100 / 1000) * 1000, terms = null;
        if (kind === "swap") { const q = b.players.filter((x) => x.position !== "GB" && x.value > amount * 0.12 && x.value < amount * 0.5).sort((x, y) => y.overall - x.overall)[0]; if (q) terms = { up: 1, yrs: 1, exchangePid: q.id }; }
        state.inbox.unshift({ id: nextId(), type: "offer_incoming", playerId: p.id, fromClubId: b.id, amount, date: today, resolved: false, deadline: true, surprise: true, terms });
        const txt = kind === "xxl" ? `chèque XXL de ${b.name} : ${money(amount)} pour ${p.firstName[0]}. ${p.lastName}` : kind === "swap" ? `${b.name} propose un échange pour ${p.lastName}` : `${b.name} veut ${p.lastName} avec une offre inattendue (${money(amount)})`;
        mail("transferts", "Mercato", `🔥 Offre surprise (${tag})`, `<p>${esc(txt)}. L'offre est valable jusqu'à la fermeture du mercato.</p>`);
        note("🔥 Offre surprise : " + txt + ".");
      }
    }
    // 2) bombe entre deux grands clubs
    if (Math.random() < 0.7) {
      const rich = others.filter((c) => c.reputation >= 60).sort((a, b) => b.budget - a.budget).slice(0, 8);
      const buyer = rich.length ? pk(rich) : null;
      const sellers = buyer ? others.filter((c) => c.id !== buyer.id && c.reputation >= 45 && c.players.length > 18) : [];
      if (buyer && sellers.length) {
        const s = pk(sellers), p = s.players.filter((x) => !x.onLoan).sort((a, b) => b.value - a.value)[0];
        if (p) { const fee = Math.round(p.value * ri(125, 165) / 100 / 1000) * 1000; if (buyer.budget >= fee) { try { transferPlayer(p, s.id, buyer.id, fee); state.news.unshift({ date: today, text: `💣 Bombe du mercato : ${p.firstName} ${p.lastName} quitte ${s.name} pour ${buyer.name} (${money(fee)}).` }); } catch (e) {} } }
      }
    }
    // 3) un dossier suivi vous file sous le nez
    if (d <= 2 && Math.random() < 0.4) {
      const sl = (club.scouting && club.scouting.shortlist) || [];
      const tgt = sl.map(getPlayer).filter((p) => p && p.clubId !== club.id)[0];
      if (tgt) {
        const rich = others.filter((c) => c.id !== tgt.clubId && c.budget >= tgt.value * 1.2);
        if (rich.length) { const b = pk(rich); try { transferPlayer(tgt, tgt.clubId, b.id, Math.round(tgt.value * 1.15 / 1000) * 1000); mail("transferts", "Mercato", "💔 Vous vous faites doubler", `<p>${esc(b.name)} boucle le transfert de ${esc(tgt.firstName + " " + tgt.lastName)}, que vous suiviez.</p>`); } catch (e) {} }
      }
    }
  }
  function expireSurprises() {
    const today = fmtDate(state.date);
    (state.inbox || []).forEach((o) => { if (o.surprise && !o.resolved && o.date !== today && !winLabel()) { o.resolved = true; o.expired = true; } });
  }
  function closing() {
    const M = M2();
    // le lendemain de la fermeture : bilan classé
    const prev = new Date(state.date.getTime() - 864e5);
    const k = winKey(prev);
    if (!winLabel() && k && !M.bilan[k]) {
      M.bilan[k] = true;
      const r = rank(k); if (!r.L.length) return;
      mail("transferts", "Mercato", `Bilan du mercato : ${k}`, `<p><b>${r.L.length}</b> transferts payants dans le monde simulé.</p><p>Top 3 : ${r.top.slice(0, 3).map((x, i) => `${i + 1}. ${esc(x.name)} (${esc(x.from)} → ${esc(x.to)}, ${money(x.fee)})`).join("<br>")}</p>${r.big.length ? `<p class="hint">Clubs les plus dépensiers : ${r.big.slice(0, 3).map(([n, v]) => esc(n) + " " + money(v)).join(", ")}</p>` : ""}`);
    }
  }

  // ---------- interface (onglet Recrutement) ----------
  function panel() {
    if (!hasState()) return "";
    const M = M2(), ks = keys(), cur = winKey() || ks[0], dc = daysToClose();
    const view = M.view && ks.includes(M.view) ? M.view : cur;
    const r = view ? rank(view) : { L: [], top: [], deals: [], mine: [], big: [] };
    const row = (x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)} <span class="hint">${POS[x.pos] || ""} · ${x.age} ans</span></td><td>${esc(x.from)} → ${esc(x.to)}</td><td>${money(x.fee)}</td></tr>`;
    const feed = M.log.filter((x) => x.day >= day() - 1).slice(0, 8).sort((a, b) => b.day - a.day || b.hour - a.hour);
    const open = dc != null && dc <= 3;
    return `<details class="dossier mk-card" id="mk-panel" ${open ? "open" : ""}><summary><b>🔥 Mercato en direct</b>${dc != null ? ` — <span class="${dc <= 1 ? "result-bad" : "hint"}">fermeture dans ${dc} jour${dc > 1 ? "s" : ""}</span>` : ` <span class="hint">(fenêtre fermée)</span>`}</summary>
      ${ks.length > 1 ? `<div class="mk-tabs">${ks.slice(0, 4).map((k) => `<button class="tab-chip ${k === view ? "active" : ""}" data-mk="${esc(k)}">${esc(k)}</button>`).join("")}</div>` : ""}
      ${r.L.length ? `<h4 class="fm-h">Classement des plus gros transferts</h4><div class="table-wrap"><table class="fm-table"><thead><tr><th>#</th><th>Joueur</th><th>Trajet</th><th>Prix</th></tr></thead><tbody>${r.top.map(row).join("")}</tbody></table></div>
        ${r.deals.length ? `<h4 class="fm-h">Meilleures affaires</h4><div class="table-wrap"><table class="fm-table"><tbody>${r.deals.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)} <span class="hint">${x.ovr} de niveau</span></td><td>${esc(x.to)}</td><td>${money(x.fee)} <span class="hint">(valeur ${money(x.value)})</span></td></tr>`).join("")}</tbody></table></div>` : ""}
        ${r.big.length ? `<p class="hint">Clubs les plus dépensiers : ${r.big.map(([n, v]) => esc(n) + " " + money(v)).join(" · ")}</p>` : ""}
        ${feed.length ? `<h4 class="fm-h">Dernières heures</h4>${feed.map((x) => `<p class="hint" style="margin:2px 0">${String(x.hour).padStart(2, "0")}h · ${esc(x.name)} : ${esc(x.from)} → ${esc(x.to)} (${money(x.fee)})</p>`).join("")}` : ""}` : `<p class="hint">Aucun transfert enregistré pour l'instant.</p>`}
    </details>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-mk]"); if (!b || !hasState()) return;
    M2().view = b.dataset.mk; try { render(); } catch (x) {}
  });
  const oAdv = window.advanceDay;
  if (typeof oAdv === "function") window.advanceDay = function () {
    const r = oAdv.apply(this, arguments);
    try { if (hasState()) { surprises(); closing(); expireSurprises(); } } catch (e) { console.warn("mercato2", e); }
    return r;
  };
  const oM = window.renderMarket;
  if (typeof oM === "function") window.renderMarket = function () { const b = oM.apply(this, arguments); try { return panel() + b; } catch (e) { return b; } };
  window.dsMercato = { M2, rank, surprises, daysToClose, panel, keys, winKey };
})();
