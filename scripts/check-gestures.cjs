const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
 const folder=path.join(__dirname,'..','work','gesture-check');await fs.mkdir(folder,{recursive:true});
 for(const name of ['thumbs_up','thumbs_down','victory','pointing_up']){
  const file=path.join(folder,name+'.jpg');try{await fs.access(file);continue;}catch{}
  const response=await fetch('https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/'+name+'.jpg',{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Could not download test fixture '+name);
  await fs.writeFile(file,Buffer.from(await response.arrayBuffer()));
 }
 const child=spawn(require('electron'),['.','--gesture-check',...process.argv.slice(2)],{cwd:path.join(__dirname,'..'),windowsHide:true,stdio:'inherit'});
 const timer=setTimeout(()=>{child.kill();console.error('Recognition check timed out.');process.exitCode=1;},60000);
 child.once('error',e=>{clearTimeout(timer);console.error(e);process.exitCode=1;});
 child.once('exit',code=>{clearTimeout(timer);process.exitCode=code||0;});
})().catch(e=>{console.error(e.message);process.exitCode=1;});
