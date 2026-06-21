# e-platform

> AI 驱动的商品图片生成 + 多平台一键上架桌面客户端

## 简介

基于用户的自然语言描述（可选参考图），文本 LLM 自动转换为专业商品摄影 prompt → 喂给 AI 生图模型生成商品图 → 用户确认/编辑 → 一键发布到电商平台（拼多多、淘宝、京东、1688），形成完整的自动化上架工作流。

核心链路：

```
用户大白话描述（例如"白色陶瓷马克杯，要拍出高级感"）
   │  + 可选参考图
   ▼
文本 LLM（通义千问 / DeepSeek / OpenAI 等）→ 中文专业 prompt
   │
   ▼
AI 生图模型（DALL-E / 通义万相 / 任意 OpenAI 兼容端点）
   │
   ▼
本地落盘 + 入库 → 一键上架到电商平台
```

## 产品形态

- 桌面客户端（Electron + React + TypeScript），Windows 平台
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

## 测试工作流

### 核心原则

**本机 Codex 写脚本，Windows 执行脚本。**

- 本机 Codex：基于完整的项目理解和代码上下文，编写针对改动的 UI 自动化测试脚本，脚本放在 `tests/scenarios/` 并提交到 GitHub。
- Windows 环境：拉脚本执行，采集结果，返回结构化的 JSON 报告和诊断截图，存放在 `test-reports/runs/`。

### 测试脚本编写

每个改动涉及用户可见流程时，必须在 `tests/scenarios/` 中编写对应的 UI 自动化测试脚本。

脚本命名规范：`{功能}-{变体}.js`（例如 `image-generation-qwen.js`）

脚本必须包含：
- 前置环境检查（端口、后端健康检查）
- UI 操作（启动、配置、导航、点击）
- API 监听和响应等待
- 真实数据校验（文件系统、数据库、API 返回）
- 诊断数据采集（失败时采集截图、日志）
- 清理逻辑（删除测试数据、恢复环境）

脚本返回结构化 JSON 格式的测试结果。详见 `tests/README.md` 和 `docs/skills/e-platform-workflow/SKILL.md`。

### 测试结果

所有测试结果存放在 `test-reports/runs/` 目录，按时间戳组织（`YYYY-MM-DD-HH-MM-SS-{test-name}/`），包含：
- `report.json`：结构化测试结果
- `report.md`：可读的测试报告
- `screenshots/`：诊断截图
- `logs/`：诊断日志

### 工作流

1. **改动代码** → 修改源代码，审查风险。
2. **编写脚本** → 在 `tests/scenarios/` 编写 UI 自动化测试脚本。
3. **提交到 GitHub** → 脚本与源代码改动在同一个 commit 中。
4. **Windows 执行** → Windows 环境拉脚本，执行后返回结果到 `test-reports/runs/`。
5. **本机接收结果** → 从 `test-reports/runs/` 读取测试报告，判断是否通过。

详见 `docs/skills/e-platform-workflow/SKILL.md` 和 `tests/README.md`。

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
│   ├── README.md             # 文档导航
│   ├── USER_GUIDE.md         # 用户使用说明书
│   └── codex-sync/           # Codex 同步规范
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

- 开发模式：Vite (:5173) + Express (:3001) + Electron 三者并行，Vite proxy 转发 `/api` 到后端
- 生产模式：Electron 启动时 fork Express 子进程（端口 3001），静态文件由 Express 直接服务
- 配置：`server/config.ts` 统一管理，支持热重载

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：项目骨架 + 核心 UI 框架 | ✅ 已完成 | Electron + React + TS + SQLite + Ant Design UI |
| 阶段二：AI 图片生成引擎 | ✅ 已完成 | 多提供商接入 + Prompt 生成链路 + Sharp 图片处理 |
| 阶段三：平台适配层 — 拼多多 | ✅ 已完成 | MD5 签名 + OAuth + 类目查询 + 图片上传 + 商品发布 |
| 阶段四：完整工作流串联 | ✅ 已完成 | 最小闭环 |
| 阶段五：批量模式 | ✅ 已完成 | 批量导入/生成/确认/发布 + 队列管理 + 失败重试 |
| 阶段六：测试 & 打包发布 | ✅ 已完成 | TypeScript 编译/构建通过 + 原生模块重建 + 打包管线验证 + 提供商测试脚本 + 使用说明书 |
| 阶段七：生产环境修复 | ✅ 已完成 | 统一配置系统 + Electron 后端集成 + 端口统一 + OAuth 回调 + 首次引导 |
| 阶段八：Windows 安装包白屏修复 | ✅ 已完成 | Electron fork 子进程路径修正 + NODE_PATH 原生模块定位 + preload API 注入 + file:// 协议替换为 HTTP |
| 阶段九：图生图功能 | ✅ 已完成 | IImageProvider 扩展 generateFromImage + Wanx/CustomProvider 图生图实现 + 前端参考图上传 + Tab 切换 |
| 阶段十：UI 全面重设计 | ✅ 已完成 | 工作站式布局 + 紫蓝渐变主题 + 三栏 AI 生成 + 分步发布表单 + 卡片仪表盘 |
| 阶段十一：模型管理 + Prompt 优化 | ✅ 已完成 | 统一文本 LLM 管理入口 + 模型切换 + 大白话 → 专业 prompt 自动转换 |
| 阶段十二：自然语言一站式生图 + LLM 持久化 | ✅ 已完成 | 文本 LLM 服务化 + DB 持久化 + DALL-E/Wanx 图生图补全 + 一站式接口 |

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
- [x] Sharp 图片处理服务（合规检查/缩放/裁剪/格式转换/自动压缩）
- [x] 图片生成 API 路由（生成/合规检查/自动处理/图片管理/提供商验证）
- [x] ImageGenerator 页面完整 UI（自然语言 → prompt → 生成 → 图片网格预览 → 合规检查 → 历史浏览）
- [x] DatabaseService 封装（图片/提供商/日志 CRUD）
- [x] 前端 API 调用封装（src/services/api.ts）
- [x] tsconfig @ 路径别名配置
