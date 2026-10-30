const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});try{
const page=await browser.newPage({viewport:{width:1280,height:950}});await page.addInitScript(()=>window.setInterval=()=>0);
await page.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href);
assert.equal(await page.locator('#officialLevels button.selected').count(),1);await page.locator('#officialLevels button').nth(2).click();assert.equal(await page.locator('#officialLevels button.selected').textContent(),await page.locator('#officialLevels button').nth(2).textContent());
await page.evaluate(()=>{
 mode='play';rocks=[];goalPos=null;state={x:100,y:340,m:1,v:1,key:0,won:false};
 items=[{type:'key',x:100,y:340},{type:'key',x:100,y:340},{type:'door',x:140,y:340},{type:'door',x:140,y:380},{type:'door',x:180,y:420},{type:'door',x:260,y:340}];collect();
});
assert.equal(await page.evaluate(()=>state.key),2);assert(await page.evaluate(()=>items.filter(i=>i.type==='door').every(i=>!i.open)));
await page.evaluate(()=>moveX(24));assert.deepEqual(await page.evaluate(()=>({keys:state.key,open:items.filter(i=>i.type==='door').map(i=>!!i.open)})),{keys:1,open:[true,true,false,false]});
await page.evaluate(()=>{moveX(-12);moveX(12)});assert.equal(await page.evaluate(()=>state.key),1);
await page.evaluate(()=>{for(let i=0;i<6;i++)moveX(24)});assert.equal(await page.evaluate(()=>state.key),0);assert(await page.evaluate(()=>items[5].open&&!items[4].open));
await page.evaluate(()=>{state.x=100;items=[{type:'door',x:140,y:340}];moveX(100)});assert(await page.evaluate(()=>!items[0].open&&state.x<=110));
console.log('PASS keys accumulate; doors remain shut on pickup; orthogonal group opens once; diagonal separate; one key per door; no-key collision');
await page.evaluate(()=>{resetKeyboardMotion();items=[];rocks=[];goalPos=null;state={x:300,y:340,m:1,v:1,key:0,won:false};render()});
await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');const release=await page.evaluate(()=>state.x);await page.waitForTimeout(70);const moving=await page.evaluate(()=>state.x);await page.waitForTimeout(500);const stopped=await page.evaluate(()=>state.x);assert(moving>release);assert(stopped>moving);assert(stopped-release<20);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>state.x),stopped);
await page.keyboard.down('ArrowUp');await page.waitForTimeout(100);await page.keyboard.up('ArrowUp');const y=await page.evaluate(()=>state.y);await page.waitForTimeout(450);assert(await page.evaluate(releaseY=>state.y<releaseY&&releaseY-state.y<15,y));
await page.keyboard.down('ArrowRight');await page.waitForTimeout(50);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurX=await page.evaluate(()=>state.x);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>state.x),blurX);
await page.evaluate(()=>{state.x=100;state.y=340;rocks=[{x:140,y:300,w:40,h:80}];render()});await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');await page.waitForTimeout(400);assert(await page.evaluate(()=>state.x<=130&&!blocked(state.x,state.y)));
console.log('PASS real keyboard horizontal/vertical release coast, bounded stopping distance, blur reset and wall collision');
await page.evaluate(()=>{rocks=[];goalPos={x:state.x,y:state.y};finish();render()});assert(await page.locator('#completionBadge').isVisible());assert(await page.evaluate(()=>state.won));
await page.screenshot({path:path.join(__dirname,'..','test-results','new-gameplay.png'),fullPage:true});await page.locator('#playRestart').click();assert(await page.locator('#completionBadge').isHidden());assert(await page.evaluate(()=>!state.won&&state.key===0&&items.every(i=>!i.open)));
console.log('PASS completion badge and restart clears win, keys and opened doors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
