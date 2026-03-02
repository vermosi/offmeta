import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';

const SEARCH_INPUT_SELECTOR = '#search-input';
const SEARCH_RESULT_CARD_SELECTOR = '[data-testid="search-result-card"]';

const MOCK_SCRYFALL_SEARCH_RESPONSE = {
  object: 'list',
  total_cards: 1,
  has_more: false,
  data: [
    {
      object: 'card',
      id: '00000000-0000-0000-0000-000000000001',
      oracle_id: '00000000-0000-0000-0000-000000000002',
      name: 'Lightning Bolt',
      lang: 'en',
      released_at: '1993-08-05',
      uri: 'https://api.scryfall.com/cards/00000000-0000-0000-0000-000000000001',
      scryfall_uri: 'https://scryfall.com/card/lea/161/lightning-bolt',
      layout: 'normal',
      image_uris: {
        small:
          'https://cards.scryfall.io/small/front/e/2/e2c2d2f9-0f3f-4f84-97fb-ccfbb2cb5bd8.jpg',
        normal:
          'https://cards.scryfall.io/normal/front/e/2/e2c2d2f9-0f3f-4f84-97fb-ccfbb2cb5bd8.jpg',
        large:
          'https://cards.scryfall.io/large/front/e/2/e2c2d2f9-0f3f-4f84-97fb-ccfbb2cb5bd8.jpg',
      },
      mana_cost: '{R}',
      cmc: 1,
      type_line: 'Instant',
      oracle_text: 'Lightning Bolt deals 3 damage to any target.',
      colors: ['R'],
      color_identity: ['R'],
      keywords: [],
      legalities: {
        standard: 'not_legal',
        future: 'not_legal',
        historic: 'legal',
        timeless: 'legal',
        gladiator: 'legal',
        pioneer: 'legal',
        explorer: 'legal',
        modern: 'legal',
        legacy: 'legal',
        pauper: 'legal',
        vintage: 'legal',
        penny: 'legal',
        commander: 'legal',
        oathbreaker: 'legal',
        brawl: 'not_legal',
        standardbrawl: 'not_legal',
        alchemy: 'not_legal',
        paupercommander: 'legal',
        duel: 'legal',
        oldschool: 'not_legal',
        premodern: 'legal',
        predh: 'legal',
      },
      games: ['paper', 'mtgo', 'arena'],
      reserved: false,
      foil: true,
      nonfoil: true,
      finishes: ['nonfoil', 'foil'],
      oversized: false,
      promo: false,
      reprint: true,
      variation: false,
      set_id: '00000000-0000-0000-0000-000000000003',
      set: 'lea',
      set_name: 'Limited Edition Alpha',
      set_type: 'core',
      set_uri: 'https://api.scryfall.com/sets/lea',
      set_search_uri:
        'https://api.scryfall.com/cards/search?order=set&q=e%3Alea&unique=prints',
      scryfall_set_uri: 'https://scryfall.com/sets/lea',
      rulings_uri:
        'https://api.scryfall.com/cards/00000000-0000-0000-0000-000000000001/rulings',
      prints_search_uri:
        'https://api.scryfall.com/cards/search?order=released&q=oracleid%3A00000000-0000-0000-0000-000000000002&unique=prints',
      collector_number: '161',
      digital: false,
      rarity: 'common',
      card_back_id: '00000000-0000-0000-0000-000000000004',
      artist: 'Christopher Rush',
      border_color: 'black',
      frame: '1993',
      full_art: false,
      textless: false,
      booster: true,
      story_spotlight: false,
      edhrec_rank: 1,
      prices: {
        usd: '1.00',
        usd_foil: '10.00',
        usd_etched: null,
        eur: '0.80',
        eur_foil: '8.00',
        tix: '0.10',
      },
    },
  ],
};

async function searchForCard(
  page: Parameters<typeof test>[0]['page'],
  query: string,
) {
  const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });

  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('semantic-search') ||
      res.url().includes('api.scryfall.com'),
    { timeout: 15_000 },
  );

  await searchInput.fill(query);
  await searchInput.press('Enter');
  await responsePromise;
}

test.describe('Accessibility Audits @a11y', () => {
  test('homepage has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: 'homepage',
    });

    expect(blockingViolations).toHaveLength(0);
  });

  test('card modal has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.route('**/api.scryfall.com/cards/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SCRYFALL_SEARCH_RESPONSE),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await searchForCard(page, 'lightning bolt');

    // Open the first card modal
    const firstCard = page.locator(SEARCH_RESULT_CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal.first()).toBeVisible({ timeout: 5_000 });

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      scope: '[role="dialog"]',
      context: 'card-modal',
    });

    expect(blockingViolations).toHaveLength(0);
  });

  test('deckbuilder primary view has no critical or serious violations', async ({
    page,
  }, testInfo) => {
    await page.goto('/deckbuilder');
    await page.waitForLoadState('networkidle');

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      context: 'deckbuilder-primary',
    });

    expect(blockingViolations).toHaveLength(0);
  });
});
