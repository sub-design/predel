// ПРЕДЕЛ — Sound effects and the procedural music sequencer (per-map themes).
'use strict';
/* ---------- audio ---------- */
let AC=null,master,sfxFilter,nbuf,muted=false,musicBus=null,musicComp=null,battleDriveCurve=null,musicTimer=null,musicStep=0,nextMusicTime=0,musicOn=false,musicMode='',musicStyle=-1;
const MUSIC_BPM=118,MUSIC_BARS=64,MUSIC_STEPS=MUSIC_BARS*16,MUSIC_VOL=.68;
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=SET.vol/160;master.connect(AC.destination);sfxFilter=AC.createBiquadFilter();sfxFilter.type='lowpass';sfxFilter.frequency.value=22000;sfxFilter.connect(master);musicBus=AC.createGain();musicBus.gain.value=(muted||!SET.music)?0:MUSIC_VOL;musicComp=AC.createDynamicsCompressor();musicComp.threshold.value=-14;musicComp.knee.value=10;musicComp.ratio.value=2.5;musicComp.attack.value=.008;musicComp.release.value=.22;musicBus.connect(musicComp);musicComp.connect(master);battleDriveCurve=new Float32Array(512);for(let i=0;i<battleDriveCurve.length;i++){const x=i*2/(battleDriveCurve.length-1)-1;battleDriveCurve[i]=Math.tanh(x*4)/Math.tanh(4);}nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}catch(e){AC=null;}}
const _right=new V3();
function out(pos){let v=1,pan=0;if(pos){const dx=pos.x-camera.position.x,dy=pos.y-camera.position.y,dz=pos.z-camera.position.z,dist=Math.hypot(dx,dy,dz);v=Math.max(0,1-dist/70);v*=v;if(v<.01)return null;_right.setFromMatrixColumn(camera.matrixWorld,0);pan=clamp((dx*_right.x+dy*_right.y+dz*_right.z)/(dist+.001),-1,1)*.8;}
  const g=AC.createGain();g.gain.value=v;if(AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(sfxFilter);}else g.connect(sfxFilter);return g;}
function tone(dst,type,f0,f1,dur,vol=1,delay=0){const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.02);}
function noiz(dst,ft,f0,f1,dur,vol=1,q=1,delay=0){const t=AC.currentTime+delay,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;f.type=ft;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(dst);s.start(t,Math.random()*.5);s.stop(t+dur+.02);}
function playSnd(name,pos){if(!AC||muted)return;const dst=out(pos);if(!dst)return;
  switch(name){
  case'blaster':tone(dst,'square',1400,300,.14,.16);noiz(dst,'highpass',3000,1500,.06,.2);break;
  case'shred':noiz(dst,'bandpass',2200,900,.07,.55,.8);tone(dst,'square',160,80,.05,.12);break;
  case'power':tone(dst,'sine',520,1250,.2,.28);tone(dst,'sawtooth',220,880,.3,.2,.06);break;
  case'shotgun':// crack + blast + chest thump + rolling tail, then the pump: chk-chk
    noiz(dst,'highpass',6000,2500,.035,1.1);noiz(dst,'lowpass',7000,500,.32,1.25,.7);noiz(dst,'bandpass',1400,300,.18,.9,.8);
    tone(dst,'sine',140,34,.32,1.05);tone(dst,'triangle',75,30,.4,.55);noiz(dst,'lowpass',900,90,1.1,.32,1,.05);
    noiz(dst,'bandpass',2600,1800,.045,.42,7,.42);tone(dst,'square',780,520,.03,.07,.42);noiz(dst,'bandpass',1900,1300,.06,.5,7,.56);tone(dst,'square',600,380,.035,.08,.56);break;
  case'rocket':noiz(dst,'lowpass',1800,200,.45,.6);tone(dst,'sawtooth',220,60,.3,.2);break;
  case'thunder':noiz(dst,'lowpass',520,42,1.8,.8);tone(dst,'sine',72,30,1.6,.38,.12);break;
  case'boom':noiz(dst,'lowpass',1200,60,1.1,1.2);tone(dst,'sine',90,25,.8,.8);break;
  case'rail':tone(dst,'sawtooth',1800,120,.6,.22);tone(dst,'sine',3000,400,.4,.14);noiz(dst,'bandpass',5000,800,.3,.3,2);break;
  case'zap':noiz(dst,'highpass',4000,2000,.08,.25);break;
  case'pad':tone(dst,'sine',180,900,.4,.35);noiz(dst,'bandpass',800,3000,.35,.2,3);break;
  case'jump':tone(dst,'triangle',180,260,.08,.12);break;
  case'land':noiz(dst,'lowpass',400,100,.1,.35);break;
  case'hurt':noiz(dst,'bandpass',900,400,.18,.5,2);tone(dst,'sawtooth',300,140,.15,.15);break;
  case'death':tone(dst,'sawtooth',500,50,.7,.3);noiz(dst,'lowpass',1500,100,.5,.4);break;
  case'pickup':tone(dst,'square',600,1200,.1,.12);tone(dst,'square',900,1800,.1,.1,.08);break;
  case'health':tone(dst,'sine',500,700,.15,.3);tone(dst,'sine',750,1000,.2,.3,.12);break;
  case'weapon':tone(dst,'sawtooth',200,400,.12,.2);noiz(dst,'bandpass',1500,3000,.15,.3,2,.05);break;
  case'hit':tone(dst,'sine',1600,1500,.04,.22);break;
  case'switch':noiz(dst,'bandpass',2000,1000,.06,.3,3);break;
  case'empty':tone(dst,'square',200,180,.04,.1);break;
  case'respawn':tone(dst,'sine',300,1200,.5,.25);break;}}
