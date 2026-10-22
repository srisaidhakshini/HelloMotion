const { app, BrowserWindow, session, globalShortcut, ipcMain } = require('electron');
const path = require('node:path');
const {CameraOutput} = require('./camera-output.cjs');
const output=new CameraOutput(path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname,'..'),'native','bin','HelloMotionHost.exe'));
let win;
function trusted(event){return event.sender===win?.webContents && event.senderFrame===win.webContents.mainFrame;}
ipcMain.handle('camera-output',async(event,action)=>{
  if(!trusted(event))throw Error('Untrusted request');
  if(action==='start')return output.start();
  if(action==='stop')return output.stop();
  if(action==='clear'){output.clear();return output.state();}
  return output.state();
});
ipcMain.handle('camera-frame',(event,rgba)=>{
  if(!trusted(event))throw Error('Untrusted frame');
  return output.publish(rgba);
});
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(contents === win?.webContents && permission === 'media' && !details.mediaTypes?.includes('audio'));
  });
  win = new BrowserWindow({ width: 1180, height: 800, minWidth: 900, minHeight: 700, backgroundColor: '#f7f6f3', title: 'HelloMotion', webPreferences: { backgroundThrottling: false, preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'index.html'));
  if (process.argv.includes('--smoke-test') || process.argv.includes('--camera-smoke')) {
    win.webContents.once('did-finish-load', async () => {
      try {
        await win.webContents.executeJavaScript(`(async () => {
          if(document.querySelectorAll('.reaction').length !== 6) throw Error('Missing reaction buttons');
          document.querySelector('.reaction').click();
          if(!document.getElementById('status').textContent.includes('Hearts')) throw Error('Reaction failed');
          document.getElementById('gestures').click();
          const until=Date.now()+30000;
          while(document.getElementById('gestures').disabled && Date.now()<until) await new Promise(r=>setTimeout(r,100));
          if(document.getElementById('gestures').getAttribute('aria-pressed') !== 'true') throw Error(document.getElementById('status').textContent);
          document.getElementById('pattern').click();
          await new Promise(r=>setTimeout(r,150));
          if(!document.getElementById('status').textContent.includes('Moving test pattern')) throw Error('Test pattern did not start');
          const pixels=document.getElementById('canvas').getContext('2d').getImageData(5,5,1,1).data;
          if(pixels[0]!==232 || pixels[1]!==178) throw Error('Test pattern pixels missing');
          document.getElementById('pattern').click();
          if(!document.getElementById('status').textContent.includes('Camera is off')) throw Error('Pattern did not stop');
        })()`);
        console.log('PASS: desktop UI, manual reaction, local model initialization, test pattern start/stop');
        if(process.argv.includes('--camera-smoke')){
          await win.webContents.executeJavaScript(`(async()=>{
            document.getElementById('pattern').click();
            document.getElementById('output').click();
            const until=Date.now()+15000;
            while(document.getElementById('output').disabled && Date.now()<until) await new Promise(r=>setTimeout(r,100));
            if(document.getElementById('output').getAttribute('aria-pressed')!=='true') throw Error(document.getElementById('output-status').textContent);
          })()`);
          await new Promise((resolve,reject)=>require('node:child_process').execFile(path.join(__dirname,'..','native','bin','HelloMotionProbe.exe'),['--pattern'],{windowsHide:true,timeout:20000},(err,stdout,stderr)=>{console.log(stdout);err?reject(Error(stderr||err.message)):resolve();}));
          await output.stop();
          console.log('PASS: Electron canvas → IPC → pipe → Windows virtual camera');
        }
        app.exit(0);
      } catch(e) { console.error(e); app.exit(1); }
    });
  }
  globalShortcut.register('CommandOrControl+Shift+H', () => win?.webContents.send('toggle-gestures'));
});
app.on('window-all-closed', () => app.quit());
let quitting=false;
app.on('before-quit',event=>{if(!quitting){event.preventDefault();quitting=true;output.stop().finally(()=>app.quit());}});
app.on('will-quit', () => globalShortcut.unregisterAll());
