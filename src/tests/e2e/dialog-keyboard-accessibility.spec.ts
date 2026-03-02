import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';

const CARD_SELECTOR = '[data-testid="card-item"], .card-item, [class*="card"]';

async function runSearch(
  page: Parameters<typeof test>[0]['page'],
  query: string,
) {
  const searchInput = page.locator('#search-input').first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('semantic-search') ||
      response.url().includes('api.scryfall.com'),
    { timeout: 15_000 },
  );

  await searchInput.fill(query);
  await searchInput.press('Enter');
  await responsePromise;
}

test.describe('Dialog focus management and keyboard flows', () => {
  test('CardModal keeps focus in dialog while open', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await runSearch(page, 'lightning bolt');

    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const activeElementInDialog = await modal.evaluate((dialog) =>
        dialog.contains(document.activeElement),
      );
      expect(activeElementInDialog).toBeTruthy();
    }

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      scope: '[role="dialog"]',
      context: 'card-modal',
    });
    expect(blockingViolations).toHaveLength(0);

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 5_000 });
  });

  test('AuthModal traps focus and returns focus to trigger when closed', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const openAuthButton = page
      .getByRole('button', { name: /sign in/i })
      .first();
    await expect(openAuthButton).toBeVisible({ timeout: 10_000 });
    await openAuthButton.focus();
    await openAuthButton.press('Enter');

    const authDialog = page.getByRole('dialog').first();
    await expect(authDialog).toBeVisible({ timeout: 5_000 });

    await expect(authDialog.getByLabel('Email')).toBeVisible();
    await expect(authDialog.getByLabel('Password')).toBeVisible();

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const activeElementInDialog = await authDialog.evaluate((dialog) =>
        dialog.contains(document.activeElement),
      );
      expect(activeElementInDialog).toBeTruthy();
    }

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      scope: '[role="dialog"]',
      context: 'auth-modal',
    });
    expect(blockingViolations).toHaveLength(0);

    await page.keyboard.press('Escape');
    await expect(authDialog).toBeHidden({ timeout: 5_000 });
    await expect(openAuthButton).toBeFocused();
  });

  test('Report Issue dialog labels and validation are keyboard-accessible', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await runSearch(page, 'counterspell');

    const reportTrigger = page
      .getByRole('button', { name: /report issue/i })
      .first();
    await expect(reportTrigger).toBeVisible({ timeout: 10_000 });
    await reportTrigger.focus();
    await reportTrigger.press('Enter');

    const reportDialog = page.getByRole('dialog').first();
    await expect(reportDialog).toBeVisible({ timeout: 5_000 });

    const issueField = reportDialog.getByLabel(/what went wrong\?/i);
    await expect(issueField).toBeVisible();

    await issueField.fill('bad');
    await reportDialog.getByRole('button', { name: /submit report/i }).click();
    await expect(
      reportDialog.getByText(/at least 10 characters/i),
    ).toBeVisible();

    const { blockingViolations } = await runAxeAudit(page, testInfo, {
      scope: '[role="dialog"]',
      context: 'report-dialog',
    });
    expect(blockingViolations).toHaveLength(0);

    await page.keyboard.press('Escape');
    await expect(reportDialog).toBeHidden({ timeout: 5_000 });
    await expect(reportTrigger).toBeFocused();
  });

  test('Header menus and deckbuilder controls support keyboard-only navigation', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Decks' }).focus();
    await page.keyboard.press('Enter');

    const deckBuilderMenuItem = page.getByRole('menuitem', {
      name: /deck builder/i,
    });
    await expect(deckBuilderMenuItem).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('ArrowDown');
    await expect(deckBuilderMenuItem).toBeFocused();
    await page.keyboard.press('Enter');

    await page.waitForURL('**/deckbuilder');

    const importDeckButton = page
      .getByRole('button', { name: /import/i })
      .first();
    const createDeckButton = page
      .getByRole('button', { name: /new deck|create deck/i })
      .first();

    await importDeckButton.focus();
    await expect(importDeckButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(createDeckButton).toBeFocused();
  });
});
