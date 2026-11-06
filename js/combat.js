// ПРЕДЕЛ — Spawning, firing, projectiles, damage and kills.
'use strict';
function spawnEntity(e){clearPowerups(e);let best=SPAWNS[0],bd=-1;for(let k=0;k<6;k++){const sp=SPAWNS[(R()*SPAWNS.length)|0];let md=1e9;for(const o of ents)if(o!==e&&o.alive)md=Math.min(md,o.pos.distanceTo(sp));if(md>bd){bd=md;best=sp;}}
  if(gameMode==='ctf'&&CTF&&e.team!=null){const bp=CTF.basePos[e.team],sp=[...SPAWNS].sort((a,b)=>a.distanceTo(bp)-b.distanceTo(bp));best=sp[(R()*Math.min(3,sp.length))|0];}
  e.pos.copy(best);if(curMap===9){e.yaw=0;e.up.set(0,1,0);cubeFrame(e,true);}e.pos.addScaledVector(entityUp(e),.01);e.vel.set(0,0,0);e.health=100;e.armor=0;e.owned=Array(WEAPONS.length).fill(0);e.owned[0]=e.owned[1]=1;e.ammo=Array(WEAPONS.length).fill(0);e.ammo[0]=40;e.ammo[1]=100;e.weapon=1;e.alive=true;e.cd=.3;e.grounded=false;
  if(curMap!==9)e.yaw=Math.atan2(e.pos.x,e.pos.z);e.pitch=0;e.streak=0;e.multi=0;e.sseq++;e.deadT=0;if(e.mesh)e.mesh.group.visible=true;nev({t:'sp',e:e.nid,p:a3r(e.pos)});
  if(e.isBot){e.path=null;e.target=null;e.mesh.group.visible=true;const T=TRAITS[e.trait];if(T&&R()<.7){const w=T.fav[(R()*T.fav.length)|0];e.owned[w]=1;e.ammo[w]=WEAPONS[w].pick;}else if(R()<.55){const w=[2,3,4,5,6][(R()*5)|0];e.owned[w]=1;e.ammo[w]=WEAPONS[w].pick;}}
  {const mw=modeWeapon();if(mw!=null){e.owned=Array(WEAPONS.length).fill(0);e.owned[mw]=1;e.ammo=Array(WEAPONS.length).fill(0);e.ammo[mw]=99;e.weapon=mw;}}
  const up=entityUp(e),c=e.pos.clone().addScaledVector(up,1);for(let i=0;i<20;i++)emit(c.clone().add(rv(1.2)),up.clone().multiplyScalar(2+R()*3),0x80e0ff,.1,.8);
  playSnd('respawn',e===player?null:e.pos);
  if(e===player){$('center').innerHTML='';showWeaponName();if(e.deaths>0)speakBattleLine(RESPAWN_LINES);}}

function switchWeapon(e,id){if(!e.owned[id]||e.ammo[id]<=0||e.weapon===id)return false;e.weapon=id;e.switchT=.25;e.cd=Math.max(e.cd,.2);if(e===player){playSnd('switch');showWeaponName();}return true;}
function autoSwitch(e){for(const id of [6,5,4,2,3,1,0])if(e.owned[id]&&e.ammo[id]>0){switchWeapon(e,id);return;}}

const projs=[];
const geoBolt=new THREE.OctahedronGeometry(.16),geoRocket=new THREE.CylinderGeometry(.07,.07,.5,6),matRocket=new THREE.MeshLambertMaterial({map:texGun,color:0xc0c0c0}),matBolt=new THREE.MeshBasicMaterial({color:0x80ffff}),matGlowO=new THREE.MeshBasicMaterial({color:0xffa030});
function makeProjMesh(w){let m;if(w.id===2){m=new THREE.Group();const b=new THREE.Mesh(geoRocket,matRocket);b.rotation.x=Math.PI/2;m.add(b);const f=new THREE.Mesh(geoBolt,matGlowO);f.scale.setScalar(.8);f.position.z=-.32;m.add(f);}else if(w.id===5){m=new THREE.Mesh(new THREE.IcosahedronGeometry(.24,1),new THREE.MeshPhongMaterial({color:0x6a3a30,emissive:0xff4010,emissiveIntensity:.7}));}else m=new THREE.Mesh(geoBolt,matBolt);return m;}
function spawnProj(e,pos,dir,w){const m=makeProjMesh(w);
  m.position.copy(pos);scene.add(m);const vel=dir.clone().multiplyScalar(w.speed);m.lookAt(pos.clone().add(vel));const id=NET.projSeq++;projs.push({id,owner:e,pos:pos.clone(),vel,w,life:w.fuse||5,mesh:m});
  nev({t:'pj',i:id,w:w.id,p:a3r(pos),v:a3r(vel)});}

