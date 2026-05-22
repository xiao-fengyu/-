import Database from 'better-sqlite3'
import { join } from 'path'

// 数据目录（运行时创建）
// 优先级：环境变量 DB_DIR > process.resourcesPath (生产) > cwd/data (开发)
const DATA_DIR = process.env.DB_DIR
  ? process.env.DB_DIR
  : process.env.NODE_ENV === 'production' && process.resourcesPath
    ? process.resourcesPath + '/data'
    : join(process.cwd(), 'data')

// Electron 渲染进程可通过 IPC 传递 userData 路径
export function setDataDir(dir: string): void {
  // 仅在数据库初始化前调用有效
  if (!db) {
    // 通过环境变量覆盖
    process.env.DB_DIR = dir
    // 注意：如果已经初始化过数据库，此设置不会生效
  }
}

const DB_PATH = join(DATA_DIR, 'e-platform.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initializeSchema(db)
    migrateSchema(db)
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
      draft_data TEXT,
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

  // 批量任务表
  database.exec(`
    CREATE TABLE IF NOT EXISTS batch_tasks (
      id TEXT PRIMARY KEY,
      name TEXT,
      platform TEXT,
      credential_id TEXT,
      provider_config TEXT,
      status TEXT DEFAULT 'importing',
      total_items INTEGER DEFAULT 0,
      completed_items INTEGER DEFAULT 0,
      failed_items INTEGER DEFAULT 0,
      import_file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 批量任务条目表
  database.exec(`
    CREATE TABLE IF NOT EXISTS batch_items (
      id TEXT PRIMARY KEY,
      batch_task_id TEXT REFERENCES batch_tasks(id),
      product_id TEXT REFERENCES products(id),
      row_number INTEGER,
      title TEXT,
      description TEXT,
      price DECIMAL(10,2),
      stock INTEGER DEFAULT 100,
      category_id TEXT,
      image_path TEXT,
      status TEXT DEFAULT 'imported',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

/** 数据库迁移（对已存在的库添加新字段） */
function migrateSchema(database: Database.Database): void {
  // products 表添加 draft_data 字段（如果不存在）
  try {
    database.exec(`ALTER TABLE products ADD COLUMN draft_data TEXT`)
  } catch {
    // 字段已存在，忽略
  }

  // products 表添加 batch_task_id 字段
  try {
    database.exec(`ALTER TABLE products ADD COLUMN batch_task_id TEXT`)
  } catch {
    // 字段已存在，忽略
  }

  // 批量任务表迁移
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS batch_tasks (
        id TEXT PRIMARY KEY,
        name TEXT,
        platform TEXT,
        credential_id TEXT,
        provider_config TEXT,
        status TEXT DEFAULT 'importing',
        total_items INTEGER DEFAULT 0,
        completed_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        import_file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch {
    // 表已存在，忽略
  }

  // 批量任务条目表迁移
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS batch_items (
        id TEXT PRIMARY KEY,
        batch_task_id TEXT REFERENCES batch_tasks(id),
        product_id TEXT REFERENCES products(id),
        row_number INTEGER,
        title TEXT,
        description TEXT,
        price DECIMAL(10,2),
        stock INTEGER DEFAULT 100,
        category_id TEXT,
        image_path TEXT,
        status TEXT DEFAULT 'imported',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch {
    // 表已存在，忽略
  }
}

// ============================================================
// 类型定义
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

export interface ProductInsert {
  title?: string
  category_id?: string
  price?: number
  stock?: number
  description?: string
  platform?: string
  status?: string
  batch_task_id?: string
}

export interface ProductUpdate {
  title?: string
  category_id?: string
  price?: number
  stock?: number
  description?: string
  platform?: string
  status?: string
}

export interface DraftData {
  goodsName?: string
  goodsDesc?: string
  categoryId?: string | number
  images?: string[]
  skus?: Array<Record<string, unknown>>
  shipmentLimitSecond?: number
  extra?: Record<string, unknown>
}

export interface BatchTaskInsert {
  id: string
  name: string
  platform?: string
  credential_id?: string
  provider_config?: string
  status?: string
  total_items?: number
  import_file_path?: string
}

export interface BatchItemInsert {
  id: string
  batch_task_id: string
  row_number: number
  title: string
  description?: string
  price?: number
  stock?: number
  category_id?: string
}

// ============================================================
// 数据库操作封装
// ============================================================

export class DatabaseService {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  /** ===== 商品 CRUD ===== */

  createProduct(data: ProductInsert): string {
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO products (id, title, category_id, price, stock, description, platform, status, batch_task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title || null,
      data.category_id || null,
      data.price || null,
      data.stock || null,
      data.description || null,
      data.platform || null,
      data.status || 'draft',
      data.batch_task_id || null,
    )
    return id
  }

  getProduct(id: string): Record<string, unknown> | undefined {
    return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown> | undefined
  }

  listProducts(status?: string): Array<Record<string, unknown>> {
    if (status) {
      return this.db.prepare('SELECT * FROM products WHERE status = ? ORDER BY updated_at DESC').all(status) as Array<Record<string, unknown>>
    }
    return this.db.prepare('SELECT * FROM products ORDER BY updated_at DESC').all() as Array<Record<string, unknown>>
  }

  updateProduct(id: string, data: ProductUpdate): void {
    const fields: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id) }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price) }
    if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.platform !== undefined) { fields.push('platform = ?'); values.push(data.platform) }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }

    if (fields.length === 0) return

    fields.push("updated_at = CURRENT_TIMESTAMP")
    values.push(id)

    this.db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  deleteProduct(id: string): void {
    // 先删除关联的 SKU 和图片
    this.db.prepare('DELETE FROM skus WHERE product_id = ?').run(id)
    this.db.prepare('DELETE FROM images WHERE product_id = ?').run(id)
    this.db.prepare('DELETE FROM products WHERE id = ?').run(id)
  }

  /** ===== 草稿操作 ===== */

  saveDraft(productId: string, data: DraftData): void {
    this.db.prepare('UPDATE products SET draft_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      JSON.stringify(data),
      productId
    )
  }

  loadDraft(productId: string): DraftData | null {
    const row = this.db.prepare('SELECT draft_data FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined
    if (!row || !row.draft_data) return null
    try {
      return JSON.parse(String(row.draft_data))
    } catch {
      return null
    }
  }

  listDrafts(): Array<Record<string, unknown>> {
    return this.db.prepare(
      `SELECT id, title, platform, status, draft_data, created_at, updated_at
       FROM products
       WHERE status = 'draft' OR draft_data IS NOT NULL
       ORDER BY updated_at DESC`
    ).all() as Array<Record<string, unknown>>
  }

  /** ===== 图片 ===== */

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

  getImages(productId?: string): Array<Record<string, unknown>> {
    if (productId) {
      return this.db.prepare('SELECT * FROM images WHERE product_id = ? ORDER BY created_at DESC').all(productId) as Array<Record<string, unknown>>
    }
    return this.db.prepare('SELECT * FROM images ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  }

  updateImageStatus(imageId: string, status: string): void {
    this.db.prepare('UPDATE images SET status = ? WHERE id = ?').run(status, imageId)
  }

  /** ===== SKU ===== */

  addSku(productId: string, data: {
    spec_name?: string; spec_value?: string; price?: number; stock?: number; image_id?: string
  }): string {
    const id = `sku_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO skus (id, product_id, spec_name, spec_value, price, stock, image_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, productId,
      data.spec_name || null,
      data.spec_value || null,
      data.price || null,
      data.stock || null,
      data.image_id || null,
    )
    return id
  }

  getSkus(productId: string): Array<Record<string, unknown>> {
    return this.db.prepare('SELECT * FROM skus WHERE product_id = ? ORDER BY id').all(productId) as Array<Record<string, unknown>>
  }

  deleteSkus(productId: string): void {
    this.db.prepare('DELETE FROM skus WHERE product_id = ?').run(productId)
  }

  /** ===== 提供商配置 ===== */

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

  getProviders(): Array<Record<string, unknown>> {
    return this.db.prepare('SELECT * FROM image_providers ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  }

  /** ===== 操作日志 ===== */

  addLog(action: string, productId: string | null, platform: string | null, status: string, message: string): void {
    this.db.prepare(
      'INSERT INTO operation_logs (action, product_id, platform, status, message) VALUES (?, ?, ?, ?, ?)'
    ).run(action, productId, platform, status, message)
  }

  getLogs(options?: {
    action?: string; platform?: string; status?: string;
    productId?: string; limit?: number; offset?: number;
  }): Array<Record<string, unknown>> {
    const conditions: string[] = []
    const values: unknown[] = []

    if (options?.action) { conditions.push('action = ?'); values.push(options.action) }
    if (options?.platform) { conditions.push('platform = ?'); values.push(options.platform) }
    if (options?.status) { conditions.push('status = ?'); values.push(options.status) }
    if (options?.productId) { conditions.push('product_id = ?'); values.push(options.productId) }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    return this.db.prepare(
      `SELECT * FROM operation_logs${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...values, limit, offset) as Array<Record<string, unknown>>
  }

  getLogCount(options?: {
    action?: string; platform?: string; status?: string;
  }): number {
    const conditions: string[] = []
    const values: unknown[] = []

    if (options?.action) { conditions.push('action = ?'); values.push(options.action) }
    if (options?.platform) { conditions.push('platform = ?'); values.push(options.platform) }
    if (options?.status) { conditions.push('status = ?'); values.push(options.status) }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    const row = this.db.prepare(`SELECT COUNT(*) as cnt FROM operation_logs${where}`).get(...values) as Record<string, unknown>
    return Number(row.cnt)
  }

  /** ===== 平台凭据 ===== */

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

  /** ===== 数据导出/导入 ===== */

  exportData(): Record<string, unknown> {
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      products: this.db.prepare('SELECT * FROM products').all(),
      skus: this.db.prepare('SELECT * FROM skus').all(),
      images: this.db.prepare('SELECT * FROM images').all(),
      providers: this.db.prepare('SELECT * FROM image_providers').all(),
      credentials: this.db.prepare('SELECT id, platform, client_id, client_secret, access_token, refresh_token, expires_at, shop_name, created_at FROM platform_credentials').all(),
      logs: this.db.prepare('SELECT * FROM operation_logs').all(),
    }
  }

  /** ===== 批量任务 ===== */

  createBatchTask(data: BatchTaskInsert): string {
    this.db.prepare(`
      INSERT INTO batch_tasks (id, name, platform, credential_id, provider_config, status, total_items, import_file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.name,
      data.platform || null,
      data.credential_id || null,
      data.provider_config || null,
      data.status || 'importing',
      data.total_items || 0,
      data.import_file_path || null,
    )
    return data.id
  }

  getBatchTask(id: string): Record<string, unknown> | undefined {
    return this.db.prepare('SELECT * FROM batch_tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined
  }

  listBatchTasks(): Array<Record<string, unknown>> {
    return this.db.prepare('SELECT * FROM batch_tasks ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  }

  updateBatchTaskStatus(id: string, status: string, completedItems?: number, failedItems?: number): void {
    const fields: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']
    const values: unknown[] = [status, id]

    if (completedItems !== undefined) { fields.push('completed_items = ?'); values.push(completedItems) }
    if (failedItems !== undefined) { fields.push('failed_items = ?'); values.push(failedItems) }

    this.db.prepare(`UPDATE batch_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  deleteBatchTask(id: string): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM batch_items WHERE batch_task_id = ?').run(id)
      this.db.prepare('DELETE FROM batch_tasks WHERE id = ?').run(id)
    })
    tx()
  }

  /** ===== 批量任务条目 ===== */

  addBatchItem(data: BatchItemInsert): string {
    this.db.prepare(`
      INSERT INTO batch_items (id, batch_task_id, row_number, title, description, price, stock, category_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'imported')
    `).run(
      data.id,
      data.batch_task_id,
      data.row_number,
      data.title || null,
      data.description || null,
      data.price || null,
      data.stock || 100,
      data.category_id || null,
    )
    return data.id
  }

  getBatchItems(batchTaskId: string): Array<Record<string, unknown>> {
    return this.db.prepare('SELECT * FROM batch_items WHERE batch_task_id = ? ORDER BY row_number').all(batchTaskId) as Array<Record<string, unknown>>
  }

  updateBatchItemStatus(id: string, status: string, extra?: { productId?: string; imagePath?: string; errorMessage?: string }): void {
    const fields: string[] = ['status = ?']
    const values: unknown[] = [status, id]

    if (extra?.productId !== undefined) { fields.push('product_id = ?'); values.push(extra.productId) }
    if (extra?.imagePath !== undefined) { fields.push('image_path = ?'); values.push(extra.imagePath) }
    if (extra?.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(extra.errorMessage) }

    this.db.prepare(`UPDATE batch_items SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  getBatchItemsByStatus(batchTaskId: string, status: string): Array<Record<string, unknown>> {
    return this.db.prepare('SELECT * FROM batch_items WHERE batch_task_id = ? AND status = ? ORDER BY row_number').all(batchTaskId, status) as Array<Record<string, unknown>>
  }

  getBatchItemCount(batchTaskId: string): { total: number; imported: number; generated: number; confirmed: number; published: number; failed: number } {
    const total = this.db.prepare('SELECT COUNT(*) as cnt FROM batch_items WHERE batch_task_id = ?').get(batchTaskId) as Record<string, unknown>
    const imported = this.db.prepare('SELECT COUNT(*) as cnt FROM batch_items WHERE batch_task_id = ? AND status = ?').get([batchTaskId, 'imported']) as Record<string, unknown>
    const generated = this.db.prepare('SELECT COUNT(*) as cnt FROM batch_items WHERE batch_task_id = ? AND status = ?').get([batchTaskId, 'generated']) as Record<string, unknown>
    const confirmed = this.db.prepare('SELECT COUNT(*) as cnt FROM batch_items WHERE batch_task_id = ? AND status = ?').get([batchTaskId, 'confirmed']) as Record<string, unknown>
    const published = this.db.prepare('SELECT COUNT(*) as cnt FROM batch_items WHERE batch_task_id = ? AND status = ?').get([batchTaskId, 'published']) as Record<string, unknown>
    const failed = this.db.prepare('SELECT COUNT(*) as cnt FROM batch_items WHERE batch_task_id = ? AND status = ?').get([batchTaskId, 'failed']) as Record<string, unknown>

    return {
      total: Number(total.cnt),
      imported: Number(imported.cnt),
      generated: Number(generated.cnt),
      confirmed: Number(confirmed.cnt),
      published: Number(published.cnt),
      failed: Number(failed.cnt),
    }
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
