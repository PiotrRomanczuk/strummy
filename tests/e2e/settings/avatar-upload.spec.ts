import { test, expect } from '../../fixtures';

/**
 * IDA-2 (docs/app-blueprint/01-identity-access.md, Tranche 5) — avatar
 * upload. Only the client-side validation path is verified here: this dev
 * stack has no Supabase Storage service running at all (confirmed —
 * storage.buckets doesn't exist), so a real upload cannot be exercised.
 * Validation happens entirely client-side before any network call, so it's
 * fully testable regardless. See the migration's own note for the
 * infra-gap explanation.
 *
 * The upload control is behind `NEXT_PUBLIC_AVATAR_UPLOAD_ENABLED`
 * (Settings.AvatarUpload.tsx): a stack with no storage-api container sets it
 * to `false` and renders the URL field alone, because an upload button that
 * always fails is worse than no button. Production is such a stack — it runs
 * no `supabase_storage_*` container, so `/storage/v1/bucket` 500s — and these
 * two tests spent the 2026-08-29 prod audit failing on a `input[type="file"]`
 * that the build deliberately never renders. There is nothing to assert when
 * the feature is switched off, so skip on the control's absence rather than
 * report a missing input as a product defect.
 */
test.describe('Settings — avatar upload validation', { tag: ['@teacher'] }, () => {
  test.beforeEach(async ({ loginAs, page }) => {
    await loginAs('teacher');
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // The URL field is rendered unconditionally; the file input only when
    // uploads are enabled. Waiting on the former first means a genuinely
    // broken settings page still fails loudly instead of skipping.
    await expect(page.locator('input[name="avatar_url"]')).toHaveCount(1);

    test.skip(
      (await page.locator('input[type="file"]').count()) === 0,
      'avatar upload disabled on this deployment (NEXT_PUBLIC_AVATAR_UPLOAD_ENABLED=false — no storage-api on the target stack)'
    );
  });

  test('a non-image file is rejected with a visible error, no network call made', async ({
    page,
  }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 not a real pdf but has the right mime type'),
    });

    await expect(page.getByTestId('avatar-upload-error')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('avatar-upload-error')).toContainText(/PNG, JPEG, WebP, or GIF/i);
  });

  test('an oversized image is rejected with a visible error', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 1);

    await fileInput.setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: oversized,
    });

    await expect(page.getByTestId('avatar-upload-error')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('avatar-upload-error')).toContainText(/2 MB/);
  });
});
