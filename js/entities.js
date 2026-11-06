// ПРЕДЕЛ — Entities, bot roster, personalities and chat lines.
'use strict';
/* ---------- entities ---------- */
const SKILL=[{turn:3.5,err:.09,react:.7,lead:.3,speed:9.5,dmgMul:.55},{turn:6,err:.045,react:.4,lead:.7,speed:10.5,dmgMul:.8},{turn:11,err:.018,react:.22,lead:1,speed:11.5,dmgMul:1}];
let difficulty=1;
function makeEntity(name,color,isBot){return{name,color,isBot,team:null,doubleT:0,invisT:0,invisFlickerT:0,speedT:0,shieldT:0,jetT:0,regenT:0,pos:new V3(),vel:new V3(),up:UP.clone(),r:.4,h:1.8,yaw:0,pitch:0,health:100,armor:0,alive:false,grounded:false,owned:Array(WEAPONS.length).fill(0).map((_,i)=>i<2?1:0),ammo:Array(WEAPONS.length).fill(0),weapon:1,cd:0,frags:0,deaths:0,streak:0,multi:0,lastKill:-9,padCD:0,respawnT:0,hurtT:0,switchT:0,walkPh:0,sseq:0,nid:0};}
/* ---------- character looks: six builds and procedural pixel faces ----------
   The look is derived from the fighter's name alone, so host and every guest build the same body
   without any extra network traffic. Bots get the build that matches their personality. */
