---
name: e-platform-workflow
description: 当处理 e-platform 项目改动、测试流水线、Windows 真机验证、Electron UI 验证、真实 LLM/生图测试、报告归档或 GitHub 推送门禁时使用。核心要求是：先计划，后执行；改动后审查；测试必须由 UI 触发真实操作，并由脚本读取真实结果。
---

# e-platform 工作流 Skill

适用项目：`/data/e-platform`。

本项目以真实验证为准，不接受只凭推测判断成功。涉及用户流程的改动，必须走真实 UI 路径，并用脚本校验后端、数据库、文件系统、图片元数据或 API 返回等真实结果。

## 启动前要求

在修改任何文件前，必须完成：

1. 读取 `/data/e-platform/AGENTS.md`。
2. 如果用户提到“之前”“上次”“继续”等上下文，先读取 memory 中的 `e-platform` 和相关 session 节点。
3. 检查相关源码文件和当前 `git status`。
4. 输出简短计划，说明影响范围、预计修改文件、验证方式和预期产物。
5. 按计划逐项执行，不跳步。

不要继续沿用 `TEST-CHECKLIST.md` 中已经过期的假设。特别是：内置模型/提供商快速添加模板已经删除；当前 Settings 行为应只保留用户自定义配置入口，除非用户明确要求恢复。

跨本机开发 Codex 与 Windows 测试 Codex 的同步规范见 `docs/codex-sync/README.md`。每轮开发完成后，除代码改动外，还必须按该规范提交本轮记忆摘要和测试任务单。

## 文件编辑规则

- 改动范围必须贴合用户目标，不做无关重构。
- 不回滚用户或历史遗留的无关改动。
- 优先沿用项目已有模式，不随意引入新抽象。
- 实用情况下，使用 `mcp__filesystem__edit_file` 并先 `dryRun: true` 预览差异。
- 不要把 API key、token、密码等密钥写入仓库文件、报告、截图或 memory。

## 改动后门禁

完成代码改动后，按顺序执行：

1. 自审最终 diff。
2. 检查安全风险：密钥泄露、危险 shell 执行、路径穿越、本地文件暴露、鉴权绕过、过宽 CORS 或网络访问。
3. 检查性能风险：阻塞 Electron 主进程、大图内存占用、重复轮询、无界数据库读取、不必要重建。
4. 检查 bug 风险：状态持久化、空状态、API 失败响应、Windows 路径处理、生成图片清理。
5. 先运行最小必要本地检查，再根据影响面扩大验证。
6. 只有审查和测试完成后，才推送 GitHub。

## 本地验证

按改动范围选择执行：

- 类型检查：`npx tsc --noEmit`
- 构建：`npm run build`
- Windows 打包：`npm run electron:package:win`
- diff 卫生检查：`git diff --check`

如果命令因为只读文件系统、输出目录受限或环境问题失败，要记录原始失败，并区分环境失败和代码失败。

## 真实测试纪律

用户可见流程必须同时满足两段验证：

1. UI 触发：通过真实 Electron UI、浏览器 UI 或 Playwright 执行用户会走的操作路径。
2. 脚本校验：通过 API、数据库、文件系统、图片元数据或报告 JSON 读取真实结果。

典型要求：

- Settings 改动：用 UI 新增/删除/修改配置，再校验持久化数据或 API 返回。
- Prompt 优化：用 UI 触发优化，再校验返回 prompt 文本和请求结果；不得泄露密钥。
- 图片生成：用 UI 触发生成，再校验图片文件存在、尺寸、格式、大小、数据库记录和清理状态。
- 发布链路：用 UI 发起发布，再校验请求载荷、平台结果记录和错误处理。

只测后端接口不算完整真实测试；只看 UI 显示也不算完整真实测试。

### 图片生成用户可见性验收

图片生成报告必须明确区分 `backend-health` 和 `user-visible`：

- `backend-health` 只证明 provider 调用、文件落盘、图片元数据和 API 列表正常，不能作为“用户可用”的结论。
- `user-visible` 才能证明用户在 UI 中能看见并继续使用生成图片。

要宣称图片生成用户可用，测试 oracle 至少必须同时验证：

1. 从真实 UI 路径触发生成，不直接调用后端生成接口。
2. 生成前 UI 中已选中的图片 provider 可见且名称正确。
3. 生成后没有可见错误 toast、notification 或 alert。
4. 当前生成结果区域 `.ri` 至少出现请求数量的结果 tile。
5. 每个结果 tile 内的 `img` 可见、加载完成，并且 `naturalWidth/naturalHeight` 与渲染尺寸均大于 0。
6. 可见图片的 `src` 能关联到本轮生成的文件或后端 API 记录。
7. 至少一个结果 tile 可点击选中并进入 `.ri.sel` 状态。
8. 切走再回到 AI 生成页后，生成图片在历史记录 `.ht img` 中仍可见，或当前结果按设计仍可见。
9. 脚本侧继续校验图片文件存在、格式、尺寸、字节数，以及 `/api/images/images` 中的匹配记录。

