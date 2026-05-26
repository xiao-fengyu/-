import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { fork, ChildProcess } from 'child_process'
import { existsSync, mkdirSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

function getServerPort(): number {
  return parseInt(process.env.SERVER_PORT || '3001', 10)
}

function startBackendServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'data')

    // 确保数据目录存在
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    const imagesDir = join(userDataPath, 'data', 'images')
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true })
    }

    const uploadsDir = join(userDataPath, 'data', 'uploads')
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true })
    }

    const port = getServerPort()

    // 解析 dist-server 路径：打包后文件被 unpack 到 app.asar.unpacked 目录
    let serverPath: string
    if (app.isPackaged) {
      // 生产环境：resources/app.asar.unpacked/dist-server/index.js
      serverPath = join(process.resourcesPath, 'app.asar.unpacked', 'dist-server', 'index.js')
    } else {
      // 开发环境：相对路径
      serverPath = join(__dirname, '../dist-server/index.js')
    }
    const serverPathTs = join(__dirname, '../../server/index.ts')

    // 优先使用编译后的 JS，回退到 TS（开发模式）
    const serverEntry = existsSync(serverPath)
      ? serverPath
      : existsSync(serverPathTs)
        ? serverPathTs
        : null

    if (!serverEntry) {
      console.error('[Electron] 找不到后端服务器入口')
      reject(new Error('找不到后端服务器入口'))
      return
    }

    console.log(`[Electron] 启动后端服务器: ${serverEntry}`)
    console.log(`[Electron] 数据目录: ${userDataPath}`)
    console.log(`[Electron] 端口: ${port}`)

    serverProcess = fork(serverEntry, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        SERVER_PORT: String(port),
        DB_DIR: dbDir,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`)
    })

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`)
    })

    serverProcess.on('error', (err) => {
      console.error('[Server] 启动失败:', err)
      reject(err)
    })

    serverProcess.on('exit', (code) => {
      console.log(`[Server] 进程退出，代码: ${code}`)
      serverProcess = null
    })

    // 等待服务器就绪（通过轮询或超时）
    const timeout = setTimeout(() => {
      reject(new Error('后端服务器启动超时（10s）'))
    }, 10000)

    serverProcess.on('message', (msg) => {
      if (msg === 'ready') {
        clearTimeout(timeout)
        resolve(port)
      }
    })

    // 如果 fork 的子进程不会发送 'ready' 消息，就通过轮询端口来检测
    const checkPort = setInterval(() => {
      const net = require('net')
      const socket = net.createConnection(port, '127.0.0.1', () => {
        clearInterval(checkPort)
        clearTimeout(timeout)
        socket.end()
        resolve(port)
      })
      socket.on('error', () => {
        // 端口还没开放，继续轮询
      })
    }, 500)

    // 5秒后停止轮询（让 timeout 处理）
    setTimeout(() => clearInterval(checkPort), 9000)
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 开发模式加载 Vite 开发服务器
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // 在 Electron 环境下，将所有外链交给系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  try {
    // 启动后端服务器
    await startBackendServer()

    // 设置全局 API 地址，通过 preload + contextBridge 注入渲染进程
    const port = getServerPort()
    const apiBaseUrl = `http://127.0.0.1:${port}`
    ;(global as any).__API_BASE_URL = apiBaseUrl
    process.env.API_BASE_URL = apiBaseUrl

    createWindow()
  } catch (err) {
    console.error('[Electron] 后端启动失败:', err)
    // 仍然设置 API 地址，前端会显示错误
    const port = getServerPort()
    ;(global as any).__API_BASE_URL = `http://127.0.0.1:${port}`
    process.env.API_BASE_URL = `http://127.0.0.1:${port}`
    createWindow()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // 关闭后端子进程
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 确保退出时清理
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
  }
})
