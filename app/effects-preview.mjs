import {ReactionEffects} from './effects.mjs';
import {REACTIONS} from './reaction-catalog.mjs';
const times={hearts:1350,thumbs:1100,balloons:3000,confetti:1300,rain:1900,fireworks:2300,bloom:2600,butterflies:2300,sparkles:2000,ribbons:2400};
function backdrop(c){const g=c.createLinearGradient(0,0,960,540);g.addColorStop(0,'#15262e');g.addColorStop(.5,'#2a4148');g.addColorStop(1,'#3a555a');c.fillStyle=g;c.fillRect(0,0,960,540);}
export async function renderPreviews(){
  const effects=new ReactionEffects(),sheet=document.createElement('canvas');sheet.width=1440;sheet.height=446*5;
  const c=sheet.getContext('2d');c.fillStyle='#121e21';c.fillRect(0,0,sheet.width,sheet.height);
  const newSheet=document.createElement('canvas');newSheet.width=1440;newSheet.height=892;const nc=newSheet.getContext('2d');nc.fillStyle='#121e21';nc.fillRect(0,0,1440,892);
  const frame=document.createElement('canvas');frame.width=960;frame.height=540;const q=frame.getContext('2d');const frames=[],metrics=[];
  try{
    for(let i=0;i<REACTIONS.length;i++){
      const [id,,label]=REACTIONS[i];effects.clear();effects.trigger(id,0,{x:480,y:375},42);
      backdrop(q);const baseline=q.getImageData(0,0,960,540).data.slice();effects.render(q,times[id]);
      const pixels=q.getImageData(0,0,960,540).data;let changed=0;for(let p=0;p<pixels.length;p+=4)if(Math.abs(pixels[p]-baseline[p])+Math.abs(pixels[p+1]-baseline[p+1])+Math.abs(pixels[p+2]-baseline[p+2])>20)changed++;
      if(changed<400)throw Error(id+' did not render visible artwork');
      const started=performance.now();for(let k=0;k<20;k++){backdrop(q);effects.render(q,times[id]+k*16);}
      metrics.push({id,changedPixels:changed,meanRenderMs:Math.round((performance.now()-started)/20*100)/100,triangles:effects.depth?.renderer.info.render.triangles||0});
      backdrop(q);effects.render(q,times[id]);frames.push({id,data:frame.toDataURL('image/png')});
      const x=i%2*720,y=Math.floor(i/2)*446;c.drawImage(frame,x+12,y+38,696,391.5);c.fillStyle='#e9f2ed';c.font='17px Segoe UI';c.fillText(label,x+20,y+27);
      if(i>=6){const n=i-6,x=n%2*720,y=Math.floor(n/2)*446;nc.drawImage(frame,x+12,y+38,696,391.5);nc.fillStyle='#e9f2ed';nc.font='17px Segoe UI';nc.fillText(label,x+20,y+27);}
      effects.render(q,9000);if(effects.playing)throw Error(id+' did not retire');
    }
    const film=document.createElement('canvas');film.width=1440;film.height=960;const f=film.getContext('2d');f.fillStyle='#121e21';f.fillRect(0,0,1440,960);
    const ids=['bloom','butterflies','sparkles','ribbons'];
    for(let row=0;row<4;row++){
      const id=ids[row];effects.clear();effects.trigger(id,0,{x:480,y:375},42);
      for(let k=0;k<4;k++){const t=[350,1000,1900,3000][k];backdrop(q);effects.render(q,t);const x=k*360,y=row*240;f.drawImage(frame,x+6,y+29,348,195.75);f.fillStyle='#e9f2ed';f.font='15px Segoe UI';f.fillText(id+' · '+(t/1000).toFixed(1)+'s',x+12,y+22);}
    }
    effects.clear();effects.trigger('sparkles',0,{x:480,y:375},42);
    for(let t=0;t<=8000;t+=200){effects.follow('sparkles',{x:350+Math.sin(t/500)*100,y:250},t);backdrop(q);effects.render(q,t);}
    if(!effects.playing)throw Error('Tracked sparkles expired while the hand was still pointing');
    effects.render(q,9500);if(effects.playing)throw Error('Tracked sparkles did not expire after hand release');
    effects.clear();for(const id of ids)effects.trigger(id,0,{x:480,y:375},42);
    backdrop(q);effects.render(q,2000);if(effects.active.length>3)throw Error('Concurrent effect limit failed');
    effects.clear();if(effects.depth?.instances.size)throw Error('3D scene cleanup failed');
    if(effects.depth?.cache.size>4)throw Error('3D cache exceeded its bound');
    return {sheet:sheet.toDataURL('image/png'),newSheet:newSheet.toDataURL('image/png'),film:film.toDataURL('image/png'),frames,metrics};
  }finally{effects.dispose();}
}
export async function recordDemo(){
  const frame=document.createElement('canvas');frame.width=960;frame.height=540;const q=frame.getContext('2d');
  const output=document.createElement('canvas');output.width=960;output.height=600;const c=output.getContext('2d');
  const stream=output.captureStream(24),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3000000}),chunks=[];
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  const completed=new Promise(resolve=>recorder.onstop=()=>resolve());const effects=new ReactionEffects();let current=-1;
  recorder.start(1000);const started=performance.now();
  await new Promise((resolve,reject)=>{
    function tick(now){try{
      const elapsed=(now-started)/1000,index=Math.min(3,Math.floor(elapsed/6));
      if(elapsed>=24){recorder.stop();resolve();return;}
      const reaction=REACTIONS[index+6];if(index!==current){effects.clear();effects.trigger(reaction[0],index*6000,{x:480,y:375},42);current=index;}
      backdrop(q);effects.render(q,elapsed*1000);c.fillStyle='#111f26';c.fillRect(0,0,960,600);c.drawImage(frame,0,60);
      c.fillStyle='#f3f2ec';c.font='22px Segoe UI';c.fillText('HelloMotion · '+reaction[2],24,37);c.fillStyle='#aac5c9';c.font='14px Segoe UI';c.textAlign='right';c.fillText(reaction[3],935,35);c.textAlign='left';requestAnimationFrame(tick);
    }catch(error){recorder.stop();reject(error);}}
    requestAnimationFrame(tick);
  });
  await completed;effects.dispose();stream.getTracks().forEach(t=>t.stop());
  return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(new Blob(chunks,{type:mime}));});
}
