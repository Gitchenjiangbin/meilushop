// dialogHelper.js
const { dialog } = require('electron')

class DialogHelper {
  static async showInfo(window, message) {
    await dialog.showMessageBox(window, {
      type: 'info',
      title: '信息',
      message: message || '这是一个信息对话框！',
      buttons: ['确定']
    })
  }

  static async showWarning(window, message) {
    await dialog.showMessageBox(window, {
      type: 'warning',
      title: '警告',
      message: message || '这是一个警告对话框！',
      buttons: ['确定']
    })
  }

  static async showError(window, message) {
    await dialog.showMessageBox(window, {
      type: 'error',
      title: '错误',
      message: message || '这是一个错误对话框！',
      buttons: ['确定']
    })
  }

  static async showConfirm(window, message) {
    const result = await dialog.showMessageBox(window, {
      type: 'question',
      title: '确认',
      message: message || '你确定要继续吗？',
      buttons: ['确定', '取消']
    })

    return result.response === 0 // 0 是 “确定” 按钮的索引
  }

  static async showInput(window) {
    return new Promise((resolve) => {
      const inputWindow = new BrowserWindow({
        width: 400,
        height: 200,
        parent: window,
        modal: true,
        title: '输入框',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      })

      inputWindow.loadURL(
        'data:text/html,<html><body><form id="inputForm"><label for="userInput">请输入文本:</label><input type="text" id="userInput" name="userInput"><button type="submit">提交</button></form><script>document.getElementById("inputForm").addEventListener("submit", function(event) {event.preventDefault(); window.electronBridge.sendInput(document.getElementById("userInput").value);});</script></body></html>'
      )

      ipcMain.once('input', (event, input) => {
        inputWindow.close()
        resolve(input)
      })
    })
  }
}

module.exports = DialogHelper
