import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Form, Select, Input, InputNumber, Button, message,
  Card, Table, Space, Tag, Modal, TreeSelect,
  Alert, Row, Col,
} from 'antd'
import {
  PlusOutlined, SendOutlined, DeleteOutlined,
  ReloadOutlined, SaveOutlined,
} from '@ant-design/icons'

import './Publish.css'
import { API_BASE } from '../../services/api'

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

interface ImageRecord {
  id: string
  local_path: string
  url: string
  type: string
  prompt: string
  status: string
  created_at: string
}

interface PublishRecord {
  id: number
  product_id: string
  status: string
  platform: string
  message: string
  created_at: string
}

interface CredentialItem {
  id: string
  platform: string
  shop_name: string
  access_token: string
  expires_at: string
}

// ============================================================
// API 封装
// ============================================================

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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
  const [credentials, setCredentials] = useState<CredentialItem[]>([])
  const [credLoading, setCredLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<ImageRecord[]>([])
  const [skus, setSkus] = useState<SkuItem[]>([
    { key: '1', specName: '默认', specValue: '默认规格', price: 0, stock: 0 },
  ])
  const [publishHistory, setPublishHistory] = useState<PublishRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<string>('')
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [availableImages, setAvailableImages] = useState<ImageRecord[]>([])

  // === 阶段四新增：商品 & 草稿 ===
  const [productId, setProductId] = useState<string | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 加载凭据列表
  const loadCredentials = useCallback(async () => {
    setCredLoading(true)
    try {
      const data = await api<{ success: boolean; data: CredentialItem[] }>('/api/pdd/credentials')
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

  // 加载发布历史（从日志）
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const data = await api<{ success: boolean; data: PublishRecord[] }>(
        '/api/logs/publish-history?limit=50'
      )
      if (data.success) {
        setPublishHistory(data.data)
      }
    } catch (e: any) {
      // 后端未启动时静默失败
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // 加载图片列表
  const loadAvailableImages = useCallback(async () => {
    try {
      const data = await api<{ success: boolean; data: ImageRecord[] }>('/api/images')
      if (data.success) {
        setAvailableImages(data.data)
      }
    } catch (e: any) {
      message.error('加载图片列表失败')
    }
  }, [])

  // === 草稿自动保存（防抖 2 秒）===
  const scheduleDraftSave = useCallback(() => {
    if (!productId) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(async () => {
      try {
        setDraftSaving(true)
        const values = form.getFieldsValue()
        await api(`/api/drafts/${productId}`, {
          method: 'POST',
          body: JSON.stringify({
            goodsName: values.goodsName,
            goodsDesc: values.goodsDesc,
            categoryId: values.categoryId,
            images: selectedImages.map(img => img.local_path),
            skus: skus,
            shipmentLimitSecond: values.shipmentLimitSecond,
          }),
        })
      } catch {
        // 静默失败
      } finally {
        setDraftSaving(false)
      }
    }, 2000)
  }, [productId, form, selectedImages, skus])

  // 表单变化时触发草稿保存
  useEffect(() => {
    scheduleDraftSave()
  }, [scheduleDraftSave])

  // === 创建商品（发布前）===
  const ensureProduct = useCallback(async (goodsName: string): Promise<string> => {
    if (productId) return productId

    const data = await api<{ success: boolean; id: string }>('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        title: goodsName || '未命名商品',
        platform: 'pdd',
        status: 'draft',
      }),
    })
    setProductId(data.id)
    return data.id
  }, [productId])

  // === 加载草稿 ===
  const loadDraft = useCallback(async (pid: string) => {
    try {
      const data = await api<{ success: boolean; data: Record<string, unknown> | null }>(
        `/api/drafts/${pid}`
      )
      if (data.success && data.data && Object.keys(data.data).length > 0) {
        const draft = data.data
        if (draft.goodsName) form.setFieldValue('goodsName', draft.goodsName)
        if (draft.goodsDesc) form.setFieldValue('goodsDesc', draft.goodsDesc)
        if (draft.categoryId) form.setFieldValue('categoryId', draft.categoryId)
        if (draft.shipmentLimitSecond) form.setFieldValue('shipmentLimitSecond', draft.shipmentLimitSecond)

        // 恢复 SKU
        if (Array.isArray(draft.skus) && draft.skus.length > 0) {
          setSkus(draft.skus as SkuItem[])
        }

        // 恢复已选图片路径
        const draftImagePaths = (draft.images as string[]) || []
        if (draftImagePaths.length > 0) {
          // 从 availableImages 中匹配
          const matched = availableImages.filter(img =>
            draftImagePaths.includes(img.local_path)
          )
          if (matched.length > 0) {
            setSelectedImages(matched)
          }
        }

        setDraftLoaded(true)
        message.info('已恢复上次草稿')
      }
    } catch {
      // 无草稿或加载失败
    }
  }, [form, availableImages])

  // 页面初始化
  useEffect(() => {
    loadCredentials()
    loadHistory()
    loadAvailableImages()
  }, [])

  // 图片列表加载完后，如果有 productId 则尝试加载草稿
  useEffect(() => {
    if (productId && availableImages.length >= 0) {
      loadDraft(productId)
    }
  }, [productId, availableImages, loadDraft])

  // 构建类目树选择器数据
  const buildTreeData = (nodes: CategoryNode[]) => {
    const map = new Map<string | number, { value: string | number; title: string; selectable: boolean; children: any[] }>()
    const roots: any[] = []

    nodes.forEach(n => {
      map.set(n.id, { value: n.id, title: n.name, selectable: n.isLeaf, children: [] })
    })

    nodes.forEach(n => {
      const item = map.get(n.id)!
      if (n.parentId && map.has(n.parentId)) {
        map.get(n.parentId)!.children.push({
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
      { key: String(Date.now()), specName: '', specValue: '', price: 0, stock: 0 },
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
        message.error(`图片上传失败: ${imgPath.split('/').pop()} - ${e.message}`)
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

      // 确保有商品记录
      const pid = await ensureProduct(values.goodsName)

      // 先上传图片到拼多多图片空间
      message.loading({ content: '正在上传图片到平台...', key: 'upload', duration: 0 })
      const imagePaths = selectedImages.map(img => img.local_path)
      const imageUrls = await uploadImagesToPdd(imagePaths)
      message.success({ content: `图片上传完成 (${imageUrls.length}/${imagePaths.length})`, key: 'upload', duration: 2 })

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
        { method: 'POST', body: JSON.stringify(publishParams) }
      )

      if (data.success) {
        // 更新商品状态
        await api(`/api/products/${pid}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'published' }),
        })

        message.success({
          content: `发布成功！商品 ID: ${data.goodsId}`,
          key: 'publish',
          duration: 5,
        })
        form.resetFields()
        setSelectedImages([])
        setSkus([{ key: '1', specName: '默认', specValue: '默认规格', price: 0, stock: 0 }])
        setProductId(null)
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
    {
      title: '商品 ID',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 160,
      ellipsis: true,
    },
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
    { title: '信息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  ]

  return (
    <div className="publish-page">
      <h2 className="page-title">发布商品到拼多多</h2>

      {/* 状态提示 */}
      {draftLoaded && (
        <Alert
          message="已恢复草稿"
          description="系统已自动加载上次未完成的发布表单，请继续编辑。"
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}
      {draftSaving && (
        <Alert
          message="草稿保存中..."
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
        />
      )}

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
          <Button onClick={() => { loadAvailableImages(); setImageModalOpen(true); }}>
            从图片库选择
          </Button>
          {selectedImages.length > 0 && (
            <Button danger onClick={() => setSelectedImages([])}>
              清空
            </Button>
          )}
        </Space>
        {selectedImages.length > 0 && (
          <div className="selected-images" style={{ marginTop: 12 }}>
            {selectedImages.map((img, i) => (
              <Tag
                key={img.id}
                closable
                onClose={() => setSelectedImages(selectedImages.filter(p => p.id !== img.id))}
              >
                {i + 1}. {img.local_path.split('/').pop()}
                {i === 0 && <Tag color="blue" style={{ marginLeft: 4 }}>主图</Tag>}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      {/* 图片选择 Modal */}
      <Modal
        title="选择商品图片"
        open={imageModalOpen}
        onCancel={() => setImageModalOpen(false)}
        onOk={() => setImageModalOpen(false)}
        width={700}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {availableImages.map(img => {
            const isSelected = selectedImages.some(s => s.id === img.id)
            return (
              <div
                key={img.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedImages(selectedImages.filter(s => s.id !== img.id))
                  } else if (selectedImages.length < 10) {
                    setSelectedImages([...selectedImages, img])
                  } else {
                    message.warning('最多选择 10 张图片')
                  }
                }}
                style={{
                  width: 100, height: 100, border: isSelected ? '3px solid #1890ff' : '1px solid #d9d9d9',
                  borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: isSelected ? '#e6f7ff' : '#fafafa',
                }}
              >
                <span style={{ fontSize: 11, color: '#666', textAlign: 'center', padding: 4 }}>
                  {img.local_path.split('/').pop()?.slice(0, 15)}
                </span>
              </div>
            )
          })}
          {availableImages.length === 0 && (
            <div style={{ padding: 40, color: '#999', textAlign: 'center', width: '100%' }}>
              暂无可用图片，请先在"AI 生成"中生成商品图片
            </div>
          )}
        </div>
      </Modal>

      {/* SKU 管理 */}
      <Card
        title="SKU 规格"
        className="section-card"
        extra={
          <Button type="primary" size="small" onClick={addSku} icon={<PlusOutlined />}>
            添加 SKU
          </Button>
        }
      >
        <Table
          dataSource={skus}
          rowKey="key"
          size="small"
          pagination={false}
          columns={[
            {
              title: '规格名', dataIndex: 'specName', width: 120,
              render: (v: string, r: SkuItem) => (
                <Input value={v} onChange={e => updateSku(r.key, 'specName', e.target.value)} size="small" />
              ),
            },
            {
              title: '规格值', dataIndex: 'specValue', width: 150,
              render: (v: string, r: SkuItem) => (
                <Input value={v} onChange={e => updateSku(r.key, 'specValue', e.target.value)} size="small" />
              ),
            },
            {
              title: '价格（元）', dataIndex: 'price', width: 120,
              render: (v: number, r: SkuItem) => (
                <InputNumber value={v} min={0} step={0.01} onChange={val => updateSku(r.key, 'price', val || 0)} size="small" style={{ width: '100%' }} />
              ),
            },
            {
              title: '库存', dataIndex: 'stock', width: 100,
              render: (v: number, r: SkuItem) => (
                <InputNumber value={v} min={0} onChange={val => updateSku(r.key, 'stock', val || 0)} size="small" style={{ width: '100%' }} />
              ),
            },
            {
              title: '操作', width: 80,
              render: (_: any, r: SkuItem) => (
                <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeSku(r.key)} disabled={skus.length <= 1} />
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
        {productId && (
          <Button
            icon={<SaveOutlined />}
            onClick={async () => {
              if (!productId) return
              try {
                setDraftSaving(true)
                const values = form.getFieldsValue()
                await api(`/api/drafts/${productId}`, {
                  method: 'POST',
                  body: JSON.stringify({
                    goodsName: values.goodsName,
                    goodsDesc: values.goodsDesc,
                    categoryId: values.categoryId,
                    images: selectedImages.map(img => img.local_path),
                    skus,
                    shipmentLimitSecond: values.shipmentLimitSecond,
                  }),
                })
                message.success('草稿已保存')
              } catch (e: any) {
                message.error('保存草稿失败: ' + e.message)
              } finally {
                setDraftSaving(false)
              }
            }}
          >
            保存草稿
          </Button>
        )}
      </div>

      {/* 发布历史 */}
      <Card
        title="发布历史"
        className="section-card"
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={loadHistory} loading={historyLoading}>
            刷新
          </Button>
        }
      >
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
