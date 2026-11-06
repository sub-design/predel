// ПРЕДЕЛ — Attractions (moving platforms, rides, spinners, trampolines) and the Luna Park map.
// Everything that moves is a pure function of the match clock, so host and guests see the same wheel
// without sending a single extra byte: only the riders' own positions travel over the network.
'use strict';
const MOVERS=[],RIDES=[],SPINNERS=[],ANIMS=[];// ANIMS: purely visual f(t) hooks
function resetAttractions(){MOVERS.length=0;RIDES.length=0;SPINNERS.length=0;ANIMS.length=0;}
function parkClock(){return state==='play'||state==='paused'||state==='intro'?MATCH_TIME-matchTime:time;}
// Entities this machine simulates: the host moves everyone but remote players, a guest only moves itself.
function localMovers(){return isClient()?[player]:ents.filter(e=>!e.remote);}

/* ---------- moving platforms ---------- */
// half: half-extents [x,y,z] of the collision box; at(t) returns its centre.
function addMover(half,at,mesh){const s={min:[0,0,0],max:[0,0,0]};solids.push(s);const m={s,half,at,mesh,pos:new V3()};placeMover(m,parkClock());MOVERS.push(m);return m;}
function placeMover(m,t){const p=m.at(t),h=m.half;m.pos.copy(p);m.s.min=[p.x-h[0],p.y-h[1],p.z-h[2]];m.s.max=[p.x+h[0],p.y+h[1],p.z+h[2]];if(m.mesh)m.mesh.position.copy(p);}
function standsOn(e,s){const top=s.max[1];return e.alive&&!e.ride&&e.pos.y>top-.06&&e.pos.y<top+.3&&e.pos.x>s.min[0]-.2&&e.pos.x<s.max[0]+.2&&e.pos.z>s.min[2]-.2&&e.pos.z<s.max[2]+.2;}
const _mvOld=new V3(),_mvD=new V3();
function updateAttractions(dt){if(!MOVERS.length&&!SPINNERS.length&&!ANIMS.length)return;const t=parkClock(),who=localMovers();for(const f of ANIMS)f(t);
  for(const m of MOVERS){const riders=who.filter(e=>standsOn(e,m.s));_mvOld.copy(m.pos);placeMover(m,t);_mvD.copy(m.pos).sub(_mvOld);
    if(_mvD.lengthSq()<1)for(const e of riders)e.pos.add(_mvD);}
  for(const sp of SPINNERS){const a=sp.w*t;if(sp.mesh)sp.mesh.rotation.y=a;const da=sp.w*dt;if(state==='menu')continue;
    for(const e of who){if(!e.alive||e.ride||Math.abs(e.pos.y-sp.y)>.3)continue;const dx=e.pos.x-sp.c.x,dz=e.pos.z-sp.c.z;if(dx*dx+dz*dz>sp.r*sp.r)continue;
      const c=Math.cos(da),s=Math.sin(da);e.pos.x=sp.c.x+dx*c+dz*s;e.pos.z=sp.c.z-dx*s+dz*c;}}}

function padLaunch(e,p){if(p.keepH){e.vel.y=p.vel.y;}else e.vel.copy(p.vel);}// trampolines keep your run
/* ---------- rides: hop on at pts[0], the track carries you, you are flung off the end ---------- */
function addRide(pts,speed){const len=[0];for(let i=1;i<pts.length;i++)len.push(len[i-1]+pts[i].distanceTo(pts[i-1]));const r={pts,len,total:len[len.length-1],speed};RIDES.push(r);return r;}
function ridePoint(r,s,out,dir){let i=1;while(i<r.pts.length-1&&r.len[i]<s)i++;const a=r.pts[i-1],b=r.pts[i],k=Math.min(1,Math.max(0,(s-r.len[i-1])/(r.len[i]-r.len[i-1]||1)));out.copy(a).lerp(b,k);if(dir)dir.copy(b).sub(a).normalize();return out;}
const _rDir=new V3();
// Returns true while the entity is on a ride (callers skip their own movement then).
function rideStep(e,dt){if(!RIDES.length)return false;
  if(e.ride){const r=RIDES[e.ride.i];e.ride.s+=r.speed*dt;
    if(e.ride.s>=r.total){ridePoint(r,r.total,e.pos,_rDir);e.vel.copy(_rDir).multiplyScalar(r.speed);e.vel.y=Math.max(e.vel.y,3);e.ride=null;e.rideCD=1.2;e.grounded=false;return false;}
    ridePoint(r,e.ride.s,e.pos,_rDir);e.vel.copy(_rDir).multiplyScalar(r.speed);e.grounded=false;return true;}
  e.rideCD=(e.rideCD||0)-dt;if(e.rideCD>0||!e.alive)return false;
  for(let i=0;i<RIDES.length;i++){if(e.pos.distanceTo(RIDES[i].pts[0])<1.4){e.ride={i,s:0};playSnd('pad',e===player?null:e.pos);if(e===player)pickMsg('Держитесь крепче!');return true;}}
  return false;}

