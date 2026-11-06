// ПРЕДЕЛ — Level builders, nav graphs, map table and loadMap.
'use strict';
/* ---------- level ---------- */
const solids=[],WATER_ZONES=[],BRIDGES=[],ICE_ZONES=[];
let CUBE_NODE_UP=[];
const CUBE_ROOMS=[
  {id:0,c:[0,0,0],up:[0,1,0]}, {id:1,c:[12,0,0],up:[-1,0,0]}, {id:2,c:[-12,0,0],up:[1,0,0]},
  {id:3,c:[0,0,-12],up:[0,0,1]}, {id:4,c:[0,0,12],up:[0,0,-1]}, {id:5,c:[0,12,0],up:[0,-1,0]}
];
const REACTOR={timer:120,dark:false,switches:[],lights:[],ambient:null,sun:null,core:null,coreLight:null};
const REACTOR_DAMAGE={name:'РЕАКТОР',lava:true};
const SHIP={timer:28,waveT:0,waveId:0,waveMesh:null};
function inWater(e){return WATER_ZONES.some(w=>e.pos.x>w.x0&&e.pos.x<w.x1&&e.pos.z>w.z0&&e.pos.z<w.z1&&e.pos.y<w.surface);}
function onIce(e){return curMap===6&&ICE_ZONES.some(a=>e.pos.x>a.x0&&e.pos.x<a.x1&&e.pos.z>a.z0&&e.pos.z<a.z1);}
function setBridgeState(i,broken,remaining=20){const b=BRIDGES[i];if(!b||b.broken===broken)return;b.broken=broken;b.timer=broken?remaining:0;b.collapseT=0;b.mesh.visible=!broken;const n=solids.indexOf(b.solid);if(broken&&n>=0)solids.splice(n,1);else if(!broken&&n<0)solids.push(b.solid);}
function updateTempleFeatures(dt){if(curMap!==4||isClient()||state!=='play')return;for(let i=0;i<BRIDGES.length;i++){const b=BRIDGES[i];if(b.broken){b.timer-=dt;if(b.timer<=0){setBridgeState(i,false);nev({t:'br',i,b:0});}continue;}if(b.collapseT>0){b.collapseT-=dt;if(b.collapseT<=0){setBridgeState(i,true,20);nev({t:'br',i,b:1,r:20});for(let k=0;k<18;k++)emit(new V3(b.x,-.1,(R()*16)-8),rv(2),0x50b8d8,.12,.7,1);playSnd('pickup');}continue;}for(const e of ents){if(!e.alive||Math.abs(e.pos.x-b.x)>1.9||e.pos.z< -8.2||e.pos.z>8.2||e.pos.y<-.1||e.pos.y>1.8)continue;b.collapseT=.72;break;}}}
function cubeUpAt(p){let best=CUBE_ROOMS[0],bd=1e9;for(const r of CUBE_ROOMS){const dx=p.x-r.c[0],dy=p.y-r.c[1],dz=p.z-r.c[2],d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;best=r;}}return new V3(...best.up);}
function cubeBasis(up,yaw=0){let f=new V3(0,0,-1).addScaledVector(up,up.z);if(f.lengthSq()<.1)f.set(1,0,0).addScaledVector(up,-up.x);f.normalize();const right=new V3().crossVectors(f,up).normalize();return{ref:f,right,forward:f.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(right,-Math.sin(yaw))};}
function cubeFrame(e,force=false){if(curMap!==9)return e.up||UP;if(!e.up)e.up=UP.clone();const n=cubeUpAt(e.pos);if(force||!e.up.equals(n)){const old=e.up.clone(),oldB=cubeBasis(old,e.yaw),dir=oldB.forward.multiplyScalar(Math.cos(e.pitch)).addScaledVector(old,Math.sin(e.pitch)),center=force?e.pos.clone():e.pos.clone().addScaledVector(old,e.h*.5);e.up.copy(n);e.pos.copy(center);if(!force)e.pos.addScaledVector(e.up,-e.h*.5);const b=cubeBasis(e.up);e.yaw=Math.atan2(-dir.dot(b.right),dir.dot(b.ref));e.pitch=Math.asin(clamp(dir.dot(e.up),-1,1));if(!force&&e===player){centerMsg('ГРАВИТАЦИЯ ПЕРЕКЛЮЧЕНА',.65);playSnd('switch');}}return e.up;}
function entityUp(e){return curMap===9?cubeFrame(e):UP;}
function cubeAim(e){const up=entityUp(e),b=cubeBasis(up,e.yaw);return b.forward.multiplyScalar(Math.cos(e.pitch)).addScaledVector(up,Math.sin(e.pitch)).normalize();}
const M=(map,color=0xffffff)=>new THREE.MeshLambertMaterial({map,color});
const matFloor=M(texFloor),matWall=M(texWall),matStone=M(texStone),matGrate=M(texGrate),matHaz=M(texHaz),matPillar=M(texPillar),matCrate=M(texCrate),matPlate=M(texFloor,0x9aa4c8),matTrim=M(texTrim),matRust=M(texRust);
function box(x0,y0,z0,x1,y1,z1,mat,ts=4,collide=true){
  const w=x1-x0,h=y1-y0,d=z1-z0,cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2;
  const seg=v=>Math.max(1,Math.min(24,Math.ceil(v/3)));
  const geo=new THREE.BoxGeometry(w,h,d,seg(w),seg(h),seg(d));
  const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){const X=p.getX(i)+cx,Y=p.getY(i)+cy,Z=p.getZ(i)+cz,ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));let u,v;if(ax>.5){u=Z;v=Y;}else if(ay>.5){u=X;v=Z;}else{u=X;v=Y;}uv.setXY(i,u/ts,v/ts);}
  const m=new THREE.Mesh(geo,mat);m.position.set(cx,cy,cz);LV.add(m);
  if(collide)solids.push({min:[x0,y0,z0],max:[x1,y1,z1]});return m;}

