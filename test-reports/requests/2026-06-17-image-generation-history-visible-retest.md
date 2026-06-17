# Test Request

Date: 2026-06-17
Task ID: 2026-06-17-image-generation-history-visible-retest
Commit: pending
Target: Windows UI

## Goal
- Re-test the Windows failure from `2026-06-17-image-generation-security-visible-windows`: generated images were visible immediately after generation but not visible in history after navigating away and back.
- Confirm the previous security checks still pass.

## UI Steps
1. Pull the latest `main` commit for this retest.
2. In Settings, add temporary custom image provider and text LLM using redacted test credentials.
3. Open AI Generation and trigger natural-language image generation through the real UI path.
4. Confirm generated result tiles are visible, loaded, selectable, then navigate away and return to AI Generation.
5. Confirm the generated images are visible in history after return.

## Script Checks
- Confirm `/api/images/generate-from-natural-language` was triggered by UI and returned success.
- Read `/api/images/images` and match current-run files to UI result image `src` values.
- After returning to AI Generation, match history `.ht img` sources to current-run filenames or API rows.
- Repeat path traversal probes for image compliance/process/convert/delete endpoints and confirm outside files remain unchanged.
- Confirm temporary provider, LLM config, key files, generated test images, and runner files are cleaned up.

## Acceptance Criteria
- Generated result images are visible and loaded immediately after generation.
- At least one generated tile can be selected.
- After navigating away and returning, history contains loaded images matching this run's generated filenames or API rows.
- Path traversal probes remain rejected.
- No API keys or raw credentials appear in reports, screenshots, logs, or JSON artifacts.

## Required Artifacts
- screenshot-before-generation.png
- screenshot-after-generation.png
- screenshot-after-return.png
- report.md
- report.json
- script-checks.json

## Memory
- New long-term facts: none
- If none: 本轮无新增长期记忆

## Windows Test
- Required: yes
- Reason if no:
