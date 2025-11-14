// electron/events.js

let mainWindow = null

function setMainWindow(window) {
  mainWindow = window
}

function sendEvent(eventName, data = null) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(eventName, data)
  } else {
    console.error('mainWindow is not set or does not have webContents.')
  }
}

module.exports = { setMainWindow, sendEvent }
