// ПРЕДЕЛ — Weapon table and visual effects.
'use strict';
/* ---------- weapons ---------- */
const WEAPONS=[
 {id:0,name:'ИМПУЛЬСНИК',type:'proj',speed:55,dmg:20,rate:.18,color:0x40ffff,snd:'blaster',max:120,pick:40,knock:3,altName:'ЗАРЯЖЕННЫЙ ШАР',altRate:.65,altSpeed:30,altDmg:36,altSplash:2.8},
 {id:1,name:'ШРЕДЕР',type:'hitscan',dmg:8,rate:.08,spread:.03,color:0xffd040,snd:'shred',max:250,pick:60,knock:1,altName:'ТОЧНЫЙ ВЫСТРЕЛ',altRate:.32,altDmg:27,altSpread:.002,altKnock:2},
 {id:2,name:'ГРОМОБОЙ',type:'proj',speed:30,dmg:95,splash:5.5,rate:.85,color:0xff7020,snd:'rocket',max:30,pick:8,knock:20,altName:'ЗАЛП ИЗ ТРЁХ РАКЕТ',altRate:1.2,altSpeed:21,altDmg:112,altSplash:8,altKnock:24},
 {id:3,name:'ИГЛА',type:'rail',dmg:80,headDmg:140,rate:1.25,color:0xc050ff,snd:'rail',max:25,pick:6,knock:6,altName:'ПРОБИВАЮЩИЙ ЗАРЯД',altRate:1.7,altDmg:52,altHeadDmg:85,altTargets:3,altKnock:4},
 {id:4,name:'КУВАЛДА',type:'shotgun',dmg:11,pellets:10,spread:.105,rate:.78,color:0xffb040,snd:'shotgun',max:48,pick:12,knock:3.4,altName:'ТОЧНЫЙ ВЫСТРЕЛ',altDmg:72,altRate:1.05,altSpread:.009},
 {id:5,name:'ГРАНАТОМЁТ',type:'proj',speed:23,dmg:78,splash:4.8,rate:.9,color:0xff6040,snd:'rocket',max:24,pick:6,knock:17,grenade:true,fuse:2,altName:'ГРАНАТА · ОТСКОК'},
 {id:6,name:'СНАЙПЕРКА',type:'sniper',dmg:105,headDmg:180,rate:1.15,color:0x80e0ff,snd:'rail',max:24,pick:6,knock:5,altName:'ЗУМ · ЗАЖАТЬ ПКМ'}];
