import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const entries=readdirSync('_site');
assert.deepEqual(entries.sort(),['.nojekyll','data','index.html','vendor','worlds'].sort());
const files=readdirSync('_site',{recursive:true});
assert.equal(files.some(p=>/secrets|accounts|node_modules|^src|^tools/.test(String(p))),false);
const html=readFileSync('_site/index.html','utf8'),secrets=JSON.parse(readFileSync('tools/secrets.local.json','utf8'));
assert.equal(/@@[A-Z]+@@/.test(html),false);
assert.equal(html.includes('MAX_FILE='),false,'Member facility implementation must remain encrypted');
for(const secret of [secrets.datakey,...Object.values(secrets.passwords)])assert.equal(html.includes(secret),false);
const server=spawn(process.execPath,['tools/serve.mjs'],{env:{...process.env,PORT:'8092'},stdio:['ignore','pipe','inherit']});
try{
 await Promise.race([new Promise(resolve=>server.stdout.once('data',resolve)),new Promise((_,reject)=>setTimeout(()=>reject(Error('server startup timeout')),5000))]);
 for(const endpoint of ['/tools/secrets.local.json','/tools/accounts.json','/src/member.js','/package.json','/%2e%2e/tools/secrets.local.json'])assert.equal((await fetch('http://127.0.0.1:8092'+endpoint)).status,404,endpoint);
 assert.equal((await fetch('http://127.0.0.1:8092/')).status,200);
 assert.equal((await fetch('http://127.0.0.1:8092/vendor/three.min.js')).status,200);
 console.log('PASS: deployment allowlist, encrypted member layer, no plaintext credentials and private development server paths.');
}finally{server.kill()}
