// ============================================================
// Prompt 模板系统 — 电商场景预设
// ============================================================

export interface PromptTemplate {
  id: string
  name: string
  category: string
  prompt: string          // 模板文本，{subject} 等占位符
  description: string
  tags: string[]
  suggestedParams: {
    size?: { width: number; height: number }
    style?: string
  }
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'clothing-flat',
    name: '服装平铺',
    category: '服装',
    prompt: '白色背景上的{subject}，平铺拍摄，自然光线，高清，电商商品图风格',
    description: '适合上衣、裤子、裙子等服装的平铺展示图',
    tags: ['服装', '平铺', '白底'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'clothing-model',
    name: '服装模特展示',
    category: '服装',
    prompt: '模特穿着{subject}，简约室内背景，自然光线，时尚摄影风格，高清',
    description: '模拟模特穿搭效果，增强购买欲望',
    tags: ['服装', '模特', '穿搭'],
    suggestedParams: { size: { width: 720, height: 1280 } },
  },
  {
    id: 'electronics-white',
    name: '数码产品白底图',
    category: '数码',
    prompt: '纯白背景上的{subject}，产品摄影，干净简洁，高光反射，电商主图风格',
    description: '手机、耳机、手表等数码产品的标准白底展示图',
    tags: ['数码', '白底', '产品'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'electronics-lifestyle',
    name: '数码场景图',
    category: '数码',
    prompt: '{subject}放在现代简约的桌面上，自然光，生活场景，温暖色调',
    description: '数码产品在使用场景中的展示，增加代入感',
    tags: ['数码', '场景', '生活'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'home-lifestyle',
    name: '家居生活场景',
    category: '家居',
    prompt: '{subject}在温馨的家居环境中，自然光线，生活气息，柔和色调',
    description: '家居用品在实际使用场景中的展示',
    tags: ['家居', '场景', '温馨'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'home-white',
    name: '家居白底图',
    category: '家居',
    prompt: '纯白背景上的{subject}，产品摄影，45度角，柔和灯光，电商标准图',
    description: '家居产品的标准白底展示图',
    tags: ['家居', '白底', '产品'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'food-top-view',
    name: '美食俯拍',
    category: '食品',
    prompt: '{subject}俯拍视角，木质桌面背景，自然光线，美食摄影，诱人食欲',
    description: '食品类商品的俯拍展示，突出食材质感',
    tags: ['食品', '俯拍', '美食'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'food-lifestyle',
    name: '美食场景图',
    category: '食品',
    prompt: '{subject}摆放在精致餐桌上，搭配餐具和装饰，暖色调灯光，高级感',
    description: '食品在用餐场景中的展示',
    tags: ['食品', '场景', '高级'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'generic-white',
    name: '通用白底图',
    category: '通用',
    prompt: '纯白背景上的{subject}，产品摄影，干净简洁，电商主图标准',
    description: '适用于各类商品的通用白底展示图',
    tags: ['通用', '白底', '基础'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
  {
    id: 'generic-lifestyle',
    name: '通用场景图',
    category: '通用',
    prompt: '{subject}在简约的现代环境中，自然光线，高质量产品摄影',
    description: '适用于各类商品的通用场景展示图',
    tags: ['通用', '场景', '简约'],
    suggestedParams: { size: { width: 1024, height: 1024 } },
  },
]

/**
 * 根据模板 ID 和替换变量生成最终 prompt
 */
export function renderPrompt(
  templateId: string,
  variables: Record<string, string>
): string {
  const template = PROMPT_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    throw new Error(`模板不存在: ${templateId}`)
  }

  let prompt = template.prompt
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return prompt
}

/**
 * 按分类获取模板
 */
export function getTemplatesByCategory(category?: string): PromptTemplate[] {
  if (!category) return PROMPT_TEMPLATES
  return PROMPT_TEMPLATES.filter((t) => t.category === category)
}

/**
 * 获取所有分类列表
 */
export function getCategories(): string[] {
  return [...new Set(PROMPT_TEMPLATES.map((t) => t.category))]
}
