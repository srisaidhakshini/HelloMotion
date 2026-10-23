import test from 'node:test';
import assert from 'node:assert/strict';
import {reactionFor,GestureGate} from '../app/gestures.mjs';
import {MotionGestures} from '../app/motion-gestures.mjs';
function pose(names,x=.5,y=.6){return {gestures:names.map(categoryName=>[{categoryName,score:.95}]),landmarks:names.map((_,i)=>Array.from({length:21},()=>({x:x+i*.2,y})))};}
test('new static poses do not replace the existing reactions',()=>{
 assert.equal(reactionFor(pose(['Open_Palm','Open_Palm'])),'butterflies');
 assert.equal(reactionFor(pose(['Pointing_Up'])),'sparkles');
 assert.equal(reactionFor(pose(['Open_Palm'])),null);
 assert.equal(reactionFor(pose(['Closed_Fist'])),null);
 assert.equal(reactionFor(pose(['Victory','Victory'])),'confetti');
});
test('flower requires a stable fist then a stable open palm',()=>{
 const motion=new MotionGestures();for(const t of [0,100,200,300])assert.equal(motion.update(pose(['Closed_Fist']),t),null);
 assert.equal(motion.update(pose(['Open_Palm']),400),null);
 assert.equal(motion.update(pose(['Open_Palm']),500),null);
 assert.equal(motion.update(pose(['Open_Palm']),600)?.id,'bloom');
 assert.equal(motion.update(pose(['Open_Palm']),700),null);
 const idle=new MotionGestures();for(let t=0;t<2000;t+=100)assert.equal(idle.update(pose(['Open_Palm']),t),null);
});
test('old fists, switched hands, and two palms cannot accidentally bloom',()=>{
 const motion=new MotionGestures();motion.update(pose(['Closed_Fist']),0);motion.update(pose(['Closed_Fist']),300);
 assert.equal(motion.update(pose(['Open_Palm']),3000),null);
 const swapped=new MotionGestures();swapped.update(pose(['Closed_Fist'],.15),0);swapped.update(pose(['Closed_Fist'],.15),300);
 swapped.update(pose(['Open_Palm'],.8),400);assert.equal(swapped.update(pose(['Open_Palm'],.8),700),null);
 const both=new MotionGestures();both.update(pose(['Closed_Fist']),0);both.update(pose(['Closed_Fist']),300);
 assert.equal(both.update(pose(['Open_Palm','Open_Palm']),400),null);
});
test('wave requires deliberate horizontal reversals, not drift or noise',()=>{
 const wave=new MotionGestures();let fired=null;
 const xs=[.4,.44,.50,.56,.60,.56,.50,.44,.40,.44,.50,.56,.60];
 xs.forEach((x,i)=>{fired=wave.update(pose(['Open_Palm'],x),i*100)||fired;});assert.equal(fired?.id,'ribbons');
 for(const xs of [[.4,.44,.48,.52,.56,.6],[.5,.505,.499,.502,.498,.5]]){
   const neutral=new MotionGestures();xs.forEach((x,i)=>assert.equal(neutral.update(pose(['Open_Palm'],x),i*100),null));
 }
});
test('motion reactions share the existing cooldown',()=>{
 const gate=new GestureGate();assert.equal(gate.commit('bloom',1000),'bloom');
 assert.equal(gate.commit('ribbons',1500),null);assert.equal(gate.commit('ribbons',4000),'ribbons');
});

test('brief tracking gaps preserve a flower sequence, other poses cancel it',()=>{
 const motion=new MotionGestures();motion.update(pose(['Closed_Fist']),0);motion.update(pose(['Closed_Fist']),300);
 motion.update({gestures:[],landmarks:[]},400);motion.update(pose(['Open_Palm']),500);
 assert.equal(motion.update(pose(['Open_Palm']),700)?.id,'bloom');
 const cancelled=new MotionGestures();cancelled.update(pose(['Closed_Fist']),0);cancelled.update(pose(['Closed_Fist']),300);
 cancelled.update(pose(['Victory']),400);cancelled.update(pose(['Open_Palm']),500);
 assert.equal(cancelled.update(pose(['Open_Palm']),700),null);
});

test('creative reactions use distinct, order-independent two-hand combinations',()=>{
 for(const [names,id]of [[['Closed_Fist','Closed_Fist'],'portal'],[['Open_Palm','Victory'],'jellyfish'],[['Open_Palm','Thumb_Up'],'snowglobe']]){
  assert.equal(reactionFor(pose(names)),id);assert.equal(reactionFor(pose([...names].reverse())),id);
 }
 assert.equal(reactionFor(pose(['ILoveYou'])),'phoenix');
 assert.equal(reactionFor(pose(['Open_Palm','Open_Palm'])),'butterflies');
 assert.equal(reactionFor(pose(['Victory'])),'balloons');assert.equal(reactionFor(pose(['Thumb_Up'])),'thumbs');
});
test('creative gestures require confident hands and keep hold/release/cooldown rules',()=>{
 const uncertain=pose(['ILoveYou']);uncertain.gestures[0][0].score=.54;assert.equal(reactionFor(uncertain),null);
 const missing=pose(['Closed_Fist','None']);assert.equal(reactionFor(missing),null);
 const gate=new GestureGate();let fired=[];
 for(let t=0;t<2000;t+=100){const name=gate.update('phoenix',t);if(name)fired.push(name);}
 assert.deepEqual(fired,['phoenix']);
 for(let t=2000;t<=2500;t+=100)gate.update(null,t);
 for(let t=2600;t<5000;t+=100){const name=gate.update('portal',t);if(name)fired.push(name);}
 assert.deepEqual(fired,['phoenix','portal']);
});
