export const GESTURE_CONFIDENCE=.55;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const spatial=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
function angle(a,b,c){
  const ux=a.x-b.x,uy=a.y-b.y,uz=(a.z||0)-(b.z||0),vx=c.x-b.x,vy=c.y-b.y,vz=(c.z||0)-(b.z||0);
  return Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy+uz*vz)/(Math.hypot(ux,uy,uz)*Math.hypot(vx,vy,vz)||1))))*180/Math.PI;
}
export function landmarkGesture(h,screen=h){
  if(!h?.[20])return 'None';
  const scale=spatial(h[0],h[9]);if(scale<.025)return 'None';
  const extended=tip=>angle(h[tip-3],h[tip-2],h[tip])>150&&spatial(h[0],h[tip])>spatial(h[0],h[tip-2])*1.1;
  const curled=tip=>angle(h[tip-3],h[tip-2],h[tip])<135||spatial(h[0],h[tip])<spatial(h[0],h[tip-2])*1.04;
  const fingers=[8,12,16,20];
  const thumbStraight=angle(h[2],h[3],h[4])>145&&spatial(h[4],h[5])>scale*.65;
  const dx=screen[4].x-screen[2].x,dy=screen[4].y-screen[2].y;
  const screenScale=distance(screen[0],screen[9]);
  if(fingers.every(curled)&&thumbStraight&&Math.abs(dy)>Math.abs(dx)*1.1&&Math.abs(dy)>screenScale*.45)return dy<0?'Thumb_Up':'Thumb_Down';
  if(extended(8)&&extended(12)&&curled(16)&&curled(20)&&spatial(h[8],h[12])>scale*.25)return 'Victory';
  return 'None';
}
function isHeart(hands){
  if(hands?.length!==2)return false;
  const [a,b]=hands;if(!a?.[20]||!b?.[20])return false;
  const scale=(distance(a[0],a[9])+distance(b[0],b[9]))/2;
  if(scale<.035)return false;
  const indexGap=distance(a[8],b[8])/scale,thumbGap=distance(a[4],b[4])/scale;
  const top={x:(a[8].x+b[8].x)/2,y:(a[8].y+b[8].y)/2};
  const bottom={x:(a[4].x+b[4].x)/2,y:(a[4].y+b[4].y)/2};
  // Allow a small opening between fingertips, but require a heart-sized space
  // between the index and thumb pairs and two distinct, separated palms.
  return indexGap<.8 && thumbGap<.8 && bottom.y-top.y>scale*.45 &&
    distance(top,bottom)<scale*2.7 && distance(a[0],b[0])>scale*.85 &&
    distance(a[8],a[4])>scale*.55 && distance(b[8],b[4])>scale*.55;
}
export function classifyHands(result){
  const count=Math.max(result.landmarks?.length||0,result.gestures?.length||0);
  return Array.from({length:count},(_,i)=>{
    const top=result.gestures?.[i]?.[0];
    if(top?.score>=GESTURE_CONFIDENCE&&top.categoryName!=='None')return top.categoryName;
    return landmarkGesture(result.worldLandmarks?.[i]||result.landmarks?.[i],result.landmarks?.[i]);
  });
}
export function reactionFor(result){
  const names=classifyHands(result);
  if(names.length===2){
    if(names.every(n=>n==='Thumb_Down'))return 'rain';
    if(names.every(n=>n==='Thumb_Up'))return 'fireworks';
    if(names.every(n=>n==='Victory'))return 'confetti';
  }
  // Heart hands is a landmark gesture, not one of the model's canned classes.
  if(isHeart(result.landmarks))return 'hearts';
  if(names.length===2){
    if(names.every(n=>n==='Closed_Fist'))return 'portal';
    if(names.includes('Open_Palm')&&names.includes('Victory'))return 'jellyfish';
    if(names.includes('Open_Palm')&&names.includes('Thumb_Up'))return 'snowglobe';
  }
  if(names.length===2&&names.every(n=>n==='Open_Palm'))return 'butterflies';
  if(names.length===1&&names[0]==='ILoveYou')return 'phoenix';
  if(names.includes('Pointing_Up'))return 'sparkles';
  if(names.includes('Thumb_Up'))return 'thumbs';
  if(names.includes('Victory'))return 'balloons';
  return null;
}
export class GestureGate {
  constructor({holdMs=800,cooldownMs=3000,gapMs=250,releaseMs=400}={}){
    Object.assign(this,{holdMs,cooldownMs,gapMs,releaseMs});this.reset();
  }
  reset(){this.candidate=null;this.evidence=0;this.lastSeen=-Infinity;this.previousAt=null;this.previousName=null;this.pending=null;this.pendingSince=0;this.latched=null;this.releaseSince=null;this.last=-Infinity;}
  commit(name,now){if(now-this.last<this.cooldownMs)return null;this.last=now;this.latched=name;return name;}
  get progress(){return Math.min(1,this.evidence/this.holdMs);}
  update(name,now){
    const dt=this.previousAt===null?0:Math.min(250,Math.max(0,now-this.previousAt));
    if(this.previousAt!==null&&now-this.previousAt>1000){this.candidate=null;this.evidence=0;this.pending=null;}
    this.previousAt=now;
    if(!name){
      if(this.releaseSince===null)this.releaseSince=now;
      if(now-this.releaseSince>=this.releaseMs)this.latched=null;
      if(now-this.lastSeen>this.gapMs){this.candidate=null;this.evidence=0;this.pending=null;}
      this.previousName=null;return null;
    }
    this.releaseSince=null;
    if(this.candidate===null){this.candidate=name;this.evidence=0;this.lastSeen=now;this.pending=null;}
    else if(name===this.candidate){
      if(this.previousName===name)this.evidence+=dt;
      this.lastSeen=now;this.pending=null;
    }else{
      if(this.pending!==name){this.pending=name;this.pendingSince=now;}
      if(now-this.pendingSince>=200||now-this.lastSeen>this.gapMs){this.candidate=name;this.evidence=0;this.lastSeen=now;this.pending=null;}
    }
    this.previousName=name;
    if(name!==this.candidate||this.evidence<this.holdMs||this.latched===name||now-this.last<this.cooldownMs)return null;
    this.last=now;this.latched=name;return name;
  }
}
