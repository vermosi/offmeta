import { expect, test } from '@playwright/test';
import { mockAuthAPIs, signInViaDialog } from './fixtures/mock-helpers';

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

    await page
      .getByRole('button', { name: /sign in/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /^sign up$/i }).click();
    await dialog.getByLabel('Email').fill('new-user@example.com');
    await dialog.getByLabel('Password').fill('password123');
    await dialog.getByRole('button', { name: /create account/i }).click();

    await expect(
      dialog.getByText(/check your email to confirm your account/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('signin happy path', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /sign in/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog').first();

    await dialog.getByLabel('Email').fill('existing@example.com');
    await dialog.getByLabel('Password').fill('password123');
    await dialog.getByRole('button', { name: /^sign in$/i }).click();

    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('password reset request flow', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /sign in/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog').first();

    await dialog.getByRole('button', { name: /forgot password\?/i }).click();
    await dialog.getByLabel('Email').fill('existing@example.com');
    await dialog.getByRole('button', { name: /send reset link/i }).click();

    await expect(
      dialog.getByText(/check your email for a password reset link/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
