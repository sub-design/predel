// ПРЕДЕЛ — HUD, scoreboard and post-match stats.
'use strict';
/* ---------- HUD ---------- */
const cache={};function setT(id,v){if(cache[id]!==v){cache[id]=v;$(id).textContent=v;}}
function setH(id,v){if(cache[id]!==v){cache[id]=v;$(id).innerHTML=v;}}
const feedList=[];function feed(html,ttl=6){nev({t:'fd',h:html,l:ttl});const d=document.createElement('div');d.innerHTML=html;$('feed').prepend(d);feedList.push({d,t:ttl});while($('feed').children.length>5)$('feed').lastChild.remove();}
let annT=0,annSubT=0,centerT=0,pickT=0;
function announce(t){$('annbig').textContent=t;annT=2.2;speak(t);}
function centerMsg(h,d){$('annsub').innerHTML=h;annSubT=d;}
const chatList=[];function chatLine(h){const d=document.createElement('div');d.innerHTML=h;$('chatlog').append(d);chatList.push({d,t:12});while($('chatlog').children.length>6){$('chatlog').firstChild.remove();chatList.shift();}}
const dmgDirs=[];function addDmgDir(p){if(!p)return;const d=document.createElement('div');$('dmgdir').append(d);dmgDirs.push({d,p:p.clone(),t:1.1});while(dmgDirs.length>4){dmgDirs.shift().d.remove();}}
const _dq=new THREE.Quaternion(),_dv=new V3();
function updateDmgDirs(dt){if(!dmgDirs.length)return;_dq.copy(camera.quaternion).invert();for(let i=dmgDirs.length-1;i>=0;i--){const o=dmgDirs[i];o.t-=dt;if(o.t<=0||!player.alive){o.d.remove();dmgDirs.splice(i,1);continue;}_dv.copy(o.p).sub(player.pos).applyQuaternion(_dq);const a=Math.atan2(_dv.x,-_dv.z)*180/Math.PI;o.d.style.transform=`rotate(${a.toFixed(1)}deg)`;o.d.style.opacity=clamp(o.t/.5,0,1);}}
function deathHTML(t,att,w){const ww=w&&w.lava,where=w===VOID?'в бездну':w===LAVA?'в лаву':w&&w.name?'в '+w.name.toLowerCase():'';let k,d;
  if(att&&att!==t){k='ВАС УБИЛ: '+nm(att);const hp=att.alive?Math.max(1,Math.ceil(att.health)):0;d=(ww?`Сбросил вас ${where}`:`${w&&w.name?w.name:''}`)+(att.alive?` · у него ${hp} HP`:' · он тоже погиб');}
  else{k='ВЫ ПОГИБЛИ';d=ww?(w===VOID?'Упали в бездну':w===LAVA?'Сгорели в лаве':w.name):'Подорвались сами';}
  if(t.out){k='ВЫ ВЫБЫЛИ';d+=' · жизни кончились';}
  return `<div class="dbox"><div class="dk">${k}</div><div class="dw">${d}</div><div class="dr" id="rsp"></div></div>`;}
function pickMsg(t){$('pickmsg').textContent=t;pickT=2;}
function weaponHint(w){return w.id===4?'Дробь с отбросом':w.id===6?'Зажмите ПКМ для зума':'ПКМ — '+String(w.altName||'').toLowerCase();}
function showWeaponName(){pickMsg(weaponHint(WEAPONS[player.weapon]));}
/* post-match stats */
const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return n+' '+(m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c);};
function matchSummary(){const out={};for(const e of ents){const s=e.st||newStats(),sh=s.shots.reduce((a,b)=>a+b,0),hi=s.hits.reduce((a,b)=>a+b,0);
  let fw=-1,fk=0;s.kills.forEach((k,i)=>{if(k>fk){fk=k;fw=i;}});if(fw<0){let m=0;s.shots.forEach((k,i)=>{if(k>m){m=k;fw=i;}});}
  const top=o=>{let n=0,c=0;for(const k in o)if(o[k]>c){c=o[k];n=+k;}return c?[n,c]:null;};
  out[e.nid]={a:sh?Math.min(100,Math.round(100*hi/sh)):null,sh,fw,fk,bs:s.best,d:Math.round(s.dmg),ne:top(s.by),vi:top(s.vic),sk:s.self,pu:s.push,cp:s.caps||0};}
  return out;}
