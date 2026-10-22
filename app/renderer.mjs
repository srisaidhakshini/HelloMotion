import {reactionFor, GestureGate} from './gestures.mjs';
const $ = id => document.getElementById(id);
const video=$('video'), canvas=$('canvas'), ctx=canvas.getContext('2d');
const reactions=[['hearts','💗','Hearts','Heart hands'],['thumbs','👍','Thumbs up','One thumbs up'],['balloons','🎈','Balloons','Peace sign'],['rain','🌧️','Rain','Two thumbs down'],['confetti','🎉','Confetti','Two peace signs'],['fireworks','✨','Fireworks','Two thumbs up']];
let stream, recognizer, enabled=false, starting=false, particles=[], lastInference=0, lastVideoTime=-1, modelPromise;
const gate=new GestureGate();
let outputActive=false, outputBusy=false, lastOutput=0, pattern=false;
const outgoing=document.createElement('canvas');outgoing.width=960;outgoing.height=540;
const outctx=outgoing.getContext('2d',{willReadFrequently:true});
async function refreshOutput(){
  const state=await window.helloMotion?.output('state');
  outputActive=Boolean(state?.active);
  $('output').setAttribute('aria-pressed',String(outputActive));
  $('output').textContent=outputActive?'Call output on':'Call output off';
  if(state?.available&&!outputActive&&$('output-status').textContent.includes('needs the native'))$('output-status').textContent='Native camera ready. Enable Call output to use HelloMotion in a calling app.';
  if(!state?.available)$('output-status').textContent='Native camera not built yet. Camera preview and reaction buttons are ready.';
}
$('output').onclick=async()=>{
  $('output').disabled=true;
  try{
    const state=await window.helloMotion.output(outputActive?'stop':'start');outputActive=state.active;
    await refreshOutput();
    $('output-status').textContent=outputActive?'Select HelloMotion Windows Virtual Camera in your calling app. Compatibility testing is in progress.':'Call output is off.';
  }catch(e){$('output-status').textContent=e.message;}
  finally{$('output').disabled=false;}
};
$('pattern').onclick=()=>{pattern=!pattern;$('pattern').setAttribute('aria-pressed',String(pattern));stop();if(pattern){$('placeholder').style.display='none';status('Moving test pattern · webcam is off.');}};
refreshOutput().catch(console.error);
setInterval(()=>refreshOutput().catch(console.error),3000);
const status=text=>$('status').textContent=text;
for (const [id,icon,label,gesture] of reactions) {
  const button=document.createElement('button');button.className='reaction';
  const symbol=document.createElement('span');symbol.textContent=icon;
  const title=document.createElement('div');title.textContent=label;
  const subtitle=document.createElement('small');subtitle.textContent=gesture;
  button.append(symbol,title,subtitle);button.onclick=()=>trigger(id);$('reactions').append(button);
}
function trigger(id) {
  const now=performance.now(), icon=reactions.find(r=>r[0]===id)[1];
  for(let i=0;i<(id==='rain'||id==='confetti'?90:26);i++) particles.push({id,icon,x:Math.random()*960,y:id==='rain'||id==='confetti'?-Math.random()*400:540+Math.random()*150,vx:(Math.random()-.5)*100,vy:id==='rain'?420:id==='confetti'?130:-100-Math.random()*130,born:now,life:4000+Math.random()*2000,size:20+Math.random()*30,color:['#e9a2ae','#d9bb62','#89baa7','#b4a6d1'][i%4]});
  particles=particles.slice(-400);
  status(reactions.find(r=>r[0]===id)[2]+' · '+(stream?'Camera running locally.':'Demo preview · camera is off.'));
}
async function loadModel() {
  if(!modelPromise) modelPromise=(async()=>{
    const {GestureRecognizer,FilesetResolver}=await import('../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs');
    const vision=await FilesetResolver.forVisionTasks('../node_modules/@mediapipe/tasks-vision/wasm');
    recognizer=await GestureRecognizer.createFromOptions(vision,{baseOptions:{modelAssetPath:'./models/gesture_recognizer.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2});
  })().catch(e=>{modelPromise=null;throw e;});
  return modelPromise;
}
async function toggle() {
  if(starting)return;
  if(enabled){enabled=false;gate.reset();$('gestures').textContent='Gestures off';$('gestures').setAttribute('aria-pressed','false');status('Gesture recognition paused.');return;}
  starting=true;$('gestures').disabled=true;status('Loading local gesture recognition…');
  try{await loadModel();enabled=true;gate.reset();$('gestures').textContent='Gestures on';$('gestures').setAttribute('aria-pressed','true');status(stream?'Gestures ready. Hold a pose for a moment.':'Gestures ready. Start your camera to use them.');}
  catch(e){console.error(e);status('Gesture model unavailable. See README for setup. Reaction buttons still work.');}
  finally{starting=false;$('gestures').disabled=false;}
}
$('gestures').onclick=toggle;
window.helloMotion?.onToggle(toggle);
document.addEventListener('keydown',e=>{if(!window.helloMotion&&e.ctrlKey&&e.shiftKey&&e.code==='KeyH'){e.preventDefault();toggle();}});
function stop(){window.helloMotion?.output('clear').catch(console.error);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;gate.reset();particles=[];$('placeholder').style.display='flex';$('start').textContent='Start camera';status('Camera is off. No video is being captured.');}
async function start(){
  pattern=false;$('pattern').setAttribute('aria-pressed','false');
  $('start').disabled=true;
  try{
    const selected=$('camera').value;
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:960},height:{ideal:540},frameRate:{ideal:24,max:30},...(selected?{deviceId:{exact:selected}}:{})}});
    const physicalDevices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&!d.label.includes('HelloMotion'));
    $('camera').replaceChildren(...physicalDevices.map(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Camera';return o;}));
    if(stream.getVideoTracks()[0].label.includes('HelloMotion'))throw Error('feedback');
    video.srcObject=stream;await video.play();lastVideoTime=-1;lastInference=0;
    $('placeholder').style.display='none';$('start').textContent='Stop camera';status('Camera running locally. No recording or uploads.');
    const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&!d.label.includes('HelloMotion'));
    $('camera').replaceChildren(...devices.map(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Camera';return o;}));
    $('camera').value=stream.getVideoTracks()[0].getSettings().deviceId;
    stream.getVideoTracks()[0].onended=stop;
  }catch(e){stop();status(e.message==='feedback'?'Choose your physical webcam in HelloMotion, then try again.':e.name==='NotAllowedError'?'Camera access denied. Allow camera access in Windows privacy settings.':'Could not open this camera. Close other camera apps and try again.');}
  finally{$('start').disabled=false;}
}
$('start').onclick=()=>stream?stop():start();
$('camera').onchange=async()=>{if(stream){stop();await start();}};
window.addEventListener('beforeunload',stop);
let previous=performance.now();
function frame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;ctx.clearRect(0,0,960,540);
  if(pattern){
    ctx.fillStyle='#263d33';ctx.fillRect(0,0,960,540);
    ['#e8b2c2','#dcca87','#8dbb9f','#a9bce1','#b6a6d2'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*192,0,192,320);});
    ctx.fillStyle='#fff';ctx.font='32px Segoe UI';ctx.fillText('HelloMotion · camera test',40,390);
    ctx.font='20px Segoe UI';ctx.fillText('LEFT                                      RIGHT',40,440);
    ctx.fillStyle='#c6dfb9';ctx.fillRect((now/8)%900,490,60,12);
  }
  if(stream&&video.readyState>=2){
    const scale=Math.max(960/video.videoWidth,540/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;
    ctx.save();ctx.translate(960,0);ctx.scale(-1,1);ctx.drawImage(video,(960-w)/2,(540-h)/2,w,h);ctx.restore();
    if(enabled&&recognizer&&now-lastInference>100&&lastVideoTime!==video.currentTime){
      lastInference=now;lastVideoTime=video.currentTime;
      try{const reaction=gate.update(reactionFor(recognizer.recognizeForVideo(video,now)),now);if(reaction)trigger(reaction);}
      catch(e){enabled=false;$('gestures').textContent='Gestures off';$('gestures').setAttribute('aria-pressed','false');status('Gesture recognition stopped after an error. You can retry.');console.error(e);}
    }
  }
  particles=particles.filter(p=>now-p.born<p.life);
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.min(1,(p.life-(now-p.born))/700);ctx.fillStyle=p.color;
    if(p.id==='confetti'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(now/400+p.x);ctx.fillRect(-4,-7,8,14);ctx.restore();}
    else if(p.id==='rain'){ctx.strokeStyle='#abc8e5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-5,p.y+20);ctx.stroke();}
    else{ctx.font=p.size+'px Segoe UI Emoji';ctx.fillText(p.icon,p.x,p.y);}
  }ctx.globalAlpha=1;
  if(outputActive&&!outputBusy&&now-lastOutput>1000/24){
    lastOutput=now;outputBusy=true;
    outctx.setTransform(1,0,0,1,0,0);outctx.clearRect(0,0,960,540);
    if(stream){outctx.translate(960,0);outctx.scale(-1,1);}
    if(stream||pattern)outctx.drawImage(canvas,0,0);
    window.helloMotion.frame(outctx.getImageData(0,0,960,540).data).catch(e=>{$('output-status').textContent=e.message;}).finally(()=>{outputBusy=false;});
  }
  requestAnimationFrame(frame);
}requestAnimationFrame(frame);
