# e-platform UI 重设计计划书

> 创建时间: 2026-05-27
> 状态: 待确认

## 设计目标
从"后台管理系统"风格升级为"商品生产工作台"：现代配色 + 操作引导 + 全局工作流感知

## 技术约束
- 保持现有 Ant Design 组件库（不引入新 UI 框架）
- 保持现有路由结构不变
- 所有改动基于当前代码修改，不破坏已有功能
- TypeScript 编译零错误

---

### 阶段 A：全局基础

| # | 文件 | 改动 |
|---|------|------|
| A1 | `src/components/Layout/AppLayout.tsx` | 侧边栏从暗黑改为白色 + 分组标题 + 渐变 Logo + 左侧高亮条 |
| A2 | `src/components/Layout/AppLayout.css` | 全局配色变量替换：`#1677ff` → `#6366f1`，圆角 6→12，新增渐变/shadow 变量 |
| A3 | `AppLayout.tsx` | 内容区顶部新增**全局工作流进度条**组件（配置→生成→编辑→确认→发布） |

### 阶段 B：Dashboard 仪表盘

| # | 文件 | 改动 |
|---|------|------|
| B1 | `src/pages/Dashboard/index.tsx` | 改造为操作中心：问候语 + 快捷操作卡片(3 列) + 最近动态 + 统计面板 |
| B2 | `src/pages/Dashboard/Dashboard.css` | 配套样式：卡片悬浮效果、渐变统计数字、动态时间线 |

### 阶段 C：AI 生成页

| # | 文件 | 改动 |
|---|------|------|
| C1 | `src/pages/ImageGenerator/index.tsx` | 改造为**三栏布局**：左栏模板列表(可滚动) + 中间编辑区 + 右栏结果预览 |
| C2 | `src/pages/ImageGenerator/index.tsx` | 中间区新增文生图/图生图 Tab 切换 + 拖拽上传区 |
| C3 | `src/pages/ImageGenerator/index.css` | 三栏网格布局、模板卡片样式、上传区、结果网格 |

### 阶段 D：发布商品页

| # | 文件 | 改动 |
|---|------|------|
| D1 | `src/pages/Publish/index.tsx` | 顶部新增 Stepper 组件（选择店铺→商品信息→选择图片→确认发布） |
| D2 | `src/pages/Publish/index.tsx` | 表单改为分步渲染，每步只展示当前字段，支持上/下一步 + 保存草稿 |
| D3 | `src/pages/Publish/index.css` | Stepper 样式、分步卡片布局、按钮区 |

### 阶段 E：收尾

| # | 改动 |
|---|------|
| E1 | TypeScript 编译验证 |
| E2 | `README.md` 更新（阶段十：UI 重设计） |
| E3 | `git add -A && git commit && git push` |

---

### 关键设计变量
```css
--colorPrimary: #6366f1 (indigo)
--borderRadius: 12px
--sidebarBg: #ffffff (白底替代暗黑)
--workflowBar: 全局顶部进度指示
--cardHover: translateY(-2px) + shadow-lg
--gradient: linear-gradient(135deg, #6366f1, #8b5cf6)
```

### 不自做主张的部分
- 路由路径不变 (`/dashboard`, `/image/generate`, `/publish` 等)
- 后端 API 不变
- Zustand store 不变
- 已有业务逻辑不变
- 只改 UI 层（组件渲染 + CSS）
