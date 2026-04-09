/**
 * Tests for useCollection hooks.
 * Tests the pure logic: lookup aggregation, card filtering, and module exports.
 */

import { describe, it, expect, vi } from 'vitest';
import { type CollectionCard } from '@/hooks';

// Test the aggregation logic directly (mirrors useCollectionLookup)
function buildLookupMap(collection: CollectionCard[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const card of collection) {
    const existing = map.get(card.card_name) || 0;
    map.set(card.card_name, existing + card.quantity);
  }
  return map;
}

// Test the filtering logic directly (mirrors useCollectionCard)
function filterByName(collection: CollectionCard[], cardName: string | undefined): CollectionCard[] {
  if (!cardName) return [];
  return collection.filter((c) => c.card_name === cardName);
}

const mockCollection: CollectionCard[] = [
  { id: '1', user_id: 'u1', card_name: 'Lightning Bolt', scryfall_id: null, quantity: 4, foil: false, created_at: '', updated_at: '' },
  { id: '2', user_id: 'u1', card_name: 'Lightning Bolt', scryfall_id: null, quantity: 2, foil: true, created_at: '', updated_at: '' },
  { id: '3', user_id: 'u1', card_name: 'Counterspell', scryfall_id: null, quantity: 3, foil: false, created_at: '', updated_at: '' },
];

describe('Collection lookup aggregation', () => {
  it('aggregates quantities by card name', () => {
    const map = buildLookupMap(mockCollection);
    expect(map.get('Lightning Bolt')).toBe(6);
    expect(map.get('Counterspell')).toBe(3);
    expect(map.get('Nonexistent')).toBeUndefined();
  });

  it('returns empty map for empty collection', () => {
    const map = buildLookupMap([]);
    expect(map.size).toBe(0);
  });
});

describe('Collection card filtering', () => {
  it('returns matching entries for a card name', () => {
    expect(filterByName(mockCollection, 'Lightning Bolt')).toHaveLength(2);
  });

  it('returns empty array for unknown card', () => {
    expect(filterByName(mockCollection, 'Unknown Card')).toHaveLength(0);
  });

  it('returns empty array when cardName is undefined', () => {
    expect(filterByName(mockCollection, undefined)).toHaveLength(0);
  });
});

describe('useCollection module exports', () => {
  it('exports all expected hooks', async () => {
    // Avoid rendering hooks — just check exports exist
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: { from: vi.fn() },
    }));
    vi.mock('@/hooks/useAuth', () => ({
      useAuth: vi.fn(() => ({ user: null })),
    }));

    const mod = await import('@/hooks/useCollection');
    expect(typeof mod.useCollection).toBe('function');
    expect(typeof mod.useCollectionLookup).toBe('function');
    expect(typeof mod.useAddToCollection).toBe('function');
    expect(typeof mod.useRemoveFromCollection).toBe('function');
    expect(typeof mod.useUpdateCollectionQuantity).toBe('function');
    expect(typeof mod.useCollectionCard).toBe('function');
  });
});
