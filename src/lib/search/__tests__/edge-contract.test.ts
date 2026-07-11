import { describe, expect, it } from 'vitest';
import {
  createSemanticErrorResponse,
  createSemanticSuccessResponse,
  parseAIContent,
  validateSearchRequest,
} from '@/lib/search/semantic-contract';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

describe('semantic-search contract helpers', () => {
  it('accepts a valid request body', () => {
    const result = validateSearchRequest(
      {
        query: 'green ramp',
        filters: { format: 'commander', colorIdentity: ['G'] },
        useCache: true,
        locale: 'en',
      },
      JSON_HEADERS,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.query).toBe('green ramp');
      expect(result.data.filters).toEqual({ format: 'commander', colorIdentity: ['G'] });
    }
  });

  it('rejects invalid filter shapes', () => {
    const result = validateSearchRequest(
      { query: 'green ramp', filters: 'bad' },
      JSON_HEADERS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it('parses AI JSON code blocks and raw fallback text', () => {
    const parsed = parseAIContent('```json\n{"scryfallQuery":"t:dragon","explanation":"dragons"}\n```');
    expect(parsed.scryfallQuery).toBe('t:dragon');
    expect(parsed.explanation).toBe('dragons');

    const fallback = parseAIContent('t:elf');
    expect(fallback.scryfallQuery).toBe('t:elf');
  });

  it('serializes success and error envelopes with the expected shape', async () => {
    const success = createSemanticSuccessResponse({
      originalQuery: 'green ramp',
      scryfallQuery: 'c:g t:creature',
      explanation: {
        readable: 'Searches for green creatures.',
        assumptions: ['Treats ramp as creature ramp'],
        confidence: 0.95,
      },
      responseTimeMs: 42,
      source: 'deterministic',
    });

    const successBody = await success.json() as Record<string, unknown>;
    expect(successBody).toMatchObject({
      originalQuery: 'green ramp',
      scryfallQuery: 'c:g t:creature',
      success: true,
      source: 'deterministic',
      responseTimeMs: 42,
    });

    const error = createSemanticErrorResponse('Query is required', 400);
    const errorBody = await error.json() as Record<string, unknown>;
    expect(errorBody).toMatchObject({
      error: 'Query is required',
      success: false,
    });
    expect(error.status).toBe(400);
  });
});
