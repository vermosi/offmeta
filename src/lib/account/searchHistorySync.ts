/**
 * Best-effort mirror of search history to the account.
 *
 * Signed-out visitors keep history in localStorage; signed-in users get the
 * same list on every device. Failures are swallowed on purpose — history is a
 * convenience and must never interrupt a search.
 */

import { supabase } from '@/integrations/supabase/client';
import { normalizeQueryKey } from './cardMapping';

export async function recordSearchHistory(rawQuery: string): Promise<void> {
  const query = rawQuery.trim().slice(0, 500);
  if (!query) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    const normalized = normalizeQueryKey(query);

    const { data: existing } = await supabase
      .from('search_history')
      .select('id, run_count')
      .eq('normalized_query', normalized)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('search_history')
        .update({
          raw_query: query,
          run_count: (existing.run_count ?? 1) + 1,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return;
    }

    await supabase.from('search_history').insert({
      user_id: userId,
      raw_query: query,
      normalized_query: normalized,
    });
  } catch {
    /* history sync is non-critical */
  }
}
