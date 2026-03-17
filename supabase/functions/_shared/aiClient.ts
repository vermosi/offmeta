/**
 * Shared AI Gateway client for structured tool-call requests.
 * Deduplicates fetch → error-handle → parse-tool-call across edge functions.
 */

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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

/**
 * Calls the Lovable AI gateway with structured tool output.
 * Returns the parsed tool call arguments.
 * Throws AIGatewayError on 402/429/5xx or missing tool response.
 */
export async function callAIWithTools<T = Record<string, unknown>>(
  apiKey: string,
  request: AIToolCallRequest,
): Promise<T> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      tools: request.tools,
      tool_choice: { type: 'function', function: { name: request.toolChoice } },
      ...(request.temperature !== undefined && { temperature: request.temperature }),
    }),
  });

  if (!response.ok) {
    const status = response.status;
    await response.text(); // drain body

    if (status === 429) {
      throw new AIGatewayError('Rate limit exceeded, try again later', 429);
    }
    if (status === 402) {
      throw new AIGatewayError('AI credits exhausted', 402);
    }

    console.error('AI gateway error:', status);
    throw new AIGatewayError('AI service unavailable', 502);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    throw new AIGatewayError('AI returned no structured response', 500);
  }

  const parsed = typeof toolCall.function.arguments === 'string'
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;

  return parsed as T;
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

  console.error('AI call error:', error);
  return new Response(
    JSON.stringify({ error: fallbackMessage }),
    { status: 500, headers },
  );
}
