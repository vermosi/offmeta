/**
 * Process Feedback Edge Function
 * 
 * Automatically processes search feedback to generate new translation rules.
 * Called via webhook trigger when new feedback is submitted.
 * Uses Lovable AI to analyze the issue and propose a fix.
 * 
 * @module process-feedback
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get pending feedback to process
    const { data: pendingFeedback, error: fetchError } = await supabase
      .from('search_feedback')
      .select('*')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      throw new Error(`Failed to fetch feedback: ${fetchError.message}`);
    }

    if (!pendingFeedback || pendingFeedback.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending feedback to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Scryfall oracle tags (otag:) for AI guidance - standardized to match main translation system
    const SCRYFALL_OTAGS = [
      'otag:ramp', 'otag:removal', 'otag:draw', 'otag:tutor', 'otag:wrath',
      'otag:counter', 'otag:burn', 'otag:lifegain', 'otag:graveyard', 'otag:recursion',
      'otag:sacrifice', 'otag:blink', 'otag:copy', 'otag:steal', 'otag:protection',
      'otag:evasion', 'otag:haste', 'otag:flash', 'otag:cantrip', 'otag:pump',
      'otag:equipment', 'otag:aura', 'otag:land-destruction', 'otag:stax', 'otag:combo',
      'otag:token', 'otag:treasure', 'otag:clue', 'otag:food', 'otag:blood',
      'otag:artifact-synergy', 'otag:enchantment-synergy', 'otag:creature-synergy',
      'otag:tribal', 'otag:lord', 'otag:anthem', 'otag:cost-reducer', 'otag:untapper',
      'otag:tapper', 'otag:combat-trick', 'otag:fog', 'otag:ritual', 'otag:discard',
      'otag:mill', 'otag:voltron', 'otag:aggro', 'otag:control', 'otag:midrange',
      'otag:reanimator', 'otag:aristocrats', 'otag:spellslinger', 'otag:landfall',
      'otag:enchantress', 'otag:storm', 'otag:infect', 'otag:energy', 'otag:poison',
      'otag:proliferate', 'otag:flicker', 'otag:bounce', 'otag:exile', 'otag:impulse',
      'otag:wheels', 'otag:extra-turn', 'otag:extra-combat', 'otag:monarch',
      'otag:initiative', 'otag:dungeon', 'otag:cascade', 'otag:mutate', 'otag:morph',
      'otag:ninjutsu', 'otag:madness', 'otag:flashback', 'otag:retrace', 'otag:buyback',
      'otag:overload', 'otag:kicker', 'otag:multikicker', 'otag:entwine', 'otag:splice',
      'otag:mana-rock', 'otag:mana-dork', 'otag:gives-flash'
    ];

    const results: Array<{ feedbackId: string; status: string; rule?: string }> = [];
    const normalizeTagAliases = (syntax: string): string =>
      syntax.replace(/\bfunction:/gi, 'otag:').replace(/\boracletag:/gi, 'otag:');

    for (const feedback of pendingFeedback) {
      try {
        // Check how many times similar feedback has been submitted
        const { data: similarFeedback } = await supabase
          .from('search_feedback')
          .select('id, processing_status')
          .ilike('original_query', `%${feedback.original_query.split(' ').slice(0, 3).join('%')}%`)
          .neq('id', feedback.id);
        
        const previousAttempts = similarFeedback?.filter(f => 
          ['completed', 'duplicate', 'failed'].includes(f.processing_status || '')
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
- "board wipes" → "otag:wrath"
- "cost reducers for artifacts" → "otag:cost-reducer t:artifact"
- "mana rocks" → "otag:mana-rock"

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

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.3,
          }),
        });

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
              processed_at: new Date().toISOString()
            })
            .eq('id', feedback.id);
          results.push({ feedbackId: feedback.id, status: 'failed - parse error' });
          continue;
        }

        // Check if the rule is useful (confidence > 0.5)
        if (!ruleData.pattern || !ruleData.scryfall_syntax || ruleData.confidence < 0.5) {
          await supabase
            .from('search_feedback')
            .update({ 
              processing_status: 'skipped',
              processed_at: new Date().toISOString()
            })
            .eq('id', feedback.id);
          results.push({ feedbackId: feedback.id, status: 'skipped - low confidence' });
          continue;
        }

        // Normalize tag aliases for consistency before writing to translation_rules
        ruleData.scryfall_syntax = normalizeTagAliases(ruleData.scryfall_syntax);

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
                confidence: Math.min(1, Math.max(0, ruleData.confidence))
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
                generated_rule_id: existingRule[0].id
              })
              .eq('id', feedback.id);

            results.push({ 
              feedbackId: feedback.id, 
              status: 'updated existing rule',
              rule: `${ruleData.pattern} → ${ruleData.scryfall_syntax} (was: ${existingRule[0].scryfall_syntax})`
            });

            console.log('Updated existing rule from retry feedback:', ruleData.pattern, '→', ruleData.scryfall_syntax);
            continue;
          } else {
            // First time seeing this, but pattern exists - mark as duplicate
            await supabase
              .from('search_feedback')
              .update({ 
                processing_status: 'duplicate',
                processed_at: new Date().toISOString()
              })
              .eq('id', feedback.id);
            results.push({ feedbackId: feedback.id, status: 'skipped - duplicate pattern' });
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
            is_active: true
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
            generated_rule_id: newRule.id
          })
          .eq('id', feedback.id);

        results.push({ 
          feedbackId: feedback.id, 
          status: 'success',
          rule: `${ruleData.pattern} → ${ruleData.scryfall_syntax}`
        });

        console.log('Generated rule from feedback:', ruleData.pattern, '→', ruleData.scryfall_syntax);

      } catch (processingError) {
        console.error('Error processing feedback', feedback.id, ':', processingError);
        await supabase
          .from('search_feedback')
          .update({ 
            processing_status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', feedback.id);
        results.push({ 
          feedbackId: feedback.id, 
          status: `failed - ${processingError instanceof Error ? processingError.message : 'unknown error'}`
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${results.length} feedback items`,
      processed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Process feedback error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
