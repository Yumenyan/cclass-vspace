/* member.js — ENCRYPTED layer (executed after unlock as the body of an async function with `W` in scope).
   Networking (PeerJS mesh), voice (WebRTC + proximity), chat, HUD, door sync, settings. See docs/REFERENCE.md */
const IDS=@@IDS@@;
const myId=IDS.find(x=>x.toLowerCase()===W.id.toLowerCase())||W.id;W.id=myId;
const $=W.$,LS=localStorage,FH=W.FH;
const CFG=window.CC_CONFIG||{};
const muted=new Set(),blocked=new Set();let deafen=false,voiceVolume=1,unread=0;const memberHandlers=[];
const st={name:LS.getItem('cc_name_'+myId)||myId,color:+(LS.getItem('cc_col_'+myId)||0x4c8bf5),av:LS.getItem('cc_av_'+myId)||''};
const meAv=W.local;meAv.setName(st.name);meAv.setColor(st.color);if(st.av)meAv.setImage(st.av);
/* ---- chat ---- */
const log=$('log');
function msg(n,t,cls){const d=document.createElement('div');d.className='m '+(cls||'');if(n){const b=document.createElement('b');b.textContent=n;d.appendChild(b)}const time=document.createElement('time');time.textContent=new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});d.appendChild(time);const s=document.createElement('span');s.textContent=t;d.appendChild(s);log.appendChild(d);log.scrollTop=log.scrollHeight;while(log.children.length>150)log.firstChild.remove()}
const chat=$('chat');
$('bChat').onclick=()=>{unread=0;$('unread').hidden=true;chat.classList.toggle('open');$('welcome').hidden=true;$('bChat').classList.toggle('on',chat.classList.contains('open'))};
$('chatClose').onclick=()=>{chat.classList.remove('open');$('bChat').classList.remove('on')};
function sendChat(){const t=$('ci').value.trim();if(!t)return;$('ci').value='';const room=$('chatScope').value==='room'?W.me.zone:null;msg(st.name+(room?' · この部屋':''),t,'me');meAv.say(t);send({t:'c',m:t,room})}
$('cs').onclick=sendChat;$('ci').onkeydown=e=>{if(e.key==='Enter')sendChat()};
msg('','ようこそ、'+st.name+' さん','sys');
/* ---- network: serverless mesh over PeerJS public broker, rooms namespaced by a key only members can derive ---- */
const NS='cclass-'+W.roomKey,MAXS=16,peers=new Map();
let micPending=false;let peer=null,mySlot=-1,stream=null,ctx=null,scanT=null;
const PO=Object.assign({},CFG.peer||{});if(CFG.ice)PO.config={iceServers:CFG.ice};
function setNet(s){const e=$('stat');e.dataset.s=s;$('statt').textContent={wait:'接続中…',ok:'オンライン',full:'満室（同時接続上限）',err:'接続エラー'}[s]||s}
const closedList=()=>Object.keys(W.doors).filter(z=>W.doors[z].closed);
const hello=()=>({t:'hi',id:myId,name:st.name,col:st.color,av:st.av,glb:st.glb||'',dr:closedList(),minutes:Math.floor((Date.now()-joinedAt)/60000)});const joinedAt=Date.now();
function send(m){peers.forEach(p=>{try{if(p.conn.open)p.conn.send(m)}catch(e){}})}
function updPC(){$('pc').textContent=peers.size+1}
function startPeer(s){
 if(typeof Peer==='undefined'){setNet('err');W.toast('PeerJSを読み込めませんでした');return}
 const pr=new Peer(NS+'-'+s,PO);
 pr.on('open',()=>{peer=pr;mySlot=s;setNet('ok');scan();clearInterval(scanT);scanT=setInterval(scan,5000)});
 pr.on('error',e=>{if(e.type==='unavailable-id'){try{pr.destroy()}catch(_){}if(s+1<MAXS)startPeer(s+1);else setNet('full')}else if(e.type!=='peer-unavailable'){setNet('err');console.warn(e)}});
 pr.on('connection',c=>link(c));
 pr.on('call',call=>{if(call.metadata?.kind==='screen'){W.onScreenCall&&W.onScreenCall(call);return}call.answer();call.on('stream',s2=>voiceIn(call.peer,s2));call.on('close',()=>voiceOut(call.peer))});
 pr.on('disconnected',()=>{setNet('wait');try{pr.reconnect()}catch(e){setNet('err')}});
}
function scan(){if(!peer||peer.destroyed)return;for(let s=mySlot+1;s<MAXS;s++){const id=NS+'-'+s;if(!peers.has(id))link(peer.connect(id,{reliable:true}))}}
function link(c){
 const id=c.peer;
 c.on('open',()=>{const ex=peers.get(id);if(ex&&ex.conn!==c&&ex.conn.open){c.close();return}
  peers.set(id,{pid:id,conn:c,av:null,name:'?',x:0,z:0,f:1,zn:'out',ry:0,sit:false,first:true});c.send(hello());updPC()});
 c.on('data',d=>onData(id,c,d));c.on('close',()=>drop(id,c));c.on('error',()=>drop(id,c));
}
function onData(id,c,d){const p=peers.get(id);if(!p||p.conn!==c||!d||typeof d!=='object'||typeof d.t!=='string'||blocked.has(id))return;
 if(!p.rateAt||Date.now()-p.rateAt>1000){p.rateAt=Date.now();p.rate=0}if(++p.rate>100)return;
 if(d.t==='hi'&&(typeof d.name!=='string'||d.name.length>32||typeof d.id!=='string'||!IDS.includes(d.id)))return;
 if(d.t==='hi'){const first=!p.av;p.name=d.name;p.id=d.id;p.minutes=Math.max(0,Math.min(100000,Number(d.minutes)||0));if(first){p.av=W.makeAvatar(d.name,d.col);p.av.g.position.set(p.x,0,p.z)}else{p.av.setName(d.name);p.av.setColor(d.col)}
  if(typeof d.av==='string'&&d.av.length<250000&&(!d.av||/^data:image\/(webp|png|jpeg);base64,/.test(d.av))&&p.avUrl!==d.av){p.avUrl=d.av;p.av.setImage(d.av||'')}
  if(Array.isArray(d.dr))d.dr.slice(0,100).forEach(z=>{const r=W.doors[z]?.room;if(r&&(r.k!=='private'||IDS[r.own]===p.id))W.setDoor(z,true,true)});if(typeof d.glb==='string'&&d.glb.length<2048&&W.setAvatarModel&&p.glb!==d.glb){p.glb=d.glb;W.setAvatarModel(p.av,d.glb)}
  if(first){msg('',d.name+' が参加しました','sys');if(stream)callPeer(p);updPC()}}
 else if(!p.av)return;
 else if(d.t==='p'){if(![d.x,d.z,d.f,d.ry].every(Number.isFinite)||Math.abs(d.x)>118||Math.abs(d.z)>118||!Number.isInteger(d.f)||d.f<1||d.f>3||typeof d.zn!=='string'||d.zn.length>80)return;p.world=typeof d.world==='string'?d.world.slice(0,80):'';p.tx=d.x;p.tz=d.z;p.f=d.f;p.zn=d.zn;p.ry=d.ry;p.sit=!!d.s;if(p.first){p.first=false;p.av.g.position.set(d.x,(d.f-1)*FH,d.z)}}
 else if(d.t==='c'){if(typeof d.m!=='string'||d.m.length>200||d.room&&d.room!==W.me.zone)return;msg(p.name+(d.room?' · この部屋':''),d.m);p.av.say(d.m.slice(0,60));if(!chat.classList.contains('open')){unread++;$('unread').textContent=unread>9?'9+':unread;$('unread').hidden=false}}
 else if(d.t==='dr'){const target=W.doors[d.z]?.room;if(!target||target.k==='private'&&IDS[target.own]!==p.id)return;W.setDoor(d.z,!!d.c,true);const r=W.doors[d.z]&&W.doors[d.z].room;if(r)msg('',p.name+' が'+r.n+'のドアを'+(d.c?'閉めました':'開けました'),'sys')}
 else memberHandlers.forEach(fn=>fn(p,d));
}
function drop(id,c){const p=peers.get(id);if(!p||p.conn!==c)return;peers.delete(id);if(p.av){p.av.dispose();msg('',p.name+' が退出しました','sys')}voiceOut(id);const cl=calls.get(id);if(cl){try{cl.close()}catch(e){}calls.delete(id)}updPC()}
/* ---- voice ---- */
const calls=new Map(),vc=new Map();
function ctxInit(){ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume()}
['pointerdown','keydown','touchend'].forEach(e=>addEventListener(e,()=>{if(ctx&&ctx.state==='suspended')ctx.resume()},{passive:true}));
function voiceIn(pid,s){ctxInit();voiceOut(pid);const el=new Audio();el.srcObject=s;el.muted=true;el.play().catch(()=>{});const src=ctx.createMediaStreamSource(s),g=ctx.createGain();g.gain.value=0;src.connect(g);g.connect(ctx.destination);vc.set(pid,{g,el,src})}
function voiceOut(pid){const v=vc.get(pid);if(!v)return;try{v.src.disconnect();v.g.disconnect()}catch(e){}v.el.srcObject=null;vc.delete(pid)}
function callPeer(p){if(!stream||!peer||calls.has(p.pid))return;const c=peer.call(p.pid,stream);calls.set(p.pid,c);c.on('close',()=>calls.delete(p.pid))}
function micUI(on){$('bMic').classList.toggle('on',on);$('bMic').firstChild.textContent=on?'mic':'mic_off';const r=document.getElementById('rbMic');if(r)r.classList.toggle('on',on)}
async function mic(on){
 if(on){if(stream||micPending)return;micPending=true;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch(e){W.toast('マイクを使えませんでした（HTTPSと許可設定を確認）');return}finally{micPending=false}
  ctxInit();peers.forEach(callPeer);micUI(true);W.toast('マイクON：近くの人に声が届きます')}
 else{if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;calls.forEach(c=>{try{c.close()}catch(e){}});calls.clear();micUI(false)}
}
$('bMic').onclick=()=>mic(!stream);
const VR=24;
function vol(p){if((p.world||'')!==(W.customWorld||''))return 0;const m=W.me,g=p.av.g.position;let d=Math.hypot(g.x-m.x,g.z-m.z)+Math.abs(p.f-m.f)*8;
 if(p.zn!==m.zone){const a=W.doors[p.zn],b=W.doors[m.zone];if((a&&a.closed)||(b&&b.closed))return 0}
 return d>=VR?0:Math.pow(1-d/VR,1.3)}
