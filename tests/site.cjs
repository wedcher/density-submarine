const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>window.setInterval=()=>0);
  await p.goto(pathToFileURL(path.join(root,'index.html')).href);
  await p.locator('#submitBtn').click();assert.match(await p.locator('#msg').textContent(),/關卡名稱/);
  const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
  const reports=JSON.parse(fs.readFileSync(path.join(__dirname,'solutions.json'),'utf8'));
  assert.equal(await p.locator('#exampleLevel option').count(),6);
  for(const [index,report] of reports.entries()){
   await p.locator('#exampleLevel').selectOption(String(index));
   assert.equal(await p.locator('#levelName').inputValue(),report.name);
   const sample=JSON.parse(fs.readFileSync(path.join(root,'levels',report.name+'.json'),'utf8'));
   sample.rocks.sort((a,b)=>a.halfRow-b.halfRow||a.column-b.column);
   const actual=await p.evaluate(()=>levelData());assert.deepEqual(actual,sample);
   const result=await p.evaluate(trace=>{
    toggleMode();for(const {command:cmd} of trace){
     if(cmd==='+')changeV(true);else if(cmd==='-')changeV(false);else if(cmd==='drop')dropM();else{
      for(let i=0;i<120;i++)buoy();const [x,y]=cmd;
      for(let i=0;i<40&&Math.abs(state.y-y)>8.01;i++)moveY(Math.sign(y-state.y));
      if(Math.abs(state.y-y)>8.01)throw Error('Cannot reach depth');
      for(let i=0;i<8&&!state.won&&Math.abs(state.x-x)>0.01;i++){const old=state.x;moveX(x-state.x);if(old===state.x)break;}
      if(!state.won&&Math.abs(state.x-x)>0.01)throw Error('Cannot cross opening');
     }
     if(blocked(state.x,state.y))throw Error('Hull collision');
    }
    const won=state.won;toggleMode();return won;
   },report.trace);
   assert(result);console.log('PASS example import and complete game route: '+report.name);
  }
  await p.locator('#submitBtn').click();assert(await p.locator('#submissionGuide').isVisible());assert.equal(await p.locator('#submissionLink').getAttribute('href'),config.submissionUrl);
  const downloadPromise=p.waitForEvent('download');await p.locator('#submissionDownload').click();const dl=await downloadPromise;assert.equal(dl.suggestedFilename(),'05_交界出發的質量選擇.json');
  assert.match(await p.locator('#submissionGuideStatus').textContent(),/匯入檔案/);assert(!/投稿成功/.test(await p.locator('#submissionGuideStatus').textContent()));
  const tabPromise=p.waitForEvent('popup');await p.context().route('https://script.google.com/**',r=>r.fulfill({body:'Submission destination test'}));await p.locator('#submissionLink').click();const tab=await tabPromise;await tab.waitForLoadState();assert.equal(tab.url(),config.submissionUrl);await tab.close();
  console.log('PASS submission downloads JSON and opens Google without claiming receipt');
  await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>{const r=$('submissionGuide').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));
  await p.locator('#submissionGuideClose').click();await p.locator('#modeBtn').click();assert.equal(await p.evaluate(()=>mode),'play');
  await p.locator('#submitBtn').click();const x=await p.evaluate(()=>state.x);await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>state.x),x);await p.locator('#submissionGuideClose').click();
  assert.deepEqual(errors,[]);console.log('PASS mobile layout, modal keyboard isolation, no browser errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
