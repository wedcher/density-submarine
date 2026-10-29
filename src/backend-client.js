// Google is a background service only. The visible game never navigates away.
const backendClient=(()=>{
 let connection=null,frame=null,peer=null,peerOrigin=null;
 const pending=new Map();let channel='';
 const googleOrigin=origin=>/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin)||origin==='https://script.google.com';
 async function connect(){
  if(connection)return connection;
  if(!/^https?:$/.test(location.protocol))throw Error('請從遊戲網站開啟投稿功能；本機檔案仍可編輯、試玩與保存。');
  channel=crypto.randomUUID();
  connection=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{window.removeEventListener('message',ready);frame?.remove();connection=null;reject(Error('投稿服務尚未連接。老師更新 Google 收件程式後，請再重新整理清單。'));},15000);
   function ready(event){const m=event.data;if(!googleOrigin(event.origin)||!m||m.type!=='density-ready'||m.channel!==channel||m.version!==2||!event.source)return;
    clearTimeout(timer);window.removeEventListener('message',ready);peer=event.source;peerOrigin=event.origin;resolve();
   }
   window.addEventListener('message',ready);frame=document.createElement('iframe');frame.id='backendBridge';frame.title='關卡投稿服務';frame.hidden=true;
   const url=new URL(BACKEND_URL);url.searchParams.set('origin',location.origin);url.searchParams.set('channel',channel);frame.src=url.href;document.body.appendChild(frame);
  });return connection;
 }
 window.addEventListener('message',event=>{
  const m=event.data;if(event.source!==peer||event.origin!==peerOrigin||!m||m.channel!==channel||m.type!=='density-response')return;
  const item=pending.get(m.id);if(!item)return;clearTimeout(item.timer);pending.delete(m.id);item.resolve(m.result);
 });
 async function request(action,payload={}){
  await connect();const id=crypto.randomUUID();return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{pending.delete(id);reject(Error('尚未收到 Google 回覆，無法確認結果。請稍後重試；相同內容會沿用投稿編號。'));},30000);
   pending.set(id,{resolve,reject,timer});peer.postMessage({type:'density-request',version:2,channel,id,action,payload},peerOrigin);
  });
 }
 return {request};
})();
