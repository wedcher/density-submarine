// No production RPCs: exercise the client with a simulated peer and timer.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/backend-client.js'),'utf8');
function harness(supported=true){
 const listeners=new Set(),timers=new Map(),frames=[],sent=[];let serial=0;
 const peer={postMessage:(m,o)=>sent.push({m,o})};
 const context=vm.createContext({URL,Map,Error,location:{protocol:'https:',origin:'https://wedcher.github.io'},crypto:{randomUUID:()=>`test-${++serial}`},BACKEND_URL:'https://script.google.com/macros/s/example/exec',setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),window:{addEventListener:(t,f)=>listeners.add(f),removeEventListener:(t,f)=>listeners.delete(f)},document:{createElement:()=>({...supported?{credentialless:false}:{},remove(){this.removed=true}}),body:{appendChild:f=>frames.push(f)}}});
 vm.runInContext(source+';globalThis.client=backendClient;',context);
 const message=data=>{for(const fn of [...listeners])fn(data)};
 const ready=(changes={})=>message({origin:'https://test-script.googleusercontent.com',source:peer,data:{type:'density-ready',version:2,channel:new URL(frames.at(-1).src).searchParams.get('channel'),...changes}});
 return {context,frames,sent,timers,ready,message,peer};
}
(async()=>{
 for(const supported of [true,false]){
  const h=harness(supported),p=h.context.client.request('list');
  assert.equal(h.frames[0].credentialless,supported?true:undefined);
  h.ready({version:1});h.ready({channel:'wrong'});await Promise.resolve();assert.equal(h.sent.length,0);
  h.ready();await new Promise(setImmediate);assert.equal(h.sent.length,1);
  const {m,o}=h.sent[0];assert.equal(o,'https://test-script.googleusercontent.com');
  h.message({origin:o,source:h.peer,data:{type:'density-response',channel:m.channel,id:m.id,result:{ok:true,levels:[]}}});
  assert.equal((await p).ok,true);
 }
 const h=harness(),p=h.context.client.request('submit',{requestId:'unchanged'});
 const failure=assert.rejects(p,/連線逾時/);
 [...h.timers.values()].find(t=>t.ms===15000).fn();await failure;
 assert.equal(h.sent.length,0);assert.equal(h.frames[0].removed,true);
 const retry=h.context.client.request('list');h.ready();await new Promise(setImmediate);
 const {m,o}=h.sent[0];h.message({origin:o,source:h.peer,data:{type:'density-response',channel:m.channel,id:m.id,result:{ok:true}}});await retry;
 assert.equal(h.frames.length,2);assert.equal(h.sent.length,1);
 console.log('PASS isolated mode, unsupported fallback, handshake validation, no submit before ready, timeout cleanup and manual retry');
})().catch(e=>{console.error(e);process.exitCode=1});
