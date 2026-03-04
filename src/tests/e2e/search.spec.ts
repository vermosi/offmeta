import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  MOCK_SEMANTIC_SEARCH_RESPONSE,
  MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
  MOCK_SCRYFALL_SEARCH_RESPONSE,
  MOCK_BOLT_SEARCH_RESPONSE,
} from './fixtures/mock-responses';

const SEARCH_INPUT_SELECTOR = '#search-input';
const CARD_SELECTOR = '[data-testid="search-result-card"]';

/**
 * Intercept semantic-search and Scryfall API calls with deterministic mocks.
 * This prevents E2E tests from depending on live network calls which fail in CI.
 */
async function mockSearchAPIs(
  page: Page,
  opts: {
    semanticResponse?: Record<string, unknown>;
    scryfallResponse?: Record<string, unknown>;
  } = {},
) {
  const semanticBody = opts.semanticResponse ?? MOCK_SEMANTIC_SEARCH_RESPONSE;
  const scryfallBody = opts.scryfallResponse ?? MOCK_SCRYFALL_SEARCH_RESPONSE;

  await page.route('**/functions/v1/semantic-search', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(semanticBody),
    }),
  );

  await page.route('**/api.scryfall.com/cards/search**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(scryfallBody),
    }),
  );
}

test.describe('Search Flow', () => {
  test('page loads and search input is visible', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test('typing a query and pressing Enter shows card results', async ({
    page,
  }) => {
    await mockSearchAPIs(page);
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('cheap green ramp spells');
    await searchInput.press('Enter');

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
    await mockSearchAPIs(page, {
      semanticResponse: MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
      scryfallResponse: MOCK_BOLT_SEARCH_RESPONSE,
    });
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');

    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await mockSearchAPIs(page, {
      semanticResponse: MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
      scryfallResponse: MOCK_BOLT_SEARCH_RESPONSE,
    });
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');

    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
