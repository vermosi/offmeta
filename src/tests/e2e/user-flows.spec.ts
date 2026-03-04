import { test, expect } from '@playwright/test';
import {
  mockBoltSearchAPIs,
  mockSearchAPIs,
  searchForCard,
} from './fixtures/mock-helpers';

const SEARCH_INPUT_SELECTOR = '#search-input';
const CARD_SELECTOR = '[data-testid="search-result-card"]';

/* ------------------------------------------------------------------ */
/*  Example chip & search bar interactions                            */
/* ------------------------------------------------------------------ */

test.describe('User Flows', () => {
  test('clicking an example chip fills the input and triggers search', async ({
    page,
  }) => {
    await mockSearchAPIs(page);
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // Example chips live in a group labelled "Try searching for"
    const chipGroup = page.locator('[role="group"]');
    const firstChip = chipGroup.locator('button').first();
    await expect(firstChip).toBeVisible({ timeout: 5_000 });

    const chipText = await firstChip.textContent();

    await firstChip.click();

    // Input should now contain the chip text
    await expect(searchInput).toHaveValue(chipText?.trim() ?? '', {
      timeout: 5_000,
    });

    // Results should appear
    const results = page.locator(CARD_SELECTOR);
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });

  test('clear button resets the search input', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');

    // The clear (X) button appears when there is text
    const clearButton = page.getByTestId('search-clear-button');
    await expect(clearButton).toBeVisible({ timeout: 3_000 });
    await clearButton.click();

    await expect(searchInput).toHaveValue('');
  });

  test('search button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // The search submit button should be present and visible
    const searchButton = page.getByTestId('search-submit-button');
    await expect(searchButton).toBeVisible();

    // Button is disabled when input is empty; type something to enable it
    await searchInput.fill('test');
    await expect(searchButton).toBeEnabled({ timeout: 3_000 });
  });

  test('search help trigger opens the help modal', async ({ page }) => {
    await page.goto('/');

    const helpTrigger = page.getByTestId('search-help-trigger').first();
    await expect(helpTrigger).toBeVisible({ timeout: 15_000 });
    await helpTrigger.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
  });

  test('keyboard shortcut / focuses the search input', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // Click somewhere else first to blur
    await page.locator('body').click();

    // Press / to focus search
    await page.keyboard.press('/');
    await expect(searchInput).toBeFocused({ timeout: 3_000 });
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find the theme toggle button
    const themeToggle = page.getByTestId('theme-toggle');

    // Skip if not visible (may be hidden in mobile)
    if (await themeToggle.isVisible()) {
      const htmlBefore = await page.locator('html').getAttribute('class');
      await themeToggle.click();
      await expect
        .poll(async () => page.locator('html').getAttribute('class'))
        .not.toBe(htmlBefore);
    }
  });

  test('search results update the URL with query params', async ({ page }) => {
    await mockBoltSearchAPIs(page);
    await page.goto('/');

    await searchForCard(page, 'lightning bolt');

    // URL should contain query information (exact param depends on implementation)
    const url = page.url();
    expect(
      url.includes('q=') || url.includes('query=') || url.includes('lightning'),
    ).toBeTruthy();
  });
});
