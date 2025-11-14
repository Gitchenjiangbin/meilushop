const { chromium } = require('playwright')
const Utils = require('./utils')
const utilsInstance = new Utils()
const { log } = require('./log')
const { sendEvent } = require('./events')

// 动态导入 p-limit
let pLimit
;(async () => {
  pLimit = await import('p-limit')
})()

const MAX_CONCURRENT_TASKS = 5
let limit

/**
 * 执行任务
 *
 * @param db 数据库对象
 * @returns 无返回值
 */
async function executeTask(db) {
  // 等待 p-limit 动态导入完成
  while (!pLimit) {
    await new Promise((resolve) => setTimeout(resolve, 100)) // 等待 100 毫秒
  }
  limit = pLimit.default(MAX_CONCURRENT_TASKS)

  log('\n\n任务开始执行...')

  // 获取可执行的任务
  const result = await db.query(
    'SELECT * FROM tasks WHERE status <> 2 ORDER BY status DESC'
  )
  if (result.length <= 0) {
    log('没有符合条件的任务。')
    return
  }

  // 筛选出符合执行条件的任务 // 第一步：处理每个任务，决定其是否符合条件
  const processedTasks = await Promise.all(
    result.map(async (task) => {
      if (task.last_execution != null) {
        const date = new Date(task.last_execution.replace(' ', 'T'))
        const timestamp = date.getTime() + 30 * 60 * 1000
        if (timestamp > Date.now()) {
          console.log(
            '任务不符[' + task.id + '](' + task.task_name + ')，跳过。'
          )
          return null // 标记为不符合条件
        }
        // 任务符合条件，更新状态
        await updateTaskStatus(db, task.id, 0)
      }
      return task // 返回符合条件的任务
    })
  )
  // 第二步：过滤掉不符合条件的任务（即 null）
  const tasksToProcess = processedTasks.filter((task) => task !== null)

  if (tasksToProcess.length <= 0) {
    console.log('没有符合条件的任务。')
    log('所有任务均不符合执行条件。')
    return
  }

  // 启动浏览器并设置全局代理
  const browser = await chromium.launch({
    headless: true,
    proxy: { server: 'http://per-context' } // 这里设置全局代理,这里随便写的值，后续会覆盖掉
  })

  try {
    for (const task of tasksToProcess) {
      // 执行每一个任务
      await processTask(db, task, browser)
    }
  } catch (error) {
    log('任务执行失败:', error)
  } finally {
    await browser.close()
    log('\n\n关闭浏览器')
  }
}

/**
 * 验证任务是否符合执行条件
 *
 * @param {*} db      数据库
 * @param {*} task    任务
 * @param {*} browser 浏览器
 * @returns
 */
async function processTask(db, task, browser) {
  if (!task) {
    return
  }
  let context = null
  try {
    context = await browser.newContext({
      proxy: { server: task.proxy_url } // 设置任务特定代理
    })
    await list(db, task, context)

    // 添加延迟
    // await new Promise((resolve) => setTimeout(resolve, 5000)) // 5秒延迟

    // 下次继续执行
    if (task.frequency == 2) {
      await db.update('UPDATE tasks SET status = ? WHERE id = ?', [3, task.id])
      sendEvent('refresh-task')
    }

    // 结束任务
    if (task.frequency == 1 && task.status != 2) {
      await db.update('UPDATE tasks SET status = ? WHERE id = ?', [2, task.id])
      sendEvent('refresh-task')
    }
  } catch (error) {
    console.log(error)
    log(`List Error:${error.message}`)
  } finally {
    if (context) {
      await context.close()
    }
  }
}

/**
 * 开始处理任务
 * @param {*} db
 * @param {*} row
 * @param {*} browser
 * @returns
 */