function musicMidi(n){return 440*Math.pow(2,(n-69)/12);}
function musicTone(freq,t,dur,wave='sawtooth',vol=.04,cutoff=1800,att=.012){
  if(!AC||muted||!musicBus)return;const o=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();
  o.type=wave;o.frequency.setValueAtTime(freq,t);f.type='lowpass';f.frequency.setValueAtTime(cutoff,t);f.Q.value=.7;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(dur,att+.02));
  o.connect(f);f.connect(g);g.connect(musicBus);o.start(t);o.stop(t+dur+.02);
}
function musicPower(freq,t,dur,vol=.09){if(!AC||muted||!battleDriveCurve)return;const a=AC.createOscillator(),b=AC.createOscillator(),d=AC.createWaveShaper(),f=AC.createBiquadFilter(),g=AC.createGain();d.curve=battleDriveCurve;d.oversample='2x';a.type=b.type='sawtooth';a.frequency.setValueAtTime(freq,t);b.frequency.setValueAtTime(freq*1.005,t);f.type='lowpass';f.frequency.setValueAtTime(2100,t);f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);a.connect(d);b.connect(d);d.connect(f);f.connect(g);g.connect(musicBus);a.start(t);b.start(t);a.stop(t+dur+.02);b.stop(t+dur+.02);}
function musicKick(t){if(!AC||muted)return;const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(125,t);o.frequency.exponentialRampToValueAtTime(42,t+.16);g.gain.setValueAtTime(.65,t);g.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.21);}
function musicNoise(t,dur,highpass,vol){if(!AC||muted||!nbuf)return;const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;f.type=highpass?'highpass':'bandpass';f.frequency.setValueAtTime(highpass?7200:1900,t);f.Q.value=highpass?.7:.8;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(musicBus);s.start(t,R()*.7);s.stop(t+dur+.01);}
function scheduleMusicStep(step,t){
  if(muted)return;const bar=Math.floor(step/16),i=step%16,section=Math.floor(bar/16),root=[40,36,43,38][Math.floor(bar/4)%4];
  const kick=section===2?[0,10]:section===0?[0]:[0,8];if(kick.includes(i))musicKick(t);
  if(section!==2&&(i===4||i===12))musicNoise(t,.16,false,.24);
  if(i%2===0&&(section!==0||i<12))musicNoise(t,section===0?.025:.04,true,section===0?.035:.075);
  if(i===15&&bar%4===3&&section!==0)musicNoise(t,.055,true,.09);
  const bass=[0,null,7,null,0,5,7,null,0,null,7,10,12,null,7,null][i];
  if(bass!==null&&(section!==0||i===0||i===8))musicTone(musicMidi(root+bass),t,.16,'sawtooth',section===0?.035:.07,420);
  const riff=[12,null,15,null,19,null,15,null,12,null,10,null,7,null,10,null][i];
  if(riff!==null&&section!==2&&(section>0||bar>=8)&&bar%2===0)musicTone(musicMidi(root+riff),t,.19,section===3?'triangle':'square',section===3?.022:.035,section===3?1100:2600);
  if(i===0&&section!==0){const chord=[root+12,root+19,root+24];for(const n of chord)musicTone(musicMidi(n),t,1.75,'sawtooth',section===3?.012:.018,900);}
}
function scheduleBattleStep(step,t){
  if(muted)return;const bar=Math.floor(step/16),i=step%16,section=Math.floor(bar/16),root=[40,40,36,38][Math.floor(bar/4)%4];
  const kicks=section===2?[0,4,8,14]:[0,4,8,12];if(kicks.includes(i))musicKick(t);
  if(i===4||i===12)musicNoise(t,.18,false,.34);
  if(i%2===0)musicNoise(t,.035,true,.10);
  if(i===15&&bar%4===3)musicNoise(t,.07,true,.14);
  if(i===0&&bar%16===0)musicNoise(t,.32,true,.18);
  const bass=[0,null,null,7,0,null,5,null,0,null,7,10,0,null,12,null][i];
  if(bass!==null)musicTone(musicMidi(root-12+bass),t,.13,'sawtooth',.105,520);
  const riffs=[0,null,3,null,7,null,10,null,7,null,5,3,0,null,3,null],riff=riffs[i];
  if(riff!==null&&section!==2){const f=musicMidi(root+12+riff);musicPower(f,t,.19,.105);if(i===0||i===8)musicPower(musicMidi(root+19+riff),t,.16,.065);}
  if(section===1||section===3){const lead=[24,null,null,22,null,19,null,17,19,null,22,null,24,22,19,null][i];if(lead!==null)musicTone(musicMidi(root+lead),t,.10,'square',.038,3200);}
}
/* per-map battle themes: one sequencer, a style per map (map 0 keeps the original theme) */
function musicNz(t,dur,type,f0,f1,vol,q=1,att=.004){if(!AC||muted||!nbuf)return;const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nbuf;s.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(musicBus);s.start(t,R()*.5);s.stop(t+dur+.02);}
function musicBell(f,t,dur,vol){musicTone(f,t,dur*2.2,'sine',vol,8000,.004);musicTone(f*2.76,t,dur*.9,'sine',vol*.35,9000,.004);}
function musicTom(t,f=170,vol=.5){if(!AC||muted)return;const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.5,t+.22);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.26);o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.28);}
function musicInst(name,f,t,dur,vol,cut){switch(name){
  case'power':musicPower(f,t,dur,vol);break;case'bell':musicBell(f,t,dur,vol);break;
  case'flute':musicTone(f,t,dur,'triangle',vol,cut,.05);musicTone(f*1.003,t,dur,'sine',vol*.5,cut,.07);break;
  case'pluck':musicTone(f,t,dur,'sawtooth',vol,cut*.5,.004);break;
  case'saw':musicTone(f,t,dur,'sawtooth',vol,cut);break;default:musicTone(f,t,dur,name,vol,cut);}}
