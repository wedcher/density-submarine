const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const {startSite,mountBackend}=require('./helpers/site.cjs'),{createBackend}=require('./helpers/backend.cjs');
const artifacts=path.join(__dirname,'../test-results');
(async()=>{const site=await startSite(),browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});try{
 const context=await browser.newContext({viewport:{width:844,height:327},hasTouch:true,isMobile:true});await mountBackend(context,createBackend());
 await context.addInitScript(()=>{window.setInterval=()=>0;Element.prototype.requestFullscreen=async()=>{throw Error('unsupported')};});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(site.url);await page.locator('#designEntry').tap();
 await page.locator('#authorName').fill('海洋設計師');await page.locator('#levelName').fill('橫向測試');
 for(const [width,height] of [[844,327],[667,280],[932,430],[1024,768],[1366,1024],[1920,1080],[3840,2160]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(120);
  const bounds=await page.evaluate(()=>{const r=$('stage').getBoundingClientRect(),t=$('materialRow');return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,scroll:document.documentElement.scrollWidth,tools:getComputedStyle(t).overflowY,top:$('designTop').getBoundingClientRect().bottom}});
  assert(bounds.x>=0&&bounds.y>=bounds.top&&bounds.right<=width&&bounds.bottom<=height,JSON.stringify(bounds));assert(Math.abs(bounds.w/bounds.h-1000/560)<.01);assert(bounds.scroll<=width);assert.equal(bounds.tools,'auto');
  if(width===844||width===1024)await page.screenshot({path:path.join(artifacts,`editor-${width}.png`)});
 }
 await page.setViewportSize({width:844,height:327});await page.waitForTimeout(120);
 const place=async(tool,x,y)=>{await page.locator(`[data-tool="${tool}"]`).tap();const b=await page.locator('#stage').boundingBox();const rotated=await page.evaluate(()=>document.body.dataset.rotated==='true');await page.touchscreen.tap(rotated?b.x+b.width-y/560*b.width:b.x+x/1000*b.width,rotated?b.y+x/1000*b.height:b.y+y/560*b.height)};
 await place('boat',100,340);await place('goal',180,340);const draft=await page.evaluate(()=>levelData());
 assert.equal(draft.start.column,2);assert(!Object.hasOwn(draft,'author'));assert(!Object.hasOwn(draft,'authorName'));
 const before=await page.locator('#stage').boundingBox();await page.locator('#materialRow').evaluate(e=>e.scrollTop=1000);assert.deepEqual(await page.locator('#stage').boundingBox(),before);
 page.once('dialog',d=>d.dismiss());await page.locator('#clearBtn').tap();assert.deepEqual(await page.evaluate(()=>levelData()),draft);
 await page.setViewportSize({width:327,height:844});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.body.dataset.rotated),'true');assert(await page.locator('#rotatePrompt').isHidden());
 await place('rock',380,340);assert(await page.evaluate(()=>map[8][9]==='rock'));await place('erase',380,340);assert.deepEqual(await page.evaluate(()=>levelData()),draft);
 await page.screenshot({path:path.join(artifacts,'editor-portrait-fallback.png')});
 await page.locator('#modeBtn').tap();assert.equal(await page.evaluate(()=>document.body.dataset.view),'play');assert.equal(await page.evaluate(()=>appView),'design');assert.equal(await page.evaluate(()=>playPaused),false);
 await page.locator('#right').tap();assert(await page.evaluate(()=>state.x>100));
 await page.setViewportSize({width:844,height:327});await page.waitForTimeout(150);for(let i=0;i<2;i++)await page.locator('#right').tap();assert(await page.evaluate(()=>state.won));assert(await page.locator('#trialSubmit').isVisible());
 await page.screenshot({path:path.join(artifacts,'editor-trial-success.png')});
 await page.locator('#trialSubmit').tap();assert.equal(await page.locator('#submissionAuthor').inputValue(),'海洋設計師');await page.locator('#submissionName').fill('通關後命名');await page.locator('#submissionAuthor').fill('小海豚');assert(await page.evaluate(()=>canSubmit()));
 await page.screenshot({path:path.join(artifacts,'editor-submission.png')});
 await page.setViewportSize({width:327,height:844});await page.waitForTimeout(150);
 const dialog=await page.locator('#submissionDialog').boundingBox();assert(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=328&&dialog.y+dialog.height<=845);
 await page.locator('#submissionAuthor').fill('小海豚');await page.locator('#submissionConsent').check();await page.locator('#submissionSend').tap();await page.waitForFunction(()=>$('submissionStatus').textContent.includes('投稿成功'));
 await page.locator('#submissionClose').tap();await page.locator('#trialReturn').tap();assert.equal(await page.locator('#levelName').inputValue(),'通關後命名');assert.equal(await page.locator('#authorName').inputValue(),'小海豚');
 await page.reload();await page.locator('#designEntry').tap();assert.equal(await page.locator('#authorName').inputValue(),'小海豚');
 // Exercise both native-lock outcomes without claiming hardware verification.
 await page.evaluate(async()=>{window.lockCalls=[];document.documentElement.requestFullscreen=async()=>lockCalls.push('fullscreen');screen.orientation.lock=async value=>lockCalls.push(value);await tryLandscapeLock()});
 assert.deepEqual(await page.evaluate(()=>lockCalls),['fullscreen','landscape']);assert.equal(await page.evaluate(()=>document.body.dataset.orientationLock),'locked');
 await page.evaluate(async()=>{screen.orientation.lock=async()=>{throw Error('denied')};await tryLandscapeLock()});assert.equal(await page.evaluate(()=>document.body.dataset.orientationLock),'fallback');assert.deepEqual(errors,[]);
 console.log('PASS editor layout at 7 sizes, fixed map/tools scrolling, rotated touch coordinates, clear cancellation, trial/win/name/author flow, nickname persistence and native-lock success/rejection stubs');
 fs.writeFileSync(path.join(artifacts,'editor-results.json'),JSON.stringify({passed:true,googleApis:'mocked',orientationLock:'success/rejection stubs only',physicalDevice:false},null,2));
}finally{await browser.close();await site.close()}})().catch(e=>{console.error(e);process.exitCode=1});