function addPuddle(x,z,w,d){const m=new THREE.Mesh(new THREE.CircleGeometry(1,14),new THREE.MeshPhongMaterial({color:0x182631,specular:0x9dc8db,shininess:110,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,.025,z);m.scale.set(w,d,1);LV.add(m);
  for(const [ox,oz,l,th] of [[-.25,-.18,.42,.035],[.2,.12,.22,.025]]){const gl=new THREE.Mesh(new THREE.PlaneGeometry(l,th),new THREE.MeshBasicMaterial({color:0xb1e8ff,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}));gl.rotation.x=-Math.PI/2;gl.position.set(x+ox*w,.035,z+oz*d);LV.add(gl);}}
const flames=[];
function flame(x,y,z,s=1){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:texFlame,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sp.position.set(x,y,z);sp.userData={s,ph:R()*10};LV.add(sp);flames.push(sp);}

const PADS=[];
function onPad(e,p){if(p.up){const d=e.pos.clone().sub(p.pos),a=d.dot(p.up);return Math.abs(a)<1.1&&d.addScaledVector(p.up,-a).length()<1.3;}return Math.abs(e.pos.y-(p.y||0))<1.1&&Math.hypot(e.pos.x-p.x,e.pos.z-p.z)<1.3;}
function padVel(from,to,apex){const vy=Math.sqrt(2*G*apex),t1=vy/G,t2=Math.sqrt(2*Math.max(.1,from.y+apex-to.y)/G),T=t1+t2;return new V3((to.x-from.x)/T,vy,(to.z-from.z)/T);}

function buildBastion(){
  box(-A,-1,-A,A,0,A,matFloor,4);
  box(-A-2,-1,-A-2,A+2,15,-A,matWall);box(-A-2,-1,A,A+2,15,A+2,matWall);box(-A-2,-1,-A,-A,15,A,matWall);box(A,-1,-A,A+2,15,A,matWall);
  box(-A,0,-A,A,.6,-A+.3,matHaz,2);box(-A,0,A-.3,A,.6,A,matHaz,2);box(-A,0,-A,-A+.3,.6,A,matHaz,2);box(A-.3,0,-A,A,.6,A,matHaz,2);
  for(let x=-A-2;x<A+2;x+=4){box(x,15,-A-2,x+2,16.5,-A,matWall,4,false);box(x,15,A,x+2,16.5,A+2,matWall,4,false);}
  for(let z=-A;z<A;z+=4){box(-A-2,15,z,-A,16.5,z+2,matWall,4,false);box(A,15,z,A+2,16.5,z+2,matWall,4,false);}
  for(const t of [-24,-12,0,12,24]){
    box(t-1,0,-A,t+1,15,-A+1,matStone);box(t-1,0,A-1,t+1,15,A,matStone);box(-A,0,t-1,-A+1,15,t+1,matStone);box(A-1,0,t-1,A,15,t+1,matStone);
    box(t-.4,6.3,-A+1,t+.4,6.7,-A+1.6,matTrim,1,false);flame(t,7.3,-A+1.3);
    box(t-.4,6.3,A-1.6,t+.4,6.7,A-1,matTrim,1,false);flame(t,7.3,A-1.3);
    box(-A+1,6.3,t-.4,-A+1.6,6.7,t+.4,matTrim,1,false);flame(-A+1.3,7.3,t);
    box(A-1.6,6.3,t-.4,A-1,6.7,t+.4,matTrim,1,false);flame(A-1.3,7.3,t);}
  // central platform + stairs
  box(-7,0,-7,7,2.8,7,matStone);box(-7.2,2.8,-7.2,7.2,3,7.2,matPlate);
  // Polished marble around and on top of the dais: the arena's showcase mirror floor.
  mirrorFloor(-16,-16,16,16,0,0xd8ccff,.34);mirrorFloor(-7.2,-7.2,7.2,7.2,3,0xc8e4ff,.4);
  for(let i=1;i<=6;i++){box(-2,0,13-i,2,.5*i,14-i,matTrim,2);box(-2,0,-(14-i),2,.5*i,-(13-i),matTrim,2);}
  for(const sx of [-1,1])for(const sz of [-1,1]){
    box(sx*6.2-.3,3,sz*6.2-.3,sx*6.2+.3,4.6,sz*6.2+.3,matPillar,1);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.5),new THREE.MeshBasicMaterial({color:0x60c0ff}));cap.position.set(sx*6.2,4.75,sz*6.2);LV.add(cap);
    // pillars
    box(sx*11-1,0,sz*11-1,sx*11+1,10,sz*11+1,matPillar,2);box(sx*11-1.4,10,sz*11-1.4,sx*11+1.4,10.8,sz*11+1.4,matStone,2);
    // towers
    const xa=sx>0?21:-31,za=sz>0?21:-31;
    box(xa,0,za,xa+10,6.8,za+10,matStone);box(xa,6.8,za,xa+10,7,za+10,matPlate);// flush cap: an overhang snagged anyone flying up from the corner pad
    const ox=sx>0?xa+9:xa,oz=sz>0?za+9:za;
    for(let t=0;t<10;t+=2){box(ox,7,za+t,ox+1,8.2,za+t+1,matStone,2);box(xa+t,7,oz,xa+t+1,8.2,oz+1,matStone,2);}
    box(sx*29-.5,7,sz*29-.5,sx*29+.5,7.9,sz*29+.5,matTrim,1);flame(sx*29,8.8,sz*29,1.6);
    const tl=new THREE.PointLight(0xff8030,1.7,32,1);tl.position.set(sx*28,9.5,sz*28);LV.add(tl);
    // jump pad
    const pp=new V3(sx*19,0,sz*19),tgt=new V3(sx*26,7,sz*26);
    PADS.push({x:pp.x,z:pp.z,vel:padVel(pp,tgt,13)});
    const padM=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,.2,12),[matTrim,new THREE.MeshBasicMaterial({map:texPad}),matTrim]);padM.position.set(pp.x,.1,pp.z);LV.add(padM);
    const cone=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.3,3.5,12,1,true),new THREE.MeshBasicMaterial({color:0x30c0ff,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));cone.position.set(pp.x,1.9,pp.z);LV.add(cone);padCones.push(cone);
  }
  // catwalks
  for(const sz of [-1,1]){const zc=sz*26;
    box(-21,6.5,zc-1.5,21,7,zc+1.5,matGrate,2);
    box(-21,7,zc-1.5,21,7.9,zc-1.35,matTrim,1);box(-21,7,zc+1.35,21,7.9,zc+1.5,matTrim,1);
    for(const x of [-10,10])box(x-.5,0,zc-.5,x+.5,6.5,zc+.5,matPillar,2);}
  // cover + crates
  box(21.5,0,-4,22.5,2.5,4,matTrim,2);box(-22.5,0,-4,-21.5,2.5,4,matTrim,2);
  // Low, staggered cover breaks up the long crossings between the dais and the outer lanes.
  for(const sx of [-1,1])for(const sz of [-1,1]){
    box(sx*15-1.6,0,sz*9-.65,sx*15+1.6,1.45,sz*9+.65,matCrate,2);
  }
  for(const [x,z,s] of [[10,29,1],[-10,29,0],[10,-29,0],[-10,-29,1],[29,10,0],[29,-10,1],[-29,10,1],[-29,-10,0]]){box(x-1,0,z-1,x+1,2,z+1,matCrate,2);if(s)box(x-.7,2,z-.7,x+.7,3.4,z+.7,matCrate,1.4);}
  addPuddle(0,-20,4,2.4);addPuddle(-25,0,3,1.8);
  // lights
  LV.add(new THREE.HemisphereLight(0x8a8ac0,0x2a1a14,.55));
  const moon=new THREE.DirectionalLight(0xffc8a0,.45);moon.position.set(-40,60,-30);LV.add(moon);
  const cl=new THREE.PointLight(0x40a0ff,1.5,26,1);cl.position.set(0,7,0);LV.add(cl);
}
const padCones=[];
const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(500,32,16),new THREE.MeshBasicMaterial({map:texSky,side:THREE.BackSide,fog:false,depthWrite:false}));skyMesh.renderOrder=-1;scene.add(skyMesh);
let lavaZones=[];const LAVA={name:'ЛАВА',lava:true},VOID={name:'БЕЗДНА',lava:true};
function buildFoundry(){
  const X=45,Z=25;
  box(-X,-1,-Z,-5,0,Z,matFloor);box(5,-1,-Z,X,0,Z,matFloor);box(-5,-2.6,-Z,-4,0,Z,matHaz,2);box(4,-2.6,-Z,5,0,Z,matHaz,2);
  box(-4,-2.6,-Z,4,-1.6,Z,matStone);
  box(-X-2,-3,-Z-2,X+2,14,-Z,matRust);box(-X-2,-3,Z,X+2,14,Z+2,matRust);box(-X-2,-3,-Z,-X,14,Z,matRust);box(X,-3,-Z,X+2,14,Z,matRust);
  box(-X,0,-Z,X,.6,-Z+.3,matHaz,2);box(-X,0,Z-.3,X,.6,Z,matHaz,2);
  for(let x=-X-2;x<X+2;x+=4){box(x,14,-Z-2,x+2,15.2,-Z,matRust,4,false);box(x,14,Z,x+2,15.2,Z+2,matRust,4,false);}
  // pit parapets + bridges
  for(const sx of [-4.4,4]){for(const [a,b] of [[-Z,-14],[-10,10],[14,Z]])box(sx,0,a,sx+.4,.75,b,matTrim,1);}
  for(const z of [-12,12]){box(-4,-.5,z-2,4,0,z+2,matGrate,2);box(-4,0,z-2,4,.9,z-1.85,matTrim,1);box(-4,0,z+1.85,4,.9,z+2,matTrim,1);}
  // One low bridge barricade gives the two ground crossings different sightlines.
  box(-.7,0,-12.7,.7,1.45,-11.3,matRust,2);
  // lava
  const lava=new THREE.Mesh(new THREE.PlaneGeometry(8,2*Z,4,20),new THREE.MeshBasicMaterial({map:texLava}));lava.rotation.x=-Math.PI/2;lava.position.set(0,-.6,0);LV.add(lava);
  texLava.repeat.set(2,12);lavaZones.push({x0:-4,x1:4,z0:-Z,z1:Z,y:-.4});
  for(const z of [-16,0,16]){const l=new THREE.PointLight(0xff5010,1.9,20,1);l.position.set(0,.5,z);LV.add(l);}
  for(const z of [-20,-6,6,20])flame(0,.2,z,2.2);
  // high bridge
  box(-10,2.5,-1.5,10,3,1.5,matGrate,2);box(-10,3,-1.5,10,3.9,-1.35,matTrim,1);box(-10,3,1.35,10,3.9,1.5,matTrim,1);
  for(const s of [-1,1]){
    const xa=s>0?10:-18;box(xa,0,-5,xa+8,2.8,5,matStone);box(xa-.2,2.8,-5.2,xa+8.2,3,5.2,matPlate);
    for(let i=1;i<=6;i++){const a=24-i,b=25-i;if(s>0)box(a,0,-2,b,.5*i,2,matTrim,2);else box(-b,0,-2,-a,.5*i,2,matTrim,2);}
    // balcony
    const bx0=s>0?36:-X,bx1=s>0?X:-36;box(bx0,0,-Z,bx1,4.8,Z,matStone);box(s>0?35.8:-X,4.8,-Z,s>0?X:-35.8,5,Z,matPlate);
    const rx=s>0?35.8:-36;for(const [a,b] of [[-Z,-21],[-8,8],[21,Z]])box(rx,5,a,rx+.2,5.9,b,matTrim,1);
    const bl=new THREE.PointLight(0x40a0ff,1.6,30,1);bl.position.set(s*40,9,0);LV.add(bl);
    for(const z of [-12,12]){box(s*44-.8,5,z-.8,s*44+.8,14,z+.8,matPillar,2);}
    flame(s*36.5,6.6,-21.5,1.2);flame(s*36.5,6.6,21.5,1.2);box(s*36.5-.4,5,-21.9,s*36.5+.4,5.8,-21.1,matTrim,1);box(s*36.5-.4,5,21.1,s*36.5+.4,5.8,21.9,matTrim,1);
    // pads
    for(const sz of [-1,1]){const pp=new V3(s*30,0,sz*16),tgt=new V3(s*40,5,sz*16);PADS.push({x:pp.x,z:pp.z,vel:padVel(pp,tgt,9)});
      const padM=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,.2,12),[matTrim,new THREE.MeshBasicMaterial({map:texPad}),matTrim]);padM.position.set(pp.x,.1,pp.z);LV.add(padM);
      const cone=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.3,3.5,12,1,true),new THREE.MeshBasicMaterial({color:0x30c0ff,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));cone.position.set(pp.x,1.9,pp.z);LV.add(cone);padCones.push(cone);
      box(s*22-1,0,sz*18-1,s*22+1,14,sz*18+1,matPillar,2);
      box(s*14-1,0,sz*16-1,s*14+1,2,sz*16+1,matCrate,2);box(s*14-1,0,sz*20-1,s*14+1,2,sz*20+1,matCrate,2);box(s*14-.7,2,sz*20-.7,s*14+.7,3.4,sz*20+.7,matCrate,1.4);
      box(s*32-1,0,sz*6-1,s*32+1,2,sz*6+1,matCrate,2);}
  }
  // Staggered machine housings give each outer flank a second usable cover point.
  for(const sx of [-1,1])for(const sz of [-1,1]){
    box(sx*27-1.5,0,sz*7-1,sx*27+1.5,1.6,sz*7+1,matRust,2);
  }
  for(const z of [-16,0,16]){box(-X,12,z-.5,X,12.8,z+.5,matRust,4,false);for(const x of [-30,-15,15,30]){const c=new THREE.Mesh(new THREE.BoxGeometry(.6,.25,.6),new THREE.MeshBasicMaterial({color:0xffd080}));c.position.set(x,11.85,z);LV.add(c);}}
  addPuddle(-20,-12,5,2.2);addPuddle(20,12,4,2.4);
  LV.add(new THREE.HemisphereLight(0xa08078,0x402018,.75));
  const d=new THREE.DirectionalLight(0xffa070,.35);d.position.set(30,60,20);LV.add(d);
}

