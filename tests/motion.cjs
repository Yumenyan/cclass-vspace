const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const motion=vm.runInNewContext(fs.readFileSync('src/motion.js','utf8')+';CC_MOTION');
function flight(fps){const state={y:0,vy:6.2,grounded:false};let peak=0;for(let i=0;i<fps*2;i++){motion.vertical(state,1/fps,[0],3.1);peak=Math.max(peak,state.y)}assert.equal(state.grounded,true);assert.equal(state.y,0);return peak}
assert.ok(Math.abs(flight(30)-flight(120))<.015);assert.ok(flight(60)>1);
const raised={y:1.3,vy:-1,grounded:false};for(let i=0;i<60;i++)motion.vertical(raised,1/60,[0,.7],3.1);assert.equal(raised.y,.7);
const ceiling={y:2.8,vy:6.2,grounded:false};motion.vertical(ceiling,.1,[0],3.1);assert.ok(ceiling.y<=3.1);assert.ok(ceiling.vy<=0);
const b=motion.remote();const p=(x,q,tm,extra={})=>({x,z:0,y:0,ry:0,f:1,world:'',q,tm,vx:6,vz:0,...extra});
motion.push(b,p(0,0,0),50);motion.push(b,p(.6,1,100),160);motion.push(b,p(1.2,2,200),450);
assert.ok(b.delay>110);assert.equal(motion.push(b,p(.1,1,100),460),false,'old packets must not rewind');
const a=motion.sample(b,500),c=motion.sample(b,600);assert.ok(c.x>=a.x);assert.ok(c.x<=2.7);
const frozen=motion.sample(b,3000);assert.ok(frozen.stale);assert.equal(frozen.x,motion.sample(b,6000).x,'prediction must stop after 250ms');
const edge=motion.remote();motion.push(edge,p(0,1,0,{ry:Math.PI-.05}),0);motion.push(edge,p(.6,2,100,{ry:-Math.PI+.05}),100);const angle=motion.sample(edge,160).ry;assert.ok(Math.abs(angle)>3,'angles wrap along the short arc');
motion.push(b,p(60,3,300,{f:2}),600);assert.equal(b.frames.length,1);assert.equal(b.teleported,true);
const platform=motion.remote();motion.push(platform,p(0,1,0,{y:.9,g:1,vx:0}),0);assert.equal(motion.sample(platform,500).y,.9);
console.log('PASS: frame-independent jumps, landing, ceilings, jitter buffer, packet order, shortest rotation, bounded prediction and teleport reset.');
