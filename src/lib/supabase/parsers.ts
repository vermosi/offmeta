import type { Json, Tables } from '@/integrations/supabase/types';
import type {
  FeedbackItem,
  TranslationRuleRow,
} from '@/pages/admin-analytics/types';

export interface CollectionStatsData {
  unique_cards: number;
  total_cards: number;
  estimated_value: number;
}

export interface QueryIntelligence {
  normalized_query: string;
  search_quality_score: number;
  confidence: number;
  total_searches: number;
  successful_searches: number;
  result_clicks: number;
  refinements: number;
  no_results: number;
  recoveries: number;
  feedback_reports: number;
  updated_at: string;
}

interface FunnelCounts {
  totalSessions: number;
  searchedSessions: number;
  clickedSessions: number;
  affiliateSessions: number;
}

export interface ConversionFunnelData {
  sequential: FunnelCounts;
  independent: FunnelCounts;
  eventTotals: Record<string, number>;
  utmSources: UtmRow[];
}

export interface UtmRow {
  source: string;
  sessions: number;
  searches: number;
  clicks: number;
  affiliates: number;
}

export interface SystemStatusData {
  cronJobs: CronJob[];
  dataFreshness: Record<string, DataFreshnessEntry>;
  serverTime: string;
}

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  last_status: string | null;
  last_run_at: string | null;
  last_end_at: string | null;
  last_duration_s: number | null;
  last_message: string | null;
  failures_24h: number;
  runs_24h: number;
}

interface DataFreshnessEntry {
  count: number;
  latest?: string | null;
  active?: number;
  pending?: number;
}

export interface AIUsageStatsData {
  summary: UsageSummary;
  byModel: ModelRow[];
  byFunction: FunctionRow[];
  daily: DailyRow[];
}

interface UsageSummary {
  total_requests: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_duration_ms: number;
  total_retries: number;
}

interface ModelRow {
  model: string;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  avg_duration_ms: number;
  total_retries: number;
}

interface FunctionRow {
  function_name: string;
  request_count: number;
  total_tokens: number;
  avg_duration_ms: number;
}

interface DailyRow {
  day: string;
  tokens: number;
  requests: number;
}

export interface AuthFailureEvent {
  id: string;
  created_at: string;
  event_data: {
    error?: string;
    origin?: string;
    user_agent_prefix?: string;
    function_name?: string;
  };
}

type SearchFeedbackRow = Tables<'search_feedback'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseTranslationRule(
  value: unknown,
): FeedbackItem['translation_rules'] {
  if (!isRecord(value)) return null;
  if (
    !isString(value.pattern) ||
    !isString(value.scryfall_syntax) ||
    typeof value.is_active !== 'boolean'
  ) {
    return null;
  }

  return {
    pattern: value.pattern,
    scryfall_syntax: value.scryfall_syntax,
    confidence: isNumber(value.confidence) ? value.confidence : null,
    is_active: value.is_active,
    description: isString(value.description) ? value.description : null,
  };
}

export function parseFeedbackItem(value: unknown): FeedbackItem | null {
  if (!isRecord(value)) return null;

  const requiredStrings: Array<keyof SearchFeedbackRow> = [
    'id',
    'original_query',
    'issue_description',
    'created_at',
  ];
  for (const key of requiredStrings) {
    if (!isString(value[key])) return null;
  }

  return {
    id: value.id,
    original_query: value.original_query,
    translated_query: isString(value.translated_query)
      ? value.translated_query
      : null,
    issue_description: value.issue_description,
    processing_status: isString(value.processing_status)
      ? value.processing_status
      : null,
    created_at: value.created_at,
    processed_at: isString(value.processed_at) ? value.processed_at : null,
    generated_rule_id: isString(value.generated_rule_id)
      ? value.generated_rule_id
      : null,
    scryfall_validation_count: isNumber(value.scryfall_validation_count)
      ? value.scryfall_validation_count
      : null,
    translation_rules: parseTranslationRule(value.translation_rules),
  };
}

export function parseFeedbackItems(value: unknown): FeedbackItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => parseFeedbackItem(row))
    .filter((row): row is FeedbackItem => row !== null);
}

