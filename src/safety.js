/* Member safety preferences survive reconnects by account ID, never by ephemeral Peer ID. */
const safetyKey='cc_safety_'+myId,savedSafety=W.storage.get(safetyKey,{}),safetyPrefs=savedSafety&&typeof savedSafety==='object'&&!Array.isArray(savedSafety)?savedSafety:{},roomRestrictions=new Map();
const defaultPolicy=()=>({volume:1,chat:'all',hideAvatar:false,entry:false,avoidRooms:false});
function policy(who){const id=typeof who==='string'?(peers.get(who)?.id||who):who?.id;return {...defaultPolicy(),...(safetyPrefs[id]||{})}}
function normalizePolicy(value){return {volume:Math.max(0,Math.min(1,Number.isFinite(+value.volume)?+value.volume:1)),chat:['all','log','none'].includes(value.chat)?value.chat:'all',hideAvatar:!!value.hideAvatar,entry:!!value.entry,avoidRooms:!!value.avoidRooms,name:String(value.name||'').slice(0,32)}}
for(const id of Object.keys(safetyPrefs)){if(!IDS.includes(id)||id===myId)delete safetyPrefs[id];else safetyPrefs[id]=normalizePolicy(safetyPrefs[id])}
function deniedEntries(){return Object.keys(safetyPrefs).filter(id=>safetyPrefs[id].entry)}
function receiveRestrictions(owner,ids){if(Array.isArray(ids))roomRestrictions.set(owner,new Set(ids.filter(id=>typeof id==='string'&&IDS.includes(id)).slice(0,IDS.length)))}
W.canEnterRoom=r=>{
 const owner=r.k==='private'?IDS[r.own]:null;if(owner===myId)return true;
 if(owner&&roomRestrictions.get(owner)?.has(myId))return false;
 return ![...peers.values()].some(p=>p.av&&p.zn===r.zone&&policy(p).avoidRooms);
};
let lastSafetyNotice=0;
function enforceSafety(){
 log.querySelectorAll('[data-author]').forEach(node=>node.hidden=policy(node.dataset.author).chat==='none');
 peers.forEach(p=>{if(p.av){p.av.g.visible=!policy(p).hideAvatar&&(p.world||'')===(W.customWorld||'');if(policy(p).chat!=='all'&&p.av.bl)p.av.bl.visible=false}});
 const room=W.rooms.find(r=>r.zone===W.me.zone);if(room&&!W.canEnterRoom(room)){W.go(room.b,room.f);W.closePop();if(performance.now()-lastSafetyNotice>1500){lastSafetyNotice=performance.now();W.toast('入室制限の設定に合わせて廊下へ戻りました。')}}
}
function setPolicy(id,value){if(!IDS.includes(id)||id===myId)return;const previous=policy(id);safetyPrefs[id]=normalizePolicy({...previous,...value});W.storage.set(safetyKey,safetyPrefs);send(hello());W.onSafetyChanged?.(id);enforceSafety();W.sfx?.play('success','ui')}
function clearPolicy(id){delete safetyPrefs[id];W.storage.set(safetyKey,safetyPrefs);send(hello());enforceSafety()}
W.safety={get:policy,set:setPolicy,clear:clearPolicy,receiveRestrictions,canEnter:W.canEnterRoom};
let safetyTick=0;W.onTick.push(dt=>{safetyTick+=dt;if(safetyTick>.2){safetyTick=0;enforceSafety()}});
W.showPeople=()=>{
 const current=[...peers.values()].filter(p=>p.av),ids=[...new Set([...current.map(p=>p.id),...Object.keys(safetyPrefs)])].filter(id=>id&&id!==myId);
 const b=W.pop('<p class="mut">オンライン '+(current.length+1)+'人。音量・チャット・アバターは自分の端末での受信設定です。個人部屋への入室拒否は相手のアプリにも共有します。</p><div class="pl"><b>'+W.esc(st.name)+'（あなた）</b><span class="mut">'+W.esc(W.zoneName(W.me.zone))+'</span></div>'+ids.map((id,i)=>{const p=current.find(p=>p.id===id),settings=policy(id),name=p?.name||settings.name||id;return '<section class="file-row safety-card"><div class="pl"><b>'+W.esc(name)+'</b><span class="mut">'+(p?W.esc(W.zoneName(p.zn)):'オフライン・保存済み')+'</span></div><div class="safety-grid"><label>相手の音声の音量 <output id="policyVolume'+i+'">'+Math.round(settings.volume*100)+'%</output><input id="policyVolumeInput'+i+'" class="fld" data-person="'+i+'" data-policy="volume" type="range" min="0" max="1" step="0.05" value="'+settings.volume+'"></label><label>受信するチャット・リアクション<select class="fld" data-person="'+i+'" data-policy="chat"><option value="all" '+(settings.chat==='all'?'selected':'')+'>通常どおり表示</option><option value="log" '+(settings.chat==='log'?'selected':'')+'>ログのみ・吹き出しを隠す</option><option value="none" '+(settings.chat==='none'?'selected':'')+'>受け取らない（共有・受信依頼も拒否）</option></select></label></div>'+[['hideAvatar','アバターと頭上の名前を隠す'],['entry','自分の個人部屋への入室を拒否する'],['avoidRooms','相手がいる部屋を避ける（必要な場合は自分が退室）']].map(([key,text])=>'<label class="check"><input type="checkbox" data-person="'+i+'" data-policy="'+key+'" '+(settings[key]?'checked':'')+'>'+text+'</label>').join('')+'<div class="row"><button class="btn danger" data-block-all="'+i+'">すべて制限する</button><button class="btn sub" data-reset-person="'+i+'">この相手の制限を解除</button></div></section>'}).join('')+'<label class="check"><input type="checkbox" id="deafen">全員の音声を一時的に消す</label><button class="btn sub" id="unblock">保存した制限をすべて解除</button><p class="mut">入室制限は自分の個人部屋が対象です。共有の部屋から相手を追放する機能ではありません。サーバーを使わないため、入室拒否は通常のアプリ同士で設定を守る方式です。</p>','メンバーとブロック設定');
 b.querySelector('#deafen').checked=deafen;b.querySelector('#deafen').onchange=e=>deafen=e.target.checked;
 b.querySelectorAll('[data-policy]').forEach(el=>el.onchange=()=>{const id=ids[+el.dataset.person],key=el.dataset.policy,value=key==='volume'?+el.value:key==='chat'?el.value:el.checked;setPolicy(id,{[key]:value,name:current.find(p=>p.id===id)?.name||policy(id).name});if(key==='volume')b.querySelector('#policyVolume'+el.dataset.person).value=Math.round(value*100)+'%'});
 b.querySelectorAll('[data-block-all]').forEach(el=>el.onclick=()=>{const id=ids[+el.dataset.blockAll];setPolicy(id,{volume:0,chat:'none',hideAvatar:true,entry:true,avoidRooms:true,name:current.find(p=>p.id===id)?.name||id});W.showPeople()});
 b.querySelectorAll('[data-reset-person]').forEach(el=>el.onclick=()=>{clearPolicy(ids[+el.dataset.resetPerson]);W.showPeople()});
 b.querySelector('#unblock').onclick=()=>{for(const id of Object.keys(safetyPrefs))delete safetyPrefs[id];W.storage.set(safetyKey,safetyPrefs);send(hello());enforceSafety();W.showPeople()};
};
