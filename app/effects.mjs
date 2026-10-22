// Procedural reaction artwork. No emoji glyphs, image downloads, or per-frame assets.
const W=960,H=540,TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
const fade=(age,life)=>clamp(age/.22)*clamp((life-age)/.75);
const palettes=['#ff5c78','#ffc65a','#61d9d4','#aa8bfa','#73baff','#f6a6d2'];
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function sprite(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);return c;}
function heartPath(c){c.beginPath();c.moveTo(0,.43);c.bezierCurveTo(-.12,.29,-.49,.08,-.49,-.17);c.bezierCurveTo(-.49,-.48,-.15,-.53,0,-.29);c.bezierCurveTo(.18,-.54,.49,-.46,.49,-.17);c.bezierCurveTo(.49,.08,.12,.3,0,.43);c.closePath();}
function makeHeart(){return sprite(256,(c,s)=>{
  c.translate(s/2,s/2);c.scale(190,190);
  heartPath(c);c.shadowColor='#ff244b99';c.shadowBlur=17;c.fillStyle='#ed173b';c.fill();c.shadowBlur=0;
  const g=c.createLinearGradient(-.3,-.4,.32,.4);g.addColorStop(0,'#ff7077');g.addColorStop(.27,'#ff3445');g.addColorStop(.65,'#ed1435');g.addColorStop(1,'#b9052e');
  c.fillStyle=g;c.fill();c.save();c.clip();
  const shine=c.createRadialGradient(-.23,-.29,.005,-.17,-.23,.34);shine.addColorStop(0,'#ffd1c985');shine.addColorStop(.35,'#ffad9f30');shine.addColorStop(1,'#ffaaaa00');c.fillStyle=shine;c.fillRect(-.55,-.55,1.1,1.1);
  c.strokeStyle='#ffb6ae85';c.lineWidth=.012;c.beginPath();c.moveTo(-.41,-.15);c.bezierCurveTo(-.42,-.32,-.34,-.43,-.24,-.39);c.stroke();
  c.restore();
});}
function makeBalloon(color){return sprite(160,(c,s)=>{
  c.translate(s/2,s*.43);
  const g=c.createRadialGradient(-18,-24,2,0,0,58);g.addColorStop(0,'#fff0ed');g.addColorStop(.17,color);g.addColorStop(.7,color);g.addColorStop(1,'#3b173f');
  c.fillStyle=g;c.beginPath();c.ellipse(0,0,43,54,0,0,TAU);c.fill();
  c.fillStyle=color;c.beginPath();c.moveTo(0,51);c.lineTo(-6,61);c.lineTo(6,61);c.closePath();c.fill();
  c.save();c.translate(-15,-25);c.rotate(.4);c.fillStyle='#ffffff78';c.beginPath();c.ellipse(0,0,7,15,0,0,TAU);c.fill();c.restore();
});}
function makeThumb(){return sprite(256,(c,s)=>{
  c.translate(128,128);
  // A glass reaction bubble surrounding a sculpted golden hand.
  const orb=c.createRadialGradient(-32,-42,4,0,0,112);orb.addColorStop(0,'#ffffff35');orb.addColorStop(.7,'#d4f0ff12');orb.addColorStop(.95,'#a8d6ff30');orb.addColorStop(1,'#ffffff80');
  c.fillStyle=orb;c.beginPath();c.arc(0,0,111,0,TAU);c.fill();c.strokeStyle='#e8f6ff99';c.lineWidth=2;c.stroke();
  const p=new Path2D('M -35 63 L -35 -5 Q -10 -21 -3 -49 L 2 -80 Q 5 -93 17 -84 Q 34 -71 22 -31 L 61 -31 Q 83 -29 75 -6 L 59 45 Q 54 63 34 65 Z');
  c.shadowColor='#b9872944';c.shadowBlur=10;c.shadowOffsetY=5;
  const g=c.createLinearGradient(-40,-65,66,65);g.addColorStop(0,'#fff5b9');g.addColorStop(.35,'#ffdc77');g.addColorStop(.7,'#edaa3b');g.addColorStop(1,'#bd6d22');c.fillStyle=g;c.fill(p);c.shadowBlur=0;c.shadowOffsetY=0;
  c.strokeStyle='#ffe7a180';c.lineWidth=2;c.stroke(p);
  c.fillStyle='#f3bc54';c.beginPath();c.roundRect(-66,-7,28,73,8);c.fill();
  c.strokeStyle='#a9632545';c.lineWidth=2;for(let y=-8;y<41;y+=16){c.beginPath();c.moveTo(39,y);c.lineTo(66-y*.1,y);c.stroke();}
  c.strokeStyle='#ffffffae';c.lineWidth=4;c.lineCap='round';c.beginPath();c.arc(0,0,98,3.8,4.8);c.stroke();
});}
function makeGlow(color){return sprite(64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.1,color);g.addColorStop(.35,color+'77');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,64,64);});}
function star(c,x,y,r,alpha=1){c.save();c.translate(x,y);c.globalAlpha*=alpha;c.fillStyle='#fff5d9';c.beginPath();c.moveTo(0,-r);c.quadraticCurveTo(r*.16,-r*.16,r,0);c.quadraticCurveTo(r*.16,r*.16,0,r);c.quadraticCurveTo(-r*.16,r*.16,-r,0);c.quadraticCurveTo(-r*.16,-r*.16,0,-r);c.fill();c.restore();}

