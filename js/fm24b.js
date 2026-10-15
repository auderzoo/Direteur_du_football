// =====================================================================
// BLOC 6 — « Continuer » façon FM24 + boîte de réception à dossiers
//  - bouton Continuer en haut (menu : évènement, match, 1 jour, 1 semaine, fin du mercato)
//  - s'arrête sur les évènements : match, offre, message, popup, fin de saison
//  - boîte de réception : dossiers, compteurs, lu / non lu, lecture, version mobile
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const anyModal = () => !!document.querySelector(".modal-backdrop");
  const toast = (m) => { try { window.dsToast && window.dsToast(m); } catch (e) {} };

  // ---------- messages additionnels (scouting, prêts, contrats…) ----------
  window.dsMail = function (folder, sender, subject, html) {
    if (!state) return;
    state.mail = state.mail || [];
    state.mail.unshift({ id: "m" + (state.mailSeq = (state.mailSeq || 0) + 1), folder, sender, subject, html, date: fmtDate(state.date) });
    if (state.mail.length > 250) state.mail.length = 250;
  };

  // ===================================================================
  // CONTINUER
  // ===================================================================
  function pendingCount() { return state.inbox.filter((o) => !o.resolved).length; }
  function snap() { return { inbox: pendingCount(), mail: (state.mail || []).length, log: state.log.length, news: state.news.length }; }
  function stopped() {
    return !!(state.lastMatchResult || state.lastCupResult || state.seasonComplete ||
      (state.media && state.media.pending) || (state.fm && state.fm.pending));
  }
  function runDays(mode) {
    const club = userClub();
    const b = snap();
    let days = 0, reason = "";
    const max = mode === "day" ? 1 : mode === "week" ? 7 : mode === "window" ? 70 : 30;
    const wasOpen = !!currentWindow();
    for (let i = 0; i < max; i++) {
      advanceDay(); days++;
      if (state.seasonComplete) { reason = "Saison terminée"; break; }
      if (mode === "day") { reason = ""; break; }
      if (state.lastMatchResult) { reason = "Match joué"; break; }
      if (state.lastCupResult) { reason = "Match de coupe"; break; }
      if (state.media && state.media.pending) { reason = "Question de la presse"; break; }
      if (state.fm && state.fm.pending) { reason = "Un joueur demande à vous voir"; break; }
      if (pendingCount() > b.inbox) { reason = "Nouveau message"; break; }
      if ((state.mail || []).length > b.mail && mode !== "week") { reason = "Nouveau rapport"; break; }
      if (mode === "window" && !currentWindow()) { reason = "Mercato terminé"; break; }
      if (mode === "window" && !wasOpen && currentWindow()) { reason = "Mercato ouvert"; break; }
    }
    if (mode === "match" && !reason) reason = "Pas de match dans les 30 jours";
    return { days, reason };
  }
  window.dsContinue = function (mode) {
    if (!state || !state.ds || anyModal()) return;
    ui.matchModalShown = false; ui.moreOpen = false;
    if (state.seasonComplete) {
      if (!confirm("Lancer la saison suivante ? Les contrats, transferts et finances de fin de saison seront traités.")) return;
      triggerNextSeason(); saveGame(); render(); toast("Nouvelle saison"); return;
    }
    mode = mode || "event";
    if (mode === "match") {
      // jusqu'au prochain match du club
      let r = { days: 0, reason: "" };
      for (let i = 0; i < 30 && !state.seasonComplete; i++) {
        const x = runDays("day"); r.days += x.days;
        if (state.lastMatchResult || state.lastCupResult) { r.reason = "Match joué"; break; }
        if (stopped()) break;
      }
      saveGame(); render(); toast(`${r.days} j · ${r.reason || "Pas de match proche"}`); return;
    }
    const r = runDays(mode);
    saveGame(); render();
    toast(`${r.days} jour${r.days > 1 ? "s" : ""}${r.reason ? " · " + r.reason : ""}`);
  };

  function continueLabel() {
    if (state.seasonComplete) return "Saison suivante";
    return "Continuer";
  }
  function continueHTML() {
    const done = state.seasonComplete;
    const items = [["event", "Jusqu'au prochain évènement"], ["match", "Jusqu'au prochain match"], ["day", "Un jour"], ["week", "Une semaine"], ["window", "Jusqu'à la fin du mercato"]];
    const pend = pendingCount();
    return `<div class="cont-wrap" id="cont-wrap">
      <button class="cont-main" id="cont-main" title="Avancer dans le temps">${esc(continueLabel())} <span class="cont-arrow">▶</span></button>
      ${done ? "" : `<button class="cont-more" id="cont-more" aria-label="Autres options d'avancement">▾</button>
      <div class="cont-menu" id="cont-menu" hidden>${items.map(([k, l]) => `<button data-cont="${k}">${l}</button>`).join("")}</div>`}
      ${pend ? `<span class="cont-badge" title="Messages à traiter">${pend}</span>` : ""}
    </div>`;
  }

  const origDash = window.renderDashboard;
  window.renderDashboard = function () {
    const r = origDash.apply(this, arguments);
    try {
      const host = document.querySelector(".scoreboard");
      if (host && !document.getElementById("cont-wrap")) {
        const sc = host.querySelector(".sb-center");
        const wrap = document.createElement("div");
        wrap.className = "sb-continue";
        wrap.innerHTML = continueHTML();
        host.insertBefore(wrap, sc ? sc.nextSibling : null);
        document.getElementById("cont-main").onclick = () => window.dsContinue("event");
        const more = document.getElementById("cont-more"), menu = document.getElementById("cont-menu");
        if (more) more.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
        wrap.querySelectorAll("[data-cont]").forEach((b) => { b.onclick = () => { menu.hidden = true; window.dsContinue(b.dataset.cont); }; });
      }
      // la barre du bas mobile utilise aussi « Continuer »
      const adv = document.getElementById("bn-advance");
      if (adv) {
        const lb = adv.querySelector(".bn-lb"); if (lb) lb.textContent = state.seasonComplete ? "Saison +1" : "Continuer";
        adv.onclick = () => window.dsContinue("event");
      }
    } catch (e) { console.error(e); }
    return r;
  };
  document.addEventListener("click", (e) => {
    const m = document.getElementById("cont-menu");
    if (m && !m.hidden && !e.target.closest("#cont-wrap")) m.hidden = true;
  });
  // raccourci clavier : Espace = Continuer (hors champ de saisie)
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.target.closest("input,textarea,select,button")) return;
    if (ui.screen !== "dashboard" || anyModal()) return;
    e.preventDefault(); window.dsContinue("event");
  });

  // ===================================================================
  // BOÎTE DE RÉCEPTION
  // ===================================================================
  const FOLDERS = [
    ["all", "📥", "Tous les messages"],
    ["todo", "❗", "À traiter"],
    ["transfers", "💱", "Transferts"],
    ["players", "👤", "Joueurs"],
    ["match", "⚽", "Matchs & résultats"],
    ["scout", "🔭", "Scouting"],
    ["finance", "💰", "Finances"],
    ["med", "🩺", "Médical"],
    ["rumors", "🗞️", "Rumeurs"],
    ["club", "🏟️", "Club"],
    ["world", "🌍", "Autour du monde"]
  ];
  const ICON = { job: "💼", event: "👤", offer: "💱", med: "🩺", done: "✔️", log: "📰", scout: "🔭", loan: "🔁", contract: "✍️", youth: "🎓", news: "🌍" };
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  // ---------- tous les évènements du journal deviennent des messages ----------
  const SKIP = /^(Rapport de |Observation terminée|Suivi : |Clauses signées|Rapport ciblé)/;
  function classify(t) {
    if (/bless|suspen|médic|rétabli|infirmerie|forfait/i.test(t)) return ["med", "Centre médical"];
    if (/scout|recruteur/i.test(t)) return ["scout", "Cellule de recrutement"];
    if (/prêt|transf|offre|signe|recrut|vend|clause|contrat|mercato|agent|libre|rachat/i.test(t)) return ["transfers", "Direction sportive"];
    if (/promesse|moral|mentor|progresse|développement|capitaine|vestiaire|mécontent|retraite|régen|joueur|jeune/i.test(t)) return ["players", "Vestiaire"];
    if (/budget|financ|prime|sponsor|salaire|revenu|dette|€|trésorerie|billetterie/i.test(t)) return ["finance", "Service financier"];
    if (/résultat|victoire|défaite|match nul|match|coupe|classement|champion|saison|journée|promu|relég/i.test(t)) return ["match", "Secrétariat du club"];
    return ["club", "Direction"];
  }
  const LOGICON = { med: "🩺", scout: "🔭", transfers: "💱", players: "👤", finance: "💰", match: "⚽", club: "🏟️" };
  function syncLog() {
    if (!state || !state.log) return;
    const init = !state.logSeen;
    const seen = state.logSeen || (state.logSeen = {});
    for (let i = state.log.length - 1; i >= 0; i--) {
      const l = state.log[i];
      const k = hash((l.date || "") + "|" + l.text);
      if (seen[k]) continue;
      seen[k] = 1;
      if (SKIP.test(l.text)) continue;
      const [folder, sender] = classify(l.text);
      const id = "L" + k;
      state.mail = state.mail || [];
      state.mail.unshift({ id, folder, sender, subject: l.text.length > 72 ? l.text.slice(0, 70) + "…" : l.text, html: `<p>${esc(l.text)}</p>`, date: l.date, ic: LOGICON[folder] });
      if (init) readMap()["mail:" + id] = 1;
    }
    if (state.mail && state.mail.length > 250) state.mail.length = 250;
    const ks = Object.keys(seen); if (ks.length > 1500) { state.logSeen = {}; state.log.forEach((l) => { state.logSeen[hash((l.date || "") + "|" + l.text)] = 1; }); }
  }

  function allMessages() {
    syncLog();
    const base = fxInboxMessages().filter((m) => m.kind !== "log");
    const out = [];
    base.forEach((m) => {
      let folder = "club", action = false;
      if (m.kind === "job") { folder = "club"; action = true; }
      else if (m.kind === "event") { folder = "players"; action = true; }
      else if (m.kind === "offer") { folder = "transfers"; action = true; }
      else if (m.kind === "med") folder = "med";
      else if (m.kind === "done") folder = "transfers";
      else if (m.kind === "log") {
        const t = m.text || "";
        folder = /scout|Rapport de|Observation/i.test(t) ? "scout" : /transf|offre|prêt|signe|recrut|vend/i.test(t) ? "transfers" : /bless|suspen|médic/i.test(t) ? "med" : "club";
        m.key = "log:" + hash((m.date || "") + t);
      }
      out.push(Object.assign({}, m, { folder, action, icon: ICON[m.kind] || "📰" }));
    });
    (state.mail || []).forEach((x) => out.push({ key: "mail:" + x.id, kind: "mail", folder: x.folder, action: false, icon: x.ic || ICON[x.folder === "scout" ? "scout" : x.folder === "players" ? "youth" : "contract"] || "📨", sender: x.sender, subject: x.subject, date: x.date, html: x.html }));
    try { (window.dsExtraMessages ? window.dsExtraMessages() : []).forEach((m) => out.push(m)); } catch (e) { console.error(e); }
    state.news.slice(0, 25).forEach((n) => out.push({ key: "news:" + hash(n.date + n.text), kind: "news", folder: "world", action: false, icon: ICON.news, sender: "Actualités", subject: n.text.length > 80 ? n.text.slice(0, 78) + "…" : n.text, date: n.date, text: n.text }));
    return out;
  }
  const readMap = () => (state.inboxRead = state.inboxRead || {});
  const isUnread = (m) => m.action || (m.kind === "med" ? m.unread && !readMap()[m.key + ":" + (m.unavailable ? m.unavailable.length : 0)] : !readMap()[m.key]);
  function markRead(m) { if (!m || m.action) return; const k = m.kind === "med" ? m.key + ":" + (m.unavailable ? m.unavailable.length : 0) : m.key; readMap()[k] = 1; const ks = Object.keys(readMap()); if (ks.length > 600) ks.slice(0, 200).forEach((x) => delete readMap()[x]); }
  function inFolder(m, f) { return f === "all" ? m.folder !== "world" : f === "todo" ? m.action : m.folder === f; }

  window.unreadCount = function () {
    try { return allMessages().filter((m) => m.folder !== "world" && isUnread(m)).length; } catch (e) { return pendingCount(); }
  };

  window.renderInbox = function () {
    const msgs = allMessages();
    const f = ui.ibFolder && FOLDERS.some((x) => x[0] === ui.ibFolder) ? ui.ibFolder : "all";
    const list = msgs.filter((m) => inFolder(m, f));
    let sel = list.find((m) => m.key === ui.inboxSel);
    if (!sel && !ui.ibReading) sel = list[0];
    const mobileReading = !!(ui.ibReading && sel);
    if (sel && (!isMobile() || mobileReading)) markRead(sel);
    const cnt = (k) => msgs.filter((m) => inFolder(m, k) && m.folder !== "world" && isUnread(m)).length;
    const body = (m) => m.kind === "mail" ? `<div class="ib-mailhtml">${m.html}</div>` : m.kind === "news" ? `<p>${esc(m.text)}</p><p class="hint">${esc(m.date)}</p>` : fxMsgBody(m);
    const row = (m) => `<button class="ib-item ${isUnread(m) ? "unread" : ""} ${sel && sel.key === m.key ? "sel" : ""}" data-msg="${esc(m.key)}">
        <span class="ib-ic">${m.icon}</span>
        <span class="ib-txt"><span class="ib-from">${esc(m.sender)}<em>${esc(m.date)}</em></span><span class="ib-sub">${esc(m.subject)}</span></span>
        ${m.action ? `<span class="ib-flag" title="Action requise">!</span>` : ""}</button>`;
    const unreadAll = msgs.filter((m) => m.folder !== "world" && isUnread(m)).length;
    return `
    <div class="fm-dark fm-panel ib ${mobileReading ? "ib-reading" : ""}">
      <h2 class="fm-title">Boîte de réception <span>${unreadAll ? unreadAll + " non lu(s)" : "Tout est lu"}</span></h2>
      ${ui.eventMessage ? `<p class="hint result-good">${ui.eventMessage}</p>` : ""}
      <div class="ib-layout">
        <nav class="ib-folders">${FOLDERS.map(([k, ic, l]) => `<button class="ib-folder ${f === k ? "on" : ""}" data-ibf="${k}"><span>${ic}</span><b>${l}</b>${k !== "world" && cnt(k) ? `<i>${cnt(k)}</i>` : ""}</button>`).join("")}
          <button class="ib-folder ib-readall" data-ibreadall="1"><span>✓</span><b>Tout marquer comme lu</b></button></nav>
        <div class="ib-list">${list.map(row).join("") || `<p class="hint" style="padding:12px;">Aucun message dans ce dossier.</p>`}</div>
        <article class="ib-read">
          ${sel ? `<button class="ib-back" data-ibback="1">‹ Retour</button>${faceOf(sel)}<div class="fx-rfrom">De : ${esc(sel.sender)}</div><h3 class="fx-rsub">${esc(sel.subject)}</h3><div class="fx-rdate">${esc(sel.date)}</div>${body(sel)}` : `<p class="hint" style="padding:12px;">Sélectionnez un message.</p>`}
        </article>
      </div>
    </div>`;
  };
  function faceOf(m) {
    try { const pid = (m.o && m.o.playerId) || m.pid; const p = pid && getPlayer(pid); return p && window.dsFace ? `<span class="ib-pface">${dsFace(p, "ds-face-md")}</span>` : ""; } catch (e) { return ""; }
  }
  function isMobile() { return window.matchMedia && window.matchMedia("(max-width: 800px)").matches; }

  // lecture mobile : liste → message (capture avant le onclick existant)
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".ib [data-msg]");
    if (b) ui.ibReading = true;
  }, true);
  const origAttach = window.attachTabHandlers;
  window.attachTabHandlers = function () {
    origAttach.apply(this, arguments);
    document.querySelectorAll("[data-ibf]").forEach((b) => { b.onclick = () => { ui.ibFolder = b.dataset.ibf; ui.ibReading = false; ui.inboxSel = null; fxRefresh(); }; });
    document.querySelectorAll("[data-ibback]").forEach((b) => { b.onclick = () => { ui.ibReading = false; ui.inboxSel = null; fxRefresh(); }; });
    document.querySelectorAll("[data-ibreadall]").forEach((b) => { b.onclick = () => { allMessages().forEach(markRead); saveGame(); render(); toast("Tout est marqué comme lu"); }; });
  };
})();
