// main.js
// debug true启用调试、热加载
const debug = false

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const cron = require('node-cron')
const path = require('path')
const { executeTask } = require('./electron/task2')
const Database = require('./electron/database')
const fs = require('fs')
const XLSX = require('xlsx')
const { log } = require('./electron/log')
const { setMainWindow } = require('./electron/events')

// 启用热加载
if (debug) {
  try {
    require('electron-reloader')(module)
  } catch (_) {}
}
// 确保 logs 文件夹存在
const logsPath = path.join(__dirname, '.cache')
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath)
}

let db
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, './electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      partition: 'persist:appCache', // 使用持久化会话
      userData: logsPath // 指定用户数据路径
    }
  })

  mainWindow.loadFile('./html/index.html')
  if (debug) {
    // 开启调试工具
    mainWindow.webContents.openDevTools()
  }

  // 设置主窗口
  setMainWindow(mainWindow)
}

// 处理窗口控制事件
ipcMain.on('window-minimize', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.minimize()
  }
})

ipcMain.on('window-maximize', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    if (focusedWindow.isMaximized()) {
      focusedWindow.unmaximize()
    } else {
      focusedWindow.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.close()
  }
})

// 定时任务
function scheduleTask(db) {
  // 第一次执行一次，剩下的给定时任务执行
  executeTask(db)
  cron.schedule('* * * * *', async () => {
    try {
      await executeTask(db) // 调用 task.js 中的 executeTask 函数
    } catch (error) {
      log(`定时任务执行失败：${error.message}`)
      console.error('定时任务执行失败:', error)
    }
  })
}
app.whenReady().then(() => {
  db = new Database('./task.db')
  // 监听 IPC 消息以处理数据库请求 START
  ipcMain.handle('db-query', async (event, sql, params) => {
    try {
      return await db.query(sql, params)
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  })

  ipcMain.handle('db-insert', async (event, sql, params) => {
    try {
      return await db.insert(sql, params)
    } catch (error) {
      console.error('Database insert error:', error)
      throw error
    }
  })

  ipcMain.handle('db-update', async (event, sql, params) => {
    try {
      return await db.update(sql, params)
    } catch (error) {
      console.error('Database update error:', error)
      throw error
    }
  })

  ipcMain.handle('db-delete', async (event, sql, params) => {
    try {
      return await db.delete(sql, params)
    } catch (error) {
      console.error('Database delete error:', error)
      throw error
    }
  })

  ipcMain.handle('db-get', async (event, sql, params) => {
    try {
      return await db.get(sql, params)
    } catch (error) {
      console.error('Database get error:', error)
      throw error
    }
  })

  // 监听 IPC 消息以处理数据库请求 END
  createWindow()

  // 定时任务
  scheduleTask(db)

  // 打开文件选择excel文件
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    })
    return result.filePaths[0]
  })

  // 读取excel文件
  ipcMain.handle('read-excel-file', async (event, filePath) => {
    const workbook = XLSX.readFile(filePath)
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet)
    return data
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
