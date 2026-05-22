import express from 'express'
import { join } from 'path'
import imageRoutes from './routes/images'
import pddRoutes from './routes/pdd'
import productsRoutes from './routes/products'
import draftsRoutes from './routes/drafts'
import logsRoutes from './routes/logs'
import backupRoutes from './routes/backup'
import batchRoutes from './routes/batch'
import providerRoutes from './routes/providers'
import { getConfig, ensureConfigExists } from './config'

const app = express()

app.use(express.json())

// 静态文件服务
// 图片目录
const dataDir = process.env.DB_DIR || join(__dirname, '../data')
app.use('/images', express.static(join(dataDir, 'images')))
app.use('/uploads', express.static(join(dataDir, 'uploads')))

// 生产环境：服务前端静态文件
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist')
  app.use(express.static(distPath))
  // SPA 路由回退
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 图片生成 & 处理路由
app.use('/api/images', imageRoutes)

// 拼多多平台路由
app.use('/api/pdd', pddRoutes)

// 商品管理路由
app.use('/api/products', productsRoutes)

// 草稿路由
app.use('/api/drafts', draftsRoutes)

// 操作日志路由
app.use('/api/logs', logsRoutes)

// 数据备份路由
app.use('/api/backup', backupRoutes)

// 批量任务路由
app.use('/api/batch', batchRoutes)

// AI 提供商管理路由
app.use('/api/providers', providerRoutes)

export function startServer(port?: number): Promise<{ port: number; server: ReturnType<typeof app.listen> }> {
  return new Promise((resolve) => {
    const actualPort = port ?? getConfig().server.port
    const server = app.listen(actualPort, () => {
      console.log(`Server running on http://127.0.0.1:${actualPort}`)
      resolve({ port: actualPort, server })
    })
  })
}

// 独立运行时启动
if (require.main === module) {
  ensureConfigExists()
  startServer().then(() => {
    // 如果是 Electron fork 的子进程，通知父进程
    if (process.send) {
      process.send('ready')
    }
  })
}

export default app
