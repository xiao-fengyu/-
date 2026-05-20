import Database from 'better-sqlite3'
import { join } from 'path'

// 数据目录（运行时创建）
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? join(process.resourcesPath, 'data')
  : join(process.cwd(), 'data')

const DB_PATH = join(DATA_DIR, 'e-platform.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initializeSchema(db)
  }
  return db
}

function initializeSchema(database: Database.Database): void {
  // 商品表
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT,
      category_id TEXT,
      price DECIMAL(10,2),
      stock INTEGER,
      description TEXT,
      status TEXT DEFAULT 'draft',
      platform TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // SKU 表
  database.exec(`
    CREATE TABLE IF NOT EXISTS skus (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      spec_name TEXT,
      spec_value TEXT,
      price DECIMAL(10,2),
      stock INTEGER,
      image_id TEXT
    )
  `)

  // 图片表
  database.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      local_path TEXT,
      url TEXT,
      type TEXT,
      provider TEXT,
      prompt TEXT,
      status TEXT DEFAULT 'generated',
      width INTEGER,
      height INTEGER,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // AI 提供商配置
  database.exec(`
    CREATE TABLE IF NOT EXISTS image_providers (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      endpoint TEXT,
      api_key TEXT,
      model TEXT,
      max_images INTEGER,
      default_params TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 平台授权凭据
  database.exec(`
    CREATE TABLE IF NOT EXISTS platform_credentials (
      id TEXT PRIMARY KEY,
      platform TEXT,
      client_id TEXT,
      client_secret TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at DATETIME,
      shop_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 操作日志
  database.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      product_id TEXT,
      platform TEXT,
      status TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
