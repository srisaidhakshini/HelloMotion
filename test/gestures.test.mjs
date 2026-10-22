import test from 'node:test';
import assert from 'node:assert/strict';
import {reactionFor,GestureGate} from '../app/gestures.mjs';
const result=(...names)=>({gestures:names.map(categoryName=>[{categoryName,score:.9}])});
test('two-hand gestures take priority and realistic model scores are accepted',()=>{
 assert.equal(reactionFor(result('Thumb_Up','Thumb_Up')),'fireworks');
 assert.equal(reactionFor(result('Victory','Victory')),'confetti');
 assert.equal(reactionFor(result('Thumb_Down','Thumb_Down')),'rain');
 assert.equal(reactionFor(result('Thumb_Up')),'thumbs');
 assert.equal(reactionFor(result('Victory')),'balloons');
 assert.equal(reactionFor({gestures:[[{categoryName:'Thumb_Up',score:.733}]]}),'thumbs');
 assert.equal(reactionFor({gestures:[[{categoryName:'Thumb_Up',score:.5}]]}),null);
});
function feed(g,name,start,end,step=100){const hits=[];for(let t=start;t<=end;t+=step){const hit=g.update(name,t);if(hit)hits.push([hit,t]);}return hits;}
test('short detection gaps preserve hold evidence without accumulating gap time',()=>{
 const g=new GestureGate();assert.deepEqual(feed(g,'thumbs',0,400),[]);
 g.update(null,500);g.update(null,600);
 assert.deepEqual(feed(g,'thumbs',700,1100),[['thumbs',1100]]);
});
test('a single wrong label does not reset a valid hold',()=>{
 const g=new GestureGate();feed(g,'thumbs',0,400);g.update('balloons',500);
 assert.deepEqual(feed(g,'thumbs',600,1000),[['thumbs',1000]]);
});
test('a held pose cannot retrigger after a one-frame miss; real release rearms it',()=>{
 const g=new GestureGate();assert.deepEqual(feed(g,'thumbs',0,800),[['thumbs',800]]);
 feed(g,'thumbs',900,4000);g.update(null,4100);
 assert.deepEqual(feed(g,'thumbs',4200,5200),[]);
 feed(g,null,5300,5800);
 assert.deepEqual(feed(g,'thumbs',5900,6700),[['thumbs',6700]]);
});
test('long loss and paused inference cannot count as a held gesture',()=>{
 const g=new GestureGate();feed(g,'thumbs',0,400);feed(g,null,500,900);
 assert.deepEqual(feed(g,'thumbs',1000,1700),[]);assert.equal(g.update('thumbs',1800),'thumbs');
 const paused=new GestureGate();feed(paused,'thumbs',0,400);
 assert.equal(paused.update('thumbs',2000),null);assert.equal(paused.progress,0);
});
test('cooldown applies across different gestures',()=>{
 const g=new GestureGate();feed(g,'thumbs',0,800);feed(g,null,900,1400);
 assert.deepEqual(feed(g,'balloons',1500,3700),[]);assert.equal(g.update('balloons',3800),'balloons');
});
test('heart geometry allows small fingertip gaps and rejects overlapping palms',()=>{
 const a=Array.from({length:21},()=>({x:.3,y:.6})),b=Array.from({length:21},()=>({x:.7,y:.6}));
 a[9]={x:.3,y:.4};b[9]={x:.7,y:.4};a[8]={x:.45,y:.3};b[8]={x:.55,y:.3};a[4]={x:.46,y:.57};b[4]={x:.54,y:.57};
 assert.equal(reactionFor({landmarks:[a,b],gestures:[]}), 'hearts');
 assert.equal(reactionFor({landmarks:[a,a],gestures:[]}),null);
});
