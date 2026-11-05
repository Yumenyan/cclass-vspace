/* Encrypted with member.js. Speech denoising is processed locally before WebRTC. */
const voicePrefs=Object.assign({mode:'rnnoise',echo:true,agc:true,gain:1},W.storage.get('cc_voice_'+myId,{}));
if(!['rnnoise','standard','off'].includes(voicePrefs.mode))voicePrefs.mode='rnnoise';
voicePrefs.gain=Math.max(.5,Math.min(2,Number(voicePrefs.gain)||1));
let lastVoiceError='';let rnLibrary=null,rnBinary=null;const rnContexts=new WeakMap();let voiceTest=null;
const asset=name=>new URL('vendor/'+name,document.baseURI).href;
async function noiseNode(audio){
 if(!audio.audioWorklet||typeof AudioWorkletNode==='undefined'||audio.sampleRate!==48000)throw Error('unsupported');
 if(!rnLibrary)rnLibrary=import(asset('noise-suppressor.js')).catch(e=>{rnLibrary=null;throw e});
 const library=await rnLibrary;
 if(!rnBinary)rnBinary=library.loadRnnoise({url:asset('rnnoise.wasm'),simdUrl:asset('rnnoise_simd.wasm')},{signal:AbortSignal.timeout(12000)}).then(async bytes=>{await WebAssembly.compile(bytes);return bytes}).catch(e=>{rnBinary=null;throw e});
 if(!rnContexts.has(audio))rnContexts.set(audio,audio.audioWorklet.addModule(asset('rnnoise-worklet.js')).catch(e=>{rnContexts.delete(audio);throw e}));
 await rnContexts.get(audio);return new library.RnnoiseWorkletNode(audio,{maxChannels:1,wasmBinary:await rnBinary});
}
async function createVoicePipeline(options,input=null){
 const settings={...options};ctxInit();const audio=ctx,nodes=[];
 let raw=input,denoiser=null,cleaned=false;
 try{
  if(!raw)raw=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,sampleRate:48000,echoCancellation:!!settings.echo,autoGainControl:!!settings.agc,noiseSuppression:settings.mode==='standard'}});
  const source=audio.createMediaStreamSource(raw),gain=audio.createGain(),before=audio.createAnalyser(),after=audio.createAnalyser(),destination=audio.createMediaStreamDestination();before.fftSize=after.fftSize=1024;gain.gain.value=settings.gain;
  nodes.push(source,gain,before,after,destination);source.connect(before);source.connect(gain);
  const pipeline={raw,stream:destination.stream,before,after,mode:settings.mode,label:{rnnoise:'強力ノイズ除去（RNNoise）',standard:'標準ノイズ抑制',off:'ノイズ抑制OFF'}[settings.mode],fallback:false,
   cleanup(){if(cleaned)return;cleaned=true;if(denoiser){denoiser.onprocessorerror=null;try{denoiser.destroy()}catch(_){}}nodes.forEach(n=>{try{n.disconnect()}catch(_){}});for(const s of [raw,destination.stream])s.getTracks().forEach(t=>{t.onended=null;t.stop()})}
  };
  const standardFallback=async()=>{pipeline.mode='standard';pipeline.fallback=true;pipeline.label='標準ノイズ抑制（強力処理は利用不可）';try{await raw.getAudioTracks()[0]?.applyConstraints({noiseSuppression:true})}catch(_){pipeline.mode='filter';pipeline.label='基本音声フィルター（ノイズ抑制非対応）'}};
  if(settings.mode==='rnnoise'){
   const highpass=audio.createBiquadFilter(),compressor=audio.createDynamicsCompressor();highpass.type='highpass';highpass.frequency.value=75;highpass.Q.value=.7;compressor.threshold.value=-12;compressor.knee.value=15;compressor.ratio.value=3;compressor.attack.value=.003;compressor.release.value=.18;nodes.push(highpass,compressor);gain.connect(highpass);
   try{denoiser=await noiseNode(audio);nodes.push(denoiser);highpass.connect(denoiser);denoiser.connect(compressor);denoiser.onprocessorerror=()=>{if(cleaned)return;try{highpass.disconnect();denoiser.disconnect();denoiser.destroy()}catch(_){}highpass.connect(compressor);void standardFallback();W.toast('強力ノイズ除去が停止したため、標準処理へ切り替えました。')}}catch(_){await standardFallback();highpass.connect(compressor)}
   compressor.connect(after);
  }else gain.connect(after);
  after.connect(destination);return pipeline;
 }catch(e){nodes.forEach(n=>{try{n.disconnect()}catch(_){}});if(raw)raw.getTracks().forEach(t=>t.stop());if(denoiser)try{denoiser.destroy()}catch(_){}throw e}
}
function rms(analyser){if(!analyser)return 0;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((a,v)=>a+v*v,0)/data.length)}
function stopVoiceTest(){const test=voiceTest;voiceTest=null;if(!test)return;clearTimeout(test.timer);for(const recorder of test.recorders||[])if(recorder.state!=='inactive')try{recorder.stop()}catch(_){}test.pipeline?.cleanup();for(const url of test.urls||[])URL.revokeObjectURL(url)}
async function applyVoiceSettings(){W.storage.set('cc_voice_'+myId,voicePrefs);stopVoiceTest();if(stream||micPending){await mic(false);await mic(true)}}
W.voice={get lastError(){return lastVoiceError},settings:voicePrefs,createPipeline:createVoicePipeline,get pipeline(){return micPipeline},get pending(){return micPending}};
W.mountVoiceSettings=b=>{
 const host=b.querySelector('#memberPrefs');if(!host)return;
 const controls=document.createElement('div');controls.innerHTML='<div class="section-label">MICROPHONE / NOISE SUPPRESSION</div><label>ノイズ除去<select id="noiseMode" class="fld"><option value="rnnoise">強力 · 音声向け（RNNoise）</option><option value="standard">標準 · 軽量（ブラウザー）</option><option value="off">OFF · 音楽・環境音向け</option></select></label><p class="mut">強力モードはキーボード音や空調音を抑える音声向けの処理です。声や環境によって音質は変わります。使えない場合は標準処理へ切り替え、下に表示します。音が途切れる場合も標準をお試しください。</p><label class="check"><input id="echoCancel" type="checkbox">スピーカーからの音の回り込みを抑える</label><label class="check"><input id="autoGain" type="checkbox">マイクの音量を自動調整する</label><label>マイク入力音量<input id="inputGain" class="fld" type="range" min="0.5" max="2" step="0.1"></label><div class="voice-meters"><label>入力<meter id="inputMeter" min="0" max="1" value="0"></meter></label><label>処理後<meter id="outputMeter" min="0" max="1" value="0"></meter></label></div><p id="voiceStatus" class="safe-message"></p><button id="testMic" class="btn sub">マイクを5秒テスト（相手に送信しない）</button><p class="mut">VCのマイクをOFFにしてから録音できます。録音はこの端末内で比較再生するためだけに使い、パネルを閉じると破棄します。</p><div id="micRecordings"></div>';
 host.prepend(controls);b.querySelector('#noiseMode').value=voicePrefs.mode;b.querySelector('#echoCancel').checked=voicePrefs.echo;b.querySelector('#autoGain').checked=voicePrefs.agc;b.querySelector('#inputGain').value=voicePrefs.gain;
 for(const [id,key] of [['noiseMode','mode'],['echoCancel','echo'],['autoGain','agc'],['inputGain','gain']])b.querySelector('#'+id).onchange=async e=>{voicePrefs[key]=id==='noiseMode'?e.target.value:id==='inputGain'?+e.target.value:e.target.checked;await applyVoiceSettings();render()};
 function render(){if(!b.isConnected)return;const p=voiceTest?.pipeline||micPipeline;b.querySelector('#inputMeter').value=Math.min(1,rms(p?.before)*4);b.querySelector('#outputMeter').value=Math.min(1,rms(p?.after)*4);b.querySelector('#voiceStatus').textContent=micPending?'マイクを準備しています…':p?p.label+(p.fallback?' · この環境では強力処理を利用できません。':''):voiceTest?'マイクを準備しています…':'マイクはOFFです。音声は送信していません。';b.querySelector('#testMic').disabled=!!stream||micPending||!!voiceTest?.recording}
 b.querySelector('#testMic').onclick=async()=>{
  if(stream||micPending){W.toast('VCのマイクをOFFにしてからテストしてください');return}stopVoiceTest();b.querySelector('#micRecordings').replaceChildren();const test=voiceTest={recording:true,pipeline:null,recorders:[],urls:[]};render();
  try{if(typeof MediaRecorder==='undefined')throw Error('録音に非対応です');const p=await createVoicePipeline(voicePrefs);if(voiceTest!==test){p.cleanup();return}test.pipeline=p;
   const record=(source,title)=>new Promise((resolve,reject)=>{const chunks=[],recorder=new MediaRecorder(source);test.recorders.push(recorder);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=reject;recorder.onstop=()=>{if(voiceTest===test&&b.isConnected){const url=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));test.urls.push(url);const label=document.createElement('label');label.textContent=title;const audio=document.createElement('audio');audio.controls=true;audio.src=url;audio.style.width='100%';b.querySelector('#micRecordings').append(label,audio)}resolve()};recorder.start()});
   const finished=Promise.all([record(p.raw,'処理前'),record(p.stream,'処理後')]);b.querySelector('#testMic').textContent='5秒間、普段の声で話してください…';test.timer=setTimeout(()=>{test.recorders.forEach(r=>{if(r.state!=='inactive')r.stop()})},5000);await finished;if(voiceTest!==test){p.cleanup();return}p.cleanup();test.pipeline=null;test.recording=false;if(b.isConnected){b.querySelector('#testMic').textContent='もう一度テスト（5秒）';render()}
  }catch(_){if(voiceTest===test)stopVoiceTest();if(b.isConnected){b.querySelector('#testMic').textContent='マイクを5秒テスト';W.toast('テストを開始できませんでした。マイクの許可と録音への対応を確認してください。');render()}}
 };
 const timer=setInterval(render,100);W.setPopCleanup(()=>{clearInterval(timer);stopVoiceTest();b.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src')})});render();
};
