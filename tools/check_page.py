# Sturmring-Seitentest: python3 tools/check_page.py  (braucht Playwright)
import sys,os
from playwright.sync_api import sync_playwright
f=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','index.html'));fail=0
def ok(c,msg):
    global fail
    print(('  ok   ' if c else '  FEHLER ')+msg)
    if not c: fail+=1
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    for touch in (True,False):
        kw=dict(viewport={"width":850,"height":400},has_touch=True,is_mobile=True) if touch else dict(viewport={"width":1280,"height":720})
        pg=b.new_page(**kw);pg.set_default_timeout(240000);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.add_init_script("window.SR_BIOME='dorf'")
        pg.goto("file://"+f,wait_until="domcontentloaded");pg.wait_for_timeout(4000)
        name='Handy' if touch else 'PC'
        for tab in ['Skills','Aussehen','Upgrades','Erfolge','Bot']:
            try: pg.click(".tabs >> text="+tab,no_wait_after=True,timeout=60000);pg.wait_for_timeout(700)
            except Exception as e: ok(False,name+': Tab '+tab+' nicht klickbar')
        ok(len(pg.inner_text("#lobbyBody"))>50,name+': Lobby hat Inhalt')
        pg.click("#start",no_wait_after=True);pg.wait_for_timeout(40000)
        st=pg.evaluate("(window.__rens||[]).map(r=>[r.info.render.calls,r.info.render.triangles])")
        main=st[-1] if st else [0,0]
        print(f"{name}: Zeichenaufrufe={main[0]} Dreiecke={main[1]}")
        ok(main[1]>20000,name+': Welt wird gezeichnet');ok(main[1]<(900000 if touch else 2200000),name+': Dreiecke im Rahmen');ok(main[0]<900,name+': Zeichenaufrufe im Rahmen')
        ok(not errs,name+': keine Seitenfehler'+(' → '+errs[0][:200] if errs else ''))
        pg.close()
    b.close()
print(f"\n{fail} FEHLER" if fail else "\nAlles in Ordnung");sys.exit(1 if fail else 0)
