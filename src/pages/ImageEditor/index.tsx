import { Card, Empty } from 'antd'

export default function ImageEditorPage() {
  return (
    <div>
      <h1>图片编辑</h1>
      <Card>
        <Empty description="选择一张已生成的图片进行编辑" />
      </Card>
    </div>
  )
}
