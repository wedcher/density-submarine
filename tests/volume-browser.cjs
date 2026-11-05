const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const {startSite}=require('./helpers/site.cjs');
(async()=>{
 const site=await startSite();let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1000,height:650}});
  await page.addInitScript(()=>window.setInterval=()=>0);await page.goto(site.url);
  for(const wide of [true,false]){
   await page.evaluate(wide=>{
    playLevel(EXAMPLE_LEVELS[0],EXAMPLE_LEVELS[0].name);mode='play';items=[];goalPos=null;
    rocks=[{x:40,y:200,w:40,h:80},{x:wide?160:120,y:200,w:40,h:80},{x:80,y:240,w:wide?80:40,h:40}];
    state={x:wide?139.7:100,y:220,m:1,v:2,key:0,won:false};drawWorld();render();
   },wide);
   await page.locator('#vPlus').click();
   const stateAfter=await page.evaluate(()=>({x:state.x,y:state.y,v:state.v,blocked:blocked(state.x,state.y),width:boat.style.width}));
   assert.deepEqual(stateAfter,{x:wide?120:100,y:wide?220:180,v:4,blocked:false,width:'80px'});
   fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
   await page.screenshot({path:path.join(__dirname,`../test-results/volume-${wide?'sideways':'upward'}.png`)});
  }
  console.log('PASS actual V+ button: nearest sideways relief and upward pocket escape');
 }finally{if(browser)await browser.close();await site.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
