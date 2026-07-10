import type { PipelineResult } from './types.ts';

type JsonHeaders = Record<string, string>;

type LogFields = {
  source: string;
  responseTimeMs: number;
  stageDurationsMs: {
    deterministic: number | null;
    cache: number | null;
    pattern: number | null;
    preTranslate: number | null;
    ai: number | null;
    fallback: number | null;
  };
};

export function buildPerfLogFields(
  stageDurationsMs: Partial<Record<string, number>>,
  source: string,
  responseTimeMs: number,
): LogFields {
  return {
    source,
    responseTimeMs,
    stageDurationsMs: {
      deterministic: stageDurationsMs.deterministic ?? null,
      cache: stageDurationsMs.cache ?? null,
      pattern: stageDurationsMs.pattern ?? null,
      preTranslate: stageDurationsMs.preTranslate ?? null,
      ai: stageDurationsMs.ai ?? null,
      fallback: stageDurationsMs.fallback ?? null,
    },
  };
}

export function createSearchSuccessResponse(
  originalQuery: string,
  payload: Record<string, unknown>,
  responseTimeMs: number,
  source: string,
  headers: JsonHeaders,
): Response {
  return new Response(
    JSON.stringify({
      originalQuery,
      ...payload,
      responseTimeMs,
      success: true,
      source,
    }),
    { headers },
  );
}

export function createSearchFallbackResponse(
  originalQuery: string,
  scryfallQuery: string,
  readable: string,
  assumptions: string[],
  responseTimeMs: number,
  source: string,
  headers: JsonHeaders,
  extra: Record<string, unknown> = {},
  confidence = 0.6,
): Response {
  return new Response(
    JSON.stringify({
      originalQuery,
      scryfallQuery,
      explanation: {
        readable,
        assumptions,
        confidence,
      },
      responseTimeMs,
      success: true,
      fallback: true,
      source,
      ...extra,
    }),
    { headers },
  );
}

export function createPipelineResponse(
  originalQuery: string,
  pipelineResult: PipelineResult,
  headers: JsonHeaders,
): Response {
  return new Response(
    JSON.stringify({
      originalQuery,
      scryfallQuery: pipelineResult.finalQuery,
      explanation: pipelineResult.explanation,
      intent: pipelineResult.intent,
      slots: pipelineResult.slots,
      concepts: pipelineResult.concepts.map((c) => ({
        id: c.conceptId,
        confidence: c.confidence,
        category: c.category,
      })),
      responseTimeMs: pipelineResult.responseTimeMs,
      success: true,
      source: pipelineResult.source,
      debug: pipelineResult.debug,
    }),
    { headers },
  );
}
