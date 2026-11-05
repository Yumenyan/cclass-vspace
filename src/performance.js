/* Keep simulation and networking independent from the render budget. */
(()=>{
 const profiles={low:{ratio:1,fps:30,range:28},medium:{ratio:1.25,fps:45,range:50},high:{ratio:2,fps:60,range:1000}};
 const modest=matchMedia('(pointer:coarse)').matches||(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
 let level=W.prefs.quality==='auto'?(modest?'low':'medium'):W.prefs.quality,lastRender=0,lastFrame=0,average=16,slow=0,warmup=performance.now()+5000,lastLOD=0;
 const meshes=new Map(),materials=new Map(),variants=new WeakMap();
 function reduced(g){if(variants.has(g))return variants.get(g);const p=g.parameters||{},T=W.THREE;let result=g;
  if(g.type==='ExtrudeGeometry')result=new T.BoxGeometry(1,1,1);
  else if(g.type==='IcosahedronGeometry'&&(p.detail||0)>1)result=new T.IcosahedronGeometry(p.radius,1);
  else if(g.type==='SphereGeometry'&&(p.widthSegments>10||p.heightSegments>8))result=new T.SphereGeometry(p.radius,10,8,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);
  else if(g.type==='CylinderGeometry'&&p.radialSegments>8)result=new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,8,p.heightSegments,p.openEnded,p.thetaStart,p.thetaLength);
  if(result!==g){if(g.boundingSphere)result.boundingSphere=g.boundingSphere.clone();if(g.boundingBox)result.boundingBox=g.boundingBox.clone()}
  variants.set(g,result);return result;
 }
 function refresh(){W.S.traverse(o=>{if(!o.isMesh)return;if(!meshes.has(o))meshes.set(o,o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!materials.has(m))materials.set(m,{normalMap:m.normalMap,roughnessMap:m.roughnessMap})});applyObjects()}
 function applyObjects(){for(const [o,g] of meshes){o.geometry=level==='low'?reduced(g):g}for(const [m,original] of materials){const normal=level==='low'?null:original.normalMap,rough=level==='low'?null:original.roughnessMap;if(m.normalMap!==normal||m.roughnessMap!==rough){m.normalMap=normal;m.roughnessMap=rough;m.needsUpdate=true}}}
 function apply(){const requested=W.prefs.quality;level=requested==='auto'?(modest?'low':'medium'):(profiles[requested]?requested:'medium');slow=0;warmup=performance.now()+5000;configure()}
 function configure(){const p=profiles[level];W.renderer.setPixelRatio(Math.min(devicePixelRatio||1,p.ratio));W.renderer.shadowMap.enabled=level!=='low';applyObjects();lastLOD=0}
 function lod(now){if(now-lastLOD<200)return;lastLOD=now;const m=W.me,range=profiles[level].range;for(const r of W.rooms)if(r.detailGroup)r.detailGroup.visible=W.mode3d?(r.zone===m.zone||Math.hypot(r.cx-m.x,r.cz-m.z)<range&&Math.abs(r.f-m.f)<=1):true}
 W.performance={get level(){return level},apply,refresh,shouldRender(now){
  if(lastFrame){const delta=now-lastFrame;if(delta<250){average=average*.96+delta*.04;if(W.prefs.quality==='auto'&&now>warmup){slow=average>34?slow+delta:Math.max(0,slow-delta);if(slow>3500&&level==='medium'){level='low';configure();slow=0}}}}lastFrame=now;lod(now);
  const interval=1000/profiles[level].fps;if(now-lastRender<interval-.5)return false;lastRender=now;return true;
 }};
 configure();refresh();
})();
