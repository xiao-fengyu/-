import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'

import DashboardPage from '../../pages/Dashboard'
import ImageGeneratorPage from '../../pages/ImageGenerator'
import ImageEditorPage from '../../pages/ImageEditor'
import PublishPage from '../../pages/Publish'
import PlatformManagerPage from '../../pages/PlatformManager'
import SettingsPage from '../../pages/Settings'
import BatchPage from '../../pages/Batch'
import LogsPage from '../../pages/Logs'

import './AppLayout.css'

const workflowSteps = [
  { key: 'config', label: '配置' },
  { key: 'generate', label: '生成' },
  { key: 'edit', label: '编辑' },
  { key: 'confirm', label: '确认' },
  { key: 'publish', label: '发布' },
]

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
  return { done: order.slice(0, idx), active: current }
}

const navItems = [
  {
    path: '/dashboard', label: '工作台',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>,
  },
  { section: '生产' },
  {
    path: '/image/generate', label: 'AI 生成',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="14" height="14" rx="2"/><path d="M1 11l4-4 3 3 3-4 4 5"/></svg>,
  },
  {
    path: '/image/editor', label: '图片编辑',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z"/></svg>,
  },
  { section: '发布' },
  {
    path: '/publish', label: '发布商品',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1v10M4 7l4-6 4 6"/><path d="M2 13h12"/></svg>,
  },
  {
    path: '/batch', label: '批量任务',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 5h12M2 8h8M2 11h5"/></svg>,
  },
  { section: '管理' },
  {
    path: '/platforms', label: '平台管理',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 4h14v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4z"/><path d="M1 4l7-3 7 3"/></svg>,
  },
  {
    path: '/logs', label: '日志',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 5h12M2 8h8M2 11h5"/></svg>,
  },
  {
    path: '/settings', label: '设置',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2"/><path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.5 3.5l.7.7M11.8 11.8l.7.7M3.5 12.5l.7-.7M11.8 4.2l.7-.7"/></svg>,
  },
]

const pageLabels: Record<string, string> = {
  '/dashboard': '概览',
  '/image/generate': 'AI 生成',
  '/image/editor': '图片编辑',
  '/publish': '发布商品',
  '/batch': '批量任务',
  '/platforms': '平台管理',
  '/logs': '日志',
  '/settings': '设置',
}

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">e</div>
        e-platform
      </div>
      {navItems.map((item, i) => {
        if ('section' in item) {
          return <div key={i} className="nav-section">{item.section}</div>
        }
        const active = location.pathname === item.path
        return (
          <button
            key={item.path}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </aside>
  )
}

function WorkflowBar() {
  const location = useLocation()
  const { done, active } = getWorkflowStatus(location.pathname)
  return (
    <div className="workflow-bar">
      {workflowSteps.map((step, i) => {
        const isDone = done.includes(step.key)
        const isActive = active === step.key
        return (
          <span key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <span className={`wf-step${isDone ? ' done' : isActive ? ' active' : ''}`}>
              <span className="wf-num">{isDone ? '✓' : i + 1}</span>
              {step.label}
            </span>
            {i < workflowSteps.length - 1 && <span className="wf-sep">/</span>}
          </span>
        )
      })}
    </div>
  )
}

function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const label = pageLabels[location.pathname] || '概览'
  return (
    <div className="topbar">
      <div className="breadcrumb">
        <span>工作台</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{label}</span>
      </div>
      <div className="topbar-spacer" />
      <button className="topbar-btn tb-ghost" onClick={() => navigate('/logs')}>日志</button>
      <button className="topbar-btn tb-primary" onClick={() => navigate('/image/generate')}>新建任务</button>
    </div>
  )
}

function AppContent() {
  return (
    <div className="main-area">
      <Topbar />
      <WorkflowBar />
      <div className="page-content">
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
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <AppContent />
      </div>
    </BrowserRouter>
  )
}
