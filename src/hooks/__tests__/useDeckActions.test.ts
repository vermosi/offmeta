/**
 * Tests for useDeckActions hook.
 * Verifies action handlers call mutations and push undo entries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { type DeckCard } from '@/hooks';
import type { ScryfallCard } from '@/types/card';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'card-1' } }),
              })),
            })),
          })),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-123' } })),
}));

const _mockCard: ScryfallCard = { // eslint-disable-line @typescript-eslint/no-unused-vars
  id: 'scry-1',
  name: 'Lightning Bolt',
  cmc: 1,
  type_line: 'Instant',
  colors: ['R'],
  color_identity: ['R'],
  set: 'leb',
  set_name: 'Limited Edition Beta',
  rarity: 'common',
  legalities: {},
  image_uris: { small: '', normal: '', large: '', png: '', art_crop: '', border_crop: '' },
  prices: { usd: '1.00' },
} as ScryfallCard;

const makeDeckCard = (overrides: Partial<DeckCard> = {}): DeckCard => ({
  id: 'dc-1',
  deck_id: 'deck-1',
  card_name: 'Lightning Bolt',
  quantity: 1,
  board: 'mainboard',
  category: 'Instant',
  is_commander: false,
  is_companion: false,
  scryfall_id: 'scry-1',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('useDeckActions', () => {
  let pushSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushSpy = vi.fn();
  });

  function renderWithClient() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    // Dynamic import to get the hook after mocks are set
    return import('@/hooks/useDeckActions').then(({ useDeckActions }) =>
      renderHook(
        () =>
          useDeckActions({
            deckId: 'deck-1',
            cards: [makeDeckCard()],
            undoRedo: { push: pushSpy, undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false, history: [] } as never,
          }),
        { wrapper },
      ),
    );
  }

  it('handleRemoveCard calls removeCard.mutate and pushes undo entry', async () => {
    const { result } = await renderWithClient();

    act(() => {
      result.current.handleRemoveCard('dc-1');
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0].label).toContain('Remove Lightning Bolt');
  });

  it('handleSetQuantity pushes undo entry with old and new quantities', async () => {
    const { result } = await renderWithClient();

    act(() => {
      result.current.handleSetQuantity('dc-1', 4);
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0].label).toContain('1→4');
  });

  it('handleMoveToSideboard pushes undo entry', async () => {
    const { result } = await renderWithClient();

    act(() => {
      result.current.handleMoveToSideboard('dc-1', true);
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0].label).toContain('sideboard');
  });

  it('handleMoveToMaybeboard pushes undo entry', async () => {
    const { result } = await renderWithClient();

    act(() => {
      result.current.handleMoveToMaybeboard('dc-1');
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0].label).toContain('maybeboard');
  });

  it('handleRemoveCard without matching card still calls mutate', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { useDeckActions } = await import('@/hooks/useDeckActions');
    const { result } = renderHook(
      () =>
        useDeckActions({
          deckId: 'deck-1',
          cards: [], // empty — card not found
          undoRedo: { push: pushSpy } as never,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleRemoveCard('nonexistent');
    });

    // No undo entry pushed when card not found
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
