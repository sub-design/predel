// Smoke test for ПРЕДЕЛ. Open the game with ?smoke in the URL (or call runSmoke() in the console).
// Runs in the page itself, no build or test framework: about half a minute on a laptop.
// Checks: nav audit, every mode on every map with bots, finite positions, end screen + stats, music themes.
window.runSmoke=async function(opts={}){
  const secs=opts.secs||20,maps=opts.maps||[0,1,2,3,4,5,6,7,8,9],modes=opts.modes||['ffa','team','insta','rocket','koth','lms','duel','ctf'];
  const fails=[],notes=[],t0=performance.now();const fail=(what,why)=>fails.push(`${what}: ${why}`);
  // Seeded randomness so a run is reproducible (R in the game is Math.random).
  const realRandom=Math.random;let sd=opts.seed||12345;Math.random=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const errs=[];const onErr=e=>errs.push(e.message||String(e));window.addEventListener('error',onErr);
  // 1. nav audit
  if(typeof navAudit!=='function')await new Promise((ok,bad)=>{const s=document.createElement('script');s.src='tools/nav-audit.js?'+Date.now();s.onload=ok;s.onerror=bad;document.body.append(s);});
  const nav=navAudit(maps);let edges=0;for(const [m,v] of Object.entries(nav)){edges+=v.edges;for(const f of v.fails)fail(`nav ${MAP_SHORT[m]} ${f.a}→${f.t}`,f.why);}
  notes.push(`nav: ${edges} edges`);
  // 2. every mode on every map
  const savedBots=botCount,savedMode=selectedMode,savedMap=selMap;let matches=0;
  for(const mode of modes)for(const m of maps){const tag=`${mode}/${MAP_SHORT[m]}`;
    try{selectedMode=mode;botCount=5;selMap=m;loadMap(m);startMatch();finishIntro();state='play';if(mode!=='duel'){player.alive=false;player.out=true;}// duel needs the player as the second fighter
      let events=0,moved=0;const f0=ents.reduce((a,e)=>a+e.frags+e.deaths,0),last=new Map(ents.map(e=>[e,e.pos.clone()]));
      const T=mode==='duel'?secs*6:mode==='koth'?secs*3:secs;// one bot needs longer to find the idle player; the hill needs walking to
      for(let i=0;i<30*T;i++){update(1/30);if(state!=='play')break;
        if(i%30===0)for(const e of ents){if(!isFinite(e.pos.x+e.pos.y+e.pos.z)){fail(tag,`${e.name} position is not finite`);i=1e9;break;}if(e.isBot&&e.alive){const l=last.get(e);if(l){const d=l.distanceTo(e.pos);if(d<30)moved+=d;l.copy(e.pos);}}}}
      events=ents.reduce((a,e)=>a+e.frags+e.deaths,0)-f0+teamScores[0]+teamScores[1];
      const shots=ents.reduce((a,e)=>a+(e.st?e.st.shots.reduce((x,y)=>x+y,0):0),0);
      // Activity, not outcome: a fight is random, but bots that neither walk nor shoot mean something is broken.
      const nb=ents.filter(e=>e.isBot).length;if(moved<nb*T*1)fail(tag,`bots barely moved (${moved.toFixed(0)}m in ${T}s, ${nb} bots)`);
      if(!events&&!shots&&mode!=='duel')fail(tag,'no shots and no frags in '+T+'s');
      if(mode==='koth'&&!ents.some(e=>e.frags>0))notes.push(`${tag}: nobody held the hill in ${T}s`);
      if(mode==='ctf'&&!CTF)fail(tag,'no flags');
      if(state==='play')endMatch();
      if(!$('endstats').innerHTML.includes('НАГРАДЫ')&&!$('endstats').innerHTML.includes('ВАШ МАТЧ'))fail(tag,'end screen has no stats');
      matches++;}catch(e){fail(tag,'exception: '+e.message);}
    player.out=false;state='menu';$('end').classList.add('hidden');}
  botCount=savedBots;selectedMode=savedMode;selMap=savedMap;notes.push(`matches: ${matches}`);
  // 3. music themes render without errors
  try{initAudio();const realAC=AC,realBus=musicBus;for(let m=0;m<MUSIC_STYLES.length;m++){const S=MUSIC_STYLES[m],L=S&&S.len||16,sd=60/(S?S.bpm:148)/(L===12?3:4);
      const oc=new OfflineAudioContext(1,Math.ceil(22050*(L*sd*2+.5)),22050);AC=oc;musicBus=oc.createGain();musicBus.connect(oc.destination);
      for(let k=0;k<L*2;k++){if(S)scheduleStyleStep(S,3*16*L+k,.02+k*sd,sd);else scheduleBattleStep(3*16*L+k,.02+k*sd);}
      AC=realAC;musicBus=realBus;// restore before awaiting: the live music timer must never see the offline context
      const d=(await oc.startRendering()).getChannelData(0);let pk=0;for(const x of d)pk=Math.max(pk,Math.abs(x));if(!(pk>.01))fail('music '+MAP_SHORT[m],'silent');}
    AC=realAC;musicBus=realBus;notes.push('music: '+MUSIC_STYLES.length+' themes');}catch(e){fail('music','exception: '+e.message);}
  Math.random=realRandom;window.removeEventListener('error',onErr);for(const e of errs)fail('page error',e);
  loadMap(selMap);toMenuWorld();showScreen('menu');
  const res={ok:!fails.length,fails,notes,seconds:+((performance.now()-t0)/1000).toFixed(1)};window.__smoke=res;return res;};
if(/[?&]smoke/.test(location.search))setTimeout(async()=>{const r=await runSmoke();console.log('SMOKE',JSON.stringify(r,null,1));
  const pre=document.createElement('pre');pre.style.cssText='position:fixed;inset:20px;z-index:99;overflow:auto;background:#000e;color:'+(r.ok?'#9f9':'#f96')+';font:12px monospace;padding:16px';
  pre.textContent=(r.ok?'SMOKE: PASS':'SMOKE: FAIL')+` (${r.seconds}s)\n`+r.notes.join('\n')+(r.fails.length?'\n\n'+r.fails.join('\n'):'');document.body.append(pre);},1500);
