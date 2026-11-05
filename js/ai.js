// ПРЕДЕЛ — Pickups and bot AI.
'use strict';
/* ---------- pickups ---------- */
const PICKUPS=[];
function pickupMesh(type){const g=new THREE.Group();let m;
  if(type==='health')m=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.6),new THREE.MeshLambertMaterial({map:texMed,emissive:0x303030}));
  else if(type==='mega')m=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,0),new THREE.MeshLambertMaterial({color:0x3060ff,emissive:0x1838b0}));
  else if(type==='armor')m=new THREE.Mesh(new THREE.OctahedronGeometry(.55,0),new THREE.MeshLambertMaterial({color:0x40e070,emissive:0x106028}));
  else if(type==='ammo')m=new THREE.Mesh(new THREE.BoxGeometry(.7,.4,.5),new THREE.MeshLambertMaterial({map:texCrate,color:0xffe080,emissive:0x202010}));
  else if(POWERUPS[type]){const p=POWERUPS[type];m=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),new THREE.MeshPhongMaterial({color:p.color,emissive:p.color,emissiveIntensity:.42,shininess:90}));const ring=new THREE.Mesh(new THREE.TorusGeometry(.68,.045,5,16),new THREE.MeshBasicMaterial({color:p.color}));ring.rotation.x=Math.PI/2;g.add(ring);}
  else{m=makeWeaponModel(type[0]==='w'?+type.slice(1):4);m.scale.setScalar(1.8);}
  g.add(m);return g;}
function addPickup(type,node,respawn){const base=NODES[node].clone(),mesh=pickupMesh(type),up=curMap===9?(CUBE_NODE_UP[node]||UP):UP;mesh.position.copy(base);mesh.quaternion.setFromUnitVectors(UP,up);LV.add(mesh);
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(.7,.8,.15,8),matTrim);ped.position.copy(base).addScaledVector(up,.075);ped.quaternion.setFromUnitVectors(UP,up);LV.add(ped);
  PICKUPS.push({type,node,base,mesh,respawn,active:true,t:0,ph:R()*6});}
const PICK_NAMES={health:'АПТЕЧКА +25',mega:'МЕГА-ЗДОРОВЬЕ +100',armor:'БРОНЯ +100',ammo:'ПАТРОНЫ',w2:'ГРОМОБОЙ',w3:'ИГЛА',w4:'КУВАЛДА',w5:'ГРАНАТОМЁТ',w6:'СНАЙПЕРКА',...Object.fromEntries(Object.entries(POWERUPS).map(([k,v])=>[k,v.label]))};
function tryPickup(e,p){const t=p.type;
  if(POWERUPS[t])e[POWERUPS[t].field]=POWERUPS[t].duration;
  else if(t==='health'){if(e.health>=100)return false;e.health=Math.min(100,e.health+25);}
  else if(t==='mega'){if(e.health>=199)return false;e.health=Math.min(199,e.health+100);}
  else if(t==='armor'){if(e.armor>=150)return false;e.armor=Math.min(150,e.armor+100);}
  else if(t==='ammo'){for(let i=0;i<WEAPONS.length;i++)if(e.owned[i])e.ammo[i]=Math.min(WEAPONS[i].max,e.ammo[i]+Math.ceil(WEAPONS[i].pick*.6));}
  else{const id=+t.slice(1),W=WEAPONS[id];if(e.owned[id]&&e.ammo[id]>=W.max)return false;const had=e.owned[id];e.owned[id]=1;e.ammo[id]=Math.min(W.max,e.ammo[id]+W.pick);if(e===player&&!had)switchWeapon(e,id);if(e.remote&&!had)e._sw=id;}
  const ps=POWERUPS[t]?'power':t==='health'||t==='mega'?'health':t[0]==='w'?'weapon':'pickup';
  if(e===player){pickMsg('ПОДОБРАНО: '+PICK_NAMES[t]);playSnd(ps);}
  else if(e.remote){sendTo(e,{t:'pk',s:'ПОДОБРАНО: '+PICK_NAMES[t],n:ps,sw:e._sw!=null?e._sw:null});e._sw=null;}
  return true;}
function updatePickups(dt){const noPk=modeWeapon()!=null;for(const p of PICKUPS){
  if(noPk){p.mesh.visible=false;continue;}else if(p.active&&!p.mesh.visible)p.mesh.visible=true;
  if(!p.active){if(isClient())continue;p.t-=dt;if(p.t<=0){p.active=true;p.mesh.visible=true;for(let i=0;i<14;i++)emit(p.base.clone().addScaledVector(curMap===9?CUBE_NODE_UP[p.node]:UP,.8),rv(4),0xffffff,.08,.5);}continue;}
  const up=curMap===9?(CUBE_NODE_UP[p.node]||UP):UP;p.mesh.rotateOnAxis(UP,dt*1.6);p.mesh.position.copy(p.base).addScaledVector(up,.75+Math.sin(time*2+p.ph)*.15);if(isClient())continue;
  for(const e of ents){if(!e.alive)continue;const d=e.pos.distanceTo(p.base),dx=e.pos.x-p.base.x,dz=e.pos.z-p.base.z,dy=e.pos.y-p.base.y;
    if(curMap===9?d<1.8:(dx*dx+dz*dz<1.7&&dy>-.6&&dy<2)){if(tryPickup(e,p)){p.active=false;p.t=p.respawn;p.mesh.visible=false;break;}}}}}

