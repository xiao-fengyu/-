// ============================================================
// 自定义提供商实现 — 用户可配置任意 API 端点
// ============================================================

import axios from 'axios'
import type {
  ImageProviderConfig,
  IImageProvider,
  ImageGenerationResponse,
  GenerationOptions,
} from './types'

export class CustomProvider implements IImageProvider {
  readonly id: string
  readonly name: string

  private endpoint: string
  private apiKey: string
  private model: string
  private defaultParams: Record<string, unknown>

  constructor(config: ImageProviderConfig) {
    this.id = config.id
    this.name = config.name
    this.endpoint = config.endpoint
    this.apiKey = config.apiKey
    this.model = config.model
    this.defaultParams = config.defaultParams || {}
  }

  async generate(
    prompt: string,
    count: number,
    options?: GenerationOptions
  ): Promise<ImageGenerationResponse> {
    const payload = {
      model: this.model,
      prompt,
      n: count,
      ...this.defaultParams,
      ...options,
    }

    const response = await axios.post(this.endpoint, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    })

    // 尝试解析不同格式的响应
    const data = response.data

    // OpenAI 格式: { data: [{ url, b64_json }] }
    if (Array.isArray(data.data)) {
      return {
        created: data.created || Math.floor(Date.now() / 1000),
        images: data.data.map((item: { url?: string; b64_json?: string }) => ({
          url: item.url,
          base64: item.b64_json,
        })),
      }
    }

    // 直接返回 images 数组
    if (Array.isArray(data.images)) {
      return {
        created: data.created || Math.floor(Date.now() / 1000),
        images: data.images,
      }
    }

    // 单个 url 字段
    if (data.url) {
      return {
        created: data.created || Math.floor(Date.now() / 1000),
        images: [{ url: data.url }],
      }
    }

    throw new Error(`无法解析自定义提供商的响应格式: ${JSON.stringify(data).slice(0, 500)}`)
  }

  async getModels(): Promise<string[]> {
    return [this.model]
  }

  async validateConfig(config: ImageProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(config.endpoint, {
        timeout: 10000,
        headers: config.apiKey
          ? { Authorization: `Bearer ${config.apiKey}` }
          : undefined,
      })
      return response.status < 400
    } catch {
      return false
    }
  }
}
