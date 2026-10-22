export async function createDetector(){
  const worker=new Worker(new URL('./gesture-worker.js',import.meta.url));
  let nextId=0,closed=false,pending=null,initResolve,initReject;
  const ready=new Promise((resolve,reject)=>{initResolve=resolve;initReject=reject;});
  const startup=setTimeout(()=>{initReject(Error('Hand detection took too long to load.'));worker.terminate();},15000);
  function fail(error){clearTimeout(startup);initReject(error);if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}}
  worker.onmessage=({data})=>{
    if(data.type==='ready'){clearTimeout(startup);initResolve();return;}
    if(data.type==='error'){fail(Error(data.message));return;}
    if(data.type==='result'&&pending?.id===data.id){const current=pending;pending=null;clearTimeout(current.timer);current.resolve(data.result);}
  };
  worker.onerror=event=>fail(Error(event.message||'Hand detection worker stopped.'));
  try{await ready;}catch(error){worker.terminate();throw error;}
  return {
    async recognize(source,timestamp){
      if(closed)throw Error('Hand detection is closed.');
      if(pending)throw Error('A frame is already being processed.');
      const bitmap=await createImageBitmap(source);
      if(closed){bitmap.close();throw Error('Hand detection is closed.');}
      return new Promise((resolve,reject)=>{
        const id=++nextId,timer=setTimeout(()=>{if(pending?.id===id){pending=null;reject(Error('Hand detection stalled. Please enable gestures again.'));}},10000);
        pending={id,timer,resolve,reject};
        try{worker.postMessage({type:'frame',id,bitmap,timestamp},[bitmap]);}catch(error){clearTimeout(timer);pending=null;bitmap.close();reject(error);}
      });
    },
    close(){closed=true;worker.terminate();fail(Error('Hand detection closed.'));}
  };
}
