/* member.js — ENCRYPTED layer (executed after unlock as the body of an async function with `W` in scope).
   Networking (PeerJS mesh), voice (WebRTC + proximity), chat, HUD, door sync, settings. See docs/REFERENCE.md */
const IDS=@@IDS@@;
const myId=IDS.find(x=>x.toLowerCase()===W.id.toLowerCase())||W.id;W.id=myId;
const $=W.$,LS=localStorage,FH=W.FH;
const CFG=window.CC_CONFIG||{};
const muted=new Set();let deafen=false,voiceVolume=1,unread=0;const memberHandlers=[];
const st={name:LS.getItem('cc_name_'+myId)||myId,color:+(LS.getItem('cc_col_'+myId)||0x4c8bf5),av:LS.getItem('cc_av_'+myId)||''};
const meAv=W.local;meAv.setName(st.name);meAv.setColor(st.color);if(st.av)meAv.setImage(st.av);
/* ---- chat ---- */
const log=$('log');
function msg(n,t,cls,author){const d=document.createElement('div');d.className='m '+(cls||'');if(author){d.dataset.author=author;d.hidden=policy(author).chat==='none'}if(n){const b=document.createElement('b');b.textContent=n;d.appendChild(b)}const time=document.createElement('time');time.textContent=W.clock?W.clock.time():new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});d.appendChild(time);const s=document.createElement('span');s.textContent=t;d.appendChild(s);log.appendChild(d);log.scrollTop=log.scrollHeight;while(log.children.length>150)log.firstChild.remove()}
const chat=$('chat');
$('bChat').onclick=()=>{unread=0;$('unread').hidden=true;chat.classList.toggle('open');$('welcome').hidden=true;$('bChat').classList.toggle('on',chat.classList.contains('open'))};
$('chatClose').onclick=()=>{chat.classList.remove('open');$('bChat').classList.remove('on')};
function sendChat(){if(W.moderated?.chat>Date.now()){W.toast('OPによりチャット制限中です');return}const t=$('ci').value.trim();if(!t)return;$('ci').value='';const room=$('chatScope').value==='room'?W.me.zone:null;msg(st.name+(room?' · この部屋':''),t,'me');meAv.say(t);emitChat(t,room)}
function emitChat(m,room=null){if(W.moderated?.chat>Date.now())return;const mid=crypto.randomUUID();seenChats.accept(myId+'|'+mid,performance.now());send({t:'c',m,room,mid})}
$('cs').onclick=sendChat;$('ci').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229&&!e.repeat){e.preventDefault();sendChat()}};
msg('','ようこそ、'+st.name+' さん','sys');
/* ---- network: serverless mesh over PeerJS public broker, rooms namespaced by a key only members can derive ---- */
const VERSION='3.0.0',NS='cclass-'+W.roomKey+'-v'+VERSION.replaceAll('.','_'),MAXS=16,peers=new Map();
const netRetry=new W.networkTools.Retry(2000,60000),seenChats=new W.networkTools.Seen(),pending=new Map(),linked=new WeakSet();let brokerReady=false,peerGeneration=0,netStopped=false,reconnectTimer=null,reconnectFailures=0;
let micPipeline=null,micGeneration=0;let micPending=false;let peer=null,mySlot=-1,stream=null,ctx=null,scanT=null;
const PO=Object.assign({},CFG.peer||{});if(CFG.ice)PO.config={iceServers:CFG.ice};
function setNet(s){const e=$('stat');e.dataset.s=s;$('statt').textContent={wait:peers.size?'通信を維持・再接続中':'接続を再試行中…',ok:peers.size?'オンライン':'オンライン・参加待ち',full:'満室（同時接続上限）',err:'接続を確認してください'}[s]||s;e.title=networkIssue||''}
let networkIssue='';
const closedList=()=>Object.keys(W.doors).filter(z=>W.doors[z].closed);
const hello=()=>({t:'hi',version:VERSION,id:myId,name:st.name,col:st.color,av:st.av,glb:st.glb||'',dr:closedList(),noEntry:deniedEntries(),minutes:Math.floor((performance.now()-joinedAt)/60000)});const joinedAt=performance.now();
function send(m){let count=0;peers.forEach(p=>{try{if(p.conn.open){if(m.t==='p'&&(p.conn.dataChannel?.bufferedAmount||0)>65536)return;p.conn.send(m);count++}}catch(_){}});return count}
function updPC(){$('pc').textContent=[...peers.values()].filter(p=>p.av).length+1;setNet(brokerReady?'ok':'wait')}
function retryBroker(){if(netStopped||reconnectTimer)return;const delay=Math.min(30000,750*2**Math.min(6,reconnectFailures++));reconnectTimer=setTimeout(()=>{reconnectTimer=null;if(netStopped)return;try{if(peer&&!peer.destroyed&&peer.disconnected)peer.reconnect();else if(!peer||peer.destroyed)startPeer(Math.max(0,mySlot));if(!brokerReady)retryBroker()}catch(_){retryBroker()}},delay)}
function clearPending(id,c,failed=true){const state=pending.get(id);if(!state||state.conn!==c)return;pending.delete(id);clearTimeout(state.timer);if(failed)netRetry.fail(id,performance.now());try{if(!c.open)c.close()}catch(_){}}
function startPeer(s){
 if(netStopped)return;if(typeof Peer==='undefined'){networkIssue='通信ライブラリを読み込めませんでした';setNet('err');return}
 const generation=++peerGeneration,pr=new Peer(NS+'-'+s,PO);peer=pr;brokerReady=false;
 pr.on('open',()=>{if(generation!==peerGeneration||netStopped){pr.destroy();return}peer=pr;mySlot=s;brokerReady=true;networkIssue='';reconnectFailures=0;clearTimeout(reconnectTimer);reconnectTimer=null;setNet('ok');scan();clearInterval(scanT);scanT=setInterval(maintainNetwork,200)});
 pr.on('error',e=>{if(generation!==peerGeneration||netStopped)return;
  if(e.type==='peer-unavailable'){const message=String(e.message||'');for(const [id,state] of pending)if(message.includes(id))clearPending(id,state.conn);return}
  if(e.type==='webrtc'){networkIssue='相手との通信を再試行しています';return}
  if(e.type==='unavailable-id'){peerGeneration++;try{pr.destroy()}catch(_){}if(s+1<MAXS)setTimeout(()=>startPeer(s+1),100);else{networkIssue='接続枠が埋まっています';setNet('full')}return}
  networkIssue='接続仲介: '+String(e.type||'network');brokerReady=false;setNet('wait');retryBroker();
 });
 pr.on('connection',c=>{if(generation===peerGeneration&&!netStopped)link(c);else c.close()});
 pr.on('call',call=>{if(generation!==peerGeneration||netStopped){call.close();return}if(call.metadata?.kind==='screen'){W.onScreenCall&&W.onScreenCall(call);return}receiveVoiceCall(call)});
 pr.on('disconnected',()=>{if(generation!==peerGeneration||netStopped)return;brokerReady=false;setNet('wait');retryBroker()});
 pr.on('close',()=>{if(generation!==peerGeneration||netStopped)return;brokerReady=false;setNet('wait');retryBroker()});
}
function scan(){if(!peer||peer.destroyed||!brokerReady||peer.disconnected||pending.size>=6)return;for(let s=mySlot+1;s<MAXS&&pending.size<6;s++){const id=NS+'-'+s;if(!peers.has(id)&&!pending.has(id)&&netRetry.ready(id,performance.now())){try{link(peer.connect(id,{reliable:true,serialization:'binary'}))}catch(_){netRetry.fail(id,performance.now())}}}}
function link(c){
 if(!c||linked.has(c))return;linked.add(c);const id=c.peer;
 if(!new RegExp('^'+NS+'-(?:[0-9]|1[0-5])$').test(id)){try{c.close()}catch(_){}return}
 const ex=peers.get(id),waiting=pending.get(id);if(ex?.conn.open&&ex.conn!==c||waiting&&waiting.conn!==c){try{c.close()}catch(_){}return}
 let activated=false;const timer=setTimeout(()=>clearPending(id,c),12000);pending.set(id,{conn:c,timer});
 const open=()=>{if(activated||netStopped)return;activated=true;const existing=peers.get(id);if(existing?.conn.open&&existing.conn!==c){clearPending(id,c,false);c.close();return}clearTimeout(timer);if(pending.get(id)?.conn===c)pending.delete(id);netRetry.clear(id);
  const p=existing||{pid:id,av:null,name:'?',x:0,z:0,f:1,zn:'out',ry:0,sit:false,first:true};p.conn=c;p.lastSeen=performance.now();p.lastPing=0;p.disconnectedAt=0;peers.set(id,p);c.send(hello());publishPosition(true);updPC();
 };
 c.on('open',open);c.on('data',d=>onData(id,c,d));c.on('close',()=>{clearPending(id,c);drop(id,c)});c.on('error',()=>{clearPending(id,c);drop(id,c);try{c.close()}catch(_){}});if(c.open)queueMicrotask(open);
}
function maintainNetwork(){if(netStopped)return;const now=performance.now();if(!brokerReady)retryBroker();scan();for(const p of peers.values()){
 const state=p.conn.peerConnection?.connectionState;if(state==='failed'||state==='closed'){p.conn.close();drop(p.pid,p.conn);continue}
 if(state==='disconnected'){p.disconnectedAt=p.disconnectedAt||now;if(now-p.disconnectedAt>15000){p.conn.close();drop(p.pid,p.conn);continue}}else p.disconnectedAt=0;
 if(now-p.lastSeen>90000){p.conn.close();drop(p.pid,p.conn);continue}
 if(now-p.lastPing>5000&&p.conn.open){p.lastPing=now;try{p.conn.send({t:'ping',at:now})}catch(_){}}
 const outgoing=calls.get(p.pid);if(outgoing&&now-(p.voiceStarted||now)>20000&&outgoing.peerConnection?.connectionState!=='connected'){try{outgoing.close()}catch(_){}calls.delete(p.pid);p.voiceNext=now+3000}
 if(stream&&!calls.has(p.pid)&&now>=(p.voiceNext||0))callPeer(p);
 }publishPosition(false);}
