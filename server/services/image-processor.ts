// ============================================================
// 图片处理服务 — Sharp
// 功能：合规检查、裁剪、缩放、格式转换、压缩
// ============================================================

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

/** 平台图片要求 */
export interface ImageRequirements {
  minWidth: number
  minHeight: number
  maxWidthMB: number      // 最大文件大小（MB）
  allowedFormats: string[] // 允许的格式，如 ['jpg', 'png']
  requireWhiteBg?: boolean // 是否需要纯白背景
}

/** 合规检查结果 */
export interface ComplianceResult {
  compliant: boolean
  issues: string[]
  width: number
  height: number
  fileSize: number
  format: string
}

/** 拼多多默认要求 */
export const PDD_REQUIREMENTS: ImageRequirements = {
  minWidth: 480,
  minHeight: 480,
  maxWidthMB: 3,
  allowedFormats: ['jpg', 'jpeg', 'png'],
  requireWhiteBg: true,
}

/** 处理结果 */
export interface ProcessResult {
  outputPath: string
  width: number
  height: number
  fileSize: number
  format: string
}

export class ImageProcessor {
  private readonly outputDir: string

  constructor(outputDir: string) {
    this.outputDir = outputDir
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
  }

  /**
   * 检查图片是否符合平台要求
   */
  async checkCompliance(
    imagePath: string,
    requirements: ImageRequirements = PDD_REQUIREMENTS
  ): Promise<ComplianceResult> {
    const metadata = await sharp(imagePath).metadata()
    const stats = fs.statSync(imagePath)
    const issues: string[] = []

    const width = metadata.width || 0
    const height = metadata.height || 0
    const fileSize = stats.size
    const format = (metadata.format || '').toLowerCase()

    if (width < requirements.minWidth) {
      issues.push(`宽度 ${width}px 小于最小要求 ${requirements.minWidth}px`)
    }
    if (height < requirements.minHeight) {
      issues.push(`高度 ${height}px 小于最小要求 ${requirements.minHeight}px`)
    }

    const sizeMB = fileSize / (1024 * 1024)
    if (sizeMB > requirements.maxWidthMB) {
      issues.push(`文件大小 ${sizeMB.toFixed(2)}MB 超过限制 ${requirements.maxWidthMB}MB`)
    }

    if (!requirements.allowedFormats.includes(format)) {
      issues.push(`格式 "${format}" 不在允许范围内: ${requirements.allowedFormats.join(', ')}`)
    }

    return {
      compliant: issues.length === 0,
      issues,
      width,
      height,
      fileSize,
      format,
    }
  }

  /**
   * 自动处理图片以符合平台要求
   * - 缩放到目标尺寸
   * - 转换为指定格式
   * - 压缩到大小限制内
   */
  async processToCompliant(
    imagePath: string,
    requirements: ImageRequirements = PDD_REQUIREMENTS,
    targetWidth?: number,
    targetHeight?: number
  ): Promise<ProcessResult> {
    const w = targetWidth || Math.max(requirements.minWidth, 800)
    const h = targetHeight || w

    // 生成输出文件名
    const ext = requirements.allowedFormats.includes('png') ? 'png' : 'jpg'
    const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8)
    const outputPath = path.join(this.outputDir, `processed_${hash}.${ext}`)

    let pipeline = sharp(imagePath)
      .resize(w, h, {
        fit: 'cover',
        position: 'center',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })

    if (ext === 'jpg') {
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true })
    } else {
      pipeline = pipeline.png({ compressionLevel: 8 })
    }

    await pipeline.toFile(outputPath)

    // 如果文件仍然太大，降低质量重试
    let stats = fs.statSync(outputPath)
    let quality = 85
    while (stats.size > requirements.maxWidthMB * 1024 * 1024 && quality > 30) {
      quality -= 10
      if (ext === 'jpg') {
        await sharp(imagePath)
          .resize(w, h, { fit: 'cover', position: 'center' })
          .jpeg({ quality, mozjpeg: true })
          .toFile(outputPath)
      } else {
        await sharp(imagePath)
          .resize(w, h, { fit: 'cover', position: 'center' })
          .png({ compressionLevel: 9 })
          .toFile(outputPath)
      }
      stats = fs.statSync(outputPath)
    }

    const finalMetadata = await sharp(outputPath).metadata()

    return {
      outputPath,
      width: finalMetadata.width || w,
      height: finalMetadata.height || h,
      fileSize: stats.size,
      format: ext,
    }
  }

  /**
   * 裁剪图片到指定区域
   */
  async crop(
    imagePath: string,
    outputPath: string,
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<ProcessResult> {
    const metadata = await sharp(imagePath)
      .extract({ left, top, width, height })
      .toFile(outputPath)

    const stats = fs.statSync(outputPath)

    return {
      outputPath,
      width,
      height,
      fileSize: stats.size,
      format: metadata.format || 'jpg',
    }
  }

  /**
   * 格式转换
   */
  async convertFormat(
    imagePath: string,
    outputPath: string,
    format: 'jpg' | 'png' | 'webp'
  ): Promise<ProcessResult> {
    let pipeline = sharp(imagePath)

    switch (format) {
      case 'jpg':
        pipeline = pipeline.jpeg({ quality: 85 })
        break
      case 'png':
        pipeline = pipeline.png()
        break
      case 'webp':
        pipeline = pipeline.webp()
        break
    }

    await pipeline.toFile(outputPath)
    const finalStats = fs.statSync(outputPath)
    const metadata = await sharp(outputPath).metadata()

    return {
      outputPath,
      width: metadata.width || 0,
      height: metadata.height || 0,
      fileSize: finalStats.size,
      format,
    }
  }
}
