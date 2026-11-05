/* Small synthesized interface sounds. No downloads, autoplay, or ambient-music dependency. */
(()=>{
const prefs=W.prefs;for(const key of ['sfx','sfxUI','sfxGames','sfxWorld'])if(prefs[key]===undefined)prefs[key]=true;if(prefs.sfxVolume===undefined)prefs.sfxVolume=.25;
let audio=null,master=null;const last=new Map();
function init(){if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;audio=new C();master=audio.createGain();master.connect(audio.destination)}if(audio.state==='suspended')audio.resume();return true}
function tone(frequency,start,duration,volume=.16,end=frequency,type='sine'){const oscillator=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime+start;oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,end),time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.006);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);oscillator.connect(gain);gain.connect(master);oscillator.start(time);oscillator.stop(time+duration+.01);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}}
function play(name='tap',category='ui'){
 if(!prefs.sfx||category==='ui'&&!prefs.sfxUI||category==='game'&&!prefs.sfxGames||category==='world'&&!prefs.sfxWorld||!init())return;
 const now=performance.now(),previous=last.get(category)||-1000;if(now-previous<(name==='tap'?40:90))return;last.set(category,now);master.gain.setTargetAtTime(Math.max(0,Math.min(1,prefs.sfxVolume)),audio.currentTime,.015);
 if(name==='success'){[523.25,659.25,783.99].forEach((f,i)=>tone(f,i*.045,.16,.13))}
 else if(name==='win'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,i*.075,.25,.14));tone(261.63,0,.38,.08)}
 else if(name==='error'){tone(220,0,.11,.12,170);tone(170,.1,.12,.09,145)}
 else if(name==='impact'){tone(135,0,.11,.28,45,'triangle');tone(630,0,.035,.08,180)}
 else if(name==='jump'){tone(200,0,.09,.1,430)}
 else if(name==='roll'){[480,630,770].forEach((f,i)=>tone(f,i*.06,.045,.08,f*.7,'triangle'))}
 else if(name==='notify'){tone(660,0,.13,.1);tone(880,.07,.14,.08)}
 else if(name==='ready'){tone(880,0,.16,.15);tone(1320,.02,.14,.04)}
 else {tone(640,0,.045,.1,440);tone(1240,0,.025,.025,950)}
}
W.sfx={play,get context(){return audio}};W.effect=()=>play('impact','game');
document.addEventListener('click',event=>{const button=event.target.closest?.('button');if(button&&!button.disabled&&event.isTrusted)play('tap','ui')});
document.addEventListener('change',event=>{if(event.isTrusted&&event.target.matches?.('select,input[type=checkbox]'))play('tap','ui')});
W.mountSoundSettings=b=>{
 const host=b.querySelector('#soundSettings');if(!host)return;host.innerHTML='<div class="section-label">SOUND EFFECTS</div><label class="check"><input id="sfxEnabled" type="checkbox">操作音・効果音</label><div class="row">'+[['sfxUI','操作音'],['sfxGames','ゲーム音'],['sfxWorld','移動・交流音']].map(([key,label])=>'<label class="check"><input type="checkbox" data-sfx="'+key+'">'+label+'</label>').join('')+'</div><label>効果音の音量<input id="sfxVolume" class="fld" type="range" min="0" max="1" step="0.05"></label><button class="btn sub" id="previewSfx">効果音を試す</button>';
 b.querySelector('#sfxEnabled').checked=prefs.sfx;b.querySelector('#sfxEnabled').onchange=e=>{prefs.sfx=e.target.checked;W.storage.set('cc_preferences',prefs)};b.querySelector('#sfxVolume').value=prefs.sfxVolume;b.querySelector('#sfxVolume').oninput=e=>{prefs.sfxVolume=+e.target.value;W.storage.set('cc_preferences',prefs);if(master)master.gain.setTargetAtTime(prefs.sfxVolume,audio.currentTime,.03)};
 host.querySelectorAll('[data-sfx]').forEach(el=>{el.checked=prefs[el.dataset.sfx];el.onchange=()=>{prefs[el.dataset.sfx]=el.checked;W.storage.set('cc_preferences',prefs)}});b.querySelector('#previewSfx').onclick=()=>play('success','preview');
};addEventListener('beforeunload',()=>{if(audio)audio.close()});
})();
