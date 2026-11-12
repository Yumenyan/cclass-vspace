/* Shared real-world clock, solar lighting and independently selectable UI styles. */
(()=>{
const prefs=W.prefs;
prefs.uiMode=prefs.uiMode||'auto';prefs.theme=prefs.theme||'commons';prefs.font=prefs.font||'theme';delete prefs.time;
const styles={commons:{name:'コモンズ',font:'Zen Kaku Gothic New'},future:{name:'近未来',font:'Noto Sans JP'},simple:{name:'シンプル',font:'BIZ UDPGothic'},fantasy:{name:'ファンタジー',font:'Shippori Mincho'}};
const fonts=['Zen Kaku Gothic New','Noto Sans JP','BIZ UDPGothic','Zen Maru Gothic','Shippori Mincho'];
const dark=matchMedia('(prefers-color-scheme: dark)');let fontToken=0,lastFont='';
function redrawLabels(){W.S.traverse(o=>{if(o.isSprite&&o.userData.o&&typeof o.userData.text==='string')W.setLabel(o,o.userData.text)})}
W.applyTheme=()=>{
 if(!styles[prefs.theme])prefs.theme='commons';if(!['light','dark','auto'].includes(prefs.uiMode))prefs.uiMode='auto';
 const root=document.documentElement;root.dataset.theme=prefs.theme;root.dataset.mode=prefs.uiMode==='auto'?(dark.matches?'dark':'light'):prefs.uiMode;
 const font=fonts.includes(prefs.font)?prefs.font:styles[prefs.theme].font;
 root.style.setProperty('--font-ui','"'+font+'", "Yu Gothic UI", system-ui, sans-serif');window.CC_WORLD_FONT='"'+font+'", sans-serif';
 if(lastFont!==font){lastFont=font;const token=++fontToken;let link=$('theme-font');if(!link){link=document.createElement('link');link.id='theme-font';link.rel='stylesheet';link.media='print';document.head.appendChild(link)}link.onload=()=>{link.media='all';if(document.fonts)document.fonts.load('700 32px "'+font+'"').then(()=>{if(token===fontToken)redrawLabels()}).catch(()=>{})};link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(font).replace(/%20/g,'+')+':wght@'+(font==='BIZ UDPGothic'?'400;700':'400;500;700')+'&display=swap';redrawLabels()}
 W.storage.set('cc_preferences',prefs);
};dark.addEventListener?.('change',()=>W.applyTheme());W.applyTheme();
W.mountThemeSettings=b=>{
 const host=b.querySelector('#themeSettings');if(!host)return;
 host.innerHTML='<div class="section-label">APPEARANCE</div><label>明るさ<select id="uiMode" class="fld"><option value="auto">端末に合わせる</option><option value="light">ライト</option><option value="dark">ダーク</option></select></label><div class="theme-options">'+Object.entries(styles).map(([id,t])=>'<button class="theme-tile" data-ui-theme="'+id+'" aria-pressed="'+(prefs.theme===id)+'"><span class="theme-sample '+id+'">Aa <small>あいうえお</small></span><b>'+t.name+'</b></button>').join('')+'</div><label>日本語フォント<select id="uiFont" class="fld"><option value="theme">テーマに合わせる</option>'+fonts.map(f=>'<option>'+f+'</option>').join('')+'</select></label><p class="mut">Google Fontsから読み込みます。本文・操作ボタン・空間内の案内文字まで適用します。</p>';
 b.querySelector('#uiMode').value=prefs.uiMode;b.querySelector('#uiFont').value=prefs.font;
 b.querySelector('#uiMode').onchange=e=>{prefs.uiMode=e.target.value;W.applyTheme()};b.querySelector('#uiFont').onchange=e=>{prefs.font=e.target.value;W.applyTheme()};
 host.querySelectorAll('[data-ui-theme]').forEach(x=>x.onclick=()=>{prefs.theme=x.dataset.uiTheme;W.applyTheme();host.querySelectorAll('[data-ui-theme]').forEach(t=>t.setAttribute('aria-pressed',String(t===x)))});
};
// HTTP Date is the common source on Pages/local hosting; monotonic time avoids device clock changes.
let epoch=Date.now(),anchor=performance.now(),source='端末時刻（同期待ち）',syncing=false;
const timezone=(window.CC_CONFIG||{}).worldTimeZone||'Asia/Tokyo';
const timeFormat=new Intl.DateTimeFormat('ja-JP',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const fullFormat=new Intl.DateTimeFormat('ja-JP',{timeZone:timezone,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const now=()=>epoch+(performance.now()-anchor);
async function syncClock(){if(syncing)return;syncing=true;try{const start=performance.now(),url=new URL(location.href);url.searchParams.set('_clock',String(Date.now()));const response=await fetch(url.href,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(8000)});const end=performance.now(),date=Date.parse(response.headers.get('Date'));if(!response.ok||!Number.isFinite(date)||end-start>8000)throw Error('clock');epoch=date+500+(end-start)/2;anchor=end;source='配信サーバーと同期済み'}catch(_){if(source.includes('同期待ち'))source='端末時刻（通信回復時に再同期）'}finally{syncing=false;W.updateAtmosphere?.()}}
$('worldClock').querySelector('small').textContent=(timezone==='Asia/Tokyo'?'JST':timezone)+' · 共通時刻';
W.clock={now,time:()=>timeFormat.format(now()),sync:syncClock,format:()=>fullFormat.format(now()),get source(){return source},timezone};
// Pure solar palette, testable at fixed epochs without a per-user time override.
W.solarAt=timestamp=>{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(timestamp),v=k=>Number(parts.find(p=>p.type===k).value);
 const hour=v('hour')+v('minute')/60+v('second')/3600,angle=(hour-6)/24*Math.PI*2,height=Math.sin(angle);
 const day=THREE.MathUtils.smoothstep(height,-.12,.32),twilight=Math.max(0,1-Math.abs(height)/.3)*(1-Math.max(0,(height-.15)*3));
 return {hour,height,day,twilight,night:1-day,phase:height<-.12?'夜':height<.18?(hour<12?'朝焼け':'夕焼け'):'昼',sun:new THREE.Vector3(Math.cos(angle)*75,Math.max(6,height*90),-35)};
};
const skyGeometry=new THREE.SphereGeometry(320,32,20),skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color()},bottom:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3()},glow:{value:0}},vertexShader:'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vSky;uniform vec3 top;uniform vec3 bottom;uniform vec3 sunDir;uniform float glow;void main(){vec3 d=normalize(vSky);float h=smoothstep(-0.15,0.85,d.y);vec3 c=mix(bottom,top,h);float s=max(0.0,dot(d,normalize(sunDir)));c+=vec3(1.0,0.61,0.28)*pow(s,48.0)*glow;gl_FragColor=vec4(c,1.0);}'});
const sky=new THREE.Mesh(skyGeometry,skyMaterial);sky.frustumCulled=false;sky.userData.environment=true;W.S.add(sky);
const starPositions=new Float32Array(600*3);for(let i=0;i<600;i++){const a=i*2.399963,y=.1+(i/600)*.9,r=Math.sqrt(1-y*y);starPositions[i*3]=Math.cos(a)*r*270;starPositions[i*3+1]=y*270;starPositions[i*3+2]=Math.sin(a)*r*270}
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(starPositions,3)),new THREE.PointsMaterial({color:0xe3edff,size:.6,transparent:true,depthWrite:false,fog:false}));stars.userData.environment=true;W.S.add(stars);
const moon=new THREE.Mesh(new THREE.SphereGeometry(3.5,20,16),new THREE.MeshBasicMaterial({color:0xe8eddb,fog:false}));moon.userData.environment=true;W.S.add(moon);
const hemi=W.S.children.find(o=>o.isHemisphereLight),dayTop=new THREE.Color('#6c9db8'),nightTop=new THREE.Color('#08142b'),dayBottom=new THREE.Color('#dddcc8'),nightBottom=new THREE.Color('#25324d'),sunset=new THREE.Color('#cc997f');
W.updateAtmosphere=()=>{
 const solar=W.solarAt(now());W.solar=solar;W.sunOffset=solar.sun;
 skyMaterial.uniforms.top.value.copy(nightTop).lerp(dayTop,solar.day);skyMaterial.uniforms.bottom.value.copy(nightBottom).lerp(dayBottom,solar.day).lerp(sunset,solar.twilight*.65);skyMaterial.uniforms.sunDir.value.copy(solar.sun);skyMaterial.uniforms.glow.value=solar.day;const visual=W.storage.get('cc_visual_pack',{});if(visual.sky){skyMaterial.uniforms.top.value.set(visual.sky);skyMaterial.uniforms.bottom.value.set(visual.sky).lerp(new THREE.Color('#ffffff'),.35)}
 FOG.color.copy(skyMaterial.uniforms.bottom.value);S.background=FOG.color;hemi.color.setRGB(.75+.25*solar.day,.8+.2*solar.day,1);hemi.groundColor.set(solar.day>.5?0x717c5d:0x1c263c);hemi.intensity=.55+solar.day*.25;
 sun.color.set(solar.twilight>.2?0xffc291:0xfff0d5);sun.intensity=.12+solar.day*1.35;if(!W.storage.get('cc_visual_pack',{}).exposure)R.toneMappingExposure=.95;stars.material.opacity=solar.night*.85;stars.visible=solar.day<.5;moon.visible=solar.night>.15;moon.position.set(-solar.sun.x,75,95);
 if($('clockTime')){$('clockTime').textContent=timeFormat.format(now());$('clockTime').dateTime=new Date(now()).toISOString();$('clockPhase').textContent=solar.phase;$('worldClock').title=source+' · '+timezone}
 const settings=$('settingsTime');if(settings)settings.textContent=' '+fullFormat.format(now())+' / '+source;
 W.onLighting?.(solar);
};W.onTick.push(()=>{sky.position.copy(W.cam.position);stars.position.copy(W.cam.position);if(W.solar)moon.position.set(W.cam.position.x-W.solar.sun.x,W.cam.position.y+75,W.cam.position.z+95)});
W.updateAtmosphere();syncClock();
const clockTimer=setInterval(W.updateAtmosphere,1000),syncTimer=setInterval(syncClock,300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncClock()});addEventListener('beforeunload',()=>{clearInterval(clockTimer);clearInterval(syncTimer)});
})();
