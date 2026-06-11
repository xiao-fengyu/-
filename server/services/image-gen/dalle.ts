// ============================================================
// DALL-E 提供商实现（支持文生图 + 图生图 via images/edits）
// ============================================================

import axios from 'axios'
import FormData from 'form-data'
import * as fs from 'fs'
import type {
  ImageProviderConfig,
  IImageProvider,
  ImageGenerationResponse,
  GenerationOptions,
  ImageToImageOptions,
} from './types'

export class DallEProvider implements IImageProvider {
  readonly id = 'dall-e-3'
  readonly name = 'DALL-E 3'

  private apiKey: string
  private model: string
  private endpoint: string
  private editsEndpoint: string

  constructor(config: ImageProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'dall-e-3'
    this.endpoint = config.endpoint || 'https://api.openai.com/v1/images/generations'
    // 图生图端点：把 generations 替换为 edits，方便用户用同一个 base URL
    this.editsEndpoint = this.endpoint.replace(/\/generations\/?$/, '/edits')
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
        timeout: 120000,
      }
    )

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

  /**
   * 图生图 — 走 OpenAI /v1/images/edits
   * 注意：OpenAI 官方 edits 端点只支持 dall-e-2 模型，且要求图片为 PNG。
   * 对兼容端点（如 NewAPI/OneAPI 转发的 dall-e-3 edits）也能直接走通。
   * 参考图支持：本地文件路径 / data URI / 远程 URL。
   */
  async generateFromImage(
    referenceImage: string,
    prompt: string,
    count: number,
    options?: ImageToImageOptions
  ): Promise<ImageGenerationResponse> {
    const size = this.resolveSize(options)
    // edits 端点 dall-e-2 单次最多 10 张
    const n = Math.min(Math.max(count, 1), 10)

    // 把参考图统一加载成 Buffer + 文件名
    const { buffer, filename } = await loadImageBuffer(referenceImage)

    const form = new FormData()
    form.append('model', this.model)
    form.append('prompt', prompt)
    form.append('n', String(n))
    form.append('size', size)
    form.append('response_format', 'url')
    form.append('image', buffer, { filename, contentType: 'image/png' })
    if (options?.seed) form.append('seed', String(options.seed))

    const response = await axios.post(this.editsEndpoint, form, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      timeout: 120000,
    })

    return {
      created: response.data.created || Math.floor(Date.now() / 1000),
      images: (response.data.data || []).map((item: { url?: string; b64_json?: string }) => ({
        url: item.url,
        base64: item.b64_json,
      })),
    }
  }

  private resolveSize(options?: GenerationOptions): string {
    const w = options?.width || 1024
    const h = options?.height || 1024

    // DALL-E 3 只支持特定尺寸
    if (w === 1024 && h === 1024) return '1024x1024'
    if (w === 1024 && h === 1792) return '1024x1792'
    if (w === 1792 && h === 1024) return '1792x1024'

    return '1024x1024'
  }
}

// ============================================================
// 工具函数：把"本地路径 / data URI / 远程 URL"统一加载成 Buffer
// ============================================================

async function loadImageBuffer(
  ref: string
): Promise<{ buffer: Buffer; filename: string }> {
  // data URI
  if (ref.startsWith('data:')) {
    const match = ref.match(/^data:(.+?);base64,(.+)$/)
    if (!match) throw new Error('参考图 data URI 格式错误')
    return {
      buffer: Buffer.from(match[2], 'base64'),
      filename: 'reference.png',
    }
  }

  // 远程 URL
  if (/^https?:\/\//.test(ref)) {
    const dl = await axios.get(ref, { responseType: 'arraybuffer', timeout: 30000 })
    return { buffer: Buffer.from(dl.data), filename: 'reference.png' }
  }

  // 本地路径
  if (fs.existsSync(ref)) {
    return { buffer: fs.readFileSync(ref), filename: 'reference.png' }
  }

  throw new Error(`无法加载参考图: ${ref.slice(0, 80)}`)
}
