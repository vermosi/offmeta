import { expect, test } from '@playwright/test';
import { mockSearchAPIs, searchForCard } from './fixtures/mock-helpers';

test.describe('Report issue dialog', () => {
  test('validation errors and successful submit confirmation state', async ({
    page,
  }) => {
    // Mock search APIs so search results render in CI
    await mockSearchAPIs(page);

    await page.route('**/rest/v1/search_feedback**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('**/rest/v1/analytics_events**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.route('**/functions/v1/process-feedback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');

    await searchForCard(page, 'counterspell');

    const reportTrigger = page
      .getByRole('button', { name: /report issue/i })
      .first();
    await expect(reportTrigger).toBeVisible({ timeout: 15_000 });
    await reportTrigger.click();

    const reportDialog = page.getByRole('dialog').first();
    const issueField = reportDialog.getByLabel(/what went wrong\?/i);

    await issueField.fill('bad');
    await reportDialog.getByRole('button', { name: /submit report/i }).click();
    await expect(
      reportDialog.getByText(/at least 10 characters/i),
    ).toBeVisible();

    await issueField.fill(
      'Search translation dropped key combo card from results.',
    );
    await reportDialog.getByRole('button', { name: /submit report/i }).click();

    await expect(reportDialog).toBeHidden();
    await expect(page.getByText(/issue reported/i)).toBeVisible();
  });
});
