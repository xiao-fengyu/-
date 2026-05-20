// ============================================================
// 商品管理路由
// ============================================================

import * as express from 'express'
import { DatabaseService } from '../services/database'

const router = express.Router()

// ===== 创建商品 =====
router.post('/', (req, res) => {
  try {
    const db = new DatabaseService()
    const { title, category_id, price, stock, description, platform, status } = req.body

    const id = db.createProduct({
      title: title || undefined,
      category_id: category_id || undefined,
      price: price ?? undefined,
      stock: stock ?? undefined,
      description: description || undefined,
      platform: platform || undefined,
      status: status || 'draft',
    })

    // 记录日志
    db.addLog('create_product', id, platform || null, 'success', `商品创建: ${title || '未命名'}`)

    res.json({ success: true, id })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '创建商品失败' })
  }
})

// ===== 商品列表 =====
router.get('/', (req, res) => {
  try {
    const db = new DatabaseService()
    const { status } = req.query
    const products = db.listProducts(status ? String(status) : undefined)
    res.json({ success: true, data: products })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取商品列表失败' })
  }
})

// ===== 商品详情 =====
router.get('/:id', (req, res) => {
  try {
    const db = new DatabaseService()
    const product = db.getProduct(req.params.id)
    if (!product) return res.status(404).json({ error: '商品不存在' })

    // 同时返回关联的 SKU 和图片
    const skus = db.getSkus(req.params.id)
    const images = db.getImages(req.params.id)

    res.json({ success: true, data: { ...product, skus, images } })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取商品详情失败' })
  }
})

// ===== 更新商品 =====
router.put('/:id', (req, res) => {
  try {
    const db = new DatabaseService()
    const existing = db.getProduct(req.params.id)
    if (!existing) return res.status(404).json({ error: '商品不存在' })

    const { title, category_id, price, stock, description, platform, status } = req.body

    db.updateProduct(req.params.id, {
      title: title !== undefined ? title : undefined,
      category_id: category_id !== undefined ? category_id : undefined,
      price: price !== undefined ? price : undefined,
      stock: stock !== undefined ? stock : undefined,
      description: description !== undefined ? description : undefined,
      platform: platform !== undefined ? platform : undefined,
      status: status !== undefined ? status : undefined,
    })

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '更新商品失败' })
  }
})

// ===== 删除商品 =====
router.delete('/:id', (req, res) => {
  try {
    const db = new DatabaseService()
    const existing = db.getProduct(req.params.id)
    if (!existing) return res.status(404).json({ error: '商品不存在' })

    db.deleteProduct(req.params.id)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '删除商品失败' })
  }
})

export default router
