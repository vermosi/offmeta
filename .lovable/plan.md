

# Enhanced Security Testing Suite - Phase 2

## Overview

This plan adds the missing security tests and improvements identified in the review. It addresses 6 key gaps: CORS bypass prevention, error information leakage, prototype pollution, ReDoS attacks, config synchronization, and regression integration.

---

## Gap Analysis Summary

| Gap | Current State | Risk Level |
|-----|---------------|------------|
| CORS Bypass Testing | Basic tests exist in `edge-functions-shared.test.ts` but incomplete | Medium |
| Error Information Leakage | `sanitizeError` exists but untested | Medium |
| Prototype Pollution | Not tested | Low (JS engine protections) |
| ReDoS Attacks | Not tested | Medium |
| Security Headers Verification | Not tested | Medium |
| Config Synchronization | Duplicate values in two files | Low (maintenance) |
| Regression Integration | Security tests not exported | Low (CI coverage) |

---

## Implementation Plan

### 1. Create `src/lib/security/cors-bypass.test.ts` (~15 tests)

Tests for CORS policy enforcement:

| Test Case | Description |
|-----------|-------------|
| Blocks requests from unknown origins | Origin not in allowlist returns fallback |
| Echoes allowed origin correctly | Whitelisted origins reflected |
| Handles null/missing Origin header | Graceful fallback |
| Handles multiple allowed origins | Comma-separated list works |
| Security headers present | HSTS, X-Frame-Options, etc. verified |
| Preflight OPTIONS handled | Correct headers returned |
| Case-sensitivity in origins | Origins compared correctly |

### 2. Create `src/lib/security/error-leakage.test.ts` (~12 tests)

Tests for `sanitizeError` and error response safety:

| Test Case | Description |
|-----------|-------------|
| Removes file paths from errors | `/home/user/app/...` becomes `[PATH]` |
| Removes stack traces | No line numbers exposed |
| Handles non-Error objects | Strings, nulls, objects handled |
| Preserves safe error messages | User-friendly messages retained |
| Database errors sanitized | Connection strings removed |
| API key patterns scrubbed | Bearer tokens, keys masked |
| Nested error causes handled | Error.cause chain cleaned |

### 3. Create `src/lib/security/prototype-pollution.test.ts` (~10 tests)

Tests for object pollution prevention:

| Test Case | Description |
|-----------|-------------|
| Rejects `__proto__` in query params | Filters blocked |
| Rejects `constructor` manipulation | Pattern detected |
| Rejects `prototype` access | Pattern detected |
| Safe object merge operations | JSON.parse doesn't pollute |
| Handles nested pollution attempts | Deep object safety |

### 4. Create `src/lib/security/redos.test.ts` (~10 tests)

Tests for Regular Expression Denial of Service:

| Test Case | Description |
|-----------|-------------|
| Handles catastrophic backtracking patterns | `a{1,100}b{1,100}` variants |
| Query validation regex performance | Large inputs complete quickly |
| Timeout protection for regex operations | Long patterns don't hang |
| Known ReDoS payloads handled | `(a+)+$` style attacks |

### 5. Create `src/lib/security/timing-attacks.test.ts` (~8 tests)

Tests for timing-based vulnerabilities:

| Test Case | Description |
|-----------|-------------|
| API key comparison timing | Constant-time comparison needed |
| Auth token validation timing | No early exit on partial match |
| Rate limit bypass via timing | Window edge cases |

### 6. Update `src/lib/security/index.ts`

Add new utility functions and sync constants:

- Import CONFIG from semantic-search edge function path (via alias or direct reference)
- Add `sanitizeErrorForClient()` helper
- Add `safeTimingCompare()` for constant-time comparison
- Add `testRegexPerformance()` helper for ReDoS testing

### 7. Update `src/lib/regression/index.ts`

Re-export security test utilities for CI integration:

```typescript
// Add at the end of file
export * from '@/lib/security';
```

### 8. Add Security Constants Sync Check

Create `src/lib/security/config-sync.test.ts` (~5 tests):

- Verify `SECURITY_LIMITS.MAX_QUERY_LENGTH` matches `CONFIG.MAX_INPUT_QUERY_LENGTH`
- Verify rate limit values match between files
- Fail if values drift

---

## New Test Count Summary

| File | Tests |
|------|-------|
| cors-bypass.test.ts | 15 |
| error-leakage.test.ts | 12 |
| prototype-pollution.test.ts | 10 |
| redos.test.ts | 10 |
| timing-attacks.test.ts | 8 |
| config-sync.test.ts | 5 |
| **Total New** | **~60 tests** |

Combined with existing 183 tests: **~243 total security tests**

---

## Technical Details

### CORS Bypass Testing Strategy

```typescript
// Test pattern for CORS validation
describe('CORS Bypass Prevention', () => {
  it('rejects requests from unknown origins', () => {
    mockGet.mockReturnValue('https://offmeta.lovable.app');
    const req = new Request('http://localhost', {
      headers: { Origin: 'https://evil-site.com' },
    });
    const headers = getCorsHeaders(req);
    
    // Should NOT reflect evil origin
    expect(headers['Access-Control-Allow-Origin']).not.toBe('https://evil-site.com');
  });
});
```

### Error Sanitization Testing Strategy

```typescript
// Import the actual sanitizeError function for testing
// Since it's private in semantic-search, we'll create a shared version

function sanitizeErrorForClient(error: unknown): string {
  if (error instanceof Error) {
    return error.message
      .replace(/\/[^\s:]+/g, '[PATH]')        // Remove file paths
      .replace(/Bearer [^\s]+/g, '[TOKEN]')   // Remove auth tokens
      .replace(/:[0-9]+:[0-9]+/g, '')         // Remove line:col numbers
      .replace(/at .+\(.+\)/g, '[STACK]');    // Remove stack frames
  }
  return 'An error occurred';
}
```

### ReDoS Testing Strategy

```typescript
// Test that regex operations complete within timeout
it('handles catastrophic backtracking safely', () => {
  const maliciousInput = 'a'.repeat(100) + 'X';
  const startTime = performance.now();
  
  // Run the validation
  const result = validateScryfallQuery(maliciousInput);
  
  const duration = performance.now() - startTime;
  // Should complete in under 100ms, not hang
  expect(duration).toBeLessThan(100);
});
```

### Prototype Pollution Testing Strategy

```typescript
it('rejects __proto__ in query parameters', () => {
  const maliciousQuery = 't:creature __proto__:polluted';
  const result = validateScryfallQuery(maliciousQuery);
  
  // Should be flagged as unknown key or sanitized
  expect(result.sanitized).not.toContain('__proto__');
});
```

---

## Files to Create

1. `src/lib/security/cors-bypass.test.ts`
2. `src/lib/security/error-leakage.test.ts`
3. `src/lib/security/prototype-pollution.test.ts`
4. `src/lib/security/redos.test.ts`
5. `src/lib/security/timing-attacks.test.ts`
6. `src/lib/security/config-sync.test.ts`

## Files to Update

1. `src/lib/security/index.ts` - Add new utilities
2. `src/lib/regression/index.ts` - Export security utilities

---

## Success Criteria

1. All ~60 new security tests pass
2. No regressions in existing 600+ tests
3. Total security test count: ~243
4. ReDoS tests complete in under 5 seconds total
5. Config sync test fails if values drift between files
6. CI pipeline continues to pass

---

## Testing Approach

All tests are unit-level and mock external dependencies:
- No actual HTTP calls to edge functions
- Use Vitest's mocking for Deno globals
- Performance tests use `performance.now()` for timing
- Regex tests include timeout protection

