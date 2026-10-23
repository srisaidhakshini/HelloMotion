import {classifyHands} from './gestures.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class MotionGestures {
  constructor(){this.reset();}
  reset(){this.fistSince=null;this.armedUntil=0;this.openSince=null;this.wrist=null;this.lastAt=null;this.seen=-Infinity;this.wave=null;this.hint='';this.progress=0;}
  update(result,now){
    const names=classifyHands(result);this.hint='';this.progress=0;
    if(this.lastAt!==null&&now-this.lastAt>600)this.reset();this.lastAt=now;
    if(!names.length||!result.landmarks?.[0]?.[0]){
      if(now-this.seen>250){this.fistSince=null;this.openSince=null;this.wave=null;this.armedUntil=0;this.wrist=null;}
      return null;
    }
    if(names.length!==1){this.fistSince=null;this.openSince=null;this.wave=null;this.armedUntil=0;this.wrist=null;return null;}
    this.seen=now;
    const wrist=result.landmarks[0][0],name=names[0];
    if(this.wrist&&distance(wrist,this.wrist)>.32){this.reset();this.lastAt=now;}
    this.wrist={...wrist};
    if(name==='Closed_Fist'){
      this.wave=null;this.openSince=null;
      if(this.fistSince===null)this.fistSince=now;
      this.progress=Math.min(1,(now-this.fistSince)/300);
      if(this.progress>=1){this.armedUntil=now+2200;this.hint='Fist ready — open your palm to bloom a flower.';}
      else this.hint='Hold your fist briefly, then open your palm.';
      return null;
    }
    this.fistSince=null;
    if(name!=='Open_Palm'){if(name!=='None')this.armedUntil=0;this.openSince=null;if(!this.wave||now-this.wave.seen>250)this.wave=null;return null;}
    if(this.openSince===null)this.openSince=now;
    if(now<this.armedUntil){
      this.wave=null;this.hint='Open palm detected — blooming…';this.progress=Math.min(1,(now-this.openSince)/200);
      if(now-this.openSince>=200){this.armedUntil=0;this.openSince=null;return {id:'bloom',hand:0};}
      return null;
    }
    if(!this.wave||now-this.wave.start>1700||now-this.wave.seen>350){this.wave={start:now,seen:now,turn:wrist.x,last:wrist.x,min:wrist.x,max:wrist.x,y:wrist.y,direction:0,reversals:0};}
    const wave=this.wave;wave.seen=now;
    if(Math.abs(wrist.y-wave.y)>.18){this.wave=null;return null;}
    wave.min=Math.min(wave.min,wrist.x);wave.max=Math.max(wave.max,wrist.x);
    const dx=wrist.x-wave.last;
    if(Math.abs(dx)>.012){
      const direction=Math.sign(dx);
      if(!wave.direction){wave.direction=direction;wave.turn=wrist.x;}
      else if(direction!==wave.direction&&Math.abs(wave.last-wave.turn)>.065){wave.reversals++;wave.direction=direction;wave.turn=wave.last;}
      wave.last=wrist.x;
    }
    this.hint='Open palm ready. Wave side to side for ribbons, or show both palms for butterflies.';
    this.progress=Math.min(.9,wave.reversals*.35);
    if(wave.reversals>=2&&wave.max-wave.min>=.14&&now-this.openSince>=400){this.wave=null;return {id:'ribbons',hand:0};}
    return null;
  }
}
