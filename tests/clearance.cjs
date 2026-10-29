const assert=require('node:assert/strict');const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});try{
 const p=await browser.newPage();await p.addInitScript(()=>window.setInterval=()=>0);
 let expected;
 for(const file of ['src/editor.html','index.html','google-apps-script/Index.html']){
  await p.goto(pathToFileURL(path.join(__dirname,'..',file)).href);
  const result=await p.evaluate(()=>{
   const checks=[];const check=(name,fn)=>{if(!fn())throw Error(name);checks.push(name)};
   const boundary=()=>[{x:0,y:0,w:1000,h:40},{x:0,y:520,w:1000,h:40}];
   mode='play';items=[];goalPos=null;
   // A horizontal opening exactly one hull high; button increments may leave y=108.
   check('horizontal alignment correction',()=>{rocks=[...boundary(),{x:840,y:40,w:40,h:40},{x:840,y:120,w:40,h:400}];state={x:800,y:108,m:1,v:4,key:false,won:false};for(let i=0;i<6;i++)moveX(24);return state.x>=920&&state.y===100&&!blocked(state.x,state.y)});
   for(const v of [1,2,4])check('2-cell vertical opening, V='+v,()=>{
    const shift=v===4?0:v===2?120:240;
    rocks=[...boundary(),{x:0,y:100+shift,w:400,h:20},{x:480,y:100+shift,w:520,h:20}];state={x:442,y:140+shift,m:1,v,key:false,won:false};
    for(let i=0;i<5;i++){moveY(-1);if(blocked(state.x,state.y))return false}
    if(state.y!==60+shift)return false;for(let i=0;i<5;i++){moveY(1);if(blocked(state.x,state.y))return false}return state.y===140+shift;
   });
   check('narrower than hull stays blocked',()=>{rocks=[...boundary(),{x:0,y:100,w:420,h:20},{x:480,y:100,w:520,h:20}];state={x:450,y:140,m:1,v:4,key:false,won:false};for(let i=0;i<8;i++)moveY(-1);return state.y===140&&!blocked(state.x,state.y)});
   check('solid wall stays blocked',()=>{rocks=[...boundary(),{x:840,y:40,w:40,h:480}];state={x:800,y:108,m:1,v:4,key:false,won:false};moveX(24);return state.x===800&&state.y===108});
   check('correction stays within density region',()=>{rocks=[...boundary(),{x:840,y:40,w:40,h:110},{x:840,y:190,w:40,h:330}];state={x:800,y:140,m:1,v:4,key:false,won:false};moveX(24);return state.x===800&&state.y===140});
   return {checks,core:[size,blocked,changeStats,step,clearPath,moveThroughOpening,moveX,moveY,buoy].map(fn=>fn.toString())};
  });
  if(expected)assert.deepEqual(result.core,expected);else expected=result.core;
  console.log('PASS '+file+': '+result.checks.length+' clearance checks; common core matches');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
