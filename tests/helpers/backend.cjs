const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function createBackend(){
 const rows=[],props={};let failWrite=false,failFlush=false,created=0;
 const sheet={getLastRow:()=>rows.length,setFrozenRows:()=>{},getRange:(r,c,h,w)=>({
  getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),
  setValues:values=>{if(failWrite)throw Error('write failed');for(let i=0;i<h;i++){rows[r-1+i]??=[];for(let j=0;j<w;j++)rows[r-1+i][c-1+j]=values[i][j];}}
 })};
 const book={getId:()=>'test-sheet',getSheets:()=>[sheet]};
 const sandbox={console:{error:()=>{}},Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>crypto.createHash(a).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),formatDate:d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v}})},SpreadsheetApp:{create:()=>{created++;return book},openById:()=>book,flush:()=>{if(failFlush){failFlush=false;throw Error('flush failure')}}},HtmlService:{XFrameOptionsMode:{ALLOWALL:'allowall'},createTemplateFromFile:()=>({bridgeConfig:'',evaluate(){return {setTitle(){return this},setXFrameOptionsMode(){return this}}}})}};
 const context=vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../google-apps-script/Code.gs'),'utf8'),context);
 return {rows,props,context,created:()=>created,failWrite:v=>failWrite=v,failFlush:()=>failFlush=true,call:(action,payload)=>JSON.parse(JSON.stringify(action==='list'?context.listLevels():action==='get'?context.getLevel(payload):context.submitLevel(payload)))};
}
module.exports={createBackend};
