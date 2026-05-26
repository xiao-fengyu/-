import { contextBridge } from 'electron'

// 暴露安全的 IPC 通道和配置给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 后端 API 地址（由主进程通过 global 对象传递）
  getApiBaseUrl: () => {
    const nodeGlobal = global as any
    return nodeGlobal.__API_BASE_URL || 'http://127.0.0.1:3001'
  },
  // 后续添加 IPC 调用
  // invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  // send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
})

// 标记 Electron 环境，供前端检测
;(window as any).__ELECTRON__ = true
