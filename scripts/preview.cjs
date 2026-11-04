// Local preview only. No build, Git operation, or deployment is performed.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const server=http.createServer((req,res)=>{
 if(!['/','/index.html'].includes(req.url.split('?')[0])){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(fs.readFileSync(path.join(__dirname,'../index.html')));
});
server.listen(0,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+server.address().port));
