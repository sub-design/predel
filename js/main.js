// ПРЕДЕЛ — Main loop.
'use strict';
/* ---------- main loop ---------- */
function update(dt){time+=dt;if(state==='intro'){introT-=dt;if(introT<=0)finishIntro();return;}
  if(state==='play'||state==='paused'){matchTime-=dt;if(matchTime<=0){matchTime=0;endMatch();return;}if(state==='play')updatePlayer(dt);else if(player.alive)applyMove(player,new V3(),dt,false);}
  if(state==='play'){updateHill(dt);updateCtf(dt);}hillVisual();ctfVisual();
  for(const b of bots)if(ents.includes(b))updateBot(b,dt);
  for(const e of ents){if(!e.alive){if(e.remote&&!e.disc&&!e.out){e.deadT=(e.deadT||0)+dt;if(e.deadT>RESPAWN_AUTO+.3)spawnEntity(e);}continue;}
    updatePowerups(e,dt);if(e.remote){e.cd-=dt;e.hurtT-=dt;if(e.health>100)e.health=Math.max(100,e.health-dt*1.5);lavaCheck(e,dt,true,false);voidCheck(e,true);continue;}
    e.cd-=dt;e.padCD-=dt;e.hurtT-=dt;if(e.health>100)e.health=Math.max(100,e.health-dt*1.5);
    for(const p of PADS)if(e.padCD<=0&&onPad(e,p)){e.vel.copy(p.vel);e.grounded=false;e.padCD=.6;e.padAir=true;playSnd('pad',e===player?null:e.pos);for(let i=0;i<10;i++)emit(e.pos,new V3((R()-.5)*3,6+R()*4,(R()-.5)*3),0x40d0ff,.1,.6,8);}
    lavaCheck(e,dt,true,true);
    if(!e.alive)continue;
    const vy=e.vel.dot(entityUp(e)),wg=e.grounded;moveEntity(e,dt);voidCheck(e,true);if(e===player&&!wg&&e.grounded&&vy<-14)playSnd('land');}
  updateTempleFeatures(dt);updateReactor(dt);updateGhostShip(dt);updatePickups(dt);updateProjs(dt);for(const e of ents)if(e.mesh)updateBotMesh(e,dt);}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;
  if(isClient()){if(state!=='menu')clientUpdate(dt);}
  else if(state==='play'||state==='intro'||state==='menu'||(state==='paused'&&isHost()))update(dt);
  if(isHost())netTick(dt);
  updateParticles(dt);updateGibs(dt);updateCorpses(dt);updateTalkingHead(dt);updateFX(dt);updateWeather(dt);
  for(const L of LPOOL){L.t-=dt;L.l.intensity=L.t>0?L.i*(L.t/L.max):0;}
  for(const f of flames){const u=f.userData,k=1+Math.sin(time*13+u.ph)*.12+Math.sin(time*7.3+u.ph*2)*.08;f.scale.set(.8*u.s*k,1.5*u.s*(2-k),1);}
  if(curMap===1){texLava.offset.y=(texLava.offset.y+dt*.04)%1;texLava.offset.x=Math.sin(time*.3)*.05;if(R()<dt*20)emit(new V3((R()-.5)*7,-.5,(R()-.5)*48),new V3((R()-.5),2+R()*3,(R()-.5)),R()<.5?0xff5000:0xffb020,.1,1.2,-.5);}
  padCones.forEach((c,i)=>{c.material.opacity=.12+Math.sin(time*4+i)*.06;});
  if(state==='menu'){camera.up.copy(UP);menuAng+=dt*.08;camera.position.set(Math.sin(menuAng)*44,20,Math.cos(menuAng)*44);camera.lookAt(0,3,0);}
  else if(state==='intro')updateIntroCamera();
  else if(state!=='end'){
    if(player.alive){camera.position.copy(eyePos(player));if(curMap===9){camera.up.copy(entityUp(player));camera.lookAt(camera.position.clone().add(aimDir(player)));}else{camera.up.copy(UP);camera.rotation.set(player.pitch,player.yaw,curMap===8?Math.sin(time*1.35)*.022+(SHIP.waveT>0?.018:0):0);}}
    else{camera.position.copy(eyePos(player)).addScaledVector(entityUp(player),-1.25);if(curMap===9){camera.up.copy(entityUp(player));camera.lookAt(camera.position.clone().add(aimDir(player)));}else{camera.up.copy(UP);camera.rotation.set(player.pitch*.3,player.yaw,.35);}}
    shake=Math.max(0,shake-dt*1.5);if(shake>0)camera.position.add(rv(shake*.5));
    if(state==='play'){updateVM(dt);updateHUD(dt);}}
  skyMesh.position.copy(camera.position);if(curMap===2)skyMesh.rotation.y+=dt*.006;if(curMap===6){scene.fog.near=3;scene.fog.far=27+Math.sin(time*.45)*3;if(state==='play'&&player.alive&&R()<dt*26){const p=player.pos.clone().add(new V3((R()-.5)*34,7+R()*10,(R()-.5)*34));emit(p,new V3((R()-.5)*1.5,-3-R()*3,(R()-.5)*1.5),0xe9f7ff,.045,2.8);}}if(curMap===8&&state==='play'&&player.alive){if(R()<dt*85){const p=player.pos.clone().add(new V3((R()-.5)*42,12+R()*15,(R()-.5)*42));emit(p,new V3((R()-.5)*1.5,-13-R()*5,(R()-.5)*1.5),0xb6d5e5,.035,1.3); }if(R()<dt*.025)flashLight(new V3(player.pos.x+(R()-.5)*45,18,player.pos.z-35),0xdbeeff,.11,4,70);}updateWaterView();
  retroMaterial.uniforms.uRetro.value=retroMode?1:0;retroMaterial.uniforms.uTime.value=time;
  updateMirrors();updateVmChrome();
  if(retroMode){renderer.setRenderTarget(retroTarget);renderer.clear();renderer.render(scene,camera);if((state==='play'||state==='paused')&&player.alive){renderer.clearDepth();renderer.render(vmScene,vmCam);}renderer.setRenderTarget(null);renderer.clear();renderer.render(retroScene,retroCamera);}
  else{renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera);if((state==='play'||state==='paused')&&player.alive){renderer.clearDepth();renderer.render(vmScene,vmCam);}}
  if(screenshotPending){screenshotPending=false;saveScreenshot();}}

