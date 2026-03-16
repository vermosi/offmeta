/**
 * Shared feedback submission service.
 * Handles insert into search_feedback, background processing trigger,
 * rate-limit recording, and analytics tracking.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { recordSubmission } from '@/lib/feedback/rate-limit';

export interface FeedbackPayload {
  originalQuery: string;
  translatedQuery: string | null;
  issueDescription: string;
}

/**
 * Insert feedback into search_feedback and trigger background processing.
 * Returns the generated feedback ID on success.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<string> {
  const feedbackId = crypto.randomUUID();

  const { error } = await supabase.from('search_feedback').insert({
    id: feedbackId,
    original_query: payload.originalQuery.substring(0, 500),
    translated_query: payload.translatedQuery?.substring(0, 1000) ?? null,
    issue_description: payload.issueDescription.substring(0, 2000),
  });

  if (error) {
    logger.error('Feedback insert error', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw error;
  }

  // Non-critical side effects — isolated so they never break the success path
  try { recordSubmission(); } catch { /* ignore localStorage errors */ }

  // Fire-and-forget background processing
  triggerProcessing(feedbackId);

  return feedbackId;
}

/**
 * Trigger the process-feedback edge function if the user has a valid session.
 */
async function triggerProcessing(feedbackId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      logger.info('Skipping auto-processing: user not authenticated');
      return;
    }
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
      logger.info('Skipping auto-processing: session expired');
      return;
    }
    await supabase.functions.invoke('process-feedback', {
      body: { feedbackId },
    });
  } catch (error) {
    logger.info('Background processing triggered', error);
  }
}
