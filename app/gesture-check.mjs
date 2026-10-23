import {createDetector} from './detector-client.mjs';
import {reactionFor,classifyHands,GestureGate} from './gestures.mjs';
export async function run({only}={}){
 const recognizer=await createDetector(),source=document.createElement('canvas'),scratch=document.createElement('canvas');
 source.width=960;source.height=540;const c=source.getContext('2d');
 let singleImage;const reports=[];let timestamp=performance.now();
 const cases=[['thumbs_up',1,'thumbs'],['victory',1,'balloons'],['thumbs_down',1,null],['thumbs_up',2,'fireworks'],['victory',2,'confetti'],['thumbs_down',2,'rain'],['pointing_up',1,'sparkles'],['blank',0,null]];
 if(only==='heart_reference')cases.push(['heart_reference',1,'hearts']);
 try{
  for(const [name,copies,expected] of cases.filter(item=>!only||(item[0]===only&&(item[1]===2||only==='heart_reference')))){
   c.fillStyle='#bcbcbc';c.fillRect(0,0,960,540);
   if(copies){
    const image=new Image();image.src=new URL('../work/gesture-check/'+name+(name==='heart_reference'?'.png':'.jpg'),import.meta.url);await image.decode();singleImage=image;
    for(let i=0;i<copies;i++){
      const slot=960/copies,scale=Math.min(slot/image.width,540/image.height),x=i*slot+(slot-image.width*scale)/2;
      c.save();if(i===1){c.translate(960,0);c.scale(-1,1);}
      c.drawImage(image,copies===2&&i===1?(slot-image.width*scale)/2:x,(540-image.height*scale)/2,image.width*scale,image.height*scale);c.restore();
    }
   }
   const gate=new GestureGate();let fired=null,result;const started=performance.now();
   for(let n=0;n<20;n++){
    timestamp+=100;result=await recognizer.recognize(source,timestamp);
    fired=gate.update(reactionFor(result),timestamp)||fired;
   }
   reports.push({debug:fired!==expected?{landmarks:result.landmarks,world:result.worldLandmarks}:undefined,meanScanMs:Math.round((performance.now()-started)/20),name,copies,hands:result.landmarks.length,labels:classifyHands(result),scores:result.gestures.map(g=>({name:g[0]?.categoryName,score:Math.round(g[0]?.score*100)})),fired,expected,pass:fired===expected});
  }
 }finally{recognizer.close();}
 return reports;
}
