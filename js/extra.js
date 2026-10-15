// =====================================================================
// BLOC 11 — compléments (le « Bureau du DS » couvre plan de saison, réseau, carnet de
// transferts, identité de jeu, fair-play financier, réglages et raccourcis) :
//  1. Prolongations de contrat avec clauses (rôle, primes, clause libératoire)
//  2. Rivaux sur vos pistes (surenchères, joueurs « coiffés au poteau »)
//  3. Prêts : progression selon le temps de jeu
//  4. Recherche rapide (Ctrl+K ou « / ») vers un onglet, une action ou un joueur
// =====================================================================
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const note = (t) => { try { state.log.unshift({ date: fmtDate(state.date), text: t }); } catch (e) {} };
  const mail = (f, s, sub, html) => { try { window.dsMail && window.dsMail(f, s, sub, html); } catch (e) {} };
  const day = () => state.dayCounter || 0;
  const pn = (p) => `${p.firstName} ${p.lastName}`;
  function root(id) { let r = document.getElementById(id); if (!r) { r = document.createElement("div"); r.id = id; document.body.appendChild(r); } return r; }

  // ===================================================================
  // 1. PROLONGATIONS AVEC CLAUSES
  // ===================================================================
  const origCard = window.openPlayerCard;
  window.openPlayerCard = function (id) {
    const r = origCard.apply(this, arguments);
    try {
      const btn = document.getElementById("propose-renewal"), p = getPlayer(id), club = userClub();
      if (!btn || !p || !club || p.clubId !== club.id || !window.dsDeal) return r;
      btn.insertAdjacentHTML("beforebegin", `<details class="dp-deal" style="margin:8px 0;"><summary>Clauses du nouveau contrat (rôle, primes, clause libératoire)</summary>${dsDeal.formHTML(p, club, p.deal)}</details>`);
      btn.onclick = () => {
        const wage = parseInt(document.getElementById("renewal-wage").value, 10) || p.wage;
        const years = parseInt(document.getElementById("renewal-years").value, 10) || 1;
        const deal = dsDeal.readDeal(), adj = dsDeal.score(p, deal, club).adj;
        const yl = (p.contractEndYear || 0) - new Date(state.date).getFullYear();
        const ch = clamp(0.35 + (wage / Math.max(1, p.wage) - 1) * 1.2 + (p.loyalty || 50) / 100 * 0.25 - (yl > 2 ? 0.25 : 0) + adj, 0.05, 0.95);
        const box = document.getElementById("renewal-result");
        if (Math.random() < ch) {
          p.wage = wage; p.contractEndYear = new Date(state.date).getFullYear() + years; recomputeWageBill(club);
          dsDeal.apply(p, club, deal);
          note(`${pn(p)} prolonge jusqu'en ${p.contractEndYear} (${fmtMoney(wage)}/mois).`);
          box.textContent = `${pn(p)} a accepté ! Contrat prolongé jusqu'en ${p.contractEndYear}${dsDeal.describe(deal) ? " — " + dsDeal.describe(deal) : ""}.`; box.className = "hint result-good";
          saveGame(); setTimeout(() => openPlayerCard(p.id), 700);
        } else { box.textContent = `${pn(p)} a refusé cette offre (chances estimées : ${Math.round(ch * 100)} %).`; box.className = "hint result-bad"; }
      };
    } catch (e) { console.error(e); }
    return r;
  };

  // ===================================================================
  // 2. RIVAUX SUR VOS PISTES
  // ===================================================================
  function rivalsWeekly() {
    const club = userClub(); if (!club || !club.scouting) return;
    (club.scouting.shortlist || []).slice().forEach((id) => {
      const p = getPlayer(id); if (!p || p.clubId === club.id) return;
      const r = Math.random();
      if (r < 0.04 && currentWindow()) {
        const buyers = allClubs().filter((c) => c.id !== club.id && c.id !== p.clubId && c.budget > p.value * 1.1);
        if (!buyers.length) return;
        const b = buyers[rnd(0, buyers.length - 1)], from = p.clubId;
        transferPlayer(p, from, b.id, Math.round(p.value * 1.05 / 1000) * 1000);
        club.scouting.shortlist = club.scouting.shortlist.filter((x) => x !== id);
        mail("transfers", "Marché", `Coiffé au poteau : ${pn(p)}`, `<p><b>${esc(b.name)}</b> a recruté <b>${esc(pn(p))}</b> que vous suiviez. Il sort de votre liste.</p>`);
      } else if (r < 0.1) {
        p.value = Math.round(p.value * 1.06 / 1000) * 1000;
        mail("transfers", "Marché", `Surenchère sur ${pn(p)}`, `<p>Un rival s'intéresse à <b>${esc(pn(p))}</b> : sa valeur grimpe à ${fmtMoney(p.value)}. Agissez vite.</p>`);
      }
    });
  }

  // ===================================================================
  // 9. PRÊTS : PROGRESSION SELON LE TEMPS DE JEU
  // ===================================================================
  function loansWeekly() {
    const club = userClub(); if (!club) return;
    allClubs().forEach((h) => h.players.forEach((p) => {
      const l = p.onLoan; if (!l || l.fromClubId !== club.id) return;
      const st = p.seasonStats || { matches: 0 };
      l.pm = l.pm === undefined ? st.matches : l.pm; l.mp = (l.mp || 0) + Math.max(0, st.matches - l.pm); l.pm = st.matches; l.wk = (l.wk || 0) + 1;
      if (l.wk % 4) return;
      if (l.mp >= 3 && p.age <= 22 && p.overall < p.potential && Math.random() < 0.4) { p.overall++; p.value = computeValue(p); mail("players", "Suivi de prêt", `${pn(p)} progresse en prêt`, `<p>Le temps de jeu à <b>${esc(h.name)}</b> profite à <b>${esc(pn(p))}</b> : +1 de niveau (${p.overall}).</p>`); }
      else if (l.mp <= 0) { p.happy = Math.max(0, (p.happy == null ? 62 : p.happy) - 6); mail("players", "Suivi de prêt", `${pn(p)} stagne en prêt`, `<p><b>${esc(pn(p))}</b> ne joue pas à <b>${esc(h.name)}</b> : il perd confiance. Pensez à le rappeler (onglet U19 → Prêts suivis).</p>`); }
      l.mp = 0;
    }));
  }

  const TABS = [["overview", "Vue d'ensemble"], ["squad", "Effectif"], ["market", "Recrutement"], ["scouting", "Scouting"], ["staff", "Staff"], ["dynamics", "Vestiaire"], ["hub", "Hub de données"], ["calendar", "Calendrier"], ["cups", "Compétitions"], ["europe", "Europe"], ["dir", "Direction"], ["reserve", "Équipe réserve"], ["u19", "U19 / Formation"], ["club", "Club"], ["inbox", "Boîte de réception"], ["finance", "Finances"]];
  let palSel = 0, palItems = [];
  function palList(q) {
    q = (q || "").toLowerCase().trim(); const out = [];
    TABS.forEach(([k, l]) => { if (!q || l.toLowerCase().includes(q)) out.push({ t: "tab", k, label: "📂 " + l }); });
    [["▶ Continuer", "event"], ["▶ Prochain match", "match"], ["▶ Une semaine", "week"]].forEach(([l, m]) => { if (!q || l.toLowerCase().includes(q)) out.push({ t: "go", k: m, label: l }); });
    if (q.length >= 2) { let n = 0; for (const c of allClubs()) { for (const p of c.players) { if (pn(p).toLowerCase().includes(q)) { out.push({ t: "pl", k: p.id, label: `👤 ${pn(p)} — ${p.position} ${p.overall} · ${c.name}` }); if (++n >= 8) break; } } if (n >= 8) break; } }
    return out.slice(0, 14);
  }
  function openPalette() {
    root("pal-root").innerHTML = `<div class="modal-backdrop" data-palclose="1"><div class="modal dossier" style="max-width:520px"><input id="pal-q" type="text" placeholder="Onglet, action ou joueur…" autocomplete="off" style="width:100%;padding:10px;font-size:16px"/><div id="pal-list"></div></div></div>`;
    const q = document.getElementById("pal-q"); palSel = 0; fillPal(""); q.focus();
    q.oninput = () => { palSel = 0; fillPal(q.value); };
    q.onkeydown = (e) => { if (e.key === "ArrowDown") { palSel = Math.min(palItems.length - 1, palSel + 1); fillPal(q.value, true); e.preventDefault(); } else if (e.key === "ArrowUp") { palSel = Math.max(0, palSel - 1); fillPal(q.value, true); e.preventDefault(); } else if (e.key === "Enter") { runPal(palItems[palSel]); } else if (e.key === "Escape") { closePal(); } };
  }
  function fillPal(q, keep) { palItems = palList(q); document.getElementById("pal-list").innerHTML = palItems.map((it, i) => `<button class="pal-item ${i === palSel ? "on" : ""}" data-pal="${i}">${esc(it.label)}</button>`).join("") || `<p class="hint">Aucun résultat.</p>`; }
  const closePal = () => { const r = document.getElementById("pal-root"); if (r) r.innerHTML = ""; };
  function runPal(it) {
    if (!it) return; closePal();
    if (it.t === "tab") { ui.tab = it.k; ui.moreOpen = false; render(); window.scrollTo(0, 0); }
    else if (it.t === "go") window.dsContinue && dsContinue(it.k);
    else if (it.t === "pl") { try { openPlayerCard(it.k); } catch (e) {} }
  }
  document.addEventListener("click", (e) => {
    const t = e.target; if (!t || !t.closest) return;
    const pi = t.closest("[data-pal]"); if (pi) { runPal(palItems[parseInt(pi.dataset.pal, 10)]); return; }
    if (t.closest("[data-palclose]") && !t.closest(".modal")) { closePal(); return; }
  });
  document.addEventListener("keydown", (e) => {
    if (!state || !state.ds || ui.screen !== "dashboard") return;
    const typing = e.target.closest && e.target.closest("input,textarea,select");
    if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) { e.preventDefault(); openPalette(); }
  });

  const origAdv = window.advanceDay;
  window.advanceDay = function () {
    const r = origAdv.apply(this, arguments);
    try { if (state.ds && userClub() && day() % 7 === 5) { rivalsWeekly(); loansWeekly(); } } catch (e) { console.error("extra/semaine", e); }
    return r;
  };
  window.dsExtra = { rivalsWeekly, loansWeekly, palList };
})();
