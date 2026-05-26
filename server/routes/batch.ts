// ============================================================
// 批量任务 API 路由
// ============================================================

import { Router } from 'express'
import multer from 'multer'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { DatabaseService } from '../services/database'
import { startBatchGeneration, getGenerationStatus, isGenerating } from '../services/batch-generator'
import type { ImageProviderConfig } from '../services/image-gen'
import { startBatchPublish, getPublishStatus } from '../services/batch-publisher'

const router = Router()

// 文件上传配置
const UPLOAD_DIR = process.env.DB_DIR
  ? path.join(process.env.DB_DIR, 'uploads')
  : path.join(process.cwd(), 'data/uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const ext = path.extname(file.originalname)
    cb(null, `batch_${timestamp}_${random}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.csv', '.xls', '.xlsx'].includes(ext) || allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 .xlsx / .xls / .csv 文件'))
    }
  },
})

// 列名映射（中英文别名 → 标准字段名）
const COLUMN_MAP: Record<string, keyof ParsedItem> = {
  // 商品名称
  '商品名称': 'title',
  'title': 'title',
  'name': 'title',
  '名称': 'title',
  // 商品描述
  '商品描述': 'description',
  'description': 'description',
  'desc': 'description',
  '描述': 'description',
  'prompt': 'description',
  // 价格
  '价格': 'price',
  'price': 'price',
  // 库存
  '库存': 'stock',
  'stock': 'stock',
  'quantity': 'stock',
  // 类目
  '类目id': 'category_id',
  'category_id': 'category_id',
  'category': 'category_id',
  '类目': 'category_id',
}

interface ParsedItem {
  title: string
  description: string
  price?: number
  stock?: number
  category_id?: string
}

/**
 * 标准化表头列名
 */
function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * 解析 Excel/CSV 文件
 */
function parseImportFile(filePath: string): ParsedItem[] {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('文件中没有工作表')
  }

  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

  if (rows.length === 0) {
    throw new Error('文件中没有数据行')
  }

  if (rows.length > 500) {
    throw new Error('单次导入最多支持 500 条，当前 ' + rows.length + ' 条')
  }

  // 构建列映射：原始表头 → 标准字段名
  const rawHeaders = Object.keys(rows[0])
  const headerMap = new Map<string, string>()

  for (const raw of rawHeaders) {
    const normalized = normalizeHeader(raw)
    const mapped = COLUMN_MAP[normalized]
    if (mapped) {
      headerMap.set(raw, mapped)
    }
  }

  // 必须有 title 和 description
  const hasTitle = Array.from(headerMap.values()).includes('title')
  const hasDescription = Array.from(headerMap.values()).includes('description')

  if (!hasTitle) {
    throw new Error('缺少必填列：商品名称（支持：商品名称/title/name/名称）')
  }
  if (!hasDescription) {
    throw new Error('缺少必填列：商品描述（支持：商品描述/description/desc/描述/prompt）')
  }

  const items: ParsedItem[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const item: ParsedItem = { title: '', description: '' }

    for (const [raw, mapped] of headerMap) {
      let value = row[raw]
      if (value === null || value === undefined || value === '') continue

      if (mapped === 'title') {
        item.title = String(value).trim()
      } else if (mapped === 'description') {
        item.description = String(value).trim()
      } else if (mapped === 'price') {
        const num = parseFloat(String(value))
        if (!isNaN(num)) item.price = num
      } else if (mapped === 'stock') {
        const num = parseInt(String(value), 10)
        if (!isNaN(num)) item.stock = num
      } else if (mapped === 'category_id') {
        item.category_id = String(value).trim()
      }
    }

    if (!item.title) {
      throw new Error(`第 ${i + 1} 行：商品名称不能为空`)
    }
    if (!item.description) {
      throw new Error(`第 ${i + 1} 行：商品描述不能为空`)
    }

    items.push(item)
  }

  return items
}

// ============================================================
// 路由
// ============================================================

/** 上传并解析 Excel/CSV，创建批量任务 */
router.post('/import', upload.single('file'), (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ success: false, error: '未上传文件' })
    }

    const { platform, credentialId, providerConfig } = req.body

    // 解析文件
    const items = parseImportFile(file.path)

    // 创建批量任务
    const db = new DatabaseService()
    const taskId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    db.createBatchTask({
      id: taskId,
      name: file.originalname,
      platform: platform || undefined,
      credential_id: credentialId || undefined,
      provider_config: providerConfig || undefined,
      status: 'importing',
      total_items: items.length,
      import_file_path: file.path,
    })

    // 创建条目
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      db.addBatchItem({
        id: `item_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        batch_task_id: taskId,
        row_number: i + 1,
        title: item.title,
        description: item.description,
        price: item.price,
        stock: item.stock,
        category_id: item.category_id,
      })
    }

    // 更新任务状态为待生成
    db.updateBatchTaskStatus(taskId, 'pending')

    db.addLog('batch_import', taskId, platform || null, 'success', `批量导入 ${items.length} 条`)

    res.json({
      success: true,
      data: {
        taskId,
        totalItems: items.length,
        preview: items.slice(0, 10), // 预览前10条
      },
    })
  } catch (err: any) {
    console.error('[批量导入失败]', err.message)
    res.status(400).json({ success: false, error: err.message || '导入失败' })
  }
})

