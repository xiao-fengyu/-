import { useEffect, useState } from 'react'
import { Modal } from 'antd'
import AppLayout from './components/Layout/AppLayout'
import { useAppStore } from './store'

function App() {
  const providers = useAppStore((state) => state.providers)
  const [firstRun, setFirstRun] = useState(false)

  useEffect(() => {
    // 首次启动：如果没有任何 AI 提供商，显示引导
    const hasSeen = localStorage.getItem('e-platform:firstRun')
    if (!hasSeen && providers.length === 0) {
      setFirstRun(true)
    }
  }, [providers])

  const handleFirstRunOk = () => {
    setFirstRun(false)
    localStorage.setItem('e-platform:firstRun', '1')
  }

  return (
    <>
      <Modal
        title="👋 欢迎使用 e-platform"
        open={firstRun}
        onOk={handleFirstRunOk}
        okText="知道了"
        cancelText={false}
        maskClosable={false}
      >
        <p>首次使用请先配置 AI 提供商：</p>
        <ol>
          <li>点击左侧菜单 <strong>设置</strong></li>
          <li>在 <strong>AI 提供商</strong> 区域添加你的 AI 服务（如 DALL-E 3、通义万相等）</li>
          <li>填入 API Key 和 Endpoint</li>
          <li>即可开始生成图片</li>
        </ol>
        <p>如需连接电商平台，请在设置中添加平台凭据。</p>
      </Modal>
      <AppLayout />
    </>
  )
}

export default App
