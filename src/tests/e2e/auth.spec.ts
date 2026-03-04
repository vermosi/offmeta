import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

function mockAuthEndpoints() {
  return async ({ page }: { page: Page }) => {
    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-signup-1',
            email: 'new-user@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            identities: [{ id: 'identity-1' }],
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
          session: null,
        }),
      });
    });

    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token',
          user: {
            id: 'user-signin-1',
            email: 'existing@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route('**/auth/v1/recover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Mock profile lookups triggered after auth state changes
    await page.route('**/rest/v1/profiles**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  };
}

test.describe('Auth modal flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints()({ page });
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
