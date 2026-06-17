# e-platform Codex Sync 规范

本文档定义本机开发 Codex 与远端 Windows 测试 Codex 之间的仓库同步方式。目标是让 GitHub 成为项目文件的唯一权威来源，同时把长期记忆摘要和 Windows 测试任务也纳入仓库化交接。

## 总原则

1. 项目文件只通过 GitHub 同步。
2. 不直接同步两边的原始 `memory.json`。
3. 每轮开发完成后，必须提交：项目改动、记忆摘要、测试任务单。
4. Windows Codex 只通过 `git pull` 获取最新仓库内容，再按任务单执行真实 UI 测试。
5. 所有对用户可见流程的结论，必须同时满足 UI 触发和脚本校验。

## 推荐目录结构

```text
docs/
  codex-sync/
    README.md
    memory-summaries/
      2026-06-16-<task-id>.md
    templates/
      memory-summary.template.md
      test-request.template.md
      test-result.template.md
test-reports/
  requests/
    2026-06-16-<task-id>.md
  runs/
    2026-06-16-<task-id>-windows/
      report.md
      report.json
      screenshot.png
      logs/
```

## 文件职责

### `docs/codex-sync/memory-summaries/`

保存每轮开发后的记忆摘要。摘要只记录长期有价值的信息，例如：

- 已确认的产品决策
- 已确定的测试流程
- 重要的代码约定
- 已验证的故障原因

不写入：

- `memory.json` 原文
- API key、token、密码
- 未脱敏的日志
- 用户私密数据

### `test-reports/requests/`

保存每轮需要 Windows 验证的测试任务单。任务单必须说明：

- commit
- 测试目标
- 真实 UI 操作步骤
- 脚本校验方式
- 验收标准
- 需要产出的截图、日志、JSON
- 是否有新的长期记忆
- 是否需要 Windows 真机测试；如果不需要，必须说明原因

### `test-reports/runs/`

保存 Windows Codex 的执行结果。建议每次运行使用独立目录，内部至少包含：

- `report.md`
- `report.json`
- `screenshot.png`
- `logs/`

## 文件命名规则

- 任务单：`test-reports/requests/YYYY-MM-DD-<task-id>.md`
- 运行结果：`test-reports/runs/YYYY-MM-DD-<task-id>-windows/`
- 记忆摘要：`docs/codex-sync/memory-summaries/YYYY-MM-DD-<task-id>.md`

`<task-id>` 应该简短、稳定、可搜索，例如：

- `remove-templates`
- `llm-chinese-prompt`
- `settings-api-redaction`

## 每轮开发完成后的提交要求

每轮开发完成后，GitHub commit/push 必须至少包含：

1. 项目代码或文档改动。
2. 本轮记忆摘要。
3. 本轮测试任务单。

如果本轮没有新的长期记忆，记忆摘要文件也必须存在，并明确写：`本轮无新增长期记忆`。

如果本轮不需要 Windows 真机测试，测试任务单也必须存在，并明确写：

- `本轮不需要 Windows 真机测试`
- 原因
- 需要时的替代验证方式

## 本机 Codex 执行流程

1. 完成代码修改。
2. 生成记忆摘要到 `docs/codex-sync/memory-summaries/`。
3. 生成 Windows 测试任务单到 `test-reports/requests/`。
4. 本地最小验证通过后提交并推送 GitHub。
5. 必要时提醒用户在 Windows Codex 中手动执行任务。
6. 读取 Windows Codex 写回的运行结果，再继续修复。

## Windows Codex 执行流程

1. `git pull` 获取最新仓库。
2. 读取最新记忆摘要，补充到自己的 memory。
3. 读取对应测试任务单。
4. 按任务单执行真实 Windows UI 测试。
5. 产出截图、日志、报告 JSON 和 Markdown。
6. 写入 `test-reports/runs/<task-id>-windows/`。
7. 将长期记忆事实回写到自己的 memory。

## 进入 GitHub 的内容

应该进入 GitHub：

- 源码
- 配置
- 文档
- 记忆摘要
- 测试任务单
- 脱敏测试报告
- 脱敏截图和日志

不应该进入 GitHub：

- API key
- token
- 密码
- 完整原始 `memory.json`
- 未脱敏日志
- 用户私密数据
- 无意义的临时调试垃圾文件

## 与现有工作流的关系

`docs/skills/e-platform-workflow/SKILL.md` 仍然负责项目级测试纪律；本文件负责跨 Codex 的目录、命名和同步约定。两者配合使用。
