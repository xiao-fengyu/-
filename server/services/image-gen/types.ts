// ============================================================
// 类型定义 — AI 图片生成引擎
// ============================================================

/** AI 提供商配置（与数据库 image_providers 表对应） */
export interface ImageProviderConfig {
  id: string
  name: string
  type: 'api' | 'local'
  endpoint: string
  apiKey: string
  model: string
  maxImages: number
  defaultParams: Record<string, unknown>
  isDefault: boolean
}

/** 单张生成结果 */
export interface ImageResult {
  id: string            // 唯一标识
  url: string           // 远程 URL 或 data URL（DALL-E 等返回）
  localPath: string     // 下载到本地的路径
  prompt: string        // 生成时使用的 prompt
  provider: string      // 提供商 ID
  width: number
  height: number
  fileSize: number      // 字节
  createdAt: Date
}

/** 生成任务状态 */
export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed'

/** 生成任务 */
export interface GenerationTask {
  id: string
  prompt: string
  providerId: string
  count: number
  width: number
  height: number
  status: GenerationStatus
  results: ImageResult[]
  error?: string
  createdAt: Date
  completedAt?: Date
}

/** IImageProvider 统一接口 */
export interface IImageProvider {
  /** 提供商唯一标识 */
  readonly id: string

  /** 提供商显示名称 */
  readonly name: string

  /**
   * 生成图片
   * @param prompt 文字描述
   * @param count 生成数量
   * @param options 额外参数
   * @returns 图片 URL 数组（远程或 base64）
   */
  generate(
    prompt: string,
    count: number,
    options?: GenerationOptions
  ): Promise<ImageGenerationResponse>

  /** 获取支持的模型列表 */
  getModels(): Promise<string[]>

  /** 验证配置是否有效 */
  validateConfig(config: ImageProviderConfig): Promise<boolean>
}

/** 生成选项 */
export interface GenerationOptions {
  width?: number
  height?: number
  style?: string
  quality?: string
  seed?: number
  [key: string]: unknown
}

/** 生成响应 */
export interface ImageGenerationResponse {
  images: Array<{
    url?: string       // 远程 URL
    base64?: string    // base64 数据
    b64_json?: string  // OpenAI 格式
  }>
  created: number
}
