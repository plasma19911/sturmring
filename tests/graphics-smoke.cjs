/* Browser smoke tests exercise the real game renderer; instrumentation is test-only. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const source = fs.readFileSync('index.html', 'utf8');
const hook = `window.__graphicsTest={biomes:Object.keys(BIOMES),run(gfx,biome,tod,rain){
  S=defSave();S.cfg.gfx=gfx;const cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.appendChild(cv);
  const m=newMatch(null,{n:16,W:3000,biome});m.tod=tod;if(rain)m.fxp={rain:1,c:0xa8c8ff,vy:-520};
  const view=makeView(cv);if(!view)throw Error('WebGL unavailable');view.load(m);
  const b=m.bots[0];m.focus={x:b.x,y:b.y};
  for(let i=0;i<90;i++)step(m);
  // Include an explosion to exercise the fixed pool of dynamic point lights.
  m.fx.push({x:b.x+35,y:b.y,t:.35});
  for(let i=0;i<3;i++)view.render(m,b.x,b.y,{h:180,b:380},1000+i*16,1/60,1,b,0);
  const gl=view.renderer.getContext();const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let min=255,max=0;for(let i=0;i<pixels.length;i+=4){const v=pixels[i]+pixels[i+1]+pixels[i+2];min=Math.min(min,v);max=Math.max(max,v)}
  const errors=[];for(let i=0;i<8;i++){const e=gl.getError();if(!e)break;errors.push(e)}
  return{errors,min,max,calls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles,postprocessing:!!view.composer};
}};`;
assert(source.includes('return{load,render}}'));
assert(source.includes('renderLobby(); if(still)staticDemo();\nrequestAnimationFrame(frame);'));
const instrumented = source.replace('return{load,render}}', 'return{load,render,renderer:ren,composer}}')
  .replace('renderLobby(); if(still)staticDemo();\nrequestAnimationFrame(frame);', hook);
(async () => {
  fs.mkdirSync('test-results', {recursive:true});
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results=[];
  try {
    const biomes=['wiese','wald','dorf','wueste','eis','industrie','alien'];
    for(const gfx of ['low','high','ultra']) for(const biome of biomes){
      const tod=gfx==='ultra'?'nacht':'tag';
      const page=await browser.newPage({viewport:{width:gfx==='low'?390:800,height:gfx==='low'?700:500},deviceScaleFactor:1,hasTouch:gfx==='low'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/unavailable/i.test(m.text()))errors.push(m.text())});
      await page.route('**/*',r=>r.request().url()==='https://sturmring.test/'?r.fulfill({contentType:'text/html',body:instrumented}):r.fulfill({status:204,body:''}));
      await page.goto('https://sturmring.test/');
      const result=await page.evaluate(({gfx,biome,tod})=>window.__graphicsTest.run(gfx,biome,tod,biome==='industrie'||biome==='wald'),{gfx,biome,tod});
      await page.screenshot({path:`test-results/${gfx}-${biome}.png`});
      assert.deepEqual(errors,[],`${gfx}/${biome} browser errors`);assert.deepEqual(result.errors,[],`${gfx}/${biome} GL errors`);
      assert(result.max-result.min>25,'Frame has no visible variation');assert(result.calls>0,'No draw calls');
      assert.equal(result.postprocessing,gfx==='ultra','Unexpected renderer fallback');
      results.push({gfx,biome,tod,...result});console.log(JSON.stringify(results.at(-1)));await page.close();
    }
  } finally {fs.writeFileSync('test-results/graphics.json',JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
