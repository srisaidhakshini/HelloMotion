import {reactionFor, GestureGate, classifyHands} from './gestures.mjs';
import {ReactionEffects,handAnchor} from './effects.mjs';
import {createDetector} from './detector-client.mjs';
import {MotionGestures} from './motion-gestures.mjs';
import {REACTIONS} from './reaction-catalog.mjs';
import {pointAnchor} from './effects.mjs';
const $ = id => document.getElementById(id);
const video=$('video'), canvas=$('canvas'), ctx=canvas.getContext('2d');
const reactions=REACTIONS;
let stream, recognizer, enabled=false, starting=false, lastInference=0, modelPromise;
const gate=new GestureGate();
const motions=new MotionGestures();
let recognitionBusy=false,recognitionEpoch=0;
const effects=new ReactionEffects({background3D:true});
let lastHand=null,lastHandAt=0;
let outputActive=false, outputBusy=false, pattern=false;
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
function trigger(id,anchor) {
  const now=performance.now();
  try{effects.trigger(id,now,anchor || (now-lastHandAt<600?lastHand:null));}catch(error){status('This 3D effect could not start: '+error.message);console.error(error);return;}
  $('placeholder').style.display='none';
  status(reactions.find(r=>r[0]===id)[2]+' · '+(stream?'Camera running locally.':'Demo preview · camera is off.'));
}
async function loadModel() {
  if(!modelPromise)modelPromise=createDetector().then(value=>{recognizer=value;}).catch(e=>{modelPromise=null;throw e;});
  return modelPromise;
}
function gestureFeedback(text,progress=0){
  $('gesture-message').textContent=text;$('gesture-progress').value=progress;
}
function showDetection(result,name,now){
  const count=result.landmarks?.length||0;
  if(!count){gestureFeedback('No hands detected. Keep your full hand in view with light on it.');return;}
  const label=reactions.find(r=>r[0]===name)?.[2];
  const prefix=count+' '+(count===1?'hand':'hands')+' detected';
  if(!label&&motions.hint){gestureFeedback(prefix+' · '+motions.hint,motions.progress);return;}
  if(!label){gestureFeedback(prefix+(classifyHands(result).includes('Thumb_Down')?' · Show two thumbs down for rain.':' · Try a clear thumbs up or peace sign.'));return;}
  if(gate.latched===name){gestureFeedback(prefix+' · '+label+' sent. Relax your hands to try again.',1);return;}
  if(gate.progress>=1&&now-gate.last<gate.cooldownMs){gestureFeedback(prefix+' · '+label+' ready. Waiting for the previous reaction.',1);return;}
  gestureFeedback(prefix+' · '+label+' — hold steady…',gate.candidate===name?gate.progress:0);
}
async function toggle() {
  if(starting)return;
  if(enabled){enabled=false;recognitionEpoch++;gate.reset();motions.reset();$('gestures').textContent='Gestures off';$('gestures').setAttribute('aria-pressed','false');status('Gesture recognition paused.');gestureFeedback('Gestures are off. Enable them above to react with your hands.');return;}
  starting=true;$('gestures').disabled=true;status('Loading local gesture recognition…');gestureFeedback('Preparing hand detection…');
  try{await loadModel();enabled=true;gate.reset();motions.reset();$('gestures').textContent='Gestures on';$('gestures').setAttribute('aria-pressed','true');status(stream?'Gestures ready. Hold a pose for a moment.':'Gestures ready. Start your camera to use them.');gestureFeedback(stream?'Looking for hands…':'Gestures are on. Start your camera to use them.');}
  catch(e){console.error(e);status('Gesture model unavailable. See README for setup. Reaction buttons still work.');gestureFeedback('Hand detection could not load. Please restart HelloMotion.');}
  finally{starting=false;$('gestures').disabled=false;}
}
$('gestures').onclick=toggle;
window.helloMotion?.onToggle(toggle);
document.addEventListener('keydown',e=>{if(!window.helloMotion&&e.ctrlKey&&e.shiftKey&&e.code==='KeyH'){e.preventDefault();toggle();}});
function stop(){recognitionEpoch++;window.helloMotion?.output('clear').catch(console.error);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;gate.reset();motions.reset();effects.clear();lastHand=null;lastHandAt=0;$('placeholder').style.display='flex';$('start').textContent='Start camera';status('Camera is off. No video is being captured.');gestureFeedback(enabled?'Gestures are on. Start your camera to use them.':'Gestures are off. Enable them above to react with your hands.');}
async function start(){
  pattern=false;$('pattern').setAttribute('aria-pressed','false');
  $('start').disabled=true;
  try{
    const selected=$('camera').value;
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:960},height:{ideal:540},frameRate:{ideal:24,max:30},...(selected?{deviceId:{exact:selected}}:{})}});
    const physicalDevices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&!d.label.includes('HelloMotion'));
    $('camera').replaceChildren(...physicalDevices.map(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Camera';return o;}));
    if(stream.getVideoTracks()[0].label.includes('HelloMotion'))throw Error('feedback');
    video.srcObject=stream;await video.play();lastInference=0;
    $('placeholder').style.display='none';$('start').textContent='Stop camera';status('Camera running locally. No recording or uploads.');gestureFeedback(enabled?'Looking for hands…':'Gestures are off. Enable them above to react with your hands.');
    const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&!d.label.includes('HelloMotion'));
    $('camera').replaceChildren(...devices.map(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'Camera';return o;}));
    $('camera').value=stream.getVideoTracks()[0].getSettings().deviceId;
    stream.getVideoTracks()[0].onended=stop;
  }catch(e){stop();status(e.message==='feedback'?'Choose your physical webcam in HelloMotion, then try again.':e.name==='NotAllowedError'?'Camera access denied. Allow camera access in Windows privacy settings.':'Could not open this camera. Close other camera apps and try again.');}
  finally{$('start').disabled=false;}
}
$('start').onclick=()=>stream?stop():start();
$('camera').onchange=async()=>{if(stream){stop();await start();}};
window.addEventListener('beforeunload',()=>{enabled=false;recognitionEpoch++;stream?.getTracks().forEach(t=>t.stop());effects.dispose();recognizer?.close();});
function frame(now){
  ctx.clearRect(0,0,960,540);
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
    if(enabled&&recognizer&&!recognitionBusy&&now-lastInference>40){
      lastInference=now;recognitionBusy=true;const epoch=recognitionEpoch;
      const frameWidth=video.videoWidth,frameHeight=video.videoHeight;
      recognizer.recognize(video,now).then(result=>{
        if(!enabled||!stream||epoch!==recognitionEpoch)return;
        const received=performance.now(),name=reactionFor(result),motion=motions.update(result,received);
        let anchor=handAnchor(result,frameWidth,frameHeight);
        if(name==='sparkles'){
          const hand=Math.max(0,classifyHands(result).indexOf('Pointing_Up'));
          anchor=pointAnchor(result,[8],hand,frameWidth,frameHeight);
        }else if(motion?.id==='bloom')anchor=pointAnchor(result,[0,5,9,13,17],motion.hand,frameWidth,frameHeight);
        if(anchor){lastHand=anchor;lastHandAt=received;}
        let reaction=gate.update(name,received);
        if(!reaction&&motion)reaction=gate.commit(motion.id,received);
        if(reaction)trigger(reaction,anchor);
        if(name==='sparkles')effects.follow('sparkles',anchor,received);
        showDetection(result,reaction||name,received);
      }).catch(error=>{
        if(epoch!==recognitionEpoch||!enabled)return;
        enabled=false;recognizer?.close();recognizer=null;modelPromise=null;gate.reset();motions.reset();
        $('gestures').textContent='Gestures off';$('gestures').setAttribute('aria-pressed','false');
        status('Hand detection stopped. Enable gestures to retry.');gestureFeedback(error.message||String(error));console.error(error);
      }).finally(()=>{recognitionBusy=false;});
    }
  }
  try{effects.render(ctx,now);}catch(error){effects.clear();status('An effect could not render. Camera is still running.');console.error(error);}
  if(!stream&&!pattern&&!effects.playing)$('placeholder').style.display='flex';
  if(outputActive&&!outputBusy){
    outputBusy=true;
    outctx.setTransform(1,0,0,1,0,0);outctx.clearRect(0,0,960,540);
    if(stream){outctx.translate(960,0);outctx.scale(-1,1);}
    if(stream||pattern)outctx.drawImage(canvas,0,0);
    window.helloMotion.frame(outctx.getImageData(0,0,960,540).data).catch(e=>{$('output-status').textContent=e.message;}).finally(()=>{outputBusy=false;});
  }
}
// Camera production must continue when Windows hides/minimizes the preview.
// One timer, one IPC frame in flight, and no queued catch-up frames.
const FRAME_MS=1000/24;
function tick(){const began=performance.now();try{frame(began);}finally{setTimeout(tick,Math.max(1,FRAME_MS-(performance.now()-began)));}}
tick();