W.network={retry(){clearTimeout(reconnectTimer);reconnectTimer=null;reconnectFailures=0;netRetry.reset();if(peer&&!peer.destroyed){if(peer.disconnected)try{peer.reconnect()}catch(_){retryBroker()}else scan()}else startPeer(Math.max(0,mySlot))},get status(){return {brokerReady,pending:pending.size,connected:peers.size,issue:networkIssue}}};
function onData(id,c,d){const p=peers.get(id);if(!p||p.conn!==c||!d||typeof d!=='object'||typeof d.t!=='string')return;
 p.lastSeen=performance.now();if(d.t==='ping'){if(Number.isFinite(d.at))try{c.send({t:'pong',at:d.at})}catch(_){}return}if(d.t==='pong'){if(Number.isFinite(d.at))p.rtt=Math.max(0,performance.now()-d.at);return}
 if(!p.rateAt||performance.now()-p.rateAt>1000){p.rateAt=performance.now();p.rate=0;p.fileRate=0}if(d.t==='file-chunk'){if(++p.fileRate>4096)return}else if(++p.rate>100)return;
 if(d.t==='hi'&&(typeof d.name!=='string'||d.name.length>32||typeof d.id!=='string'||!IDS.includes(d.id)))return;
 if(d.t==='hi'&&d.version!==VERSION){c.close();W.toast('相手とバージョンが異なります。再読み込みしてください');return}if(d.t==='hi'){const first=!p.av;p.name=d.name;p.id=d.id;receiveRestrictions(p.id,d.noEntry);p.minutes=Math.max(0,Math.min(100000,Number(d.minutes)||0));if(first){p.av=W.makeAvatar(d.name,d.col);p.av.g.position.set(p.x,0,p.z)}else{p.av.setName(d.name);p.av.setColor(d.col)}
  if(typeof d.av==='string'&&d.av.length<250000&&(!d.av||/^data:image\/(webp|png|jpeg);base64,/.test(d.av))&&p.avUrl!==d.av){p.avUrl=d.av;p.av.setImage(d.av||'')}
  if(Array.isArray(d.dr))d.dr.slice(0,100).forEach(z=>{const r=W.doors[z]?.room;if(r&&(r.k!=='private'||IDS[r.own]===p.id))W.setDoor(z,true,true)});if(typeof d.glb==='string'&&d.glb.length<2048&&W.setAvatarModel&&p.glb!==d.glb){p.glb=d.glb;W.setAvatarModel(p.av,d.glb)}
  p.av.g.visible=!policy(p).hideAvatar&&(p.world||'')===(W.customWorld||'');if(first){msg('',d.name+' が参加しました','sys',p.id);if(stream)callPeer(p);updPC()}}
 else if(!p.av)return;
 else if(d.t==='p'){
  if(![d.x,d.z,d.f,d.ry].every(Number.isFinite)||Math.abs(d.x)>118||Math.abs(d.z)>118||!Number.isInteger(d.f)||d.f<1||d.f>Math.max(...W.BD.map(b=>b.fl))||typeof d.zn!=='string'||d.zn.length>80)return;
  if(d.y!==undefined&&(!Number.isFinite(d.y)||d.y<0||d.y>32))return;
  if(['vx','vz','vy','q','tm'].some(k=>d[k]!==undefined&&!Number.isFinite(d[k])))return;
  p.motion=p.motion||W.motion.remote();if(!W.motion.push(p.motion,d,performance.now()))return;
  p.height=Math.max(.3,Math.min(2,Number(d.height)||1));p.av.g.scale.setScalar(p.height);p.mic=!!d.mic;p.deaf=!!d.deaf;p.av.setName(p.name+(p.mic?'':' 🔇')+(p.deaf?' 🔈OFF':''));p.world=typeof d.world==='string'?d.world.slice(0,80):'';p.tx=d.x;p.tz=d.z;p.f=d.f;p.zn=d.zn;p.ry=d.ry;p.sit=!!d.s;
  if(p.first||p.motion.teleported){p.first=false;p.av.g.position.set(d.x,(d.f-1)*FH+(d.y||0),d.z);p.av.body.rotation.y=d.ry;p.motion.teleported=false}
 }
 else if(d.t==='c'){if(policy(p).chat==='none')return;if(typeof d.m!=='string'||d.m.length>200||d.room&&(d.room!==W.me.zone||p.zn!==d.room))return;if(d.mid!==undefined&&(typeof d.mid!=='string'||d.mid.length>100))return;const stamp=performance.now(),identity=p.id+'|'+(d.mid||('legacy|'+(d.room||'')+'|'+d.m));if(!seenChats.accept(identity,stamp,d.mid?300000:1200))return;msg(p.name+(d.room?' · この部屋':''),d.m,'',p.id);if(policy(p).chat==='all')p.av.say(d.m.slice(0,60));W.sfx?.play('notify','world');if(!chat.classList.contains('open')){unread++;$('unread').textContent=unread>9?'9+':unread;$('unread').hidden=false}}
 else if(d.t==='status'){p.minutes=Math.max(0,Math.min(100000,Number(d.minutes)||0))}
 else if(d.t==='dr'){const target=W.doors[d.z]?.room;if(!target||target.k==='private'&&IDS[target.own]!==p.id)return;W.setDoor(d.z,!!d.c,true);const r=W.doors[d.z]&&W.doors[d.z].room;if(r)msg('',p.name+' が'+r.n+'のドアを'+(d.c?'閉めました':'開けました'),'sys',p.id)}
 else if(!(d.t==='file-offer'&&policy(p).chat==='none'))memberHandlers.forEach(fn=>fn(p,d));
}
function drop(id,c){const p=peers.get(id);if(!p||p.conn!==c)return;peers.delete(id);netRetry.fail(id,performance.now());if(p.av){p.av.dispose();msg('',p.name+' が退出しました','sys',p.id)}voiceOut(id);const incoming=incomingCalls.get(id);if(incoming){incomingCalls.delete(id);try{incoming.close()}catch(_){}}const cl=calls.get(id);if(cl){try{cl.close()}catch(e){}calls.delete(id)}updPC()}
/* ---- voice ---- */
@@VOICE@@
const calls=new Map(),vc=new Map(),incomingCalls=new Map();
function ctxInit(){if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;try{ctx=new Audio({sampleRate:48000})}catch(_){ctx=new Audio()}}if(ctx.state==='suspended')ctx.resume();return ctx}
['pointerdown','keydown','touchend'].forEach(e=>addEventListener(e,()=>{if(ctx&&ctx.state==='suspended')ctx.resume()},{passive:true}));
function voiceIn(pid,s){ctxInit();voiceOut(pid);const el=new Audio();el.srcObject=s;el.muted=true;el.play().catch(()=>{});const src=ctx.createMediaStreamSource(s),g=ctx.createGain(),analyser=ctx.createAnalyser();analyser.fftSize=256;g.gain.value=0;src.connect(analyser);analyser.connect(g);g.connect(ctx.destination);vc.set(pid,{g,el,src,analyser,data:new Uint8Array(256)})}
function voiceOut(pid){const v=vc.get(pid);if(!v)return;try{v.src.disconnect();v.analyser.disconnect();v.g.disconnect()}catch(e){}v.el.srcObject=null;vc.delete(pid)}
function receiveVoiceCall(call){const pid=call.peer;if(!peers.has(pid)){call.close();return}const previous=incomingCalls.get(pid);if(previous===call)return;incomingCalls.set(pid,call);if(previous)try{previous.close()}catch(_){}
 call.on('stream',s=>{if(incomingCalls.get(pid)===call)voiceIn(pid,s)});const cleanup=()=>{if(incomingCalls.get(pid)===call){incomingCalls.delete(pid);voiceOut(pid)}};call.on('close',cleanup);call.on('error',cleanup);call.answer();}
