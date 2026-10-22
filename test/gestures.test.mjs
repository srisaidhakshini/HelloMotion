import test from 'node:test';
import assert from 'node:assert/strict';
import {reactionFor,GestureGate} from '../app/gestures.mjs';
const result=(...names)=>({gestures:names.map(categoryName=>[{categoryName,score:.9}])});
test('two-hand reactions take priority over one-hand reactions',()=>{
 assert.equal(reactionFor(result('Thumb_Up','Thumb_Up')),'fireworks');
 assert.equal(reactionFor(result('Victory','Victory')),'confetti');
 assert.equal(reactionFor(result('Thumb_Down','Thumb_Down')),'rain');
 assert.equal(reactionFor(result('Thumb_Up')),'thumbs');
 assert.equal(reactionFor(result('Victory')),'balloons');
 assert.equal(reactionFor({gestures:[[{categoryName:'Thumb_Up',score:.5}]]}),null);
});
test('hold, release and cooldown prevent accidental repeated reactions',()=>{
 const g=new GestureGate();assert.equal(g.update('thumbs',0),null);
 assert.equal(g.update('thumbs',799),null);assert.equal(g.update('thumbs',800),'thumbs');
 assert.equal(g.update('thumbs',5000),null);g.update(null,5100);g.update('thumbs',5200);
 assert.equal(g.update('thumbs',6000),'thumbs');g.update('balloons',6100);
 assert.equal(g.update('balloons',6900),null);assert.equal(g.update('balloons',9000),'balloons');
});
