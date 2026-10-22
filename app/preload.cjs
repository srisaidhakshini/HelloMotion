const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('helloMotion', {
  onToggle: fn => ipcRenderer.on('toggle-gestures', () => fn()),
  output: action => ipcRenderer.invoke('camera-output', action),
  frame: rgba => ipcRenderer.invoke('camera-frame', rgba)
});
