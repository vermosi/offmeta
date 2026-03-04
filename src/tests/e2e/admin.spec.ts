import { expect, test } from '@playwright/test';

const analyticsFixture = {
  summary: {
    totalSearches: 42,
    avgConfidence: 0.91,
    avgResponseTime: 321,
    fallbackRate: 4,
    days: 7,
  },
  responsePercentiles: { p50: 240, p95: 720, p99: 1300 },
  sourceBreakdown: { deterministic: 30, ai: 12 },
  popularQueries: [],
  dailyVolume: { '2026-01-01': 10, '2026-01-02': 32 },
  deterministicCoverage: { '2026-01-01': 80, '2026-01-02': 76 },
};

test.describe('Admin analytics access control', () => {
  test('unauthenticated user is redirected away from admin page', async ({
    page,
  }) => {
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL(/\/$/);
  });

  test('seeded admin user can load analytics view', async ({ page }) => {
    const userId = 'admin-user-1';

    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'admin-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'admin-refresh-token',
          user: {
            id: userId,
            email: 'admin@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route('**/rest/v1/profiles**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/user_roles**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ role: 'admin' }]),
      });
    });

    await page.route('**/rest/v1/search_feedback**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/translation_rules**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/functions/v1/admin-analytics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(analyticsFixture),
      });
    });

    await page.goto('/');
    await page
      .getByRole('button', { name: /sign in/i })
      .first()
      .click();

    const authDialog = page.getByRole('dialog').first();
    await authDialog.getByLabel('Email').fill('admin@example.com');
    await authDialog.getByLabel('Password').fill('password123');
    await authDialog.getByRole('button', { name: /^sign in$/i }).click();

    // Wait for auth dialog to close (session established)
    await expect(authDialog).toBeHidden({ timeout: 5_000 });

    await page.goto('/admin/analytics');

    await expect(
      page.getByRole('heading', { name: /search analytics/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/total searches/i)).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
  });
});
