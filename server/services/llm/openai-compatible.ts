// ============================================================
// OpenAI 兼容 LLM 提供商实现
// 适配：OpenAI、通义千问 DashScope-OpenAI 兼容模式、DeepSeek、
//       智谱、月之暗面、本地 vLLM/Ollama OpenAI 兼容端点等
// ============================================================

import axios from 'axios'
import type {
  LlmProviderConfig,
  ILlmProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from './types'

export class OpenAiCompatibleLlmProvider implements ILlmProvider {
  readonly id: string
  readonly name: string

  private endpoint: string
  private apiKey: string
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(config: LlmProviderConfig) {
    this.id = config.id
    this.name = config.name
    // 端点容错：用户可能填 https://api.x/v1，也可能填完整的 chat/completions
    this.endpoint = normalizeChatEndpoint(config.endpoint)
    this.apiKey = config.apiKey
    this.model = config.model
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 1024
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const payload: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? this.temperature,
      max_tokens: options?.maxTokens ?? this.maxTokens,
    }
    if (options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' }
    }

    const response = await axios.post(this.endpoint, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    })

    const data = response.data
    const choice = data?.choices?.[0]?.message?.content ?? ''
    return {
      content: typeof choice === 'string' ? choice : JSON.stringify(choice),
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      raw: data,
    }
  }

  async validateConfig(config: LlmProviderConfig): Promise<boolean> {
    try {
      // 用最便宜的方式探一次：发一个 1 token 的 chat
      const probe = new OpenAiCompatibleLlmProvider(config)
      const r = await probe.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 1, temperature: 0 }
      )
      return typeof r.content === 'string'
    } catch {
      return false
    }
  }
}

function normalizeChatEndpoint(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  if (/\/chat\/completions$/.test(trimmed)) return trimmed
  if (/\/v\d+$/.test(trimmed)) return `${trimmed}/chat/completions`
  // 用户只填了域名，按 OpenAI 默认补全
  return `${trimmed}/v1/chat/completions`
}
