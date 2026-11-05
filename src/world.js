'use strict';
/* world.js — public layer: renderer, town + building geometry, controls, avatars.
   Everything member-only (network, voice, chat) lives in member.js. See docs/REFERENCE.md */
const $=id=>document.getElementById(id);
const FH=5,HALF=14,PR=.4;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const R=new THREE.WebGLRenderer({canvas:$('c'),antialias:true,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(window.devicePixelRatio||1,2));R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.18;
const S=new THREE.Scene();
(()=>{const c=document.createElement('canvas');c.width=2;c.height=256;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#88afb0');gr.addColorStop(.55,'#e5e7ce');gr.addColorStop(1,'#f6efda');g.fillStyle=gr;g.fillRect(0,0,2,256);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;S.background=t})();
const FOG=new THREE.Fog(0xe1e5cf,100,270);S.fog=FOG;
S.add(new THREE.HemisphereLight(0xffffff,0x9caa7c,.9));
const sun=new THREE.DirectionalLight(0xffe6b2,1.15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:170});sun.shadow.bias=-.0005;S.add(sun,sun.target);
const persp=new THREE.PerspectiveCamera(60,1,.1,400),ortho=new THREE.OrthographicCamera(-1,1,1,-1,.1,400);
let cam=persp,mode3d=true;
/* ---------- helpers ---------- */
const _m={};const mat=(c,o={})=>{const k=c+JSON.stringify(o);return _m[k]||(_m[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.82,metalness:.02},o)))};
function bx(w,h,d,x,y,z,m,p,o={}){const e=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof m==='number'?mat(m):m);e.position.set(x,y,z);e.castShadow=o.cast!==false;e.receiveShadow=o.recv!==false;(p||S).add(e);return e}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function setLabel(sp,t){const o=sp.userData.o,h=o.h||1,fs=48,F='700 '+fs+'px "Noto Sans JP",sans-serif',c=sp.userData.c||(sp.userData.c=document.createElement('canvas')),g=c.getContext('2d');
 g.font=F;const w=Math.ceil(g.measureText(t).width)+48,ch=fs+30;c.width=w;c.height=ch;g.font=F;g.fillStyle=o.bg||'rgba(248,247,235,.93)';rr(g,0,0,w,ch,ch/2);g.fill();g.fillStyle=o.fg||'#294334';g.textAlign='center';g.textBaseline='middle';g.fillText(t,w/2,ch/2+2);
 if(sp.material.map)sp.material.map.dispose();const tx=new THREE.CanvasTexture(c);tx.encoding=THREE.sRGBEncoding;sp.material.map=tx;sp.material.needsUpdate=true;sp.scale.set(h*w/ch,h,1)}
