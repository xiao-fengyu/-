import { Card, Tabs, Form, Input, Button, Select, Space, message, Table, Modal } from 'antd'
import { useState } from 'react'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAppStore, type ProviderConfig, type PlatformCredential, type TextModelConfig } from '../../store'
import './Settings.css'

const builtinProviders = [
  { name: 'DALL-E 3', endpoint: 'https://api.openai.com/v1/images/generations', model: 'dall-e-3' },
  { name: '通义万相', endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', model: 'wanx-v1' },
  { name: '文心一格', endpoint: 'https://aip.baidubce.com/rpc/2.0/ernievilg/v1/txt2img', model: 'ernie-vilg-v2' },
]

const builtinTextModels = [
  { name: '通义千问', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'OpenAI GPT', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
]

const platformOptions = [
  { label: '拼多多', value: 'pinduoduo' },
  { label: '淘宝', value: 'taobao' },
  { label: '京东', value: 'jd' },
  { label: '1688', value: '1688' },
]

export default function SettingsPage() {
  const {
    providers, addProvider, deleteProvider,
    platformCredentials, addPlatformCredential, deletePlatformCredential,
    textModels, addTextModel, deleteTextModel,
  } = useAppStore()

  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [textModelModalOpen, setTextModelModalOpen] = useState(false)
  const [providerForm] = Form.useForm()
  const [platformForm] = Form.useForm()
  const [textModelForm] = Form.useForm()

  // AI 提供商
  const handleAddProvider = async (values: any) => {
    addProvider({
      name: values.name,
      type: 'api',
      endpoint: values.endpoint,
      apiKey: values.apiKey,
      model: values.model,
      maxImages: values.maxImages || 4,
      isDefault: values.isDefault || false,
    })
    message.success('提供商已添加')
    setProviderModalOpen(false)
    providerForm.resetFields()
  }

  const handleDeleteProvider = (id: string) => {
    deleteProvider(id)
    message.success('已删除')
  }

  const handleQuickAdd = (preset: typeof builtinProviders[0]) => {
    addProvider({
      name: preset.name,
      type: 'api',
      endpoint: preset.endpoint,
      apiKey: '',
      model: preset.model,
      maxImages: 4,
      isDefault: false,
    })
    message.success(`${preset.name} 已添加，请填写 API Key`)
  }

  // 平台凭据
  const handleAddPlatform = async (values: any) => {
    addPlatformCredential({
      platform: values.platform,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
      accessToken: values.accessToken || '',
      shopName: values.shopName || '',
    })
    message.success('平台已添加')
    platformForm.resetFields()
  }

  const handleDeletePlatform = (id: string) => {
    deletePlatformCredential(id)
    message.success('已删除')
  }

  // 文本 LLM
  const handleAddTextModel = async (values: any) => {
    addTextModel({
      name: values.name,
      endpoint: values.endpoint,
      apiKey: values.apiKey,
      model: values.model,
    })
    message.success('文本 LLM 已添加')
    setTextModelModalOpen(false)
    textModelForm.resetFields()
  }

  const handleDeleteTextModel = (id: string) => {
    deleteTextModel(id)
    message.success('已删除')
  }

  const handleQuickAddTextModel = (preset: typeof builtinTextModels[0]) => {
    addTextModel({
      name: preset.name,
      endpoint: preset.endpoint,
      apiKey: '',
      model: preset.model,
    })
    message.success(`${preset.name} 已添加，请填写 API Key`)
  }

  const providerColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '端点', dataIndex: 'endpoint', key: 'endpoint', ellipsis: true },
    { title: '模型', dataIndex: 'model', key: 'model' },
    { title: '默认', dataIndex: 'isDefault', key: 'isDefault', render: (v: boolean) => v ? '是' : '否' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ProviderConfig) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProvider(record.id)} />
      ),
    },
  ]

  const platformColumns = [
    { title: '平台', dataIndex: 'platform', key: 'platform', render: (v: string) => platformOptions.find(o => o.value === v)?.label || v },
    { title: '店铺', dataIndex: 'shopName', key: 'shopName' },
    { title: '状态', dataIndex: 'isConnected', key: 'isConnected', render: (v: boolean) => v ? '已连接' : '未连接' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PlatformCredential) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeletePlatform(record.id)} />
      ),
    },
  ]

  const textModelColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '端点', dataIndex: 'endpoint', key: 'endpoint', ellipsis: true },
    { title: '模型', dataIndex: 'model', key: 'model' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TextModelConfig) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTextModel(record.id)} />
      ),
    },
  ]

  return (
    <div>
      <h1>设置</h1>
      <Tabs
        defaultActiveKey="providers"
        items={[
          {
            key: 'providers',
            label: 'AI 提供商',
            children: (
              <>
                <Card
                  title="快速添加内置模板"
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setProviderModalOpen(true)}>
                      自定义添加
                    </Button>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Space wrap>
                    {builtinProviders.map((p) => (
                      <Button key={p.name} onClick={() => handleQuickAdd(p)}>
                        + {p.name}
                      </Button>
                    ))}
                  </Space>
                </Card>
                <Card title="已添加的提供商">
                  <Table
                    columns={providerColumns}
                    dataSource={providers.map(p => ({ ...p, key: p.id }))}
                    pagination={false}
                    locale={{ emptyText: '暂无提供商，请先添加' }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'platforms',
            label: '平台凭据',
            children: (
              <Card
                title="绑定电商平台"
                extra={
                  <Form form={platformForm} onFinish={handleAddPlatform} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <Form.Item name="platform" rules={[{ required: true, message: '选择平台' }]} style={{ marginBottom: 0, width: 120 }}>
                      <Select placeholder="选择平台" options={platformOptions} />
                    </Form.Item>
                    <Form.Item name="clientId" rules={[{ required: true, message: 'Client ID' }]} style={{ marginBottom: 0, width: 160 }}>
                      <Input placeholder="Client ID" />
                    </Form.Item>
                    <Form.Item name="clientSecret" rules={[{ required: true, message: 'Client Secret' }]} style={{ marginBottom: 0, width: 200 }}>
                      <Input.Password placeholder="Client Secret" />
                    </Form.Item>
                    <Form.Item name="shopName" style={{ marginBottom: 0, width: 140 }}>
                      <Input placeholder="店铺名称（可选）" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button type="primary" htmlType="submit">添加</Button>
                    </Form.Item>
                  </Form>
                }
              >
                <Table
                  columns={platformColumns}
                  dataSource={platformCredentials.map(c => ({ ...c, key: c.id }))}
                  pagination={false}
                  locale={{ emptyText: '尚未绑定任何平台' }}
                />
              </Card>
            ),
          },
          {
            key: 'text-models',
            label: '文本 LLM',
            children: (
              <>
                <Card
                  title="快速添加内置模板"
                  style={{ marginBottom: 16 }}
                >
                  <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                    用于 Prompt 优化等文本任务。兼容 OpenAI Chat Completions API 的端点均可。
                  </p>
                  <Space wrap>
                    {builtinTextModels.map((p) => (
                      <Button key={p.name} onClick={() => handleQuickAddTextModel(p)}>
                        + {p.name}
                      </Button>
                    ))}
                  </Space>
                </Card>
                <Card
                  title="已添加的文本 LLM"
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setTextModelModalOpen(true)}>
                      自定义添加
                    </Button>
                  }
                >
                  <Table
                    columns={textModelColumns}
                    dataSource={textModels.map(m => ({ ...m, key: m.id }))}
                    pagination={false}
                    locale={{ emptyText: '暂无文本 LLM，Prompt 优化功能将无法使用' }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />

      {/* 文本 LLM 自定义添加 Modal */}
      <Modal
        title="添加自定义文本 LLM"
        open={textModelModalOpen}
        onCancel={() => setTextModelModalOpen(false)}
        footer={null}
      >
        <Form form={textModelForm} onFinish={handleAddTextModel} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如：通义千问 / DeepSeek" />
          </Form.Item>
          <Form.Item name="endpoint" label="API 端点" rules={[{ required: true }]}>
            <Input placeholder="https://.../v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="model" label="模型名" rules={[{ required: true }]}>
            <Input placeholder="qwen-plus / deepseek-chat" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>添加</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加自定义 AI 提供商"
        open={providerModalOpen}
        onCancel={() => setProviderModalOpen(false)}
        footer={null}
      >
        <Form form={providerForm} onFinish={handleAddProvider} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如：我的自定义模型" />
          </Form.Item>
          <Form.Item name="endpoint" label="API 端点" rules={[{ required: true }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="model" label="模型名" rules={[{ required: true }]}>
            <Input placeholder="model-name" />
          </Form.Item>
          <Form.Item name="maxImages" label="单次最大图片数" initialValue={4}>
            <Input type="number" min={1} max={16} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>添加</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
