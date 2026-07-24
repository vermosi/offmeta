import { describe, it, expect } from 'vitest';
import { extractRoles } from '../card-roles';

describe('extractRoles', () => {
  it('detects common functional roles from oracle text', () => {
    expect(extractRoles('Destroy target creature. Draw a card.')).toEqual(
      expect.arrayContaining(['removal', 'draw']),
    );
  });

  it('detects ramp and token generation', () => {
    expect(
      extractRoles(
        'Search your library for a basic land and create a 1/1 white Soldier creature token.',
      ),
    ).toEqual(expect.arrayContaining(['ramp', 'token_generator']));
  });

  it('returns an empty array for missing text', () => {
    expect(extractRoles(null)).toEqual([]);
    expect(extractRoles('')).toEqual([]);
  });
});
