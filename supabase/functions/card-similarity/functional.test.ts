import { describe, expect, it } from 'vitest';
import { deriveFunctionalTags, isStrongFingerprint } from './functional.ts';

describe('deriveFunctionalTags', () => {
  it('detects treasure generation before generic token heuristics', () => {
    const tags = deriveFunctionalTags({
      typeLine: 'Creature',
      oracleText: 'Whenever this creature attacks, create treasure tokens.',
    });

    expect(tags).toContain('repeatable-treasures');
    expect(isStrongFingerprint(tags)).toBe(true);
  });

  it('detects exile-and-cast theft patterns like Thief of Sanity', () => {
    const tags = deriveFunctionalTags({
      typeLine: 'Creature',
      oracleText:
        "Whenever this creature deals combat damage to a player, exile the top card of that player's library face down. You may look at and cast that card.",
    });

    expect(tags).toContain('impulsive-draw');
    expect(isStrongFingerprint(tags)).toBe(true);
  });
});
