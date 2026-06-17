# Memory Summary

Date: 2026-06-17
Task ID: 2026-06-17-image-generation-security-visible
Commit: pending

## New Long-Term Facts
- 本轮无新增长期记忆。

## Decisions
- Image generation provider outputs are persisted locally before being returned to the UI so visible image URLs use `/images/<filename>`.
- Image processing and delete endpoints should only operate on files inside the app image data directory.
- Remote provider image downloads should reject local/internal URLs, DNS results that resolve to private addresses, redirects, oversized payloads, and non-image content types.

## Testing Notes
- Local `git diff --check` passed.
- Local `npx tsc --noEmit` passed.
- Local `npm run build` passed with the existing Vite chunk-size warning.
- Windows real UI plus script verification is requested in `test-reports/requests/2026-06-17-image-generation-security-visible.md`.

## Do Not Sync
- API keys
- tokens
- passwords
- raw memory.json
- unredacted logs
- private user data
