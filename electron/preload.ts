import { contextBridge } from 'electron'

// 暴露安全的 IPC 通道给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 后续添加 IPC 调用
  // invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  // send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
})

// 标记 Electron 环境，供前端检测
;(window as any).__ELECTRON__ = true
