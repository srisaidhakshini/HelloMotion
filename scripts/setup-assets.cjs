const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const target=path.join(__dirname,'..','app','models','gesture_recognizer.task');
const expected='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482';
const hash=data=>createHash('sha256').update(data).digest('hex');
(async()=>{
 try{if(hash(await fs.readFile(target))===expected){console.log('Local gesture model verified.');return;}}catch{}
 const response=await fetch('https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('Model download failed: '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(hash(bytes)!==expected)throw Error('Gesture model checksum mismatch; model was not installed.');
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target+'.tmp',bytes);await fs.rename(target+'.tmp',target);
 console.log('Local gesture model installed and verified.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
