let appView='home',savedDesign=null,currentGame=null;
let qualifiedFingerprint=null,runFingerprint=null,designRevision=0,qualifiedRevision=-1,internalLoad=false;
let submissionPending=null,submissionBusy=false,listRevision=0;
const clone=value=>JSON.parse(JSON.stringify(value));
const fingerprint=()=>JSON.stringify(levelData());
function canSubmit(){return appView==='design'&&qualifiedFingerprint!==null&&qualifiedRevision===designRevision&&qualifiedFingerprint===fingerprint();}
function updateClassroom(){
 document.body.dataset.view=appView;$('submitBtn').disabled=!canSubmit();
 $('qualificationStatus').textContent=canSubmit()?'已通關目前關卡，可以投稿。':'請先試玩並通關，再投稿；修改後需重新通關。';
 if(appView==='design'){$('modeBtn').hidden=false;$('levelName').disabled=mode==='play';}
 syncOrientation();requestAnimationFrame(fit);
}
const portraitPhone=matchMedia('(any-pointer: coarse) and (orientation: portrait) and (max-width: 900px)');
function syncOrientation(){
 const paused=appView==='play'&&portraitPhone.matches;
 if(paused!==playPaused){playPaused=paused;resetKeyboardMotion();}
 $('rotatePrompt').hidden=!paused;
}
portraitPhone.addEventListener('change',()=>{syncOrientation();resetKeyboardMotion();requestAnimationFrame(fit)});
// Browser chrome can change viewport height while a thumb is held. Only an
// actual orientation change (above), blur or cancellation should clear input.
window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(fit));
let controlsSwapped=readPreference('swapped','false')==='true';
function speakerIcon(enabled){return '<svg class="speaker-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h6l7-6v20l-7-6H5z"/>'+ (enabled?'<path d="M22 11c3 3 3 7 0 10m4-14c5 5 5 13 0 18"/>':'<path d="m22 12 7 8m0-8-7 8"/>')+'</svg>'}
function updatePreferences(){
 document.body.dataset.swapped=String(controlsSwapped);$('swapControls').setAttribute('aria-pressed',String(controlsSwapped));
 $('soundToggle').setAttribute('aria-pressed',String(soundEnabled));
 const soundLabel='聲音：'+(soundEnabled?'開':'關');$('soundToggle').setAttribute('aria-label',soundLabel);$('soundToggle').title=soundLabel;$('soundToggle').firstElementChild.innerHTML=speakerIcon(soundEnabled);
}
$('swapControls').onclick=()=>{resetKeyboardMotion();controlsSwapped=!controlsSwapped;savePreference('swapped',String(controlsSwapped));updatePreferences();requestAnimationFrame(fit)};
$('soundToggle').onclick=()=>{setSoundEnabled(!soundEnabled);updatePreferences()};
function showHome(){
 resetKeyboardMotion();clearFeedback();appView='home';updateClassroom();refreshCommunity();
}
$('backToLevels').onclick=showHome;$('rotateBack').onclick=showHome;
let messageTimer=0;
msg.setAttribute('role','status');
new MutationObserver(()=>{
 clearTimeout(messageTimer);msg.classList.remove('show-play-message');
 if(appView==='play'&&!state?.won&&/鑰匙|開門|空間不足|無法|失敗/.test(msg.textContent)){
  msg.classList.add('show-play-message');messageTimer=setTimeout(()=>msg.classList.remove('show-play-message'),2400);
 }
}).observe(msg,{childList:true,characterData:true,subtree:true});
function invalidateQualification(){designRevision++;qualifiedFingerprint=null;qualifiedRevision=-1;runFingerprint=null;submissionPending=null;updateClassroom();}
const originalPaint=paint;
paint=function(...args){const before=fingerprint();originalPaint(...args);if(appView==='design'&&fingerprint()!==before)invalidateQualification();};
const originalImport=importLevelText;
importLevelText=function(text){const ok=originalImport(text);if(ok&&appView==='design'&&!internalLoad)invalidateQualification();return ok;};
const originalClear=$('clearBtn').onclick;
$('clearBtn').onclick=()=>{if(mode!=='edit')return;originalClear();if(appView==='design')invalidateQualification();};
$('levelName').addEventListener('input',()=>{if(appView==='design')invalidateQualification();});
const originalToggle=toggleMode;
toggleMode=function(){
 const starting=appView==='design'&&mode==='edit';if(starting)runFingerprint=fingerprint();
 originalToggle();if(starting&&mode!=='play')runFingerprint=null;
 if(!starting&&mode==='edit')runFingerprint=null;updateClassroom();
};
$('modeBtn').onclick=toggleMode;
const originalFinish=finish;
finish=function(){
 const wasWon=state?.won;originalFinish();
 if(!wasWon&&state?.won&&appView==='play')msg.textContent='過關！可選擇其他關卡，或設計關卡給同學。';
 if(!wasWon&&state?.won&&appView==='design'&&runFingerprint&&runFingerprint===fingerprint()){
  qualifiedFingerprint=runFingerprint;qualifiedRevision=designRevision;msg.textContent='已通關目前關卡！可以直接投稿，或回編輯；修改後需重新通關。';updateClassroom();
 }
};
function loadInPlace(data,view){
 internalLoad=true;
 try{
  if(mode==='play')originalToggle();appView=view;
  if(!importLevelText(JSON.stringify(data)))throw Error('關卡資料無法讀取。');
  if(view==='play'){originalToggle();if(mode!=='play')throw Error(msg.textContent);}
 }finally{internalLoad=false;updateClassroom();}
}
function playLevel(data,title){
 const previous=currentGame,previousView=appView;
 try{loadInPlace(data,'play');currentGame={data:clone(data),title};$('playingTitle').textContent=data.name||title;$('playingTitle').title=title;$('playingTitle').setAttribute('aria-label',title);for(const button of $('officialLevels').children){const selected=button.dataset.officialName===data.name&&EXAMPLE_LEVELS.some(level=>JSON.stringify(level)===JSON.stringify(data));button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}msg.textContent='調整 M／V，利用密度抵達終點。';return true;}
 catch(error){if(previous){loadInPlace(previous.data,'play');currentGame=previous;}appView=previousView;updateClassroom();msg.textContent='無法開始「'+title+'」：'+error.message;$('selectionStatus').textContent=msg.textContent;return false;}
}
$('designEntry').onclick=()=>{
 if(appView==='design')return;
 const draft=savedDesign||{...clone(EXAMPLE_LEVELS[0]),name:'',start:null,goal:null,rocks:[],items:[],initial:{m:1,v:1}};
 loadInPlace(draft,'design');msg.textContent='設計關卡後先試玩通關，再投稿給同學。';
};
$('backToPlay').onclick=()=>{
 savedDesign=clone(levelData());if(mode==='play')originalToggle();
 showHome();
};
$('playRestart').onclick=()=>{if(currentGame)playLevel(currentGame.data,currentGame.title);};
for(const data of EXAMPLE_LEVELS){const button=document.createElement('button');button.textContent=data.name;button.dataset.officialName=data.name;button.onclick=()=>playLevel(data,data.name);$('officialLevels').appendChild(button);}
async function refreshCommunity(){
 const revision=++listRevision;$('communityRefresh').disabled=true;$('communityStatus').textContent='正在讀取同學關卡…';
 try{
  const result=await backendClient.request('list');if(revision!==listRevision)return;
  if(!result||result.ok!==true||!Array.isArray(result.levels))throw Error(result?.message||'無法取得同學關卡。');
  const container=$('communityLevels');container.replaceChildren();
  for(const item of result.levels){
   if(typeof item.id!=='string'||typeof item.name!=='string'||typeof item.author!=='string')continue;
   const button=document.createElement('button'),name=document.createElement('span'),author=document.createElement('small');
   name.textContent=item.name;author.textContent='投稿：'+item.author;button.append(name,author);button.dataset.levelId=item.id;
   button.onclick=async()=>{
    button.disabled=true;$('communityStatus').textContent='正在載入關卡…';
    try{const loaded=await backendClient.request('get',{id:item.id});if(!loaded||!loaded.ok||!loaded.level)throw Error(loaded?.message||'無法讀取關卡。');if(!playLevel(loaded.level,item.name+'／'+item.author))throw Error(msg.textContent);$('communityStatus').textContent='已載入，可以開始遊玩。';}
    catch(error){$('communityStatus').textContent=error.message;}finally{button.disabled=false;}
   };container.appendChild(button);
  }
  $('communityStatus').textContent=result.levels.length?'已更新，共 '+result.levels.length+' 關（新投稿在前）。':'目前還沒有同學投稿，來設計第一關吧！';
 }catch(error){if(revision===listRevision)$('communityStatus').textContent=error.message+' 官方關卡與設計、保存仍可使用。';}
 finally{if(revision===listRevision)$('communityRefresh').disabled=false;}
}
$('communityRefresh').onclick=refreshCommunity;
const submissionDialog=$('submissionDialog');
$('submitBtn').onclick=()=>{
 if(!canSubmit()){msg.textContent='請先成功通關目前設計的關卡，再投稿。';return}
 if(!$('levelName').value.trim()){msg.textContent='請先填寫關卡名稱，並重新試玩通關。';return}
 resetKeyboardMotion();$('submissionStatus').textContent='';submissionDialog.showModal();
};
$('submissionClose').onclick=()=>{if(!submissionBusy)submissionDialog.close();};
submissionDialog.addEventListener('cancel',e=>{if(submissionBusy)e.preventDefault();});
$('submissionForm').onsubmit=async e=>{
 e.preventDefault();if(submissionBusy)return;
 if(!canSubmit()){$('submissionStatus').textContent='關卡已變更，請先重新試玩通關。';return}
 const data=levelData(),author=$('submissionAuthor').value.trim(),note=$('submissionNote').value.trim();
 if(!author||!data.name.trim()||!data.start||!data.goal||!$('submissionConsent').checked){$('submissionStatus').textContent='請填寫暱稱、關卡名稱並勾選公開同意。';return}
 const signature=JSON.stringify({data,author,note});
 if(!submissionPending||submissionPending.signature!==signature)submissionPending={signature,requestId:crypto.randomUUID()};
 const payload={requestId:submissionPending.requestId,author,note,website:$('submissionWebsite').value,level:JSON.stringify(data)};
 submissionBusy=true;$('submissionSend').disabled=true;$('submissionClose').disabled=true;$('submissionStatus').textContent='正在投稿…';
 try{
  const result=await backendClient.request('submit',payload);if(!result||result.ok!==true)throw Error(result?.message||'無法確認投稿成功，請稍後重試。');
  $('submissionStatus').textContent='投稿成功！收件編號：'+result.receipt+'。同學重新整理清單後即可遊玩。';refreshCommunity();
 }catch(error){$('submissionStatus').textContent=error.message+' 可先匯出 JSON 保存。';}
 finally{submissionBusy=false;$('submissionSend').disabled=false;$('submissionClose').disabled=false;}
};
updatePreferences();updateClassroom();
refreshCommunity();
