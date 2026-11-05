'use strict';
/* auth.js — per-user password unlock (envelope encryption). See docs/REFERENCE.md */
const _enc=new TextEncoder(),_b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const _hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function idHash(id){return _hex(await crypto.subtle.digest('SHA-256',_enc.encode('cc:'+id.trim().toLowerCase()))).slice(0,16)}
async function unlock(id,pw){
 if(!(window.crypto&&crypto.subtle))throw new Error('nosubtle');
 const h=await idHash(id),u=ENC.u.find(x=>x.h===h);if(!u)throw new Error('bad');
 const base=await crypto.subtle.importKey('raw',_enc.encode(pw),'PBKDF2',false,['deriveKey']);
 const kk=await crypto.subtle.deriveKey({name:'PBKDF2',salt:_b64(u.s),iterations:ENC.n,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
 let raw;try{raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:_b64(u.i)},kk,_b64(u.d))}catch(e){throw new Error('bad')}
 const dk=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 const code=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:_b64(ENC.bi)},dk,_b64(ENC.b)));
 return {code,room:_hex(await crypto.subtle.digest('SHA-256',raw)).slice(0,16)};
}
/*UI*/
function enterWorld(){$('gate').hidden=true;$('hud').hidden=false}
function busy(b){$('lg').disabled=b;$('gs').disabled=b}
async function login(id,pw,auto){
 busy(true);$('er').textContent=auto?'自動ログイン中…':'確認中…';
 try{
  const r=await unlock(id,pw);W.id=id.trim();W.roomKey=r.room;
  const ok=await new Function('W','return (async()=>{'+r.code+'\n})()')(W);
  if(!ok)throw new Error('bad');
  W.member=true;document.body.classList.remove('guest');
  try{localStorage.setItem('cc_auth',JSON.stringify({id:W.id,pw}))}catch(e){}
  $('er').textContent='';enterWorld();
 }catch(e){
  const m=String(e&&e.message);
  $('er').textContent=m==='bad'?(auto?'':'IDまたはパスワードが違います'):m==='nosubtle'?'この機能にはHTTPS（GitHub Pagesなど）での表示が必要です':'エラー: '+m;
  if(auto&&m==='bad')try{localStorage.removeItem('cc_auth')}catch(_){}
  console.error(e);
 }finally{busy(false)}
}
$('lg').onclick=()=>login($('uid').value,$('pw').value,false);
$('pw').onkeydown=e=>{if(e.key==='Enter')$('lg').click()};
$('gs').onclick=enterWorld;
try{const s=JSON.parse(localStorage.getItem('cc_auth')||'null');if(s&&s.id&&s.pw){$('uid').value=s.id;login(s.id,s.pw,true)}}catch(e){}
