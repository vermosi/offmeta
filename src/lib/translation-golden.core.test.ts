import { describe, it } from 'vitest';
import type { TranslationTestCase } from './translation-golden.shared';
import { expectGoldenCoverage } from './translation-golden.shared';

describe('Translation Golden Tests - Ramp and Mana', () => {
  const rampCases: TranslationTestCase[] = [
    { input: 'mana rocks', expectedContains: ['t:artifact', 'add', '{'] },
    { input: 'mana dorks', expectedContains: ['t:creature', 'add', '{'] },
    { input: 'cheap mana rocks', expectedContains: ['t:artifact', 'add', '{'] },
    { input: 'cheap green ramp', expectedContains: ['c:g'] },
    { input: 'green ramp spells', expectedContains: ['c:g', 'search', 'land'] },
    { input: 'land ramp', expectedContains: ['search', 'library', 'land', 'battlefield'] },
  ];

  it.each(rampCases)('should translate "$input" to contain proper ramp syntax', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Removal and Board Control', () => {
  const removalCases: TranslationTestCase[] = [
    { input: 'creature removal', expectedContains: ['destroy target creature', 'exile target creature'] },
    { input: 'board wipes', expectedContains: ['destroy all', 'exile all'] },
    { input: 'wrath effects', expectedContains: ['destroy all creatures'] },
    { input: 'spot removal', expectedContains: ['t:instant', 'destroy target', 'exile target'] },
    { input: 'artifact removal', expectedContains: ['destroy target artifact', 'exile target artifact'] },
    { input: 'enchantment removal', expectedContains: ['destroy target enchantment', 'exile target enchantment'] },
    { input: 'white board wipes', expectedContains: ['c:w', 'destroy all', 'exile all'] },
  ];

  it.each(removalCases)('should translate "$input" to contain removal syntax', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Counter Magic', () => {
  const counterCases: TranslationTestCase[] = [
    { input: 'counterspells', expectedContains: ['t:instant', 'counter target'] },
    { input: 'counter spells', expectedContains: ['t:instant', 'counter target spell'] },
    { input: 'cheap counterspells', expectedContains: ['t:instant', 'counter target'] },
    { input: 'free counterspells', expectedContains: ['t:instant', 'counter', 'without paying'] },
  ];

  it.each(counterCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});
