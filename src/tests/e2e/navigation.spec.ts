import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';

const SEARCH_INPUT_SELECTOR = '#search-input';

/* ------------------------------------------------------------------ */
/*  Accessibility audits for secondary pages                          */
/* ------------------------------------------------------------------ */

test.describe('Page Accessibility @a11y', () => {
  test('about page has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: 'about-page',
    });

    expect(blockingViolations).toHaveLength(0);
  });

  test('404 page has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: '404-page',
    });

    expect(blockingViolations).toHaveLength(0);
  });

  test('syntax cheat sheet has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/docs/syntax');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: 'syntax-cheatsheet',
    });

    expect(blockingViolations).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Navigation & keyboard interaction tests                           */
/* ------------------------------------------------------------------ */

test.describe('Navigation Flow', () => {
  test('header navigation links are accessible and functional', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Header should have a nav landmark or be recognisable
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10_000 });

    // Logo link should navigate home
    const logoLink = header.locator('a[href="/"]').first();
    await expect(logoLink).toBeVisible();
  });

  test('footer contains expected explore links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible({ timeout: 10_000 });

    // Check a subset of important links exist
    await expect(footer.locator('a[href="/about"]')).toBeVisible();
    await expect(footer.locator('a[href="/archetypes"]')).toBeVisible();
  });

  test('404 page renders and has return home link', async ({ page }) => {
    await page.goto('/nonexistent-route-12345');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible();

    await homeLink.click();
    await page.waitForLoadState('domcontentloaded');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test('skip-to-content link exists and is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Skip link should exist in the DOM even if visually hidden
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached({ timeout: 5_000 });
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('navigating to /about renders about page content', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    // About page should have an h1
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });
});
