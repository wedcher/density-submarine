const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
async function startSite(){const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8'));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};}
async function mountBackend(context,backend){
 await context.exposeFunction('__testBackend',(action,payload)=>backend.call(action,payload));
 await context.route('https://script.google.com/macros/**',route=>{
  const u=new URL(route.request().url()),inner=new URL('https://test-script.googleusercontent.com/bridge');for(const key of ['origin','channel'])inner.searchParams.set(key,u.searchParams.get(key));
  return route.fulfill({contentType:'text/html',body:'<!doctype html><iframe src="'+inner.href.replaceAll('&','&amp;')+'"></iframe>'});
 });
 await context.route('https://test-script.googleusercontent.com/**',route=>{
  const u=new URL(route.request().url()),cfg={origin:u.searchParams.get('origin'),channel:u.searchParams.get('channel')};
  const stub='<script>window.google={script:{get run(){let success,failure;const c={withSuccessHandler(fn){success=fn;return c},withFailureHandler(fn){failure=fn;return c},listLevels(){window.__testBackend("list").then(success,failure)},getLevel(p){window.__testBackend("get",p).then(success,failure)},submitLevel(p){window.__testBackend("submit",p).then(success,failure)}};return c}}};</script>';
  const html=fs.readFileSync(path.join(__dirname,'../../google-apps-script/Index.html'),'utf8').replace('<?!= bridgeConfig ?>',JSON.stringify(cfg)).replace('<script>',stub+'<script>');
  return route.fulfill({contentType:'text/html',body:html});
 });
}
module.exports={startSite,mountBackend};
