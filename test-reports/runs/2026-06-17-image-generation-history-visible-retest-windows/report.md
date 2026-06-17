# Image Generation History Visible Retest Windows

- commit: 4e78e4c
- status: fail
- target: Windows UI, strict direct external endpoint
- installed exe: C:\Program Files\e-platform\e-platform.exe
- endpoint: https://openclawroot.com/v1

## Summary
- The Electron UI launched and backend health passed.
- The UI added a temporary custom image provider using the real external endpoint and redacted key.
- The UI triggered /api/images/generate-from-natural-language.
- The direct external provider run produced no visible result tile, no generated file, no matching /api/images/images row, and no history .ht img after return.
- Diagnostic comparison: minimal external image payload succeeded, but app-equivalent payload with n/width/height timed out after 120s.

## Actual UI Steps
- Settings: added temporary custom image provider with endpoint https://openclawroot.com/v1 and redacted real API key
- Settings/API: prepared temporary text LLM using MiniMax-M3-highspeed and same redacted external base URL
- AI Generation: opened Natural Language mode through Electron UI
- AI Generation: selected temporary image provider, selected count 2, and triggered Generate Image through the UI
- After generation: inspected current result area, API rows, filesystem images, navigated away and returned to AI Generation

## Script Checks
- PASS: installed Electron executable exists
- PASS: real LLM/image key file exists
- PASS: key file loaded without logging secret
- PASS: installed Electron UI launched
- PASS: backend health ready
- PASS: UI added custom image provider in Settings
- PASS: API prepared custom text LLM for UI flow
- PASS: script captured prompt-from-text output
- PASS: script compared app and minimal image provider payloads
- PASS: image provider selected in UI before generation
- PASS: UI sent image generation API request
- PASS: UI generation loading settled
- PASS: no visible UI error after generation
- FAIL: current result grid has requested visible loaded images
- FAIL: user can select a generated result tile
- FAIL: script verified generated image files
- PASS: script verified image dimensions and bytes
- FAIL: script verified generated images visible via API
- FAIL: visible UI images match generated files or API rows
- FAIL: generated images remain visible after returning to AI Generation
- PASS: cleanup custom text LLM via API
- PASS: cleanup custom image provider via API
- PASS: cleanup key file from Windows test directory

## Counts
- pass: 17
- fail: 6
- blocked: 0

## Evidence
- screenshot-before-generation.png
- screenshot-after-generation.png
- screenshot-after-return.png
- report.json
- script-checks.json
- cleanup-checks.json

## Failure Evidence
- Direct external provider UI generation did not produce current result tiles: .ri img count was 0.
- No generated image files were produced for the direct-endpoint UI run.
- /api/images/images contained no current-run matching rows.
- After navigating away and returning to AI Generation, .ht img contained no current-run visible image.
- Diagnostic provider comparison showed minimal external payload succeeded but app-equivalent payload with n/width/height timed out after 120s.

## Cleanup
- strict run temporary provider deleted: True
- strict run temporary LLM deleted: True
- strict run temporary key copy deleted: True
- strict run generated test images: none created in strict direct-endpoint run
- later proxy attempt provider cleanup records: 1
- later proxy attempt LLM cleanup records: 1
- later proxy attempt image cleanup records: 1
- runner.js retained as evidence in this report directory.

## Secret Handling
- Raw API key was read from D:\e-platform\key.txt but is not committed intentionally.
- Reports redact providerConfig.apiKey as ***.
- An accidental Playwright call-log Authorization value in the first JSON artifact was redacted before report finalization.
- Select-String sk-/Bearer sk audit was run after redaction and returned no matches for final report artifacts.

## Note
- The later local compatibility proxy attempt is excluded from this verdict because the required strict path is direct UI provider endpoint to the real external URL.