/* ---------- movement / AI ---------- */
function applyMove(e,wish,dt,jump){const up=entityUp(e),sp=(e.isBot?SKILL[difficulty].speed:11.5)*(e.speedT>0?1.5:1)*(inWater(e) ? .62 : 1);wish.addScaledVector(up,-wish.dot(up));const along=e.vel.dot(up),tangent=e.vel.clone().addScaledVector(up,-along);
  if(e.grounded){const k=Math.min(1,(onIce(e)?2.4:14)*dt);tangent.addScaledVector(wish.clone().multiplyScalar(sp).sub(tangent),k);e.vel.copy(tangent).addScaledVector(up,along);if(jump){e.vel.addScaledVector(up,curMap===9?15:JUMP);e.grounded=false;if(e===player)playSnd('jump');}}
  else{tangent.addScaledVector(wish,sp*2.2*dt);const h=tangent.length(),lim=Math.max(e.vel.clone().addScaledVector(up,-along).length(),sp);if(h>lim)tangent.multiplyScalar(lim/h);e.vel.copy(tangent).addScaledVector(up,along);}}
function chooseWeapon(b,dist){const has=i=>b.owned[i]&&b.ammo[i]>0;let w=b.weapon;const T=TRAITS[b.trait],pw=T&&T.pick?T.pick(has,dist):-1;
  if(pw>=0)w=pw;else if(has(6)&&dist>22)w=6;else if(has(3)&&dist>18)w=3;else if(has(4)&&dist<12)w=4;else if(has(5)&&dist>5&&dist<24)w=5;else if(has(2)&&dist>5&&dist<28)w=2;else if(has(1))w=1;else if(has(0))w=0;else if(has(2))w=2;else if(has(3))w=3;
  if(w!==b.weapon){b.weapon=w;b.cd=Math.max(b.cd,.3);}}
function ctfGoal(b){if(gameMode!=='ctf'||!CTF||b.team==null)return -1;const my=b.team,en=1-my,F=CTF.f,mine=F[my],theirs=F[en];
  if(theirs.st==='carried'&&theirs.by===b.nid)return CTF.bases[my];
  if(mine.st==='dropped'&&R()<.85)return nearestNode(mine.pos);
  if(mine.st==='carried'&&R()<(b.ctfRole==='def'?.9:.6)){const c=ctfEnt(mine.by);if(c)return nearestNode(c.pos);}
  if(b.ctfRole==='def'){const n=CTF.bases[my],a=ADJ[n];return R()<.6||!a.length?n:a[(R()*a.length)|0];}
  if(theirs.st==='carried'){const c=ctfEnt(theirs.by);if(c&&R()<.5)return nearestNode(c.pos);return CTF.bases[my];}
  return nearestNode(theirs.pos);}
function planPath(b){const s=nearestNode(b.pos);let goal=ctfGoal(b);const tr=b.trait,scared=tr==='coward'&&b.health<45;
  if(goal>=0){const path=bfs(s,goal);b.path=path?(path[0]===s?path:[s,...path]):[s,ADJ[s][(R()*ADJ[s].length)|0]];return;}
  if(HILL&&gameMode==='koth'&&!scared&&R()<(tr==='collector'?.6:.85))goal=HILL.node;
  else if(b.target&&!scared&&R()<(tr==='rush'?.85:tr==='sniper'?.15:.4))goal=nearestNode(b.target.pos);
  else if(R()<(tr==='collector'||scared?.97:.75)){let bv=0;for(const p of PICKUPS){if(!p.active||modeWeapon()!=null)continue;let v=0;const t=p.type;
    if(POWERUPS[t]&&b[POWERUPS[t].field]<=0)v=1.8;if(t==='health'&&b.health<60)v=3;if(t==='mega')v=b.health<120?2.5:.4;if(t==='armor')v=b.armor<50?2:.3;if(t==='w2'&&!b.owned[2])v=2.5;if(t==='w3'&&!b.owned[3])v=2.5;if(t==='w4'&&!b.owned[4])v=2.5;if(t==='w5'&&!b.owned[5])v=2.5;if(t==='w6'&&!b.owned[6])v=2.5;if(t==='ammo')v=.6;if(tr==='collector')v*=1.6;if(scared&&(t==='health'||t==='mega'))v*=3;
    v=v/(1+NODES[p.node].distanceTo(b.pos)/30)*(.6+R()*.8);if(v>bv){bv=v;goal=p.node;}}}
  if(goal<0)goal=(R()*NODES.length)|0;
  const path=bfs(s,goal);b.path=path?(path[0]===s?path:[s,...path]):[s,ADJ[s][(R()*ADJ[s].length)|0]];}
