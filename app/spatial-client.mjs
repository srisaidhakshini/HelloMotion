// Bounded latest-frame rendering: camera frames never wait for 3D setup or shaders.
export class SpatialEffectsClient {
 constructor(){
  this.worker=new Worker(new URL('./spatial-worker.js',import.meta.url));this.busy=false;this.generation=0;this.bitmap=null;this.error=null;
  this.worker.onmessage=({data})=>{
   this.busy=false;
   if(data.error){this.error=Error(data.error);return;}
   if(data.generation!==this.generation){data.bitmap?.close();return;}
   this.bitmap?.close();this.bitmap=data.bitmap;
  };
  this.worker.onerror=event=>{this.busy=false;this.error=Error(event.message||'3D rendering worker stopped');};
 }
 render(context,effects,now){
  if(this.error&&effects.length)throw this.error;
  // Do not keep an expired effect in the composited output.
  const signature=effects.map(e=>e.id+':'+e.born).join('|');
  if(signature!==this.signature){this.generation++;this.signature=signature;this.bitmap?.close();this.bitmap=null;}
  if(this.bitmap&&effects.length)context.drawImage(this.bitmap,0,0,960,540);
  if(this.busy||!effects.length)return;
  this.busy=true;
  this.worker.postMessage({type:'render',generation:this.generation,now,effects:effects.map(({id,born,anchor,life,parameters,target,tracking,followUntil})=>({id,born,anchor,life,parameters,target,tracking,followUntil}))});
 }
 clear(){this.generation++;this.signature='';this.bitmap?.close();this.bitmap=null;this.worker.postMessage({type:'clear'});}
 dispose(){this.worker.terminate();this.bitmap?.close();this.bitmap=null;}
}
