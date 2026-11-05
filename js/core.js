// ПРЕДЕЛ — Constants, helpers, renderer and procedural textures.
'use strict';
const V3=THREE.Vector3,UP=new V3(0,1,0);
const G=26,JUMP=9.5,A=36,FRAG_LIMIT=20,MATCH_TIME=600;
function isTeam(){return gameMode==='team'||gameMode==='ctf';}
const TEAM_NAMES=['КРАСНЫЕ','СИНИЕ'],TEAM_COLORS=[0xe34e4e,0x508bff];
const POWERUPS={double:{field:'doubleT',duration:20,label:'ДВОЙНОЙ УРОН · 20 СЕК',color:0xff4030},invis:{field:'invisT',duration:15,label:'НЕВИДИМОСТЬ · 15 СЕК',color:0xb080ff},speed:{field:'speedT',duration:15,label:'УСКОРЕНИЕ · 15 СЕК',color:0x40e080},shield:{field:'shieldT',duration:12,label:'ЩИТ-ОТРАЖАТЕЛЬ · 12 СЕК',color:0x40cfff},jet:{field:'jetT',duration:10,label:'РЕАКТИВНЫЙ РАНЕЦ · 10 СЕК',color:0xffb040},regen:{field:'regenT',duration:15,label:'РЕГЕНЕРАЦИЯ · 15 СЕК',color:0xff70a0}};
let gameMode='ffa',selectedMode='ffa',teamScores=[0,0];
const sameTeam=(a,b)=>isTeam()&&a!==b&&a&&b&&a.team!=null&&a.team===b.team;
const teamColorFor=e=>isTeam()&&e.team!=null?TEAM_COLORS[e.team]:e.color;
let seed=1337;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const R=()=>Math.random(),clamp=(v,a,b)=>v<a?a:v>b?b:v,$=id=>document.getElementById(id);
const a3=v=>[v.x,v.y,v.z];
const hex=c=>'#'+c.toString(16).padStart(6,'0');
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}

/* ---------- renderer ---------- */
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.autoClear=false;
const retroTarget=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
const retroScene=new THREE.Scene(),retroCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);retroCamera.position.z=1;
const retroMaterial=new THREE.ShaderMaterial({uniforms:{tDiffuse:{value:retroTarget.texture},uRetro:{value:0},uTime:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}',fragmentShader:'uniform sampler2D tDiffuse;uniform float uRetro;uniform float uTime;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);if(uRetro>.5){float d=(mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y)*3.0,4.0)-1.5)/255.0;c.rgb=clamp(c.rgb+vec3(d),0.0,1.0);c.rgb=floor(c.rgb*vec3(31.0,63.0,31.0)+.5)/vec3(31.0,63.0,31.0);float scan=.94+.06*sin(gl_FragCoord.y*3.14159);float flicker=.985+.015*sin(uTime*71.0);c.rgb*=scan*flicker;}gl_FragColor=c;}' });
const retroQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),retroMaterial);retroScene.add(retroQuad);
const scene=new THREE.Scene();
const FOGC=0x241228;
scene.fog=new THREE.Fog(FOGC,30,150);
scene.background=new THREE.Color(FOGC);
const camera=new THREE.PerspectiveCamera(75,1,0.05,1000);camera.rotation.order='YXZ';
const vmScene=new THREE.Scene(),vmCam=new THREE.PerspectiveCamera(60,1,0.01,10);
vmScene.add(new THREE.AmbientLight(0x8080a0,0.9));{const d=new THREE.DirectionalLight(0xffe0c0,0.8);d.position.set(1,2,1);vmScene.add(d);}
const RES_H=[240,360,480];let resIdx=1;
function resize(){const w=innerWidth,h=innerHeight,ih=RES_H[resIdx],iw=Math.round(ih*w/h);renderer.setPixelRatio(1);renderer.setSize(iw,ih,false);retroTarget.setSize(iw,ih);camera.aspect=vmCam.aspect=w/h;camera.updateProjectionMatrix();vmCam.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

/* ---------- procedural textures ---------- */
const ALL_TEX=[];let smoothTex=false;
function applyFilter(t){if(smoothTex){t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;}else{t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;}t.needsUpdate=true;}
function makeTex(size,draw,w){const c=document.createElement('canvas');c.width=w||size;c.height=size;const g=c.getContext('2d');draw(g,c.width,c.height);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;applyFilter(t);ALL_TEX.push(t);return t;}
function noise(g,w,h,amt){const d=g.getImageData(0,0,w,h),a=d.data;for(let i=0;i<a.length;i+=4){const n=(rnd()-.5)*amt;a[i]+=n;a[i+1]+=n;a[i+2]+=n;}g.putImageData(d,0,0);}
const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};

