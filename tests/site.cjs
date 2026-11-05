const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const {createBackend}=require('./helpers/backend.cjs'),{startSite,mountBackend}=require('./helpers/site.cjs');
const root=path.join(__dirname,'..');
const reports=JSON.parse(fs.readFileSync(path.join(__dirname,'solutions.json'),'utf8'));
async function winRecorded(page,data,report){return page.evaluate(({data,trace})=>{playLevel(data,data.name);for(const {command:cmd} of trace){if(cmd==='+')changeV(true);else if(cmd==='-')changeV(false);else if(cmd==='drop')dropM();else{for(let i=0;i<120;i++)buoy();const [x,y]=cmd;for(let i=0;i<40&&Math.abs(state.y-y)>8.01;i++)moveY(Math.sign(y-state.y));if(Math.abs(state.y-y)>8.01)throw Error('depth');for(let i=0;i<8&&!state.won&&Math.abs(state.x-x)>0.01;i++){const old=state.x;moveX(x-state.x);if(old===state.x)break}if(!state.won&&Math.abs(state.x-x)>0.01)throw Error('opening')}if(blocked(state.x,state.y))throw Error('collision')}return state.won},{data,trace:report.trace});}
async function clickCell(page,x,y){const b=await page.locator('#stage').boundingBox();await page.mouse.click(b.x+x*b.width/1000,b.y+y*b.height/560)}
async function winDraft(page){await page.locator('#modeBtn').click();await page.locator('#right').click();await page.locator('#right').click();await page.locator('#right').click();assert(await page.evaluate(()=>state.won));assert(await page.locator('#submitBtn').isEnabled());}
(async()=>{const site=await startSite(),backend=createBackend(),browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});try{
 const first=await browser.newContext({viewport:{width:1280,height:1000}}),second=await browser.newContext({viewport:{width:1280,height:1000}});
 for(const context of [first,second]){await mountBackend(context,backend);await context.addInitScript(()=>{window.setInterval=()=>0;window.showSaveFilePicker=undefined});}
 const a=await first.newPage(),b=await second.newPage(),errors=[];a.on('dialog',d=>d.accept());for(const page of [a,b])page.on('pageerror',e=>errors.push(e.message));
 await a.goto(site.url);await b.goto(site.url);await a.waitForFunction(()=>$('communityStatus').textContent.includes('目前還沒有'));await b.waitForFunction(()=>$('communityStatus').textContent.includes('目前還沒有'));
 assert.equal(await a.evaluate(()=>appView),'home');assert(await a.locator('#gameSurface').isHidden());assert(await a.locator('#materialRow').isHidden());assert.equal(await a.locator('#officialLevels button').count(),7);
 console.log('PASS default level selection, 7 official templates, background bridge readiness');
 assert.deepEqual(await a.locator('#officialLevels button').allTextContents(),['01一馬平川','02上上下下','03如何下去','04雙邊抉擇','05蝸牛地形','06蝸牛地形2','07卡來卡去']);
 const sources=JSON.parse(fs.readFileSync(path.join(root,'levels/sources.json'),'utf8'));
 for(let i=0;i<sources.levels.length;i++){await a.locator('#officialLevels button').nth(i).click();assert.equal(await a.evaluate(()=>mode),'play');assert(await a.evaluate(()=>state&&!blocked(state.x,state.y)));const expected=JSON.parse(fs.readFileSync(path.join(root,'levels',sources.levels[i].file),'utf8'));expected.rocks.sort((x,y)=>x.halfRow-y.halfRow||x.column-y.column);assert.deepEqual(await a.evaluate(()=>levelData()),expected);await a.locator('#backToLevels').click();}
 console.log('PASS all 7 user templates import/start unchanged; no template or student width restriction; full solutions not asserted');
 for(const report of reports){const data=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',report.name+'.json'),'utf8'));assert(await winRecorded(a,data,report));assert(!await a.evaluate(()=>canSubmit()));}
 console.log('PASS prior 5 solved regression routes; ordinary play cannot qualify a design');
 await a.locator('#backToLevels').click();await a.locator('#designEntry').click();assert.equal(await a.evaluate(()=>appView),'design');assert.equal(await a.evaluate(()=>mode),'edit');assert(await a.locator('#submitBtn').isDisabled());
 await a.locator('#levelName').fill('同學自製關卡');
 await a.locator('[data-tool="boat"]').click();await clickCell(a,100,340);
 await a.locator('[data-tool="goal"]').click();await clickCell(a,180,340);
 const draft=await a.evaluate(()=>levelData());assert.deepEqual(draft.start,{column:2,row:8});assert.deepEqual(draft.goal,{column:4,row:8});
 await a.locator('#backToPlay').click();await a.locator('#designEntry').click();assert.deepEqual(await a.evaluate(()=>levelData()),draft);
 const downloaded=a.waitForEvent('download');await a.locator('#exportBtn').click();const download=await downloaded;assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),draft);
 await a.locator('#clearBtn').click();await a.locator('#importFile').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(draft))});await a.waitForFunction(()=>levelData().start!==null);assert.deepEqual(await a.evaluate(()=>levelData()),draft);
 console.log('PASS real editor pointer design, return/restoration, JSON save/clear/import');
 await winDraft(a);await a.locator('#trialReturn').click();await a.locator('#levelName').fill('修改過');await a.locator('#levelName').fill(draft.name);assert(await a.locator('#submitBtn').isEnabled());
 await winDraft(a);await a.locator('#trialReturn').click();await a.locator('[data-tool="rock"]').click();await clickCell(a,380,340);await a.locator('[data-tool="erase"]').click();await clickCell(a,380,340);assert(await a.locator('#submitBtn').isDisabled());assert.deepEqual(await a.evaluate(()=>levelData()),draft);
 await winDraft(a);await a.locator('#trialReturn').click();await a.locator('#importFile').setInputFiles({name:'same.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(draft))});await a.waitForFunction(()=>!canSubmit());
 console.log('PASS names preserve qualification; geometry edit/undo and identical reimport revoke completion');
 await winDraft(a);await a.locator('#trialSubmit').click();await a.locator('#submissionAuthor').fill('小海豚');await a.locator('#submissionConsent').check();
 await a.evaluate(()=>{map[8][7]='rock'});await a.locator('#submissionSend').click();assert.match(await a.locator('#submissionStatus').textContent(),/關卡已變更/);assert.equal(backend.rows.length,1);await a.locator('#submissionClose').click();
 await a.locator('#trialReturn').click();await a.locator('[data-tool="erase"]').click();await clickCell(a,300,340);await winDraft(a);
 await a.locator('#trialSubmit').click();backend.failWrite(true);await a.locator('#submissionSend').click();await a.waitForFunction(()=>$('submissionStatus').textContent.includes('尚未就緒'));assert(!/投稿成功/.test(await a.locator('#submissionStatus').textContent()));backend.failWrite(false);
 await a.locator('#submissionSend').click();await a.waitForFunction(()=>$('submissionStatus').textContent.includes('投稿成功'));const count=backend.rows.length;await a.locator('#submissionSend').click();await a.waitForFunction(()=>$('submissionStatus').textContent.includes('投稿成功'));assert.equal(backend.rows.length,count);
 console.log('PASS full-map recheck, honest failure message, Sheets write through bridge, retry deduplication');
 await b.locator('#communityRefresh').click();await b.waitForFunction(()=>$('communityLevels').textContent.includes('小海豚'));await b.locator('#communityLevels button').click();await b.waitForFunction(()=>$('playingTitle').title.includes('小海豚'));
 for(let i=0;i<3;i++)await b.locator('#right').click();assert(await b.evaluate(()=>state.won));assert.equal(b.url(),site.url+'/');assert.equal(second.pages().length,1);
 console.log('PASS independent student B refreshes and plays student A submission, no deployment or page switch (simulated Google APIs)');
 await a.locator('#submissionClose').click();await a.setViewportSize({width:390,height:844});await a.locator('#trialSubmit').click();assert(await a.evaluate(()=>{const r=$('submissionDialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));const oldX=await a.evaluate(()=>state.x);await a.locator('#submissionNote').fill('測試');await a.locator('#submissionNote').press('ArrowRight');assert.equal(await a.evaluate(()=>state.x),oldX);
 const artifacts=path.join(root,'test-results');fs.mkdirSync(artifacts,{recursive:true});await a.screenshot({path:path.join(artifacts,'classroom-mobile.png'),fullPage:true});await b.screenshot({path:path.join(artifacts,'classroom-student-b.png'),fullPage:true});
 console.log('PASS mobile dialog and keyboard isolation');
 await a.locator('#submissionClose').click();await a.setViewportSize({width:1280,height:1000});await a.locator('#trialReturn').click();
 const narrow={...draft,name:'窄通道驗證',start:{column:2,row:9},goal:{column:2,row:7},rocks:[{column:1,halfRow:16,widthCells:1,heightHalfRows:2},{column:3,halfRow:16,widthCells:1,heightHalfRows:2}]};
 await a.locator('#importFile').setInputFiles({name:'narrow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(narrow))});await a.waitForFunction(()=>levelData().name==='窄通道驗證');await a.locator('#modeBtn').click();assert.equal(await a.evaluate(()=>mode),'play');for(let i=0;i<3;i++)await a.locator('#up').click();assert(await a.evaluate(()=>state.won));assert(await a.locator('#submitBtn').isEnabled());
 await a.locator('#trialSubmit').click();await a.locator('#submissionSend').click();await a.waitForFunction(()=>$('submissionStatus').textContent.includes('投稿成功'));await b.locator('#backToLevels').click();await b.locator('#communityRefresh').click();await b.waitForFunction(()=>$('communityLevels').textContent.includes('窄通道驗證'));await b.locator('#communityLevels button').filter({hasText:'窄通道驗證'}).click();await b.waitForFunction(()=>levelData().name==='窄通道驗證');for(let i=0;i<3;i++)await b.locator('#up').click();assert(await b.evaluate(()=>state.won));
 console.log('PASS student-designed 1-cell channel: test, win, submit, load and win as another student; no width gate');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(artifacts,'classroom-results.json'),JSON.stringify({localEndToEnd:true,narrowStudentMapRoundTrip:true,googleApis:'mocked',liveGoogleSubmission:'待使用者驗收',liveSecondStudent:'待使用者驗收'},null,2));console.log('PASS no browser script errors');
}finally{await browser.close();await site.close()}})().catch(e=>{console.error(e);process.exitCode=1});
