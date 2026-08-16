/**
 * Response guard: runs the runtime Tagger validator over the final
 * `scryfallQuery` of every successful search response, regardless of which
 * stage produced it (deterministic, cache, pattern, AI, fallback).
 *
 * Wrapping the response instead of every return site keeps a single
 * enforcement point, so a new stage can never bypass the check.
 *
 * @module semantic-search/tag-guard
 */

import { validateGeneratedTags } from '../_shared/tagRuntimeValidator.ts';

type LogFn = (event: string, payload: Record<string, unknown>) => void;

interface SearchPayload {
  scryfallQuery?: unknown;
  explanation?: {
    readable?: string;
    assumptions?: unknown;
    confidence?: number;
  };
  warnings?: unknown;
  success?: boolean;
  [key: string]: unknown;
}

export async function enforceSupportedTags(
  response: Response,
  logWarn: LogFn,
  options: { requestId?: string } = {},
): Promise<Response> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json') || response.status >= 400) {
    return response;
  }

  let payload: SearchPayload;
  const raw = await response.clone().text();
  try {
    payload = JSON.parse(raw) as SearchPayload;
  } catch {
    return response;
  }

  /**
   * Stamp the server request id so the browser can attach it to its terminal
   * `search_outcome` event — that id is the only join key between the
   * translation row and what the user actually saw.
   */
  const withRequestId = (body: SearchPayload): Response =>
    options.requestId
      ? new Response(JSON.stringify({ ...body, requestId: options.requestId }), {
          status: response.status,
          headers: response.headers,
        })
      : response;

  const scryfallQuery = payload.scryfallQuery;
  if (typeof scryfallQuery !== 'string' || !scryfallQuery.trim()) {
    return withRequestId(payload);
  }

  let validation;
  try {
    validation = await validateGeneratedTags(scryfallQuery);
  } catch (error) {
    logWarn('tag_runtime_validation_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return withRequestId(payload);
  }
  if (validation.valid) return withRequestId(payload);

  logWarn('unsupported_tags_repaired', {
    original: scryfallQuery.slice(0, 200),
    repaired: validation.query.slice(0, 200),
    removedTags: validation.removedTags,
    replacedTags: validation.replacedTags,
  });

  const assumptions = Array.isArray(payload.explanation?.assumptions)
    ? (payload.explanation?.assumptions as unknown[]).filter(
        (item): item is string => typeof item === 'string',
      )
    : [];
  const existingWarnings = Array.isArray(payload.warnings)
    ? (payload.warnings as unknown[]).filter(
        (item): item is string => typeof item === 'string',
      )
    : [];

  const patched: SearchPayload = {
    ...payload,
    scryfallQuery: validation.query,
    warnings: [...existingWarnings, ...validation.warnings],
    tagValidation: {
      removedTags: validation.removedTags,
      replacedTags: validation.replacedTags,
    },
  };

  if (payload.explanation) {
    patched.explanation = {
      ...payload.explanation,
      assumptions: [...assumptions, ...validation.warnings],
    };
  }

  return new Response(
    JSON.stringify(
      options.requestId ? { ...patched, requestId: options.requestId } : patched,
    ),
    {
      status: response.status,
      headers: response.headers,
    },
  );
}
