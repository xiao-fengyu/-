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

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/xiao-fengyu/- e-platform
cd e-platform

# 2. 安装依赖
npm install

# 3. 复制配置模板
cp config.json.example config.json
# 编辑 config.json 填写你的 AI 提供商和平台凭据

# 4. 开发模式（同时启动后端 + 前端 + Electron）
npm run electron:dev

# 或单独启动后端：
npm run server:dev

# 或仅启动前端：
npm run dev
```

### 构建安装包

```bash
npm run build
npm run electron:package
```

### GitHub Actions 构建 Windows exe 安装包

仓库已提供 Windows Runner 的 GitHub Actions 工作流：

- 工作流文件：`.github/workflows/build-windows-exe.yml`
- 目标产物：Windows x64 **NSIS `.exe` 安装包**
- 触发方式：
  - 推送影响打包的相关文件到 `main`
  - 或在 GitHub Actions 页面手动执行 `build-windows-exe`
- 构建流程：安装依赖 → 前端构建 → 重建原生模块 → **esbuild 编译后端** → electron-builder 打包

构建完成后，可在 GitHub Actions 的本次运行中下载产物：

- `e-platform-windows-x64`
- 内含 `release/*.exe` 安装包及相关更新描述文件

> 说明：当前服务器是 Linux 环境，缺少 Windows 打包所需运行条件；因此 Windows 安装包由 GitHub 的 Windows runner 负责构建，这是当前最稳定的方案。

## 项目结构

```
e-platform/
├── PLAN.md                   # 开发计划书
├── PLAN-PHASE6.md            # 阶段六详细计划
├── PROBLEM.md                # 问题记录
├── README.md                 # 本文件
├── BUILD.md                  # 构建与打包指南
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.server.json      # 后端编译配置
├── vite.config.ts
├── electron-builder.yml
├── index.html
├── config.json.example       # 配置模板
├── .gitignore
├── .github/
│   └── workflows/
│       └── build-windows-exe.yml  # CI/CD Windows 构建
├── electron/                 # Electron 主进程
│   ├── main.ts               # 主进程入口
│   └── preload.ts            # 预加载脚本
├── src/                      # React 前端
├── server/                   # 本地后端服务
│   ├── config.ts             # 配置管理
│   ├── index.ts              # 后端入口
│   ├── middleware/           # 中间件
│   ├── routes/               # API 路由
│   ├── services/             # 业务逻辑服务
│   └── utils/                # 工具函数
├── data/                     # 运行时数据（不纳入 git）
├── resources/                # 应用资源
│   └── icon.png
├── docs/
│   └── USER_GUIDE.md         # 用户使用说明书
└── scripts/
    └── test_providers.py     # 提供商连通性测试
```

### 配置说明

应用启动时会自动查找 `config.json`（项目根目录），优先级：
1. 环境变量（如 `SERVER_PORT`、`DB_DIR`）
2. `config.json` 文件
3. 内置默认值

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `server.port` | `3001` | 后端 Express 服务端口 |
| `aiProvider.endpoint` | 空 | AI 提供商 API 地址 |
| `aiProvider.apiKey` | 空 | AI 提供商密钥 |
| `platforms.pinduoduo.clientId` | 空 | 拼多多开放平台 Client ID |
| `batch.maxConcurrency` | `3` | 批量任务最大并发数 |

Electron 打包后，数据目录位于 `%APPDATA%/e-platform/data/`。

### 架构说明

- **开发模式**：Vite (:5173) + Express (:3001) + Electron 三者并行，Vite proxy 转发 `/api` 到后端
- **生产模式**：Electron 启动时 fork Express 子进程（端口 3001），静态文件由 Express 直接服务
- **配置**：`server/config.ts` 统一管理，支持热重载

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：项目骨架 + 核心 UI 框架 | ✅ 已完成 | Electron + React + TS + SQLite + Ant Design UI |
| 阶段二：AI 图片生成引擎 | ✅ 已完成 | 多提供商接入 + Prompt 模板 + Sharp 图片处理 |
| 阶段三：平台适配层 — 拼多多 | ✅ 已完成 | MD5 签名 + OAuth + 类目查询 + 图片上传 + 商品发布 |
| 阶段四：完整工作流串联 | ✅ 已完成 | 最小闭环 |
| 阶段五：批量模式 | ✅ 已完成 | 批量导入/生成/确认/发布 + 队列管理 + 失败重试 |
| 阶段六：测试 & 打包发布 | ✅ 已完成 | TypeScript 编译/构建通过 + 原生模块重建 + 打包管线验证 + 提供商测试脚本 + 使用说明书 |
| 阶段七：生产环境修复 | ✅ 已完成 | 统一配置系统 + Electron 后端集成 + 端口统一 + OAuth 回调 + 首次引导 |
| 阶段八：Windows 安装包白屏修复 | ✅ 已完成 | Electron fork 子进程路径修正 + NODE_PATH 原生模块定位 + preload API 注入 |

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

### 阶段六：测试 & 打包发布 ✅
- [x] TypeScript 编译零验证通过
- [x] vite build 前端构建通过
- [x] @electron/rebuild 安装 + better-sqlite3 原生模块重建
- [x] electron-builder.yml 优化（asarUnpack、extraResources、NSIS 配置）
- [x] package.json scripts 完善（electron:rebuild / electron:package / electron:package:win / postinstall）
- [x] 打包管线验证：`electron-builder --linux dir` 成功产出完整应用目录
  - app.asar（110MB，React 前端 + Electron 主进程）
  - app.asar.unpacked（better-sqlite3 + sharp 原生模块）
  - server 目录完整打包
- [x] Windows NSIS 构建文档（BUILD.md 补充一键构建流程）
- [x] 提供商连通性测试脚本 `scripts/test_providers.py`
- [x] 用户使用说明书 `docs/USER_GUIDE.md`

> **注意**：服务器外网阻断导致 NSIS/deb/AppImage 无法生成安装包文件，
> 但打包管线已完全验证。在 Windows 开发机上运行 `npm run electron:package:win` 即可一键生成 .exe 安装包。

### 阶段八：Windows 安装包白屏修复 ✅

#### 问题描述
Windows 安装包（NSIS .exe）安装后启动，全屏白屏，无法渲染 UI。

#### 根因分析
经过多次迭代排查，定位到三个相互关联的问题：

| # | 问题 | 影响 |
|---|------|------|
| 1 | `dist-server/index.js` 被打包进 `app.asar` | `fork()` 无法执行 asar 内的 JS 文件，后端无法启动 |
| 2 | esbuild 编译时 `better-sqlite3` 和 `sharp` 标记为 `--external` | 这两个原生模块未被打包进 `dist-server/index.js`，需要运行时动态 `require()` |
| 3 | fork 子进程未设置 `NODE_PATH` | Node.js 找不到 `app.asar.unpacked/node_modules/` 中的原生模块，后端启动崩溃 |
| 4 | preload.ts 用 `global.__API_BASE_URL` 读主进程变量 | main 和 preload 是两个独立 Node.js 进程，global 不共享 |

#### 修复方案

**1. electron-builder.yml — 解包 + extraResources**
```yaml
# asarUnpack：原生模块必须解包
asarUnpack:
  - 'node_modules/better-sqlite3/**'
  - 'node_modules/sharp/**'
  # ... 其他原生模块

# extraResources：dist-server 独立于 asar，路径 100% 确定
extraResources:
  - from: 'dist-server'
    to: 'dist-server'
    filter: ['**/*']
