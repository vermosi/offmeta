/**
 * Shared AI Gateway client for structured tool-call requests.
 * Deduplicates fetch → error-handle → parse-tool-call across edge functions.
 *
 * Reliability features:
 *  - 30s timeout via AbortController
 *  - Single retry with 1s backoff on transient 5xx errors
 *  - Truncated error body logging for diagnostics
 *  - Safe JSON.parse with descriptive error on malformed tool output
 */

import { logEvent } from './logger.ts';
// @ts-expect-error: esm.sh import for Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1_000;
const ERROR_BODY_MAX_CHARS = 200;

/** Supported Lovable AI gateway models. */
const SUPPORTED_MODELS = new Set([
  'google/gemini-2.5-pro',
  'google/gemini-3.1-pro-preview',
  'google/gemini-3-flash-preview',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-pro-image-preview',
  'google/gemini-3.1-flash-image-preview',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.2',
]);

export function isValidModel(model: string): boolean {
  return SUPPORTED_MODELS.has(model);
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AIToolCallRequest {
  model: string;
  messages: AIMessage[];
  tools: AIToolDefinition[];
  toolChoice: string;
  temperature?: number;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIToolCallResult<T> {
  data: T;
  usage: AIUsage | null;
  model: string;
  durationMs: number;
}

export class AIGatewayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AIGatewayError';
  }
}

/** Returns true for HTTP status codes that are safe to retry. */
function isTransient(status: number): boolean {
  return status >= 500 && status !== 501;
}

/** Executes a single fetch with a timeout. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AIGatewayError(`AI gateway timeout after ${timeoutMs}ms`, 504);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the Lovable AI gateway with structured tool output.
 * Returns the parsed tool call arguments.
 *
 * Retries once on transient 5xx errors with a 1s delay.
 * Throws AIGatewayError on 402/429/timeout or persistent failures.
 */
export async function callAIWithTools<T = Record<string, unknown>>(
  apiKey: string,
  request: AIToolCallRequest,
): Promise<T> {
  const result = await callAIWithToolsTracked<T>(apiKey, request);
  return result.data;
}

/**
 * Same as callAIWithTools but returns usage metrics alongside the parsed data.
 */
export async function callAIWithToolsTracked<T = Record<string, unknown>>(
  apiKey: string,
  request: AIToolCallRequest,
): Promise<AIToolCallResult<T>> {
  if (!isValidModel(request.model)) {
    throw new AIGatewayError(`Unsupported model: ${request.model}`, 400);
  }

  const startTime = Date.now();

  const body = JSON.stringify({
    model: request.model,
    messages: request.messages,
    tools: request.tools,
    tool_choice: { type: 'function', function: { name: request.toolChoice } },
    ...(request.temperature !== undefined && { temperature: request.temperature }),
  });

  const fetchInit: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  };

  let lastStatus = 0;
  let lastBody = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      logEvent('warn', 'ai_gateway_retry', { attempt, lastStatus });
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    const response = await fetchWithTimeout(AI_GATEWAY_URL, fetchInit, TIMEOUT_MS);

    if (response.ok) {
      const durationMs = Date.now() - startTime;
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      // Extract usage metrics
      const rawUsage = data.usage;
      const usage: AIUsage | null = rawUsage
        ? {
            promptTokens: rawUsage.prompt_tokens ?? 0,
            completionTokens: rawUsage.completion_tokens ?? 0,
            totalTokens: rawUsage.total_tokens ?? 0,
          }
        : null;

      // Log usage for cost monitoring
      logEvent('info', 'ai_usage', {
        model: request.model,
        toolChoice: request.toolChoice,
        promptTokens: usage?.promptTokens ?? 0,
        completionTokens: usage?.completionTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
        durationMs,
        attempt,
      });

      // Persist usage to DB (fire-and-forget, don't block response)
      persistUsage({
        model: request.model,
        functionName: request.toolChoice,
        promptTokens: usage?.promptTokens ?? 0,
        completionTokens: usage?.completionTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
        durationMs,
        retries: attempt,
      });

      if (!toolCall?.function?.arguments) {
        throw new AIGatewayError('AI returned no structured response', 500);
      }

      let parsed: T;
      try {
        parsed = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch {
        const snippet = String(toolCall.function.arguments).slice(0, ERROR_BODY_MAX_CHARS);
        logEvent('error', 'ai_malformed_tool_output', { snippet, model: request.model });
        throw new AIGatewayError('AI returned malformed tool output', 500);
      }

      return { data: parsed as T, usage, model: request.model, durationMs };
    }

    // Non-OK response
    lastStatus = response.status;
    lastBody = (await response.text()).slice(0, ERROR_BODY_MAX_CHARS);

    // Non-retryable client errors
    if (lastStatus === 429) {
      throw new AIGatewayError('Rate limit exceeded, try again later', 429);
    }
    if (lastStatus === 402) {
      throw new AIGatewayError('AI credits exhausted', 402);
    }

    // Only retry on transient server errors
    if (!isTransient(lastStatus)) {
      break;
    }
  }

  logEvent('error', 'ai_gateway_error', { status: lastStatus, body: lastBody, model: request.model });
  throw new AIGatewayError('AI service unavailable', 502);
}

/**
 * Maps an AIGatewayError to a JSON Response with appropriate status.
 */
export function aiErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  fallbackMessage = 'Internal error',
): Response {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (error instanceof AIGatewayError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status, headers },
    );
  }

  logEvent('error', 'ai_call_error', {
    message: error instanceof Error ? error.message : 'Unknown error',
  });
  return new Response(
    JSON.stringify({ error: fallbackMessage }),
    { status: 500, headers },
  );
}

/**
 * Fire-and-forget insert of usage metrics into ai_usage_logs.
 * Uses a service-role client to bypass RLS.
 */
function persistUsage(record: {
  model: string;
  functionName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  retries: number;
}): void {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;

    const sb = createClient(url, key);
    sb.from('ai_usage_logs')
      .insert({
        model: record.model,
        function_name: record.functionName,
        prompt_tokens: record.promptTokens,
        completion_tokens: record.completionTokens,
        total_tokens: record.totalTokens,
        duration_ms: record.durationMs,
        retries: record.retries,
      })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) logEvent('warn', 'ai_usage_persist_failed', { message: error.message });
      });
  } catch {
    // Silently fail — usage tracking must never break AI calls
  }
}