function buildOrbit(){
  // A central hub connects four cargo modules over open space.
  box(-9,-1,-9,9,0,9,matGrate,2);
  box(8,-.7,-2.7,23,0,2.7,matGrate,2);box(-23,-.7,-2.7,-8,0,2.7,matGrate,2);
  box(-2.7,-.7,8,2.7,0,23,matGrate,2);box(-2.7,-.7,-23,2.7,0,-8,matGrate,2);
  box(22,-1,-8,36,0,8,matFloor,2);box(-36,-1,-8,-22,0,8,matFloor,2);
  box(-8,-1,22,8,0,36,matFloor,2);box(-8,-1,-36,8,0,-22,matFloor,2);

  // Rails and hazard stripes make the narrow bridge edges legible in motion.
  for(const s of [-1,1]){
    box(8,0,s*2.7-0.2,23,.85,s*2.7,matTrim,1);
    box(-23,0,s*2.7-0.2,-8,.85,s*2.7,matTrim,1);
    box(s*2.7-0.2,0,8,s*2.7,.85,23,matTrim,1);
    box(s*2.7-0.2,0,-23,s*2.7,.85,-8,matTrim,1);
  }
  for(const [x0,z0,x1,z1] of [[8,-8,36,-7.6],[8,7.6,36,8],[-36,-8,-8,-7.6],[-36,7.6,-8,8],
    [-8,22,-7.6,36],[7.6,22,8,36],[-8,-36,-7.6,-22],[7.6,-36,8,-22]])
    box(x0,0,z0,x1,.12,z1,matHaz,2,false);

  // A short central mast and scattered containers create layered cover.
  box(-1.2,0,-1.2,1.2,3.2,1.2,matPillar,2);
  box(-2.6,3.2,-2.6,2.6,3.4,2.6,matTrim,2);
  for(const [x,z,h] of [[-6,-6,2],[6,6,2],[-29,-5,2],[29,5,2],[-5,29,3],[5,-29,3]]){
    box(x-1.5,0,z-1.5,x+1.5,h,z+1.5,matCrate,2);
  }
  for(const [x,z] of [[-31,0],[31,0],[0,-31],[0,31]]){
    box(x-3,0,z-3,x+3,.35,z+3,matTrim,2);
    box(x-3,.35,z-3,x+3,.55,z+3,matPlate,2);
    for(const s of [-1,1]){
      box(x+s*3,0,z-3,x+s*3.25,1.2,z+3,matPillar,2);
      box(x-3,0,z+s*3,x+3,1.2,z+s*3.25,matPillar,2);
    }
  }
  // The observation deck is a reachable high route for the low-gravity jump.
  box(-2.6,3.4,-2.6,2.6,3.8,2.6,matPillar,2);
  box(-2.2,3.8,-2.2,2.2,3.95,2.2,matPlate,2);
  for(const [x,z] of [[-4.5,0],[4.5,0],[0,-4.5],[0,4.5]]){
    box(x-.35,0,z-.35,x+.35,4.8,z+.35,matPillar,1);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.7,.18,.7),new THREE.MeshBasicMaterial({color:0x50cfff}));
    lamp.position.set(x,4.9,z);LV.add(lamp);
  }
  for(const [x,z] of [[-31,0],[31,0],[0,-31],[0,31]]){
    const light=new THREE.PointLight(0x40bfff,1.25,24,1);light.position.set(x,4,z);LV.add(light);
  }
  addPuddle(5,-5,2.8,1.7);addPuddle(30,0,3,2);addPuddle(0,30,2.6,2.8);
  LV.add(new THREE.HemisphereLight(0x809ac8,0x10121d,.8));
  const sun=new THREE.DirectionalLight(0xc0d8ff,.45);sun.position.set(-25,45,20);LV.add(sun);
}

