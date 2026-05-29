// ============================================================
// 图片生成 API 路由
// ============================================================

import { Router } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import axios from 'axios'
import multer from 'multer'
import { ImageProcessor, PDD_REQUIREMENTS } from '../services/image-processor'
import {
  createProvider,
  type GenerationOptions,
  type ImageToImageOptions,
} from '../services/image-gen'
import {
  PROMPT_TEMPLATES,
  renderPrompt,
  getTemplatesByCategory,
  getCategories,
} from '../services/image-gen/templates'
import { DatabaseService } from '../services/database'

const router = Router()

// 图片存储目录：优先使用 DB_DIR 环境变量（AppImage 兼容），回退到相对路径
const DATA_DIR = process.env.DB_DIR
  ? path.join(process.env.DB_DIR, 'images')
  : path.join(process.cwd(), 'data/images')
const processor = new ImageProcessor(DATA_DIR)

// 图生图文件上传配置（内存存储，直接转 base64）
const i2iStorage = multer.memoryStorage()
const uploadImage = multer({
  storage: i2iStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片文件'))
    }
  },
})

// 获取数据库服务
function getDb(): DatabaseService {
  return new DatabaseService()
}

// ============================================================
// 模板相关
// ============================================================

/** 获取所有 Prompt 模板 */
router.get('/templates', (_req, res) => {
  res.json({
    success: true,
    data: {
      templates: PROMPT_TEMPLATES,
      categories: getCategories(),
    },
  })
})

/** 按分类获取模板 */
router.get('/templates/category/:category', (req, res) => {
  const templates = getTemplatesByCategory(req.params.category)
  res.json({ success: true, data: { templates } })
})

