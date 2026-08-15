/**
 * Tests for the /go Discord click-through bridge.
 * Covers redirect, invalid signature, expired link, and malformed params.
 * @module GoRedirect.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoRedirect from '@/pages/GoRedirect';

const replace = vi.fn();

vi.mock('@/lib/core/env', () => ({
  env: { VITE_SUPABASE_URL: 'https://backend.test' },
}));

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/go${search}`]}>
      <GoRedirect />
    </MemoryRouter>,
  );
}

function mockJson(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(body),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('GoRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to the verified destination', async () => {
    const fetchMock = mockJson({
      ok: true,
      redirectUrl: 'https://offmeta.app/search/cheap-red-treasure',
    });

    renderAt('?q=cheap+red+treasure&s=abc123');

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        'https://offmeta.app/search/cheap-red-treasure',
      ),
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'https://backend.test/functions/v1/discord-bot?',
    );
  });

  it('shows a verification failure for an invalid signature', async () => {
    mockJson({ ok: false, outcome: 'invalid_signature' });

    renderAt('?q=test&s=tampered');

    expect(
      await screen.findByText(/could not be verified/i),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows an expiry message for an expired link', async () => {
    mockJson({ ok: false, outcome: 'expired' });

    renderAt('?q=test&s=abc&x=1');

    expect(await screen.findByText(/has expired/i)).toBeInTheDocument();
    expect(await screen.findByText(/7 days/i)).toBeInTheDocument();
  });

  it('shows an incomplete-link message when params are missing', async () => {
    const fetchMock = mockJson({ ok: true, redirectUrl: 'https://x.test' });

    renderAt('?q=test');

    expect(await screen.findByText(/incomplete/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
