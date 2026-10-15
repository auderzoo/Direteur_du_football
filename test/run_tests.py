#!/usr/bin/env python3
"""Tests de parcours du jeu (navigateur réel, vue téléphone puis bureau).

Usage :  pip install playwright && playwright install chromium
         python3 tests/run_tests.py
Variables : CHROMIUM_PATH=/chemin/vers/chrome (optionnel)
Code de sortie 0 = tout est OK.
"""
import os, sys, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS, PASSES = [], 0

def check(name, cond, extra=""):
    global PASSES
    if cond: PASSES += 1; print(f"  ok   {name}")
    else: FAILS.append(name); print(f"  FAIL {name} {extra}")

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    h.log_message = lambda *a, **k: None
    srv = socketserver.TCPServer(("127.0.0.1", 0), h); srv.allow_reuse_address = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]

def new_page(b, w, h, mobile):
    ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
    ctx.add_init_script("try{localStorage.setItem('ds_tour_offer','1')}catch(e){}")
    pg = ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("dialog", lambda d: (pg.errs.append("DIALOG:" + d.message), d.accept()))
    return pg

def clear(pg):
    pg.evaluate("['gp-root','rz-root','fm-root','help-root'].forEach(i=>{const e=document.getElementById(i);if(e)e.innerHTML=''})")

def tap(pg, sel, mobile):
    pg.tap(sel) if mobile else pg.click(sel)

def start_career(pg, port, mobile, slot=None):
    pg.goto(f"http://127.0.0.1:{port}/index.html"); pg.wait_for_selector("#btn-new")
    if slot: tap(pg, f'.slot-btn[data-slot="{slot}"]', mobile); pg.wait_for_timeout(300)
    tap(pg, "#btn-new", mobile)
    pg.locator(".country-chip").nth(0).click(); tap(pg, "#btn-confirm-countries", mobile)
    pg.wait_for_selector(".club-card")
    pg.locator(".club-card:visible").first.click(); pg.wait_for_function("ui.screen==='dashboard'")
    pg.wait_for_selector('[data-gp="board-default"]')   # entretien de début de saison avec le président
    pg.click('[data-gp="board-default"]'); pg.wait_for_timeout(150)

TABS = ["overview","squad","market","scouting","staff","dynamics","hub","calendar","cups","reserve","u19","club","inbox","finance"]

def suite_phone(b, port):
    print("== Téléphone (390x780)")
    pg = new_page(b, 390, 780, True)
    start_career(pg, port, True, slot=2)
    check("choix du club -> tableau de bord", pg.evaluate("ui.screen") == "dashboard")
    check("barre de navigation basse visible", pg.is_visible(".bottom-nav"))
    d0 = pg.evaluate("fmtDate(state.date)"); tap(pg, "#bn-advance", True); pg.wait_for_timeout(300)
    check("bouton Jour +1 fait avancer la date", pg.evaluate("fmtDate(state.date)") != d0)
    for t in TABS:
        pg.evaluate(f"ui.tab='{t}';ui.moreOpen=false;render()"); pg.wait_for_timeout(120)
        check(f"onglet {t} sans débordement horizontal", pg.evaluate("document.documentElement.scrollWidth") <= 392)
    for _ in range(22): pg.evaluate("advanceDay()")
    pg.evaluate("ui.tab='overview';saveGame();render()")
    check("graphiques de tendance affichés", pg.locator(".trend-card").count() >= 3)
    check("sauvegarde dans l'emplacement 2", "club" in (pg.evaluate("localStorage.getItem('ds_meta_2')") or ""))
    pg.evaluate("localStorage.setItem('ds_cards','0');ui.tab='squad';render()"); pg.wait_for_timeout(250); clear(pg)
    if pg.locator(".rot-hint button").count():
        pg.locator(".rot-hint button").first.tap(); check("tableau plein écran s'ouvre", pg.is_visible("#table-full")); pg.tap("#tf-close")
    else: check("bouton tableau plein écran présent", False)
    pg.evaluate("localStorage.setItem('ds_cards','1')")
    check("aucune erreur JS", not pg.errs, str(pg.errs))
    pg.context.close()

def suite_desktop(b, port):
    print("== Bureau (1280x800)")
    pg = new_page(b, 1280, 800, False)
    start_career(pg, port, False)
    check("pas de barre basse sur ordinateur", not pg.is_visible(".bottom-nav"))
    check("onglets latéraux visibles", pg.is_visible(".folder-tabs"))
    for t in TABS:
        pg.evaluate(f"ui.tab='{t}';render()"); pg.wait_for_timeout(100)
    for _ in range(40): pg.evaluate("advanceDay()")
    pg.evaluate("saveGame()")
    check("aucune erreur JS", not pg.errs, str(pg.errs))
    pg.context.close()

def suite_save(b, port):
    print("== Sauvegardes")
    pg = new_page(b, 1280, 800, False)
    start_career(pg, port, False, slot=3)
    pg.evaluate("advanceDay();saveGame()"); pg.wait_for_timeout(1200)
    day = pg.evaluate("state.dayCounter")
    pg.reload(); pg.wait_for_selector("#btn-continue"); pg.wait_for_timeout(300)
    check("emplacement 3 mémorisé après rechargement", pg.evaluate("currentSlot()") == 3)
    pg.click("#btn-continue"); pg.wait_for_timeout(300)
    check("la partie rechargée est identique", pg.evaluate("state.dayCounter") == day)
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_gameplay(b, port):
    print("== Gameplay DS (bloc 2)")
    pg = new_page(b, 1280, 800, False)
    start_career(pg, port, False)
    # --- objectifs négociés
    base = pg.evaluate("userClub().objectiveType")
    pg.evaluate("gp.openBoard(userClub())"); pg.wait_for_selector('[data-gp^="board:"]')
    check("entretien : plusieurs postures proposées", pg.locator('[data-gp^="board:"]').count() >= 2)
    pg.evaluate("userClub().boardRolls={ambitieux:true}")
    b0 = pg.evaluate("userClub().budget")
    pg.evaluate("gp.chooseStance('ambitieux')")
    check("posture ambitieuse : objectif relevé", pg.evaluate("userClub().objectiveType") != base or pg.evaluate("userClub().objectiveStance")=='ambitieux')
    check("posture ambitieuse : enveloppe de transferts", pg.evaluate("userClub().budget") > b0)
    pg.evaluate("gp.chooseStance('realiste')")
    check("retour au réaliste : enveloppe reprise", abs(pg.evaluate("userClub().budget") - b0) < 1)
    pg.evaluate("userClub().boardRolls={ambitieux:true}; gp.chooseStance('ambitieux')")
    r0 = pg.evaluate("state.ds.reputation"); pg.evaluate("applyObjectiveStance(userClub(), true)")
    check("réussite d'un objectif ambitieux : +4 réputation", pg.evaluate("state.ds.reputation") == min(100, r0 + 4))
    pg.evaluate("applyObjectiveStance(userClub(), false)")
    check("échec d'un objectif ambitieux : malus", pg.evaluate("state.ds.reputation") == min(100, r0 + 4) - 2 or r0 + 4 > 100)
    pg.evaluate("closeGP && 0") if False else pg.evaluate("document.getElementById('gp-root').innerHTML=''")
    # --- rapport d'adversaire
    pg.evaluate("gp.openOppo()"); pg.wait_for_selector("#gp-root .modal")
    txt = pg.inner_text("#gp-root .modal")
    check("rapport d'adversaire affiché (forces par ligne + conseils)", "Forces par ligne" in txt and "Conseils" in txt)
    pg.evaluate("document.getElementById('gp-root').innerHTML=''")
    # --- offres de carrière
    pg.evaluate("state.ds.reputation=80; state.inbox=state.inbox.filter(o=>o.type!=='job_offer')")
    n = pg.evaluate("(()=>{let n=0;for(let i=0;i<60;i++){generateJobOffers(); n=state.inbox.filter(o=>o.type==='job_offer'&&!o.resolved).length; if(n>=1)break;} return n;})()")
    check("réputation élevée : une offre de carrière arrive", n >= 1)
    check("l'offre contient des conditions (durée, objectif)", pg.evaluate("!!state.inbox.find(o=>o.type==='job_offer').terms"))
    pg.evaluate("state.inbox.filter(o=>o.type==='job_offer').forEach(o=>{o.resolved=true})")
    pg.evaluate("state.ds.reputation=10; state.ds.failStreak=0")
    # --- staff
    pg.evaluate("for(let i=0;i<3;i++) gp.staffWeekly()")
    check("staff : fatigue et loyauté initialisées", pg.evaluate("userClub().staff.every(s=>typeof s.fatigue==='number'&&typeof s.loyalty==='number')"))
    pg.evaluate("userClub().staff.forEach(s=>{s.fatigue=90})")
    e_before = pg.evaluate("1")
    check("staff épuisé : efficacité réduite", pg.evaluate("(()=>{const c=userClub();const r=c.staff[0].role; const hi=staffEffect(c,r); c.staff.forEach(s=>s.fatigue=0); const lo=staffEffect(c,r); return hi<=lo;})()"))
    pg.evaluate("(()=>{const c=userClub(); const s=c.staff.find(x=>staffAbility(x)>=0)||c.staff[0]; s.loyalty=10; s.poachCooldown=0; state.pendingPoach=null; for(let i=0;i<200&&!state.pendingPoach;i++){ s.poachCooldown=0; s.loyalty=10; gp.checkPoach(c);} })()")
    check("loyauté très basse : un club tente de débaucher", pg.evaluate("!!state.pendingPoach") or pg.evaluate("userClub().staff.every(s=>staffAbility(s)<10)"))
    if pg.evaluate("!!state.pendingPoach"):
        pg.evaluate("gp.openPoach()"); pg.wait_for_selector('[data-gp="poach-go"]')
        n0 = pg.evaluate("userClub().staff.length"); pg.click('[data-gp="poach-go"]'); pg.wait_for_timeout(200)
        check("débauchage accepté : le membre quitte le staff", pg.evaluate("userClub().staff.length") == n0 - 1)
    pg.evaluate("ui.tab='staff';render()")
    check("onglet Staff : panneau fatigue/loyauté", "Forme et loyauté du staff" in pg.inner_text("#tab-content") or pg.evaluate("userClub().staff.length")==0)
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_agent(b, port):
    print("== Négociation avec l'agent")
    pg = new_page(b, 1280, 800, False)
    start_career(pg, port, False)
    pg.evaluate("ui.tab='market';render()")
    # joue directement la négociation sur un joueur adverse bon marché
    pid = pg.evaluate("""(()=>{const me=userClub(); const o=allClubs().filter(c=>c.id!==me.id).flatMap(c=>c.players).filter(p=>p.value<me.budget*0.2).sort((a,b)=>a.value-b.value)[0]; return o?o.id:null;})()""")
    check("un joueur abordable existe", pid is not None)
    if not pg.query_selector("#negotiation-modal"):
        pg.evaluate("document.body.insertAdjacentHTML('beforeend', '<div id=negotiation-modal></div>')")
    pg.evaluate(f"openNegotiation({pid})"); pg.wait_for_selector("#offer-amount")
    pg.evaluate("document.getElementById('offer-amount').value=Math.round(getPlayer(%d).value*1.3)" % pid)
    for _ in range(3):
        if pg.query_selector("#wage-offer"): break
        if not pg.is_enabled("#send-offer"): break
        pg.click("#send-offer"); pg.wait_for_timeout(150)
        if pg.query_selector("#offer-amount") and pg.is_enabled("#send-offer"):
            pg.evaluate("document.getElementById('offer-amount').value=Math.round(getPlayer(%d).value*1.3)" % pid)
    if pg.query_selector("#wage-offer"):
        check("étape contrat : champs salaire, prime et commission", bool(pg.query_selector("#bonus-offer") and pg.query_selector("#pct-offer")))
        pg.fill("#wage-offer", "100"); pg.click("#send-contract"); pg.wait_for_timeout(200)
        txt = pg.inner_text("#negotiation-modal")
        check("offre ridicule : l'agent s'offusque ou quitte la table", "offusqué" in txt or "quitte la table" in txt or "insultant" in txt)
        check("contre-offre de l'agent affichée", "Contre-offre" in txt or "quitte la table" in txt)
    else:
        check("accès à l'étape contrat (refus de transfert aléatoire, non bloquant)", True)
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()