/* ---------- Luna Park ---------- */
function buildLunaPark(){
  const pave=M(texFloor,0x8a7898),wallM=M(texWall,0x6a4a7a),trim=M(texTrim,0xd8c8ff),wood=M(texCrate,0xb07850),red=M(texTrim,0xd04848),white=M(texTrim,0xf0f0f0),
    teal=M(texTrim,0x40c8b8),gold=M(texTrim,0xe8c048),pink=M(texTrim,0xf070b0),dark=M(texPillar,0x504060);
  const glow=c=>new THREE.MeshBasicMaterial({color:c});
  const bulbs=(pts,c)=>{const g=new THREE.SphereGeometry(.13,6,4);pts.forEach((p,i)=>{const b=new THREE.Mesh(g,glow(Array.isArray(c)?c[i%c.length]:c));b.position.copy(p);LV.add(b);});};
  const CANDY=[0xff4060,0xffd040,0x40e0ff,0x80ff60,0xff80ff];
  // Ground, perimeter fence with bulbs.
  box(-52,-1,-52,52,0,52,pave,6);
  for(const [x0,z0,x1,z1] of [[-52,-52,52,-50],[-52,50,52,52],[-52,-50,-50,50],[50,-50,52,50]])box(x0,0,z0,x1,4.5,z1,wallM,4);
  {const p=[];for(let k=-48;k<=48;k+=4){p.push(new V3(k,4.7,-50),new V3(k,4.7,50),new V3(-50,4.7,k),new V3(50,4.7,k));}bulbs(p,CANDY);}
  // Painted paths (no collision).
  for(const [x0,z0,x1,z1,c] of [[-2.5,8,2.5,48,0x6a5878],[-48,-2.5,-8,2.5,0x6a5878],[8,-2.5,48,2.5,0x6a5878],[-2.5,-48,2.5,-8,0x6a5878]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),new THREE.MeshLambertMaterial({color:c}));m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,.015,(z0+z1)/2);LV.add(m);}

  // --- Carousel: an octagon-ish deck that turns, a perch on the canopy (reached by the cannon).
  box(-7.5,0,-3.1,7.5,.6,3.1,gold,2);box(-3.1,0,-7.5,3.1,.6,7.5,gold,2);box(-5.3,0,-5.3,5.3,.6,5.3,gold,2);
  box(-.6,0,-.6,.6,6.6,.6,white,1);
  box(-7.5,6.6,-3.1,7.5,7,3.1,red,2);box(-3.1,6.6,-7.5,3.1,7,7.5,red,2);box(-5.3,6.6,-5.3,5.3,7,5.3,red,2);
  {const deco=new THREE.Mesh(new THREE.CylinderGeometry(7.6,7.6,.08,16),glow(0xffe080));deco.position.y=.62;LV.add(deco);
   const roof=new THREE.Mesh(new THREE.ConeGeometry(2.2,2.2,12),new THREE.MeshLambertMaterial({color:0xff5070}));roof.position.y=8.1;LV.add(roof);
   const spin=new THREE.Group();LV.add(spin);
   for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.cos(a)*5.4,z=Math.sin(a)*5.4,c=CANDY[k%5];
     const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,6,6),glow(0xf0e0a0));pole.position.set(x,3.6,z);spin.add(pole);
     const horse=new THREE.Group();const hm=new THREE.MeshLambertMaterial({color:c});const b=new THREE.Mesh(new THREE.BoxGeometry(1.4,.55,.45),hm);horse.add(b);
     const nk=new THREE.Mesh(new THREE.BoxGeometry(.35,.7,.35),hm);nk.position.set(.65,.45,0);horse.add(nk);const hd=new THREE.Mesh(new THREE.BoxGeometry(.6,.3,.32),hm);hd.position.set(.9,.8,0);horse.add(hd);
     for(const lx of [-.5,.5])for(const lz of [-.15,.15]){const lg=new THREE.Mesh(new THREE.BoxGeometry(.12,.6,.12),hm);lg.position.set(lx,-.5,lz);horse.add(lg);}
     horse.position.set(x,1.9+(k%2)*.4,z);horse.rotation.y=-a+Math.PI/2;horse.userData.ph=k;spin.add(horse);}
   const ring=[];for(let k=0;k<32;k++){const a=k/32*Math.PI*2;ring.push(new V3(Math.cos(a)*7.4,6.55,Math.sin(a)*7.4));}bulbs(ring,CANDY);
   SPINNERS.push({c:new V3(0,0,0),y:.6,r:7.5,w:Math.PI*2/20,mesh:spin});
   const l=new THREE.PointLight(0xffc070,1.1,22,1);l.position.set(0,5,0);LV.add(l);}

  // --- Ferris wheel (north): 8 cabins are moving platforms; the top one is a 28 m sniper perch.
  {const C=new V3(0,18,-38),R=13,W=Math.PI*2/50;
   for(const sx of [-1,1])for(const z of [-40.5,-35.5]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,19.5,6),dark);leg.position.set(sx*4,9,z);leg.rotation.z=sx*.43;LV.add(leg);box(sx*8-.6,0,z-.6,sx*8+.6,1,z+.6,dark,1);}
   const wheel=new THREE.Group();wheel.position.copy(C);LV.add(wheel);
   for(const z of [-1.3,1.3]){const t=new THREE.Mesh(new THREE.TorusGeometry(R,.22,6,48),glow(0xff60c0));t.position.z=z;wheel.add(t);const t2=new THREE.Mesh(new THREE.TorusGeometry(R*.55,.12,6,32),glow(0x60e0ff));t2.position.z=z;wheel.add(t2);}
   for(let k=0;k<16;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.12,R*2,.12),new THREE.MeshLambertMaterial({color:0xd0d0e0}));sp.rotation.z=k*Math.PI/16;wheel.add(sp);}
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,3,12),gold);hub.rotation.x=Math.PI/2;wheel.add(hub);
   ANIMS.push(t=>{wheel.rotation.z=t*W;});
   for(let k=0;k<8;k++){const a0=k*Math.PI/4,col=CANDY[k%5];
     const cab=new THREE.Group();const fl=new THREE.Mesh(new THREE.BoxGeometry(2.8,.3,2.2),M(texTrim,col));cab.add(fl);
     const roof=new THREE.Mesh(new THREE.BoxGeometry(3,.18,2.4),M(texTrim,col));roof.position.y=2.2;cab.add(roof);
     for(const sx of [-1.35,1.35]){const post=new THREE.Mesh(new THREE.BoxGeometry(.1,2.2,.1),white);post.position.set(sx,1.1,0);cab.add(post);}
     const rail=new THREE.Mesh(new THREE.BoxGeometry(2.8,.08,.08),white);rail.position.set(0,.8,-1.05);cab.add(rail);
     const arm=new THREE.Mesh(new THREE.BoxGeometry(.12,.3,.12),white);arm.position.y=2.4;cab.add(arm);LV.add(cab);
     addMover([1.4,.15,1.1],t=>{const a=a0+t*W;return new V3(C.x+Math.cos(a)*R,C.y+Math.sin(a)*R-2.4,C.z);},cab);}
   // Boarding platform in front of the bottom of the wheel, with steps up from the plaza.
   box(-2.2,0,-36.4,2.2,1.56,-32,teal,2);box(-2.2,0,-32,2.2,1.04,-31,teal,1);box(-2.2,0,-31,2.2,.52,-30,teal,1);
   const l=new THREE.PointLight(0xff60c0,1,30,1);l.position.set(0,18,-34);LV.add(l);}

  // --- Roller coaster (east station → over the park → west).
  box(33,11,22,47,12,34,trim,3);for(const [x,z] of [[33,22],[46,22],[33,33],[46,33]])box(x,0,z,x+1,11,z+1,dark,1);
  box(33,12,33,47,13,34,red,1);box(46,12,22,47,13,34,red,1);box(33,12,22,34,13,30,red,1);
  for(let k=0;k<24;k++)box(37,0,46-(k+1)*.5,43,(k+1)*.5,46-k*.5,wood,2);
  {const pts=[[40,12.3,22],[40,13,14],[37,17,4],[29,21,-6],[19,12,-12],[11,6,-14],[3,8,-21],[-8,14,-20],[-19,12,-10],[-28,8,6],[-34,3.5,16],[-37,1.4,24]].map(a=>new V3(...a));
   const r=addRide(pts,18),railM=glow(0xff4fa0),tieM=new THREE.MeshLambertMaterial({color:0xe0e0f0});
   const seg=(a,b,w,h,mat,off)=>{const d=b.clone().sub(a),L=d.length(),m=new THREE.Mesh(new THREE.BoxGeometry(w,h,L),mat);m.position.copy(a).add(b).multiplyScalar(.5).add(off);m.lookAt(m.position.clone().add(d));LV.add(m);};
   for(let i=1;i<pts.length;i++){const a=pts[i-1].clone(),b=pts[i].clone();a.y-=.3;b.y-=.3;const side=new V3().crossVectors(b.clone().sub(a),UP).normalize().multiplyScalar(.7);
     seg(a,b,.12,.12,railM,side);seg(a,b,.12,.12,railM,side.clone().negate());
     const n=Math.ceil(a.distanceTo(b)/1.6);for(let k=0;k<n;k++){const p=a.clone().lerp(b,k/n);const t=new THREE.Mesh(new THREE.BoxGeometry(1.6,.08,.25),tieM);t.position.copy(p);t.lookAt(p.clone().add(b.clone().sub(a)));LV.add(t);}
     if(i%2===0&&a.y>2){const s=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,a.y,5),new THREE.MeshLambertMaterial({color:0x8a7aa8}));s.position.set(a.x,a.y/2,a.z);LV.add(s);}}
   const car=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.8,3),M(texTrim,0xff3050));car.add(body);const nose=new THREE.Mesh(new THREE.BoxGeometry(1.8,.5,.6),gold);nose.position.set(0,-.1,-1.7);car.add(nose);car.position.set(40,12.4,25.5);LV.add(car);
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.4),new THREE.MeshBasicMaterial({map:parkSign('ГОРКИ',0xff4fa0),transparent:true}));sign.position.set(40,15.2,22);sign.rotation.y=Math.PI;LV.add(sign);
   const l=new THREE.PointLight(0x40e0ff,.9,24,1);l.position.set(40,16,28);LV.add(l);}

  // --- Funhouse «Комната смеха» (west): chrome walls, mirror floor, mega-health in the back room, roof perch.
  {const x0=-42,x1=-24,z0=-16,z1=4,h=6;
   box(x0,0,z0,x1,h,z0+.6,wallM,3);box(x0,0,z0,x0+.6,h,z1,wallM,3);
   box(x0,0,z1-.6,-34,h,z1,wallM,3);box(-31,0,z1-.6,x1,h,z1,wallM,3);box(-34,3.2,z1-.6,-31,h,z1,wallM,2);
   box(x1-.6,0,z0,x1,h,-3,wallM,3);box(x1-.6,0,1,x1,h,z1,wallM,3);box(x1-.6,3.2,-3,x1,h,1,wallM,2);
   box(x0,h,z0,x1,h+.5,z1,pink,4);
   const p1=box(-30,0,-16,-29.4,3.2,-1,trim,2),p2=box(-42,0,-6.6,-34,3.2,-6,trim,2),p3=box(-38,0,-1.5,-37.4,3.2,3.4,trim,2);
   for(const p of [p1,p2,p3])chrome(p,.6);
   mirrorFloor(x0+.6,z0+.6,x1-.6,z1-.6,.02,0xd0b0ff,.5);
   const face=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshBasicMaterial({map:clownFace(),transparent:true}));face.position.set(x1+.05,4.5+1.6,-1);face.rotation.y=Math.PI/2;LV.add(face);
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(7,1.3),new THREE.MeshBasicMaterial({map:parkSign('КОМНАТА СМЕХА',0xc070ff),transparent:true}));sign.position.set(x1+.06,3.9,-1);sign.rotation.y=Math.PI/2;LV.add(sign);
   const l=new THREE.PointLight(0xb070ff,1,20,1);l.position.set(-33,3,-6);LV.add(l);
   // Trampoline up to the roof.
   addTrampoline(new V3(-18,0,12),padVel(new V3(-18,0,12),new V3(-33,6.5,-6),10),false,0xc070ff);}

  // --- Bouncy castle (north-east): four trampolines and a tower you can only bounce onto.
  {const soft=M(texTrim,0xff90c0),soft2=M(texTrim,0x90d0ff);
   box(18,0,-38,34,2,-37.4,soft,2);box(18,0,-38,18.6,2,-22,soft2,2);box(33.4,0,-38,34,2,-22,soft2,2);box(18,0,-22.6,24,2,-22,soft,2);box(28,0,-22.6,34,2,-22,soft,2);
   {const p=[];for(let x=18;x<=34;x+=2)p.push(new V3(x,2.3,-37.7),new V3(x,2.3,-22.3));bulbs(p,CANDY);}
   box(25,0,-31,27,6.6,-29,soft2,1);box(24,6.6,-32,28,7,-28,gold,2);
   for(const [x,z] of [[22,-34],[30,-34],[30,-26]])addTrampoline(new V3(x,0,z),new V3(0,21,0),true,0xff90c0);
   addTrampoline(new V3(22,0,-26),padVel(new V3(22,0,-26),new V3(26,7,-30),9.5),false,0xffd040);// the gold one throws you onto the tower
   const l=new THREE.PointLight(0xffd040,.8,22,1);l.position.set(26,6,-30);LV.add(l);}

  // --- Human cannonball (south): fires you onto the carousel canopy.
  {const at=new V3(0,0,40);PADS.push({x:at.x,y:0,z:at.z,vel:padVel(at,new V3(0,7,2.5),14)});
   const base=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,.25,12),new THREE.MeshBasicMaterial({map:texPad}));base.position.set(0,.13,40);LV.add(base);
   const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.2,5,10),M(texTrim,0x404858));barrel.position.set(0,2.6,42.4);barrel.rotation.x=-.75;LV.add(barrel);
   for(const sx of [-1.4,1.4]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.3,10),wood);wh.rotation.z=Math.PI/2;wh.position.set(sx,1,42.5);LV.add(wh);}
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.3),new THREE.MeshBasicMaterial({map:parkSign('ЧЕЛОВЕК-ЯДРО',0xffd040),transparent:true}));sign.position.set(0,5.2,45);LV.add(sign);}

  // --- Stalls and props for cover.
  for(const [x,z,c] of [[20,-2,0xff6060],[-6,-27,0x60c0ff],[20,16,0xffd040],[-16,-16,0x80ff80],[12,30,0xff80ff],[-30,-30,0x40e0ff]]){
    box(x-2,0,z-1.5,x+2,1.1,z+1.5,wood,2);const awn=new THREE.Mesh(new THREE.BoxGeometry(4.6,.2,3.6),M(texTrim,c));awn.position.set(x,2.7,z);LV.add(awn);
    for(const sx of [-1.9,1.9])for(const sz of [-1.4,1.4]){const p=new THREE.Mesh(new THREE.BoxGeometry(.1,1.6,.1),white);p.position.set(x+sx,1.9,z+sz);LV.add(p);}}
  for(const [x,z] of [[-14,30],[30,-12],[-42,20],[44,-20],[-20,40]]){box(x-.3,0,z-.3,x+.3,4,z+.3,dark,1);bulbs([new V3(x,4.2,z)],CANDY[(x*7+z)&3]);}
  for(const [x,z] of [[-8,24],[10,-30],[-44,-44],[44,44]]){const b=new THREE.Group();for(let k=0;k<5;k++){const s=new THREE.Mesh(new THREE.SphereGeometry(.5,8,6),glow(CANDY[k]));s.position.set((k-2)*.4,4.5+(k%2)*.6,0);b.add(s);}b.position.set(x,0,z);LV.add(b);}

  LV.add(new THREE.HemisphereLight(0xb0a0ff,0x302040,.72));const moon=new THREE.DirectionalLight(0xc8d0ff,.42);moon.position.set(-30,40,20);LV.add(moon);}

