const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n');
let html=read('src/editor.html');
const config=JSON.parse(read('config.json'));
if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.submissionUrl))throw Error('Invalid backend URL');
const levels=fs.readdirSync(path.join(root,'levels')).filter(n=>/^\d.*\.json$/.test(n)).sort().map(n=>JSON.parse(read('levels/'+n)));
const script='const EXAMPLE_LEVELS='+JSON.stringify(levels).replaceAll('<','\\u003c')+';\nconst BACKEND_URL='+JSON.stringify(config.submissionUrl)+';\n'+read('src/backend-client.js')+'\n'+read('src/classroom.js');
html=html.replace('<title>密度小艇｜地圖編輯器 v2</title>','<title>密度小艇｜遊玩與設計</title>')
 .replace('<h1>密度小艇｜地圖編輯器 v2</h1>','<h1>密度小艇</h1>')
 .replace('先選工具，再點格子放置；岩石與橡皮擦可拖曳','用 D＝M／V 探索密度，也能設計關卡給同學')
 .replace('</style>',read('src/classroom.css')+'\n</style>')
 .replace('<div class="toolbar compact-toolbar" id="materialRow">',read('src/classroom-ui.html')+'\n<div class="toolbar compact-toolbar" id="materialRow">')
 .replace('<script>',read('src/submission-dialog.html')+'\n<script>')
 .replace("if(action&&mode==='play')","if(action&&mode==='play'&&!$('submissionDialog').open&&!e.target.closest('input,textarea,select,[contenteditable]'))")
 .replace('</script></body></html>',script+'\n</script></body></html>');
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Built one classroom game with '+levels.length+' official levels.');
