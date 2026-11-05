// Only this explicit public allowlist may enter a deployment artifact.
import {mkdirSync,copyFileSync,cpSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(resolve(process.cwd())!==root)throw Error('Run from the project root');
const output=resolve(root,'_site');
if(dirname(output)!==root)throw Error('Invalid output path');
// _site is a disposable build artifact. Start clean so stale private files cannot leak.
rmSync(output,{recursive:true,force:true});
mkdirSync(output,{recursive:true});
copyFileSync('index.html','_site/index.html');
for(const dir of ['worlds','data','vendor'])cpSync(dir,'_site/'+dir,{recursive:true});
const list=readdirSync('worlds').filter(f=>/^[a-zA-Z0-9_-]+\.json$/.test(f)&&f!=='index.json').map(file=>({file,name:JSON.parse(readFileSync('worlds/'+file,'utf8')).name||file}));
writeFileSync('_site/worlds/index.json',JSON.stringify(list,null,2));
writeFileSync('_site/.nojekyll','');
