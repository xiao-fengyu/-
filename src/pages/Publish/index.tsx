import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Form, Select, Input, InputNumber, Button, message,
  Space, Tag, Modal, TreeSelect,
  Alert, Row, Col, Steps, Card, Table,
} from 'antd'
import {
  PlusOutlined, SendOutlined, DeleteOutlined,
  ReloadOutlined, SaveOutlined,
  ShopOutlined, FileTextOutlined, PictureOutlined, CheckOutlined,
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

// 步骤定义
const PUBLISH_STEPS = [
  { title: '选择店铺', icon: <ShopOutlined /> },
  { title: '商品信息', icon: <FileTextOutlined /> },
  { title: '选择图片', icon: <PictureOutlined /> },
  { title: '确认发布', icon: <CheckOutlined /> },
]

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
  const [currentStep, setCurrentStep] = useState(0)
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

  // 草稿相关
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

  // 加载发布历史
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
      // 静默失败
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

  // 草稿自动保存
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
      } catch { /* 静默 */ }
      finally { setDraftSaving(false) }
    }, 2000)
  }, [productId, form, selectedImages, skus])

  useEffect(() => { scheduleDraftSave() }, [scheduleDraftSave])

  // 创建商品
  const ensureProduct = useCallback(async (goodsName: string): Promise<string> => {
    if (productId) return productId
    const data = await api<{ success: boolean; id: string }>('/api/products', {
      method: 'POST',
      body: JSON.stringify({ title: goodsName || '未命名商品', platform: 'pdd', status: 'draft' }),
    })
    setProductId(data.id)
    return data.id
  }, [productId])

  // 加载草稿
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
        if (Array.isArray(draft.skus) && draft.skus.length > 0) setSkus(draft.skus as SkuItem[])
        const draftImagePaths = (draft.images as string[]) || []
        if (draftImagePaths.length > 0) {
          const matched = availableImages.filter(img => draftImagePaths.includes(img.local_path))
          if (matched.length > 0) setSelectedImages(matched)
        }
        setDraftLoaded(true)
        message.info('已恢复上次草稿')
      }
    } catch { /* 无草稿 */ }
  }, [form, availableImages])

  useEffect(() => { loadCredentials(); loadHistory(); loadAvailableImages() }, [])
  useEffect(() => { if (productId && availableImages.length >= 0) loadDraft(productId) }, [productId, availableImages, loadDraft])

  // 类目树
  const buildTreeData = (nodes: CategoryNode[]) => {
    const map = new Map<string | number, { value: string | number; title: string; selectable: boolean; children: any[] }>()
    const roots: any[] = []
    nodes.forEach(n => { map.set(n.id, { value: n.id, title: n.name, selectable: n.isLeaf, children: [] }) })
    nodes.forEach(n => {
      const item = map.get(n.id)!
      if (n.parentId && map.has(n.parentId)) {
        map.get(n.parentId)!.children.push({ value: n.id, title: n.name, selectable: n.isLeaf, children: item.children })
      } else {
        roots.push({ value: n.id, title: n.name, selectable: n.isLeaf, children: item.children })
      }
    })
    return roots
  }

  // SKU 管理
  const addSku = () => {
    setSkus([...skus, { key: String(Date.now()), specName: '', specValue: '', price: 0, stock: 0 }])
  }
  const removeSku = (key: string) => {
    if (skus.length <= 1) { message.warning('至少保留一个 SKU'); return }
    setSkus(skus.filter(s => s.key !== key))
  }
  const updateSku = (key: string, field: keyof SkuItem, value: any) => {
    setSkus(skus.map(s => s.key === key ? { ...s, [field]: value } : s))
  }

  // 上传图片
  const uploadImagesToPdd = async (imagePaths: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const imgPath of imagePaths) {
      try {
        const data = await api<{ success: boolean; data: { imageUrl: string } }>('/api/pdd/upload', {
          method: 'POST',
          body: JSON.stringify({ credentialId: selectedCredential, imagePath: imgPath }),
        })
        if (data.success && data.data.imageUrl) uploadedUrls.push(data.data.imageUrl)
      } catch (e: any) {
        message.error(`图片上传失败: ${imgPath.split('/').pop()} - ${e.message}`)
      }
    }
    return uploadedUrls
  }

  // 发布
  const handlePublish = async () => {
    if (!selectedCredential) { message.error('请先选择店铺凭据'); return }
    if (selectedImages.length === 0) { message.error('请至少选择一张商品图片'); return }

    try {
      const values = await form.validateFields()
      setLoading(true)
      const pid = await ensureProduct(values.goodsName)

      message.loading({ content: '正在上传图片到平台...', key: 'upload', duration: 0 })
      const imagePaths = selectedImages.map(img => img.local_path)
      const imageUrls = await uploadImagesToPdd(imagePaths)
      message.success({ content: `图片上传完成 (${imageUrls.length}/${imagePaths.length})`, key: 'upload', duration: 2 })
      if (imageUrls.length === 0) { message.error('没有图片上传成功'); return }

      const publishParams = {
        credentialId: selectedCredential,
        goodsName: values.goodsName,
        goodsDesc: values.goodsDesc || '',
        categoryId: values.categoryId,
        images: imageUrls,
        skus: skus.map(s => ({ specName: s.specName, specValue: s.specValue, price: s.price, stock: s.stock })),
        shipmentLimitSecond: values.shipmentLimitSecond || 48 * 3600,
      }

      message.loading({ content: '正在发布商品...', key: 'publish', duration: 0 })
      const data = await api<{ success: boolean; goodsId: string; message: string }>(
        '/api/pdd/publish', { method: 'POST', body: JSON.stringify(publishParams) }
      )

      if (data.success) {
        await api(`/api/products/${pid}`, { method: 'PUT', body: JSON.stringify({ status: 'published' }) })
        message.success({ content: `发布成功！商品 ID: ${data.goodsId}`, key: 'publish', duration: 5 })
        form.resetFields()
        setSelectedImages([])
        setSkus([{ key: '1', specName: '默认', specValue: '默认规格', price: 0, stock: 0 }])
        setProductId(null)
        setCurrentStep(0)
        loadHistory()
      }
    } catch (e: any) {
      message.error({ content: '发布失败: ' + (e.message || e.error), key: 'publish', duration: 5 })
    } finally {
      setLoading(false)
    }
  }

  // 手动保存草稿
  const handleSaveDraft = async () => {
    if (!productId) return
    try {
      setDraftSaving(true)
      const values = form.getFieldsValue()
      await api(`/api/drafts/${productId}`, {
        method: 'POST',
        body: JSON.stringify({
          goodsName: values.goodsName, goodsDesc: values.goodsDesc,
          categoryId: values.categoryId, images: selectedImages.map(img => img.local_path),
          skus, shipmentLimitSecond: values.shipmentLimitSecond,
        }),
      })
      message.success('草稿已保存')
    } catch (e: any) { message.error('保存草稿失败: ' + e.message) }
    finally { setDraftSaving(false) }
  }

  // 发布历史表格
  const historyColumns = [
    { title: '商品 ID', dataIndex: 'product_id', key: 'product_id', width: 160, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s === 'success' ? '成功' : '失败'}</Tag>,
    },
    { title: '平台', dataIndex: 'platform', key: 'platform', width: 80 },
    { title: '信息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  ]

  // ========== 渲染分步内容 ==========

  // 步骤 0：选择店铺
  const renderStep0 = () => (
    <div className="pub-step-card">
      <h3>选择店铺</h3>
      <p className="pub-step-hint">选择要发布到的目标店铺</p>
      <div className="pub-form-group">
        <Select
          style={{ width: '100%', maxWidth: 400 }}
          placeholder="选择店铺"
          value={selectedCredential || undefined}
          onChange={setSelectedCredential}
          loading={credLoading}
          options={credentials.map(c => ({
            label: `${c.shop_name || '未命名店铺'} (${c.id.slice(0, 8)}...)`,
            value: c.id,
          }))}
        />
        <Button onClick={loadCredentials} icon={<ReloadOutlined />} style={{ marginLeft: 8 }} />
      </div>
    </div>
  )

  // 步骤 1：商品信息
  const renderStep1 = () => (
    <div className="pub-step-card">
      <h3>填写商品信息</h3>
      <p className="pub-step-hint">第 2 步 / 共 4 步</p>
      <Form form={form} layout="vertical" disabled={loading}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="goodsName" label="商品标题" rules={[{ required: true, message: '请输入商品名称' }]}>
              <Input placeholder="例如：夏季新款连衣裙 法式复古碎花" maxLength={100} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="categoryId" label="商品类目" rules={[{ required: true, message: '请选择类目' }]}>
              <TreeSelect
                placeholder="请选择类目"
                loading={catLoading}
                treeData={buildTreeData(categories)}
                allowClear showSearch treeNodeFilterProp="title"
              />
            </Form.Item>
            <Button size="small" onClick={loadCategories} loading={catLoading}>刷新类目</Button>
          </Col>
        </Row>
        <Form.Item name="goodsDesc" label="商品描述">
          <Input.TextArea rows={3} placeholder="商品详情描述（可选）" maxLength={2000} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="shipmentLimitSecond" label="承诺发货时间">
              <InputNumber min={1} max={720} style={{ width: 120 }} addonAfter="小时" />
            </Form.Item>
          </Col>
        </Row>

        {/* SKU 管理 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>SKU 规格</span>
            <Button type="primary" size="small" onClick={addSku} icon={<PlusOutlined />}>添加 SKU</Button>
          </div>
          <Table
            dataSource={skus} rowKey="key" size="small" pagination={false}
            columns={[
              { title: '规格名', dataIndex: 'specName', width: 120, render: (v: string, r: SkuItem) => <Input value={v} onChange={e => updateSku(r.key, 'specName', e.target.value)} size="small" /> },
              { title: '规格值', dataIndex: 'specValue', width: 150, render: (v: string, r: SkuItem) => <Input value={v} onChange={e => updateSku(r.key, 'specValue', e.target.value)} size="small" /> },
              { title: '价格（元）', dataIndex: 'price', width: 120, render: (v: number, r: SkuItem) => <InputNumber value={v} min={0} step={0.01} onChange={val => updateSku(r.key, 'price', val || 0)} size="small" style={{ width: '100%' }} /> },
              { title: '库存', dataIndex: 'stock', width: 100, render: (v: number, r: SkuItem) => <InputNumber value={v} min={0} onChange={val => updateSku(r.key, 'stock', val || 0)} size="small" style={{ width: '100%' }} /> },
              { title: '操作', width: 80, render: (_: any, r: SkuItem) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeSku(r.key)} disabled={skus.length <= 1} /> },
            ]}
          />
        </div>
      </Form>
    </div>
  )

  // 步骤 2：选择图片
  const renderStep2 = () => (
    <div className="pub-step-card">
      <h3>选择商品图片</h3>
      <p className="pub-step-hint">已选择 {selectedImages.length} 张图片</p>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => { loadAvailableImages(); setImageModalOpen(true) }}>从图片库选择</Button>
        {selectedImages.length > 0 && <Button danger onClick={() => setSelectedImages([])}>清空</Button>}
      </Space>
      {selectedImages.length > 0 && (
        <div className="selected-images-grid">
          {selectedImages.map((img, i) => (
            <Tag
              key={img.id} closable
              onClose={() => setSelectedImages(selectedImages.filter(p => p.id !== img.id))}
              style={{ padding: '8px 12px', fontSize: 12 }}
            >
              {i + 1}. {img.local_path.split('/').pop()}{i === 0 && <Tag color="blue" style={{ marginLeft: 4 }}>主图</Tag>}
            </Tag>
          ))}
        </div>
      )}
    </div>
  )

  // 步骤 3：确认发布
  const renderStep3 = () => {
    const values = form.getFieldsValue()
    return (
      <div className="pub-step-card">
        <h3>确认发布信息</h3>
        <p className="pub-step-hint">请检查以下信息无误后点击发布</p>
        <div className="pub-summary">
          <div className="pub-summary-row"><span className="label">商品名称：</span>{values.goodsName || '-'}</div>
          <div className="pub-summary-row"><span className="label">商品图片：</span>{selectedImages.length} 张{selectedImages.length > 0 && `（主图: ${selectedImages[0].local_path.split('/').pop()}）`}</div>
          <div className="pub-summary-row"><span className="label">SKU 规格：</span>{skus.length} 个{skus.map(s => ` ${s.specName}:${s.specValue} ¥${s.price}`).join('，')}</div>
          <div className="pub-summary-row"><span className="label">发货时间：</span>{values.shipmentLimitSecond ? `${values.shipmentLimitSecond} 小时` : '默认 48 小时'}</div>
        </div>
      </div>
    )
  }

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3]

  return (
    <div className="publish-page">
      {/* Stepper 进度条 */}
      <div className="pub-stepper">
        <Steps current={currentStep} items={PUBLISH_STEPS} />
      </div>

      {/* 状态提示 */}
      {draftLoaded && (
        <Alert message="已恢复草稿" description="系统已自动加载上次未完成的发布表单" type="info" showIcon closable
          style={{ marginBottom: 16 }} />
      )}
      {draftSaving && (
        <Alert message="草稿保存中..." type="info" showIcon style={{ marginBottom: 8 }} />
      )}

      {/* 分步内容 */}
      {stepRenderers[currentStep]()}

      {/* 操作按钮 */}
      <div className="pub-actions">
        {currentStep > 0 && (
          <Button className="pub-btn-prev" onClick={() => setCurrentStep(currentStep - 1)}>
            ← 上一步
          </Button>
        )}
        <div className="pub-btn-right">
          {productId && (
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={draftSaving}>
              保存草稿
            </Button>
          )}
          {currentStep < 3 ? (
            <Button type="primary" className="pub-btn-next" onClick={() => setCurrentStep(currentStep + 1)}>
              下一步 →
            </Button>
          ) : (
            <Button type="primary" size="large" icon={<SendOutlined />} loading={loading} onClick={handlePublish} className="pub-btn-next">
              发布商品
            </Button>
          )}
        </div>
      </div>

      {/* 图片选择 Modal */}
      <Modal title="选择商品图片" open={imageModalOpen} onCancel={() => setImageModalOpen(false)}
        onOk={() => setImageModalOpen(false)} width={700}>
        <div className="pub-image-grid">
          {availableImages.map(img => {
            const isSelected = selectedImages.some(s => s.id === img.id)
            return (
              <div key={img.id}
                className={`pub-image-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (isSelected) setSelectedImages(selectedImages.filter(s => s.id !== img.id))
                  else if (selectedImages.length < 10) setSelectedImages([...selectedImages, img])
                  else message.warning('最多选择 10 张图片')
                }}>
                <span style={{ fontSize: 11, color: '#666', textAlign: 'center', padding: 4 }}>
                  {img.local_path.split('/').pop()?.slice(0, 15)}
                </span>
              </div>
            )
          })}
          {availableImages.length === 0 && (
            <div style={{ padding: 40, color: '#999', textAlign: 'center', width: '100%' }}>
              暂无可用图片，请先在"AI 生成"中生成
            </div>
          )}
        </div>
      </Modal>

      {/* 发布历史 */}
      <Card
        title="发布历史"
        className="pub-history"
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={loadHistory} loading={historyLoading}>刷新</Button>}
      >
        <Table dataSource={publishHistory} columns={historyColumns} rowKey="id" size="small"
          locale={{ emptyText: '暂无发布记录' }} />
      </Card>
    </div>
  )
}