如果报告只验证 `successTextCount > 0 || resultTiles > 0`、文件存在、PNG 尺寸和 API rows，则该报告只能记为流水线/后端健康检查，不能记为图片生成功能验收通过。

可复用的 Windows 用户可见性验收脚本草案位于 `scripts/windows-image-generation-visible-acceptance.js`，对应规范见 `docs/testing/image-generation-user-visible-acceptance.md`。

## Windows E2E 流程

Windows 真机 UI 验证默认采用“本机 Codex 开发 + Windows Codex 手动执行测试”的协作流程。不要默认从本机通过 SSH/SCP 遥控 Windows 执行 UI 测试；只有用户明确要求时，才使用 SSH runner 方案。

本机 Codex 职责：

1. 完成开发、代码审查、本地最小验证和 GitHub 推送。
2. 在 `test-reports/requests/` 写测试任务单，说明 commit、目标、步骤、验收标准和产物要求。
3. 提醒用户在 Windows 测试机的 Codex 中手动触发该任务。
4. 等 Windows Codex 写回 `test-reports/runs/<任务名>/` 后，读取报告、截图和 JSON 结果，再判断是否需要继续修复。

Windows Codex 职责：

1. 读取 `test-reports/requests/<任务名>.md`。
2. 在 Windows 桌面环境中执行真实 UI 测试。
3. 生成截图、日志、报告 JSON 或 Markdown。
4. 将测试产物写入 `test-reports/runs/<任务名>-windows/`，供本机 Codex 拉取或读取。

验证 Windows 安装版时，Windows Codex 应执行：

1. 构建或获取最新 GitHub Actions artifact。
2. 在 Windows 测试机安装或重装应用。
3. 从安装目录启动 Electron。
4. 确认后端 health：`127.0.0.1:3001`。
5. 驱动相关 UI 路径。
6. 从 `%APPDATA%/e-platform/data/` 和后端 API 校验真实结果。
7. 清理临时 provider、LLM 配置、key 文件、生成测试数据和 runner 文件。
8. 在文件系统允许时，将脱敏报告归档到 `test-reports/runs/<日期或运行名>-windows/`。

已知 Windows 环境信息来自 memory：

- 测试机：`36.212.8.169`，用户 `Administrator`。
- 应用安装路径：`C:\Program Files\e-platform\`。
- 数据目录：`C:\Users\Administrator\AppData\Roaming\e-platform\data\`。
- 测试工作目录：`C:\eplatform-test\`。

不要打印或提交凭据。如果使用 key 文件，必须确认清理完成；报告中只能保留脱敏后的模型名、base URL 等信息。

### 测试任务文件格式

本机 Codex 创建测试任务时，使用以下最小结构：

```md
# Test Request

Task ID:
Commit:
Target: Windows UI
Goal:
Steps:
Acceptance Criteria:
Artifacts Required:
Notes:
```

Windows Codex 交付测试结果时，使用以下最小结构：

```md
# Test Result

Task ID:
Commit:
Status: pass/fail/blocked
Executed Steps:
Artifacts:
Evidence:
Failures:
Self-check:
```

## 报告要求

有效报告至少包含：

- Git commit 或 artifact 标识。
- 测试环境：本地、Windows 安装版或 dev server。
- 已执行的 UI 步骤。
- 已执行的脚本校验。
- 通过/失败数量。
- 证据路径：截图、日志、报告 JSON、生成图片路径、数据库/API 观察结果。
- 密钥脱敏说明。
- 剩余风险或跳过项。

## 推送纪律

推送前必须：

1. 查看 `git status`，识别无关改动。
2. 确认最终 diff 只包含预期文件。
3. 确认门禁和真实测试完成；如果有阻塞，必须明确记录。
4. 确认已提交 `docs/codex-sync/memory-summaries/` 中的本轮记忆摘要；如无新增长期记忆，摘要中必须明确写“本轮无新增长期记忆”。
5. 确认已提交 `test-reports/requests/` 中的本轮测试任务单；如不需要 Windows 真机测试，任务单中必须说明原因和替代验证方式。
6. commit 信息说明用户可见行为变化。
7. 审查通过后再推送目标分支，通常是 `main`。

## 停止条件

遇到以下情况先停下来问用户：

- 用户要求与固定真实测试流程冲突。
- 缺少必要密钥，且没有安全替代测试方式。
- 继续执行需要删除用户数据、重置 git 历史或覆盖无关工作。
- Windows 验证需要的凭据或访问权限不可用。
