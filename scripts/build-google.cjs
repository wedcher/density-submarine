// Rebuild the deployable files from the user's chosen editor; originals stay intact.
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const dir=path.join(root,'google-apps-script');fs.mkdirSync(dir,{recursive:true});
const source=fs.readFileSync(path.join(root,'src/editor.html'),'utf8').replaceAll('\r\n','\n');
const panel=`
<dialog id="submissionDialog" aria-labelledby="submissionTitle">
 <form id="submissionForm">
  <h2 id="submissionTitle">投稿關卡</h2>
  <p>將目前關卡送給老師，不需登入。也可以先匯入已匯出的 JSON 再投稿。</p>
  <p>只會傳送關卡、暱稱及設計想法，不含塗鴉；收件者可看到並保存這些資料。請勿填寫真實姓名、電話或其他個人資料。</p>
  <label>作者暱稱（必填）<input id="submissionAuthor" maxlength="40" required autocomplete="off"></label>
  <label>設計想法（選填）<textarea id="submissionNote" maxlength="1000" rows="3"></textarea></label>
  <div class="submission-trap" aria-hidden="true"><label>請留白<input id="submissionWebsite" tabindex="-1" autocomplete="off"></label></div>
  <label class="submission-consent"><input id="submissionConsent" type="checkbox" required>我同意將這份關卡與以上資料送給收件者。</label>
  <p id="submissionStatus" role="status" aria-live="polite"></p>
  <div class="submission-actions"><button type="button" id="submissionClose">關閉</button><button type="submit" id="submissionSend">送出投稿</button></div>
 </form>
</dialog>
`;
const css=`
#submitBtn{background:#ffdf83}
#submissionDialog{width:520px;max-width:calc(100vw - 24px);max-height:90vh;overflow:auto;border:2px solid var(--ink);border-radius:14px;padding:22px;background:#fffdfa;color:var(--ink)}
#submissionDialog::backdrop{background:#14212a88}#submissionDialog h2{margin:0 0 10px}#submissionDialog p{line-height:1.6;font-size:14px}
#submissionForm>label{display:block;margin:12px 0;font-weight:bold}#submissionAuthor,#submissionNote{display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #a59b8c;border-radius:7px;font:inherit}
#submissionForm .submission-consent{font-size:14px;font-weight:normal;line-height:1.6}.submission-actions{display:flex;justify-content:flex-end;gap:8px}.submission-trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}#submissionStatus{white-space:pre-wrap;overflow-wrap:anywhere}#submissionSend:disabled{opacity:.5;cursor:wait}
`;
const client=`
// Submission uses Apps Script's same-host bridge; no public Drive folder or API key.
const submissionDialog=$('submissionDialog');
let submissionPending=null,submissionBusy=false,submissionAttempt=0;
function submissionAvailable(){return !!(window.google&&google.script&&google.script.run)}
function submissionSetBusy(busy){submissionBusy=busy;$('submissionSend').disabled=busy||!submissionAvailable();$('submissionClose').disabled=busy;}
$('submitBtn').onclick=()=>{
 if(!levelData().start||!levelData().goal){msg.textContent='投稿前請先放置小艇與終點。';return}
 if(!$('levelName').value.trim()){msg.textContent='投稿前請填寫關卡名稱。';$('levelName').focus();return}
 $('submissionStatus').textContent=submissionAvailable()?'':'本機版可編輯、試玩及匯出。免登入投稿請開啟設定教學中部署完成的 Google 網頁網址。';
 submissionSetBusy(false);submissionDialog.showModal();
};
$('submissionClose').onclick=()=>submissionDialog.close();
submissionDialog.addEventListener('cancel',e=>{if(submissionBusy)e.preventDefault()});
$('submissionForm').onsubmit=e=>{
 e.preventDefault();if(submissionBusy||!submissionAvailable())return;
 const data=levelData(),author=$('submissionAuthor').value.trim(),note=$('submissionNote').value.trim();
 if(!author||!data.name.trim()||!data.start||!data.goal){$('submissionStatus').textContent='請填寫暱稱、關卡名稱，並放置小艇與終點。';return}
 if(!$('submissionConsent').checked)return;
 const fingerprint=JSON.stringify({author,note,level:data});
 if(!submissionPending||submissionPending.fingerprint!==fingerprint){submissionPending={fingerprint,requestId:crypto.randomUUID()};}
 const payload={requestId:submissionPending.requestId,author,note,website:$('submissionWebsite').value,level:JSON.stringify(data)};
 const attempt=++submissionAttempt;submissionSetBusy(true);$('submissionStatus').textContent='正在送出，請稍候…';
 const timer=setTimeout(()=>{if(attempt!==submissionAttempt)return;submissionAttempt++;submissionSetBusy(false);$('submissionStatus').textContent='尚未收到回覆，無法確認是否成功。請保持內容不變後重試；同一筆投稿會使用相同編號避免重複收件。';},60000);
 const failure=()=>{if(attempt!==submissionAttempt)return;clearTimeout(timer);submissionSetBusy(false);$('submissionStatus').textContent='未能確認投稿成功，可能是連線或收件設定問題。請稍後重試，或先匯出 JSON 保存。';};
 try{google.script.run.withSuccessHandler(result=>{
  if(attempt!==submissionAttempt)return;clearTimeout(timer);submissionSetBusy(false);
  if(!result||result.ok!==true){$('submissionStatus').textContent=result&&typeof result.message==='string'?result.message:'收件未完成，請稍後重試。';return}
  $('submissionStatus').textContent='投稿成功！收件編號：'+result.receipt+'。你的關卡已存入收件者的 Google 雲端硬碟。';
 }).withFailureHandler(failure).submitLevel(payload);}catch(error){failure()}
};
`;
let html=source.replace('<head>','<head>\n<base target="_top">').replace('</style>',css+'\n</style>')
 .replace('<button id="exportBtn">','<button id="submitBtn">投稿關卡</button><button id="exportBtn">')
 .replace('<script>\nconst densityStyles=',panel+'\n<script>\nconst densityStyles=');
