// ============================================================
// 草稿路由 — 保存/加载/列出/删除草稿
// ============================================================

import * as express from 'express'
import { DatabaseService } from '../services/database'
import type { DraftData } from '../services/database'

const router = express.Router()

// ===== 保存草稿 =====
router.post('/:productId', (req, res) => {
  try {
    const db = new DatabaseService()
    const { productId } = req.params
    const product = db.getProduct(productId)
    if (!product) return res.status(404).json({ error: '商品不存在' })

    const draftData: DraftData = req.body
    db.saveDraft(productId, draftData)

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '保存草稿失败' })
  }
})

// ===== 加载草稿 =====
router.get('/:productId', (req, res) => {
  try {
    const db = new DatabaseService()
    const draft = db.loadDraft(req.params.productId)
    if (!draft) return res.json({ success: true, data: null })

    res.json({ success: true, data: draft })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '加载草稿失败' })
  }
})

// ===== 草稿列表 =====
router.get('/', (_req, res) => {
  try {
    const db = new DatabaseService()
    const drafts = db.listDrafts()
    res.json({ success: true, data: drafts })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取草稿列表失败' })
  }
})

// ===== 删除草稿 =====
router.delete('/:productId', (req, res) => {
  try {
    const db = new DatabaseService()
    const product = db.getProduct(req.params.productId)
    if (!product) return res.status(404).json({ error: '商品不存在' })

    db.saveDraft(req.params.productId, {})
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '删除草稿失败' })
  }
})

export default router
