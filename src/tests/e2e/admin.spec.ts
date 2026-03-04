import { expect, test } from '@playwright/test';
import { mockAdminAPIs, signInViaDialog } from './fixtures/mock-helpers';

test.describe('Admin analytics access control', () => {
  test('unauthenticated user is redirected away from admin page', async ({
    page,
  }) => {
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL(/\/$/);
  });

  test('seeded admin user can load analytics view', async ({ page }) => {
    await mockAdminAPIs(page);

    await page.goto('/');
    await signInViaDialog(page, { email: 'admin@example.com' });

    await page.goto('/admin/analytics');

    await expect(
      page.getByRole('heading', { name: /search analytics/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/total searches/i)).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
  });
});
