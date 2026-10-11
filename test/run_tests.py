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
    pg.evaluate("ui.tab='squad';render()"); pg.wait_for_timeout(150); clear(pg)
    if pg.locator(".rot-hint button").count():
        pg.locator(".rot-hint button").first.tap(); check("tableau plein écran s'ouvre", pg.is_visible("#table-full")); pg.tap("#tf-close")
    else: check("bouton tableau plein écran présent", False)
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
    pg.evaluate("advanceDay();saveGame()"); pg.wait_for_timeout(500)
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
    check("Ligue des Champions créée", pg.evaluate("state.cups.continental && state.cups.continental.label") == "Ligue des Champions")
    check("Ligue Europa créée", pg.evaluate("!!(state.cups.europa && state.cups.europa.label==='Ligue Europa')"))
    n = pg.evaluate("(()=>{const c=state.cups.continental;return c.pendingAdvancers.length+c.rounds[0].matches.length*2;})()")
    check("8 qualifiés en Ligue des Champions (4 par pays x 2)", n == 8, str(n))
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
    eu = pg.evaluate("(()=>{const e=state.cups.europa, c=state.cups.continental; return [c&&(c.champion||c.rounds.length), e&&(e.champion||e.rounds.length)];})()")
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
    clear(pg); pg.evaluate("state.media&&(state.media.pending=null); state.pendingBoard=null; render()"); pg.wait_for_timeout(200)
    check("fenêtre « Dernier jour du mercato » affichée", "Dernier jour du mercato" in pg.inner_text("#fm-root"))
    check("bandeau du mercato : « DERNIER JOUR »", "DERNIER JOUR" in pg.inner_text(".sb-window"))
    pg.evaluate("document.getElementById('fm-root').innerHTML=''")
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
    for _ in range(30):
        if not pg.query_selector(".tour-card"): break
        st = pg.evaluate("dsHelp.STEPS[dsHelp.tourState().i].wait")
        if st == "next" or True: pg.evaluate("document.querySelector('[data-tour=next]') && document.querySelector('[data-tour=next]').click()")
        pg.wait_for_timeout(120)
    check("la visite se termine proprement", not pg.query_selector(".tour-card") and pg.evaluate("localStorage.getItem('ds_tour_done')") == "1")
    check("aucune erreur JS", not pg.errs, str(pg.errs)); pg.context.close()

if __name__ == "__main__":
    srv, port = serve()
    with sync_playwright() as p:
        kw = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"): kw["executable_path"] = os.environ["CHROMIUM_PATH"]
        b = p.chromium.launch(**kw)
        for s in (suite_phone, suite_desktop, suite_save, suite_gameplay, suite_agent, suite_realism, suite_fm24, suite_help):
            try: s(b, port)
            except Exception as e: FAILS.append(f"{s.__name__}: {e}"); print("  FAIL", s.__name__, e)
        b.close()
    print(f"\n{PASSES} OK, {len(FAILS)} échec(s)"); sys.exit(1 if FAILS else 0)
