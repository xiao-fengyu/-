// ============================================================
// 批量发布服务 — 逐条发布到目标平台
// ============================================================

import { DatabaseService } from './database'
import { getDatabase } from './database'
import { PddAdapter } from './platforms/pdd-adapter'
import type { PlatformCredential, PublishProductParams } from './platforms/adapter'
import { withRetry } from '../middleware/retry'

const activePublishs = new Map<string, BatchPublishTask>()

interface BatchPublishTask {
  taskId: string
  status: 'running' | 'completed' | 'failed'
  maxConcurrency: number
  currentRunning: number
  queue: PublishItemQueue[]
  completed: number
  failed: number
  total: number
  finished: boolean
}

interface PublishItemQueue {
  itemId: string
  productId: string
  title: string
  description: string
  price: number
  stock: number
  categoryId?: string
  imagePath: string
}

/**
 * 启动批量发布
 */
export async function startBatchPublish(
  taskId: string,
  credentialId: string,
  maxConcurrency: number = 1, // 发布默认单线程，避免平台限流
): Promise<void> {
  if (activePublishs.has(taskId)) {
    throw new Error('任务已在发布中')
  }

  const db = new DatabaseService()
  const task = db.getBatchTask(taskId)
  if (!task) {
    throw new Error('批量任务不存在')
  }

  // 获取所有已确认条目
  const items = db.getBatchItemsByStatus(taskId, 'confirmed')
  if (items.length === 0) {
    // 检查是否有发布失败的条目需要重试
    const failedItems = db.getBatchItemsByStatus(taskId, 'publish_failed')
    if (failedItems.length === 0) {
      throw new Error('没有可发布的条目（需要先确认图片）')
    }
    // 重试失败条目
    for (const item of failedItems) {
      db.updateBatchItemStatus(String(item.id), 'confirmed')
    }
    items.push(...db.getBatchItemsByStatus(taskId, 'confirmed'))
  }

  const queue: PublishItemQueue[] = items
    .filter((item) => item.product_id && item.image_path)
    .map((item) => ({
      itemId: String(item.id),
      productId: String(item.product_id),
      title: String(item.title || ''),
      description: String(item.description || ''),
      price: item.price ? Number(item.price) : 0,
      stock: item.stock ? Number(item.stock) : 100,
      categoryId: item.category_id ? String(item.category_id) : undefined,
      imagePath: String(item.image_path),
    }))

  if (queue.length === 0) {
    throw new Error('没有可发布的条目（缺少商品ID或图片路径）')
  }

  const pubTask: BatchPublishTask = {
    taskId,
    status: 'running',
    maxConcurrency: Math.min(maxConcurrency, 3), // 发布最多并发 3
    currentRunning: 0,
    queue,
    completed: 0,
    failed: 0,
    total: queue.length,
    finished: false,
  }

  activePublishs.set(taskId, pubTask)

  // 更新任务状态
  db.updateBatchTaskStatus(taskId, 'publishing')
  db.addLog('batch_publish_start', taskId, String(task.platform || 'pdd'), 'success', `开始批量发布 ${queue.length} 条`)

  // 启动发布队列
  runPublishQueue(pubTask, credentialId)
}

/**
 * 运行发布队列
 */
async function runPublishQueue(
  pubTask: BatchPublishTask,
  credentialId: string,
): Promise<void> {
  const db = new DatabaseService()

  async function processNext(): Promise<void> {
    if (pubTask.finished) return
    if (pubTask.queue.length === 0 && pubTask.currentRunning === 0) {
      pubTask.finished = true
      pubTask.status = 'completed'

      db.updateBatchTaskStatus(
        pubTask.taskId,
        pubTask.failed > 0 ? 'completed' : 'completed',
        undefined,
        pubTask.failed,
      )

      db.addLog(
        'batch_publish_complete',
        pubTask.taskId,
        null,
        pubTask.failed > 0 ? 'partial' : 'success',
        `批量发布完成：成功 ${pubTask.completed} / 失败 ${pubTask.failed} / 总计 ${pubTask.total}`,
      )

      activePublishs.delete(pubTask.taskId)
      return
    }

    if (pubTask.currentRunning >= pubTask.maxConcurrency || pubTask.queue.length === 0) {
      return
    }

    const item = pubTask.queue.shift()!
    pubTask.currentRunning++

    // 标记为发布中
    db.updateBatchItemStatus(item.itemId, 'publishing')

    try {
      await publishSingleItem(item, credentialId, pubTask.taskId)
      pubTask.completed++
    } catch (error: any) {
      console.error(`[批量发布失败] ${item.title}: ${error.message}`)
      pubTask.failed++
      db.updateBatchItemStatus(item.itemId, 'publish_failed', { errorMessage: error.message || '发布失败' })
    }

    pubTask.currentRunning--

    // 发布间增加延迟，避免平台限流
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 继续处理下一个
    processNext()
  }

  // 启动并发
  for (let i = 0; i < pubTask.maxConcurrency; i++) {
    processNext()
  }
}

/**
 * 发布单个商品
 */
async function publishSingleItem(
  item: PublishItemQueue,
  credentialId: string,
  _taskId: string,
): Promise<void> {
  const database = getDatabase()

  // 构建凭据
  const row = database.prepare(
    'SELECT * FROM platform_credentials WHERE id = ?'
  ).get(credentialId) as Record<string, unknown> | undefined

  if (!row) {
    throw new Error('平台凭据不存在: ' + credentialId)
  }

  const credential: PlatformCredential = {
    platform: String(row.platform || 'pdd'),
    clientId: String(row.client_id || ''),
    clientSecret: String(row.client_secret || ''),
    accessToken: String(row.access_token || ''),
    refreshToken: row.refresh_token ? String(row.refresh_token) : undefined,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : undefined,
    shopName: row.shop_name ? String(row.shop_name) : undefined,
  }

  const adapter = new PddAdapter()
  adapter.setCredential(credential)

  // 构建发布参数
  const publishParams: PublishProductParams = {
    goodsName: item.title,
    goodsDesc: item.description,
    categoryId: item.categoryId || 0, // 默认类目，实际应由用户选择
    images: [item.imagePath],
    mainImageIndex: 0,
    skus: [
      {
        price: item.price,
        stock: item.stock,
        specName: '默认',
        specValue: '默认',
        image: item.imagePath,
      },
    ],
    shipmentLimitSecond: 48 * 3600, // 48小时发货
  }

  const result = await withRetry(
    () => adapter.publishProduct(publishParams),
    { maxRetries: 2, delayMs: 3000 },
  )

  if (!result.success) {
    throw new Error(result.error || '发布失败')
  }

  // 更新条目状态
  const db = new DatabaseService()
  db.updateBatchItemStatus(item.itemId, 'published')

  // 更新商品状态
  db.updateProduct(item.productId, { status: 'published' })

  db.addLog(
    'publish',
    item.productId,
    'pdd',
    'success',
    `批量发布成功，平台商品ID: ${result.goodsId}`,
  )
}

/**
 * 获取发布状态
 */
export function getPublishStatus(taskId: string): {
  status: string
  completed: number
  failed: number
  total: number
  remaining: number
} | null {
  const pubTask = activePublishs.get(taskId)
  if (!pubTask) return null

  return {
    status: pubTask.status,
    completed: pubTask.completed,
    failed: pubTask.failed,
    total: pubTask.total,
    remaining: pubTask.queue.length + pubTask.currentRunning,
  }
}

/**
 * 检查是否正在发布
 */
export function isPublishing(taskId: string): boolean {
  return activePublishs.has(taskId)
}