function makeWeaponModel(id){
  const g=new THREE.Group(),gm=new THREE.MeshLambertMaterial({map:texGun});
  const add=(geo,mat,x,y,z,rx=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.x=rx;g.add(m);return m;};
  const glow=c=>new THREE.MeshBasicMaterial({color:c});const H=Math.PI/2;let mz=-.5;
  if(id===0){add(new THREE.BoxGeometry(.1,.12,.38),gm,0,0,-.1);add(new THREE.BoxGeometry(.08,.16,.08),gm,0,-.12,.02);
    for(let i=0;i<3;i++)add(new THREE.BoxGeometry(.12,.04,.04),glow(0x40ffff),0,.04,-.05-i*.08);add(new THREE.CylinderGeometry(.03,.03,.18,6),gm,0,0,-.36,H);mz=-.46;}
  else if(id===1){add(new THREE.BoxGeometry(.16,.16,.3),gm,0,0,0);const spin=new THREE.Group();spin.position.set(0,0,-.2);g.add(spin);
    for(let i=0;i<3;i++){const a=i/3*Math.PI*2,b=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.5,6),gm);b.rotation.x=H;b.position.set(Math.cos(a)*.05,Math.sin(a)*.05,-.15);spin.add(b);}
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.04,8),gm);ring.rotation.x=H;ring.position.z=-.3;spin.add(ring);
    g.userData.spin=spin;add(new THREE.BoxGeometry(.04,.06,.2),glow(0xffc040),0,.1,.02);mz=-.62;}
  else if(id===2){add(new THREE.CylinderGeometry(.1,.1,.7,8),gm,0,0,-.15,H);add(new THREE.CylinderGeometry(.12,.12,.08,8),new THREE.MeshLambertMaterial({color:0xb03020}),0,0,-.5,H);
    add(new THREE.BoxGeometry(.06,.14,.08),gm,0,-.14,0);add(new THREE.BoxGeometry(.05,.05,.12),glow(0xff7020),.1,.05,.05);mz=-.56;}
  else if(id===3){add(new THREE.BoxGeometry(.1,.14,.4),gm,0,0,0);add(new THREE.CylinderGeometry(.025,.025,.8,6),gm,0,.02,-.5,H);
    for(let i=0;i<4;i++)add(new THREE.CylinderGeometry(.06,.06,.03,8),glow(0xc050ff),0,.02,-.25-i*.13,H);mz=-.92;}
  else if(id===4){add(new THREE.BoxGeometry(.18,.17,.48),gm,0,-.02,0);add(new THREE.BoxGeometry(.12,.1,.48),gm,0,-.13,-.06);add(new THREE.CylinderGeometry(.065,.065,.65,8),gm,0,.03,-.42,H);add(new THREE.BoxGeometry(.12,.2,.15),new THREE.MeshLambertMaterial({color:0x6a3920}),0,-.12,.12);mz=-.75;}
  else if(id===5){add(new THREE.CylinderGeometry(.11,.13,.7,8),gm,0,0,-.22,H);add(new THREE.BoxGeometry(.19,.2,.24),gm,0,-.08,.08);add(new THREE.CylinderGeometry(.13,.13,.08,8),glow(0xff6040),0,0,-.58,H);mz=-.62;}
  else{add(new THREE.BoxGeometry(.12,.16,.7),gm,0,0,-.05);add(new THREE.CylinderGeometry(.035,.035,.75,6),gm,0,.02,-.48,H);add(new THREE.BoxGeometry(.18,.11,.15),glow(0x80e0ff),0,.12,-.02);mz=-.88;}
  g.userData.muzzleZ=mz;return g;}

/* ---------- FX ---------- */
const PMAX=700,pMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),PMAX);
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pMesh.frustumCulled=false;
const P=[],_c=new THREE.Color(),_o=new THREE.Object3D();
for(let i=0;i<PMAX;i++){P.push({life:0,max:1,pos:new V3(),vel:new V3(),size:.1,grav:0,bounce:false,drag:0});pMesh.setColorAt(i,_c.setHex(0xffffff));_o.scale.setScalar(0);_o.updateMatrix();pMesh.setMatrixAt(i,_o.matrix);}
scene.add(pMesh);let pIdx=0;
function emit(pos,vel,color,size,life,grav=0,bounce=false,drag=0){const i=pIdx;pIdx=(pIdx+1)%PMAX;const p=P[i];p.pos.copy(pos);p.vel.copy(vel);p.size=size;p.life=p.max=life;p.grav=grav;p.bounce=bounce;p.drag=drag;pMesh.setColorAt(i,_c.setHex(color));pMesh.instanceColor.needsUpdate=true;}
const _np=new V3();
let lightningT=0,lightningNext=8+R()*8,lightningPeak=0;
const stormLight=new THREE.DirectionalLight(0xc7e4ff,0);stormLight.position.set(-35,70,24);scene.add(stormLight);
function updateWeather(dt){if(state!=='play'&&state!=='paused'&&state!=='intro'){stormLight.intensity=0;return;}lightningNext-=dt;if(lightningNext<=0){lightningNext=8+R()*15;lightningT=.18;lightningPeak=1.4+R()*1.4;setTimeout(()=>{if(!muted&&state!=='menu')playSnd('thunder');},450+R()*900);}if(lightningT>0){lightningT-=dt;stormLight.intensity=lightningT>.12?lightningPeak:lightningT>.055?0:lightningPeak*.65;}else stormLight.intensity=0;}
function saveScreenshot(){const src=renderer.domElement,h=240,w=Math.round(h*src.width/src.height),out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(src,0,0,w,h);c.fillStyle='rgba(0,0,0,.78)';c.fillRect(0,h-29,w,29);c.strokeStyle='#ff612d';c.lineWidth=2;c.strokeRect(3,3,w-6,h-6);c.fillStyle='#ff612d';c.font=`bold ${Math.max(9,Math.round(h*.055))}px monospace`;c.fillText('PREDEL',10,h-10);c.fillStyle='#d4d8e0';c.font=`${Math.max(7,Math.round(h*.027))}px monospace`;c.fillText(`${MAPS[curMap].name}  //  ${new Date().toLocaleDateString('ru-RU')}`,Math.min(w-140,Math.round(w*.38)),h-11);const a=document.createElement('a');a.download=`predel-${Date.now()}.png`;a.href=out.toDataURL('image/png');a.click();pickMsg('СКРИНШОТ СОХРАНЁН');}
function updateParticles(dt){for(let i=0;i<PMAX;i++){const p=P[i];if(p.life<=0){if(p.max>0){p.max=0;_o.scale.setScalar(0);_o.updateMatrix();pMesh.setMatrixAt(i,_o.matrix);}continue;}
  p.life-=dt;p.vel.y-=p.grav*dt;if(p.drag)p.vel.multiplyScalar(Math.max(0,1-p.drag*dt));
  _np.copy(p.pos).addScaledVector(p.vel,dt);
  if(p.bounce&&pointSolid(_np.x,_np.y,_np.z)){p.vel.y*=-.35;p.vel.x*=.6;p.vel.z*=.6;if(p.vel.lengthSq()<.3)p.vel.set(0,0,0);}else p.pos.copy(_np);
  const s=p.bounce?p.size*Math.min(1,p.life/.5):p.size*(p.life/p.max);
  _o.position.copy(p.pos);_o.scale.setScalar(Math.max(0,s));_o.rotation.set(p.life*4,p.life*3,0);_o.updateMatrix();pMesh.setMatrixAt(i,_o.matrix);}
  pMesh.instanceMatrix.needsUpdate=true;}
