import { Card, Empty, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

export default function PlatformManagerPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>平台管理</h1>
        <Button type="primary" icon={<PlusOutlined />}>
          绑定新平台
        </Button>
      </div>
      <Card>
        <Empty description="尚未绑定任何平台账号" />
      </Card>
    </div>
  )
}
