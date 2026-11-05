// ПРЕДЕЛ — King of the Hill, Capture the Flag, Last Man Standing.
'use strict';
/* king of the hill */
let HILL=null,hillMesh=null,hillHolder=0;
// Optional per-map hill node; by default the node nearest the map centre (all centres are reachable since the nav audit).
const HILL_NODE={};
function setupHill(){if(hillMesh&&hillMesh.parent)hillMesh.parent.remove(hillMesh);hillMesh=null;HILL=null;hillHolder=0;if(gameMode!=='koth'||!NODES.length)return;
  let bi=HILL_NODE[curMap];if(bi==null||!NODES[bi]){const c=new V3();for(const n of NODES)c.add(n);c.multiplyScalar(1/NODES.length);let bd=1e9;bi=0;for(let i=0;i<NODES.length;i++){const d=NODES[i].distanceTo(c)+(curMap===9?0:Math.abs(NODES[i].y-c.y)*.5);if(d<bd){bd=d;bi=i;}}}
  const pos=NODES[bi].clone(),up=curMap===9?cubeUpAt(pos).clone():UP.clone();HILL={node:bi,pos,up};
  const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.CylinderGeometry(4,4,3.2,28,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  const base=new THREE.Mesh(new THREE.RingGeometry(3.7,4,28),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));base.rotation.x=-Math.PI/2;base.position.y=-1.5;g.add(ring,base);
  g.position.copy(pos);g.quaternion.setFromUnitVectors(UP,up);g.userData.mats=[ring.material,base.material];hillMesh=g;LV.add(g);}
function inHill(e){if(!HILL||!e.alive)return false;const d=e.pos.clone().sub(HILL.pos),h=d.dot(HILL.up);if(h<-2.2||h>2.6)return false;return d.addScaledVector(HILL.up,-h).length()<4;}
function hillColor(){return hillHolder>0?(()=>{const e=NET.byNid.get(hillHolder)||ents.find(x=>x.nid===hillHolder);return e?teamColorFor(e):0xffffff;})():hillHolder<0?0xffc020:0xffffff;}
function updateHill(dt){if(gameMode!=='koth'||!HILL)return;const inz=ents.filter(inHill);hillHolder=inz.length===1?inz[0].nid:inz.length?-1:0;
  if(state==='play'&&inz.length===1){const e=inz[0];e.hillAcc=(e.hillAcc||0)+dt;if(e.hillAcc>=1){e.hillAcc-=1;e.frags++;if(e===player)playSnd('hit');else if(e.remote)sendTo(e,{t:'hm'});if(e.frags>=fragLimit())endMatch();}}}
function hillVisual(){if(!hillMesh)return;const c=hillColor(),p=.18+.08*Math.sin(time*4);for(const m of hillMesh.userData.mats)m.color.setHex(c);hillMesh.userData.mats[0].opacity=hillHolder?p+.1:p;}
function hillStatus(){if(hillHolder===0)return'ВЫСОТА СВОБОДНА';if(hillHolder<0)return'ВЫСОТА СПОРНАЯ';if(hillHolder===player.nid)return'<span style="color:#ffd040">ВЫСОТА ВАША</span>';const e=NET.byNid.get(hillHolder)||ents.find(x=>x.nid===hillHolder);return'ВЫСОТА: '+(e?nm(e):'?');}
/* capture the flag */
let CTF=null;
// Hand-picked opposite bases where the automatic farthest-pair choice lands on walls, bridges or a cramped hub.
const CTF_BASES={0:[23,24],2:[2,4],4:[1,2],5:[15,16],6:[3,4],9:[5,8]};
function ctfDist(a){const N=NODES.length,d=new Array(N).fill(1e9),done=new Array(N).fill(false);d[a]=0;for(let k=0;k<N;k++){let u=-1;for(let i=0;i<N;i++)if(!done[i]&&(u<0||d[i]<d[u]))u=i;if(u<0||d[u]>=1e9)break;done[u]=true;for(const v of ADJ[u]){const nd=d[u]+NODES[u].distanceTo(NODES[v]);if(nd<d[v])d[v]=nd;}}return d;}
function setupCtf(){if(CTF)for(const m of CTF.meshes)if(m.parent)m.parent.remove(m);CTF=null;if(gameMode!=='ctf'||!NODES.length)return;
  const N=NODES.length,isPadN=i=>PADS.some(p=>onPad({pos:NODES[i]},p)),D=[];for(let i=0;i<N;i++)D.push(ctfDist(i));let ba=0,bb=1,bv=-1;
  for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){if(isPadN(a)||isPadN(b)||ADJ[a].length<2||ADJ[b].length<2)continue;const v=Math.min(D[a][b],D[b][a]);if(v<1e9&&v>bv){bv=v;ba=a;bb=b;}}
  if(CTF_BASES[curMap]){[ba,bb]=CTF_BASES[curMap];}
  const basePos=[NODES[ba].clone(),NODES[bb].clone()],meshes=[];
  const mk=t=>{const g=new THREE.Group(),col=TEAM_COLORS[t];const pole=new THREE.Mesh(new THREE.BoxGeometry(.1,2.6,.1),new THREE.MeshLambertMaterial({color:0xdddddd}));pole.position.y=1.3;const cloth=new THREE.Mesh(new THREE.BoxGeometry(1.3,.8,.06),new THREE.MeshBasicMaterial({color:col}));cloth.position.set(.68,2.15,0);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,14,6,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=8;g.add(pole,cloth,beam);g.userData.cloth=cloth;LV.add(g);meshes.push(g);return g;};
  const ring=t=>{const r=new THREE.Mesh(new THREE.RingGeometry(1.5,1.9,24),new THREE.MeshBasicMaterial({color:TEAM_COLORS[t],transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));const up=curMap===9?cubeUpAt(basePos[t]):UP;r.quaternion.setFromUnitVectors(new V3(0,0,1),up);r.position.copy(basePos[t]).addScaledVector(up,.06);LV.add(r);meshes.push(r);};
  ring(0);ring(1);CTF={bases:[ba,bb],basePos,f:[0,1].map(t=>({st:'base',by:0,pos:basePos[t].clone(),t:0,mesh:mk(t)})),meshes};}
