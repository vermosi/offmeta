/**
 * offmeta-api — Public, read-only semantic data layer for Magic cards.
 *
 * Phase 8 of the OffMeta roadmap: expose the deterministic ontology
 * (roles / methods / problems / characteristics / approaches) so other tools
 * can consume the semantic layer Scryfall does not provide.
 *
 * Endpoints (all GET, all public, all rate limited):
 *   /v1/concepts                    → concept directory
 *   /v1/cards?name=A&name=B         → semantic profiles for named cards
 *   /v1/search?concepts=a,b&colors=WU&match=any&limit=40
 *   /v1/openapi.json                → machine-readable schema
 *
 * @module functions/offmeta-api
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, resolveRateLimitKey } from '../_shared/rateLimit.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { buildOpenApiDocument } from './openapi.ts';

const log = createLogger('offmeta-api');

/** Public API budget: generous enough to browse, tight enough to survive abuse. */
const IP_LIMIT = 60;
const GLOBAL_LIMIT = 3000;
const WINDOW_MS = 60_000;

/** Responses are deterministic and change at most once a day. */
const CACHE_CONTROL = 'public, max-age=300, s-maxage=3600';

const COLOR_LETTERS = new Set(['W', 'U', 'B', 'R', 'G']);

function json(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...extra,
    },
  });
}

/** Strip the platform prefix so `/functions/v1/offmeta-api/v1/cards` → `/v1/cards`. */
export function normalizePath(pathname: string): string {
  const marker = '/offmeta-api';
  const index = pathname.indexOf(marker);
  const rest = index >= 0 ? pathname.slice(index + marker.length) : pathname;
  return rest.replace(/\/+$/, '') || '/';
}

/** Parse repeated or comma-separated query params into a clean list. */
export function parseList(
  params: URLSearchParams,
  key: string,
  max: number,
): string[] {
  const raw = params.getAll(key).flatMap((value) => value.split(','));
  const cleaned = raw.map((value) => value.trim()).filter((value) => value.length > 0);
  return Array.from(new Set(cleaned)).slice(0, max);
}

/** Accept `WU`, `W,U` or repeated `colors` params; ignore anything else. */
export function parseColors(params: URLSearchParams): string[] {
  const tokens = parseList(params, 'colors', 10).flatMap((value) =>
    value.length > 1 && !value.includes('-') ? value.split('') : [value],
  );
  return Array.from(
    new Set(tokens.map((token) => token.toUpperCase()).filter((token) => COLOR_LETTERS.has(token))),
  );
}

serve(
  withLogging('offmeta-api', async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (req.method !== 'GET') {
      return json({ error: 'Method not allowed. This API is read-only.' }, 405, corsHeaders);
    }

    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    if (path === '/v1/openapi.json') {
      return json(buildOpenApiDocument(url.origin), 200, corsHeaders, {
        'Cache-Control': CACHE_CONTROL,
      });
    }

    const bucketKey = await resolveRateLimitKey(req);
    const limit = await checkRateLimit(
      `offmeta-api:${bucketKey}`,
      undefined,
      IP_LIMIT,
      GLOBAL_LIMIT,
      WINDOW_MS,
      { failOpen: true },
    );
    if (!limit.allowed) {
      return json({ error: 'Too many requests.' }, 429, corsHeaders, {
        'Retry-After': String(limit.retryAfter ?? 60),
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Not configured' }, 500, corsHeaders);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
      if (path === '/v1/concepts') {
        const { data, error } = await supabase.rpc('list_ontology_concepts');
        if (error) throw new Error(error.message);
        return json(
          { version: 'v1', count: data?.length ?? 0, concepts: data ?? [] },
          200,
          corsHeaders,
          { 'Cache-Control': CACHE_CONTROL },
        );
      }

      if (path === '/v1/cards') {
        const names = parseList(url.searchParams, 'name', 50);
        if (names.length === 0) {
          return json(
            { error: 'At least one `name` parameter is required.' },
            400,
            corsHeaders,
          );
        }
        const { data, error } = await supabase.rpc('get_card_profiles', {
          p_names: names,
        });
        if (error) throw new Error(error.message);
        const cards = (data as unknown[]) ?? [];
        const found = new Set(
          cards.map((card) => String((card as { name: string }).name).toLowerCase()),
        );
        return json(
          {
            version: 'v1',
            requested: names.length,
            cards,
            unresolved: names.filter((name) => !found.has(name.toLowerCase())),
          },
          200,
          corsHeaders,
          { 'Cache-Control': CACHE_CONTROL },
        );
      }

      if (path === '/v1/search') {
        const concepts = parseList(url.searchParams, 'concepts', 12);
        if (concepts.length === 0) {
          return json(
            { error: 'The `concepts` parameter is required. See /v1/concepts.' },
            400,
            corsHeaders,
          );
        }
        const colors = parseColors(url.searchParams);
        const match = url.searchParams.get('match') === 'all' ? 'all' : 'any';
        const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '40', 10);
        const resultLimit = Number.isFinite(rawLimit)
          ? Math.min(Math.max(rawLimit, 1), 200)
          : 40;

        const { data, error } = await supabase.rpc('search_card_profiles', {
          p_tag_keys: concepts,
          p_colors: colors.length > 0 ? colors : null,
          p_match: match,
          p_limit: resultLimit,
        });
        if (error) throw new Error(error.message);
        return json(
          {
            version: 'v1',
            query: { concepts, colors, match, limit: resultLimit },
            count: data?.length ?? 0,
            cards: data ?? [],
          },
          200,
          corsHeaders,
          { 'Cache-Control': CACHE_CONTROL },
        );
      }

      if (path === '/' || path === '/v1') {
        return json(
          {
            name: 'OffMeta Semantic API',
            version: 'v1',
            description:
              'Functional metadata for Magic: The Gathering cards — roles, methods, problems addressed, characteristics and strategic approaches.',
            endpoints: ['/v1/concepts', '/v1/cards', '/v1/search', '/v1/openapi.json'],
            docs: 'https://offmeta.app/api',
            attribution: 'Card data © Scryfall. Semantic layer © OffMeta.',
          },
          200,
          corsHeaders,
          { 'Cache-Control': CACHE_CONTROL },
        );
      }

      return json({ error: `Unknown endpoint: ${path}` }, 404, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      log.error('request_failed', { path, message });
      return json({ error: 'Internal error' }, 500, corsHeaders);
    }
  }),
);
