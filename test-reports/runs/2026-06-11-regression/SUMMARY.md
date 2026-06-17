# 2026-06-11 回归测试报告

> 目标：验证 commit `df2a103` 修复 PDD credentials 500 后整体不回归
> 安装包来源：GitHub Actions run id `27330059197`，commit `df2a103`
> 安装时间：2026-06-11 15:09:36
> 测试时间：2026-06-11 15:15:55

## 总览

- **PASS：30 / 30** ✅
- **FAIL：0 / 30**
- 上一轮（commit `c37d844`）：29 / 30，唯一 FAIL 项 `GET /api/pdd/credentials`

## 修复确认

| 用例 | 上一轮 | 本轮 |
|------|--------|------|
| GET /api/pdd/credentials | ❌ 500 | ✅ 200 |

PDD credentials 500 修复生效，其他 29 项继续通过，无回归。

## 流程闭环

第一次跑通"代码修复 → push main → GitHub Actions 自动构建 → Windows 拉 artifact → 重装 → Playwright 回归测试 → 报告归档"完整链路：

1. ✅ commit `df2a103` 推送到 main 触发 build-windows-exe（用时约 1 分钟）
2. ✅ Windows 直接从 GitHub 拉 artifact（约 15 秒，6.5 MB/s）
3. ✅ NSIS `/S /allusers` 静默重装（exit code 0）
4. ✅ Playwright `_electron.launch` 持有进程，30 项测试全过
5. ✅ 报告拉回 Linux 归档

## 下次接续

- 端到端真实 LLM 调用测试（需要真实 API Key）
- 扩 e2e-runner.js 的 UI 用例（Settings LLM 增删改、Publish 流程）
- 把整套流水线封成 `e-platform-test` skill
