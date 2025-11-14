// Database.js
const sqlite3 = require('sqlite3').verbose()

class Database {
  constructor(dbFile) {
    this.db = new sqlite3.Database(dbFile, (err) => {
      if (err) {
        console.error('Could not connect to database:', err.message)
      } else {
        console.log('Connected to the SQLite database.')
        this.createTables()
      }
    })
  }

  // 创建表
  createTable(sql) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve('Table created successfully.')
        }
      })
    })
  }

  // 创建所需的表
  async createTables() {
    // 任务表
    const createTasksTableSQL = `
          CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 自动生成的唯一标识符
            task_name TEXT,                -- 任务名称，使用文本格式
            merchant_id INTEGER NOT NULL,          -- 商家ID
            min_price INTEGER,             -- 价格区间最小值，使用整型
            max_price INTEGER,             -- 价格区间最大值，使用整型
            schedule_type INTEGER,         -- 定时任务类型，使用整型
            proxy_url TEXT,                -- 代理地址，使用文本格式
            frequency INTEGER,             -- 频率，使用整型
            status INTEGER DEFAULT 0,  -- 设置默认值为0
            create_time TEXT,              -- 创建时间，使用文本格式存储日期时间
            last_execution TEXT                    -- 上次执行时间，使用文本格式存储日期时间
          );
        `
    // 任务详情表
    const createTasksDetailsTableSQL = `
          CREATE TABLE IF NOT EXISTS task_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,                     -- 自动生成的唯一标识符
            task_id INTEGER NOT NULL,                                 -- 任务ID，整型
            merchant_id INTEGER NOT NULL,                             -- 商家ID
            product_id INTEGER NOT NULL,                              -- 商品ID，整型
            rating INTEGER NOT NULL DEFAULT 0 ,                       -- 评价，整型
            favorites INTEGER NOT NULL DEFAULT 0,                     -- 收藏，整型
            rating_added INTEGER NOT NULL DEFAULT 0,                  -- 评价新增，整型
            favorites_added INTEGER NOT NULL DEFAULT 0,               -- 收藏新增，整型
            price REAL NOT NULL DEFAULT 0,                            -- 价格，浮点型
            days TEXT,                                                -- 年月日
            created_at TEXT NOT NULL DEFAULT (datetime('now')),       -- 创建时间，文本格式存储日期时间
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))        -- 最新更新时间，文本格式存储日期时间
          );
          `

    const createProxyTableSQL = `
          CREATE TABLE IF NOT EXISTS proxy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,                     -- 自动生成的唯一标识符
            proxy_url TEXT NOT NULL                              -- 代理地址，使用文本格式
          );
          `
    try {
      await this.createTable(createTasksTableSQL)
      await this.createTable(createTasksDetailsTableSQL)
      await this.createTable(createProxyTableSQL)
      console.log('Tasks table is ready.')
    } catch (error) {
      console.error('Error creating tables:', error.message)
    }
  }

  // 插入数据
  insert(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve(`Row inserted with ID ${this.lastID}`)
        }
      })
    })
  }

  // 查询单条数据
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }
  // 查询数据
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // 更新数据
  update(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve(`Rows updated ${this.changes}`)
        }
      })
    })
  }

  // 删除数据
  delete(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve(`Rows deleted ${this.changes}`)
        }
      })
    })
  }

  // 关闭数据库
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve('Database closed successfully.')
        }
      })
    })
  }
}

module.exports = Database
