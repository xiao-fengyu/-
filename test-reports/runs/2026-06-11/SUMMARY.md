# 2026-06-11 测试执行报告

> 目标机：Windows Server 2022（36.212.8.169）
> 测试方式：Playwright `_electron.launch` 驱动已安装的 e-platform.exe，driver 持有进程不被 SSH 回收
> 安装包来源：GitHub Actions run id `27321607545`，commit `c37d844`
> 测试脚本：`C:\eplatform-test\e2e-runner.js`

## 总览

- **PASS：29 / 30**
- **FAIL：1 / 30**（PDD credentials 500，已修复）

## 通过项（29）

### Electron 启动 + UI（5）
- ✅ electron.launch
- ✅ firstWindow visible
- ✅ screenshot dashboard
- ✅ screenshot settings
- ✅ screenshot generate
- ✅ UI: 💬 自然语言 mode tab exists（验证阶段十二新增入口）

### API 冒烟 GET（15）
- ✅ /api/health
- ✅ /api/images/templates
- ✅ /api/images/templates/category/服装鞋包
- ✅ /api/products
- ✅ /api/drafts
- ✅ /api/logs
- ✅ /api/logs?action=publish
- ✅ /api/logs/publish-history?limit=10
- ✅ /api/backup/list
- ✅ /api/providers/
- ✅ /api/providers/default
- ✅ /api/llm/
- ✅ /api/llm/default
- ✅ /api/images/images
- ✅ /api/batch/tasks

### LLM CRUD 闭环（6）— 阶段十二关键能力
- ✅ POST /api/llm/ create
- ✅ GET /api/llm/ contains created
- ✅ PATCH /api/llm/:id/default
- ✅ GET /api/llm/default matches
- ✅ DELETE /api/llm/:id
- ✅ GET /api/llm/ no longer contains

### 自然语言生图路由（1）
- ✅ POST /api/images/generate-from-natural-language 空 body 校验返回 400 + "description 不能为空"

## 失败项（1，本次会话内已修复）

### ❌ GET /api/pdd/credentials → 500

**根因**：`server/routes/pdd.ts:189` 在无 `?platform=` 查询参数时仍把 `undefined` 传给 `stmt.all()`，better-sqlite3 严格校验参数数量。

**修复**：分支调用 `stmt.all()` 或 `stmt.all(platform)`，并加 try/catch 兜底。

**回归**：下一轮测试会再跑一次确认。

## 产物

- `reports/report-2026-06-11T06-59-55-852Z.json` — 完整 JSON 报告
- `screenshots/01-dashboard-*.png` — 工作台首屏
- `screenshots/02-settings-*.png` — 设置页
- `screenshots/03-generate-*.png` — AI 生成页（可见自然语言 Tab）

## TEST-CHECKLIST 状态映射

| 用例 ID | 测试项 | 状态 |
|---------|--------|------|
| E-001 | NSIS 安装包 | ✅ 通过 |
| E-002 | 启动应用 | ✅ 通过 |
| E-003 | 后端子进程 | ✅ 通过（fork + 3001 监听） |
| E-004 | 前端渲染 | ✅ 通过（截图无白屏） |
| E-005 | 数据目录 | ✅ 通过（%APPDATA%/e-platform 已创建） |
| C-001 | TypeScript 编译 | ✅ 通过（只剩 3 个 resourcesPath 历史错误） |
| C-002 | 前端构建 | ✅ 通过（vite build） |
| P-001~007 | 商品 CRUD GET | ✅ /api/products 返回 200 |
| D-001~004 | 草稿 CRUD GET | ✅ /api/drafts 返回 200 |
| L-001~005 | 日志 GET | ✅ /api/logs 系列返回 200 |
| BK-001~005 | 备份 list | ✅ /api/backup/list 返回 200 |
| T-001~006 | 模板 GET | ✅ /api/images/templates 返回 200 |
| V-001~010 | 提供商 GET | ✅ /api/providers/* 返回 200 |
| (新增) | 文本 LLM CRUD | ✅ 6 步闭环全过 |
| (新增) | 自然语言生图入口 | ✅ UI Tab 存在，路由参数校验生效 |

## 下次接续

- 重测 `/api/pdd/credentials` 确认 fix 生效
- 第二轮：UI 交互用例（Settings 添加/删除 LLM、AI 生成提交、Publish 流程）
- 第三轮：E2E 完整链路（自然语言 → 生图 → 选图 → 模拟发布）
- 需要外部 API Key 的项（T2~T7）跳过或单独标注
