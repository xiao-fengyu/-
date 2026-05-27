import { Input, Button, Select, Image, Spin, message, Upload } from 'antd'
import { useState, useEffect } from 'react'
import {
  DeleteOutlined, ThunderboltOutlined,
  EditOutlined, DownloadOutlined
} from '@ant-design/icons'
import {
  fetchTemplates, renderTemplate, generateImages, generateImagesFromImage,
  checkCompliance, fetchImages, deleteImage,
} from '@/services/api'
import { useAppStore } from '@/store'
import './ImageGenerator.css'

const { TextArea } = Input

interface PromptTemplate {
  id: string
  name: string
  category: string
  prompt: string
  description: string
  tags: string[]
}

interface GeneratedImage {
  localPath: string
  url: string
  width: number
  height: number
  fileSize: number
  format: string
  selected?: boolean
  compliance?: { compliant: boolean; issues: string[] }
}

const TEMPLATE_ICONS: Record<string, string> = {
  '服装鞋包': '👗', '数码家电': '📱', '家居日用': '🏠',
  '食品生鲜': '🍎', '美妆个护': '💄', '运动户外': '🎮',
  '文具办公': '📚', '自定义': '🔧',
}

export default function ImageGeneratorPage() {
  const { providers } = useAppStore()

  // 状态
  const [mode, setMode] = useState<'text2image' | 'image2image'>('text2image')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [count, setCount] = useState(4)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [historyImages, setHistoryImages] = useState<any[]>([])
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null)

  // 加载模板和历史图片
  useEffect(() => {
    fetchTemplates().then((res: any) => {
      if (res.success) {
        setCategories(res.data.categories)
      }
    }).catch(() => message.error('加载模板失败'))

    fetchImages().then((res: any) => {
      if (res.success) setHistoryImages(res.data.images)
    }).catch(() => {})
  }, [])

  // 主体变化时重新渲染 prompt
  useEffect(() => {
    if (selectedTemplate && subject) {
      renderTemplate(selectedTemplate.id, { subject }).then((res: any) => {
        if (res.success) setPrompt(res.data.prompt)
      }).catch(() => {})
    }
  }, [subject])

  // 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim()) return message.warning('请输入商品描述或选择模板')
    if (!selectedProvider) return message.warning('请选择 AI 提供商')

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return message.warning('请先在设置中添加 AI 提供商')

    setGenerating(true)
    try {
      const res = await generateImages({
        providerConfig: {
          id: provider.id, name: provider.name, type: provider.type,
          endpoint: provider.endpoint, apiKey: provider.apiKey,
          model: provider.model, maxImages: provider.maxImages,
          defaultParams: {}, isDefault: provider.isDefault,
        },
        prompt: prompt.trim(), count, width, height,
      })

      if (res.success) {
        setImages(res.data.images.map((img: GeneratedImage) => ({ ...img, selected: false })))
        message.success(`成功生成 ${res.data.count} 张图片`)
        fetchImages().then((r: any) => { if (r.success) setHistoryImages(r.data.images) })
      } else {
        message.error(res.error || '生成失败')
      }
    } catch (err: any) {
      message.error(err.message || '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  // 图生图
  const handleGenerateFromImage = async () => {
    if (!referenceImage) return message.warning('请上传参考图')
    if (!prompt.trim()) return message.warning('请输入描述')
    if (!selectedProvider) return message.warning('请选择 AI 提供商')

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return message.warning('请先在设置中添加 AI 提供商')

    setGenerating(true)
    try {
      const res = await generateImagesFromImage({
        referenceImage: referenceImage.file,
        providerConfig: {
          id: provider.id, name: provider.name, type: provider.type,
          endpoint: provider.endpoint, apiKey: provider.apiKey,
          model: provider.model, maxImages: provider.maxImages,
          defaultParams: {}, isDefault: provider.isDefault,
        },
        prompt: prompt.trim(), count, width, height,
      })

      if (res.success) {
        setImages(res.data.images.map((img: GeneratedImage) => ({ ...img, selected: false })))
        message.success(`成功生成 ${res.data.count} 张图片`)
        fetchImages().then((r: any) => { if (r.success) setHistoryImages(r.data.images) })
      } else {
        message.error(res.error || '生成失败')
      }
    } catch (err: any) {
      message.error(err.message || '图生图失败')
    } finally {
      setGenerating(false)
    }
  }

  // 合规检查
  const handleCheckCompliance = async (img: GeneratedImage, index: number) => {
    try {
      const res = await checkCompliance(img.localPath)
      if (res.success) {
        const updated = [...images]
        updated[index] = { ...updated[index], compliance: res.data }
        setImages(updated)
      }
    } catch (err: any) {
      message.error(err.message)
    }
  }

  // 切换选择
  const toggleSelect = (index: number) => {
    const updated = [...images]
    updated[index] = { ...updated[index], selected: !updated[index].selected }
    setImages(updated)
  }

  // 删除
  const handleDelete = async (filename: string) => {
    try {
      await deleteImage(filename)
      setHistoryImages(prev => prev.filter(img => img.filename !== filename))
      message.success('已删除')
    } catch (err: any) {
      message.error(err.message)
    }
  }

  const selectedCount = images.filter(i => i.selected).length

  return (
    <div className="image-generator">
      {/* 三栏布局 */}
      <div className="gen-layout">
        {/* 左栏：模板列表 */}
        <div className="gen-left">
          <h5>电商模板</h5>
          {categories.map(cat => (
            <div
              key={cat}
              className={`tc ${selectedCategory === cat ? 'a' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            >
              <div className="ti">{TEMPLATE_ICONS[cat] || '📋'}</div>
              <div className="tn">{cat}</div>
            </div>
          ))}
          <div
            className={`tc ${!selectedTemplate && !selectedCategory ? 'a' : ''}`}
            onClick={() => { setSelectedCategory(''); setSelectedTemplate(null); }}
          >
            <div className="ti">🔧</div>
            <div className="tn">自定义</div>
            <div className="td">自由输入描述</div>
          </div>
        </div>

        {/* 中间栏：编辑区 */}
        <div className="gen-center">
          {/* 模式切换 */}
          <div className="gmt">
            <div className={`gmt-t ${mode === 'text2image' ? 'a' : ''}`} onClick={() => setMode('text2image')}>
              📝 文生图
            </div>
            <div className={`gmt-t ${mode === 'image2image' ? 'a' : ''}`} onClick={() => setMode('image2image')}>
              🖼️ 图生图
            </div>
          </div>

          {/* 图生图：上传区 */}
          {mode === 'image2image' && (
            <div>
              {referenceImage ? (
                <div style={{ position: 'relative', textAlign: 'center' }}>
                  <img
                    src={referenceImage.preview}
                    alt="参考图"
                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Button
                    size="small" danger
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => setReferenceImage(null)}
                  >✕</Button>
                </div>
              ) : (
                <Upload.Dragger
                  accept="image/*" showUploadList={false} maxCount={1}
                  beforeUpload={(file) => {
                    const reader = new FileReader()
                    reader.onload = () => setReferenceImage({ file, preview: reader.result as string })
                    reader.readAsDataURL(file)
                    return false
                  }}
                  onRemove={() => setReferenceImage(null)}
                >
                  <div className="uz">
                    <div className="ui">📁</div>
                    <p>点击或拖拽上传参考图</p>
                    <div className="uh">支持 JPG/PNG/WebP，最大 10MB</div>
                  </div>
                </Upload.Dragger>
              )}
            </div>
          )}

          {/* 商品名称 */}
          <div className="fg">
            <label>商品主体</label>
            <Input
              placeholder="例如：白色陶瓷马克杯"
              value={subject} onChange={e => setSubject(e.target.value)} allowClear
              className="fi"
            />
          </div>

          {/* AI 描述 */}
          <div className="fg">
            <label>AI 描述</label>
            <TextArea
              rows={4}
              placeholder="描述你想要的效果..."
              value={prompt} onChange={e => setPrompt(e.target.value)}
              className="fi fta"
            />
          </div>

          {/* 参数行 */}
          <div className="fr">
            <div className="fg" style={{ flex: 1 }}>
              <label>生成数量</label>
              <Select
                className="fi" style={{ width: '100%' }}
                value={count} onChange={setCount}
                options={[{ label: '2 张', value: 2 }, { label: '4 张', value: 4 }, { label: '8 张', value: 8 }]}
              />
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label>尺寸</label>
              <Select
                className="fi" style={{ width: '100%' }}
                value={width} onChange={(w) => { setWidth(w); setHeight(w); }}
                options={[
                  { label: '1024×1024', value: 1024 },
                  { label: '720×1280', value: 720 },
                  { label: '1280×720', value: 1280 },
                ]}
              />
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label>提供商</label>
              <Select
                className="fi" style={{ width: '100%' }}
                placeholder="选择提供商"
                value={selectedProvider || undefined}
                onChange={setSelectedProvider}
                options={providers.map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }))}
              />
            </div>
          </div>

          {/* 生成按钮 */}
          <Button
            type="primary" size="large" block
            icon={<ThunderboltOutlined />}
            loading={generating}
            onClick={mode === 'image2image' ? handleGenerateFromImage : handleGenerate}
            className="bg"
          >
            {generating ? '生成中...' : '✨ 生成图片'}
          </Button>
        </div>

        {/* 右栏：结果预览 */}
        <div className="gen-right">
          <h5>✨ 生成结果 {images.length > 0 && `(${selectedCount}/${images.length} 已选)`}</h5>

          {generating ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <p style={{ marginTop: 12, color: '#94a3b8', fontSize: 12 }}>AI 正在生成中...</p>
            </div>
          ) : images.length > 0 ? (
            <>
              <div className="rg">
                {images.map((img, idx) => (
                  <div key={idx} className={`ri ${img.selected ? 'sel' : ''}`} onClick={() => toggleSelect(idx)}>
                    <Image
                      src={img.url || `file://${img.localPath}`}
                      width="100%" height="100%"
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                      preview={{ src: img.url || `file://${img.localPath}` }}
                    />
                    {img.selected && <span className="rb">✓</span>}
                  </div>
                ))}
              </div>

              {/* 操作按钮 */}
              <div className="ra">
                <Button size="small" icon={<DownloadOutlined />}>下载</Button>
                <Button size="small" icon={<EditOutlined />}>编辑</Button>
                <Button size="small" type="primary">📤 发布</Button>
              </div>

              {/* 合规结果 */}
              {images.map((img, idx) => (
                img.compliance && (
                  <div key={idx} style={{
                    padding: '6px 8px', borderRadius: 6, marginBottom: 4, fontSize: 11,
                    background: img.compliance.compliant ? '#ecfdf5' : '#fef2f2',
                    color: img.compliance.compliant ? '#059669' : '#dc2626',
                  }}>
                    {img.compliance.compliant ? '✅' : '❌'} 图 {idx + 1}: {img.compliance.compliant ? '符合要求' : img.compliance.issues.join('; ')}
                    <Button
                      size="small" type="link" style={{ float: 'right', padding: 0, height: 'auto', fontSize: 10 }}
                      onClick={(e) => { e.stopPropagation(); handleCheckCompliance(img, idx) }}
                    >重查</Button>
                  </div>
                )
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              <p style={{ fontSize: 12 }}>生成结果将在这里显示</p>
            </div>
          )}

          {/* 历史记录 */}
          <h5 style={{ marginTop: 16 }}>📜 历史记录 ({historyImages.length})</h5>
          {historyImages.length > 0 ? (
            <div className="hg">
              {historyImages.slice(0, 12).map((img: any) => (
                <div key={img.filename} className="ht" style={{ position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
                  <Image
                    src={`file://${img.path}`}
                    width="100%" height="100%"
                    style={{ objectFit: 'cover' }}
                    preview={{ src: `file://${img.path}` }}
                  />
                  <Button
                    size="small" danger type="text"
                    icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 2, right: 2, padding: 2, minWidth: 20, height: 20 }}
                    onClick={() => handleDelete(img.filename)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>暂无历史记录</p>
          )}
        </div>
      </div>
    </div>
  )
}
