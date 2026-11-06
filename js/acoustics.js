// ПРЕДЕЛ — Acoustics in the spirit of A3D / EAX: HRTF 3D panning and per-zone reverb.
'use strict';
/* ---------- environments ----------
   The listener's surroundings pick a reverb preset, like EAX environments did. Impulse responses
   are generated in code: decaying stereo noise that gets darker as it fades, plus optional early
   reflections and a metallic ring. t = tail seconds, decay = envelope curve, damp = how quickly
   highs die (0 bright … 1 dull), wet = send level, pre = pre-delay, taps = early echoes in seconds. */
const ENVS={
  dry:{t:.1,decay:4,damp:.5,wet:0,pre:0},
  open:{t:.7,decay:4,damp:.6,wet:.07,pre:.03},
  space:{t:.35,decay:5,damp:.7,wet:.03,pre:.02},
  snow:{t:.45,decay:5,damp:.92,wet:.05,pre:.02},
  courtyard:{t:1.7,decay:3,damp:.35,wet:.17,pre:.025,taps:[.06,.11,.17]},
  ruins:{t:1.3,decay:3,damp:.4,wet:.14,pre:.03,taps:[.09,.21]},
  city:{t:1.1,decay:3.2,damp:.45,wet:.1,pre:.05,taps:[.16,.33,.5]},// slap-back between towers
  hall:{t:2.3,decay:2.6,damp:.22,wet:.22,pre:.02,taps:[.04,.09],ring:[180,310],ringAmt:.08},
  metal:{t:2,decay:2.4,damp:.12,wet:.26,pre:.012,taps:[.025,.05,.075],ring:[340,520,780],ringAmt:.16},
  chamber:{t:1.2,decay:2.8,damp:.18,wet:.24,pre:.01,taps:[.018,.036],ring:[420,610],ringAmt:.12},
  temple:{t:2.9,decay:2.4,damp:.45,wet:.28,pre:.035,taps:[.07,.15]},
  cave:{t:3.6,decay:2.2,damp:.5,wet:.34,pre:.04,taps:[.05,.13,.24]},
  small:{t:.45,decay:3,damp:.3,wet:.24,pre:.006,taps:[.012,.024]},
  duct:{t:.75,decay:2.6,damp:.15,wet:.3,pre:.004,taps:[.008,.016,.024],ring:[620,930],ringAmt:.2},
  hold:{t:1.4,decay:2.6,damp:.25,wet:.27,pre:.012,taps:[.02,.045],ring:[140,260],ringAmt:.12},
  water:{t:1.6,decay:2,damp:.9,wet:.4,pre:.02}};
// Map-wide preset, then boxes that override it: [env, x0,y0,z0, x1,y1,z1].
const MAP_ACOUSTICS=[
  {env:'courtyard'},
  {env:'hall'},
  {env:'space'},
  {env:'open',zones:[['small',-30,0,-8.2,-17,4.8,8.2],['small',17,0,-8.2,30,4.8,8.2]]},
  {env:'ruins',zones:[['cave',-4,0,-15,4,4.8,-8.3]]},
  {env:'city',zones:[['small',12,-.5,-18,32,8,4]]},
  {env:'snow',zones:[['cave',-33,0,-7,-15,6,7]]},
  {env:'hall',zones:[['metal',-9,0,-9,9,7,9],['duct',-25,0,-3.5,-10,2.6,3.5],['duct',10,0,-3.5,25,2.6,3.5],['duct',-3.5,0,-25,3.5,2.6,-10],['duct',-3.5,0,10,3.5,2.6,25]]},
  {env:'open',zones:[['hold',-28,-4,-17,28,3,17]]},
  {env:'chamber'},
  {env:'open',zones:[['small',-42,0,-16,-24,6,4]]}];
