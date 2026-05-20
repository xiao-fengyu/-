import { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Statistic, Button, Table, Tag, Empty, Spin } from 'antd'
import { PictureOutlined, CloudUploadOutlined, ShopOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

// ============================================================
// 类型
// ============================================================

interface ProductItem {
  id: string
  title: string
  platform: string
  status: string
  created_at: string
  updated_at: string
}

interface PublishLog {
  id: number
  product_id: string
  status: string
  platform: string
  message: string
  created_at: string
}

const API = 'http://127.0.0.1:14714'

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
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
  const [recentProducts, setRecentProducts] = useState<ProductItem[]>([])
  const [publishHistory, setPublishHistory] = useState<PublishLog[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 图片数量
      const imagesData = await api<{ success: boolean; data: any[] }>('/api/images')
      if (imagesData.success) setImageCount(imagesData.data.length)

      // 发布成功数量
      const logsData = await api<{ success: boolean; data: any[]; total: number }>(
        '/api/logs?action=publish&status=success&limit=1'
      )
      if (logsData.success) setPublishCount(logsData.total)

      // 平台凭据数量
      const credsData = await api<{ success: boolean; data: any[] }>('/api/pdd/credentials')
      if (credsData.success) setPlatformCount(credsData.data.length)

      // 最近商品
      const productsData = await api<{ success: boolean; data: ProductItem[] }>('/api/products')
      if (productsData.success) {
        setRecentProducts(productsData.data.slice(0, 5))
      }

      // 发布历史
      const historyData = await api<{ success: boolean; data: PublishLog[] }>('/api/logs/publish-history?limit=10')
      if (historyData.success) setPublishHistory(historyData.data)
    } catch {
      // 后端未启动时静默失败
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const productColumns = [
    { title: '名称', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: string) => {
        const colorMap: Record<string, string> = { draft: 'orange', published: 'green', failed: 'red' }
        const labelMap: Record<string, string> = { draft: '草稿', published: '已发布', failed: '失败' }
        return <Tag color={colorMap[s] || 'default'}>{labelMap[s] || s}</Tag>
      },
    },
    { title: '平台', dataIndex: 'platform', key: 'platform', width: 80 },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180 },
  ]

  const historyColumns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s === 'success' ? '成功' : '失败'}</Tag>,
    },
    { title: '平台', dataIndex: 'platform', key: 'platform', width: 80 },
    { title: '信息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  ]

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>工作台</h1>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>
          刷新
        </Button>
      </div>

      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

      {!loading && (
        <>
          <Row gutter={[16, 16]} className="dashboard-stats">
            <Col span={8}>
              <Card>
                <Statistic title="已生成图片" value={imageCount} prefix={<PictureOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="已发布商品" value={publishCount} prefix={<CloudUploadOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="已绑定平台" value={platformCount} prefix={<ShopOutlined />} />
              </Card>
            </Col>
          </Row>

          <div className="dashboard-actions" style={{ marginTop: 16 }}>
            <Button type="primary" size="large" onClick={() => navigate('/image/generate')}>
              新建商品
            </Button>
            <Button size="large" onClick={() => navigate('/publish')} style={{ marginLeft: 8 }}>
              发布商品
            </Button>
            <Button size="large" onClick={() => navigate('/batch')} style={{ marginLeft: 8 }}>
              批量任务
            </Button>
          </div>

          <Card title="最近任务" className="dashboard-recent" style={{ marginTop: 16 }}>
            {recentProducts.length > 0 ? (
              <Table
                dataSource={recentProducts}
                columns={productColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ) : (
              <Empty description="暂无最近任务，开始创建你的第一个商品吧" />
            )}
          </Card>

          <Card title="最近发布记录" style={{ marginTop: 16 }}>
            {publishHistory.length > 0 ? (
              <Table
                dataSource={publishHistory}
                columns={historyColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ) : (
              <Empty description="暂无发布记录" />
            )}
          </Card>
        </>
      )}
    </div>
  )
}
