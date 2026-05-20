import express from 'express'
import imageRoutes from './routes/images'
import pddRoutes from './routes/pdd'
import productsRoutes from './routes/products'
import draftsRoutes from './routes/drafts'
import logsRoutes from './routes/logs'
import backupRoutes from './routes/backup'

const app = express()
const PORT = 3001

app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
