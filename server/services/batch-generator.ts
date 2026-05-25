// ============================================================
// 批量生成服务 — 队列管理 + 并发控制 + 自动重试
// ============================================================

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import axios from 'axios'
import { DatabaseService } from './database'
import { ImageProcessor } from './image-processor'
import { createProvider, type GenerationOptions, type ImageProviderConfig } from './image-gen'
import { withRetry } from '../middleware/retry'
import type { ImageGenerationResponse } from './image-gen/types'

// 图片存储目录：优先使用 DB_DIR 环境变量（AppImage 兼容），回退到相对路径
const DATA_DIR = process.env.DB_DIR
  ? path.join(process.env.DB_DIR, 'images')
  : path.join(__dirname, '../../../data/images')
const processor = new ImageProcessor(DATA_DIR)

// 正在运行的生成任务（内存队列）
const activeGenerations = new Map<string, BatchGenerationTask>()

interface BatchGenerationTask {
  taskId: string
  status: 'running' | 'completed' | 'failed'
  maxConcurrency: number
  currentRunning: number
  queue: BatchItemQueue[]
  completed: number
  failed: number
  total: number
  finished: boolean
}

interface BatchItemQueue {
  itemId: string
  title: string
  description: string
  price?: number
  stock?: number
  category_id?: string
  rowNumber: number
}

/**
 * 启动批量生成
 */
export async function startBatchGeneration(
  taskId: string,
  providerConfig: ImageProviderConfig,
  maxConcurrency: number = 3,
): Promise<void> {
  if (activeGenerations.has(taskId)) {
    throw new Error('任务已在生成中')
  }

  const db = new DatabaseService()
  const task = db.getBatchTask(taskId)
  if (!task) {
    throw new Error('批量任务不存在')
  }

  // 获取所有待生成条目
  const items = db.getBatchItemsByStatus(taskId, 'imported')
  if (items.length === 0) {
    // 检查是否有失败条目需要重试
    const failedItems = db.getBatchItemsByStatus(taskId, 'failed')
    if (failedItems.length === 0) {
      throw new Error('没有可生成的条目')
    }
    // 重试失败条目
    for (const item of failedItems) {
      db.updateBatchItemStatus(String(item.id), 'imported')
    }
    // 重新获取
    items.push(...db.getBatchItemsByStatus(taskId, 'imported'))
  }

  const queue: BatchItemQueue[] = items.map((item) => ({
    itemId: String(item.id),
    title: String(item.title || ''),
    description: String(item.description || ''),
    price: item.price ? Number(item.price) : undefined,
    stock: item.stock ? Number(item.stock) : undefined,
    category_id: item.category_id ? String(item.category_id) : undefined,
    rowNumber: Number(item.row_number || 0),
  }))

  const genTask: BatchGenerationTask = {
    taskId,
    status: 'running',
    maxConcurrency,
    currentRunning: 0,
    queue,
    completed: 0,
    failed: 0,
    total: items.length,
    finished: false,
  }

  activeGenerations.set(taskId, genTask)

  // 更新任务状态
  db.updateBatchTaskStatus(taskId, 'generating')
  db.addLog('batch_generate_start', taskId, String(task.platform || ''), 'success', `开始批量生成 ${items.length} 条`)

  // 启动并发队列
  runGenerationQueue(genTask, providerConfig as unknown as Record<string, unknown>)
}

/**
 * 运行生成队列（并发控制）
 */
