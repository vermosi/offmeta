/**
 * Generate SEO Page edge function.
 * Takes a seed query, uses AI to generate an AI-optimized landing page,
 * validates cards against Scryfall, and stores in the seo_pages table.
 */

declare const Deno: { env: { get(key: string): string | undefined }; serve: (handler: (req: Request) => Promise<Response>) => void };

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAIWithToolsTracked, aiErrorResponse } from '../_shared/aiClient.ts';
import { logEvent } from '../_shared/logger.ts';
import { runRequestGuard } from '../_shared/requestGuard.ts';

const SCRYFALL_API = 'https://api.scryfall.com';

interface SeoPageContent {
  tldr: string;
  explanation: string;
  cards: Array<{
    name: string;
    manaCost: string;
    typeLine: string;
    description: string;
  }>;
  whyTheseWork: string;
  relatedQueries: string[];
  faqs: Array<{ question: string; answer: string }>;
}

function slugify(query: string): string {
  return query
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/-$/, '');
}

/** Validate cards exist in Scryfall. Remove hallucinated ones. */
async function validateCards(
  cards: SeoPageContent['cards'],
): Promise<SeoPageContent['cards']> {
  const validated: SeoPageContent['cards'] = [];

  for (const card of cards.slice(0, 15)) {
    try {
      const res = await fetch(
        `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(card.name)}`,
      );
      if (res.ok) {
        const data = await res.json();
        validated.push({
          name: data.name,
          manaCost: data.mana_cost ?? card.manaCost,
          typeLine: data.type_line ?? card.typeLine,
          description: card.description,
        });
      }
      // Respect Scryfall rate limits
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      // Skip cards that fail validation
    }
  }

  return validated;
}

Deno.serve(async (req: Request) => {
  const guard = await runRequestGuard(req, {
    method: 'POST',
    rateLimit: 5,
    globalLimit: 30,
    requireAIKey: true,
  });
  if (!guard.ok) return guard.response;
  const { ctx } = guard;

  try {
    const { query, publish = false } = await req.json();

    if (!query || typeof query !== 'string' || query.length < 3 || query.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Query must be 3-200 characters' }),
        { status: 400, headers: ctx.headers },
      );
    }

    const slug = slugify(query);

    // Check if page already exists
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await supabase
      .from('seo_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Page already exists for this query', slug }),
        { status: 409, headers: ctx.headers },
      );
    }

    // Generate content via AI
    const systemPrompt = `You are an expert Magic: The Gathering content writer for OffMeta.app. Generate factual, citation-friendly content optimized for AI search engines. Use declarative statements, not opinions. No marketing language. Be precise about card mechanics.`;

    const userPrompt = `Generate an AI-optimized landing page for the MTG query: "${query}"

Include:
1. tldr: 2-3 sentence factual answer (start with a declarative statement using the exact query phrase)
2. explanation: 2-3 structured paragraphs expanding on the topic
3. cards: 8-12 specific real MTG cards with name, manaCost, typeLine, and a 1-sentence description of why they fit
4. whyTheseWork: 2-3 sentences explaining the strategic reasoning
5. relatedQueries: 5-8 related MTG search queries users might also look for
6. faqs: 4-5 question/answer pairs about this topic (questions should be natural language queries people would ask)`;

    const result = await callAIWithToolsTracked<SeoPageContent>(ctx.apiKey, {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_seo_page',
            description: 'Generate structured SEO page content for an MTG query',
            parameters: {
              type: 'object',
              properties: {
                tldr: { type: 'string', description: 'TL;DR answer (2-3 sentences)' },
                explanation: { type: 'string', description: 'Expanded explanation (2-3 paragraphs)' },
                cards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      manaCost: { type: 'string' },
                      typeLine: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['name', 'manaCost', 'typeLine', 'description'],
                    additionalProperties: false,
                  },
                },
                whyTheseWork: { type: 'string' },
                relatedQueries: { type: 'array', items: { type: 'string' } },
                faqs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
                      answer: { type: 'string' },
                    },
                    required: ['question', 'answer'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['tldr', 'explanation', 'cards', 'whyTheseWork', 'relatedQueries', 'faqs'],
              additionalProperties: false,
            },
          },
        },
      ],
      toolChoice: 'generate_seo_page',
      temperature: 0.3,
    });

    logEvent('info', 'seo_page_generated', {
      query,
      slug,
      cardCount: result.data.cards?.length ?? 0,
      durationMs: result.durationMs,
    });

    // Validate cards against Scryfall
    const validatedCards = await validateCards(result.data.cards ?? []);

    const content: SeoPageContent = {
      ...result.data,
      cards: validatedCards,
    };

    // Store in database
    const status = publish ? 'published' : 'draft';
    const { error: insertError } = await supabase.from('seo_pages').insert({
      query,
      slug,
      content_json: content,
      status,
      ...(publish ? { published_at: new Date().toISOString() } : {}),
    });

    if (insertError) {
      logEvent('error', 'seo_page_insert_failed', { error: insertError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to store page' }),
        { status: 500, headers: ctx.headers },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        slug,
        status,
        validatedCards: validatedCards.length,
        totalCardsGenerated: result.data.cards?.length ?? 0,
      }),
      { status: 201, headers: ctx.headers },
    );
  } catch (err) {
    return aiErrorResponse(err, ctx.corsHeaders, 'Failed to generate SEO page');
  }
});