function label(t,o={}){const sp=new THREE.Sprite(new THREE.SpriteMaterial({depthTest:false,transparent:true}));sp.renderOrder=10;sp.userData.o=o;setLabel(sp,t);return sp}
function ptex(draw,rep,size){size=size||128;const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
let _s=7;const rnd=()=>(_s=(_s*16807)%2147483647)/2147483647;
const COL=[];
const rect=(f,cx,cz,w,d,o)=>{const c=Object.assign({f,x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2,on:true},o||{});COL.push(c);return c};
const ov=(c,x,z)=>x>c.x0-PR&&x<c.x1+PR&&z>c.z0-PR&&z<c.z1+PR;
function moveOK(nx,nz,ox,oz,f){if(Math.abs(nx)>118||Math.abs(nz)>118)return false;for(const c of COL)if(c.on&&c.f===f&&ov(c,nx,nz)&&!ov(c,ox,oz))return false;return true}
const ACT=[];const act=(f,x,z,r,l,fn)=>{const a={f,x,z,r,l,fn};ACT.push(a);return a};
function toast(t){const d=document.createElement('div');d.className='toast glass';d.textContent=t;$('toasts').appendChild(d);setTimeout(()=>d.remove(),3200)}
let returnFocus=null,popCleanup=null;
function pop(html,title){if(popCleanup){popCleanup();popCleanup=null}returnFocus=$('pop').hidden?document.activeElement:returnFocus;const p=$('pop');p.innerHTML='<div class="pc glass" role="dialog" aria-modal="true" aria-labelledby="popTitle"><div class="ph"><h3 id="popTitle"></h3><button class="ib" id="pcl" aria-label="閉じる"><span class="ms">close</span></button></div><div class="pb">'+html+'</div></div>';p.querySelector('h3').textContent=title||'';p.hidden=false;clearKeys();$('pcl').onclick=closePop;p.onclick=e=>{if(e.target===p)closePop()};requestAnimationFrame(()=>$('pcl')&&$('pcl').focus());return p.querySelector('.pb')}
function closePop(){if(popCleanup){popCleanup();popCleanup=null}$('pop').hidden=true;if(returnFocus&&returnFocus.isConnected)returnFocus.focus();returnFocus=null;clearKeys()}
/* ---------- town ---------- */
const pave=ptex((g,s)=>{g.fillStyle='#c9cabb';g.fillRect(0,0,s,s);g.strokeStyle='#b6baa7';g.lineWidth=2;g.strokeRect(0,0,s,s);g.strokeRect(0,0,s/2,s/2);g.strokeRect(s/2,s/2,s/2,s/2)},150);
const gnd=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({map:pave,roughness:.95}));gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;S.add(gnd);
const flat=(geo,c,y,o)=>{const m=new THREE.Mesh(geo,mat(c,o));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;S.add(m);return m};
flat(new THREE.CircleGeometry(21.5,64),0xe7deca,.02);flat(new THREE.CircleGeometry(19.5,64),0x8da777,.04);flat(new THREE.CircleGeometry(8,48),0xe4dbc6,.06);
flat(new THREE.RingGeometry(19.5,19.9,64),0xf7edda,.05);
// fountain
const fo=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.6,.7,40),mat(0xd5dbe0));fo.position.y=.35;fo.castShadow=fo.receiveShadow=true;S.add(fo);
const fw=new THREE.Mesh(new THREE.CylinderGeometry(3,3,.5,40),mat(0x5fb7e6,{emissive:0x2a7fb0,emissiveIntensity:.35,roughness:.2}));fw.position.y=.5;S.add(fw);
const fc=new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,2.4,16),mat(0xd5dbe0));fc.position.y=1.5;fc.castShadow=true;S.add(fc);
const fj=new THREE.Mesh(new THREE.SphereGeometry(.6,16,12),mat(0x8fd0f2,{emissive:0x4aa8d8,emissiveIntensity:.5,roughness:.2}));fj.position.y=2.9;S.add(fj);
rect(1,0,0,7,7);
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
function lamp(x,z){const p=mat(0x39424b);bx(.18,5.4,.18,x,2.7,z,p);bx(.9,.12,.12,x+.4,5.4,z,p,0,{cast:false});bx(.5,.14,.3,x+.8,5.3,z,mat(0xfff3c4,{emissive:0xffe9a8,emissiveIntensity:.8}),0,{cast:false})}
function tree(x,z,s){s=s||1;bx(.45*s,2.6*s,.45*s,x,1.3*s,z,0x6b4a2f);const lc=[0x3f8f4a,0x4aa055,0x358046][Math.floor(rnd()*3)];[[0,3.6,0,2.1],[.6,4.6,.3,1.5]].forEach(([a,b,c,r])=>{const e=new THREE.Mesh(new THREE.SphereGeometry(r*s,12,9),mat(lc));e.position.set(x+a*s,b*s,z+c*s);e.castShadow=true;S.add(e)});rect(1,x,z,.8,.8)}
DIRS.forEach(([dx,dz])=>{
 bx(dx?26:8,.08,dz?26:8,dx*33,.06,dz*33,0x718079,0,{cast:false});
 for(let i=0;i<6;i++){const t=23+i*4.2;bx(dx?2:.25,.09,dz?.25:2,dx*t,.1,dz*t,0xf2f2f2,0,{cast:false})}
 [26,36,44].forEach(t=>[-5.4,5.4].forEach(o=>lamp(dx*t+(dz?o:0),dz*t+(dx?o:0))));
});
for(let i=0;i<14;i++){const a=i/14*6.283+.22;if(DIRS.some(([dx,dz])=>Math.abs(Math.cos(a)*dz-Math.sin(a)*dx)<.28&&Math.cos(a)*dx+Math.sin(a)*dz>0))continue;tree(Math.cos(a)*17.5,Math.sin(a)*17.5,1+rnd()*.3)}
for(let i=0;i<16;i++){const a=rnd()*6.283,r=70+rnd()*35,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<22||Math.abs(z)<22)continue;tree(x,z,1.2+rnd()*.5)}
// benches (sittable)
const BENCH=[];
for(let i=0;i<6;i++){const a=i/6*6.283+.5+.26,x=Math.cos(a)*11.5,z=Math.sin(a)*11.5,g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=-a-Math.PI/2;S.add(g);
 bx(2.4,.12,.7,0,.5,0,0x8a6a4a,g);bx(2.4,.5,.1,0,.85,-.3,0x8a6a4a,g);bx(.12,.5,.6,-1,.25,0,0x3a424a,g);bx(.12,.5,.6,1,.25,0,0x3a424a,g);BENCH.push({x,z});}
