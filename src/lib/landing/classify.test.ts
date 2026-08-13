import { describe, expect, it } from 'vitest';
import { classifyCard, classifyResults } from './classify';
import type { IntentPath } from './types';
import type { ScryfallCard } from '@/types/card';

const PATHS: IntentPath[] = [
  {
    label: 'Punish sacrifice',
    description: '',
    query: 'q',
    match: ['sacrifices an artifact'],
  },
  {
    label: 'Remove them',
    description: '',
    query: 'q',
    match: ['destroy all artifacts'],
  },
  { label: 'No taxonomy', description: '', query: 'q' },
];

const card = (name: string, oracle: string): ScryfallCard =>
  ({ id: name, name, oracle_text: oracle, type_line: 'Enchantment' }) as ScryfallCard;

describe('landing classification', () => {
  it('labels a card with the first matching intent', () => {
    const result = classifyCard(
      card('Kibo', 'Whenever a player sacrifices an artifact, ...'),
      PATHS,
    );
    expect(result?.label).toBe('PUNISH SACRIFICE');
  });

  it('drops cards that match no intent rather than labelling loosely', () => {
    expect(classifyCard(card('Llanowar Elves', '{T}: Add {G}.'), PATHS)).toBeNull();
  });

  it('prefers breadth and reports real match counts', () => {
    const cards = [
      card('A', 'Whenever a player sacrifices an artifact, ...'),
      card('B', 'Whenever a player sacrifices an artifact, ...'),
      card('C', 'Destroy all artifacts.'),
      card('D', 'Draw a card.'),
    ];
    const summary = classifyResults(cards, PATHS, 2);
    expect(summary.matchCount).toBe(3);
    expect(summary.scannedCount).toBe(4);
    expect(summary.selected.map((entry) => entry.label)).toEqual([
      'PUNISH SACRIFICE',
      'REMOVE THEM',
    ]);
  });

  it('returns nothing when the page has no taxonomy', () => {
    const summary = classifyResults(
      [card('A', 'Destroy all artifacts.')],
      [{ label: 'X', description: '', query: 'q' }],
    );
    expect(summary.selected).toHaveLength(0);
    expect(summary.matchCount).toBe(0);
  });

  it('does not repeat reprints of the same card', () => {
    const summary = classifyResults(
      [card('A', 'Destroy all artifacts.'), card('A', 'Destroy all artifacts.')],
      PATHS,
    );
    expect(summary.selected).toHaveLength(1);
  });
});