/** 渲染模板 */
router.post('/templates/render', (req, res) => {
  try {
    const { templateId, variables } = req.body
    const prompt = renderPrompt(templateId, variables)
    res.json({ success: true, data: { prompt } })
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// ============================================================
// 图片生成
// ============================================================

/** 生成图片 */
router.post('/generate', async (req, res) => {
  try {
    const {
      providerConfig,
      prompt,
      count = 4,
      width = 1024,
      height = 1024,
      style,
      quality,
      seed,
    } = req.body

    if (!providerConfig || !providerConfig.apiKey) {
      return res.status(400).json({
        success: false,
        error: '缺少提供商配置或 API Key',
      })
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'prompt 不能为空',
      })
    }

    // 创建提供商实例
    const provider = createProvider(providerConfig)

    // 生成图片
    const options: GenerationOptions = {
      width,
      height,
      style,
      quality,
      seed,
    }

    const response = await provider.generate(prompt, count, options)

    // 下载图片到本地
    const results: Array<{
      localPath: string
      url: string
      width: number
      height: number
      fileSize: number
      format: string
    }> = []

    for (const img of response.images) {
      const imageUrl = img.url || img.base64
      if (!imageUrl) continue

      let localPath: string

      if (img.base64) {
        // base64 数据直接保存
        const hash = crypto.randomBytes(8).toString('hex')
        localPath = path.join(DATA_DIR, `${hash}.png`)
        fs.writeFileSync(localPath, Buffer.from(img.base64, 'base64'))
      } else {
        // 从 URL 下载
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

      results.push({
        localPath,
        url: imageUrl,
        width: metadata.width,
        height: metadata.height,
        fileSize: stats.size,
        format: metadata.format,
      })
    }

    // 保存到数据库
    const db = getDb()
    for (const r of results) {
        db.addImage({
          product_id: req.body.productId || null,
          local_path: r.localPath,
          url: r.url,
          type: 'generated',
          provider: providerConfig.name,
          prompt,
          status: 'generated',
          width: r.width,
          height: r.height,
          file_size: r.fileSize,
        })
    }

    res.json({
      success: true,
      data: {
        prompt,
        provider: providerConfig.name,
        images: results,
        count: results.length,
      },
    })
  } catch (err: any) {
    console.error('[图片生成失败]', err.message)
    res.status(500).json({
      success: false,
      error: err.message || '图片生成失败',
    })
  }
})

// ============================================================
// 图生图
// ============================================================

/** 图生图 — 基于参考图 + prompt 生成新图 */
router.post('/generate-from-image', uploadImage.single('referenceImage'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({
        success: false,
        error: '需要上传参考图（referenceImage 字段）',
      })
    }

    // 解析 JSON 参数
    let params: Record<string, unknown>
    try {
      params = req.body.params ? JSON.parse(req.body.params) : {}
    } catch {
      return res.status(400).json({ success: false, error: 'params JSON 格式错误' })
    }

    const {
      providerConfig,
      prompt,
      count = 4,
      width = 1024,
      height = 1024,
      strength,
      cfgScale,
      seed,
    } = params as {
      providerConfig?: Record<string, unknown>
      prompt?: string
      count?: number
      width?: number
      height?: number
      strength?: number
      cfgScale?: number
      seed?: number
    }

    if (!providerConfig || !(providerConfig as any).apiKey) {
      return res.status(400).json({ success: false, error: '缺少提供商配置或 API Key' })
    }
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt 不能为空' })
    }

    // 将上传的图片转为 base64
    const referenceImageBase64 = file.buffer.toString('base64')
    const mimeType = file.mimetype || 'image/png'
    const imageDataUri = `data:${mimeType};base64,${referenceImageBase64}`

    // 创建提供商实例
    const provider = createProvider(providerConfig as any)

    // 检查是否支持图生图
    if (!provider.generateFromImage) {
      return res.status(400).json({
        success: false,
        error: `提供商 ${(providerConfig as any).name} 不支持图生图功能`,
      })
    }

    // 调用图生图
    const options: ImageToImageOptions = {
      width,
      height,
      strength,
      cfgScale,
      seed,
      referenceImageBase64: imageDataUri,
    }

    const response = await provider.generateFromImage(imageDataUri, prompt, count, options)

    // 下载图片到本地
    const results: Array<{
      localPath: string
      url: string
      width: number
      height: number
      fileSize: number
      format: string
    }> = []

    for (const img of response.images) {
      const imageUrl = img.url || img.base64
      if (!imageUrl) continue

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

      results.push({
        localPath,
        url: imageUrl,
        width: metadata.width,
        height: metadata.height,
        fileSize: stats.size,
        format: metadata.format,
      })
    }

    // 保存到数据库
    const db = getDb()
    for (const r of results) {
      db.addImage({
        product_id: (params as any).productId || null,
        local_path: r.localPath,
        url: r.url,
        type: 'image-to-image',
        provider: (providerConfig as any).name,
        prompt,
        status: 'generated',
        width: r.width,
        height: r.height,
        file_size: r.fileSize,
      })
    }

    res.json({
      success: true,
      data: {
        prompt,
        provider: (providerConfig as any).name,
        images: results,
        count: results.length,
        referenceImage: `data:${mimeType};base64,...(truncated)`,
      },
    })
  } catch (err: any) {
    console.error('[图生图失败]', err.message)
    res.status(500).json({
      success: false,
      error: err.message || '图生图失败',
    })
  }
})

// ============================================================
// 图片处理
// ============================================================