// bulletin board
bx(8,3.4,.3,0,2.3,-14,0x222c38);bx(.3,3,.3,-3.6,1.5,-14,0x444c55);bx(.3,3,.3,3.6,1.5,-14,0x444c55);bx(7.2,2.6,.1,0,2.3,-13.82,mat(0x1b3a4b,{emissive:0x1b3a4b,emissiveIntensity:.5}),0,{cast:false});
{const l=label('掲示板 ・ イベント・ランキング',{h:.9});l.position.set(0,4.6,-13.5);S.add(l)}
rect(1,0,-14,8,.6);
act(1,0,-11.5,4.5,'📋 掲示板を見る',()=>W.showBoard?W.showBoard():pop('<b>イベント情報</b><ul>'+((window.CC_CONFIG||{}).events||[]).map(e=>'<li><b>'+esc(e.d)+'</b>　'+esc(e.t)+'</li>').join('')+'</ul><b>ランキング・統計</b><p class="mut">ログインすると、みんなの滞在時間を確認できます。</p>','掲示板'));
// skyline
for(let i=0;i<46;i++){const a=i/46*6.283+rnd()*.1,r=165+rnd()*40,w=14+rnd()*18,h=30+rnd()*85;bx(w,h,w,Math.cos(a)*r,h/2,Math.sin(a)*r,mat(0xa9bac8+Math.floor(rnd()*8)*0x020202),0,{cast:false,recv:false})}
/* ---------- buildings ---------- */
const BD=[
{id:'E',n:'東館',x:60,z:0,fl:3,door:'w',col:0x5b8def,rooms:[[2,0,'pc','PC室'],[2,1,'multi','多目的室A'],[2,2,'multi','多目的室B'],[2,3,'smash','暴室'],[3,0,'game','ゲーム部屋A'],[3,1,'game','ゲーム部屋B'],[3,2,'game','ゲーム部屋C'],[3,3,'game','ゲーム部屋D'],[3,4,'game','ゲーム部屋E']]},
{id:'W',n:'西館',x:-60,z:0,fl:2,door:'e',col:0xe8955a,rooms:[[2,0,'library','図書館'],[2,3,'count','カウント部屋']]},
{id:'S',n:'南館',x:0,z:60,fl:2,door:'n',col:0xd96b8a,rooms:[[2,0,'private','個人部屋1',0],[2,2,'private','個人部屋2',1],[2,3,'private','個人部屋3',2],[2,5,'private','個人部屋4',3]]},
{id:'N',n:'北館',x:0,z:-60,fl:2,door:'s',col:0x3fb8a0,rooms:[[2,1,'creative','クリエイティブ部屋']]}];
const TF={w:(x,z)=>[z,-x],e:(x,z)=>[-z,x],n:(x,z)=>[x,z],s:(x,z)=>[-x,-z]},SW={w:1,e:1,n:0,s:0};
const w2=(b,lx,lz)=>{const t=TF[b.door](lx,lz);return[b.x+t[0],b.z+t[1]]};
const wsz=(b,w,d)=>SW[b.door]?[d,w]:[w,d];
function lbox(b,g,f,lx,lz,w,d,h,y0,m,solid,o){const c=w2(b,lx,lz),s=wsz(b,w,d);const e=bx(s[0],h,s[1],c[0],(f-1)*FH+y0+h/2,c[1],m,g,o);if(solid!==false)e.userData.c=rect(f,c[0],c[1],s[0],s[1]);return e}
const hexs=c=>'#'+c.toString(16).padStart(6,'0');
const ZN={},ROOMS=[],doors={};
const SL=[[-9.5,-8.5,'e'],[-9.5,0,'e'],[-9.5,8.5,'e'],[9.5,-8.5,'w'],[9.5,0,'w'],[9.5,8.5,'w']];
const RC={pc:0xcfe0f3,multi:0xd9e8d2,smash:0xf0d3cd,game:0xe3d6f0,library:0xf0e6cc,count:0xf3e0c4,private:0xf3dce6,creative:0xd2eeea};
const INFO={pc:'ファイルを他のユーザーへ転送したり、GitHub上のファイルを閲覧・ダウンロードできる部屋です。',multi:'画面共有で同じ部屋の人に画面を見せられる部屋です（専用チャット付き）。',smash:'ストレス発散用の施設が集まる部屋です。',game:'内蔵ゲームで遊べる部屋です（一部は複数人対応）。',library:'自作アプリやサイトへのリンク集です（別タブで開きます）。',count:'みんなの処分カウント・風呂キャンカウントを確認できます。',private:'自由に飾ったりメモを残したりできる個人部屋です。ドアを閉めると施錠され、声も外に漏れません。',creative:'C組仮想空間に追加する空間を作成・編集する部屋です。'};
let me={x:0,z:9,f:1,ry:Math.PI,zone:'out',sit:false};
function go(b,f){const p=w2(b,0,-4.6);me.f=f;me.x=p[0];me.z=p[1];me.sit=false}
function setDoor(zone,closed,silent){const d=doors[zone];if(!d)return false;if(closed&&!silent&&me.f===d.coll.f&&ov(d.coll,me.x,me.z)){toast('通行中はドアを閉められません');return false}
 d.closed=closed;d.mesh.visible=closed;d.coll.on=closed;if(!silent&&W.onDoorChange)W.onDoorChange(zone,closed);return true}