const BUILDS=['heavy','rocket','sniper','scav','mutant','cyborg'];
const BUILD_OF_TRAIT={sniper:'sniper',rush:'heavy',rocket:'rocket',collector:'scav',coward:'mutant'};
function strHash(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.codePointAt(0),16777619);return h>>>0;}
function seededRand(seed){let s=seed>>>0||1;return()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;}
function lookFor(name){const h=strHash(name),def=BOT_DEFS.find(d=>d[0]===name);return{build:def?BUILD_OF_TRAIT[def[2]]:BUILDS[h%BUILDS.length],seed:h};}
const SKINS=['#e8b48c','#c68a5e','#8d5a3b','#f0c8a8','#d9a07a'],HAIRS=['#2a1d14','#5a3a1c','#b8862c','#1c1c22','#8a8a90','#a8341c'];
const hexCss=c=>'#'+new THREE.Color(c).getHexString();
// 16×16 face, drawn on the -z side of the head box.
function faceTexture(build,seed,color,skinHex,hairHex){const r=seededRand(seed^0x9e37),pick=a=>a[(r()*a.length)|0],acc=hexCss(color);
  return makeTex(16,g=>{const skin=build==='mutant'?'#8fb86a':skinHex,hair=hairHex,dk='#1a1414';
    const px=(c,x,y,w=1,h=1)=>rect(g,c,x,y,w,h);
    if(build==='rocket'){// gas mask: rubber, two round goggles and a filter snout
      px('#3b3f42',0,0,16,16);px('#2a2d30',0,0,16,3);px('#55595c',1,3,14,1);
      for(const x of [2,9]){px('#1c1e20',x,5,5,5);px(acc,x+1,6,3,3);px('#ffffff',x+1,6,1,1);}
      px('#24272a',5,11,6,5);px('#6a6e72',6,12,4,3);px('#24272a',6,13,4,1);px('#8a8e92',7,12,2,1);return;}
    px(skin,0,0,16,16);px('rgba(0,0,0,.18)',0,13,16,3);px('rgba(0,0,0,.12)',0,0,1,16);px('rgba(0,0,0,.12)',15,0,1,16);
    // hair / helmet rim
    if(build==='heavy'){px(hair,0,0,16,3);px('rgba(0,0,0,.25)',0,3,16,1);}
    else if(build==='sniper'){px(hair,0,0,16,4);px(hair,0,4,3,3);px(hair,13,4,3,2);}
    else if(build==='scav'){px(hair,0,0,16,2);px('#4a3a28',1,2,14,3);px('#202428',3,2,4,3);px('#202428',9,2,4,3);px(acc,4,3,2,1);px(acc,10,3,2,1);}
    else if(build==='mutant'){px('rgba(0,0,0,.25)',0,0,16,2);for(let x=1;x<16;x+=3)px('#5d7a3e',x,0,1,2);}
    else px(hair,0,0,16,2);
    // eyes
    if(build==='mutant'){px('#ffe040',3,6,4,3);px(dk,4,7,2,1);px('#ffe040',10,7,2,2);px(dk,10,8,1,1);px('#3a5a24',2,5,5,1);}
    else if(build==='cyborg'){px('#8a9098',8,0,8,16);px('#5c6168',8,0,1,16);px('#ff3020',10,6,4,3);px('#ffd0c0',11,7,1,1);px('#5c6168',9,11,6,1);px('#c0c4c8',13,3,1,1);px('#c0c4c8',13,13,1,1);
      px('#ffffff',3,7,2,1);px(dk,4,7,1,1);px(dk,2,5,4,1);}
    else if(r()<.3&&build!=='scav'){px('#101014',2,6,12,3);px('#3a4a5a',3,7,4,1);px('#3a4a5a',9,7,4,1);}// shades
    else{px('#ffffff',3,7,3,1);px('#ffffff',10,7,3,1);px(dk,4,7,1,1);px(dk,11,7,1,1);
      if(build==='heavy'){px(dk,2,5,4,1);px(dk,10,5,4,1);px(dk,5,6,1,1);px(dk,10,6,1,1);}else{px(dk,3,5,3,1);px(dk,10,5,3,1);}}
    // nose
    if(build!=='cyborg')px('rgba(0,0,0,.22)',7,9,2,2);
    // mouth / lower face
    if(build==='scav'){px(acc,0,10,16,6);px('rgba(0,0,0,.25)',0,10,16,1);px('rgba(0,0,0,.2)',3,13,10,1);}
    else if(build==='mutant'){px(dk,3,11,10,3);for(let x=3;x<13;x+=2)px('#f0ead0',x,11,1,2);px('#f0ead0',4,13,1,1);px('#f0ead0',10,13,1,1);}
    else if(build==='heavy'){px(dk,4,12,8,1);px('rgba(40,20,10,.35)',2,11,12,5);if(r()<.6)px('#f0ead0',5,12,6,1);}
    else if(build==='cyborg'){px(dk,3,12,5,1);}
    else{px(dk,5,12,6,1);if(r()<.4)px(hair,4,12,8,4);}
    // scar
    if(r()<.45&&build!=='cyborg'){const x=1+((r()*11)|0);px('#9a3a30',x,4,1,6);for(let y=5;y<10;y+=2)px('#9a3a30',x-1,y,3,1);}});}
// 32×32 armour plate with a seeded emblem; mostly light grey so the team colour can tint it.
function armorTexture(seed){const r=seededRand(seed^0x51ed);return makeTex(32,g=>{
  rect(g,'#c4c4c4',0,0,32,32);rect(g,'#e8e8e8',0,0,32,2);rect(g,'#6a6a6a',0,30,32,2);rect(g,'#8a8a8a',15,0,2,32);rect(g,'#8a8a8a',0,15,32,2);
  for(const [x,y] of [[2,3],[28,3],[2,27],[28,27]])rect(g,'#f4f4f4',x,y,2,2);
  const k=(r()*5)|0,dk='#3c3c3c';
  if(k===0)for(let i=0;i<4;i++)rect(g,dk,4+i*6,6,3,20);// stripes
  else if(k===1)for(let i=0;i<3;i++){for(let x=0;x<8;x++){rect(g,dk,8+x,8+i*6+Math.abs(x-4),1,2);rect(g,dk,16+x,8+i*6+Math.abs(x-4),1,2);}}// chevrons
  else if(k===2){const S=['01110','11111','10101','11111','01010'];S.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='1')rect(g,dk,8+x*3,7+y*3,3,3);}));}// skull
  else if(k===3)for(let i=0;i<8;i++)rect(g,i%2?dk:'#d8b020',4+i*3,22,3,6);// hazard band
  else{g.fillStyle=dk;g.font='bold 14px monospace';g.textAlign='center';g.fillText(String(1+((r()*98)|0)).padStart(2,'0'),16,22);}
  noise(g,32,32,26);});}
