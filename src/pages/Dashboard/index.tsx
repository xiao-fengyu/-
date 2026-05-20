import { Card, Row, Col, Statistic, Button, Empty } from 'antd'
import { PictureOutlined, CloudUploadOutlined, ShopOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <h1>工作台</h1>
      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col span={8}>
          <Card>
            <Statistic title="已生成图片" value={0} prefix={<PictureOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="已发布商品" value={0} prefix={<CloudUploadOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="已绑定平台" value={0} prefix={<ShopOutlined />} />
          </Card>
        </Col>
      </Row>

      <div className="dashboard-actions">
        <Button type="primary" size="large" onClick={() => navigate('/image/generate')}>
          新建商品
        </Button>
        <Button size="large" onClick={() => navigate('/batch')}>
          批量任务
        </Button>
      </div>

      <Card title="最近任务" className="dashboard-recent">
        <Empty description="暂无最近任务，开始创建你的第一个商品吧" />
      </Card>
    </div>
  )
}
