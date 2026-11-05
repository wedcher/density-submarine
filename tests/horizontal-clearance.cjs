const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const level=JSON.parse(fs.readFileSync(path.join(__dirname,'../levels/05蝸牛地形.json'),'utf8'));
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});try{
 for(const file of ['src/editor.html','index.html']){
  const page=await browser.newPage();await page.addInitScript(()=>window.setInterval=()=>0);await page.goto(pathToFileURL(path.join(__dirname,'..',file)).href);
  const checks=await page.evaluate(level=>{
   if(typeof playLevel==='function')playLevel(level,level.name);else{importLevelText(JSON.stringify(level));toggleMode()}
   const realRocks=rocks.map(r=>({...r})),names=[];
   const check=(name,fn)=>{fn();names.push(name)},require=(ok,reason)=>{if(!ok)throw Error(reason+': '+JSON.stringify(state))};
   const reset=(x,y,m=1,v=2)=>{resetKeyboardMotion();state={x,y,m,v,key:0,won:false};goalPos=null;items=[];rocks=realRocks.map(r=>({...r}));};
   for(const y of [159.01,159.3,159.9,160])check('snail screenshot right '+y,()=>{reset(379.5,y);require(!blocked(state.x,state.y),'invalid initial position');for(let i=0;i<8;i++){moveX(24);buoy();require(!blocked(state.x,state.y),'collision')}require(state.x>500&&state.y===160,'stuck in one-cell passage')});
   const tunnel=(gap=40)=>[{x:400,y:40,w:200,h:100},{x:400,y:140+gap,w:200,h:100}];
   for(const dir of [-1,1])for(const [y,m,v] of [[159.3,1,2],[160.7,1,4]])check('exact edge correction dir '+dir+' density '+m/v,()=>{reset(dir>0?350:650,y,m,v);rocks=tunnel();for(let i=0;i<5;i++)moveX(dir*24);require(state.y===160&&state.x>400&&state.x<600&&!blocked(state.x,state.y),'did not align')});
   check('narrower than hull stays blocked',()=>{reset(379.5,159.3);rocks=tunnel(39);moveX(24);require(state.x<381,'entered narrow tunnel')});
   check('cannot move away from density region',()=>{reset(379.5,160.7);rocks=tunnel();moveX(24);require(state.x<381&&state.y===160.7,'opposed density to enter tunnel')});
   check('cannot cross wall during alignment',()=>{reset(379.5,159.3);rocks=tunnel();rocks.push({x:350,y:179.5,w:50,h:1});moveX(24);require(state.x<381&&state.y===159.3,'crossed wall to align')});
   check('closed door stays blocked',()=>{reset(379.5,159.3);rocks=tunnel();items=[{type:'door',x:420,y:160,open:false}];moveX(24);require(state.x<=380&&!items[0].open,'crossed door')});
   check('beyond 8px correction stays put',()=>{reset(379.5,151.9);rocks=tunnel();moveX(24);require(state.x<381&&state.y===151.9,'correction exceeded limit')});
   check('open water does not nudge',()=>{reset(300,159.3);rocks=[];moveX(24);require(state.x===324&&state.y===159.3,'unnecessary correction')});
   return names;
  },level);
  console.log('PASS '+file+': '+checks.length+' horizontal clearance checks');await page.close();
 }
 const live=await browser.newPage({viewport:{width:844,height:327},hasTouch:true,isMobile:true});
 await live.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('unsupported')}});
 await live.route('https://**/*',route=>route.abort());await live.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
 await live.evaluate(level=>{playLevel(level,level.name);Object.assign(state,{x:379.5,y:159.3,m:1,v:2});render()},level);
 await live.screenshot({path:path.join(__dirname,'../test-results/snail-touch-before.png')});
 const button=await live.locator('#right').boundingBox(),cdp=await live.context().newCDPSession(live);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2,id:1}]});
 await live.waitForFunction(()=>state.x>520,{},{timeout:4000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert(await live.evaluate(()=>state.y===160&&!blocked(state.x,state.y)&&state.m===1&&state.v===2));
 await live.screenshot({path:path.join(__dirname,'../test-results/snail-touch-after.png')});await live.close();
 console.log('PASS real touch hold and live buoyancy cross screenshot passage without changing hull, stats or level');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