function room(b,spec){
 const f=spec[0],s=spec[1],k=spec[2],n=spec[3],own=spec[4],sl=SL[s],lx=sl[0],lz=sl[1],g=b.G[f],base=(f-1)*FH,zone=b.id+f+'-'+s,T=.4,H=3.2,wm=mat(0xf2eddf),side=sl[2]==='e'?1:-1,wx=lx+side*4;
 lbox(b,g,f,lx,lz,8,8,.04,.02,mat(RC[k]||0xdfe6ea),false,{cast:false});
 if(s%3!==0)lbox(b,g,f,lx,lz-4,8.4,T,H,0,wm);
 if(s%3!==2)lbox(b,g,f,lx,lz+4,8.4,T,H,0,wm);
 lbox(b,g,f,wx,lz-2.75,T,2.5,H,0,wm);lbox(b,g,f,wx,lz+2.75,T,2.5,H,0,wm);
 lbox(b,g,f,wx,lz,T,3,.6,2.6,mat(b.col),false);
 const dm=lbox(b,g,f,wx,lz,.15,3,2.6,0,mat(0x2f3b48),false);dm.visible=false;
 const dp=w2(b,wx,lz),ds=wsz(b,.5,3),dc=rect(f,dp[0],dp[1],ds[0],ds[1],{on:false});
 lbox(b,g,f,lx-side*1.6,lz,1.6,1,.8,0,mat(0x8a6d4f));
 if(k==='private')lbox(b,g,f,lx-side*2.8,lz-2.2,1.8,2.2,.5,0,mat(0xf0e6ff));
 const cp=w2(b,lx,lz),sz=wsz(b,8,8),R_={b,f,s,k,n,own,zone,cx:cp[0],cz:cp[1],x0:cp[0]-sz[0]/2,x1:cp[0]+sz[0]/2,z0:cp[1]-sz[1]/2,z1:cp[1]+sz[1]/2};
 ROOMS.push(R_);ZN[zone]=n;doors[zone]={closed:false,mesh:dm,coll:dc,room:R_};
 const lb=label(n,{h:.62});lb.position.set(cp[0],base+3.7,cp[1]);g.add(lb);
 act(f,dp[0],dp[1],2.6,()=>doors[zone].closed?'🔓 ドアを開ける':'🔒 ドアを閉める',()=>{
  if(!W.member){toast('ドアの操作はメンバー専用です');return}
  if(W.canToggle&&!W.canToggle(R_)){toast('この部屋のドアは持ち主だけが操作できます');W.onKnock&&W.onKnock(R_);return}
  setDoor(zone,!doors[zone].closed)});
 act(f,cp[0],cp[1],3.4,'ℹ '+n,()=>{const h=W.roomHandlers[k];if(h)h(R_);else pop('<p>'+esc(INFO[k]||'')+'</p><p class="safe-message">ログインすると、この部屋の機能を利用できます。</p>',n)});
}
BD.forEach(b=>{
 b.G=[];for(let f=1;f<=b.fl+1;f++){const g=new THREE.Group();S.add(g);b.G[f]=g}
 b.wm=new THREE.MeshStandardMaterial({color:0xe9e5d8,roughness:.7,transparent:true});
 b.gm=new THREE.MeshStandardMaterial({color:0x729c92,roughness:.15,metalness:.4,transparent:true,opacity:.55});
 ZN[b.id+'1']=b.n+' 1F';
 for(let f=1;f<=b.fl;f++){
  const g=b.G[f],ext=(lx,lz,w,d)=>{lbox(b,g,f,lx,lz,w,d,FH-.1,0,b.wm);lbox(b,g,f,lx,lz,w+(d<1?0:.1),d+(w<1?0:.1)+.12,1.7,1.9,b.gm,false,{cast:false})};
  if(f>1){lbox(b,g,f,0,0,2*HALF+1,2*HALF+1,.3,-.15,mat(0xcfd3d7),false);ZN[b.id+f]=b.n+' '+f+'F'}else lbox(b,g,f,0,0,2*HALF,2*HALF,.12,0,mat(0xd9d2c6),false,{cast:false});
  if(f===1){ext(-8.5,-HALF,11,.6);ext(8.5,-HALF,11,.6)}else ext(0,-HALF,28.6,.6);
  ext(0,HALF,28.6,.6);ext(-HALF,0,.6,28);ext(HALF,0,.6,28);
  lbox(b,g,f,0,0,5,5,FH-.5,0,mat(0xaab3bb));lbox(b,g,f,0,-2.55,2,.1,3,0,mat(0x7f8b96),false);
  const el=label('エレベーター',{h:.5}),ep=w2(b,0,-1.5);el.position.set(ep[0],(f-1)*FH+3.9,ep[1]);g.add(el);
  const ap=w2(b,0,-4.2);
  act(f,ap[0],ap[1],3.2,'🛗 エレベーター',()=>{const bd=pop('<p class="mut">行き先の階を選んでください</p><div class="row">'+Array.from({length:b.fl},(_,i)=>'<button class="btn'+(i+1===f?' sub':'')+'" style="width:auto;min-width:72px" data-f="'+(i+1)+'">'+(i+1)+'F</button>').join('')+'</div>',b.n);bd.querySelectorAll('button[data-f]').forEach(x=>x.onclick=()=>{go(b,+x.dataset.f);closePop()})});
 }
 const rf=b.G[b.fl+1];lbox(b,rf,b.fl+1,0,0,2*HALF+1,2*HALF+1,.3,-.15,mat(0x59636e),false);
 [[0,-HALF,29,.6],[0,HALF,29,.6],[-HALF,0,.6,28],[HALF,0,.6,28]].forEach(e=>lbox(b,rf,b.fl+1,e[0],e[1],e[2],e[3],.7,.15,mat(b.col),false));
 // Timber facade rhythm and planted entrance.
 for(let f=1;f<=b.fl;f++)for(const side of [-1,1])for(const t of [-10,-5,0,5,10]){
  lbox(b,b.G[f],f,side*14.38,t,.22,.32,3.7,.55,mat(0xa38d68),false);
 }
 for(const side of [-1,1]){lbox(b,b.G[1],1,side*5.6,-16,2.2,1.2,.5,0,mat(0xb8ae93));lbox(b,b.G[1],1,side*5.6,-16,2.3,1.1,.65,.45,mat(0x688353),false)}
 // entrance + sign
 lbox(b,b.G[1],1,0,-15.4,9,3,.25,3.6,mat(b.col),false);
 const sg=label(b.n,{h:1.5,bg:hexs(b.col)+'e6'}),sp=w2(b,0,-15.4);sg.position.set(sp[0],5.1,sp[1]);S.add(sg);
 // floor 1 interior: 3 shops + kiosk
 const g1=b.G[1];
 [-8,0,8].forEach((cx,i)=>{lbox(b,g1,1,cx,10.5,7,5,.04,.02,mat(0xefe9dd),false,{cast:false});lbox(b,g1,1,cx,8.4,5,.8,1,0,mat(0xb9a98f));const tenant=((window.CC_CONFIG||{}).tenants||[]).find(t=>t.building===b.id&&t.slot===i);const l=label(tenant?tenant.name:'アトリエ '+(i+1),{h:.55}),p=w2(b,cx,12.8);l.position.set(p[0],3.2,p[1]);g1.add(l);const ap=w2(b,cx,6.8);act(1,ap[0],ap[1],2.6,'店舗を見る',()=>W.showShop?W.showShop(b.id,i):toast('ログインすると利用できます'))});
 lbox(b,g1,1,-9,-8,3.6,1.4,1.1,0,mat(0xe9c46a));lbox(b,g1,1,-9,-8,4.4,2.2,.2,2.7,mat(b.col),false);
 {const l=label('ミニショップ',{h:.5}),p=w2(b,-9,-8);l.position.set(p[0],3.5,p[1]);g1.add(l);const kp=w2(b,-9,-6);act(1,kp[0],kp[1],3,'🛍 ミニショップ',()=>W.showShop?W.showShop(b.id):toast('ログインすると利用できます'))}
 if(b.id==='N'){lbox(b,g1,1,0,13.6,4,.3,3,0,mat(0x2a2f36),false);const l=label('奥の出口 → 追加のC組仮想空間',{h:.55}),p=w2(b,0,12.6);l.position.set(p[0],3.6,p[1]);g1.add(l);act(1,p[0],p[1],3.2,'🚪 追加の空間へ',()=>W.showWorlds?W.showWorlds():toast('ログインすると利用できます'))}
 b.rooms.forEach(s=>room(b,s));
 const bp=w2(b,0,-HALF-3);
 ACT.push({f:1,x:bp[0],z:bp[1],r:6,l:'🏢 '+b.n+'の案内',fn:()=>pop('<ul>'+Array.from({length:b.fl},(_,i)=>{const f=i+1,rs=b.rooms.filter(r=>r[0]===f).map(r=>r[3]);return'<li><b>'+f+'F</b>　'+(f===1?'アトリエ・ミニショップ'+(b.id==='N'?'・奥の出口':''):esc(rs.join(' / ')))+'</li>'}).join('')+'</ul><p class="mut">各階へは建物中央のエレベーターで移動できます。</p>',b.n)});
});
BENCH.forEach(p=>act(1,p.x,p.z,2.2,()=>me.sit?'':'🪑 座る',()=>{me.x=p.x;me.z=p.z;me.ry=Math.atan2(-p.x,-p.z);me.sit=true}));
/* ---------- avatars ---------- */
const AVS=new Set();
function makeAvatar(name,color){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const torso=bx(.62,.75,.36,0,1.05,0,mat(color||0x4c8bf5),body);const legs=[-.17,.17].map(x=>bx(.23,.7,.28,x,.4,0,0x45584a,body));const arms=[-.44,.44].map(x=>bx(.19,.68,.24,x,1.04,0,mat(color||0x4c8bf5),body));
 const head=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),mat(0xf3d2b3));head.position.y=1.7;head.castShadow=true;body.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.3,16,8,0,6.283,0,1.6),mat(0x3a2f2a));hair.position.y=1.72;body.add(hair);
 const plate=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({transparent:true,side:THREE.DoubleSide}));plate.position.y=1.1;plate.rotation.order='YXZ';plate.visible=false;g.add(plate);
 const nl=label(name||'?',{h:.42});nl.position.y=2.4;g.add(nl);
 const av={g,body,plate,legs,arms,step:0,prev:new THREE.Vector3(),name:name||'?',bl:null,_t:0,
  setName(t){av.name=t;setLabel(nl,t)},
  setColor(c){torso.material=mat(c);arms.forEach(a=>a.material=mat(c))},
  setImage(url){if(!url){plate.visible=false;body.visible=true;return}new THREE.TextureLoader().load(url,t=>{t.encoding=THREE.sRGBEncoding;plate.material.map=t;plate.material.needsUpdate=true;const a=t.image.width/t.image.height;plate.scale.set(a>1?1:a,a>1?1/a:1,1);plate.visible=true;body.visible=false})},
  say(t){if(!av.bl){av.bl=label(t,{h:.5,bg:'rgba(255,255,255,.92)',fg:'#0e1621'});av.bl.position.y=2.95;g.add(av.bl)}else setLabel(av.bl,t);av.bl.visible=true;clearTimeout(av._t);av._t=setTimeout(()=>av.bl.visible=false,4500)},
  dispose(){AVS.delete(av);clearTimeout(av._t);S.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.map){o.material.map.dispose();o.material.dispose()}})}};
 AVS.add(av);S.add(g);return av;
}
const meAv=makeAvatar('ゲスト');
/* ---------- public API ---------- */
const W={$,THREE,S,FH,mat,bx,rect,label,setLabel,makeAvatar,pop,closePop,toast,act,go,setDoor,doors,rooms:ROOMS,BD,esc,
 get renderer(){return R},get colliders(){return COL},setPopCleanup(fn){popCleanup=fn},get me(){return me},get mode3d(){return mode3d},get cam(){return cam},get yaw(){return yaw},local:meAv,
 roomInfo:INFO,zoneName:z=>ZN[z]||(z==='out'?'屋外':z),onTick:[],roomHandlers:{},member:false,id:'',roomKey:'',canToggle:null,onDoorChange:null,onKnock:null,onZone:null};
