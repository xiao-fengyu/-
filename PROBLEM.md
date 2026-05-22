# e-platform 问题清单 (PROBLEM.md)

> 创建日期：2026-05-22 | 状态：✅ 已全部修复
> 按优先级排列：P0（阻塞）> P1（重要）> P2（移植性/改善）

---

## P0 阻塞性问题（不修复则打包后无法运行）

### ✅ P0-1: Electron 主进程不启动 Express 后端服务器

**修复完成**：重写 `electron/main.ts`，在 `app.whenReady()` 中 `fork` Express 子进程。
- 端口通过 `SERVER_PORT` 环境变量传递
- 数据目录通过 `DB_DIR` 环境变量传递（使用 `app.getPath('userData')/data`）
- 子进程通过端口轮询检测就绪，窗口在端口可用后才创建
- `server/index.ts` 暴露 `startServer()` 函数，fork 模式下发送 `ready` 消息

---

### ✅ P0-2: 前后端端口不一致

**修复完成**：
- 创建 `server/config.ts` 统一配置模块，优先级：环境变量 > config.json > 默认值
- 后端端口默认 `3001`，可通过 `SERVER_PORT` 环境变量覆盖
- 前端 `src/services/api.ts` 统一导出 `API_BASE`
  - Electron 环境（`window.__ELECTRON__`）：相对路径
  - 开发环境（Vite + proxy）：`http://127.0.0.1:3001`
- Publish、Dashboard、Batch 页面全部改用 `API_BASE`

---

### ✅ P0-3: config.json 从未被后端读取

**修复完成**：`server/config.ts` 实现完整配置加载链：
- 启动时自动读取 `config.json`
- 若不存在但 `config.json.example` 存在，自动复制创建
- 支持 `saveConfig()` 持久化
- 深合并策略，支持环境变量覆盖

---

### ✅ P0-4: 生产环境数据库路径使用只读目录

**修复完成**：
- Electron 主进程通过 `app.getPath('userData')` 获取用户数据目录
- 通过 `DB_DIR` 环境变量传递给 Express 子进程
- `database.ts` 优先读取 `process.env.DB_DIR`
- 主进程确保目录存在（`userData/data/`、`userData/data/images/`、`userData/data/uploads/`）

---

## P1 重要问题

### ✅ P1-1: AI 提供商配置未持久化

**修复完成**：
- 创建 `server/routes/providers.ts`，提供完整的 REST API
  - `GET /api/providers` — 获取所有提供商
  - `GET /api/providers/default` — 获取默认提供商
  - `POST /api/providers` — 创建/更新
  - `DELETE /api/providers/:id` — 删除
  - `PATCH /api/providers/:id/default` — 设为默认
- 注册到 `server/index.ts`

---

### ✅ P1-2: PDD OAuth 流程不完整

**修复完成**：
- `server/routes/pdd.ts` 新增 `GET /oauth/url` — 生成授权 URL
- 新增 `GET /oauth/callback` — 处理 OAuth 回调，自动交换 token 并保存到数据库
- `pdd-adapter.ts` 新增 `getOAuthUrl()` 方法
- 回调页面展示成功/失败信息，3 秒后自动关闭

---

### ✅ P1-3: 无环境变量/统一配置机制

**修复完成**：见 P0-3 和 P0-2 修复详情。
- `server/config.ts` — 深合并 + 三级优先级 + 单例
- `config.json.example` — 完整配置模板

---

### ✅ P1-4: electron:dev 脚本不启动后端

**修复完成**：
- `npm run electron:dev` — concurrently 启动后端 + Vite + Electron
- `npm run server:dev` — 单独启动后端（tsx watch）
- 添加 `cross-env` 依赖用于传递 `ELECTRON_RENDERER_URL`

---

## P2 移植性与改善

### ✅ P2-1: 前端多处硬编码 API 地址

**修复完成**：统一到 `src/services/api.ts` 导出 `API_BASE`，Publish、Dashboard、Batch 页面全部改用 import。

### ✅ P2-2: 图片预览路径硬编码

**修复完成**：Batch/index.tsx 第 648 行改为使用 `API_BASE`。

### ✅ P2-3: 缺少首次运行指引

**修复完成**：`App.tsx` 检测无 AI 提供商且首次运行时显示引导弹窗，localStorage 持久化状态。

### ✅ P2-4: 后端关闭时进程清理

**修复完成**：`electron/main.ts` 监听 `window-all-closed` 和 `before-quit`，kill Express 子进程。

### ✅ P2-5: 后端不服务静态图片（新增）

**修复完成**：`server/index.ts` 添加 `express.static` 服务 `/images` 和 `/uploads`，生产环境同时服务前端 `dist/` 并 SPA 回退。

---

## 需要测试的功能（服务器外网阻断未测）

> 所有 P0-P2 问题已修复，以下功能待有网络的机器验证

| # | 功能 | 阻塞原因 | 测试条件 |
|---|------|---------|---------|
| T1 | AI 图片生成（DALL-E 3） | 外网 HTTP 阻断 | 有网络的机器 |
| T2 | AI 图片生成（通义万相） | 外网 HTTP 阻断 | 有网络的机器 |
| T3 | 拼多多 OAuth 授权 | 需要外网 + 拼多多开放平台 | 有效凭据 + 网络 |
| T4 | 拼多多图片上传 | 外网 HTTP 阻断 | 有效凭据 + 网络 |
| T5 | 拼多多商品发布 | 外网 HTTP 阻断 | 有效凭据 + 网络 |
| T6 | 批量导入 → 生成 → 确认 → 发布 | 依赖 T1+T5 | 完整网络 + 凭据 |
| T7 | 失败重试机制 | 依赖 T6 | 完整网络 + 凭据 |
| T8 | 数据备份/导入 | 本地可测 | 无网络要求 |
| T9 | 草稿自动保存与恢复 | 本地可测 | 无网络要求 |
| T10 | 图片合规检查 + Sharp 处理 | 本地可测 | 无网络要求 |

---

## 修复进度

| 编号 | 状态 | 说明 |
|------|------|------|
| P0-1 | ✅ 已修复 | Electron fork Express 子进程 |
| P0-2 | ✅ 已修复 | 统一配置 + Vite proxy + API_BASE |
| P0-3 | ✅ 已修复 | server/config.ts 三级优先级 |
| P0-4 | ✅ 已修复 | DB_DIR 环境变量 + userData 路径 |
| P1-1 | ✅ 已修复 | /api/providers CRUD |
| P1-2 | ✅ 已修复 | OAuth URL + 回调端点 |
| P1-3 | ✅ 已修复 | 同 P0-3 |
| P1-4 | ✅ 已修复 | concurrently 三进程启动 |
| P2-1 | ✅ 已修复 | 统一 API_BASE |
| P2-2 | ✅ 已修复 | Batch 图片路径修复 |
| P2-3 | ✅ 已修复 | 首次引导弹窗 |
| P2-4 | ✅ 已修复 | 进程清理 |
| P2-5 | ✅ 已修复 | 静态文件服务 |

---

*本文件随修复进度同步更新。*
