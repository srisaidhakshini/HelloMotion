import test from 'node:test';
import assert from 'node:assert/strict';
import {handAnchor} from '../app/effects.mjs';
function result(x,y){const h=Array.from({length:21},()=>({x,y}));return {landmarks:[h]};}
test('gesture origin matches mirrored preview and cover cropping',()=>{
 assert.deepEqual(handAnchor(result(.25,.5)),{x:720,y:270});
 assert.deepEqual(handAnchor(result(.25,.5),640,480),{x:720,y:270});
 assert.deepEqual(handAnchor(result(.5,.4),640,480),{x:480,y:198});
 assert.equal(handAnchor({landmarks:[]}),null);
 assert.deepEqual(handAnchor(result(0,0)),{x:890,y:70});
});

test('fingertip and palm anchors use the selected hand and mirror transform',async()=>{
 const {pointAnchor}=await import('../app/effects.mjs');
 const result={landmarks:[Array.from({length:21},()=>({x:.25,y:.4})),Array.from({length:21},()=>({x:.8,y:.6}))]};
 assert.deepEqual(pointAnchor(result,[8],1),{x:192,y:324});
 assert.deepEqual(pointAnchor(result,[0,5,9,13,17],0),{x:720,y:216});
 assert.equal(pointAnchor({landmarks:[]}),null);
});