// Кувалда should feel like a sledgehammer: big flash, smoke, view kick and a shove backwards.
function shotgunFeel(e,alt,start,dir){flashLight(start,0xffc070,.12,4.5,16);const me=e===player,sp=me?start.clone().addScaledVector(dir,1.6):start;for(let i=0;i<(alt?3:(me?5:9));i++)emit(sp,dir.clone().multiplyScalar(2+R()*3).add(rv(1.2)),0x8c8c8c,(me?.035:.1)+R()*(me?.03:.08),.45+R()*.35,-1,false,2.5);
  if(e!==player)return;vmKick=alt?1.7:2.6;vmFlashT=.09;shake=Math.max(shake,alt?.18:.32);recoilQ+=alt?.03:.065;player.vel.addScaledVector(dir,alt?-2:-4.5);}
function fire(e,alt=false){if(isClient()){if(e===player)clientFire(alt);return;}const w=WEAPONS[e.weapon];
  if(e.ammo[w.id]<=0){if(e===player){playSnd('empty');e.cd=.3;}autoSwitch(e);return;}
  e.recoilT=.12;e.ammo[w.id]--;if(e.st)e.st.shots[w.id]++;if(modeWeapon()!=null)e.ammo[w.id]=99;e.cd=alt?(w.altRate||w.rate):w.rate;if(e.invisT>0)e.invisFlickerT=.32;
  const eye=eyePos(e),dir=aimDir(e),mz=muzzlePos(e,dir),md=eye.distanceTo(mz),mdir=mz.clone().sub(eye).normalize();
  const start=rayLevel(a3(eye),a3(mdir),md)>=md-1e-3?mz:eye.clone();
  flashLight(start,w.color,.07,2.2,10);playSnd(w.snd,e===player?null:e.pos);nev({t:'fi',e:e.nid,w:w.id},e);
  if(e===player){vmKick=1;vmFlashT=.05;}if(w.type==='shotgun')shotgunFeel(e,alt,start,dir);
  if(w.type==='proj'){const shotW=alt?{...w,speed:w.altSpeed||w.speed,dmg:w.altDmg||w.dmg,splash:w.altSplash||0,knock:w.altKnock||w.knock}:w;const tl=rayLevel(a3(eye),a3(dir),300),aim=eye.clone().addScaledVector(dir,tl),base=aim.sub(start).normalize();if(w.id===2&&alt){for(const off of [-.075,0,.075]){const d=base.clone();d.x+=Math.cos(e.yaw)*off;d.z+=Math.sin(e.yaw)*off;spawnProj(e,start,d.normalize(),shotW);}}else spawnProj(e,start,base,shotW);}
  else if(w.id===3&&alt){const d=dir.clone();if(e.forceDir){d.set(e.forceDir[0],e.forceDir[1],e.forceDir[2]).normalize();e.forceDir=null;}hitscanPierce(e,eye,d,{...w,dmg:w.altDmg,headDmg:w.altHeadDmg,knock:w.altKnock},start,w.altTargets);}
  else if(w.type==='shotgun'){const pellets=alt?1:w.pellets,base=dir.clone();if(e.forceDir){base.set(e.forceDir[0],e.forceDir[1],e.forceDir[2]).normalize();e.forceDir=null;}for(let i=0;i<pellets;i++){const d=base.clone().add(rv(alt?w.altSpread:w.spread*2)).normalize();const sw=alt?{...w,dmg:w.altDmg,spread:0,type:'hitscan'}:w;hitscan(e,eye,d,sw,start);}}
  else{const d=dir.clone();if(e.forceDir){d.set(e.forceDir[0],e.forceDir[1],e.forceDir[2]).normalize();e.forceDir=null;}else if(alt&&w.id===1){d.add(rv(w.altSpread*2)).normalize();}else if(w.spread){d.add(rv(w.spread*2)).normalize();}const shotW=alt&&w.id===1?{...w,dmg:w.altDmg,spread:w.altSpread,knock:w.altKnock}:w;hitscan(e,eye,d,shotW,start);}
  if(e.ammo[w.id]<=0&&!e.remote)setTimeout(()=>autoSwitch(e),250);}
