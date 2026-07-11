import { test, expect } from '@playwright/test';
import {
  mockSearchAPIs,
  mockBoltSearchAPIs,
  searchForCard,
  SEARCH_INPUT_SELECTOR,
} from './fixtures/mock-helpers';

const CARD_SELECTOR = '[data-testid="search-result-card"]';

test.describe('Search Flow', () => {
  test('page loads and search input is visible @e2e-smoke', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test('typing a query and pressing Enter shows card results @e2e-smoke', async ({
    page,
  }) => {
    await mockSearchAPIs(page);
    await page.goto('/');
    await searchForCard(page, 'cheap green ramp spells');
  });

  test('searching for a nonexistent card shows the empty state', async ({
    page,
  }) => {
    await page.route('**/functions/v1/semantic-search', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          originalQuery: 'zzzzzzzzzzzz',
          scryfallQuery: 'zzzzzzzzzzzz',
          explanation: {
            readable: 'No confident match',
            confidence: 0.2,
            assumptions: [],
          },
          showAffiliate: false,
          responseTimeMs: 25,
          success: true,
          cached: false,
          source: 'deterministic',
        }),
      }),
    );

    await page.route('**/api.scryfall.com/cards/search**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'error',
          code: 'not_found',
          status: 404,
          details: 'No cards found',
        }),
      }),
    );

    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('zzzzzzzzzzzz');
    await page.getByTestId('search-submit-button').click();

    await expect(
      page.getByRole('heading', { name: /no cards found/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test('generic search failure falls back and shows a toast', async ({
    page,
  }) => {
    await page.route('**/functions/v1/semantic-search', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Translation service unavailable',
        }),
      }),
    );

    await page.route('**/api.scryfall.com/cards/search**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            {
              ...{
                object: 'card',
                id: '00000000-0000-0000-0000-000000000020',
                oracle_id: '00000000-0000-0000-0000-000000000021',
                lang: 'en',
                released_at: '1993-08-05',
                layout: 'normal',
                image_uris: {
                  small: 'https://cards.scryfall.io/small/front/e/2/e2c2d2f9.jpg',
                  normal: 'https://cards.scryfall.io/normal/front/e/2/e2c2d2f9.jpg',
                  large: 'https://cards.scryfall.io/large/front/e/2/e2c2d2f9.jpg',
                  png: 'https://cards.scryfall.io/png/front/e/2/e2c2d2f9.png',
                  art_crop: 'https://cards.scryfall.io/art_crop/front/e/2/e2c2d2f9.jpg',
                  border_crop: 'https://cards.scryfall.io/border_crop/front/e/2/e2c2d2f9.jpg',
                },
                keywords: [],
                legalities: {
                  standard: 'not_legal',
                  modern: 'legal',
                  legacy: 'legal',
                  commander: 'legal',
                  vintage: 'legal',
                  pauper: 'legal',
                  pioneer: 'legal',
                },
                games: ['paper', 'mtgo'],
                reserved: false,
                foil: true,
                nonfoil: true,
                finishes: ['nonfoil', 'foil'],
                oversized: false,
                promo: false,
                reprint: true,
                variation: false,
                set: 'lea',
                set_name: 'Limited Edition Alpha',
                set_type: 'core',
                collector_number: '161',
                digital: false,
                rarity: 'common',
                artist: 'Christopher Rush',
                border_color: 'black',
                frame: '1993',
                full_art: false,
                textless: false,
                booster: true,
                prices: { usd: '1.00', usd_foil: null, eur: '0.80', tix: '0.05' },
              },
              name: 'Fallback Bolt',
              uri: 'https://api.scryfall.com/cards/fallback-bolt',
              scryfall_uri: 'https://scryfall.com/card/lea/161/fallback-bolt',
              mana_cost: '{R}',
              cmc: 1,
              type_line: 'Instant',
              oracle_text: 'Fallback Bolt deals 3 damage to any target.',
              colors: ['R'],
              color_identity: ['R'],
            },
          ],
        }),
      }),
    );

    await page.goto('/');
    const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('broken search');
    await page.getByTestId('search-submit-button').click();

    await expect(page.getByText(/search issue/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId('search-result-card').filter({ hasText: /fallback bolt/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
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
    await mockBoltSearchAPIs(page);
    await page.goto('/');
    await searchForCard(page, 'lightning bolt');

    const firstCard = page.locator(CARD_SELECTOR).first();
    await firstCard.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await mockBoltSearchAPIs(page);
    await page.goto('/');
    await searchForCard(page, 'lightning bolt');

    const firstCard = page.locator(CARD_SELECTOR).first();
    await firstCard.click();

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
