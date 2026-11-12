// Native Node build: the same envelope format as build.py, without Python dependencies.
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync, randomBytes, createHash, pbkdf2Sync, createCipheriv} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
mkdirSync(resolve(root,'vendor'),{recursive:true});
for(const [from,to] of [['three/build/three.min.js','three.min.js'],['peerjs/dist/peerjs.min.js','peerjs.min.js'],['three/examples/js/loaders/GLTFLoader.js','GLTFLoader.js']])copyFileSync(resolve(root,'node_modules',from),resolve(root,'vendor',to));
copyFileSync(resolve(root,'node_modules/three/LICENSE'),resolve(root,'vendor/THREE-LICENSE.txt'));
copyFileSync(resolve(root,'node_modules/peerjs/LICENSE'),resolve(root,'vendor/PEERJS-LICENSE.txt'));
for(const [from,to] of [['dist/index.js','noise-suppressor.js'],['dist/rnnoise/workletProcessor.js','rnnoise-worklet.js'],['dist/rnnoise.wasm','rnnoise.wasm'],['dist/rnnoise_simd.wasm','rnnoise_simd.wasm'],['LICENSE','NOISE-SUPPRESSOR-LICENSE.txt']])copyFileSync(resolve(root,'node_modules/@sapphi-red/web-noise-suppressor',from),resolve(root,'vendor',to));
const read=p=>readFileSync(resolve(root,p),'utf8');
const safe=s=>s.replace(/<\//g,'<\\/');
const ids=JSON.parse(read('tools/accounts.json'));
const path=resolve(root,'tools/secrets.local.json');
const secrets=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{datakey:randomBytes(32).toString('base64'),passwords:{}};
const resetAt=process.argv.indexOf('--reset');
const resetIds=resetAt<0?[]:process.argv.slice(resetAt+1);
if(resetAt>=0&&(!resetIds.length||resetIds.some(id=>!ids.includes(id))))throw Error('Use --reset followed by valid account IDs');
const ops=JSON.parse(read('config.json')).operators||[];secrets.opKeys=secrets.opKeys||{};for(const id of ids)if(!secrets.opKeys[id]){const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});secrets.opKeys[id]={private:pair.privateKey.export({format:'jwk'}),public:pair.publicKey.export({format:'jwk'})}};
let changed=false;
for(const id of ids)if(!secrets.passwords[id]||resetIds.includes(id)){secrets.passwords[id]=randomBytes(16).toString('base64url');changed=true;}
writeFileSync(path,JSON.stringify(secrets,null,2));
const key=Buffer.from(secrets.datakey,'base64'),n=600000;
function encrypt(key,iv,data){const cipher=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([cipher.update(data),cipher.final(),cipher.getAuthTag()]).toString('base64');}
const member=read('src/member.js').replace('@@IDS@@',JSON.stringify(ids)).replace('@@VOICE@@',()=>read('src/voice.js')).replace('@@SAFETY@@',()=>read('src/safety.js')).replace('@@FACILITIES@@',()=>read('src/facilities.js')+'\n'+read('src/community.js'));
const bi=randomBytes(12);
const enc={identities:Object.fromEntries(ids.map(id=>[id,secrets.opKeys[id].public])),ops:Object.fromEntries(ops.map(id=>[id,secrets.opKeys[id].public])),n,u:ids.map(id=>{const salt=randomBytes(16),iv=randomBytes(12);return {h:createHash('sha256').update('cc:'+id.toLowerCase()).digest('hex').slice(0,16),s:salt.toString('base64'),i:iv.toString('base64'),d:encrypt(pbkdf2Sync(secrets.passwords[id],salt,n,32,'sha256'),iv,key),...(ids.includes(id)?(()=>{const oi=randomBytes(12);return {oi:oi.toString('base64'),od:encrypt(pbkdf2Sync(secrets.passwords[id],salt,n,32,'sha256'),oi,Buffer.from(JSON.stringify(secrets.opKeys[id].private)))}})():{})};}),bi:bi.toString('base64'),b:encrypt(key,bi,Buffer.from(member))};
let html=read('src/index.template.html');
const replacements={'@@ENC@@':JSON.stringify(enc),'@@CFG@@':safe(read('config.json')),'@@SOUND@@':safe(read('src/sound.js')),'@@NETWORK@@':safe(read('src/network.js')),'@@PERFORMANCE@@':safe(read('src/performance.js')),'@@MOTION@@':safe(read('src/motion.js')),'@@ATMOSPHERE@@':safe(read('src/atmosphere.js')),'@@DETAILS@@':safe(read('src/details.js')+'\n'+read('src/campus.js')),'@@ICONS@@':safe(read('src/icons.js')),'@@WORLD@@':safe(read('src/world.js').replace('@@ACCOUNTS@@',JSON.stringify(ids))),'@@EXPERIENCE@@':safe(read('src/experience.js')),'@@AUTH@@':safe(read('src/auth.js')),'@@STYLE@@':read('src/style.css')};
for(const [token,value] of Object.entries(replacements))html=html.replace(token,()=>value);
if(/@@[A-Z]+@@/.test(html))throw Error('Unresolved build token');
writeFileSync(resolve(root,'index.html'),html);
mkdirSync(resolve(root,'worlds'),{recursive:true});
const worlds=readdirSync(resolve(root,'worlds')).filter(x=>x.endsWith('.json')&&x!=='index.json').flatMap(file=>{const w=JSON.parse(read('worlds/'+file));return [{name:w.name||file,file}];});
writeFileSync(resolve(root,'worlds/index.json'),JSON.stringify(worlds,null,2));
console.log('Built index.html; indexed '+worlds.length+' worlds.');
if(changed)console.log('New passwords saved to tools/secrets.local.json (local only).');
