// ============================================================
// 数据备份路由 — 导出 / 导入
// ============================================================

import * as express from 'express'
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { DatabaseService } from '../services/database'

const router = express.Router()

const BACKUP_DIR = process.env.DB_DIR
  ? join(process.env.DB_DIR, 'backups')
  : (process.env.NODE_ENV === 'production'
    ? join(process.resourcesPath || process.cwd(), 'data', 'backups')
    : join(process.cwd(), 'data', 'backups'))

// 确保备份目录存在
function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

// ===== 导出数据 =====
router.post('/export', (_req, res) => {
  try {
    const db = new DatabaseService()
    const data = db.exportData()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `e-platform-backup-${timestamp}.json`

    ensureBackupDir()
    const filepath = join(BACKUP_DIR, filename)
    writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')

    // 同时记录日志
    db.addLog('backup_export', null, null, 'success', `数据导出: ${filename}`)

    res.json({
      success: true,
      filename,
      path: filepath,
      stats: {
        products: (data.products as Array<unknown>).length,
        images: (data.images as Array<unknown>).length,
        providers: (data.providers as Array<unknown>).length,
        logs: (data.logs as Array<unknown>).length,
      },
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '导出数据失败' })
  }
})

// ===== 导入数据 =====
router.post('/import', (req, res) => {
  try {
    const { filepath } = req.body
    if (!filepath) return res.status(400).json({ error: '缺少 filepath 参数' })

    let rawData: string
    try {
      rawData = readFileSync(filepath, 'utf-8')
    } catch {
      return res.status(400).json({ error: '无法读取文件: ' + filepath })
    }

    let backup: Record<string, unknown>
    try {
      backup = JSON.parse(rawData)
    } catch {
      return res.status(400).json({ error: 'JSON 格式无效' })
    }

    if (!backup.version || backup.version !== 1) {
      return res.status(400).json({ error: '不支持的备份版本' })
    }

    const db = new DatabaseService()

    // 导入提供商
    if (Array.isArray(backup.providers)) {
      for (const p of backup.providers) {
        const provider = p as Record<string, unknown>
        db.saveProvider({
          id: String(provider.id || ''),
          name: String(provider.name || ''),
          type: String(provider.type || ''),
          endpoint: String(provider.endpoint || ''),
          api_key: String(provider.api_key || ''),
          model: String(provider.model || ''),
          max_images: Number(provider.max_images || 1),
          default_params: String(provider.default_params || '{}'),
          is_default: Number(provider.is_default || 0),
        })
      }
    }

    // 导入凭据（保留敏感字段）
    if (Array.isArray(backup.credentials)) {
      const credentials = backup.credentials as Array<Record<string, unknown>>
      for (const c of credentials) {
        db.savePlatformCredential({
          id: String(c.id || ''),
          platform: String(c.platform || ''),
          client_id: String(c.client_id || ''),
          client_secret: String(c.client_secret || ''),
          access_token: c.access_token ? String(c.access_token) : undefined,
          refresh_token: c.refresh_token ? String(c.refresh_token) : undefined,
          expires_at: c.expires_at ? String(c.expires_at) : undefined,
          shop_name: c.shop_name ? String(c.shop_name) : undefined,
        })
      }
    }

    // 导入商品
    if (Array.isArray(backup.products)) {
      for (const p of backup.products) {
        const product = p as Record<string, unknown>
        db.createProduct({
          title: product.title ? String(product.title) : undefined,
          category_id: product.category_id ? String(product.category_id) : undefined,
          price: product.price ? Number(product.price) : undefined,
          stock: product.stock ? Number(product.stock) : undefined,
          description: product.description ? String(product.description) : undefined,
          platform: product.platform ? String(product.platform) : undefined,
          status: product.status ? String(product.status) : undefined,
        })
      }
    }

    // 导入图片
    if (Array.isArray(backup.images)) {
      for (const img of backup.images) {
        const image = img as Record<string, unknown>
        db.addImage({
          product_id: image.product_id ? String(image.product_id) : null,
          local_path: String(image.local_path || ''),
          url: String(image.url || ''),
          type: String(image.type || ''),
          provider: String(image.provider || ''),
          prompt: String(image.prompt || ''),
          status: String(image.status || 'generated'),
          width: Number(image.width || 0),
          height: Number(image.height || 0),
          file_size: Number(image.file_size || 0),
        })
      }
    }

    // 导入日志
    if (Array.isArray(backup.logs)) {
      for (const log of backup.logs) {
        const entry = log as Record<string, unknown>
        db.addLog(
          String(entry.action || ''),
          entry.product_id ? String(entry.product_id) : null,
          entry.platform ? String(entry.platform) : null,
          String(entry.status || ''),
          String(entry.message || ''),
        )
      }
    }

    res.json({ success: true, message: '数据导入完成' })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '导入数据失败' })
  }
})

// ===== 列出备份文件 =====
router.get('/list', (_req, res) => {
  try {
    ensureBackupDir()
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()

    res.json({ success: true, data: files })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取备份列表失败' })
  }
})

export default router
