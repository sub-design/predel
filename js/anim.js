// ПРЕДЕЛ — Fighter animation in the old-engine manner: stepped poses, death falls, corpses and taunts.
'use strict';
/* ---------- stepped pose animation ----------
   Bodies move smoothly through the world, but limb poses only change ANIM_FPS times a second,
   like vertex-animated models of the late 90s. */
const ANIM_FPS=12,TAUNT_TIME=1.3,TAUNT_NAMES=['wave','pump','beat','bow'];
function updateBotMesh(b,dt){const m=b.mesh;if(!b.alive)return;m.group.position.copy(b.pos);
  const lean=b.tauntT>0&&b.tauntK===3?Math.sin(Math.min(1,(TAUNT_TIME-b.tauntT)/.3)*Math.PI/2)*.45*(b.tauntT>.3?1:b.tauntT/.3):0;
  if(curMap===9){const up=entityUp(b),q=new THREE.Quaternion().setFromUnitVectors(UP,up),qy=new THREE.Quaternion().setFromAxisAngle(UP,b.yaw);m.group.quaternion.copy(q).multiply(qy);}
  else{m.group.rotation.order='YXZ';m.group.rotation.set(-lean,b.yaw,0);}
  updateEntityPowerVisual(b);
  const hs=Math.hypot(b.vel.x,b.vel.z);b.walkPh=(b.walkPh||0)+dt*hs*1.3;if(b.tauntT>0)b.tauntT-=dt;if(b.recoilT>0)b.recoilT-=dt;
  m.mat.emissive.setHex(b.doubleT>0?0x902000:b.hurtT>0?0x902020:0x000000);m.gunM.emissive.setHex(b.doubleT>0?0x902000:0x000000);
  b.animAcc=(b.animAcc||0)+dt;if(b.animAcc<1/ANIM_FPS&&b.posed)return;b.animAcc=0;b.posed=true;
  const run=Math.min(1,hs/6),sw=Math.sin(b.walkPh)*run*.8,idle=Math.sin(time*2.2+(b.nid||0))*.04;
  let lL,lR,aL,aR=Math.PI/2+b.pitch,aLz=0,aRz=0,hX=b.pitch*.5;
  if(b.grounded){lL=sw;lR=-sw;aL=-sw*.6+idle;}
  else{const up=b.vel.dot(entityUp(b))>0;lL=up?.75:.35;lR=up?-.2:-.45;aL=up?-1.1:-.5;}// tucked jump, then legs reach for the floor
  if(b.recoilT>0)aR+=.35;
  if(b.tauntT>0){const t=TAUNT_TIME-b.tauntT,beat=Math.floor(t*ANIM_FPS)%4<2;
    switch(b.tauntK){
      case 0:aL=Math.PI-.15;aLz=beat?-.45:.15;hX=-.15;break;// wave
      case 1:aR=Math.PI-.1+(beat?0:-.35);aL=-.3;hX=-.35;break;// gun overhead, pumping
      case 2:aL=1.25+(beat?.35:0);aR=1.25+(beat?0:.35);aLz=-.55;aRz=.55;hX=-.25;break;// chest beat
      default:aL=.25;aR=.6;hX=.55;}}// bow
  m.legL.rotation.x=lL;m.legR.rotation.x=lR;m.armL.rotation.set(aL,0,aLz);m.armR.rotation.set(aR,0,aRz);m.head.rotation.x=hX;}
function startTaunt(e,k){if(!e||!e.alive)return;e.tauntK=k==null?(R()*TAUNT_NAMES.length)|0:k;e.tauntT=TAUNT_TIME;if(isHost())nev({t:'tn',e:e.nid,k:e.tauntK});}
function requestTaunt(){if(state!=='play'||!player.alive)return;const k=(R()*TAUNT_NAMES.length)|0;if(isClient())netSend({t:'tn',k});else startTaunt(player,k);pickMsg('НАСМЕШКА: '+['ПРИВЕТ!','ВОТ ТАК!','КТО ТУТ ГЛАВНЫЙ?','БЛАГОДАРЮ ЗА ИГРУ'][k]);}

/* ---------- deaths: a stepped fall and a body that lies there, or gibs on a big hit ---------- */
const CORPSES=[],CORPSE_MAX=10,FALL_TIME=.7,CORPSE_LIFE=7;
// over = the killing blow overshot by a lot (rocket to the face, point-blank Кувалда, lava).
function deathFX(e,over,kind){addBloodStain(e.pos);const lvl=SET.gibs|0;
  if(!e.mesh||e===player||e.pos.y<-40||(lvl===2||(lvl===1&&over))){gibFX(e);return;}
  bloodFX(e.pos.clone().addScaledVector(entityUp(e),1.2),e.vel.clone().normalize());makeCorpse(e,kind);}
