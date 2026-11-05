// ПРЕДЕЛ — Local player controls and the first-person viewmodel.
'use strict';
/* ---------- player ---------- */
const RESPAWN_AUTO=3;const keys={};let mouseDown=false,mouseAltDown=false,deadT=0,dmgFlash=0,hitMarker=0,shake=0,vmKick=0,vmFlashT=0,bobPh=0,spinV=0,swayX=0,swayY=0;
const lastTap={};
function updatePlayer(dt){
  const zooming=player.weapon===6&&mouseAltDown;camera.fov+=((zooming?32:SET.fov)-camera.fov)*Math.min(1,dt*12);camera.updateProjectionMatrix();
  if(!player.alive){deadT+=dt;if(player.out)return;if(isClient()){if(mouseDown&&deadT>1){netSend({t:'rs'});deadT=.5;}}else if(deadT>RESPAWN_AUTO||(mouseDown&&deadT>1))spawnEntity(player);return;}
  const f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0),sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);
  let wish;if(curMap===9){const b=cubeBasis(entityUp(player),player.yaw);wish=b.forward.multiplyScalar(f).addScaledVector(b.right,s);}else wish=new V3(-sy*f+cy*s,0,-cy*f-sy*s);if(wish.lengthSq()>0)wish.normalize();
  const jet=player.jetT>0;applyMove(player,wish,dt,!!keys.Space&&!jet);if(jet&&keys.Space){player.vel.addScaledVector(entityUp(player),25*dt);player.grounded=false;}player.switchT-=dt;
  if((mouseDown||(mouseAltDown&&player.weapon!==6))&&player.cd<=0&&player.switchT<=0)fire(player,mouseAltDown&&player.weapon!==6);}
function dodge(code){if(state!=='play'||!player.alive||!player.grounded)return;const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);let d;
  if(curMap===9){const b=cubeBasis(entityUp(player),player.yaw),f=code==='KeyW'?1:code==='KeyS'?-1:0,s=code==='KeyD'?1:code==='KeyA'?-1:0;d=b.forward.multiplyScalar(f).addScaledVector(b.right,s).normalize();player.vel.copy(d.multiplyScalar(17)).addScaledVector(entityUp(player),6.5);}
  else{if(code==='KeyW')d=new V3(-sy,0,-cy);else if(code==='KeyS')d=new V3(sy,0,cy);else if(code==='KeyD')d=new V3(cy,0,-sy);else d=new V3(-cy,0,sy);player.vel.x=d.x*17;player.vel.z=d.z*17;player.vel.y=6.5;}
  player.grounded=false;playSnd('jump');}

/* ---------- viewmodel ---------- */
const vmRoot=new THREE.Group();vmRoot.scale.setScalar(.72);vmScene.add(vmRoot);vmScene.add(vmCam);
const vmModels=WEAPONS.map(w=>{const m=makeWeaponModel(w.id);m.visible=false;vmRoot.add(m);return m;});
const vmFlash=new THREE.Sprite(new THREE.SpriteMaterial({map:texFlash,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));vmFlash.scale.setScalar(.3);vmRoot.add(vmFlash);
function updateVM(dt){const w=player.weapon;for(const model of vmModels)model.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats)if(mat.emissive){if(mat.userData.baseEmissive==null)mat.userData.baseEmissive=mat.emissive.getHex();mat.emissive.setHex(player.doubleT>0?0x9b1800:mat.userData.baseEmissive);}});vmModels.forEach((m,i)=>m.visible=i===w);const m=vmModels[w];
  const hs=Math.hypot(player.vel.x,player.vel.z);if(player.grounded)bobPh+=dt*hs*.9;const bk=Math.min(1,hs/11)*(player.grounded?1:.2);
  vmKick=Math.max(0,vmKick-dt*8);swayX*=Math.pow(.001,dt);swayY*=Math.pow(.001,dt);
  const sw=Math.max(0,player.switchT)/.25;
  vmRoot.position.set(.3+Math.sin(bobPh)*.014*bk+swayX,-.3-Math.abs(Math.cos(bobPh))*.016*bk-sw*.35+swayY,-.55+vmKick*.07);
  vmRoot.rotation.set(vmKick*.12,0,0);
  if(m.userData.spin){spinV=mouseDown&&w===1&&player.alive?Math.min(30,spinV+dt*80):Math.max(0,spinV-dt*20);m.userData.spin.rotation.z+=spinV*dt;}
  vmFlashT-=dt;vmFlash.visible=vmFlashT>0;vmFlash.position.set(0,0,m.userData.muzzleZ);vmFlash.material.color.setHex(WEAPONS[w].color);vmFlash.material.rotation=R()*6;}

