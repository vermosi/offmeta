import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';

test.describe('Accessibility Audits @a11y', () => {
  test('homepage has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (criticalOrSerious.length > 0) {
      const summary = criticalOrSerious
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`,
        )
        .join('\n');
      // eslint-disable-next-line no-console
      console.error('Accessibility violations:\n' + summary);
    }

    expect(blockingViolations).toHaveLength(0);
  });

  test('card modal has no critical or serious violations', async ({ page }) => {
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

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (criticalOrSerious.length > 0) {
      const summary = criticalOrSerious
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`,
        )
        .join('\n');
      // eslint-disable-next-line no-console
      console.error('Modal accessibility violations:\n' + summary);
    }

    expect(blockingViolations).toHaveLength(0);
  });
});
