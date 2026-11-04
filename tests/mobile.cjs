const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const {createBackend}=require('./helpers/backend.cjs'),{startSite,mountBackend}=require('./helpers/site.cjs');
const artifacts=path.join(__dirname,'../test-results');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
 const site=await startSite(),browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  await mountBackend(context,createBackend());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const client=await context.newCDPSession(page);
  const touch=async(type,points=[])=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({x:p.x,y:p.y,id:p.id??i+1,radiusX:3,radiusY:3}))});
  const center=async id=>{const b=await page.locator('#'+id).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2}};
  const x=()=>page.evaluate(()=>state.x);
  const prepare=async(m=1,v=1)=>page.evaluate(({m,v})=>{
   const data={...EXAMPLE_LEVELS[0],name:'觸控測試',initial:{m,v},start:{column:7,row:8},goal:{column:23,row:8},rocks:[],items:[]};
   playLevel(data,data.name);
  },{m,v});
  await page.goto(site.url);await page.waitForFunction(()=>$('communityStatus').textContent.includes('目前還沒有'));
  assert(await page.locator('#gameSurface').isHidden());await page.screenshot({path:path.join(artifacts,'mobile-levels.png')});
  await page.locator('#officialLevels button').first().tap();assert(await page.locator('#rotatePrompt').isVisible());
  const pausedState=await page.evaluate(()=>JSON.stringify(state));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(state)),pausedState);
  await page.screenshot({path:path.join(artifacts,'mobile-rotate.png')});
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!playPaused);assert(await page.locator('#homePanel').isHidden());
  for(const [width,height] of [[844,390],[667,375],[932,430]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const layout=await page.evaluate(()=>{
    const rect=id=>{const {x,y,width,height}=$(id).getBoundingClientRect();return {x,y,width,height}};
    return {stage:rect('stage'),buttons:['left','right','up','down','vPlus','vMinus','mMinus'].map(rect),vw:innerWidth,vh:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
   });
   for(const r of [layout.stage,...layout.buttons]){assert(r.x>=-1&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({width,height,r}));}
   assert(layout.buttons.every(b=>b.width>=44&&b.height>=44));assert(layout.scrollWidth<=width);assert(layout.scrollHeight<=height);
   assert(Math.abs(layout.stage.width/layout.stage.height-1000/560)<.01);
   await page.screenshot({path:path.join(artifacts,`mobile-game-${width}.png`)});
  }
  console.log('PASS portrait pauses with rotate prompt; 667/844/932 landscape fits entire map and >=44px controls without scrolling');
  await page.setViewportSize({width:844,height:390});await prepare();
  const start=await x(),right=await center('right');await touch('touchStart',[right]);await page.waitForTimeout(480);const held=await x();assert(held-start>55);
  await touch('touchEnd');const released=await x();await page.waitForTimeout(240);assert.equal(await x(),released);
  // Moving out while captured must stop; releasing must not add a click step.
  await touch('touchStart',[right]);await page.waitForTimeout(200);await touch('touchMove',[{x:right.x,y:right.y-100}]);const outside=await x();await page.waitForTimeout(200);assert.equal(await x(),outside);await touch('touchEnd');assert.equal(await x(),outside);
  await touch('touchStart',[right]);await page.waitForTimeout(200);await touch('touchCancel');const canceled=await x();await page.waitForTimeout(200);assert.equal(await x(),canceled);
  await touch('touchStart',[right]);await page.waitForTimeout(200);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurred=await x();await page.waitForTimeout(200);assert.equal(await x(),blurred);await touch('touchEnd');
  console.log('PASS actual touch hold continues, release/slide-out/cancel/blur stops immediately, no extra click movement');
  await prepare();const up=await center('up');await touch('touchStart',[up]);await page.waitForTimeout(350);await touch('touchEnd');const y=await page.evaluate(()=>state.y);assert(y<315);await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>state.y),y);
  // Collision and key/door mechanics are reached through the same touch path.
  await prepare();await page.evaluate(()=>{rocks=[{x:360,y:40,w:40,h:480}];drawWorld()});
  await touch('touchStart',[right]);await page.waitForTimeout(650);await touch('touchEnd');assert(await page.evaluate(()=>state.x<=350&&!blocked(state.x,state.y)));
  await prepare();await page.evaluate(()=>{items=[{type:'door',x:380,y:340}];drawWorld()});
  await touch('touchStart',[right]);await page.waitForTimeout(650);await touch('touchEnd');assert(await page.evaluate(()=>state.x<=350&&!items[0].open));
  await page.evaluate(()=>state.key=1);await touch('touchStart',[right]);await page.waitForTimeout(400);await touch('touchEnd');assert(await page.evaluate(()=>state.x>380&&state.key===0&&items[0].open));
  console.log('PASS vertical hold, wall blocking and consuming a key to open a door through touch');
  await prepare();const volume=await center('vPlus');await touch('touchStart',[right]);await page.waitForTimeout(180);
  await touch('touchStart',[right,volume]);await page.waitForTimeout(80);await touch('touchEnd',[{...volume,id:2}]);
  assert.equal(await page.evaluate(()=>state.v),2);const simultaneous=await x();await page.waitForTimeout(180);assert(await x()>simultaneous);await touch('touchEnd');
  console.log('PASS one thumb keeps moving while the other taps V+ exactly once');
  await prepare();await touch('touchStart',[right]);await page.waitForTimeout(200);await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>playPaused);await touch('touchEnd');
  const rotated=await x();await page.waitForTimeout(200);assert.equal(await x(),rotated);await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!playPaused);await page.waitForTimeout(200);assert.equal(await x(),rotated);
  await page.locator('#swapControls').tap();assert.equal(await page.locator('#swapControls').getAttribute('aria-pressed'),'true');assert((await center('right')).x>(await center('vPlus')).x);
  await page.locator('#soundToggle').tap();assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false');
  await page.reload();await page.locator('#officialLevels button').first().tap();assert.equal(await page.locator('#swapControls').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false');
  await page.screenshot({path:path.join(artifacts,'mobile-swapped.png')});
  await page.locator('#swapControls').tap();await page.locator('#soundToggle').tap();await prepare(3,2);
  await page.evaluate(()=>{window.tones=[];const original=audioContext.createOscillator.bind(audioContext);audioContext.createOscillator=()=>{const oscillator=original();window.tones.push(oscillator);return oscillator}});
  const massButton=await center('mMinus');await touch('touchStart',[massButton]);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>state.m),3);await touch('touchEnd');
  await page.waitForFunction(()=>state.m===2);assert.equal(await page.locator('.massDrop').count(),1);assert(await page.evaluate(()=>tones.length===1&&audioContext.state==='running'&&audioMaster.gain.value>0));
  await page.screenshot({path:path.join(artifacts,'mobile-mass-drop.png')});
  await page.locator('#soundToggle').tap();await page.locator('#mMinus').tap();assert.equal(await page.evaluate(()=>state.m),1);assert.equal(await page.evaluate(()=>tones.length),1);assert.equal(await page.evaluate(()=>audioMaster.gain.value),0);
  await page.waitForTimeout(950);await page.locator('#mMinus').tap();assert.equal(await page.locator('.massDrop').count(),0);assert.equal(await page.evaluate(()=>tones.length),1);
  // With direction released, the density change still causes automatic rising.
  const buoyY=await page.evaluate(()=>state.y);await page.waitForTimeout(220);assert(await page.evaluate(previous=>state.y<previous,buoyY));
  console.log('PASS rotation clears held input; swap/sound persist; single mass drop animates and produces audio nodes only when allowed; buoyancy continues');
  await page.locator('#soundToggle').tap();await prepare();await page.evaluate(()=>{goalPos={x:state.x+48,y:state.y};drawWorld()});
  await page.locator('#right').tap();await page.waitForFunction(()=>state.won);assert(await page.locator('#completionBadge').isVisible());assert.equal(await page.locator('.confetti').count(),30);assert(await page.evaluate(()=>heldPointers.size===0&&tones.length===5));
  await page.waitForTimeout(700);await page.screenshot({path:path.join(artifacts,'mobile-success.png')});await page.locator('#playRestart').tap();assert(await page.locator('#completionBadge').isHidden());assert.equal(await page.locator('.confetti').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{goalPos={x:state.x,y:state.y};finish();render()});assert(await page.locator('#completionBadge').isVisible());assert.equal(await page.locator('.confetti').count(),0);
  await page.locator('#backToLevels').tap();assert(await page.locator('#homePanel').isVisible());assert(await page.locator('#gameSurface').isHidden());
  const homeState=await page.evaluate(()=>JSON.stringify(state));await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>JSON.stringify(state)),homeState);
  // Blocked browser storage and unavailable audio must never prevent play.
  const restricted=await browser.newContext({viewport:{width:1280,height:800}});await mountBackend(restricted,createBackend());
  await restricted.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw Error('blocked')};window.AudioContext=undefined;window.webkitAudioContext=undefined});
  const fallback=await restricted.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.goto(site.url);await fallback.locator('#officialLevels button').first().click();await fallback.locator('#swapControls').click();await fallback.locator('#soundToggle').click();
  assert.equal(await fallback.evaluate(()=>appView),'play');assert.deepEqual(errors,[]);
  console.log('PASS success animation/audio, restart cleanup, reduced motion, home pause, unavailable storage/audio fallback; no script errors');
  fs.writeFileSync(path.join(artifacts,'mobile-results.json'),JSON.stringify({browser:'Chromium '+(process.env.BROWSER_CHANNEL||'bundled'),touchInput:'CDP touch events',viewports:[[667,375],[844,390],[932,430],[390,844]],passed:true,googleApis:'mocked',physicalPhoneTest:false,audibleSoundReview:false},null,2));
 }finally{await browser.close();await site.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