function hitscanPierce(e,eye,d,w,start,maxTargets){
  const o=a3(eye),da=a3(d),limit=rayLevel(o,da,250),skip=new Set();let last=eye.clone().addScaledVector(d,limit),hitAny=false;
  for(let i=0;i<maxTargets;i++){const h=rayEnts(o,da,limit,e,skip);if(!h)break;skip.add(h.e);hitAny=true;last=eye.clone().addScaledVector(d,h.t);let dmg=w.dmg,head=false;if(last.clone().sub(h.e.pos).dot(entityUp(h.e))>h.e.h-.4){dmg=w.headDmg;head=true;}kick(h.e,d.clone().multiplyScalar(w.knock));damage(h.e,dmg,e,w,head);bloodFX(last,d);nev({t:'hs',w:w.id,a:a3r(start),b:a3r(last),h:1},e);}
  if(!hitAny&&limit<250)sparkFX(last,w.color);railFX(start,last,w.color);if(!hitAny)flashLight(last,w.color,.3,2,8);
}
function hitscan(e,eye,d,w,start){const o=a3(eye),da=a3(d),tl=rayLevel(o,da,250),h=rayEnts(o,da,tl,e),t=h?h.t:tl,end=eye.clone().addScaledVector(d,t);
  if(h){let dmg=w.dmg,head=false;if((w.type==='rail'||w.type==='sniper')&&end.clone().sub(h.e.pos).dot(entityUp(h.e))>h.e.h-.4){dmg=w.headDmg;head=true;}if(w.id===4)dmg*=clamp(1-(t/30)*.45,.5,1);kick(h.e,d.clone().multiplyScalar(w.knock));damage(h.e,dmg,e,w,head);bloodFX(end,d);}
  else if(t<250){sparkFX(end,w.color);if(t<249.5)addShotMark(end,d,0x202329,w.id===2?.34:.14);}
  if(w.type==='rail'){railFX(start,end,w.color);if(!h)flashLight(end,w.color,.3,2,8);}else beam(start,end,w.color,.06,.018);
  nev({t:'hs',w:w.id,a:a3r(start),b:a3r(end),h:h?1:0},e);}

function damage(t,amt,att,w,head){if(!att&&w&&w.lava&&t.lastAtt&&t.lastAtt!==t&&time-t.lastAttT<4&&ents.includes(t.lastAtt))att=t.lastAtt;
  if(!t.alive||state==='end'||sameTeam(att,t))return;
  if(gameMode==='rocket'&&t===att)return;if(gameMode==='insta'&&att&&att!==t&&w&&w.id===3)amt=9999;
  if(att&&att!==t&&!(w&&w.lava)){t.lastAtt=att;t.lastAttT=time;}
  if(att&&att.doubleT>0)amt*=2;
  if(att&&att.isBot)amt*=SKILL[difficulty].dmgMul;
  if(t===att)amt*=.5;
  if(t.armor>0){const ab=Math.min(t.armor,amt*.66);t.armor-=ab;amt-=ab;}
  t.health-=amt;t.hurtT=.15;
  if(att&&att!==t&&att.st&&w&&w.id!=null){att.st.dmg+=amt+Math.min(0,t.health);if(!(att.st.hitT===time&&att.st.hitW===w.id)){att.st.hits[w.id]++;att.st.hitT=time;att.st.hitW=w.id;}}
  const src=att&&att!==t?att.pos:null;
  if(t===player){dmgFlash=Math.min(1,dmgFlash+amt/35);playSnd('hurt');addDmgDir(src);}
  else if(t.remote)sendTo(t,{t:'hu',a:Math.round(amt),p:src?a3r(src):null});
  else if(att&&att!==t){t.target=att;t.alertT=2.5;}
  if(att===player&&t!==player){hitMarker=.12;playSnd('hit');}else if(att&&att.remote&&t!==att)sendTo(att,{t:'hm'});
  if(t.health<=0)kill(t,att,w,head);}
