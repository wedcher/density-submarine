const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
const root=path.join(__dirname,'..');
const dir=path.join(root,'google-apps-script');
const artifacts=path.join(root,'test-results');fs.mkdirSync(artifacts,{recursive:true});
const sample=JSON.parse(fs.readFileSync(path.join(root,'levels','01_換層接力.json'),'utf8'));
const files=[],properties={};let failCreate=false,failProperties=false,failDescription=false,lockReleased=0;
function iterator(list){let i=0;return {hasNext:()=>i<list.length,next:()=>list[i++]};}
const props={getProperty:k=>properties[k]??null,getProperties:()=>({...properties}),setProperty:(k,v)=>{properties[k]=v},deleteProperty:k=>delete properties[k],setProperties:o=>{if(failProperties){failProperties=false;throw Error('properties failure')}Object.assign(properties,o)}};
const ctx=vm.createContext({console:{error:()=>{}},Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>crypto.createHash(a).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),formatDate:(_d,_tz,f)=>f==='yyyy-MM-dd'?'2026-10-28':'20261028_120000'},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>lockReleased++})},PropertiesService:{getScriptProperties:()=>props},DriveApp:{getFolderById:id=>{assert.equal(id,'test_folder_12345');return {getFiles:()=>iterator(files.filter(f=>!f.trashed)),createFile:(name,content,type)=>{if(failCreate)throw Error('Drive failure');const f={name,content,type,getName(){return this.name},setDescription(s){if(failDescription)throw Error('description failure');this.description=s;return this},getDescription(){return this.description},setTrashed(v){this.trashed=v}};files.push(f);return f}}}}});
vm.runInContext(fs.readFileSync(path.join(dir,'Code.gs'),'utf8').replace("'在這裡貼上你的資料夾ID'","'test_folder_12345'"),ctx);
function payload(overrides={}){return {requestId:crypto.randomUUID(),author:'測試作者',note:'密度應用',website:'',level:JSON.stringify(sample),...overrides};}
function send(p){return ctx.submitLevel(p)}
const results=[];
function test(name,fn){fn();results.push(name);console.log('PASS '+name)}
test('server stores an importable level with author metadata',()=>{const p=payload();const r=send(p);assert(r.ok);assert.equal(r.receipt,p.requestId);assert.deepEqual(JSON.parse(files[0].content),sample);assert.equal(JSON.parse(files[0].description).author,p.author);});
test('same request is idempotent; changed content with same ID is rejected',()=>{const p=payload();assert(send(p).ok);const n=files.length;assert(send(p).ok);assert.equal(files.length,n);assert.equal(send({...p,note:'changed'}).ok,false)});
test('invalid types, unknown fields, missing start, overlap, oversized bytes and honeypot are rejected',()=>{
 const bad=[null,{},payload({author:' '}),payload({website:'spam'}),payload({level:'{'}),payload({level:'x'.repeat(200001)}),payload({note:'x'.repeat(1001)})];
 for(const mutate of [d=>d.start=null,d=>d.extra=true,d=>d.initial.m=9,d=>d.goal=d.start,d=>d.items.push({type:'mass',column:-1,row:1}),d=>d.name='字'.repeat(120)]){
  const d=structuredClone(sample);mutate(d);if(d.name.length===120){d.name='好';}else bad.push(payload({level:JSON.stringify(d)}));
 }
 // Valid JSON under the character limit but over the byte limit.
 const text=JSON.stringify(sample)+' '.repeat(65000)+'\n'+'　'.repeat(50000);assert(text.length<200000);bad.push(payload({level:text}));
 const count=files.length;for(const p of bad)assert.equal(send(p).ok,false);assert.equal(files.length,count);
});
test('Drive failure returns no success and releases lock',()=>{failCreate=true;const n=lockReleased;assert.equal(send(payload()).ok,false);failCreate=false;assert(lockReleased>n)});
test('failed metadata write removes partial new file',()=>{failDescription=true;const before=files.filter(f=>!f.trashed).length;assert.equal(send(payload()).ok,false);failDescription=false;assert.equal(files.filter(f=>!f.trashed).length,before)});
test('retry recovers file after property storage failure without duplicate',()=>{const p=payload();failProperties=true;assert.equal(send(p).ok,false);const n=files.length;assert(send(p).ok);assert.equal(files.length,n)});
test('daily cap rejects new requests but permits previous receipt retry',()=>{const p=payload();assert(send(p).ok);properties.submissionCount='100';assert.equal(send(payload()).ok,false);assert(send(p).ok);properties.submissionCount='5'});
test('new day resets only submission properties',()=>{properties.submissionDay='2026-10-27';properties.keep='yes';assert(send(payload()).ok);assert.equal(properties.submissionCount,'1');assert.equal(properties.keep,'yes')});