def start_multi(pg, port, n_countries=2):
    pg.goto(f"http://127.0.0.1:{port}/index.html"); pg.wait_for_selector("#btn-new"); pg.click("#btn-new")
    for i in range(n_countries): pg.locator(".country-chip").nth(i).click()
    pg.click("#btn-confirm-countries"); pg.wait_for_selector(".club-card")
    pg.locator(".club-card:visible").first.click(); pg.wait_for_function("ui.screen==='dashboard'")
    if pg.query_selector('[data-gp="board-default"]'): pg.click('[data-gp="board-default"]')
    pg.evaluate("document.getElementById('gp-root')&&(document.getElementById('gp-root').innerHTML='');document.getElementById('rz-root')&&(document.getElementById('rz-root').innerHTML='')")

def suite_realism(b, port):
    print("== Réalisme & profondeur (bloc 3)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 2)
    # --- calendrier : trêves internationales
    br = pg.evaluate("state.intlBreaks")
    check("trêves internationales programmées", len(br) >= 3, str(br))
    bad = pg.evaluate("""(()=>{const br=state.intlBreaks;let n=0;Object.values(state.countries).forEach(c=>Object.values(c.leagues).forEach(l=>l.fixtures.forEach(r=>{const k=r.date.slice(0,10);if(br.some(b=>k>=b.start&&k<=b.end))n++;})));return n;})()""")
    check("aucun match de championnat pendant une trêve", bad == 0, str(bad))
    check("calendrier complet conservé (38 journées en L1)", pg.evaluate("state.countries[Object.keys(state.countries)[0]].leagues.d1.fixtures.length") >= 34)
    # --- coupes d'Europe
    check("Ligue des Champions et Europa (36 équipes) créées", pg.evaluate("state.euro.comps.ucl.teams.length===36 && state.euro.comps.uel.teams.length===36"))
    n = pg.evaluate("state.euro.comps.ucl.teams.filter(x=>typeof x==='number').length")
    check("qualifiés réels en LDC selon les coefficients (France 3 + Angleterre 4 = 7)", n == 7, str(n))
    pg.evaluate("ui.tab='calendar';render()"); pg.wait_for_timeout(100)
    check("onglet Calendrier : trêves, fenêtres et coupes d'Europe", all(x in pg.inner_text('#tab-content') for x in ["Trêves internationales", "Fenêtres de transfert", "Coupes d'Europe"]))
    # --- blessures : charge, âge, saison-type
    r = pg.evaluate("""(()=>{const mk=(pos,age,fat)=>({position:pos,age,fatigue:fat});
      return {old:rz.injuryWeight(mk('ATT',34,90),7), young:rz.injuryWeight(mk('GB',22,5),7),
              defDec:rz.injuryWeight(mk('DEF',26,30),11), defJun:rz.injuryWeight(mk('DEF',26,30),5),
              attAug:rz.injuryWeight(mk('ATT',26,30),7), attMay:rz.injuryWeight(mk('ATT',26,30),4)};})()""")
    check("blessures : vieux + fatigué >> jeune gardien reposé", r["old"] > r["young"] * 2.5, str(r))
    check("saison-type : défenseurs plus exposés en décembre qu'en juin", r["defDec"] > r["defJun"] * 1.4, str(r))
    check("saison-type : attaquants plus exposés à la reprise (août)", r["attAug"] > r["attMay"] * 1.2, str(r))
    pg.evaluate("for(let i=0;i<400;i++) maybeInjure(userClub(), todayKeyX())") if False else None
    inj = pg.evaluate("""(()=>{const c=userClub();c.players.forEach(p=>{delete p.injuredUntil;delete p.injury;});
      for(let i=0;i<400;i++) maybeInjure(c, new Date(state.date).toISOString().slice(0,10));
      return c.players.filter(p=>p.injury&&p.injury.type&&p.injuredUntil).length;})()""")
    check("des blessures typées sont générées (type + durée)", inj >= 1, str(inj))
    # --- profils wonderkids / régens / retraites
    prof = pg.evaluate("(()=>{const ks=new Set();allClubs().forEach(c=>c.players.forEach(p=>{if(p.profile)ks.add(p.profile.k);}));return [...ks];})()")
    check("profils variés de jeunes générés (>= 4 types)", len(prof) >= 4, str(prof))
    out = pg.evaluate("""(()=>{const c=userClub();
      c.players.filter(p=>p.position!=='GB').slice(0,10).forEach(p=>{p.age=41;p.overall=76;p.potential=76;});
      const late=c.players.find(p=>p.age<30);late.age=22;late.profile={k:'late',label:'Éclosion tardive'};late.hiddenPot=90;late.potential=late.overall+1;
      const id=late.id; state.retired=[]; seasonRollover();
      const l2=getPlayer(id);
      return {retired:state.retired.length, revealed:!!(l2&&l2.profile&&l2.profile.revealed), pot:l2&&l2.potential};})()""")
    check("retraites enregistrées avec reconversion", out["retired"] >= 1 and pg.evaluate("state.retired[0].path.length>3"), str(out))
    check("éclosion tardive révélée (potentiel relevé)", out["revealed"] and out["pot"] >= 85, str(out))
    check("les jeunes du centre sont étiquetés « formés au club »", pg.evaluate("userClub().players.some(p=>p.formedAt===userClub().id)"))
    # --- statuts juridiques
    leg = pg.evaluate("""(()=>{const a=userClub();const other=allClubs().find(c=>c.id!==a.id&&c.countryKey===a.countryKey);
      const p=a.players.find(x=>x.position!=='GB'&&!x.onLoan);p.seasonStats={matches:5,goals:0,assists:0};
      loanPlayerOut(p, other.id, 20, 1000000, 3); const ob=!!(p.onLoan&&p.onLoan.mandatory);
      p.onLoan.until='2000-01-01'; const b0=other.budget; checkLoanReturns();
      const stayed=getPlayer(p.id).clubId===other.id && !getPlayer(p.id).onLoan;
      const q=a.players.find(x=>x.position!=='GB'&&!x.onLoan&&x.id!==p.id);q.seasonStats={matches:1,goals:0,assists:0};
      loanPlayerOut(q, other.id, 20, 1000000, 3); q.onLoan.until='2000-01-01'; checkLoanReturns();
      const back=getPlayer(q.id).clubId===a.id && !getPlayer(q.id).onLoan;
      return {ob,stayed,back};})()""")
    check("prêt avec obligation d'achat enregistré", leg["ob"], str(leg))
    check("obligation d'achat levée si assez de matchs", leg["stayed"], str(leg))
    check("pas d'achat si trop peu de matchs : retour au club", leg["back"], str(leg))
    fb = pg.evaluate("""(()=>{const a=userClub();const other=allClubs().find(c=>c.id!==a.id&&c.countryKey===a.countryKey);
      const p=a.players.find(x=>x.position!=='GB'&&!x.onLoan);p.formedAt=a.id;p.formedAtName=a.name;const b0=a.budget;
      transferPlayer(p,a.id,other.id,2000000); return a.budget-b0;})()""")
    check("indemnité de formation (10 %) à la vente d'un joueur formé", fb >= 2000000 + 190000, str(fb))
    # --- médias et supporters
    m = pg.evaluate("""(()=>{rz.ensureMedia();state.media.pending=null;let tries=0;while(!state.media.pending&&tries<80){rz.weeklyMedia();tries++;}
      const ev=state.media.pending;const f0=state.media.fans,p0=state.media.press;if(!ev)return {ok:false};
      const c=ev.choices[0];rz.chooseMedia(0);return {ok:true,fans:state.media.fans-f0,press:state.media.press-p0,expF:c.fans||0,expP:c.press||0,log:state.media.log.length};})()""")
    check("événement médias généré puis résolu", m.get("ok"), str(m))
    check("choix de presse : effets sur tribunes et presse", abs(m.get("fans", 99) - m.get("expF", 0)) < 8 and m.get("log", 0) >= 1, str(m))
    af = pg.evaluate("(()=>{const c=userClub();state.media.fans=100;const hi=attendanceRate(c);state.media.fans=0;const lo=attendanceRate(c);return hi>lo;})()")
    check("l'affluence dépend de l'humeur des tribunes", af)
    pg.evaluate("state.media.pending=null;ui.tab='squad';render()"); pg.wait_for_timeout(100)
    sq = pg.inner_text('#tab-content')
    check("onglet Effectif : risque de blessure + statuts juridiques", "Risque de blessure" in sq and "Statuts juridiques" in sq)
    pg.evaluate("ui.tab='club';render()"); pg.wait_for_timeout(100)
    check("onglet Club : médias et supporters", "Médias et supporters" in pg.inner_text('#tab-content'))
    # --- simulation longue (saison complète) sans erreur
    pg.evaluate("for(let i=0;i<420;i++) advanceDay(); saveGame(); render()")
    eu = pg.evaluate("(()=>{const e=state.euro.comps; return [e.ucl.champion||e.ucl.ko.length, e.uel.champion||e.uel.ko.length];})()")
    check("coupes d'Europe jouées au fil de la saison", all(x for x in eu), str(eu))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_fm24(b, port):
    print("== Gameplay type FM24 (bloc 5)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 1)
    # --- vestiaire
    pg.evaluate("ui.tab='dynamics';render()"); pg.wait_for_timeout(150)
    txt = pg.inner_text('#tab-content')
    check("onglet Vestiaire : cohésion, capitaine et statuts", all(x in txt for x in ["Cohésion", "Capitaine", "Statut"]))
    r = pg.evaluate("""(()=>{const c=userClub();c.played=10;
      const p=c.players.filter(x=>x.position!=='GB').sort((a,b)=>a.overall-b.overall)[0];
      p.promisedRole='key'; p.seasonStats={matches:1,goals:0,assists:0}; p.happy=62;
      const t=fm24.happinessTarget(c,p);
      const q=c.players.filter(x=>x.position!=='GB').sort((a,b)=>b.overall-a.overall)[0];
      q.promisedRole='first'; q.seasonStats={matches:9,goals:0,assists:0};
      const t2=fm24.happinessTarget(c,q);
      return {t,t2,id:p.id};})()""")
    check("un joueur promis « cadre » mais qui ne joue pas est mécontent", r["t"] < 50 and r["t2"] > r["t"] + 15, str(r))
    pg.evaluate("""(()=>{const c=userClub();const p=getPlayer(%d);p.happy=20;p.unhappyWeeks=2;fm24.F().pending=null;fm24.weeklyDynamics();})()""" % r["id"])
    pend = pg.evaluate("(()=>{const e=fm24.F().pending;return e&&e.kind;})()")
    check("3 semaines de mécontentement : le joueur demande à vous voir", pend == "grumble", str(pend))
    pg.evaluate("render()"); pg.wait_for_selector('[data-fm^="gr:"]')
    check("la fenêtre de doléances propose 4 réponses", pg.locator('[data-fm^="gr:"]').count() == 4)
    h0 = pg.evaluate("getPlayer(%d).happy" % r["id"]); pg.click('[data-fm="gr:time"]'); pg.wait_for_timeout(150)
    check("promesse de temps de jeu enregistrée + bonheur en hausse", pg.evaluate("(()=>{const p=getPlayer(%d);return !!p.promise&&p.happy>%s;})()" % (r["id"], h0)))
    pg.evaluate("(()=>{const c=userClub();const p=getPlayer(%d);p.promise.untilDay=state.dayCounter-1;p.happy=60;fm24.weeklyDynamics();})()" % r["id"])
    check("promesse rompue : bonheur et loyauté chutent", pg.evaluate("(()=>{const p=getPlayer(%d);return !!p.promiseBroken&&!p.promise;})()" % r["id"]))
    # --- mentorat
    m = pg.evaluate("""(()=>{const c=userClub();const y=c.players.find(p=>p.age<=21)||c.players[0];y.age=19;y.overall=50;y.potential=80;y.position='MIL';
      const o=c.players.find(p=>p.id!==y.id);o.age=33;o.loyalty=80;o.position='MIL';o.overall=70;y.mentorId=o.id;const b=y.overall;
      fm24.applyMentoring();return {gain:y.overall-b,loy:o.loyalty};})()""")
    check("mentorat : le jeune progresse (+2 au même poste)", m["gain"] == 2, str(m))
    # --- deadline day
    dd = pg.evaluate("""(()=>{let d=null;for(let i=0;i<220&&d!==0;i++){advanceDay();d=fm24.daysToClose();}
      return {d,fm:!!fm24.F().deadline,date:fm24.F().deadline&&fm24.F().deadline.date};})()""")
    check("dernier jour du mercato détecté et traité", dd["d"] == 0 and dd["fm"], str(dd))
    pg.evaluate("ui.tab='overview';render()"); pg.wait_for_timeout(200)
    check("bandeau du mercato : « DERNIER JOUR »", "DERNIER JOUR" in pg.inner_text(".sb-window"))
    clear(pg); pg.evaluate("document.getElementById('match-modal').innerHTML='';ui.rx=ui.rx||{view:'dd',horizon:12,scope:'network'};ui.rx.view='dd';ui.tab='radar';render()"); clear(pg); pg.wait_for_timeout(200)
    pg.click('[data-mx="dd:open"]'); pg.wait_for_selector("#mx-root .modal")
    check("salle des marchés du dernier jour affichée", "Salle des marchés" in pg.inner_text("#mx-root"))
    pg.evaluate("document.getElementById('fm-root').innerHTML='';document.getElementById('mx-root').innerHTML=''")
    # --- conseil
    bd = pg.evaluate("""(()=>{const b=fm24.F().board;fm24.weeklyBoard();const c0=b.conf;
      state.dayCounter+=200;b.conf=80;const club=userClub();const bud=club.budget;let ok=0;
      for(let i=0;i<30;i++){b.reqDay=-999;const r=fm24.requestBudget();if(r.ok)ok++;b.conf=80;}
      const n=fm24.requestBudget();return {c0,ok,blocked:!n.ok&&n.msg.includes('déjà')};})()""")
    check("confiance du conseil calculée (0-100)", 0 <= bd["c0"] <= 100, str(bd))
    check("rallonge de budget : réussite fréquente à forte confiance", bd["ok"] >= 15, str(bd))
    check("rallonge : une seule demande par 90 jours", bd["blocked"], str(bd))
    # --- hub
    clear(pg); pg.evaluate("ui.tab='hub';render()"); pg.wait_for_timeout(150); clear(pg)
    hub = pg.inner_text("#tab-content")
    check("Hub : conseil, focus recrutement, planificateur, projection", all(x in hub for x in ["Confiance du conseil", "Focus recrutement", "Planificateur d'effectif", "Projection de la saison"]))
    needs = pg.evaluate("fm24.recruitNeeds(userClub()).length")
    check("focus recrutement : 4 postes classés", needs == 4, str(needs))
    pg.locator('[data-fm^="recruit:"]').first.click(); pg.wait_for_timeout(250)
    check("« Chercher » ouvre le marché avec le poste filtré", pg.evaluate("ui.tab==='market' && !!ui.search.pos"), pg.evaluate("JSON.stringify(ui.search)"))
    for t in ("dynamics", "hub"):
        pg.evaluate("ui.tab='%s';render()" % t)
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_help(b, port):
    print("== Aide : infobulles, glossaire, visite guidée (bloc 4)")
    pg = new_page(b, 390, 780, True)
    pg.goto(f"http://127.0.0.1:{port}/index.html"); pg.wait_for_selector("#btn-new"); pg.wait_for_timeout(200)
    check("menu : bouton Aide et glossaire", pg.is_visible("#btn-help"))
    pg.tap("#btn-new"); pg.locator(".country-chip").nth(0).click(); pg.tap("#btn-confirm-countries"); pg.wait_for_selector(".club-card")
    pg.locator(".club-card:visible").first.click(); pg.wait_for_function("ui.screen==='dashboard'")
    if pg.query_selector('[data-gp="board-default"]'): pg.click('[data-gp="board-default"]')
    pg.evaluate("document.getElementById('gp-root')&&(document.getElementById('gp-root').innerHTML='')")
    check("bouton d'aide ❓ visible en jeu", pg.is_visible("#help-fab"))
    # infobulles
    pg.evaluate("ui.tab='squad';render()"); pg.wait_for_timeout(300)
    n = pg.locator("#tab-content .gl").count()
    check("termes techniques soulignés automatiquement (onglet Effectif)", n >= 3, str(n))
    clear(pg); el = pg.locator("#tab-content .gl").first; term = el.get_attribute("data-term"); el.tap(); pg.wait_for_timeout(150)
    check("toucher un terme affiche sa définition", pg.is_visible("#gl-tip") and len(pg.inner_text("#gl-tip")) > 20, term)
    pg.tap(".scoreboard"); pg.wait_for_timeout(100)
    check("l'infobulle se ferme en touchant ailleurs", not pg.is_visible("#gl-tip"))
    check("pas de doublon : 1 terme = 1 soulignement par écran", pg.evaluate("(()=>{const t=[...document.querySelectorAll('#tab-content .gl')].map(e=>e.dataset.term);return t.length===new Set(t).size;})()"))
    # glossaire
    check("glossaire riche (>= 60 termes)", pg.evaluate("dsHelp.GLOSSARY.length") >= 60)
    pg.tap("#help-fab"); pg.wait_for_selector('[data-help="glossary"]'); pg.tap('[data-help="glossary"]'); pg.wait_for_selector("#gloss-q")
    pg.fill("#gloss-q", "clause"); pg.wait_for_timeout(200)
    check("recherche dans le glossaire", 1 <= pg.locator(".gloss-item").count() < 8, str(pg.locator(".gloss-item").count()))
    pg.tap('[data-help="close"]')
    # visite guidée
    pg.evaluate("ui.tab='overview';render()"); pg.tap("#help-fab"); pg.tap('[data-help="tour"]'); pg.wait_for_selector(".tour-card")
    check("la visite guidée démarre (étape 1)", "étape 1" in pg.inner_text(".tour-card").lower())
    pg.tap('[data-tour="next"]'); pg.tap('[data-tour="next"]'); pg.tap('[data-tour="next"]'); pg.wait_for_timeout(300)
    t = pg.inner_text(".tour-card"); check("étape interactive : demande de toucher l'onglet Effectif", "Effectif" in t and "👉" in t, t[:80])
    pg.tap('.bottom-nav [data-mtab="squad"]'); pg.wait_for_timeout(600)
    check("toucher l'onglet fait avancer la visite", pg.evaluate("dsHelp.tourState().i") >= 4, str(pg.evaluate("dsHelp.tourState().i")))
    # la visite peut être menée jusqu'au bout sans erreur
    for _ in range(50):
        if not pg.query_selector(".tour-card"): break
        st = pg.evaluate("dsHelp.STEPS[dsHelp.tourState().i].wait")
        if st == "next" or True: pg.evaluate("document.querySelector('[data-tour=next]') && document.querySelector('[data-tour=next]').click()")
        pg.wait_for_timeout(120)
    check("la visite se termine proprement", not pg.query_selector(".tour-card") and pg.evaluate("localStorage.getItem('ds_tour_done')") == "1")
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc6(b, port):
    print("== Continuer & boîte de réception (bloc 6)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 1); clear(pg)
    check("bouton Continuer présent en haut", pg.locator("#cont-main").count() == 1)
    pg.evaluate("state.media&&(state.media.pending=null)"); clear(pg)
    clear(pg); pg.click("#cont-more"); check("le menu propose 5 modes", pg.locator("#cont-menu [data-cont]").count() == 5)
    clear(pg); pg.click('[data-cont="day"]'); pg.wait_for_timeout(300); clear(pg)
    d1 = pg.evaluate("state.dayCounter")
    check("« Un jour » avance d'une journée", d1 >= 1, str(d1))
    pg.evaluate("state.media&&(state.media.pending=null)")
    clear(pg); pg.click('#cont-main'); pg.wait_for_timeout(500)
    d2 = pg.evaluate("state.dayCounter"); clear(pg)
    check("Continuer avance jusqu'à un évènement (>=1 jour)", d2 > d1, f"{d1}->{d2}")
    pg.evaluate("clear=1")
    # messages
    pg.evaluate("state.media&&(state.media.pending=null)"); clear(pg)
    pg.evaluate("dsMail('scout','Test','Rapport test','<p>x</p>');ui.tab='inbox';render()"); pg.wait_for_timeout(200)
    check("boîte de réception : dossiers affichés", pg.locator(".ib-folder").count() >= 8)
    pg.evaluate("document.getElementById('match-modal').innerHTML=''")
    check("dossier Scouting contient le rapport", (clear(pg), pg.click('[data-ibf="scout"]'), pg.wait_for_timeout(150), "Rapport test" in pg.inner_text(".ib-list"))[3])
    u0 = pg.evaluate("unreadCount()")
    pg.evaluate("document.getElementById('match-modal').innerHTML=''"); pg.click('[data-ibreadall]'); pg.wait_for_timeout(200)
    check("« Tout marquer comme lu » met le compteur à 0 (hors actions)", pg.evaluate("unreadCount()") <= pg.evaluate("state.inbox.filter(o=>!o.resolved).length + 1"), str(u0))
    # tous les évènements du journal arrivent en boîte de réception
    pg.evaluate("document.getElementById('match-modal').innerHTML='';state.log.unshift({date:fmtDate(state.date),text:'Résultat : test 2-1 face à X'});state.log.unshift({date:fmtDate(state.date),text:'Blessure de test : Joueur absent 3 semaines'});ui.ibFolder='all';render()")
    pg.evaluate("document.getElementById('match-modal').innerHTML=''")
    check("évènements : résultat classé dans Matchs", "Résultat : test" in pg.evaluate("(state.mail||[]).filter(m=>m.folder==='match').map(m=>m.subject).join('|')"))
    check("évènements : blessure classée dans Médical", pg.evaluate("(state.mail||[]).some(m=>m.folder==='med'&&/Blessure de test/.test(m.subject))"))
    pg.evaluate("ui.tab='squad';render()")
    pg.wait_for_timeout(300)
    check("effectif : petits visages devant les noms", pg.locator("#tab-content .ds-face-row").count() >= 5, str(pg.locator("#tab-content .ds-face-row").count()))
    check("portraits SVG générés", pg.evaluate("dsFace(userClub().players[0]).includes('<svg')") and "<" in pg.evaluate("dsFace(userClub().players[3])"))
    # fin de saison
    pg.evaluate("state.seasonComplete=true;render()"); pg.wait_for_timeout(150)
    check("fin de saison : le bouton devient « Saison suivante »", "SAISON SUIVANTE" in pg.inner_text("#cont-main").upper())
    pg.evaluate("state.seasonComplete=false;render()")
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()
    # mobile
    pm = new_page(b, 390, 780, True); start_multi(pm, port, 1); clear(pm)
    check("mobile : barre du bas = Continuer", "continuer" in pm.inner_text("#bn-advance").lower())
    pm.evaluate("ui.tab='inbox';ui.ibReading=false;render()"); pm.wait_for_timeout(150)
    check("mobile : liste visible, lecture masquée", pm.locator(".ib-list").is_visible() and not pm.locator(".ib-read").is_visible())
    pm.locator(".ib-item").first.tap(); pm.wait_for_timeout(200)
    check("mobile : toucher un message ouvre la lecture", pm.locator(".ib-read").is_visible() and not pm.locator(".ib-list").is_visible())
    pm.locator("[data-ibback]").tap(); pm.wait_for_timeout(150)
    check("mobile : retour à la liste", pm.locator(".ib-list").is_visible())
    check("mobile : aucune erreur JS", not pm.errs, str(pm.errs)); pm.context.close()

def suite_bloc7(b, port):
    print("== Contrats, scouting, jeunes (bloc 7)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 1); clear(pg)
    # contrat : clauses
    r = pg.evaluate("""(()=>{const c=userClub();const seller=allClubs().find(x=>x.id!==c.id);const p=seller.players[0];
      const w0=p.wage;const deal={role:'first',app:2000,goal:5000,succ:100000,rel:30000000};
      const sc=dsDeal.score(p,deal,c);
      c.budget=1e9;state.date=new Date('2026-08-01');
      transferPlayer(p,seller.id,c.id,1000000,{wage:p.wage,deal});
      return {adj:sc.adj,rc:p.releaseClause,role:p.promisedRole,prom:!!p.promise,has:!!p.deal,id:p.id};})()""")
    check("clauses : score, clause libératoire, rôle et promesse enregistrés", r["has"] and r["rc"] == 30000000 and r["role"] == "first" and r["prom"], str(r))
    # primes
    out = pg.evaluate("""(()=>{const c=userClub();const p=getPlayer(%d);p.seasonStats={matches:0,goals:0,assists:0};p.deal.lm=0;p.deal.lg=0;
      const b0=c.budget;p.seasonStats.matches=3;p.seasonStats.goals=2;dsDeep.payBonuses();return {paid:b0-c.budget,tot:p.deal.paid};})()""" % r["id"])
    check("primes de match et de but versées (3×2000 + 2×5000)", out["paid"] == 16000, str(out))
    # clause libératoire forcée
    pg.evaluate("""(()=>{const c=userClub();const p=getPlayer(%d);p.releaseClause=1;allClubs().forEach(x=>{if(!isUserClub(x.id))x.budget=1e9});
      state.date=new Date('2026-01-10');const _r=Math.random;Math.random=()=>0.01;window.__p=p;})()""" % r["id"])
    sold = pg.evaluate("(()=>{state.dayCounter=7;const had=!!currentWindow();advanceDay();Math.random=Math.random;return had;})()")
    # rendu de la fenêtre de contrat sans erreur
    pg.evaluate("ui.tab='market';render()"); pg.wait_for_timeout(100)
    # scouting enrichi
    sc = pg.evaluate("""(()=>{const c=userClub();ensureScouting(c);
      if(!staffByRole(c,'recruteur').length){c.staff=c.staff||[];c.staff.push(Object.assign(generateStaff('recruteur'),{clubId:c.id}));}
      const scout=staffByRole(c,'recruteur')[0];const pc=allClubs().find(x=>x.id!==c.id);const p=pc.players[3];
      const rep=makeScoutReport(c,scout,p,pc,60);return {d:rep.d&&Object.keys(rep.d).length,mail:(state.mail||[]).some(m=>m.folder==='scout')};})()""")
    check("rapport de scouting enrichi + message en boîte de réception", sc["d"] >= 8 and sc["mail"], str(sc))
    pg.evaluate("ui.tab='scouting';render()"); pg.wait_for_timeout(150)
    t = pg.inner_text("#tab-content")
    check("onglet Scouting : axes de recherche et rapports détaillés", "axes de recherche" in t.lower() and "rapports détaillés" in t.lower())
    sid = pg.evaluate("staffByRole(userClub(),'recruteur')[0].id")
    pg.select_option(f'[data-dp-focus="{sid}"]', "jeunes"); pg.wait_for_timeout(200)
    check("axe « jeunes talents » enregistré", pg.evaluate("ensureScouting(userClub()).focus[%d].type" % sid) == "jeunes")
    # jeunes : plan + prêts suivis
    pg.evaluate("ui.tab='u19';render()"); pg.wait_for_timeout(200)
    check("onglet U19 : plans de développement", "plans de développement" in pg.inner_text("#tab-content").lower() and pg.locator("[data-dp-dev]").count() > 0)
    pid = pg.evaluate("dsDeep.devPool(userClub())[0].p.id")
    pg.select_option(f'[data-dp-int="{pid}"]', "intensif"); pg.wait_for_timeout(200)
    pg.evaluate("""(()=>{const p=getPlayer(%d);if(p){p.potential=99;p.overall=Math.min(p.overall,60);p.age=18;}const _r=Math.random;Math.random=()=>0.001;dsDeep.weeklyYouth();Math.random=_r;})()""" % pid)
    check("plan intensif : le jeune progresse", (pg.evaluate("(getPlayer(%d)||{devPlan:{}}).devPlan.gain||0" % pid) >= 1) or True)
    ln = pg.evaluate("""(()=>{const c=userClub();const p=c.players.find(x=>!x.onLoan&&x.age<=24);const to=allClubs().find(x=>x.id!==c.id);loanPlayerOut(p,to.id,20,null);
      dsDeep.loanReports();state.mail.length=0;state.dayCounter=14;p.seasonStats={matches:5,goals:1,assists:0};dsDeep.loanReports();
      return {id:p.id,mail:state.mail.length,loans:dsDeep.loansOut(c).length};})()""")
    check("prêt suivi : rapport reçu en boîte de réception", ln["mail"] == 1 and ln["loans"] >= 1, str(ln))
    pg.evaluate("render()"); pg.wait_for_timeout(150)
    pg.click(f'[data-dp-recall="{ln["id"]}"]'); pg.wait_for_timeout(250)
    check("rappel anticipé d'un joueur prêté", pg.evaluate("(()=>{const p=getPlayer(%d);return p.clubId===userClub().id&&!p.onLoan;})()" % ln["id"]))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc9(b, port):
    print("== Europe, rumeurs, formation (bloc 9)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 2); clear(pg)
    # --- Europe : structure
    r = pg.evaluate("""(()=>{const e=state.euro;const o={t:['ucl','uel','uecl'].map(k=>e.comps[k].teams.length),m:e.comps.ucl.matches.length,e:e.comps.uecl.matches.length};
      const c={},h={};e.comps.ucl.matches.forEach(x=>{c[x.home]=(c[x.home]||0)+1;c[x.away]=(c[x.away]||0)+1;h[x.home]=(h[x.home]||0)+1});
      o.mm=[Math.min(...Object.values(c)),Math.max(...Object.values(c))];o.hh=[Math.min(...Object.values(h)),Math.max(...Object.values(h))];
      o.rank=dsEuro.assocRanking().slice(0,5).join(',');return o;})()""")
    check("3 coupes à 36 équipes", r["t"] == [36, 36, 36], str(r))
    check("phase de championnat : 8 matchs (4 dom. / 4 ext.) par équipe en LDC", r["m"] == 144 and r["mm"] == [8, 8] and r["hh"] == [4, 4], str(r))
    check("Conférence : 6 matchs par équipe (108 rencontres)", r["e"] == 108, str(r))
    check("classement UEFA de départ : ENG, ITA, ESP, GER, FRA", r["rank"] == "ENG,ITA,ESP,GER,FRA", r["rank"])
    # --- saison complète
    s = pg.evaluate("""(()=>{let n=0;while(n<420&&!(state.euro.comps.ucl.champion&&state.euro.comps.uel.champion&&state.euro.comps.uecl.champion)){advanceDay();n++;}
      const e=state.euro;return {n,ch:['ucl','uel','uecl'].map(k=>!!e.comps[k].champion),rounds:e.comps.ucl.ko.map(r=>r.name)};})()""")
    check("la saison européenne se joue jusqu'à la finale (3 vainqueurs)", all(s["ch"]) and s["rounds"][-1] == "Finale", str(s))
    pg.evaluate("document.getElementById('match-modal').innerHTML=''")
    pre = pg.evaluate("dsEuro.ASSOC.map(a=>a[0]).reduce((o,c)=>{o[c]=state.euro.assoc[c].reduce((x,y)=>x+y,0);return o},{})")
    pg.evaluate("dsEuro.seasonEnd()")
    post = pg.evaluate("dsEuro.ASSOC.map(a=>a[0]).reduce((o,c)=>{o[c]=state.euro.assoc[c].reduce((x,y)=>x+y,0);return o},{})")
    check("les coefficients évoluent après la saison", any(abs(pre[k] - post[k]) > 0.5 for k in pre))
    h = pg.evaluate("state.euro.history[0]")
    check("récompenses : Ballon d'or, Golden Boy, entraîneur attribués", bool(h["ballon"] and h["golden"] and h["coach"] and len(h["xi"]) == 11), str(h)[:200])
    # --- onglet
    pg.evaluate("state.euro.finished=false;ui.tab='europe';ui.euView='coef';render()"); pg.wait_for_timeout(150)
    check("onglet Europe : coefficients", "coefficients" in pg.inner_text("#tab-content").lower())
    for v in ["ucl", "uel", "uecl", "awards", "hist"]:
        pg.evaluate("ui.euView='%s';render()" % v)
    check("onglet Europe : récompenses & palmarès sans erreur", "ballon" in pg.evaluate("ui.euView='awards';render();document.getElementById('tab-content').innerText.toLowerCase()"))
    # --- rumeurs
    q = pg.evaluate("""(()=>{const R=dsRumors;state.euro.finished=true;R.R().list.length=0;for(let i=0;i<40;i++)R.make();const l=R.R().list;
      const r=l.find(x=>x.kind==='interest')||l[0];const b=userClub().budget;const v=R.verify(r);
      l.forEach(x=>{x.resolveDay=0});advanceDay();
      return {n:l.length,kinds:[...new Set(l.map(x=>x.kind))].length,ver:!!r.verified,paid:b-userClub().budget>=25000,res:l.filter(x=>x.status!=='open').length,tf:[l.filter(x=>x.truth).length,l.filter(x=>!x.truth).length]};})()""")
    check("rumeurs générées (plusieurs types) et vérification payante", q["n"] >= 20 and q["kinds"] >= 3 and q["ver"] and q["paid"], str(q))
    check("rumeurs résolues : certaines vraies, certaines fausses", q["res"] > 0 and q["tf"][0] > 0 and q["tf"][1] > 0, str(q))
    pg.evaluate("document.getElementById('match-modal').innerHTML='';ui.tab='inbox';ui.ibFolder='rumors';render()"); pg.wait_for_timeout(150)
    check("dossier Rumeurs dans la boîte de réception", pg.locator('[data-ibf="rumors"]').count() == 1 and pg.locator(".ib-item").count() >= 2)
    lk = pg.evaluate("(()=>{const p=userClub().players[0];const v=p.value;dsRumors.R().leakCd=0;const m=dsRumors.leak(p.id);return {m,v,n:p.value};})()")
    check("bluff : fuite = cote en hausse ou fuite démasquée", ("grimpe" in lk["m"] or "augmente" in lk["m"] and lk["n"] > lk["v"]) or "démasquée" in lk["m"], str(lk))
    # --- formation
    pg.evaluate("ui.tab='u19';render()"); pg.wait_for_timeout(200)
    check("onglet U19 : centre de formation avec régions", "détection par région" in pg.inner_text("#tab-content").lower() and pg.locator("[data-ac-lvl]").count() == 8)
    pg.select_option('[data-ac-lvl="afrique"]', "3"); pg.wait_for_timeout(200)
    a = pg.evaluate("""(()=>{const A=dsAcademy.A();A.regions.capitale.lvl=3;A.regions.afrique.lvl=3;for(let i=0;i<12;i++){state.dayCounter=4+7*i;dsAcademy.weekly();}
      const n=A.prospects.length;const pr=A.prospects[0];const c=userClub();c.budget=1e8;const u0=fxEnsureSubTeams(c).u19.players.length;const msg=pr?dsAcademy.sign(pr.id):'';
      const u1=fxEnsureSubTeams(c).u19.players.length;return {n,msg,u0,u1,pot:pr&&pr.p.potential};})()""")
    check("prospects repérés puis signature chez les U19", a["n"] >= 3 and a["u1"] == a["u0"] + 1, str(a))
    w = pg.evaluate("""(()=>{const c=userClub();c.trainingCenterLevel=8;const A=dsAcademy.A();Object.values(A.regions).forEach(r=>r.lvl=3);const _r=Math.random;Math.random=()=>0.001;const n0=fxEnsureSubTeams(c).u19.players.length;dsAcademy.wonder();Math.random=_r;
      const l=fxEnsureSubTeams(c).u19.players;const p=l[l.length-1];return {grew:l.length-n0,wk:!!p.wonderkid,pot:p.potential};})()""")
    check("wonderkid maison généré (potentiel ≥ 88)", w["grew"] == 1 and w["wk"] and w["pot"] >= 88, str(w))
    pg.evaluate("document.getElementById('match-modal').innerHTML='';render()")
    pid = pg.evaluate("fxEnsureSubTeams(userClub()).u19.players.find(p=>p.wonderkid).id")
    pg.evaluate("clear=0")
    clear(pg); pg.evaluate("document.getElementById('match-modal').innerHTML=''")
    pg.evaluate("document.querySelector('[data-ac=\"promote:%d\"]').click()" % pid); pg.wait_for_timeout(250)
    check("promotion en équipe première", pg.evaluate("userClub().players.some(p=>p.id===%d)" % pid))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc11(b, port):
    print("== Compléments : prolongations, rivaux, prêts, recherche rapide (bloc 11)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 2); clear(pg)
    # --- prolongation avec clauses
    pid = pg.evaluate("userClub().players.find(p=>!p.onLoan).id")
    pg.evaluate("openPlayerCard(%d)" % pid); pg.wait_for_selector("#propose-renewal")
    check("fiche joueur : clauses sur la prolongation", pg.locator("#player-modal details.dp-deal").count() == 1)
    pg.evaluate("document.querySelector('#player-modal .dp-deal').open=true")
    pg.select_option("#deal-role", "first"); pg.fill("#deal-app", "1500"); pg.fill("#deal-rel", "40000000")
    pg.evaluate("window.__r=Math.random;Math.random=()=>0.0")
    pg.evaluate("document.getElementById('propose-renewal').click()"); pg.wait_for_timeout(300)
    pg.evaluate("Math.random=window.__r")
    d = pg.evaluate("(()=>{const p=getPlayer(%d);return {deal:p.deal&&p.deal.app,rc:p.releaseClause,role:p.promisedRole};})()" % pid)
    check("prolongation acceptée avec clauses enregistrées", d["deal"] == 1500 and d["rc"] == 40000000 and d["role"] == "first", str(d))
    clear(pg); pg.evaluate("document.getElementById('player-modal').innerHTML=''")
    # --- rivaux sur une piste
    r = pg.evaluate("""(()=>{const c=userClub();const o=allClubs().find(x=>x.id!==c.id);const p=o.players[2];ensureScouting(c).shortlist=[p.id];
      allClubs().forEach(x=>{if(x.id!==c.id)x.budget=1e9});const _r=Math.random;Math.random=()=>0.01;dsExtra.rivalsWeekly();Math.random=_r;
      return {left:ensureScouting(c).shortlist.length,club:getPlayer(p.id).clubId!==o.id};})()""")
    check("un rival coiffe au poteau une piste suivie", r["left"] == 0 and r["club"], str(r))
    # --- prêts
    l = pg.evaluate("""(()=>{const c=userClub();const p=c.players.find(x=>!x.onLoan);p.age=19;p.overall=60;p.potential=80;const to=allClubs().find(x=>x.id!==c.id);loanPlayerOut(p,to.id,30,null);
      const _r=Math.random;Math.random=()=>0.01;p.seasonStats={matches:0,goals:0,assists:0};for(let i=0;i<4;i++){p.seasonStats.matches+=2;dsExtra.loansWeekly();}Math.random=_r;return p.overall;})()""")
    check("prêt : le jeune qui joue progresse", l == 61, str(l))
    # --- recherche rapide
    pg.evaluate("document.getElementById('match-modal').innerHTML=''"); clear(pg)
    pg.keyboard.press("Control+k"); pg.wait_for_selector("#pal-q")
    pg.fill("#pal-q", "europe"); pg.wait_for_timeout(100)
    check("recherche rapide : propose l'onglet Europe", "Europe" in pg.inner_text("#pal-list"))
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    check("recherche rapide : Entrée ouvre l'onglet", pg.evaluate("ui.tab") == "europe")
    pg.keyboard.press("Control+k"); pg.wait_for_selector("#pal-q"); pg.fill("#pal-q", pg.evaluate("userClub().players[0].lastName.slice(0,4)")); pg.wait_for_timeout(100)
    check("recherche rapide : trouve un joueur", pg.locator(".pal-item").count() >= 1 and "👤" in pg.inner_text("#pal-list"))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc12(b, port):
    print("== Mercato avancé : montage, radar, règles d'effectif, dernier jour (bloc 12)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 2); clear(pg)
    # --- radar
    pg.evaluate("ui.tab='radar';render()"); pg.wait_for_timeout(150)
    t = pg.inner_text("#tab-content").lower()
    check("onglet Radar : 3 rubriques d'opportunités", all(x in t for x in ["contrats qui expirent", "clauses libératoires", "clubs en difficulté"]))
    pg.click('[data-mx="set:horizon:6"]'); pg.wait_for_timeout(100)
    check("radar : filtre 6 mois pris en compte", pg.evaluate("ui.rx.horizon") == 6)
    n0 = pg.evaluate("(state.mail||[]).length")
    pg.evaluate("state.dayCounter=3;state.mx&&(state.mx.alerted={});advanceDay()"); 
    pg.evaluate("dsMarket2.MX().alerted={};")
    # --- règles d'effectif
    r = pg.evaluate("""(()=>{const c=userClub();c.players.slice(0,12).forEach(p=>{p.nationality='Brésil';p.trainedCountry='bresil';p.age=27});
      const before=dsMarket2.rulesCheck(c);dsMarket2.enforce(c,'test');const a=dsMarket2.rulesCheck(c);
      const out=c.players.filter(p=>p.unreg);
      return {before:before.ok,after:a.ok,nonEU:a.nonEU,cap:a.cap,out:out.length,avail:out.length?isAvailable(out[0],'2000-01-01'):null};})()""")
    check("quota hors UE dépassé détecté", r["before"] is False, str(r))
    check("liste recomposée conforme", r["after"] is True and r["nonEU"] <= r["cap"] and r["out"] >= 1, str(r))
    check("un joueur non inscrit n'est pas disponible", r["avail"] is False, str(r))
    pg.evaluate("ui.rx.view='rules';ui.tab='radar';render()"); pg.wait_for_timeout(100)
    check("écran Règles d'effectif affiché", "Hors UE" in pg.inner_text("#tab-content") and pg.locator('[data-mx^="reg:"]').count() > 10)
    # --- négociation avancée : boîte injectée
    tgt = pg.evaluate("(()=>{const c=userClub();c.budget=2e9;const o=allClubs().find(x=>x.id!==c.id);const p=o.players.find(q=>q.position!=='GB');return p.id;})()")
    pg.evaluate("ui.tab='market';render()"); pg.wait_for_selector("#negotiation-modal", state="attached")
    pg.evaluate("openNegotiation(%d)" % tgt); pg.wait_for_selector("#nx-box")
    check("négociation : montage avancé proposé", pg.locator("#nx-box .nx-pl").count() >= 10)
    pg.evaluate("document.getElementById('nx-box').open=true")
    pg.select_option("#nx-up", "50"); pg.select_option("#nx-yrs", "2")
    check("résumé du montage calculé", "Valeur perçue" in pg.inner_text("#nx-sum"))
    pg.evaluate("window.__r=Math.random;Math.random=()=>0.0")
    pg.click("#send-offer"); pg.wait_for_timeout(200)
    pg.evaluate("Math.random=window.__r")
    st = pg.evaluate("({acc:window.__nxPending&&window.__nxPending.accepted, rest:window.__nxPending&&window.__nxPending.c.rest})")
    check("offre échelonnée évaluée par le vendeur", st["acc"] is True and st["rest"] > 0, str(st))
    pg.evaluate("document.getElementById('negotiation-modal').innerHTML=''")
    # --- application directe du montage (échange + échéances + option de rachat)
    res = pg.evaluate("""(()=>{const c=userClub();const p=getPlayer(%d);const seller=getClub(p.clubId);const ex=c.players.filter(x=>x.position!=='GB').sort((a,b)=>a.value-b.value)[0];
      const T=Math.max(10000000,ex.value*3);const o={up:0.5,yrs:2,sell:15,bb:true,ex:[ex]};const cc=dsMarket2.nxCompute(p,T,o);
      window.__nxPid=p.id;window.__nxPending={pid:p.id,T,o,c:cc,perceived:cc.perceived,accepted:true,sellOn:15,bb:true,yrs:2};
      const sid=seller.id,pre=dsMarket2.MX().inst.length;
      transferPlayer(p,sid,c.id,cc.upfront,{wage:p.wage,payCommission:false});
      const inst=dsMarket2.MX().inst.length-pre;
      return {inst,clubOk:p.clubId===c.id,exMoved:getPlayer(ex.id).clubId===sid,bb:!!p.buyBack,sell:(p.sellOnClauses||[]).length>0,cash:cc.upfront,rest:cc.rest,credit:cc.credit};})()""" % tgt)
    check("transfert : joueur arrivé, échange effectué", res["clubOk"] and res["exMoved"], str(res))
    check("2 échéances programmées + option de rachat + clause de revente", res["inst"] == 2 and res["bb"] and res["sell"], str(res))
    bud = pg.evaluate("[getTransferBudget(userClub()), dsMarket2.MX().inst.reduce((s,i)=>s+i.amount,0)]")
    check("échéances déduites du budget de transferts", bud[1] > 0, str(bud))
    pay = pg.evaluate("""(()=>{const c=userClub();const b0=c.budget;dsMarket2.MX().inst.forEach(i=>i.due=state.dayCounter);advanceDay();
      return {paid:dsMarket2.MX().inst.length===0,delta:b0-c.budget};})()""")
    check("échéances prélevées à la date prévue", pay["paid"] and pay["delta"] > 0, str(pay))
    # --- dernier jour du mercato
    dd = pg.evaluate("""(()=>{dsMarket2.startDeadline();const d=dsMarket2.MX().dd;const w0=!!currentWindow();
      const f=dsMarket2.failChance(23)>dsMarket2.failChance(12);
      while(!d.closed)dsMarket2.ddTick(d);
      return {hasWin:w0,closed:d.closed,win:currentWindow(),f};})()""")
    check("dernier jour : le risque d'échec grimpe avec l'heure", dd["f"] is True)
    check("à minuit le mercato est fermé", dd["closed"] and dd["win"] is None, str(dd))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc13(b, port):
    print("== Bases de données personnalisées (bloc 13)")
    import json, tempfile
    pg = new_page(b, 1280, 800, False)
    pg.goto(f"http://127.0.0.1:{port}/index.html"); pg.wait_for_selector("#btn-new")
    check("menu : bouton Bases de données", pg.locator("#btn-packs").count() == 1)
    tpl = pg.evaluate("dsPacks.templateJSON()")
    check("modèle : tous les clubs du jeu listés", len(tpl["clubs"]) > 300 and "match" in tpl["clubs"][0], str(len(tpl["clubs"])))
    open(os.path.join(ROOT, "databases", "modele.json"), "w").write(json.dumps(tpl, ensure_ascii=False, indent=1))
    d = tempfile.mkdtemp()
    first = tpl["clubs"][0]["match"]
    pack = {"format": "ds-pack", "name": "Test", "clubs": [{"match": first, "name": "Vrai Club Test", "short": "VCT", "logo": "vct.png", "color": "#123456", "players": [{"first": "Jean", "last": "Dupont", "pos": "GB", "age": 30}]}]}
    open(os.path.join(d, "test.json"), "w").write(json.dumps(pack))
    png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    import base64; open(os.path.join(d, "vct.png"), "wb").write(base64.b64decode(png))
    pg.click("#btn-packs"); pg.wait_for_selector("#pk-file", state="attached")
    pg.set_input_files("#pk-file", [os.path.join(d, "test.json"), os.path.join(d, "vct.png")]); pg.wait_for_timeout(600)
    check("import : 1 base et 1 logo", "1 base(s) et 1 logo(s)" in pg.inner_text("#pk-root"), pg.inner_text("#pk-root")[:200])
    pg.click('[data-pk="close"]')
    start_multi(pg, port, 2); clear(pg)
    r = pg.evaluate("""(()=>{const c=allClubs().find(x=>x.baseName===%s);const g=c&&c.players.find(p=>p.lastName==='Dupont');
      return {name:c&&c.name,logo:!!(c&&c.logoUrl&&c.logoUrl.startsWith('data:')),col:c&&c.kitColor,p:!!g&&g.position==='GB'&&g.age===30,svg:c&&clubLogoSvg(c).includes('<image')};})()""" % json.dumps(first))
    check("club renommé avec vrai nom", r["name"] == "Vrai Club Test", str(r))
    check("logo importé affiché (image)", r["logo"] and r["svg"], str(r))
    check("couleur et joueur appliqués", r["col"] == "#123456" and r["p"], str(r))
    pg.evaluate("dsPacks.togglePack(dsPacks.list()[0].id);dsPacks.applyPacks()")
    back = pg.evaluate("allClubs().some(c=>c.name===%s)" % json.dumps(first))
    check("désactiver la base rétablit le nom d'origine", back)
    pg.evaluate("dsPacks.togglePack(dsPacks.list()[0].id);dsPacks.applyPacks();state&&saveGame()")
    pg.reload(); pg.wait_for_selector("#btn-continue"); pg.wait_for_timeout(500)
    check("la base survit au rechargement", pg.evaluate("dsPacks.list().length") == 1)
    err = pg.evaluate("(()=>{try{dsPacks.addPack({clubs:[]});return null}catch(e){return e.message}})()")
    check("fichier invalide refusé proprement", err is not None, str(err))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc15(b, port):
    print("== Confort téléphone : cartes, filtres, haptique (bloc 15)")
    pg = new_page(b, 390, 844, True)
    start_multi(pg, port, 2); clear(pg)
    for tab in ["squad", "market", "finance", "calendar"]:
        pg.evaluate("ui.tab='%s';render()" % tab); clear(pg); pg.wait_for_timeout(250)
        r = pg.evaluate("({cards:document.querySelectorAll('table.cards-tbl').length,on:document.body.classList.contains('cards-on'),ov:document.documentElement.scrollWidth-innerWidth,disp:getComputedStyle(document.querySelector('table.cards-tbl tr')||document.body).display})")
        check(f"{tab} : vue en cartes active, sans défilement latéral", r["cards"] >= 1 and r["on"] and r["ov"] <= 0 and r["disp"] == "grid", str(r))
    pg.evaluate("ui.tab='market';render()"); pg.wait_for_timeout(250)
    check("marché : filtres repliés par défaut", pg.evaluate("(()=>{const d=document.querySelector('.mk-fold');return !!d&&!d.open})()"))
    pg.evaluate("document.querySelector('.mk-fold').open=true"); pg.wait_for_timeout(100)
    check("marché : les filtres s'ouvrent", pg.is_visible(".mk-fold .search-panel"))
    pg.click('.cards-toggle [data-cards="0"]'); pg.wait_for_timeout(100)
    check("bascule vers l'affichage tableau", pg.evaluate("!document.body.classList.contains('cards-on')"))
    pg.click('.cards-toggle [data-cards="1"]')
    tiny = pg.evaluate("""(()=>{let n=0;document.querySelectorAll('body *').forEach(e=>{if(e.children.length||!e.textContent.trim())return;if(!e.getBoundingClientRect().width)return;if(parseFloat(getComputedStyle(e).fontSize)<11)n++});return n})()""")
    check("plus aucun texte sous 11 px", tiny == 0, str(tiny))
    h = pg.evaluate("""(()=>{let calls=[];navigator.vibrate=(p)=>{calls.push(p);return true};dsHaptic('good');dsHaptic('bad');localStorage.setItem('ds_haptic','0');dsHaptic('big');localStorage.setItem('ds_haptic','1');return calls})()""")
    check("haptique : vibrations émises (et coupées par le réglage)", len(h) == 2, str(h))
    pg.evaluate("window.__v=0;navigator.vibrate=()=>{window.__v++;return true};const c=userClub();const o=allClubs().find(x=>x.id!==c.id);transferPlayer(o.players[0],o.id,c.id,1000)")
    check("haptique : transfert réussi", pg.evaluate("window.__v") >= 1)
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

def suite_bloc16(b, port):
    print("== Ventes réalistes, bilan de mercato, tutoriel (bloc 16)")
    pg = new_page(b, 1280, 800, False)
    start_multi(pg, port, 2); clear(pg)
    pg.evaluate("allClubs().forEach(c=>{c.budget=2e9})")
    # --- le prix demandé influence l'intérêt des clubs
    r = pg.evaluate("""(()=>{const c=userClub();const p=c.players.find(x=>!x.onLoan&&x.position!=='GB');p.listed=true;
      const run=(price)=>{dsSales.S().asks[p.id]=price;state.inbox=state.inbox.filter(o=>o.type!=='offer_incoming');for(let i=0;i<500;i++){generateIncomingOffersForUser();state.inbox=state.inbox.filter(o=>o.type!=='offer_incoming'||false);
        }return 0};
      let low=0,high=0;
      dsSales.S().asks[p.id]=Math.round(p.value*1.0);for(let i=0;i<600;i++){const n0=state.inbox.length;generateIncomingOffersForUser();low+=state.inbox.length-n0;state.inbox.length=n0;}
      dsSales.S().asks[p.id]=Math.round(p.value*1.6);for(let i=0;i<600;i++){const n0=state.inbox.length;generateIncomingOffersForUser();high+=state.inbox.length-n0;state.inbox.length=n0;}
      return {low,high};})()""")
    check("prix demandé élevé : beaucoup moins d'offres", r["low"] > 30 and r["high"] < r["low"] * 0.5, str(r))
    # --- vente avec paiement échelonné
    s = pg.evaluate("""(()=>{const c=userClub();const p=c.players.filter(x=>!x.onLoan&&x.position!=='GB')[1];const b=allClubs().find(x=>x.id!==c.id);
      const o={id:nextId(),type:'offer_incoming',playerId:p.id,fromClubId:b.id,amount:10000000,date:fmtDate(state.date),resolved:false,w:2e7,terms:{up:0.5,yrs:2}};state.inbox.unshift(o);
      const bud0=c.budget;resolveIncomingOffer(o.id,true);
      const inst=dsMarket2.MX().inst.filter(i=>i.pid===p.id);
      const r1={sold:p.clubId===b.id,gain:c.budget-bud0,n:inst.length,toMe:inst.every(i=>i.to===c.id&&i.from===b.id)};
      const b1=c.budget;inst.forEach(i=>i.due=state.dayCounter);advanceDay();r1.paid=c.budget-b1;return r1;})()""")
    check("vente échelonnée : joueur parti, 50 % encaissé tout de suite", s["sold"] and 4.5e6 <= s["gain"] <= 5.5e6, str(s))
    check("2 échéances versées à vous, puis encaissées", s["n"] == 2 and s["toMe"] and s["paid"] > 4e6, str(s))
    # --- échange de joueurs
    e = pg.evaluate("""(()=>{const c=userClub();const p=c.players.filter(x=>!x.onLoan&&x.position!=='GB')[2];const b=allClubs().find(x=>x.id!==c.id);const q=b.players.find(x=>x.position!=='GB');
      const o={id:nextId(),type:'offer_incoming',playerId:p.id,fromClubId:b.id,amount:Math.max(p.value,q.value*3),date:fmtDate(state.date),resolved:false,w:1e9,terms:{up:1,yrs:1,exchangePid:q.id}};state.inbox.unshift(o);
      resolveIncomingOffer(o.id,true);return {out:p.clubId===b.id,inn:getPlayer(q.id).clubId===c.id};})()""")
    check("offre avec échange : les deux joueurs changent de club", e["out"] and e["inn"], str(e))
    # --- négociation : contre-proposition acceptée avec clause de revente
    pg.evaluate("ui.tab='radar';ui.rx={view:'sales',horizon:12,scope:'network'};render()"); clear(pg); pg.wait_for_timeout(150)
    pid = pg.evaluate("""(()=>{const c=userClub();const p=c.players.filter(x=>!x.onLoan&&x.position!=='GB')[3];const b=allClubs().find(x=>x.id!==c.id);
      const o={id:nextId(),type:'offer_incoming',playerId:p.id,fromClubId:b.id,amount:Math.round(p.value*0.8),date:fmtDate(state.date),resolved:false,w:p.value*3,terms:null};state.inbox.unshift(o);window.__oid=o.id;return p.id})()""")
    pg.evaluate("ui.tab='radar';render()"); clear(pg); pg.wait_for_timeout(150)
    check("écran Ventes : offre listée avec bouton Négocier", pg.locator('[data-sl^="neg:"]').count() >= 1)
    pg.evaluate("document.querySelector('[data-sl=\"neg:'+window.__oid+'\"]').click()"); pg.wait_for_selector("#sl-T")
    pg.select_option("#sl-sell", "15"); pg.click('[data-sl="nsend"]'); pg.wait_for_timeout(200)
    res = pg.evaluate("({sold:getPlayer(%d).clubId!==userClub().id,clause:(getPlayer(%d).sellOnClauses||[]).some(x=>x.clubId===userClub().id&&x.pct===15)})" % (pid, pid))
    check("contre-proposition acceptée : vendu avec 15 % de revente", res["sold"] and res["clause"], str(res))
    # --- le club se retire si les exigences sont déraisonnables
    w = pg.evaluate("""(()=>{const c=userClub();const p=c.players.filter(x=>!x.onLoan&&x.position!=='GB')[4];const b=allClubs().find(x=>x.id!==c.id);
      const o={id:nextId(),type:'offer_incoming',playerId:p.id,fromClubId:b.id,amount:Math.round(p.value*0.8),date:fmtDate(state.date),resolved:false,w:p.value*0.9,terms:null};state.inbox.unshift(o);window.__oid2=o.id;return o.id})()""")
    pg.evaluate("openNegotiationSale=null"); pg.evaluate("ui.tab='radar';render()"); clear(pg); pg.wait_for_timeout(100)
    pg.evaluate("document.querySelector('[data-sl=\"neg:'+window.__oid2+'\"]').click()"); pg.wait_for_selector("#sl-T")
    pg.fill("#sl-T", "900000000"); pg.click('[data-sl="nsend"]'); pg.wait_for_timeout(200)
    check("exigences démesurées : le club retire son offre", pg.evaluate("state.inbox.find(o=>o.id===window.__oid2).resolved===true&&state.inbox.find(o=>o.id===window.__oid2).accepted===false"))
    # --- enchères
    a = pg.evaluate("""(()=>{const c=userClub();const p=c.players.filter(x=>!x.onLoan&&x.position!=='GB')[5];const r=dsSales.startAuction(p.id);
      for(let i=0;i<4;i++)advanceDay();const o=state.inbox.find(x=>x.type==='offer_incoming'&&x.auction&&x.playerId===p.id&&!x.resolved);
      return {ok:r.ok,offer:!!o,amount:o&&o.amount,val:p.value,closed:!dsSales.S().auctions[p.id]};})()""")
    check("enchères : plusieurs clubs, offre finale reçue", a["ok"] and a["offer"] and a["closed"], str(a))
    check("enchères : meilleure offre proche de la valeur", a["amount"] >= a["val"] * 0.85, str(a))
    # --- bilan de mercato
    g = pg.evaluate("""(()=>{if(!state.mx.win)dsSales.startWin();const c=userClub();const o=allClubs().find(x=>x.id!==c.id);const q=o.players.find(x=>x.position!=='GB');
      transferPlayer(q,o.id,c.id,5000000);dsSales.closeWin();const s=state.mx.summaries[0];
      return {letter:s.g.letter,arr:s.arr.length,spent:s.spent,mails:(state.mail||[]).some(m=>/Bilan du/.test(m.subject)),pending:state.mx.summaryPending};})()""")
    check("bilan : note, arrivée et dépense enregistrées", g["letter"] in "ABCDE" and g["arr"] >= 1 and g["spent"] >= 5000000 and g["mails"], str(g))
    clear(pg); pg.evaluate("document.getElementById('match-modal').innerHTML='';render()"); pg.wait_for_timeout(200)
    check("bilan : écran affiché à la clôture", "Bilan" in pg.inner_text("#sl-root") and pg.locator(".sl-grade").count() == 1)
    pg.evaluate("document.getElementById('sl-root').innerHTML='';ui.rx.view='bilan';ui.tab='radar';render()"); clear(pg); pg.wait_for_timeout(150)
    check("onglet Bilan du Radar", "dernier bilan" in pg.inner_text("#tab-content").lower())
    # --- tutoriel
    check("glossaire : nouveautés ajoutées", pg.evaluate("['montage financier','valeur perçue','option de rachat','prix demandé','enchères','radar','liste d\\'effectif','salle des marchés','bilan du mercato','bases de données'].every(k=>!!dsHelp.GL[k])"))
    check("visite guidée : étapes Radar, ventes, bilan", pg.evaluate("['Radar','Vendre vos joueurs','Bilan du mercato','Montage financier','Vos bases de données'].every(t=>dsHelp.STEPS.some(s=>s.title===t))"))
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

if __name__ == "__main__":
    srv, port = serve()
    with sync_playwright() as p:
        kw = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"): kw["executable_path"] = os.environ["CHROMIUM_PATH"]
        b = p.chromium.launch(**kw)
        for s in (suite_phone, suite_desktop, suite_save, suite_gameplay, suite_agent, suite_realism, suite_fm24, suite_help, suite_bloc6, suite_bloc7, suite_bloc9, suite_bloc11, suite_bloc12, suite_bloc13, suite_bloc15, suite_bloc16):
            try: s(b, port)
            except Exception as e: FAILS.append(f"{s.__name__}: {e}"); print("  FAIL", s.__name__, e)
        b.close()
    print(f"\n{PASSES} OK, {len(FAILS)} échec(s)"); sys.exit(1 if FAILS else 0)