export function handAnchor(result,videoWidth=960,videoHeight=540){
  const hands=result?.landmarks;if(!hands?.length)return null;
  const points=hands.flatMap(h=>[h[4],h[8]]).filter(Boolean);
  if(!points.length)return null;
  const x=points.reduce((s,p)=>s+p.x,0)/points.length,y=points.reduce((s,p)=>s+p.y,0)/points.length;
  // Same cover-crop and mirror transform as the webcam preview.
  const scale=Math.max(W/videoWidth,H/videoHeight),dw=videoWidth*scale,dh=videoHeight*scale;
  return {x:clamp(W-((W-dw)/2+x*dw),70,W-70),y:clamp((H-dh)/2+y*dh,70,H-60)};
}

export class ReactionEffects {
  constructor(){this.active=[];this.heart=makeHeart();this.thumb=makeThumb();this.balloonSprites=palettes.map(makeBalloon);this.glows=palettes.map(makeGlow);}
  clear(){this.active=[];}
  get playing(){return this.active.length>0;}
  trigger(id,now,anchor={x:W*.5,y:H*.62},seed=Math.floor(Math.random()*1e9)){
    const random=rng(seed),r=(a,b)=>a+(b-a)*random();
    const effect={id,born:now,anchor:anchor||{x:W*.5,y:H*.62},life:6,particles:[]};
    if(id==='hearts'){
      effect.life=5.2;
      for(let i=0;i<12;i++)effect.particles.push({delay:i*.14,x:r(-65,65),vx:r(-85,85),speed:r(60,100),size:i%5===0?r(94,120):r(42,86),phase:r(0,TAU),yaw:r(-1,1),life:r(2.6,3.4)});
    }else if(id==='thumbs'){
      effect.life=4.2;
      for(let i=0;i<4;i++)effect.particles.push({delay:i*.32,x:i===0?0:r(-145,145),size:i===0?188:r(62,94),phase:r(0,TAU),life:3});
    }else if(id==='balloons'){
      effect.life=7;
      for(let i=0;i<16;i++)effect.particles.push({delay:r(0,1.6),x:(i+.5)*W/16+r(-18,18),speed:r(95,145),size:r(98,155),phase:r(0,TAU),color:i%6});
    }else if(id==='confetti'){
      effect.life=5.5;
      for(let i=0;i<200;i++){const side=i%2,angle=side?r(-2.8,-1.85):r(-1.3,-.32),speed=r(300,650);effect.particles.push({delay:r(0,.5),x:side?W+10:-10,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,y:H*.87,color:i%6,size:r(5,12),spin:r(-8,8),phase:r(0,TAU),shape:i%5});}
    }else if(id==='rain'){
      effect.life=5.6;
      for(let i=0;i<145;i++)effect.particles.push({x:r(-80,W+160),y:r(-H,H),speed:r(350,650),length:r(13,38),opacity:r(.14,.5)});
    }else if(id==='fireworks'){
      effect.life=6.8;effect.bursts=[];
      for(let i=0;i<5;i++){
        const burst={delay:i*.76+.6,x:[W*.22,W*.76,W*.49,W*.3,W*.71][i],y:r(100,220),color:i%6,sparks:[]};
        for(let j=0;j<76;j++){const angle=j/76*TAU+r(-.035,.035);burst.sparks.push({vx:Math.cos(angle)*r(65,175),vy:Math.sin(angle)*r(65,175),life:r(1.5,2.4),phase:r(0,TAU)});}effect.bursts.push(burst);
      }
    }else return;
    // Bound button-spam cost, while letting different reactions overlap.
    this.active=this.active.filter(e=>e.id!==id).slice(-2);this.active.push(effect);
  }
  render(c,now){
    this.active=this.active.filter(e=>now-e.born<e.life*1000);
    for(const e of this.active){const t=Math.max(0,(now-e.born)/1000);c.save();this[e.id](c,e,t);c.restore();}
  }
  hearts(c,e,t){
    for(const p of e.particles){const a=t-p.delay;if(a<0||a>p.life)continue;
      const z=ease(a/.36),w=p.size*z,turn=Math.cos(p.yaw+a*1.35+p.phase);
      const x=e.anchor.x+p.x+p.vx*a*.5+Math.sin(a*1.8+p.phase)*16,y=e.anchor.y-a*p.speed;
      c.save();c.globalAlpha=fade(a,p.life);c.translate(x,y);c.rotate(Math.sin(a+p.phase)*.16);
      c.scale(.42+.58*Math.abs(turn),1);c.drawImage(this.heart,-w*.68,-w*.68,w*1.36,w*1.36);c.restore();
    }
  }
  thumbs(c,e,t){
    for(const p of e.particles){const a=t-p.delay;if(a<0||a>p.life)continue;
      const grow=ease(a/.5)*(1+.06*Math.sin(a*6)*Math.exp(-a*2)),size=p.size*grow;
      const x=e.anchor.x+p.x+Math.sin(a*1.3+p.phase)*12,y=e.anchor.y-45-a*35;
      c.save();c.globalAlpha=fade(a,p.life);c.drawImage(this.thumb,x-size/2,y-size/2,size,size);c.restore();
      if(p.size>150)for(let k=0;k<5;k++){const angle=k/5*TAU+a*.5;star(c,x+Math.cos(angle)*110,y+Math.sin(angle)*90,3+3*Math.sin(a*3+k)**2,fade(a,p.life)*.8);}
    }
  }
  balloons(c,e,t){
    for(const p of e.particles){const a=t-p.delay;if(a<0)continue;
      const x=p.x+Math.sin(a*1.5+p.phase)*22,y=H+120-a*p.speed,s=p.size;
      c.save();c.globalAlpha=clamp(a/.3)*clamp((e.life-t)/.7);
      c.strokeStyle='#f5f0e580';c.lineWidth=1.1;c.beginPath();c.moveTo(x,y+s*.18);c.bezierCurveTo(x-16,y+s*.5,x+25*Math.sin(a+p.phase),y+s*.7,x+12*Math.sin(a*2+p.phase),y+s*1.1);c.stroke();
      c.translate(x,y);c.rotate(Math.sin(a*1.5+p.phase)*.075);c.drawImage(this.balloonSprites[p.color],-s/2,-s/2,s,s);c.restore();
    }
  }
  confetti(c,e,t){
    for(const p of e.particles){const a=t-p.delay;if(a<0)continue;
      const drag=(1-Math.exp(-a*.8))/.8,x=p.x+p.vx*drag,y=p.y+p.vy*drag+92*a*a;
      if(y>H+40)continue;c.save();c.globalAlpha=clamp((e.life-t)/.7);c.translate(x,y);c.rotate(p.phase+a*p.spin);c.scale(Math.cos(a*5+p.phase)*.8+.2,1);c.fillStyle=palettes[p.color];
      if(p.shape===0){c.beginPath();c.arc(0,0,p.size*.45,0,TAU);c.fill();}else{c.fillRect(-p.size/2,-p.size*.28,p.size,p.size*.56);c.fillStyle='#ffffff50';c.fillRect(-p.size/2,-p.size*.28,p.size,1.2);}c.restore();
    }
  }
  rain(c,e,t){
    const alpha=fade(t,e.life);c.globalAlpha=alpha;
    const veil=c.createLinearGradient(0,0,0,H);veil.addColorStop(0,'#172a44a0');veil.addColorStop(1,'#203d5c18');c.fillStyle=veil;c.fillRect(0,0,W,H);
    // A soft cloud bank; no hard-edged cloud icon.
    for(let i=0;i<9;i++){const x=i*140-60+Math.sin(t*.25+i)*12,g=c.createRadialGradient(x,12,5,x,12,140);g.addColorStop(0,'#8c9dafb0');g.addColorStop(.5,'#53677c90');g.addColorStop(1,'#3c506300');c.fillStyle=g;c.fillRect(x-140,0,280,150);}
    c.lineCap='round';for(const p of e.particles){const y=((p.y+t*p.speed)%(H+130))-60,x=p.x-t*48%100;c.strokeStyle=`rgba(193,218,246,${p.opacity*alpha})`;c.lineWidth=p.length>26?1.5:1;c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+p.length);c.stroke();}
    const flash=Math.exp(-Math.pow((t-1.7)/.055,2))*.2+Math.exp(-Math.pow((t-1.94)/.04,2))*.13;
    if(flash>.01){c.fillStyle=`rgba(215,230,255,${flash})`;c.fillRect(0,0,W,H);}
    for(let i=0;i<10;i++){const phase=(t*1.5+i*.37)%1;if(phase<.28){c.globalAlpha=(1-phase/.28)*alpha*.3;c.strokeStyle='#d0e6ff';c.lineWidth=1;c.beginPath();c.ellipse((i*137)%W,H-9-(i%3)*6,phase*65+2,phase*13+1,0,0,TAU);c.stroke();}}
  }
  fireworks(c,e,t){
    c.fillStyle=`rgba(12,17,35,${fade(t,e.life)*.15})`;c.fillRect(0,0,W,H);
    c.globalCompositeOperation='lighter';
    for(const b of e.bursts){c.globalAlpha=1;const age=t-b.delay;
      if(age<0&&age>-.65){const f=clamp((age+.65)/.65),y=H+(b.y-H)*ease(f);c.strokeStyle=palettes[b.color]+'99';c.lineWidth=2;c.beginPath();c.moveTo(b.x,y+35);c.lineTo(b.x,y);c.stroke();c.drawImage(this.glows[b.color],b.x-10,y-10,20,20);}
      if(age<0||age>2.6)continue;
      c.globalAlpha=clamp(1-age/2.6);
      if(age<.16){const s=100*(1-age/.16);c.drawImage(this.glows[b.color],b.x-s/2,b.y-s/2,s,s);}
      for(const p of b.sparks){if(age>p.life)continue;const travel=(1-Math.exp(-age*1.2))/1.2,old=Math.max(0,age-.12),prev=(1-Math.exp(-old*1.2))/1.2;
        const x=b.x+p.vx*travel,y=b.y+p.vy*travel+age*age*32;
        c.globalAlpha=clamp((p.life-age)/.65)*(.65+.35*Math.sin(age*19+p.phase)**2);c.strokeStyle=palettes[b.color];c.lineWidth=1.6;c.beginPath();c.moveTo(b.x+p.vx*prev,b.y+p.vy*prev+old*old*32);c.lineTo(x,y);c.stroke();c.drawImage(this.glows[b.color],x-6,y-6,12,12);
      }
    }
  }
}