async function runGenerationQueue(
  genTask: BatchGenerationTask,
  providerConfig: Record<string, unknown>,
): Promise<void> {
  const db = new DatabaseService()

  async function processNext(): Promise<void> {
    if (genTask.finished) return
    if (genTask.queue.length === 0 && genTask.currentRunning === 0) {
      // 全部完成
      genTask.finished = true
      genTask.status = genTask.failed > 0 ? 'completed' : 'completed'

      db.updateBatchTaskStatus(
        genTask.taskId,
        genTask.failed > 0 ? 'confirming' : 'confirming',
        genTask.completed,
        genTask.failed,
      )

      db.addLog(
        'batch_generate_complete',
        genTask.taskId,
        null,
        genTask.failed > 0 ? 'success' : 'success',
        `批量生成完成：成功 ${genTask.completed} / 失败 ${genTask.failed} / 总计 ${genTask.total}`,
      )

      activeGenerations.delete(genTask.taskId)
      return
    }

    if (genTask.currentRunning >= genTask.maxConcurrency || genTask.queue.length === 0) {
      return
    }

    const item = genTask.queue.shift()!
    genTask.currentRunning++

    // 标记为生成中
    db.updateBatchItemStatus(item.itemId, 'generating')

    try {
      await generateSingleItem(item, providerConfig as unknown as ImageProviderConfig, genTask.taskId)
      genTask.completed++
    } catch (error: any) {
      console.error(`[批量生成失败] ${item.title}: ${error.message}`)
      genTask.failed++
      db.updateBatchItemStatus(item.itemId, 'failed', { errorMessage: error.message || '生成失败' })
    }

    genTask.currentRunning--

    // 更新任务进度
    db.updateBatchTaskStatus(
      genTask.taskId,
      'generating',
      genTask.completed,
      genTask.failed,
    )

    // 继续处理下一个
    processNext()
  }

  // 启动 maxConcurrency 个并发
  for (let i = 0; i < genTask.maxConcurrency; i++) {
    processNext()
  }
}

/**
 * 生成单个商品图片
 */
async function generateSingleItem(
  item: BatchItemQueue,
  providerConfig: ImageProviderConfig,
  taskId: string,
): Promise<void> {
  const db = new DatabaseService()

  if (!providerConfig || !(providerConfig as any).apiKey) {
    throw new Error('缺少提供商配置或 API Key')
  }

  const prompt = item.description
  if (!prompt) {
    throw new Error('商品描述不能为空')
  }

  const provider = createProvider(providerConfig)

  // 批量生成单张图片
  const options: GenerationOptions = {
    width: 1024,
    height: 1024,
  }

  // 使用 withRetry 自动重试
  const response = await withRetry<ImageGenerationResponse>(
    async () => provider.generate(prompt, 1, options),
    { maxRetries: 3, delayMs: 2000 },
  )

  if (!response.images || response.images.length === 0) {
    throw new Error('AI 返回图片为空')
  }

  const img = response.images[0]
  const imageUrl = img.url || img.base64
  if (!imageUrl) {
    throw new Error('AI 返回图片 URL 为空')
  }

  let localPath: string

  if (img.base64) {
    const hash = crypto.randomBytes(8).toString('hex')
    localPath = path.join(DATA_DIR, `${hash}.png`)
    fs.writeFileSync(localPath, Buffer.from(img.base64, 'base64'))
  } else {
    const dl = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })
    const hash = crypto.randomBytes(8).toString('hex')
    const ext = imageUrl.includes('.png') ? 'png' : 'jpg'
    localPath = path.join(DATA_DIR, `${hash}.${ext}`)
    fs.writeFileSync(localPath, dl.data)
  }

  const stats = fs.statSync(localPath)
  const metadata = await processor.checkCompliance(localPath)

  // 创建商品记录
  const productId = db.createProduct({
    title: item.title,
    description: item.description,
    price: item.price,
    stock: item.stock,
    category_id: item.category_id,
    platform: 'pdd', // 默认拼多多，可在发布时修改
    status: 'ready',
    batch_task_id: taskId,
  })

  // 保存图片记录
  db.addImage({
    product_id: productId,
    local_path: localPath,
    url: imageUrl,
    type: 'main',
    provider: (providerConfig as any).name || 'unknown',
    prompt,
    status: 'generated',
    width: metadata.width,
    height: metadata.height,
    file_size: stats.size,
  })

  // 更新条目状态
  db.updateBatchItemStatus(item.itemId, 'generated', {
    productId,
    imagePath: localPath,
  })
}

/**
 * 获取批量生成任务状态
 */
export function getGenerationStatus(taskId: string): {
  status: string
  completed: number
  failed: number
  total: number
  remaining: number
} | null {
  const genTask = activeGenerations.get(taskId)
  if (!genTask) {
    return null
  }

  return {
    status: genTask.status,
    completed: genTask.completed,
    failed: genTask.failed,
    total: genTask.total,
    remaining: genTask.queue.length + genTask.currentRunning,
  }
}

/**
 * 检查任务是否正在生成中
 */
export function isGenerating(taskId: string): boolean {
  return activeGenerations.has(taskId)
}
