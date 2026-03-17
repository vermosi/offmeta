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

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1_000;
const ERROR_BODY_MAX_CHARS = 200;

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
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

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

      return parsed as T;
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
