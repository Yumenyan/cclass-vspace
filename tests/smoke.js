const {JSDOM}=require('jsdom'),fs=require('fs'),THREE=require('three/build/three.js');
const html=fs.readFileSync('/home/claude/cc/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.com/'});
const w=dom.window;const errs=[];
w.addEventListener('error',e=>errs.push('ERR '+e.message));
class FR{constructor(){this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}}
THREE.WebGLRenderer=FR;w.THREE=THREE;
const g2={measureText:t=>({width:t.length*20}),fillRect(){},clearRect(){},beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){},fillText(){},stroke(){},strokeRect(){},createLinearGradient:()=>({addColorStop(){}}),drawImage(){}};
w.HTMLCanvasElement.prototype.getContext=()=>g2;
Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
class Peer{constructor(id){this.id=id;this.h={};setTimeout(()=>this.h.open&&this.h.open(),5)}on(e,f){this.h[e]=f}connect(id){return{peer:id,open:false,on(){},send(){}}}call(){return{on(){},close(){}}}destroy(){}reconnect(){}}
w.Peer=Peer;
const scripts=[...dom.window.document.querySelectorAll('script:not([src])')].map(s=>s.textContent);
(async()=>{
 try{ w.eval(scripts.join('\n;\n')+';window.__W=W;'); }catch(e){console.log('LOAD FAIL',e);process.exit(1)}
 await new Promise(r=>setTimeout(r,300));
 const W=w.__W;
 console.log('BD',W.BD.length,'rooms',W.rooms.length,'doors',Object.keys(W.doors).length);
 // guest
 w.document.getElementById('gs').click();
 console.log('guest gate hidden:',w.document.getElementById('gate').hidden,'hud hidden:',w.document.getElementById('hud').hidden);
 // wrong pw
 w.document.getElementById('uid').value='Hulria';w.document.getElementById('pw').value='wrongwrongwrong1';
 w.document.getElementById('lg').click();await new Promise(r=>setTimeout(r,2500));
 console.log('wrong:',w.document.getElementById('er').textContent);
 // right pw
 w.document.getElementById('gate').hidden=false;
 w.document.getElementById('uid').value='hulria';w.document.getElementById('pw').value=process.argv[2];
 w.document.getElementById('lg').click();await new Promise(r=>setTimeout(r,3500));
 console.log('member:',W.member,'err:',JSON.stringify(w.document.getElementById('er').textContent),'id:',W.id,'stat:',w.document.getElementById('stat').dataset.s);
 // exercise: elevator, door, zone
 const E=W.BD[0];W.go(E,2);await new Promise(r=>setTimeout(r,300));
 console.log('after go: floor',W.me.f,'zone',W.me.zone);
 const z=Object.keys(W.doors)[0];console.log('door ok',W.setDoor(z,true,true),W.doors[z].closed);
 // sit action, bench, move keys
 w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyW'}));await new Promise(r=>setTimeout(r,400));
 console.log('errors:',errs.length?errs:'none');
 process.exit(0);
})();
