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

    const results: Array<{ feedbackId: string; status: string; rule?: string }> = [];

    for (const feedback of pendingFeedback) {
      try {
        // Mark as processing
        await supabase
          .from('search_feedback')
          .update({ processing_status: 'processing' })
          .eq('id', feedback.id);

        // Use AI to analyze the feedback and generate a rule
        const analysisPrompt = `You are a Scryfall query expert. Analyze this search feedback and generate a translation rule.

FEEDBACK:
- User searched for: "${feedback.original_query}"
- AI translated it to: "${feedback.translated_query || 'unknown'}"
- User's issue: "${feedback.issue_description}"

Your task:
1. Understand what the user ACTUALLY wanted
2. Identify what went wrong with the translation
3. Create a pattern-to-syntax rule that would fix this

Respond in this EXACT JSON format only (no other text):
{
  "pattern": "natural language pattern to match (e.g., 'cards that give haste')",
  "scryfall_syntax": "correct Scryfall syntax (e.g., 'o:\"gains haste\"')",
  "description": "brief explanation of what this rule does",
  "confidence": 0.8
}

Rules for your response:
- pattern should be lowercase and match common phrasings
- scryfall_syntax must be valid Scryfall search syntax
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

        // Check for duplicate patterns
        const { data: existingRule } = await supabase
          .from('translation_rules')
          .select('id')
          .ilike('pattern', ruleData.pattern)
          .limit(1);

        if (existingRule && existingRule.length > 0) {
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
