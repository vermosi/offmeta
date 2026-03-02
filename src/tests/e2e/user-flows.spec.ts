import { test, expect } from '@playwright/test';

const SEARCH_INPUT_SELECTOR = '#search-input';
const CARD_SELECTOR =
  '[data-testid="card-item"], .card-item, [class*="card"]';

/* ------------------------------------------------------------------ */
/*  Example chip & search bar interactions                            */
/* ------------------------------------------------------------------ */

test.describe('User Flows', () => {
  test('clicking an example chip fills the input and triggers search', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // Example chips live in a group labelled "Try searching for"
    const chipGroup = page.locator('[role="group"]');
    const firstChip = chipGroup.locator('button').first();
    await expect(firstChip).toBeVisible({ timeout: 5_000 });

    const chipText = await firstChip.textContent();

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await firstChip.click();
    await responsePromise;

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
    const clearButton = page.locator('button[aria-label]').filter({
      has: page.locator('svg.lucide-x'),
    });
    await expect(clearButton).toBeVisible({ timeout: 3_000 });
    await clearButton.click();

    await expect(searchInput).toHaveValue('');
  });

  test('search button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // The search submit button should be present
    const searchButton = page.locator(
      'button[aria-label*="search" i], button:has(svg.lucide-search)',
    ).first();
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeEnabled();
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
    const themeToggle = page.locator('button[aria-label*="theme" i]').first();

    // Skip if not visible (may be hidden in mobile)
    if (await themeToggle.isVisible()) {
      const htmlBefore = await page.locator('html').getAttribute('class');
      await themeToggle.click();
      await page.waitForTimeout(500);
      const htmlAfter = await page.locator('html').getAttribute('class');

      // The class should have changed (dark ↔ light)
      expect(htmlAfter).not.toBe(htmlBefore);
    }
  });

  test('search results update the URL with query params', async ({ page }) => {
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

    // Wait for results to render
    const results = page.locator(CARD_SELECTOR);
    await expect(results.first()).toBeVisible({ timeout: 15_000 });

    // URL should contain query information (exact param depends on implementation)
    const url = page.url();
    expect(
      url.includes('q=') || url.includes('query=') || url.includes('lightning'),
    ).toBeTruthy();
  });
});
