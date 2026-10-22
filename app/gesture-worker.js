// Classic worker so the local MediaPipe Wasm loader can use importScripts.
let recognizer,canvas;
const loading=import('./recognition.mjs').then(async module=>{
  recognizer=await module.createRecognizer();canvas=new OffscreenCanvas(1,1);
  self.postMessage({type:'ready'});return module;
}).catch(error=>{self.postMessage({type:'error',message:error.message||String(error)});throw error;});
self.onmessage=async({data})=>{
  if(data.type!=='frame')return;
  const started=performance.now();
  try{
    const module=await loading;
    const result=module.recognizeFrame(recognizer,data.bitmap,canvas,data.timestamp);
    self.postMessage({type:'result',id:data.id,result,scanMs:performance.now()-started});
  }catch(error){self.postMessage({type:'error',id:data.id,message:error.message||String(error)});}
  finally{data.bitmap.close();}
};
