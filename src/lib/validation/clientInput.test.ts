import { describe, expect, it } from 'vitest';

import {
  validateAdminSeoQuery,
  validateEmailAddress,
  validatePasswordInput,
  validateSearchInput,
} from '@/lib/validation/clientInput';

describe('clientInput validation', () => {
  it('sanitizes and validates email addresses', () => {
    expect(validateEmailAddress(' USER@example.com ').success).toBe(true);
    expect(validateEmailAddress('bad-email').success).toBe(false);
  });

  it('validates password bounds', () => {
    expect(validatePasswordInput('secret1').success).toBe(true);
    expect(validatePasswordInput('123').success).toBe(false);
  });

  it('sanitizes search input without blocking long queries', () => {
    expect(validateSearchInput('   ').success).toBe(false);
    expect(validateSearchInput('a'.repeat(500)).success).toBe(true);
    expect(validateSearchInput('best mana rocks').success).toBe(true);
  });

  it('validates admin SEO queries', () => {
    expect(validateAdminSeoQuery('ab').success).toBe(false);
    expect(validateAdminSeoQuery('best mana rocks for commander').success).toBe(
      true,
    );
  });
});
