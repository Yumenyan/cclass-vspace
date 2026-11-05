// Only this explicit public allowlist may enter a deployment artifact.
import {mkdirSync,copyFileSync,cpSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('_site',{recursive:true});
copyFileSync('index.html','_site/index.html');
for(const dir of ['worlds','data','vendor'])cpSync(dir,'_site/'+dir,{recursive:true});
const list=readdirSync('worlds').filter(f=>/^[a-zA-Z0-9_-]+\.json$/.test(f)&&f!=='index.json').map(file=>({file,name:JSON.parse(readFileSync('worlds/'+file,'utf8')).name||file}));
writeFileSync('_site/worlds/index.json',JSON.stringify(list,null,2));
writeFileSync('_site/.nojekyll','');
