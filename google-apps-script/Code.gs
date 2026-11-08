const COLS=25,ROWS=14,FORMAT='density-submarine-level',RULES='density-lock-v1';
const EXPECTED_LEVEL_={"grid":{"columns":25,"rows":14,"cellPixels":40,"halfRowsPerCell":2,"fixedRockRows":[0,13]},"liquids":[{"density":0.25,"topHalfRow":2,"bottomHalfRow":8},{"density":0.5,"topHalfRow":8,"bottomHalfRow":14},{"density":1,"topHalfRow":14,"bottomHalfRow":20},{"density":2,"topHalfRow":20,"bottomHalfRow":26}]};
const BRIDGE_HTML_="<!doctype html><html lang=\"zh-Hant\"><head><meta charset=\"utf-8\"><base target=\"_top\"></head>\n<body><p>這是密度小艇的投稿與關卡資料服務。請從原本的遊戲網站遊玩與投稿。</p>\n<script>\nconst config = <?!= bridgeConfig ?>;\nwindow.addEventListener('message',event=>{\n const m=event.data;if(event.source!==window.top||event.origin!==config.origin||!m||m.type!=='density-request'||m.version!==2||m.channel!==config.channel||typeof m.id!=='string')return;\n const reply=result=>window.top.postMessage({type:'density-response',channel:config.channel,id:m.id,result},config.origin);\n const runner=google.script.run.withSuccessHandler(reply).withFailureHandler(()=>reply({ok:false,message:'Google 收件服務無法回覆，請稍後重試。'}));\n if(m.action==='list')runner.listLevels(m.payload);else if(m.action==='like')runner.setLevelLike(m.payload);else if(m.action==='get')runner.getLevel(m.payload);else if(m.action==='submit')runner.submitLevel(m.payload);\n});\nwindow.top.postMessage({type:'density-ready',version:2,channel:config.channel},config.origin);\n</script></body></html>\n";
const ADMIN_HTML_="<!doctype html><html lang=\"zh-Hant\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>密度小艇｜教師管理</title>\n<style>body{font:18px/1.6 sans-serif;margin:24px;background:#f5f8fa;color:#243139}button,input,select{font:inherit;margin:6px;padding:8px}section{background:white;padding:18px;margin:16px 0;border-radius:12px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px}article{background:white;border:1px solid #ccc;border-radius:10px;padding:12px}canvas{width:100%;height:auto}.preview-button{display:block;width:100%;padding:0;margin:0}.preview-dialog{width:min(1100px,90vw)}#adminUrl{width:min(90%,900px)}[hidden]{display:none!important}</style>\n<h1>密度小艇｜教師管理</h1><nav><button id=\"settingsTab\">遊戲設定</button><button id=\"levelsTab\">投稿管理</button></nav><p id=\"status\" role=\"status\"></p>\n<section id=\"settings\"><h2>遊戲設定</h2><label><input type=\"checkbox\" id=\"likes\">啟用按讚</label><p>教師專用部署網址（結尾加上 ?admin=1）</p><input id=\"adminUrl\" aria-label=\"教師專用部署網址\" type=\"url\"><button id=\"save\">儲存設定</button></section>\n<section id=\"moderation\"><h2>投稿管理</h2><input id=\"search\" placeholder=\"搜尋關卡或作者\" aria-label=\"搜尋關卡或作者\"><select id=\"filter\" aria-label=\"顯示範圍\"><option value=\"all\">全部</option><option value=\"public\">公開</option><option value=\"hidden\">已隱藏</option></select><button id=\"refresh\">重新整理</button><label><input type=\"checkbox\" id=\"selectAll\">全選目前結果</label><p><button data-action=\"hide\">隱藏勾選</button><button data-action=\"restore\">恢復勾選</button><button data-action=\"delete\">永久刪除勾選</button></p><div id=\"cards\" class=\"cards\"></div></section>\n<script>\nfunction drawLevelPreview(canvas,level){\n canvas.width=1000;canvas.height=560;\n const ctx=canvas.getContext('2d');\n ctx.fillStyle='#eef7fb';ctx.fillRect(0,0,1000,560);\n if(!level){ctx.fillStyle='#333';ctx.font='28px sans-serif';ctx.fillText('預覽暫時無法顯示',30,280);return;}\n const colors=['#e6f7ff','#bce5f5','#82c4e0','#4899c1'];\n (level.liquids||[]).forEach((layer,i)=>{ctx.fillStyle=colors[i];ctx.fillRect(0,layer.topHalfRow*20,1000,(layer.bottomHalfRow-layer.topHalfRow)*20);});\n ctx.fillStyle='#46515d';ctx.fillRect(0,0,1000,40);ctx.fillRect(0,520,1000,40);\n for(const rock of level.rocks||[])ctx.fillRect(rock.column*40,rock.halfRow*20,rock.widthCells*40,rock.heightHalfRows*20);\n ctx.font='28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';\n for(const item of level.items||[])ctx.fillText(({key:'🔑',door:'🚪',mass:'M'})[item.type]||item.type,item.column*40+20,item.row*40+20);\n for(const [pos,label] of [[level.start,'🚤'],[level.goal,'🏁']])if(pos)ctx.fillText(label,pos.column*40+20,pos.row*40+20);\n}\nfunction levelPreviewButton(level,name){\n const button=document.createElement('button');button.type='button';button.className='preview-button';button.setAttribute('aria-label','放大預覽 '+name);\n const canvas=document.createElement('canvas');drawLevelPreview(canvas,level);button.append(canvas);\n button.onclick=()=>{const dialog=document.createElement('dialog');dialog.className='preview-dialog';const title=document.createElement('h2');title.textContent=name;const large=document.createElement('canvas');drawLevelPreview(large,level);const close=document.createElement('button');close.textContent='關閉';close.onclick=()=>dialog.close();dialog.append(title,large,close);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();};return button;\n}\n\nconst el=id=>document.getElementById(id);let entries=[],busy=false;const selected=new Set();\nfunction rpc(action,payload){return new Promise((resolve,reject)=>{google.script.run.withSuccessHandler(result=>{if(!result?.ok)reject(Error(result?.message||'操作失敗'));else resolve(result);}).withFailureHandler(error=>reject(Error(error.message||'連線失敗')))[action](payload);});}\nasync function perform(task){if(busy)return;busy=true;document.querySelectorAll('button,input,select').forEach(e=>e.disabled=true);el('status').textContent='處理中…';try{await task();el('status').textContent='已完成';}catch(e){el('status').textContent=e.message;}finally{busy=false;document.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}}\nfunction visible(){const q=el('search').value.toLowerCase(),filter=el('filter').value;return entries.filter(e=>(e.name+' '+e.author).toLowerCase().includes(q)&&(filter==='all'||e.hidden===(filter==='hidden')));}\nfunction render(){el('cards').replaceChildren();el('selectAll').checked=false;for(const entry of visible()){const card=document.createElement('article'),check=document.createElement('input');check.type='checkbox';check.checked=selected.has(entry.id);check.setAttribute('aria-label','選取 '+entry.name);check.onchange=()=>check.checked?selected.add(entry.id):selected.delete(entry.id);const title=document.createElement('strong');title.textContent=entry.name;const meta=document.createElement('p');meta.textContent=entry.author+' ｜ '+entry.createdAt+' ｜ 👍 '+entry.likeCount+' ｜ '+(entry.hidden?'已隱藏':'公開');card.append(check,title,meta,levelPreviewButton(entry.preview,entry.name));el('cards').append(card);}}\nasync function load(){const result=await rpc('adminList');entries=result.levels;selected.clear();el('likes').checked=result.likesEnabled;el('adminUrl').value=result.adminUrl;render();}\nel('settingsTab').onclick=()=>{el('settings').hidden=false;el('moderation').hidden=true;};el('levelsTab').onclick=()=>{el('settings').hidden=true;el('moderation').hidden=false;};\nel('save').onclick=()=>perform(async()=>{await rpc('adminSettings',{likesEnabled:el('likes').checked,adminUrl:el('adminUrl').value.trim()});});\nel('refresh').onclick=()=>perform(load);el('search').oninput=render;el('filter').onchange=render;el('selectAll').onchange=()=>{for(const entry of visible())el('selectAll').checked?selected.add(entry.id):selected.delete(entry.id);render();};\ndocument.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{const ids=[...selected];if(!ids.length){el('status').textContent='請先勾選投稿。';return;}if(button.dataset.action==='delete'&&!confirm('永久刪除 '+ids.length+' 筆投稿及其按讚紀錄？此操作無法復原。'))return;perform(async()=>{await rpc('adminModerate',{ids,action:button.dataset.action});await load();});});\nperform(load);\n</script></html>\n";
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
 if(e&&e.parameter&&e.parameter.admin==='1'){
  requireAdmin_();
  return HtmlService.createHtmlOutput(ADMIN_HTML_).setTitle('密度小艇｜教師管理');
 }
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
  if(!likesEnabled_()||hiddenIds_(book).has(p.id))return {ok:false,message:'此關卡目前無法按讚。'};
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
  const browserId=likesEnabled_()&&validBrowserId_(p&&p.browserId)?p.browserId:null;
  const hidden=hiddenIds_(book);
  const votes=new Map();
  if(browserId){
   for(const [id,voter] of likeRows_(likeSheet_(book))){
    if(!votes.has(id))votes.set(id,new Set());
    votes.get(id).add(voter);
   }
  }
  const last=sheet.getLastRow();if(last<2)return {ok:true,levels:[]};
  const rows=rows_(sheet).filter(row=>!hidden.has(row[0]));
  const levels=[];
  for(const row of rows.reverse()){try{const name=JSON.parse(row[2]),author=JSON.parse(row[3]);if(typeof row[0]==='string'&&typeof name==='string'&&typeof author==='string')levels.push({id:row[0],createdAt:String(row[1]),name,author,preview:previewRow_(row),...(browserId?{likeCount:votes.get(row[0])?.size||0,liked:votes.get(row[0])?.has(browserId)||false}:{})});}catch(error){}}
  return {ok:true,levels,adminUrl:PropertiesService.getScriptProperties().getProperty('DENSITY_ADMIN_URL')||''};
 });
}
function getLevel(p){
 if(!p||typeof p.id!=='string'||p.id.length>80)return {ok:false,message:'關卡編號不正確。'};
 return withSheet_((sheet,book)=>{
  if(hiddenIds_(book).has(p.id))return {ok:false,message:'此關卡已下架。'};
  const row=rows_(sheet).find(row=>row[0]===p.id);if(!row)return {ok:false,message:'找不到這個關卡，請重新整理清單。'};
  try{const level=JSON.parse(row.slice(6,11).join(''));validateLevel_(level);return {ok:true,level};}
  catch(error){return {ok:false,message:'這個關卡資料有誤，暫時無法載入。'};}
 });
}

