import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openFirstPublicDeck(page: Page) {
  await page.goto('/decks');
  await page.waitForLoadState('domcontentloaded');

  const deckLinks = page.locator('a[href^="/deck/"]');
  const deckCount = await deckLinks.count();
  test.skip(deckCount === 0, 'No public decks available in this environment');

  await deckLinks.first().click();
  await page.waitForURL(/\/deck\//);
  await page.waitForLoadState('networkidle');

  const deckNotFound = page.getByText('Deck not found');
  test.skip(await deckNotFound.isVisible(), 'Public deck became unavailable');
}

test.describe('Deck page hydration', () => {
  test('uses Scryfall collection hydration when opening a deck from /decks', async ({
    page,
  }) => {
    const scryfallSearchRequests: string[] = [];
    const scryfallCollectionRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (!url.includes('api.scryfall.com')) return;
      if (url.includes('/cards/search')) scryfallSearchRequests.push(url);
      if (url.includes('/cards/collection'))
        scryfallCollectionRequests.push(url);
    });

    await openFirstPublicDeck(page);

    const cardRows = page.locator('li:has-text("1")').first();
    await expect(cardRows).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(() => scryfallCollectionRequests.length, {
        timeout: 15_000,
        message: 'Expected batched Scryfall collection hydration request',
      })
      .toBeGreaterThan(0);

    expect(scryfallSearchRequests).toHaveLength(0);
  });

  test('public deck view has no critical or serious accessibility violations @a11y', async ({
    page,
  }) => {
    await openFirstPublicDeck(page);

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
      console.error('Deck view accessibility violations:\n' + summary);
    }

    expect(criticalOrSerious).toHaveLength(0);
  });
});
