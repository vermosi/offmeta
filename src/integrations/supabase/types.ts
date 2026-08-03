export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          session_id?: string | null
        }
        Relationships: []
      }
      card_cooccurrence: {
        Row: {
          card_a_oracle_id: string
          card_b_oracle_id: string
          context: Json
          cooccurrence_count: number
          format: string
          relationship_type: string
          source: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          card_a_oracle_id: string
          card_b_oracle_id: string
          context?: Json
          cooccurrence_count?: number
          format?: string
          relationship_type?: string
          source?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          card_a_oracle_id?: string
          card_b_oracle_id?: string
          context?: Json
          cooccurrence_count?: number
          format?: string
          relationship_type?: string
          source?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      card_names: {
        Row: {
          name: string
          name_lower: string
          updated_at: string
        }
        Insert: {
          name: string
          name_lower: string
          updated_at?: string
        }
        Update: {
          name?: string
          name_lower?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_signals: {
        Row: {
          card_id: string
          click_count: number
          deck_count: number
          save_count: number
          search_count: number
          synergy_score: number
          trend_score: number
          updated_at: string
        }
        Insert: {
          card_id: string
          click_count?: number
          deck_count?: number
          save_count?: number
          search_count?: number
          synergy_score?: number
          trend_score?: number
          updated_at?: string
        }
        Update: {
          card_id?: string
          click_count?: number
          deck_count?: number
          save_count?: number
          search_count?: number
          synergy_score?: number
          trend_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          cmc: number
          colors: string[]
          image_url: string | null
          legalities: Json | null
          mana_cost: string | null
          name: string
          oracle_id: string
          oracle_text: string | null
          rarity: string | null
          type_line: string | null
          updated_at: string
        }
        Insert: {
          cmc?: number
          colors?: string[]
          image_url?: string | null
          legalities?: Json | null
          mana_cost?: string | null
          name: string
          oracle_id: string
          oracle_text?: string | null
          rarity?: string | null
          type_line?: string | null
          updated_at?: string
        }
        Update: {
          cmc?: number
          colors?: string[]
          image_url?: string | null
          legalities?: Json | null
          mana_cost?: string | null
          name?: string
          oracle_id?: string
          oracle_text?: string | null
          rarity?: string | null
          type_line?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      curated_searches: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          natural_query: string
          priority: number
          scryfall_query: string
          slug: string
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          natural_query: string
          priority?: number
          scryfall_query: string
          slug: string
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          natural_query?: string
          priority?: number
          scryfall_query?: string
          slug?: string
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_snapshots: {
        Row: {
          card_name: string
          id: string
          price_average: number | null
          price_foil: number | null
          price_low: number | null
          price_market: number | null
          price_usd: number | null
          price_usd_foil: number | null
          recorded_at: string
          scryfall_id: string | null
        }
        Insert: {
          card_name: string
          id?: string
          price_average?: number | null
          price_foil?: number | null
          price_low?: number | null
          price_market?: number | null
          price_usd?: number | null
          price_usd_foil?: number | null
          recorded_at?: string
          scryfall_id?: string | null
        }
        Update: {
          card_name?: string
          id?: string
          price_average?: number | null
          price_foil?: number | null
          price_low?: number | null
          price_market?: number | null
          price_usd?: number | null
          price_usd_foil?: number | null
          recorded_at?: string
          scryfall_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          confidence: number
          created_at: string
          expires_at: string
          explanation: Json
          hit_count: number
          id: string
          last_hit_at: string | null
          normalized_query: string
          query_hash: string
          scryfall_query: string
          show_affiliate: boolean
        }
        Insert: {
          confidence?: number
          created_at?: string
          expires_at?: string
          explanation?: Json
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          normalized_query: string
          query_hash: string
          scryfall_query: string
          show_affiliate?: boolean
        }
        Update: {
          confidence?: number
          created_at?: string
          expires_at?: string
          explanation?: Json
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          normalized_query?: string
          query_hash?: string
          scryfall_query?: string
          show_affiliate?: boolean
        }
        Relationships: []
      }
      query_intelligence_agg: {
        Row: {
          avg_time_to_click_ms: number | null
          confidence: number
          feedback_reports: number
          no_results: number
          normalized_query: string
          recoveries: number
          refinements: number
          result_clicks: number
          sample_size: number
          search_quality_score: number
          successful_searches: number
          total_searches: number
          updated_at: string
        }
        Insert: {
          avg_time_to_click_ms?: number | null
          confidence?: number
          feedback_reports?: number
          no_results?: number
          normalized_query: string
          recoveries?: number
          refinements?: number
          result_clicks?: number
          sample_size?: number
          search_quality_score?: number
          successful_searches?: number
          total_searches?: number
          updated_at?: string
        }
        Update: {
          avg_time_to_click_ms?: number | null
          confidence?: number
          feedback_reports?: number
          no_results?: number
          normalized_query?: string
          recoveries?: number
          refinements?: number
          result_clicks?: number
          sample_size?: number
          search_quality_score?: number
          successful_searches?: number
          total_searches?: number
          updated_at?: string
        }
        Relationships: []
      }
      query_signal_events: {
        Row: {
          created_at: string
          dedupe_hash: string
          event_type: string
          id: string
          metadata: Json
          normalized_query: string
          session_id: string | null
          time_to_click_ms: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_hash: string
          event_type: string
          id?: string
          metadata?: Json
          normalized_query: string
          session_id?: string | null
          time_to_click_ms?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_hash?: string
          event_type?: string
          id?: string
          metadata?: Json
          normalized_query?: string
          session_id?: string | null
          time_to_click_ms?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_feedback: {
        Row: {
          created_at: string
          generated_rule_id: string | null
          id: string
          issue_description: string
          original_query: string
          processed_at: string | null
          processing_status: string | null
          scryfall_validation_count: number | null
          translated_query: string | null
        }
        Insert: {
          created_at?: string
          generated_rule_id?: string | null
          id?: string
          issue_description: string
          original_query: string
          processed_at?: string | null
          processing_status?: string | null
          scryfall_validation_count?: number | null
          translated_query?: string | null
        }
        Update: {
          created_at?: string
          generated_rule_id?: string | null
          id?: string
          issue_description?: string
          original_query?: string
          processed_at?: string | null
          processing_status?: string | null
          scryfall_validation_count?: number | null
          translated_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_search_feedback_generated_rule"
            columns: ["generated_rule_id"]
            isOneToOne: false
            referencedRelation: "translation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_health_checks: {
        Row: {
          check_type: string
          details: Json
          id: number
          passed: boolean
          ran_at: string
          severity: string
          target_url: string
        }
        Insert: {
          check_type: string
          details?: Json
          id?: number
          passed: boolean
          ran_at?: string
          severity?: string
          target_url: string
        }
        Update: {
          check_type?: string
          details?: Json
          id?: number
          passed?: boolean
          ran_at?: string
          severity?: string
          target_url?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          content_json: Json
          created_at: string
          id: string
          published_at: string | null
          query: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          id?: string
          published_at?: string | null
          query: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          id?: string
          published_at?: string | null
          query?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      translation_logs: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          fallback_used: boolean | null
          filters_applied: Json | null
          id: string
          model_used: string
          natural_language_query: string
          pre_translation_attempted: boolean | null
          pre_translation_skipped_reason: string | null
          quality_flags: string[] | null
          response_time_ms: number | null
          result_count: number | null
          source: string | null
          translated_query: string
          validation_issues: string[] | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          fallback_used?: boolean | null
          filters_applied?: Json | null
          id?: string
          model_used?: string
          natural_language_query: string
          pre_translation_attempted?: boolean | null
          pre_translation_skipped_reason?: string | null
          quality_flags?: string[] | null
          response_time_ms?: number | null
          result_count?: number | null
          source?: string | null
          translated_query: string
          validation_issues?: string[] | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          fallback_used?: boolean | null
          filters_applied?: Json | null
          id?: string
          model_used?: string
          natural_language_query?: string
          pre_translation_attempted?: boolean | null
          pre_translation_skipped_reason?: string | null
          quality_flags?: string[] | null
          response_time_ms?: number | null
          result_count?: number | null
          source?: string | null
          translated_query?: string
          validation_issues?: string[] | null
        }
        Relationships: []
      }
      translation_rules: {
        Row: {
          archived_at: string | null
          confidence: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          pattern: string
          scryfall_syntax: string
          source_feedback_id: string | null
        }
        Insert: {
          archived_at?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          pattern: string
          scryfall_syntax: string
          source_feedback_id?: string | null
        }
        Update: {
          archived_at?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          pattern?: string
          scryfall_syntax?: string
          source_feedback_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_rules_source_feedback_id_fkey"
            columns: ["source_feedback_id"]
            isOneToOne: false
            referencedRelation: "search_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_query_signal: {
        Args: {
          p_event_type: string
          p_metadata: Json
          p_query: string
          p_session_id: string
          p_time_to_click_ms: number
          p_user_id: string
        }
        Returns: undefined
      }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      compute_query_quality: {
        Args: {
          avg_time_to_click_ms: number
          feedback_reports: number
          no_results: number
          recoveries: number
          refinements: number
          result_clicks: number
          successful_searches: number
          total_searches: number
        }
        Returns: {
          confidence: number
          score: number
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_ai_usage_stats: { Args: { days_back?: number }; Returns: Json }
      get_card_recommendations: {
        Args: {
          result_limit?: number
          target_format?: string
          target_oracle_id: string
        }
        Returns: {
          card_name: string
          cooccurrence_count: number
          image_url: string
          mana_cost: string
          oracle_id: string
          relationship_type: string
          type_line: string
          weight: number
        }[]
      }
      get_conversion_funnel: { Args: { days_back?: number }; Returns: Json }
      get_edge_function_status: {
        Args: never
        Returns: {
          active: boolean
          function_name: string
          jobid: number
          jobname: string
          last_http_at: string
          last_http_error: string
          last_http_status_code: number
          last_return_message: string
          last_run_at: string
          last_run_status: string
          schedule: string
        }[]
      }
      get_price_movers: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          card_name: string
          change_percent: number
          colors: string[]
          current_price: number
          direction: string
          legalities: Json
          previous_price: number
          rarity: string
          scryfall_id: string
          type_line: string
        }[]
      }
      get_promotion_candidates: {
        Args: {
          max_results?: number
          min_confidence?: number
          min_frequency?: number
          since_date: string
        }
        Returns: {
          avg_confidence: number
          frequency: number
          query: string
          top_translation: string
        }[]
      }
      get_query_intelligence: {
        Args: { p_query: string }
        Returns: {
          confidence: number
          feedback_reports: number
          no_results: number
          normalized_query: string
          recoveries: number
          refinements: number
          result_clicks: number
          search_quality_score: number
          successful_searches: number
          total_searches: number
          updated_at: string
        }[]
      }
      get_search_analytics: {
        Args: { max_low_confidence?: number; since_date: string }
        Returns: Json
      }
      get_search_failure_breakdown: {
        Args: { since_date: string; until_date?: string }
        Returns: {
          failure_reason: string
          fuzzy_attempted: number
          fuzzy_fix_rate_pct: number
          fuzzy_resolved: number
          share_pct: number
          total: number
        }[]
      }
      get_seo_health_summary: { Args: never; Returns: Json }
      get_system_status: { Args: never; Returns: Json }
      get_zero_result_candidates: {
        Args: {
          max_results?: number
          min_frequency?: number
          since_date: string
        }
        Returns: {
          frequency: number
          last_translation: string
          query: string
        }[]
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      match_concepts_by_alias: {
        Args: { match_count?: number; search_term: string }
        Returns: {
          category: string
          concept_id: string
          confidence: number
          description: string
          negative_templates: string[]
          pattern: string
          priority: number
          scryfall_syntax: string
          scryfall_templates: string[]
          similarity_score: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      prune_old_price_snapshots: { Args: never; Returns: undefined }
      prune_old_seo_health_checks: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
