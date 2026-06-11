// ============================================================
// 类型定义 — 文本 LLM 引擎
// 用于：自然语言 → 商品描述 → 结构化 prompt
// ============================================================

/** LLM 提供商配置（与数据库 llm_providers 表对应） */
export interface LlmProviderConfig {
  id: string
  name: string
  endpoint: string      // OpenAI 兼容的 chat/completions 端点
  apiKey: string
  model: string         // 例如 gpt-4o-mini / qwen-plus / deepseek-chat
  temperature?: number
  maxTokens?: number
  isDefault: boolean
}

/** 单条对话消息（OpenAI Chat 兼容格式） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Chat 请求选项 */
export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

/** Chat 响应 */
export interface ChatResponse {
  content: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  raw?: unknown
}

/** 文本 LLM 统一接口 */
export interface ILlmProvider {
  readonly id: string
  readonly name: string

  /** 走一次 chat completion */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>

  /** 验证配置是否有效（轻量探测） */
  validateConfig(config: LlmProviderConfig): Promise<boolean>
}

/** 自然语言 → prompt 的请求 */
export interface NaturalLanguageToPromptRequest {
  /** 用户自然语言描述，如 "白色陶瓷马克杯，要拍出高级感" */
  description: string
  /** 可选：电商品类，提示 LLM 用对应风格，如 服装/3C/家居 */
  category?: string
  /** 可选：目标平台，如 pdd/taobao，用于补合规要求 */
  platform?: string
  /** 可选：参考图（base64/URL/本地路径），让 LLM 知道这是图生图 */
  hasReferenceImage?: boolean
  /** 可选：用户希望的风格关键词，例如"极简风" */
  styleHints?: string[]
}

/** 自然语言 → prompt 的响应 */
export interface NaturalLanguageToPromptResponse {
  /** 优化后的英文/中文 prompt，用于喂给生图模型 */
  prompt: string
  /** 拆解出的关键属性，便于前端展示和编辑 */
  attributes?: {
    subject?: string
    style?: string
    background?: string
    lighting?: string
    cameraAngle?: string
    extra?: string[]
  }
  /** LLM 原始回复（调试用） */
  rawResponse?: string
}