/* ---------- controls ---------- */
let yaw=0,pitch=.55,camD=9,oz=1,jx=0,jy=0,cur=null,inB=null,visKey='',zone='out';const keys={};
function clearKeys(){for(const k of Object.keys(keys))delete keys[k];jx=jy=0;ptr.clear();if($('js'))$('js').firstElementChild.style.transform=''}
addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys()});
addEventListener('keydown',e=>{
 if(e.code==='Escape'){if(!$('pop').hidden)closePop();else{W.onEscape&&W.onEscape()}return}
 if(!$('pop').hidden){if(e.code==='Tab'){const items=[...$('pop').querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled&&!x.hidden);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last&&last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first&&first.focus()}}return}
 if(!$('gate').hidden||/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||''))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=1;
 if(e.repeat)return;if(e.code==='KeyE'&&cur)cur.fn();if(e.code==='KeyV')$('bMode').click();if(e.code==='KeyM')$('bExplore').click();if(e.code==='KeyH')$('bHelp').click();
});
addEventListener('keyup',e=>keys[e.code]=0);
$('act').onclick=()=>cur&&cur.fn();
const ptr=new Map();let pd=0;const cv=$('c');
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);pd=0});
cv.addEventListener('pointerup',e=>{ptr.delete(e.pointerId);pd=0});cv.addEventListener('pointercancel',e=>{ptr.delete(e.pointerId);pd=0});
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p[0],dy=e.clientY-p[1];p[0]=e.clientX;p[1]=e.clientY;
 if(ptr.size===2){const a=[...ptr.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pd){zoom(pd/d)}pd=d}else if(mode3d){yaw-=dx*.005;pitch=Math.max(.12,Math.min(1.25,pitch+dy*.004))}});