function musicDrum(c,t,S){const v=S.snareVol||.3;switch(c){
  case'x':musicNoise(t,.18,false,v);break;case'g':musicNoise(t,.08,false,v*.3);break;
  case'c':for(let k=0;k<3;k++)musicNz(t+k*.011,.05,'bandpass',1400,1100,v*.7,1.2);musicNz(t+.033,.16,'bandpass',1300,900,v*.6,1.2);break;
  case't':musicTom(t,150+R()*40,v*1.4);break;case'T':musicTom(t,95,v*1.6);break;
  case'm':musicNz(t,.14,'bandpass',3600,2800,v*1.1,9);musicTone(1730,t,.08,'square',v*.12,6000,.002);musicNoise(t,.1,false,v*.5);break;}}
function musicFx(S,bar,i,t,sd,root){const L=S.len||16;switch(S.fx){
  case'anvil':if(i===0&&bar%2===0){musicNz(t,.5,'bandpass',2600,2400,.14,14);musicTone(1250,t,.4,'square',.012,5000,.002);}break;
  case'gong':if(i===0&&bar%8===0){musicTone(musicMidi(root-12),t,4,'sine',.12,2000,.01);musicTone(musicMidi(root-12)*2.41,t,3,'sine',.04,4000,.01);musicNz(t,2,'bandpass',900,400,.05,3,.01);}break;
  case'wind':if(i===0&&bar%4===0)musicNz(t,sd*L*4,'bandpass',300,1400,.06,4,sd*L*1.6);break;
  case'waves':if(i===0&&bar%2===0)musicNz(t,sd*L*2,'lowpass',2400,180,.11,.6,sd*L*.8);break;
  case'siren':if(i===0&&bar%8===4){for(let k=0;k<2;k++){const o=t+k*sd*8;musicTone(620,o,sd*8,'triangle',.022,3000,sd*3);}}break;
  case'roll':if(bar%4===3&&i>=12)musicTom(t,120+(i-12)*25,.28);break;}}
