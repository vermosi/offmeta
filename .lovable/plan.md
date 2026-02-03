
# Security Testing Suite Plan

## Overview

This plan creates a comprehensive security testing suite to protect OffMeta from abuse. The suite will test rate limiting, input validation, authentication, injection prevention, and denial-of-service protections across both frontend and backend.

---

## Current State Analysis

### Existing Security Measures
- **Rate limiting**: IP-based (30/min), session-based (20/min), global (1000/min)
- **Input sanitization**: Query length limits (500 chars), spam detection, parameter limits
- **Authentication**: JWT validation, API key verification
- **Circuit breaker**: AI gateway protection with 5-failure threshold
- **CORS**: Origin-restricted headers
- **Error sanitization**: Path stripping from error messages

### Existing Test Coverage
- `abuse-prevention.test.ts` - Basic retry loop prevention (12 tests)
- `rate-limiting.test.ts` - Session rate limiting logic (7 tests)
- `edge-validation.test.ts` - Spam prevention, syntax validation (15 tests)

### Gaps Identified
1. No comprehensive injection testing (SQL, XSS, command)
2. No authentication bypass testing
3. No edge function endpoint abuse testing
4. No concurrent request handling tests
5. No payload size attack testing

---

## New Test Files Structure

```text
src/lib/security/
├── index.ts                     # Exports all security utilities
├── injection.test.ts            # Injection attack prevention tests
├── authentication.test.ts       # Auth bypass and token tests
├── rate-limiting.test.ts        # Enhanced rate limit tests
├── payload-attacks.test.ts      # Oversized/malformed payload tests
├── concurrent-abuse.test.ts     # Concurrent request abuse tests
└── input-sanitization.test.ts   # Comprehensive input validation tests
```

---

## Test Categories & Coverage

### 1. Injection Attack Prevention (`injection.test.ts`)
Tests for SQL, NoSQL, XSS, and command injection attempts:

| Test Case | Attack Vector | Expected Result |
|-----------|--------------|-----------------|
| SQL injection in query | `'; DROP TABLE users; --` | Rejected/sanitized |
| NoSQL injection | `{$gt: ""}` | Rejected |
| XSS in query | `<script>alert(1)</script>` | HTML stripped |
| XSS in feedback | `<img onerror=alert(1)>` | Sanitized |
| Unicode bypass | `%00%27` | Normalized |
| Template injection | `{{constructor.constructor}}` | Safe |

### 2. Authentication Testing (`authentication.test.ts`)
Tests for auth bypass and token manipulation:

| Test Case | Attack Vector | Expected Result |
|-----------|--------------|-----------------|
| Missing auth header | No header | 401 response |
| Invalid JWT format | `Bearer abc.def` | 401 response |
| Expired token | Past exp claim | 401 response |
| Modified payload | Altered role claim | 401 response |
| Replay old token | Reused valid token | Depends on exp |

### 3. Rate Limiting (`rate-limiting.test.ts`)
Enhanced tests for rate limit bypasses:

| Test Case | Attack Vector | Expected Result |
|-----------|--------------|-----------------|
| IP header spoofing | X-Forwarded-For manipulation | First IP used |
| Session rotation | New session per request | IP limit applies |
| Burst attacks | 100 requests in 1 second | Limited after threshold |
| Distributed IPs | Round-robin IPs | Global limit applies |
| Reset timing | Wait and retry | Resets correctly |

### 4. Payload Attacks (`payload-attacks.test.ts`)
Tests for malformed and oversized payloads:

| Test Case | Attack Vector | Expected Result |
|-----------|--------------|-----------------|
| Oversized query | 10KB query string | Rejected (>500 chars) |
| Nested JSON bomb | Deeply nested object | Rejected |
| Circular references | Recursive structure | Error handled |
| Invalid UTF-8 | Malformed bytes | Rejected |
| Empty body | No JSON | 400 response |
| Array instead of object | `[]` as body | 400 response |

### 5. Concurrent Abuse (`concurrent-abuse.test.ts`)
Tests for race conditions and parallel abuse:

| Test Case | Attack Vector | Expected Result |
|-----------|--------------|-----------------|
| Parallel rate limit bypass | 50 simultaneous requests | All counted |
| Cache stampede | Same query 100x | Cache works |
| Session exhaustion | Create 1000 sessions | Memory bounded |
| Request queue overflow | Exceed queue size | Rejected (50+) |

### 6. Input Sanitization (`input-sanitization.test.ts`)
Comprehensive validation tests:

| Test Case | Attack Vector | Expected Result |
|-----------|--------------|-----------------|
| Repetitive chars | `aaaaaaaaaa...` | Rejected as spam |
| Operator spam | `t:t:t:t:t:` | Malformed error |
| Special char flood | `$%^&*()@#!!` | Rejected |
| Zero-width chars | `t:\u200B:creature` | Stripped |
| Control characters | `t:creature\x00` | Stripped |
| Unicode normalization | `ｔ：ｃｒｅａｔｕｒｅ` | Normalized |

---

## Implementation Details

### File 1: `src/lib/security/index.ts`
Central exports for security testing utilities and constants.

### File 2: `src/lib/security/injection.test.ts`
~25 tests covering injection prevention patterns.

### File 3: `src/lib/security/authentication.test.ts`
~15 tests for authentication boundary conditions.

### File 4: `src/lib/security/rate-limiting.test.ts`
~20 tests for rate limit edge cases.

### File 5: `src/lib/security/payload-attacks.test.ts`
~15 tests for malformed payload handling.

### File 6: `src/lib/security/concurrent-abuse.test.ts`
~10 tests for parallel request abuse.

### File 7: `src/lib/security/input-sanitization.test.ts`
~30 tests for comprehensive input validation.

### Update: `src/lib/regression/index.ts`
Re-export security tests for CI integration.

---

## Security Test Utilities

Shared helpers to be created:

```typescript
// Security test builders
buildMaliciousQuery(type: 'sql' | 'xss' | 'nosql'): string
buildInvalidToken(type: 'expired' | 'malformed' | 'modified'): string
buildOversizedPayload(sizeKb: number): object
simulateConcurrentRequests(count: number, fn: () => Promise): Promise

// Validation assertion helpers
expectSanitized(input: string, output: string): void
expectRejected(result: ValidationResult): void
expectRateLimited(response: MockResponse): void
```

---

## CI Integration

Tests will run as part of the existing CI pipeline:

```yaml
# Already configured in .github/workflows/ci.yml
- name: Test
  run: npm run test -- --coverage
```

Coverage thresholds will be enforced for security tests.

---

## Test Count Summary

| Category | New Tests |
|----------|-----------|
| Injection Prevention | 25 |
| Authentication | 15 |
| Rate Limiting | 20 |
| Payload Attacks | 15 |
| Concurrent Abuse | 10 |
| Input Sanitization | 30 |
| **Total** | **~115 new tests** |

---

## Success Criteria

1. All 115+ security tests pass
2. No regressions in existing 600+ tests
3. Coverage maintained above thresholds
4. Tests run in under 30 seconds
5. Clear failure messages for debugging

---

## Technical Notes

- Tests use Vitest (existing framework)
- Mock functions where edge function calls needed
- Use existing validation functions from `@/lib/scryfall/query`
- Tests are unit-level (no network calls)
- Security utilities extracted for reuse in production code
