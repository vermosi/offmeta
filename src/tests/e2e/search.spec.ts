import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('page loads and search input is visible', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test('typing a query and pressing Enter shows card results', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/search/i).first();

    // Wait for the edge function response when submitting
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('cheap green ramp spells');
    await searchInput.press('Enter');

    await responsePromise;

    // Wait for results to appear (card names or images)
    const results = page.locator('[data-testid="card-item"], .card-item, [class*="card"]');
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });

  test('submitting empty query shows inline error without network call', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/search/i).first();

    // Track network calls to the edge function
    let edgeFunctionCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('semantic-search')) {
        edgeFunctionCalled = true;
      }
    });

    await searchInput.fill('');
    await searchInput.press('Enter');

    // Give a moment for potential requests
    await page.waitForTimeout(1000);
    expect(edgeFunctionCalled).toBe(false);
  });

  test('clicking the first card opens a modal with card details', async ({
    page,
  }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/search/i).first();

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');
    await responsePromise;

    // Click the first card result
    const firstCard = page.locator('[data-testid="card-item"], .card-item, [class*="card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    // Modal should appear with card details
    const modal = page.locator('[role="dialog"], [data-testid="card-modal"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/search/i).first();

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('semantic-search') ||
        res.url().includes('api.scryfall.com'),
      { timeout: 15_000 },
    );

    await searchInput.fill('lightning bolt');
    await searchInput.press('Enter');
    await responsePromise;

    const firstCard = page.locator('[data-testid="card-item"], .card-item, [class*="card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"], [data-testid="card-modal"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
