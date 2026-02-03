import { supabase } from './client.ts';

export interface LogEntry {
  natural_language_query: string;
  translated_query: string;
  model_used: string;
  confidence_score: number;
  response_time_ms: number;
  validation_issues: string[];
  quality_flags: string[];
  filters_applied: Record<string, unknown> | null;
  fallback_used: boolean;
}

const logQueue: LogEntry[] = [];
export const LOG_BATCH_SIZE = 10;
export const LOG_BATCH_INTERVAL = 5000; // 5 seconds

/**
 * Flushes the log queue to the database in a single batch.
 */
export async function flushLogQueue(): Promise<void> {
  if (logQueue.length === 0) return;

  const batch = [...logQueue];
  logQueue.length = 0;

  try {
    const { error } = await supabase.from('translation_logs').insert(batch);
    if (error) throw error;
  } catch (e) {
    console.error('Failed to flush log queue:', e);
    // Put items back in queue if it failed, but only if queue isn't too large
    if (logQueue.length < 100) {
      logQueue.unshift(...batch);
    }
  }
}

/**
 * Queue translation log for batched async insert (non-blocking).
 */
export function logTranslation(
  naturalQuery: string,
  translatedQuery: string,
  confidenceScore: number,
  responseTimeMs: number,
  validationIssues: string[],
  qualityFlags: string[],
  filters: Record<string, unknown> | null,
  fallbackUsed: boolean,
): void {
  // Selective logging for cost optimization
  const shouldLog =
    Deno.env.get('LOG_ALL_TRANSLATIONS') === 'true' ||
    confidenceScore < 0.8 ||
    validationIssues.length > 0 ||
    qualityFlags.length > 0 ||
    fallbackUsed;

  if (!shouldLog) {
    return;
  }

  logQueue.push({
    natural_language_query: naturalQuery.substring(0, 500),
    translated_query: translatedQuery.substring(0, 1000),
    model_used: 'google/gemini-3-flash-preview',
    confidence_score: confidenceScore,
    response_time_ms: responseTimeMs,
    validation_issues: validationIssues,
    quality_flags: qualityFlags,
    filters_applied: filters,
    fallback_used: fallbackUsed,
  });

  if (logQueue.length >= LOG_BATCH_SIZE) {
    flushLogQueue();
  }
}

// Request-scoped logging helpers
export const createLogger = (requestId: string) => {
  return {
    logInfo: (event: string, data: Record<string, unknown> = {}) => {
      console.log(JSON.stringify({ level: 'info', event, requestId, ...data }));
    },
    logWarn: (event: string, data: Record<string, unknown> = {}) => {
      console.warn(
        JSON.stringify({ level: 'warn', event, requestId, ...data }),
      );
    },
  };
};