function statsHTML(sum,me){const ent=n=>NET.byNid.get(n)||ents.find(x=>x.nid===n),name=n=>{const e=ent(n);return e?nm(e):'?';};const my=sum[me];let h='<div class="endstats">';
  if(my){h+='<div class="col"><div class="sh">ВАШ МАТЧ</div>';
    h+=`<div>Точность <b>${my.a==null?'—':my.a+'%'}</b></div>`;
    if(my.fw>=0)h+=`<div>Любимое оружие <b>${WEAPONS[my.fw].name}</b>${my.fk?` · ${plural(my.fk,'фраг','фрага','фрагов')}`:''}</div>`;
    h+=`<div>Лучшая серия <b>${my.bs}</b> · урон <b>${my.d}</b></div>`;
    h+=my.ne?`<div>Главный враг ${name(my.ne[0])} — <b>${plural(my.ne[1],'ваша смерть','ваши смерти','ваших смертей')}</b></div>`:'<div>Вас ни разу не убили</div>';
    if(my.vi)h+=`<div>Любимая жертва ${name(my.vi[0])} — <b>${plural(my.vi[1],'фраг','фрага','фрагов')}</b></div>`;
    h+='</div>';}
  const ids=Object.keys(sum).map(Number),best=(f,ok=()=>true)=>{let b=null,bv=-1;for(const n of ids){const v=f(sum[n]);if(ok(sum[n])&&v>bv){bv=v;b=n;}}return b==null||bv<=0?null:[b,bv];},aw=[];
  let x=best(s=>s.a||0,s=>s.sh>=15);if(x)aw.push(['МЕТКИЙ ГЛАЗ',x[0],x[1]+'% попаданий']);
  x=best(s=>s.d);if(x)aw.push(['МЯСОРУБКА',x[0],x[1]+' урона']);
  x=best(s=>s.bs);if(x&&x[1]>=3)aw.push(['НЕУДЕРЖИМЫЙ',x[0],'серия '+x[1]]);
  x=best(s=>s.cp||0);if(x)aw.push(['ЗНАМЕНОСЕЦ',x[0],'флагов: '+x[1]]);
  x=best(s=>s.pu);if(x)aw.push(['ВЫШИБАЛА',x[0],'в пропасть: '+x[1]]);
  x=best(s=>s.sk);if(x&&x[1]>=2)aw.push(['САМ СЕБЕ ВРАГ',x[0],'самоподрывы: '+x[1]]);
  if(aw.length){h+='<div class="col"><div class="sh">НАГРАДЫ</div>'+aw.slice(0,4).map(([t,n,d])=>`<div><span class="aw">${t}</span> ${name(n)} <i>${d}</i></div>`).join('')+'</div>';}
  return h+'</div>';}
