# Memory Summary

Task: 2026-06-17-image-generation-history-api-path-fix
Date: 2026-06-17

## Long-term Memory

- Added memory entity `project.e-platform.test.2026-06-17-image-generation-gpt-image-minimal-payload-windows`.
- Recorded that the Windows report verdict was `partial-fail`: real Electron UI generation with `gpt-image-2` succeeded, but returning to AI Generation left history visibility at `matchedHistoryImages=0`.
- Recorded that the likely issue was AI Generation history/state restoration rather than the image generation API or `gpt-image` payload.

## Fix Context

- Root cause found locally: `fetchImages()` and `deleteImage()` called stale `/api/images` paths while the mounted server image-management endpoints live under `/api/images/images`.
- Current fix updates the shared client helpers in `src/services/api.ts` so AI Generation history refresh and delete use the real backend endpoints.

## Deferred Follow-up

- `src/pages/Publish/index.tsx` still calls `/api/images` directly for the publish image picker. This is intentionally deferred for a separate fix because its expected data shape differs from the file-list endpoint used by AI Generation history.
