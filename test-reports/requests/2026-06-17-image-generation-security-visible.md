# Test Request

Date: 2026-06-17
Task ID: 2026-06-17-image-generation-security-visible
Commit: pending
Target: Windows UI

## Goal
- Verify image generation remains user-visible after generated provider URLs are persisted locally and returned as `/images/<filename>`.
- Verify image processing and delete endpoints only operate on files inside the app image data directory.

## UI Steps
1. In Settings, add a temporary custom image provider and required text LLM using redacted test credentials.
2. Open AI Generation and trigger natural-language image generation from the real UI path.
3. Confirm generated result tiles are visible, loaded, selectable, and still visible after navigating away and back.

## Script Checks
- Read generated image rows from `/api/images/images` and confirm the UI-visible image `src` values match local generated records.
- Verify generated files exist under `%APPDATA%/e-platform/data/images` with non-zero bytes, dimensions, and supported image format.
- Attempt path traversal inputs against image compliance/process/convert/delete endpoints and confirm they are rejected without touching files outside the image directory.
- Confirm temporary provider, LLM config, key files, generated test images, and runner files are cleaned up.

## Acceptance Criteria
- UI generation is triggered through the real Electron UI path, not direct backend generation calls.
- At least the requested number of generated images are visible in current results with loaded `img` elements and non-zero natural/rendered dimensions.
- At least one generated tile can be selected.
- Generated images remain visible in history after returning to AI Generation, or current results remain visible by design.
- API rows and filesystem files match the current run's UI-visible images.
- Traversal and out-of-directory path attempts are rejected.
- No API keys or raw credentials appear in reports, screenshots, logs, or JSON artifacts.

## Required Artifacts
- screenshot-before-generation.png
- screenshot-after-generation.png
- screenshot-after-return.png
- report.md
- report.json

## Memory
- New long-term facts: none
- If none: 本轮无新增长期记忆

## Windows Test
- Required: yes
- Reason if no:
