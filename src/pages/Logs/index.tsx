import { Card, Empty } from 'antd'

export default function LogsPage() {
  return (
    <div>
      <h1>操作日志</h1>
      <Card>
        <Empty description="暂无操作记录" />
      </Card>
    </div>
  )
}