function updateBot(b,dt){
  if(!b.alive){if(b.out)return;b.respawnT-=dt;if(b.respawnT<=0)spawnEntity(b);return;}
  const sk=SKILL[difficulty];b.think-=dt;b.alertT-=dt;b.reactT-=dt;
  if(b.think<=0){b.think=.2+R()*.1;const eye=eyePos(b),fwd=aimDir(b);let best=null,bd=1e9,bdist=0;
    for(const e of ents){if(e===b||!e.alive||sameTeam(b,e))continue;const te=eyePos(e).addScaledVector(entityUp(e),-.4);const dv=te.sub(eye),dist=dv.length();if(dist>75)continue;dv.normalize();
      if(!(dv.dot(fwd)>.25||dist<10||(e===b.target&&b.alertT>0)))continue;if(rayLevel(a3(eye),a3(dv),dist)<dist-.2)continue;
      const sc=dist*(e===b.target?.6:1);if(sc<bd){bd=sc;best=e;bdist=dist;}}
    if(best&&best!==b.target)b.reactT=sk.react*(.7+R()*.6);
    if(!best&&b.alertT<=0)b.target=null;else if(best)b.target=best;
    if(best)chooseWeapon(b,bdist);}
  if(b.target&&!b.target.alive)b.target=null;
  if(gameMode==='ctf'){b.ctfT=(b.ctfT||0)-dt;if(b.ctfT<=0){b.ctfT=1.5+R();b.path=null;}}
  const holdHill=gameMode==='koth'&&HILL&&inHill(b)&&!(b.trait==='coward'&&b.health<45);
  if(holdHill)b.path=[];else if(!b.path||!b.path.length)planPath(b);
  const wish=new V3();let jump=false;
  if(b.path.length){const n=NODES[b.path[0]],delta=n.clone().sub(b.pos),hd=curMap===9?delta.length():Math.hypot(delta.x,delta.z);
    if(curMap===9){const up=entityUp(b);if(hd<(PADS.some(p=>p.pos&&p.pos.distanceTo(n)<.1)?.9:1.5))b.path.shift();else{delta.addScaledVector(up,-delta.dot(up));if(delta.lengthSq()>.02)wish.copy(delta.normalize());else if(b.grounded&&n.clone().sub(b.pos).dot(up)>.1)jump=true;}}
    else if(hd<1.2&&Math.abs(n.y-b.pos.y)<2.5)b.path.shift();else wish.set(delta.x/hd,0,delta.z/hd);}
  // Hop onto knee-high steps and trims in the way (there is no automatic step-up).
  if(curMap!==9&&b.grounded&&wish.lengthSq()>.01){const f=wish.clone().normalize(),o=b.pos.clone();o.y+=.45;if(rayLevel(a3(o),a3(f),.8)<.8){o.y+=.8;if(rayLevel(a3(o),a3(f),.8)>=.8)jump=true;}}
  const pathWish=wish.clone();
  if(b.target&&b.grounded&&!ctfCarrying(b)){const up=entityUp(b),td=b.target.pos.clone().sub(b.pos).addScaledVector(up,-b.target.pos.clone().sub(b.pos).dot(up));const dist=td.length();td.normalize();b.strafePh+=dt*b.strafeF;const s=Math.sin(b.strafePh),right=new V3().crossVectors(aimDir(b),up).normalize();
    wish.addScaledVector(right,s*1.1);const tr=b.trait;if(tr==='rush'){if(dist>2.5)wish.addScaledVector(td,.9);}else if(tr==='coward'&&b.health<45)wish.addScaledVector(td,-1.4);else if(tr==='sniper'&&dist<16)wish.addScaledVector(td,-.9);else if(dist<7)wish.addScaledVector(td,-.6);
    if(gameMode==='koth'&&HILL&&inHill(b)&&!(tr==='coward'&&b.health<45))wish.multiplyScalar(.35);if(wish.lengthSq()>0)wish.normalize();jump=jump||R()<dt*.5;}
  // Ledge sense on maps with a deadly drop: never strafe or hop toward a missing floor.
  if((curMap===2||curMap===5||curMap===8)&&b.grounded&&wish.lengthSq()>.01){const noFloor=d=>{const pr=b.pos.clone().addScaledVector(d,1.3);pr.y+=.6;return rayLevel(a3(pr),[0,-1,0],4)>=3.9;};
    if(noFloor(wish.clone().normalize())){wish.copy(pathWish);jump=false;if(wish.lengthSq()>.01&&noFloor(wish.clone().normalize())&&b.path&&b.path.length&&NODES[b.path[0]].y>=b.pos.y-.5)wish.set(0,0,0);}}
  // Cube pads fire bots through narrow portals: stay ballistic while rising, steering would drag them into the frame.
  if(b.padAir&&curMap===9){if(b.grounded&&b.padCD<=0)b.padAir=false;else{jump=false;if(b.vel.dot(entityUp(b))>0)wish.set(0,0,0);}}
  applyMove(b,wish,dt,jump);if(b.jetT>0&&b.target&&b.target.pos.clone().sub(b.pos).dot(entityUp(b))>.8){b.vel.addScaledVector(entityUp(b),22*dt);b.grounded=false;}
  b.stuckT+=dt;if(b.stuckT>1.2){if(b.pos.distanceTo(b.stuckPos)<1){b.path=null;if(b.grounded)b.vel.addScaledVector(entityUp(b),JUMP);}b.stuckT=0;b.stuckPos.copy(b.pos);}
  let dYaw=b.yaw,dPitch=0;
  if(b.target){const w=WEAPONS[b.weapon],tp=b.target.pos.clone().addScaledVector(entityUp(b),w.id===2?.3:1.2);const eye=eyePos(b);
    if(w.type==='proj')tp.addScaledVector(b.target.vel,tp.distanceTo(eye)/w.speed*sk.lead);
    const d=tp.sub(eye);if(curMap===9){const basis=cubeBasis(entityUp(b));dYaw=Math.atan2(-d.dot(basis.right),d.dot(basis.ref))+b.aimErrY;dPitch=Math.asin(clamp(d.dot(entityUp(b))/Math.max(.001,d.length()),-1,1))+b.aimErrP;}else{dYaw=Math.atan2(-d.x,-d.z)+b.aimErrY;dPitch=Math.atan2(d.y,Math.hypot(d.x,d.z))+b.aimErrP;}}
  else if(wish.lengthSq()>.01){if(curMap===9){const basis=cubeBasis(entityUp(b));dYaw=Math.atan2(-wish.dot(basis.right),wish.dot(basis.ref));}else dYaw=Math.atan2(-wish.x,-wish.z);}
  b.aimErrT-=dt;if(b.aimErrT<=0){b.aimErrT=.3;b.aimErrY=(R()-.5)*2*sk.err;b.aimErrP=(R()-.5)*1.2*sk.err;}
  const turn=sk.turn*dt*(b.target?1:.7),dy=angDiff(dYaw,b.yaw);b.yaw+=clamp(dy,-turn,turn);b.pitch+=clamp(dPitch-b.pitch,-turn,turn);
  if(b.target&&b.reactT<=0&&b.cd<=0&&Math.abs(angDiff(dYaw,b.yaw))<.12&&Math.abs(dPitch-b.pitch)<.12)fire(b);}
