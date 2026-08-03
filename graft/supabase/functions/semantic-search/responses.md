# supabase\functions\semantic-search\responses.ts

- JsonHeaders · type · L3-L3 — type JsonHeaders = Record<string, string>;
- LogFields · type · L5-L16 — type LogFields = { source: string; responseTimeMs: number; stageDurationsMs: { deterministic: number | null; cache: number | null; pattern: number | null; preTranslate: number | null; ai: number | null; fallback: number | null; }; };
- buildPerfLogFields · function · L18-L35 — function buildPerfLogFields( stageDurationsMs: Partial<Record<string, number>>, source: string, responseTimeMs: number, ): LogFields
- createSearchSuccessResponse · function · L37-L54 — function createSearchSuccessResponse( originalQuery: string, payload: Record<string, unknown>, responseTimeMs: number, source: string, headers: JsonHeaders, ): Response
- createSearchFallbackResponse · function · L56-L84 — function createSearchFallbackResponse( originalQuery: string, scryfallQuery: string, readable: string, assumptions: string[], responseTimeMs: number, source: string, headers: JsonHeaders, extra: Record<string, unknown> = {}, confidence = 0.6, ): Response
- createPipelineResponse · function · L86-L110 — function createPipelineResponse( originalQuery: string, pipelineResult: PipelineResult, headers: JsonHeaders, ): Response
