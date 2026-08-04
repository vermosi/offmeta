/**
 * Server-side error reporting helper.
 *
 * Records a failure into public.error_events via the deduplicating
 * report_error_event RPC. Never throws: monitoring must not be able to break
 * the pipeline it is monitoring.
 *
 * @module functions/_shared/errorReporter
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ReportErrorInput {
  /** Where the failure happened, e.g. 'submit-sitemap', 'seo-health-check'. */
  source: string;
  /** Stable machine-readable class, e.g. 'sitemap_fetch_failed'. */
  errorType: string;
  message: string;
  url?: string;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
}

/**
 * Fire-and-forget report. Returns true when the row was accepted.
 */
export async function reportEdgeError(input: ReportErrorInput): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return false;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/report_error_event`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_source: input.source,
        p_error_type: input.errorType,
        p_message: String(input.message).slice(0, 2000),
        p_url: input.url ?? null,
        p_severity: input.severity ?? 'error',
        p_context: input.context ?? {},
      }),
    });
    if (!res.ok) {
      console.warn(
        `reportEdgeError failed [${res.status}]: ${await res.text()}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn('reportEdgeError threw:', String(err));
    return false;
  }
}