function updateEntityPowerVisual(e){if(!e.mesh)return;const alpha=e.invisT>0?(e.invisFlickerT>0?.72:.16):1;if(e.lastInvisAlpha!==alpha){e.lastInvisAlpha=alpha;e.mesh.group.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m.userData.powerVisBase)m.userData.powerVisBase={transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite};const b=m.userData.powerVisBase,newTransparent=alpha<1||b.transparent;if(m.transparent!==newTransparent)m.needsUpdate=true;m.opacity=b.opacity*alpha;m.transparent=newTransparent;m.depthWrite=alpha<1?false:b.depthWrite;}});}if(e.mesh.shield)e.mesh.shield.visible=e.shieldT>0;}
function updateBotMesh(b,dt){const m=b.mesh;if(!b.alive)return;m.group.position.copy(b.pos);if(curMap===9){const up=entityUp(b),q=new THREE.Quaternion().setFromUnitVectors(UP,up),qy=new THREE.Quaternion().setFromAxisAngle(UP,b.yaw);m.group.quaternion.copy(q).multiply(qy);}else m.group.rotation.set(0,b.yaw,0);updateEntityPowerVisual(b);
  const hs=Math.hypot(b.vel.x,b.vel.z);b.walkPh+=dt*hs*1.3;const sw=b.grounded?Math.sin(b.walkPh)*Math.min(1,hs/6)*.8:.5;
  m.legL.rotation.x=sw;m.legR.rotation.x=b.grounded?-sw:-.3;m.armL.rotation.x=-sw*.6;m.armR.rotation.x=Math.PI/2+b.pitch;m.head.rotation.x=b.pitch*.5;
  m.mat.emissive.setHex(b.doubleT>0?0x902000:b.hurtT>0?0x902020:0x000000);m.gunM.emissive.setHex(b.doubleT>0?0x902000:0x000000);}

