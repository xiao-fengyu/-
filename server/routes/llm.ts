// ============================================================
// 文本 LLM 提供商管理路由 + 自然语言→prompt 工具路由
// ============================================================

import { Router } from 'express'
import { DatabaseService } from '../services/database'
import {
  createLlmProvider,
  naturalLanguageToPrompt,
  type LlmProviderConfig,
} from '../services/llm'

const router = Router()

function getDb(): DatabaseService {
  return new DatabaseService()
}

function rowToConfig(row: Record<string, unknown>): LlmProviderConfig {
  return {
    id: String(row.id),
    name: String(row.name),
    endpoint: String(row.endpoint),
    apiKey: String(row.api_key),
    model: String(row.model),
    temperature: row.temperature == null ? undefined : Number(row.temperature),
    maxTokens: row.max_tokens == null ? undefined : Number(row.max_tokens),
    isDefault: Number(row.is_default) === 1,
  }
}

// ===== 列表 =====
router.get('/', (_req, res) => {
  try {
    const rows = getDb().getLlmProviders()
    res.json({ success: true, data: rows })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ===== 默认 =====
router.get('/default', (_req, res) => {
  try {
    const row = getDb().getDefaultLlmProvider()
    res.json({ success: true, data: row || null })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ===== 新建/更新 =====
router.post('/', (req, res) => {
  try {
    const { id, name, endpoint, api_key, model, temperature, max_tokens, is_default } = req.body || {}
    if (!id || !name || !endpoint || !api_key || !model) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段：id, name, endpoint, api_key, model',
      })
    }
    const db = getDb()
    db.saveLlmProvider({
      id: String(id),
      name: String(name),
      endpoint: String(endpoint),
      api_key: String(api_key),
      model: String(model),
      temperature: temperature == null ? undefined : Number(temperature),
      max_tokens: max_tokens == null ? undefined : Number(max_tokens),
      is_default: is_default ? 1 : 0,
    })
    if (is_default) db.setDefaultLlmProvider(String(id))
    res.json({ success: true, message: '已保存' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ===== 设为默认 =====
router.patch('/:id/default', (req, res) => {
  try {
    getDb().setDefaultLlmProvider(req.params.id)
    res.json({ success: true, message: '已设为默认' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ===== 删除 =====
router.delete('/:id', (req, res) => {
  try {
    getDb().deleteLlmProvider(req.params.id)
    res.json({ success: true, message: '已删除' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ===== 自然语言 → prompt（不直接生图，前端拿到 prompt 后可再调生图） =====
router.post('/prompt-from-text', async (req, res) => {
  try {
    const { description, category, platform, hasReferenceImage, styleHints, llmProviderId } = req.body || {}
    if (!description) {
      return res.status(400).json({ success: false, error: 'description 不能为空' })
    }

    const db = getDb()
    const row = llmProviderId ? db.getLlmProvider(llmProviderId) : db.getDefaultLlmProvider()
    if (!row) {
      return res.status(400).json({
        success: false,
        error: '未配置文本 LLM 提供商，请先在「设置 → 文本 LLM」中添加',
      })
    }

    const llm = createLlmProvider(rowToConfig(row))
    const result = await naturalLanguageToPrompt(llm, {
      description: String(description),
      category,
      platform,
      hasReferenceImage: !!hasReferenceImage,
      styleHints: Array.isArray(styleHints) ? styleHints : undefined,
    })

    res.json({
      success: true,
      data: {
        ...result,
        llmProvider: { id: row.id, name: row.name, model: row.model },
      },
    })
  } catch (err: any) {
    console.error('[LLM prompt 生成失败]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
