// Only change the folder ID below. Keep this file on the server (Code.gs).
const INBOX_FOLDER_ID='在這裡貼上你的資料夾ID';
const MAX_DAILY_SUBMISSIONS=100;
const COLS=25,ROWS=14,FORMAT='density-submarine-level',RULES='density-lock-v1';
const EXPECTED_LEVEL_={"grid":{"columns":25,"rows":14,"cellPixels":40,"halfRowsPerCell":2,"fixedRockRows":[0,13]},"liquids":[{"density":0.25,"topHalfRow":2,"bottomHalfRow":8},{"density":0.5,"topHalfRow":8,"bottomHalfRow":14},{"density":1,"topHalfRow":14,"bottomHalfRow":20},{"density":2,"topHalfRow":20,"bottomHalfRow":26}]};

function doGet(){
 return HtmlService.createHtmlOutputFromFile('Index').setTitle('密度小艇｜編輯與投稿').addMetaTag('viewport','width=device-width, initial-scale=1');
}

// Public entry point. No listing, reading or deleting of existing submissions.
function submitLevel(p){
 try{
  if(!p||typeof p!=='object'||typeof p.level!=='string'||p.level.length>200000||typeof p.author!=='string'||typeof p.note!=='string'||typeof p.website!=='string')return rejection_('投稿資料不正確。');
  if(p.website!==''||!p.author.trim()||p.author.length>40||p.note.length>1000||typeof p.requestId!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(p.requestId))return rejection_('請檢查投稿欄位與字數。');
  if(Utilities.newBlob(p.level).getBytes().length>200000)return rejection_('關卡檔案超過 200 KB，請縮小後再投稿。');
  const d=JSON.parse(p.level);validateLevel_(d);
  if(typeof d.name!=='string'||!d.name.trim()||!d.start||!d.goal)return rejection_('請填寫關卡名稱，並放置小艇與終點。');
  if(!/^[a-zA-Z0-9_-]{10,}$/.test(INBOX_FOLDER_ID))return rejection_('收件者尚未設定收件資料夾，請通知老師。');
  const digest=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([p.author,p.note,p.level])));
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return rejection_('目前較多人投稿，請稍後重試。');
  try{
   const props=PropertiesService.getScriptProperties();
   const day=Utilities.formatDate(new Date(),'Asia/Taipei','yyyy-MM-dd');
   if(props.getProperty('submissionDay')!==day){
    const all=props.getProperties();Object.keys(all).filter(k=>k.startsWith('submissionReceipt_')).forEach(k=>props.deleteProperty(k));
    props.setProperties({submissionDay:day,submissionCount:'0'});
   }
   const key='submissionReceipt_'+p.requestId;
   const previous=props.getProperty(key);
   if(previous){const record=JSON.parse(previous);if(record.digest!==digest)return rejection_('投稿編號已使用，請重新整理後再送出。');return {ok:true,receipt:record.receipt};}
   const count=Number(props.getProperty('submissionCount')||0);
   if(count>=MAX_DAILY_SUBMISSIONS)return rejection_('今天的收件數量已滿，請先匯出關卡保存，明天再投稿。');
   const receipt=p.requestId;
   const safe=s=>s.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g,'_').slice(0,60).replace(/[.\s]+$/g,'')||'未命名';
   const filename=Utilities.formatDate(new Date(),'Asia/Taipei','yyyyMMdd_HHmmss')+'_'+safe(p.author.trim())+'_'+safe(d.name)+'_'+receipt+'.json';
   // Deterministic request suffix lets a retry recover even after a property-write failure.
   const folder=DriveApp.getFolderById(INBOX_FOLDER_ID);
   const existing=folder.getFiles();let file=null;
   while(existing.hasNext()){const candidate=existing.next();if(candidate.getName().endsWith('_'+receipt+'.json')){file=candidate;break;}}
   const description=JSON.stringify({receipt,author:p.author.trim(),note:p.note.trim(),submittedAt:new Date().toISOString(),digest},null,2);
   if(file){const previousMeta=JSON.parse(file.getDescription());if(previousMeta.digest!==digest)return rejection_('投稿編號已使用。');}
   else{
    file=folder.createFile(filename,JSON.stringify(d,null,2)+'\n','application/json');
    try{file.setDescription(description);}catch(error){file.setTrashed(true);throw error;}
   }
   props.setProperties({[key]:JSON.stringify({digest,receipt}),submissionCount:String(count+1)});
   return {ok:true,receipt};
  }finally{lock.releaseLock();}
 }catch(error){
  console.error('Submission error: '+String(error));
  return rejection_('收件未完成。請先匯出 JSON 保存，稍後重試；若持續失敗，請通知老師檢查收件設定。');
 }
}
function rejection_(message){return {ok:false,message};}

