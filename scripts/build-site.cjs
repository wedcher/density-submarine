const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
let html=fs.readFileSync(path.join(root,'src/editor.html'),'utf8').replaceAll('\r\n','\n');
const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.submissionUrl))throw Error('Invalid Google submission URL');
const levels=fs.readdirSync(path.join(root,'levels')).filter(n=>n.endsWith('.json')).sort().map(n=>JSON.parse(fs.readFileSync(path.join(root,'levels',n),'utf8')));
const styles=`
.site-help{margin:10px 0;padding:12px;background:#fffdfa;border:2px solid #d7d0c5;border-radius:12px;font-size:14px;line-height:1.7}
.site-help summary{cursor:pointer;font-weight:bold}.site-help select{max-width:100%;font:inherit;padding:6px;border:1px solid #bfb6a8;border-radius:6px}
#submissionGuide{max-width:520px;width:calc(100vw - 30px);border:2px solid #243139;border-radius:14px;background:#fffdfa;color:#243139;padding:22px;line-height:1.8}
#submissionGuide::backdrop{background:#14212a88}#submissionGuide h2{margin-top:0}#submissionGuide p{font-size:15px}#submissionGuide a{display:inline-block;color:#164f6c;font-weight:bold;margin:8px}#submissionGuide button{margin:6px}#submitBtn{background:#ffdf83}
`;
const guide=`
<div class="site-help"><label>示範關卡：<select id="exampleLevel"><option value="">選擇關卡</option>${levels.map((d,i)=>'<option value="'+i+'">'+d.name+'</option>').join('')}</select></label>
<details><summary>操作與保存方式</summary><p>← → 移動；相同密度層內用 ↑ ↓ 移動。用 V＋／V－ 改變體積，用「丟 M」降低質量；增加質量要取得 M＋。D＝M／V 決定浮沉。</p><p>選擇工具可自製關卡，通道請保留至少 2 格，讓所有小艇通過。編輯成果請按「匯出關卡」保存 JSON；關閉網頁前記得保存。更新網站不會自動保存你的地圖。</p></details></div>
`;
const dialog=`
<dialog id="submissionGuide" aria-labelledby="submissionHeading"><h2 id="submissionHeading">投稿關卡</h2>
<p>先把關卡下載保存，再到投稿頁送出。</p>
<p><b>1.</b> 按「下載關卡 JSON」。<br><b>2.</b> 開啟 Google 投稿頁，按「匯入關卡」，選擇剛下載的 JSON，再按「投稿關卡」。</p>
<p>使用暱稱即可。收件成功時，Google 投稿頁會顯示收件編號；只下載檔案還沒有完成投稿。</p>
<button id="submissionDownload">下載關卡 JSON</button><a id="submissionLink" target="_blank" rel="noopener noreferrer">開啟 Google 投稿頁 ↗</a>
<p id="submissionGuideStatus" role="status"></p><button id="submissionGuideClose">關閉</button></dialog>
`;
const script=`
const EXAMPLE_LEVELS=${JSON.stringify(levels).replaceAll('<','\\u003c')};
const SUBMISSION_URL=${JSON.stringify(config.submissionUrl)};
$('exampleLevel').onchange=e=>{
 const value=e.target.value;if(value==='')return;
 if(mode!=='edit'){msg.textContent='請先回到編輯模式，再選擇示範關卡。';e.target.value='';return}
 if((levelData().start||levelData().rocks.length||levelData().items.length||levelData().goal)&&!confirm('載入示範關卡會取代目前地圖。請先匯出需要保留的內容。確定載入？')){e.target.value='';return}
 importLevelText(JSON.stringify(EXAMPLE_LEVELS[Number(value)]));e.target.value='';
};
$('submissionLink').href=SUBMISSION_URL;
$('submitBtn').onclick=()=>{
 const data=levelData();if(!data.start||!data.goal||!data.name.trim()){msg.textContent='請先填寫關卡名稱，並放置小艇與終點，再投稿。';return}
 $('submissionGuideStatus').textContent='';$('submissionGuide').showModal();
};
$('submissionDownload').onclick=()=>{
 downloadLevel(new Blob([JSON.stringify(levelData(),null,2)+'\\n'],{type:'application/json'}),exportFileName($('levelName').value));
 $('submissionGuideStatus').textContent='已交由瀏覽器下載。接著開啟 Google 投稿頁，匯入檔案並送出。';
};
$('submissionGuideClose').onclick=()=>$('submissionGuide').close();
`;
html=html.replace('<title>密度小艇｜地圖編輯器 v2</title>','<title>密度小艇｜密度應用與關卡編輯器</title>')
 .replace('</style>',styles+'\n</style>')
 .replace('<button id="exportBtn">','<button id="submitBtn">投稿關卡</button><button id="exportBtn">')
 .replace('<div class="hud">',guide+'\n<div class="hud">')
 .replace('<script>',dialog+'\n<script>')
 .replace("if(action&&mode==='play')","if(action&&mode==='play'&&!$('submissionGuide').open&&!e.target.closest('input,textarea,select,[contenteditable]'))")
 .replace('</script></body></html>',script+'\n</script></body></html>');
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Built index.html with '+levels.length+' examples.');