export function parseTranslationRuleRow(
  value: unknown,
): TranslationRuleRow | null {
  if (!isRecord(value)) return null;

  const required = ['id', 'pattern', 'scryfall_syntax', 'created_at'] as const;
  for (const key of required) {
    if (!isString(value[key])) return null;
  }

  return {
    id: value.id,
    pattern: value.pattern,
    scryfall_syntax: value.scryfall_syntax,
    confidence: isNumber(value.confidence) ? value.confidence : null,
    is_active: typeof value.is_active === 'boolean' ? value.is_active : false,
    description: isString(value.description) ? value.description : null,
    created_at: value.created_at,
    source_feedback_id: isString(value.source_feedback_id)
      ? value.source_feedback_id
      : null,
    archived_at: isString(value.archived_at) ? value.archived_at : null,
  };
}

export function parseTranslationRuleRows(value: unknown): TranslationRuleRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => parseTranslationRuleRow(row))
    .filter((row): row is TranslationRuleRow => row !== null);
}

export function parseCollectionStatsData(
  value: Json,
): CollectionStatsData | null {
  if (!isRecord(value)) return null;
  if (
    !isNumber(value.unique_cards) ||
    !isNumber(value.total_cards) ||
    !isNumber(value.estimated_value)
  ) {
    return null;
  }

  return {
    unique_cards: value.unique_cards,
    total_cards: value.total_cards,
    estimated_value: value.estimated_value,
  };
}

export function parseQueryIntelligence(
  value: unknown,
): QueryIntelligence | null {
  if (!isRecord(value)) return null;

  const requiredStrings = ['normalized_query', 'updated_at'] as const;
  for (const key of requiredStrings) {
    if (!isString(value[key])) return null;
  }

  const requiredNumbers = [
    'search_quality_score',
    'confidence',
    'total_searches',
    'successful_searches',
    'result_clicks',
    'refinements',
    'no_results',
    'recoveries',
    'feedback_reports',
  ] as const;

  for (const key of requiredNumbers) {
    if (!isNumber(value[key])) return null;
  }

  return {
    normalized_query: value.normalized_query,
    search_quality_score: value.search_quality_score,
    confidence: value.confidence,
    total_searches: value.total_searches,
    successful_searches: value.successful_searches,
    result_clicks: value.result_clicks,
    refinements: value.refinements,
    no_results: value.no_results,
    recoveries: value.recoveries,
    feedback_reports: value.feedback_reports,
    updated_at: value.updated_at,
  };
}

export function parseQueryIntelligenceRows(
  value: unknown,
): QueryIntelligence[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => parseQueryIntelligence(row))
    .filter((row): row is QueryIntelligence => row !== null);
}

export function parseConversionFunnelData(
  value: unknown,
): ConversionFunnelData | null {
  if (!isRecord(value)) return null;
  if (!isRecord(value.sequential) || !isRecord(value.independent)) return null;

  const parseCounts = (
    counts: Record<string, unknown>,
  ): FunnelCounts | null => {
    if (
      !isNumber(counts.totalSessions) ||
      !isNumber(counts.searchedSessions) ||
      !isNumber(counts.clickedSessions) ||
      !isNumber(counts.affiliateSessions)
    ) {
      return null;
    }

    return {
      totalSessions: counts.totalSessions,
      searchedSessions: counts.searchedSessions,
      clickedSessions: counts.clickedSessions,
      affiliateSessions: counts.affiliateSessions,
    };
  };

  const sequential = parseCounts(value.sequential);
  const independent = parseCounts(value.independent);
  if (!sequential || !independent) return null;

  const eventTotals: Record<string, number> = {};
  if (isRecord(value.eventTotals)) {
    for (const [k, v] of Object.entries(value.eventTotals)) {
      if (isNumber(v)) eventTotals[k] = v;
    }
  }

  const utmSources = Array.isArray(value.utmSources)
    ? value.utmSources.filter((row): row is UtmRow => {
        if (!isRecord(row)) return false;
        return (
          isString(row.source) &&
          isNumber(row.sessions) &&
          isNumber(row.searches) &&
          isNumber(row.clicks) &&
          isNumber(row.affiliates)
        );
      })
    : [];

  return { sequential, independent, eventTotals, utmSources };
}

