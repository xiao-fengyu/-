# e-platform UI 自动化测试脚本

## 目录结构

```
tests/
├── scenarios/          # 具体测试脚本（本机 Codex 编写）
├── templates/          # 测试脚本通用模板
├── utils/              # 测试工具函数
└── README.md           # 本文件
```

## 工作流

1. **本机 Codex 编写脚本**
   - 理解代码改动的业务意义
   - 在 `scenarios/` 中编写 UI 自动化测试脚本
   - 脚本命名：`{功能}-{变体}.js`
   - 脚本必须包含：UI 操作、API 监听、真实数据校验、诊断采集、清理逻辑

2. **提交到 GitHub**
   - 脚本作为改动的一部分一起提交
   - 与源代码改动在同一个 commit 中

3. **Windows 执行脚本**
   - 从 GitHub 拉取最新脚本
   - 运行脚本：`node tests/scenarios/{test-name}.js`
   - 脚本自动生成结果存放在 `test-reports/runs/YYYY-MM-DD-HH-MM-SS-{test-name}/`

4. **本机接收结果**
   - 从 `test-reports/runs/` 读取测试报告
   - 判断是否通过或需要修复

## 脚本编写规范

### 脚本头部注释

```javascript
/**
 * Test: [测试名称]
 * Goal: [验证目标]
 * Steps:
 *   1. [步骤1]
 *   2. [步骤2]
 *   ...
 * Acceptance Criteria:
 *   - [标准1]
 *   - [标准2]
 */
```

### 脚本返回格式

脚本必须返回结构化 JSON：

```json
{
  "status": "pass" | "fail" | "blocked",
  "timestamp": "ISO 8601",
  "steps": [
    {"step": "step_name", "result": "ok" | "fail", "duration_ms": 0},
    ...
  ],
  "summary": {"passed": N, "failed": N, "skipped": N},
  "artifacts": ["screenshot_1.png", ...],
  "errors": null | "error message"
}
```

## 测试结果

所有测试结果存放在 `../../test-reports/runs/` 目录，按时间戳组织。

## 现有脚本参考

可参考 `scripts/windows-image-generation-visible-acceptance.js` 作为模板编写新脚本。