function buildTraining(){
  box(-34,-1,-23,34,0,23,matFloor,4);
  box(-36,-1,-25,36,9,-23,matWall);box(-36,-1,23,36,9,25,matWall);
  box(-36,-1,-23,-34,9,23,matWall);box(34,-1,-23,36,9,23,matWall);
  // Two mirrored bunkers with a broad central doorway and partial roof cover.
  for(const s of [-1,1]){
    const x0=s<0?-30:17,x1=s<0?-17:30,ix0=s<0?-17.7:17,ix1=s<0?-17:17.7;
    box(x0,0,-9,x1,4.8,-8.2,matStone);box(x0,0,8.2,x1,4.8,9,matStone);
    if(s<0)box(-30,0,-8.2,-29.2,4.8,8.2,matStone);else box(29.2,0,-8.2,30,4.8,8.2,matStone);
    box(ix0,0,-8.2,ix1,4.5,-2.8,matStone);box(ix0,0,2.8,ix1,4.5,8.2,matStone);
    box(s<0?-30:24,4.5,-9,s<0?-24:30,5,-1.5,matPlate);
    box(s<0?-30:24,4.5,1.5,s<0?-24:30,5,9,matPlate);
    box(ix0,4.15,-2.8,ix1,4.8,2.8,matTrim);
    // Embrasures and bright teamless training lamps.
    for(const z of [-6,6]){box(s<0?-29.1:28.7,2.1,z-.75,s<0?-28.7:29.1,2.8,z+.75,matHaz,1,false);}
    const lamp=new THREE.PointLight(s<0?0xff6040:0x40aaff,.8,15,1);lamp.position.set(s*24,3.4,0);LV.add(lamp);
  }
  // Low, mirrored crates break up the open crossing without blocking sightlines.
  for(const s of [-1,1]){
    box(s*8-1.2,0,-6,s*8+1.2,1.5,-4,matCrate,2);
    box(s*8-1.2,0,4,s*8+1.2,1.5,6,matCrate,2);
    box(s*12-.8,0,-1,s*12+.8,2.1,1,matRust,2);
  }
  // A central marked firing lane and matching side lights.
  box(-.12,.02,-15,.12,.06,15,matHaz,1,false);
  for(const x of [-4,4])for(const z of [-16,16]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(.35,2.4,.35),matPillar);post.position.set(x,1.2,z);LV.add(post);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.55,.18,.55),new THREE.MeshBasicMaterial({color:0xffc050}));lamp.position.set(x,2.5,z);LV.add(lamp);
  }
  LV.add(new THREE.HemisphereLight(0x9aa8c8,0x252a32,.72));
  const sun=new THREE.DirectionalLight(0xffdfb0,.5);sun.position.set(-15,32,18);LV.add(sun);
}
function addTempleBridge(x){const mesh=box(x-1.55,-.05,-8,x+1.55,.38,8,matGrate,2),solid=solids[solids.length-1];BRIDGES.push({x,mesh,solid,broken:false,timer:0,collapseT:0});}
function buildTemple(){
  // Jungle ruins flank a sunken river basin; the two narrow crossings can collapse.
  box(-32,-1,-25,32,0,-8,matFloor,4);box(-32,-1,8,32,0,25,matFloor,4);
  box(-34,-1,-27,34,8,-25,matWall);box(-34,-1,25,34,8,27,matWall);
  box(-34,-1,-25,-32,8,25,matWall);box(32,-1,-25,34,8,25,matWall);
  box(-30,0,-8,-28,6,8,matStone);box(28,0,-8,30,6,8,matStone);
  // Solid earth under the banks and at the basin ends so nobody slips under the floor.
  box(-34,-6,-25,34,-1,-8,matStone,3);box(-34,-6,8,34,-1,25,matStone,3);
  box(-34,-6,-8,-28,0,8,matStone,3);box(28,-6,-8,34,0,8,matStone,3);
  box(-28,-5.6,-8,28,-5,8,matGrate,3);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(56,16,8,4),new THREE.MeshPhongMaterial({color:0x268eb4,specular:0xa8eaff,shininess:100,transparent:true,opacity:.74,depthWrite:false,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;water.position.set(0,-.12,0);LV.add(water);
  WATER_ZONES.push({x0:-28,x1:28,z0:-8,z1:8,surface:-.12});
  for(const x of [-13,13])addTempleBridge(x);
  // Stepped stone banks make the water basin explorable on foot.
  for(let i=0;i<9;i++){
    const top=-.5-i*.5,z0=-8+i*.8;box(-2.8,-5,z0,2.8,top,z0+.8,matStone,2);
    box(-2.8,-5,-z0-.8,2.8,top,-z0,matStone,2);
  }
  // Ruined temple platforms and broken columns on both banks.
  for(const s of [-1,1]){
    const z=s<0?-19:19;
    box(-9,0,z-4,9,.75,z+4,matStone,3);box(-7,.75,z-3,7,1.5,z+3,matPlate,2);
    for(const x of [-7,-3,3,7]){const h=(Math.abs(x)===7?3.8:5.2);box(x-.55,1.5,z-2.4,x+.55,h,z-1.3,matPillar,1);box(x-.55,1.5,z+1.3,x+.55,h,z+2.4,matPillar,1);}
    box(-5,1.5,z-3,-4.5,2.1,z+3,matTrim,1);box(4.5,1.5,z-3,5,2.1,z+3,matTrim,1);
    for(const x of [-23,23]){box(x-1,0,z-1,x+1,3.2,z+1,matStone,2);box(x-1.35,3.2,z-1.35,x+1.35,3.65,z+1.35,matTrim,2);}
  }
  // Hidden grotto behind a blue waterfall; the central altar holds mega-health.
  box(-4,0,-15,-3,4.8,-8.3,matStone);box(3,0,-15,4,4.8,-8.3,matStone);box(-4,4.4,-15,4,4.9,-8.3,matStone);
  const falls=new THREE.Mesh(new THREE.PlaneGeometry(6,4.4),new THREE.MeshBasicMaterial({color:0x48c8f2,transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide}));falls.position.set(0,2.2,-8.15);LV.add(falls);
  const altar=new THREE.Mesh(new THREE.OctahedronGeometry(.65,1),new THREE.MeshPhongMaterial({color:0x5caaff,emissive:0x2450cc,emissiveIntensity:.65}));altar.position.set(0,1.4,-12.5);LV.add(altar);
  const glow=new THREE.PointLight(0x40aaff,1.4,12,1);glow.position.set(0,2.6,-12);LV.add(glow);
  LV.add(new THREE.HemisphereLight(0x77aacc,0x263024,.72));const sun=new THREE.DirectionalLight(0xffdca0,.55);sun.position.set(-18,35,24);LV.add(sun);
}
function addRoofPad(from,to,apex,color=0x50d8ff){PADS.push({x:from.x,z:from.z,y:from.y,vel:padVel(from,to,apex)});const base=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.45,.2,12),new THREE.MeshLambertMaterial({color:0x293843,emissive:color,emissiveIntensity:.35}));base.position.set(from.x,from.y+.12,from.z);LV.add(base);const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.07,6,16),new THREE.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.set(from.x,from.y+.25,from.z);LV.add(ring);}
function buildMegapolis(){
  // Four separated rooftops above a neon-lit drop; the east tower has a ground-floor office.
  box(-34,-22,-18,-14,11.5,18,matWall,5);box(-34,11.5,-18,-14,12.2,18,matPlate,3);
  box(-34,12.2,-18,-14,13,-17,matTrim,2);box(-34,12.2,17,-14,13,18,matTrim,2);box(-34,12.2,-17,-33,13,17,matTrim,2);box(-15,12.2,-17,-14,13,17,matTrim,2);
  // East office tower: collision walls leave a wide south-facing entrance.
  box(12,-.5,-18,32,0,4,matFloor,3);box(12,-1,-18,12.8,8,-17.2,matWall);box(31.2,-1,-18,32,8,4,matWall);box(12,-1,-18,32,8,-17.2,matWall);
  box(12,-1,3.2,18,8,4,matWall);box(26,-1,3.2,32,8,4,matWall);box(18,6.5,3.2,26,8,4,matWall);
  box(12,8,-18,32,8.8,4,matPlate,3);mirrorFloor(12.8,-17.2,31.2,3.2,0,0xc8d8ff,.38);
  // Desks, partitions and luminous monitors make this lower floor a close-range combat route.
  for(const [x,z] of [[16,-12],[21,-12],[27,-12],[16,-5],[27,-5],[16,0],[27,0]]){box(x,0,z,x+2.2,1.05,z+.9,matCrate,2);const screen=new THREE.Mesh(new THREE.BoxGeometry(.9,.65,.08),new THREE.MeshBasicMaterial({color:(x+z)%2?0x38dfff:0xff4bce}));screen.position.set(x+1.1,1.65,z+.35);LV.add(screen);}
  box(19,0,-9,20,3,-6,matPillar,2);box(24,0,-9,25,3,-6,matPillar,2);
  // A small balcony connects the office doors to the open drop.
  box(17,-.2,4,27,.1,10.5,matGrate,2);box(17,.1,10.3,27,1.1,10.5,matTrim,1);box(17,.1,4,17.2,1.1,10.5,matTrim,1);box(26.8,.1,4,27,1.1,10.5,matTrim,1);
  // South tower and north rooftop are lower, giving the jump pads distinct arcs.
  box(-9,-18,10,11,9.5,30,matWall,5);box(-9,9.5,10,11,10.2,30,matPlate,3);
  box(-8,10.2,10,-7,10.8,30,matTrim,2);box(9,10.2,10,10,10.8,30,matTrim,2);
  box(-8,-16,-30,8,5.5,-14,matWall,5);box(-8,5.5,-30,8,6.2,-14,matPlate,3);
  // Rooftop cover, HVAC units, aerials and neon signs.
  for(const [x,y,z,w,d] of [[-29,12.2,-8,3,2],[-21,12.2,8,3,2],[20,8.8,-14,3,2],[26,8.8,-3,2,3],[-4,10.2,16,3,2],[6,10.2,25,2,3]])box(x,y,z,x+w,y+1.8,z+d,matCrate,2);
  for(const [x,y,z,c] of [[-24,15,-17,0xff40a0],[22,11.5,-17.5,0x40dfff],[0,9,-29.5,0xffc040]]){const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.5),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));sign.position.set(x,y,z);LV.add(sign);}
  for(const [x,z] of [[-30,14],[-18,-13],[29,0],[-3,28],[7,-25]]){box(x-.15,12.2,z-.15,x+.15,16,z+.15,matPillar,1);const lamp=new THREE.PointLight(0x40bfff,.8,14,1);lamp.position.set(x,16.4,z);LV.add(lamp);}
  const cable=(a,b,c)=>{const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,d.length(),5),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.62}));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UP,d.normalize());LV.add(m);};
  cable(new V3(-16,14,-4),new V3(14,11,-5),0x49dfff);cable(new V3(4,12,15),new V3(3,8,-17),0xff48bc);
  for(const [x,z,w,d,h] of [[-56,-38,14,14,42],[40,-48,16,20,58],[-53,18,18,16,50],[42,20,16,18,38]])box(x,-22,z,x+w,h,z+d,matWall,8,false);
  // Rain puddles on the rooftops reflect the neon.
  for(const [x,y,z,r] of [[-28,12.2,1,2.2],[-21,12.2,-11,1.6],[-25,12.2,12,1.8],[-4,10.2,22,1.9],[6,10.2,15,1.4],[-3,6.2,-23,1.7],[4,6.2,-18,1.2],[22,8.8,-10,2],[28,8.8,0,1.3]])puddle(x,z,y,r);
  addRoofPad(new V3(-17,12.2,0),new V3(19,8.8,-3),12,0xff52dc);
  addRoofPad(new V3(15,8.8,-8),new V3(2,10.2,18),9,0x44dfff);
  addRoofPad(new V3(0,10.2,12),new V3(0,6.2,-20),17,0xffc044);
  addRoofPad(new V3(0,6.2,-15),new V3(-22,12.2,-3),10,0x50e890);
  addRoofPad(new V3(22,0,7),new V3(22,8.8,0),13,0xff50bb);
  LV.add(new THREE.HemisphereLight(0x869ac4,0x17121e,.65));const moon=new THREE.DirectionalLight(0xa9caff,.42);moon.position.set(-25,45,12);LV.add(moon);
}
function buildGlacier(){
  // Snow-covered fortress walls surround a slick central crossing and a blue-lit ice cave.
  box(-32,-1,-32,32,0,32,matFloor,5);
  box(-35,-1,-35,35,10,-32,matStone);box(-35,-1,32,35,10,35,matStone);box(-35,-1,-32,-32,10,-5,matStone);box(-35,-1,5,-32,10,32,matStone);box(32,-1,-32,35,10,32,matStone);
  // Low, broken ramparts make a snowy fortress without sealing off the arena.
  for(const [x0,z0,x1,z1] of [[-27,-22,-6,-20],[6,-22,27,-20],[-27,20,-6,22],[6,20,27,22],[-27,-18,-25,-5],[-27,5,-25,18],[25,-18,27,18]])box(x0,0,z0,x1,4.8,z1,matStone,3);
  for(const [x,z] of [[-27,-22],[27,-22],[-27,22],[27,22]]){box(x-2,0,z-2,x+2,7,z+2,matPillar,2);box(x-2.5,7,z-2.5,x+2.5,7.8,z+2.5,matPlate,2);}
  // Broad ice patches are visible and physically slippery.
  for(const [x0,z0,x1,z1] of [[-15,-13,15,13],[-30,-16,-19,-7],[19,7,30,16]]){
    ICE_ZONES.push({x0,z0,x1,z1});const ice=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),new THREE.MeshPhongMaterial({color:0x9ad8ee,specular:0xffffff,shininess:130,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}));ice.rotation.x=-Math.PI/2;ice.position.set((x0+x1)/2,.025,(z0+z1)/2);LV.add(ice);mirrorFloor(x0,z0,x1,z1,0,0xc4ecff,.3);
  }
  for(const [x,z,h] of [[-12,-8,1.3],[12,-8,1.3],[-12,8,1.3],[12,8,1.3],[-21,13,2],[21,-13,2]])box(x-1.4,0,z-1,x+1.4,h,z+1,matCrate,2);
  // Cave entrance through the western glacier wall, with a blue cavern at the end.
  box(-32,0,-5,-22,5,-3.6,matStone);box(-32,0,3.6,-22,5,5,matStone);box(-32,4.5,-3.6,-22,5,3.6,matStone);
  box(-22,0,-7,-15,6,-6,matStone);box(-22,0,6,-15,6,7,matStone);box(-22,5.5,-6,-15,6,6,matStone);
  for(const [x,z] of [[-21,-5],[-21,5],[-17,-5],[-17,5]])box(x-.45,0,z-.45,x+.45,4.2,z+.45,matPillar,1);
  for(const [x,z] of [[-30,0],[-24,0],[-18,0]]){const glow=new THREE.PointLight(0x48aaff,1.1,13,1);glow.position.set(x,3,z);LV.add(glow);}
  const caveGlow=new THREE.Mesh(new THREE.OctahedronGeometry(1.1,1),new THREE.MeshPhongMaterial({color:0x55aaff,emissive:0x1640a0,emissiveIntensity:.8}));caveGlow.position.set(-18.5,2.1,0);LV.add(caveGlow);
  // Snow banks, ice shards, and blue cave lights.
  for(const [x,z,h] of [[-8,-25,3],[8,-25,2],[-8,25,2],[8,25,3],[-29,12,3],[29,-12,2]]){
    const shard=new THREE.Mesh(new THREE.ConeGeometry(1.2,h,5),new THREE.MeshPhongMaterial({color:0xc5e8f1,emissive:0x253f50,shininess:50}));shard.position.set(x,h/2,z);LV.add(shard);
  }
  LV.add(new THREE.HemisphereLight(0xc4e2f4,0x303d4a,.8));const sun=new THREE.DirectionalLight(0xc8e6ff,.5);sun.position.set(-20,42,16);LV.add(sun);
}
function addReactorSwitch(x,z){const p=new V3(x,0,z),base=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.8,.7),new THREE.MeshLambertMaterial({color:0x29313a}));base.position.set(x,.9,z);LV.add(base);const button=new THREE.Mesh(new THREE.BoxGeometry(.32,.32,.12),new THREE.MeshBasicMaterial({color:0x50e88a}));button.position.set(x,.95,z+.42);LV.add(button);const light=new THREE.PointLight(0x50e88a,.7,6,1);light.position.set(x,1.5,z+.4);LV.add(light);REACTOR.switches.push(p);REACTOR.lights.push({light,normal:.7});}
function buildReactor(){
  REACTOR.timer=120;REACTOR.dark=false;REACTOR.switches.length=0;REACTOR.lights.length=0;REACTOR.ambient=null;REACTOR.sun=null;REACTOR.core=null;REACTOR.coreLight=null;
  box(-32,-1,-32,32,0,32,matFloor,4);box(-35,-1,-35,35,12,-32,matWall);box(-35,-1,32,35,12,35,matWall);box(-35,-1,-32,-32,12,32,matWall);box(32,-1,-32,35,12,32,matWall);
  // The central containment hall has four doors and a pulsing reactor core.
  box(-10,0,-10,-9,7,-3,matStone);box(-10,0,3,-9,7,10,matStone);box(9,0,-10,10,7,-3,matStone);box(9,0,3,10,7,10,matStone);
  box(-9,0,-10,-3,7,-9,matStone);box(3,0,-10,9,7,-9,matStone);box(-9,0,9,-3,7,10,matStone);box(3,0,9,9,7,10,matStone);
  box(-3,0,-3,3,.7,3,matPillar,2);mirrorFloor(-9,-9,9,9,0,0xffd2c8,.38);
  const core=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.8,4.8,8),new THREE.MeshPhongMaterial({color:0x8e3020,emissive:0xff2608,emissiveIntensity:.75,shininess:80}));core.position.set(0,3.2,0);LV.add(core);REACTOR.core=core;
  const coreRing=new THREE.Mesh(new THREE.TorusGeometry(3.4,.12,6,24),new THREE.MeshBasicMaterial({color:0xff5020}));coreRing.rotation.x=Math.PI/2;coreRing.position.y=.8;LV.add(coreRing);
  REACTOR.coreLight=new THREE.PointLight(0xff3218,1.8,28,1);REACTOR.coreLight.position.set(0,4,0);LV.add(REACTOR.coreLight);REACTOR.lights.push({light:REACTOR.coreLight,normal:1.8});
  // Low service ducts wrap around the containment hall and join the outer lanes.
  for(const s of [-1,1]){
    box(s<0?-25:10,0,-3.2,s<0?-10:25,.15,3.2,matGrate,2);
    box(s<0?-25:10,0,-3.5,s<0?-10:25,2.6,-3,matTrim,1);box(s<0?-25:10,0,3,s<0?-10:25,2.6,3.5,matTrim,1);
    box(s<0?-25:10,2.6,-3.5,s<0?-10:25,3,3.5,matPillar,2);
    box(-3,0,s<0?-25:10,3,.15,s<0?-10:25,matGrate,2);
    box(-3.5,0,s<0?-25:10,-3,2.6,s<0?-10:25,matTrim,1);box(3,0,s<0?-25:10,3.5,2.6,s<0?-10:25,matTrim,1);
    box(-3.5,2.6,s<0?-25:10,3.5,3,s<0?-10:25,matPillar,2);
  }
  for(const [x,z] of [[-20,-18],[-20,18],[20,-18],[20,18]])box(x-1.8,0,z-1.8,x+1.8,2.4,z+1.8,matCrate,2);
  // Four wall consoles control the arena lighting.
  for(const [x,z] of [[-27,0],[27,0],[0,-27],[0,27]])addReactorSwitch(x,z);
  const ventLamp=new THREE.PointLight(0x4cbfff,.45,18,1);ventLamp.position.set(-17,2,0);LV.add(ventLamp);REACTOR.lights.push({light:ventLamp,normal:.45});
  const ventLamp2=new THREE.PointLight(0x4cbfff,.45,18,1);ventLamp2.position.set(17,2,0);LV.add(ventLamp2);REACTOR.lights.push({light:ventLamp2,normal:.45});
  REACTOR.ambient=new THREE.HemisphereLight(0x8292a8,0x20252b,.75);LV.add(REACTOR.ambient);REACTOR.sun=new THREE.DirectionalLight(0xc1d2e5,.38);REACTOR.sun.position.set(-24,38,16);LV.add(REACTOR.sun);
  REACTOR.lights.push({light:REACTOR.ambient,normal:.75},{light:REACTOR.sun,normal:.38});
}
function setReactorDark(dark,notify=true){if(REACTOR.dark===dark)return;REACTOR.dark=dark;for(const x of REACTOR.lights)x.light.intensity=x.normal*(dark?(x.light===REACTOR.coreLight?1.5:.08):1);if(notify)nev({t:'rd',d:dark?1:0});pickMsg(dark?'АВАРИЙНОЕ ОСВЕЩЕНИЕ':'ОСВЕЩЕНИЕ ВКЛЮЧЕНО');}
function useReactorSwitch(e,i){if(curMap!==7||!e.alive)return false;const p=REACTOR.switches[i];if(!p||e.pos.distanceTo(p)>3.4)return false;setReactorDark(!REACTOR.dark);return true;}
function requestReactorSwitch(){if(curMap!==7)return;let best=-1,bd=3.4;for(let i=0;i<REACTOR.switches.length;i++){const d=player.pos.distanceTo(REACTOR.switches[i]);if(d<bd){bd=d;best=i;}}if(best<0){pickMsg('ПОДОЙДИ К ПАНЕЛИ · E');return;}if(isClient())netSend({t:'rsw',i:best});else useReactorSwitch(player,best);}
function updateReactor(dt){if(curMap!==7||isClient()||state!=='play')return;REACTOR.timer-=dt;if(REACTOR.timer<=5&&REACTOR.timer+dt>5){nev({t:'rw'});if(player.alive)pickMsg('РЕАКТОР ЗАРЯЖАЕТСЯ — УХОДИ ИЗ ЦЕНТРА!');playSnd('thunder');}if(REACTOR.timer<=0){for(const e of ents)if(e.alive&&Math.hypot(e.pos.x,e.pos.z)<13)damage(e,55,null,REACTOR_DAMAGE);nev({t:'rp'});flashLight(new V3(0,4,0),0xff3018,.45,4,32);playSnd('thunder');REACTOR.timer=120;}}

