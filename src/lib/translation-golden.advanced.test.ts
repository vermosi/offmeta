import { describe, it } from 'vitest';
import type { TranslationTestCase } from './translation-golden.shared';
import { expectGoldenCoverage } from './translation-golden.shared';

describe('Translation Golden Tests - Card Draw', () => {
  const drawCases: TranslationTestCase[] = [
    { input: 'card draw', expectedContains: ['draw', 'card'] },
    { input: 'draw spells', expectedContains: ['draw', 'cards'] },
    { input: 'cantrips', expectedContains: ['draw a card'] },
    { input: 'blue card draw', expectedContains: ['c:u', 'draw', 'card'] },
    { input: 'black card draw', expectedContains: ['c:b', 'draw', 'card'] },
    { input: 'mono green cards that help me draw', expectedContains: ['c:g', 'draw'] },
  ];

  it.each(drawCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Tutors', () => {
  const tutorCases: TranslationTestCase[] = [
    { input: 'tutors', expectedContains: ['search your library'] },
    { input: 'creature tutors', expectedContains: ['search your library', 'creature card'] },
    { input: 'land tutors', expectedContains: ['search your library', 'land card'] },
    { input: 'artifact tutors', expectedContains: ['search your library', 'artifact card'] },
    { input: 'enchantment tutors', expectedContains: ['search your library', 'enchantment card'] },
    { input: 'black tutors', expectedContains: ['c:b', 'search your library'] },
    { input: 'cheap tutors', expectedContains: ['search your library', 'usd<'] },
  ];

  it.each(tutorCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Token Generators', () => {
  const tokenCases: TranslationTestCase[] = [
    { input: 'creatures that make treasure tokens', expectedContains: ['t:creature', 'create', 'treasure'] },
    { input: 'treasure makers', expectedContains: ['create', 'treasure'] },
    { input: 'token generators', expectedContains: ['create', 'token'] },
    { input: 'creature tokens', expectedContains: ['create', 'creature token'] },
    { input: 'cards that make wizard tokens', expectedContains: ['create', 'wizard'] },
  ];

  it.each(tokenCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Sacrifice and Aristocrats', () => {
  const sacCases: TranslationTestCase[] = [
    { input: 'sacrifice outlets', expectedContains: ['sacrifice', ':'] },
    { input: 'sac outlets', expectedContains: ['sacrifice'] },
    { input: 'aristocrats', expectedContains: ['whenever', 'dies', 'sacrifice'] },
    { input: 'Rakdos sacrifice outlets', expectedContains: ['id=br', 'sacrifice'] },
    { input: 'grave pact effects', expectedContains: ['whenever', 'creature you control dies', 'sacrifice'] },
  ];

  it.each(sacCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - ETB and Flicker', () => {
  const etbCases: TranslationTestCase[] = [
    { input: 'etb effects', expectedContains: ['enters the battlefield'] },
    { input: 'etb creatures', expectedContains: ['t:creature', 'enters'] },
    { input: 'flicker effects', expectedContains: ['exile', 'return', 'battlefield'] },
    { input: 'blink effects', expectedContains: ['exile', 'return', 'battlefield'] },
    { input: 'cards that double etb effects', expectedContains: ['triggers an additional time'] },
  ];

  it.each(etbCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Land Types', () => {
  const landCases: TranslationTestCase[] = [
    { input: 'fetchlands', expectedContains: ['is:fetchland'] },
    { input: 'fetch lands', expectedContains: ['search your library', 'land'] },
    { input: 'shock lands', expectedContains: ['is:shockland'] },
    { input: 'shocklands', expectedContains: ['is:shockland'] },
    { input: 'duals', expectedContains: ['is:dual'] },
    { input: 'pain lands', expectedContains: ['is:painland'] },
    { input: 'check lands', expectedContains: ['is:checkland'] },
    { input: 'fast lands', expectedContains: ['is:fastland'] },
    { input: 'utility lands for commander', expectedContains: ['t:land', '-t:basic', 'f:commander'] },
    { input: 'cheap lands', expectedContains: ['t:land', 'usd<'] },
  ];

  it.each(landCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Format Legality', () => {
  const formatCases: TranslationTestCase[] = [
    { input: 'standard legal', expectedContains: ['f:standard'] },
    { input: 'pauper legal', expectedContains: ['f:pauper'] },
    { input: 'legacy legal', expectedContains: ['f:legacy'] },
    { input: 'vintage legal', expectedContains: ['f:vintage'] },
    { input: 'edh staples', expectedContains: ['f:commander'] },
    { input: 'commander staples', expectedContains: ['f:commander'] },
  ];

  it.each(formatCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Rarity', () => {
  const rarityCases: TranslationTestCase[] = [
    { input: 'mythic rares', expectedContains: ['r:mythic'] },
    { input: 'mythics', expectedContains: ['r:mythic'] },
    { input: 'rares', expectedContains: ['r:rare'] },
    { input: 'uncommons', expectedContains: ['r:uncommon'] },
    { input: 'commons', expectedContains: ['r:common'] },
  ];

  it.each(rarityCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Price Filters', () => {
  const priceCases: TranslationTestCase[] = [
    { input: 'cheap cards', expectedContains: ['usd<1'] },
    { input: 'budget cards', expectedContains: ['usd<5'] },
    { input: 'expensive cards', expectedContains: ['usd>50'] },
  ];

  it.each(priceCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Color Identity', () => {
  const colorCases: TranslationTestCase[] = [
    { input: 'mono red', expectedContains: ['id=r'] },
    { input: 'mono blue', expectedContains: ['id=u'] },
    { input: 'mono green', expectedContains: ['id=g'] },
    { input: 'mono black', expectedContains: ['id=b'] },
    { input: 'mono white', expectedContains: ['id=w'] },
    { input: 'rakdos cards', expectedContains: ['id=br'] },
    { input: 'simic cards', expectedContains: ['id=ug'] },
    { input: 'gruul cards', expectedContains: ['id=rg'] },
    { input: 'orzhov cards', expectedContains: ['id=wb'] },
    { input: 'azorius cards', expectedContains: ['id=wu'] },
    { input: 'dimir cards', expectedContains: ['id=ub'] },
    { input: 'golgari cards', expectedContains: ['id=bg'] },
    { input: 'boros cards', expectedContains: ['id=rw'] },
    { input: 'selesnya cards', expectedContains: ['id=gw'] },
    { input: 'izzet cards', expectedContains: ['id=ur'] },
    { input: 'colorless cards', expectedContains: ['c=c'] },
  ];

  it.each(colorCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});

describe('Translation Golden Tests - Special Mechanics', () => {
  const mechanicCases: TranslationTestCase[] = [
    { input: 'cards that win the game', expectedContains: ['you win the game'] },
    { input: 'cards with more than 5 reprints', expectedContains: ['reprints>5'] },
    { input: 'high edhrec rank', expectedContains: ['order:edhrec'] },
    { input: 'legendary creatures', expectedContains: ['t:legendary', 't:creature'] },
    { input: 'partner commanders', expectedContains: ['o:partner', 'is:commander'] },
    { input: 'commanders', expectedContains: ['is:commander'] },
    { input: 'planeswalkers', expectedContains: ['t:planeswalker'] },
    { input: 'equipment', expectedContains: ['t:equipment'] },
    { input: 'auras', expectedContains: ['t:aura'] },
  ];

  it.each(mechanicCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});