function callPeer(p){if(!stream||!peer||!brokerReady||peer.disconnected||calls.has(p.pid)||!p.av)return;try{const c=peer.call(p.pid,stream);calls.set(p.pid,c);p.voiceStarted=performance.now();const done=()=>{if(calls.get(p.pid)!==c)return;calls.delete(p.pid);p.voiceFailures=Math.min(5,(p.voiceFailures||0)+1);p.voiceNext=performance.now()+Math.min(30000,1000*2**p.voiceFailures)};c.on('close',done);c.on('error',done);const pc=c.peerConnection;if(pc?.addEventListener)pc.addEventListener('connectionstatechange',()=>{if(pc.connectionState==='connected'){p.voiceFailures=0;p.voiceNext=0}else if(pc.connectionState==='failed'){done();try{c.close()}catch(_){}}})}catch(_){p.voiceNext=performance.now()+3000}}
function micUI(on){$('bMic').classList.toggle('on',on);$('bMic').firstChild.textContent=on?'mic':'mic_off';const r=document.getElementById('rbMic');if(r)r.classList.toggle('on',on)}
async function mic(on){
 if(on&&W.moderated?.mic>Date.now()){W.toast('OPによりマイク制限中です');return}if(on&&(stream||micPending))return;const generation=++micGeneration;
 if(!on){micPending=false;$('bMic').disabled=false;if(micPipeline){micPipeline.cleanup();micPipeline=null}else if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;calls.forEach(c=>{try{c.close()}catch(_){}});calls.clear();micUI(false);return}
 lastVoiceError='';micPending=true;$('bMic').disabled=true;stopVoiceTest();
 try{ctxInit();const pipeline=await createVoicePipeline(voicePrefs);if(generation!==micGeneration){pipeline.cleanup();return}micPipeline=pipeline;stream=pipeline.stream;pipeline.raw.getAudioTracks().forEach(t=>t.onended=()=>{mic(false);W.toast('マイクの接続が終了しました')});peers.forEach(callPeer);micUI(true);W.toast('マイクON · '+pipeline.label)}catch(error){lastVoiceError=String(error?.message||error);if(generation===micGeneration)W.toast('マイクを使えませんでした。接続とブラウザーの許可設定を確認してください。')}finally{if(generation===micGeneration){micPending=false;$('bMic').disabled=false}}
}
$('bMic').onclick=()=>mic(!stream);
const VR=24;
function vol(original){const p=W.voiceAnchor?.(original)||original;if((p.world||'')!==(W.customWorld||''))return 0;const m=W.me,g=p.av.g.position;let d=Math.hypot((Number.isFinite(p.tx)?p.tx:g.x)-m.x,(Number.isFinite(p.tz)?p.tz:g.z)-m.z)+Math.abs(p.f-m.f)*8;
 if(p.zn!==m.zone){const a=W.doors[p.zn],b=W.doors[m.zone];if((a&&a.closed)||(b&&b.closed))return 0}
 return d>=VR?0:Math.pow(1-d/VR,1.3)}
