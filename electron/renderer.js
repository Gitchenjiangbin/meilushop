// renderer.js
const minimizeButton = document.getElementById('minimize')
const maximizeButton = document.getElementById('maximize')
const closeButton = document.getElementById('close')
const maximizeIcon = document.getElementById('maximize-icon')

minimizeButton.addEventListener('click', () => {
  window.electron.minimize()
})

maximizeButton.addEventListener('click', () => {
  if (maximizeIcon.classList.contains('bi-arrows-angle-expand')) {
    maximizeIcon.classList.remove('bi-arrows-angle-expand')
    maximizeIcon.classList.add('bi-arrows-angle-contract')
  } else {
    maximizeIcon.classList.remove('bi-arrows-angle-contract')
    maximizeIcon.classList.add('bi-arrows-angle-expand')
  }
  window.electron.maximize()
})

closeButton.addEventListener('click', () => {
  window.electron.close()
})

// 查询数据库
async function queryDatabase(sql, params) {
  try {
    const result = await ipcRenderer.invoke('db-query', sql, params)
    console.log('Query result:', result)
    return result
  } catch (error) {
    console.error('Query error:', error)
  }
}

// 插入数据
async function insertDatabase(sql, params) {
  try {
    const result = await ipcRenderer.invoke('db-insert', sql, params)
    console.log('Insert result:', result)
    return result
  } catch (error) {
    console.error('Insert error:', error)
  }
}

// 更新数据
async function updateDatabase(sql, params) {
  try {
    const result = await ipcRenderer.invoke('db-update', sql, params)
    console.log('Update result:', result)
    return result
  } catch (error) {
    console.error('Update error:', error)
  }
}

// 删除数据
async function deleteDatabase(sql, params) {
  try {
    const result = await ipcRenderer.invoke('db-delete', sql, params)
    console.log('Delete result:', result)
    return result
  } catch (error) {
    console.error('Delete error:', error)
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

async function showInfo(message) {
  await ipcRenderer.invoke('show-info', message)
}

async function showWarning(message) {
  await ipcRenderer.invoke('show-warning', message)
}

async function showError(message) {
  await ipcRenderer.invoke('show-error', message)
}

async function showConfirm(message) {
  return await ipcRenderer.invoke('show-confirm', message)
}

async function showInput(message) {
  return await ipcRenderer.invoke('show-input', message)
}

// 监听主进程发送的刷新数据事件
window.electron.on('refresh-data', () => {
  console.log('Refreshing data due to file change')
  fetchData() // 调用函数刷新数据
})

// 设置上次刷新时间戳
let lastRefreshTaskTimestamp = Date.now()
// 最小刷新间隔（例如 1000 毫秒，即 1 秒）
const minRefreshTaskInterval = 10000
// 刷新任务状态
window.electron.on('refresh-task', () => {
  const currentTimestamp = Date.now()
  const timeSinceLastRefresh = currentTimestamp - lastRefreshTaskTimestamp
  if (timeSinceLastRefresh >= minRefreshTaskInterval) {
    if (document.querySelector('#meilu-task')) {
      console.log('refresh-task')
      fetchDataList()
      // 更新最后刷新时间戳
      lastRefreshTaskTimestamp = currentTimestamp
    }
  }
})

// 设置上次刷新时间戳
let lastRefreshTaskDetailTimestamp = Date.now()
// 最小刷新间隔（例如 1000 毫秒，即 1 秒）
const minRefreshTaskDetailInterval = 10000
// 刷新任务详情状态
window.electron.on('refresh-task-datails', () => {
  const currentDatailTimestamp = Date.now()
  console.log(currentDatailTimestamp)
  const timeSinceLastDtailRefresh =
    currentDatailTimestamp - lastRefreshTaskDetailTimestamp
  if (timeSinceLastDtailRefresh >= minRefreshTaskDetailInterval) {
    if (document.querySelector('#meilu-data')) {
      console.log('refresh-task-details')
      fetchData()
      // 更新最后刷新时间戳
      lastRefreshTaskDetailTimestamp = currentDatailTimestamp
    }
  }
})

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#meilu-task')) {
    fetchDataList() // 初始化数据
  }
  if (document.querySelector('#meilu-data')) {
    fetchData() // 初始化数据
  }
})
