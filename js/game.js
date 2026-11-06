// ПРЕДЕЛ — Match flow, menus, lobby, settings and chat.
'use strict';
/* ---------- game state ---------- */
let botCount=5;
let state='menu',time=0,matchTime=MATCH_TIME,menuAng=0,locked=false,noLock=false,introT=0,introInvitePause=false,retroMode=false,screenshotPending=false;
function newStats(){const z=()=>Array(WEAPONS.length).fill(0);return{shots:z(),hits:z(),kills:z(),push:0,self:0,dmg:0,best:0,by:{},vic:{},hitT:-1,hitW:-1};}
function resetMatch(){for(const e of ents){e.st=newStats();e.frags=0;e.deaths=0;e.alive=false;e.hillAcc=0;e.lives=gameMode==='lms'?LMS_LIVES:null;e.out=false;if(e.isBot)e.mesh.group.visible=false;}
  for(const p of projs)scene.remove(p.mesh);projs.length=0;for(const p of PICKUPS){p.active=true;p.mesh.visible=true;}
  firstBlood=false;matchTime=MATCH_TIME;for(const e of ents)spawnEntity(e);}
function startMatch(){initAudio();if(curMap!==selMap&&NET.conns.length===0)loadMap(selMap);gameMode=selectedMode;teamScores=[0,0];const useBots=gameMode==='duel'?(NET.conns.length?[]:[bots[(R()*bots.length)|0]]):bots.slice(0,botCount);ents=[player,...NET.conns.map(c=>c.ent).filter(Boolean),...useBots];for(const b of bots)if(!useBots.includes(b)){b.alive=false;b.mesh.group.visible=false;}setupHill();setupCtf();assignBalancedTeams();{const c=[0,0];for(const b of bots)if(b.team!=null){b.ctfRole=c[b.team]++%2?'def':'att';}}resetMatch();state='intro';introT=3.2;showIntroCard(true);
  for(const c of NET.conns){c.q=[];try{c.dc.send({t:'init',map:curMap,mode:gameMode,teamScores,intro:true,nid:c.ent.nid,roster:roster(),mt:matchTime,rt:curMap===7?REACTOR.timer:null,rd:curMap===7?(REACTOR.dark?1:0):null,st:curMap===8?SHIP.timer:null,swv:curMap===8?SHIP.waveT:null,swi:curMap===8?SHIP.waveId:null});}catch(e){}}
  hideScreens();$('end').classList.add('hidden');$('pause').classList.add('hidden');$('hud').style.display='none';$('feed').innerHTML='';feedList.length=0;$('chatlog').innerHTML='';chatList.length=0;
  startMusic('battle');}
function endMatch(){state='end';const w=sorted()[0],teamWinner=teamScores[0]===teamScores[1]?null:teamScores[0]>teamScores[1]?0:1;nev(isTeam()?{t:'end',team:teamWinner,ts:teamScores.slice(),st:matchSummary()}:{t:'end',w:w.nid,st:matchSummary()});$('again').classList.remove('hidden');$('again').textContent='ЕЩЁ РАЗ';$('tomenu').textContent=isHost()?'В ЛОББИ':'К ВЫБОРУ КАРТЫ';$('endtitle').innerHTML=isTeam()?(teamWinner==null?'НИЧЬЯ':`${TEAM_NAMES[teamWinner]} ПОБЕДИЛИ!`):w===player?'ВЫ ПОБЕДИЛИ!':`ПОБЕДИТЕЛЬ: ${nm(w)}`;const sum=matchSummary();$('endboard').innerHTML=boardHTML();$('endstats').innerHTML=statsHTML(sum,player.nid);
  $('end').classList.remove('hidden');$('hud').style.display='none';startMusic('lobby');speak(isTeam()?(teamWinner==null?'Ничья':`${TEAM_NAMES[teamWinner]} победили`):w===player?'Вы победили':'Матч окончен');if(document.exitPointerLock)document.exitPointerLock();}