// Audio proximity keeps updating when the browser pauses background animation frames.
const voiceTimer=setInterval(()=>{peers.forEach(p=>{if(!p.av)return;const v=vc.get(p.pid);if(!v||!ctx){p.av.setSpeaking(false);return}const gain=(deafen||W.moderated?.deaf>Date.now())||muted.has(p.pid)?0:vol(p)*voiceVolume*policy(p).volume;v.g.gain.setTargetAtTime(gain,ctx.currentTime,.1);v.analyser.getByteTimeDomainData(v.data);const rms=Math.sqrt(v.data.reduce((sum,n)=>sum+((n-128)/128)**2,0)/v.data.length);p.av.setSpeaking(gain>.01&&rms>.025)})},100);
addEventListener('beforeunload',()=>clearInterval(voiceTimer));
/* ---- per-frame: broadcast own state, interpolate remotes, voice gains, ring ---- */
let acc=0,lastPositionAt=0,last='',motionSequence=0;
function publishPosition(force=false){const now=performance.now(),m=W.me;if(!force&&now-lastPositionAt<100)return;const state={t:'p',x:+m.x.toFixed(2),z:+m.z.toFixed(2),f:m.f,ry:+m.ry.toFixed(3),y:+m.y.toFixed(3),height:W.prefs.height||1,mic:!!stream,deaf:deafen||W.moderated?.deaf>Date.now(),g:m.grounded?1:0,vx:+m.vx.toFixed(2),vz:+m.vz.toFixed(2),vy:+m.vy.toFixed(2),zn:m.zone,s:m.sit?1:0,world:W.customWorld||''},value=JSON.stringify(state);if(force||value!==last||now-lastPositionAt>=1500){last=value;lastPositionAt=now;send({...state,q:++motionSequence,tm:now})}}
W.onTick.push(dt=>{acc+=dt;if(acc>=.1){acc=0;publishPosition()}
 const k=1-Math.exp(-dt*18);
 peers.forEach(p=>{if(!p.av||p.first||!p.motion)return;p.av.g.visible=!policy(p).hideAvatar&&(p.world||'')===(W.customWorld||'');
  const pose=W.motion.sample(p.motion,performance.now());if(!pose)return;const g=p.av.g.position;
  g.x+=(pose.x-g.x)*k;g.z+=(pose.z-g.z)*k;g.y+=((pose.f-1)*FH+pose.y-g.y)*k;
  p.av.body.rotation.y=W.motion.angle(p.av.body.rotation.y,pose.ry,k);p.av.body.position.y=pose.s?-.32:0;p.av.sitting=!!pose.s;p.av.airborne=Math.abs(pose.vy||0)>.2;p.stale=pose.stale;
 });
});

