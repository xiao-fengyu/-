import { create } from 'zustand'

export interface ProviderConfig {
  id: string
  name: string
  type: 'api' | 'local'
  endpoint: string
  apiKey: string
  model: string
  maxImages: number
  isDefault: boolean
}

export interface PlatformCredential {
  id: string
  platform: string
  clientId: string
  clientSecret: string
  accessToken: string
  shopName: string
  isConnected: boolean
}

// ============================================================
// 批量任务类型定义
// ============================================================

export interface BatchTask {
  id: string
  name: string
  platform: string
  credential_id: string
  provider_config: string
  status: string
  total_items: number
  completed_items: number
  failed_items: number
  import_file_path: string
  created_at: string
  updated_at: string
  // 附加统计（从 counts 接口获取）
  total?: number
  imported?: number
  generated?: number
  confirmed?: number
  published?: number
  failed?: number
}

export interface BatchItem {
  id: string
  batch_task_id: string
  product_id: string
  row_number: number
  title: string
  description: string
  price: number
  stock: number
  category_id: string
  image_path: string
  status: string
  error_message: string
  created_at: string
}

export interface ParsedItem {
  title: string
  description: string
  price?: number
  stock?: number
  category_id?: string
}

// ============================================================
// 文本 LLM 模型配置（用于 Prompt 优化等文本任务）
// ============================================================

export interface TextModelConfig {
  id: string
  name: string          // 显示名，如 "通义千问" / "DeepSeek-V3"
  endpoint: string      // OpenAI 兼容端点
  apiKey: string
  model: string         // 模型名，如 qwen-plus / deepseek-chat
}

// ============================================================
// Store 接口
// ============================================================

interface AppState {
  // 侧边栏
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // AI 提供商
  providers: ProviderConfig[]
  setProviders: (providers: ProviderConfig[]) => void
  addProvider: (provider: Omit<ProviderConfig, 'id'>) => void
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  deleteProvider: (id: string) => void

  // 平台凭据
  platformCredentials: PlatformCredential[]
  setPlatformCredentials: (creds: PlatformCredential[]) => void
  addPlatformCredential: (cred: Omit<PlatformCredential, 'id' | 'isConnected'>) => void
  updatePlatformCredential: (id: string, updates: Partial<PlatformCredential>) => void
  deletePlatformCredential: (id: string) => void

  // 批量任务
  batchTasks: BatchTask[]
  currentTask: BatchTask | null
  currentTaskItems: BatchItem[]
  importPreview: ParsedItem[] | null
  setBatchTasks: (tasks: BatchTask[]) => void
  setCurrentTask: (task: BatchTask | null) => void
  setCurrentTaskItems: (items: BatchItem[]) => void
  setImportPreview: (preview: ParsedItem[] | null) => void
  clearBatchState: () => void

  // 文本 LLM 模型
  textModels: TextModelConfig[]
  setTextModels: (models: TextModelConfig[]) => void
  addTextModel: (model: Omit<TextModelConfig, 'id'>) => void
  updateTextModel: (id: string, updates: Partial<TextModelConfig>) => void
  deleteTextModel: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  providers: [],
  setProviders: (providers) => set({ providers }),
  addProvider: (provider) =>
    set((state) => ({
      providers: [...state.providers, { ...provider, id: Date.now().toString() }],
    })),
  updateProvider: (id, updates) =>
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deleteProvider: (id) =>
    set((state) => ({
      providers: state.providers.filter((p) => p.id !== id),
    })),

  platformCredentials: [],
  setPlatformCredentials: (creds) => set({ platformCredentials: creds }),
  addPlatformCredential: (cred) =>
    set((state) => ({
      platformCredentials: [
        ...state.platformCredentials,
        { ...cred, id: Date.now().toString(), isConnected: false },
      ],
    })),
  updatePlatformCredential: (id, updates) =>
    set((state) => ({
      platformCredentials: state.platformCredentials.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  deletePlatformCredential: (id) =>
    set((state) => ({
      platformCredentials: state.platformCredentials.filter((c) => c.id !== id),
    })),

  // ===== 批量任务 =====
  batchTasks: [],
  currentTask: null,
  currentTaskItems: [],
  importPreview: null,
  setBatchTasks: (tasks) => set({ batchTasks: tasks }),
  setCurrentTask: (task) => set({ currentTask: task }),
  setCurrentTaskItems: (items) => set({ currentTaskItems: items }),
  setImportPreview: (preview) => set({ importPreview: preview }),
  clearBatchState: () => set({ currentTask: null, currentTaskItems: [], importPreview: null }),

  // ===== 文本 LLM 模型 =====
  textModels: [],
  setTextModels: (models) => set({ textModels: models }),
  addTextModel: (model) =>
    set((state) => ({
      textModels: [...state.textModels, { ...model, id: Date.now().toString() }],
    })),
  updateTextModel: (id, updates) =>
    set((state) => ({
      textModels: state.textModels.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  deleteTextModel: (id) =>
    set((state) => ({
      textModels: state.textModels.filter((m) => m.id !== id),
    })),
}))
