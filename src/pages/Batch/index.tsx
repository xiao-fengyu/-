import { Card, Empty, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

export default function BatchPage() {
  return (
    <div>
      <h1>批量任务</h1>
      <Card
        title="导入商品清单"
        extra={<Button type="primary" icon={<UploadOutlined />}>导入 Excel/CSV</Button>}
      >
        <Empty description="还没有批量任务，导入商品清单开始吧" />
      </Card>
    </div>
  )
}