let firstBlood=false;
const MULTI=['','','ДВОЙНОЕ УБИЙСТВО','ТРОЙНОЕ УБИЙСТВО','МЕГА-УБИЙСТВО','ЧУДОВИЩНО!'];
const STREAK={5:'СЕРИЯ УБИЙСТВ!',10:'НЕУДЕРЖИМ!',15:'БОГОПОДОБЕН!'};
const nm=e=>`<span style="color:${hex(teamColorFor(e))}">${e.name}</span>`;
function kill(t,att,w,head){t.lastAtt=null;addBloodStain(t.pos);clearPowerups(t);t.alive=false;t.deaths++;t.streak=0;t.deadT=0;const over=t.health<=-35||!!(w&&w.lava)||!!(w&&w.splash&&t.health<=-15),dk=(R()*4)|0;deathFX(t,over,dk);playSnd('death',t===player?null:t.pos);if(t===player)speakBattleLine(DEATH_LINES);nev({t:'gib',e:t.nid,o:over?1:0,k:dk});
  if(gameMode==='ctf')ctfDrop(t,!!(w&&w.lava)||t.pos.y<-40);
  if(t.st&&(!att||att===t))t.st.self++;
  if(att&&att!==t&&att.st&&t.st){if(w&&w.id!=null)att.st.kills[w.id]++;else att.st.push++;att.st.vic[t.nid]=(att.st.vic[t.nid]||0)+1;t.st.by[att.nid]=(t.st.by[att.nid]||0)+1;att.st.best=Math.max(att.st.best,att.streak+1);}
  if(gameMode==='lms'&&t.lives!=null){t.lives--;if(t.lives<=0){t.out=true;}}
  if(!att||att===t){if(gameMode!=='koth')t.frags--;feed(`${nm(t)} <span class="w">[${w&&w.lava?w.name:'САМОПОДРЫВ'}]</span>`);}
  else{if(gameMode!=='koth')att.frags++;if(att.isBot&&att.alive&&R()<.45)startTaunt(att);botSay(att,'kill',t);botSay(t,'death',att);att.streak++;if(time-att.lastKill<3)att.multi++;else att.multi=1;att.lastKill=time;
    if(gameMode==='team'&&att.team!=null)teamScores[att.team]++;
    feed(`${nm(att)} <span class="w">[${w.name}]</span> ${nm(t)}`);
    let fb=false;if(!firstBlood){firstBlood=true;fb=true;}
    const human=att===player||att.remote;let ann=null;
    if(human){if(STREAK[att.streak])ann=STREAK[att.streak];if(att.multi>=2)ann=MULTI[Math.min(5,att.multi)];if(head)ann=ann||'В ГОЛОВУ!';
      const km=`ВЫ УБИЛИ: ${nm(t)}`;if(att===player)centerMsg(km,2);else sendTo(att,{t:'cm',h:km});}
    else if(STREAK[att.streak])feed(`${nm(att)} <span class="w">— ${STREAK[att.streak].toLowerCase()}</span>`);
    if(state==='play'||state==='paused')for(const h of ents){if(h!==player&&!h.remote)continue;const s=h===att?(ann||(fb?'ПЕРВАЯ КРОВЬ':null)):(fb?'ПЕРВАЯ КРОВЬ':null);if(!s)continue;if(h===player)announce(s);else sendTo(h,{t:'ann',s});}}
  const dh=deathHTML(t,att,w);
  if(t===player){deadT=0;pickT=0;cache.rsp=null;$('center').innerHTML=dh;centerT=999;}
  else if(t.remote){t.mesh.group.visible=false;sendTo(t,{t:'dead',h:dh});}
  else{t.mesh.group.visible=false;t.respawnT=2.5;}
  if(t.out)feed(`${nm(t)} <span class="w">выбывает</span>`);
  if(state==='play'&&att&&gameMode!=='koth'&&gameMode!=='lms'&&gameMode!=='ctf'&&(isTeam()?teamScores[att.team]>=fragLimit():att.frags>=fragLimit()))endMatch();
  lmsCheck();}