function sorted(){if(gameMode==='lms')return [...ents].sort((a,b)=>(a.out?1:0)-(b.out?1:0)||(b.lives||0)-(a.lives||0)||b.frags-a.frags||a.deaths-b.deaths);return [...ents].sort((a,b)=>b.frags-a.frags||a.deaths-b.deaths);}
function pingTxt(e){if(e.isBot)return'БОТ';if(e.ping!=null)return e.ping+' МС';if(isHost()?e===player:!e.remote&&e!==player)return'ХОСТ';return'…';}
function boardHTML(){const net=isHost()||isClient(),cols=net?4:3;const lms=gameMode==='lms',head=`<table><tr><th>ИГРОК</th><th class="n">${gameMode==='koth'?'ОЧКИ':'ФРАГИ'}</th><th class="n">${lms?'ЖИЗНИ':'СМЕРТИ'}</th>${net?'<th class="n">ПИНГ</th>':''}</tr>`;const row=e=>`<tr class="${e===player?'me':''}"><td>${e===player?e.name:nm(e)}</td><td class="n">${e.frags}</td><td class="n">${lms?(e.out?'—':e.lives):e.deaths}</td>${net?`<td class="n">${pingTxt(e)}</td>`:''}</tr>`;if(isTeam())return head+TEAM_NAMES.map((name,t)=>`<tr class="teamhead"><td colspan="${cols}" style="color:${hex(TEAM_COLORS[t])}">${name} — ${teamScores[t]} / ${fragLimit()}</td></tr>${sorted().filter(e=>e.team===t).map(row).join('')}`).join('')+'</table>';return head+sorted().map(row).join('')+'</table>';}
function updateHUD(dt){
  const hp=Math.max(0,Math.ceil(player.health));setT('hp',hp);$('hp').className=hp<30?'low':hp>100?'over':'';setT('ar',Math.ceil(player.armor));
  const w=WEAPONS[player.weapon];setT('ammo',player.ammo[w.id]);setT('wname',w.name);
  setH('wbar',WEAPONS.map(x=>`<div class="${player.owned[x.id]?'own':''} ${x.id===player.weapon?'cur':''}">${x.id+1}</div>`).join(''));
  const mm=Math.floor(matchTime/60),ss=Math.floor(matchTime%60);setT('timer',`${mm}:${ss<10?'0':''}${ss}`);$('shieldfx').style.opacity=player.shieldT>0?'.72':'0';
  const srt=sorted();if(gameMode==='ctf'&&CTF&&player.team!=null){const mt=player.team,ot=1-mt;setT('frags',`${TEAM_NAMES[mt]} ${teamScores[mt]||0} : ${teamScores[ot]||0} · ДО ${fragLimit()}`);setH('rank',`ВАШ ФЛАГ: ${ctfStatus(mt)}<br>ФЛАГ ВРАГА: ${ctfStatus(ot)}`);}
  else if(isTeam()){setT('frags',`${TEAM_NAMES[player.team]} ${teamScores[player.team]||0} / ${fragLimit()}`);setT('rank',`ЛИЧНЫЕ ФРАГИ ${player.frags}`);}else if(gameMode==='koth'){setT('frags',`ОЧКИ ${player.frags} / ${fragLimit()}`);setH('rank',`МЕСТО ${srt.indexOf(player)+1} ИЗ ${ents.length}<br>${hillStatus()}`);}
  else if(gameMode==='lms'){setT('frags',player.out?'ВЫ ВЫБЫЛИ':`ЖИЗНИ ${player.lives}`);setT('rank',`ОСТАЛОСЬ ${lmsLeft()} ИЗ ${ents.length}`);}
  else{setT('frags',`ФРАГИ ${player.frags} / ${fragLimit()}`);setT('rank',`МЕСТО ${srt.indexOf(player)+1} ИЗ ${ents.length}`);}
  for(let i=feedList.length-1;i>=0;i--){feedList[i].t-=dt;if(feedList[i].t<=0){feedList[i].d.remove();feedList.splice(i,1);}}
  annT-=dt;$('annbig').style.opacity=clamp(annT/.5,0,1);annSubT-=dt;$('annsub').style.opacity=clamp(annSubT/.4,0,1);
  for(let i=chatList.length-1;i>=0;i--){chatList[i].t-=dt;if(chatList[i].t<=0){chatList[i].d.remove();chatList.splice(i,1);}}
  updateDmgDirs(dt);if(!player.alive&&$('rsp'))setT('rsp',player.out?'Дождитесь конца матча':deadT<1?'':deadT<RESPAWN_AUTO?`Клик — возродиться · сам через ${Math.ceil(RESPAWN_AUTO-deadT)}`:'');
  if(centerT<900){centerT-=dt;if(centerT<=0)setCenterEmpty();}
  pickT-=dt;$('pickmsg').style.opacity=clamp(pickT/.4,0,1);
  dmgFlash=Math.max(0,dmgFlash-dt*1.8);$('dmg').style.opacity=dmgFlash;
  hitMarker-=dt;$('cross').classList.toggle('hit',hitMarker>0);
  const sc=$('score');const show=keys.Tab&&state==='play';sc.style.display=show?'block':'none';if(show)setH('score',boardHTML());
  // target name
  let tn='';if(player.alive){const o=a3(camera.position),d=a3(aimDir(player)),tl=rayLevel(o,d,60),h=rayEnts(o,d,tl,player);if(h)tn=`${nm(h.e)} <span style="color:#888">${Math.max(0,Math.ceil(h.e.health))}</span>`;}setH('target',tn);}
function setCenterEmpty(){if(player.alive)$('center').innerHTML='';centerT=0;}

function showIntroCard(on){$('intromap').textContent=MAPS[curMap].name+(gameMode!=='ffa'?' · '+MODE_NAMES[gameMode]:'');$('introcard').classList.toggle('hidden',!on);}
function finishIntro(){if(state!=='intro')return;introT=0;state='play';showIntroCard(false);$('hud').style.display='block';if(isHost())nev({t:'go'});if(introInvitePause){introInvitePause=false;showPause(true);}else requestLock();}
function updateIntroCamera(){camera.up.copy(UP);const k=1-clamp(introT/3.2,0,1),a=k*Math.PI*.8,r=46-18*k;camera.position.set(Math.sin(a)*r,18-7*k,Math.cos(a)*r);camera.lookAt(0,1.5,0);}
