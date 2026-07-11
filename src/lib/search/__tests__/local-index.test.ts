import { describe, expect, it } from 'vitest';
import type { ScryfallCard } from '@/types/card';
import { createCardSearchIndex, searchCardIndex } from '@/lib/search/local-index';

describe('local card search index', () => {
  it('returns matching cards for partial queries', () => {
    const cards = [
      { id: '1', name: 'Sol Ring', type_line: 'Artifact', oracle_text: 'Add two colorless mana' },
      { id: '2', name: 'Solemn Simulacrum', type_line: 'Artifact Creature', oracle_text: 'Search your library' },
    ] as unknown as ScryfallCard[];

    const index = createCardSearchIndex(cards);
    const hits = searchCardIndex(index, cards, 'sol', 5);

    expect(hits.map((hit) => hit.name)).toContain('Sol Ring');
  });
});