function addTrampoline(at,vel,keepH,color){PADS.push({x:at.x,y:at.y,z:at.z,vel,keepH});
  const frame=new THREE.Mesh(new THREE.TorusGeometry(1.25,.16,6,16),new THREE.MeshLambertMaterial({color}));frame.rotation.x=Math.PI/2;frame.position.set(at.x,at.y+.45,at.z);LV.add(frame);
  const mat=new THREE.Mesh(new THREE.CircleGeometry(1.15,16),new THREE.MeshLambertMaterial({color:0x181018}));mat.rotation.x=-Math.PI/2;mat.position.set(at.x,at.y+.4,at.z);LV.add(mat);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+.4,l=new THREE.Mesh(new THREE.BoxGeometry(.12,.45,.12),new THREE.MeshLambertMaterial({color:0x808090}));l.position.set(at.x+Math.cos(a)*1.2,at.y+.22,at.z+Math.sin(a)*1.2);LV.add(l);}}
function parkSign(text,color){const c=document.createElement('canvas');c.width=256;c.height=56;const g=c.getContext('2d');g.fillStyle='rgba(20,8,30,.85)';g.fillRect(0,0,256,56);g.strokeStyle='#'+color.toString(16).padStart(6,'0');g.lineWidth=4;g.strokeRect(3,3,250,50);
  g.fillStyle=g.strokeStyle;g.font='bold 26px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,29);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}
function clownFace(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const C=(x,y,r,col)=>{g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
  C(32,34,24,'#f4e8d8');C(14,16,9,'#ff5030');C(50,16,9,'#ff5030');C(24,30,4,'#202030');C(40,30,4,'#202030');C(32,38,6,'#ff2030');
  g.strokeStyle='#d02030';g.lineWidth=4;g.beginPath();g.arc(32,42,11,.2,Math.PI-.2);g.stroke();const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}

function navLunaPark(){
  setNodes([[0,.6,5],[0,0,12],[12,0,0],[0,0,-12],[-12,0,0],[0,.6,-5],[25,0,25],[14,0,-18],[-25,0,-25],[-25,0,25],
    [0,1.56,-34],[40,0,48],[40,12,30],[40,12,22.6],[-36,0,32],[-20,0,-1],[-27,0,-1],[-27,0,2],[-33,0,2],[-32,0,-9],
    [-39,0,-12],[-32.5,0,7.5],[-27,0,-12],[-33,6.5,-6],[-18,0,12],[26,0,-19],[26,0,-24],[22,0,-26],[26,7,-30],[0,0,40],
    [0,7,2.5],[40,0,10],[42,0,-42],[-42,0,-40],[30,0,47],[-42,0,42]]);
  link(1,2);link(2,3);link(3,4);link(4,1);link(1,0);link(3,5);link(0,2);link(5,4);
  link(1,6);link(1,9);link(2,6);link(2,31);link(31,6);link(2,7);link(3,7);link(3,8);link(4,8);link(4,9);link(3,10);
  link(7,25);link(25,26);link(26,27);link(27,28,true);link(28,26,true);link(31,32);
  link(6,34);link(34,11);link(11,12);link(12,13,true);link(13,14,true);link(14,9);link(14,35);link(9,35);
  link(9,24);link(24,23,true);link(23,15,true);link(15,16);link(16,17);link(17,18);link(18,21);link(18,19);link(19,20);link(16,22);link(15,4);link(8,15);link(8,33);link(21,9);
  link(1,29);link(29,30,true);link(30,1,true);
  return [1,3,6,8,9,12,14,20,26,31,32,33,35];
}
