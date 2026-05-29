// ============================================================
// AI 提供商管理路由
// 功能：CRUD 提供商配置
// ============================================================

import * as express from 'express'
import { DatabaseService } from '../services/database'

const router = express.Router()
const db = new DatabaseService()

// ===== 获取所有提供商 =====
router.get('/', (_req, res) => {
  try {
    const providers = db.getProviders()
    res.json({ success: true, data: providers })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取提供商列表失败' })
  }
})

// ===== 获取默认提供商 =====
router.get('/default', (_req, res) => {
  try {
    const providers = db.getProviders()
    const defaultProvider = providers.find((p: Record<string, unknown>) => p.is_default === 1)
    if (defaultProvider) {
      res.json({ success: true, data: defaultProvider })
    } else {
      res.json({ success: true, data: providers[0] || null })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取默认提供商失败' })
  }
})

// ===== 保存/更新提供商 =====
router.post('/', (req, res) => {
  try {
    const { id, name, type, endpoint, api_key, model, max_images, default_params, is_default } = req.body

    if (!id || !name || !endpoint || !api_key) {
      return res.status(400).json({ error: '缺少必要字段：id, name, endpoint, api_key' })
    }

    // 如果设为默认，先取消其他默认
    if (is_default) {
      const providers = db.getProviders()
      for (const p of providers) {
        if (String(p.id) !== id && p.is_default === 1) {
          db.saveProvider({
            id: String(p.id),
            name: String(p.name),
            type: String(p.type),
            endpoint: String(p.endpoint),
            api_key: String(p.api_key),
            model: String(p.model),
            max_images: Number(p.max_images),
            default_params: String(p.default_params),
            is_default: 0,
          })
        }
      }
    }

    db.saveProvider({
      id,
      name,
      type: type || 'api',
      endpoint,
      api_key,
      model: model || '',
      max_images: max_images || 10,
      default_params: default_params || '{}',
      is_default: is_default ? 1 : 0,
    })

    res.json({ success: true, message: '提供商配置已保存' })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '保存失败' })
  }
})

// ===== 删除提供商 =====
router.delete('/:id', (req, res) => {
  try {
    const providers = db.getProviders()
    const target = providers.find((p: Record<string, unknown>) => String(p.id) === req.params.id)
    if (!target) {
      return res.status(404).json({ error: '提供商不存在' })
    }

    // 不允许删除唯一的默认提供商
    if (target.is_default === 1 && providers.length <= 1) {
      return res.status(400).json({ error: '不能删除唯一的默认提供商' })
    }

    // SQLite 没有 DELETE 单行方便的方式（需要用 prepare），但我们可以用 prepare
    // 实际上 saveProvider 有 INSERT OR REPLACE，没有 delete
    // 我们需要手动执行 DELETE
    const { getDatabase } = require('../services/database')
    const rawDb = getDatabase()
    rawDb.prepare('DELETE FROM image_providers WHERE id = ?').run(req.params.id)

    res.json({ success: true, message: '提供商已删除' })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '删除失败' })
  }
})

// ===== 设为默认 =====
router.patch('/:id/default', (req, res) => {
  try {
    const providers = db.getProviders()
    for (const p of providers) {
      const isTarget = String(p.id) === req.params.id
      db.saveProvider({
        id: String(p.id),
        name: String(p.name),
        type: String(p.type),
        endpoint: String(p.endpoint),
        api_key: String(p.api_key),
        model: String(p.model),
        max_images: Number(p.max_images),
        default_params: String(p.default_params),
        is_default: isTarget ? 1 : 0,
      })
    }
    res.json({ success: true, message: '已设为默认提供商' })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '操作失败' })
  }
})

export default router
