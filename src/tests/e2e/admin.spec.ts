import { expect, test } from '@playwright/test';
import { mockAuthAPIs, signInViaDialog } from './fixtures/mock-helpers';

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
    await mockAuthAPIs(page, {
      userId: 'admin-user-1',
      email: 'admin@example.com',
      accessToken: 'admin-access-token',
    });

    await page.route('**/rest/v1/user_roles**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ role: 'admin' }]),
      }),
    );

    await page.route('**/rest/v1/search_feedback**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    await page.route('**/rest/v1/translation_rules**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    await page.route('**/functions/v1/admin-analytics**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(analyticsFixture),
      }),
    );

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
