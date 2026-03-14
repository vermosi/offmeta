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
      archetype_snapshots: {
        Row: {
          created_at: string
          deck_count: number
          deck_name: string
          format: string
          id: string
          macro_archetype: string
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          deck_count?: number
          deck_name: string
          format: string
          id?: string
          macro_archetype: string
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          deck_count?: number
          deck_name?: string
          format?: string
          id?: string
          macro_archetype?: string
          snapshot_date?: string
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
      collection_cards: {
        Row: {
          card_name: string
          created_at: string
          foil: boolean
          id: string
          quantity: number
          scryfall_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_name: string
          created_at?: string
          foil?: boolean
          id?: string
          quantity?: number
          scryfall_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_name?: string
          created_at?: string
          foil?: boolean
          id?: string
          quantity?: number
          scryfall_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_deck_cards: {
        Row: {
          board: string
          card_name: string
          deck_id: string
          id: string
          quantity: number
          scryfall_oracle_id: string | null
        }
        Insert: {
          board?: string
          card_name: string
          deck_id: string
          id?: string
          quantity?: number
          scryfall_oracle_id?: string | null
        }
        Update: {
          board?: string
          card_name?: string
          deck_id?: string
          id?: string
          quantity?: number
          scryfall_oracle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "community_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_decks: {
        Row: {
          archetype: string | null
          colors: string[]
          commander: string | null
          created_at: string
          deck_name: string | null
          event_date: string | null
          event_name: string | null
          format: string
          id: string
          macro_archetype: string | null
          name: string
          source: string
          source_id: string | null
          source_url: string | null
        }
        Insert: {
          archetype?: string | null
          colors?: string[]
          commander?: string | null
          created_at?: string
          deck_name?: string | null
          event_date?: string | null
          event_name?: string | null
          format?: string
          id?: string
          macro_archetype?: string | null
          name: string
          source: string
          source_id?: string | null
          source_url?: string | null
        }
        Update: {
          archetype?: string | null
          colors?: string[]
          commander?: string | null
          created_at?: string
          deck_name?: string | null
          event_date?: string | null
          event_name?: string | null
          format?: string
          id?: string
          macro_archetype?: string | null
          name?: string
          source?: string
          source_id?: string | null
          source_url?: string | null
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
      deck_cards: {
        Row: {
          board: string
          card_name: string
          category: string | null
          created_at: string
          deck_id: string
          id: string
          is_commander: boolean
          is_companion: boolean
          quantity: number
          scryfall_id: string | null
        }
        Insert: {
          board?: string
          card_name: string
          category?: string | null
          created_at?: string
          deck_id: string
          id?: string
          is_commander?: boolean
          is_companion?: boolean
          quantity?: number
          scryfall_id?: string | null
        }
        Update: {
          board?: string
          card_name?: string
          category?: string | null
          created_at?: string
          deck_id?: string
          id?: string
          is_commander?: boolean
          is_companion?: boolean
          quantity?: number
          scryfall_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_comments: {
        Row: {
          body: string
          created_at: string
          deck_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deck_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deck_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deck_tags: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          tag: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          tag: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_tags_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_tags_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_votes: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      decks: {
        Row: {
          card_count: number
          color_identity: string[]
          commander_name: string | null
          companion_name: string | null
          created_at: string
          description: string | null
          format: string
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_count?: number
          color_identity?: string[]
          commander_name?: string | null
          companion_name?: string | null
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_count?: number
          color_identity?: string[]
          commander_name?: string | null
          companion_name?: string | null
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          card_name: string
          created_at: string
          direction: string
          id: string
          is_active: boolean
          scryfall_id: string | null
          target_price: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          card_name: string
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean
          scryfall_id?: string | null
          target_price: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          card_name?: string
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean
          scryfall_id?: string | null
          target_price?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_snapshots: {
        Row: {
          card_name: string
          id: string
          price_usd: number | null
          price_usd_foil: number | null
          recorded_at: string
          scryfall_id: string | null
        }
        Insert: {
          card_name: string
          id?: string
          price_usd?: number | null
          price_usd_foil?: number | null
          recorded_at?: string
          scryfall_id?: string | null
        }
        Update: {
          card_name?: string
          id?: string
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
      saved_searches: {
        Row: {
          created_at: string
          filters_snapshot: Json | null
          id: string
          label: string | null
          natural_query: string
          scryfall_query: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters_snapshot?: Json | null
          id?: string
          label?: string | null
          natural_query: string
          scryfall_query?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters_snapshot?: Json | null
          id?: string
          label?: string | null
          natural_query?: string
          scryfall_query?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      archetype_stats: {
        Row: {
          all_colors: string[] | null
          archetype: string | null
          deck_count: number | null
          deck_name: string | null
          format: string | null
          macro_archetype: string | null
          meta_percentage: number | null
        }
        Relationships: []
      }
      decks_public: {
        Row: {
          card_count: number | null
          color_identity: string[] | null
          commander_name: string | null
          companion_name: string | null
          created_at: string | null
          description: string | null
          format: string | null
          id: string | null
          is_public: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          card_count?: number | null
          color_identity?: string[] | null
          commander_name?: string | null
          companion_name?: string | null
          created_at?: string | null
          description?: string | null
          format?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          card_count?: number | null
          color_identity?: string[] | null
          commander_name?: string | null
          companion_name?: string | null
          created_at?: string | null
          description?: string | null
          format?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_price_alerts: { Args: never; Returns: undefined }
      cleanup_expired_cache: { Args: never; Returns: undefined }
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
      get_missing_oracle_ids: {
        Args: never
        Returns: {
          oracle_id: string
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
      get_public_collection_stats: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_search_analytics: {
        Args: { max_low_confidence?: number; since_date: string }
        Returns: Json
      }
      get_signature_cards: {
        Args: { target_format?: string }
        Returns: {
          appearances: number
          card_name: string
          deck_name: string
          image_url: string
        }[]
      }
      get_system_status: { Args: never; Returns: Json }
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
      prune_old_price_snapshots: { Args: never; Returns: undefined }
      refresh_archetype_stats: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