const MUSIC_STYLES=[null,
 // 1 Литейня — трэш-метал, двойная бочка, наковальня
 {bpm:168,prog:[40,40,41,38],kick:'x.x.x...x.x.x...',kick2:'xxxxxxxxxxxxxxxx',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.x.',hatVol:.08,
  bass:[0,0,0,null,0,0,1,null,0,0,0,null,3,null,1,null],bassInst:'saw',bassDur:.09,bassVol:.1,
  riff:[0,0,0,null,0,0,1,null,0,0,0,null,3,null,1,null],riffInst:'power',riffOct:12,riffDur:.1,riffVol:.1,
  lead:[12,null,11,12,15,null,14,12,11,null,8,null,7,null,8,11,12,null,null,null,15,null,17,null,19,null,17,15,14,null,11,null],leadInst:'square',leadVol:.036,leadCut:3000,
  sec:['kshbr','kshbrl','kshbr','kshbrl'],fx:'anvil'},
 // 2 Орбита — космический даунтемпо, арпеджио с эхом
 {bpm:96,prog:[38,41,36,43],kick:'x.........x.....',snare:'........x.......',hat:'..x...x...x...x.',hatVol:.065,snareVol:.32,
  bass:[0,null,null,null,null,null,null,null,null,null,7,null,null,null,null,null],bassInst:'sine',bassDur:.9,bassVol:.21,bassCut:800,
  arp:[0,7,12,14,19,14,12,7,0,7,12,14,19,21,19,14],arpInst:'triangle',arpOct:12,arpDur:.18,arpVol:.048,arpCut:2400,echo:1,
  pad:[0,7,14,19],padWave:'triangle',padVol:.028,padCut:1400,padBars:2,
  lead:[24,null,null,null,26,null,null,null,21,null,null,null,19,null,null,null,24,null,null,null,26,null,28,null,26,null,null,null,null,null,null,null],leadInst:'bell',leadVol:.065,leadDur:.5,
  sec:['khbap','kshbap','hbap','kshbapl']},
 // 3 Полигон — драм-н-бэйс, маршевая дробь
 {bpm:172,prog:[41,41,39,36],kick:'x.........x.....',kick2:'x.....x...x.....',snare:'....x..g.g..x..g',hat:'xxxxxxxxxxxxxxxx',hatVol:.045,
  bass:[0,null,null,null,null,null,null,null,null,null,-2,null,null,null,null,null],bassInst:'saw',bassDur:.7,bassVol:.15,bassCut:380,
  riff:[null,null,12,null,null,null,15,null,null,null,null,null,10,null,null,null],riffInst:'square',riffDur:.08,riffVol:.04,
  lead:[24,null,null,22,null,null,19,null,null,null,17,null,19,null,null,null,24,null,null,22,null,null,27,null,null,null,26,null,24,null,null,null],leadInst:'saw',leadVol:.03,leadCut:2400,leadDur:.14,
  sec:['khb','kshbr','kshbl','kshbrl'],fx:'roll'},
 // 4 Храм — племенные барабаны, флейта, гонг
 {bpm:116,prog:[45,45,43,45],kick:'x.......x.......',snare:'..t..t....t.t..T',hat:'x.xxx.xxx.xxx.xx',hatVol:.04,snareVol:.28,
  bass:[0,null,null,null,null,null,null,null,-5,null,null,null,-2,null,null,null],bassInst:'triangle',bassDur:.4,bassVol:.15,bassCut:600,
  riff:[0,null,null,7,null,null,10,null,0,null,null,7,null,12,null,null],riffInst:'pluck',riffOct:12,riffVol:.05,riffDur:.12,riffCut:1800,
  lead:[12,null,15,17,19,null,17,15,12,null,10,null,12,null,null,null,19,null,22,null,24,null,22,19,17,null,15,null,12,null,null,null],leadInst:'flute',leadVol:.05,leadCut:2200,leadDur:.3,
  pad:[0,7],padWave:'sawtooth',padVol:.014,padCut:500,padBars:4,
  sec:['kshbp','kshbrp','kshblp','kshbrlp'],fx:'gong'},
 // 5 Крыши — синтвейв, ночной город
 {bpm:108,prog:[45,41,36,43],kick:'x...x...x...x...',snare:'....c.......c...',hat:'..x...x...x...x.',hatVol:.07,
  bass:[0,12,0,12,0,12,0,12,0,12,0,12,0,12,0,12],bassInst:'pluck',bassDur:.11,bassVol:.1,bassCut:1100,
  pad:[0,7,12],padWave:'sawtooth',padVol:.015,padCut:1200,padBars:1,
  arp:[0,7,12,19,12,7,0,7,12,19,24,19,12,7,12,19],arpInst:'square',arpOct:12,arpVol:.02,arpCut:2000,echo:1,
  lead:[19,null,null,null,null,null,17,null,15,null,null,null,12,null,null,null,15,null,null,null,17,null,19,null,22,null,null,null,19,null,null,null],leadInst:'saw',leadVol:.04,leadCut:2600,leadDur:.4,
  sec:['khbp','kshbpa','kshbpl','kshbpal']},
 // 6 Ледник — стеклянные колокольчики, метель
 {bpm:128,prog:[38,34,36,33],kick:'x.....x...x.....',snare:'....c.......c...',hat:'x.x.x.x.x.x.x.x.',hatVol:.04,snareVol:.24,
  bass:[0,null,null,null,0,null,null,null,0,null,null,null,7,null,5,null],bassInst:'triangle',bassDur:.3,bassVol:.15,bassCut:700,
  arp:[24,null,19,null,22,null,17,null,24,null,19,null,26,null,22,null],arpInst:'bell',arpOct:0,arpVol:.045,arpDur:.25,echo:1,
  pad:[0,7,12,15],padWave:'triangle',padVol:.018,padCut:1600,padBars:2,
  lead:[12,null,null,15,null,null,19,null,17,null,15,null,14,null,12,null,10,null,null,12,null,null,14,null,15,null,null,null,null,null,null,null],leadInst:'flute',leadVol:.035,leadCut:2600,leadDur:.3,
  sec:['khbap','kshbap','khbpl','kshbapl'],fx:'wind'},
 // 7 Реактор — индастриал, металл, сирена
 {bpm:128,prog:[40,40,40,41],kick:'x...x...x...x...',snare:'....m.......m...',hat:'xxxxxxxxxxxxxxxx',hatVol:.05,
  bass:[0,0,12,0,0,0,12,0,0,0,12,0,1,0,12,0],bassInst:'saw',bassDur:.1,bassVol:.1,bassCut:700,
  riff:[0,null,null,0,null,null,6,null,0,null,null,0,null,7,null,6],riffInst:'power',riffVol:.08,riffDur:.12,riffEvery:2,
  lead:[24,null,null,null,23,null,null,null,24,null,null,null,18,null,null,null,24,null,null,null,25,null,null,null,24,null,23,null,19,null,null,null],leadInst:'square',leadVol:.03,leadCut:2200,leadDur:.3,
  sec:['khb','kshbr','kshbl','kshbrl'],fx:'siren'},
 // 8 Корабль — штормовая шанти-метал в 12/8, волны
 {bpm:92,len:12,prog:[38,38,36,33],kick:'x.....x.....',kick2:'x..x..x..x..',snare:'...x.....x..',hat:'x.xx.xx.xx.x',hatVol:.065,snareVol:.38,
  bass:[0,null,null,7,null,null,0,null,null,5,null,7],bassInst:'saw',bassDur:.2,bassVol:.16,bassCut:500,
  riff:[12,null,19,15,null,19,12,null,19,15,null,19],riffInst:'square',riffOct:12,riffVol:.035,riffDur:.14,riffCut:1600,
  lead:[12,null,14,15,null,14,12,null,10,7,null,null,10,null,12,14,null,12,10,null,7,null,null,null],leadInst:'power',leadOct:0,leadVol:.12,leadDur:.3,
  sec:['kshbr','kshbrl','khbr','kshbrl'],fx:'waves'},
 // 9 Куб — глитч, целотонный лад, ломаный ритм
 {bpm:124,prog:[40,42,38,44],kick:'x..x..x...x..x..',snare:'....c..m....c.m.',hat:'x.xxx.x.xx.xx.x.',hatVol:.05,snareVol:.26,
  bass:[0,null,null,0,null,null,6,null,null,null,4,null,null,2,null,null],bassInst:'sine',bassDur:.2,bassVol:.18,bassCut:900,
  arp:[0,2,4,6,8,10,12,10,8,6,4,2,0,6,12,18],arpInst:'bell',arpOct:12,arpVol:.035,arpDur:.12,echo:1,
  pad:[0,6,10],padWave:'sine',padVol:.02,padCut:2000,padBars:2,
  lead:[12,null,null,18,null,null,16,null,14,null,null,null,10,null,null,null,12,null,null,14,null,null,16,null,18,null,20,null,22,null,null,null],leadInst:'square',leadVol:.03,leadCut:2400,leadDur:.16,
  sec:['kshba','kshbal','khbap','kshbal']}];