function updateProjs(dt){for(let i=projs.length-1;i>=0;i--){const p=projs[i];p.life-=dt;const step=p.vel.length()*dt,d=p.vel.clone().normalize(),o=a3(p.pos),da=a3(d),tl=rayLevel(o,da,step),h=rayEnts(o,da,tl,p.owner);
  if(h&&h.e.shieldT>0&&h.e!==p.owner&&(p.reflections||0)<1){const pt=p.pos.clone().addScaledVector(d,h.t);p.owner=h.e;p.reflections=(p.reflections||0)+1;p.pos.copy(pt).addScaledVector(d,-.18);p.vel.multiplyScalar(-.88);p.mesh.position.copy(p.pos);p.mesh.lookAt(p.pos.clone().add(p.vel));nev({t:'pr',i:p.id,p:a3r(p.pos),v:a3r(p.vel)});continue;}
  if(p.w.grenade){if(h||p.life<=0){const pt=h?p.pos.clone().addScaledVector(d,h.t):p.pos.clone();impact(p,pt,h&&h.e,d);scene.remove(p.mesh);projs.splice(i,1);continue;}if(tl<step){p.pos.addScaledVector(d,Math.max(0,tl-.05));let bounced=false;for(const [axis,delta] of [['x',new V3(.18,0,0)],['y',new V3(0,.18,0)],['z',new V3(0,0,.18)]]){const plus=p.pos.clone().add(delta),minus=p.pos.clone().sub(delta);if(pointSolid(plus.x,plus.y,plus.z)||pointSolid(minus.x,minus.y,minus.z)){p.vel[axis]*=-.72;bounced=true;}}if(!bounced)p.vel.multiplyScalar(-.72);p.vel.multiplyScalar(.96);p.bounces=(p.bounces||0)+1;p.pos.addScaledVector(p.vel.clone().normalize(),.08);p.mesh.position.copy(p.pos);p.mesh.lookAt(p.pos.clone().add(p.vel));nev({t:'pr',i:p.id,p:a3r(p.pos),v:a3r(p.vel)});}else p.pos.addScaledVector(d,step);p.vel.addScaledVector(curMap===9?cubeUpAt(p.pos):UP,-(curMap===9?15:G)*dt*.65);p.mesh.position.copy(p.pos);p.mesh.rotation.x+=dt*7;emit(p.pos,rv(.25),0xff6030,.08,.3);continue;}
  if(h||tl<step||p.life<=0){const pt=p.pos.clone().addScaledVector(d,h?h.t:tl);impact(p,pt,h&&h.e,d);scene.remove(p.mesh);projs.splice(i,1);continue;}
  p.pos.addScaledVector(d,step);p.mesh.position.copy(p.pos);
  if(p.w.id===2){emit(p.pos,rv(.6).add(new V3(0,.5,0)),R()<.3?0xff8030:0x55505a,.25,.6,-.5,false,1);}
  else{p.mesh.rotation.z+=dt*10;if(R()<.6)emit(p.pos,rv(.5),0x40ffff,.06,.25);}}}
function impact(p,pt,hitE,d){const w=p.w;nev({t:'pe',i:p.id,w:w.id,p:a3r(w.splash?pt.clone().addScaledVector(d,-.25):pt),d:a3r(d),x:w.splash?1:0,h:hitE?1:0});if(w.splash){if(!hitE)addShotMark(pt,d,0x292327,.32);explode(pt.addScaledVector(d,-.25),w,p.owner,hitE);}
  else{if(hitE){kick(hitE,d.clone().multiplyScalar(w.knock));damage(hitE,w.dmg,p.owner,w);bloodFX(pt,d);}else{sparkFX(pt,w.color);addShotMark(pt,d,0x292327,.28);}flashLight(pt,w.color,.15,1.5,6);playSnd('zap',pt);}}
function explode(pt,w,owner,direct){explosionFX(pt);playSnd('boom',pt);corpseBlast(pt,(w.splash||4)*.9);
  for(const e of ents){if(!e.alive||sameTeam(owner,e))continue;const up=entityUp(e),c=e.pos.clone().addScaledVector(up,e.h/2);const dist=c.distanceTo(pt);let dmg=0;
    if(e===direct)dmg=w.dmg;else if(dist<w.splash){const dd=c.clone().sub(pt),L=dd.length();dd.normalize();if(rayLevel(a3(pt),a3(dd),L)<L-.1)continue;dmg=w.dmg*(1-dist/w.splash)*.9;}else continue;
    const kd=c.clone().sub(pt).addScaledVector(up,.5).normalize();const kf=Math.max(0,1-dist/(w.splash*1.2));kick(e,kd.clone().multiplyScalar(kf*w.knock*(e===owner?1:.7)));if(!e.remote)e.grounded=false;
    damage(e,dmg,owner,w);}
  const pd=camera.position.distanceTo(pt);if(pd<18)shake=Math.max(shake,(1-pd/18)*.6);}

