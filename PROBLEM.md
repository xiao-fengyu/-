# e-platform 问题清单 (PROBLEM.md)

> 创建日期：2026-05-22 | 状态：📋 待修复
> 按优先级排列：P0（阻塞）> P1（重要）> P2（移植性/改善）

---

## P0 阻塞性问题（不修复则打包后无法运行）

### P0-1: Electron 主进程不启动 Express 后端服务器

**现状**：`electron/main.ts` 只创建 BrowserWindow，完全不启动后端服务。打包后的 Electron 应用无法调用任何 API。

**影响**：所有 AI 生成、商品管理、发布、批量等功能全部失效。

**修复方案**：在 Electron 主进程中启动 Express 服务器（通过 `fork` 子进程或直接 import），在窗口创建前确保后端就绪。

---

### P0-2: 前后端端口不一致

**现状**：
- 后端 `server/index.ts` 硬编码 `PORT = 3001`
- 前端 `src/services/api.ts` / `src/pages/Publish/index.tsx` / `src/pages/Dashboard/index.tsx` / `src/pages/Batch/index.tsx` 全部硬编码 `http://127.0.0.1:14714`

**影响**：开发模式下前端请求端口错误；Electron 打包后更无人监听。

**修复方案**：统一端口配置，通过环境变量或配置文件管理。前端使用相对路径（Electron 环境）或可配置端口。

---

### P0-3: config.json 从未被后端读取

**现状**：`config.json.example` 存在但后端没有任何代码读取 `config.json`。所有 API Key、平台凭据、图片参数都硬编码或仅在内存中。

**影响**：配置无法持久化，每次启动丢失。

**修复方案**：后端启动时读取 `config.json`，提供配置加载/保存 API。

---

### P0-4: 生产环境数据库路径使用只读目录

**现状**：`server/services/database.ts` 中生产模式路径为 `join(process.resourcesPath, 'data')`。

**影响**：Electron 打包后 `resourcesPath` 是只读的（在 app.asar 内），SQLite 无法写入，应用直接崩溃。

**修复方案**：生产环境使用 `app.getPath('userData')`（Electron 标准用户数据目录），通过进程间通信传递路径。

---

## P1 重要问题

### P1-1: AI 提供商配置未持久化

**现状**：Zustand Store 中的提供商配置只保存在内存中。`database.ts` 有 `saveProvider/getProviders` 方法，但后端没有暴露对应的 REST API。设置页面表单也无法提交保存。

**影响**：用户在设置中添加的 AI 提供商配置，应用重启后全部丢失。

**修复方案**：添加 `/api/providers` CRUD API；设置页面表单对接保存接口。

---

### P1-2: PDD OAuth 流程不完整

**现状**：`server/routes/pdd.ts` 有 `/oauth/authorize` 端点返回 URL，但没有自动打开浏览器，也没有 `/oauth/callback` 回调端点处理授权码换取 token。

**影响**：用户无法完成拼多多 OAuth 授权流程。

**修复方案**：添加回调路由 `GET /api/pdd/oauth/callback`；前端在 Electron 环境下使用 `shell.openExternal` 打开授权页。

---

### P1-3: 无环境变量/统一配置机制

**现状**：端口、API 地址、数据目录等配置散落在各文件中硬编码。

**影响**：不同环境（开发/生产/测试）需要改源码。

**修复方案**：引入统一配置模块，支持环境变量 + config.json + 默认值三级优先级。

---

### P1-4: electron:dev 脚本不启动后端

**现状**：`package.json` 中 `electron:dev` 只启动 Vite + Electron，没有启动 Express 后端。

**影响**：开发模式下无法调试完整功能。

**修复方案**：修改为同时启动后端（tsx server/index.ts）。

---

## P2 移植性与改善

### P2-1: 前端多处硬编码 API 地址

**现状**：`src/services/api.ts`、`src/pages/Publish/index.tsx`、`src/pages/Dashboard/index.tsx`、`src/pages/Batch/index.tsx` 各自定义 `API_BASE = 'http://127.0.0.1:14714'`。

**影响**：维护困难，端口变更需改 4 个文件。

**修复方案**：统一到 `src/services/api.ts` 一处定义，其他文件 import 使用。

---

### P2-2: 图片预览路径硬编码

**现状**：`src/pages/Batch/index.tsx:648` 硬编码 `http://127.0.0.1:14714` 拼接图片路径。

**修复方案**：使用统一的 API_BASE。

---

### P2-3: 缺少首次运行指引

**现状**：新 clone 用户不知道需要 `cp config.json.example config.json` + 编辑。

**修复方案**：后端启动时检测 config.json 不存在则自动从 example 复制，或启动后端服务自动创建默认配置。

---

### P2-4: 后端关闭时进程清理

**现状**：Electron 窗口关闭后，Express 子进程可能残留。

**修复方案**：在 `app.on('window-all-closed')` 中清理子进程。

---

## 需要测试的功能（服务器外网阻断未测）

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
| P0-1 | 📋 待修复 | |
| P0-2 | 📋 待修复 | |
| P0-3 | 📋 待修复 | |
| P0-4 | 📋 待修复 | |
| P1-1 | 📋 待修复 | |
| P1-2 | 📋 待修复 | |
| P1-3 | 📋 待修复 | |
| P1-4 | 📋 待修复 | |
| P2-1 | 📋 待修复 | |
| P2-2 | 📋 待修复 | |
| P2-3 | 📋 待修复 | |
| P2-4 | 📋 待修复 | |

---

*本文件随修复进度同步更新。*
