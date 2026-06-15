# Image Generation User-Visible Acceptance Prerequisite Check

## Scope

- Objective: upgrade image generation validation from backend health check to user-visible acceptance.
- Acceptance assets committed to `main`:
  - `87571cc` (`Define user-visible image acceptance oracle`)
  - `0eded8b` (`Handle missing acceptance prerequisites`)
- Installed Windows build source: GitHub Actions run `27523223159`, head SHA `37e629d`.
- Windows executable: `C:\Program Files\e-platform\e-platform.exe`.
- Windows runner: `C:\eplatform-test\windows-image-generation-visible-acceptance.js`.

## Result

The new user-visible acceptance runner was deployed and executed on the Windows test machine.

It did not run the real image generation flow because the required key file was absent:

- `installed Electron executable exists`: pass
- `real LLM/image key file exists`: fail
- missing path: `C:\eplatform-test\real-llm.key`

This is a prerequisite failure, not a product failure and not a user-visible acceptance pass.

## Evidence

- JSON report: `reports/image-generation-visible-acceptance-2026-06-15T06-37-53-393Z.json`
- Report `acceptanceType`: `user-visible`
- Report totals: `pass = 2`, `fail = 1`
- Screenshots: none, because execution stopped before launching the UI flow.

## Interpretation

The testing oracle has been upgraded in code and documentation. The Windows installed build and runner are ready.

The remaining requirement for a full user-visible acceptance run is to provide a real key file at `C:\eplatform-test\real-llm.key` with:

- `base_url=...`
- `key=...`
- at least one text model line
- at least one image model line

Only a later report that passes the visible DOM checks, selection check, history persistence check, file metadata checks, and API row matching can be used to claim image generation works for users.
