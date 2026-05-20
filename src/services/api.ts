// ============================================================
// 前端 API 调用封装
// ============================================================

import type { ImageProviderConfig } from '../../server/services/image-gen/types'

const BASE = 'http://localhost:3001/api'

// ============================================================
// Prompt 模板
// ============================================================

export async function fetchTemplates() {
  const res = await fetch(`${BASE}/images/templates`)
  return res.json()
}

export async function fetchTemplatesByCategory(category: string) {
  const res = await fetch(`${BASE}/images/templates/category/${category}`)
  return res.json()
}

export async function renderTemplate(templateId: string, variables: Record<string, string>) {
  const res = await fetch(`${BASE}/images/templates/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, variables }),
  })
  return res.json()
}

// ============================================================
// 图片生成
// ============================================================

export interface GenerateParams {
  providerConfig: ImageProviderConfig
  prompt: string
  count?: number
  width?: number
  height?: number
  style?: string
  quality?: string
  seed?: number
  productId?: string
}

export async function generateImages(params: GenerateParams) {
  const res = await fetch(`${BASE}/images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

// ============================================================
// 图片处理
// ============================================================

export async function checkCompliance(imagePath: string, requirements?: any) {
  const res = await fetch(`${BASE}/images/compliance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePath, requirements }),
  })
  return res.json()
}

export async function processImage(
  imagePath: string,
  requirements?: any,
  targetWidth?: number,
  targetHeight?: number
) {
  const res = await fetch(`${BASE}/images/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePath, requirements, targetWidth, targetHeight }),
  })
  return res.json()
}

export async function convertFormat(imagePath: string, outputPath: string, format: string) {
  const res = await fetch(`${BASE}/images/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePath, outputPath, format }),
  })
  return res.json()
}

// ============================================================
// 图片管理
// ============================================================

export async function fetchImages() {
  const res = await fetch(`${BASE}/images/images`)
  return res.json()
}

export async function deleteImage(filename: string) {
  const res = await fetch(`${BASE}/images/images/${filename}`, { method: 'DELETE' })
  return res.json()
}

// ============================================================
// 提供商管理
// ============================================================

export async function validateProvider(providerConfig: ImageProviderConfig) {
  const res = await fetch(`${BASE}/images/providers/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerConfig }),
  })
  return res.json()
}

export async function getProviderModels(providerConfig: ImageProviderConfig) {
  const res = await fetch(`${BASE}/images/providers/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerConfig }),
  })
  return res.json()
}
