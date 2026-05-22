// ============================================================
// 统一配置模块
// 优先级：环境变量 > config.json > 默认值
// ============================================================

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

// 项目根目录（server/ 的上级）
const ROOT_DIR = join(__dirname, '../..')
const CONFIG_PATH = join(ROOT_DIR, 'config.json')
const CONFIG_EXAMPLE_PATH = join(ROOT_DIR, 'config.json.example')

// 默认配置
const DEFAULTS = {
  server: {
    port: 3001,
  },
  aiProvider: {
    name: '',
    endpoint: '',
    apiKey: '',
    model: '',
  },
  platforms: {
    pinduoduo: {
      clientId: '',
      clientSecret: '',
      redirectUri: 'http://localhost:3001/api/pdd/oauth/callback',
    },
  },
  imageOutput: {
    minWidth: 480,
    minHeight: 480,
    maxSizeMB: 3,
    format: 'jpg' as 'jpg' | 'png' | 'webp',
  },
  batch: {
    maxConcurrency: 3,
    maxRetries: 3,
    retryDelayMs: 2000,
  },
}

export type AppConfig = typeof DEFAULTS

function loadConfigFile(): Partial<AppConfig> {
  if (!existsSync(CONFIG_PATH)) return {}
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    console.warn('[Config] config.json 解析失败，使用默认值')
    return {}
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const targetVal = target[key]
    const sourceVal = source[key]
    if (
      typeof targetVal === 'object' && targetVal !== null && !Array.isArray(targetVal) &&
      typeof sourceVal === 'object' && sourceVal !== null && !Array.isArray(sourceVal)
    ) {
      deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>)
    } else if (sourceVal !== undefined) {
      target[key] = sourceVal
    }
  }
}

export function loadConfig(): AppConfig {
  const config = JSON.parse(JSON.stringify(DEFAULTS)) as Record<string, unknown>

  // 2. 合并 config.json
  const fileConfig = loadConfigFile()
  deepMerge(config, fileConfig as Record<string, unknown>)

  // 3. 环境变量覆盖（最高优先级）
  if (process.env.SERVER_PORT) {
    config.server = config.server || {}
    ;(config.server as Record<string, unknown>).port = parseInt(process.env.SERVER_PORT, 10)
  }

  return config as AppConfig
}

export function saveConfig(config: Partial<AppConfig>): void {
  const existing = loadConfigFile()
  deepMerge(existing as Record<string, unknown>, config as Record<string, unknown>)
  writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf-8')
}

export function getConfigPath(): string {
  return CONFIG_PATH
}

export function ensureConfigExists(): boolean {
  if (existsSync(CONFIG_PATH)) return true
  if (existsSync(CONFIG_EXAMPLE_PATH)) {
    try {
      const example = readFileSync(CONFIG_EXAMPLE_PATH, 'utf-8')
      writeFileSync(CONFIG_PATH, example, 'utf-8')
      console.log('[Config] 已从 config.json.example 创建 config.json')
      return true
    } catch {
      console.warn('[Config] 无法创建 config.json')
    }
  }
  return false
}

// 单例
let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig()
  }
  return _config
}

export function reloadConfig(): AppConfig {
  _config = loadConfig()
  return _config
}