async function list(db, row, context) {
  log(`开始任务：${row.task_name}`)
  const url = `https://jp.mercari.com/zh-TW/user/profile/${row.merchant_id}`
  // log(`请求网址:${url}`)

  try {
    // 修改任务数据
    await db.update(
      'UPDATE tasks SET status = ?, last_execution = ? WHERE id = ?',
      [1, utilsInstance.formatTimestamp(new Date()), row.id]
    )

    const page = await context.newPage()

    // 导航到目标 URL
    await page.goto(url, { waitUntil: 'load', timeout: 600000 })

    try {
      // 增加超时时间到60秒
      await page.waitForSelector('li[data-testid="item-cell"]', {
        timeout: 60000
      })
    } catch (err) {
      console.error(`Failed to find item cells on page: ${url}`, err)
      return
    }

    // 滚动到页面底部
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight - 100) // 滚动到距离底部 100 像素的地方
    })

    // 加载所有内容，点击“もっと見る”按钮直到没有更多内容为止
    await loadMoreItems(page)

    const items = await page.evaluate((row) => {
      const result = []
      const elements = document.querySelectorAll('li[data-testid="item-cell"]')
      elements.forEach((element) => {
        const priceElement = element.querySelector('.merPrice')
        if (priceElement) {
          const spans = priceElement.querySelectorAll('span')
          if (spans.length > 1) {
            const secondSpanText = spans[1].innerText.trim()
            const priceTextWithoutComma = secondSpanText.replace(/,/g, '')
            const priceNumber = parseInt(priceTextWithoutComma, 10)
            if (
              !isNaN(priceNumber) &&
              priceNumber >= row.min_price &&
              priceNumber <= row.max_price
            ) {
              const linkElement = element.querySelector('a')
              const link = linkElement ? linkElement.href : ''
              result.push({ link: link, price: priceNumber })
            }
          }
        }
      })
      return result
    }, row)

    for (const item of items) {
      const linkPage = await context.newPage()
      await linkPage.goto(item.link, { waitUntil: 'load', timeout: 60000 })
      log(`商品详情链接:${item.link}`)
      const product_id = await linkPage.evaluate((url) => {
        const match = url.match(/\/item\/(m\d+)/)
        return match ? match[1] : 0
      }, item.link)

      try {
        await linkPage.waitForSelector('div[data-testid="icon-heart-button"]', {
          visible: true,
          timeout: 60000
        })
      } catch (error) {
        log('没有找到点赞的标签')
      }

      const heartCnt = await linkPage.evaluate(() => {
        const span = document.querySelector(
          'div[data-testid="icon-heart-button"] span.merText'
        )
        if (span) {
          let text = span.innerText.trim()
          text = text.replace(/,/g, '')
          const numberValue = Number(text)
          return isNaN(numberValue) ? 0 : numberValue
        }
        return 0
      })

      const commentCnt = await linkPage.evaluate(() => {
        const span = document.querySelector(
          'div[data-location="item_details:item_info:comment_icon_button"] span.merText'
        )
        if (span) {
          let text = span.innerText.trim()
          text = text.replace(/,/g, '')
          const numberValue = Number(text)
          return isNaN(numberValue) ? 0 : numberValue
        }
        return 0
      })

      if (heartCnt <= 0 && commentCnt <= 0) {
        log(`商品${product_id}点赞、评论数都为0，跳过`)
        await linkPage.close()
        continue // Skip to the next item
      }

      const saveData = {
        id: row.id,
        merchant_id: row.merchant_id,
        product_id: product_id,
        price: item.price,
        favorites: heartCnt,
        rating: commentCnt
      }

      await syncData(db, saveData)
      await linkPage.close()
    }
    log(`任务结束：${row.task_name}`)
  } catch (error) {
    console.error('Error:', error)
    throw new Error(`Task failed: ${error.message}`)
  }
}

// 同步数据
async function syncData(db, row) {
  const days = utilsInstance.getDateOnly(Date.now())
  const existingRecord = await db.get(
    'SELECT * FROM task_details WHERE task_id = ? AND merchant_id = ? AND product_id = ? AND days = ?',
    [row.id, row.merchant_id, row.product_id, days]
  )
  if (existingRecord) {
    const updateData = {
      updated_at: utilsInstance.formatTimestamp(Date.now()),
      favorites_added: 0,
      rating_added: 0
    }
    if (row.favorites > existingRecord.favorites) {
      updateData.favorites_added = row.favorites - existingRecord.favorites
    }
    if (row.rating > existingRecord.rating) {
      updateData.rating_added = row.rating - existingRecord.rating
    }

    const sql = `
     UPDATE task_details SET
          rating_added = ?, 
          favorites_added = ?, 
          updated_at = ?
        WHERE id = ?
    `
    await db.update(sql, [
      updateData.rating_added,
      updateData.favorites_added,
      updateData.updated_at,
      existingRecord.id
    ])
  } else {
    const sql = `INSERT INTO task_details (task_id, merchant_id, product_id, rating, favorites, price, created_at, days, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    await db.insert(sql, [
      row.id,
      row.merchant_id,
      row.product_id,
      row.rating,
      row.favorites,
      row.price,
      utilsInstance.formatTimestamp(Date.now()),
      days,
      utilsInstance.formatTimestamp(Date.now())
    ])
  }
  sendEvent('refresh-task-datails')
}

// 加载更多
async function loadMoreItems(page) {
  log('检测商品有没有分页')
  try {
    let hasMoreItems = true
    while (hasMoreItems) {
      const section = page.locator('section.no-border')
      const button = section.locator('button')
      if ((await button.count()) > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 延迟 1 秒
        await button.click()
        console.log('点击了')
        await page.waitForTimeout(2000) // 等待 2 秒
      } else {
        console.log('按钮不存在')
        hasMoreItems = false
      }
    }
  } catch (error) {
    log('ERROR: 没有查看更多的按钮')
    log(error.message)
    console.error('Failed to click load more button:', error)
  }
}

async function updateTaskStatus(db, id, status) {
  return db.update('UPDATE tasks SET status = ? WHERE id = ?', [status, id])
}

module.exports = { executeTask }
