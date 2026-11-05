const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),THREE=require('three'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const accounts=JSON.parse(fs.readFileSync(path.join(root,'tools/accounts.json'))),secrets=JSON.parse(fs.readFileSync(path.join(root,'tools/secrets.local.json')));
const registry=new Map(),errors=[];
class Emitter{constructor(){this.h={}}on(e,fn){(this.h[e]??=[]).push(fn);return this}emit(e,...a){for(const fn of this.h[e]||[])fn(...a)}}
class Connection extends Emitter{constructor(peer){super();this.peer=peer;this.open=false;this.bufferSize=0}send(d){if(this.open)queueMicrotask(()=>this.remote.emit('data',structuredClone(d)))}close(){if(!this.open)return;this.open=false;this.remote.open=false;this.emit('close');this.remote.emit('close')}}
class Peer extends Emitter{constructor(id){super();this.id=id;this.destroyed=false;setTimeout(()=>{if(registry.has(id))this.emit('error',{type:'unavailable-id'});else{registry.set(id,this);this.emit('open',id)}},5)}connect(id){const c=new Connection(id);setTimeout(()=>{const dest=registry.get(id);if(!dest){this.emit('error',{type:'peer-unavailable',message:'Could not connect to peer '+id});return}const other=new Connection(this.id);c.remote=other;other.remote=c;dest.emit('connection',other);c.open=other.open=true;c.emit('open');other.emit('open')},10);return c}call(){return new Emitter()}destroy(){this.destroyed=true;if(registry.get(this.id)===this)registry.delete(this.id)}reconnect(){this.emit('open',this.id)}}
class Renderer{constructor(){this.shadowMap={};this.info={}}setPixelRatio(){}setSize(){}render(){}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(id){
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.com/'}),w=dom.window;
 w.addEventListener('error',e=>errors.push(e.error||e.message));w.THREE={...THREE,WebGLRenderer:Renderer};w.Peer=Peer;w.matchMedia=()=>({matches:false});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;w.AbortSignal=AbortSignal;w.ArrayBuffer=ArrayBuffer;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
 Object.defineProperty(w,'crypto',{value:webcrypto});w.fetch=async url=>{if(String(url).includes('docs.google.com'))throw Error('offline');let file=String(url).replace('https://example.com/','');if(!/^(data|worlds)\//.test(file))throw Error('offline');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
 const context=new Proxy({measureText:t=>({width:String(t).length*24}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});w.HTMLCanvasElement.prototype.getContext=()=>context;
 const scripts=[...w.document.querySelectorAll('script:not([src])')].map(s=>s.textContent);w.eval(scripts.join('\n;\n')+';window.__W=W;');
 const W=w.__W;assert.equal(W.rooms.length,16);assert.equal(W.BD.length,4);
 w.document.getElementById('gs').click();assert.equal(w.document.getElementById('gate').hidden,true);
 w.document.getElementById('bExplore').click();assert.ok(w.document.querySelectorAll('[data-room]').length>=4);W.closePop();
 if(id){w.document.getElementById('uid').value=id;w.document.getElementById('pw').value=secrets.passwords[id];w.document.getElementById('lg').click();for(let i=0;i<100&&!W.member;i++)await sleep(50);assert.equal(W.member,true,w.document.getElementById('er').textContent)}
 return {w,W,dom};
}
(async()=>{const a=await boot(accounts[0]),b=await boot(accounts[1]);await sleep(5200);const {w,W}=a,$=id=>w.document.getElementById(id);
 assert.equal(W.memberAPI.peers.size,1);assert.equal(b.W.memberAPI.peers.size,1);
 const room=kind=>W.rooms.find(r=>r.k===kind);
 W.navigate();await sleep(50);W.pop('<input id="testFocus">','test');const x=W.me.x,z=W.me.z;w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyW'}));await sleep(120);assert.equal(W.me.x,x);assert.equal(W.me.z,z);W.closePop();
 for(const kind of ['pc','multi','smash','library','count','private','creative']){W.navigate(room(kind));await sleep(50);W.roomHandlers[kind](room(kind));await sleep(70);assert.equal($('pop').hidden,false,kind);assert.ok($('pop').querySelector('.pb').textContent.length>5);W.closePop()}
 W.roomHandlers.private(room('private'));$('privateNote').value='A note <script>';$('saveRoom').click();assert.ok(w.localStorage.getItem('cc_private_'+accounts[0]+'_'+room('private').zone).includes('A note'));W.closePop();
 W.roomHandlers.library(room('library'));$('bookmarkName').value='unsafe';$('bookmarkURL').value='javascript:alert(1)';$('addBookmark').click();assert.equal(JSON.parse(w.localStorage.getItem('cc_bookmarks_'+accounts[0])||'[]').length,0);W.closePop();
 W.roomHandlers.creative(room('creative'));$('newObject').click();assert.equal($('objectList').options.length,1);$('saveDraft').click();assert.equal(JSON.parse(w.localStorage.getItem('cc_world_'+accounts[0])).objects.length,1);$('testWorld').click();assert.ok(W.customWorld);await sleep(40);assert.equal(W.me.zone,W.customWorld);W.leaveCustomWorld();await sleep(40);assert.equal(W.me.zone,'out');assert.throws(()=>W.memberAPI.validateWorld({objects:[{type:'script'}]}));
 const csv=W.memberAPI.parseCSV('name,count\n"a,b",2\n"a""c",3');assert.equal(csv[1][0],'a,b');assert.equal(csv[2][0],'a"c');
 for(const r of W.rooms.filter(r=>r.k==='game')){W.navigate(r);await sleep(40);W.roomHandlers.game(r);assert.ok($('gameBody'));if(r.n.endsWith('C')){$('reaction').click();$('reaction').click();assert.match($('reaction').textContent,/早すぎ/)}if(r.n.endsWith('D')){$('pop').querySelector('[data-memory]').click()}if(r.n.endsWith('E')){$('rollDice').click();assert.ok($('diceValue').textContent)}W.closePop()}
 const g=room('game');W.navigate(g);b.W.navigate(b.W.rooms.find(r=>r.zone===g.zone));for(let i=0;i<40&&([...W.memberAPI.peers.values()][0].zn!==g.zone||[...b.W.memberAPI.peers.values()][0].zn!==g.zone);i++)await sleep(50);W.roomHandlers.game(g);b.W.roomHandlers.game(b.W.rooms.find(r=>r.zone===g.zone));await sleep(80);a.w.document.querySelector('[data-cell="0"]').click();await sleep(80);assert.equal(a.w.document.querySelector('[data-cell="0"]').textContent,'○');assert.equal(b.w.document.querySelector('[data-cell="0"]').textContent,'○');
 W.closePop();b.W.closePop();$('chatScope').value='room';$('ci').value='hello room';$('cs').click();await sleep(40);assert.ok(b.w.document.getElementById('log').textContent.includes('hello room'));
 // Replayed packets render once; distinct IDs preserve intentional repeated text.
 const packet={t:'c',m:'dedup regression',mid:'regression-1'};W.memberAPI.send(packet);W.memberAPI.send(packet);await sleep(50);assert.equal([...b.w.document.querySelectorAll('#log .m span')].filter(e=>e.textContent===packet.m).length,1);W.memberAPI.send({...packet,mid:'regression-2'});await sleep(50);assert.equal([...b.w.document.querySelectorAll('#log .m span')].filter(e=>e.textContent===packet.m).length,2);
 $('ci').value='IME regression';$('ci').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));assert.equal($('ci').value,'IME regression');$('ci').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true}));assert.equal($('ci').value,'IME regression');$('ci').value='';
 b.W.navigate();await sleep(180);$('ci').value='room secret';$('cs').click();await sleep(40);assert.ok(!b.w.document.getElementById('log').textContent.includes('room secret'));
 const remote=[...W.memberAPI.peers.values()][0],priv=W.rooms.find(r=>r.k==='private'&&r.own===0);W.memberAPI.onData(remote.pid,remote.conn,{t:'dr',z:priv.zone,c:true});assert.equal(W.doors[priv.zone].closed,false);const old=remote.tx;W.memberAPI.onData(remote.pid,remote.conn,{t:'p',x:NaN,z:0,f:1,ry:0,zn:'out'});assert.equal(remote.tx,old);
 W.showWorlds();await sleep(80);assert.ok($('pop').querySelector('[data-world]'));W.closePop();$('bSet').click();assert.ok($('profileSave'));W.closePop();$('bPeople').click();assert.ok($('deafen'));W.closePop();
 // Individually scoped safety controls persist and room-entry rules propagate to the owner.
 W.safety.set(accounts[1],{volume:.25,chat:'none',hideAvatar:true,entry:true});await sleep(250);
 assert.equal(W.safety.get(accounts[1]).volume,.25);assert.equal([...W.memberAPI.peers.values()][0].av.g.visible,false);
 const logBefore=$('log').textContent;b.W.memberAPI.send({t:'c',m:'blocked message'});await sleep(60);assert.equal($('log').textContent,logBefore);
 const own=W.rooms.find(r=>r.k==='private'&&r.own===0),blockedDestination=b.W.rooms.find(r=>r.zone===own.zone);assert.equal(b.W.canEnterRoom(blockedDestination),false);b.W.navigate(blockedDestination);await sleep(60);assert.notEqual(b.W.me.zone,own.zone);
 W.safety.set(accounts[1],{volume:1,chat:'log',hideAvatar:false,entry:false});await sleep(250);assert.equal(b.W.canEnterRoom(blockedDestination),true);b.W.memberAPI.send({t:'c',m:'log only'});await sleep(60);assert.ok($('log').textContent.includes('log only'));
 W.safety.clear(accounts[1]);assert.equal(W.safety.get(accounts[1]).chat,'all');
 $('bSet').click();assert.equal($('headBob').checked,true);$('showBuildingNames').click();assert.ok(W.BD.every(b=>!b.nameLabel.visible));$('showBuildingNames').click();assert.ok(W.BD.every(b=>b.nameLabel.visible));assert.ok($('noiseMode'));assert.ok($('sfxEnabled'));W.closePop();
 assert.ok(W.BD.every(b=>b.wm.opacity===1&&!b.wm.transparent));
 assert.deepEqual(errors,[]);a.dom.window.close();b.dom.window.close();console.log('PASS: two-member auth/mesh, all 16 rooms, games, scoped chat, privacy, editor, persistence, offline fallbacks and input lifecycle.');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});

