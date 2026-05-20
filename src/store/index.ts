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
}))
