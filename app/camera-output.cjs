const {spawn} = require('node:child_process');
const {existsSync} = require('node:fs');
const {FrameServer,BYTES} = require('./frame-server.cjs');
class CameraOutput {
  constructor(binary){this.binary=binary;this.active=false;this.starting=false;}
  available(){return existsSync(this.binary);}
  async start(){
    if(this.active || this.starting)return this.state();
    if(!this.available())throw Error('Native camera is not built yet. Run npm run camera:build first.');
    this.starting=true;
    try{
      this.frames=new FrameServer();const endpoint=await this.frames.start();
      this.child=spawn(this.binary,[endpoint],{windowsHide:true,stdio:['pipe','pipe','pipe']});
      await new Promise((resolve,reject)=>{
        let output='',errors='';const timer=setTimeout(()=>reject(Error('Camera startup timed out.')),10000);
        const done=(err)=>{clearTimeout(timer);err?reject(err):resolve();};
        this.child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('READY'))done();});
        this.child.stderr.on('data',chunk=>errors=(errors+chunk).slice(-2000));
        this.child.once('error',done);this.child.once('exit',code=>done(Error(errors||'Camera stopped ('+code+'). Run the camera setup script as administrator.')));
      });
      this.active=true;
      const connectedFrames=this.frames;
      this.child.once('exit',()=>{this.active=false;if(this.frames===connectedFrames)this.frames=null;connectedFrames.stop().catch(console.error);});
      return this.state();
    }catch(e){await this.stop();throw e;}finally{this.starting=false;}
  }
  publish(rgba){if(!this.active)return false;if(!ArrayBuffer.isView(rgba)||rgba.BYTES_PER_ELEMENT!==1||rgba.byteLength!==BYTES)throw Error('Invalid output frame');this.frames.publish(rgba);return true;}
  clear(){this.frames?.clear();}
  state(){return {available:this.available(),active:this.active};}
  async stop(){
    this.active=false;const child=this.child;this.child=null;
    if(child && child.exitCode===null){
      await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},1500);child.once('exit',()=>{clearTimeout(timer);resolve();});child.stdin.on('error',()=>{});child.stdin.end('stop\n');});
    }
    await this.frames?.stop();this.frames=null;return this.state();
  }
}
module.exports={CameraOutput};
