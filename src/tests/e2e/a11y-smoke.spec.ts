import { test } from '@playwright/test';
import { mockSearchAPIs } from './fixtures/mock-helpers';
import { runAxeAudit } from './axe-helpers';

test.describe('Accessibility smoke', () => {
  test('home page has no blocking violations @a11y-smoke', async ({
    page,
  }, testInfo) => {
    await mockSearchAPIs(page);
    await page.goto('/');

    await runAxeAudit(page, testInfo, {
      scope: 'body',
      context: 'home-page',
    });
  });
});
