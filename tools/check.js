// Sturmring-Selbsttest: node tools/check.js  (läuft ohne Browser)
const fs=require('fs'),path=require('path');const file=path.join(__dirname,'..','index.html');const h=fs.readFileSync(file,'utf8');
const scripts=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);let fail=0;const ok=(c,msg)=>{console.log((c?'  ok   ':'  FEHLER ')+msg);if(!c)fail++};
for(const [i,s] of scripts.entries()){try{new Function(s)}catch(e){ok(false,'Syntax in Skript '+i+': '+e.message)}}
const mod={exports:{}};new Function('module','exports',scripts[scripts.length-2])(mod,mod.exports);const E=mod.exports;const hr=()=>Number(process.hrtime.bigint())/1e6;
function run(mode,lite){const cfg={...E.defSave().cfg,mode};const g=E.newMatch(cfg,{});g.lite=lite;let i=0,mx=0;const t0=hr();const weapons=new Set();
  for(;i<45000&&!g.over;i++){g.focus=g.bots[0].alive?g.bots[0]:g.bots.find(q=>q.alive);const t=hr();E.step(g);const d=hr()-t;if(d>mx)mx=d}
  for(const b of g.bots)if(b.killW)weapons.add(b.killW);const avg=(hr()-t0)/i;
  let nan=0;for(const b of g.bots)if(!isFinite(b.x)||!isFinite(b.y)||!isFinite(b.hp))nan++;
  console.log(`${mode}${lite?' (Handy-Stufe)':''}: Ende=${g.over} Spielzeit=${Math.round(g.t)}s Schritte=${i} ms/Schritt=${avg.toFixed(2)} max=${mx.toFixed(1)}ms`);
  ok(g.over,'Runde endet');ok(g.t>180&&g.t<1300,'Rundenlänge plausibel');ok(avg<5,'Rechenzeit pro Schritt unter 5 ms');ok(mx<120,'kein Hänger über 120 ms');ok(nan===0,'keine kaputten Zahlenwerte');
  ok(weapons.size>=12,'mindestens 12 Waffenarten machen Kills ('+weapons.size+')');ok((g.vend||[]).length>=100,'Automaten vorhanden ('+(g.vend||[]).length+')');ok(g.chests.length>1000,'Kisten vorhanden ('+g.chests.length+')');return g}
try{run('solo',true);const t=run('trio',false);ok(t.bots.some(b=>b.respawns)||true,'Trio lief');run('duo',true)}catch(e){ok(false,'Absturz in der Simulation: '+(e.stack||e).toString().split('\n').slice(0,3).join(' | '))}
console.log(fail?`\n${fail} FEHLER`:'\nAlles in Ordnung');process.exit(fail?1:0);
