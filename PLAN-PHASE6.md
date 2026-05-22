# Phase 6 开发计划书：测试 & 打包发布

> 创建时间：2026-05-22
> 状态：待确认

## 目标

完成 e-platform 的功能验证、Windows 安装包构建、提供商连通性测试、用户使用文档。

---

## 任务清单

### Step 1：端到端功能验证（拼多多全流程）

**验证清单：**

| # | 测试项 | 预期结果 |
|---|--------|----------|
| 1 | 前端路由完整 | 8 个页面均可正常访问 |
| 2 | 设置页 — AI 提供商 CRUD | 新增/编辑/删除提供商 |
| 3 | 设置页 — 平台凭据 CRUD | 新增/编辑/删除拼多多凭据 |
| 4 | AI 图片生成 | 选择提供商 → 填写 prompt → 生成图片 → 预览 |
| 5 | 商品管理 CRUD | 新增/编辑/删除商品 |
| 6 | 草稿保存/恢复 | 发布页自动保存草稿 → 重新进入恢复 |
| 7 | 操作日志 | 生成/发布操作有记录 |
| 8 | 数据备份 | 导出/导入 SQLite 数据库 |
| 9 | 批量导入 | 上传 Excel → 解析 → 创建任务 |
| 10 | 批量生成 | 选择提供商 → 并发生成 → 进度更新 |
| 11 | 批量确认 | 一键确认已生成条目 |
| 12 | 批量发布 | 选择凭据 → 逐条发布 → 状态更新 |
| 13 | 失败重试 | 重试生成/发布失败的条目 |

**产出：** 验证报告（通过/失败/阻塞）

### Step 2：electron-builder 打包配置优化

**当前状态：** 已有基础 `electron-builder.yml` 配置

**需要优化：**
1. 添加 `asarUnpack` 配置（better-sqlite3 和 sharp 原生模块必须 unpack）
2. 添加 `extraResources` 配置（server 目录作为资源打包）
3. 添加 `files` 精确过滤（排除 node_modules 开发包）
4. 验证 `vite.config.ts` 的 Electron 输出路径
5. 添加 `win.signAndEditProperties` 配置
6. 优化构建脚本：区分 `electron:build` 和 `electron:package`

**产出：** 优化后的 electron-builder.yml + 构建脚本

### Step 3：构建流程修复（better-sqlite3 + sharp 原生模块）

**问题：** better-sqlite3 和 sharp 是原生 Node 模块，需要预编译为 Electron 的 Node 版本（通常与系统 Node 不同）。

**解决方案：**
1. 安装 `electron-rebuild` 或使用 `@electron/rebuild`
2. 添加 `postinstall` 脚本自动重建原生模块
3. 或使用 `prebuild-install` 兼容方案
4. 在构建脚本中自动处理

**产出：** 可一键运行的构建脚本（`npm run electron:package`）

### Step 4：Windows NSIS 安装包构建

**配置要求：**
- 目标：NSIS 安装包（.exe）
- 架构：x64（Windows 主流）
- 安装选项：允许选择目录、创建桌面快捷方式
- 卸载：清理应用数据（可选）
- 图标：使用应用图标

**构建流程：**
```bash
npm run build          # 前端构建
npm run electron:build # Electron 打包
```

**产出：** `release/` 目录下的 .exe 安装包

### Step 5：提供商连通性测试

**测试范围：**
1. DALL-E 3（OpenAI API）
2. 通义万相（阿里云 API）
3. 自定义 API 端点

**测试内容：**
- API Key 验证
- 图片生成请求 → 响应 → 本地保存
- 错误处理（Key 无效、限流、超时）
- 图片合规检查（尺寸/格式/大小）

**产出：** 测试脚本 + 测试报告

### Step 6：用户使用说明书

**内容结构：**
1. 产品介绍与功能概述
2. 安装指南（Windows 安装包）
3. 首次配置（AI 提供商 + 平台凭据）
4. 单商品工作流（生成图片 → 确认 → 发布）
5. 批量工作流（导入 Excel → 生成 → 确认 → 发布）
6. 商品管理 & 草稿
7. 操作日志 & 数据备份
8. 常见问题排查

**产出：** `docs/USER_GUIDE.md`

### Step 7：Phase 6 验收 & README 更新

1. 更新 README 阶段 6 完成状态
2. 更新 PLAN.md 进度
3. 最终 git push

---

## 执行顺序

1. ✅ Step 1：端到端验证（纯检查，不修改代码）
2. 🔧 Step 2：打包配置优化
3. 🔧 Step 3：原生模块构建修复
4. 📦 Step 4：NSIS 安装包构建
5. 🔌 Step 5：提供商连通性测试
6. 📖 Step 6：使用说明书
7. ✅ Step 7：验收 & 文档更新

## 预计时间

- Step 1：15 分钟（检查清单）
- Step 2-3：30 分钟（配置 + 修复）
- Step 4：15 分钟（构建）
- Step 5：20 分钟（测试脚本）
- Step 6：20 分钟（文档）
- Step 7：5 分钟

**合计：约 1.5 - 2 小时**

---

## 验收标准

- [ ] 所有 13 项端到端测试通过或记录已知问题
- [ ] `npm run electron:package` 可一键构建
- [ ] `release/` 目录生成 NSIS .exe 安装包
- [ ] 提供商连通性测试通过（至少 1 个提供商）
- [ ] `docs/USER_GUIDE.md` 存在且完整
- [ ] README + PLAN.md 已更新
- [ ] TypeScript 编译零错误
- [ ] 所有改动已 git push

---

**请确认此计划，我将按顺序执行。**
