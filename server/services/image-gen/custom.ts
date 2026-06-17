// ============================================================
// 自定义提供商实现 — 用户可配置任意 API 端点
// ============================================================

import axios from 'axios'
import type {
  ImageProviderConfig,
  IImageProvider,
  ImageGenerationResponse,
  GenerationOptions,
  ImageToImageOptions,
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
    this.endpoint = normalizeImageEndpoint(config.endpoint)
    this.apiKey = config.apiKey
    this.model = config.model
    this.defaultParams = config.defaultParams || {}
  }

  async generate(
    prompt: string,
    count: number,
    options?: GenerationOptions
  ): Promise<ImageGenerationResponse> {
    const payloads = buildTextGenerationPayloads(this.model, prompt, count, this.defaultParams, options)
    const responses = await Promise.all(payloads.map((payload) => this.postGeneration(payload)))

    return mergeResponses(responses)
  }

  async getModels(): Promise<string[]> {
    return [this.model]
  }

  async validateConfig(config: ImageProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(normalizeImageEndpoint(config.endpoint), {
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

  async generateFromImage(
    referenceImage: string,
    prompt: string,
    count: number,
    options?: ImageToImageOptions
  ): Promise<ImageGenerationResponse> {
    // CustomProvider 灵活传递图生图参数
    const payload: Record<string, unknown> = {
      model: this.model,
      prompt,
      n: count,
      image: referenceImage, // 参考图（base64 或 URL）
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
        images: normalizeImages(data.images),
      }
    }

    // 单个 url 字段
    if (data.url) {
      return {
        created: data.created || Math.floor(Date.now() / 1000),
        images: [{ url: data.url }],
      }
    }

    throw new Error(`CustomProvider 图生图响应无法解析: ${JSON.stringify(data).slice(0, 500)}`)
  }

  private async postGeneration(payload: Record<string, unknown>): Promise<ImageGenerationResponse> {
    const response = await axios.post(this.endpoint, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    })

    return parseGenerationResponse(response.data, '无法解析自定义提供商的响应格式')
  }
}

function buildTextGenerationPayloads(
  model: string,
  prompt: string,
  count: number,
  defaultParams: Record<string, unknown>,
  options?: GenerationOptions
): Array<Record<string, unknown>> {
  if (isMinimalOpenAiImageModel(model)) {
    const explicitCount = hasAnyKey(defaultParams, ['n', 'count'])
    const requestCount = explicitCount ? 1 : Math.max(1, count)
    return Array.from({ length: requestCount }, () => ({
      model,
      prompt,
      ...defaultParams,
    }))
  }

  return [{
    model,
    prompt,
    n: count,
    ...defaultParams,
    ...options,
  }]
}

function isMinimalOpenAiImageModel(model: string): boolean {
  return /^gpt-image(?:-|$)/i.test(model)
}

function hasAnyKey(source: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(source, key))
}

function parseGenerationResponse(data: any, errorPrefix: string): ImageGenerationResponse {
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
      images: normalizeImages(data.images),
    }
  }

  // 单个 url 字段
  if (data.url) {
    return {
      created: data.created || Math.floor(Date.now() / 1000),
      images: [{ url: data.url }],
    }
  }

  throw new Error(`${errorPrefix}: ${JSON.stringify(data).slice(0, 500)}`)
}

function mergeResponses(responses: ImageGenerationResponse[]): ImageGenerationResponse {
  return {
    created: responses[0]?.created || Math.floor(Date.now() / 1000),
    images: responses.flatMap((response) => response.images),
  }
}

function normalizeImages(images: unknown[]): Array<{ url?: string; base64?: string }> {
  return images.flatMap((item) => {
    if (typeof item === 'string') return [{ url: item, base64: undefined }]
    if (item && typeof item === 'object') {
      const image = item as { url?: string; b64_json?: string; base64?: string }
      const normalized = {
        url: image.url,
        base64: image.base64 || image.b64_json,
      }
      return normalized.url || normalized.base64 ? [normalized] : []
    }
    return []
  })
}

function normalizeImageEndpoint(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  if (/\/images\/generations$/.test(trimmed)) return trimmed
  if (/\/v\d+$/.test(trimmed)) return `${trimmed}/images/generations`
  return `${trimmed}/v1/images/generations`
}
