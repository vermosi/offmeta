import { getCardNameDiagnostics } from './card-name-lookup.ts';
import { sanitizeInputQuery } from './validation.ts';

type SearchRequestBody = {
  query?: unknown;
  filters?: unknown;
  debug?: unknown;
  useCache?: unknown;
  cacheSalt?: unknown;
  locale?: unknown;
};

type SearchRequestData = {
  query: string;
  filters: Record<string, unknown> | null;
  debug: unknown;
  useCache: boolean | undefined;
  cacheSalt: string | undefined;
  locale: string | undefined;
};

type JsonHeaders = Record<string, string>;

export function createDiagnosticsResponse(
  req: Request,
  jsonHeaders: JsonHeaders,
): Response | null {
  const url = new URL(req.url);
  if (
    req.method !== 'GET' ||
    url.searchParams.get('diagnostics') !== 'card-names'
  ) {
    return null;
  }

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      cardNameIndex: getCardNameDiagnostics(),
      serverTime: new Date().toISOString(),
    }),
    { headers: jsonHeaders },
  );
}

export function validateSearchRequest(
  requestBody: SearchRequestBody,
  jsonHeaders: JsonHeaders,
): { ok: true; data: SearchRequestData } | { ok: false; response: Response } {
  const query = requestBody.query;
  const filters = requestBody.filters;
  const debug = requestBody.debug;
  const useCache = requestBody.useCache;
  const cacheSalt = requestBody.cacheSalt;
  const locale = requestBody.locale;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Query is required', success: false }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  if (query.length > 500) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: 'Query too long (max 500 characters)',
          success: false,
        }),
        { status: 400, headers: jsonHeaders },
      ),
    };
  }

  const sanitizationResult = sanitizeInputQuery(query);
  if (!sanitizationResult.valid) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: sanitizationResult.reason || 'Invalid query format',
          success: false,
        }),
        { status: 400, headers: jsonHeaders },
      ),
    };
  }

  if (filters !== undefined && filters !== null) {
    if (typeof filters !== 'object' || Array.isArray(filters)) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: 'Invalid filters format', success: false }),
          {
            status: 400,
            headers: jsonHeaders,
          },
        ),
      };
    }
  }

  if (useCache !== undefined && typeof useCache !== 'boolean') {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid useCache type', success: false }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  if (cacheSalt !== undefined && typeof cacheSalt !== 'string') {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid cacheSalt type', success: false }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  if (locale !== undefined && typeof locale !== 'string') {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid locale type', success: false }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  return {
    ok: true,
    data: {
      query,
      filters: (filters ?? null) as Record<string, unknown> | null,
      debug,
      useCache,
      cacheSalt,
      locale,
    },
  };
}
