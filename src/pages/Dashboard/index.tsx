import { useState, useEffect, useCallback } from 'react'
import { Tag, Empty, Spin, Button } from 'antd'
import { ReloadOutlined, RocketOutlined, CloudUploadOutlined, ImportOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { API_BASE } from '../../services/api'

// ============================================================
// 类型
// ============================================================

interface ActivityItem {
  id: string
  text: string
  time: string
  dot: 'purple' | 'green' | 'amber'
}

interface StatData {
  label: string
  value: number | string
}

// ============================================================
// Dashboard 页面
// ============================================================

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [imageCount, setImageCount] = useState(0)
  const [publishCount, setPublishCount] = useState(0)
  const [platformCount, setPlatformCount] = useState(0)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState<StatData[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/images`, {
        headers: { 'Content-Type': 'application/json' },
      })
      const imagesData = await res.json()
      if (imagesData.success) setImageCount(imagesData.data.length)

      const logsRes = await fetch(`${API_BASE}/api/logs?action=publish&status=success&limit=1`, {
        headers: { 'Content-Type': 'application/json' },
      })
      const logsData = await logsRes.json()
      if (logsData.success) setPublishCount(logsData.total)

      const credsRes = await fetch(`${API_BASE}/api/pdd/credentials`, {
        headers: { 'Content-Type': 'application/json' },
      })
      const credsData = await credsRes.json()
      if (credsData.success) setPlatformCount(credsData.data.length)

      // 构建活动流
      const acts: ActivityItem[] = []
      if (imagesData.success && imagesData.data.length > 0) {
        const latest = imagesData.data[0]
        acts.push({
          id: 'img',
          text: `生成了图片资源`,
          time: latest.created_at ? formatTime(latest.created_at) : '最近',
          dot: 'purple',
        })
      }
      if (logsData.success && logsData.data?.length > 0) {
        const latest = logsData.data[0]
        acts.push({
          id: 'pub',
          text: `「${latest.product_id || '商品'}」发布${latest.status === 'success' ? '成功' : '失败'}`,
          time: latest.created_at ? formatTime(latest.created_at) : '最近',
          dot: latest.status === 'success' ? 'green' : 'amber',
        })
      }
      setActivities(acts)

      // 统计数据
      setStats([
        { label: '图片总数', value: imageCount },
        { label: '已发布', value: publishCount },
        { label: '草稿', value: Math.max(0, imageCount - publishCount) },
        { label: '平台数', value: platformCount },
      ])
    } catch {
      // 后端未启动时静默失败
      setStats([
        { label: '图片总数', value: '-' },
        { label: '已发布', value: '-' },
        { label: '草稿', value: '-' },
        { label: '平台数', value: '-' },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 当前时间问候语
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <div className="dashboard">
      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}
      {!loading && (
        <>
          {/* 问候语 + 快捷操作 */}
          <div className="dashboard-greeting">👋 {greeting}！准备好开始了吗？</div>
          <div className="dashboard-subtitle">快速开始你的商品生产流程</div>

          <div className="dashboard-quick-actions">
            <div className="action-card" onClick={() => navigate('/image/generate')}>
              <div className="ac-icon purple">🎨</div>
              <h3>AI 生成图片</h3>
              <p>输入描述或选模板，自动生成</p>
              <button className="ab">开始生成 →</button>
            </div>
            <div className="action-card" onClick={() => navigate('/publish')}>
              <div className="ac-icon green">📤</div>
              <h3>继续发布</h3>
              <p>选择商品，一键发布到平台</p>
              <button className="ab outline">继续 →</button>
            </div>
            <div className="action-card" onClick={() => navigate('/batch')}>
              <div className="ac-icon amber">📦</div>
              <h3>批量导入</h3>
              <p>Excel 一键导入批量上架</p>
              <button className="ab outline">导入 →</button>
            </div>
          </div>

          {/* 下方双面板 */}
          <div className="dashboard-grid">
            <div className="dash-panel">
              <h4>📋 最近动态</h4>
              {activities.length > 0 ? (
                activities.map(item => (
                  <div className="activity-item" key={item.id}>
                    <span className={`activity-dot ${item.dot}`} />
                    <div className="activity-text">
                      {item.text}
                      <span className="tm">· {item.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <Empty description="暂无动态" style={{ marginTop: 20 }} />
              )}
            </div>

            <div className="dash-panel">
              <h4>⚡ 快捷统计</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {stats.map(s => (
                  <div className="stat-item" key={s.label}>
                    <div className="sv">{s.value}</div>
                    <div className="sl">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 保留刷新按钮（隐藏放置） */}
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={loadData}
            style={{ position: 'fixed', top: 70, right: 24, zIndex: 100, borderRadius: 8 }}
            size="small"
          >
            刷新
          </Button>
        </>
      )}
    </div>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return '刚刚'
  if (diffH < 24) return `${diffH} 小时前`
  return `${Math.floor(diffH / 24)} 天前`
}
