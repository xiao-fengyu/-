# Test Request

**Task ID:** publish-image-picker-api-fix-2026-06-20

**Commit:** (to be pushed after approval)

**Target:** Windows UI (Electron app with real images)

**Goal:** Verify that the Publish page image picker correctly loads available images and can select them for product publishing

**Steps:**

1. Build and install latest e-platform exe from this commit
2. Start the application
3. Navigate to the Publish page
4. Generate 2-3 sample images in AI Generation tab
5. Return to Publish page
6. Click "从图片库选择" (Select from image library) button
7. Verify that:
   - Modal opens and displays the generated images
   - All generated images are visible in the picker
   - Each image shows the correct filename
   - Images can be selected/deselected
   - Selection persists when closing and reopening the modal
8. Select 2-3 images
9. Verify selected images appear in the summary step
10. Use script to verify `/api/images/images` returns the expected database records

**Acceptance Criteria:**

- ✓ Image picker modal displays all generated images from database
- ✓ Image metadata matches database records (id, local_path, url, type, prompt, status, created_at)
- ✓ Multiple images can be selected
- ✓ Selected images persist through step navigation
- ✓ API response matches expected format: `{ success: true, data: [ImageRecord[], ...] }`
- ✓ No console errors or API failures

**Artifacts Required:**

- Screenshot of Publish page with image picker open showing generated images
- Screenshot of selected images in summary step
- Script output verifying `/api/images/images` response format and content
- Browser console log (no errors)
- Application log output

**Notes:**

This fixes the API path from `/api/images` (filesystem listing) to `/api/images/images` (database records).
The change ensures the Publish page can properly load and display generated images for selection.
