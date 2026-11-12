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
 let operatorKey=null;if(u.od){const rawOp=await crypto.subtle.decrypt({name:'AES-GCM',iv:_b64(u.oi)},kk,_b64(u.od));operatorKey=await crypto.subtle.importKey('jwk',JSON.parse(new TextDecoder().decode(rawOp)),{name:'ECDSA',namedCurve:'P-256'},false,['sign'])}return {identityKey:operatorKey,operatorKey:Object.keys(ENC.ops||{}).some(name=>name.toLowerCase()===id.trim().toLowerCase())?operatorKey:null,code,room:_hex(await crypto.subtle.digest('SHA-256',raw)).slice(0,16)};
}
/*UI*/
function enterWorld(){const restriction=JSON.parse(localStorage.getItem('cc_moderation')||'null');if(restriction?.action==='kick'&&restriction.until>Date.now()){W.toast('OPによる退出制限中です');return}$('gate').hidden=true;$('hud').hidden=false;W.onEnter&&W.onEnter()}
function busy(b){$('lg').disabled=b;$('gs').disabled=b}
async function login(id,pw,auto){
 const restriction=JSON.parse(localStorage.getItem('cc_moderation')||'null');if(restriction&&restriction.until>Date.now()){W.toast('OPによる利用制限中です');return}busy(true);$('er').textContent=auto?'自動ログイン中…':'確認中…';
 try{
  const r=await unlock(id,pw);W.id=id.trim();W.roomKey=r.room;W.operatorKey=r.operatorKey;W.operatorKeys=ENC.ops;W.identityKey=r.identityKey;W.accountKeys=ENC.identities;
  const ok=await new Function('W','return (async()=>{'+r.code+'\n})()')(W);
  if(!ok)throw new Error('bad');
  W.member=true;document.body.classList.remove('guest');W.onMemberEnter?.();
  try{if($('remember').checked)localStorage.setItem('cc_auth',JSON.stringify({id:W.id,pw}));else localStorage.removeItem('cc_auth')}catch(e){}
  $('er').textContent='';enterWorld();
 }catch(e){
  const m=String(e&&e.message);
  $('er').textContent=m==='bad'?(auto?'':'IDまたはパスワードが違います'):m==='nosubtle'?'この機能にはHTTPS（GitHub Pagesなど）での表示が必要です':'エラー: '+m;
  if(auto&&m==='bad')try{localStorage.removeItem('cc_auth')}catch(_){}
  console.error(e);
 }finally{busy(false)}
}
$('loginForm').onsubmit=e=>{e.preventDefault();if(!$('lg').disabled)login($('uid').value,$('pw').value,false)};

$('gs').onclick=enterWorld;
try{const s=JSON.parse(localStorage.getItem('cc_auth')||'null');if(s&&s.id&&s.pw){$('uid').value=s.id;$('remember').checked=true;login(s.id,s.pw,true)}}catch(e){}

W.unlockIdentity=async(id,pw)=>(await unlock(id,pw)).identityKey;

try{const restriction=JSON.parse(localStorage.getItem('cc_moderation')||'null');if(restriction?.action==='timeout'&&restriction.until>Date.now())enterWorld()}catch(_){}
