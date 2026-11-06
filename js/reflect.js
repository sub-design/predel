// ПРЕДЕЛ — Reflections in the late-90s spirit: mirror floors, rain puddles and chrome env-mapping.
'use strict';
/* ---------- mirror floors and puddles ----------
   Every horizontal mirror height is one "level": the scene is rendered once from a camera mirrored
   below that plane into a small pixelated target, and every polished patch or puddle at that height
   draws the target projectively on top of the ordinary floor texture. */
const MIRRORS=[];let mirrorRR=0;
const _mvCam=new THREE.PerspectiveCamera(),_mN=new V3(0,1,0),_mP=new V3(),_mView=new V3(),_mLook=new V3(),_mTgt=new V3(),_mRot=new THREE.Matrix4(),_mPlane=new THREE.Plane(),_mClip=new THREE.Vector4(),_mQ=new THREE.Vector4(),_mBox=new THREE.Box3(),_mFr=new THREE.Frustum(),_mPV=new THREE.Matrix4();
const MIRROR_VS=`uniform mat4 texMat;varying vec4 vUv;varying vec3 vW;varying vec2 vL;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vL=uv;vUv=texMat*w;gl_Position=projectionMatrix*viewMatrix*w;}`;
const MIRROR_FS=`uniform sampler2D tex;uniform vec3 tint;uniform float strength,time,ripple,puddle;varying vec4 vUv;varying vec3 vW;varying vec2 vL;
void main(){vec4 p=vUv;
  if(ripple>0.){float r=sin(vW.x*7.+time*5.)*cos(vW.z*6.-time*4.3)+sin((vW.x+vW.z)*13.+time*9.)*.5;p.xy+=r*ripple*p.w;}
  vec3 c=texture2DProj(tex,p).rgb*tint;float a=strength;
  if(puddle>0.){float d=length(vL-.5)*2.;c=c*1.35+vec3(.035,.045,.06);a*=1.-smoothstep(.6,1.,d);}
  gl_FragColor=vec4(c,a);}`;
function mirrorLevel(y,ripple=0){let L=MIRRORS.find(m=>Math.abs(m.y-y)<.01&&m.ripple===ripple);if(L)return L;
  const rt=new THREE.WebGLRenderTarget(64,64,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,format:THREE.RGBFormat});
  L={y,ripple,rt,texMat:new THREE.Matrix4(),meshes:[],box:new THREE.Box3(),fresh:false};
  L.makeMat=(tint,strength,puddle)=>new THREE.ShaderMaterial({uniforms:{tex:{value:rt.texture},texMat:{value:L.texMat},tint:{value:new THREE.Color(tint)},strength:{value:strength},time:{value:0},ripple:{value:ripple},puddle:{value:puddle?1:0}},
    vertexShader:MIRROR_VS,fragmentShader:MIRROR_FS,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4});
  MIRRORS.push(L);return L;}
function addMirrorMesh(L,mesh){mesh.renderOrder=1;LV.add(mesh);L.meshes.push(mesh);mesh.updateMatrixWorld();_mBox.setFromObject(mesh);L.box.union(_mBox);}
// A polished rectangle of floor at height y, e.g. a marble hall or a reactor floor.
function mirrorFloor(x0,z0,x1,z1,y,tint=0xffffff,strength=.42){const L=mirrorLevel(y),m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),L.makeMat(tint,strength,false));
  m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,y+.01,(z0+z1)/2);addMirrorMesh(L,m);}
// A soft-edged puddle; rain makes its reflection ripple.
function puddle(x,z,y,rx,rz=rx*.7,rain=true){const L=mirrorLevel(y,rain?.012:0),m=new THREE.Mesh(new THREE.PlaneGeometry(rx*2,rz*2),L.makeMat(0xc8d8e8,.82,true));
  m.rotation.x=-Math.PI/2;m.rotation.z=R()*Math.PI;m.position.set(x,y+.015,z);addMirrorMesh(L,m);}
