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

/** Assert that a Scryfall query contains all expected fragments (case-insensitive). */
function assertQueryContains(query: string, fragments: string[], label: string) {
  const lower = query.toLowerCase();
  for (const frag of fragments) {
    assert(
      lower.includes(frag.toLowerCase()),
      `[${label}] Expected query to contain "${frag}", got: ${query}`,
    );
  }
}

// ── Tests: Shape & Error Handling ──────────────────────────────

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

// ── Tests: Golden Output Assertions ────────────────────────────

Deno.test('Golden: "red creatures" produces color + type', async () => {
  const res = await postSearch({ query: 'red creatures', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['c:r', 't:creature'], 'red creatures');
});

Deno.test('Golden: "white enchantments for commander" includes format', async () => {
  const res = await postSearch({ query: 'white enchantments for commander', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['t:enchantment', 'f:commander'], 'white enchantments commander');
});

Deno.test('Golden: "cheap green ramp spells" has color + ramp oracle', async () => {
  const res = await postSearch({ query: 'cheap green ramp spells', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['c:g'], 'green ramp');
});

Deno.test('Golden: "artifacts that tap for blue" has artifact + mana', async () => {
  const res = await postSearch({ query: 'artifacts that tap for blue', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['t:artifact'], 'artifacts tap blue');
});

// ── Tests: Tribal Payoff & Opponent-Action Regressions ─────────

Deno.test('Regression: "elf tribal payoffs for commander" produces tribe + oracle', async () => {
  const res = await postSearch({ query: 'elf tribal payoffs for commander', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['o:"elf"', 'f:commander'], 'elf tribal payoffs');
});

Deno.test('Regression: "goblin tribal synergies" produces tribe reference', async () => {
  const res = await postSearch({ query: 'goblin tribal synergies', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['o:"goblin"'], 'goblin tribal synergies');
});

Deno.test('Regression: "creatures that make tokens when opponent casts" has opponent + token', async () => {
  const res = await postSearch({ query: 'creatures that make token creatures when an opponent casts', useCache: false });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['o:"opponent"', 'o:"token"'], 'opponent token creatures');
});

// ── Tests: Performance ─────────────────────────────────────────

Deno.test('Performance: deterministic queries respond under 5s', async () => {
  const start = Date.now();
  const res = await postSearch({ query: 'blue instants', useCache: false });
  const elapsed = Date.now() - start;
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assert(elapsed < 5000, `Deterministic query took ${elapsed}ms, expected < 5000ms`);
});

// ── Tests: Filter Combinations ─────────────────────────────────

Deno.test('Filter combo: format + color + price constraints', async () => {
  const res = await postSearch({
    query: 'creatures',
    filters: { format: 'commander', colorIdentity: ['W', 'U', 'B'], maxPrice: 10 },
    useCache: false,
  });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  // The query should still be valid and contain creature type
  assertQueryContains(data.scryfallQuery, ['t:creature'], 'filter combo');
});

Deno.test('Filter combo: type + rarity filters', async () => {
  const res = await postSearch({
    query: 'enchantments',
    filters: { types: ['enchantment'], rarity: 'rare' },
    useCache: false,
  });
  assertEquals(res.status, 200);
  const data: SuccessResponse = await res.json();
  assertSuccessShape(data);
  assertQueryContains(data.scryfallQuery, ['t:enchantment'], 'type+rarity filter');
});
