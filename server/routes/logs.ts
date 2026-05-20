// ============================================================
// 操作日志路由 — 查询日志、发布历史
// ============================================================

import * as express from 'express'
import { DatabaseService } from '../services/database'

const router = express.Router()

// ===== 操作日志列表 =====
router.get('/', (req, res) => {
  try {
    const db = new DatabaseService()
    const { action, platform, status, productId, limit, offset } = req.query

    const logs = db.getLogs({
      action: action ? String(action) : undefined,
      platform: platform ? String(platform) : undefined,
      status: status ? String(status) : undefined,
      productId: productId ? String(productId) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    })

    const total = db.getLogCount({
      action: action ? String(action) : undefined,
      platform: platform ? String(platform) : undefined,
      status: status ? String(status) : undefined,
    })

    res.json({ success: true, data: logs, total })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取日志失败' })
  }
})

// ===== 发布历史 =====
router.get('/publish-history', (req, res) => {
  try {
    const db = new DatabaseService()
    const { limit } = req.query

    const logs = db.getLogs({
      action: 'publish',
      limit: limit ? Number(limit) : 50,
    })

    res.json({ success: true, data: logs })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取发布历史失败' })
  }
})

export default router
