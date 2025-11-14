const fs = require('fs')
const path = require('path')

/**
 * 获取当前日期，格式为YYYY-MM-DD
 *
 * @returns 返回当前日期字符串
 */
const getCurrentDate = () => {
  const date = new Date()
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

/**
 * 格式化日期为字符串
 *
 * @param date 日期对象
 * @returns 返回格式化后的日期字符串，格式为 "yyyy-MM-dd HH:mm:ss"
 */
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 创建日志文件，文件名包含当前日期
const logFileName = `run-log-${getCurrentDate()}.log`
const logDir = process.cwd() // 如果没有设置LOG_DIR，则使用 process.cwd()
const logFilePath = path.join(logDir, logFileName)

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  console.log(`创建日志目录：${logDir}`)
  fs.mkdirSync(logDir, { recursive: true })
}

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' })
/**
 * 日志记录函数
 *
 * @param message 日志消息内容，支持字符串和对象类型
 *                  如果传入对象为null或者不是对象，则直接记录字符串
 *                  如果传入对象为对象，则将其转换为JSON字符串后记录
 * @returns 无返回值
 */
function log(message) {
  const timestamp = formatDate(new Date())
  if (typeof message === 'object' && message !== null) {
    try {
      message = JSON.stringify(message, null, 2)
    } catch (errs) {
      message = `无法序列化的对象: ${errs.message}`
    }
  }
  logStream.write(`${timestamp} - ${message}\n`)
}

function clearLogFile() {
  return new Promise((resolve, reject) => {
    fs.truncate(logFilePath, 0, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

// 导出日志函数
module.exports = { log, clearLogFile }