function resetMirrors(){for(const L of MIRRORS){L.rt.dispose();for(const m of L.meshes)m.material.dispose();}MIRRORS.length=0;mirrorRR=0;}
function renderMirror(L){const rt=L.rt,w=Math.max(32,Math.round(renderer.domElement.width*.5)),h=Math.max(32,Math.round(renderer.domElement.height*.5));if(rt.width!==w||rt.height!==h)rt.setSize(w,h);
  _mP.set(camera.position.x,L.y,camera.position.z);camera.updateMatrixWorld();
  _mView.setFromMatrixPosition(camera.matrixWorld);if(_mView.y<=L.y+.02)return false;// camera under the mirror: nothing to see
  _mView.y=2*L.y-_mView.y;
  _mRot.extractRotation(camera.matrixWorld);_mLook.set(0,0,-1).applyMatrix4(_mRot).add(camera.position);_mTgt.copy(_mLook);_mTgt.y=2*L.y-_mTgt.y;
  _mvCam.position.copy(_mView);_mvCam.up.set(0,1,0).applyMatrix4(_mRot);_mvCam.up.y=-_mvCam.up.y;_mvCam.lookAt(_mTgt);_mvCam.far=camera.far;_mvCam.updateMatrixWorld();_mvCam.projectionMatrix.copy(camera.projectionMatrix);
  L.texMat.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1).multiply(_mvCam.projectionMatrix).multiply(_mvCam.matrixWorldInverse);
  // Oblique near plane: clip everything below the mirror so floors under it don't leak into the reflection.
  _mPlane.setFromNormalAndCoplanarPoint(_mN,_mP).applyMatrix4(_mvCam.matrixWorldInverse);_mClip.set(_mPlane.normal.x,_mPlane.normal.y,_mPlane.normal.z,_mPlane.constant);
  const pm=_mvCam.projectionMatrix,e=pm.elements;_mQ.set((Math.sign(_mClip.x)+e[8])/e[0],(Math.sign(_mClip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);_mClip.multiplyScalar(2/_mClip.dot(_mQ));
  e[2]=_mClip.x;e[6]=_mClip.y;e[10]=_mClip.z+1-.003;e[14]=_mClip.w;
  const vis=[];for(const M of MIRRORS)for(const m of M.meshes){vis.push(m.visible);m.visible=false;}
  const pv=pMesh.visible;renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,_mvCam);
  let k=0;for(const M of MIRRORS)for(const m of M.meshes)m.visible=vis[k++];pMesh.visible=pv;return true;}
function updateMirrors(){if(!MIRRORS.length)return;const on=SET.refl!==false;
  for(const L of MIRRORS)for(const m of L.meshes){m.visible=on;m.material.uniforms.time.value=time;}if(!on)return;
  camera.updateMatrixWorld();_mPV.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_mFr.setFromProjectionMatrix(_mPV);
  // The nearest visible level is redrawn every frame, one other in turn, so several mirrors stay cheap.
  const vis=MIRRORS.filter(L=>camera.position.y>L.y&&_mFr.intersectsBox(L.box));if(!vis.length)return;
  vis.sort((a,b)=>a.box.distanceToPoint(camera.position)-b.box.distanceToPoint(camera.position));
  const old=renderer.getRenderTarget();renderMirror(vis[0]);
  if(vis.length>1){mirrorRR=(mirrorRR+1)%(vis.length-1);renderMirror(vis[1+mirrorRR]);}
  renderer.setRenderTarget(old);}

/* ---------- chrome: a tiny pixelated sky-and-floor panorama used as an env-map ---------- */
const chromeCanvas=document.createElement('canvas');chromeCanvas.width=64;chromeCanvas.height=32;
const vmChromeCanvas=document.createElement('canvas');vmChromeCanvas.width=64;vmChromeCanvas.height=32;
const texChrome=new THREE.CanvasTexture(chromeCanvas),texVmChrome=new THREE.CanvasTexture(vmChromeCanvas);
for(const t of [texChrome,texVmChrome]){t.mapping=THREE.EquirectangularReflectionMapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;}
function paintChrome(sky,fog){const g=chromeCanvas.getContext('2d'),c=new THREE.Color(sky),f=new THREE.Color(fog),hex=x=>'#'+x.getHexString();
  const top=c.clone().lerp(new THREE.Color(0x203060),.45),hor=c.clone().lerp(new THREE.Color(0xffffff),.65),gnd=f.clone().multiplyScalar(.55);
  const grd=g.createLinearGradient(0,0,0,32);grd.addColorStop(0,hex(top));grd.addColorStop(.47,hex(hor));grd.addColorStop(.5,'#ffffff');grd.addColorStop(.53,hex(gnd.clone().lerp(hor,.4)));grd.addColorStop(1,hex(gnd));
  g.fillStyle=grd;g.fillRect(0,0,64,32);
  // Bright "windows" and a sun streak give the moving highlight that sells the chrome.
  g.fillStyle='rgba(255,255,255,.85)';for(const x of [5,21,37,53])g.fillRect(x,9,3,5);g.fillStyle='rgba(255,250,220,.95)';g.fillRect(28,4,8,3);
  g.fillStyle='rgba(0,0,0,.35)';for(let x=0;x<64;x+=8)g.fillRect(x,20,1,12);
  texChrome.needsUpdate=true;vmChromeShift=-1;}
// The weapon lives in its own little scene, so its panorama is scrolled by hand as the player turns.
let vmChromeShift=-1;
function updateVmChrome(){const s=((Math.round(-player.yaw/(Math.PI*2)*64)%64)+64)%64;if(s===vmChromeShift)return;vmChromeShift=s;
  const g=vmChromeCanvas.getContext('2d');g.drawImage(chromeCanvas,s,0);g.drawImage(chromeCanvas,s-64,0);texVmChrome.needsUpdate=true;}
// Turn every lit material under obj into polished metal.
function chrome(obj,reflectivity=.35,tex=texChrome){obj.traverse(o=>{const m=o.material;if(!m||!(m.isMeshLambertMaterial||m.isMeshPhongMaterial))return;
  if(m.userData.chromed)return;m.envMap=tex;m.combine=THREE.MixOperation;m.reflectivity=reflectivity;m.userData.chromed=true;m.needsUpdate=true;});}
paintChrome(0xffffff,0x241228);