function showPause(invite){if(state!=='play')return;closeChat();state='paused';mouseDown=false;mouseAltDown=false;updateNetInfo();
  $('pausetitle').textContent=invite?'ИГРА СОЗДАНА':'ПАУЗА';
  $('pause').classList.remove('hidden');if(locked&&document.exitPointerLock)document.exitPointerLock();}
function resumeGame(){if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();state='play';$('pause').classList.add('hidden');$('setdlg').classList.add('hidden');}
noLock=!canvas.requestPointerLock;
function requestLock(){if(noLock||locked)return;try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;
  if(locked&&state==='paused')resumeGame();
  else if(!locked&&state==='play')showPause(false);});
document.addEventListener('pointerlockerror',()=>{});
function tryResume(){if(state!=='paused')return;if(noLock||locked)resumeGame();else{requestLock();setTimeout(()=>{if(state==='paused'&&!locked)resumeGame();},400);}}
$('pause').addEventListener('click',e=>{if(e.target===$('pause'))tryResume();});
$('p_resume').addEventListener('click',tryResume);
$('p_set').addEventListener('click',()=>{$('setdlgbody').appendChild($('settings'));$('setdlg').classList.remove('hidden');});
$('p_lobby').addEventListener('click',()=>{if(!isHost())return;if(NET.conns.length&&!confirm('Прервать матч и вернуть всех в лобби?'))return;enterLobby();});
$('p_quit').addEventListener('click',()=>{if(isClient()){if(confirm('Выйти из игры?'))leaveGame();return;}
  if(isHost()){if(NET.conns.length&&!confirm('Выйти? Игра закроется для всех.'))return;netShutdown();}
  setupMode='solo';netStatus('');toMenuWorld();showScreen('menu');});
$('start').addEventListener('click',()=>{if(isClient())return;if(!isHost())netShutdown();startMatch();});
$('join').addEventListener('click',()=>joinGame($('jcode').value));
$('jcode').addEventListener('keydown',e=>{if(e.key==='Enter')joinGame($('jcode').value);});
$('menu').addEventListener('pointerdown',()=>{if(state==='menu')startMusic('lobby');});
document.querySelectorAll('#mode button').forEach(b=>b.addEventListener('click',()=>{if(isClient())return;selectedMode=b.dataset.mode;updateDiffRow();broadcastLobbySoon();document.querySelectorAll('#mode button').forEach(x=>x.classList.toggle('on',x===b));}));
$('tomenu').addEventListener('click',()=>{if(isClient()){leaveGame();return;}if(isHost())enterLobby();else{backToSetup();}});$('again').addEventListener('click',startMatch);
document.querySelectorAll('#diff button').forEach(b=>b.addEventListener('click',()=>{if(isClient())return;difficulty=+b.dataset.d;broadcastLobbySoon();document.querySelectorAll('#diff button').forEach(x=>x.classList.toggle('on',x===b));}));

/* ---------- screens and lobby ---------- */
const MAP_SHORT=['БАСТИОН','ЛИТЕЙНЯ','ОРБИТА','ПОЛИГОН','ХРАМ','КРЫШИ','ЛЕДНИК','РЕАКТОР','КОРАБЛЬ','КУБ'];
const MAP_DESC=['крепость, джамп-пады','лава и узкие мостки','низкая гравитация, бездна','маленькая, для дуэли','руины, река, мосты рушатся','ночной город, пропасть','скользкий лёд, метель','ядро пульсирует, свет гаснет','шторм, волны за борт','гравитация в каждой комнате своя'];
const SCREENS=['menu','setup','joinscr'];let setupMode='solo';
function hideScreens(){for(const id of SCREENS)$(id).classList.add('hidden');}
function showScreen(id){hideScreens();$(id).classList.remove('hidden');}
function buildMapCards(){$('maps').innerHTML=MAP_SHORT.map((n,i)=>`<button data-m="${i}"><img src="maps/${i}.jpg" alt="" loading="lazy"><b>${n}</b><span>${MAP_DESC[i]}</span></button>`).join('');
  document.querySelectorAll('#maps button').forEach(b=>b.addEventListener('click',()=>{if(isClient())return;selectMap(+b.dataset.m);broadcastLobbySoon();}));syncMapCards();}