let NODES=[],ADJ=[],SPAWNS=[];
function setNodes(arr){NODES=arr.map(a=>new V3(a[0],a[1],a[2]));ADJ=NODES.map(()=>[]);}
function link(a,b,one){ADJ[a].push(b);if(!one)ADJ[b].push(a);}
function navBastion(){

/* ---------- nav graph ---------- */
setNodes([[0,0,16],[16,0,16],[16,0,0],[16,0,-16],[0,0,-16],[-16,0,-16],[-16,0,0],[-16,0,16],
 [0,3,3.5],[0,3,-3.5],[4.5,3,0],[-4.5,3,0],[0,3,0],
 [19,0,19],[19,0,-19],[-19,0,-19],[-19,0,19],
 [26,7,26],[26,7,-26],[-26,7,-26],[-26,7,26],[0,7,26],[0,7,-26],
 [28,0,0],[-28,0,0],[0,0,30],[0,0,-30]]);
for(let i=0;i<8;i++)link(i,(i+1)%8);
link(0,8);link(4,9);for(const n of [8,9,10,11])link(n,12);link(8,10);link(10,9);link(9,11);link(11,8);link(10,2,1);link(11,6,1);
link(1,13,1);link(13,17,1);link(3,14,1);link(14,18,1);link(5,15,1);link(15,19,1);link(7,16,1);link(16,20,1);
link(17,21);link(21,20);link(18,22);link(22,19);link(17,1,1);link(18,3,1);link(19,5,1);link(20,7,1);
link(23,1);link(23,3);link(24,5);link(24,7);link(0,25);link(1,25);link(7,25);link(4,26);link(3,26);link(5,26);
return [0,1,2,3,4,5,6,7,17,18,19,20,21,22,23,24,25,26];}
function navFoundry(){
  const E=[[8,0,12],[8,0,-12],[20,0,12],[20,0,-12],[27,0,0],[14,3,0],[30,0,16],[30,0,-16],[40,5,16],[40,5,-16],[40,5,0],[28,0,22],[28,0,-22]];
  setNodes([[0,0,12],[0,0,-12],[0,3,0],...E,...E.map(p=>[-p[0],p[1],p[2]])]);
  const sp=[];
  for(const o of [3,16]){const l=i=>o+i;
    link(0,l(0));link(1,l(1));link(l(0),l(2));link(l(1),l(3));link(l(0),l(1));link(l(2),l(4));link(l(3),l(4));link(l(4),l(5));link(l(5),2);
    link(l(5),l(0),1);link(l(5),l(1),1);link(l(2),l(6));link(l(3),l(7));link(l(6),l(8),1);link(l(7),l(9),1);link(l(8),l(10));link(l(10),l(9));
    link(l(8),l(2),1);link(l(9),l(3),1);link(l(2),l(11));link(l(3),l(12));
    for(const i of [0,1,2,3,4,5,8,9,10,11,12])sp.push(l(i));}
  return sp;}