export function parseSystemStatusData(value: unknown): SystemStatusData | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.cronJobs) ||
    !isRecord(value.dataFreshness) ||
    !isString(value.serverTime)
  ) {
    return null;
  }

  const cronJobs = value.cronJobs.filter((job): job is CronJob => {
    if (!isRecord(job)) return false;
    return (
      isNumber(job.jobid) &&
      isString(job.jobname) &&
      isString(job.schedule) &&
      (job.last_status === null || isString(job.last_status)) &&
      (job.last_run_at === null || isString(job.last_run_at)) &&
      (job.last_end_at === null || isString(job.last_end_at)) &&
      (job.last_duration_s === null || isNumber(job.last_duration_s)) &&
      (job.last_message === null || isString(job.last_message)) &&
      isNumber(job.failures_24h) &&
      isNumber(job.runs_24h)
    );
  });

  const dataFreshness: Record<string, DataFreshnessEntry> = {};
  for (const [key, entry] of Object.entries(value.dataFreshness)) {
    if (!isRecord(entry) || !isNumber(entry.count)) continue;
    dataFreshness[key] = {
      count: entry.count,
      latest: isString(entry.latest) ? entry.latest : null,
      active: isNumber(entry.active) ? entry.active : undefined,
      pending: isNumber(entry.pending) ? entry.pending : undefined,
    };
  }

  return { cronJobs, dataFreshness, serverTime: value.serverTime };
}

export function parseAIUsageStatsData(value: unknown): AIUsageStatsData | null {
  if (
    !isRecord(value) ||
    !isRecord(value.summary) ||
    !Array.isArray(value.byModel) ||
    !Array.isArray(value.byFunction) ||
    !Array.isArray(value.daily)
  ) {
    return null;
  }

  const summaryRecord = value.summary;
  const summary: UsageSummary | null =
    isNumber(summaryRecord.total_requests) &&
    isNumber(summaryRecord.total_tokens) &&
    isNumber(summaryRecord.total_prompt_tokens) &&
    isNumber(summaryRecord.total_completion_tokens) &&
    isNumber(summaryRecord.avg_duration_ms) &&
    isNumber(summaryRecord.total_retries)
      ? {
          total_requests: summaryRecord.total_requests,
          total_tokens: summaryRecord.total_tokens,
          total_prompt_tokens: summaryRecord.total_prompt_tokens,
          total_completion_tokens: summaryRecord.total_completion_tokens,
          avg_duration_ms: summaryRecord.avg_duration_ms,
          total_retries: summaryRecord.total_retries,
        }
      : null;

  if (!summary) return null;

  const byModel = value.byModel.filter((row): row is ModelRow => {
    if (!isRecord(row)) return false;
    return (
      isString(row.model) &&
      isNumber(row.request_count) &&
      isNumber(row.prompt_tokens) &&
      isNumber(row.completion_tokens) &&
      isNumber(row.total_tokens) &&
      isNumber(row.avg_duration_ms) &&
      isNumber(row.total_retries)
    );
  });

  const byFunction = value.byFunction.filter((row): row is FunctionRow => {
    if (!isRecord(row)) return false;
    return (
      isString(row.function_name) &&
      isNumber(row.request_count) &&
      isNumber(row.total_tokens) &&
      isNumber(row.avg_duration_ms)
    );
  });

  const daily = value.daily.filter((row): row is DailyRow => {
    if (!isRecord(row)) return false;
    return isString(row.day) && isNumber(row.tokens) && isNumber(row.requests);
  });

  return { summary, byModel, byFunction, daily };
}

export function parseAuthFailureEvents(value: unknown): AuthFailureEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is AuthFailureEvent => {
    if (
      !isRecord(row) ||
      !isString(row.id) ||
      !isString(row.created_at) ||
      !isRecord(row.event_data)
    ) {
      return false;
    }

    const eventData = row.event_data;
    return (
      (eventData.error === undefined || isString(eventData.error)) &&
      (eventData.origin === undefined || isString(eventData.origin)) &&
      (eventData.user_agent_prefix === undefined ||
        isString(eventData.user_agent_prefix)) &&
      (eventData.function_name === undefined ||
        isString(eventData.function_name))
    );
  });
}

export const EMPTY_COLLECTION_STATS: CollectionStatsData = {
  unique_cards: 0,
  total_cards: 0,
  estimated_value: 0,
};

export const EMPTY_QUERY_INTELLIGENCE: QueryIntelligence | null = null;
