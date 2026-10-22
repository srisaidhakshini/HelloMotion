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