function syncMapCards(){document.querySelectorAll('#maps button').forEach(x=>x.classList.toggle('on',+x.dataset.m===selMap));}
function selectMap(i){selMap=i;syncMapCards();if(curMap!==selMap){loadMap(selMap);for(const e of ents)spawnEntity(e);}}
function syncSetupButtons(){updateDiffRow();document.querySelectorAll('#mode button').forEach(x=>x.classList.toggle('on',x.dataset.mode===selectedMode));document.querySelectorAll('#botn button').forEach(x=>x.classList.toggle('on',+x.dataset.b===botCount));document.querySelectorAll('#diff button').forEach(x=>x.classList.toggle('on',+x.dataset.d===difficulty));syncMapCards();updateDiffRow();}
function updateDiffRow(){const duel=selectedMode==='duel';$('botn').classList.toggle('hidden',duel);$('duelnote').classList.toggle('hidden',!duel);$('diffrow').style.visibility=botCount>0||duel?'visible':'hidden';$('modehint').textContent=MODE_HINT[selectedMode]||'';}
function renderSetup(){const host=setupMode==='host',guest=setupMode==='guest';
  $('setuptitle').textContent=host?'ЛОББИ · ВЫ ХОСТ':guest?'ЛОББИ':'ОДИНОЧНАЯ ИГРА';
  $('lobbyside').classList.toggle('hidden',setupMode==='solo');$('setupmain').classList.toggle('ro',guest);$('guestnote').classList.toggle('hidden',!guest);
  $('start').classList.toggle('hidden',guest);$('start').textContent=host?'НАЧАТЬ МАТЧ':'В БОЙ';$('setback').textContent=guest?'< ВЫЙТИ':'< НАЗАД';
  $('linvbox').classList.toggle('hidden',!host);$('turnbox').classList.toggle('hidden',!host);$('lcode').textContent=NET.code;syncSetupButtons();}
function lobbyPlayers(){return[{n:player.nid,nm:player.name,h:1},...NET.conns.filter(c=>c.ent).map(c=>({n:c.ent.nid,nm:c.ent.name,p:c.ent.ping==null?-1:c.ent.ping}))];}
function renderPlayers(list,me){$('lcount').textContent=`(${list.length}/6)`;$('lplayers').innerHTML=list.map(p=>`<div class="${p.n===me?'me':''}"><span>${esc(p.nm)}${p.n===me?' · вы':''}</span><i>${p.h?'ХОСТ':p.p>=0?p.p+' МС':'…'}</i></div>`).join('');}
function lobbyState(c){return{t:'lobby',map:selMap,mode:selectedMode,bots:botCount,diff:difficulty,code:NET.code,players:lobbyPlayers(),you:c&&c.ent?c.ent.nid:0};}
function broadcastLobby(){if(!isHost())return;for(const c of NET.conns){if(!c.ent)continue;try{c.dc.send(lobbyState(c));}catch(e){}}if(setupMode==='host')renderPlayers(lobbyPlayers(),player.nid);}
let lobbySoonT=0;function broadcastLobbySoon(){if(!isHost())return;clearTimeout(lobbySoonT);lobbySoonT=setTimeout(broadcastLobby,60);}
function lobbyLog(h){const d=document.createElement('div');d.innerHTML=h;$('lchat').appendChild(d);while($('lchat').children.length>40)$('lchat').firstChild.remove();$('lchat').scrollTop=1e9;}
function toMenuWorld(){state='menu';if(locked&&document.exitPointerLock)document.exitPointerLock();closeChat();$('end').classList.add('hidden');$('pause').classList.add('hidden');$('hud').style.display='none';showIntroCard(false);player.alive=false;
  if(document.exitPointerLock&&locked)document.exitPointerLock();if(isClient()){for(const x of NET.byNid.values())if(x!==player&&!bots.includes(x)&&x.mesh)x.mesh.group.visible=false;clearCProjs();}
  for(const e of NET.conns)if(e.ent){e.ent.alive=false;e.ent.mesh.group.visible=false;}
  ents=[...bots];for(const b of bots){b.frags=b.deaths=0;spawnEntity(b);}startMusic('lobby');}
