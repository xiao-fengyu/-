import { Card, Input, Button, Select, Space, Tag, Row, Col, Image, Spin, message, Divider, Tooltip } from 'antd'
import { useState, useEffect } from 'react'
import {
  PictureOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  DeleteOutlined, EditOutlined, ThunderboltOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import {
  fetchTemplates, renderTemplate, generateImages,
  checkCompliance, processImage, fetchImages, deleteImage,
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

export default function ImageGeneratorPage() {
  const { providers } = useAppStore()

  // 状态
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
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
  const [showTemplates, setShowTemplates] = useState(false)

  // 加载模板和历史图片
  useEffect(() => {
    fetchTemplates().then((res: any) => {
      if (res.success) {
        setTemplates(res.data.templates)
        setCategories(res.data.categories)
      }
    }).catch(() => message.error('加载模板失败'))

    fetchImages().then((res: any) => {
      if (res.success) setHistoryImages(res.data.images)
    }).catch(() => {})
  }, [])

  // 选择模板时渲染 prompt
  const handleSelectTemplate = (tpl: PromptTemplate) => {
    setSelectedTemplate(tpl)
    if (subject) {
      renderTemplate(tpl.id, { subject }).then((res: any) => {
        if (res.success) setPrompt(res.data.prompt)
      }).catch(() => setPrompt(tpl.prompt.replace('{subject}', subject || '商品')))
    } else {
      setPrompt(tpl.prompt)
    }
    setShowTemplates(false)
  }

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
          id: provider.id,
          name: provider.name,
          type: provider.type,
          endpoint: provider.endpoint,
          apiKey: provider.apiKey,
          model: provider.model,
          maxImages: provider.maxImages,
          defaultParams: {},
          isDefault: provider.isDefault,
        },
        prompt: prompt.trim(),
        count,
        width,
        height,
      })

      if (res.success) {
        setImages(res.data.images.map((img: GeneratedImage) => ({
          ...img,
          selected: false,
        })))
        message.success(`成功生成 ${res.data.count} 张图片`)
        // 刷新历史
        fetchImages().then((r: any) => {
          if (r.success) setHistoryImages(r.data.images)
        })
      } else {
        message.error(res.error || '生成失败')
      }
    } catch (err: any) {
      message.error(err.message || '生成失败')
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

  // 自动处理
  const handleAutoProcess = async (img: GeneratedImage, index: number) => {
    try {
      const res = await processImage(img.localPath, undefined, 800, 800)
      if (res.success) {
        const updated = [...images]
        updated[index] = {
          ...updated[index],
          localPath: res.data.outputPath,
          width: res.data.width,
          height: res.data.height,
          fileSize: res.data.fileSize,
          format: res.data.format,
        }
        setImages(updated)
        message.success('图片已自动处理')
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
      <div className="generator-header">
        <h1>AI 图片生成</h1>
        <p className="subtitle">输入商品描述或选择模板，AI 自动生成高质量商品图</p>
      </div>

      <Row gutter={16}>
        {/* 左侧：输入区 */}
        <Col span={10}>
          <Card title={
            <span><FileTextOutlined /> Prompt 设置</span>
          } className="input-card">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 模板选择 */}
              <div>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => setShowTemplates(!showTemplates)}
                  block
                >
                  {selectedTemplate ? `已选: ${selectedTemplate.name}` : '选择电商模板'}
                </Button>

                {showTemplates && (
                  <Card size="small" style={{ marginTop: 8, maxHeight: 300, overflow: 'auto' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {categories.map(cat => (
                        <Button
                          key={cat}
                          size="small"
                          type={selectedCategory === cat ? 'primary' : 'default'}
                          onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                      <Divider style={{ margin: '4px 0' }} />
                      {templates
                        .filter(t => !selectedCategory || t.category === selectedCategory)
                        .map(tpl => (
                          <Button
                            key={tpl.id}
                            size="small"
                            block
                            type={selectedTemplate?.id === tpl.id ? 'primary' : 'text'}
                            onClick={() => handleSelectTemplate(tpl)}
                          >
                            <div style={{ textAlign: 'left' }}>
                              <div>{tpl.name}</div>
                              <div style={{ fontSize: 11, color: '#999' }}>{tpl.description}</div>
                            </div>
                          </Button>
                        ))
                      }
                    </Space>
                  </Card>
                )}
              </div>

              {/* 商品主体 */}
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  商品主体 <span style={{ color: '#999', fontWeight: 400 }}>（选填，用于替换模板中的{'{subject}'}）</span>
                </label>
                <Input
                  placeholder="例如：白色陶瓷马克杯"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  allowClear
                />
              </div>

              {/* Prompt 输入 */}
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  生成描述
                </label>
                <TextArea
                  rows={5}
                  placeholder="描述你的商品，例如：白色陶瓷马克杯，简约风格，纯白背景，自然光照"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>

              {/* 提供商 */}
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>AI 提供商</label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择提供商（需先在设置中添加）"
                  value={selectedProvider || undefined}
                  onChange={setSelectedProvider}
                  options={providers.map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }))}
                />
              </div>

              {/* 生成参数 */}
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>生成参数</label>
                <Row gutter={8}>
                  <Col span={8}>
                    <Select
                      style={{ width: '100%' }}
                      value={count}
                      onChange={setCount}
                      options={[
                        { label: '1 张', value: 1 },
                        { label: '2 张', value: 2 },
                        { label: '4 张', value: 4 },
                        { label: '8 张', value: 8 },
                      ]}
                    />
                  </Col>
                  <Col span={8}>
                    <Select
                      style={{ width: '100%' }}
                      value={width}
                      onChange={setWidth}
                      options={[
                        { label: '512', value: 512 },
                        { label: '768', value: 768 },
                        { label: '1024', value: 1024 },
                        { label: '1280', value: 1280 },
                      ]}
                    />
                  </Col>
                  <Col span={8}>
                    <Select
                      style={{ width: '100%' }}
                      value={height}
                      onChange={setHeight}
                      options={[
                        { label: '512', value: 512 },
                        { label: '768', value: 768 },
                        { label: '1024', value: 1024 },
                        { label: '1280', value: 1280 },
                      ]}
                    />
                  </Col>
                </Row>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                loading={generating}
                onClick={handleGenerate}
                block
              >
                {generating ? '生成中...' : '生成图片'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧：结果区 */}
        <Col span={14}>
          {images.length > 0 && (
            <Card
              title={`生成结果 (${selectedCount}/${images.length} 已选)`}
              extra={
                selectedCount > 0 && (
                  <Button type="primary" size="small">
                    确认选中 ({selectedCount})
                  </Button>
                )
              }
              className="result-card"
            >
              <div className="image-grid">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`image-card ${img.selected ? 'selected' : ''}`}
                    onClick={() => toggleSelect(idx)}
                  >
                    <div className="image-wrapper">
                      <Spin spinning={false}>
                        <img src={img.url || `file://${img.localPath}`} alt={`生成结果 ${idx + 1}`} />
                      </Spin>
                      {img.selected && (
                        <div className="selected-badge">
                          <CheckCircleOutlined />
                        </div>
                      )}
                    </div>
                    <div className="image-info">
                      <Tag color="blue">{img.width}×{img.height}</Tag>
                      <Tag color="green">{(img.fileSize / 1024).toFixed(0)}KB</Tag>
                      <Tag>{img.format.toUpperCase()}</Tag>
                    </div>
                    <div className="image-actions">
                      <Tooltip title="合规检查">
                        <Button
                          size="small"
                          icon={img.compliance
                            ? (img.compliance.compliant ? <CheckCircleOutlined /> : <CloseCircleOutlined />)
                            : <CheckCircleOutlined />
                          }
                          onClick={(e) => { e.stopPropagation(); handleCheckCompliance(img, idx) }}
                        />
                      </Tooltip>
                      <Tooltip title="自动处理">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => { e.stopPropagation(); handleAutoProcess(img, idx) }}
                        />
                      </Tooltip>
                      <Tooltip title="重新生成">
                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </div>
                    {img.compliance && (
                      <div className={`compliance-result ${img.compliance.compliant ? 'pass' : 'fail'}`}>
                        {img.compliance.compliant
                          ? '✅ 符合平台要求'
                          : `❌ ${img.compliance.issues.join('；')}`
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 历史图片 */}
          <Card
            title={<span><PictureOutlined /> 历史图片</span>}
            style={{ marginTop: 16 }}
            className="history-card"
          >
            {historyImages.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                还没有历史图片
              </p>
            ) : (
              <Row gutter={[8, 8]}>
                {historyImages.map((img: any) => (
                  <Col key={img.filename} span={4}>
                    <div className="history-item">
                      <Image
                        src={`file://${img.path}`}
                        width={80}
                        height={80}
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="history-info">
                        <span className="filename">{img.filename.slice(0, 12)}...</span>
                        <span className="filesize">{(img.size / 1024).toFixed(0)}KB</span>
                      </div>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(img.filename)}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
