import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';

test.describe('Accessibility Audits @a11y', () => {
  test('homepage has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: 'homepage',
    });

    expect(blockingViolations).toHaveLength(0);
  });

  test('card modal has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const searchInput = page.locator('#search-input').first();

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');
    await responsePromise;

    // Open the first card modal
    const firstCard = page.getByTestId('search-result-card').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal.first()).toBeVisible({ timeout: 5_000 });

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      scope: '[role="dialog"]',
      context: 'card-modal',
    });

    expect(blockingViolations).toHaveLength(0);
  });
});
