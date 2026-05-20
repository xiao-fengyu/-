import { useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, ConfigProvider, theme } from 'antd'
import {
  DashboardOutlined,
  PictureOutlined,
  CloudUploadOutlined,
  ShopOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons'

import DashboardPage from '../../pages/Dashboard'
import ImageGeneratorPage from '../../pages/ImageGenerator'
import ImageEditorPage from '../../pages/ImageEditor'
import PublishPage from '../../pages/Publish'
import PlatformManagerPage from '../../pages/PlatformManager'
import SettingsPage from '../../pages/Settings'
import BatchPage from '../../pages/Batch'
import LogsPage from '../../pages/Logs'

import './AppLayout.css'

const { Sider, Content } = Layout

type MenuItem = {
  key: string
  icon: ReactNode
  label: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  {
    key: '/image',
    icon: <PictureOutlined />,
    label: '图片管理',
    children: [
      { key: '/image/generate', icon: null, label: 'AI 生成' },
      { key: '/image/editor', icon: null, label: '图片编辑' },
    ],
  },
  { key: '/publish', icon: <CloudUploadOutlined />, label: '发布商品' },
  { key: '/platforms', icon: <ShopOutlined />, label: '平台管理' },
  { key: '/batch', icon: <FileTextOutlined />, label: '批量任务' },
  { key: '/logs', icon: <BarChartOutlined />, label: '日志' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

function AppMenu() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      width={220}
      className="app-sider"
    >
      <div className="app-logo">
        {collapsed ? 'eP' : 'e-platform'}
      </div>
      <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['/image']}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  )
}

function AppContent() {
  return (
    <Content className="app-content">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/image/generate" element={<ImageGeneratorPage />} />
        <Route path="/image/editor" element={<ImageEditorPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/platforms" element={<PlatformManagerPage />} />
        <Route path="/batch" element={<BatchPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Content>
  )
}

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <Layout className="app-layout">
          <AppMenu />
          <AppContent />
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
