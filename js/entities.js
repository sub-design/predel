// ПРЕДЕЛ — Entities, bot roster, personalities and chat lines.
'use strict';
/* ---------- entities ---------- */
const SKILL=[{turn:3.5,err:.09,react:.7,lead:.3,speed:9.5,dmgMul:.55},{turn:6,err:.045,react:.4,lead:.7,speed:10.5,dmgMul:.8},{turn:11,err:.018,react:.22,lead:1,speed:11.5,dmgMul:1}];
let difficulty=1;
function makeEntity(name,color,isBot){return{name,color,isBot,team:null,doubleT:0,invisT:0,invisFlickerT:0,speedT:0,shieldT:0,jetT:0,regenT:0,pos:new V3(),vel:new V3(),up:UP.clone(),r:.4,h:1.8,yaw:0,pitch:0,health:100,armor:0,alive:false,grounded:false,owned:Array(WEAPONS.length).fill(0).map((_,i)=>i<2?1:0),ammo:Array(WEAPONS.length).fill(0),weapon:1,cd:0,frags:0,deaths:0,streak:0,multi:0,lastKill:-9,padCD:0,respawnT:0,hurtT:0,switchT:0,walkPh:0,sseq:0,nid:0};}
function makeBotMesh(color){
  const g=new THREE.Group(),mat=new THREE.MeshLambertMaterial({map:texArmor,color}),dark=new THREE.MeshLambertMaterial({map:texArmor,color:0x3a3a40}),visor=new THREE.MeshBasicMaterial({color}),gunM=new THREE.MeshLambertMaterial({map:texGun});
  const B=(w,h,d,m,x,y,z,par=g)=>{const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,y,z);par.add(me);return me;};
  B(.62,.7,.38,mat,0,1.2,0);B(.5,.22,.32,dark,0,.82,0);B(.3,.3,.12,dark,0,1.2,.24);
  const head=new THREE.Group();head.position.set(0,1.58,0);g.add(head);B(.32,.32,.32,mat,0,.16,0,head);B(.26,.08,.04,visor,0,.18,-.17,head);
  B(.26,.2,.36,mat,-.44,1.48,0);B(.26,.2,.36,mat,.44,1.48,0);
  const arm=x=>{const p=new THREE.Group();p.position.set(x,1.45,0);g.add(p);B(.16,.55,.16,dark,0,-.28,0,p);return p;};
  const armL=arm(-.42),armR=arm(.42);B(.1,.5,.12,gunM,0,-.62,-.06,armR);B(.06,.06,.06,new THREE.MeshBasicMaterial({color}),0,-.88,-.06,armR);
  const leg=x=>{const p=new THREE.Group();p.position.set(x,.8,0);g.add(p);B(.2,.8,.24,dark,0,-.4,0,p);B(.22,.25,.26,mat,0,-.2,-.02,p);return p;};
  const legL=leg(-.15),legR=leg(.15),shield=new THREE.Mesh(new THREE.SphereGeometry(.82,10,8),new THREE.MeshBasicMaterial({color:0x40dfff,wireframe:true,transparent:true,opacity:.28,depthWrite:false}));shield.scale.set(.8,1.2,.8);shield.visible=false;g.add(shield);scene.add(g);g.visible=false;return{group:g,mat,gunM,shield,head,armL,armR,legL,legR};}
function applyTeamAppearance(e){if(e.mesh&&e.mesh.mat)e.mesh.mat.color.setHex(teamColorFor(e));}
const player=makeEntity('Игрок',0xffffff,false);
const BOT_DEFS=[['Вектор',0xd03030,'sniper'],['Оса',0xe0c020,'rush'],['Гранит',0x3070e0,'rocket'],['Нова',0x30c050,'collector'],['Крюк',0xc040c0,'coward']];
const TRAITS={sniper:{fav:[6,3],pick:(h,d)=>h(6)&&d>10?6:h(3)&&d>8?3:-1},rush:{fav:[4,1],pick:(h,d)=>h(4)&&d<18?4:-1},rocket:{fav:[2],pick:(h,d)=>h(2)&&d>4?2:-1},collector:{fav:[5,2]},coward:{fav:[3,5],pick:(h,d)=>h(3)&&d>12?3:-1}};
const BOT_LINES={
 kill:{sniper:['Не высовывайся, {n}.','Один выстрел — один фраг.','Тебя видно с другого конца карты.','Стой на месте — так удобнее целиться.','Чисто.'],
  rush:['Вперёд и только вперёд!','Бах! Сюрприз!','{n}, это было слишком медленно.','Ещё! Хочу ещё!','Кто следующий?'],
  rocket:['Ракета нашла адресата.','Бум. Прямо под ноги.','Доставка ракеты, распишитесь.','{n}, красивый полёт!'],
  collector:['Спасибо за бонус, {n}!','Всё, что лежит, — моё. И фраги тоже.','Броня решает.','Мегаздоровье — лучший друг.'],
  coward:['Ой. Это случайно.','Извини, {n}, рука дрогнула.','Я просто защищаюсь!','Не подходи больше, ладно?']},
 death:{sniper:['Слишком близко, так нечестно.','Ладно, {n}, в следующий раз — с крыши.','Прицел сбит. Бывает.','Дистанция, мне нужна дистанция…'],
  rush:['Зато весело!','Ничего, уже бегу обратно!','Ай! Ещё раунд!','Неплохо, {n}. Реванш!'],
  rocket:['Ракет не хватает…','Надо стрелять под ноги. Запомню.','Ладно, перезарядка.','Обидно, {n}.'],
  collector:['Эй, тут ещё столько бонусов!','{n}, оставь мне хоть аптечку!','Ладно, пойду за бронёй.'],
  coward:['Ну вот, опять.','Можно не так больно?','Всё, прячусь.','{n}, за что?!']}};
let botChatT=-99;
function botSay(b,kind,other){if(!b||!b.isBot||!other||(other!==player&&!other.remote))return;if(time-botChatT<6||R()>(kind==='kill'?.4:.3))return;const L=(BOT_LINES[kind]||{})[b.trait];if(!L)return;botChatT=time;const line=L[(R()*L.length)|0].replace('{n}',other.name);
  setTimeout(()=>{if(state==='play'||state==='paused')postChat(b,line);},600+R()*1000);}
const bots=BOT_DEFS.map(([n,c,tr])=>{const b=makeEntity(n,c,true);b.trait=tr;b.mesh=makeBotMesh(c);Object.assign(b,{path:null,think:0,target:null,reactT:0,alertT:0,strafePh:R()*9,strafeF:1.5+R()*1.5,stuckT:0,stuckPos:new V3(),aimErrT:0,aimErrY:0,aimErrP:0,walkPh:0});return b;});
let ents=[...bots];
