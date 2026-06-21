import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { API_BASE } from '../../services/api'

interface ActivityItem {
  id: string
  text: string
  time: string
  dot: 'purple' | 'green' | 'amber'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [imageCount, setImageCount] = useState<number | string>('-')
  const [publishCount, setPublishCount] = useState<number | string>('-')
  const [draftCount, setDraftCount] = useState<number | string>('-')
  const [platformCount, setPlatformCount] = useState<number | string>('-')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [platformStatuses, setPlatformStatuses] = useState<{ name: string; ok: boolean }[]>([])

  const loadData = useCallback(async () => {
    try {
      const [imagesRes, logsRes, credsRes] = await Promise.all([
        fetch(`${API_BASE}/api/images`),
        fetch(`${API_BASE}/api/logs?action=publish&status=success&limit=3`),
        fetch(`${API_BASE}/api/pdd/credentials`),
      ])
      const [imagesData, logsData, credsData] = await Promise.all([
        imagesRes.json(), logsRes.json(), credsRes.json(),
      ])

      const imgCount = imagesData.success ? imagesData.data.length : 0
      const pubCount = logsData.success ? logsData.total : 0
      const platCount = credsData.success ? credsData.data.length : 0

      setImageCount(imgCount)
      setPublishCount(pubCount)
      setDraftCount(Math.max(0, imgCount - pubCount))
      setPlatformCount(platCount)

      const acts: ActivityItem[] = []
      if (imagesData.success && imagesData.data.length > 0) {
        acts.push({ id: 'img', text: '生成了图片资源', time: formatTime(imagesData.data[0].created_at), dot: 'purple' })
      }
      if (logsData.success && logsData.data?.length > 0) {
        const l = logsData.data[0]
        acts.push({ id: 'pub', text: `「${l.product_id || '商品'}」发布${l.status === 'success' ? '成功' : '失败'}`, time: formatTime(l.created_at), dot: l.status === 'success' ? 'green' : 'amber' })
      }
      setActivities(acts)

      if (credsData.success) {
        setPlatformStatuses(credsData.data.map((c: { platform?: string; name?: string }) => ({ name: c.platform || c.name || '平台', ok: true })))
      }
    } catch {
      // silent fail — UI shows dashes
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <div className="dashboard">
      <div className="page-head">
        <div className="page-title">{greeting} 👋</div>
        <div className="page-sub">今日待处理 · 上次操作 2 小时前</div>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-val">{imageCount}</div>
          <div className="kpi-label">图片总数</div>
          <div className="kpi-delta">↑ 本周新增</div>
        </div>
        <div className="kpi">
          <div className="kpi-val">{publishCount}</div>
          <div className="kpi-label">已发布</div>
          <div className="kpi-delta">↑ 今日</div>
        </div>
        <div className="kpi">
          <div className="kpi-val">{draftCount}</div>
          <div className="kpi-label">草稿</div>
          <div className="kpi-delta warn">待处理</div>
        </div>
        <div className="kpi">
          <div className="kpi-val">{platformCount}</div>
          <div className="kpi-label">接入平台</div>
          <div className="kpi-delta muted">拼多多 · 淘宝</div>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">快速操作</div>
      </div>
      <div className="actions-grid">
        <div className="action-card" onClick={() => navigate('/image/generate')}>
          <div className="ac-top"><span className="ac-emoji">✦</span><span className="ac-arrow">↗</span></div>
          <div className="ac-title">AI 生成图片</div>
          <div className="ac-desc">输入描述，模型自动生成商品主图与详情图</div>
        </div>
        <div className="action-card" onClick={() => navigate('/publish')}>
          <div className="ac-top"><span className="ac-emoji">⬆</span><span className="ac-arrow">↗</span></div>
          <div className="ac-title">发布商品</div>
          <div className="ac-desc">一键同步发布到拼多多、淘宝等多个平台</div>
        </div>
        <div className="action-card" onClick={() => navigate('/batch')}>
          <div className="ac-top"><span className="ac-emoji">⊞</span><span className="ac-arrow">↗</span></div>
          <div className="ac-title">批量导入</div>
          <div className="ac-desc">上传 Excel，批量创建商品并触发图片生成</div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-title">动态</div>
          {activities.length > 0 ? activities.map(item => (
            <div className="feed-item" key={item.id}>
              <div className={`feed-dot fd-${item.dot}`} />
              <div className="feed-text">{item.text}</div>
              <div className="feed-time">{item.time}</div>
            </div>
          )) : (
            <div style={{ color: 'var(--text-subtle)', fontSize: 12, paddingTop: 8 }}>暂无动态</div>
          )}
        </div>
        <div className="panel">
          <div className="panel-title">服务状态</div>
          {platformStatuses.length > 0 ? platformStatuses.map(p => (
            <div className="status-row" key={p.name}>
              <div className="status-name">
                <div className={`feed-dot fd-${p.ok ? 'green' : 'amber'}`} />
                {p.name}
              </div>
              <span className={`status-pill ${p.ok ? 'sp-ok' : 'sp-warn'}`}>{p.ok ? '已连接' : '异常'}</span>
            </div>
          )) : (
            <div style={{ color: 'var(--text-subtle)', fontSize: 12, paddingTop: 8 }}>暂无平台</div>
          )}
          <div className="status-row">
            <div className="status-name">
              <div className="feed-dot fd-amber" />
              Qwen 模型
            </div>
            <span className="status-pill sp-warn">运行中</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '最近'
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000)
  if (diffH < 1) return '刚刚'
  if (diffH < 24) return `${diffH}h 前`
  return `${Math.floor(diffH / 24)} 天前`
}
