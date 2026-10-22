export async function createRecognizer(){
  const {GestureRecognizer,FilesetResolver}=await import('../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs');
  const vision=await FilesetResolver.forVisionTasks(new URL('../node_modules/@mediapipe/tasks-vision/wasm',import.meta.url).href);
  return GestureRecognizer.createFromOptions(vision,{
    baseOptions:{modelAssetPath:new URL('./models/gesture_recognizer.task',import.meta.url).href,delegate:'CPU'},
    runningMode:'IMAGE',numHands:2,
    minHandDetectionConfidence:.4,minHandPresenceConfidence:.45,minTrackingConfidence:.5
  });
}

const regions=new WeakMap();
const handDistance=(a,b)=>Math.hypot(a[0].x-b[0].x,a[0].y-b[0].y);
export function recognizeFrame(recognizer,source,scratch,timestamp){
  const sourceWidth=source.videoWidth||source.width,sourceHeight=source.videoHeight||source.height;
  if(!sourceWidth||!sourceHeight)throw Error('Waiting for camera frames.');
  const width=Math.min(640,sourceWidth),height=Math.round(sourceHeight*width/sourceWidth);
  if(scratch.width!==width||scratch.height!==height){scratch.width=width;scratch.height=height;}
  scratch.getContext('2d',{willReadFrequently:true}).drawImage(source,0,0,width,height);
  const full=recognizer.recognize(scratch);
  if(full.landmarks.length>=2)return full;
  let state=regions.get(recognizer);
  if(!state){state={at:-Infinity,hands:[],canvas:new OffscreenCanvas(1,1)};regions.set(recognizer,state);}
  // Reacquire peripheral/smaller hands without running three scans every frame.
  if(timestamp-state.at>=350){
    state.at=timestamp;state.hands=[];
    state.canvas.width=Math.round(width/2);state.canvas.height=height;
    const c=state.canvas.getContext('2d',{willReadFrequently:true});
    for(let side=0;side<2;side++){
      c.clearRect(0,0,state.canvas.width,height);
      c.drawImage(scratch,side*width/2,0,width/2,height,0,0,state.canvas.width,height);
      const part=recognizer.recognize(state.canvas);
      const variants=[{result:part,flipped:false}];
      // Some handedness/orientation combinations produce a confident None.
      // Retry that crop mirrored rather than relaxing finger-shape rules.
      if(part.gestures.some(g=>g[0]?.categoryName==='None'||g[0]?.score<.55)){
        c.save();c.translate(state.canvas.width,0);c.scale(-1,1);
        c.drawImage(scratch,side*width/2,0,width/2,height,0,0,state.canvas.width,height);c.restore();
        variants.push({result:recognizer.recognize(state.canvas),flipped:true});
      }
      for(const {result:partial,flipped} of variants)for(let i=0;i<partial.landmarks.length;i++){
        const points=partial.landmarks[i].map(p=>({...p,x:((flipped?1-p.x:p.x)+side)/2,z:p.z/2}));
        if((side===0&&points[0].x>.46)||(side===1&&points[0].x<.54))continue;
        state.hands.push({points,gestures:partial.gestures[i],handedness:partial.handedness?.[i],world:partial.worldLandmarks?.[i]});
      }
    }
  }
  const combined=full.landmarks.map((points,i)=>({points,gestures:full.gestures[i],handedness:full.handedness?.[i],world:full.worldLandmarks?.[i]}));
  for(const hand of state.hands){
    const duplicate=combined.findIndex(h=>handDistance(h.points,hand.points)<.13);
    if(duplicate<0){if(combined.length<2)combined.push(hand);}
    else if(hand.gestures?.[0]?.categoryName!=='None'&&(combined[duplicate].gestures?.[0]?.categoryName==='None'||hand.gestures?.[0]?.score>combined[duplicate].gestures?.[0]?.score))combined[duplicate]=hand;
  }
  return {landmarks:combined.map(h=>h.points),gestures:combined.map(h=>h.gestures||[]),handedness:combined.map(h=>h.handedness||[]),worldLandmarks:combined.map(h=>h.world||[])};
}
