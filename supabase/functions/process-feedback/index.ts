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

import { checkRateLimit, resolveRateLimitKey } from '../_shared/rateLimit.ts';
import {
  getCorsHeaders,
  validateAuth,
  logAuthFailure,
} from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger } from '../_shared/logger.ts';

const { LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
  validateEnv(['LOVABLE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('process-feedback');

const AUTO_APPROVE_CONFIDENCE = 0.85;
const AUTO_APPROVE_MIN_RESULTS = 5;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check - require authenticated user, service role, or API key
  // Anonymous (anon key) access is explicitly rejected to prevent AI cost abuse
  const authResult = await validateAuth(req);
  if (!authResult.authorized) {
    await logAuthFailure(
      req,
      authResult.error || 'Unauthorized',
      'process-feedback',
    );
    return new Response(
      JSON.stringify({
        error: authResult.error || 'Unauthorized',
        success: false,
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Rate limiting to prevent AI cost abuse
  const rateLimitKey = await resolveRateLimitKey(req);
  const { allowed, retryAfter, statusCode } = await checkRateLimit(
    rateLimitKey,
    supabase,
    5, // Stricter limit: 5 requests per 60 seconds
    100, // Global limit: 100 requests per minute across all IPs
    60000,
    { failOpen: false },
  );
  if (!allowed) {
    const status = statusCode ?? 429;
    const retry = retryAfter ?? 1;

    return new Response(
      JSON.stringify({
        error:
          status === 503
            ? 'Rate limiter temporarily unavailable. Please retry shortly.'
            : 'Too many feedback submissions. Please try again later.',
        success: false,
        retryAfter: retry,
      }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(retry),
        },
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
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

    // Allow initial processing plus explicit retries for failed/skipped items.
    const { data: feedbackRows, error: fetchError } = await supabase
      .from('search_feedback')
      .select('*')
      .eq('id', feedbackId)
      .in('processing_status', ['pending', 'failed', 'skipped'])
      .limit(1);

    const feedback = feedbackRows?.[0] ?? null;

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
        .update({
          processing_status: 'failed',
          processed_at: new Date().toISOString(),
        })
        .in('id', stuckIds);
      logger.info('stuck_processing_items_reset', { count: stuckIds.length });
    }

    for (const feedback of pendingFeedback) {
      // Safety timeout: if processing takes > 25s, mark as failed
      const safetyTimeout = setTimeout(async () => {
        logger.error('feedback_processing_safety_timeout', {
          feedbackId: feedback.id,
        });
        await supabase
          .from('search_feedback')
          .update({
            processing_status: 'failed',
            processed_at: new Date().toISOString(),
          })
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
          logger.error('ai_api_error', { status: response.status, errorText });
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const aiResponse = aiData.choices?.[0]?.message?.content || '';

        logger.info('ai_response_received', {
          feedbackId: feedback.id,
          aiResponse,
        });

        // Parse the JSON response
        let ruleData;
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in response');
          ruleData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          logger.error('ai_response_parse_error', {
            feedbackId: feedback.id,
            error:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          });
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
          logger.warn('scryfall_validation_network_error', {
            feedbackId: feedback.id,
            error:
              fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          });
          scryfallOk = true; // fail-open on network errors
        }

        if (!scryfallOk) {
          logger.warn('scryfall_validation_failed_attempt_1', {
            feedbackId: feedback.id,
            error: scryfallError,
            scryfallSyntax: ruleData.scryfall_syntax,
            nextStep: 'request_ai_self_correction',
          });

          // ──────────────────────────────────────────────────────────────────
          // SELF-CORRECTION: give the AI one chance to fix the broken syntax.
          // We pass the failed syntax + the Scryfall error back so the model
          // understands exactly what went wrong and can try a different approach.
          // ──────────────────────────────────────────────────────────────────
          const correctionPrompt = `You are a Scryfall query expert. Your previous translation attempt produced an INVALID query.

ORIGINAL FEEDBACK:
- User searched for: "${feedback.original_query}"
- User's issue: "${feedback.issue_description}"

YOUR PREVIOUS ATTEMPT FAILED:
- You generated: "${ruleData.scryfall_syntax}"
- Scryfall error: "${scryfallError}"

COMMON REASONS FOR FAILURE:
1. Impossible type combos: t:artifact AND t:instant are mutually exclusive — use otag:artifact-removal instead
2. Non-existent oracle tags: only use verified tags (otag:ramp, otag:removal, otag:board-wipe, etc.)
3. Wrong syntax: check spelling, use mv: not cmc:, use is: not has:
4. Over-constrained: too many filters = 0 results — simplify

AVAILABLE ORACLE TAGS (verified valid):
otag:ramp, otag:mana-rock, otag:mana-dork, otag:draw, otag:tutor, otag:removal, otag:board-wipe,
otag:artifact-removal, otag:enchantment-removal, otag:graveyard-hate, otag:recursion, otag:counter,
otag:lifegain, otag:burn, otag:evasion, otag:blink, otag:bounce, otag:copy, otag:theft, otag:discard,
otag:sacrifice-outlet, otag:extra-turn, otag:cost-reducer, otag:lord, otag:anthem, otag:mill, otag:pinger

Try a DIFFERENT approach — simpler is better. If the failed query used type filters, switch to oracle tags.
If it used oracle tags, fall back to oracle text search with o:"...".

Respond in this EXACT JSON format only (no other text):
{
  "pattern": "natural language pattern to match",
  "scryfall_syntax": "corrected Scryfall syntax that WILL return results",
  "description": "brief explanation of what changed and why",
  "confidence": 0.7,
  "uses_otag": false
}`;

          let correctedRuleData: typeof ruleData | null = null;
          try {
            const correctionResponse = await fetch(
              'https://ai.gateway.lovable.dev/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash-lite',
                  messages: [{ role: 'user', content: correctionPrompt }],
                  temperature: 0.2,
                }),
              },
            );

            if (correctionResponse.ok) {
              const correctionData = await correctionResponse.json();
              const correctionText =
                correctionData.choices?.[0]?.message?.content || '';
              const jsonMatch = correctionText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                correctedRuleData = JSON.parse(jsonMatch[0]);
                correctedRuleData.scryfall_syntax = normalizeTagAliases(
                  correctedRuleData.scryfall_syntax,
                );
                logger.info('ai_self_correction_generated', {
                  feedbackId: feedback.id,
                  scryfallSyntax: correctedRuleData.scryfall_syntax,
                });
              }
            }
          } catch (correctionErr) {
            logger.error('ai_self_correction_failed', {
              feedbackId: feedback.id,
              error:
                correctionErr instanceof Error
                  ? correctionErr.message
                  : String(correctionErr),
            });
          }

          // Validate the corrected syntax against Scryfall
          let correctionOk = false;
          if (
            correctedRuleData?.scryfall_syntax &&
            correctedRuleData.confidence >= 0.5
          ) {
            try {
              const correctionValidationUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
                correctedRuleData.scryfall_syntax,
              )}&extras=true`;
              const correctionResp = await fetch(correctionValidationUrl, {
                headers: { 'User-Agent': 'OffMeta/1.0 (feedback-validator)' },
              });

              if (correctionResp.status === 200) {
                const correctionScryfallData = await correctionResp.json();
                const correctionCards = correctionScryfallData.total_cards ?? 0;
                if (correctionCards > 0) {
                  correctionOk = true;
                  scryfallTotalCards = correctionCards;
                  ruleData = correctedRuleData;
                  logger.info('self_correction_validation_passed', {
                    feedbackId: feedback.id,
                    scryfallSyntax: ruleData.scryfall_syntax,
                    scryfallTotalCards,
                  });
                } else {
                  logger.error('self_correction_zero_results', {
                    feedbackId: feedback.id,
                  });
                }
              } else {
                await correctionResp.text();
                logger.error('self_correction_scryfall_http_error', {
                  feedbackId: feedback.id,
                  status: correctionResp.status,
                });
              }
            } catch (correctionFetchErr) {
              logger.warn('self_correction_validation_network_error', {
                feedbackId: feedback.id,
                error:
                  correctionFetchErr instanceof Error
                    ? correctionFetchErr.message
                    : String(correctionFetchErr),
              });
            }
          }

          if (!correctionOk) {
            logger.error('validation_attempts_failed', {
              feedbackId: feedback.id,
            });
            await supabase
              .from('search_feedback')
              .update({
                processing_status: 'failed',
                processed_at: new Date().toISOString(),
              })
              .eq('id', feedback.id);
            results.push({
              feedbackId: feedback.id,
              status: `failed - no_results after self-correction: ${scryfallError}`,
            });
            continue;
          }
          // Self-correction succeeded — fall through with promoted ruleData
          scryfallOk = true;
        }

        logger.info('scryfall_validation_passed', {
          feedbackId: feedback.id,
          scryfallSyntax: ruleData.scryfall_syntax,
          scryfallTotalCards,
        });

        // Persist the validated card count so admins can see rule breadth
        await supabase
          .from('search_feedback')
          .update({ scryfall_validation_count: scryfallTotalCards })
          .eq('id', feedback.id);

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

            logger.info('existing_rule_updated_from_retry_feedback', {
              pattern: ruleData.pattern,
              scryfallSyntax: ruleData.scryfall_syntax,
            });
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

        const normalizedConfidence = Math.min(
          1,
          Math.max(0, ruleData.confidence),
        );
        const autoApproved =
          normalizedConfidence >= AUTO_APPROVE_CONFIDENCE &&
          scryfallTotalCards >= AUTO_APPROVE_MIN_RESULTS;

        // Insert the new rule
        const { data: newRule, error: insertError } = await supabase
          .from('translation_rules')
          .insert({
            pattern: ruleData.pattern.toLowerCase(),
            scryfall_syntax: ruleData.scryfall_syntax,
            description: ruleData.description,
            source_feedback_id: feedback.id,
            confidence: normalizedConfidence,
            is_active: autoApproved,
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
          status: autoApproved
            ? 'success (auto-approved)'
            : 'success (completed, awaiting admin activation)',
          rule: `${ruleData.pattern} → ${ruleData.scryfall_syntax}`,
        });

        logger.info('rule_generated_from_feedback', {
          pattern: ruleData.pattern,
          scryfallSyntax: ruleData.scryfall_syntax,
        });
      } catch (processingError) {
        logger.error('feedback_processing_error', {
          feedbackId: feedback.id,
          error:
            processingError instanceof Error
              ? processingError.message
              : String(processingError),
        });
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
    logger.error('process_feedback_error', {
      error: error instanceof Error ? error.message : String(error),
    });
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
