import { getVisitorId } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';

export type RecommendationModelVersion = 'baseline' | 'v2';

export interface RecommendationRolloutAssignment {
  stage: 'shadow' | '5' | '25' | '50' | '100';
  rolloutPercent: number;
  serveVersion: RecommendationModelVersion;
  runShadow: boolean;
  bucket: number;
}

interface AssignmentRow {
  stage: RecommendationRolloutAssignment['stage'];
  rollout_percent: number;
  serve_version: RecommendationModelVersion;
  run_shadow: boolean;
  bucket: number;
}

const FALLBACK: RecommendationRolloutAssignment = {
  stage: 'shadow',
  rolloutPercent: 0,
  serveVersion: 'baseline',
  runShadow: false,
  bucket: 0,
};
let cached: {
  value: RecommendationRolloutAssignment;
  expiresAt: number;
} | null = null;
const latencies = new Map<string, number>();

export async function getRecommendationRolloutAssignment(): Promise<RecommendationRolloutAssignment> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const { data, error } = await supabase.functions.invoke(
      'recommendation-rollout',
      {
        body: { action: 'assignment', subjectKey: getVisitorId() },
      },
    );
    const row = data?.assignment as AssignmentRow | undefined;
    if (error || !row) return FALLBACK;
    const value = {
      stage: row.stage,
      rolloutPercent: row.rollout_percent,
      serveVersion: row.serve_version,
      runShadow: row.run_shadow,
      bucket: row.bucket,
    } satisfies RecommendationRolloutAssignment;
    cached = { value, expiresAt: Date.now() + 5 * 60_000 };
    return value;
  } catch {
    return FALLBACK;
  }
}

export function observeRecommendationRollout(
  requestId: string,
  modelVersion: RecommendationModelVersion,
  latencyMs: number,
  outcome: {
    usefulClick?: boolean;
    immediateRefinement?: boolean;
    negativeFeedback?: boolean;
    constraintViolation?: boolean;
    errored?: boolean;
    correctnessPassed?: boolean | null;
  } = {},
): void {
  const originalLatency =
    latencies.get(requestId) ?? Math.max(0, Math.round(latencyMs));
  latencies.set(requestId, originalLatency);
  void supabase.functions.invoke('recommendation-rollout', {
    body: {
      action: 'observe',
      requestId,
      subjectKey: getVisitorId(),
      modelVersion,
      latencyMs: originalLatency,
      ...outcome,
    },
  });
}
