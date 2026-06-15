import { Input, Button, Select, Image, Spin, message, Upload } from 'antd'
import { useState, useEffect } from 'react'
import {
  DeleteOutlined, ThunderboltOutlined,
  EditOutlined, DownloadOutlined, RobotOutlined
} from '@ant-design/icons'
import {
  generateImages, generateImagesFromImage,
  checkCompliance, fetchImages, deleteImage,
  fetchProviderModels,
  generateFromNaturalLanguage, fetchLlmProviders,
  llmPromptFromText,
  type LlmProviderRecord,
} from '@/services/api'
import { useAppStore } from '@/store'
import './ImageGenerator.css'

const { TextArea } = Input

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

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.error || err.message || fallback
}

export default function ImageGeneratorPage() {
  const { providers } = useAppStore()

  // 状态
  const [mode, setMode] = useState<'text2image' | 'image2image' | 'natural'>('text2image')
  const [subject, setSubject] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedTextModel, setSelectedTextModel] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [count, setCount] = useState(4)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [historyImages, setHistoryImages] = useState<any[]>([])
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null)
  const [generationError, setGenerationError] = useState<string>('')

  // 自然语言模式：用户原始描述 + 后端 LLM 提供商
  const [nlDescription, setNlDescription] = useState('')
  const [llmProviders, setLlmProviders] = useState<LlmProviderRecord[]>([])
  const [selectedLlmProviderId, setSelectedLlmProviderId] = useState<string>('')

  // 加载历史图片和文本 LLM
  useEffect(() => {
    fetchImages().then((res: any) => {
      if (res.success) setHistoryImages(res.data.images)
    }).catch(() => {})

    fetchLlmProviders().then((res) => {
      if (res.success) {
        setLlmProviders(res.data)
        const def = res.data.find((p) => p.is_default === 1)
        setSelectedLlmProviderId(def?.id || res.data[0]?.id || '')
      }
    }).catch(() => {})
  }, [])

  // 选提供商后拉取可用模型列表
  useEffect(() => {
    if (!selectedProvider) {
      setAvailableModels([])
      setSelectedModel('')
      return
    }
    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return
    fetchProviderModels({
      id: provider.id, name: provider.name, type: provider.type,
      endpoint: provider.endpoint, apiKey: provider.apiKey,
      model: provider.model, maxImages: provider.maxImages,
      isDefault: provider.isDefault,
    }).then((res: any) => {
      if (res.success && res.data.models?.length) {
        setAvailableModels(res.data.models)
        const defaultModel = provider.model
        if (res.data.models.includes(defaultModel)) {
          setSelectedModel(defaultModel)
        } else {
          setSelectedModel(res.data.models[0])
        }
      } else {
        setAvailableModels([provider.model])
        setSelectedModel(provider.model)
      }
    }).catch(() => {
      setAvailableModels([provider.model])
      setSelectedModel(provider.model)
    })
  }, [selectedProvider])

  // 生成图片
  const handleGenerate = async () => {
    setGenerationError('')
    if (!prompt.trim()) return message.warning('请输入商品描述或选择模板')
    if (!selectedProvider) return message.warning('请选择 AI 提供商')

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return message.warning('请先在设置中添加 AI 提供商')

    // 用选中的 model 覆盖 provider 的默认 model
    const effectiveModel = selectedModel || provider.model

    setGenerating(true)
    try {
      const res = await generateImages({
        providerConfig: {
          id: provider.id, name: provider.name, type: provider.type,
          endpoint: provider.endpoint, apiKey: provider.apiKey,
          model: effectiveModel, maxImages: provider.maxImages,
          defaultParams: {}, isDefault: provider.isDefault,
        },
        prompt: prompt.trim(), count, width, height,
      })

      if (res.success) {
        setImages(res.data.images.map((img: GeneratedImage) => ({ ...img, selected: false })))
        message.success(`成功生成 ${res.data.count} 张图片`)
        fetchImages().then((r: any) => { if (r.success) setHistoryImages(r.data.images) })
      } else {
        setGenerationError(res.error || '生成失败')
        message.error(res.error || '生成失败')
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, '生成失败')
      setGenerationError(errorMessage)
      message.error(errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  // 图生图
  const handleGenerateFromImage = async () => {
    setGenerationError('')
    if (!referenceImage) return message.warning('请上传参考图')
    if (!prompt.trim()) return message.warning('请输入描述')
    if (!selectedProvider) return message.warning('请选择 AI 提供商')

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return message.warning('请先在设置中添加 AI 提供商')

    // 用选中的 model 覆盖 provider 的默认 model
    const effectiveModel = selectedModel || provider.model

    setGenerating(true)
    try {
      const res = await generateImagesFromImage({
        referenceImage: referenceImage.file,
        providerConfig: {
          id: provider.id, name: provider.name, type: provider.type,
          endpoint: provider.endpoint, apiKey: provider.apiKey,
          model: effectiveModel, maxImages: provider.maxImages,
          defaultParams: {}, isDefault: provider.isDefault,
        },
        prompt: prompt.trim(), count, width, height,
      })

      if (res.success) {
        setImages(res.data.images.map((img: GeneratedImage) => ({ ...img, selected: false })))
        message.success(`成功生成 ${res.data.count} 张图片`)
        fetchImages().then((r: any) => { if (r.success) setHistoryImages(r.data.images) })
      } else {
        setGenerationError(res.error || '生成失败')
        message.error(res.error || '生成失败')
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, '图生图失败')
      setGenerationError(errorMessage)
      message.error(errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  // 自然语言一站式：用户描述 → LLM 出 prompt → 喂给生图模型
  const handleGenerateFromNaturalLanguage = async () => {
    setGenerationError('')
    if (!nlDescription.trim()) return message.warning('请输入商品的自然语言描述')
    if (!selectedProvider) return message.warning('请选择 AI 生图提供商')
    if (llmProviders.length === 0) {
      return message.warning('请先在「设置 → 文本 LLM」中添加至少一个 LLM 提供商')
    }

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return message.warning('请先在设置中添加 AI 提供商')

    const effectiveModel = selectedModel || provider.model

    setGenerating(true)
    try {
      const res = await generateFromNaturalLanguage({
        description: nlDescription.trim(),
        providerConfig: {
          id: provider.id, name: provider.name, type: provider.type,
          endpoint: provider.endpoint, apiKey: provider.apiKey,
          model: effectiveModel, maxImages: provider.maxImages,
          defaultParams: {}, isDefault: provider.isDefault,
        },
        llmProviderId: selectedLlmProviderId || undefined,
        count, width, height,
        referenceImage: referenceImage?.file || null,
      })

      if (res.success) {
        setImages(res.data.images.map((img: GeneratedImage) => ({ ...img, selected: false })))
        if (res.data.prompt) setPrompt(res.data.prompt)
        message.success(`成功生成 ${res.data.count} 张图片（${res.data.mode === 'image-to-image' ? '图生图' : '文生图'}）`)
        fetchImages().then((r: any) => { if (r.success) setHistoryImages(r.data.images) })
      } else {
        setGenerationError(res.error || '生成失败')
        message.error(res.error || '生成失败')
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, '一站式生图失败')
      setGenerationError(errorMessage)
      message.error(errorMessage)
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

  // Prompt 优化（走后端 /api/llm/prompt-from-text）
  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return message.warning('请先输入描述')
    if (llmProviders.length === 0) {
      return message.warning('请先在「设置 → 文本 LLM」中添加至少一个 LLM 提供商')
    }
    const llmId = selectedTextModel || selectedLlmProviderId
    if (!llmId) {
      return message.warning('请先选择文本 LLM')
    }

    setOptimizing(true)
    try {
      const res = await llmPromptFromText({
        description: prompt.trim(),
        llmProviderId: llmId,
      })

      if (res.success && res.data?.prompt) {
        setPrompt(res.data.prompt)
        message.success('Prompt 已优化')
      } else {
        message.error(res.error || '优化失败')
      }
    } catch (err: any) {
      message.error(err.message || '优化失败')
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="image-generator">
      {/* 三栏布局 */}
      <div className="gen-layout">
        {/* 中间栏：编辑区 */}
        <div className="gen-center">
          {/* 模式切换 */}
          <div className="gmt">
            <div className={`gmt-t ${mode === 'natural' ? 'a' : ''}`} onClick={() => setMode('natural')}>
              💬 自然语言
            </div>
            <div className={`gmt-t ${mode === 'text2image' ? 'a' : ''}`} onClick={() => setMode('text2image')}>
              📝 文生图
            </div>
            <div className={`gmt-t ${mode === 'image2image' ? 'a' : ''}`} onClick={() => setMode('image2image')}>
              🖼️ 图生图
            </div>
          </div>

          {/* 自然语言模式：用户描述 + 可选参考图 + LLM 选择 */}
          {mode === 'natural' && (
            <div style={{ marginBottom: 12 }}>
              <div className="fg">
                <label>商品描述（用大白话即可）</label>
                <TextArea
                  rows={3}
                  placeholder="例如：白色陶瓷马克杯，要拍出高级感，浅灰背景，自然光..."
                  value={nlDescription}
                  onChange={e => setNlDescription(e.target.value)}
                  className="fi fta"
                />
              </div>
              <div className="fg">
                <label>文本 LLM（用来把描述转成专业 prompt）</label>
                <Select
                  className="fi" style={{ width: '100%' }}
                  placeholder={llmProviders.length === 0 ? '请先在设置中添加 LLM 提供商' : '选择 LLM 提供商'}
                  value={selectedLlmProviderId || undefined}
                  onChange={setSelectedLlmProviderId}
                  options={llmProviders.map(m => ({
                    label: `${m.name} (${m.model})${m.is_default === 1 ? ' · 默认' : ''}`,
                    value: m.id,
                  }))}
                  disabled={llmProviders.length === 0}
                />
              </div>
              <div className="fg">
                <label>参考图（可选，传了就走图生图）</label>
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
                      <p>点击或拖拽上传参考图（可选）</p>
                      <div className="uh">支持 JPG/PNG/WebP，最大 10MB</div>
                    </div>
                  </Upload.Dragger>
                )}
              </div>
            </div>
          )}

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

          {/* 商品名称（自然语言模式不需要） */}
          {mode !== 'natural' && (
          <div className="fg">
            <label>商品主体</label>
            <Input
              placeholder="例如：白色陶瓷马克杯"
              value={subject} onChange={e => setSubject(e.target.value)} allowClear
              className="fi"
            />
          </div>
          )}

          {/* AI 描述（自然语言模式不需要，由 LLM 自动生成） */}
          {mode !== 'natural' && (
          <div className="fg">
            <label>AI 描述</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextArea
                rows={4}
                placeholder="描述你想要的效果..."
                value={prompt} onChange={e => setPrompt(e.target.value)}
                className="fi fta"
                style={{ flex: 1 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Select
                  style={{ width: 140 }}
                  placeholder="选文本LLM"
                  value={selectedTextModel || selectedLlmProviderId || undefined}
                  onChange={setSelectedTextModel}
                  size="small"
                  options={llmProviders.map(m => ({
                    label: `${m.name}${m.is_default === 1 ? ' · 默认' : ''}`,
                    value: m.id,
                  }))}
                />
                <Button
                  icon={<RobotOutlined />}
                  loading={optimizing}
                  disabled={llmProviders.length === 0}
                  onClick={handleOptimizePrompt}
                  size="small"
                  style={{ width: 140 }}
                >AI 优化</Button>
              </div>
            </div>
          </div>
          )}

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
              <label>模型</label>
              <Select
                className="fi" style={{ width: '100%' }}
                placeholder="选模型"
                value={selectedModel || undefined}
                onChange={setSelectedModel}
                options={availableModels.map(m => ({ label: m, value: m }))}
                disabled={!selectedProvider}
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
            onClick={
              mode === 'natural'
                ? handleGenerateFromNaturalLanguage
                : mode === 'image2image'
                  ? handleGenerateFromImage
                  : handleGenerate
            }
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
          ) : generationError ? (
            <div style={{ padding: '12px 10px', borderRadius: 6, marginBottom: 12, background: '#fef2f2', color: '#b91c1c', fontSize: 12, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>生成失败</div>
              <div>{generationError}</div>
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
