import express from 'express'
import imageRoutes from './routes/images'
import pddRoutes from './routes/pdd'
import { DatabaseService } from './services/database'

const app = express()
const PORT = 3001

app.use(express.json())

// 初始化数据库服务（全局共享）
const dbService = new DatabaseService()

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 图片生成 & 处理路由
app.use('/api/images', imageRoutes)

// 拼多多平台路由
app.use('/api/pdd', pddRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