function enterLobby(){toMenuWorld();setupMode='host';$('lchat').innerHTML='';lobbyLog('<span class="w">Игра создана. Скопируйте приглашение и отправьте друзьям.</span>');renderSetup();showScreen('setup');broadcastLobby();}
function backToSetup(){toMenuWorld();setupMode='solo';renderSetup();showScreen('setup');}
function clientLobby(d){NET.mode='client';NET.myNid=d.you||NET.myNid;player.nid=NET.myNid;if(state!=='menu')toMenuWorld();
  if(setupMode!=='guest'){setupMode='guest';netStatus('');$('lchat').innerHTML='';lobbyLog('<span class="w">Вы в лобби. Ждём, пока хост начнёт матч.</span>');}
  NET.code=d.code;selectedMode=d.mode;botCount=d.bots;difficulty=d.diff;if(selMap!==d.map||curMap!==d.map)selectMap(d.map);renderSetup();renderPlayers(d.players,NET.myNid);if($('setup').classList.contains('hidden'))showScreen('setup');}
function leaveGame(){if(isClient()&&!NET.recon&&NET.dc&&NET.dc.open){netSend({t:'bye'});setTimeout(()=>{location.href=location.pathname;},120);return;}location.href=location.pathname;}
function showInvite(hostName){$('jtitle').textContent='ВАС ЗОВУТ В ИГРУ';$('jsub').textContent=(hostName?hostName+' зовёт вас в ПРЕДЕЛ.':'Вас позвали в ПРЕДЕЛ.')+' Введите имя и нажмите «Войти».';$('jcoderow').classList.add('hidden');$('jname').value=$('pname').value;showScreen('joinscr');setTimeout(()=>$('jname').focus(),50);}
$('m_solo').addEventListener('click',()=>{initAudio();netShutdown();setupMode='solo';renderSetup();showScreen('setup');});
$('m_host').addEventListener('click',()=>{initAudio();if(isHost()){enterLobby();return;}hostGame();});
$('m_join').addEventListener('click',()=>{$('jtitle').textContent='ВХОД ПО КОДУ';$('jsub').textContent='Попросите у хоста код из 4 букв или ссылку-приглашение.';$('jcoderow').classList.remove('hidden');$('jname').value=$('pname').value;netStatus('');showScreen('joinscr');setTimeout(()=>$('jcode').focus(),50);});
$('jback').addEventListener('click',()=>{if(NET.peer&&!isHost()){try{NET.peer.destroy();}catch(e){}NET.peer=null;}netStatus('');showScreen('menu');});
$('jname').addEventListener('input',()=>{$('pname').value=$('jname').value;LS.set('predel.name',$('pname').value);});
$('jname').addEventListener('keydown',e=>{if(e.key==='Enter')joinGame($('jcode').value);});
$('pname').addEventListener('change',()=>{LS.set('predel.name',$('pname').value);player.name=myName();});
$('setback').addEventListener('click',()=>{if(setupMode==='guest'){leaveGame();return;}if(setupMode==='host'){if(NET.conns.length&&!confirm('Закрыть игру? Все игроки отключатся.'))return;netShutdown();}setupMode='solo';netStatus('');showScreen('menu');});
$('linv').addEventListener('click',copyInvite);
$('reconquit').addEventListener('click',reconGiveUp);
$('lchatin').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){const m=e.target.value;e.target.value='';if(m.trim())sendChat(m);}});
$('m_set').addEventListener('click',()=>{$('setdlgbody').appendChild($('settings'));$('setdlg').classList.remove('hidden');});
$('m_help').addEventListener('click',()=>$('helpdlg').classList.remove('hidden'));
document.querySelectorAll('.dlgclose').forEach(b=>b.addEventListener('click',()=>b.closest('.overlay').classList.add('hidden')));
for(const id of ['tuser','tpass'])$(id).addEventListener('change',saveNetPrefs);
buildMapCards();updateDiffRow();
try{if(sessionStorage.getItem('predel.bye')){sessionStorage.removeItem('predel.bye');setTimeout(()=>netStatus('Хост закрыл игру или связь пропала.'),0);}}catch(e){}
/* ---------- settings ---------- */
function syncSettingsUI(){$('s_sens').value=SET.sens;$('v_sens').textContent=SET.sens.toFixed(2);$('s_fov').value=SET.fov;$('v_fov').textContent=SET.fov+'°';$('s_vol').value=SET.vol;$('v_vol').textContent=SET.vol+'%';$('s_inv').textContent='ИНВЕРСИЯ: '+(SET.inv?'ВКЛ':'ВЫКЛ');$('s_inv').classList.toggle('on',SET.inv);$('s_res').textContent='РАЗРЕШЕНИЕ: '+RES_H[SET.res]+'p';$('s_fx').textContent='3DFX: '+(SET.fx?'ВКЛ':'ВЫКЛ');$('s_fx').classList.toggle('on',SET.fx);$('s_flt').textContent='ТЕКСТУРЫ: '+(SET.smooth?'ГЛАДКИЕ':'ПИКСЕЛИ');$('s_mus').textContent='МУЗЫКА: '+(SET.music?'ВКЛ':'ВЫКЛ');$('s_mus').classList.toggle('on',SET.music);$('s_gib').textContent='ГИБЫ: '+['ВЫКЛ','ВКЛ','БЕЗУМНО'][SET.gibs];$('s_gib').classList.toggle('on',SET.gibs>0);$('s_refl').textContent='ОТРАЖЕНИЯ: '+(SET.refl?'ВКЛ':'ВЫКЛ');$('s_refl').classList.toggle('on',SET.refl);}
function saveSettings(){LS.set('predel.sens',SET.sens);LS.set('predel.fov',SET.fov);LS.set('predel.vol',SET.vol);LS.set('predel.inv',SET.inv?'1':'0');LS.set('predel.mus',SET.music?'1':'0');LS.set('predel.res',SET.res);LS.set('predel.fx',SET.fx?'1':'0');LS.set('predel.flt',SET.smooth?'1':'0');LS.set('predel.gibs',String(SET.gibs));LS.set('predel.refl',SET.refl?'1':'0');if(master)master.gain.value=SET.vol/160;syncSettingsUI();}
$('s_sens').addEventListener('input',e=>{SET.sens=+e.target.value;saveSettings();});
$('s_fov').addEventListener('input',e=>{SET.fov=+e.target.value;saveSettings();});
$('s_vol').addEventListener('input',e=>{SET.vol=+e.target.value;saveSettings();});
$('s_vol').addEventListener('change',()=>{initAudio();playSnd('pickup');});
$('s_inv').addEventListener('click',()=>{SET.inv=!SET.inv;saveSettings();});
function applyGfx(){SET.res=Math.max(0,Math.min(RES_H.length-1,SET.res|0));if(resIdx!==SET.res){resIdx=SET.res;resize();}if(retroMode!==SET.fx){retroMode=SET.fx;document.body.classList.toggle('retro',retroMode);}if(smoothTex!==SET.smooth){smoothTex=SET.smooth;ALL_TEX.forEach(applyFilter);}setMusicMuted(muted);}
$('s_res').addEventListener('click',()=>{SET.res=(SET.res+1)%RES_H.length;applyGfx();saveSettings();});
$('s_fx').addEventListener('click',()=>{SET.fx=!SET.fx;applyGfx();saveSettings();});
$('s_flt').addEventListener('click',()=>{SET.smooth=!SET.smooth;applyGfx();saveSettings();});
$('s_mus').addEventListener('click',()=>{SET.music=!SET.music;applyGfx();saveSettings();});
$('s_gib').addEventListener('click',()=>{SET.gibs=(SET.gibs+1)%3;saveSettings();});
$('s_refl').addEventListener('click',()=>{SET.refl=!SET.refl;saveSettings();});
applyGfx();
for(const ev of ['click','mousedown'])$('settings').addEventListener(ev,e=>e.stopPropagation());
syncSettingsUI();
function settingsToMenu(){$('setdlgbody').appendChild($('settings'));}
/* ---------- chat ---------- */
let chatOpen=false;
function openChat(){chatOpen=true;for(const k in keys)keys[k]=false;mouseDown=false;mouseAltDown=false;const c=$('chatin');c.value='';c.classList.remove('hidden');c.focus();}
function closeChat(){if(!chatOpen)return;chatOpen=false;const c=$('chatin');c.classList.add('hidden');c.blur();}
function postChat(e,m){m=String(m||'').replace(/\s+/g,' ').trim().slice(0,100);if(!m||!e)return;if(state==='menu'||state==='end'){const h=`${nm(e)}: <span class="chat">${esc(m)}</span>`;lobbyLog(h);for(const c of NET.conns){try{c.dc.send({t:'lc',h});}catch(x){}}if(state==='menu')return;}const ch=`${nm(e)}: ${esc(m)}`;chatLine(ch);nev({t:'ch',h:ch});playSnd('switch');}
function sendChat(m){if(isClient())netSend({t:'chat',m:String(m).slice(0,100)});else postChat(player,m);}
$('chatin').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){const m=e.target.value;closeChat();if(m.trim())sendChat(m);}else if(e.key==='Escape'){closeChat();}});
$('chatin').addEventListener('blur',()=>{if(chatOpen)setTimeout(closeChat,0);});
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT'&&e.target.type!=='range')return;if(e.code==='Tab'||e.code==='Space')e.preventDefault();
  if(!e.repeat&&['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){const now=performance.now();if(now-(lastTap[e.code]||0)<250){dodge(e.code);lastTap[e.code]=0;}else lastTap[e.code]=now;}
  keys[e.code]=true;
  if(e.code==='Escape'&&state==='play'&&!locked)showPause(false);
  if(state==='play'){if(e.code==='KeyE'&&!e.repeat)requestReactorSwitch();if(e.code.startsWith('Digit')){const n=+e.code.slice(5)-1;if(n>=0&&n<WEAPONS.length)switchWeapon(player,n);}}
  if(state==='play'&&(e.code==='KeyT'||e.code==='Enter')&&!e.repeat){e.preventDefault();openChat();return;}
  if(e.code==='F12'&&!e.repeat){e.preventDefault();screenshotPending=true;}});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouseDown=false;mouseAltDown=false;});
canvas.addEventListener('mousedown',e=>{if(e.button===0)mouseDown=true;if(e.button===2)mouseAltDown=true;if(state==='play'&&!locked)requestLock();});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)mouseAltDown=false;});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{if(state!=='play')return;const dir=e.deltaY>0?1:-1;for(let k=1;k<WEAPONS.length;k++){const id=(player.weapon+dir*k+WEAPONS.length)%WEAPONS.length;if(switchWeapon(player,id))break;}},{passive:true});
addEventListener('mousemove',e=>{if(!(e.buttons&1))mouseDown=false;if(!(e.buttons&2))mouseAltDown=false;if(state!=='play'||!player.alive)return;const sens=.0022*SET.sens;
  player.yaw-=e.movementX*sens;player.pitch=clamp(player.pitch-e.movementY*sens*(SET.inv?-1:1),-1.5,1.5);swayX=clamp(swayX-e.movementX*.0002,-.03,.03);swayY=clamp(swayY+e.movementY*.0002,-.03,.03);});