function ctfEnt(n){return n?(NET.byNid.get(n)||ents.find(x=>x.nid===n)):null;}
function ctfTell(team,own,other){for(const h of ents){if(h!==player&&!h.remote)continue;const s=h.team===team?own:other;if(!s)continue;if(h===player)announce(s);else sendTo(h,{t:'ann',s});}}
function ctfReturn(i,quiet){const F=CTF.f[i];F.st='base';F.by=0;F.pos.copy(CTF.basePos[i]);if(!quiet){feed(`<span class="w">флаг: ${TEAM_NAMES[i].toLowerCase()} — на базе</span>`);playSnd('pickup');}}
function ctfDrop(e,lost){if(!CTF)return;for(let i=0;i<2;i++){const F=CTF.f[i];if(F.st==='carried'&&F.by===e.nid){if(lost){ctfReturn(i);continue;}F.st='dropped';F.by=0;F.pos.copy(e.pos);F.t=20;feed(`${nm(e)} <span class="w">теряет флаг</span>`);}}}
function ctfCarrying(e){return!!CTF&&CTF.f.some(F=>F.st==='carried'&&F.by===e.nid);}
function updateCtf(dt){if(gameMode!=='ctf'||!CTF||state!=='play')return;
  for(let i=0;i<2;i++){const F=CTF.f[i];
    if(F.st==='carried'){const c=ctfEnt(F.by);if(!c||!c.alive||c.disc){F.st='dropped';F.by=0;F.t=20;}else F.pos.copy(c.pos);}
    if(F.st==='dropped'){F.t-=dt;if(F.t<=0){ctfReturn(i);continue;}}
    if(F.st==='carried')continue;
    for(const e of ents){if(!e.alive||e.disc||e.team==null||e.pos.distanceTo(F.pos)>1.8)continue;
      if(e.team!==i){F.st='carried';F.by=e.nid;feed(`${nm(e)} <span class="w">взял флаг</span>`);playSnd('weapon',e===player?null:e.pos);ctfTell(i,'ВАШ ФЛАГ УКРАДЕН!','ФЛАГ У НАС!');if(e===player)centerMsg('Несите флаг на свою базу',3);else if(e.remote)sendTo(e,{t:'cm',h:'Несите флаг на свою базу'});break;}
      else if(F.st==='dropped'){ctfReturn(i);if(e.st)e.st.ret=(e.st.ret||0)+1;break;}}}
  for(let i=0;i<2;i++){const F=CTF.f[i];if(F.st!=='carried')continue;const c=ctfEnt(F.by),j=1-i;if(!c||c.team!==j)continue;
    if(CTF.f[j].st==='base'&&c.pos.distanceTo(CTF.basePos[j])<2.2){teamScores[j]++;if(c.st)c.st.caps=(c.st.caps||0)+1;ctfReturn(i,true);feed(`${nm(c)} <span class="w">приносит флаг!</span>`);playSnd('respawn');ctfTell(j,TEAM_NAMES[j]+' ЗАХВАТИЛИ ФЛАГ!',TEAM_NAMES[j]+' ЗАХВАТИЛИ ФЛАГ!');if(teamScores[j]>=fragLimit())endMatch();}}}
function ctfVisual(){if(!CTF)return;for(let i=0;i<2;i++){const F=CTF.f[i],m=F.mesh;let p=F.pos,up=curMap===9?cubeUpAt(F.pos):UP;
  if(F.st==='carried'){const c=ctfEnt(F.by);if(c){p=c.pos;up=entityUp(c);}m.visible=!!c&&c!==player&&c.alive;m.position.copy(p).addScaledVector(up,1.2);}else{m.visible=true;m.position.copy(p);}
  m.quaternion.setFromUnitVectors(UP,up);m.userData.cloth.rotation.y=Math.sin(time*3+i)*.35;}}
function ctfStatus(i){const F=CTF.f[i];if(F.st==='base')return'НА БАЗЕ';if(F.st==='dropped')return'ЛЕЖИТ';const c=ctfEnt(F.by);return c===player?'<span style="color:#ffd040">У ВАС</span>':'У '+(c?nm(c):'?');}
function lmsLeft(){return ents.filter(e=>!e.out).length;}
function lmsCheck(){if(gameMode==='lms'&&state==='play'&&ents.length>1&&lmsLeft()<=1)endMatch();}
