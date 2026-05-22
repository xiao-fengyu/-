// ============================================================
// 拼多多平台适配器
// ============================================================

import * as fs from 'fs'
import * as path from 'path'
import FormData from 'form-data'
import axios from 'axios'
import type {
  IPlatformAdapter,
  PlatformCredential,
  PublishProductParams,
  PublishResult,
  CategoryNode,
  ImageUploadResult,
} from './adapter'
import { pddSign } from '../../utils/pdd-sign'

const PDD_GATEWAY = 'https://gw-api.pinduoduo.com/api/router'

export class PddAdapter implements IPlatformAdapter {
  readonly platform = 'pdd'
  readonly name = '拼多多'

  private credential: PlatformCredential | null = null

  constructor() {}

  setCredential(credential: PlatformCredential): void {
    this.credential = credential
  }

  isTokenValid(): boolean {
    if (!this.credential?.accessToken) return false
    if (this.credential.expiresAt) {
      return new Date() < new Date(this.credential.expiresAt)
    }
    return true
  }

  /**
   * 获取 OAuth 授权 URL
   * 拼多多 OAuth 2.0 授权页面
   */
  getOAuthUrl(redirectUri: string, state?: string): string {
    const clientId = this.credential?.clientId || ''
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: '', // 拼多多不需要额外 scope
    })
    if (state) params.set('state', state)
    return `https://openid.pinduoduo.com/authorize?${params.toString()}`
  }

  /**
   * OAuth 授权
   * POST /api/router
   * type=pdd.opentk.token.grant
   */
  async authenticate(code?: string): Promise<PlatformCredential> {
    if (!this.credential) {
      throw new Error('未设置平台凭据')
    }

    const type = 'pdd.opentk.token.grant'
    const params: Record<string, string | number | boolean> = {
      client_id: this.credential.clientId,
      code: code || '',
      grant_type: 'authorization_code',
    }

    const sign = pddSign(params, this.credential.clientSecret)
    const body = new URLSearchParams({
      type,
      client_id: this.credential.clientId,
      code: params.code as string,
      grant_type: 'authorization_code',
      sign,
      sign_method: 'MD5',
      timestamp: String(Math.floor(Date.now() / 1000)),
      data_type: 'JSON',
    })

    const response = await axios.post(PDD_GATEWAY, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    })

    const data = response.data
    if (data.error_response) {
      throw new Error(
        `PDD OAuth 失败: ${data.error_response.error_desc || data.error_response.error_msg}`
      )
    }

    const tokenData = data.opentk_token_grant_response || data
    this.credential = {
      ...this.credential,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      shopName: tokenData.shop_name || this.credential.shopName,
    }

    return this.credential
  }

  /**
   * 获取类目树
   * type=pdd.goods.cats.get
   */
  async getCategories(parentId?: string | number): Promise<CategoryNode[]> {
    this.ensureAuth()

    const params: Record<string, string | number> = {
      client_id: this.credential!.clientId,
      access_token: this.credential!.accessToken,
      type: 'pdd.goods.cats.get',
      parent_cat_id: parentId || 0,
    }

    const sign = pddSign(
      { ...params, data_type: 'JSON', sign_method: 'MD5', timestamp: Math.floor(Date.now() / 1000) },
      this.credential!.clientSecret
    )

    const body = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      data_type: 'JSON',
      sign_method: 'MD5',
      timestamp: String(Math.floor(Date.now() / 1000)),
      sign,
    })

    const response = await axios.post(PDD_GATEWAY, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    })

    if (response.data.error_response) {
      throw new Error(response.data.error_response.error_desc)
    }

    const catsData = response.data.goods_cats_get_response?.goods_cats || []
    return catsData.map((cat: any) => ({
      id: cat.cat_id,
      name: cat.cat_name,
      parentId: cat.parent_cat_id,
      level: cat.level,
      isLeaf: cat.is_leaf,
    }))
  }

  /**
   * 上传图片到平台图片空间
   * type=pdd.goods.filespace.image.upload
   */
  async uploadImage(imagePath: string, imageName?: string): Promise<ImageUploadResult> {
    this.ensureAuth()

    const fileBuffer = fs.readFileSync(imagePath)
    const filename = imageName || path.basename(imagePath)
    const timestamp = Math.floor(Date.now() / 1000)

    // 构建签名参数
    const signParams: Record<string, string | number> = {
      client_id: this.credential!.clientId,
      timestamp,
      data_type: 'JSON',
      sign_method: 'MD5',
      access_token: this.credential!.accessToken,
      type: 'pdd.goods.filespace.image.upload',
    }
    const sign = pddSign(signParams, this.credential!.clientSecret)

    // 构建 form-data
    const form = new FormData()
    form.append('client_id', this.credential!.clientId)
    form.append('timestamp', timestamp)
    form.append('data_type', 'JSON')
    form.append('sign_method', 'MD5')
    form.append('access_token', this.credential!.accessToken)
    form.append('type', 'pdd.goods.filespace.image.upload')
    form.append('sign', sign)
    form.append('file', fileBuffer, {
      filename,
      contentType: 'image/jpeg',
    })

    const response = await axios.post(PDD_GATEWAY, form, {
      headers: form.getHeaders(),
      timeout: 120000, // 文件上传超时更长
    })

    if (response.data.error_response) {
      return {
        success: false,
        error: response.data.error_response.error_desc,
      }
    }

    const uploadData = response.data.image_upload_response || response.data
    return {
      success: true,
      imageUrl: uploadData.image_url || uploadData.url,
      fileId: uploadData.file_id || uploadData.fid,
    }
  }

  /**
   * 发布商品
   * type=pdd.goods.add
   */
  async publishProduct(params: PublishProductParams): Promise<PublishResult> {
    this.ensureAuth()

    // 构建商品数据
    const goodsData: Record<string, unknown> = {
      goods_name: params.goodsName,
      category_id: params.categoryId,
      market_price: Math.round(params.skus[0]?.price * 100 || 0), // 分
      sales_price: Math.round(params.skus[0]?.price * 100 || 0),
      quantity: params.skus.reduce((sum, sku) => sum + sku.stock, 0),
      goods_desc: params.goodsDesc || '',
      goods_image_url: params.images[0] || '',
      thumb_url: params.images[0] || '',
    }

    if (params.deliveryAddress) {
      goodsData.country_id = 1 // 中国
    }

    if (params.shipmentLimitSecond) {
      goodsData.shipment_limit_second = params.shipmentLimitSecond
    }

    // SKU 数据
    if (params.skus.length === 1) {
      // 单 SKU 商品
      goodsData.sku_type = 0
    } else {
      // 多 SKU 商品
      goodsData.sku_type = 1
      goodsData.skus = params.skus.map((sku, index) => ({
        price: Math.round(sku.price * 100),
        quantity: sku.stock,
        spec_id: index,
        spec: [{
          spec_key: 'spec_key_1',
          spec_value: sku.specValue || `规格${index + 1}`,
          spec_key_id: 1,
          spec_value_id: index + 1,
        }],
        thumb_url: sku.image || params.images[0] || '',
        limit_quantity: sku.stock,
      }))
    }

    // 多轮图
    if (params.images.length > 1) {
      goodsData.goods_gallery_urls = params.images.slice(1)
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const signParams: Record<string, string | number> = {
      client_id: this.credential!.clientId,
      timestamp,
      data_type: 'JSON',
      sign_method: 'MD5',
      access_token: this.credential!.accessToken,
      type: 'pdd.goods.add',
      goods: JSON.stringify(goodsData),
    }
    const sign = pddSign(signParams, this.credential!.clientSecret)

    const body = new URLSearchParams({
      client_id: this.credential!.clientId,
      timestamp: String(timestamp),
      data_type: 'JSON',
      sign_method: 'MD5',
      access_token: this.credential!.accessToken,
      type: 'pdd.goods.add',
      goods: JSON.stringify(goodsData),
      sign,
    })

    try {
      const response = await axios.post(PDD_GATEWAY, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 60000,
      })

      if (response.data.error_response) {
        return {
          success: false,
          error: response.data.error_response.error_desc,
          errorCode: response.data.error_response.error_code,
          rawResponse: response.data,
        }
      }

      const addData = response.data.goods_add_response || response.data
      return {
        success: true,
        goodsId: addData.goods_id,
        rawResponse: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '请求失败',
        rawResponse: error.response?.data,
      }
    }
  }

  /**
   * 查询商品详情
   */
  async getProductInfo(goodsId: string | number): Promise<Record<string, unknown>> {
    this.ensureAuth()

    const timestamp = Math.floor(Date.now() / 1000)
    const signParams: Record<string, string | number> = {
      client_id: this.credential!.clientId,
      timestamp,
      data_type: 'JSON',
      sign_method: 'MD5',
      access_token: this.credential!.accessToken,
      type: 'pdd.goods.information.get',
      goods_id: String(goodsId),
    }
    const sign = pddSign(signParams, this.credential!.clientSecret)

    const body = new URLSearchParams({
      ...Object.fromEntries(Object.entries(signParams).map(([k, v]) => [k, String(v)])),
      sign,
    })

    const response = await axios.post(PDD_GATEWAY, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    })

    if (response.data.error_response) {
      throw new Error(response.data.error_response.error_desc)
    }

    return response.data.goods_info_get_response?.goods_info || {}
  }

  /**
   * 获取商品列表
   */
  async getProducts(page = 1, pageSize = 20): Promise<{
    total: number
    items: Array<Record<string, unknown>>
  }> {
    this.ensureAuth()

    const timestamp = Math.floor(Date.now() / 1000)
    const signParams: Record<string, string | number> = {
      client_id: this.credential!.clientId,
      timestamp,
      data_type: 'JSON',
      sign_method: 'MD5',
      access_token: this.credential!.accessToken,
      type: 'pdd.goods.list.get',
      page,
      page_size: pageSize,
    }
    const sign = pddSign(signParams, this.credential!.clientSecret)

    const body = new URLSearchParams({
      ...Object.fromEntries(Object.entries(signParams).map(([k, v]) => [k, String(v)])),
      sign,
    })

    const response = await axios.post(PDD_GATEWAY, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    })

    if (response.data.error_response) {
      throw new Error(response.data.error_response.error_desc)
    }

    const listData = response.data.goods_list_get_response || response.data
    return {
      total: listData.total_count || 0,
      items: listData.goods_list || [],
    }
  }

  private ensureAuth(): void {
    if (!this.credential?.accessToken) {
      throw new Error('未授权，请先完成 OAuth 授权')
    }
  }
}
