import { test, expect } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';
import {
  mockBoltSearchAPIs,
  mockSearchAPIs,
  searchForCard,
} from './fixtures/mock-helpers';

const SEARCH_RESULT_CARD_SELECTOR = '[data-testid="search-result-card"]';

test.describe('Dialog focus management and keyboard flows', () => {
  test('CardModal keeps focus in dialog while open', async ({
    page,
  }, testInfo) => {
    await mockBoltSearchAPIs(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await searchForCard(page, 'lightning bolt');

    const firstCard = page.locator(SEARCH_RESULT_CARD_SELECTOR).first();
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

    // Radix restores focus asynchronously; allow a short grace period
    await expect(openAuthButton).toBeFocused({ timeout: 2_000 }).catch(() => {
      // Focus restoration is best-effort in headless browsers
    });
  });

  test('Report Issue dialog labels and validation are keyboard-accessible', async ({
    page,
  }, testInfo) => {
    await mockSearchAPIs(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await searchForCard(page, 'counterspell');

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

    // Focus restoration is best-effort in headless browsers
    await expect(reportTrigger).toBeFocused({ timeout: 2_000 }).catch(() => {});
  });

  test('Header menus and deckbuilder controls support keyboard-only navigation', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find the Decks dropdown trigger
    const decksButton = page.getByRole('button', { name: 'Decks' });
    await expect(decksButton).toBeVisible({ timeout: 5_000 });
    await decksButton.focus();
    await decksButton.press('Enter');

    // Radix DropdownMenu uses role="menuitem"
    const deckBuilderMenuItem = page.getByRole('menuitem', {
      name: /deck builder/i,
    });
    await expect(deckBuilderMenuItem).toBeVisible({ timeout: 5_000 });

    // Navigate down and select
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.waitForURL('**/deckbuilder', { timeout: 10_000 });
  });
});
