# e-platform

> AI 驱动的商品图片生成 + 多平台一键上架桌面客户端

## 简介

基于用户描述的需求，AI 自动生成商品图片 → 用户确认/编辑 → 一键发布到电商平台（拼多多、淘宝、京东、1688），形成完整的自动化上架工作流。

## 产品形态

- **桌面客户端**（Electron + React + TypeScript），Windows 平台
- 本地数据存储（SQLite）
- 多电商平台支持，按需扩展
- AI 图片生成提供商可自定义（API / 本地模型均可）

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 开发模式

```bash
# 1. 克隆仓库
git clone https://github.com/xiao-fengyu/- e-platform
cd e-platform

# 2. 安装依赖
npm install

# 3. 复制配置模板（如需要）
cp config.json.example config.json

# 4. 启动开发模式
npm run dev
```

### 构建安装包

```bash
npm run build
npm run package
```

## 项目结构

```
e-platform/
├── PLAN.md              # 开发计划书
├── README.md            # 本文件
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
├── .gitignore
├── electron/            # Electron 主进程
├── src/                 # React 前端
├── server/              # 本地后端服务
├── data/                # 运行时数据（不纳入 git）
└── resources/           # 应用资源
```

## 开发进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：项目骨架 + 核心 UI 框架 | ✅ 已完成 | Electron + React + TS + SQLite + Ant Design UI |
| 阶段二：AI 图片生成引擎 | ✅ 已完成 | 多提供商接入 + Prompt 模板 + Sharp 图片处理 |
| 阶段三：平台适配层 — 拼多多 | ✅ 已完成 | MD5 签名 + OAuth + 类目查询 + 图片上传 + 商品发布 |
| 阶段四：完整工作流串联 | ✅ 已完成 | 最小闭环 |
| 阶段五：批量模式 | ✅ 已完成 | 批量导入/生成/确认/发布 + 队列管理 + 失败重试 |
| 阶段六：测试 & 打包发布 | 📋 待开始 | Windows 安装包 |

### 已完成详情
- [x] 项目骨架搭建（Electron + React + TypeScript + Vite）
- [x] Express 后端服务器（health check 端点）
- [x] SQLite 数据库服务（商品表 + 图片表 + 提供商表 + 日志表）
- [x] Zustand 全局状态管理（AI 提供商 + 平台凭据 CRUD）
- [x] Ant Design UI 框架 + Layout 组件（侧边栏 + 路由）
- [x] 8 个页面骨架（工作台/AI生成/图片编辑/发布/平台管理/批量/日志/设置）
- [x] 设置页面完整 UI：内置 AI 提供商模板 + 自定义提供商表单 + 平台凭据管理
- [x] electron-builder NSIS 打包配置
- [x] TypeScript 编译零错误，vite build 通过
- [x] BUILD.md 构建与打包指南
- [x] IImageProvider 统一接口（DALL-E 3 / 通义万相 / 自定义端点）
- [x] Prompt 模板系统（10 个电商场景模板：服装/数码/家居/食品/通用）
- [x] Sharp 图片处理服务（合规检查/缩放/裁剪/格式转换/自动压缩）
- [x] 图片生成 API 路由（生成/合规检查/自动处理/图片管理/提供商验证）
- [x] ImageGenerator 页面完整 UI（模板选择 → 主体填空 → 自动渲染 Prompt → 生成 → 图片网格预览 → 合规检查 → 历史浏览）
- [x] DatabaseService 封装（图片/提供商/日志 CRUD）
- [x] 前端 API 调用封装（src/services/api.ts）
- [x] tsconfig @ 路径别名配置

### 阶段四：完整工作流串联 ✅
- [x] 数据库增强：products 表 draft_data 字段 + DraftService + Products CRUD + getLogs + exportData
- [x] 数据库迁移：自动添加 draft_data 字段（ALTER TABLE，已存在字段忽略）
- [x] 商品管理路由：POST/GET/PUT/DELETE /api/products（CRUD 完整）
- [x] 草稿路由：POST/GET/DELETE /api/drafts/:id + GET /api/drafts（保存/加载/列表/删除）
- [x] 操作日志路由：GET /api/logs（过滤+分页）+ GET /api/logs/publish-history
- [x] 数据备份路由：POST /api/backup/export + /import + GET /api/backup/list
- [x] 重试中间件：withRetry（指数退避 1s→2s→4s，网络错误自动重试 3 次）
- [x] PDD upload/publish 端点接入重试机制
- [x] Publish 页面改造：product_id 贯穿、自动保存草稿（防抖 2s）、草稿恢复、发布历史从日志加载、图片从数据库加载
- [x] Dashboard 页面改造：实时统计（图片/发布/平台）、最近任务列表、最近发布记录
- [x] 所有新端点 curl 验证通过
- [x] TypeScript 编译零错误

### 阶段三：平台适配层 — 拼多多 ✅
- [x] IPlatformAdapter 统一接口定义

### 阶段五：批量模式 ✅
- [x] 数据库迁移：batch_tasks + batch_items 表，products.batch_task_id 字段
- [x] xlsx (SheetJS) + multer 依赖安装
- [x] 批量导入路由：POST /api/batch/import（Excel/CSV 解析、列映射、校验）
- [x] 批量任务 CRUD 路由：GET/DELETE /api/batch/tasks/:id
- [x] 批量生成引擎：server/services/batch-generator.ts
  - 并发队列管理（maxConcurrency 1-10 可调）
  - withRetry 自动重试（最多 3 次，指数退避）
  - 单条生成：AI → 下载/保存 → 合规检查 → 创建商品+图片记录
  - POST /api/batch/tasks/:id/generate + GET /api/batch/tasks/:id/status
- [x] 批量发布服务：server/services/batch-publisher.ts
  - 逐条发布到平台，1s 延迟防限流
  - POST /api/batch/tasks/:id/publish
- [x] 批量确认：POST /api/batch/tasks/:id/confirm
- [x] 重试失败：POST /api/batch/tasks/:id/retry-failed（generate/publish）
- [x] Zustand Store 扩展：BatchTask / BatchItem / ParsedItem 类型
- [x] 前端 API 函数扩展：importBatch / fetchBatchTasks / startBatchGeneration / confirmBatch / startBatchPublish / retryFailed
- [x] 批量任务页面完整实现：导入 → 生成 → 确认 → 发布 三步流程
  - 任务列表（进度条、状态标签）
  - 任务详情（统计面板、条目表格 + 图片预览）
  - 自动轮询（2s 间隔）实时刷新进度
- [x] TypeScript 编译零错误

详见 [BUILD.md](BUILD.md) — 包含环境要求、开发模式、NSIS 打包流程、sharp 跨平台注意事项、故障排查。

## 配置说明

首次运行前需配置 AI 图片生成提供商和电商平台凭据，可通过应用内设置面板完成，无需手动编辑配置文件。

## 许可证

MIT
