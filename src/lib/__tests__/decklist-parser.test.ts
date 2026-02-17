/**
 * Unit tests for the client-side decklist parser.
 * Covers standard formats, commander detection, edge cases, and input sanitization.
 * @module decklist-parser.test
 */

import { describe, it, expect } from 'vitest';
import { parseDecklist } from '@/lib/decklist-parser';

describe('parseDecklist', () => {
  it('parses standard "qty name" format', () => {
    const result = parseDecklist('1 Sol Ring\n1 Arcane Signet\n2 Island');
    expect(result.cards).toHaveLength(3);
    expect(result.totalCards).toBe(4);
    expect(result.cards[0]).toEqual({ name: 'Sol Ring', quantity: 1 });
    expect(result.cards[2]).toEqual({ name: 'Island', quantity: 2 });
  });

  it('parses "qtyx name" format', () => {
    const result = parseDecklist('1x Sol Ring\n3x Lightning Bolt');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[1]).toEqual({ name: 'Lightning Bolt', quantity: 3 });
  });

  it('defaults quantity to 1 when not specified', () => {
    const result = parseDecklist('Sol Ring\nArcane Signet');
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toEqual({ name: 'Sol Ring', quantity: 1 });
    expect(result.totalCards).toBe(2);
  });

  it('detects commander from COMMANDER: prefix', () => {
    const result = parseDecklist('COMMANDER: Kenrith, the Returned King\n1 Sol Ring');
    expect(result.commander).toBe('Kenrith, the Returned King');
    expect(result.cards).toHaveLength(1);
  });

  it('detects commander from *CMDR* marker', () => {
    const result = parseDecklist('1 Thrasios, Triton Hero *CMDR*\n1 Sol Ring');
    expect(result.commander).toBe('Thrasios, Triton Hero');
    expect(result.cards).toHaveLength(2);
  });

  it('strips Moxfield set/collector info', () => {
    const result = parseDecklist('1 Sol Ring (CMR) 350');
    expect(result.cards[0].name).toBe('Sol Ring');
  });

  it('strips foil markers like *F*', () => {
    const result = parseDecklist('1 Sol Ring (CMR) 350 *F*');
    expect(result.cards[0].name).toBe('Sol Ring');
  });

  it('skips section header lines but includes cards after them', () => {
    const result = parseDecklist('// Lands\n1 Island\nSideboard\n1 Negate');
    // The parser skips section headers but not lines after them
    // "Sideboard" matches SECTION_HEADERS, "1 Negate" is parsed normally
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].name).toBe('Island');
    expect(result.cards[1].name).toBe('Negate');
  });

  it('skips Maybeboard/Companion header lines', () => {
    const result = parseDecklist('Maybeboard\n1 Sol Ring\nCompanion\n1 Jegantha');
    // Section headers are skipped, but cards after them are still parsed
    expect(result.cards).toHaveLength(2);
  });

  it('returns empty result for empty input', () => {
    const result = parseDecklist('');
    expect(result.cards).toHaveLength(0);
    expect(result.commander).toBeNull();
    expect(result.totalCards).toBe(0);
  });

  it('handles whitespace-only input', () => {
    const result = parseDecklist('   \n  \n  ');
    expect(result.cards).toHaveLength(0);
    expect(result.commander).toBeNull();
  });

  it('handles mixed formats in one decklist', () => {
    const raw = `COMMANDER: Omnath, Locus of Creation
1x Sol Ring
2 Island
Arcane Signet
1 Kodama's Reach (CMR) 271 *F*`;
    const result = parseDecklist(raw);
    expect(result.commander).toBe('Omnath, Locus of Creation');
    expect(result.cards).toHaveLength(4);
    expect(result.totalCards).toBe(5);
  });

  it('last commander marker wins when multiple present', () => {
    const raw = `COMMANDER: First Commander
1 Second Commander *CMDR*
1 Sol Ring`;
    const result = parseDecklist(raw);
    expect(result.commander).toBe('Second Commander');
  });
});
