import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { runAxeAudit } from '@/tests/e2e/axe-helpers';
import {
  mockBoltSearchAPIs,
  searchForCard,
  SEARCH_RESULT_CARD_SELECTOR,
} from './fixtures/mock-helpers';

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
    await mockBoltSearchAPIs(page);

    await page.goto('/');
    await searchForCard(page, 'lightning bolt');

    const firstCard = page.locator(SEARCH_RESULT_CARD_SELECTOR).first();
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