function navOrbit(){
  setNodes([[3,0,3],[12,0,0],[29,0,0],[-12,0,0],[-29,0,0],[0,0,12],[0,0,29],[0,0,-12],[0,0,-29],[0,4,0],
    [24,0,0],[-24,0,0],[0,0,24],[0,0,-24]]);
  for(const i of [1,3,5,7])link(0,i);
  link(1,2);link(3,4);link(5,6);link(7,8);
  link(9,0,true);
  link(2,10);link(4,11);link(6,12);link(8,13);
  return [0,2,4,6,8];
}
function navTraining(){
  // Nodes 1/2 and 23/24 flank the rusty blocks at x=±12 (a node inside a block used to trap bots there).
  setNodes([[0,0,0],[-12,0,-2.6],[12,0,-2.6],[-23,0,0],[23,0,0],[-25,0,-6],[-25,0,6],[25,0,-6],[25,0,6],[-12,0,-13],[12,0,-13],[-12,0,13],[12,0,13],[-27,0,0],[27,0,0],[-6,0,-12],[6,0,-12],[-6,0,12],[6,0,12],[-27,0,-4],[-27,0,4],[27,0,-4],[27,0,4],[-12,0,2.6],[12,0,2.6]]);
  for(const n of [1,2,9,10,11,12,15,16,17,18,23,24])link(0,n);
  link(1,3);link(23,3);link(3,5);link(3,6);link(5,13);link(6,13);link(13,19);link(13,20);link(2,4);link(24,4);link(4,7);link(4,8);link(7,14);link(8,14);link(14,21);link(14,22);
  link(1,9);link(23,11);link(2,10);link(24,12);link(9,10);link(11,12);link(15,16);link(17,18);
  return [19,20,21,22];
}
function navTemple(){
    // Platform nodes stand on the raised plates between the pillar rows; the river can only be crossed on the bridges
  // or through the riverbed and the central stairs, and the bridges drop you into the river one way.
  setNodes([[0,0,-12.5],[0,1.5,-19],[0,1.5,19],[-12,0,-19],[12,0,-19],[-12,0,19],[12,0,19],[-24,0,-16.5],[24,0,-16.5],[-24,0,16.5],[24,0,16.5],[-13,0,0],[13,0,0],[-26,-5,0],[26,-5,0],[-5,-4.5,0],[5,-4.5,0],[0,-5,0]]);
  link(0,1);link(1,3);link(1,4);link(3,7);link(4,8);link(9,5);link(10,6);link(5,2);link(6,2);
  link(3,11);link(4,12);link(11,13,true);link(12,14,true);link(11,5);link(12,6);link(13,15);link(14,16);link(15,16);link(15,17);link(16,17);link(17,0);link(17,2);
  return [7,8,9,10];
}
function navMegapolis(){
  setNodes([[-25,12.2,0],[-17,12.2,0],[15,8.8,-8],[23,8.8,-8],[0,10.2,12],[0,10.2,22],[0,6.2,-15],[0,6.2,-23],[22,0,-8],[22,0,2],[-25,12.2,-11],[-4,10.2,15],[4,6.2,-16],[17,0,-2],[22,0,7],[-30,12.2,8],[30,8.8,-5],[0,10.2,27],[0,6.2,-27]]);
  // Pad flights are one-way; the office roof drops down onto the grate in front of the entrance.
  link(0,1);link(1,2,true);link(2,3);link(8,13);link(13,9);link(9,14,true);link(14,16,true);
  link(2,4,true);link(4,5);link(4,11);link(4,6,true);link(6,7);link(6,12);link(7,12);link(6,1,true);link(0,10);link(10,1);link(16,3);link(15,0);link(15,10);link(17,5);link(18,7);
  return [0,3,5,7,15,16];
}
function navGlacier(){
  setNodes([[0,0,0],[0,0,-15],[0,0,15],[-20,0,0],[20,0,0],[-27,0,0],[-22,0,0],[-18,0,-10],[18,0,-10],[-18,0,10],[18,0,10],[-22,0,-15],[22,0,-15],[-22,0,15],[22,0,15],[-16,0,0],[0,0,-28],[0,0,28],[-8,0,-26],[8,0,-26],[-8,0,26],[8,0,26],[17.5,0,-15.5],[-17.5,0,15.5]]);
  for(const n of [1,2,3,4,15])link(0,n);
  link(3,5);link(5,6);link(6,15);link(1,7);link(7,11);link(11,12);link(4,8);link(8,22);link(22,12);link(2,9);link(9,23);link(23,13);link(13,14);link(2,10);link(10,14);link(7,8);link(9,10);link(1,16);link(2,17);link(16,18);link(16,19);link(17,20);link(17,21);link(18,19);link(20,21);
  return [7,8,9,10];
}
function navReactor(){
  setNodes([[0,0,0],[0,0,-13],[0,0,13],[-13,0,0],[13,0,0],[-20,0,0],[20,0,0],[0,0,-20],[0,0,20],[-22,0,-22],[22,0,-22],[-22,0,22],[22,0,22],[-27,0,0],[27,0,0],[0,0,-27],[0,0,27],[-8,0,-27],[8,0,-27],[-8,0,27],[8,0,27],[-27,0,-12],[27,0,12]]);
  for(const n of [1,2,3,4])link(0,n);
  link(3,5);link(5,13);link(13,9);link(13,11);link(4,6);link(6,14);link(14,10);link(14,12);
  link(1,7);link(7,15);link(15,9);link(15,10);link(2,8);link(8,16);link(16,11);link(16,12);
  link(13,3);link(14,4);link(15,1);link(16,2);
  link(15,17);link(15,18);link(16,19);link(16,20);link(13,21);link(14,22);
  return [9,10,11,12];
}
function buildGhostShip(){
  SHIP.timer=28;SHIP.waveT=0;SHIP.waveId=0;SHIP.waveMesh=null;
  // Dark water surrounds a long, narrow freighter; falling below the hull is fatal.
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(240,240,1,1),new THREE.MeshPhongMaterial({color:0x101f2a,specular:0x385365,shininess:75}));sea.rotation.x=-Math.PI/2;sea.position.y=-13;LV.add(sea);
  box(-28,-4,-17,28,-3,17,matRust,4);box(-29,-3,-18,-28,4,18,matRust,3);box(28,-3,-18,29,4,18,matRust,3);
  box(-28,-3,-18,28,4,-17,matRust,3);box(-28,-3,17,28,4,18,matRust,3);
  // Deck is divided around two hatch openings that lead into the cramped lower hold.
  box(-30,3,-19,-8,4,19,matRust,4);box(-3,3,-19,30,4,19,matRust,4);
  box(-8,3,-19,-3,4,-9,matRust,3);box(-8,3,9,-3,4,19,matRust,3);
  // Storm water pools on the deck plates.
  for(const [x,z,r] of [[-20,-8,2.2],[-14,11,1.6],[-24,6,1.3],[6,-12,2],[14,7,1.8],[22,-4,1.5],[2,13,1.2]])puddle(x,z,4,r);
  box(-8,-2,-9,-3,-1,9,matGrate,2);box(-8,-2,-10,-3,1,-9,matRust,2);box(-8,-2,9,-3,1,10,matRust,2);
  box(-25,-1,-6,-24,2,6,matRust,2);box(23,-1,-6,24,2,6,matRust,2);
  // Raised bridge and stern cabin create distinct high ground and sniper sight lines.
  box(-27,4,-7,-15,4.6,7,matPlate,3);box(-26,4.6,-6,-16,12,6,matRust,3);
  box(-24,12,-5,-18,12.5,5,matPlate,2);box(-23,12.5,-1,-21,19,1,matRust,2);
  box(16,4,-8,28,4.6,8,matPlate,3);box(17,4.6,-7,27,11,7,matRust,3);
  // Cargo containers form cover lanes but leave the deck exposed to the storm surge.
  for(const [x,z,w,d,h] of [[-10,-15,9,5,4],[3,-14,9,6,4],[12,-4,8,5,3],[-18,10,8,5,3],[0,13,8,5,4]]){
    box(x,4,z,x+w,4+h,z+d,matRust,2);for(let k=1;k<4;k++)box(x+k*w/4,4.2,z,x+k*w/4+.08,3.9+h,z+d,matTrim,1,false);
  }
  // Partial rails frame the deck while leaving gaps where a hard wave can sweep people overboard.
  for(const z of [-19,19])for(const [x0,x1] of [[-30,-18],[-13,-6],[2,12],[20,30]]){box(x0,4,z-.18,x1,5,z+.18,matTrim,2);for(let x=x0+2;x<x1;x+=4)box(x-.12,4,z-.22,x+.12,5.5,z+.22,matRust,1);}
  for(const x of [-30,30])for(const [z0,z1] of [[-19,-10],[-3,6],[13,19]])box(x-.18,4,z0,x+.18,5,z1,matTrim,2);
  // Rusted masts, rigging and flood lamps mark the exposed upper deck.
  for(const [x,z,h] of [[-14,0,17],[10,2,14],[25,-12,12]]){
    box(x-.35,4,z-.35,x+.35,4+h,z+.35,matRust,1);
    box(x-4,4+h*.7,z-.18,x+4,4+h*.7+.28,z+.18,matTrim,1);
    const lamp=new THREE.PointLight(0xffb66a,.55,15,1);lamp.position.set(x,4+h,z);LV.add(lamp);
  }
  for(const [x,z] of [[-24,-13],[-21,14],[6,8],[26,12]]){box(x-.5,4,z-.5,x+.5,8,z+.5,matPillar,1);const glow=new THREE.PointLight(0xff6840,.45,9,1);glow.position.set(x,8.5,z);LV.add(glow);}
  const waveMat=new THREE.MeshBasicMaterial({color:0x79d8ea,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});
  SHIP.waveMesh=new THREE.Mesh(new THREE.PlaneGeometry(64,6),waveMat);SHIP.waveMesh.rotation.x=-Math.PI/2;SHIP.waveMesh.position.set(0,4.3,-24);SHIP.waveMesh.visible=false;LV.add(SHIP.waveMesh);
  // Jump pads up to the bridge roof and the stern cabin roof (sniper perches).
  addRoofPad(new V3(-13,4,-4),new V3(-21,12.5,-3),12,0xff8040);
  addRoofPad(new V3(13,4,-6),new V3(21,11,-3),11,0xff8040);
  // The hold used to be a pit with no way out: steps up to the hatch grate and a pad back onto the deck.
  box(-3,-3,-1.5,-2,-2,1.5,matRust,1);box(-9,-3,-1.5,-8,-2,1.5,matRust,1);
  addRoofPad(new V3(-5.5,-1,-6),new V3(-11,4,-7),7,0x50d8ff);
  LV.add(new THREE.HemisphereLight(0x718493,0x171a20,.62));const storm=new THREE.DirectionalLight(0x9aacba,.34);storm.position.set(-20,38,18);LV.add(storm);
}
function navGhostShip(){
  // Deck lanes run around the open hatch and the containers; 5 is the hatch grate (mega), 26 its pad back up, 24 the hold floor.
  setNodes([[-28.5,4,-9],[-19,4,-12],[-19,4,12],[-12,4,0],[-5,4,-17],[-5.5,-1,0],[2,4,11],[8,4,-2],[15,4,12],[14.5,4,4.5],[23,4,-13],[0,4,-17.5],[-5,4,12],[-21,12.5,-3],[21,11,-3],[-14,4,-8],[10,4,9],[-28.5,4,9],[-13,4,-4],[13,4,-6],
    [-12,4,-17],[1,4,-6],[-12,4,8.5],[-19,4,8],[2,-3,0],[14,4,-10],[-5.5,-1,-6]]);
  link(0,1);link(0,17);link(17,2);link(0,15);link(1,15);link(1,20);link(20,15);link(20,4);link(4,11);link(11,21);link(21,7);link(11,10);link(10,25);link(25,19);link(25,7);
  link(7,19);link(7,16);link(16,8);link(16,9);link(9,8);link(7,9);link(7,6);link(6,12);link(12,22);link(22,3);link(22,23);link(23,2);link(3,15);
  link(18,3);link(18,15);link(18,13,true);link(13,18,true);link(19,14,true);link(14,19,true);
  link(5,26,true);link(26,15,true);link(24,5,true);
  return [1,2,4,6,8,10,13,14];
}
function buildCubeLab(){
  const floor=M(texPillar,0x68717a),wall=M(texStone,0x66717b),edge=M(texTrim,0x98b8c8),glow=new THREE.MeshBasicMaterial({color:0x45d9ff});
  // Six sealed chambers meet at narrow portals; each chamber has its own cardinal gravity.
  box(-6,-6,-6,6,-2.2,6,floor,3);box(-6,5.4,-6,-2.2,6,6,wall,3);box(2.2,5.4,-6,6,6,6,wall,3);box(-2.2,5.4,-6,2.2,6,-2.2,wall,2);box(-2.2,5.4,2.2,2.2,6,6,wall,2);
  const xWall=(x,door=true)=>{box(x-.3,-6,-6,x+.3,door?-2.2:6,6,wall,2);if(door){box(x-.3,2.2,-6,x+.3,6,6,wall,2);box(x-.3,-2.2,-6,x+.3,2.2,-2.2,wall,2);box(x-.3,-2.2,2.2,x+.3,2.2,6,wall,2);}};
  const zWall=(z,door=true)=>{box(-6,-6,z-.3,door?-2.2:6,6,z+.3,wall,2);if(door){box(2.2,-6,z-.3,6,6,z+.3,wall,2);box(-2.2,-6,z-.3,2.2,-2.2,z+.3,wall,2);box(-2.2,2.2,z-.3,2.2,6,z+.3,wall,2);}};
  xWall(-6);xWall(6);zWall(-6);zWall(6);
  // East and west rooms: gravity pulls toward their outer side walls.
  for(const [a,b] of [[6,18],[-18,-6]]){
    box(a,-6,-6,b, -5.4,6,floor,3);box(a,5.4,-6,b,6,6,wall,3);
    for(const x of [a,b]){const isInner=(x===6||x===-6);if(isInner)continue;box(x-.3,-6,-6,x+.3,6,6,wall,2);}
    for(const z of [-6,6]){box(a,-6,z-.3,b,6,z+.3,wall,2);}
    const inner=a===6?6:-6; // The shared wall has a doorway aligned to the hub.
    if(a===6){box(5.7,-6,-6,6.3,-2.2,6,wall,2);box(5.7,2.2,-6,6.3,6,6,wall,2);box(5.7,-2.2,-6,6.3,2.2,-2.2,wall,2);box(5.7,-2.2,2.2,6.3,2.2,6,wall,2);}
    else{box(-6.3,-6,-6,-5.7,-2.2,6,wall,2);box(-6.3,2.2,-6,-5.7,6,6,wall,2);box(-6.3,-2.2,-6,-5.7,2.2,-2.2,wall,2);box(-6.3,-2.2,2.2,-5.7,2.2,6,wall,2);}
    for(const [z,y] of [[-4,-4],[4,4]]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.08,.12,3),glow);stripe.position.set((a+b)/2,y,z);LV.add(stripe);}
  }
  // North and south chambers are joined through matching apertures in the hub walls.
  for(const [a,b] of [[-18,-6],[6,18]]){
    box(-6,-6,a,6,-5.4,b,floor,3);box(-6,5.4,a,6,6,b,wall,3);
    for(const x of [-6,6])box(x-.3,-6,a,x+.3,6,b,wall,2);
    const outer=a===-18?a:b;box(-6,-6,outer-.3,6,6,outer+.3,wall,2);
    const inner=a===-18?-6:6;
    if(a===-18){box(-6,-6,-6,6,-2.2,-5.7,wall,2);box(-6,2.2,-6,6,6,-5.7,wall,2);box(-6,-2.2,-6,-2.2,2.2,-5.7,wall,2);box(2.2,-2.2,-6,6,2.2,-5.7,wall,2);}
    else{box(-6,-6,5.7,6,-2.2,6,wall,2);box(-6,2.2,5.7,6,6,6,wall,2);box(-6,-2.2,5.7,-2.2,2.2,6,wall,2);box(2.2,-2.2,5.7,6,2.2,6,wall,2);}
    for(const [x,y] of [[-4,-4],[4,4]]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(3,.12,.08),glow);stripe.position.set(x,y,(a+b)/2);LV.add(stripe);}
  }
  // A raised ceiling chamber is reachable through a central jump pad.
  box(-6,6,-6,-2.2,6.3,6,wall,2);box(2.2,6,-6,6,6.3,6,wall,2);box(-2.2,6,-6,2.2,6.3,-2.2,wall,2);box(-2.2,6,2.2,2.2,6.3,6,wall,2);
  box(-6,17.4,-6,6,18,6,wall,3);box(-6,6,-6,-5.7,18,6,wall,2);box(5.7,6,-6,6,18,6,wall,2);box(-6,6,-6,6,18,-5.7,wall,2);box(-6,6,5.7,6,18,6,wall,2);
  for(const [x,z] of [[-4,-4],[4,-4],[-4,4],[4,4]])box(x-.3,6,z-.3,x+.3,16,z+.3,edge,1);
  // Oriented jump pads: the hub pad lifts you into the ceiling chamber, every other chamber's pad throws you back to the hub.
  const cubePad=(pos,up,vel)=>{const q=new THREE.Quaternion().setFromUnitVectors(UP,up);const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.6,.24,10),new THREE.MeshLambertMaterial({color:0x263a45,emissive:0x1aa6cf,emissiveIntensity:.8}));pad.quaternion.copy(q);pad.position.copy(pos).addScaledVector(up,.15);LV.add(pad);const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.08,6,16),glow);ring.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new V3(1,0,0),Math.PI/2));ring.position.copy(pos).addScaledVector(up,.3);LV.add(ring);PADS.push({x:pos.x,y:pos.y,z:pos.z,pos:pos.clone(),up:up.clone(),vel});};
  cubePad(new V3(0,-2.2,0),new V3(0,1,0),new V3(0,28,0));
  cubePad(new V3(0,17.4,0),new V3(0,-1,0),new V3(2.5,-26,0));
  cubePad(new V3(17.7,0,0),new V3(-1,0,0),new V3(-26.5,0,0));
  cubePad(new V3(-17.7,0,0),new V3(1,0,0),new V3(26.5,0,0));
  cubePad(new V3(0,0,-17.7),new V3(0,0,1),new V3(0,0,26.5));
  cubePad(new V3(0,0,17.7),new V3(0,0,-1),new V3(0,0,-26.5));
  // Luminous edge beams outline the enclosing cube and frame its six gravity chambers.
  const frameMat=new THREE.MeshBasicMaterial({color:0x506f80});
  for(const y of [-21,21])for(const z of [-21,21]){const m=new THREE.Mesh(new THREE.BoxGeometry(42,.22,.22),frameMat);m.position.set(0,y,z);LV.add(m);}
  for(const x of [-21,21])for(const z of [-21,21]){const m=new THREE.Mesh(new THREE.BoxGeometry(.22,42,.22),frameMat);m.position.set(x,0,z);LV.add(m);}
  for(const x of [-21,21])for(const y of [-21,21]){const m=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,42),frameMat);m.position.set(x,y,0);LV.add(m);}
  for(const [x,y,z] of [[-22,0,0],[22,0,0],[0,0,-22],[0,0,22],[0,-22,0],[0,22,0]]){const frame=new THREE.Mesh(new THREE.BoxGeometry(3,3,3),new THREE.MeshPhongMaterial({color:0x26343e,emissive:0x10202a,shininess:80}));frame.position.set(x,y,z);LV.add(frame);}
  LV.add(new THREE.HemisphereLight(0xb6d9e8,0x1b2530,.82));const key=new THREE.DirectionalLight(0xd0ecff,.58);key.position.set(-20,32,24);LV.add(key);
}
function navCubeLab(){
  // 0 hub pad; 1-4 hub door sills (W,E,N,S); then per chamber: two floor nodes + its return pad; 17-19 ceiling chamber.
  setNodes([[0,-2.2,0],[-4.5,-2.2,0],[4.5,-2.2,0],[0,-2.2,-4.5],[0,-2.2,4.5],[17.7,0,-3],[17.7,0,3],[17.7,0,0],[-17.7,0,-3],[-17.7,0,3],[-17.7,0,0],[3,0,-17.7],[-3,0,-17.7],[0,0,-17.7],[3,0,17.7],[-3,0,17.7],[0,0,17.7],[-3,17.4,0],[3,17.4,0],[0,17.4,0]]);
  CUBE_NODE_UP=NODES.map(n=>cubeUpAt(n));
  link(1,3);link(3,2);link(2,4);link(4,1);
  for(const h of [1,2,3,4])link(h,0,true);
  link(0,17,true);link(0,18,true);link(17,19,true);link(18,19,true);link(19,2,true);
  for(const [door,a,b,pad] of [[2,5,6,7],[1,8,9,10],[3,11,12,13],[4,14,15,16]]){link(door,a,true);link(door,b,true);link(a,pad,true);link(b,pad,true);link(pad,door,true);}
  return [5,6,8,9,11,12,14,15,17,18];
}
function updateGhostShip(dt){
  if(curMap!==8||isClient()||state!=='play')return;
  SHIP.timer-=dt;
  if(SHIP.timer<=3&&SHIP.timer+dt>3){nev({t:'swarn'});if(player.alive)pickMsg('ШТОРМОВАЯ ВОЛНА! ДЕРЖИСЬ!');playSnd('thunder');}
  if(SHIP.timer<=0){SHIP.timer=32;SHIP.waveT=4;SHIP.waveId++;nev({t:'sw',i:SHIP.waveId});flashLight(new V3(0,14,0),0xcdeeff,.12,3,70);}
  advanceGhostWave(dt,true);
}
function advanceGhostWave(dt,applyForce){
  if(SHIP.waveT<=0)return;SHIP.waveT=Math.max(0,SHIP.waveT-dt);const z=-22+(4-SHIP.waveT)*11.5;
  if(SHIP.waveMesh){SHIP.waveMesh.visible=true;SHIP.waveMesh.position.z=z;SHIP.waveMesh.material.opacity=.26+SHIP.waveT*.055;if(SHIP.waveT===0)SHIP.waveMesh.visible=false;}
  if(!applyForce||SHIP.waveT<=0)return;
  for(const e of ents)if(e.alive&&Math.abs(e.pos.y-4)<2&&Math.abs(e.pos.z-z)<2.5&&e.shipWaveId!==SHIP.waveId){e.shipWaveId=SHIP.waveId;e.vel.z+=14;e.grounded=false;for(let k=0;k<9;k++)emit(e.pos.clone().add(new V3((R()-.5)*2,1,(R()-.5)*2)),new V3((R()-.5)*2,2+R()*3,3+R()*5),0x9cecff,.09,.5);}
}
const MAPS=[
 {name:'БАСТИОН',fog:0x241228,near:30,far:150,sky:0xffffff,build:buildBastion,nav:navBastion,pickups(){
   addPickup('health',2,20);addPickup('health',6,20);addPickup('health',0,20);addPickup('health',4,20);addPickup('health',23,20);addPickup('health',24,20);
   addPickup('mega',22,35);addPickup('armor',21,30);addPickup('w3',12,20);addPickup('w2',17,20);addPickup('w2',19,20);addPickup('w4',8,20);
   addPickup('ammo',18,18);addPickup('ammo',20,18);addPickup('ammo',25,18);addPickup('ammo',26,18);
   for(const [t,n,r] of [['double',8,45],['invis',10,40],['speed',13,32],['shield',14,45],['jet',21,48],['regen',22,38]])addPickup(t,n,r);addPickup('w5',9,35);addPickup('w6',15,30);}},
 {name:'ЛИТЕЙНЯ',fog:0x2a120c,near:25,far:130,sky:0xffa080,build:buildFoundry,nav:navFoundry,pickups(){
   addPickup('armor',0,30);addPickup('mega',1,35);addPickup('w3',2,20);addPickup('w2',13,20);addPickup('w2',26,20);addPickup('w4',21,20);
   for(const i of [5,6,18,19])addPickup('health',i,20);for(const i of [11,25,7,20])addPickup('ammo',i,18);
   for(const [t,n,r] of [['double',8,45],['invis',10,40],['speed',13,32],['shield',14,45],['jet',21,48],['regen',22,38]])addPickup(t,n,r);addPickup('w5',16,35);addPickup('w6',23,30);}},
 {name:'ОРБИТА',fog:0x080b18,near:34,far:190,sky:0xffffff,gravity:G/3,build:buildOrbit,nav:navOrbit,pickups(){
   addPickup('health',0,20);addPickup('armor',10,30);addPickup('w2',11,20);addPickup('w3',12,20);addPickup('health',13,20);addPickup('mega',9,35);addPickup('w4',2,20);
   for(const i of [1,3,5,7])addPickup('ammo',i,18);
   for(const [t,n,r] of [['double',2,45],['invis',4,40],['speed',6,32],['shield',8,45],['jet',10,48],['regen',12,38]])addPickup(t,n,r);addPickup('w5',11,35);addPickup('w6',13,30);}},
 {name:'ТРЕНИРОВОЧНЫЙ ПОЛИГОН',fog:0x151923,near:28,far:105,sky:0xffffff,build:buildTraining,nav:navTraining,pickups(){
   addPickup('w2',5,20);addPickup('w2',7,20);addPickup('w4',6,20);addPickup('w4',8,20);addPickup('w3',0,25);addPickup('w5',3,25);addPickup('w5',4,25);
   addPickup('health',9,18);addPickup('health',10,18);addPickup('armor',11,28);addPickup('armor',12,28);addPickup('ammo',13,16);addPickup('ammo',14,16);
   for(const [t,n,r] of [['double',1,45],['double',2,45],['speed',15,35],['speed',16,35],['shield',17,45],['shield',18,45]])addPickup(t,n,r);}},
 {name:'ХРАМ',fog:0x123044,near:24,far:105,sky:0x9ab7c8,build:buildTemple,nav:navTemple,pickups(){
   addPickup('mega',0,60);addPickup('w2',7,20);addPickup('w2',8,20);addPickup('w3',1,25);addPickup('w4',3,20);addPickup('w4',4,20);addPickup('w5',5,25);addPickup('w5',6,25);
   addPickup('health',9,18);addPickup('health',10,18);addPickup('armor',1,28);addPickup('armor',2,28);addPickup('ammo',11,16);addPickup('ammo',12,16);
   for(const [t,n,r] of [['double',3,45],['double',4,45],['speed',13,35],['speed',14,35],['shield',15,45],['shield',16,45]])addPickup(t,n,r);}},
 {name:'МЕГАПОЛИС: КРЫШИ',fog:0x101526,near:32,far:155,sky:0x7685a8,build:buildMegapolis,nav:navMegapolis,pickups(){
   addPickup('w2',0,20);addPickup('w2',3,20);addPickup('w3',5,25);addPickup('w3',7,25);addPickup('w4',8,22);addPickup('w4',13,22);addPickup('w5',4,26);addPickup('w6',2,28);
   addPickup('health',9,18);addPickup('health',14,18);addPickup('armor',1,30);addPickup('armor',16,30);addPickup('ammo',10,16);addPickup('ammo',12,16);
   for(const [t,n,r] of [['double',17,45],['invis',15,40],['speed',16,35],['shield',11,45],['jet',6,48],['regen',18,38]])addPickup(t,n,r);}},
 {name:'ЛЕДНИК',fog:0x8093a4,near:3,far:30,sky:0xa8bdcc,build:buildGlacier,nav:navGlacier,pickups(){
   addPickup('mega',15,60);addPickup('w2',11,20);addPickup('w2',12,20);addPickup('w3',1,25);addPickup('w3',2,25);addPickup('w4',7,22);addPickup('w4',8,22);addPickup('w5',9,25);addPickup('w5',10,25);addPickup('w6',0,28);
   addPickup('health',13,18);addPickup('health',14,18);addPickup('armor',3,30);addPickup('armor',4,30);addPickup('ammo',16,16);addPickup('ammo',17,16);
   for(const [t,n,r] of [['double',18,45],['invis',19,40],['speed',20,35],['shield',21,45],['jet',5,48],['regen',6,38]])addPickup(t,n,r);}},
 {name:'РЕАКТОР',fog:0x171a20,near:5,far:82,sky:0x87909b,build:buildReactor,nav:navReactor,pickups(){
   addPickup('w2',9,20);addPickup('w2',10,20);addPickup('w3',0,25);addPickup('w3',4,25);addPickup('w4',11,22);addPickup('w4',12,22);addPickup('w5',1,25);addPickup('w5',2,25);addPickup('w6',5,28);
   addPickup('mega',6,55);addPickup('health',13,18);addPickup('health',14,18);addPickup('armor',7,28);addPickup('armor',8,28);addPickup('ammo',15,16);addPickup('ammo',16,16);
   for(const [t,n,r] of [['double',17,45],['invis',18,40],['speed',19,35],['shield',20,45],['jet',21,48],['regen',22,38]])addPickup(t,n,r);}},
 {name:'КОРАБЛЬ-ПРИЗРАК',fog:0x273541,near:7,far:105,sky:0x687987,build:buildGhostShip,nav:navGhostShip,pickups(){
   addPickup('w2',3,20);addPickup('w2',8,20);addPickup('w3',11,25);addPickup('w3',12,25);addPickup('w4',0,22);addPickup('w4',9,22);addPickup('w5',13,25);addPickup('w5',14,25);addPickup('w6',5,28);
   addPickup('mega',5,55);addPickup('health',1,18);addPickup('health',10,18);addPickup('armor',2,28);addPickup('armor',7,28);addPickup('ammo',4,16);addPickup('ammo',6,16);
   for(const [t,n,r] of [['double',13,45],['invis',14,40],['speed',15,35],['shield',16,45],['jet',5,48],['regen',8,38]])addPickup(t,n,r);}},
 {name:'ЛАБИРИНТ-КУБ',fog:0x111b28,near:4,far:78,sky:0x8da7b5,build:buildCubeLab,nav:navCubeLab,pickups(){
   addPickup('w2',5,20);addPickup('w2',8,20);addPickup('w3',11,25);addPickup('w3',14,25);addPickup('w4',17,22);addPickup('w4',18,22);addPickup('w5',6,25);addPickup('w5',9,25);addPickup('w6',12,28);
   addPickup('mega',15,55);addPickup('health',1,18);addPickup('health',2,18);addPickup('armor',3,28);addPickup('armor',4,28);addPickup('ammo',8,16);addPickup('ammo',14,16);
   for(const [t,n,r] of [['double',17,45],['invis',12,40],['speed',1,35],['shield',5,45],['jet',3,48],['regen',15,38]])addPickup(t,n,r);}}];