const rv=(s)=>new V3((R()-.5)*s,(R()-.5)*s,(R()-.5)*s);

const fxs=[],geoSph=new THREE.SphereGeometry(1,10,8),geoCyl=new THREE.CylinderGeometry(1,1,1,6,1,true);
const addMat=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
function addFX(mesh,dur,upd){scene.add(mesh);fxs.push({mesh,t:0,dur,upd});upd(mesh,0);}
function updateFX(dt){for(let i=fxs.length-1;i>=0;i--){const f=fxs[i];f.t+=dt;const k=f.t/f.dur;if(k>=1){scene.remove(f.mesh);f.mesh.material.dispose();fxs.splice(i,1);}else f.upd(f.mesh,k);}}
function addDecal(mesh){if(!decalGroup)return;decalGroup.add(mesh);decals.push(mesh);while(decals.length>160){const old=decals.shift();decalGroup.remove(old);old.geometry.dispose();old.material.dispose();}}
function addShotMark(p,d,color=0x22252a,r=.16){const normal=d.clone().negate().normalize(),mesh=new THREE.Mesh(new THREE.CircleGeometry(r,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));mesh.position.copy(p).addScaledVector(normal,.015);mesh.quaternion.setFromUnitVectors(new V3(0,0,1),normal);addDecal(mesh);}
function addBloodStain(p,sc=1){if(p.y<-1.5)return;let floor=-1e9;for(const b of solids)if(p.x>b.min[0]&&p.x<b.max[0]&&p.z>b.min[2]&&p.z<b.max[2]&&b.max[1]<=p.y+.2)floor=Math.max(floor,b.max[1]);if(floor===-1e9)return;const m=new THREE.Mesh(new THREE.CircleGeometry(.55,9),new THREE.MeshBasicMaterial({color:0x651016,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));m.position.set(p.x,floor+.025,p.z);m.rotation.x=-Math.PI/2;m.scale.set(1.3*sc,.8*sc,1);m.rotation.z=R()*6;addDecal(m);}
function beam(a,b,color,dur,r){const d=b.clone().sub(a),L=d.length();if(L<.01)return;const m=new THREE.Mesh(geoCyl,addMat(color));m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(UP,d.normalize());addFX(m,dur,(m,k)=>{m.material.opacity=1-k;m.scale.set(r*(1+k*2),L,r*(1+k*2));});}
const LPOOL=[];for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffffff,0,12,1);scene.add(l);LPOOL.push({l,t:0,max:1,i:0});}let lpi=0;
function flashLight(pos,color,dur,inten,dist=12){const L=LPOOL[lpi];lpi=(lpi+1)%LPOOL.length;L.l.position.copy(pos);L.l.color.setHex(color);L.l.distance=dist;L.t=L.max=dur;L.i=inten;}
function explosionFX(p){
  addFX(new THREE.Mesh(geoSph,addMat(0xff8020)),.5,(m,k)=>{m.position.copy(p);m.scale.setScalar(.6+k*4.8);m.material.opacity=1-k;});
  addFX(new THREE.Mesh(geoSph,addMat(0xffffa0)),.25,(m,k)=>{m.position.copy(p);m.scale.setScalar(.4+k*2.5);m.material.opacity=1-k;});
  for(let i=0;i<34;i++)emit(p,rv(1).normalize().multiplyScalar(4+R()*10),R()<.5?0xffb020:0xff5010,.28,.4+R()*.35,6,false,2);
  for(let i=0;i<12;i++)emit(p.clone().add(rv(1.5)),new V3((R()-.5)*2,1.5+R()*2,(R()-.5)*2),0x3a3438,.7,1.4,-.5,false,1);
  flashLight(p,0xff8030,.5,4,18);}
