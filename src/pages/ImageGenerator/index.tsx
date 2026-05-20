import { Card, Input, Button, Select, Space } from 'antd'
import { useState } from 'react'
import './ImageGenerator.css'

const { TextArea } = Input

export default function ImageGeneratorPage() {
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState('')

  return (
    <div className="image-generator">
      <h1>AI 图片生成</h1>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <label>商品描述</label>
            <TextArea
              rows={4}
              placeholder="描述你的商品，例如：白色陶瓷马克杯，简约风格，纯白背景，自然光照"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label>AI 提供商</label>
            <Select
              style={{ width: 200 }}
              placeholder="选择提供商"
              value={provider}
              onChange={setProvider}
              options={[]}
            />
          </div>
          <Button type="primary" size="large">
            生成图片
          </Button>
        </Space>
      </Card>
      <Card title="候选图片" style={{ marginTop: 16 }}>
        <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
          还没有生成的图片
        </p>
      </Card>
    </div>
  )
}
