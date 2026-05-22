// ============================================================
// 前端 API 调用封装
// ============================================================

import axios from 'axios'

// 动态获取 API 基础 URL
// Electron 环境：使用相对路径（与后端同源）
// 开发环境：使用 Vite proxy（配置在 vite.config.ts）
export const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '' // 生产环境：相对路径
  : (typeof window !== 'undefined' && (window as any).__ELECTRON__)
    ? '' // Electron 环境：相对路径
    : 'http://127.0.0.1:3001' // 开发环境：后端端口

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

// ===== 批量任务 =====

/** 导入批量任务文件 */
export async function importBatch(file: File, params?: {
  platform?: string
  credentialId?: string
  providerConfig?: string
}) {
  const FormData = (await import('form-data')).default
  const formData = new FormData()
  formData.append('file', file)

  if (params?.platform) formData.append('platform', params.platform)
  if (params?.credentialId) formData.append('credentialId', params.credentialId)
  if (params?.providerConfig) formData.append('providerConfig', params.providerConfig)

  const res = await api.post('/api/batch/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/** 获取批量任务列表 */
export async function fetchBatchTasks() {
  const res = await api.get('/api/batch/tasks')
  return res.data
}

/** 获取单个批量任务详情 */
export async function fetchBatchTask(taskId: string) {
  const res = await api.get(`/api/batch/tasks/${taskId}`)
  return res.data
}

/** 删除批量任务 */
export async function deleteBatchTask(taskId: string) {
  const res = await api.delete(`/api/batch/tasks/${taskId}`)
  return res.data
}

/** 触发批量生成 */
export async function startBatchGeneration(taskId: string, providerConfig: Record<string, unknown>, maxConcurrency?: number) {
  const res = await api.post(`/api/batch/tasks/${taskId}/generate`, {
    providerConfig,
    maxConcurrency,
  })
  return res.data
}

/** 查询批量生成/发布进度 */
export async function fetchBatchStatus(taskId: string) {
  const res = await api.get(`/api/batch/tasks/${taskId}/status`)
  return res.data
}

/** 批量确认已生成条目 */
export async function confirmBatch(taskId: string, itemIds?: string[]) {
  const res = await api.post(`/api/batch/tasks/${taskId}/confirm`, { itemIds })
  return res.data
}

/** 触发批量发布 */
export async function startBatchPublish(taskId: string, credentialId: string, maxConcurrency?: number) {
  const res = await api.post(`/api/batch/tasks/${taskId}/publish`, {
    credentialId,
    maxConcurrency,
  })
  return res.data
}

/** 重试失败条目 */
export async function retryFailed(taskId: string, action: 'generate' | 'publish') {
  const res = await api.post(`/api/batch/tasks/${taskId}/retry-failed`, { action })
  return res.data
}

export default api
