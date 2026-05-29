// ============================================================
// PDD 签名工具
// 拼多多 API 使用 MD5 签名
// ============================================================

import * as crypto from 'crypto'

/**
 * 生成 PDD API 请求签名
 * 
 * 签名算法：
 * 1. 将所有请求参数按参数名 ASCII 升序排列
 * 2. 拼接：key1value1key2value2...client_secret
 * 3. MD5 哈希后转大写
 */
export function pddSign(
  params: Record<string, string | number | boolean>,
  clientSecret: string
): string {
  // 按 key 升序排列
  const sorted = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('')

  // 拼接 client_secret
  const signString = sorted + clientSecret

  // MD5 并转大写
  return crypto
    .createHash('md5')
    .update(signString)
    .digest('hex')
    .toUpperCase()
}

/**
 * 构建 PDD API 请求 URL 和 body
 */
export function buildPddRequest(
  type: string,
  clientId: string,
  accessToken: string,
  clientSecret: string,
  params: Record<string, string | number | boolean | object>
): {
  gatewayUrl: string
  formBody: Record<string, string>
  fileField?: string
} {
  const timestamp = Math.floor(Date.now() / 1000)

  // 基础参数
  const baseParams: Record<string, string | number | boolean> = {
    client_id: clientId,
    timestamp,
    data_type: 'JSON',
    sign_method: 'MD5',
    access_token: accessToken,
    type,
  }

  // 业务参数：object 类型转为 JSON 字符串
  const extraParams: Record<string, string | number | boolean> = {}
  let fileField: string | undefined

  for (const [key, value] of Object.entries(params)) {
    if (value instanceof Buffer || (typeof value === 'object' && value !== null)) {
      // Buffer 或特殊标记的文件字段
      if (key === '__file__' && typeof value === 'object') {
        const fileObj = value as { field: string; buffer: Buffer; filename: string }
        fileField = fileObj.field
        // 文件通过 form-data 上传，不在签名参数中
      } else {
        extraParams[key] = typeof value === 'string' ? value : JSON.stringify(value)
      }
    } else {
      extraParams[key] = value
    }
  }

  // 合并参数用于签名
  const allParams = { ...baseParams, ...extraParams }
  const sign = pddSign(allParams, clientSecret)

  // 构建 form body（签名也要加入 body）
  const formBody: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(allParams).map(([k, v]) => [k, String(v)])
    ),
    sign,
  }

  return {
    gatewayUrl: 'https://gw-api.pinduoduo.com/api/router',
    formBody,
    fileField,
  }
}