const texFloor=makeTex(64,g=>{rect(g,'#45484f',0,0,64,64);
  for(let ty=0;ty<2;ty++)for(let tx=0;tx<2;tx++){const x=tx*32,y=ty*32;
    rect(g,'#5d616b',x,y,32,1);rect(g,'#5d616b',x,y,1,32);rect(g,'#24262b',x,y+31,32,1);rect(g,'#24262b',x+31,y,1,32);
    for(const [rx,ry] of [[3,3],[27,3],[3,27],[27,27]]){rect(g,'#8a8f9a',x+rx,y+ry,2,2);rect(g,'#1c1d21',x+rx+1,y+ry+2,2,1);}
    for(let i=0;i<5;i++)for(let j=0;j<5;j++){const px=x+7+i*4,py=y+7+j*4;if((i+j)%2)rect(g,'#575b64',px,py,3,1);else rect(g,'#575b64',px+1,py-1,1,3);}}
  noise(g,64,64,16);});
const texWall=makeTex(64,g=>{rect(g,'#221c18',0,0,64,64);
  for(let row=0;row<8;row++){const off=(row%2)*8;for(let col=-1;col<4;col++){const x=col*16+off,y=row*8,l=28+rnd()*12,hu=25+rnd()*10;
    g.fillStyle=`hsl(${hu},18%,${l}%)`;g.fillRect(x+1,y+1,15,7);g.fillStyle=`hsl(${hu},18%,${l+8}%)`;g.fillRect(x+1,y+1,15,1);g.fillStyle=`hsl(${hu},18%,${l-10}%)`;g.fillRect(x+1,y+7,15,1);}}
  noise(g,64,64,20);});
const texStone=makeTex(64,g=>{rect(g,'#1a1210',0,0,64,64);
  for(let row=0;row<4;row++){const off=(row%2)*16;for(let col=-1;col<2;col++){const x=col*32+off,y=row*16,l=24+rnd()*10;
    g.fillStyle=`hsl(8,30%,${l}%)`;g.fillRect(x+1,y+1,31,15);g.fillStyle=`hsl(8,30%,${l+9}%)`;g.fillRect(x+1,y+1,31,2);g.fillStyle=`hsl(8,30%,${l-9}%)`;g.fillRect(x+1,y+14,31,2);
    for(let k=0;k<3;k++){let cx=x+4+rnd()*24,cy=y+3+rnd()*8;g.fillStyle=`hsl(8,30%,${l-12}%)`;for(let s=0;s<5;s++){g.fillRect(cx|0,cy|0,1,1);cx+=rnd()*2-1;cy+=1;}}}}
  noise(g,64,64,22);});
const texGrate=makeTex(32,g=>{rect(g,'#16171a',0,0,32,32);for(let i=0;i<32;i+=4){rect(g,'#6b6455',i,0,2,32);rect(g,'#857d6a',i,0,1,32);}for(let j=0;j<32;j+=8)rect(g,'#5a5446',0,j,32,1);noise(g,32,32,14);});
const texTrim=makeTex(32,g=>{rect(g,'#5b5a60',0,0,32,32);for(let j=0;j<32;j+=8){rect(g,'#7a7980',0,j,32,1);rect(g,'#2e2d31',0,j+6,32,2);}for(let i=0;i<32;i+=16)rect(g,'#3d3c41',i,0,1,32);noise(g,32,32,14);});
const texHaz=makeTex(32,g=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++)rect(g,((x+y)>>3)%2?'#c9a227':'#1b1b1b',x,y,1,1);noise(g,32,32,20);});
const texPillar=makeTex(32,g=>{rect(g,'#3a3f4c',0,0,32,32);for(let i=0;i<32;i+=8){rect(g,'#525868',i,0,2,32);rect(g,'#23262e',i+6,0,2,32);}rect(g,'#2c90ff',14,0,4,32);rect(g,'#9fd4ff',15,0,2,32);for(let j=0;j<32;j+=16)rect(g,'#1a1d24',0,j,32,2);noise(g,32,32,12);});
const texCrate=makeTex(32,g=>{rect(g,'#4c5640',0,0,32,32);rect(g,'#2b3124',0,0,32,2);rect(g,'#2b3124',0,30,32,2);rect(g,'#2b3124',0,0,2,32);rect(g,'#2b3124',30,0,2,32);
  for(let i=3;i<29;i++){rect(g,'#3a4231',i,i,2,2);rect(g,'#3a4231',31-i-1,i,2,2);}rect(g,'#c9a227',12,13,8,6);rect(g,'#1b1b1b',13,15,6,2);noise(g,32,32,16);});