// Every public management RPC checks both identities, including calls through the anonymous deployment.
function requireAdmin_(){
 const active=Session.getActiveUser().getEmail();
 const effective=Session.getEffectiveUser().getEmail();
 if(!active||!effective||active!==effective)throw Error('請使用部署此服務的 Google 帳號登入教師專用入口。');
}
function likesEnabled_(){return PropertiesService.getScriptProperties().getProperty('DENSITY_LIKES_ENABLED')!=='false';}
function hiddenIds_(book){
 const sheet=book.getSheetByName('密度小艇下架');
 if(!sheet)return new Set();
 if(JSON.stringify(sheet.getRange(1,1,1,1).getValues()[0])!==JSON.stringify(['投稿編號']))throw Error('下架工作表欄位不符');
 return new Set(sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().map(row=>row[0]):[]);
}
function previewRow_(row){
 try{const level=JSON.parse(row.slice(6,11).join(''));validateLevel_(level);
 return {rocks:level.rocks,items:level.items,start:level.start,goal:level.goal,liquids:level.liquids};
 }catch(error){return null;}
}
function adminList(){
 requireAdmin_();
 return withSheet_((sheet,book)=>{
  const hidden=hiddenIds_(book),counts=new Map();
  for(const [id,voter] of likeRows_(likeSheet_(book))){if(!counts.has(id))counts.set(id,new Set());counts.get(id).add(voter);}
  const levels=rows_(sheet).reverse().map(row=>({id:row[0],createdAt:String(row[1]),name:displayText_(row[2]),author:displayText_(row[3]),hidden:hidden.has(row[0]),likeCount:counts.get(row[0])?.size||0,preview:previewRow_(row)}));
  return {ok:true,levels,likesEnabled:likesEnabled_(),adminUrl:PropertiesService.getScriptProperties().getProperty('DENSITY_ADMIN_URL')||''};
 });
}
function adminSettings(p){
 requireAdmin_();
 if(!p||typeof p.likesEnabled!=='boolean'||typeof p.adminUrl!=='string'||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec\?admin=1$/.test(p.adminUrl))throw Error('請填入教師專用部署網址，結尾加上 ?admin=1');
 return withSheet_(()=>{const props=PropertiesService.getScriptProperties();props.setProperty('DENSITY_LIKES_ENABLED',String(p.likesEnabled));props.setProperty('DENSITY_ADMIN_URL',p.adminUrl);return {ok:true};});
}
function adminModerate(p){
 requireAdmin_();
 if(!p||!Array.isArray(p.ids)||!p.ids.length||p.ids.length>200||!p.ids.every(id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id))||!['hide','restore','delete'].includes(p.action))throw Error('管理資料不正確');
 return withSheet_((sheet,book)=>{
  const ids=new Set(p.ids),hidden=hiddenIds_(book);
  let status=book.getSheetByName('密度小艇下架');
  if(!status){status=book.insertSheet('密度小艇下架');status.appendRow(['投稿編號']);}
  // Hide first so a partial delete cannot leave a requested deletion public. Retrying is safe.
  if(p.action!=='restore')for(const id of ids)if(!hidden.has(id)){status.appendRow([id]);hidden.add(id);}
  if(p.action==='delete'){
   const likes=likeSheet_(book),votes=likeRows_(likes);
   for(let i=votes.length-1;i>=0;i--)if(ids.has(votes[i][0]))likes.deleteRow(i+2);
   const rows=rows_(sheet);
   for(let i=rows.length-1;i>=0;i--)if(ids.has(rows[i][0]))sheet.deleteRow(i+2);
  }
  if(p.action==='restore'||p.action==='delete')for(let i=status.getLastRow();i>=2;i--)if(ids.has(status.getRange(i,1,1,1).getValues()[0][0]))status.deleteRow(i);
  SpreadsheetApp.flush();return {ok:true};
 });
}

function displayText_(value){
 try{return String(JSON.parse(value));}
 catch(error){return '資料格式有誤';}
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
