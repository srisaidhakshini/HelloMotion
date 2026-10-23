let engine,canvas,context,loading;const objects=new Map();
self.onmessage=async({data})=>{
 try{
  if(data.type==='clear'){engine?.clear();objects.clear();return;}
  loading ||= import('./spatial-effects.mjs');const {SpatialEffects}=await loading;
  if(!engine){canvas=new OffscreenCanvas(960,540);context=canvas.getContext('2d');engine=new SpatialEffects(new OffscreenCanvas(960,540));}
  const keys=new Set();const effects=data.effects.map(snapshot=>{const key=snapshot.id+':'+snapshot.born;keys.add(key);let effect=objects.get(key);if(!effect){effect={};objects.set(key,effect);}Object.assign(effect,snapshot);return effect;});
  for(const key of objects.keys())if(!keys.has(key))objects.delete(key);
  context.clearRect(0,0,960,540);engine.render(context,effects,data.now);
  const bitmap=canvas.transferToImageBitmap();self.postMessage({generation:data.generation,bitmap},[bitmap]);
 }catch(error){self.postMessage({generation:data.generation,error:error.message||String(error)});}
};
