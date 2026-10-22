const test=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const {FrameServer,encodeFrame,BYTES,HEADER}=require('../app/frame-server.cjs');
test('frame protocol has fixed dimensions and converts RGBA to BGRA',()=>{
 const pixels=new Uint8Array(BYTES);pixels.set([12,34,56,78]);const packet=encodeFrame(pixels,7);
 assert.equal(packet.subarray(0,4).toString(),'HMF1');assert.equal(packet.readUInt32LE(8),960);assert.equal(packet.readUInt32LE(12),540);
 assert.equal(packet.readUInt32LE(20),BYTES);assert.equal(packet.readUInt32LE(24),7);
 assert.deepEqual([...packet.subarray(HEADER,HEADER+4)],[56,34,12,255]);
 assert.throws(()=>encodeFrame(new Uint8Array(4)),/size/);
 assert.equal(encodeFrame(new Uint8ClampedArray(BYTES)).length,HEADER+BYTES);
});
function receive(endpoint){return new Promise((resolve,reject)=>{const parts=[];const client=net.connect(endpoint);client.on('data',p=>parts.push(p));client.on('end',()=>resolve(Buffer.concat(parts)));client.on('error',reject);});}
test('pipe transports the latest frame and clears video on stop',async()=>{
 const server=new FrameServer();await server.start();
 try{
  const pixels=new Uint8Array(BYTES);pixels.set([200,20,90,255]);server.publish(pixels);
  const packet=await receive(server.endpoint);assert.equal(packet.length,HEADER+BYTES);assert.equal(packet[HEADER+2],200);
  server.clear();const cleared=await receive(server.endpoint);assert.equal(cleared[HEADER+2],0);
  server.publish(pixels);server.updated=performance.now()-1000;const stale=await receive(server.endpoint);assert.equal(stale[HEADER+2],0);
 }finally{await server.stop();}
});
