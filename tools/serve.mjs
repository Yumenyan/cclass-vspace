import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT)||8080;
const server=http.createServer(async(req,res)=>{
 let file;
 try{file=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(_){res.writeHead(400);res.end();return}
 if(file==='/')file='/index.html';
 if(!/^\/(index\.html|vendor\/[a-zA-Z0-9_.-]+|data\/[a-zA-Z0-9_-]+\.json|worlds\/[a-zA-Z0-9_-]+\.json)$/.test(file)){res.writeHead(404);res.end('Not found');return}
 try{const bytes=await readFile(resolve(root,'.'+file));res.writeHead(200,{'Content-Type':file.endsWith('.wasm')?'application/wasm':file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.json')?'application/json; charset=utf-8':file.endsWith('.txt')?'text/plain; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes)}catch(_){res.writeHead(404);res.end('Not found')}
});
server.listen(port,'127.0.0.1',()=>console.log('C組の居場所: http://127.0.0.1:'+port+' (public files only)'));
