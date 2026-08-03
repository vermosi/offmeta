# supabase\functions\semantic-search\request.ts

- SearchRequestBody · type · L5-L12 — type SearchRequestBody = { query?: unknown; filters?: unknown; debug?: unknown; useCache?: unknown; cacheSalt?: unknown; locale?: unknown; };
- SearchRequestData · type · L14-L21 — type SearchRequestData = { query: string; filters: Record<string, unknown> | null; debug: unknown; useCache: boolean | undefined; cacheSalt: string | undefined; locale: string | undefined; };
- JsonHeaders · type · L23-L23 — type JsonHeaders = Record<string, string>;
- createDiagnosticsResponse · function · L25-L53 — function createDiagnosticsResponse( req: Request, jsonHeaders: JsonHeaders, ): Response | null
- validateSearchRequest · function · L55-L171 — function validateSearchRequest( requestBody: SearchRequestBody, jsonHeaders: JsonHeaders, ): { ok: true; data: SearchRequestData } | { ok: false; response: Response }
