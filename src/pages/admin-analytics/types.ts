export interface TranslationRule {
  pattern: string;
  scryfall_syntax: string;
  confidence: number | null;
  is_active: boolean;
  description: string | null;
}

export interface FeedbackItem {
  id: string;
  original_query: string;
  translated_query: string | null;
  issue_description: string;
  processing_status: string | null;
  created_at: string;
  processed_at: string | null;
  generated_rule_id: string | null;
  scryfall_validation_count: number | null;
  translation_rules: TranslationRule | null;
}

export interface TranslationRuleRow {
  id: string;
  pattern: string;
  scryfall_syntax: string;
  confidence: number | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  source_feedback_id: string | null;
  archived_at: string | null;
}

export type RulesFilter = 'all' | 'active' | 'inactive';
export type FeedbackFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'archived';

export interface PopularQuery {
  query: string;
  count: number;
  avg_confidence: number;
  primary_source: string;
}

export interface AnalyticsData {
  summary: {
    totalSearches: number;
    avgConfidence: number;
    avgResponseTime: number;
    fallbackRate: number;
    days: number;
  };
  sourceBreakdown: Record<string, number>;
  confidenceBuckets: { high: number; medium: number; low: number };
  dailyVolume: Record<string, number>;
  eventBreakdown: Record<string, number>;
  lowConfidenceQueries: Array<{
    query: string;
    translated: string;
    confidence: number;
    source: string;
    time: string;
  }>;
  popularQueries: PopularQuery[];
  responsePercentiles: { p50: number; p95: number; p99: number };
  deterministicCoverage: Record<string, number>;
}

export interface QuerySignalEvent {
  event_type: string;
  created_at: string;
  time_to_click_ms: number | null;
  metadata: Record<string, unknown>;
}

export interface QueryRepairItem {
  normalized_query: string;
  display_query: string;
  total_searches: number;
  successful_searches: number;
  result_clicks: number;
  refinements: number;
  no_results: number;
  recoveries: number;
  feedback_reports: number;
  avg_time_to_click_ms: number | null;
  search_quality_score: number;
  confidence: number;
  sample_size: number;
  recent_translation_count: number;
  recent_feedback_count: number;
  existing_rule_count: number;
  matching_rule_count: number;
  has_active_rule: boolean;
  has_translation_rule: boolean;
  last_seen_at: string | null;
}

export interface QueryDetail extends QueryRepairItem {
  feedback: FeedbackItem[];
  rules: TranslationRuleRow[];
  recentOutcomes: QuerySignalEvent[];
}
