import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  Table,
  Button,
  Upload,
  message,
  Tag,
  Space,
  Progress,
  Select,
  Modal,
  Typography,
  Descriptions,
  Image,
} from 'antd'
import { InboxOutlined, EyeOutlined, DeleteOutlined, PlayCircleOutlined, CheckCircleOutlined, CloudUploadOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { useAppStore } from '../../store'
import { API_BASE } from '../../services/api'
import * as api from '../../services/api'
import type { BatchTask, BatchItem } from '../../store'

const { Dragger } = Upload
const { Title, Text } = Typography

// ============================================================
// 工具函数
// ============================================================

const statusColors: Record<string, string> = {
  importing: 'blue',
  pending: 'default',
  generating: 'processing',
  confirming: 'orange',
  publishing: 'purple',
  completed: 'success',
  failed: 'error',
}

const statusLabels: Record<string, string> = {
  importing: '导入中',
  pending: '待生成',
  generating: '生成中',
  confirming: '待确认',
  publishing: '发布中',
  completed: '已完成',
  failed: '失败',
}

const itemStatusLabels: Record<string, string> = {
  imported: '已导入',
  generating: '生成中',
  generated: '已生成',
  confirmed: '已确认',
  publishing: '发布中',
  published: '已发布',
  failed: '失败',
  publish_failed: '发布失败',
}

// ============================================================
// 主组件
// ============================================================

export default function BatchPage() {
  const {
    batchTasks,
    currentTask,
    currentTaskItems,
    setBatchTasks,
    setCurrentTask,
    setCurrentTaskItems,
    setImportPreview,
    clearBatchState,
    providers,
    platformCredentials,
  } = useAppStore()

  const [view, setView] = useState<'list' | 'import' | 'detail'>('list')
  const [, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 导入表单状态
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedCredential, setSelectedCredential] = useState<string>('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('pdd')
  const [concurrency, setConcurrency] = useState<number>(3)

  // 轮询
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ============================================================
  // 加载任务列表
  // ============================================================

  const loadTasks = useCallback(async () => {
    try {
      const res = await api.fetchBatchTasks()
      if (res.success) {
        setBatchTasks(res.data.tasks || [])
      }
    } catch (err: any) {
      console.error('[加载任务失败]', err)
    }
  }, [setBatchTasks])

  useEffect(() => {
    if (view === 'list') {
      loadTasks()
    }
  }, [view, loadTasks])

  // ============================================================
  // 轮询状态
  // ============================================================

  const startPolling = useCallback((taskId: string) => {
    setPolling(true)
    const poll = async () => {
      try {
        const res = await api.fetchBatchTask(taskId)
        if (res.success) {
          setCurrentTask(res.data.task)
          setCurrentTaskItems(res.data.items || [])

          // 检查是否完成
          const task = res.data.task
          const isDone = ['confirming', 'completed', 'failed'].includes(task.status)
          if (isDone) {
            setPolling(false)
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
            message.success('任务处理完成')
          }
        }
      } catch (err) {
        console.error('[轮询失败]', err)
      }
    }

    poll() // 立即执行一次
    pollRef.current = setInterval(poll, 2000)
  }, [setCurrentTask, setCurrentTaskItems])

  const stopPolling = useCallback(() => {
    setPolling(false)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ============================================================
  // 导入处理
  // ============================================================

  const handleImport = async (file: File) => {
    setLoading(true)
    try {
      const res = await api.importBatch(file, {
        platform: selectedPlatform,
        credentialId: selectedCredential,
        providerConfig: selectedProvider,
      })

      if (res.success) {
        message.success(`成功导入 ${res.data.totalItems} 条商品`)
        setImportPreview(res.data.preview || [])
        setView('list')
        loadTasks()
      } else {
        message.error(res.error || '导入失败')
      }
    } catch (err: any) {
      message.error(err.message || '导入失败')
    } finally {
      setLoading(false)
    }
    return false // 阻止自动上传
  }

  // ============================================================
  // 任务操作
  // ============================================================

  const handleStartGeneration = async (task: BatchTask) => {
    if (!selectedProvider) {
      message.warning('请先选择 AI 提供商')
      return
    }

    setActionLoading('generate')
    try {
      const providerConfig = providers.find((p) => p.id === selectedProvider)
      if (!providerConfig) {
        message.error('找不到选中的提供商')
        return
      }

      await api.startBatchGeneration(task.id, providerConfig as unknown as Record<string, unknown>, concurrency)
      message.success('批量生成已启动')
      setCurrentTask(task)
      startPolling(task.id)
      loadTasks()
    } catch (err: any) {
      message.error(err.message || '生成启动失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirm = async (task: BatchTask) => {
    setActionLoading('confirm')
    try {
      await api.confirmBatch(task.id)
      message.success('已确认所有已生成条目')
      loadTasks()
      // 刷新详情
      if (currentTask?.id === task.id) {
        const res = await api.fetchBatchTask(task.id)
        if (res.success) {
          setCurrentTask(res.data.task)
          setCurrentTaskItems(res.data.items || [])
        }
      }
    } catch (err: any) {
      message.error(err.message || '确认失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePublish = async (task: BatchTask) => {
    if (!selectedCredential) {
      message.warning('请先选择平台凭据')
      return
    }

    setActionLoading('publish')
    try {
      await api.startBatchPublish(task.id, selectedCredential, 1)
      message.success('批量发布已启动')
      startPolling(task.id)
      loadTasks()
    } catch (err: any) {
      message.error(err.message || '发布启动失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRetry = async (task: BatchTask, action: 'generate' | 'publish') => {
    setActionLoading('retry')
    try {
      await api.retryFailed(task.id, action)
      message.success('已重新处理失败条目')
      startPolling(task.id)
      loadTasks()
    } catch (err: any) {
      message.error(err.message || '重试失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (task: BatchTask) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务 "${task.name}" 及其所有条目吗？`,
      onOk: async () => {
        try {
          await api.deleteBatchTask(task.id)
          message.success('已删除')
          loadTasks()
          if (currentTask?.id === task.id) {
            setView('list')
            clearBatchState()
          }
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  const openDetail = async (task: BatchTask) => {
    setCurrentTask(task)
    try {
      const res = await api.fetchBatchTask(task.id)
      if (res.success) {
        setCurrentTask(res.data.task)
        setCurrentTaskItems(res.data.items || [])
      }
    } catch (err) {
      console.error('[加载详情失败]', err)
    }
    setView('detail')
  }

  // ============================================================
  // 视图：导入区
  // ============================================================

  const renderImportView = () => (
    <Card
      title="导入商品清单"
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="目标平台">
            <Select
              style={{ width: '100%' }}
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              options={[
                { label: '拼多多', value: 'pdd' },
              ]}
            />
          </Descriptions.Item>
          <Descriptions.Item label="平台凭据">
            <Select
              style={{ width: '100%' }}
              value={selectedCredential || undefined}
              onChange={setSelectedCredential}
              placeholder="选择平台凭据"
              options={platformCredentials.map((c) => ({
                label: `${c.platform} - ${c.shopName || c.id}`,
                value: c.id,
              }))}
            />
          </Descriptions.Item>
          <Descriptions.Item label="AI 提供商">
            <Select
              style={{ width: '100%' }}
              value={selectedProvider || undefined}
              onChange={setSelectedProvider}
              placeholder="选择 AI 提供商"
              options={providers.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Descriptions.Item>
          <Descriptions.Item label="并发数">
            <Select
              style={{ width: 120 }}
              value={concurrency}
              onChange={setConcurrency}
              options={[1, 2, 3, 5, 10].map((n) => ({
                label: `${n}`,
                value: n,
              }))}
            />
          </Descriptions.Item>
        </Descriptions>

        <Dragger
          accept=".xlsx,.xls,.csv"
          beforeUpload={handleImport}
          multiple={false}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">
            支持 .xlsx / .xls / .csv，最多 500 条
          </p>
        </Dragger>

        <Card size="small" title="CSV 格式示例" style={{ marginTop: 16 }}>
          <pre style={{ fontSize: 12, overflow: 'auto', background: '#f5f5f5', padding: 8 }}>
{`商品名称,商品描述,价格,库存
白色陶瓷马克杯,白色陶瓷马克杯，简约风格，纯白背景，电商产品摄影,29.9,200
不锈钢保温杯,不锈钢保温杯，银色，磨砂质感，白色背景,59.9,100`}
          </pre>
        </Card>
      </div>
    </Card>
  )

  // ============================================================
  // 视图：任务列表
  // ============================================================

  const renderListView = () => {
    const columns: ColumnsType<BatchTask> = [
      {
        title: '任务名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: BatchTask) => (
          <a onClick={() => openDetail(record)}>{text}</a>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={statusColors[status] || 'default'}>{statusLabels[status] || status}</Tag>
        ),
      },
      {
        title: '进度',
        key: 'progress',
        width: 200,
        render: (_: unknown, record: BatchTask) => {
          const total = record.total || record.total_items || 0
          const completed = (record.generated || 0) + (record.confirmed || 0) + (record.published || 0)
          const failed = record.failed || 0
          const pct = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
          return (
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Progress percent={pct} size="small" status={record.status === 'failed' ? 'exception' : 'active'} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                完成 {completed} / 失败 {failed} / 总计 {total}
              </Text>
            </Space>
          )
        },
      },
      {
        title: '平台',
        dataIndex: 'platform',
        key: 'platform',
        width: 80,
        render: (p: string) => p || '—',
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 180,
        render: (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '—',
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_: unknown, record: BatchTask) => (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
              详情
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ]

    return (
      <Card
        title="批量任务列表"
        extra={
          <Space>
            <Button type="primary" onClick={() => setView('import')}>
              导入商品清单
            </Button>
            <Button onClick={loadTasks}>刷新</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={batchTasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无任务，点击"导入商品清单"开始' }}
        />
      </Card>
    )
  }

  // ============================================================
  // 视图：任务详情
  // ============================================================

  const renderDetailView = () => {
    if (!currentTask) return null

    const task = currentTask as any
    const items = currentTaskItems as any[]

    const total = task.total_items || 0
    const imported = task.imported || 0
    const generated = task.generated || 0
    const confirmed = task.confirmed || 0
    const published = task.published || 0
    const failed = task.failed || 0

    const canGenerate = ['pending', 'failed'].includes(task.status)
    const canConfirm = generated > 0 && (task.status === 'confirming' || task.status === 'generating')
    const canPublish = confirmed > 0 && (task.status === 'publishing' || task.status === 'confirming' || task.status === 'generating')
    const hasFailedGenerate = failed > 0 && ['confirming', 'completed'].includes(task.status)
    void hasFailedGenerate // used for conditional rendering

    return (
      <Card
        title={`任务详情：${task.name}`}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => { stopPolling(); setView('list'); clearBatchState() }}>
            返回
          </Button>
        }
      >
        {/* 任务信息 */}
        <Descriptions bordered column={3} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="状态">
            <Tag color={statusColors[task.status] || 'default'}>{statusLabels[task.status] || task.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="总条目">{total}</Descriptions.Item>
          <Descriptions.Item label="已导入">{imported}</Descriptions.Item>
          <Descriptions.Item label="已生成">{generated}</Descriptions.Item>
          <Descriptions.Item label="已确认">{confirmed}</Descriptions.Item>
          <Descriptions.Item label="已发布">{published}</Descriptions.Item>
          <Descriptions.Item label="失败">{failed}</Descriptions.Item>
          <Descriptions.Item label="平台">{task.platform || '—'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '—'}
          </Descriptions.Item>
        </Descriptions>

        {/* 操作按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            {canGenerate && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={actionLoading === 'generate'}
                onClick={() => handleStartGeneration(task)}
              >
                开始生成
              </Button>
            )}
            {canConfirm && (
              <Button
                icon={<CheckCircleOutlined />}
                loading={actionLoading === 'confirm'}
                onClick={() => handleConfirm(task)}
              >
                批量确认
              </Button>
            )}
            {canPublish && (
              <Button
                icon={<CloudUploadOutlined />}
                loading={actionLoading === 'publish'}
                onClick={() => handlePublish(task)}
              >
                开始发布
              </Button>
            )}
            {hasFailedGenerate && (
              <Button
                icon={<ReloadOutlined />}
                loading={actionLoading === 'retry'}
                onClick={() => handleRetry(task, 'generate')}
              >
                重试生成失败 ({failed} 条)
              </Button>
            )}
            {polling && (
              <Tag color="processing">处理中...</Tag>
            )}
          </Space>
        </div>

        {/* 进度条 */}
        <div style={{ marginBottom: 16 }}>
          <Text>总体进度：</Text>
          <Progress
            percent={total > 0 ? Math.round(((generated + confirmed + published + failed) / total) * 100) : 0}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        {/* 条目表格 */}
        <Table
          columns={getItemColumns()}
          dataSource={items}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
          scroll={{ y: 400 }}
          locale={{ emptyText: '暂无条目' }}
        />
      </Card>
    )
  }

  const getItemColumns = (): ColumnsType<BatchItem> => [
    {
      title: '行号',
      dataIndex: 'row_number',
      key: 'row_number',
      width: 60,
      render: (n: number) => `#${n}`,
    },
    {
      title: '商品名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: '图片',
      dataIndex: 'image_path',
      key: 'image_path',
      width: 100,
      render: (path: string) => {
        if (!path) return '—'
        return (
          <Image
            src={`${API_BASE}${path.replace(/^.*\/data\/images/, '/images')}`}
            width={60}
            height={60}
            style={{ objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={
          status === 'generated' ? 'blue' :
          status === 'confirmed' ? 'green' :
          status === 'published' ? 'purple' :
          status.includes('failed') ? 'red' :
          'default'
        }>
          {itemStatusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message',
      ellipsis: true,
      render: (msg: string) => msg ? <Text type="danger">{msg}</Text> : '—',
    },
  ]

  // ============================================================
  // 主渲染
  // ============================================================

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginTop: 0 }}>批量任务</Title>

      {view === 'list' && renderListView()}
      {view === 'import' && renderImportView()}
      {view === 'detail' && renderDetailView()}
    </div>
  )
}
