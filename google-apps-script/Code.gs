const COLS=25,ROWS=14,FORMAT='density-submarine-level',RULES='density-lock-v1';
const EXPECTED_LEVEL_={"grid":{"columns":25,"rows":14,"cellPixels":40,"halfRowsPerCell":2,"fixedRockRows":[0,13]},"liquids":[{"density":0.25,"topHalfRow":2,"bottomHalfRow":8},{"density":0.5,"topHalfRow":8,"bottomHalfRow":14},{"density":1,"topHalfRow":14,"bottomHalfRow":20},{"density":2,"topHalfRow":20,"bottomHalfRow":26}]};
const BRIDGE_HTML_="<!doctype html><html lang=\"zh-Hant\"><head><meta charset=\"utf-8\"><base target=\"_top\"></head>\n<body><p>這是密度小艇的投稿與關卡資料服務。請從原本的遊戲網站遊玩與投稿。</p>\n<script>\nconst config = <?!= bridgeConfig ?>;\nwindow.addEventListener('message',event=>{\n const m=event.data;if(event.source!==window.top||event.origin!==config.origin||!m||m.type!=='density-request'||m.version!==2||m.channel!==config.channel||typeof m.id!=='string')return;\n const reply=result=>window.top.postMessage({type:'density-response',channel:config.channel,id:m.id,result},config.origin);\n const runner=google.script.run.withSuccessHandler(reply).withFailureHandler(()=>reply({ok:false,message:'Google 收件服務無法回覆，請稍後重試。'}));\n if(m.action==='list')runner.listLevels();else if(m.action==='get')runner.getLevel(m.payload);else if(m.action==='submit')runner.submitLevel(m.payload);\n});\nwindow.top.postMessage({type:'density-ready',version:2,channel:config.channel},config.origin);\n</script></body></html>\n";
const MAX_DAILY_SUBMISSIONS=100;
const SHEET_PROPERTY_='DENSITY_CLASSROOM_SHEET_ID';
const HEADER_=['投稿編號','投稿時間','關卡名稱（JSON文字）','暱稱（JSON文字）','想法（JSON文字）','內容摘要','關卡JSON_1','關卡JSON_2','關卡JSON_3','關卡JSON_4','關卡JSON_5'];
// Run this from the owner's editor. Keep the scope check outside error handlers
// so Apps Script can display its granular permission dialog instead of swallowing it.
function authorizeClassroom(){
 ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/spreadsheets']);
 const result=listLevels();
 if(!result.ok)throw Error(result.message);
 console.log('試算表授權及投稿表讀取成功；現有投稿 '+result.levels.length+' 關。');
 return {ok:true};
}
function doGet(e){
 const origin=e&&e.parameter&&e.parameter.origin||'https://wedcher.github.io';
 if(origin!=='https://wedcher.github.io'&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))throw Error('不支援的遊戲來源');
 const channel=e&&e.parameter&&e.parameter.channel||'';
 if(channel&&!/^[a-zA-Z0-9-]{1,80}$/.test(channel))throw Error('連線資料不正確');
 // The generated Code.gs includes this small bridge, so only one file needs pasting.
 const html=BRIDGE_HTML_.replace('<?!= bridgeConfig ?>',JSON.stringify({origin,channel}));
 return HtmlService.createHtmlOutput(html).setTitle('密度小艇｜關卡資料服務').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function withSheet_(callback){
 const lock=LockService.getScriptLock();if(!lock.tryLock(10000))return {ok:false,message:'目前較多人連線，請稍後重試。'};
 try{
  const props=PropertiesService.getScriptProperties();let id=props.getProperty(SHEET_PROPERTY_),book;
  if(id)book=SpreadsheetApp.openById(id);
  else{book=SpreadsheetApp.create('密度小艇投稿（試算表）');props.setProperty(SHEET_PROPERTY_,book.getId());}
  const sheets=book.getSheets();
  let sheet=sheets.find(candidate=>candidate.getLastRow()>0&&JSON.stringify(candidate.getRange(1,1,1,HEADER_.length).getValues()[0])===JSON.stringify(HEADER_));
  if(!sheet)sheet=sheets.find(candidate=>candidate.getLastRow()===0);
  if(!sheet){let suffix=0,name='密度小艇投稿';while(sheets.some(candidate=>candidate.getName()===name))name='密度小艇投稿_'+(++suffix);sheet=book.insertSheet(name);}
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,HEADER_.length).setValues([HEADER_]);sheet.setFrozenRows(1);}
  return callback(sheet);
 }catch(error){console.error(String(error));return {ok:false,message:'Google 收件服務尚未就緒。請先保存關卡，並通知老師完成部署與試算表授權。'};}
 finally{lock.releaseLock();}
}
function rows_(sheet){const last=sheet.getLastRow();return last>1?sheet.getRange(2,1,last-1,HEADER_.length).getValues():[];}
function submitLevel(p){
 try{
  if(!p||typeof p.level!=='string'||p.level.length>200000||typeof p.author!=='string'||!p.author.trim()||p.author.length>40||typeof p.note!=='string'||p.note.length>1000||p.website!==''||typeof p.requestId!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(p.requestId))return {ok:false,message:'投稿資料不正確，請檢查欄位。'};
  if(Utilities.newBlob(p.level).getBytes().length>200000)return {ok:false,message:'關卡超過 200 KB，請縮小後再投稿。'};
  const data=JSON.parse(p.level);validateLevel_(data);
  if(!data.start||!data.goal||typeof data.name!=='string'||!data.name.trim())return {ok:false,message:'請填寫名稱並放置小艇與終點。'};
  const text=JSON.stringify(data),author=p.author.trim(),note=p.note.trim();
  const digest=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([author,note,text])));
  return withSheet_(sheet=>{
   const rows=rows_(sheet),previous=rows.find(row=>row[0]===p.requestId);
   if(previous)return previous[5]===digest?{ok:true,receipt:p.requestId}:{ok:false,message:'投稿編號已使用，請重新整理後再試。'};
   const now=new Date(),day=Utilities.formatDate(now,'Asia/Taipei','yyyy-MM-dd');
   if(rows.filter(row=>row[1]&&Utilities.formatDate(new Date(row[1]),'Asia/Taipei','yyyy-MM-dd')===day).length>=MAX_DAILY_SUBMISSIONS)return {ok:false,message:'今日收件數量已滿，請先匯出保存。'};
   // Chunks keep each cell below Sheets' 50,000-character limit.
   const chunks=Array.from({length:5},(_,i)=>text.slice(i*40000,(i+1)*40000));
   const row=[p.requestId,now.toISOString(),JSON.stringify(data.name),JSON.stringify(author),JSON.stringify(note),digest,...chunks];
   sheet.getRange(sheet.getLastRow()+1,1,1,HEADER_.length).setValues([row]);SpreadsheetApp.flush();
   return {ok:true,receipt:p.requestId};
  });
 }catch(error){return {ok:false,message:'關卡格式或資料不正確，尚未投稿。'};}
}
function listLevels(){
 return withSheet_(sheet=>{
  const last=sheet.getLastRow();if(last<2)return {ok:true,levels:[]};
  const rows=sheet.getRange(2,1,last-1,4).getValues();
  const levels=[];
  for(const row of rows.reverse()){try{const name=JSON.parse(row[2]),author=JSON.parse(row[3]);if(typeof row[0]==='string'&&typeof name==='string'&&typeof author==='string')levels.push({id:row[0],createdAt:String(row[1]),name,author});}catch(error){}}
  return {ok:true,levels};
 });
}
function getLevel(p){
 if(!p||typeof p.id!=='string'||p.id.length>80)return {ok:false,message:'關卡編號不正確。'};
 return withSheet_(sheet=>{
  const row=rows_(sheet).find(row=>row[0]===p.id);if(!row)return {ok:false,message:'找不到這個關卡，請重新整理清單。'};
  try{const level=JSON.parse(row.slice(6,11).join(''));validateLevel_(level);return {ok:true,level};}
  catch(error){return {ok:false,message:'這個關卡資料有誤，暫時無法載入。'};}
 });
}

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
