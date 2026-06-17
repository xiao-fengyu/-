# Test Request

Task ID: 2026-06-17-image-generation-history-api-path-fix
Commit: 5c83995
Target: Windows UI
Goal: Verify that generated images remain visible in AI Generation history after navigating away and returning.

Steps:
1. Pull the latest `main` after this fix is pushed.
2. Build or install the latest Windows package that includes the commit for this task.
3. Launch the installed Electron app from `C:\Program Files\e-platform\e-platform.exe`.
4. Configure temporary text LLM and image provider as in the previous image generation visible acceptance run.
5. Open AI Generation, use Natural Language mode, set image count to 2, and trigger generation from the real UI.
6. Verify the current result area shows 2 loaded `.ri img` images and at least one tile can be selected.
7. Navigate away from AI Generation, then return to AI Generation.
8. Verify the history area `.ht img` shows loaded images matching the generated files or `/api/images/images` rows.
9. Clean up temporary providers, key files, and generated test images.

Acceptance Criteria:
- Real UI sends `/api/images/generate-from-natural-language`.
- Current result area contains at least 2 loaded generated image tiles.
- Generated files exist on disk with valid PNG metadata, non-zero bytes, and dimensions greater than 0.
- `/api/images/images` returns rows/files matching the generated images.
- After returning to AI Generation, `.ht img` contains loaded images matching the generated files or backend rows.
- Temporary key file and generated test files are cleaned up or cleanup failures are explicitly reported with reproducible evidence.

Artifacts Required:
- `test-reports/runs/2026-06-17-image-generation-history-api-path-fix-windows/report.md`
- `test-reports/runs/2026-06-17-image-generation-history-api-path-fix-windows/report.json`
- Raw visible acceptance JSON or equivalent script output.
- Screenshots before generation, after generation, and after returning to AI Generation.
- Cleanup evidence JSON.

Notes:
- This task targets only the AI Generation history API path fix.
- The publish page image picker still has a known stale `/api/images` direct call and is intentionally deferred.
