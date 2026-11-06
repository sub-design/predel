// ПРЕДЕЛ — Settings storage, mode tables, host/guest networking, reconnect, interpolation.
'use strict';
/* ---------- network ---------- */
// Если сеть блокирует прямое соединение, сюда добавляется TURN-ретранслятор, например:
// {urls:['turn:ХОСТ:3478','turns:ХОСТ:443?transport=tcp'],username:'...',credential:'...'}
// Логин/пароль TURN вводятся в меню (хранятся только в этом браузере) или приходят в ссылке-приглашении после '#'.
const TURN_URLS=['turn:global.relay.metered.ca:80','turn:global.relay.metered.ca:80?transport=tcp','turn:global.relay.metered.ca:443','turns:global.relay.metered.ca:443?transport=tcp'];
const LS={get(k){try{return localStorage.getItem(k)||'';}catch(e){return'';}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const SET={sens:+LS.get('predel.sens')||1,fov:+LS.get('predel.fov')||75,vol:LS.get('predel.vol')===''?80:+LS.get('predel.vol'),inv:LS.get('predel.inv')==='1',music:LS.get('predel.mus')!=='0',res:LS.get('predel.res')===''?1:+LS.get('predel.res'),fx:LS.get('predel.fx')==='1',smooth:LS.get('predel.flt')==='1',refl:LS.get('predel.refl')!=='0',reverb:LS.get('predel.rev')!=='0',hrtf:LS.get('predel.hrtf')!=='0',gibs:LS.get('predel.gibs')===''?1:Math.max(0,Math.min(2,+LS.get('predel.gibs')|0))};
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MODE_WEAPON={insta:3,rocket:2},modeWeapon=()=>MODE_WEAPON[gameMode];
const MODE_LIMIT={duel:10,koth:60,lms:9999,ctf:3},fragLimit=()=>MODE_LIMIT[gameMode]||FRAG_LIMIT,LMS_LIVES=3;
const MODE_HINT={ffa:'Все против всех, до 20 фрагов.',team:'Красные против синих, общий счёт до 20.',insta:'Только Игла, одно попадание — фраг.',rocket:'Только ракеты, урон по себе отключён.',koth:'Стойте в зоне в одиночку — каждую секунду +1 очко. До 60 очков.',lms:'У каждого 3 жизни. Побеждает последний оставшийся.',duel:'Один на один до 10 фрагов.',ctf:'Красные против синих. Принесите чужой флаг на свою базу, пока ваш на месте. До 3 захватов.'};
const MODE_NAMES={ffa:'КАЖДЫЙ ЗА СЕБЯ',team:'КОМАНДНЫЙ БОЙ',insta:'ИНСТАГИБ',rocket:'РАКЕТНАЯ АРЕНА',koth:'КОРОЛЬ ГОРЫ',lms:'ПОСЛЕДНИЙ ВЫЖИВШИЙ',duel:'ДУЭЛЬ',ctf:'ЗАХВАТ ФЛАГА'},MODE_ANN={ctf:'ЗАХВАТИ ФЛАГ!',koth:'ЗАЙМИ ВЫСОТУ!',lms:'ТРИ ЖИЗНИ. ВЫЖИВИ!',duel:'ДУЭЛЬ! ДО 10 ФРАГОВ',ffa:'В БОЙ!',team:'КРАСНЫЕ ПРОТИВ СИНИХ!',insta:'ИНСТАГИБ! ОДИН ВЫСТРЕЛ — ОДИН ФРАГ',rocket:'РАКЕТНАЯ АРЕНА!'};
function turnCreds(){const u=$('tuser').value.trim(),p=$('tpass').value.trim();return u&&p?{u,p}:null;}
function myName(){return($('pname').value||'Игрок').trim().slice(0,10)||'Игрок';}
function saveNetPrefs(){LS.set('predel.name',$('pname').value);LS.set('predel.tu',$('tuser').value.trim());LS.set('predel.tp',$('tpass').value.trim());}
function peerOpts(){const ice=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478','stun:stun.relay.metered.ca:80']}];const t=turnCreds();if(t)ice.push({urls:TURN_URLS,username:t.u,credential:t.p});return{config:{iceServers:ice}};}
function inviteLink(){const t=turnCreds();let h='join='+NET.code+'&h='+encodeURIComponent(myName());if(t)h+='&tu='+encodeURIComponent(t.u)+'&tp='+encodeURIComponent(t.p);return location.origin+location.pathname+'#'+h;}
async function copyInvite(){const l=inviteLink();try{await navigator.clipboard.writeText(l);pickMsg('ПРИГЛАШЕНИЕ СКОПИРОВАНО');for(const id of ['copyinv','linv']){const b=$(id);if(!b.dataset.l)b.dataset.l=b.textContent;b.textContent='СКОПИРОВАНО ✓';}}catch(e){prompt('Скопируйте ссылку-приглашение:',l);}setTimeout(()=>{for(const id of ['copyinv','linv']){const b=$(id);if(b.dataset.l)b.textContent=b.dataset.l;}},2000);}
const NET={mode:'off',peer:null,conns:[],dc:null,code:'',sendT:0,nidSeq:1,byNid:new Map(),myNid:0,projSeq:1,ghosts:[],off:null,recon:null};
const MY_TOK=(()=>{try{let t=sessionStorage.getItem('predel.tok');if(!t){t=Math.random().toString(36).slice(2,12);sessionStorage.setItem('predel.tok',t);}return t;}catch(e){return Math.random().toString(36).slice(2,12);}})();
const GHOST_MS=60000,INTERP_DELAY=.1;
const HUMAN_COLORS=[0x40e0e0,0xff80c0,0xa0ff60,0xff9040,0xb0a0ff];
function assignNid(e){e.nid=NET.nidSeq++;NET.byNid.set(e.nid,e);}
assignNid(player);bots.forEach(assignNid);
const isHost=()=>NET.mode==='host',isClient=()=>NET.mode==='client';
function nev(o,except){if(!isHost())return;for(const c of NET.conns)if(c.ent!==except)c.q.push(o);}
function sendTo(e,o){if(e&&e.conn)e.conn.q.push(o);}
function kick(e,v){if(e.remote)sendTo(e,{t:'k',v:a3r(v)});else{e.vel.add(v);}}
const r2=x=>Math.round(x*100)/100;const a3r=v=>[r2(v.x),r2(v.y),r2(v.z)];
function assignBalancedTeams(){
  const counts=[0,0];
  for(const e of ents){const t=isTeam()?(counts[0]<=counts[1]?0:1):null;e.team=t;if(e.isBot)e.target=null;if(t!=null)counts[t]++;applyTeamAppearance(e);}
}
function assignBalancedTeam(e){
  const counts=[0,0];for(const x of ents)if(x!==e&&x.team!=null)counts[x.team]++;
  e.team=isTeam()?(counts[0]<=counts[1]?0:1):null;applyTeamAppearance(e);
}
function roster(){return ents.map(e=>({n:e.nid,nm:e.name,c:e.color,b:!!e.isBot,t:e.team}));}
function netStatus(t,err){document.querySelectorAll('.netmsg').forEach(el=>{el.textContent=t;el.classList.toggle('err',!!err);});}
function randCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ';let c='';for(let i=0;i<4;i++)c+=A[(Math.random()*A.length)|0];return c;}
function updateNetInfo(){let t='';if(isHost())t=`КОД ИГРЫ: ${NET.code}<br>ИГРОКОВ: ${1+NET.conns.length}`;else if(isClient())t='СЕТЕВАЯ ИГРА';$('netinfo').innerHTML=t;$('pausenet').innerHTML=isHost()?`Код игры: ${NET.code}${turnCreds()?'':'<br><span style="color:#f96">Ретранслятор не задан — из другой сети могут не подключиться</span>'}`:'';$('copyinv').classList.toggle('hidden',!isHost());$('pausenet').classList.toggle('hidden',!isHost());$('p_lobby').classList.toggle('hidden',!isHost());$('pausewarn').classList.toggle('hidden',!isHost()&&!isClient());$('p_quit').textContent=isHost()||isClient()?'ВЫЙТИ':'ВЫЙТИ В МЕНЮ';}
function hostGame(code){
  if(!window.Peer){netStatus('PeerJS не загрузился — нет интернета?',true);return;}
  NET.code=code||randCode();netStatus('СОЗДАЁМ ИГРУ…');
  saveNetPrefs();const peer=new Peer('predel-'+NET.code,peerOpts());NET.peer=peer;
  peer.on('open',()=>{if(NET.mode==='host')return;NET.mode='host';player.name=myName();netStatus('');enterLobby();});
  peer.on('disconnected',()=>{if(NET.peer===peer&&isHost())setTimeout(()=>{try{if(!peer.destroyed)peer.reconnect();}catch(e){}},1000);});
  peer.on('connection',dc=>{dc.on('open',()=>{const c={dc,q:[],ent:null};dc.on('data',d=>onHostData(c,d));dc.on('close',()=>dropConn(c));dc.on('error',()=>dropConn(c));});});
  peer.on('error',err=>{if(err.type==='unavailable-id'){peer.destroy();hostGame();}else{netStatus('Не удалось создать игру: '+err.type+'. Проверьте интернет и попробуйте ещё раз.',true);}});}
function onHostData(c,d){const e=c.ent;
  // Same browser tab saying hello again (half-open old link, or a double connect): retire the old link first.
  if(d.t==='hello'&&!c.ent&&d.tok){const dup=NET.conns.find(x=>x!==c&&x.ent&&x.ent.tok===d.tok);if(dup){dropConn(dup);dup.ent=null;try{dup.dc.close();}catch(e){}}}
  if(d.t==='hello'&&!c.ent&&d.tok){const gi=NET.ghosts.findIndex(g=>g.e.tok===d.tok);if(gi>=0){const ne=NET.ghosts.splice(gi,1)[0].e;ne.disc=false;ne.conn=c;c.ent=ne;NET.conns.push(c);
    if(state==='menu'){lobbyLog(`${nm(ne)} <span class="w">вернулся</span>`);broadcastLobby();updateNetInfo();return;}
    if(!ents.includes(ne)){ents.splice(NET.conns.length,0,ne);assignBalancedTeam(ne);ne.frags=0;ne.deaths=0;ne.lives=gameMode==='lms'?0:null;ne.out=gameMode==='lms';}if(!ne.out)spawnEntity(ne);
    c.dc.send({t:'init',map:curMap,mode:gameMode,teamScores,intro:state==='intro',nid:ne.nid,roster:roster(),mt:matchTime,br:BRIDGES.map(b=>b.broken?1:0),rt:curMap===7?REACTOR.timer:null,rd:curMap===7?(REACTOR.dark?1:0):null,st:curMap===8?SHIP.timer:null,swv:curMap===8?SHIP.waveT:null,swi:curMap===8?SHIP.waveId:null});nev({t:'roster',r:roster()},ne);
    if(state==='end')c.dc.send({t:'s',mt:0,gm:gameMode,ts:teamScores.slice(),e:[],pk:'',am:ne.ammo,ow:ne.owned,ev:[{t:'end',w:sorted()[0].nid,team:teamScores[0]===teamScores[1]?null:teamScores[0]>teamScores[1]?0:1,ts:teamScores.slice(),st:matchSummary()}]});
    feed(`${nm(ne)} <span class="w">вернулся в игру</span>`);updateNetInfo();return;}}
  if(d.t==='hello'){if(c.ent)return;const used=new Set(ents.map(x=>x.color));const col=HUMAN_COLORS.find(x=>!used.has(x))||0xffffff;
    const ne=makeEntity(String(d.name||'Друг').slice(0,10),col,false);ne.remote=true;ne.tok=d.tok||null;ne.conn=c;ne.mesh=makeBotMesh(col,ne.name);ne.mesh.group.visible=false;assignNid(ne);c.ent=ne;NET.conns.push(c);
    if(state==='menu'||state==='end'){lobbyLog(`${nm(ne)} <span class="w">присоединился</span>`);broadcastLobby();return;}
    ents.splice(1+NET.conns.length-1,0,ne);assignBalancedTeam(ne);if(gameMode==='lms'&&state!=='intro'){ne.lives=0;ne.out=true;}else{ne.lives=gameMode==='lms'?LMS_LIVES:null;spawnEntity(ne);}
    c.dc.send({t:'init',map:curMap,mode:gameMode,teamScores,intro:state==='intro',nid:ne.nid,roster:roster(),mt:matchTime,br:BRIDGES.map(b=>b.broken?1:0),rt:curMap===7?REACTOR.timer:null,rd:curMap===7?(REACTOR.dark?1:0):null,st:curMap===8?SHIP.timer:null,swv:curMap===8?SHIP.waveT:null,swi:curMap===8?SHIP.waveId:null});nev({t:'roster',r:roster()},ne);
    feed(`${nm(ne)} <span class="w">присоединился</span>`);updateNetInfo();return;}
  if(!e)return;
  if(d.t==='u'){if(!e.alive||d.s!==e.sseq)return;e.pos.set(d.p[0],d.p[1],d.p[2]);if(curMap===9)e.up.copy(cubeUpAt(e.pos));e.vel.set(d.v[0],d.v[1],d.v[2]);e.yaw=d.y;e.pitch=d.pi;e.grounded=!!d.g;if(e.owned[d.w])e.weapon=d.w;}
  else if(d.t==='f'){if(!e.alive||!e.owned[d.w]||e.ammo[d.w]<=0)return;e.yaw=d.y;e.pitch=d.pi;e.weapon=d.w;if(d.d)e.forceDir=d.d;fire(e,!!d.alt);}
  else if(d.t==='rs'){if(!e.alive&&!e.out&&(e.deadT||0)>1)spawnEntity(e);}
  else if(d.t==='rsw')useReactorSwitch(e,d.i);
  else if(d.t==='tn')startTaunt(e,d.k|0);
  else if(d.t==='chat')postChat(e,d.m);
  else if(d.t==='bye')c.bye=true;
  else if(d.t==='po'&&typeof d.c==='number')e.ping=Math.max(0,Math.round(performance.now()-d.c));}
function removeEnt(e){const k=ents.indexOf(e);if(k>=0)ents.splice(k,1);if(e.mesh)scene.remove(e.mesh.group);NET.byNid.delete(e.nid);}
function dropGhost(g){const i=NET.ghosts.indexOf(g);if(i<0)return;NET.ghosts.splice(i,1);const inGame=ents.includes(g.e);removeEnt(g.e);if(isHost()&&state!=='menu'&&inGame){feed(`${nm(g.e)} <span class="w">покинул игру</span>`);nev({t:'roster',r:roster()});lmsCheck();}}
function dropConn(c){const i=NET.conns.indexOf(c);if(i<0)return;NET.conns.splice(i,1);const e=c.ent;
  if(e&&isHost()&&!c.bye&&!NET.closing&&state!=='menu'&&e.tok){e.disc=true;e.conn=null;if(e.alive){e.alive=false;}if(e.mesh)e.mesh.group.visible=false;NET.ghosts.push({e,until:performance.now()+GHOST_MS});feed(`${nm(e)} <span class="w">потерял связь — ждём минуту</span>`);updateNetInfo();return;}
  if(e){const k=ents.indexOf(e);if(k>=0)ents.splice(k,1);scene.remove(e.mesh.group);NET.byNid.delete(e.nid);feed(`${nm(e)} <span class="w">покинул игру</span>`);nev({t:'roster',r:roster()});}
  updateNetInfo();if(isHost()&&(state==='menu'||state==='end')){if(e)lobbyLog(`${nm(e)} <span class="w">вышел</span>`);broadcastLobby();}}
function netShutdown(){NET.closing=true;const old=[...NET.conns],peer=NET.peer;for(const c of old){try{if(isHost())c.dc.send({t:'hostbye'});}catch(e){}dropConn(c);}for(const g of [...NET.ghosts])dropGhost(g);NET.closing=false;NET.peer=null;NET.mode='off';updateNetInfo();
  setTimeout(()=>{for(const c of old){try{c.dc.close();}catch(e){}}if(peer){try{peer.destroy();}catch(e){}}},250);}
function snapFor(c){return{t:'s',ht:Math.round(performance.now())/1000,mt:r2(matchTime),gm:gameMode,ts:teamScores.slice(),e:ents.map(x=>[x.nid,r2(x.pos.x),r2(x.pos.y),r2(x.pos.z),r2(x.yaw),r2(x.pitch),x.alive?1:0,x.weapon,r2(x.vel.x),r2(x.vel.y),r2(x.vel.z),x.frags,x.deaths,Math.ceil(x.health),Math.ceil(x.armor),x.sseq,x.hurtT>0?1:0,x.grounded?1:0,r2(x.doubleT||0),r2(x.invisT||0),r2(x.speedT||0),r2(x.shieldT||0),r2(x.jetT||0),r2(x.regenT||0),r2(x.invisFlickerT||0),x.lives==null?-1:x.lives]),hh:hillHolder,cf:CTF?CTF.f.map(F=>[F.st==='base'?0:F.st==='carried'?1:2,F.by,r2(F.pos.x),r2(F.pos.y),r2(F.pos.z)]):null,
  pk:PICKUPS.map(p=>p.active?1:0).join(''),pg:NET.conns.filter(x=>x.ent).map(x=>[x.ent.nid,x.ent.ping==null?-1:x.ent.ping]),am:c.ent.ammo,ow:c.ent.owned,ev:c.q,rt:curMap===7?REACTOR.timer:null,rd:curMap===7?(REACTOR.dark?1:0):null,st:curMap===8?SHIP.timer:null,swv:curMap===8?SHIP.waveT:null,swi:curMap===8?SHIP.waveId:null};}
function netTick(dt){if(NET.ghosts.length){const now=performance.now();for(const g of [...NET.ghosts])if(now>g.until)dropGhost(g);}NET.pingT=(NET.pingT||0)-dt;if(NET.pingT<=0){NET.pingT=2;const now=performance.now();for(const c of NET.conns){try{c.dc.send({t:'pi',c:now});}catch(e){}}}if(state==='menu'){NET.lobbyT=(NET.lobbyT||0)-dt;if(NET.lobbyT<=0){NET.lobbyT=2;broadcastLobby();}return;}NET.sendT-=dt;if(NET.sendT>0)return;NET.sendT=.05;for(const c of NET.conns){if(!c.ent)continue;try{c.dc.send(snapFor(c));}catch(e){}c.q=[];}}
/* client */
function joinGame(code){
  if(!window.Peer){netStatus('PeerJS не загрузился — нет интернета?',true);return;}
  code=String(code||'').toUpperCase().trim();NET.code=code;if(code.length!==4){netStatus('Код игры — 4 буквы, например QZ7K.',true);return;}if(NET.peer){try{NET.peer.destroy();}catch(e){}NET.peer=null;}
  initAudio();netStatus('Подключаемся…');saveNetPrefs();const peer=new Peer(peerOpts());NET.peer=peer;
  peer.on('open',()=>{if(NET.peer!==peer||(NET.dc&&NET.dc.peer==='predel-'+code&&NET.dc.open))return;// PeerJS re-emits open after a signalling reconnect
    const dc=peer.connect('predel-'+code,{reliable:true,serialization:'json'});NET.dc=dc;
    const to=setTimeout(()=>{if(!isClient())netStatus('Игра найдена, но сеть не даёт соединиться напрямую. Попросите у хоста свежую ссылку-приглашение (в ней есть ретранслятор) или попробуйте другую сеть.',true);},12000);
    dc.on('open',()=>{clearTimeout(to);dc.send({t:'hello',name:myName(),tok:MY_TOK});});
    dc.on('data',onClientData);
    dc.on('close',()=>{if(NET.dc!==dc)return;if(NET.hostBye&&isClient()){try{sessionStorage.setItem('predel.bye','1');}catch(e){}location.href=location.pathname;return;}if(NET.recon){reconRetry();return;}if(isClient())startRecon();});});
  peer.on('error',err=>{if(NET.peer!==peer)return;if(NET.recon){reconRetry();return;}netStatus(err.type==='peer-unavailable'?'Игра с таким кодом не найдена. Проверьте код и что хост ещё в игре.':'Не удалось подключиться ('+err.type+'). Попробуйте ещё раз.',true);});}
function startRecon(){if(NET.recon)return;NET.recon={until:performance.now()+GHOST_MS,timer:null};closeChat();if(locked&&document.exitPointerLock)document.exitPointerLock();$('recon').classList.remove('hidden');reconTry();}
function reconTry(){const r=NET.recon;if(!r)return;const left=Math.ceil((r.until-performance.now())/1000);if(left<=0){reconGiveUp();return;}$('recontxt').textContent=`Переподключаемся… осталось ${left} с`;
  if(NET.peer){try{NET.peer.destroy();}catch(e){}NET.peer=null;}NET.dc=null;joinGame(NET.code);clearTimeout(r.timer);r.timer=setTimeout(reconRetry,8000);}
function reconRetry(){const r=NET.recon;if(!r)return;clearTimeout(r.timer);r.timer=setTimeout(reconTry,2000);}
function reconDone(){const r=NET.recon;if(!r)return;clearTimeout(r.timer);NET.recon=null;$('recon').classList.add('hidden');netStatus('');}
function reconGiveUp(){const r=NET.recon;if(r)clearTimeout(r.timer);NET.recon=null;try{sessionStorage.setItem('predel.bye','1');}catch(e){}leaveGame();}
function netSend(o){if(NET.dc&&NET.dc.open){try{NET.dc.send(o);}catch(e){}}}
function applyRoster(r){const keep=new Set();const list=[];
  for(const it of r){keep.add(it.n);let e;
    if(it.n===NET.myNid){e=player;player.nid=it.n;player.name=it.nm;player.color=it.c;}
    else{e=NET.byNid.get(it.n);if(!e||e===player){e=makeEntity(it.nm,it.c,it.b);e.nid=it.n;e.mesh=makeBotMesh(it.c,it.nm);e.tpos=new V3();}}
    e.team=it.t==null?null:it.t;applyTeamAppearance(e);NET.byNid.set(it.n,e);list.push(e);}
  for(const [n,e] of [...NET.byNid]){if(!keep.has(n)){if(e.mesh)scene.remove(e.mesh.group);NET.byNid.delete(n);}}
  ents=list;}
const cprojs=[];
function clearCProjs(){for(const p of cprojs)scene.remove(p.mesh);cprojs.length=0;}
function onClientData(d){
  if(d.t==='init'){reconDone();NET.off=null;if(curMap!==d.map)loadMap(d.map);NET.mode='client';if(d.br)for(let i=0;i<d.br.length;i++)setBridgeState(i,!!d.br[i]);gameMode=d.mode||'ffa';teamScores=d.teamScores||[0,0];if(d.rt!=null)REACTOR.timer=d.rt;if(d.rd!=null)setReactorDark(!!d.rd,false);if(d.st!=null)SHIP.timer=d.st;if(d.swv!=null)SHIP.waveT=d.swv;if(d.swi!=null)SHIP.waveId=d.swi;netStatus('');NET.myNid=d.nid;
    for(const b of bots){b.alive=false;b.mesh.group.visible=false;}for(const x of NET.byNid.values())if(x!==player&&!bots.includes(x)&&x.mesh)scene.remove(x.mesh.group);NET.byNid.clear();applyRoster(d.roster);clearCProjs();
    setupHill();setupCtf();matchTime=d.mt;firstBlood=true;state=d.intro?'intro':'play';introT=d.intro?3.2:0;player.alive=false;player.sseq=-1;
    hideScreens();$('end').classList.add('hidden');$('hud').style.display=d.intro?'none':'block';$('feed').innerHTML='';feedList.length=0;$('chatlog').innerHTML='';chatList.length=0;showIntroCard(d.intro);startMusic('battle');
    updateNetInfo();if(!d.intro)requestLock();announce(MODE_ANN[gameMode]||'В БОЙ!');return;}
  if(d.t==='pi'){netSend({t:'po',c:d.c});return;}
  if(d.t==='hostbye'){NET.hostBye=true;return;}
  if(d.t==='lobby'){reconDone();clientLobby(d);return;}
  if(d.t==='lc'){lobbyLog(d.h);return;}
  if(d.t!=='s'||!isClient())return;
  const nowS=performance.now()/1000;if(d.ht!=null){const off=nowS-d.ht;if(NET.off==null||off<NET.off)NET.off=off;else NET.off+=(off-NET.off)*.02;}
  if(d.pg)for(const [n,v] of d.pg){const e=NET.byNid.get(n);if(e)e.ping=v<0?null:v;}
  for(const a of d.e){const e=NET.byNid.get(a[0]);if(!e)continue;const was=e.alive;
    e.frags=a[11];e.deaths=a[12];e.health=a[13];e.armor=a[14];e.doubleT=a[18]||0;e.invisT=a[19]||0;e.speedT=a[20]||0;e.shieldT=a[21]||0;e.jetT=a[22]||0;e.regenT=a[23]||0;e.invisFlickerT=a[24]||0;e.lives=a[25]==null||a[25]<0?null:a[25];e.out=gameMode==='lms'&&e.lives!=null&&e.lives<=0;
    if(e===player){if(a[15]!==player.sseq){player.sseq=a[15];player.pos.set(a[1],a[2],a[3]);if(curMap===9)player.up.copy(cubeUpAt(player.pos));player.vel.set(0,0,0);player.yaw=a[4];player.pitch=0;if(a[6]){player.alive=true;$('center').innerHTML='';centerT=0;showWeaponName();}}
      player.alive=!!a[6];continue;}
    e.tpos.set(a[1],a[2],a[3]);if(!was&&a[6]){e.pos.copy(e.tpos);e.buf=[];}
    if(d.ht!=null&&a[6]){if(!e.buf)e.buf=[];const b=e.buf;if(!b.length||d.ht>b[b.length-1].t)b.push({t:d.ht,p:e.tpos.clone(),y:a[4],pi:a[5]});if(b.length>30)b.shift();}
    e.yaw=a[4];e.pitch=a[5];e.alive=!!a[6];e.weapon=a[7];e.vel.set(a[8],a[9],a[10]);e.hurtT=a[16]?.15:0;e.grounded=!!a[17];e.mesh.group.visible=e.alive;}
  if(d.hh!=null)hillHolder=d.hh;if(d.cf&&CTF)d.cf.forEach((a,i)=>{const F=CTF.f[i];F.st=['base','carried','dropped'][a[0]];F.by=a[1];F.pos.set(a[2],a[3],a[4]);});matchTime=d.mt;teamScores=d.ts||teamScores;if(d.rt!=null)REACTOR.timer=d.rt;if(d.rd!=null&&REACTOR.dark!==!!d.rd)setReactorDark(!!d.rd,false);if(d.st!=null)SHIP.timer=d.st;if(d.swv!=null&&Math.abs(SHIP.waveT-d.swv)>.25)SHIP.waveT=d.swv;if(d.swi!=null)SHIP.waveId=d.swi;player.ammo=d.am;player.owned=d.ow;
  if(!player.owned[player.weapon]||player.ammo[player.weapon]<=0)autoSwitch(player);
  for(let i=0;i<PICKUPS.length;i++){const act=d.pk[i]==='1',p=PICKUPS[i];if(p.active!==act){p.active=act;p.mesh.visible=act;}}
  for(const v of d.ev)clientEvent(v);}
function clientEvent(v){const V=a=>new V3(a[0],a[1],a[2]);switch(v.t){
  case'br':setBridgeState(v.i,!!v.b,v.r||20);break;
  case'swarn':pickMsg('ШТОРМОВАЯ ВОЛНА! ДЕРЖИСЬ!');playSnd('thunder');break;
  case'sw':SHIP.waveId=v.i;SHIP.waveT=4;playSnd('thunder');flashLight(new V3(0,14,0),0xcdeeff,.12,3,70);break;
  case'rd':setReactorDark(!!v.d,false);break;
  case'rw':pickMsg('РЕАКТОР ЗАРЯЖАЕТСЯ — УХОДИ ИЗ ЦЕНТРА!');playSnd('thunder');break;
  case'rp':flashLight(new V3(0,4,0),0xff3018,.45,4,32);playSnd('thunder');if(camera.position.length()<20)shake=Math.max(shake,.45);break;
  case'fi':{const e=NET.byNid.get(v.e);if(e)e.recoilT=.12;if(e&&e.invisT>0)e.invisFlickerT=.32;if(e&&e!==player){playSnd(WEAPONS[v.w].snd,e.pos);flashLight(eyePos(e),WEAPONS[v.w].color,.07,2.2,10);}break;}
  case'pj':{const w=WEAPONS[v.w],pos=V(v.p),vel=V(v.v),m=makeProjMesh(w);m.position.copy(pos);m.lookAt(pos.clone().add(vel));scene.add(m);cprojs.push({id:v.i,pos,vel,w,mesh:m,life:5});break;}
  case'pr':{const p=cprojs.find(x=>x.id===v.i);if(p){p.pos.copy(V(v.p));p.vel.copy(V(v.v));p.mesh.position.copy(p.pos);p.mesh.lookAt(p.pos.clone().add(p.vel));}break;}
  case'pe':{const i=cprojs.findIndex(p=>p.id===v.i);if(i>=0){scene.remove(cprojs[i].mesh);cprojs.splice(i,1);}const pt=V(v.p);
    if(v.x){if(!v.h)addShotMark(pt,v.d?V(v.d):new V3(0,0,1),0x292327,.25);explosionFX(pt);corpseBlast(pt,4);playSnd('boom',pt);const pd=camera.position.distanceTo(pt);if(pd<18)shake=Math.max(shake,(1-pd/18)*.6);}else{if(v.h)bloodFX(pt,UP);else{sparkFX(pt,WEAPONS[v.w].color);addShotMark(pt,new V3(0,0,1),0x292327,.22);}playSnd('zap',pt);}break;}
  case'hs':{const w=WEAPONS[v.w],a=V(v.a),b=V(v.b);if(w.type==='rail')railFX(a,b,w.color);else beam(a,b,w.color,.06,.018);if(v.h)bloodFX(b,UP);else{sparkFX(b,w.color);if(a.distanceTo(b)<249)addShotMark(b,b.clone().sub(a).normalize(),0x202329,.13);}break;}
  case'gib':{const e=NET.byNid.get(v.e);if(e){deathFX(e,!!v.o,v.k);playSnd('death',e===player?null:e.pos);if(e===player)speakBattleLine(DEATH_LINES);if(e.mesh)e.mesh.group.visible=false;}break;}
  case'sp':{const e=NET.byNid.get(v.e);if(e&&e!==player){const c=V(v.p);c.y+=1;for(let i=0;i<20;i++)emit(c.clone().add(rv(1.2)),new V3(0,2+R()*3,0),0x80e0ff,.1,.8);playSnd('respawn',c);}else if(e===player&&e.deaths>0)speakBattleLine(RESPAWN_LINES);break;}
  case'tn':{const e=NET.byNid.get(v.e);if(e&&e!==player)startTaunt(e,v.k);break;}
  case'fd':feed(v.h,v.l||6);break;
  case'ch':chatLine(v.h);playSnd('switch');break;
  case'ann':announce(v.s);break;
  case'cm':centerMsg(v.h,2);break;
  case'dead':deadT=0;pickT=0;cache.rsp=null;$('center').innerHTML=v.h;centerT=999;break;
  case'hu':dmgFlash=Math.min(1,dmgFlash+v.a/35);playSnd('hurt');if(v.p)addDmgDir(new V3(v.p[0],v.p[1],v.p[2]));break;
  case'hm':hitMarker=.12;playSnd('hit');break;
  case'k':player.vel.add(V(v.v));player.grounded=false;break;
  case'pk':pickMsg(v.s);playSnd(v.n);if(v.sw!=null)switchWeapon(player,v.sw);break;
  case'roster':applyRoster(v.r);break;
  case'go':finishIntro();break;
  case'end':clientEnd(v);break;}}
function clientEnd(result){state='end';let title,voice;
  if(isTeam()){teamScores=result.ts||teamScores;title=result.team==null?'НИЧЬЯ':result.team===player.team?'ВАША КОМАНДА ПОБЕДИЛА!':`${TEAM_NAMES[result.team]} ПОБЕДИЛИ`;voice=result.team===player.team?'Ваша команда победила':'Матч окончен';}
  else{const w=NET.byNid.get(result.w);title=w===player?'ВЫ ПОБЕДИЛИ!':w?`ПОБЕДИТЕЛЬ: ${nm(w)}`:'МАТЧ ОКОНЧЕН';voice=w===player?'Вы победили':'Матч окончен';}
  $('endtitle').innerHTML=title;$('endboard').innerHTML=boardHTML();$('endstats').innerHTML=(result.st?statsHTML(result.st,player.nid):'')+'<div class="hint" style="margin-top:10px">Хост выбирает следующую карту…</div>';
  $('again').classList.add('hidden');$('tomenu').textContent='ВЫЙТИ';$('end').classList.remove('hidden');$('hud').style.display='none';showIntroCard(false);startMusic('lobby');speak(voice);if(document.exitPointerLock)document.exitPointerLock();}
function clientFire(alt=false){const w=WEAPONS[player.weapon];
  if(player.ammo[w.id]<=0){playSnd('empty');player.cd=.3;autoSwitch(player);return;}
  player.ammo[w.id]--;if(modeWeapon()!=null)player.ammo[w.id]=99;player.cd=alt?(w.altRate||w.rate):w.rate;vmKick=1;vmFlashT=.05;playSnd(w.snd);
  const eye=eyePos(player),dir=aimDir(player),start=muzzlePos(player,dir);flashLight(start,w.color,.07,2.2,10);if(w.type==='shotgun')shotgunFeel(player,alt,start,dir);
  if(w.type!=='proj'){const d=dir.clone();if(w.type==='shotgun'&&alt)d.add(rv(w.altSpread*2)).normalize();else if(w.id===1&&alt){}else if(w.spread)d.add(rv(w.spread*2)).normalize();const o=a3(eye),da=a3(d),tl=rayLevel(o,da,250),h=rayEnts(o,da,tl,player),end=eye.clone().addScaledVector(d,h?h.t:tl);
    if(w.type==='rail')railFX(start,end,w.color);else beam(start,end,w.color,.06,.018);if(h)bloodFX(end,d);else if(tl<250)sparkFX(end,w.color);
    netSend({t:'f',y:player.yaw,pi:player.pitch,w:w.id,d:[d.x,d.y,d.z],alt:!!alt});}
  else netSend({t:'f',y:player.yaw,pi:player.pitch,w:w.id,alt:!!alt});}
function angLerp(a,b,k){const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*k;}
function interpRemote(e,dt){const b=e.buf;if(!b||!b.length||NET.off==null){e.pos.lerp(e.tpos,Math.min(1,dt*15));return;}
  const rt=performance.now()/1000-NET.off-INTERP_DELAY;while(b.length>=2&&b[1].t<=rt)b.shift();const a=b[0];
  if(rt<=a.t){e.pos.copy(a.p);e.yaw=a.y;e.pitch=a.pi;}
  else if(b.length>=2){const c=b[1],k=(rt-a.t)/Math.max(.001,c.t-a.t);e.pos.lerpVectors(a.p,c.p,k);e.yaw=angLerp(a.y,c.y,k);e.pitch=a.pi+(c.pi-a.pi)*k;}
  else{e.pos.copy(a.p).addScaledVector(e.vel,Math.min(.15,rt-a.t));e.yaw=a.y;e.pitch=a.pi;}
  if(curMap===9&&e.up)e.up.copy(cubeUpAt(e.pos));}
function clientUpdate(dt){time+=dt;updateAttractions(dt);if(state==='intro'){introT-=dt;if(introT<=0)finishIntro();return;}matchTime=Math.max(0,matchTime-dt);
  if(state==='play')updatePlayer(dt);else if(player.alive)applyMove(player,new V3(),dt,false);
  if(player.alive){player.cd-=dt;player.padCD-=dt;
    if(!rideStep(player,dt)){
    for(const p of PADS)if(player.padCD<=0&&onPad(player,p)){padLaunch(player,p);player.grounded=false;player.padCD=.6;playSnd('pad');}
    lavaCheck(player,dt,false,true);
    const vy=player.vel.dot(entityUp(player)),wg=player.grounded;moveEntity(player,dt);voidCheck(player,false);if(!wg&&player.grounded&&vy<-14)playSnd('land');}}
  for(const e of ents)if(e!==player&&e.alive&&e.tpos){interpRemote(e,dt);e.hurtT-=dt;}
  updatePickups(dt);
  for(let i=cprojs.length-1;i>=0;i--){const p=cprojs[i];p.life-=dt;p.pos.addScaledVector(p.vel,dt);p.mesh.position.copy(p.pos);
    if(p.w.id===2)emit(p.pos,rv(.6).add(new V3(0,.5,0)),R()<.3?0xff8030:0x55505a,.25,.6,-.5,false,1);else{p.mesh.rotation.z+=dt*10;if(R()<.6)emit(p.pos,rv(.5),0x40ffff,.06,.25);}
    if(p.life<=0||pointSolid(p.pos.x,p.pos.y,p.pos.z)){scene.remove(p.mesh);cprojs.splice(i,1);}}
  if(curMap===8)advanceGhostWave(dt,true);hillVisual();ctfVisual();
  for(const e of ents)if(e.mesh)updateBotMesh(e,dt);
  NET.sendT-=dt;if(NET.sendT<=0){NET.sendT=.033;netSend({t:'u',p:a3r(player.pos),v:a3r(player.vel),y:r2(player.yaw),pi:r2(player.pitch),w:player.weapon,g:player.grounded?1:0,s:player.sseq});}}
function lavaCheck(e,dt,doDamage,doBounce){for(const L of lavaZones)if(e.pos.x>L.x0&&e.pos.x<L.x1&&e.pos.z>L.z0&&e.pos.z<L.z1&&e.pos.y<L.y){e.lavaT=(e.lavaT||0)-dt;if(e.lavaT<=0){e.lavaT=.35;if(doBounce){e.vel.y=12;e.grounded=false;}for(let k=0;k<12;k++)emit(e.pos,new V3((R()-.5)*4,3+R()*4,(R()-.5)*4),R()<.5?0xff6000:0xffc020,.15,.6,10);if(doDamage)damage(e,25,null,LAVA);return;}}}
function voidCheck(e,doDamage){if((curMap===2&&e.pos.y<-10||curMap===5&&e.pos.y<-18||curMap===8&&e.pos.y<-13||curMap===9&&Math.max(Math.abs(e.pos.x),Math.abs(e.pos.y),Math.abs(e.pos.z))>21||e.pos.y<-60)&&doDamage)damage(e,999,null,VOID);}

const eyePos=e=>e.pos.clone().addScaledVector(entityUp(e),e.isBot?1.65:1.6);
function aimDir(e){if(curMap===9)return cubeAim(e);const cp=Math.cos(e.pitch);return new V3(-Math.sin(e.yaw)*cp,Math.sin(e.pitch),-Math.cos(e.yaw)*cp);}
function muzzlePos(e,dir){const up=entityUp(e),right=new V3().crossVectors(cubeBasis(up,e.yaw).forward,up).normalize();return eyePos(e).addScaledVector(dir,.6).addScaledVector(right,.22).addScaledVector(up,-.2);}

function clearPowerups(e){for(const p of Object.values(POWERUPS))e[p.field]=0;e.invisFlickerT=0;}
function updatePowerups(e,dt){for(const p of Object.values(POWERUPS))e[p.field]=Math.max(0,(e[p.field]||0)-dt);e.invisFlickerT=Math.max(0,(e.invisFlickerT||0)-dt);if(e.regenT>0&&e.health<100)e.health=Math.min(100,e.health+5*dt);}
