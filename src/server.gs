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
  return callback(sheet,book);
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
const LIKES_SHEET_='密度小艇按讚';
const LIKE_HEADER_=['投稿編號','瀏覽器識別碼'];
function validBrowserId_(id){
 return typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
}
function likeSheet_(book){
 const sheet=book.getSheetByName(LIKES_SHEET_);
 if(sheet&&sheet.getLastRow()>0&&JSON.stringify(sheet.getRange(1,1,1,2).getValues()[0])!==JSON.stringify(LIKE_HEADER_))throw Error('按讚工作表欄位不符');
 return sheet;
}
function likeRows_(sheet){
 const last=sheet?sheet.getLastRow():0;
 return last>1?sheet.getRange(2,1,last-1,2).getValues():[];
}
function setLevelLike(p){
 if(!p||!validBrowserId_(p.browserId)||typeof p.liked!=='boolean'||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id))return {ok:false,message:'按讚資料不正確。'};
 return withSheet_((sheet,book)=>{
  const last=sheet.getLastRow();
  if(last<2||!sheet.getRange(2,1,last-1,1).getValues().some(row=>row[0]===p.id))return {ok:false,message:'找不到這個關卡，請重新整理清單。'};
  let likes=likeSheet_(book);
  const voters=new Set();
  let existingRow=0;
  likeRows_(likes).forEach(([id,browserId],index)=>{
   if(id!==p.id)return;
   voters.add(browserId);
   if(browserId===p.browserId)existingRow=index+2;
  });
  if(p.liked&&!existingRow){
   likes=likes||book.insertSheet(LIKES_SHEET_);
   if(likes.getLastRow()===0)likes.getRange(1,1,1,2).setValues([LIKE_HEADER_]);
   likes.appendRow([p.id,p.browserId]);
   voters.add(p.browserId);
  }else if(!p.liked&&existingRow){
   likes.deleteRow(existingRow);
   voters.delete(p.browserId);
  }
  SpreadsheetApp.flush();
  return {ok:true,liked:p.liked,likeCount:voters.size};
 });
}
function listLevels(p){
 return withSheet_((sheet,book)=>{
  const browserId=validBrowserId_(p&&p.browserId)?p.browserId:null;
  const votes=new Map();
  if(browserId){
   for(const [id,voter] of likeRows_(likeSheet_(book))){
    if(!votes.has(id))votes.set(id,new Set());
    votes.get(id).add(voter);
   }
  }
  const last=sheet.getLastRow();if(last<2)return {ok:true,levels:[]};
  const rows=sheet.getRange(2,1,last-1,4).getValues();
  const levels=[];
  for(const row of rows.reverse()){try{const name=JSON.parse(row[2]),author=JSON.parse(row[3]);if(typeof row[0]==='string'&&typeof name==='string'&&typeof author==='string')levels.push({id:row[0],createdAt:String(row[1]),name,author,...(browserId?{likeCount:votes.get(row[0])?.size||0,liked:votes.get(row[0])?.has(browserId)||false}:{})});}catch(error){}}
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
