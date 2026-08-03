# src\lib\search\semantic-contract.ts

- SearchRequestBody · type · L1-L8 — type SearchRequestBody = { query?: unknown; filters?: unknown; debug?: unknown; useCache?: unknown; cacheSalt?: unknown; locale?: unknown; };
- SearchRequestData · type · L10-L17 — type SearchRequestData = { query: string; filters: Record<string, unknown> | null; debug: unknown; useCache: boolean | undefined; cacheSalt: string | undefined; locale: string | undefined; };
- JsonHeaders · type · L19-L19 — type JsonHeaders = Record<string, string>;
- validateSearchRequest · function · L21-L105 — function validateSearchRequest( requestBody: SearchRequestBody, jsonHeaders: JsonHeaders, ): { ok: true; data: SearchRequestData } | { ok: false; response: Response }
- ParsedAIContent · interface · L107-L111 — interface ParsedAIContent
- createSemanticSuccessResponse · function · L113-L130 — function createSemanticSuccessResponse(payload: { originalQuery: string; scryfallQuery: string; explanation: { readable: string; assumptions: string[]; confidence: number; }; responseTimeMs: number; source: string; success?: boolean; fallback?: boolean; intent?: Record<string, unknown>; }): Response
- createSemanticErrorResponse · function · L132-L137 — function createSemanticErrorResponse(message: string, status = 400): Response
- parseAIContent · function · L139-L159 — function parseAIContent(rawContent: string): ParsedAIContent
