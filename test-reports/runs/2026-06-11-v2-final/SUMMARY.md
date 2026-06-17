# 2026-06-11 v2 终轮测试报告（45/45 全过）

> 目标：在 v1 基础上扩展 UI 交互用例，覆盖 Settings LLM 增删改默认完整流程
> 安装包来源：GitHub Actions run id `27332110877`，commit `c6833f8`
> 测试脚本：`C:\eplatform-test\e2e-runner-v2.js`（314 行）

## 总览

- **PASS：45 / 45** ✅
- **FAIL：0 / 45**
- 相比 v1（30/30）新增 15 项，全部通过

## 新增用例（15 项）

### Electron + UI 导航（3）
- ✅ UI nav: AI 生成
- ✅ UI nav: 设置
- ✅ UI nav: 发布商品

### ImageGenerator 自然语言模式 UI（5）
- ✅ UI: 💬 自然语言 tab exists
- ✅ UI: 📝 文生图 tab exists
- ✅ UI: 🖼️ 图生图 tab exists
- ✅ UI: 自然语言描述输入框出现
- ✅ UI: 描述输入可写

### Settings 文本 LLM 完整 UI 流程（6）
- ✅ UI: 文本 LLM Tab 存在
- ✅ UI: 文本 LLM Tab 已激活
- ✅ UI: 通义千问/DeepSeek/OpenAI GPT 快速添加按钮（3 项）
- ✅ UI: 表格出现通义千问行
- ✅ UI: 未配置 API Key 标签显示
- ✅ UI: 设为默认后出现"默认"标签
- ✅ UI: 删除后表格不再有通义千问行

### Publish 页存在性（1）
- ✅ UI: Publish 步骤条存在

## 期间发现并修复的真实 bug

### LLM 路由拒绝空 api_key（commit `c6833f8`）

**现象**：UI 测试发现"快速添加内置模板"按钮点了表面没反应，实际是后端返回 400。

**根因**：`server/routes/llm.ts:56` 的校验把 api_key 列为必填，但前端"快速添加"的产品逻辑是先建条目占位，让用户后续点"改 Key"补齐——校验和产品语义不一致。

**修复**：放宽校验为 `id/name/endpoint/model` 必填，api_key 允许空字符串。

**影响**：这是一个真实的可用性 bug，用户在 UI 操作中也会遇到。测试发现并修复，是阶段十二真正闭环的最后一公里。

## 流水线再次跑通

代码修复 → push main → Actions 构建（约 1 分钟）→ Windows 拉 artifact（约 15 秒）→ NSIS 静默重装 → Playwright 完整 UI 回归（45/45）→ 报告归档 + push

## 期间踩的坑

1. **antd Tabs 选择器**：`div.ant-tabs-tab` 能找到元素但点击不切换。改用 `[role="tab"]` + `force: true` + `waitForFunction` 等待 `aria-selected=true`。
2. **截图时机**：`.click()` 之后立刻截图会拍到上一个 Tab 的内容。`waitForFunction` 拿到 `aria-selected=true` 才进表格断言。
3. **PowerShell DeprecationWarning 误判**：Node 的 `[DEP0190]` 走 stderr 让 PowerShell 退出码变 1，但 e2e-runner 自己 `process.exit(0)`。看 `=== SUMMARY ===` 块的 PASS/FAIL 才是真结果。

## 下次接续候选

1. **真实 LLM Key 端到端**：自然语言 → 真生图（需要用户提供 API Key）
2. **封成 `e-platform-test` skill**：一条命令完成"拉 artifact → 推送 → 安装 → 跑测 → 收报告"
3. **回到需求 2**：多平台发布架构问题（统一 `/api/platforms/:platform/*`）
