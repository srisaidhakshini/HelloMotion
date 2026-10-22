const net = require('node:net');
const {randomUUID} = require('node:crypto');
const WIDTH=960, HEIGHT=540, BYTES=WIDTH*HEIGHT*4, HEADER=32;
function encodeFrame(rgba, sequence=0) {
  if (!ArrayBuffer.isView(rgba) || rgba.BYTES_PER_ELEMENT!==1 || rgba.byteLength!==BYTES) throw Error('Invalid frame size');
  const packet=Buffer.allocUnsafe(HEADER+BYTES);
  packet.write('HMF1');packet.writeUInt32LE(1,4);packet.writeUInt32LE(WIDTH,8);packet.writeUInt32LE(HEIGHT,12);
  packet.writeUInt32LE(WIDTH*4,16);packet.writeUInt32LE(BYTES,20);packet.writeUInt32LE(sequence>>>0,24);packet.writeUInt32LE(0,28);
  for(let i=0;i<BYTES;i+=4){packet[HEADER+i]=rgba[i+2];packet[HEADER+i+1]=rgba[i+1];packet[HEADER+i+2]=rgba[i];packet[HEADER+i+3]=255;}
  return packet;
}
class FrameServer {
  constructor(){this.endpoint='\\\\.\\pipe\\HelloMotion-'+randomUUID();this.frame=null;this.updated=0;this.sockets=new Set();this.sequence=0;}
  async start(){
    this.server=net.createServer(socket=>{
      if(this.sockets.size>=4){socket.destroy();return;}
      this.sockets.add(socket);socket.on('error',()=>{});socket.on('close',()=>this.sockets.delete(socket));socket.setTimeout(500,()=>socket.destroy());
      // Never serve a frozen webcam frame after the producer stalls.
      const packet=this.frame && performance.now()-this.updated<500 ? this.frame : encodeFrame(new Uint8Array(BYTES));
      socket.end(packet);
    });
    await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(this.endpoint,resolve);});
    return this.endpoint;
  }
  publish(rgba){this.frame=encodeFrame(rgba,++this.sequence);this.updated=performance.now();}
  clear(){this.frame=null;this.updated=0;}
  async stop(){this.clear();for(const socket of this.sockets)socket.destroy();const server=this.server;this.server=null;if(server?.listening)await new Promise(r=>server.close(r));}
}
module.exports={FrameServer,encodeFrame,WIDTH,HEIGHT,BYTES,HEADER};
