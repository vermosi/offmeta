import { describe, expect, it } from 'vitest';
import { parseDecklist } from '@/lib/decklist-parser';

describe('parseDecklist', () => {
  it('parses commander-prefixed lines and Moxfield-style entries', () => {
    const parsed = parseDecklist(`
COMMANDER: Atraxa, Praetors' Voice
1 Sol Ring (CMR) 350 *F*
2x Counterspell
`);

    expect(parsed.commander).toBe("Atraxa, Praetors' Voice");
    expect(parsed.totalCards).toBe(3);
    expect(parsed.cards).toEqual([
      { name: 'Sol Ring', quantity: 1 },
      { name: 'Counterspell', quantity: 2 },
    ]);
  });
});