/** 获取所有批量任务列表 */
router.get('/tasks', (_req, res) => {
  try {
    const db = new DatabaseService()
    const tasks = db.listBatchTasks()

    // 为每个任务附加统计信息
    const enriched = tasks.map((task: Record<string, unknown>) => {
      const id = String(task.id)
      const counts = db.getBatchItemCount(id)
      return { ...task, ...counts }
    })

    res.json({ success: true, data: { tasks: enriched } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 获取单个批量任务详情 + 条目列表 */
router.get('/tasks/:id', (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    const items = db.getBatchItems(req.params.id)
    const counts = db.getBatchItemCount(req.params.id)

    res.json({
      success: true,
      data: {
        task: { ...task, ...counts },
        items,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 删除批量任务 */
router.delete('/tasks/:id', (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    // 如果正在生成中，不允许删除
    if (isGenerating(req.params.id)) {
      return res.status(400).json({ success: false, error: '任务正在生成中，无法删除' })
    }

    db.deleteBatchTask(req.params.id)
    res.json({ success: true, message: '已删除' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 触发批量生成 */
router.post('/tasks/:id/generate', async (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    const { providerConfig: rawProviderConfig, maxConcurrency } = req.body
    if (!rawProviderConfig) {
      return res.status(400).json({ success: false, error: '缺少 providerConfig' })
    }

    // 可能是 JSON 字符串或对象
    const providerConfig: ImageProviderConfig = typeof rawProviderConfig === 'string'
      ? JSON.parse(rawProviderConfig)
      : rawProviderConfig

    const concurrency = Math.min(Math.max(parseInt(maxConcurrency) || 3, 1), 10)

    await startBatchGeneration(req.params.id, providerConfig, concurrency)

    res.json({
      success: true,
      message: '批量生成已启动',
      data: { taskId: req.params.id },
    })
  } catch (err: any) {
    console.error('[批量生成启动失败]', err.message)
    res.status(400).json({ success: false, error: err.message })
  }
})

/** 查询批量生成进度 */
router.get('/tasks/:id/status', (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    const genStatus = getGenerationStatus(req.params.id)
    const pubStatus = getPublishStatus(req.params.id)
    const counts = db.getBatchItemCount(req.params.id)

    res.json({
      success: true,
      data: {
        taskStatus: task.status,
        generation: genStatus,
        publish: pubStatus,
        counts,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 批量确认已生成的条目 */
router.post('/tasks/:id/confirm', (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    const { itemIds } = req.body

    // 如果指定了 itemIds，只确认这些；否则确认所有 generated 状态的条目
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      for (const itemId of itemIds) {
        db.updateBatchItemStatus(String(itemId), 'confirmed')
      }
    } else {
      const generatedItems = db.getBatchItemsByStatus(req.params.id, 'generated')
      for (const item of generatedItems) {
        db.updateBatchItemStatus(String(item.id), 'confirmed')
      }
    }

    db.addLog('batch_confirm', req.params.id, null, 'success', '批量确认完成')

    res.json({ success: true, message: '已确认' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 触发批量发布 */
router.post('/tasks/:id/publish', async (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    const { credentialId, maxConcurrency } = req.body
    if (!credentialId) {
      return res.status(400).json({ success: false, error: '缺少 credentialId' })
    }

    const concurrency = Math.min(Math.max(parseInt(maxConcurrency) || 1, 1), 3)

    await startBatchPublish(req.params.id, credentialId, concurrency)

    res.json({
      success: true,
      message: '批量发布已启动',
      data: { taskId: req.params.id },
    })
  } catch (err: any) {
    console.error('[批量发布启动失败]', err.message)
    res.status(400).json({ success: false, error: err.message })
  }
})

/** 重试失败条目 */
router.post('/tasks/:id/retry-failed', async (req, res) => {
  try {
    const db = new DatabaseService()
    const task = db.getBatchTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' })
    }

    const { action } = req.body // 'generate' | 'publish'
    if (!action || !['generate', 'publish'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action 必须为 generate 或 publish' })
    }

    const failedItems = db.getBatchItemsByStatus(req.params.id, 'failed')
    const publishFailedItems = db.getBatchItemsByStatus(req.params.id, 'publish_failed')

    if (action === 'generate') {
      if (failedItems.length === 0) {
        return res.status(400).json({ success: false, error: '没有生成失败的条目' })
      }
      for (const item of failedItems) {
        db.updateBatchItemStatus(String(item.id), 'imported')
      }

      const providerConfigStr = task.provider_config
      if (!providerConfigStr) {
        return res.status(400).json({ success: false, error: '任务缺少 providerConfig' })
      }

      const providerConfig: ImageProviderConfig = typeof providerConfigStr === 'string'
        ? JSON.parse(providerConfigStr)
        : providerConfigStr as unknown as ImageProviderConfig

      await startBatchGeneration(req.params.id, providerConfig, 3)

      res.json({ success: true, message: `已重新生成 ${failedItems.length} 条` })
    } else {
      // publish retry
      const allFailed = [...failedItems, ...publishFailedItems]
      if (allFailed.length === 0) {
        return res.status(400).json({ success: false, error: '没有发布失败的条目' })
      }

      const credentialId = task.credential_id
      if (!credentialId) {
        return res.status(400).json({ success: false, error: '任务缺少 credentialId' })
      }

      for (const item of allFailed) {
        db.updateBatchItemStatus(String(item.id), 'confirmed')
      }

      await startBatchPublish(req.params.id, String(credentialId), 1)

      res.json({ success: true, message: `已重新发布 ${allFailed.length} 条` })
    }
  } catch (err: any) {
    console.error('[重试失败]', err.message)
    res.status(400).json({ success: false, error: err.message })
  }
})

export default router