function sparkFX(p,color){for(let i=0;i<7;i++)emit(p,rv(8),i<3?0xffffff:color,.08,.25+R()*.2,18);}
function bloodFX(p,d){for(let i=0;i<8;i++)emit(p,d.clone().multiplyScalar(3).add(rv(5)),0x9a1010,.12,.5,20);}
/* ---------- gibs: body chunks that tumble, bounce off walls and bleed ---------- */
const GMAX=160,gMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({map:texArmor}),GMAX);
gMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);gMesh.frustumCulled=false;
const GB=[];for(let i=0;i<GMAX;i++){GB.push({life:0,max:1,pos:new V3(),vel:new V3(),g:new V3(),rot:new THREE.Euler(),spin:new V3(),size:new V3(),rest:false,stains:0,trail:0});gMesh.setColorAt(i,_c.setHex(0xffffff));_o.scale.setScalar(0);_o.updateMatrix();gMesh.setMatrixAt(i,_o.matrix);}
scene.add(gMesh);let gIdx=0;
// Pieces mirror makeBotMesh: [w,h,d, x,y,z, part] where part 0 = armour colour, 1 = dark suit, 2 = meat.
const GIB_PARTS=[[.32,.32,.32,0,1.74,0,0],[.26,.2,.36,-.44,1.48,0,0],[.26,.2,.36,.44,1.48,0,0],[.31,.36,.38,-.16,1.3,0,0],[.31,.34,.38,.16,1.05,0,0],
  [.16,.55,.16,-.42,1.17,0,1],[.16,.55,.16,.42,1.17,0,1],[.2,.42,.24,-.15,.6,0,1],[.2,.4,.24,.15,.6,0,1],[.2,.38,.24,-.15,.2,0,1],[.2,.38,.24,.15,.2,0,1],[.5,.22,.32,0,.82,0,1]];
const GIB_MEAT=[0x8a1010,0x6e0c12,0xa8201a];
function spawnGib(e,w,h,d,x,y,z,color,heat,life){const i=gIdx;gIdx=(gIdx+1)%GMAX;const b=GB[i],up=entityUp(e);
  b.size.set(w,h,d);b.pos.copy(e.pos).addScaledVector(up,y);b.pos.x+=x;b.pos.z+=z;
  const out=new V3(x+(R()-.5)*.6,0,z+(R()-.5)*.6);if(out.lengthSq()<.01)out.set(R()-.5,0,R()-.5);out.normalize();
  b.vel.copy(out).multiplyScalar((3+R()*5)*heat).addScaledVector(up,(4+R()*6)*heat).add(rv(3*heat)).addScaledVector(e.vel,.6);
  const gs=curMap===9?15:(curMap>=0?(MAPS[curMap].gravity||G):G);b.g.copy(up).multiplyScalar(-gs);
  b.rot.set(R()*6,R()*6,R()*6);b.spin.set((R()-.5)*18,(R()-.5)*18,(R()-.5)*18);b.life=b.max=life*(.8+R()*.4);b.rest=false;b.stains=0;b.trail=0;
  gMesh.setColorAt(i,_c.setHex(color));gMesh.instanceColor.needsUpdate=true;}
