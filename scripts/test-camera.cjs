const path=require('node:path');
const {spawn}=require('node:child_process');
const {CameraOutput}=require('../app/camera-output.cjs');
const {BYTES}=require('../app/frame-server.cjs');
(async()=>{
 const root=path.join(__dirname,'..','native','bin');const camera=new CameraOutput(path.join(root,'HelloMotionHost.exe'));
 let timer;
 try{
  await camera.start();const rgba=new Uint8ClampedArray(BYTES);
  for(let i=0;i<BYTES;i+=4)rgba.set([200,20,90,255],i);
  camera.publish(rgba);timer=setInterval(()=>camera.publish(rgba),100);
  await new Promise((resolve,reject)=>{
   const probe=spawn(path.join(root,'HelloMotionProbe.exe'),[],{windowsHide:true,stdio:'inherit'});
   const timeout=setTimeout(()=>{probe.kill();reject(Error('Camera probe timed out'));},20000);
   probe.once('error',e=>{clearTimeout(timeout);reject(e);});
   probe.once('exit',code=>{clearTimeout(timeout);code===0?resolve():reject(Error('Camera probe failed ('+code+')'));});
  });
 }finally{clearInterval(timer);await camera.stop();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
