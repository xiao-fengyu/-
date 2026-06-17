# 2026-06-15 First-run Guide and Settings Acceptance

## Scope

- Commit: `3cacefe` (`fix: remove legacy provider example from first-run guide`)
- GitHub Actions run: `27519185725` (`build-windows-exe`, success)
- Artifact: `e-platform-windows-x64`, artifact id `7627435077`
- Windows install path: `C:\Program Files\e-platform\e-platform.exe`
- Installed executable timestamp after reinstall: `2026/6/15 9:47:24`

## Change Verified

- Removed legacy built-in provider examples from the first-run guide.
- Hid the unused Cancel button in the first-run modal.
- Confirmed Settings remains custom-provider only.

## UI Evidence

- Windows installed build launched successfully.
- First-run/dashboard DOM check after reinstall found no modal and no legacy provider terms.
- Settings was opened through the real Electron sidebar UI.
- Screenshot: `screenshots/settings-after-fix-2026-06-15T01-59-34-426Z.png`

## Script Result

Settings DOM after real UI navigation:

- `通义千问`: 0
- `DeepSeek`: 0
- `DALL-E 3`: 0
- `通义万相`: 0
- `文心一格`: 0
- `快速添加内置模板`: 0
- `自定义添加` buttons: 1
- Empty provider text `暂无提供商，请先添加自定义提供商`: 1

First-run/dashboard DOM after reinstall:

- `DALL-E 3`: 0
- `通义万相`: 0
- Legacy terms: 0
- Visible modal count: 0

## Notes

- Earlier validation against the old installed build found the first-run guide still mentioned `DALL-E 3、通义万相等`, and the modal intercepted Settings clicks.
- The real LLM/image generation baseline was not rerun after this text-only fix; this run focused on the discovered Settings/first-run acceptance blocker.
- No secrets were written to this report.
