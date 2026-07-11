export type SearchRequestBody = {
  query?: unknown;
  filters?: unknown;
  debug?: unknown;
  useCache?: unknown;
  cacheSalt?: unknown;
  locale?: unknown;
};

export type SearchRequestData = {
  query: string;
  filters: Record<string, unknown> | null;
  debug: unknown;
  useCache: boolean | undefined;
  cacheSalt: string | undefined;
  locale: string | undefined;
};

type JsonHeaders = Record<string, string>;

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
      response: new Response(JSON.stringify({ error: 'Query is required', success: false }), {
        status: 400,
        headers: jsonHeaders,
      }),
    };
  }

  if (query.length > 500) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Query too long (max 500 characters)', success: false }), {
        status: 400,
        headers: jsonHeaders,
      }),
    };
  }

  if (filters !== undefined && filters !== null) {
    if (typeof filters !== 'object' || Array.isArray(filters)) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: 'Invalid filters format', success: false }), {
          status: 400,
          headers: jsonHeaders,
        }),
      };
    }
  }

  if (useCache !== undefined && typeof useCache !== 'boolean') {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Invalid useCache type', success: false }), {
        status: 400,
        headers: jsonHeaders,
      }),
    };
  }

  if (cacheSalt !== undefined && typeof cacheSalt !== 'string') {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Invalid cacheSalt type', success: false }), {
        status: 400,
        headers: jsonHeaders,
      }),
    };
  }

  if (locale !== undefined && typeof locale !== 'string') {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Invalid locale type', success: false }), {
        status: 400,
        headers: jsonHeaders,
      }),
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

export interface ParsedAIContent {
  scryfallQuery: string;
  explanation?: string;
  confidence?: number;
}

export function createSemanticSuccessResponse(payload: {
  originalQuery: string;
  scryfallQuery: string;
  explanation: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  responseTimeMs: number;
  source: string;
  success?: boolean;
  fallback?: boolean;
  intent?: Record<string, unknown>;
}): Response {
  return new Response(JSON.stringify({ ...payload, success: payload.success ?? true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createSemanticErrorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message, success: false }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function parseAIContent(rawContent: string): ParsedAIContent {
  let scryfallQuery = rawContent.trim();
  let explanationText: string | undefined;
  let confidence: number | undefined;

  if (scryfallQuery.includes('```')) {
    const match = scryfallQuery.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]) as Record<string, unknown>;
        if (typeof parsed.scryfallQuery === 'string') scryfallQuery = parsed.scryfallQuery;
        if (typeof parsed.explanation === 'string') explanationText = parsed.explanation;
        if (typeof parsed.confidence === 'number') confidence = parsed.confidence;
      } catch {
        scryfallQuery = match[1].trim();
      }
    }
  }

  return { scryfallQuery, explanation: explanationText, confidence };
}
