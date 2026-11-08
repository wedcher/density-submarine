function drawLevelPreview(canvas,level){
 canvas.width=1000;canvas.height=560;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#eef7fb';ctx.fillRect(0,0,1000,560);
 if(!level){ctx.fillStyle='#333';ctx.font='28px sans-serif';ctx.fillText('預覽暫時無法顯示',30,280);return;}
 const colors=['#e6f7ff','#bce5f5','#82c4e0','#4899c1'];
 (level.liquids||[]).forEach((layer,i)=>{ctx.fillStyle=colors[i];ctx.fillRect(0,layer.topHalfRow*20,1000,(layer.bottomHalfRow-layer.topHalfRow)*20);});
 ctx.fillStyle='#46515d';ctx.fillRect(0,0,1000,40);ctx.fillRect(0,520,1000,40);
 for(const rock of level.rocks||[])ctx.fillRect(rock.column*40,rock.halfRow*20,rock.widthCells*40,rock.heightHalfRows*20);
 ctx.font='28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const item of level.items||[])ctx.fillText(({key:'🔑',door:'🚪',mass:'M'})[item.type]||item.type,item.column*40+20,item.row*40+20);
 for(const [pos,label] of [[level.start,'🚤'],[level.goal,'🏁']])if(pos)ctx.fillText(label,pos.column*40+20,pos.row*40+20);
}
function levelPreviewButton(level,name){
 const button=document.createElement('button');button.type='button';button.className='preview-button';button.setAttribute('aria-label','放大預覽 '+name);
 const canvas=document.createElement('canvas');drawLevelPreview(canvas,level);button.append(canvas);
 button.onclick=()=>{const dialog=document.createElement('dialog');dialog.className='preview-dialog';const title=document.createElement('h2');title.textContent=name;const large=document.createElement('canvas');drawLevelPreview(large,level);const close=document.createElement('button');close.textContent='關閉';close.onclick=()=>dialog.close();dialog.append(title,large,close);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();};return button;
}
