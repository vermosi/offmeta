import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

type AuthLevel =
  | 'public'
  | 'anon-authenticated'
  | 'user-authenticated'
  | 'service/admin-only';

const SUPABASE_URL =
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('VITE_SUPABASE_URL') ??
  'https://nxmzyykkzwomkcentctt.supabase.co';

const FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

const authMatrix: Record<string, AuthLevel> = {
  'admin-analytics': 'service/admin-only',
  'auto-generate-seo-pages': 'service/admin-only',
  'batch-generate-seo-pages': 'service/admin-only',
  'bulk-data-sync': 'anon-authenticated',
  'card-meta-context': 'anon-authenticated',
  'card-recommendations': 'anon-authenticated',
  'card-similarity': 'anon-authenticated',
  'card-sync': 'anon-authenticated',
  'cleanup-logs': 'service/admin-only',
  'combo-search': 'anon-authenticated',
  'compute-cooccurrence': 'service/admin-only',
  'deck-categorize': 'anon-authenticated',
  'deck-critique': 'anon-authenticated',
  'deck-ideas': 'anon-authenticated',
  'deck-recommendations': 'anon-authenticated',
  'deck-suggest': 'anon-authenticated',
  'detect-archetypes': 'anon-authenticated',
  'fetch-moxfield-deck': 'anon-authenticated',
  'fix-zero-results': 'anon-authenticated',
  'generate-patterns': 'service/admin-only',
  'generate-retention-triggers': 'service/admin-only',
  'generate-seo-page': 'service/admin-only',
  'get-affiliate-config': 'public',
  'mtgjson-import': 'anon-authenticated',
  prerender: 'public',
  'price-snapshot': 'service/admin-only',
  'process-email-queue': 'service/admin-only',
  'process-feedback': 'user-authenticated',
  'promote-searches': 'anon-authenticated',
  'semantic-search': 'anon-authenticated',
  sitemap: 'public',
  'spicerack-import': 'service/admin-only',
  'sync-card-names': 'anon-authenticated',
  'warmup-cache': 'service/admin-only',
};

const protectedEndpoints = Object.entries(authMatrix)
  .filter(([, level]) => level !== 'public')
  .map(([name]) => name);

const publicEndpoints = Object.entries(authMatrix)
  .filter(([, level]) => level === 'public')
  .map(([name]) => name);

async function callEndpoint(
  endpoint: string,
  authorizationHeader?: string,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }

  return await fetch(`${FUNCTION_BASE}/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
}

Deno.test(
  'protected endpoints reject requests without Authorization header',
  async () => {
    for (const endpoint of protectedEndpoints) {
      const response = await callEndpoint(endpoint);
      const isUnauthorized = response.status === 401 || response.status === 403;

      assertEquals(
        isUnauthorized,
        true,
        `Expected ${endpoint} to reject unauthenticated requests, got ${response.status}`,
      );
    }
  },
);

Deno.test('protected endpoints reject invalid bearer tokens', async () => {
  for (const endpoint of protectedEndpoints) {
    const response = await callEndpoint(endpoint, 'Bearer not-a-valid-jwt');
    const isUnauthorized = response.status === 401 || response.status === 403;

    assertEquals(
      isUnauthorized,
      true,
      `Expected ${endpoint} to reject invalid tokens, got ${response.status}`,
    );
  }
});

Deno.test(
  'public endpoints remain reachable without Authorization header',
  async () => {
    for (const endpoint of publicEndpoints) {
      const response = await callEndpoint(endpoint);

      assertEquals(
        response.status === 401,
        false,
        `Expected ${endpoint} to remain public, got ${response.status}`,
      );
    }
  },
);
