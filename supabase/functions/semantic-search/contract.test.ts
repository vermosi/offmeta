/**
 * Contract tests for the semantic-search edge function.
 * Validates request/response schemas without testing internal logic.
 */

import {
  assertEquals,
  assertExists,
  assert,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

// Read env vars directly — the test runner provides them
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/semantic-search`;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

// ── Response shape contracts ────────────────────────────────────

interface SuccessResponse {
  originalQuery: string;
  scryfallQuery: string;
  explanation: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  success: boolean;
  source: string;
  responseTimeMs?: number;
}

interface ErrorResponse {
  error: string;
  success: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────

async function postSearch(body: Record<string, unknown>): Promise<Response> {
  return await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function assertSuccessShape(data: SuccessResponse) {
  assertExists(data.originalQuery, 'originalQuery must exist');
  assertExists(data.scryfallQuery, 'scryfallQuery must exist');
  assertExists(data.explanation, 'explanation must exist');
  assertEquals(typeof data.explanation.readable, 'string');
  assert(Array.isArray(data.explanation.assumptions));
  assertEquals(typeof data.explanation.confidence, 'number');
  assert(
    data.explanation.confidence >= 0 && data.explanation.confidence <= 1,
    `confidence out of range: ${data.explanation.confidence}`,
  );
  assertEquals(data.success, true);
  assertExists(data.source, 'source field must exist');
  assert(
    ['deterministic', 'ai', 'cache', 'pattern_match', 'fallback', 'forced_fallback'].includes(
      data.source,
    ),
    `unexpected source: ${data.source}`,
  );
}

function assertErrorShape(data: ErrorResponse) {
  assertExists(data.error, 'error message must exist');
  assertEquals(typeof data.error, 'string');
  assertEquals(data.success, false);
}

// ── Tests ───────────────────────────────────────────────────────

Deno.test('OPTIONS returns CORS headers', async () => {
  const res = await fetch(FUNCTION_URL, { method: 'OPTIONS', headers });
  assertEquals(res.status, 200);
  assertExists(res.headers.get('access-control-allow-origin'));
  await res.text(); // consume body
});

Deno.test('POST with valid query returns success shape', async () => {
  const res = await postSearch({ query: 'red creatures', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertEquals(data.originalQuery, 'red creatures');
});

Deno.test('POST with empty query returns 400', async () => {
  const res = await postSearch({ query: '' });
  assertEquals(res.status, 400);
  const data: ErrorResponse = await res.json();
  assertErrorShape(data);
});

Deno.test('POST with missing query returns 400', async () => {
  const res = await postSearch({});
  assertEquals(res.status, 400);
  const data: ErrorResponse = await res.json();
  assertErrorShape(data);
});

Deno.test('POST with oversized query returns 400', async () => {
  const longQuery = 'a'.repeat(501);
  const res = await postSearch({ query: longQuery });
  assertEquals(res.status, 400);
  const data: ErrorResponse = await res.json();
  assertErrorShape(data);
});

Deno.test('POST with invalid JSON body returns 400', async () => {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: 'not json',
  });
  assertEquals(res.status, 400);
  const data: ErrorResponse = await res.json();
  assertErrorShape(data);
});

Deno.test('POST with invalid filters returns 400', async () => {
  const res = await postSearch({ query: 'goblins', filters: 'invalid' });
  assertEquals(res.status, 400);
  const data: ErrorResponse = await res.json();
  assertErrorShape(data);
});

Deno.test('Deterministic path returns correct source', async () => {
  // Simple color+type query should be deterministic
  const res = await postSearch({ query: 'white enchantments', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  // Source should be deterministic for simple queries (may vary if cached)
  assert(
    ['deterministic', 'cache', 'pattern_match'].includes(data.source),
    `expected deterministic-like source, got: ${data.source}`,
  );
});

Deno.test('Response includes x-request-id header', async () => {
  const res = await postSearch({ query: 'forests', useCache: false });
  assertExists(res.headers.get('x-request-id'));
  await res.json(); // consume body
});

Deno.test('POST with valid filters succeeds', async () => {
  const res = await postSearch({
    query: 'creatures',
    filters: { format: 'commander', colorIdentity: ['R', 'G'], maxCmc: 5 },
    useCache: false,
  });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
});
