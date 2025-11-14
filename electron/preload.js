// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readExcelFile: (filePath) => ipcRenderer.invoke('read-excel-file', filePath),
  on: (channel, callback) => ipcRenderer.on(channel, callback)
})
contextBridge.exposeInMainWorld('db', {
  query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  insert: (sql, params) => ipcRenderer.invoke('db-insert', sql, params),
  update: (sql, params) => ipcRenderer.invoke('db-update', sql, params),
  delete: (sql, params) => ipcRenderer.invoke('db-delete', sql, params),
  get: (sql, params) => ipcRenderer.invoke('db-get', sql, params)
})