let LV=null,decalGroup=null,curMap=-1,selMap=0,waterViewOn=false;const decals=[];
function updateWaterView(){const w=curMap===4&&WATER_ZONES.find(z=>player.pos.x>z.x0&&player.pos.x<z.x1&&player.pos.z>z.z0&&player.pos.z<z.z1);const wet=!!(w&&state==='play'&&player.alive&&player.pos.y+1.6<w.surface);if(wet===waterViewOn)return;waterViewOn=wet;$('waterfx').style.opacity=wet?'.85':'0';if(curMap===4){scene.fog.color.setHex(wet?0x143c56:MAPS[curMap].fog);scene.background.setHex(wet?0x143c56:MAPS[curMap].fog);}if(sfxFilter&&AC)sfxFilter.frequency.setTargetAtTime(wet?850:22000,AC.currentTime,.12);}
function loadMap(i){
  if(LV){scene.remove(LV);LV.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  LV=new THREE.Group();scene.add(LV);decalGroup=new THREE.Group();LV.add(decalGroup);decals.length=0;if(typeof clearGibs==='function')clearGibs();resetMirrors();if(typeof clearCorpses==='function')clearCorpses();
  solids.length=0;flames.length=0;padCones.length=0;PADS.length=0;PICKUPS.length=0;WATER_ZONES.length=0;BRIDGES.length=0;ICE_ZONES.length=0;lavaZones=[];
  for(const p of projs)scene.remove(p.mesh);projs.length=0;
  const m=MAPS[i];curMap=i;if(i!==9)camera.up.copy(UP);m.build();SPAWNS=m.nav().map(k=>NODES[k]);m.pickups();
  scene.fog.color.setHex(m.fog);scene.fog.near=m.near;scene.fog.far=m.far;scene.background.setHex(m.fog);skyMesh.material.color.setHex(m.sky);paintChrome(m.sky,m.fog);
  for(const b of bots){b.path=null;b.target=null;}}
function bfs(s,g){if(s===g)return[g];const prev=new Array(NODES.length).fill(-1);prev[s]=s;const q=[s];while(q.length){const n=q.shift();for(const m of ADJ[n])if(prev[m]<0){prev[m]=n;if(m===g){const path=[m];let c=n;while(c!==s){path.unshift(c);c=prev[c];}return path;}q.push(m);}}return null;}
function nearestNode(p){let best=0,bd=1e9;for(let i=0;i<NODES.length;i++){const n=NODES[i],d=Math.hypot(n.x-p.x,n.z-p.z)+Math.abs(n.y-p.y)*3;if(d<bd){bd=d;best=i;}}return best;}

