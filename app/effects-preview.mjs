import {ReactionEffects} from './effects.mjs';
// Render exact animation times, independent of frame rate, without camera access.
export async function renderPreviews(){
  const ids=['hearts','thumbs','balloons','confetti','rain','fireworks'];
  const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=1338;const c=sheet.getContext('2d');
  c.fillStyle='#121e21';c.fillRect(0,0,1440,940);
  const frames=[];const metrics=[];
  for(let i=0;i<ids.length;i++){
    const id=ids[i],canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const cx=canvas.getContext('2d');
    const e=new ReactionEffects();e.trigger(id,0,{x:480,y:355},42);
    const time={hearts:1350,thumbs:1100,balloons:3000,confetti:1300,rain:1900,fireworks:2300}[id];
    function background(){const g=cx.createLinearGradient(0,0,960,540);g.addColorStop(0,'#182c30');g.addColorStop(1,'#3f5858');cx.fillStyle=g;cx.fillRect(0,0,960,540);}
    background();const baseline=cx.getImageData(0,0,960,540).data.slice();e.render(cx,time);
    const pixels=cx.getImageData(0,0,960,540).data;let changed=0;for(let p=0;p<pixels.length;p+=4)if(Math.abs(pixels[p]-baseline[p])+Math.abs(pixels[p+1]-baseline[p+1])+Math.abs(pixels[p+2]-baseline[p+2])>20)changed++;
    if(changed<400)throw Error(id+' did not render visible artwork');
    const started=performance.now();for(let k=0;k<45;k++){background();e.render(cx,time+k*16);}metrics.push({id,changedPixels:changed,meanRenderMs:Math.round((performance.now()-started)/45*100)/100});
    background();e.render(cx,time);
    frames.push({id,data:canvas.toDataURL('image/png')});e.render(cx,9000);if(e.playing)throw Error(id+' did not retire');
    const x=(i%2)*720,y=Math.floor(i/2)*446;c.drawImage(canvas,x+12,y+38,696,391.5);
    c.fillStyle='#e9f2ed';c.font='17px Segoe UI';c.fillText(id[0].toUpperCase()+id.slice(1),x+20,y+27);
  }
  const film=document.createElement('canvas');film.width=1440;film.height=1320;const f=film.getContext('2d');f.fillStyle='#121e21';f.fillRect(0,0,1440,1320);
  for(let i=0;i<12;i++){
    const id=i<6?'hearts':'fireworks',t=[300,700,1200,1800,2500,3400][i%6],small=document.createElement('canvas');small.width=960;small.height=540;const q=small.getContext('2d');q.fillStyle='#23383c';q.fillRect(0,0,960,540);const e=new ReactionEffects();e.trigger(id,0,{x:480,y:355},42);e.render(q,t);
    const x=i%3*480,y=Math.floor(i/3)*330;f.drawImage(small,x+8,y+30,464,261);f.fillStyle='#e9f2ed';f.font='16px Segoe UI';f.fillText(id+' · '+(t/1000).toFixed(1)+'s',x+15,y+22);
  }
  return {sheet:sheet.toDataURL('image/png'),film:film.toDataURL('image/png'),frames,metrics};
}
