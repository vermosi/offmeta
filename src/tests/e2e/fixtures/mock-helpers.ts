/**
 * Shared E2E test helpers for API mocking and search operations.
 * Centralizes mock setup to prevent tests from depending on live APIs in CI.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  MOCK_SEMANTIC_SEARCH_RESPONSE,
  MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
  MOCK_SCRYFALL_SEARCH_RESPONSE,
  MOCK_BOLT_SEARCH_RESPONSE,
} from './mock-responses';

const SEARCH_INPUT_SELECTOR = '#search-input';
const SEARCH_RESULT_CARD_SELECTOR = '[data-testid="search-result-card"]';

/**
 * Mock semantic-search and Scryfall API endpoints.
 * MUST be called before page.goto() for route interception to work.
 */
export async function mockSearchAPIs(
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

/**
 * Mock search APIs with lightning bolt fixtures.
 */
export async function mockBoltSearchAPIs(page: Page) {
  await mockSearchAPIs(page, {
    semanticResponse: MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
    scryfallResponse: MOCK_BOLT_SEARCH_RESPONSE,
  });
}

/**
 * Fill the search input, press Enter, and wait for card results to render.
 */
export async function searchForCard(page: Page, query: string) {
  const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });

  await searchInput.fill(query);
  await searchInput.press('Enter');

  await expect(
    page.locator(SEARCH_RESULT_CARD_SELECTOR).first(),
  ).toBeVisible({ timeout: 15_000 });
}

export { SEARCH_INPUT_SELECTOR, SEARCH_RESULT_CARD_SELECTOR };
