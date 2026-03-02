import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyPick } from '../DailyPick';

// Mock the daily gems data
vi.mock('@/data/daily-gems', () => ({
  getTodayPick: () => ({
    name: 'Tombstone Stairwell',
    reason: 'A hidden gem that creates chaos in multiplayer games.',
  }),
}));

const mockCardData = {
  id: 'test-card-id',
  name: 'Tombstone Stairwell',
  mana_cost: '{2}{B}{B}',
  type_line: 'World Enchantment',
  oracle_text: 'Cumulative upkeep {1}{B}',
  scryfall_uri: 'https://scryfall.com/card/mir/149/tombstone-stairwell',
  image_uris: { normal: 'https://example.com/card.jpg' },
  prices: { usd: '5.99' },
};

function mockFetchSuccess() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockCardData),
  }) as unknown as typeof fetch;
}

function mockFetchFailure() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
  }) as unknown as typeof fetch;
}

function mockFetchHang() {
  global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
}

describe('DailyPick', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    mockFetchHang();
    render(<DailyPick />);
    expect(screen.getByText("Loading today's gem...")).toBeInTheDocument();
  });

  it('renders card data after successful fetch', async () => {
    mockFetchSuccess();
    render(<DailyPick />);

    await waitFor(() => {
      const matches = screen.getAllByText('Tombstone Stairwell');
      expect(matches.length).toBeGreaterThanOrEqual(2); // subtitle + h3
    });

    expect(screen.getByText('$5.99')).toBeInTheDocument();
    expect(screen.getAllByText(/hidden gem/i).length).toBeGreaterThan(0);
  });

  it('renders the "Why it\'s a hidden gem" section', async () => {
    mockFetchSuccess();
    render(<DailyPick />);

    await waitFor(() => {
      expect(screen.getByText("Why it's a hidden gem")).toBeInTheDocument();
    });

    expect(
      screen.getByText('A hidden gem that creates chaos in multiplayer games.'),
    ).toBeInTheDocument();
  });

  it('renders View on Scryfall button', async () => {
    mockFetchSuccess();
    render(<DailyPick />);

    await waitFor(() => {
      expect(screen.getByText('View on Scryfall')).toBeInTheDocument();
    });
  });

  it('renders nothing when fetch fails', async () => {
    mockFetchFailure();
    const { container } = render(<DailyPick />);

    await waitFor(() => {
      expect(container.querySelector('section')).not.toBeInTheDocument();
    });
  });

  it('renders card image when available', async () => {
    mockFetchSuccess();
    render(<DailyPick />);

    await waitFor(() => {
      const img = screen.getByAltText('Tombstone Stairwell card art');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/card.jpg');
    });
  });

  it('has proper heading structure', async () => {
    mockFetchSuccess();
    render(<DailyPick />);

    await waitFor(() => {
      expect(screen.getByText('Daily Off-Meta Pick')).toBeInTheDocument();
    });

    const heading = screen.getByText('Daily Off-Meta Pick');
    expect(heading.tagName).toBe('H2');
  });
});
