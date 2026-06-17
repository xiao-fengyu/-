# Memory Summary

Date: 2026-06-17
Task ID: 2026-06-17-image-generation-history-visible-retest
Commit: pending

## New Long-Term Facts
- 本轮无新增长期记忆。

## Decisions
- Windows test `2026-06-17-image-generation-security-visible-windows` failed only on history visibility after return; immediate UI visibility, local file/API matching, path traversal rejection, and cleanup passed.
- The root cause is the AI Generation history grid still rendering `file://<path>` while current generated results use `/images/<filename>`.
- The history grid now derives image URLs from `img.url`, then `/images/<filename>`, then `file://<path>` as a compatibility fallback.

## Testing Notes
- Local `git diff --check` passed.
- Local `npx tsc --noEmit` passed.
- Local `npm run build` passed with the existing Vite chunk-size warning.
- Windows retest is requested in `test-reports/requests/2026-06-17-image-generation-history-visible-retest.md`.

## Do Not Sync
- API keys
- tokens
- passwords
- raw memory.json
- unredacted logs
- private user data
