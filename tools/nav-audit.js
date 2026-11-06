// Bot navigation audit. Open the game with ?navaudit in the URL, or paste into the console.
// For every directed edge of every map's nav graph, a lone bot starts at node A with path [B]
// and must reach B (same arrival rule as the bot code) within a time budget without dying.
window.navAudit=function(maps=MAPS.map((_,i)=>i),opts={}){
  const dt=1/30,res={};const b=bots[0];const savedMode=gameMode,savedTrait=b.trait;const savedTemple=window.updateTempleFeatures;window.updateTempleFeatures=()=>{};// bridges collapse by design; test the geometry
  for(const m of maps){
    loadMap(m);gameMode='ffa';state='play';matchTime=1e9;player.alive=false;player.out=true;
    for(const x of bots){x.alive=false;x.mesh.group.visible=false;}ents=[b];
    const fails=[];let edges=0;
    for(let a=0;a<NODES.length;a++)for(const t of ADJ[a]){edges++;
      for(let i=0;i<BRIDGES.length;i++)if(BRIDGES[i].broken)setBridgeState(i,false);if(typeof SHIP!=='undefined'){SHIP.timer=1e9;SHIP.waveT=0;}if(typeof REACTOR!=='undefined')REACTOR.timer=1e9;
      spawnEntity(b);b.pos.copy(NODES[a]);if(curMap===9){b.up.copy(cubeUpAt(b.pos));cubeFrame(b,true);}
      b.pos.addScaledVector(entityUp(b),.05);b.vel.set(0,0,0);b.health=1e6;b.padCD=0;b.padAir=false;b.stuckT=0;b.stuckPos.copy(b.pos);b.jetT=0;b.speedT=0;b.target=null;b.trait=null;
      const isPad=PADS.some(p=>onPad({pos:NODES[t]},p));let path=[t];b.path=path;const T=NODES[a].distanceTo(NODES[t])/6+4;let ok=false,why='timeout',minD=1e9;
      for(let s=0;s<T/dt;s++){
        if(b.path!==path||!b.path.length){if(b.path===path&&!b.path.length){ok=true;break;}path=[t];b.path=path;}
        b.target=null;update(dt);if(isPad&&b.padCD>.3){ok=true;break;}
        if(!b.alive){why='died';break;}
        const d=NODES[t].clone().sub(b.pos),hd=curMap===9?d.length():Math.hypot(d.x,d.z);minD=Math.min(minD,hd);
        if(curMap===9?hd<1.5:(hd<1.2&&Math.abs(d.y)<2.5)){ok=true;break;}}
      if(!ok)fails.push({a,t,why,minD:+minD.toFixed(1),at:b.pos.toArray().map(v=>+v.toFixed(1))});}
    res[m]={edges,fails};}
  window.updateTempleFeatures=savedTemple;b.trait=savedTrait;player.out=false;gameMode=savedMode;state='menu';ents=[...bots];
  return res;};
if(/[?&]navaudit/.test(location.search))setTimeout(()=>{const r=navAudit();console.log('NAV AUDIT',JSON.stringify(r,null,1));
  const lines=Object.entries(r).map(([m,v])=>`${MAPS[m].name}: ${v.edges-v.fails.length}/${v.edges}`+v.fails.map(f=>`\n   ${f.a}→${f.t} ${f.why} min ${f.minD} at ${f.at}`).join(''));
  const pre=document.createElement('pre');pre.style.cssText='position:fixed;inset:20px;z-index:99;overflow:auto;background:#000e;color:#9f9;font:12px monospace;padding:16px';pre.textContent=lines.join('\n');document.body.append(pre);},1500);
