import { getAdminAccessToken } from '@/lib/admin/admin-analytics-api';
import { env } from '@/lib/core/env';

export async function createOrUpdateTranslationRule(input: {
  id?: string;
  pattern: string;
  scryfall_syntax: string;
  description?: string;
  confidence?: number;
  is_active?: boolean;
  source_feedback_id?: string | null;
}): Promise<{ success?: boolean; error?: string }> {
  const token = await getAdminAccessToken();
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/admin-search-quality-repair`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(input),
    },
  );

  const result = (await response.json()) as { success?: boolean; error?: string };
  if (!response.ok || result.success === false) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }

  return result;
}

export async function processFeedbackItem(feedbackId: string): Promise<{ status?: string }> {
  const token = await getAdminAccessToken();
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/process-feedback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ feedbackId }),
    },
  );

  const result = (await response.json()) as { status?: string; error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? `HTTP ${response.status}`);
  }

  return result;
}
