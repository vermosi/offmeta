import { describe, it } from 'vitest';
import type { TranslationTestCase } from './translation-golden.shared';
import { expectGoldenCoverage } from './translation-golden.shared';

describe('Translation Golden Tests - Oracle Text Regex Patterns', () => {
  const oracleCases: TranslationTestCase[] = [
    { input: 'cards with "you may" text', expectedContains: ['o:"you may"'] },
    { input: 'cards that say "each player"', expectedContains: ['o:"each player"'] },
    { input: 'cards with "at the beginning of"', expectedContains: ['o:"at the beginning"'] },
    { input: 'cards with tap activated abilities', expectedContains: ['o:"{t}:"'] },
    { input: 'cards that reference your graveyard', expectedContains: ['o:"your graveyard"'] },
    { input: 'cards with "whenever you cast"', expectedContains: ['o:"whenever you cast"'] },
    { input: 'cards that mention commander', expectedContains: ['o:commander'] },
    { input: 'cards with "for each" scaling', expectedContains: ['o:"for each"'] },
    { input: 'cards that say "you win the game"', expectedContains: ['o:"you win the game"'] },
    { input: 'cards with "you lose the game"', expectedContains: ['o:"you lose the game"'] },
  ];

  it.each(oracleCases)('should understand oracle pattern: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Advanced Keywords', () => {
  const keywordCases: TranslationTestCase[] = [
    { input: 'cards with flashback', expectedContains: ['keyword:flashback'] },
    { input: 'cards with buyback', expectedContains: ['keyword:buyback'] },
    { input: 'cards with retrace', expectedContains: ['keyword:retrace'] },
    { input: 'creatures with haste and trample', expectedContains: ['haste', 'trample'] },
    { input: 'indestructible creatures', expectedContains: ['indestructible'] },
    { input: 'hexproof creatures', expectedContains: ['hexproof'] },
    { input: 'lifelink creatures', expectedContains: ['lifelink'] },
    { input: 'double strike creatures', expectedContains: ['double strike'] },
    { input: 'creatures with ward', expectedContains: ['ward'] },
    { input: 'cascade spells', expectedContains: ['cascade'] },
  ];

  it.each(keywordCases)('should understand keyword: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Planeswalkers', () => {
  const planeswalkerCases: TranslationTestCase[] = [
    { input: 'planeswalkers', expectedContains: ['t:planeswalker'] },
    { input: 'blue planeswalkers', expectedContains: ['t:planeswalker', 'c:u'] },
    { input: 'planeswalkers with high loyalty', expectedContains: ['t:planeswalker', 'loy>='] },
    { input: 'jace planeswalkers', expectedContains: ['t:jace'] },
    { input: 'planeswalkers that make tokens', expectedContains: ['t:planeswalker', 'create', 'token'] },
  ];

  it.each(planeswalkerCases)('should understand planeswalker query: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Set and Print Filters', () => {
  const setCases: TranslationTestCase[] = [
    { input: 'cards from dominaria', expectedContains: ['e:dom'] },
    { input: 'cards from 2023', expectedContains: ['year:2023'] },
    { input: 'first printings only', expectedContains: ['is:firstprint'] },
    { input: 'showcase cards', expectedContains: ['is:showcase'] },
    { input: 'extended art cards', expectedContains: ['is:extendedart'] },
    { input: 'borderless cards', expectedContains: ['is:borderless'] },
    { input: 'foil cards under $10', expectedContains: ['is:foil', 'usd<10'] },
  ];

  it.each(setCases)('should understand set/print filter: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Exclusions and Negations', () => {
  const exclusionCases: TranslationTestCase[] = [
    { input: 'non-legendary creatures', expectedContains: ['-t:legendary', 't:creature'] },
    { input: 'creatures without flying', expectedContains: ['-o:flying', 't:creature'] },
    { input: 'instants that are not counterspells', expectedContains: ['t:instant', '-o:"counter target"'] },
    { input: 'artifacts except equipment', expectedContains: ['t:artifact', '-t:equipment'] },
    { input: 'lands that are not basic', expectedContains: ['t:land', '-t:basic'] },
  ];

  it.each(exclusionCases)('should understand exclusion: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Art Tags', () => {
  const artCases: TranslationTestCase[] = [
    { input: 'cards with dragons in the art', expectedContains: ['atag:dragon'] },
    { input: 'cards featuring forests', expectedContains: ['atag:forest'] },
    { input: 'cards with water in art', expectedContains: ['atag:water'] },
    { input: 'scary looking cards', expectedContains: ['atag:'] },
  ];

  it.each(artCases)('should understand art query: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Wildpair and Advanced', () => {
  const advancedCases: TranslationTestCase[] = [
    { input: 'creatures with total power and toughness 7', expectedContains: ['wildpair:7'] },
    { input: 'cards in commander products', expectedContains: ['in:commander'] },
    { input: 'cards with collector number 1', expectedContains: ['cn:1'] },
  ];

  it.each(advancedCases)('should understand advanced filter: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Complex Multi-Part Extended', () => {
  const complexCases: TranslationTestCase[] = [
    { input: 'blue instant counterspells under $2 for pauper', expectedContains: ['c:u', 't:instant', 'counter', 'usd<', 'f:pauper'] },
    { input: 'green creatures that ramp and draw cards in commander', expectedContains: ['c:g', 't:creature', 'f:commander'] },
    { input: 'mythic rare legendary creatures from the last 2 years', expectedContains: ['r:m', 't:legendary', 't:creature'] },
    { input: 'cheap artifacts that tap for mana in modern', expectedContains: ['t:artifact', 'add', 'f:modern'] },
    { input: 'azorius fliers with flash', expectedContains: ['id<=wu', 'flying', 'flash'] },
    { input: 'sacrifice fodder creatures that cost 1 mana', expectedContains: ['t:creature', 'mv=1'] },
  ];

  it.each(complexCases)('should understand complex multi-part query: "$input"', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});
