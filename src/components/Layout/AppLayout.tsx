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
  EditOutlined,
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

// 工作流步骤定义
const workflowSteps = [
  { key: 'config', label: '配置' },
  { key: 'generate', label: '生成' },
  { key: 'edit', label: '编辑' },
  { key: 'confirm', label: '确认' },
  { key: 'publish', label: '发布' },
]

// 根据当前路由判断工作流状态
function getWorkflowStatus(pathname: string): { done: string[]; active: string } {
  const paths: Record<string, string> = {
    '/settings': 'config',
    '/dashboard': 'config',
    '/image/generate': 'generate',
    '/image/editor': 'edit',
    '/publish': 'confirm',
    '/batch': 'publish',
  }
  const current = paths[pathname] || 'config'
  const order = workflowSteps.map(s => s.key)
  const idx = order.indexOf(current)
  return {
    done: order.slice(0, idx),
    active: current,
  }
}

// 工作流进度条组件
function WorkflowBar() {
  const location = useLocation()
  const { done, active } = getWorkflowStatus(location.pathname)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 24px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      gap: 0,
    }}>
      {workflowSteps.map((step, i) => {
        const isDone = done.includes(step.key)
        const isActive = active === step.key
        return (
          <span key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: isDone ? '#10b981' : isActive ? '#6366f1' : '#cbd5e1',
              fontWeight: isActive ? 600 : 400,
            }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
                background: isDone ? '#10b981' : isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0',
                color: (isDone || isActive) ? '#fff' : '#94a3b8',
                boxShadow: isActive ? '0 2px 6px rgba(99,102,241,0.3)' : 'none',
              }}>
                {isDone ? '✓' : i + 1}
              </span>
              {step.label}
            </span>
            {i < workflowSteps.length - 1 && (
              <span style={{ margin: '0 8px', color: '#cbd5e1', fontSize: 12 }}>→</span>
            )}
          </span>
        )
      })}
    </div>
  )
}


// Ant Design Menu 分组类型
const groupItem = (key: string, label: string) => ({
  key,
  type: 'group' as const,
  label,
})

const menuItems: (ReturnType<typeof groupItem> | { key: string; icon: ReactNode; label: string })[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  groupItem('group-prod', '生 产'),
  { key: '/image/generate', icon: <PictureOutlined />, label: 'AI 生成' },
  { key: '/image/editor', icon: <EditOutlined />, label: '图片编辑' },
  groupItem('group-pub', '发 布'),
  { key: '/publish', icon: <CloudUploadOutlined />, label: '发布商品' },
  { key: '/batch', icon: <FileTextOutlined />, label: '批量任务' },
  groupItem('group-mgr', '管 理'),
  { key: '/platforms', icon: <ShopOutlined />, label: '平台管理' },
  { key: '/logs', icon: <BarChartOutlined />, label: '日志' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

function AppMenu() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  // 将分组菜单项渲染为自定义 DOM
  const renderMenuItems = () => {
    const items = menuItems.map((item) => {
      if ('type' in item && item.type === 'group') {
        return {
          key: item.key,
          type: 'group' as const,
          label: (
            <span style={{
              fontSize: 10,
              color: '#94a3b8',
              fontWeight: 700,
              letterSpacing: '2px',
              padding: '4px 0',
            }}>
              {item.label}
            </span>
          ),
        }
      }
      if ('icon' in item && item.icon) {
        return { key: item.key, icon: item.icon, label: item.label }
      }
      return { key: item.key, label: item.label }
    })
    return items
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      width={220}
      className="app-sider"
      style={{ background: '#ffffff' }}
    >
      <div className="app-logo">
        {collapsed ? 'eP' : '🚀 e-platform'}
      </div>
      <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['/image']}
        items={renderMenuItems()}
        onClick={({ key }) => navigate(key)}
        style={{ border: 'none', background: 'transparent' }}
      />
    </Sider>
  )
}

function AppContent() {
  return (
    <Content className="app-content">
      <WorkflowBar />
      <div style={{ padding: '20px' }}>
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
      </div>
    </Content>
  )
}

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
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
