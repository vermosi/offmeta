import { expect } from 'vitest';

export interface TranslationTestCase {
  input: string;
  expectedContains: string[];
  shouldNotContain?: string[];
  description?: string;
}

export function validateTranslation(
  translated: string,
  expectedContains: string[],
  shouldNotContain?: string[],
): { valid: boolean; missing: string[]; forbidden: string[] } {
  const lower = translated.toLowerCase();
  const missing = expectedContains.filter(
    (expected) => !lower.includes(expected.toLowerCase()),
  );
  const forbidden = (shouldNotContain || []).filter((notExpected) =>
    lower.includes(notExpected.toLowerCase()),
  );
  return {
    valid: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
  };
}

export function expectGoldenCoverage(testCase: TranslationTestCase): void {
  expect(testCase.expectedContains.length).toBeGreaterThan(0);
}
