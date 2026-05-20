import { Card, Empty } from 'antd'

export default function PublishPage() {
  return (
    <div>
      <h1>发布商品</h1>
      <Card>
        <Empty description="请先选择要发布的商品" />
      </Card>
    </div>
  )
}
