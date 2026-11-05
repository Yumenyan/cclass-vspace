/* Authored campus: procedural PBR surfaces, furnishings and instanced architectural detail. */
(()=>{
const T=W.THREE,low=(W.performance?.level||W.prefs.quality)==='low',groups=[],lightMaterials=[],ceilings=[];
const geometry={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(.5,.5,1,16),sphere:new T.SphereGeometry(.5,16,12)};
const roundedShape=new T.Shape(),corner=.1,a=.47;roundedShape.moveTo(-a+corner,-a);roundedShape.lineTo(a-corner,-a);roundedShape.quadraticCurveTo(a,-a,a,-a+corner);roundedShape.lineTo(a,a-corner);roundedShape.quadraticCurveTo(a,a,a-corner,a);roundedShape.lineTo(-a+corner,a);roundedShape.quadraticCurveTo(-a,a,-a,a-corner);roundedShape.lineTo(-a,-a+corner);roundedShape.quadraticCurveTo(-a,-a,-a+corner,-a);
geometry.rounded=low?geometry.box:new T.ExtrudeGeometry(roundedShape,{depth:.88,bevelEnabled:true,bevelThickness:.06,bevelSize:.03,bevelSegments:2,curveSegments:3,steps:1});if(!low)geometry.rounded.translate(0,0,-.44);
const textures={},materials={};
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
function surface(name,color,kind,rough=.8){
 if(materials[name])return materials[name];const size=256,count=size*size,heights=new Float32Array(count),albedo=new Uint8Array(count*4),normal=new Uint8Array(count*4),roughness=new Uint8Array(count*4),base=new T.Color(color);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,n=noise(x,y),grain=Math.sin(x*.2+Math.sin(y*.025)*5+n*.6);
  let h=n*.035,tint=1+(n-.5)*.12;
  if(kind==='wood'){const plank=Math.floor(x/32),edge=x%32<1;h+=grain*.05;tint+=(grain*.06+noise(plank,12)*.1)-.05;if(edge){h=-.12;tint*=.72}}
  if(kind==='stone'){const edge=x%64<2||y%64<2;h+=Math.sin(x*.032+y*.051)*.04;if(edge){h=-.1;tint*=.78}tint+=Math.sin(x*.032+y*.051)*.035}
  if(kind==='fabric'){h+=((x%3===0?1:0)+(y%3===0?1:0))*.055;tint+=Math.sin(x*Math.PI/2)*.025}
  if(kind==='grass'){h+=noise(x*3,y*2)*.1;tint+=(n-.5)*.3}
  if(kind==='metal'){h=Math.sin(y*2.8)*.015;tint=1+(n-.5)*.035}
  heights[i]=h;const k=i*4;albedo[k]=Math.min(255,base.r*255*tint);albedo[k+1]=Math.min(255,base.g*255*tint);albedo[k+2]=Math.min(255,base.b*255*tint);albedo[k+3]=255;roughness[k]=roughness[k+1]=roughness[k+2]=Math.min(255,(rough+(n-.5)*.08)*255);roughness[k+3]=255;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,k=i*4,dx=heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size],dy=heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x],length=Math.sqrt(dx*dx*4+dy*dy*4+1);normal[k]=(-dx/length+.5)*255;normal[k+1]=(-dy/length+.5)*255;normal[k+2]=(.5/length+.5)*255;normal[k+3]=255}
 const texture=data=>{const tex=new T.DataTexture(data,size,size,T.RGBAFormat);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=4;tex.needsUpdate=true;return tex};
 const map=texture(albedo);map.encoding=T.sRGBEncoding;const nmap=texture(normal),rmap=texture(roughness);textures[name]={map,normalMap:low?null:nmap,roughnessMap:low?null:rmap};
 return materials[name]=new T.MeshStandardMaterial({map,normalMap:low?null:nmap,roughnessMap:low?null:rmap,roughness:1,normalScale:new T.Vector2(.5,.5),metalness:kind==='metal'?.7:.015,envMapIntensity:.45});
}
const oak=surface('oak','#b39163','wood',.6),walnut=surface('walnut','#68503a','wood',.65),plaster=surface('plaster','#e9e3d5','plaster',.9),stone=surface('stone','#c8c4b6','stone',.82),linen=surface('linen','#b6b5a4','fabric',.95),navy=surface('navy','#465f69','fabric',.9),sage=surface('sage','#80937a','fabric',.9),metal=surface('metal','#58636b','metal',.3),grass=surface('grass','#657f4e','grass',1),leather=surface('leather','#a67b50','fabric',.65);
const white=W.mat(0xf1ede4),dark=W.mat(0x263037),brass=W.mat(0xbba16d,{metalness:.7,roughness:.3}),glass=new T.MeshPhysicalMaterial({color:0x8faeaf,metalness:.25,roughness:.12,transparent:true,opacity:.48,depthWrite:false});
const warm=new T.MeshStandardMaterial({color:0xffdf9c,emissive:0xffcf7b,emissiveIntensity:.6,roughness:.35});lightMaterials.push(warm);
const terracotta=W.mat(0xb78365),leaves=[W.mat(0x536f48),W.mat(0x688754),W.mat(0x7e9861)];
S.traverse(m=>{if(m.isMesh&&m.material?.userData.bark){m.material.map=walnut.map;m.material.normalMap=walnut.normalMap;m.material.needsUpdate=true}});
const floorMat=oak.clone();floorMat.map=oak.map.clone();floorMat.map.repeat.set(4,4);floorMat.normalMap=oak.normalMap?.clone()||null;floorMat.normalMap?.repeat.set(4,4);floorMat.roughnessMap=oak.roughnessMap?.clone()||null;floorMat.roughnessMap?.repeat.set(4,4);
const stoneFloor=stone.clone();stoneFloor.map=stone.map.clone();stoneFloor.map.repeat.set(4,4);stoneFloor.normalMap=stone.normalMap?.clone()||null;stoneFloor.normalMap?.repeat.set(4,4);
function group(parent,x=0,y=0,z=0,ry=0,f=1){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;g.userData.floor=f;parent.add(g);groups.push(g);return g}
function mesh(g,geo,material,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=!low;m.receiveShadow=true;g.add(m);return m}
function box(g,x,y,z,w,h,d,m=oak){return mesh(g,geometry.box,m,x,y,z,w,h,d)}
function rounded(g,x,y,z,w,h,d,m=oak){return mesh(g,geometry.rounded,m,x,y,z,w,h,d)}
function cylinder(g,x,y,z,r,h,m=metal){return mesh(g,geometry.cylinder,m,x,y,z,r*2,h,r*2)}
function ball(g,x,y,z,r,m=leaves[0],sx=1,sy=1,sz=1){return mesh(g,geometry.sphere,m,x,y,z,r*2*sx,r*2*sy,r*2*sz)}
function collider(g,x,z,w,d,height){g.updateWorldMatrix(true,false);const p=g.localToWorld(new T.Vector3(x,0,z)),q=g.getWorldQuaternion(new T.Quaternion()),yaw=new T.Euler().setFromQuaternion(q).y,swap=Math.abs(Math.sin(yaw))>.7;W.rect(g.userData.floor,p.x,p.z,swap?d:w,swap?w:d,{y0:0,y1:height,standable:true})}
function plane(g,x,y,z,w,h,material,rx=0,ry=0){const m=new T.Mesh(new T.PlaneGeometry(w,h),material);m.position.set(x,y,z);m.rotation.set(rx,ry,0);m.receiveShadow=true;g.add(m);return m}
const signTextures=[];
function sign(g,text,sub,x,y,z,w=2,h=.5,ry=0){
 const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#233d36';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#d0b888';ctx.fillRect(22,20,4,152);ctx.fillStyle='#f4f0e2';ctx.font='700 52px '+(window.CC_WORLD_FONT||'sans-serif');ctx.fillText(text,52,83);ctx.fillStyle='#b1c2b3';ctx.font='24px sans-serif';ctx.fillText(sub,54,140);const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;const mat=new T.MeshStandardMaterial({map:texture,roughness:.7,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.12});signTextures.push(mat);const p=plane(g,x,y,z,w,h,mat,0,ry);return p;
}
function plant(g,x,z,size=1){cylinder(g,x,.28*size,z,.28*size,.5*size,terracotta);cylinder(g,x,.54*size,z,.31*size,.09*size,terracotta);cylinder(g,x,.86*size,z,.035*size,.68*size,walnut);for(let i=0;i<7;i++){const a=i*2.4,leaf=ball(g,x+Math.cos(a)*.2*size,(.75+i*.09)*size,z+Math.sin(a)*.2*size,.3*size,leaves[i%3],.55,.35,1.4);leaf.rotation.set(.4,a,.25)}}
function table(g,x,z,w=2.5,d=1.25,material=oak){box(g,x,.82,z,w,.11,d,material);for(const a of [-1,1])for(const b of [-1,1])box(g,x+a*(w/2-.12),.4,z+b*(d/2-.12),.065,.8,.065,metal);collider(g,x,z,w,d,.9)}
function chair(g,x,z,ry=0,material=navy){const c=group(g,x,0,z,ry,g.userData.floor);rounded(c,0,.49,0,.65,.15,.65,material);rounded(c,0,.91,-.29,.65,.78,.12,material);for(const side of [-1,1]){rounded(c,side*.35,.73,0,.08,.08,.65,oak);for(const end of [-1,1])rounded(c,side*.25,.24,end*.23,.05,.48,.05,metal)}collider(g,x,z,.7,.7,.55);return c}
function sofa(g,x,z,ry=0,w=2.4,material=sage){const c=group(g,x,0,z,ry,g.userData.floor);rounded(c,0,.35,0,w,.42,.9,material);rounded(c,0,.85,-.43,w,.85,.22,material);for(const s of [-1,1])rounded(c,s*(w/2-.1),.63,0,.25,.65,.95,material);for(let i=0;i<3;i++){rounded(c,-w/3+i*w/3,.59,.05,w/3-.08,.15,.7,linen);rounded(c,-w/3+i*w/3,.9,-.25,w/3-.1,.48,.15,material)}for(const s of [-1,1])for(const e of [-1,1])cylinder(c,s*(w/2-.2),.1,e*.3,.04,.2,brass);collider(g,x,z,w,1,.6);return c}
function lamp(g,x,z){cylinder(g,x,.06,z,.25,.08,metal);cylinder(g,x,1.15,z,.025,2.2,brass);const shade=new T.Mesh(new T.CylinderGeometry(.2,.4,.45,20,1,true),linen);shade.position.set(x,2.2,z);g.add(shade);ball(g,x,2.1,z,.12,warm)}
function pendant(g,x,z,w=1.2){cylinder(g,x,3.98,z,.012,.65,metal);box(g,x,3.63,z,w,.13,.25,oak);box(g,x,3.55,z,w-.08,.03,.18,warm)}
function shelf(g,x,z,w=2.3,rows=4){box(g,x,1.45,z,w,2.9,.18,walnut);for(const s of [-1,1])box(g,x+s*w/2,1.45,z+.2,.09,2.9,.6,oak);for(let row=0;row<rows;row++){const y=.25+row*.66;box(g,x,y,z+.2,w,.07,.6,oak);for(let j=0;j<10;j++){const bw=.11+(j%3)*.025,h=.32+noise(j,row)*.22,bx=x-w/2+.2+j*(w-.4)/10;box(g,bx,y+h/2+.04,z+.2,bw,h,.37,bookMats[(j+row*3)%bookMats.length]);box(g,bx,y+h*.75,z+.397,bw*.7,.018,.006,brass)}}collider(g,x,z+.2,w,.7,2.9)}
const bookMats=[0x536b65,0x8b6350,0x9c865d,0x5b687d,0xb4b39a,0x7b697f].map(c=>W.mat(c));
function cup(g,x,y,z){cylinder(g,x,y+.045,z,.12,.018,white);cylinder(g,x,y+.12,z,.075,.13,white);cylinder(g,x,y+.19,z,.063,.004,W.mat(0x49382a));const handle=new T.Mesh(new T.TorusGeometry(.055,.018,6,12),white);handle.position.set(x+.08,y+.13,z);g.add(handle)}
function book(g,x,y,z,ry=.15){const c=group(g,x,y,z,ry,g.userData.floor);box(c,0,.03,0,.36,.06,.5,bookMats[2]);box(c,0,.035,.01,.33,.04,.46,white);box(c,0,.066,0,.37,.008,.51,bookMats[0]);return c}
function monitor(g,x,z,y=.88,heading='COMMONS / WORKSPACE'){const c=group(g,x,y,z,0,g.userData.floor);box(c,0,.025,.08,.45,.04,.3,metal);box(c,0,.24,0,.05,.43,.05,metal);box(c,0,.66,0,1.08,.65,.065,dark);sign(c,heading,'DESIGN · CONNECT · CREATE',0,.66,.036,1,.57);box(c,0,.02,.5,.62,.035,.22,dark);for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(c,-.27+col*.048,.043,.43+row*.045,.035,.008,.031,white);ball(c,.5,.045,.45,.085,dark,1,.35,1.4)}
// Soft reflection cubemap provides material response without external HDR downloads.
const faces=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);gradient.addColorStop(0,i===2?'#c3d5df':'#a4bbc2');gradient.addColorStop(.55,'#d6d4c8');gradient.addColorStop(1,'#727e6b');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);ctx.fillStyle='#ffffff55';ctx.fillRect(22,12,35,70);return c});
const reflection=new T.CubeTexture(faces);reflection.encoding=T.sRGBEncoding;reflection.needsUpdate=true;S.environment=reflection;
// Replace the old untextured shell surfaces and give each floor a real material.
for(const b of W.BD){b.wm.map=plaster.map;b.wm.normalMap=plaster.normalMap;b.wm.roughness=.9;b.wm.color.set(0xffffff);b.wm.needsUpdate=true;b.gm.roughness=.16;b.gm.metalness=.35;b.gm.color.set('#76999e').convertSRGBToLinear();
 const rotation={n:0,s:Math.PI,w:Math.PI/2,e:-Math.PI/2}[b.door];
 for(let f=1;f<=b.fl;f++){
  const g=group(b.G[f],b.x,(f-1)*FH,b.z,rotation,f);plane(g,0,.165,0,27.5,27.5,stoneFloor,-Math.PI/2);for(const side of [-1,1]){box(g,side*13.65,.35,0,.12,.42,27.4,walnut);box(g,side*13.65,3.9,0,.12,.12,27.4,oak)}
  // Horizontal floor bands, portico trims, window sills and thin brass mullions.
  for(const side of [-1,1]){box(g,side*14.28,4.72,0,.22,.2,28.8,walnut);box(g,side*14.3,.88,0,.3,.08,28.5,stone);for(let j=-12;j<=12;j+=4)box(g,side*14.36,2.35,j,.08,2.95,.06,brass)}
  box(g,0,4.72,14.3,28.8,.2,.22,walnut);box(g,0,4.72,-14.3,28.8,.2,.22,walnut);
  if(f===1){
   plane(g,0,.17,-18,8,6,stoneFloor,-Math.PI/2);for(const s of [-1,1]){cylinder(g,s*4.5,1.8,-16,.12,3.6,metal);for(let j=0;j<8;j++)box(g,s*5.8+j*.13,2.1,-14.5,.05,3.7,.16,oak)}
   box(g,0,3.75,-16.2,10,.24,4,walnut);for(let j=-4;j<=4;j++)box(g,j,3.61,-16.2,.16,.08,3.5,oak);box(g,0,3.58,-17.7,8,.04,.04,warm);
   const buildingSign=sign(g,b.n,'THE COMMONS / '+b.id+' HOUSE',0,3.1,-14.43,3.6,.9,Math.PI);buildingSign.userData.buildingName=true;b.physicalName=buildingSign;
   sofa(g,8,-7,Math.PI/2,2.7,navy);table(g,6.3,-7,1.15,1.15,walnut);cup(g,6.3,.88,-7);plant(g,11.5,-11.5,1.25);plant(g,-11.5,3,1.1);
   sign(g,'WELCOME HOME','LOUNGE · WORK · PLAY',0,2.3,-2.64,1.65,.65,Math.PI);
   for(let j=0;j<3;j++){const x=-8+j*8;sign(g,((window.CC_CONFIG||{}).tenants||[]).find(t=>t.building===b.id&&t.slot===j)?.name||'ATELIER '+(j+1),'OPEN FOR IDEAS',x,2.45,13.65,3,.7,Math.PI);for(let k=0;k<5;k++)box(g,x-1.6+k*.8,1.3,11.9,.35,.45+(k%2)*.25,.3,bookMats[k]);pendant(g,x,10.5,2.7)}
  }else{for(const side of [-1,1])for(const z of [-10,0,10])pendant(g,side*3.6,z,.8)}
 }
 const roof=group(b.G[b.fl+1],b.x,b.fl*FH,b.z,rotation,b.fl+1);for(const x of [-8,-3]){box(roof,x,.65,7,3,1.1,2,metal);for(let j=0;j<7;j++)box(roof,x,1.23,6.25+j*.25,2.7,.05,.06,dark)}
 for(let j=0;j<5;j++){const panel=box(roof,6,.4,-8+j*2.1,6,.1,1.7,W.mat(0x243c4a,{metalness:.6,roughness:.24}));panel.rotation.z=-.16;for(let k=-2;k<=2;k++)box(roof,6+k,.52,-8+j*2.1,.025,.03,1.7,metal)}
}
// Fully furnished rooms share a canonical layout: entry at +Z, window wall at -Z.
for(const r of W.rooms){
 const rotation={n:0,s:Math.PI,w:Math.PI/2,e:-Math.PI/2}[r.b.door]+(r.s<3?Math.PI/2:-Math.PI/2),g=group(r.b.G[r.f],r.cx,(r.f-1)*FH,r.cz,rotation,r.f);
 r.detailGroup=g;r.detailYaw=rotation;g.updateWorldMatrix(true,false);r.detailScreen=g.localToWorld(new T.Vector3(0,2,-3.43));r.detailPreview=g.localToWorld(new T.Vector3(0,.55,1.4));
 plane(g,0,.19,0,7.75,7.75,r.k==='smash'?stoneFloor:floorMat,-Math.PI/2);
 for(const side of [-1,1]){box(g,side*3.78,.28,0,.07,.18,7.6,walnut);box(g,side*3.76,3.15,0,.09,.09,7.6,oak);box(g,side*3.72,3.23,0,.03,.035,7.4,warm)}box(g,0,.28,-3.78,7.6,.18,.07,walnut);box(g,0,3.16,-3.78,7.6,.09,.09,oak);
 const ceiling=plane(g,0,4.6,0,7.8,7.8,plaster,Math.PI/2);ceiling.visible=false;ceilings.push({r,ceiling});pendant(g,0,-1,1.4);plant(g,3.15,2.9,.85);
 sign(g,r.n,'C CLASS / '+r.zone,3.2,2.3,3.45,1.1,.4,Math.PI);
 if(r.k==='pc'){
  for(let i=0;i<3;i++){const x=-2.4+i*2.4;table(g,x,-2.65,2.05,1.15);monitor(g,x,-2.9,.88,['CODE / TERMINAL','FILES / REPOSITORY','BUILD / TOGETHER'][i]);chair(g,x,-1.55,0);box(g,x+.68,.4,-2.7,.35,.7,.65,dark);for(let j=0;j<5;j++)box(g,x+.68,.5+j*.04,-2.35,.22,.015,.012,metal)}
  table(g,-1.7,1.9,2.1,.8,walnut);book(g,-1.8,.88,1.9);cup(g,-1.1,.88,1.8);sign(g,'CREATE SOMETHING','A GOOD IDEA STARTS HERE',0,2.6,-3.65,2.4,.7);lamp(g,-3.2,2.8);
 }else if(r.k==='multi'){
  sofa(g,-2.7,.3,Math.PI/2,2.6,navy);sofa(g,2.7,.3,-Math.PI/2,2.6,sage);table(g,0,-.9,2.5,1.2,walnut);cup(g,-.7,.88,-1);book(g,.4,.88,-.9);box(g,0,2,-3.52,5.35,3.05,.13,dark);box(g,0,.3,-3.35,5.4,.45,.6,walnut);for(const s of [-1,1]){box(g,s*3.2,1.4,-3.2,.3,1.5,.32,dark);for(let j=0;j<3;j++)ball(g,s*3.2,1+j*.4,-3.025,.095,metal,1,1,.2)}lamp(g,-3.3,2.8);
 }else if(r.k==='library'){
  shelf(g,-2.35,-3.1,2.2);shelf(g,0,-3.1,2.2);shelf(g,2.35,-3.1,2.2);sofa(g,-2.5,1.2,Math.PI/2,1.7,leather);sofa(g,2.5,1.2,-Math.PI/2,1.7,sage);table(g,0,1.2,1.3,1.3,walnut);book(g,0,.88,1.2);cup(g,.35,.88,1.4);lamp(g,-3.2,2.6);sign(g,'ゆっくり、ひらこう。','A QUIET PLACE FOR CURIOUS MINDS',0,3.3,-3.68,3,.55);
 }else if(r.k==='private'){
  box(g,-2.1,.3,-1.75,1.8,.42,2.8,walnut);box(g,-2.1,.58,-1.75,1.7,.25,2.65,linen);box(g,-2.1,.78,-2.6,1.7,.45,.18,oak);rounded(g,-2.1,.76,-2.5,1.15,.18,.55,white);box(g,-2.1,.75,-1.3,1.74,.11,1.8,sage);collider(g,-2.1,-1.75,1.8,2.8,.8);table(g,2,-2.3,2.15,.9);chair(g,2,-1.25);book(g,2,.88,-2.3);cup(g,2.6,.88,-2.5);shelf(g,2.5,2.6,1.7,3);lamp(g,-3.2,1.5);box(g,-2.3,.12,1.5,2.6,.025,2,linen);
 }else if(r.k==='creative'){
  table(g,-2.3,-2.6,2.4,1.1,walnut);monitor(g,-2.3,-2.8,.88,'WORLD / STUDIO');chair(g,-2.3,-1.45);table(g,1.6,-2.4,2.1,1.2);for(let i=0;i<6;i++){const m=box(g,.9+i*.25,1+noise(i,3)*.15,-2.4,.18,.2+noise(i,2)*.25,.18,bookMats[i]);m.rotation.y=i*.3}sign(g,'IDEA → SPACE','IMAGINE / MAKE / EXPLORE',0,2.7,-3.65,2.7,.75);box(g,0,.3,1.4,1.8,.4,1.8,walnut);collider(g,0,1.4,1.8,1.8,.5);box(g,0,.52,1.4,1.7,.04,1.7,white);for(let i=0;i<5;i++)box(g,-3.5,1.2+i*.4,1,.25,.16,.7,bookMats[i]);
 }else if(r.k==='count'){
  table(g,0,-1.5,3,1.4);for(const s of [-1,1])chair(g,s*1.7,-1.5,s*Math.PI/2);sign(g,'LITTLE THINGS, COUNTED','EVERY DAY IS A NEW PAGE',0,2.55,-3.65,3.6,1.2);for(let i=0;i<5;i++){const h=.3+i*.2;box(g,-1.5+i*.6,1.2+h/2,-3.48,.33,h,.08,bookMats[i])}cup(g,1,.88,-1.5);shelf(g,-2.5,2.5,1.8,3);
 }else if(r.k==='smash'){
  for(let i=0;i<7;i++)box(g,-2.8+i*.9,.205,0,.05,.01,6,W.mat(0x818b7b));box(g,0,.2,0,6,.015,.08,W.mat(0xd0b96d));for(const s of [-1,1]){box(g,s*3.4,1.5,-2.7,.12,2.8,.12,metal);box(g,s*3.2,2.85,-2.7,.4,.1,.4,brass)}box(g,0,2.95,-2.7,6.8,.18,.15,metal);sign(g,'LET IT ALL OUT','RESET YOUR MIND / PRESS E',0,2.35,-3.65,3,.8);
 }else if(r.k==='game'){
  const index='ABCDE'.indexOf(r.n.slice(-1));table(g,0,-1.7,2.7,1.6,walnut);chair(g,-1.9,-1.7,Math.PI/2,navy);chair(g,1.9,-1.7,-Math.PI/2,sage);sign(g,['THREE IN A ROW','ROCK / PAPER / SCISSORS','REACTION LAB','MEMORY CLUB','LET IT ROLL'][index],'PLAY TOGETHER / HAVE A GOOD TIME',0,2.65,-3.65,3.3,.8);sofa(g,-2.2,2.5,0,1.8,navy);lamp(g,2.9,2.5);
  if(index===0){box(g,0,.9,-1.7,1.2,.05,1.2,linen);for(const s of [-1,1]){box(g,s*.2,.94,-1.7,.018,.015,1.2,walnut);box(g,0,.94,-1.7+s*.2,1.2,.015,.018,walnut)}for(let i=0;i<3;i++){const token=new T.Mesh(new T.TorusGeometry(.12,.025,8,20),brass);token.rotation.x=-Math.PI/2;token.position.set(-.4+i*.4,.98,-2.1+i*.4);g.add(token)}}
  if(index===1){for(let i=0;i<3;i++){box(g,-.65+i*.65,.94,-1.7,.46,.035,.65,bookMats[i]);sign(g,['ROCK','PAPER','SCISSORS'][i],'CHOOSE',-.65+i*.65,.96,-1.7,.4,.5).rotation.x=-Math.PI/2}}
  if(index===2){box(g,0,1.02,-1.7,1.4,.3,.7,dark);cylinder(g,0,1.27,-1.6,.2,.12,W.mat(0xb7714f));sign(g,'000 ms','WAIT FOR GREEN',0,1.15,-1.34,1.2,.28)}
  if(index===3){for(let i=0;i<16;i++)box(g,-.6+(i%4)*.4,.94,-2.25+Math.floor(i/4)*.36,.32,.035,.27,bookMats[i%6])}
  if(index===4){for(let i=0;i<3;i++){const dice=group(g,-.6+i*.6,1.1,-1.7,i*.4,r.f);rounded(dice,0,0,0,.4,.4,.4,white);for(const u of [-.09,.09])for(const v of [-.09,.09])ball(dice,u,.207,v,.035,dark,1,.25,1);for(const u of [-.09,.09])ball(dice,u,0,.207,.035,dark,1,1,.25)}}
 }
}
// Ground, café tables, borders, vegetation and a distant city with illuminated windows.
const outdoor=group(S);
const groundMaterial=stone.clone();groundMaterial.map=stone.map.clone();groundMaterial.map.repeat.set(130,130);groundMaterial.normalMap=stone.normalMap?.clone()||null;groundMaterial.normalMap?.repeat.set(130,130);gnd.material=groundMaterial;
const lawn=grass.clone();lawn.map=grass.map.clone();lawn.map.repeat.set(16,16);lawn.normalMap=grass.normalMap?.clone()||null;lawn.normalMap?.repeat.set(16,16);const turf=new T.Mesh(new T.RingGeometry(8.3,19.4,96),lawn);turf.rotation.x=-Math.PI/2;turf.position.y=.075;outdoor.add(turf);
for(let i=0;i<48;i++){const a=i*Math.PI*2/48;const m=box(outdoor,Math.cos(a)*21,.08,Math.sin(a)*21,1.8,.12,.32,stone);m.rotation.y=-a;}
for(const [x,z] of [[24,13],[-24,-13],[13,-24],[-13,24]]){const café=group(outdoor,x,0,z);cylinder(café,0,.75,0,.66,.09,oak);cylinder(café,0,.36,0,.06,.7,metal);cylinder(café,0,.04,0,.3,.06,metal);for(const s of [-1,1])chair(café,s*1.1,0,-s*Math.PI/2,sage);cup(café,0,.8,0);plant(outdoor,x+2.8,z+.5,1.2);}
for(let i=0;i<25;i++){const a=i*2.39996,r=26+(i%5)*3.2,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<7||Math.abs(z)<7)continue;const rock=ball(outdoor,x,.15,z,.5,stone,1.4,.6,1);rock.rotation.y=i;for(let j=0;j<4;j++)ball(outdoor,x+Math.sin(j*2.4)*.6,.35,z+Math.cos(j*2.4)*.6,.45,leaves[j%3],1.3,.7,1)}
const windowCanvas=document.createElement('canvas');windowCanvas.width=128;windowCanvas.height=256;const wc=windowCanvas.getContext('2d');wc.fillStyle='#4d626a';wc.fillRect(0,0,128,256);for(let y=0;y<16;y++)for(let x=0;x<8;x++){wc.fillStyle=noise(x,y)>.55?'#e2c38d':'#a0b4b9';wc.fillRect(x*16+4,y*16+4,7,8)}const windows=new T.CanvasTexture(windowCanvas);windows.encoding=T.sRGBEncoding;windows.wrapS=windows.wrapT=T.RepeatWrapping;
const cityMaterial=new T.MeshStandardMaterial({map:windows,emissiveMap:windows,emissive:0xffdcaa,emissiveIntensity:.1,roughness:.65,metalness:.15});
for(let i=0;i<30;i++){const a=i*Math.PI*2/30,r=178+noise(i,4)*25,h=18+noise(i,9)*48,w=10+noise(i,7)*12;box(outdoor,Math.cos(a)*r,h/2,Math.sin(a)*r,w,h,w,cityMaterial);if(i%3===0)box(outdoor,Math.cos(a)*r,h+1,Math.sin(a)*r,w*.7,2,w*.7,metal)}
// Natural, taller trees: tapered trunks, branching crowns and clustered foliage.
for(let i=0;i<18;i++){const a=i*2.39996,r=78+(i%4)*9,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<22||Math.abs(z)<22)continue;const tr=group(outdoor,x,0,z,i);cylinder(tr,0,2.5,0,.24,5,walnut);for(let j=0;j<5;j++){const angle=j*2.4,branch=cylinder(tr,Math.cos(angle)*.6,4.1+j*.28,Math.sin(angle)*.6,.07,2,walnut);branch.rotation.z=.65;branch.rotation.y=angle;ball(tr,Math.cos(angle)*1.1,5+j*.35,Math.sin(angle)*1.1,1.5,leaves[j%3],1.1,.85,1)} }
// Only the nearby interior receives an extra fill light; emissive fixtures remain cheap.
const fill=new T.PointLight(0xffe4bb,0,12,2);S.add(fill);let lighting=null;
W.onLighting=solar=>{lighting=solar;Object.values(materials).forEach(m=>m.envMapIntensity=.12+solar.day*.35);glass.envMapIntensity=.2+solar.day*.5;cityMaterial.emissiveIntensity=.05+solar.night*.8;warm.emissiveIntensity=.4+solar.night*1.3;signTextures.forEach(m=>m.emissiveIntensity=.12+solar.night*.42)};
W.onTick.push(()=>{const r=W.rooms.find(r=>r.zone===W.me.zone);fill.intensity=r&&!W.customWorld?(low?1.1:2.2):0;fill.position.set(W.me.x,(W.me.f-1)*FH+3.6,W.me.z);ceilings.forEach(({r,ceiling})=>ceiling.visible=W.mode3d&&W.me.zone===r.zone);});
if(W.solar)W.onLighting(W.solar);
// Flatten authored furnishings into material/geometry batches while preserving floor visibility.
let instanceCount=0,batchCount=0;
const roots=[outdoor,...groups.filter(g=>W.BD.some(b=>b.G.includes(g.parent)))];S.updateMatrixWorld(true);
for(const root of roots){const batches=new Map(),inverse=new T.Matrix4().copy(root.matrixWorld).invert();root.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||!m.userData||m===root||ceilings.some(x=>x.ceiling===m)||m.geometry.type==='PlaneGeometry'||!Object.values(geometry).includes(m.geometry))return;const key=m.geometry.uuid+'|'+m.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m)});for(const items of batches.values()){if(items.length<3)continue;const batch=new T.InstancedMesh(items[0].geometry.clone(),items[0].material,items.length);batch.castShadow=!low;batch.receiveShadow=true;batch.frustumCulled=true;const bounds=new T.Box3();items.forEach((m,i)=>{const matrix=new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld);batch.setMatrixAt(i,matrix);if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(matrix));m.parent.remove(m)});batch.geometry.boundingSphere=bounds.getBoundingSphere(new T.Sphere());batch.instanceMatrix.needsUpdate=true;root.add(batch);instanceCount+=items.length;batchCount++}}
S.traverse(o=>{if(o.userData.buildingName)o.visible=W.prefs.showBuildingNames!==false});
W.performance?.refresh();W.detailStats={instances:instanceCount,batches:batchCount,materials:Object.keys(materials).length,rooms:W.rooms.length};
})();
