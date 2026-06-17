# Image Generation User-Visible Acceptance Summary

- Run type: `user-visible`
- Windows report: `C:\eplatform-test\reports\image-generation-visible-acceptance-2026-06-15T07-16-58-763Z.json`
- Local archive: `test-reports/2026-06-15-image-visible-acceptance-normalized-key-run/`

## Key setup

- Normalized key format used for the run:
  - `base_url=https://openclawroot.com/v1`
  - `key=<redacted>`
  - `text_model=MiniMax-M3-highspeed(文本)`
  - `image_model=gpt-image-2（生图）`

## Outcome

- Pass: `12`
- Fail: `2`
- UI launch, backend health, Settings provider creation, and model selection all passed.
- The result grid still had `0` visible tiles after generation.
- No generated image files or API image rows were observed for this run.

## Evidence

- JSON report: `test-reports/2026-06-15-image-visible-acceptance-normalized-key-run/reports/image-generation-visible-acceptance-2026-06-15T07-16-58-763Z.json`
- Screenshots:
  - `test-reports/2026-06-15-image-visible-acceptance-normalized-key-run/screenshots/visible-settings-before-image-provider-2026-06-15T07-16-58-763Z.png`
  - `test-reports/2026-06-15-image-visible-acceptance-normalized-key-run/screenshots/visible-settings-after-image-provider-2026-06-15T07-16-58-763Z.png`
  - `test-reports/2026-06-15-image-visible-acceptance-normalized-key-run/screenshots/visible-natural-before-generate-2026-06-15T07-16-58-763Z.png`
  - `test-reports/2026-06-15-image-visible-acceptance-normalized-key-run/screenshots/visible-natural-after-generate-2026-06-15T07-16-58-763Z.png`

## Interpretation

- The temporary key was correctly normalized and parsed.
- The failure is now a real runtime failure in the image-generation visible flow, not a key-format issue.
