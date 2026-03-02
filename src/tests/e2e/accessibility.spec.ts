import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';

const SEARCH_INPUT_SELECTOR = '#search-input';
const SEARCH_RESULT_CARD_SELECTOR = '[data-testid="search-result-card"]';

async function searchForCard(
  page: Parameters<typeof test>[0]['page'],
  query: string,
) {
  const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });

  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('semantic-search') ||
      res.url().includes('api.scryfall.com'),
    { timeout: 15_000 },
  );

  await searchInput.fill(query);
  await searchInput.press('Enter');
  await responsePromise;
}

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
    await searchForCard(page, 'lightning bolt');

    // Open the first card modal
    const firstCard = page.locator(SEARCH_RESULT_CARD_SELECTOR).first();
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

  test('deckbuilder primary view has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/deckbuilder');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: 'deckbuilder-primary',
    });

    expect(blockingViolations).toHaveLength(0);
  });
});