let revIn=null,revA=null,revB=null,revGA=null,revGB=null,revActiveA=true,curEnv='',envCheckT=0;const IR_CACHE={};
function makeIR(p){const sr=AC.sampleRate,pre=Math.floor(p.pre*sr),len=Math.max(pre+64,Math.floor(sr*(p.t+p.pre))),buf=AC.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);let lp=0;
    for(let i=pre;i<len;i++){const k=(i-pre)/(len-pre),env=Math.pow(1-k,p.decay),a=Math.min(.985,p.damp*.55+k*(.3+p.damp*.4));
      lp=lp*a+(Math.random()*2-1)*(1-a);let s=lp*env*(1.6-a);
      if(p.ring)for(const f of p.ring)s+=Math.sin(2*Math.PI*f*(i/sr)+ch)*env*env*p.ringAmt*.3;
      d[i]=s;}
    if(p.taps)p.taps.forEach((t,j)=>{const i=pre+Math.floor((t+(ch?.004*(j+1):0))*sr);if(i<len)d[i]+=(ch?-.6:.6)*Math.pow(.7,j);});}
  return buf;}
function envIR(name){return IR_CACHE[name]||(IR_CACHE[name]=makeIR(ENVS[name]));}
// Called from initAudio: sfxFilter keeps its dry path to master and gains a send into two crossfading convolvers.
function initAcoustics(){try{revIn=AC.createBiquadFilter();revIn.type='highpass';revIn.frequency.value=170;sfxFilter.connect(revIn);
  revA=AC.createConvolver();revB=AC.createConvolver();revGA=AC.createGain();revGB=AC.createGain();revGA.gain.value=revGB.gain.value=0;
  revIn.connect(revA);revIn.connect(revB);revA.connect(revGA);revB.connect(revGB);revGA.connect(master);revGB.connect(master);}catch(e){revIn=null;}}
function setEnv(name){if(!revIn||name===curEnv)return;curEnv=name;const p=ENVS[name],t=AC.currentTime,fade=.4;
  const [cn,gn,go]=revActiveA?[revB,revGB,revGA]:[revA,revGA,revGB];revActiveA=!revActiveA;
  if(p.wet>0)try{cn.buffer=envIR(name);}catch(e){}
  go.gain.cancelScheduledValues(t);go.gain.setTargetAtTime(0,t,fade/3);gn.gain.cancelScheduledValues(t);gn.gain.setValueAtTime(gn.gain.value,t);gn.gain.setTargetAtTime(p.wet,t,fade/3);}
function envAt(p){if(SET.reverb===false)return'dry';if(waterViewOn)return'water';if(curMap<0||state==='menu')return'open';const A=MAP_ACOUSTICS[curMap];if(!A)return'open';
  if(A.zones)for(const [e,x0,y0,z0,x1,y1,z1] of A.zones)if(p.x>x0&&p.x<x1&&p.y>y0-.5&&p.y<y1+.5&&p.z>z0&&p.z<z1)return e;return A.env;}
/* ---------- 3D: an HRTF panner per positional sound, the listener rides the camera ---------- */
const _lf=new V3(),_lu=new V3();
function spatialPanner(pos){const p=AC.createPanner();p.panningModel='HRTF';p.distanceModel='linear';p.refDistance=1;p.maxDistance=1e4;p.rolloffFactor=0;// loudness stays our own falloff
  if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z;}else p.setPosition(pos.x,pos.y,pos.z);return p;}
function updateAcoustics(dt){if(!AC)return;const L=AC.listener,c=camera.position;camera.getWorldDirection(_lf);_lu.set(0,1,0).applyQuaternion(camera.quaternion);
  if(L.positionX){const t=AC.currentTime;L.positionX.setValueAtTime(c.x,t);L.positionY.setValueAtTime(c.y,t);L.positionZ.setValueAtTime(c.z,t);L.forwardX.setValueAtTime(_lf.x,t);L.forwardY.setValueAtTime(_lf.y,t);L.forwardZ.setValueAtTime(_lf.z,t);L.upX.setValueAtTime(_lu.x,t);L.upY.setValueAtTime(_lu.y,t);L.upZ.setValueAtTime(_lu.z,t);}
  else{L.setPosition(c.x,c.y,c.z);L.setOrientation(_lf.x,_lf.y,_lf.z,_lu.x,_lu.y,_lu.z);}
  envCheckT-=dt;if(envCheckT<=0){envCheckT=.2;setEnv(envAt(c));}}
