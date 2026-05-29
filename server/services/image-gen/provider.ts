// ============================================================
// IImageProvider 统一接口
// ============================================================

import type {
  ImageProviderConfig,
  IImageProvider,
  ImageGenerationResponse,
  GenerationOptions,
} from './types'

export type { ImageProviderConfig, IImageProvider, ImageGenerationResponse, GenerationOptions }
export { GenerationOptions as IGenerationOptions }

// 导出默认实例的工厂函数
export function createProvider(config: ImageProviderConfig): IImageProvider {
  // 根据类型返回对应的提供商实现
  switch (config.name.toLowerCase()) {
    case 'dall-e':
    case 'dall-e 3':
    case 'dall-e-3': {
      const { DallEProvider } = require('./dalle')
      return new DallEProvider(config)
    }
    case '通义万相':
    case 'wanx':
    case 'wanx-v1': {
      const { WanxProvider } = require('./wanx')
      return new WanxProvider(config)
      }
    default: {
      const { CustomProvider } = require('./custom')
      return new CustomProvider(config)
    }
  }
}
