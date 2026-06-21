---
name: e-platform-workflow
description: 当处理 e-platform 项目改动、测试流水线、Windows 真机验证、Electron UI 验证、真实 LLM/生图测试、报告归档或 GitHub 推送门禁时使用。核心要求是：先计划，后执行；改动后审查；本机 Codex 编写 UI 自动化测试脚本，Windows 环境执行脚本并返回结构化结果。
---

# e-platform 工作流 Skill

适用项目：`/data/e-platform`。

本项目以真实验证为准，不接受只凭推测判断成功。**核心工作流：本机 Codex 理解代码改动 → 编写完整 UI 自动化测试脚本 → 脚本存放在项目内固定位置 → Windows 环境拉脚本执行 → 返回结构化测试结果**。

## 启动前要求

在修改任何文件前，必须完成：

1. 读取 `/data/e-platform/AGENTS.md`。
2. 如果用户提到"之前""上次""继续"等上下文，先读取 memory 中的 `e-platform` 和相关 session 节点。
3. 检查相关源码文件和当前 `git status`。
4. 输出简短计划，说明影响范围、预计修改文件、验证方式和预期产物。
5. 按计划逐项执行，不跳步。

不要继续沿用 `TEST-CHECKLIST.md` 中已经过期的假设。

## 文件编辑规则

- 改动范围必须贴合用户目标，不做无关重构。
- 不回滚用户或历史遗留的无关改动。
- 优先沿用项目已有模式，不随意引入新抽象。
- 实用情况下，使用 `mcp__filesystem__edit_file` 并先 `dryRun: true` 预览差异。
- 不要把 API key、token、密码等密钥写入仓库文件、报告、截图或 memory。
- **测试脚本存放在 `tests/scenarios/` 时，脚本命名使用 `{功能}-{变体}.js` 格式，必须包含注释说明验证目标**。

## 改动后门禁

完成代码改动后，按顺序执行：

1. 自审最终 diff。
2. 检查安全风险：密钥泄露、危险 shell 执行、路径穿越、本地文件暴露、鉴权绕过、过宽 CORS 或网络访问。
3. 检查性能风险：阻塞 Electron 主进程、大图内存占用、重复轮询、无界数据库读取、不必要重建。
4. 检查 bug 风险：状态持久化、空状态、API 失败响应、Windows 路径处理、生成图片清理。
5. 先运行最小必要本地检查，再根据影响面扩大验证。
6. 如需 Windows 真机验证，在 `tests/scenarios/` 中编写对应的 UI 自动化测试脚本。
7. 只有审查、本地验证和测试脚本编写完成后，才推送 GitHub。

## UI 自动化测试脚本架构

### 核心理念

**本机 Codex 写脚本，Windows 执行脚本。** 本机 Codex 拥有完整的项目理解和代码上下文，负责理解改动影响、编写完整的 UI 自动化测试脚本，并将脚本固定存放在项目中；Windows 环境是执行器，负责运行脚本、采集结果、返回结构化数据。

### 脚本存放位置

```
tests/
├── scenarios/
│   ├── image-generation-qwen.js
│   ├── image-generation-real-llm.js
│   ├── batch-publish-pdd.js
│   └── ...
├── templates/
│   ├── base-launcher.js       (Electron 启动模板)
│   ├── api-monitor.js         (API 监听模板)
│   └── db-verifier.js         (数据库校验模板)
└── utils/
    └── helpers.js             (公共工具函数)
```

### 脚本编写规范

每个 `tests/scenarios/*.js` 脚本必须包含：

1. **脚本头部注释**：清晰说明该脚本的验证目标、预期行为、关键检查点。
2. **结构化的执行流**：前置检查、UI 操作、等待同步、真实结果校验、诊断数据采集、清理。
3. **返回结构化 JSON 结果**。

### 脚本开发工作流

1. 本机 Codex 分析改动，理解业务意义和用户可见路径。
2. 编写脚本：基于项目已有模板，生成针对本次改动的测试脚本，放入 `tests/scenarios/`。
3. 提交脚本到 GitHub：脚本作为项目内容的一部分，必须随改动一起提交。
4. 通知 Windows：告知脚本位置和执行方式。
5. Windows 执行脚本：在 Windows 环境中运行脚本，脚本自动生成结果 JSON。
6. 本机接收结果：从 `test-reports/runs/` 拉取或读取测试结果。

### 测试结果存放位置

```
test-reports/runs/
├── YYYY-MM-DD-HH-MM-SS-{test-name}/
│   ├── runner.js                    (本次运行的脚本名或脚本副本)
│   ├── report.json                  (结构化测试结果)
│   ├── report.md                    (可读的测试报告)
│   ├── screenshots/                 (诊断截图目录)
│   └── logs/                        (诊断日志目录)
```

每个测试运行自动生成唯一的时间戳目录，避免覆盖历史结果。

## 真实测试纪律

用户可见流程必须同时满足两段验证：

1. UI 触发：通过 Windows 环境的真实 Electron UI 执行用户会走的操作路径。
2. 脚本校验：通过 API、数据库、文件系统、图片元数据或报告 JSON 读取真实结果。

脚本应在自动执行的同时完成两段验证，不依赖人工介入。

只测后端接口不算完整真实测试；只看 UI 显示也不算完整真实测试。脚本必须同时覆盖 UI 操作和真实数据校验。

## Windows 执行流程

### 基本工作流

1. 获取脚本：从 GitHub 拉取最新代码，脚本位于 `tests/scenarios/`。
2. 运行脚本：在 Windows 桌面环境中执行脚本，脚本自动驱动 Electron UI、监听 API、校验数据。
3. 生成结果：脚本自动生成结构化 JSON 结果和诊断截图，存放在 `test-reports/runs/<时间戳-脚本名>/`。
4. 返回数据：将测试结果推回 GitHub 或存放在共享位置。

### Windows 环境信息

已知 Windows 测试机配置：

- 测试机地址：`36.212.8.169`
- 用户：`Administrator`
- 应用安装路径：`C:\Program Files\e-platform\`
- 数据目录：`C:\Users\Administrator\AppData\Roaming\e-platform\data\`
- 测试工作目录：`C:\eplatform-test\`

脚本执行前必须检查后端健康：`http://127.0.0.1:3001/health`。

### 脚本清理

脚本执行后必须清理测试数据和配置，将脱敏报告归档到 `test-reports/runs/` 对应目录。

## 本地验证

按改动范围选择执行：

- 类型检查：`npx tsc --noEmit`
- 构建：`npm run build`
- Windows 打包：`npm run electron:package:win`
- diff 卫生检查：`git diff --check`

## 推送纪律

推送前必须：

1. 查看 `git status`，识别无关改动。
2. 确认最终 diff 只包含预期文件，包括源代码改动和对应的测试脚本。
3. 确认本地验证完成。
4. 确认如需 Windows 真机测试，对应的 UI 自动化测试脚本已编写并放入 `tests/scenarios/`；如不需要，脚本中必须说明原因。
5. 如果已有 Windows 真机测试结果，确认结果存放在 `test-reports/runs/`。
6. commit 信息说明用户可见行为变化、测试方式和验证结论。
7. 审查通过后再推送目标分支，通常是 `main`。