/* ---- HUD ring (items around the avatar) ---- */
const ring=$('ring');
[['mic','🎙',()=>mic(!stream)],['👋','👋',()=>emote('👋')],['😄','😄',()=>emote('😄')],['👍','👍',()=>emote('👍')],['❤','❤️',()=>emote('❤️')]].forEach(([id,t,f])=>{const b=document.createElement('button');b.className='rb';b.textContent=t;if(id==='mic')b.id='rbMic';b.onclick=f;ring.appendChild(b)});
function emote(t){meAv.say(t);emitChat(t)}
/* ---- doors: private rooms are owner-only; knock notifies everyone ---- */
W.canToggle=r=>r.k!=='private'||IDS[r.own]===myId;
W.onDoorChange=(z,c)=>{send({t:'dr',z,c});const r=W.doors[z].room;msg('',r.n+'のドアを'+(c?'閉めました':'開けました'),'sys')};
W.onKnock=r=>{const t='🚪 '+st.name+' が '+r.n+' をノックしました';msg('',t,'sys');emitChat(t)};
/* ---- virtual terminal in the garden ---- */
W.bx(1.3,1.7,.8,13,.85,-5,0x26303c);W.bx(1,.7,.06,13,1.25,-4.58,W.mat(0x4cc9b0,{emissive:0x4cc9b0,emissiveIntensity:.7}),0,{cast:false});
{const l=W.label('仮想端末',{h:.5});l.position.set(13,2.6,-5);W.S.add(l)}W.rect(1,13,-5,1.3,.8,{y1:1.7,standable:true});
W.act(1,13,-3.6,3.4,'📟 仮想端末（チャット）',()=>{chat.classList.add('open');$('bChat').classList.add('on');setTimeout(()=>$('ci').focus(),50)});
/* ---- people / settings ---- */
const COLS=[0x4c8bf5,0x4cc9b0,0xe8955a,0xd96b8a,0x9b7be8,0xe6c04c,0x3a4654];
addEventListener('beforeunload',()=>{netStopped=true;peerGeneration++;clearInterval(scanT);clearTimeout(reconnectTimer);pending.forEach(s=>clearTimeout(s.timer));mic(false);stopVoiceTest();try{peer&&peer.destroy()}catch(e){}});
$('bChat').classList.toggle('on',chat.classList.contains('open'));
@@SAFETY@@
@@FACILITIES@@
startPeer(0);
return true;
