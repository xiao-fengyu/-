// ============================================================
// 平台路由 — 拼多多
// 功能：OAuth、类目查询、图片上传、商品发布
// ============================================================

import * as express from 'express'
import type Database from 'better-sqlite3'
import { PddAdapter } from '../services/platforms/pdd-adapter'
import { getDatabase } from '../services/database'
import type { PlatformCredential, PublishProductParams } from '../services/platforms/adapter'

const router = express.Router()

// 构建凭据对象
function buildCredential(db: Database.Database, credentialId: string): PlatformCredential | null {
  const row = db.prepare(
    'SELECT * FROM platform_credentials WHERE id = ?'
  ).get(credentialId) as Record<string, unknown> | undefined

  if (!row) return null

  return {
    platform: String(row.platform || 'pdd'),
    clientId: String(row.client_id || ''),
    clientSecret: String(row.client_secret || ''),
    accessToken: String(row.access_token || ''),
    refreshToken: row.refresh_token ? String(row.refresh_token) : undefined,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : undefined,
    shopName: row.shop_name ? String(row.shop_name) : undefined,
  }
}

// ===== OAuth 授权 =====
router.post('/oauth/authorize', async (req, res) => {
  try {
    const { credentialId, code } = req.body
    if (!credentialId) return res.status(400).json({ error: '缺少 credentialId' })

    const db = getDatabase()
    const credential = buildCredential(db, credentialId)
    if (!credential) return res.status(404).json({ error: '未找到凭据' })

    const adapter = new PddAdapter()
    adapter.setCredential(credential)
    const result = await adapter.authenticate(code)

    // 保存 token
    db.prepare(`
      UPDATE platform_credentials SET access_token = ?, refresh_token = ?,
        expires_at = ?, shop_name = ? WHERE id = ?
    `).run(
      result.accessToken,
      result.refreshToken || null,
      result.expiresAt?.toISOString() || null,
      result.shopName || null,
      credentialId
    )

    res.json({
      success: true,
      shopName: result.shopName,
      expiresIn: result.expiresAt
        ? Math.floor((result.expiresAt.getTime() - Date.now()) / 1000)
        : undefined,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '授权失败' })
  }
})

// ===== 保存平台凭据 =====
router.post('/credentials', (req, res) => {
  try {
    const { id, clientId, clientSecret, platform = 'pdd' } = req.body
    if (!id || !clientId || !clientSecret) {
      return res.status(400).json({ error: '缺少必要字段' })
    }

    const db = getDatabase()
    db.prepare(`
      INSERT OR REPLACE INTO platform_credentials
      (id, platform, client_id, client_secret)
      VALUES (?, ?, ?, ?)
    `).run(id, platform, clientId, clientSecret)

    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// ===== 获取凭据列表 =====
router.get('/credentials', (req, res) => {
  const db = getDatabase()
  const { platform } = req.query
  const rows = db.prepare(
    'SELECT id, platform, shop_name, access_token, expires_at, created_at FROM platform_credentials' +
    (platform ? ' WHERE platform = ?' : '') +
    ' ORDER BY created_at DESC'
  ).all(platform)
  res.json({ success: true, data: rows })
})

// ===== 获取类目 =====
router.get('/categories', async (req, res) => {
  try {
    const { credentialId, parentId } = req.query
    if (!credentialId) return res.status(400).json({ error: '缺少 credentialId' })

    const db = getDatabase()
    const credential = buildCredential(db, credentialId as string)
    if (!credential) return res.status(404).json({ error: '未找到凭据' })

    const adapter = new PddAdapter()
    adapter.setCredential(credential)
    const categories = await adapter.getCategories(
      parentId ? Number(parentId) : undefined
    )

    res.json({ success: true, data: categories })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取类目失败' })
  }
})

// ===== 上传图片 =====
router.post('/upload', async (req, res) => {
  try {
    const { credentialId, imagePath, imageName } = req.body
    if (!credentialId || !imagePath) {
      return res.status(400).json({ error: '缺少 credentialId 或 imagePath' })
    }

    const db = getDatabase()
    const credential = buildCredential(db, credentialId as string)
    if (!credential) return res.status(404).json({ error: '未找到凭据' })

    const adapter = new PddAdapter()
    adapter.setCredential(credential)
    const result = await adapter.uploadImage(imagePath as string, imageName as string)

    if (result.success) {
      res.json({ success: true, data: result })
    } else {
      res.status(400).json({ error: result.error })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || '上传失败' })
  }
})

// ===== 发布商品 =====
router.post('/publish', async (req, res) => {
  try {
    const { credentialId, ...publishParams } = req.body
    if (!credentialId) return res.status(400).json({ error: '缺少 credentialId' })

    const db = getDatabase()
    const credential = buildCredential(db, credentialId as string)
    if (!credential) return res.status(404).json({ error: '未找到凭据' })

    const adapter = new PddAdapter()
    adapter.setCredential(credential)
    const result = await adapter.publishProduct(publishParams as PublishProductParams)

    if (result.success) {
      // 记录日志
      db.prepare(
        'INSERT INTO operation_logs (action, product_id, platform, status, message) VALUES (?, ?, ?, ?, ?)'
      ).run('publish', String(result.goodsId || ''), 'pdd', 'success', '商品发布成功')

      res.json({
        success: true,
        goodsId: result.goodsId,
        message: '发布成功',
      })
    } else {
      db.prepare(
        'INSERT INTO operation_logs (action, product_id, platform, status, message) VALUES (?, ?, ?, ?, ?)'
      ).run('publish', '', 'pdd', 'failed', result.error || '发布失败')

      res.status(400).json({
        error: result.error || '发布失败',
        errorCode: result.errorCode,
        rawResponse: result.rawResponse,
      })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || '发布失败' })
  }
})

// ===== 查询商品 =====
router.get('/products/:goodsId', async (req, res) => {
  try {
    const { goodsId } = req.params
    const { credentialId } = req.query
    if (!credentialId) return res.status(400).json({ error: '缺少 credentialId' })

    const db = getDatabase()
    const credential = buildCredential(db, credentialId as string)
    if (!credential) return res.status(404).json({ error: '未找到凭据' })

    const adapter = new PddAdapter()
    adapter.setCredential(credential)
    const product = await adapter.getProductInfo(goodsId)

    res.json({ success: true, data: product })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '查询失败' })
  }
})

// ===== 获取商品列表 =====
router.get('/products', async (req, res) => {
  try {
    const { credentialId, page = '1', pageSize = '20' } = req.query
    if (!credentialId) return res.status(400).json({ error: '缺少 credentialId' })

    const db = getDatabase()
    const credential = buildCredential(db, credentialId as string)
    if (!credential) return res.status(404).json({ error: '未找到凭据' })

    const adapter = new PddAdapter()
    adapter.setCredential(credential)
    const products = await adapter.getProducts(Number(page), Number(pageSize))

    res.json({ success: true, data: products })
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取列表失败' })
  }
})

export default router
