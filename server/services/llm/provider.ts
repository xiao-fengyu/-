// ============================================================
// LLM Provider 工厂
// ============================================================

import type { LlmProviderConfig, ILlmProvider } from './types'
import { OpenAiCompatibleLlmProvider } from './openai-compatible'

export function createLlmProvider(config: LlmProviderConfig): ILlmProvider {
  // 目前所有支持的 LLM 都走 OpenAI 兼容协议（含通义/DeepSeek 兼容模式）
  // 未来要接非兼容协议（如百度文心原生 API）再在这里加 switch
  return new OpenAiCompatibleLlmProvider(config)
}