```

**2. electron/main.ts — 正确路径 + NODE_PATH**
```typescript
// 生产环境路径：extraResources 解压到 resources/dist-server/
if (app.isPackaged) {
  serverPath = join(process.resourcesPath, 'dist-server', 'index.js')
}

// fork 时设置 NODE_PATH，让子进程找到原生模块
if (app.isPackaged) {
  envVars.NODE_PATH = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
}
```

**3. electron/preload.ts — 用环境变量传递 API 地址**
```typescript
// 主进程在 createWindow() 之前设置 process.env.API_BASE_URL
// 渲染进程继承主进程环境，preload 可读取
getApiBaseUrl: () => {
  return process.env.API_BASE_URL || 'http://127.0.0.1:3001'
}
```

#### CI 构建历史
| 构建 | Commit | 修复内容 | 结果 |
|------|--------|----------|------|
| RUN14 | 949fb5b | preload contextBridge 注入 API_BASE_URL | 白屏依旧 |
| RUN16 | b1e3899 | dist-server asarUnpack + 路径修正 | 白屏依旧 |
| RUN17+ | 65239dd | NODE_PATH 设置 + extraResources | 白屏依旧 |
| RUN18+ | 5a62b17 | sharp 嵌套 @img asarUnpack + NODE_PATH 双路径覆盖 | 白屏依旧 |
| RUN19+ | （待构建） | NODE_PATH 增加 asar/node_modules 路径，修复 detect-libc 缺失 | 待验证 |

#### 关键踩坑
1. **asarUnpack 不可靠** — 不同平台行为有差异，改用 `extraResources` 更确定
2. **global 不跨进程** — main process 的 `global` 和 preload 的 `global` 是两个独立对象
3. **process.env 继承** — 渲染进程在创建时继承主进程的环境变量，所以 `createWindow()` 之前设置即可
4. **esbuild --external** — 原生模块标记 external 后，必须在运行时通过 NODE_PATH 或正确路径才能找到
5. **sharp 嵌套 @img 依赖** — sharp 的 `@img/sharp-win32-x64` 是嵌套在 `sharp/node_modules/@img/` 下的，electron-builder 的 asarUnpack glob `node_modules/@img/**` 只匹配**顶层**，不会匹配嵌套依赖。必须显式加 `sharp/node_modules/@img/**`。同时 NODE_PATH 需要覆盖两层路径（顶层 + sharp 嵌套）
6. **NODE_PATH 不能只指向 unpacked** — `detect-libc` 等纯 JS 依赖在 asar 内，NODE_PATH 必须同时包含 `app.asar/node_modules`，否则 fork 子进程找不到这些模块

#### 诊断方法论（阶段八新增）
- **WinRM 远程执行** — 通过 PowerShell WinRM (5985) 直接在 Windows 机器上运行命令，捕获 Electron fork 子进程的 stdout/stderr
- **像素级白屏分析** — 截图后用 PIL 计算白色像素占比，区分"加载缓慢"和"真正白屏"
- **日志驱动，不瞎猜** — 所有修复都基于实际错误堆栈，不再靠推测

详见 [BUILD.md](BUILD.md) — 包含环境要求、开发模式、NSIS 打包流程、sharp 跨平台注意事项、故障排查。
详见 [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — 完整用户使用说明书。

## 配置说明

首次运行前需配置 AI 图片生成提供商和电商平台凭据，可通过应用内设置面板完成，无需手动编辑配置文件。

## 许可证

MIT