const texPad=makeTex(64,g=>{rect(g,'#081018',0,0,64,64);for(let r=30;r>2;r-=6){g.strokeStyle=(r/6|0)%2?'#1fd0ff':'#0a5a80';g.lineWidth=3;g.beginPath();g.arc(32,32,r,0,7);g.stroke();}rect(g,'#bff4ff',29,29,6,6);});
const texArmor=makeTex(16,g=>{rect(g,'#b0b0b0',0,0,16,16);rect(g,'#e0e0e0',0,0,16,1);rect(g,'#606060',0,15,16,1);rect(g,'#808080',7,0,1,16);rect(g,'#909090',2,4,4,3);rect(g,'#909090',10,9,4,3);noise(g,16,16,30);});
const texGun=makeTex(16,g=>{rect(g,'#6a6d75',0,0,16,16);rect(g,'#8a8e98',0,0,16,2);rect(g,'#3a3c42',0,12,16,4);rect(g,'#4a4c52',5,4,6,6);noise(g,16,16,24);});
const texMed=makeTex(16,g=>{rect(g,'#e8e8e8',0,0,16,16);rect(g,'#c02020',6,2,4,12);rect(g,'#c02020',2,6,12,4);rect(g,'#999',0,15,16,1);noise(g,16,16,10);});
const texFlame=makeTex(32,g=>{const gr=g.createRadialGradient(8,24,1,8,20,14);gr.addColorStop(0,'rgba(255,255,200,1)');gr.addColorStop(.3,'rgba(255,180,40,.95)');gr.addColorStop(.7,'rgba(220,60,10,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.moveTo(8,0);g.quadraticCurveTo(16,18,14,26);g.quadraticCurveTo(8,33,2,26);g.quadraticCurveTo(0,18,8,0);g.fill();},16);
const texFlash=makeTex(32,g=>{const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);g.fillStyle='rgba(255,255,255,.9)';g.fillRect(15,2,2,28);g.fillRect(2,15,28,2);});
const texRust=makeTex(64,g=>{rect(g,'#2a1c16',0,0,64,64);for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=32){const l=20+rnd()*8;rect(g,`hsl(18,35%,${l}%)`,x+1,y+1,30,14);rect(g,`hsl(18,35%,${l+8}%)`,x+1,y+1,30,1);rect(g,`hsl(18,35%,${l-8}%)`,x+1,y+14,30,1);for(const rx of [3,27])rect(g,'#8a7060',x+rx,y+7,2,2);}
  for(let i=0;i<70;i++)rect(g,`hsl(${18+rnd()*15},60%,${22+rnd()*15}%)`,rnd()*64|0,rnd()*64|0,1+rnd()*3|0,1+rnd()*4|0);noise(g,64,64,18);});
const texLava=makeTex(64,g=>{rect(g,'#a01800',0,0,64,64);for(let i=0;i<90;i++){const x=4+rnd()*56,y=4+rnd()*56,r=2+rnd()*4;g.fillStyle=rnd()<.5?'#ff6a00':'#ffb020';g.beginPath();g.arc(x,y,r,0,7);g.fill();}for(let i=0;i<40;i++)rect(g,'#4a0800',rnd()*64|0,rnd()*64|0,3,2);noise(g,64,64,25);});
const texSky=makeTex(256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#020108');gr.addColorStop(.3,'#120728');gr.addColorStop(.44,'#3a1440');gr.addColorStop(.5,'#8a3040');gr.addColorStop(.52,'#241228');gr.addColorStop(1,'#0a0510');g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<500;i++){const x=rnd()*w|0,y=rnd()*h*.45|0,b=140+rnd()*115|0;rect(g,`rgb(${b},${b},${Math.min(255,b+30)})`,x,y,1,1);}
  const px=w*.3,py=h*.27,pr=22;const pg=g.createRadialGradient(px-8,py-8,2,px,py,pr);pg.addColorStop(0,'#ffd0a0');pg.addColorStop(.6,'#c06040');pg.addColorStop(1,'#401020');g.fillStyle=pg;g.beginPath();g.arc(px,py,pr,0,7);g.fill();
  g.strokeStyle='#e0a070';g.lineWidth=2;g.beginPath();g.ellipse(px,py,pr*1.9,pr*.32,-.3,0,7);g.stroke();
  g.fillStyle='#120814';g.beginPath();g.moveTo(0,h*.5);for(let x=0;x<=w;x+=2){const T=x/w*Math.PI*2;g.lineTo(x,h*.5-(9+6*Math.sin(T*3)+4*Math.sin(T*7+1)+3*Math.sin(T*13+2)));}g.lineTo(w,h*.5+2);g.lineTo(0,h*.5+2);g.fill();
},512);

