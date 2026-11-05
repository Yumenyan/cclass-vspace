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
const wall={x0:2,x1:2.4,y0:0,y1:3,z0:-3,z1:3};
assert.ok(motion.cameraDistance([0,1.5,0],[5,1.5,0],[wall])<1.8,'camera sphere stops before the wall');
assert.equal(motion.cameraDistance([0,1.5,0],[5,1.5,0],[{...wall,y1:.9}]),5,'low furniture must not obstruct the head-height camera');
assert.ok(motion.cameraDistance([0,1.5,0],[0,7,0],[{x0:-14,x1:14,z0:-14,z1:14,y0:4.6,y1:4.8}])<2.9,'ceiling clearance includes near-plane radius');
assert.equal(motion.cameraDistance([0,1,0],[0,1,0],[]),0);
assert.ok(Math.abs(motion.walkBob(1,6,true,true).y)>0);
for(const [speed,grounded,enabled] of [[0,true,true],[6,false,true],[6,true,false]])assert.equal(motion.walkBob(1,speed,grounded,enabled).y,0);
console.log('PASS: opaque-wall camera clearance, furniture heights, ceilings, and grounded-only optional walk bob.');

// Broad-phase collision candidates must never omit a collider touching the player.
{
 const source=require('node:fs').readFileSync('src/world.js','utf8'),start=source.indexOf('const colliderGrid='),end=source.indexOf('const ov=',start),context={COL:[],colliderRevision:0,PR:.4};
 const vm=require('node:vm');vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.query=nearColliders',context);
 for(let i=0;i<180;i++){const x=(i*37%241)-120,z=(i*71%241)-120;context.COL.push({f:i%3+1,x0:x,x1:x+1+i%12,z0:z,z1:z+1+i%9,on:i%4!==0})}context.colliderRevision++;
 for(let f=1;f<=3;f++)for(let x=-120;x<=120;x+=3.7)for(let z=-120;z<=120;z+=5.3){const candidates=context.query(x,z,f);for(const c of context.COL)if(c.f===f&&x>c.x0-.4&&x<c.x1+.4&&z>c.z0-.4&&z<c.z1+.4)assert.ok(candidates.includes(c))}
 const replacement={f:1,x0:-1,x1:1,z0:-1,z1:1,on:true};context.COL.splice(0,1,replacement);context.colliderRevision++;assert.ok(context.query(0,0,1).includes(replacement));context.COL.splice(0,1);assert.ok(!context.query(0,0,1).includes(replacement));
 console.log('PASS: spatial collision grid covers all overlapping boxes, floor boundaries, insertions and removals.');
}