function validateLevel_(data){
 const fail=()=>{throw Error('關卡格式或資料不正確，未匯入。')};
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const keys=(v,list)=>object(v)&&Object.keys(v).length===list.length&&list.every(k=>Object.prototype.hasOwnProperty.call(v,k));
 const hasName=object(data)&&Object.prototype.hasOwnProperty.call(data,'name');
 if(hasName&&(typeof data.name!=='string'||data.name.length>120))fail();
 if(!keys(data,[...(hasName?['name']:[]),'format','version','rules','grid','liquids','initial','start','goal','rocks','items'])||data.format!==FORMAT||data.version!==1||data.rules!==RULES)fail();
 const expected=EXPECTED_LEVEL_;
 if(!keys(data.grid,Object.keys(expected.grid))||!['columns','rows','cellPixels','halfRowsPerCell'].every(k=>data.grid[k]===expected.grid[k])||JSON.stringify(data.grid.fixedRockRows)!=='[0,13]')fail();
 if(!Array.isArray(data.liquids)||data.liquids.length!==4||!data.liquids.every((l,i)=>keys(l,['density','topHalfRow','bottomHalfRow'])&&Object.keys(l).every(k=>l[k]===expected.liquids[i][k])))fail();
 if(!keys(data.initial,['m','v'])||![1,2,3].includes(data.initial.m)||![1,2,4].includes(data.initial.v))fail();
 if(!Array.isArray(data.rocks)||data.rocks.length>600||!Array.isArray(data.items)||data.items.length>300)fail();
 const nextMap=Array.from({length:ROWS},()=>Array(COLS).fill(null)),nextHalf=[],occupied=new Set();
 const reserve=(c,h,count)=>{if(!Number.isInteger(c)||c<0||c>=COLS||!Number.isInteger(h)||h<2||h+count>26)fail();for(let i=0;i<count;i++){const k=c+','+(h+i);if(occupied.has(k))fail();occupied.add(k)}};
 for(const r of data.rocks){if(!keys(r,['column','halfRow','widthCells','heightHalfRows'])||r.widthCells!==1||![1,2].includes(r.heightHalfRows)||(r.heightHalfRows===2&&r.halfRow%2!==0))fail();reserve(r.column,r.halfRow,r.heightHalfRows);if(r.heightHalfRows===2)nextMap[r.halfRow/2][r.column]='rock';else nextHalf.push({column:r.column,halfRow:r.halfRow})}
 const place=(pos,type,isItem=false)=>{if(!keys(pos,isItem?['type','column','row']:['column','row'])||!Number.isInteger(pos.row))fail();reserve(pos.column,pos.row*2,2);nextMap[pos.row][pos.column]=type};
 if(data.start!==null)place(data.start,'boat');if(data.goal!==null)place(data.goal,'goal');
 for(const i of data.items){if(!object(i)||!['mass','key','door'].includes(i.type))fail();place(i,i.type,true)}
 return {name:hasName?data.name:'',map:nextMap,halfRocks:nextHalf,initial:{m:data.initial.m,v:data.initial.v}};
}
