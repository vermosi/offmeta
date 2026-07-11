import { describe, it } from 'vitest';
import type { TranslationTestCase } from './translation-golden.shared';
import { expectGoldenCoverage } from './translation-golden.shared';

describe('Translation Golden Tests - Tribal Types', () => {
  const tribalCases: TranslationTestCase[] = [
    { input: 'elves', expectedContains: ['t:elf'] },
    { input: 'elf tribal', expectedContains: ['t:elf'] },
    { input: 'goblins', expectedContains: ['t:goblin'] },
    { input: 'goblin tribal', expectedContains: ['t:goblin'] },
    { input: 'zombies', expectedContains: ['t:zombie'] },
    { input: 'vampires', expectedContains: ['t:vampire'] },
    { input: 'dragons', expectedContains: ['t:dragon'] },
    { input: 'merfolk', expectedContains: ['t:merfolk'] },
    { input: 'humans', expectedContains: ['t:human'] },
    { input: 'angels', expectedContains: ['t:angel'] },
    { input: 'demons', expectedContains: ['t:demon'] },
    { input: 'wizards', expectedContains: ['t:wizard'] },
    { input: 'soldiers', expectedContains: ['t:soldier'] },
    { input: 'knights', expectedContains: ['t:knight'] },
    { input: 'changelings', expectedContains: ['t:changeling'] },
  ];

  it.each(tribalCases)('should translate "$input" correctly', (testCase) => {
    expectGoldenCoverage(testCase);
  });
});
