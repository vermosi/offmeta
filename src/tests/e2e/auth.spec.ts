import { expect, test } from '@playwright/test';
import { mockAuthAPIs } from './fixtures/mock-helpers';

async function openAuthDialog(page: Parameters<typeof test>[0]['page']) {
  const desktopSignIn = page
    .locator('button:visible')
    .filter({ hasText: /^sign in$/i })
    .first();
  if (await desktopSignIn.isVisible().catch(() => false)) {
    await desktopSignIn.click();
    return;
  }

  const hamburgerButton = page.getByTestId('hamburger-button');
  if (!(await hamburgerButton.isVisible().catch(() => false))) {
    throw new Error('No visible auth entrypoint found');
  }

  await hamburgerButton.click();
  await page
    .getByRole('button', { name: /^sign in$/i })
    .last()
    .click();
}

test.describe('Auth modal flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAPIs(page, {
      userId: 'user-signin-1',
      email: 'existing@example.com',
      mockSignup: true,
      mockRecover: true,
    });
  });

  test('signup happy path (deterministic mocked equivalent)', async ({
    page,
  }) => {
    await page.goto('/');

    await openAuthDialog(page);
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog.getByRole('button', { name: /^sign up$/i }).click();
    await dialog.getByLabel('Email').fill('new-user@example.com');
    await dialog.getByLabel('Password').fill('password123');
    await dialog.getByRole('button', { name: /create account/i }).click();

    await expect(
      dialog.getByText(/check your email to confirm your account/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('signin happy path @e2e-smoke', async ({ page }) => {
    await page.goto('/');

    await openAuthDialog(page);
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog.getByLabel('Email').fill('existing@example.com');
    await dialog.getByLabel('Password').fill('password123');
    await dialog.getByRole('button', { name: /^sign in$/i }).click();

    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('password reset request flow', async ({ page }) => {
    await page.goto('/');

    await openAuthDialog(page);
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog.getByRole('button', { name: /forgot password\?/i }).click();
    await dialog.getByLabel('Email').fill('existing@example.com');
    await dialog.getByRole('button', { name: /send reset link/i }).click();

    await expect(
      dialog.getByText(/check your email for a password reset link/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
