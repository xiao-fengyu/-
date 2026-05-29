// ============================================================
// DALL-E 3 提供商实现
// ============================================================

import axios from 'axios'
import type {
  ImageProviderConfig,
  IImageProvider,
  ImageGenerationResponse,
  GenerationOptions,
} from './types'

export class DallEProvider implements IImageProvider {
  readonly id = 'dall-e-3'
  readonly name = 'DALL-E 3'

  private apiKey: string
  private model: string
  private endpoint: string

  constructor(config: ImageProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'dall-e-3'
    this.endpoint = config.endpoint || 'https://api.openai.com/v1/images/generations'
  }

  async generate(
    prompt: string,
    count: number,
    options?: GenerationOptions
  ): Promise<ImageGenerationResponse> {
    const size = this.resolveSize(options)
    const quality = (options?.quality as string) || 'standard'

    // DALL-E 3 单次最多 1 张，DALL-E 2 最多 10 张
    const isDallE3 = this.model.includes('3')
    const n = isDallE3 ? 1 : Math.min(count, 10)

    const response = await axios.post(
      this.endpoint,
      {
        model: this.model,
        prompt,
        n,
        size,
        quality,
        response_format: 'url',
        ...(options?.seed ? { seed: options.seed } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // DALL-E 生成较慢，设置 120s 超时
      }
    )

    // OpenAI 响应格式: { created: timestamp, data: [{ url: "...", revised_prompt: "..." }] }
    return {
      created: response.data.created,
      images: response.data.data.map((item: { url?: string; b64_json?: string }) => ({
        url: item.url,
        base64: item.b64_json,
      })),
    }
  }

  async getModels(): Promise<string[]> {
    return ['dall-e-3', 'dall-e-2']
  }

  async validateConfig(config: ImageProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        timeout: 10000,
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  private resolveSize(options?: GenerationOptions): string {
    const w = options?.width || 1024
    const h = options?.height || 1024

    // DALL-E 3 只支持特定尺寸
    if (w === 1024 && h === 1024) return '1024x1024'
    if (w === 1024 && h === 1792) return '1024x1792'
    if (w === 1792 && h === 1024) return '1792x1024'

    // 默认正方形
    return '1024x1024'
  }
}