function scheduleStyleStep(S,step,t,sd){if(muted)return;const L=S.len||16,bar=Math.floor(step/L),i=step%L,sec=Math.floor(bar/16)%4,on=S.sec[sec],root=S.prog[Math.floor(bar/4)%S.prog.length];
  if(on.includes('k')&&(sec===2&&S.kick2?S.kick2:S.kick)[i]==='x')musicKick(t);
  if(on.includes('s')&&S.snare[i]!=='.')musicDrum(S.snare[i],t,S);
  if(on.includes('h')){const c=S.hat[i],hv=S.hatVol||.08;if(c==='x')musicNoise(t,.03,true,hv);else if(c==='o')musicNoise(t,.14,true,hv*1.1);}
  if(on.includes('b')&&S.bass){const n=S.bass[i];if(n!=null)musicInst(S.bassInst,musicMidi(root+(S.bassOct??-12)+n),t,S.bassDur||.14,S.bassVol||.09,S.bassCut||520);}
  if(on.includes('r')&&S.riff&&bar%(S.riffEvery||1)===0){const n=S.riff[i];if(n!=null)musicInst(S.riffInst,musicMidi(root+(S.riffOct??12)+n),t,S.riffDur||.18,S.riffVol||.06,S.riffCut||2600);}
  if(on.includes('a')&&S.arp){const n=S.arp[i];if(n!=null){const f=musicMidi(root+(S.arpOct??24)+n),d=S.arpDur||.12,c=S.arpCut||3000;musicInst(S.arpInst,f,t,d,S.arpVol||.03,c);if(S.echo)musicInst(S.arpInst,f,t+sd*3,d,(S.arpVol||.03)*.35,c);}}
  if(on.includes('l')&&S.lead){const n=S.lead[(bar%(S.lead.length/L))*L+i];if(n!=null)musicInst(S.leadInst,musicMidi(root+(S.leadOct??12)+n),t,S.leadDur||.12,S.leadVol||.04,S.leadCut||3000);}
  if(on.includes('p')&&S.pad&&i===0&&bar%(S.padBars||2)===0){const d=sd*L*(S.padBars||2)*.98;for(const iv of S.pad)musicTone(musicMidi(root+12+iv),t,d,S.padWave||'sawtooth',S.padVol||.015,S.padCut||900,Math.min(.4,d*.3));}
  if(S.fx)musicFx(S,bar,i,t,sd,root);}
