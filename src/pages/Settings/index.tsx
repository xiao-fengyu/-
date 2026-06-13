import { Card, Tabs, Form, Input, Button, Select, Space, message, Table, Modal, Tag } from 'antd'
import { useState, useEffect } from 'react'
import { PlusOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import { useAppStore, type ProviderConfig, type PlatformCredential } from '../../store'
import {
  fetchLlmProviders,
  saveLlmProvider,
  deleteLlmProvider,
  setDefaultLlmProvider,
  type LlmProviderRecord,
} from '../../services/api'
import './Settings.css'

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
  } = useAppStore()

  // 后端持久化的 LLM 列表（取代 zustand 内存 store）
  const [llmProviders, setLlmProviders] = useState<LlmProviderRecord[]>([])
  const [llmLoading, setLlmLoading] = useState(false)

  const loadLlmProviders = async () => {
    setLlmLoading(true)
    try {
      const res = await fetchLlmProviders()
      if (res.success) setLlmProviders(res.data)
      else message.error('加载文本 LLM 失败')
    } catch (err: any) {
      message.error(err.message || '加载文本 LLM 失败')
    } finally {
      setLlmLoading(false)
    }
  }

  useEffect(() => {
    loadLlmProviders()
  }, [])

  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [textModelModalOpen, setTextModelModalOpen] = useState(false)
  const [providerForm] = Form.useForm()
  const [platformForm] = Form.useForm()
  const [textModelForm] = Form.useForm()

  // AI 提供商
  const handleAddProvider = async (values: any) => {
    const maxImages = Number(values.maxImages || 4)
    addProvider({
      name: values.name,
      type: 'api',
      endpoint: values.endpoint,
      apiKey: values.apiKey,
      model: values.model,
      maxImages,
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

  // 文本 LLM（走后端 /api/llm/*）
  const handleAddTextModel = async (values: any) => {
    try {
      const id = `llm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const res = await saveLlmProvider({
        id,
        name: values.name,
        endpoint: values.endpoint,
        api_key: values.apiKey,
        model: values.model,
        temperature: values.temperature == null ? undefined : Number(values.temperature),
        max_tokens: values.maxTokens == null ? undefined : Number(values.maxTokens),
        is_default: !!values.isDefault,
      })
      if (res.success) {
        message.success('文本 LLM 已添加')
        setTextModelModalOpen(false)
        textModelForm.resetFields()
        await loadLlmProviders()
      } else {
        message.error(res.error || '添加失败')
      }
    } catch (err: any) {
      message.error(err.message || '添加失败')
    }
  }

  const handleDeleteTextModel = async (id: string) => {
    try {
      const res = await deleteLlmProvider(id)
      if (res.success) {
        message.success('已删除')
        await loadLlmProviders()
      }
    } catch (err: any) {
      message.error(err.message || '删除失败')
    }
  }

  const handleSetDefaultLlm = async (id: string) => {
    try {
      const res = await setDefaultLlmProvider(id)
      if (res.success) {
        message.success('已设为默认')
        await loadLlmProviders()
      }
    } catch (err: any) {
      message.error(err.message || '设置失败')
    }
  }

  const handleEditLlmKey = async (record: LlmProviderRecord) => {
    Modal.confirm({
      title: `更新 ${record.name} 的 API Key`,
      content: (
        <Input.Password
          id={`llm-edit-${record.id}`}
          placeholder="sk-..."
          defaultValue=""
        />
      ),
      onOk: async () => {
        const el = document.getElementById(`llm-edit-${record.id}`) as HTMLInputElement | null
        const newKey = el?.value?.trim()
        if (!newKey) {
          message.warning('API Key 不能为空')
          return Promise.reject()
        }
        const res = await saveLlmProvider({
          id: record.id,
          name: record.name,
          endpoint: record.endpoint,
          api_key: newKey,
          model: record.model,
          temperature: record.temperature,
          max_tokens: record.max_tokens,
          is_default: record.is_default === 1,
        })
        if (res.success) {
          message.success('已更新')
          await loadLlmProviders()
        } else {
          message.error(res.error || '更新失败')
          return Promise.reject()
        }
      },
    })
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
      title: 'API Key',
      key: 'api_key_status',
      render: (_: any, record: LlmProviderRecord) =>
        record.api_key
          ? <Tag color="success">已配置</Tag>
          : <Tag color="warning">未配置</Tag>,
    },
    {
      title: '默认',
      key: 'is_default',
      render: (_: any, record: LlmProviderRecord) =>
        record.is_default === 1
          ? <Tag color="processing" icon={<StarFilled />}>默认</Tag>
          : <Button
              type="link" size="small" icon={<StarOutlined />}
              onClick={() => handleSetDefaultLlm(record.id)}
            >设为默认</Button>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LlmProviderRecord) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEditLlmKey(record)}>
            改 Key
          </Button>
          <Button
            type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => handleDeleteTextModel(record.id)}
          />
        </Space>
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
                  title="已添加的提供商"
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setProviderModalOpen(true)}>
                      自定义添加
                    </Button>
                  }
                >
                  <Table
                    columns={providerColumns}
                    dataSource={providers.map(p => ({ ...p, key: p.id }))}
                    pagination={false}
                    locale={{ emptyText: '暂无提供商，请先添加自定义提供商' }}
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
                  title="已添加的文本 LLM"
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setTextModelModalOpen(true)}>
                      自定义添加
                    </Button>
                  }
                >
                  <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                    用于 Prompt 优化等文本任务。兼容 OpenAI Chat Completions API 的端点均可。
                  </p>
                  <Table
                    columns={textModelColumns}
                    dataSource={llmProviders.map(m => ({ ...m, key: m.id }))}
                    loading={llmLoading}
                    pagination={false}
                    locale={{ emptyText: '暂无文本 LLM，Prompt 优化和自然语言生图将无法使用' }}
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
            <Input placeholder="例如：我的文本模型" />
          </Form.Item>
          <Form.Item name="endpoint" label="API 端点" rules={[{ required: true }]}>
            <Input placeholder="https://.../v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="model" label="模型名" rules={[{ required: true }]}>
            <Input placeholder="model-name" />
          </Form.Item>
          <Form.Item name="temperature" label="Temperature（可选）">
            <Input type="number" step="0.1" min={0} max={2} placeholder="0.7" />
          </Form.Item>
          <Form.Item name="maxTokens" label="最大 Token（可选）">
            <Input type="number" min={1} max={32000} placeholder="1024" />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <label>
              <input type="checkbox" /> 设为默认 LLM
            </label>
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
          <Form.Item
            name="maxImages"
            label="单次最大图片数"
            initialValue={4}
            rules={[
              {
                validator: (_, value) => {
                  const maxImages = Number(value)
                  if (Number.isInteger(maxImages) && maxImages >= 1 && maxImages <= 16) return Promise.resolve()
                  return Promise.reject(new Error('请输入 1-16 之间的整数'))
                },
              },
            ]}
          >
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