(async()=>{const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});try{
 const p=await browser.newPage({viewport:{width:1200,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.setInterval=()=>0});
 await p.goto(pathToFileURL(path.join(dir,'Index.html')).href);
 await p.locator('#submitBtn').click();assert.match(await p.locator('#msg').textContent(),/小艇與終點/);
 await p.locator('#importFile').setInputFiles(path.join(root,'levels','01_換層接力.json'));
 await p.waitForFunction(()=>levelData().name==='01_換層接力');
 await p.locator('#submitBtn').click();assert(await p.locator('#submissionDialog').isVisible());assert(await p.locator('#submissionSend').isDisabled());assert.match(await p.locator('#submissionStatus').textContent(),/本機版/);await p.locator('#submissionClose').click();
 results.push('browser local mode, import and missing-level checks');
 await p.exposeFunction('testSubmit',data=>send(data));
 await p.evaluate(()=>{window.google={script:{get run(){let success,failure;const chain={withSuccessHandler(fn){success=fn;return chain},withFailureHandler(fn){failure=fn;return chain},submitLevel(data){window.testSubmit(data).then(success,failure)}};return chain}}}});
 await p.locator('#modeBtn').click();assert.equal(await p.evaluate(()=>mode),'play');
 await p.locator('#submitBtn').click();await p.locator('#submissionAuthor').fill('測試同學');await p.locator('#submissionNote').fill('練習密度');
 const before=await p.evaluate(()=>state.x);await p.locator('#submissionNote').press('ArrowRight');assert.equal(await p.evaluate(()=>state.x),before);
 await p.locator('#submissionConsent').check();await p.screenshot({path:path.join(artifacts,'投稿視窗_桌面.png'),fullPage:true});
 const snapshot=await p.evaluate(()=>JSON.stringify(levelData()));
 await p.locator('#submissionSend').click();await p.waitForFunction(()=>$('submissionStatus').textContent.includes('投稿成功'));
 assert.equal(await p.evaluate(()=>JSON.stringify(levelData())),snapshot);
 const count=files.length;await p.locator('#submissionSend').click();await p.waitForFunction(()=>$('submissionStatus').textContent.includes('投稿成功'));assert.equal(files.length,count);
 results.push('browser submission during play, original level preservation, receipt and retry');
 await p.setViewportSize({width:600,height:1000});await p.screenshot({path:path.join(artifacts,'投稿視窗_手機.png'),fullPage:true});
 assert(await p.evaluate(()=>{const r=$('submissionDialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));
 await p.locator('#submissionNote').fill('server failure test');failCreate=true;await p.locator('#submissionSend').click();await p.waitForFunction(()=>$('submissionStatus').textContent.includes('收件未完成'));failCreate=false;assert(await p.locator('#submissionSend').isEnabled());
 await p.evaluate(()=>{Object.defineProperty(google.script,'run',{get(){const c={withSuccessHandler(){return c},withFailureHandler(fn){c.failure=fn;return c},submitLevel(){c.failure(Error('network'))}};return c}})});
 await p.locator('#submissionSend').click();await p.waitForFunction(()=>$('submissionStatus').textContent.includes('未能確認'));
 results.push('browser narrow layout and server/network failure reporting');
 await p.locator('#submissionClose').click();await p.locator('#modeBtn').click();assert.equal(await p.evaluate(()=>mode),'edit');
 await p.evaluate(()=>window.showSaveFilePicker=undefined);const wait=p.waitForEvent('download');await p.locator('#exportBtn').click();const download=await wait;assert.equal(download.suggestedFilename(),'01_換層接力.json');
 results.push('original JSON export still downloads');
 await p.goto(pathToFileURL(path.join(dir,'先看這裡_設定教學.html')).href);assert.equal(await p.locator('[data-copy]').count(),2);assert.equal(await p.locator('#server').inputValue(),fs.readFileSync(path.join(dir,'Code.gs'),'utf8'));assert.equal(await p.locator('#game').inputValue(),fs.readFileSync(path.join(dir,'Index.html'),'utf8'));
 await p.screenshot({path:path.join(artifacts,'設定教學預覽.png'),fullPage:true});
 assert.deepEqual(errors,[]);results.push('tutorial embeds exactly the deployment files; no browser script errors');
 fs.writeFileSync(path.join(artifacts,'cloud-results.json'),JSON.stringify({tests:results,passed:results.length,cloudDeploymentTested:false,note:'Apps Script APIs mocked locally; anonymous deployment and real Drive write require owner setup and incognito acceptance test.'},null,2)+'\n');
 console.log('PASS '+results.length+' checks. Real Google deployment still requires account setup.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