function zoom(k){if(mode3d)camD=Math.max(4,Math.min(18,camD*k));else{oz=Math.max(.5,Math.min(3,oz/k));ortho.zoom=oz;ortho.updateProjectionMatrix()}}
cv.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001))},{passive:false});
const js=$('js'),kn=js.firstElementChild;
function jm(e){const r=js.getBoundingClientRect();let x=(e.clientX-r.left-64)/52,y=(e.clientY-r.top-64)/52;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}jx=x;jy=-y;kn.style.transform='translate('+x*42+'px,'+y*42+'px)'}
js.onpointerdown=e=>{js.setPointerCapture(e.pointerId);jm(e)};js.onpointermove=e=>{if(e.buttons||e.pressure>0)jm(e)};js.onpointerup=js.onpointercancel=()=>{jx=jy=0;kn.style.transform=''};
$('bMode').onclick=()=>{mode3d=!mode3d;$('bMode').firstChild.textContent=mode3d?'map':'view_in_ar';S.fog=mode3d?FOG:null;$('bMode').classList.toggle('on',!mode3d);$('bMode').title=mode3d?'上空視点に切り替え（V）':'3D視点に切り替え（V）'};
function resize(){R.setSize(innerWidth,innerHeight);const a=innerWidth/innerHeight;persp.aspect=a;persp.updateProjectionMatrix();const s=26;ortho.left=-s*a;ortho.right=s*a;ortho.top=s;ortho.bottom=-s;ortho.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
function applyVis(){if(W.customWorld)return;BD.forEach(b=>{const inside=b===inB;b.G.forEach((g,f)=>{g.visible=!inside||f<=me.f});b.wm.opacity=inside?.25:1;b.gm.opacity=inside?.1:.55})}
function zoneAt(){if(W.customWorld)return W.customWorld;if(!inB)return'out';const r=ROOMS.find(r=>r.b===inB&&r.f===me.f&&me.x>r.x0&&me.x<r.x1&&me.z>r.z0&&me.z<r.z1);return r?r.zone:inB.id+me.f}
const clk=new THREE.Clock();
function tick(){
 requestAnimationFrame(tick);
 const dt=Math.min(clk.getDelta(),.1),typing=!$('pop').hidden||!$('gate').hidden||document.hidden||/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'');
 let ix=typing?0:jx,iy=typing?0:jy;if(!typing){ix+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);iy+=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)}
 const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l}
 if(!$('gate').hidden)yaw+=dt*.07;
 if(l>.08){me.sit=false;const y=mode3d?yaw:0,sn=Math.sin(y),cs=Math.cos(y),sp=((keys.ShiftLeft||keys.ShiftRight)?10:6)*dt,dx=(ix*cs-iy*sn)*sp,dz=(-ix*sn-iy*cs)*sp;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<steps;i++){if(moveOK(me.x+dx/steps,me.z,me.x,me.z,me.f))me.x+=dx/steps;if(moveOK(me.x,me.z+dz/steps,me.x,me.z,me.f))me.z+=dz/steps;}me.ry=Math.atan2(dx,dz)}
 const nb=W.customWorld?null:BD.find(b=>Math.abs(me.x-b.x)<HALF+.3&&Math.abs(me.z-b.z)<HALF+.3)||null;if(!nb&&me.f!==1)me.f=1;inB=nb;
 const vk=(inB?inB.id:'')+me.f;if(vk!==visKey){visKey=vk;applyVis()}
 const zn=zoneAt();if(zn!==zone){zone=zn;me.zone=zn;$('locn').textContent=zn==='out'?(Math.hypot(me.x,me.z)<21?'中央庭園':'通り'):(W.customWorld?W.customWorldName:ZN[zn]||zn);W.onZone&&W.onZone(zn)}
 else if(zn==='out'){const t=Math.hypot(me.x,me.z)<21?'中央庭園':'通り';if($('locn').textContent!==t)$('locn').textContent=t}
 me.zone=zone;
 const py=(me.f-1)*FH;meAv.g.position.set(me.x,py,me.z);meAv.body.rotation.y=me.ry;meAv.body.position.y=me.sit?-.32:0;
 if(mode3d){cam=persp;cam.up.set(0,1,0);const hd=camD*Math.cos(pitch);cam.position.set(me.x+Math.sin(yaw)*hd,py+1.5+camD*Math.sin(pitch),me.z+Math.cos(yaw)*hd);if(inB){cam.position.y=Math.min(cam.position.y,py+FH-.5)}const target=new THREE.Vector3(me.x,py+1.3,me.z),dir=cam.position.clone().sub(target),len=dir.length();dir.normalize();const ray=new THREE.Ray(target,dir);let near=len;for(const c of COL){if(!c.on||c.f!==me.f||ov(c,me.x,me.z))continue;const box=new THREE.Box3(new THREE.Vector3(c.x0-.15,py,c.z0-.15),new THREE.Vector3(c.x1+.15,py+3.5,c.z1+.15)),hit=new THREE.Vector3();if(ray.intersectBox(box,hit))near=Math.min(near,Math.max(.7,hit.distanceTo(target)-.2))}cam.position.copy(target).addScaledVector(dir,near);cam.lookAt(me.x,py+1.3,me.z)}
 else{cam=ortho;cam.up.set(0,0,-1);cam.position.set(me.x,py+80,me.z);cam.lookAt(me.x,py,me.z)}
 sun.position.set(me.x+32,py+62,me.z+22);sun.target.position.set(me.x,py,me.z);
 AVS.forEach(a=>{a.plate.rotation.set(mode3d?0:-Math.PI/2,mode3d?yaw:0,0);const speed=a.g.position.distanceTo(a.prev)/Math.max(dt,.001);a.step+=dt*Math.min(speed,8)*2.1;a.legs.forEach((leg,i)=>leg.rotation.x=speed>.1?Math.sin(a.step+i*Math.PI)*.42:0);a.arms.forEach((arm,i)=>arm.rotation.x=speed>.1?-Math.sin(a.step+i*Math.PI)*.35:0);a.prev.copy(a.g.position)});
 let best=null,bd=1e9;for(const a of ACT){if(W.customWorld||a.f!==me.f)continue;const d=Math.hypot(me.x-a.x,me.z-a.z);if(d<a.r&&d<bd){const t=typeof a.l==='function'?a.l():a.l;if(t){best=a;bd=d;a.t=t}}}
 cur=best;const ab=$('act');if(best){if(ab.hidden)ab.hidden=false;if($('actl').textContent!==best.t)$('actl').textContent=best.t}else if(!ab.hidden)ab.hidden=true;
 fj.position.y=2.9+Math.sin(performance.now()/700)*.08;
 for(let i=0;i<W.onTick.length;i++)W.onTick[i](dt);
 R.render(S,cam);
}
tick();
