/* Deterministic movement primitives, shared by runtime and regression tests. */
const CC_MOTION=(()=>{
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
 function vertical(state,dt,surfaces=[],ceiling=Infinity){
  const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
  for(let i=0;i<steps;i++){
   const before=state.y;state.vy-=18*h;state.y+=state.vy*h;
   if(state.y>ceiling){state.y=ceiling;state.vy=Math.min(0,state.vy)}
   const top=surfaces.filter(y=>y<=before+.06&&state.y<=y&&state.vy<=0).sort((a,b)=>b-a)[0];
   if(top!==undefined){state.y=top;state.vy=0;state.grounded=true}else state.grounded=false;
  }return state;
 }
 function remote(){return {frames:[],offset:null,jitter:0,delay:110,lastSeq:-1,lastArrival:0,teleported:false}}
 function push(buffer,p,now){
  const seq=Number.isFinite(p.q)?p.q:buffer.lastSeq+1;if(seq<=buffer.lastSeq)return false;
  const sender=Number.isFinite(p.tm)?p.tm:now,previous=buffer.frames.at(-1);
  const teleport=previous&&(previous.f!==p.f||previous.world!==(p.world||'')||Math.hypot(previous.x-p.x,previous.z-p.z)>14);
  if(teleport){buffer.frames=[];buffer.offset=null;buffer.jitter=0;buffer.teleported=true}
  if(buffer.offset===null)buffer.offset=now-sender;
  else buffer.offset=Math.min(buffer.offset,now-sender);
  if(previous&&!teleport){const gap=Math.abs((now-buffer.lastArrival)-(sender-previous.sender));buffer.jitter=buffer.jitter*.85+Math.min(500,gap)*.15}
  buffer.delay=clamp(110+buffer.jitter*2,110,350);
  buffer.frames.push({...p,y:p.y||0,world:p.world||'',sender,t:sender+buffer.offset});
  buffer.frames=buffer.frames.slice(-32);buffer.lastSeq=seq;buffer.lastArrival=now;return true;
 }
 function sample(buffer,now){
  const frames=buffer.frames;if(!frames.length)return null;
  const t=now-buffer.delay;let a=frames[0],b=null;
  for(let i=1;i<frames.length;i++){if(frames[i].t>=t){b=frames[i];break}a=frames[i]}
  if(b){const u=clamp((t-a.t)/Math.max(1,b.t-a.t),0,1);return {...b,x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,y:a.y+(b.y-a.y)*u,ry:angle(a.ry,b.ry,u),stale:false}}
  const latest=frames.at(-1),previous=frames.at(-2)||latest,dt=Math.max(.016,(latest.t-previous.t)/1000);
  const vx=clamp(Number.isFinite(latest.vx)?latest.vx:(latest.x-previous.x)/dt,-11,11),vz=clamp(Number.isFinite(latest.vz)?latest.vz:(latest.z-previous.z)/dt,-11,11);
  const horizon=clamp((t-latest.t)/1000,0,.25),stale=now-buffer.lastArrival>1200;
  return {...latest,x:latest.x+vx*horizon,z:latest.z+vz*horizon,y:latest.g?latest.y:Math.max(0,latest.y+clamp(latest.vy||0,-8,8)*horizon-9*horizon*horizon*(latest.y>0?1:0)),stale};
 }
 return {vertical,remote,push,sample,angle};
})();
