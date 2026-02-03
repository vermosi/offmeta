/**
 * Zod schemas for runtime validation of AI responses and external data.
 * Provides type safety for data from external services.
 */

// Using manual validation since Zod isn't available in Deno edge functions
// These are typed validators that provide similar functionality

export interface AIChoice {
  message: {
    content: string;
    role?: string;
  };
  index?: number;
  finish_reason?: string;
}

export interface AIResponse {
  choices: AIChoice[];
  id?: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ParsedAIContent {
  scryfallQuery: string;
  explanation?: string;
  confidence?: number;
}

/**
 * Validates AI response structure and extracts content safely.
 * @param data - Raw response from AI gateway
 * @returns Validated AIResponse or throws error
 */
export function validateAIResponse(data: unknown): AIResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.choices) || response.choices.length === 0) {
    throw new Error('Invalid AI response: missing or empty choices array');
  }

  const firstChoice = response.choices[0] as Record<string, unknown>;
  if (!firstChoice || typeof firstChoice !== 'object') {
    throw new Error('Invalid AI response: invalid choice format');
  }

  const message = firstChoice.message as Record<string, unknown>;
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid AI response: missing message');
  }

  if (typeof message.content !== 'string') {
    throw new Error('Invalid AI response: message.content must be a string');
  }

  return {
    choices: [
      {
        message: {
          content: message.content,
          role: typeof message.role === 'string' ? message.role : undefined,
        },
        index:
          typeof firstChoice.index === 'number' ? firstChoice.index : undefined,
        finish_reason:
          typeof firstChoice.finish_reason === 'string'
            ? firstChoice.finish_reason
            : undefined,
      },
    ],
    id: typeof response.id === 'string' ? response.id : undefined,
    model: typeof response.model === 'string' ? response.model : undefined,
  };
}

/**
 * Safely extracts content from validated AI response.
 */
export function extractAIContent(response: AIResponse): string {
  return response.choices[0].message.content;
}

/**
 * Attempts to parse structured content from AI response.
 * Handles both raw Scryfall syntax and JSON-formatted responses.
 */
export function parseAIContent(rawContent: string): ParsedAIContent {
  let scryfallQuery = rawContent.trim();
  let explanationText: string | undefined;
  let confidence: number | undefined;

  // Extract from markdown code block if present
  if (scryfallQuery.includes('```')) {
    const match = scryfallQuery.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]) as Record<string, unknown>;
        if (typeof parsed.scryfallQuery === 'string') {
          scryfallQuery = parsed.scryfallQuery;
        }
        if (typeof parsed.explanation === 'string') {
          explanationText = parsed.explanation;
        }
        if (typeof parsed.confidence === 'number') {
          confidence = parsed.confidence;
        }
      } catch {
        // Not valid JSON, use the raw content from the code block
        scryfallQuery = match[1].trim();
      }
    }
  }

  return {
    scryfallQuery,
    explanation: explanationText,
    confidence,
  };
}
