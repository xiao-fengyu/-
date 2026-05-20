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

// ============================================================
// 数据库操作封装
// ============================================================

export interface ImageInsert {
  product_id: string | null
  local_path: string
  url: string
  type: string
  provider: string
  prompt: string
  status: string
  width: number
  height: number
  file_size: number
}

export class DatabaseService {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  /** 添加图片记录 */
  addImage(data: ImageInsert): string {
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO images (id, product_id, local_path, url, type, provider, prompt, status, width, height, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.product_id,
      data.local_path,
      data.url,
      data.type,
      data.provider,
      data.prompt,
      data.status,
      data.width,
      data.height,
      data.file_size
    )
    return id
  }

  /** 获取所有图片 */
  getImages(productId?: string): Array<Record<string, unknown>> {
    if (productId) {
      return this.db.prepare('SELECT * FROM images WHERE product_id = ? ORDER BY created_at DESC').all(productId) as Array<Record<string, unknown>>
    }
    return this.db.prepare('SELECT * FROM images ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  }

  /** 更新图片状态 */
  updateImageStatus(imageId: string, status: string): void {
    this.db.prepare('UPDATE images SET status = ? WHERE id = ?').run(status, imageId)
  }

  /** 保存提供商配置 */
  saveProvider(config: {
    id: string; name: string; type: string; endpoint: string;
    api_key: string; model: string; max_images: number;
    default_params: string; is_default: number;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO image_providers (id, name, type, endpoint, api_key, model, max_images, default_params, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      config.id, config.name, config.type, config.endpoint,
      config.api_key, config.model, config.max_images,
      config.default_params, config.is_default
    )
  }

  /** 获取所有提供商 */
  getProviders(): Array<Record<string, unknown>> {
    return this.db.prepare('SELECT * FROM image_providers ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  }

  /** 添加操作日志 */
  addLog(action: string, productId: string | null, platform: string | null, status: string, message: string): void {
    this.db.prepare(
      'INSERT INTO operation_logs (action, product_id, platform, status, message) VALUES (?, ?, ?, ?, ?)'
    ).run(action, productId, platform, status, message)
  }

  // ===== 平台凭据 =====

  savePlatformCredential(data: {
    id: string; platform: string; client_id: string;
    client_secret: string; access_token?: string;
    refresh_token?: string; expires_at?: string; shop_name?: string;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO platform_credentials
      (id, platform, client_id, client_secret, access_token, refresh_token, expires_at, shop_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.platform, data.client_id, data.client_secret,
      data.access_token || null, data.refresh_token || null,
      data.expires_at || null, data.shop_name || null
    )
  }

  getPlatformCredential(id: string): Record<string, unknown> | undefined {
    return this.db.prepare('SELECT * FROM platform_credentials WHERE id = ?').get(id) as Record<string, unknown> | undefined
  }

  getPlatformCredentials(platform?: string): Array<Record<string, unknown>> {
    if (platform) {
      return this.db.prepare('SELECT * FROM platform_credentials WHERE platform = ? ORDER BY created_at DESC').all(platform) as Array<Record<string, unknown>>
    }
    return this.db.prepare('SELECT id, platform, shop_name, access_token, expires_at, created_at FROM platform_credentials ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  }

  deletePlatformCredential(id: string): void {
    this.db.prepare('DELETE FROM platform_credentials WHERE id = ?').run(id)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
