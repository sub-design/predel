// ПРЕДЕЛ — Box collision and movement integration.
'use strict';
/* ---------- collision ---------- */
function hitBox(e){const up=entityUp(e),c=e.pos.clone().addScaledVector(up,e.h*.5),ex=[0,1,2].map(i=>e.r+(e.h*.5-e.r)*Math.abs(up.getComponent(i)));for(let i=0;i<solids.length;i++){const s=solids[i],mn=s.min,mx=s.max;if(c.x+ex[0]>mn[0]+1e-6&&c.x-ex[0]<mx[0]-1e-6&&c.y+ex[1]>mn[1]+1e-6&&c.y-ex[1]<mx[1]-1e-6&&c.z+ex[2]>mn[2]+1e-6&&c.z-ex[2]<mx[2]-1e-6)return s;}return null;}// epsilon: standing exactly on a top face is not an overlap
function pointSolid(x,y,z){for(const s of solids){if(x>s.min[0]&&x<s.max[0]&&y>s.min[1]&&y<s.max[1]&&z>s.min[2]&&z<s.max[2])return true;}return false;}
const AX=['x','y','z'];
function moveAxis(e,a,d,wasG){if(d===0)return;const k=AX[a],up=entityUp(e);e.pos[k]+=d;const b=hitBox(e);if(!b)return;
  if(Math.abs(up.getComponent(a))>.5){const u=up.getComponent(a);if(d*u<0){e.pos[k]=u>0?b.max[a]:b.min[a];e.grounded=true;}else e.pos[k]=u>0?b.min[a]-e.h-.001:b.max[a]+e.h+.001;e.vel[k]=0;return;}
  if(curMap!==9&&a!==1){const st=b.max[1]-e.pos.y;if(st>0&&st<=.62&&(wasG||e.grounded)){const oy=e.pos.y;e.pos.y=b.max[1]+.001;if(!hitBox(e))return;e.pos.y=oy;}}
  const to=d>0?b.min[a]-e.r-.001:b.max[a]+e.r+.001;
  // Never resolve to the far side of a box: if the push is longer than the step, just undo the step.
  e.pos[k]=Math.abs(to-(e.pos[k]-d))>Math.abs(d)+.01?e.pos[k]-d:to;e.vel[k]=0;}
function moveEntity(e,dt){if(e.ride)return;const up=entityUp(e),gravity=curMap===9?15:(curMap>=0?(MAPS[curMap].gravity||G):G),terminal=curMap===9?42:50;e.vel.addScaledVector(up,-gravity*dt);const downSpeed=e.vel.dot(up);if(downSpeed< -terminal)e.vel.addScaledVector(up,-terminal-downSpeed);const wasG=e.grounded;e.grounded=false;
  const mx=Math.max(Math.abs(e.vel.x),Math.abs(e.vel.y),Math.abs(e.vel.z))*dt,n=Math.max(1,Math.ceil(mx/.25)),s=dt/n;
  for(let i=0;i<n;i++){moveAxis(e,0,e.vel.x*s,wasG);moveAxis(e,2,e.vel.z*s,wasG);moveAxis(e,1,e.vel.y*s,wasG);}}
function rayBox(o,d,mn,mx,maxT){let t0=0,t1=maxT;for(let a=0;a<3;a++){if(Math.abs(d[a])<1e-8){if(o[a]<mn[a]||o[a]>mx[a])return -1;continue;}const inv=1/d[a];let ta=(mn[a]-o[a])*inv,tb=(mx[a]-o[a])*inv;if(ta>tb){const t=ta;ta=tb;tb=t;}if(ta>t0)t0=ta;if(tb<t1)t1=tb;if(t0>t1)return -1;}return t0;}
function rayLevel(o,d,maxT){let best=maxT;for(const s of solids){const t=rayBox(o,d,s.min,s.max,best);if(t>=0&&t<best)best=t;}return best;}
const _mn=[0,0,0],_mx=[0,0,0];
function rayEnts(o,d,maxT,ex,skip){let best=null,bt=maxT;for(const e of ents){if(!e.alive||e===ex||(skip&&skip.has(e))||sameTeam(ex,e))continue;const up=entityUp(e),c=e.pos.clone().addScaledVector(up,e.h*.5);for(let a=0;a<3;a++){const r=e.r+(e.h*.5-e.r)*Math.abs(up.getComponent(a));_mn[a]=c.getComponent(a)-r;_mx[a]=c.getComponent(a)+r;}const t=rayBox(o,d,_mn,_mx,bt);if(t>=0&&t<bt){bt=t;best=e;}}return best?{e:best,t:bt}:null;}