// Source uses CRLF, so insert the dialog using a stable tag boundary instead.
if(!html.includes('id="submissionDialog"'))html=html.replace('<script>',panel+'\n<script>');
html=html.replace("if(action&&mode==='play')","if(action&&mode==='play'&&!submissionDialog.open&&!e.target.closest('input,textarea,select,[contenteditable]'))");
html=html.replace('</script></body></html>',client+'\n</script></body></html>');
fs.writeFileSync(path.join(dir,'Index.html'),html);
const validation=source.slice(source.indexOf('function validateLevel(data){'),source.indexOf('function importLevelText(text){'))
 .replace('function validateLevel(data)','function validateLevel_(data)').replace('const expected=levelData();','const expected=EXPECTED_LEVEL_;').replaceAll('Object.hasOwn(v,k)','Object.prototype.hasOwnProperty.call(v,k)').replaceAll("Object.hasOwn(data,'name')","Object.prototype.hasOwnProperty.call(data,'name')");
const sample=JSON.parse(fs.readFileSync(path.join(root,'levels','01_換層接力.json'),'utf8'));
const constants={grid:sample.grid,liquids:sample.liquids};
const backend=`// Only change the folder ID below. Keep this file on the server (Code.gs).
const INBOX_FOLDER_ID='在這裡貼上你的資料夾ID';
const MAX_DAILY_SUBMISSIONS=100;
const COLS=25,ROWS=14,FORMAT='density-submarine-level',RULES='density-lock-v1';
const EXPECTED_LEVEL_=${JSON.stringify(constants)};

function doGet(){
 return HtmlService.createHtmlOutputFromFile('Index').setTitle('密度小艇｜編輯與投稿').addMetaTag('viewport','width=device-width, initial-scale=1');
}

// Public entry point. No listing, reading or deleting of existing submissions.
function submitLevel(p){
 try{
  if(!p||typeof p!=='object'||typeof p.level!=='string'||p.level.length>200000||typeof p.author!=='string'||typeof p.note!=='string'||typeof p.website!=='string')return rejection_('投稿資料不正確。');
  if(p.website!==''||!p.author.trim()||p.author.length>40||p.note.length>1000||typeof p.requestId!=='string'||!/^\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12}$/.test(p.requestId))return rejection_('請檢查投稿欄位與字數。');
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
   const safe=s=>s.replace(/[<>:"/\\\\|?*\\x00-\\x1f\\x7f]/g,'_').slice(0,60).replace(/[.\\s]+$/g,'')||'未命名';
   const filename=Utilities.formatDate(new Date(),'Asia/Taipei','yyyyMMdd_HHmmss')+'_'+safe(p.author.trim())+'_'+safe(d.name)+'_'+receipt+'.json';
   // Deterministic request suffix lets a retry recover even after a property-write failure.
   const folder=DriveApp.getFolderById(INBOX_FOLDER_ID);
   const existing=folder.getFiles();let file=null;
   while(existing.hasNext()){const candidate=existing.next();if(candidate.getName().endsWith('_'+receipt+'.json')){file=candidate;break;}}
   const description=JSON.stringify({receipt,author:p.author.trim(),note:p.note.trim(),submittedAt:new Date().toISOString(),digest},null,2);
   if(file){const previousMeta=JSON.parse(file.getDescription());if(previousMeta.digest!==digest)return rejection_('投稿編號已使用。');}
   else{
    file=folder.createFile(filename,JSON.stringify(d,null,2)+'\\n','application/json');
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

`;
fs.writeFileSync(path.join(dir,'Code.gs'),backend+validation);
console.log('Created Index.html and Code.gs in '+dir);
const tutorial=`# 密度小艇：免登入投稿設定教學

設定完成後，你只分享一個遊戲網址。學生免登入，直接編輯、試玩並投稿；JSON 自動存到你的 Google 雲端硬碟。你的原始遊戲與關卡不會被修改。

## 1. 建立收件資料夾

用自己的 Google 帳號登入 https://drive.google.com/ ，新增資料夾「密度小艇投稿」。打開資料夾，網址會像 https://drive.google.com/drive/folders/ABCDEFGHIJKLM 。複製 folders/ 後面的那段 ID（不包含 ? 後面的參數）。資料夾維持「限制存取」，不用分享給學生。

## 2. 建立收件程式

開啟 https://script.google.com/ ，按「新專案」，名稱改成「密度小艇投稿」。

左側選 Code.gs（中文介面可能顯示「程式碼.gs」），刪除預設內容，貼上本資料夾 Code.gs 的全部文字。

找到最上方這行，只替換引號內的文字：

const INBOX_FOLDER_ID='在這裡貼上你的資料夾ID';

改成例如：const INBOX_FOLDER_ID='ABCDEFGHIJKLM';

這是後端設定。不要把 Code.gs 當成學生開啟的遊戲檔。

## 3. 貼上遊戲 HTML

在 Apps Script 左側「檔案」旁按 ＋，選「HTML」，名稱輸入 Index（注意大寫 I，不用輸入 .html）。刪除產生的預設內容，貼上本資料夾 Index.html 的全部文字。按儲存或 Ctrl+S。

程式只需要 Code.gs 與 Index.html 兩個檔案，不用安裝套件、不用另外準備網站或填 API 金鑰。Index.html 已包含完整編輯器、試玩及投稿視窗。

## 4. 部署並授權一次

右上角「部署」→「新增部署作業」。在類型的齒輪圖示選「網頁應用程式」。

- 執行身分：選「我」（你的帳號）。
- 誰可以存取：選「所有人／任何人」（Anyone），不要選「擁有 Google 帳戶的所有人」。
- 按「部署」，依畫面登入並授權你的程式存取雲端硬碟。

如果看到「Google 尚未驗證這個應用程式」，先確認顯示的是你剛建立的專案和自己的帳號；只有確認是自己的程式時，再按「進階」→前往該專案，繼續授權。若畫面沒有繼續選項，或只有組織內存取，先檢查帳號政策；可改以個人 Gmail 建立專案。

完成後複製「網頁應用程式」網址，結尾是 /exec。這就是學生要開啟的遊戲網址。不要分享編輯器網址或 /dev 測試網址，也不要分享你的收件資料夾。

## 5. 用無痕視窗測試

開啟瀏覽器「無痕／InPrivate」視窗，不登入 Google，貼上 /exec 網址。

1. 在遊戲按「匯入關卡」，可選先前製作的 01～05 JSON 作為測試。
2. 確認有小艇、終點和關卡名稱，按「投稿關卡」。
3. 填測試暱稱、可選填設計想法，勾選同意，再按「送出投稿」。
4. 必須看到「投稿成功」與收件編號。
5. 回到自己的雲端資料夾，確認出現 JSON；下載後再匯入遊戲，確認地圖正確。

看到登入要求時，回到部署設定，檢查「我」與「所有人」兩項是否正確。投稿顯示資料夾未設定時，確認 ID 與資料夾擁有者。設定修正後要更新部署版本。

## 平常如何收件

開啟「密度小艇投稿」資料夾。檔名包含台北時間、暱稱、關卡名稱與唯一編號。每份 JSON 都是原本編輯器可匯入的正式關卡，不包含塗鴉或試玩後的暫態。作者的設計想法、收件時間與編號存於檔案的「說明」：選取檔案，在右側詳細資料面板查看。

關卡不會自動公開。你可以先試玩，再決定是否分享。請保留原始 JSON；另存或匯出檔案時，Google 檔案說明不一定隨檔案下載，重要的作者資料請另行留存。

## 日後更新或停止收件

修改程式後，按「部署」→「管理部署作業」→鉛筆編輯→版本選「新版本」→部署。可保留同一 /exec 網址。若要停用，於管理部署作業封存對應部署。

## 已準備的保護與限制

- 投稿前需要名稱、暱稱、小艇、終點與同意勾選。
- 伺服器會重新驗證 JSON 格式、座標、岩石與道具重疊、質量及體積範圍，最多 200 KB。
- 內建隱藏的垃圾投稿欄位，每天全站最多收 100 件（台北時間換日，可改 Code.gs 的 MAX_DAILY_SUBMISSIONS）。這是基礎限制，沒有驗證碼，不能完全阻擋惡意投稿；若流量大再升級。
- 同一頁面、內容不變的重試使用相同收件編號，避免網路回覆中斷造成重複檔案。重新整理或修改內容後投稿視為新的一筆。
- 一般學生無法透過投稿介面列出、讀取或刪除你的雲端檔案。網頁不公開資料夾 ID 或管理入口。Apps Script 的 Drive 授權範圍由 Google 決定，請在自己的帳號確認授權內容。
- 投稿不代表關卡必然有解，也不會自動認定通道滿足設計要求；收件後由你試玩審核。
- Google Apps Script 有執行時間、每日用量與雲端空間限制，並非無限服務。滿額或異常時可先匯出 JSON。
- 本機直接開 Index.html 可以編輯、試玩、匯入匯出；投稿功能必須從部署的 Google 網頁開啟。本套件尚未登入你的帳號或部署，也未實際寫入你的雲端；完成第 5 步才算正式上線驗收。

## 官方文件

- 網頁應用程式與部署：https://developers.google.com/apps-script/guides/web
- 免登入存取選項：https://developers.google.com/apps-script/manifest/web-app-api-executable
- 網頁與後端通訊：https://developers.google.com/apps-script/guides/html/communication
- 雲端資料夾寫入：https://developers.google.com/apps-script/reference/drive/folder
`;
fs.writeFileSync(path.join(dir,'設定教學.md'),tutorial);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const tutorialHtml='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>密度小艇｜投稿設定教學</title><style>body{font:17px/1.8 "Microsoft JhengHei",sans-serif;color:#243139;background:#f3f0e8;margin:0}main{max-width:860px;padding:24px;margin:auto}h1{font-size:28px}section{padding:18px 22px;background:#fffdfa;border:1px solid #ddd3c3;border-radius:12px;margin:18px 0}button{font:inherit;background:#ffdf83;padding:8px 16px;border:2px solid #243139;border-radius:8px;cursor:pointer}textarea{width:100%;box-sizing:border-box;font:13px/1.4 monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}a{color:#126376}</style><main><h1>密度小艇｜免登入投稿</h1><p>先依序完成設定，再把 Google 產生的遊戲網址分享給學生。</p><section><h2>複製程式</h2><p>下面按鈕會複製整份檔案，貼到 Google Apps Script 對應檔案即可。</p><button data-copy="server">複製 Code.gs</button> <button data-copy="game">複製 Index.html</button><p id="copyStatus" role="status"></p><details><summary>無法複製時，展開後全選文字複製</summary><p>Code.gs</p><textarea id="server" rows="8" readonly>'+esc(backend+validation)+'</textarea><p>Index.html</p><textarea id="game" rows="8" readonly>'+esc(html)+'</textarea></details></section><section><a href="https://drive.google.com/" target="_blank" rel="noopener">開啟 Google 雲端硬碟</a>　<a href="https://script.google.com/" target="_blank" rel="noopener">開啟 Apps Script</a><pre>'+esc(tutorial)+'</pre></section></main><script>document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{const t=document.getElementById(b.dataset.copy);try{await navigator.clipboard.writeText(t.value);document.getElementById("copyStatus").textContent="已複製，請貼到 Apps Script。"}catch(e){t.closest("details").open=true;t.focus();t.select();document.getElementById("copyStatus").textContent="已選取文字，請按 Ctrl+C 複製。"}});</script></html>';
fs.writeFileSync(path.join(dir,'先看這裡_設定教學.html'),tutorialHtml);
const updateGuide='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google 遊戲更新｜只需更新 Index</title><style>body{font:18px/1.8 "Microsoft JhengHei",sans-serif;background:#f3f0e8;color:#243139;margin:0}main{max-width:780px;margin:24px auto;padding:24px;background:#fffdfa;border-radius:14px}button{font:inherit;background:#ffdf83;padding:12px;border-radius:8px;cursor:pointer}textarea{width:100%;box-sizing:border-box}li{margin:12px 0}</style><main><h1>更新 Google 的完整遊戲</h1><p>你已建立收件程式並授權。這一步把目前空白的 Google 遊戲頁換成正式版，包含通道對齊修正。</p><button id="copy">複製完整遊戲 HTML</button><p id="status" role="status"></p><ol><li>按上方按鈕。</li><li>開啟 <a href="https://script.google.com/home" target="_blank" rel="noopener">Google Apps Script</a>，選「密度小艇投稿」專案。</li><li>左側點 <b>Index.html</b>，在程式編輯區按 Ctrl+A，再按 Ctrl+V。貼入後應有數百行，能找到「密度小艇」與 clearPath。</li><li>按 Ctrl+S 儲存。保留「程式碼.gs」裡已設定的資料夾 ID。</li><li>右上角「部署 → 管理部署作業 → 鉛筆編輯 → 版本選新版本 → 部署」。完成後原本 /exec 網址不變。</li><li>用未登入的無痕視窗開原本 /exec 網址，確認出現完整遊戲。匯入一份關卡、填暱稱投稿，再確認雲端資料夾收到 JSON。</li></ol><p>看到遊戲畫面後先回來告訴我，我會協助確認線上 HTML 確實是這版。Google 實際收件仍須最後一步驗收。</p><details><summary>若無法自動複製，展開並全選下方文字</summary><textarea id="payload" rows="12" readonly>'+esc(html)+'</textarea></details></main><script>document.getElementById("copy").onclick=async()=>{const t=document.getElementById("payload");try{await navigator.clipboard.writeText(t.value);document.getElementById("status").textContent="已複製完整遊戲，請貼到 Google 的 Index.html。"}catch(e){t.closest("details").open=true;t.focus();t.select();document.getElementById("status").textContent="已選取文字，按 Ctrl+C 複製，再貼到 Google 的 Index.html。"}};</script></html>';
fs.writeFileSync(path.join(dir,'更新Google遊戲.html'),updateGuide);
