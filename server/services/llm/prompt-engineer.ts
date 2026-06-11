// ============================================================
// 自然语言 → 商品图 Prompt 工程
// 用 LLM 把用户的自然语言描述转成结构化的生图 prompt
// ============================================================

import type {
  ILlmProvider,
  NaturalLanguageToPromptRequest,
  NaturalLanguageToPromptResponse,
  ChatMessage,
} from './types'

const SYSTEM_PROMPT = `你是一名资深电商商品摄影 prompt 工程师。
你的任务是把用户用中文描述的商品需求，转换成一段适合喂给 AI 文生图模型（如 DALL-E、通义万相、Stable Diffusion）的高质量 prompt。

输出要求：
1. 优先输出英文 prompt，便于通用模型理解；中文模型也能兼容英文。
2. prompt 必须包含：商品主体、材质/颜色、构图、光线、背景、镜头风格、画质关键词。
3. 风格基线：电商产品摄影、白色或浅灰背景、自然光、高级感、4k、商业摄影、清晰锐利。
4. 严格不要出现：人物面部特写、未成年人、敏感图案、品牌 logo、版权角色。
5. 如果用户提到了"图生图/参考图"，请在 prompt 里强调"参考构图与材质，保留商品本体"。
6. 输出�须是合法 JSON，结构如下：
{
  "prompt": "<英文 prompt 字符串>",
  "attributes": {
    "subject": "<商品主体>",
    "style": "<风格>",
    "background": "<背景>",
    "lighting": "<光线>",
    "cameraAngle": "<镜头>",
    "extra": ["<其他关键词>"]
  }
}
不要输出 JSON 之外的任何文字。`

export async function naturalLanguageToPrompt(
  llm: ILlmProvider,
  req: NaturalLanguageToPromptRequest
): Promise<NaturalLanguageToPromptResponse> {
  const userParts: string[] = [`商品描述：${req.description}`]
  if (req.category) userParts.push(`电商品类：${req.category}`)
  if (req.platform) userParts.push(`目标平台：${req.platform}`)
  if (req.hasReferenceImage) userParts.push('用户已上传参考图，将走图生图模式')
  if (req.styleHints && req.styleHints.length > 0) {
    userParts.push(`风格倾向：${req.styleHints.join('、')}`)
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userParts.join('\n') },
  ]

  const resp = await llm.chat(messages, {
    temperature: 0.4,
    maxTokens: 800,
    responseFormat: 'json',
  })

  return parseLlmJson(resp.content)
}

function parseLlmJson(raw: string): NaturalLanguageToPromptResponse {
  const text = raw.trim()
  // 先尝试直接 parse
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    // 退路：从文本里抽出第一段 JSON
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) {
      // LLM 没按 JSON 返回，把整段当 prompt
      return { prompt: text, rawResponse: raw }
    }
    try {
      parsed = JSON.parse(m[0])
    } catch {
      return { prompt: text, rawResponse: raw }
    }
  }

  if (!parsed || typeof parsed.prompt !== 'string') {
    return { prompt: text, rawResponse: raw }
  }

  return {
    prompt: parsed.prompt,
    attributes: parsed.attributes,
    rawResponse: raw,
  }
}
