// Real browser cookie isolation, local HTTP only. No Google requests or user profile.
const assert=require('node:assert/strict'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
(async()=>{
 const seen={};
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/bridge'){seen[u.searchParams.get('mode')]=req.headers.cookie||'';res.end('<p>bridge</p>');}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><iframe src="/bridge?mode=ordinary"></iframe><iframe credentialless src="/bridge?mode=isolated"></iframe>');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext(),url='http://127.0.0.1:'+server.address().port;
  await context.addCookies([{name:'existing_login',value:'multiple_accounts_fixture',url}]);
  const page=await context.newPage();await page.goto(url);await page.waitForLoadState('load');
  assert.equal(await page.evaluate(()=>'credentialless' in HTMLIFrameElement.prototype),true);
  assert.match(seen.ordinary,/existing_login/);assert.equal(seen.isolated,'');
  assert((await context.cookies(url)).some(c=>c.name==='existing_login'));
  console.log('PASS '+browser.version()+' existing cookies omitted only inside isolated iframe; original cookies retained');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
