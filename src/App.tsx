import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>e-platform</h1>
        <p>AI 驱动的商品图片生成 + 多平台一键上架</p>
      </header>
      <main className="app-main">
        <p>项目骨架已搭建，UI 开发中...</p>
      </main>
    </div>
  )
}

export default App