loadMap(0);
for(const b of bots)spawnEntity(b);
document.querySelectorAll('#botn button').forEach(b=>b.addEventListener('click',()=>{if(isClient())return;botCount=+b.dataset.b;updateDiffRow();broadcastLobbySoon();LS.set('predel.bots',String(botCount));document.querySelectorAll('#botn button').forEach(x=>x.classList.toggle('on',x===b));}));
{const sb=LS.get('predel.bots');if(sb!==''){botCount=+sb;document.querySelectorAll('#botn button').forEach(x=>x.classList.toggle('on',+x.dataset.b===botCount));}}
$('copyinv').addEventListener('click',e=>{e.stopPropagation();copyInvite();});
$('pname').value=LS.get('predel.name')||'Игрок';$('tuser').value=LS.get('predel.tu');$('tpass').value=LS.get('predel.tp');
if(location.hash.length>1){const h=new URLSearchParams(location.hash.slice(1));
  if(h.get('tu')&&h.get('tp')){$('tuser').value=h.get('tu');$('tpass').value=h.get('tp');}
  if(h.get('join')){$('jcode').value=h.get('join').toUpperCase();if(!LS.get('predel.name'))$('pname').value='';showInvite(h.get('h'));}
  history.replaceState(null,'',location.pathname+location.search);}
{const q=new URLSearchParams(location.search);if(q.get('name')){$('pname').value=q.get('name');$('jname').value=q.get('name');}if(q.get('host'))setTimeout(()=>hostGame(q.get('host').toUpperCase()),500);if(q.get('join')){$('jcode').value=q.get('join');setTimeout(()=>joinGame(q.get("join")),3500);}}
requestAnimationFrame(frame);
