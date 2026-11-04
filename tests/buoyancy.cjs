const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const level=JSON.parse(fs.readFileSync(path.join(__dirname,'../levels/01_雙邊抉擇 (2).json'),'utf8'));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  for(const file of ['src/editor.html','index.html']){
   const page=await browser.newPage();await page.addInitScript(()=>window.setInterval=()=>0);
   await page.goto(pathToFileURL(path.join(__dirname,'..',file)).href);
   const result=await page.evaluate(level=>{
    const checks=[],check=(name,fn)=>{fn();checks.push(name)},require=(ok,message)=>{if(!ok)throw Error(message)};
    if(typeof playLevel==='function')playLevel(level,level.name);else{importLevelText(JSON.stringify(level));toggleMode()}
    const realRocks=rocks.map(r=>({...r})),realItems=items.map(i=>({...i}));
    const reset=(x,y,m=1,v=4)=>{resetKeyboardMotion();state={x,y,m,v,key:0,won:false};goalPos=null;items=[];rocks=realRocks.map(r=>({...r}));};
    const tick=(count=100)=>{for(let i=0;i<count;i++){buoy();require(!blocked(state.x,state.y),'hull overlaps an obstacle')}};
    for(const offset of [.1,.3,1.3,2,11.75])check('right screenshot rising, offset '+offset,()=>{
     reset(640+offset,340.2);items=realItems.map(i=>({...i}));tick();require(state.x===640&&state.y===140,'right gap remains stuck: '+JSON.stringify(state));
    });
    for(const offset of [-11.75,-2,-.1,.1,2,11.75])check('left screenshot rising, offset '+offset,()=>{
     reset(280+offset,460.2);items=realItems.map(i=>({...i}));tick();require(state.x===280&&state.y===140,'left gap remains stuck: '+JSON.stringify(state));
    });
    const boundary=()=>[{x:0,y:0,w:1000,h:40},{x:0,y:520,w:1000,h:40}];
    const gate=(width=80)=>[...boundary(),{x:0,y:120,w:400,h:20},{x:400+width,y:120,w:600-width,h:20}];
    check('sinking through exact two-cell opening',()=>{reset(442.3,80,3,4);rocks=gate();tick();require(state.x===440&&state.y===280,'sinking did not align')});
    check('already aligned keeps x',()=>{reset(440,80,3,4);rocks=gate();tick();require(state.x===440&&state.y===280,'aligned path changed')});
    check('smaller hull also aligns',()=>{reset(408.2,80,3,1);rocks=gate(20);tick();require(state.x===410&&state.y===500,'small hull did not align')});
    check('narrow gap stays blocked',()=>{reset(440,80,3,4);rocks=gate(79);tick();require(state.y===100,'squeezed through a gap narrower than hull')});
    check('solid ceiling stays blocked',()=>{reset(440,180);rocks=[...boundary(),{x:0,y:120,w:1000,h:20}];tick();require(state.x===440&&state.y===160,'crossed solid ceiling')});
    check('closed door stays blocked',()=>{reset(442.3,80,3,4);rocks=gate();items=[{type:'door',x:440,y:130}];tick();require(state.y>=80&&state.y<=100&&!items[0].open,'crossed closed door')});
    check('cannot align through side wall',()=>{reset(398,80,3,4);rocks=gate();rocks.push({x:438,y:40,w:2,h:80});tick();require(state.x===398&&state.y===100,'crossed lateral wall')});
    check('beyond correction range stays put',()=>{reset(453,80,3,4);rocks=gate();tick();require(state.x===453&&state.y===100,'correction exceeded 12px')});
    check('no sideways motion in open water',()=>{reset(442.3,80,3,4);rocks=boundary();tick();require(state.x===442.3&&state.y===280,'unnecessary horizontal movement')});
    check('paused buoyancy stays stopped',()=>{reset(442.3,80,3,4);rocks=gate();playPaused=true;tick();playPaused=false;require(state.x===442.3&&state.y===80,'paused state moved')});
    return checks;
   },level);
   console.log('PASS '+file+': '+result.length+' buoyancy checks (real screenshot locations, fractional alignment, sinking, collision and correction limits)');
   await page.close();
  }
  // Run the unchanged 90ms buoyancy timer as well, with the real template and
  // a touch-sized viewport. No manual ticks or mocked physics in this check.
  const live=await browser.newPage({viewport:{width:844,height:327},hasTouch:true,isMobile:true}),errors=[];
  live.on('pageerror',e=>errors.push(e.message));await live.route('https://**/*',route=>route.abort());
  await live.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  const artifacts=path.join(__dirname,'../test-results');fs.mkdirSync(artifacts,{recursive:true});
  for(const [name,x,y] of [['right',640.3,340.2],['left',280.1,460.2]]){
   await live.evaluate(({level,x,y})=>{playLevel(level,level.name);Object.assign(state,{x,y,m:1,v:4});render()},{level,x,y});
   await live.screenshot({path:path.join(artifacts,'buoyancy-'+name+'-before.png')});
   await live.waitForFunction(()=>state.y===140,{},{timeout:8000});
   assert(await live.evaluate(()=>!blocked(state.x,state.y)&&state.m===1&&state.v===4));
   await live.screenshot({path:path.join(artifacts,'buoyancy-'+name+'-after.png')});
  }
  assert.deepEqual(errors,[]);await live.close();
  console.log('PASS real buoyancy timer rises from both screenshot locations on the unchanged first template');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