/** 合规检查 */
router.post('/compliance', async (req, res) => {
  try {
    const { imagePath, requirements } = req.body
    if (!imagePath) {
      return res.status(400).json({ success: false, error: 'imagePath 不能为空' })
    }
    const result = await processor.checkCompliance(
      imagePath,
      requirements || PDD_REQUIREMENTS
    )
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 自动处理图片（缩放+格式转换+压缩） */
router.post('/process', async (req, res) => {
  try {
    const { imagePath, requirements, targetWidth, targetHeight } = req.body
    if (!imagePath) {
      return res.status(400).json({ success: false, error: 'imagePath 不能为空' })
    }
    const result = await processor.processToCompliant(
      imagePath,
      requirements || PDD_REQUIREMENTS,
      targetWidth,
      targetHeight
    )
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 格式转换 */
router.post('/convert', async (req, res) => {
  try {
    const { imagePath, outputPath, format } = req.body
    if (!imagePath || !outputPath || !format) {
      return res
        .status(400)
        .json({ success: false, error: '缺少必要参数: imagePath, outputPath, format' })
    }
    const result = await processor.convertFormat(imagePath, outputPath, format)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ============================================================
// 图片管理
// ============================================================

/** 获取已生成的图片列表 */
router.get('/images', (_req, res) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return res.json({ success: true, data: { images: [] } })
    }
    const files = fs
      .readdirSync(DATA_DIR)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map((f) => {
        const filePath = path.join(DATA_DIR, f)
        const stats = fs.statSync(filePath)
        return {
          filename: f,
          path: filePath,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())

    res.json({ success: true, data: { images: files } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 删除图片 */
router.delete('/images/:filename', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, req.params.filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' })
    }
    fs.unlinkSync(filePath)
    res.json({ success: true, message: '已删除' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ============================================================
// 提供商验证
// ============================================================

/** 验证提供商配置 */
router.post('/providers/validate', async (req, res) => {
  try {
    const { providerConfig } = req.body
    if (!providerConfig) {
      return res.status(400).json({ success: false, error: '缺少 providerConfig' })
    }
    const provider = createProvider(providerConfig)
    const valid = await provider.validateConfig(providerConfig)
    res.json({ success: true, data: { valid } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/** 获取提供商支持的模型 */
router.post('/providers/models', async (req, res) => {
  try {
    const { providerConfig } = req.body
    if (!providerConfig) {
      return res.status(400).json({ success: false, error: '缺少 providerConfig' })
    }
    const provider = createProvider(providerConfig)
    const models = await provider.getModels()
    res.json({ success: true, data: { models } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ============================================================
// Prompt 优化
// ============================================================

/** 自然语言 → 专业电商 Prompt */
router.post('/optimize-prompt', async (req, res) => {
  try {
    const { textModelConfig, description } = req.body
    if (!textModelConfig || !textModelConfig.endpoint || !textModelConfig.apiKey) {
      return res.status(400).json({
        success: false,
        error: '缺少文本 LLM 配置或 API Key',
      })
    }
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: '描述不能为空',
      })
    }

    const systemPrompt = `你是一位专业的电商商品摄影提示词专家。

用户会用大白话描述他们想要的商品图片效果。你的任务是将用户的描述转换为一段专业的英文图片生成 prompt，适用于 AI 图片生成模型（如 DALL-E、通义万相等）。

要求：
1. 输出必须是英文
2. 包含：商品主体、背景场景、光线、构图、风格、画质等要素
3. 简洁但专业，100-200 词以内
4. 直接输出 prompt，不要加引号、解释或前后缀
5. 如果用户只说了很少的信息，自动补充合理的电商摄影常用元素`

    const userPrompt = `请将以下描述转为专业电商商品摄影 prompt：\n\n${description.trim()}`

    const response = await axios.post(
      `${textModelConfig.endpoint}/chat/completions`,
      {
        model: textModelConfig.model || 'qwen-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${textModelConfig.apiKey}`,
        },
        timeout: 30000,
      }
    )

    const optimizedPrompt =
      response.data.choices?.[0]?.message?.content?.trim() ||
      response.data.choices?.[0]?.text?.trim()

    if (!optimizedPrompt) {
      return res.status(500).json({
        success: false,
        error: 'LLM 返回为空，无法优化 prompt',
      })
    }

    res.json({
      success: true,
      data: {
        originalDescription: description.trim(),
        optimizedPrompt,
        model: textModelConfig.model || 'unknown',
      },
    })
  } catch (err: any) {
    console.error('[Prompt 优化失败]', err.message)
    if (err.response) {
      const status = err.response.status
      const detail = err.response.data?.error?.message || err.response.data?.message || ''
      res.status(500).json({
        success: false,
        error: `LLM 请求失败 (${status})${detail ? ': ' + detail : ''}`,
      })
    } else {
      res.status(500).json({
        success: false,
        error: err.message || 'Prompt 优化失败',
      })
    }
  }
})

export default router
