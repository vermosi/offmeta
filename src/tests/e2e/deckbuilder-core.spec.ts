import { expect, test } from '@playwright/test';

type DeckRecord = {
  id: string;
  user_id: string;
  name: string;
  format: string;
  commander_name: string | null;
  companion_name: string | null;
  color_identity: string[];
  description: string | null;
  is_public: boolean;
  card_count: number;
  created_at: string;
  updated_at: string;
};

test.describe('Deckbuilder core flows', () => {
  test('create/import/edit/save with deterministic fixtures', async ({
    page,
  }) => {
    const now = new Date().toISOString();
    const userId = 'user-1';
    const decks: DeckRecord[] = [];

    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token',
          user: { id: userId, email: 'deck-user@example.com' },
        }),
      });
    });

    await page.route('**/rest/v1/profiles**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/decks**', async (route) => {
      const request = route.request();
      const method = request.method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(decks),
        });
        return;
      }

      if (method === 'POST') {
        const payload = request.postDataJSON() as {
          name: string;
          format: string;
          user_id: string;
        };
        const newDeck: DeckRecord = {
          id: `deck-${decks.length + 1}`,
          user_id: payload.user_id,
          name: payload.name,
          format: payload.format,
          commander_name: null,
          companion_name: null,
          color_identity: [],
          description: null,
          is_public: false,
          card_count: 0,
          created_at: now,
          updated_at: new Date().toISOString(),
        };
        decks.unshift(newDeck);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([newDeck]),
        });
        return;
      }

      if (method === 'PATCH') {
        const payload = request.postDataJSON() as Partial<DeckRecord>;
        const deckIdMatch = request.url().match(/id=eq\.([^&]+)/);
        const deckId = deckIdMatch?.[1] ?? '';
        const idx = decks.findIndex(
          (deck) => deck.id === decodeURIComponent(deckId),
        );
        if (idx >= 0) {
          decks[idx] = {
            ...decks[idx],
            ...payload,
            updated_at: new Date().toISOString(),
          };
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/deck_cards**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/deckbuilder');

    await page.getByRole('button', { name: /sign in to get started/i }).click();
    const authDialog = page.getByRole('dialog').first();
    await authDialog.getByLabel('Email').fill('deck-user@example.com');
    await authDialog.getByLabel('Password').fill('password123');
    await authDialog.getByRole('button', { name: /^sign in$/i }).click();

    const createDeckButton = page
      .getByRole('button', { name: /new deck|create deck/i })
      .first();
    await expect(createDeckButton).toBeVisible();
    await createDeckButton.click();
    await page.waitForURL(/\/deckbuilder\/deck-1/);

    await page.getByRole('link', { name: /back/i }).click();
    await page.waitForURL('**/deckbuilder');

    await page
      .getByRole('button', { name: /import/i })
      .first()
      .click();
    const importDialog = page.getByRole('dialog').first();
    await importDialog.locator('button').nth(1).click();
    await importDialog.getByRole('textbox').fill('1 Sol Ring\n1 Arcane Signet');
    await importDialog
      .getByRole('button', { name: /import/i })
      .last()
      .click();

    await page.waitForURL(/\/deckbuilder\/deck-2/);

    const deckTitle = page.getByRole('heading', { level: 2 });
    await deckTitle.click();
    await page.getByRole('textbox').first().fill('Edited Deterministic Deck');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: /add notes|edit notes/i }).click();
    const notesInput = page.getByPlaceholder(/describe|notes/i);
    await notesInput.fill('Persisted deck notes from e2e');
    await notesInput.blur();

    await page.reload();
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: 'Edited Deterministic Deck',
      }),
    ).toBeVisible();
  });
});
