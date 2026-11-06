// ПРЕДЕЛ — Pixel portraits for the scoreboard, kill feed and chat, plus the talking head.
'use strict';
/* HTML anywhere (also HTML sent over the network) carries only a tiny marker
   <i class="pf" data-n="name" data-c="color">; each client draws the portrait itself. */
const PORTRAITS=new Map();
// 24×24: helmet or hair, the fighter's 16×16 face, armour on the shoulders, a build detail.
function portraitURLs(name,color){const key=name+'|'+color;let P=PORTRAITS.get(key);if(P)return P;
  const {build,seed}=lookFor(name),skinHex=SKINS[(seed>>>3)%SKINS.length],hairHex=HAIRS[(seed>>>5)%HAIRS.length],face=faceTexture(build,seed,color,skinHex,hairHex).image,acc=hexCss(color);
  const draw=open=>{const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d'),px=(col,x,y,w=1,h=1)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    px('#10141c',0,0,24,24);px('#1a2030',0,0,24,12);
    const helmet=build==='heavy'||build==='rocket'||build==='cyborg';
    px('#2a2a30',3,19,18,5);px(acc,1,20,22,4);px('rgba(0,0,0,.35)',1,20,22,1);px('#2a2a30',9,19,6,5);// shoulders and collar
    if(build==='heavy'){px(acc,0,17,6,7);px(acc,18,17,6,7);px('#c8ccd0',1,16,1,1);px('#c8ccd0',22,16,1,1);}
    g.imageSmoothingEnabled=false;g.drawImage(face,4,3,16,16);
    if(helmet&&build!=='heavy'){px(acc,3,1,18,3);px(acc,3,3,1,10);px(acc,20,3,1,10);px('rgba(255,255,255,.25)',4,1,16,1);}
    else if(build==='mutant'){for(let x=5;x<20;x+=4)px('#5d7a3e',x,1,2,2);}
    else px(hairHex,4,1,16,2);
    if(build==='sniper'){px('#9aa0a8',3,9,5,3);px(acc,3,10,2,1);}
    if(build==='scav'||build==='cyborg'){px('#9aa0a8',build==='scav'?17:18,0,1,4);px(acc,build==='scav'?17:18,0,1,1);}
    if(open&&build!=='rocket'&&build!=='scav'){px('#1a0c0c',9,14,6,3);px('#f0ead0',10,14,4,1);}
    if(open&&(build==='rocket'||build==='scav'))px('rgba(255,255,255,.35)',5,8,14,2);// masked: eyes flash instead
    g.strokeStyle=acc;g.lineWidth=1;g.strokeRect(.5,.5,23,23);return c.toDataURL();};
  P={closed:draw(false),open:draw(true)};PORTRAITS.set(key,P);return P;}
const pf=e=>`<i class="pf" data-n="${esc(e.name)}" data-c="${teamColorFor(e)}"></i>`;
function hydratePortraits(root){for(const el of (root||document).querySelectorAll('i.pf:not([data-ok])')){el.dataset.ok='1';
  try{el.style.backgroundImage=`url(${portraitURLs(el.dataset.n,+el.dataset.c).closed})`;}catch(x){}}}
new MutationObserver(ms=>{for(const m of ms)if(m.addedNodes.length){hydratePortraits();break;}}).observe(document.body,{childList:true,subtree:true});
/* talking head: big portrait in the corner while someone's chat line is fresh */
let talkT=0,talkFlap=0,talkP=null,talkOpen=true;
function showTalkingHead(name,color,text){const P=portraitURLs(name,color);talkP=P;talkT=Math.min(3.2,1.2+String(text||'').length*.045);talkFlap=0;
  $('talkimg').src=P.open;talkOpen=true;$('talkname').textContent=name;$('talkname').style.color=hexCss(color);$('talker').classList.add('on');}
function updateTalkingHead(dt){if(talkT<=0)return;talkT-=dt;if(talkT<=0){$('talker').classList.remove('on');return;}
  talkFlap+=dt;const open=talkT>.7&&Math.floor(talkFlap*8)%2===0;if(open!==talkOpen){talkOpen=open;$('talkimg').src=open?talkP.open:talkP.closed;}}
