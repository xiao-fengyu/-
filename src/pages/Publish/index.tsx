import { useState, useEffect, useCallback } from 'react'
import {
  Form, Select, Input, InputNumber, Button, Upload, message,
  Card, Table, Space, Tag, Modal, TreeSelect, Descriptions,
  Alert, Spin, Divider, Row, Col,
} from 'antd'
import {
  PlusOutlined, UploadOutlined, SendOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import './Publish.css'

// ============================================================
// 类型定义
// ============================================================

interface CategoryNode {
  id: string | number
  name: string
  parentId?: string | number
  level: number
  isLeaf: boolean
}

interface SkuItem {
  key: string
  specName: string
  specValue: string
  price: number
  stock: number
  image?: string
}

interface PublishRecord {
  id: number
  goods_name: string
  goods_id: string
  status: string
  platform: string
  created_at: string
  message: string
}

// ============================================================
// 工具函数
// ============================================================

const API = 'http://127.0.0.1:14714'

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ============================================================
// Publish 页面组件
// ============================================================

export default function PublishPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [credentials, setCredentials] = useState<any[]>([])
  const [credLoading, setCredLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [imageList, setImageList] = useState<UploadFile[]>([])
  const [skus, setSkus] = useState<SkuItem[]>([
    { key: '1', specName: '默认', specValue: '默认规格', price: 0, stock: 0 },
  ])
  const [publishHistory, setPublishHistory] = useState<PublishRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<string>('')

  // 加载凭据列表
  const loadCredentials = useCallback(async () => {
    setCredLoading(true)
    try {
      const data = await api<{ success: boolean; data: any[] }>('/api/pdd/credentials')
      if (data.success) {
        setCredentials(data.data)
        if (data.data.length > 0 && !selectedCredential) {
          setSelectedCredential(data.data[0].id)
        }
      }
    } catch (e: any) {
      message.error('加载凭据失败: ' + e.message)
    } finally {
      setCredLoading(false)
    }
  }, [selectedCredential])

  // 加载类目树
  const loadCategories = useCallback(async () => {
    if (!selectedCredential) {
      message.warning('请先选择店铺凭据')
      return
    }
    setCatLoading(true)
    try {
      const data = await api<{ success: boolean; data: CategoryNode[] }>(
        `/api/pdd/categories?credentialId=${selectedCredential}`
      )
      if (data.success) {
        setCategories(data.data)
      }
    } catch (e: any) {
      message.error('加载类目失败: ' + e.message)
    } finally {
      setCatLoading(false)
    }
  }, [selectedCredential])

  // 加载发布历史
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      // 从图片生成列表中获取已发布的图片（通过后端日志接口）
      // 这里先用占位，实际应该有一个 /api/pdd/history 接口
      setPublishHistory([])
    } catch (e: any) {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCredentials()
    loadHistory()
  }, [])

  // 构建类目树选择器数据
  const buildTreeData = (nodes: CategoryNode[]) => {
    const map = new Map<string | number, CategoryNode & { children?: any[] }>()
    const roots: any[] = []

    nodes.forEach(n => {
      map.set(n.id, { ...n, children: [] })
    })

    nodes.forEach(n => {
      const item = map.get(n.id)!
      if (n.parentId && map.has(n.parentId)) {
        map.get(n.parentId)!.children!.push({
          value: n.id,
          title: n.name,
          selectable: n.isLeaf,
          children: item.children,
        })
      } else {
        roots.push({
          value: n.id,
          title: n.name,
          selectable: n.isLeaf,
          children: item.children,
        })
      }
    })

    return roots
  }

  // SKU 管理
  const addSku = () => {
    setSkus([
      ...skus,
      {
        key: String(Date.now()),
        specName: '',
        specValue: '',
        price: 0,
        stock: 0,
      },
    ])
  }

  const removeSku = (key: string) => {
    if (skus.length <= 1) {
      message.warning('至少保留一个 SKU')
      return
    }
    setSkus(skus.filter(s => s.key !== key))
  }

  const updateSku = (key: string, field: keyof SkuItem, value: any) => {
    setSkus(skus.map(s => s.key === key ? { ...s, [field]: value } : s))
  }

  // 图片选择
  const handleImageSelect = () => {
    // 打开文件选择器（通过后端 API 获取已生成的图片列表）
    api<{ success: boolean; data: { images: Array<{ path: string; filename: string }> } }>(
      '/api/images/list?page=1&pageSize=50'
    ).then(data => {
      if (data.success) {
        // 打开图片选择 Modal
        Modal.info({
          title: '选择商品图片',
          width: 700,
          content: (
            <div className="image-selector">
              {data.data.images.map(img => (
                <div
                  key={img.path}
                  className={`image-thumb ${selectedImages.includes(img.path) ? 'selected' : ''}`}
                  onClick={() => {
                    if (selectedImages.includes(img.path)) {
                      setSelectedImages(selectedImages.filter(p => p !== img.path))
                    } else if (selectedImages.length < 10) {
                      setSelectedImages([...selectedImages, img.path])
                    } else {
                      message.warning('最多选择 10 张图片')
                    }
                  }}
                >
                  <div className="image-path">{img.filename}</div>
                </div>
              ))}
            </div>
          ),
        })
      }
    }).catch(e => message.error('加载图片列表失败: ' + e.message))
  }

  // 上传图片到拼多多图片空间
  const uploadImagesToPdd = async (imagePaths: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const imgPath of imagePaths) {
      try {
        const data = await api<{ success: boolean; data: { imageUrl: string } }>(
          '/api/pdd/upload',
          {
            method: 'POST',
            body: JSON.stringify({
              credentialId: selectedCredential,
              imagePath: imgPath,
            }),
          }
        )
        if (data.success && data.data.imageUrl) {
          uploadedUrls.push(data.data.imageUrl)
        }
      } catch (e: any) {
        message.error(`图片上传失败: ${imgPath} - ${e.message}`)
      }
    }
    return uploadedUrls
  }

  // 发布商品
  const handlePublish = async () => {
    if (!selectedCredential) {
      message.error('请先选择店铺凭据')
      return
    }
    if (selectedImages.length === 0) {
      message.error('请至少选择一张商品图片')
      return
    }

    try {
      const values = await form.validateFields()
      setLoading(true)

      // 先上传图片到拼多多图片空间
      message.loading({ content: '正在上传图片到平台...', key: 'upload', duration: 0 })
      const imageUrls = await uploadImagesToPdd(selectedImages)
      message.success({ content: `图片上传完成 (${imageUrls.length}/${selectedImages.length})`, key: 'upload', duration: 2 })

      if (imageUrls.length === 0) {
        message.error('没有图片上传成功，无法发布')
        return
      }

      // 构建发布参数
      const publishParams = {
        credentialId: selectedCredential,
        goodsName: values.goodsName,
        goodsDesc: values.goodsDesc || '',
        categoryId: values.categoryId,
        images: imageUrls,
        skus: skus.map(s => ({
          specName: s.specName,
          specValue: s.specValue,
          price: s.price,
          stock: s.stock,
        })),
        shipmentLimitSecond: values.shipmentLimitSecond || 48 * 3600,
      }

      message.loading({ content: '正在发布商品...', key: 'publish', duration: 0 })
      const data = await api<{ success: boolean; goodsId: string; message: string }>(
        '/api/pdd/publish',
        {
          method: 'POST',
          body: JSON.stringify(publishParams),
        }
      )

      if (data.success) {
        message.success({
          content: `发布成功！商品 ID: ${data.goodsId}`,
          key: 'publish',
          duration: 5,
        })
        form.resetFields()
        setSelectedImages([])
        setSkus([{ key: '1', specName: '默认', specValue: '默认规格', price: 0, stock: 0 }])
        loadHistory()
      }
    } catch (e: any) {
      message.error({ content: '发布失败: ' + (e.message || e.error), key: 'publish', duration: 5 })
    } finally {
      setLoading(false)
    }
  }

  // 发布历史表格列
  const historyColumns = [
    { title: '商品名称', dataIndex: 'goods_name', key: 'goods_name', ellipsis: true },
    { title: '商品 ID', dataIndex: 'goods_id', key: 'goods_id', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : 'red'}>
          {s === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    { title: '平台', dataIndex: 'platform', key: 'platform', width: 80 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  ]

  return (
    <div className="publish-page">
      <h2 className="page-title">发布商品到拼多多</h2>

      {/* 凭据选择 */}
      <Card size="small" title="店铺凭据" className="section-card">
        <Space>
          <Select
            style={{ width: 300 }}
            placeholder="选择店铺"
            value={selectedCredential || undefined}
            onChange={setSelectedCredential}
            loading={credLoading}
            options={credentials.map(c => ({
              label: `${c.shop_name || '未命名店铺'} (${c.id.slice(0, 8)}...)`,
              value: c.id,
            }))}
          />
          <Button onClick={loadCredentials} icon={<ReloadOutlined />} />
        </Space>
      </Card>

      {/* 发布表单 */}
      <Card title="商品信息" className="section-card">
        <Form form={form} layout="vertical" disabled={loading}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="goodsName"
                label="商品名称"
                rules={[{ required: true, message: '请输入商品名称' }]}
              >
                <Input placeholder="请输入商品名称" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="商品类目"
                rules={[{ required: true, message: '请选择商品类目' }]}
              >
                <TreeSelect
                  placeholder="请选择类目"
                  loading={catLoading}
                  treeData={buildTreeData(categories)}
                  allowClear
                  showSearch
                  treeNodeFilterProp="title"
                />
              </Form.Item>
              <Button
                size="small"
                onClick={loadCategories}
                loading={catLoading}
                style={{ marginTop: -8 }}
              >
                刷新类目
              </Button>
            </Col>
          </Row>

          <Form.Item name="goodsDesc" label="商品描述">
            <Input.TextArea rows={3} placeholder="商品详情描述（可选）" maxLength={2000} />
          </Form.Item>

          <Form.Item name="shipmentLimitSecond" label="承诺发货时间（小时）">
            <InputNumber min={1} max={720} style={{ width: 120 }} addonAfter="小时" />
          </Form.Item>
        </Form>
      </Card>

      {/* 图片选择 */}
      <Card title="商品图片" className="section-card">
        <Alert
          message={`已选择 ${selectedImages.length} 张图片`}
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />
        <Space>
          <Button onClick={handleImageSelect} icon={<PlusOutlined />}>
            从图片库选择
          </Button>
          {selectedImages.length > 0 && (
            <Button danger onClick={() => setSelectedImages([])}>
              清空
            </Button>
          )}
        </Space>
        {selectedImages.length > 0 && (
          <div className="selected-images">
            {selectedImages.map((path, i) => (
              <Tag key={path} closable onClose={() => setSelectedImages(selectedImages.filter(p => p !== path))}>
                {i + 1}. {path.split('/').pop()}
                {i === 0 && <Tag color="blue" style={{ marginLeft: 4 }}>主图</Tag>}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      {/* SKU 管理 */}
      <Card
        title="SKU 规格"
        className="section-card"
        extra={<Button type="primary" size="small" onClick={addSku} icon={<PlusOutlined />}>
          添加 SKU
        </Button>}
      >
        <Table
          dataSource={skus}
          rowKey="key"
          size="small"
          pagination={false}
          columns={[
            {
              title: '规格名',
              dataIndex: 'specName',
              width: 120,
              render: (v: string, r: SkuItem) => (
                <Input value={v} onChange={e => updateSku(r.key, 'specName', e.target.value)} size="small" />
              ),
            },
            {
              title: '规格值',
              dataIndex: 'specValue',
              width: 150,
              render: (v: string, r: SkuItem) => (
                <Input value={v} onChange={e => updateSku(r.key, 'specValue', e.target.value)} size="small" />
              ),
            },
            {
              title: '价格（元）',
              dataIndex: 'price',
              width: 120,
              render: (v: number, r: SkuItem) => (
                <InputNumber
                  value={v}
                  min={0}
                  step={0.01}
                  onChange={val => updateSku(r.key, 'price', val || 0)}
                  size="small"
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '库存',
              dataIndex: 'stock',
              width: 100,
              render: (v: number, r: SkuItem) => (
                <InputNumber
                  value={v}
                  min={0}
                  onChange={val => updateSku(r.key, 'stock', val || 0)}
                  size="small"
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '操作',
              width: 80,
              render: (_: any, r: SkuItem) => (
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeSku(r.key)}
                  disabled={skus.length <= 1}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 发布按钮 */}
      <div className="publish-actions">
        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          loading={loading}
          onClick={handlePublish}
        >
          发布商品
        </Button>
      </div>

      {/* 发布历史 */}
      <Card title="发布历史" className="section-card" extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={loadHistory} loading={historyLoading}>
          刷新
        </Button>
      }>
        <Table
          dataSource={publishHistory}
          columns={historyColumns}
          rowKey="id"
          size="small"
          locale={{ emptyText: '暂无发布记录' }}
        />
      </Card>
    </div>
  )
}
