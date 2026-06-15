# Image Generation User-Visible Acceptance

This document defines the minimum acceptance oracle for e-platform image generation tests.
It exists because a backend health check can pass while the user-facing UI is still unusable.

## Why This Exists

The previous real-image baseline proved that:

- Electron launched.
- The backend was healthy.
- The image API generated PNG files.
- Files were written to `%APPDATA%/e-platform/data/images`.
- `/api/images/images` returned generated rows.

That is not enough to claim the feature works for users. A passing image-generation report must also prove that the current UI session shows the images and lets the user continue the workflow.

## Minimum Passing Oracle

An image-generation acceptance test must fail unless all of these are true:

1. The operation is triggered from the real UI path the user follows.
2. The selected image provider is visible in the UI before generation.
3. No visible error message appears during or after generation.
4. The current result grid contains at least the requested number of `.ri` result tiles.
5. Each result tile contains an `img` element that is visible, complete, and has non-zero rendered and natural dimensions.
6. Each visible `img` resolves to a generated file or generated URL returned by the backend/API for this run.
7. At least one result tile can be clicked and enters selected state (`.ri.sel`).
8. After navigating away from and back to AI Generation, generated images are visible in history (`.ht img`) or the current result remains visible by design.
9. Script-side verification confirms generated files exist, have valid image headers, non-zero dimensions, and meaningful byte size.
10. API verification confirms generated image rows are visible through `/api/images/images`.

If only items 1, 9, and 10 pass, the report is a pipeline/backend health check, not user-visible acceptance.

## Required Evidence

A valid report must include:

- Screenshot before generation.
- Screenshot after generation.
- Screenshot after selecting a generated result tile.
- Screenshot after navigating away and back.
- DOM evidence for visible result images: tile count, visible image count, rendered size, natural size, and `src` kind.
- Script evidence for generated files: path, bytes, format, width, and height.
- API evidence: row count and matched generated paths.
- A clear verdict field: `acceptanceType` must be `user-visible`, not `backend-health`.

## Failure Examples

These must fail user-visible acceptance even if files were generated:

- The report only checks `successTextCount > 0 || resultTiles > 0`.
- Result tiles exist but contain blank, broken, or zero-size images.
- Generated files exist, but the current UI session does not show them.
- Images appear only in API/file system and not in the result grid or history.
- An error toast appears after generation but files happen to be written.
- The user cannot select a generated image tile.

## Relationship To Existing Checks

Keep backend/file/API checks. They are still necessary. They are not sufficient.

Use this split in reports:

- `backend-health`: proves provider call, file write, metadata, and API listing.
- `user-visible`: proves the generated assets are visible and usable in the UI.

Only `user-visible` can be used to answer whether image generation works for the user.
