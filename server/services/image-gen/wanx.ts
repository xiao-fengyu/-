// ============================================================
// 通义万相（Wanx）提供商实现
// 阿里云 DashScope API — 异步任务模式
// ============================================================

import axios from 'axios'
import type {
  ImageProviderConfig,
  IImageProvider,
  ImageGenerationResponse,
  GenerationOptions,
  ImageToImageOptions,
} from './types'

const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'
const POLL_INTERVAL = 3000  // 轮询间隔 3 秒
const MAX_POLL_TIME = 120000 // 最大等待 120 秒

export class WanxProvider implements IImageProvider {
  readonly id = 'wanx-v1'
  readonly name = '通义万相'

  private apiKey: string
  private model: string

  constructor(config: ImageProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'wanx-v1'
  }

  async generate(
    prompt: string,
    count: number,
    options?: GenerationOptions
  ): Promise<ImageGenerationResponse> {
    const size = this.resolveSize(options)
    const n = Math.min(count, 4) // Wanx 单次最多 4 张

    // Step 1: 提交异步任务
    const taskResponse = await axios.post(
      `${BASE_URL}/services/aigc/text2image/image-synthesis`,
      {
        model: this.model,
        input: {
          prompt,
        },
        parameters: {
          n,
          size,
          ...(options?.seed ? { seed: options.seed } : {}),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        timeout: 15000,
      }
    )

    const taskId = taskResponse.data.output?.task_id
    if (!taskId) {
      throw new Error(`Wanx 提交任务失败: ${JSON.stringify(taskResponse.data)}`)
    }

    // Step 2: 轮询任务状态
    const startTime = Date.now()
    while (Date.now() - startTime < MAX_POLL_TIME) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))

      const statusResponse = await axios.get(`${BASE_URL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      })

      const status = statusResponse.data.output?.task_status
      if (status === 'SUCCEEDED') {
        const results = statusResponse.data.output?.results || []
        return {
          created: Math.floor(Date.now() / 1000),
          images: results.map((item: { url?: string }) => ({
            url: item.url,
          })),
        }
      }

      if (status === 'FAILED') {
        const message = statusResponse.data.output?.message || '未知错误'
        throw new Error(`Wanx 生成失败: ${message}`)
      }

      // PENDING / RUNNING → 继续轮询
    }

    throw new Error('Wanx 生成超时（120s）')
  }

  async getModels(): Promise<string[]> {
    return ['wanx-v1', 'wanx-v2']
  }

  async validateConfig(config: ImageProviderConfig): Promise<boolean> {
    try {
      const response = await axios.get(`${BASE_URL}/models`, {
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

    // Wanx 支持的尺寸
    if (w === 1024 && h === 1024) return '1024*1024'
    if (w === 720 && h === 1280) return '720*1280'
    if (w === 1280 && h === 720) return '1280*720'

    return '1024*1024'
  }

  async generateFromImage(
    referenceImage: string,
    prompt: string,
    count: number,
    options?: ImageToImageOptions
  ): Promise<ImageGenerationResponse> {
    const size = this.resolveSize(options)
    const n = Math.min(count, 4) // Wanx 单次最多 4 张

    // 准备参考图：支持本地文件路径或 base64
    let imageUrl: string
    if (referenceImage.startsWith('data:')) {
      imageUrl = referenceImage
    } else {
      // 本地文件：转为 file:// URL（DashScope 不支持本地文件直接传）
      // 需要用户确保图片可通过 URL 访问，或使用 base64 模式
      throw new Error('Wanx 图生图需要参考图为 base64 格式或远程 URL')
    }

    // Step 1: 提交图生图异步任务
    const taskResponse = await axios.post(
      `${BASE_URL}/services/aigc/image2image/image-synthesis`,
      {
        model: this.model,
        input: {
          prompt,
          image: imageUrl, // base64 或 URL
        },
        parameters: {
          n,
          size,
          ...(options?.strength ? { strength: options.strength } : {}),
          ...(options?.cfgScale ? { scale: options.cfgScale } : {}),
          ...(options?.seed ? { seed: options.seed } : {}),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        timeout: 15000,
      }
    )

    const taskId = taskResponse.data.output?.task_id
    if (!taskId) {
      throw new Error(`Wanx 图生图提交失败: ${JSON.stringify(taskResponse.data)}`)
    }

    // Step 2: 轮询任务状态（复用原有逻辑）
    const startTime = Date.now()
    while (Date.now() - startTime < MAX_POLL_TIME) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))

      const statusResponse = await axios.get(`${BASE_URL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      })

      const status = statusResponse.data.output?.task_status
      if (status === 'SUCCEEDED') {
        const results = statusResponse.data.output?.results || []
        return {
          created: Math.floor(Date.now() / 1000),
          images: results.map((item: { url?: string }) => ({
            url: item.url,
          })),
        }
      }

      if (status === 'FAILED') {
        const message = statusResponse.data.output?.message || '未知错误'
        throw new Error(`Wanx 图生图失败: ${message}`)
      }
    }

    throw new Error('Wanx 图生图超时（120s）')
  }
}