function gibFX(e){const c=e.pos.clone().addScaledVector(entityUp(e),1);for(let i=0;i<25;i++)emit(c,rv(7),0xaa1010,.09,.6,20,false,1);
  const lvl=SET.gibs|0;if(!lvl)return;const crazy=lvl===2,heat=crazy?1.6:1,life=crazy?14:8;
  for(const [w,h,d,x,y,z,part] of GIB_PARTS)spawnGib(e,w,h,d,x,y,z,part?0x3a3a40:e.color,heat,life);
  const meat=crazy?22:7;for(let i=0;i<meat;i++){const s=.08+R()*(crazy?.2:.13);spawnGib(e,s,s*(.6+R()*.8),s,(R()-.5)*.5,.5+R()*1.3,(R()-.5)*.5,GIB_MEAT[i%3],heat*1.15,life*.7);}
  if(crazy)for(let i=0;i<30;i++)emit(c,rv(14),0xaa1010,.14,1,20,true,.5);}
const _gn=new V3(),_gAx=['x','y','z'];
function updateGibs(dt){for(let i=0;i<GMAX;i++){const b=GB[i];if(b.life<=0){if(b.max>0){b.max=0;_o.scale.setScalar(0);_o.updateMatrix();gMesh.setMatrixAt(i,_o.matrix);}continue;}
  b.life-=dt;if(b.pos.y<-80)b.life=0;
  if(!b.rest){b.vel.addScaledVector(b.g,dt);const fast=b.vel.lengthSq()>16;
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(b.vel.x),Math.abs(b.vel.y),Math.abs(b.vel.z))*dt/.15)),s=dt/n;
    for(let k=0;k<n;k++)for(let a=0;a<3;a++){const ax=_gAx[a],step=b.vel[ax]*s;if(!step)continue;_gn.copy(b.pos);_gn[ax]+=step+Math.sign(step)*Math.min(b.size.x,b.size.y,b.size.z)*.5;
      if(!pointSolid(_gn.x,_gn.y,_gn.z)){b.pos[ax]+=step;continue;}
      const hit=Math.abs(b.vel[ax]),onFloor=b.g[ax]*b.vel[ax]>0;b.vel[ax]*=-.38;for(const o of _gAx)if(o!==ax)b.vel[o]*=.72;b.spin.multiplyScalar(.6);
      if(onFloor&&hit>6&&!b.stains&&curMap!==9&&R()<.6){b.stains=1;addBloodStain(b.pos.clone().add(new V3(0,.2,0)),.3+R()*.25);}
      if(onFloor&&b.vel.lengthSq()<1.2){b.vel.set(0,0,0);b.rest=true;}}
    b.rot.x+=b.spin.x*dt;b.rot.y+=b.spin.y*dt;b.rot.z+=b.spin.z*dt;
    if(fast&&(b.trail-=dt)<=0){b.trail=.05;emit(b.pos,rv(.6),0x8a1010,.06,.5,10);}}
  const k=Math.min(1,b.life/.8);_o.position.copy(b.pos);_o.rotation.copy(b.rot);_o.scale.set(b.size.x*k,b.size.y*k,b.size.z*k);_o.updateMatrix();gMesh.setMatrixAt(i,_o.matrix);}
  gMesh.instanceMatrix.needsUpdate=true;}
function clearGibs(){for(const b of GB)b.life=0;}
function railFX(a,b,color){beam(a,b,color,.9,.07);beam(a,b,0xffffff,.3,.02);
  const d=b.clone().sub(a),L=d.length();d.normalize();const p1=new V3().crossVectors(d,Math.abs(d.y)>.9?new V3(1,0,0):UP).normalize(),p2=new V3().crossVectors(d,p1);
  for(let t=0;t<L&&t<80;t+=.45){const an=t*2.2,off=p1.clone().multiplyScalar(Math.cos(an)*.18).addScaledVector(p2,Math.sin(an)*.18);emit(a.clone().addScaledVector(d,t).add(off),off.clone().multiplyScalar(1.5),color,.07,.6+R()*.4,-.3);}}

