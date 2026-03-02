import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SEARCH_INPUT_SELECTOR = '#search-input';

/**
 * Helper: log and return critical/serious a11y violations.
 */
function filterCritical(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  const bad = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (bad.length > 0) {
    const summary = bad
      .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error('A11y violations:\n' + summary);
  }
  return bad;
}

/* ------------------------------------------------------------------ */
/*  Accessibility audits for secondary pages                          */
/* ------------------------------------------------------------------ */

test.describe('Page Accessibility @a11y', () => {
  test('about page has no critical or serious violations', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(filterCritical(results)).toHaveLength(0);
  });

  test('404 page has no critical or serious violations', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(filterCritical(results)).toHaveLength(0);
  });

  test('syntax cheat sheet has no critical or serious violations', async ({
    page,
  }) => {
    await page.goto('/docs/syntax');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(filterCritical(results)).toHaveLength(0);
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

  test('skip-to-content link moves focus to main content', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Press Tab to reveal skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');

    // Skip link should be focusable (it becomes visible on focus via CSS)
    await expect(skipLink).toBeFocused({ timeout: 5_000 });
  });

  test('navigating to /about renders about page content', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    // About page should have an h1
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });
});
