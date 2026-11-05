const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const file of ['src/editor.html','index.html']){
 const html=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
 const names=['size','solidBlocked','blocked','overlap','bounds','changeStats','clearPath'];
 const functions=names.map(name=>{const start=html.indexOf('function '+name+'(');let pos=html.indexOf('{',start),depth=1,end=pos+1;for(;depth;end++){if(html[end]==='{')depth++;if(html[end]==='}')depth--;}return html.slice(start,end)}).join('\n');
 const context=vm.createContext({});
 vm.runInContext(`const CELL=40,WIDTH=1000;const layerDefs=[{d:.25,top:40,bottom:160},{d:.5,top:160,bottom:280},{d:1,top:280,bottom:400},{d:2,top:400,bottom:520}];let state,rocks,items=[],msg={};function render(){};${functions}`,context);
 const run=code=>vm.runInContext(code,context);
 let count=0;
 for(const x of [90,90.1,90.5,91.9,100,109.9]){
  run(`rocks=[{x:40,y:40,w:40,h:80},{x:120,y:80,w:40,h:40}];items=[];state={x:${x},y:100,m:1,v:1,key:0};`);
  assert.equal(run('changeStats(1,2)'),true,`${file}: exact-width opening from x=${x}`);
  assert.equal(run('state.x'),100);assert.equal(run('state.y'),100);assert.equal(run('blocked(state.x,state.y)'),false);count++;
 }
 run('rocks=[{x:40,y:40,w:40,h:480},{x:119,y:40,w:40,h:480}];state={x:95.5,y:100,m:1,v:1};');
 assert.equal(run('changeStats(1,2)'),false);assert.equal(run('state.v'),1);count++;
 run('rocks=[{x:40,y:40,w:40,h:480}];items=[{type:"door",x:139,y:100,open:false}];state={x:95.5,y:100,m:1,v:1,key:1};');
 assert.equal(run('changeStats(1,2)'),false);assert.equal(run('items[0].open'),false);count++;
 run('rocks=[];items=[];state={x:300.5,y:100,m:1,v:1};');
 assert.equal(run('changeStats(1,2)'),true);assert.equal(run('state.x'),300.5);count++;
 run('rocks=[{x:40,y:40,w:40,h:480},{x:160,y:40,w:40,h:480}];state={x:110.5,y:100,m:1,v:2};');
 assert.equal(run('changeStats(1,4)'),true);assert.equal(run('state.x'),120);count++;
 console.log(`PASS ${file}: ${count} volume checks`);
}
