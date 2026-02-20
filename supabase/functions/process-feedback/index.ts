/**
 * Process Feedback Edge Function
 *
 * Automatically processes search feedback to generate new translation rules.
 * Called via webhook trigger when new feedback is submitted.
 * Uses Lovable AI to analyze the issue and propose a fix.
 *
 * @module process-feedback
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';

const { LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
  validateEnv(['LOVABLE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check - require valid token (anon key, service role, or JWT)
  const { authorized, error: authError } = validateAuth(req);
  if (!authorized) {
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized', success: false }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Rate limiting to prevent AI cost abuse
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(
    clientIp,
    supabase,
    5, // Stricter limit: 5 requests per 60 seconds
    60000,
  );
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many feedback submissions. Please try again later.',
        success: false,
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Retry-After': String(retryAfter) },
      },
    );
  }

  try {
    // SECURITY: Require feedbackId to process only a single specific item
    // This ensures 1 client submission = 1 AI call = predictable costs
    let feedbackId: string | null = null;
    try {
      const body = await req.json();
      feedbackId = body?.feedbackId;
    } catch {
      // Empty body or invalid JSON
    }

    if (!feedbackId || typeof feedbackId !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'feedbackId required - must specify which feedback to process',
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(feedbackId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid feedbackId format',
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get the specific pending feedback item
    const { data: feedback, error: fetchError } = await supabase
      .from('search_feedback')
      .select('*')
      .eq('id', feedbackId)
      .eq('processing_status', 'pending')
      .single();

    if (fetchError || !feedback) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Feedback not found or already processed',
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Wrap single feedback in array for existing processing logic
    const pendingFeedback = [feedback];

    // Scryfall oracle tags (otag:) for AI guidance — ONLY verified valid tags
    const SCRYFALL_OTAGS = [
      // Ramp & Mana
      'otag:ramp',
      'otag:mana-rock',
      'otag:manarock',
      'otag:mana-dork',
      'otag:mana-doubler',
      'otag:mana-sink',
      'otag:ritual',
      // Card Advantage
      'otag:draw',
      'otag:cantrip',
      'otag:loot',
      'otag:wheel',
      'otag:impulse-draw',
      'otag:scry',
      // Tutors
      'otag:tutor',
      // Removal
      'otag:removal',
      'otag:spot-removal',
      'otag:creature-removal',
      'otag:artifact-removal',
      'otag:enchantment-removal',
      'otag:planeswalker-removal',
      'otag:board-wipe',
      'otag:mass-removal',
      'otag:graveyard-hate',
      // Graveyard
      'otag:recursion',
      'otag:reanimate',
      // Counter
      'otag:counter',
      // Life & Combat
      'otag:lifegain',
      'otag:burn',
      'otag:fog',
      'otag:combat-trick',
      'otag:evasion',
      // Blink & Bounce
      'otag:blink',
      'otag:flicker',
      'otag:bounce',
      // Copy & Clone
      'otag:copy',
      'otag:copy-permanent',
      'otag:copy-spell',
      'otag:clone',
      // Control
      'otag:hatebear',
      'otag:pillowfort',
      // Theft
      'otag:theft',
      'otag:threaten',
      // Sacrifice
      'otag:sacrifice-outlet',
      'otag:free-sacrifice-outlet',
      'otag:death-trigger',
      'otag:synergy-sacrifice',
      // Special Effects
      'otag:extra-turn',
      'otag:extra-combat',
      'otag:polymorph',
      'otag:egg',
      // Ability Granting
      'otag:gives-flash',
      'otag:gives-haste',
      'otag:gives-hexproof',
      'otag:gives-flying',
      'otag:gives-trample',
      'otag:gives-indestructible',
      // Lands & Enchantress
      'otag:landfall',
      'otag:extra-land',
      'otag:enchantress',
      // Misc
      'otag:lord',
      'otag:anthem',
      'otag:cost-reducer',
      'otag:untapper',
      'otag:tapper',
      'otag:discard',
      'otag:mill',
      'otag:self-mill',
      'otag:counters-matter',
      'otag:counter-doubler',
      'otag:pinger',
      'otag:overrun',
      'otag:rummage',
      'otag:mulch',
    ];

    const results: Array<{
      feedbackId: string;
      status: string;
      rule?: string;
    }> = [];
    const normalizeTagAliases = (syntax: string): string =>
      syntax
        .replace(/\bfunction:/gi, 'otag:')
        .replace(/\boracletag:/gi, 'otag:');

    // Also fix any stuck 'processing' items older than 5 minutes (safety net)
    const { data: stuckItems } = await supabase
      .from('search_feedback')
      .select('id')
      .eq('processing_status', 'processing')
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (stuckItems && stuckItems.length > 0) {
      const stuckIds = stuckItems.map((s: { id: string }) => s.id);
      await supabase
        .from('search_feedback')
        .update({ processing_status: 'failed', processed_at: new Date().toISOString() })
        .in('id', stuckIds);
      console.log(`Reset ${stuckIds.length} stuck processing items to failed`);
    }

    for (const feedback of pendingFeedback) {
      // Safety timeout: if processing takes > 25s, mark as failed
      const safetyTimeout = setTimeout(async () => {
        console.error(`Safety timeout hit for feedback ${feedback.id}`);
        await supabase
          .from('search_feedback')
          .update({ processing_status: 'failed', processed_at: new Date().toISOString() })
          .eq('id', feedback.id)
          .eq('processing_status', 'processing');
      }, 25000);

      try {
        // Check how many times similar feedback has been submitted
        const { data: similarFeedback } = await supabase
          .from('search_feedback')
          .select('id, processing_status')
          .ilike(
            'original_query',
            `%${feedback.original_query.split(' ').slice(0, 3).join('%')}%`,
          )
          .neq('id', feedback.id);

        const previousAttempts =
          similarFeedback?.filter((f) =>
            ['completed', 'duplicate', 'failed'].includes(
              f.processing_status || '',
            ),
          ).length || 0;

        const isRetry = previousAttempts > 0;

        // Mark as processing
        await supabase
          .from('search_feedback')
          .update({ processing_status: 'processing' })
          .eq('id', feedback.id);

        // Use AI to analyze the feedback and generate a rule
        const analysisPrompt = `You are a Scryfall query expert. Analyze this search feedback and generate a translation rule.

${isRetry ? `⚠️ IMPORTANT: This is attempt #${previousAttempts + 1} for a similar query. Previous fixes DID NOT WORK. You must try a DIFFERENT approach this time!` : ''}

FEEDBACK:
- User searched for: "${feedback.original_query}"
- AI translated it to: "${feedback.translated_query || 'unknown'}"
- User's issue: "${feedback.issue_description}"

CRITICAL - AVAILABLE SCRYFALL ORACLE TAGS (otag:):
Scryfall has built-in otag: tags that are MORE RELIABLE than oracle text searches. ALWAYS prefer these when applicable:
${SCRYFALL_OTAGS.join(', ')}

Examples of GOOD translations using otag: tags:
- "ramp spells" → "otag:ramp (t:instant or t:sorcery)" 
- "removal in black" → "otag:removal c:b"
- "card draw effects" → "otag:draw"
- "board wipes" → "otag:board-wipe"
- "cost reducers for artifacts" → "otag:cost-reducer t:artifact"
- "mana rocks" → "otag:mana-rock"
- "treasure makers" → "o:\\"create\\" o:\\"Treasure\\"" (no otag exists for treasure)

Your task:
1. Understand what the user ACTUALLY wanted
2. Check if any otag: tags match the concept
3. Create a pattern-to-syntax rule using otag: tags when possible
4. Only fall back to oracle text (o:"...") if no otag exists

Respond in this EXACT JSON format only (no other text):
{
  "pattern": "natural language pattern to match (e.g., 'ramp spells')",
  "scryfall_syntax": "correct Scryfall syntax USING otag: TAGS WHEN POSSIBLE (e.g., 'otag:ramp (t:instant or t:sorcery)')",
  "description": "brief explanation of what this rule does",
  "confidence": 0.8,
  "uses_otag": true
}

Rules for your response:
- pattern should be lowercase and match common phrasings
- scryfall_syntax must be valid Scryfall search syntax
- PREFER otag: tags over o:"..." searches
- uses_otag should be true if you used an otag: tag
- confidence should be 0.5-1.0 based on how certain you are
- If you can't determine a useful rule, set confidence to 0

IMPORTANT: Only output the JSON object, nothing else.`;

        const response = await fetch(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [{ role: 'user', content: analysisPrompt }],
              temperature: 0.3,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const aiResponse = aiData.choices?.[0]?.message?.content || '';

        console.log('AI response for feedback', feedback.id, ':', aiResponse);

        // Parse the JSON response
        let ruleData;
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in response');
          ruleData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          await supabase
            .from('search_feedback')
            .update({
              processing_status: 'failed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', feedback.id);
          results.push({
            feedbackId: feedback.id,
            status: 'failed - parse error',
          });
          continue;
        }

        // Check if the rule is useful (confidence > 0.5)
        if (
          !ruleData.pattern ||
          !ruleData.scryfall_syntax ||
          ruleData.confidence < 0.5
        ) {
          await supabase
            .from('search_feedback')
            .update({
              processing_status: 'skipped',
              processed_at: new Date().toISOString(),
            })
            .eq('id', feedback.id);
          results.push({
            feedbackId: feedback.id,
            status: 'skipped - low confidence',
          });
          continue;
        }

        // Normalize tag aliases for consistency before writing to translation_rules
        ruleData.scryfall_syntax = normalizeTagAliases(
          ruleData.scryfall_syntax,
        );

        // ──────────────────────────────────────────────────────────────────
        // SCRYFALL VALIDATION GATE
        // Test the generated syntax against the live Scryfall API before
        // writing anything to translation_rules. A 404 or 0-result response
        // means the query is broken (e.g. impossible type combos like
        // t:artifact t:instant) and must never reach the rules table.
        // ──────────────────────────────────────────────────────────────────
        const scryfallValidationUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
          ruleData.scryfall_syntax,
        )}&extras=true`;

        let scryfallOk = false;
        let scryfallTotalCards = 0;
        let scryfallError = '';

        try {
          const scryfallResp = await fetch(scryfallValidationUrl, {
            headers: { 'User-Agent': 'OffMeta/1.0 (feedback-validator)' },
          });

          if (scryfallResp.status === 200) {
            const scryfallData = await scryfallResp.json();
            scryfallTotalCards = scryfallData.total_cards ?? 0;
            scryfallOk = scryfallTotalCards > 0;
            if (!scryfallOk) {
              scryfallError = `Query returned 0 results (total_cards=0)`;
            }
          } else if (scryfallResp.status === 404) {
            // Consume body to avoid resource leak
            await scryfallResp.text();
            scryfallError = `Scryfall returned 404 — query matched no cards`;
          } else {
            const errBody = await scryfallResp.text();
            scryfallError = `Scryfall returned HTTP ${scryfallResp.status}: ${errBody.slice(0, 200)}`;
          }
        } catch (fetchErr) {
          // Network error — treat as inconclusive, allow the rule through
          // to avoid blocking rules on transient Scryfall downtime
          console.warn(
            `Scryfall validation network error for feedback ${feedback.id}:`,
            fetchErr,
          );
          scryfallOk = true; // fail-open on network errors
        }

        if (!scryfallOk) {
          console.error(
            `Scryfall validation FAILED for feedback ${feedback.id}:`,
            scryfallError,
            `| syntax: "${ruleData.scryfall_syntax}"`,
          );
          await supabase
            .from('search_feedback')
            .update({
              processing_status: 'failed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', feedback.id);
          results.push({
            feedbackId: feedback.id,
            status: `failed - no_results: ${scryfallError}`,
          });
          continue;
        }

        console.log(
          `Scryfall validation PASSED for feedback ${feedback.id}:`,
          `"${ruleData.scryfall_syntax}" returned ${scryfallTotalCards} cards`,
        );

        // Check for duplicate patterns - but if this is a retry, update the existing rule
        const { data: existingRule } = await supabase
          .from('translation_rules')
          .select('id, pattern, scryfall_syntax, confidence')
          .ilike('pattern', ruleData.pattern)
          .limit(1);

        if (existingRule && existingRule.length > 0) {
          if (isRetry) {
            // User reported same issue again - the existing rule didn't work!
            // Update the existing rule with the new (hopefully better) syntax
            const { error: updateError } = await supabase
              .from('translation_rules')
              .update({
                scryfall_syntax: ruleData.scryfall_syntax,
                description: `${ruleData.description} (updated after retry)`,
                confidence: Math.min(1, Math.max(0, ruleData.confidence)),
              })
              .eq('id', existingRule[0].id);

            if (updateError) {
              throw new Error(`Failed to update rule: ${updateError.message}`);
            }

            await supabase
              .from('search_feedback')
              .update({
                processing_status: 'updated_existing',
                processed_at: new Date().toISOString(),
                generated_rule_id: existingRule[0].id,
              })
              .eq('id', feedback.id);

            results.push({
              feedbackId: feedback.id,
              status: 'updated existing rule',
              rule: `${ruleData.pattern} → ${ruleData.scryfall_syntax} (was: ${existingRule[0].scryfall_syntax})`,
            });

            console.log(
              'Updated existing rule from retry feedback:',
              ruleData.pattern,
              '→',
              ruleData.scryfall_syntax,
            );
            continue;
          } else {
            // First time seeing this, but pattern exists - mark as duplicate
            await supabase
              .from('search_feedback')
              .update({
                processing_status: 'duplicate',
                processed_at: new Date().toISOString(),
              })
              .eq('id', feedback.id);
            results.push({
              feedbackId: feedback.id,
              status: 'skipped - duplicate pattern',
            });
            continue;
          }
        }

        // Insert the new rule
        const { data: newRule, error: insertError } = await supabase
          .from('translation_rules')
          .insert({
            pattern: ruleData.pattern.toLowerCase(),
            scryfall_syntax: ruleData.scryfall_syntax,
            description: ruleData.description,
            source_feedback_id: feedback.id,
            confidence: Math.min(1, Math.max(0, ruleData.confidence)),
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to insert rule: ${insertError.message}`);
        }

        // Update feedback status
        await supabase
          .from('search_feedback')
          .update({
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
            generated_rule_id: newRule.id,
          })
          .eq('id', feedback.id);

        results.push({
          feedbackId: feedback.id,
          status: 'success',
          rule: `${ruleData.pattern} → ${ruleData.scryfall_syntax}`,
        });

        console.log(
          'Generated rule from feedback:',
          ruleData.pattern,
          '→',
          ruleData.scryfall_syntax,
        );
      } catch (processingError) {
        console.error(
          'Error processing feedback',
          feedback.id,
          ':',
          processingError,
        );
        await supabase
          .from('search_feedback')
          .update({
            processing_status: 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', feedback.id);
        results.push({
          feedbackId: feedback.id,
          status: `failed - ${processingError instanceof Error ? processingError.message : 'unknown error'}`,
        });
      } finally {
        clearTimeout(safetyTimeout);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} feedback items`,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Process feedback error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process feedback',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
