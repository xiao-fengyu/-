// ============================================================
// 平台适配器统一接口
// ============================================================

import type { DatabaseService } from '../database'

/** 平台凭据 */
export interface PlatformCredential {
  platform: string        // pdd / taobao / jd / 1688
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  shopName?: string
}

/** 发布商品参数 */
export interface PublishProductParams {
  /** 商品名称 */
  goodsName: string
  /** 商品描述/详情 */
  goodsDesc?: string
  /** 类目 ID */
  categoryId: string | number
  /** 商品图片 URL（平台图片空间） */
  images: string[]
  /** 主图索引（第几张作为主图） */
  mainImageIndex?: number
  /** SKU 列表 */
  skus: ProductSku[]
  /** 发货地址 */
  deliveryAddress?: string
  /** 物流模板 ID */
  logisticsId?: string
  /** 承诺发货时间（小时） */
  shipmentLimitSecond?: number
  /** 是否支持假一赔十 */
  isFolt?: boolean
  /** 额外平台参数 */
  extra?: Record<string, unknown>
}

/** 商品 SKU */
export interface ProductSku {
  /** 规格名，如 "颜色" */
  specName?: string
  /** 规格值，如 "红色" */
  specValue?: string
  /** SKU 价格（元） */
  price: number
  /** SKU 库存 */
  stock: number
  /** SKU 图片 */
  image?: string
  /** SKU 外部编码 */
  outSkuId?: string
}

/** 发布结果 */
export interface PublishResult {
  success: boolean
  goodsId?: string | number   // 平台商品 ID
  error?: string              // 错误信息
  errorCode?: string          // 平台错误码
  rawResponse?: unknown       // 原始响应（调试用）
}

/** 类目节点 */
export interface CategoryNode {
  id: string | number
  name: string
  parentId?: string | number
  level: number
  isLeaf: boolean
  children?: CategoryNode[]
}

/** 图片上传结果 */
export interface ImageUploadResult {
  success: boolean
  imageUrl?: string    // 平台图片空间 URL
  fileId?: string      // 平台文件 ID
  error?: string
}

/** 平台适配器统一接口 */
export interface IPlatformAdapter {
  /** 平台标识 */
  readonly platform: string

  /** 平台名称 */
  readonly name: string

  /** 设置凭据 */
  setCredential(credential: PlatformCredential): void

  /** 获取当前 token 是否有效 */
  isTokenValid(): boolean

  /** OAuth 授权（获取/刷新 token） */
  authenticate(code?: string): Promise<PlatformCredential>

  /** 获取类目树 */
  getCategories(parentId?: string | number): Promise<CategoryNode[]>

  /** 上传图片到平台图片空间 */
  uploadImage(imagePath: string, imageName?: string): Promise<ImageUploadResult>

  /** 发布商品 */
  publishProduct(params: PublishProductParams): Promise<PublishResult>

  /** 查询商品详情 */
  getProductInfo(goodsId: string | number): Promise<Record<string, unknown>>

  /** 获取已发布商品列表 */
  getProducts(page?: number, pageSize?: number): Promise<{
    total: number
    items: Array<Record<string, unknown>>
  }>
}

/** 平台适配器工厂 */
export function createPlatformAdapter(
  platform: string,
  db: DatabaseService
): IPlatformAdapter {
  switch (platform.toLowerCase()) {
    case 'pdd':
    case 'pinduoduo':
    case '拼多多': {
      const { PddAdapter } = require('./pdd-adapter')
      return new PddAdapter(db)
    }
    default:
      throw new Error(`不支持的平台: ${platform}`)
  }
}
