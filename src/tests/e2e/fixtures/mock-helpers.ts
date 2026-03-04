/**
 * Shared E2E test helpers for API mocking and search operations.
 * Centralizes mock setup to prevent tests from depending on live APIs in CI.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  MOCK_SEMANTIC_SEARCH_RESPONSE,
  MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
  MOCK_SCRYFALL_SEARCH_RESPONSE,
  MOCK_BOLT_SEARCH_RESPONSE,
} from './mock-responses';

const SEARCH_INPUT_SELECTOR = '#search-input';
const SEARCH_RESULT_CARD_SELECTOR = '[data-testid="search-result-card"]';

/* ------------------------------------------------------------------ */
/*  Search mocks                                                      */
/* ------------------------------------------------------------------ */

/**
 * Mock semantic-search and Scryfall API endpoints.
 * MUST be called before page.goto() for route interception to work.
 */
export async function mockSearchAPIs(
  page: Page,
  opts: {
    semanticResponse?: Record<string, unknown>;
    scryfallResponse?: Record<string, unknown>;
  } = {},
) {
  const semanticBody = opts.semanticResponse ?? MOCK_SEMANTIC_SEARCH_RESPONSE;
  const scryfallBody = opts.scryfallResponse ?? MOCK_SCRYFALL_SEARCH_RESPONSE;

  await page.route('**/functions/v1/semantic-search', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(semanticBody),
    }),
  );

  await page.route('**/api.scryfall.com/cards/search**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(scryfallBody),
    }),
  );
}

/**
 * Mock search APIs with lightning bolt fixtures.
 */
export async function mockBoltSearchAPIs(page: Page) {
  await mockSearchAPIs(page, {
    semanticResponse: MOCK_LIGHTNING_BOLT_SEMANTIC_RESPONSE,
    scryfallResponse: MOCK_BOLT_SEARCH_RESPONSE,
  });
}

/**
 * Fill the search input, press Enter, and wait for card results to render.
 */
export async function searchForCard(page: Page, query: string) {
  const searchInput = page.locator(SEARCH_INPUT_SELECTOR).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });

  await searchInput.fill(query);
  await searchInput.press('Enter');

  await expect(
    page.locator(SEARCH_RESULT_CARD_SELECTOR).first(),
  ).toBeVisible({ timeout: 15_000 });
}

/* ------------------------------------------------------------------ */
/*  Auth mocks                                                        */
/* ------------------------------------------------------------------ */

/** Shape of a mock Supabase auth user. */
function buildMockUser(overrides: { id: string; email: string }) {
  return {
    id: overrides.id,
    email: overrides.email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

export interface MockAuthOptions {
  /** User ID for sign-in responses. */
  userId?: string;
  /** Email for sign-in responses. */
  email?: string;
  /** Access token returned on sign-in. */
  accessToken?: string;
  /** Whether to also mock the signup endpoint. */
  mockSignup?: boolean;
  /** Whether to also mock the password-recovery endpoint. */
  mockRecover?: boolean;
}

/**
 * Intercept Supabase auth endpoints with deterministic mocks.
 *
 * Mocks:
 * - `POST /auth/v1/token?grant_type=password` (sign-in)
 * - `GET  /rest/v1/profiles` (profile lookup after auth state change)
 * - Optionally: `/auth/v1/signup`, `/auth/v1/recover`
 *
 * MUST be called **before** `page.goto()`.
 */
export async function mockAuthAPIs(
  page: Page,
  opts: MockAuthOptions = {},
) {
  const {
    userId = 'mock-user-1',
    email = 'mock@example.com',
    accessToken = 'mock-access-token',
    mockSignup = false,
    mockRecover = false,
  } = opts;

  const user = buildMockUser({ id: userId, email });

  // Sign-in (password grant)
  await page.route('**/auth/v1/token?grant_type=password', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `${accessToken}-refresh`,
        user,
      }),
    }),
  );

  // Profile lookup (always empty by default)
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  );

  if (mockSignup) {
    await page.route('**/auth/v1/signup', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            ...buildMockUser({ id: `${userId}-signup`, email }),
            identities: [{ id: 'identity-1' }],
          },
          session: null,
        }),
      }),
    );
  }

  if (mockRecover) {
    await page.route('**/auth/v1/recover', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      }),
    );
  }
}

/**
 * Open the auth dialog, fill credentials, submit, and wait for the dialog
 * to close (session established).
 */
export async function signInViaDialog(
  page: Page,
  opts: { email?: string; password?: string } = {},
) {
  const { email = 'mock@example.com', password = 'password123' } = opts;

  await page
    .getByRole('button', { name: /sign in/i })
    .first()
    .click();

  const authDialog = page.getByRole('dialog').first();
  await expect(authDialog).toBeVisible({ timeout: 5_000 });

  await authDialog.getByLabel('Email').fill(email);
  await authDialog.getByLabel('Password').fill(password);
  await authDialog.getByRole('button', { name: /^sign in$/i }).click();

  await expect(authDialog).toBeHidden({ timeout: 5_000 });
}

export { SEARCH_INPUT_SELECTOR, SEARCH_RESULT_CARD_SELECTOR };
