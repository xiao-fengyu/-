// ============================================================
// 前端 API 调用封装
// ============================================================

import axios from 'axios'

const API_BASE = 'http://127.0.0.1:14714'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
})

// ===== AI 图片生成 =====

/** 获取 Prompt 模板列表 */
export async function fetchTemplates() {
  const res = await api.get('/api/images/templates')
  return res.data
}

/** 渲染模板 prompt */
export async function renderTemplate(templateId: string, variables: Record<string, string>) {
  const res = await api.post('/api/images/templates/render', { templateId, variables })
  return res.data
}

/** 生成图片 */
export async function generateImages(params: {
  providerConfig: Record<string, unknown>
  prompt: string
  count?: number
  width?: number
  height?: number
}) {
  const res = await api.post('/api/images/generate', params)
  return res.data
}

/** 合规检查 */
export async function checkCompliance(imagePath: string) {
  const res = await api.post('/api/images/compliance', { imagePath })
  return res.data
}

/** 自动处理图片 */
export async function processImage(
  imagePath: string,
  format?: string,
  width?: number,
  height?: number
) {
  const res = await api.post('/api/images/process', {
    imagePath,
    format,
    width,
    height,
  })
  return res.data
}

/** 获取图片列表 */
export async function fetchImages(page = 1, pageSize = 50) {
  const res = await api.get('/api/images', { params: { page, pageSize } })
  return res.data
}

/** 删除图片 */
export async function deleteImage(filename: string) {
  const res = await api.delete(`/api/images/${filename}`)
  return res.data
}

// ===== 平台发布 =====

/** 获取平台类目树 */
export async function fetchCategories(platform: string, parentId?: number) {
  const res = await api.get(`/api/platforms/${platform}/categories`, {
    params: parentId !== undefined ? { parentId } : {},
  })
  return res.data
}

/** 上传图片到平台 */
export async function uploadToPlatform(platform: string, filePath: string, credentialId: string) {
  const FormData = (await import('form-data')).default
  const formData = new FormData()
  formData.append('credentialId', credentialId)

  // 注意：浏览器环境需要用 Blob，这里后端用文件路径
  const res = await api.post(`/api/platforms/${platform}/upload`, formData, {
    headers: formData.getHeaders?.(),
    params: { filePath, credentialId },
  })
  return res.data
}

/** 发布商品 */
export async function publishProduct(platform: string, params: {
  credentialId: string
  goodsName: string
  goodsDesc?: string
  categoryId: string | number
  images: string[]
  mainImageIndex?: number
  skus: Array<{
    specName?: string
    specValue?: string
    price: number
    stock: number
    image?: string
  }>
  deliveryAddress?: string
  logisticsId?: string
  shipmentLimitSecond?: number
}) {
  const res = await api.post(`/api/platforms/${platform}/publish`, params)
  return res.data
}

/** 查询平台商品详情 */
export async function fetchProductInfo(platform: string, goodsId: string | number, credentialId: string) {
  const res = await api.get(`/api/platforms/${platform}/products/${goodsId}`, {
    params: { credentialId },
  })
  return res.data
}

/** 获取平台商品列表 */
export async function fetchPlatformProducts(platform: string, credentialId: string, page = 1, pageSize = 20) {
  const res = await api.get(`/api/platforms/${platform}/products`, {
    params: { credentialId, page, pageSize },
  })
  return res.data
}

/** 平台 OAuth 授权 */
export async function platformAuth(platform: string, credentialId: string, code?: string) {
  const res = await api.post(`/api/platforms/${platform}/auth`, { credentialId, code })
  return res.data
}

export default api