/* ---- per-frame: broadcast own state, interpolate remotes, voice gains, ring ---- */
let acc=0,hb=0,last='';
W.onTick.push(dt=>{
 acc+=dt;hb+=dt;const m=W.me;
 if(acc>=.1){acc=0;const s=JSON.stringify({t:'p',x:+m.x.toFixed(2),z:+m.z.toFixed(2),f:m.f,ry:+m.ry.toFixed(2),zn:m.zone,s:m.sit?1:0,world:W.customWorld||''});if(s!==last||hb>1){last=s;hb=0;send(JSON.parse(s))}}
 const k=1-Math.exp(-dt*10);
 peers.forEach(p=>{if(!p.av||p.first)return;p.av.g.visible=!blocked.has(p.pid)&&(p.world||'')===(W.customWorld||'');const g=p.av.g.position;g.x+=(p.tx-g.x)*k;g.z+=(p.tz-g.z)*k;g.y=(p.f-1)*FH;p.av.body.rotation.y=p.ry;p.av.body.position.y=p.sit?-.32:0;
  const v=vc.get(p.pid);if(v&&ctx)v.g.gain.setTargetAtTime(deafen||muted.has(p.pid)||blocked.has(p.pid)?0:vol(p)*voiceVolume,ctx.currentTime,.1)});

});
/* ---- HUD ring (items around the avatar) ---- */
const ring=$('ring');
[['mic','🎙',()=>mic(!stream)],['👋','👋',()=>emote('👋')],['😄','😄',()=>emote('😄')],['👍','👍',()=>emote('👍')],['❤','❤️',()=>emote('❤️')]].forEach(([id,t,f])=>{const b=document.createElement('button');b.className='rb';b.textContent=t;if(id==='mic')b.id='rbMic';b.onclick=f;ring.appendChild(b)});
function emote(t){meAv.say(t);send({t:'c',m:t})}
/* ---- doors: private rooms are owner-only; knock notifies everyone ---- */
W.canToggle=r=>r.k!=='private'||IDS[r.own]===myId;
W.onDoorChange=(z,c)=>{send({t:'dr',z,c});const r=W.doors[z].room;msg('',r.n+'のドアを'+(c?'閉めました':'開けました'),'sys')};
W.onKnock=r=>{const t='🚪 '+st.name+' が '+r.n+' をノックしました';msg('',t,'sys');send({t:'c',m:t})};
/* ---- virtual terminal in the garden ---- */
W.bx(1.3,1.7,.8,13,.85,-5,0x26303c);W.bx(1,.7,.06,13,1.25,-4.58,W.mat(0x4cc9b0,{emissive:0x4cc9b0,emissiveIntensity:.7}),0,{cast:false});
{const l=W.label('仮想端末',{h:.5});l.position.set(13,2.6,-5);W.S.add(l)}W.rect(1,13,-5,1.3,.8);
W.act(1,13,-3.6,3.4,'📟 仮想端末（チャット）',()=>{chat.classList.add('open');$('bChat').classList.add('on');setTimeout(()=>$('ci').focus(),50)});
/* ---- people / settings ---- */
const COLS=[0x4c8bf5,0x4cc9b0,0xe8955a,0xd96b8a,0x9b7be8,0xe6c04c,0x3a4654];
addEventListener('beforeunload',()=>{if(stream)stream.getTracks().forEach(t=>t.stop());try{peer&&peer.destroy()}catch(e){}});
$('bChat').classList.toggle('on',chat.classList.contains('open'));
@@FACILITIES@@
startPeer(0);
return true;
