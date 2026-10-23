const path=require('node:path');
const {spawn}=require('node:child_process');
const {FrameServer,BYTES,STALE_MS}=require('../app/frame-server.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const frames=new FrameServer();await frames.start();const rgba=new Uint8Array(BYTES);
 for(let i=0;i<BYTES;i+=4)rgba.set([200,20,90,255],i);
 let producer=setInterval(()=>frames.publish(rgba),50);frames.publish(rgba);
 const child=spawn(path.join(__dirname,'../native/bin/HelloMotionProbe.exe'),['--reader',frames.endpoint],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 let lines=[],errors='';child.stdout.on('data',chunk=>{for(const line of chunk.toString().trim().split(/\r?\n/)){console.log(line);lines.push(line);}});child.stderr.on('data',data=>errors+=data);
 const ended=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(errors||'reader exited '+code)));});
 const wait=async prefix=>{const until=Date.now()+4000;while(!lines.some(line=>line.startsWith(prefix))){if(Date.now()>until)throw Error('Timed out: '+prefix+' '+errors);await sleep(25);}lines=[];};
 const check=async kind=>{child.stdin.write(kind+'\n');await wait('READER_PASS '+kind);};
 try{
  await wait('READER_READY');await sleep(200);await check('color');
  // Reject connections for less than the stale timeout: Copy must stay fast and retain color.
  const accept=frames.server.listeners('connection')[0];frames.server.removeListener('connection',accept);const reject=socket=>socket.destroy();frames.server.on('connection',reject);
  await sleep(450);await check('color');frames.server.removeListener('connection',reject);frames.server.on('connection',accept);
  await sleep(200);await check('color');
  frames.clear();clearInterval(producer);producer=null;await sleep(200);await check('black');
  frames.publish(rgba);await sleep(200);await check('color');
  await sleep(STALE_MS+250);await check('black');
  frames.publish(rgba);await sleep(200);await check('color');
  child.stdin.end('stop\n');await ended;console.log('PASS: nonblocking native cache survives connection gaps, clears explicitly, expires stale video, and recovers');
 }finally{clearInterval(producer);if(child.exitCode===null)child.kill();await frames.stop();}
})().catch(error=>{console.error(error);process.exitCode=1;});
