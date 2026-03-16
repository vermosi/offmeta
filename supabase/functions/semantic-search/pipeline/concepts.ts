/**
 * Stage 4: Concept Matching
 * Uses alias matching, fuzzy DB search, and LLM classification to find relevant concepts
 */

import type { ConceptMatch } from './types.ts';
import { CONCEPT_LIBRARY } from './concept-library.ts';

/**
 * Finds matching concepts for the given residual query using a 3-tier approach:
 * 1. Exact alias matching against hardcoded library (fastest)
 * 2. Fuzzy DB matching via pg_trgm (handles typos)
 * 3. LLM classification via Gemini Flash Lite (handles novel phrasings)
 */
export async function findConceptMatches(
  residualQuery: string,
  maxMatches: number = 5,
  minConfidence: number = 0.7,
  skipLLM: boolean = false,
): Promise<ConceptMatch[]> {
  const matches: ConceptMatch[] = [];
  const normalizedQuery = residualQuery.toLowerCase().trim();

  if (!normalizedQuery) return [];

  // === Tier 1: Exact alias matching (fastest, ~0ms) ===
  for (const [conceptId, concept] of Object.entries(CONCEPT_LIBRARY)) {
    for (const alias of concept.aliases) {
      if (normalizedQuery.includes(alias)) {
        matches.push({
          conceptId,
          pattern: alias,
          scryfallSyntax: concept.templates[0],
          templates: concept.templates,
          negativeTemplates: concept.negativeTemplates,
          description: concept.description,
          confidence: 0.95,
          category: concept.category,
          priority: concept.priority,
          similarity: 1.0,
          matchType: 'exact',
        });
        break;
      }
    }
  }

  // === Tier 2: Fuzzy DB matching via pg_trgm (handles typos, ~5ms) ===
  if (matches.length < 2) {
    try {
      const { createClient } = await import(
        'https://esm.sh/@supabase/supabase-js@2'
      );
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Send FULL residual query, not just first word
        const { data: dbMatches, error } = await supabase.rpc(
          'match_concepts_by_alias',
          {
            search_term: normalizedQuery,
            match_count: 5,
          },
        );

        if (!error && dbMatches) {
          for (const match of dbMatches) {
            if (matches.some((m) => m.conceptId === match.concept_id)) continue;
            if (
              matches.some(
                (m) => m.scryfallSyntax === match.scryfall_syntax,
              )
            )
              continue;

            matches.push({
              conceptId: match.concept_id || match.pattern,
              pattern: match.pattern,
              scryfallSyntax: match.scryfall_syntax,
              templates: match.scryfall_templates || [match.scryfall_syntax],
              negativeTemplates: match.negative_templates || [],
              description: match.description,
              confidence: match.confidence || 0.8,
              category: match.category || 'general',
              priority: match.priority || 50,
              similarity: match.similarity_score || 0.85,
              matchType: 'alias',
            });
          }
        }
      }
    } catch {
      // Database not available, continue with other tiers
    }
  }

  // === Tier 3: LLM concept classification (handles novel phrasings, ~50-100ms) ===
  if (matches.length < 2 && normalizedQuery.split(' ').length >= 3) {
    try {
      const llmMatches = await classifyConceptsWithLLM(normalizedQuery);
      for (const llmMatch of llmMatches) {
        if (matches.some((m) => m.conceptId === llmMatch.conceptId)) continue;
        matches.push(llmMatch);
      }
    } catch {
      // LLM not available, continue with what we have
    }
  }

  // Sort by similarity, priority, then confidence
  matches.sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.confidence - a.confidence;
  });

  // Deduplicate by category: keep only the highest-ranked concept per category.
  // This prevents color-specific variants (e.g., "white board wipes" with c:w)
  // from leaking into queries when the user just typed "board wipe".
  const deduped = deduplicateConceptsByCategory(matches);

  return deduped
    .filter((m) => m.confidence >= minConfidence)
    .slice(0, maxMatches);
}

/**
 * Keeps only the highest-priority/similarity concept per category.
 * Prevents color leaks from specific variants (e.g., "white board wipes")
 * when the user searched for the generic concept (e.g., "board wipe").
 */
export function deduplicateConceptsByCategory(
  matches: ConceptMatch[],
): ConceptMatch[] {
  const bestByCategory = new Map<string, ConceptMatch>();

  for (const match of matches) {
    const existing = bestByCategory.get(match.category);
    if (!existing) {
      bestByCategory.set(match.category, match);
      continue;
    }
    // Already sorted by similarity > priority > confidence, so first one wins
    // (it's already the best)
  }

  // Preserve original order for the winners
  return matches.filter((m) => bestByCategory.get(m.category) === m);
}

/**
 * Uses Gemini Flash Lite to classify a residual query into known concept IDs.
 * This handles novel phrasings like "ways to make opponents sacrifice their creatures"
 * that don't match any alias exactly.
 */
async function classifyConceptsWithLLM(
  query: string,
): Promise<ConceptMatch[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return [];

  // Build compact concept catalogue for the prompt
  const conceptCatalogue = Object.entries(CONCEPT_LIBRARY)
    .map(([id, c]) => `${id}: ${c.description} (${c.category})`)
    .join('\n');

  const response = await fetch(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are an MTG concept classifier. Given a user query about Magic: The Gathering cards, identify which concepts from the catalogue best match. Only return concepts that are clearly relevant.\n\nConcept catalogue:\n${conceptCatalogue}`,
          },
          {
            role: 'user',
            content: `Which concepts match this query? "${query}"`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_concepts',
              description:
                'Return the top 1-3 matching concept IDs from the catalogue.',
              parameters: {
                type: 'object',
                properties: {
                  matches: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        concept_id: {
                          type: 'string',
                          description: 'Exact concept ID from the catalogue',
                        },
                        confidence: {
                          type: 'number',
                          description: 'Confidence 0-1',
                        },
                      },
                      required: ['concept_id', 'confidence'],
                      additionalProperties: false,
                    },
                    maxItems: 3,
                  },
                },
                required: ['matches'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'classify_concepts' },
        },
      }),
    },
  );

  if (!response.ok) return [];

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return [];

  let parsed: { matches: Array<{ concept_id: string; confidence: number }> };
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    return [];
  }

  const results: ConceptMatch[] = [];
  for (const match of parsed.matches || []) {
    const concept = CONCEPT_LIBRARY[match.concept_id];
    if (!concept) continue;
    if (match.confidence < 0.6) continue;

    results.push({
      conceptId: match.concept_id,
      pattern: query,
      scryfallSyntax: concept.templates[0],
      templates: concept.templates,
      negativeTemplates: concept.negativeTemplates,
      description: concept.description,
      confidence: match.confidence * 0.9, // Slight discount for LLM vs exact
      category: concept.category,
      priority: concept.priority,
      similarity: match.confidence,
      matchType: 'alias', // Treat as alias for downstream compatibility
    });
  }

  return results;
}

/**
 * Gets the best template for a concept based on context
 */
export function selectBestTemplate(
  concept: ConceptMatch,
  _slots: { types: { include: string[] } },
): string {
  return concept.templates[0];
}
