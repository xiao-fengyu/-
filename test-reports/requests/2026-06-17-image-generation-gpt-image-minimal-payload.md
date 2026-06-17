# Test Request

Task ID: 2026-06-17-image-generation-gpt-image-minimal-payload
Commit: pending
Target: Windows UI
Goal: Re-test strict direct external endpoint image generation after changing custom `gpt-image-*` providers to use minimal payloads by default.

Steps:
1. Pull latest `main` and build or install the newest Windows exe artifact.
2. Install or reinstall the app from the latest exe package, then launch `C:\Program Files\e-platform\e-platform.exe`.
3. In Settings, add a temporary custom image provider pointing directly to `https://openclawroot.com/v1` with model `gpt-image-2` and redacted test credentials.
4. Prepare a temporary text LLM using the same real external base URL and redacted credentials.
5. Open AI Generation, use Natural Language mode, select the temporary image provider, set count to 2, and trigger generation through the real UI.
6. Verify result tiles are visible, images are loaded, at least one tile can be selected, then navigate away and return to AI Generation.

Acceptance Criteria:
- The UI sends `/api/images/generate-from-natural-language` from the real Electron UI path.
- The direct external image provider request succeeds without relying on a local compatibility proxy.
- Current result area shows at least the requested number of loaded images, or one loaded image per successful provider response if the endpoint only returns one image per request.
- Generated image files exist under `%APPDATA%/e-platform/data/images/` with nonzero bytes, valid dimensions, and matching `/api/images/images` rows.
- History `.ht img` contains loaded images matching the current run after navigating away and returning.
- Temporary provider, LLM config, key files, generated test images, and runner files are cleaned up or explicitly retained as sanitized evidence.
- No API keys or raw credentials appear in reports, screenshots, logs, JSON artifacts, or memory summaries.

Artifacts Required:
- `test-reports/runs/2026-06-17-image-generation-gpt-image-minimal-payload-windows/report.md`
- `test-reports/runs/2026-06-17-image-generation-gpt-image-minimal-payload-windows/report.json`
- `test-reports/runs/2026-06-17-image-generation-gpt-image-minimal-payload-windows/script-checks.json`
- Screenshots before generation, after generation, and after return.

Notes:
- This retest must use the latest installed exe package, not a stale install.
- The verdict must use the strict direct external endpoint path, not the later local proxy attempt from the previous run.
- 本轮无新增长期记忆 beyond the facts recorded in `docs/codex-sync/memory-summaries/2026-06-17-image-generation-gpt-image-minimal-payload.md`.