function makeCorpse(e,kind){const src=e.mesh.group,wrap=new THREE.Group(),body=src.clone(true);
  wrap.position.copy(src.position);wrap.quaternion.copy(src.quaternion);body.position.set(0,0,0);body.rotation.set(0,0,0);
  const idx=o=>src.children.indexOf(o),get=o=>body.children[idx(o)],M=e.mesh;
  const parts={head:get(M.head),armL:get(M.armL),armR:get(M.armR),legL:get(M.legL),legR:get(M.legR)};const sh=get(M.shield);if(sh)sh.visible=false;
  body.visible=true;wrap.add(body);scene.add(wrap);
  const c={wrap,body,parts,kind:kind==null?(R()*4)|0:kind,t:0,acc:1,color:e.color,up:entityUp(e).clone(),slide:e.vel.clone().multiplyScalar(.25)};c.slide.addScaledVector(c.up,-c.slide.dot(c.up));
  CORPSES.push(c);while(CORPSES.length>CORPSE_MAX)removeCorpse(CORPSES[0]);}
function removeCorpse(c){scene.remove(c.wrap);const i=CORPSES.indexOf(c);if(i>=0)CORPSES.splice(i,1);}
function clearCorpses(){while(CORPSES.length)removeCorpse(CORPSES[0]);}
const ease=k=>1-(1-k)*(1-k);
function updateCorpses(dt){for(let i=CORPSES.length-1;i>=0;i--){const c=CORPSES[i];c.t+=dt;
  if(c.t<FALL_TIME*1.5){const d=c.slide.clone().multiplyScalar(dt*Math.max(0,1-c.t/FALL_TIME));c.wrap.position.add(d);}
  if(c.t>CORPSE_LIFE){c.wrap.position.addScaledVector(c.up,-dt*.6);if(c.t>CORPSE_LIFE+2){removeCorpse(c);continue;}}
  c.acc+=dt;if(c.acc<1/ANIM_FPS)continue;c.acc=0;
  const k=ease(Math.min(1,c.t/FALL_TIME)),b=c.body,P=c.parts,flail=c.t<FALL_TIME?Math.sin(c.t*30)*.5*(1-k):0;
  switch(c.kind){
    case 0:b.rotation.set(k*Math.PI/2,0,0);b.position.y=k*.18;P.armL.rotation.set(Math.PI*.8*k+flail,0,-.3*k);P.armR.rotation.set(Math.PI*.7*k-flail,0,.3*k);P.legL.rotation.x=.4*k;P.legR.rotation.x=-.1*k;P.head.rotation.x=-.5*k;break;// onto the back
    case 1:b.rotation.set(-k*Math.PI/2,0,0);b.position.y=k*.2;P.armL.rotation.set(-Math.PI*.15*k+flail,0,-.6*k);P.armR.rotation.set(-Math.PI*.1*k,0,.7*k);P.legL.rotation.x=-.25*k;P.legR.rotation.x=.15*k;P.head.rotation.x=.4*k;break;// face down
    case 2:b.rotation.set(0,k*Math.PI*1.4,k*Math.PI/2);b.position.y=k*.2;P.armL.rotation.set(1.2*k+flail,0,0);P.armR.rotation.set(-.6*k,0,0);P.legL.rotation.x=.6*k;break;// spin and drop sideways
    default:{const a=Math.min(1,c.t/(FALL_TIME*.55)),f=ease(Math.max(0,(c.t-FALL_TIME*.55)/(FALL_TIME*.9)));// knees, then topple forward
      b.position.y=-.38*a+f*.58;b.rotation.set(-f*Math.PI/2,0,0);P.legL.rotation.x=1.5*a*(1-f*.6);P.legR.rotation.x=1.5*a*(1-f*.6);P.armL.rotation.set(.3*a-.6*f,0,-.4*f);P.armR.rotation.set(.3*a-.6*f,0,.4*f);P.head.rotation.x=.6*a;}}}}
// Explosions turn nearby bodies into gibs.
function corpseBlast(pt,r){for(let i=CORPSES.length-1;i>=0;i--){const c=CORPSES[i];if(c.wrap.position.distanceTo(pt)>r)continue;
  const fake={pos:c.wrap.position.clone(),vel:c.wrap.position.clone().sub(pt).setLength(6),color:c.color,up:c.up.clone(),yaw:0,pitch:0,h:1.8,r:.4};
  removeCorpse(c);if(SET.gibs|0)gibFX(fake);else for(let k=0;k<20;k++)emit(fake.pos.clone().addScaledVector(fake.up,.4),rv(7),0xaa1010,.09,.6,20,false,1);}}
