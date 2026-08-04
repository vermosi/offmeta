/**
 * Shared helper to trigger sitemap resubmission to Google Search Console
 * after a content pipeline generates new indexable pages.
 *
 * Fire-and-forget: never blocks or fails the calling pipeline.
 *
 * @module functions/_shared/sitemapPing
 */

export function pingSitemapSubmission(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  source: string;
  newUrlCount?: number;
  force?: boolean;
}): void {
  const { supabaseUrl, serviceRoleKey, source, newUrlCount, force } = options;

  fetch(`${supabaseUrl}/functions/v1/submit-sitemap`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source, newUrlCount, force: force === true }),
  }).catch((err) => {
    console.warn('[sitemapPing] failed to trigger submit-sitemap', String(err));
  });
}
