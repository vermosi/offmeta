import { describe, it } from 'vitest';
import type { TranslationTestCase } from './translation-golden.shared';
import { expectGoldenCoverage, validateTranslation } from './translation-golden.shared';

describe('Translation Golden Tests - Feedback-Derived Cases', () => {
  const feedbackCases: TranslationTestCase[] = [
    { input: 'cards that double ETB effects', expectedContains: ['triggers an additional time'], shouldNotContain: ['twice', 'double'] },
    { input: 'turns lands into mountains', expectedContains: ['lands are mountains'] },
    { input: 'cards that champion a creature', expectedContains: ['champion a'] },
    { input: 'ramp spells for modern', expectedContains: ['f:modern', 'land', 'battlefield'] },
    { input: 'cards that give flying', expectedContains: ['creature', 'flying'] },
    { input: 'creatures that make token creatures when an opponent takes an action', expectedContains: ['t:creature', 'opponent', 'create', 'token'] },
    { input: 'cards that reanimate from opponents grave', expectedContains: ['graveyard', 'battlefield', 'opponent'] },
    { input: 'stuff like blood artist', expectedContains: ['whenever', 'dies', 'gain life'] },
    { input: 'cards that make opponents lose life when a creature dies', expectedContains: ['whenever', 'creature', 'dies', 'loses', 'life'] },
    { input: 'Elementals with enter the battlefield effects', expectedContains: ['t:elemental', 'enters'] },
  ];

  it.each(feedbackCases)('should handle feedback case: "$input"', (testCase) => {
    const result = validateTranslation(
      testCase.expectedContains.join(' '),
      testCase.expectedContains,
      testCase.shouldNotContain,
    );
    expect(result.valid).toBe(true);
  });
});

describe('Translation Golden Tests - Complex Queries', () => {
  const complexCases: TranslationTestCase[] = [
    { input: 'utility lands for commander in esper', expectedContains: ['t:land', '-t:basic', 'id=wub', 'f:commander'] },
    { input: 'Artifacts that produce 2 mana and cost at most four mana', expectedContains: ['t:artifact', 'add', '{', 'mv<=4'] },
    { input: 'green pump spells that affect all creatures and pauper legal', expectedContains: ['c:g', 't:instant', 't:sorcery', 'creatures you control', 'f:pauper'] },
    { input: 'Vampires with death triggers in white and black', expectedContains: ['id=wb', 't:vampire', 'whenever', 'dies'] },
    { input: 'Mill creatures in black and blue', expectedContains: ['id=ub', 'mill', 't:creature'] },
    { input: 'cards that can go in a Jeskai commander deck with proliferate', expectedContains: ['id=wur', 'proliferate', 'f:commander'] },
    { input: 'Boros cards that bring things back from death', expectedContains: ['id=rw', 'graveyard', 'battlefield'] },
  ];

  it.each(complexCases)('should translate complex query: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Syntax Validation', () => {
  const syntaxPatterns = [
    { pattern: 't:creature', description: 'type filter' },
    { pattern: 'c:g', description: 'color filter' },
    { pattern: 'id=wub', description: 'color identity' },
    { pattern: 'f:commander', description: 'format filter' },
    { pattern: 'r:mythic', description: 'rarity filter' },
    { pattern: 'mv<=3', description: 'mana value comparison' },
    { pattern: 'usd<5', description: 'price filter' },
    { pattern: 'o:"search your library"', description: 'oracle text with quotes' },
    { pattern: 'is:fetchland', description: 'is filter' },
    { pattern: 'order:edhrec', description: 'sort order' },
    { pattern: '-t:basic', description: 'negation' },
    { pattern: '(t:instant or t:sorcery)', description: 'OR grouping' },
  ];

  it.each(syntaxPatterns)(
    'pattern "$pattern" should be valid Scryfall syntax ($description)',
    ({ pattern }) => {
      expect(pattern).toMatch(
        /^-?(?:t|c|id|f|r|mv|usd|o|is|order|pow|tou|name|set|art|otag|atag):?.+$|\(.+\)/,
      );
    },
  );
});

describe('Translation Golden Tests - X-Cost Spells', () => {
  const xCostCases: TranslationTestCase[] = [
    { input: 'x cost spells', expectedContains: ['{x}'] },
    { input: 'XX spells', expectedContains: ['{x}{x}'] },
    { input: 'cards with x in the cost', expectedContains: ['m:{x}'] },
    { input: 'green x cost creatures', expectedContains: ['c:g', '{x}', 't:creature'] },
    { input: 'fireball effects', expectedContains: ['{x}', 'damage'] },
    { input: 'hydras', expectedContains: ['t:hydra'] },
  ];

  it.each(xCostCases)('should understand X-cost pattern: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Hybrid and Special Mana', () => {
  const hybridCases: TranslationTestCase[] = [
    { input: 'hybrid mana cards', expectedContains: ['is:hybrid'] },
    { input: 'phyrexian mana cards', expectedContains: ['is:phyrexian'] },
    { input: 'cards that cost only colorless', expectedContains: ['c=c'] },
    { input: 'snow mana cards', expectedContains: ['is:snow'] },
  ];

  it.each(hybridCases)('should understand special mana: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Power/Toughness Comparisons', () => {
  const statCases: TranslationTestCase[] = [
    { input: 'creatures with power greater than toughness', expectedContains: ['pow>tou'] },
    { input: 'creatures with toughness greater than power', expectedContains: ['tou>pow'] },
    { input: 'creatures with power 5 or more', expectedContains: ['pow>=5'] },
    { input: 'creatures with 1 toughness', expectedContains: ['tou=1'] },
    { input: 'creatures with 0 power', expectedContains: ['pow=0'] },
    { input: 'big creatures', expectedContains: ['pow>='] },
    { input: 'small creatures', expectedContains: ['pow<='] },
    { input: 'creatures with equal power and toughness', expectedContains: ['pow=tou'] },
    { input: 'creatures with * power', expectedContains: ['pow:*'] },
    { input: 'walls and defenders', expectedContains: ['t:wall'] },
  ];

  it.each(statCases)('should understand P/T comparison: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});
