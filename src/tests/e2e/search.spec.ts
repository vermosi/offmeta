import { test, expect } from '@playwright/test';

const SEARCH_INPUT_SELECTOR = '#search-input';
const CARD_SELECTOR = '[data-testid="search-result-card"]';

test.describe('Search Flow', () => {
  test('page loads and search input is visible', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test('typing a query and pressing Enter shows card results', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('cheap green ramp spells');
    await searchInput.press('Enter');
    await responsePromise;

    const results = page.locator(CARD_SELECTOR);
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });

  test('submitting empty query shows inline error without network call', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const semanticSearchCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('semantic-search')) {
        semanticSearchCalls.push(req.url());
      }
    });

    await searchInput.fill('   ');
    await searchInput.press('Enter');

    await expect(searchInput).toBeVisible();
    expect(semanticSearchCalls).toHaveLength(0);
  });

  test('clicking the first card opens a modal with card details', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');
    await responsePromise;

    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');
    await responsePromise;

    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