function makeBotMesh(color,name){
  const {build,seed}=lookFor(name),rnd=seededRand(seed),skinHex=SKINS[(seed>>>3)%SKINS.length],hairHex=HAIRS[(seed>>>5)%HAIRS.length];
  const g=new THREE.Group(),armorTex=armorTexture(seed),mat=new THREE.MeshLambertMaterial({map:armorTex,color}),dark=new THREE.MeshLambertMaterial({map:texArmor,color:0x3a3a40}),
    glow=new THREE.MeshBasicMaterial({color}),gunM=new THREE.MeshLambertMaterial({map:texGun}),metal=new THREE.MeshLambertMaterial({map:texArmor,color:0x9aa0a8}),
    skin=new THREE.MeshLambertMaterial({color:build==='mutant'?0x8fb86a:new THREE.Color(skinHex)}),hairM=new THREE.MeshLambertMaterial({color:new THREE.Color(hairHex)}),
    face=new THREE.MeshLambertMaterial({map:faceTexture(build,seed,color,skinHex,hairHex)});
  for(const m of [skin,hairM,face])m.userData.chromed=true;// skin should not look like chrome
  const B=(w,h,d,m,x,y,z,par=g)=>{const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,y,z);par.add(me);return me;};
  const C=(rt,rb,h,m,x,y,z,par=g,rx=0,rz=0,seg=6)=>{const me=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);me.position.set(x,y,z);me.rotation.set(rx,0,rz);par.add(me);return me;};
  // Proportions per build; the hitbox stays the same for everyone.
  const P={hip:.8,legW:.2,legD:.24,gap:.15,tW:.62,tH:.7,tD:.38,tY:1.2,sX:.42,sY:1.45,armW:.16,armL:.55,neckY:1.58,neckZ:0,head:.32,gunL:.5,...{
    heavy:{hip:.7,legW:.27,legD:.3,gap:.19,tW:.84,tH:.74,tD:.5,tY:1.1,sX:.56,sY:1.4,armW:.22,neckY:1.47,head:.3,gunL:.42},
    rocket:{hip:.78,legW:.22,legD:.26,gap:.16,tW:.68,tH:.7,tD:.42,tY:1.17,sX:.46,sY:1.44,armW:.18,neckY:1.54,head:.34,gunL:.56},
    sniper:{hip:.94,legW:.15,legD:.19,gap:.12,tW:.48,tH:.74,tD:.28,tY:1.32,sX:.33,sY:1.6,armW:.13,armL:.62,neckY:1.71,head:.27,gunL:.82},
    scav:{hip:.78,legW:.19,legD:.24,gap:.15,tW:.6,tH:.66,tD:.36,tY:1.17,sX:.41,sY:1.42,neckY:1.52,head:.31},
    mutant:{hip:.72,legW:.21,legD:.26,gap:.17,tW:.66,tH:.62,tD:.44,tY:1.06,sX:.44,sY:1.3,armW:.17,neckY:1.36,neckZ:-.16,head:.28},
    cyborg:{}}[build]};
  // legs
  const leg=x=>{const p=new THREE.Group();p.position.set(x,P.hip,0);g.add(p);B(P.legW,P.hip,P.legD,dark,0,-P.hip/2,0,p);B(P.legW+.03,P.hip*.3,P.legD+.03,mat,0,-P.hip*.28,-.01,p);B(P.legW+.04,.12,P.legD+.1,dark,0,-P.hip+.06,-.04,p);return p;};
  const legL=leg(-P.gap),legR=leg(P.gap);
  // torso (mutants hunch forward around the waist)
  const torso=new THREE.Group();torso.position.set(0,P.hip,0);g.add(torso);if(build==='mutant')torso.rotation.x=-.32;
  const tc=P.tY-P.hip;B(P.tW,P.tH,P.tD,mat,0,tc,0,torso);B(P.tW*.82,.2,P.tD*.84,dark,0,.02,0,torso);B(P.tW*.48,P.tH*.42,.06,dark,0,tc+.04,-P.tD/2-.02,torso);
  B(P.tW*.4,.06,.04,glow,0,tc+.1,-P.tD/2-.06,torso);
  // head
  const head=new THREE.Group();head.position.set(0,P.neckY,P.neckZ);g.add(head);const hs=P.head;
  const helmet=build==='heavy'||build==='rocket'||build==='cyborg';const side=helmet?mat:build==='mutant'?skin:hairM;
  const hb=new THREE.Mesh(new THREE.BoxGeometry(hs,hs,hs),[side,side,side,dark,side,face]);hb.position.set(0,hs/2,0);head.add(hb);
  // arms
  const arm=(x,w,L,m)=>{const p=new THREE.Group();p.position.set(x,P.sY,0);g.add(p);B(w,L,w,m,0,-L/2,0,p);return p;};
  const armL=build==='mutant'?arm(-P.sX-.06,.3,.78,skin):build==='cyborg'?new THREE.Group():arm(-P.sX,P.armW,P.armL,build==='heavy'?skin:dark);
  const armR=arm(P.sX,P.armW,P.armL,build==='heavy'?skin:dark);
  B(.1,P.gunL,.12,gunM,0,-P.armL-P.gunL/2+.18,-.06,armR);B(.06,.06,.06,glow,0,-P.armL-P.gunL+.12,-.06,armR);
  B(P.armW+.04,.12,P.armW+.04,mat,0,-P.armL*.55,0,armR);
  // build-specific pieces
  if(build==='heavy'){
    for(const s of [-1,1]){const pad=B(.42,.3,.52,mat,s*(P.sX+.04),P.sY+.12,0);pad.rotation.z=s*-.18;for(const z of [-.14,.12])C(0,.06,.18,metal,s*(P.sX+.1),P.sY+.34,z);}
    B(P.tW+.04,.12,P.tD+.04,metal,0,P.hip+.05,0);B(.16,.12,.06,glow,0,P.hip+.05,-P.tD/2-.03);
    B(P.armW+.06,.2,P.armW+.06,mat,0,-P.armL+.1,0,armL);}
  else if(build==='rocket'){
    B(.5,.6,.24,dark,0,P.tY+.02,P.tD/2+.12);for(const s of [-1,1]){C(.08,.08,.78,metal,s*.15,P.tY+.32,P.tD/2+.14,g,-.18);C(.09,.09,.04,glow,s*.15,P.tY+.71,P.tD/2+.21,g,-.18);}
    C(.09,.11,.14,metal,0,hs*.25,-hs/2-.07,head,Math.PI/2,0,8);C(.06,.06,.03,dark,0,hs*.25,-hs/2-.15,head,Math.PI/2,0,8);
    B(.36,.28,.46,mat,-P.sX-.02,P.sY+.08,0);}
  else if(build==='sniper'){
    B(P.tW+.06,P.hip*.85,.06,dark,0,P.hip*.62,P.tD/2+.03);for(const s of [-1,1])B(.06,P.hip*.85,P.tD+.04,dark,s*(P.tW/2+.02),P.hip*.62,0);
    B(P.tW+.1,.16,P.tD+.12,dark,0,P.sY+.06,0);
    C(.045,.045,.16,metal,-hs*.22,hs*.55,-hs/2-.07,head,Math.PI/2);C(.04,.04,.02,glow,-hs*.22,hs*.55,-hs/2-.16,head,Math.PI/2);
    B(.18,.06,.06,metal,-hs*.22-.05,hs*.55,-hs/2-.02,head);}
  else if(build==='scav'){
    B(.52,.52,.3,dark,0,P.tY+.04,P.tD/2+.16);B(.44,.3,.08,mat,0,P.tY-.05,P.tD/2+.33);C(.1,.1,.56,mat,0,P.tY+.36,P.tD/2+.16,g,0,Math.PI/2);
    C(.012,.012,.9,metal,.2,P.tY+.7,P.tD/2+.26);B(.05,.05,.05,glow,.2,P.tY+1.16,P.tD/2+.26);
    for(const x of [-.22,0,.22])B(.12,.12,.08,dark,x,P.hip+.04,-P.tD/2-.04);
    for(let i=0;i<3;i++)B(.06,.08+rnd()*.08,.06,i%2?metal:glow,-.18+i*.16,P.tY-.32,P.tD/2+.34);}
  else if(build==='mutant'){
    for(let i=0;i<4;i++)C(0,.06,.2,dark,0,tc+P.tH/2-.05-i*.15,P.tD/2+.04,torso,-.9);
    for(const z of [-.08,.06])B(.07,.18,.07,dark,0,-.86,z-.04,armL);B(.08,.14,.07,dark,.1,-.85,-.1,armL);
    B(.34,.26,.44,skin,-P.sX-.06,P.sY+.06,0);B(.24,.16,.32,dark,P.sX,P.sY+.04,0);}
  else{// cyborg: chrome left arm, cables, chest core, antenna
    armL.position.set(-P.sX,P.sY,0);g.add(armL);C(.07,.06,.28,metal,0,-.14,0,armL);C(.06,.05,.26,metal,0,-.42,0,armL);
    for(const y of [0,-.28])B(.13,.06,.13,glow,0,y,0,armL);B(.12,.1,.12,metal,0,-.6,0,armL);
    C(.07,.07,.04,glow,.06,P.tY+.12,-P.tD/2-.02,g,Math.PI/2,0,8);
    for(const s of [-1,1])C(.018,.018,.42,dark,s*.08,P.neckY-.08,P.tD/2-.02,g,.7);
    C(.01,.01,.36,metal,hs*.35,P.neckY+hs+.16,0);B(.04,.04,.04,glow,hs*.35,P.neckY+hs+.35,0);
    B(.28,.24,.4,metal,-P.sX,P.sY+.06,0);B(.26,.2,.36,mat,P.sX,P.sY+.05,0);}
  if(build==='scav'||build==='sniper')B(.24,.2,.34,mat,P.sX,P.sY+.05,0);
  if(build==='scav')B(.24,.2,.34,mat,-P.sX,P.sY+.05,0);
  if(build==='rocket')B(.26,.2,.34,dark,P.sX,P.sY+.05,0);
  const shield=new THREE.Mesh(new THREE.SphereGeometry(.82,10,8),new THREE.MeshBasicMaterial({color:0x40dfff,wireframe:true,transparent:true,opacity:.28,depthWrite:false}));shield.scale.set(.8,1.2,.8);shield.visible=false;g.add(shield);
  chrome(g,.16);scene.add(g);g.visible=false;return{group:g,mat,glow,gunM,shield,head,armL,armR,legL,legR,build};}
function applyTeamAppearance(e){if(!e.mesh)return;const c=teamColorFor(e);if(e.mesh.mat)e.mesh.mat.color.setHex(c);if(e.mesh.glow)e.mesh.glow.color.setHex(c);}
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
const bots=BOT_DEFS.map(([n,c,tr])=>{const b=makeEntity(n,c,true);b.trait=tr;b.mesh=makeBotMesh(c,n);Object.assign(b,{path:null,think:0,target:null,reactT:0,alertT:0,strafePh:R()*9,strafeF:1.5+R()*1.5,stuckT:0,stuckPos:new V3(),aimErrT:0,aimErrY:0,aimErrP:0,walkPh:0});return b;});
let ents=[...bots];