function scheduleMusic(){if(!musicOn||!AC)return;const S=musicMode==='battle'?MUSIC_STYLES[musicStyle]:null,L=S&&S.len||16,horizon=AC.currentTime+.12,bpm=S?S.bpm:musicMode==='battle'?148:MUSIC_BPM,stepDur=60/bpm/(L===12?3:4);
  while(nextMusicTime<horizon){if(S)scheduleStyleStep(S,musicStep,nextMusicTime,stepDur);else if(musicMode==='battle')scheduleBattleStep(musicStep,nextMusicTime);else scheduleMusicStep(musicStep,nextMusicTime);musicStep=(musicStep+1)%(MUSIC_BARS*L);nextMusicTime+=stepDur;}}
function startMusic(mode='battle'){if(!AC)initAudio();if(!AC)return;const st=mode==='battle'?curMap:-1;if(musicOn&&musicMode===mode&&musicStyle===st)return;if(musicTimer)clearInterval(musicTimer);musicOn=true;musicMode=mode;musicStyle=st;musicStep=0;nextMusicTime=AC.currentTime+.08;if(AC.state==='suspended')AC.resume().catch(()=>{});if(musicBus){musicBus.gain.cancelScheduledValues(AC.currentTime);musicBus.gain.setValueAtTime(musicBus.gain.value,AC.currentTime);musicBus.gain.setTargetAtTime(0,AC.currentTime,.02);musicBus.gain.setTargetAtTime((muted||!SET.music)?0:MUSIC_VOL,AC.currentTime+.08,.035);}musicTimer=setInterval(scheduleMusic,25);}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}musicOn=false;}
function setMusicMuted(value){if(musicBus&&AC)musicBus.gain.setTargetAtTime((value||!SET.music)?0:MUSIC_VOL,AC.currentTime,.035);}
function speak(t,style='announcer'){try{if(muted||!window.speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.toLowerCase());u.lang='ru-RU';u.pitch=style==='brutal'?.16:.3;u.rate=style==='brutal'?.82:.85;u.volume=.95;speechSynthesis.speak(u);}catch(e){}}
const DEATH_LINES=['Чёрт. Меня сняли.','Не последний раз.','Хороший выстрел. Я вернусь.','Встретимся ещё.'];
const RESPAWN_LINES=['Я снова в бою.','Вернулся. Открывай огонь.','Теперь моя очередь.','Давай начнём заново.'];
function speakBattleLine(lines){speak(lines[(R()*lines.length)|0],'brutal');}

