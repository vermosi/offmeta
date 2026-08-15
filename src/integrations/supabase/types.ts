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
      card_ontology: {
        Row: {
          classified_at: string
          dimension: string
          matched_signature: string | null
          oracle_id: string
          tag_key: string
        }
        Insert: {
          classified_at?: string
          dimension: string
          matched_signature?: string | null
          oracle_id: string
          tag_key: string
        }
        Update: {
          classified_at?: string
          dimension?: string
          matched_signature?: string | null
          oracle_id?: string
          tag_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_ontology_tag_key_fkey"
            columns: ["tag_key"]
            isOneToOne: false
            referencedRelation: "ontology_tags"
            referencedColumns: ["tag_key"]
          },
        ]
      }
      card_printings: {
        Row: {
          artist: string | null
          collector_number: string | null
          id: string
          identifiers: Json | null
          image_url: string | null
          lang: string
          mtgjson_uuid: string | null
          name: string
          oracle_id: string | null
          prices: Json | null
          purchase_uris: Json | null
          rarity: string | null
          related_cards: Json | null
          released_at: string | null
          scryfall_id: string | null
          set: string | null
          set_name: string | null
          updated_at: string
        }
        Insert: {
          artist?: string | null
          collector_number?: string | null
          id: string
          identifiers?: Json | null
          image_url?: string | null
          lang?: string
          mtgjson_uuid?: string | null
          name: string
          oracle_id?: string | null
          prices?: Json | null
          purchase_uris?: Json | null
          rarity?: string | null
          related_cards?: Json | null
          released_at?: string | null
          scryfall_id?: string | null
          set?: string | null
          set_name?: string | null
          updated_at?: string
        }
        Update: {
          artist?: string | null
          collector_number?: string | null
          id?: string
          identifiers?: Json | null
          image_url?: string | null
          lang?: string
          mtgjson_uuid?: string | null
          name?: string
          oracle_id?: string | null
          prices?: Json | null
          purchase_uris?: Json | null
          rarity?: string | null
          related_cards?: Json | null
          released_at?: string | null
          scryfall_id?: string | null
          set?: string | null
          set_name?: string | null
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
      collections: {
        Row: {
          commander_name: string | null
          created_at: string
          description: string | null
          format: string | null
          id: string
          is_default: boolean
          kind: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commander_name?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commander_name?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string
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
      error_events: {
        Row: {
          context: Json
          created_at: string
          error_type: string
          fingerprint: string
          first_seen_at: string
          fix_attempts: number
          id: string
          last_fix_at: string | null
          last_fix_result: Json | null
          last_seen_at: string
          message: string
          next_attempt_at: string
          occurrence_count: number
          severity: string
          source: string
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          error_type: string
          fingerprint: string
          first_seen_at?: string
          fix_attempts?: number
          id?: string
          last_fix_at?: string | null
          last_fix_result?: Json | null
          last_seen_at?: string
          message: string
          next_attempt_at?: string
          occurrence_count?: number
          severity?: string
          source: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          error_type?: string
          fingerprint?: string
          first_seen_at?: string
          fix_attempts?: number
          id?: string
          last_fix_at?: string | null
          last_fix_result?: Json | null
          last_seen_at?: string
          message?: string
          next_attempt_at?: string
          occurrence_count?: number
          severity?: string
          source?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      job_dedupe: {
        Row: {
          claimed_at: string
          decision: Json
          dedupe_key: string
          expires_at: string
          hit_count: number
        }
        Insert: {
          claimed_at?: string
          decision?: Json
          dedupe_key: string
          expires_at: string
          hit_count?: number
        }
        Update: {
          claimed_at?: string
          decision?: Json
          dedupe_key?: string
          expires_at?: string
          hit_count?: number
        }
        Relationships: []
      }
      job_locks: {
        Row: {
          expires_at: string
          holder: string
          job_name: string
          locked_at: string
        }
        Insert: {
          expires_at: string
          holder: string
          job_name: string
          locked_at?: string
        }
        Update: {
          expires_at?: string
          holder?: string
          job_name?: string
          locked_at?: string
        }
        Relationships: []
      }
      ontology_approaches: {
        Row: {
          approach_key: string
          created_at: string
          description: string
          label: string
          sort_order: number
        }
        Insert: {
          approach_key: string
          created_at?: string
          description: string
          label: string
          sort_order?: number
        }
        Update: {
          approach_key?: string
          created_at?: string
          description?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      ontology_edges: {
        Row: {
          created_at: string
          from_tag: string
          id: string
          note: string | null
          relation: string
          to_tag: string
          weight: number
        }
        Insert: {
          created_at?: string
          from_tag: string
          id?: string
          note?: string | null
          relation: string
          to_tag: string
          weight?: number
        }
        Update: {
          created_at?: string
          from_tag?: string
          id?: string
          note?: string | null
          relation?: string
          to_tag?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ontology_edges_from_tag_fkey"
            columns: ["from_tag"]
            isOneToOne: false
            referencedRelation: "ontology_tags"
            referencedColumns: ["tag_key"]
          },
          {
            foreignKeyName: "ontology_edges_to_tag_fkey"
            columns: ["to_tag"]
            isOneToOne: false
            referencedRelation: "ontology_tags"
            referencedColumns: ["tag_key"]
          },
        ]
      }
      ontology_tag_approaches: {
        Row: {
          approach_key: string
          tag_key: string
          weight: number
        }
        Insert: {
          approach_key: string
          tag_key: string
          weight?: number
        }
        Update: {
          approach_key?: string
          tag_key?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ontology_tag_approaches_approach_key_fkey"
            columns: ["approach_key"]
            isOneToOne: false
            referencedRelation: "ontology_approaches"
            referencedColumns: ["approach_key"]
          },
          {
            foreignKeyName: "ontology_tag_approaches_tag_key_fkey"
            columns: ["tag_key"]
            isOneToOne: false
            referencedRelation: "ontology_tags"
            referencedColumns: ["tag_key"]
          },
        ]
      }
      ontology_tags: {
        Row: {
          created_at: string
          description: string | null
          dimension: string
          exclusions: string[]
          is_active: boolean
          label: string
          max_cmc: number | null
          max_colors: number | null
          min_cmc: number | null
          min_colors: number | null
          priority: number
          signatures: string[]
          tag_key: string
          type_pattern: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dimension: string
          exclusions?: string[]
          is_active?: boolean
          label: string
          max_cmc?: number | null
          max_colors?: number | null
          min_cmc?: number | null
          min_colors?: number | null
          priority?: number
          signatures?: string[]
          tag_key: string
          type_pattern?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dimension?: string
          exclusions?: string[]
          is_active?: boolean
          label?: string
          max_cmc?: number | null
          max_colors?: number | null
          min_cmc?: number | null
          min_colors?: number | null
          priority?: number
          signatures?: string[]
          tag_key?: string
          type_pattern?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ops_watchdog_runs: {
        Row: {
          checks: Json
          finished_at: string | null
          id: string
          problems: number
          remediations: number
          started_at: string
          status: string
        }
        Insert: {
          checks?: Json
          finished_at?: string | null
          id?: string
          problems?: number
          remediations?: number
          started_at?: string
          status?: string
        }
        Update: {
          checks?: Json
          finished_at?: string | null
          id?: string
          problems?: number
          remediations?: number
          started_at?: string
          status?: string
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
          source: string
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
          source?: string
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
          source?: string
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
      rate_limits: {
        Row: {
          count: number
          ip: string
          window_start: string
        }
        Insert: {
          count?: number
          ip: string
          window_start?: string
        }
        Update: {
          count?: number
          ip?: string
          window_start?: string
        }
        Relationships: []
      }
      saved_card_collections: {
        Row: {
          collection_id: string
          created_at: string
          saved_card_id: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          saved_card_id: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          saved_card_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_card_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_card_collections_saved_card_id_fkey"
            columns: ["saved_card_id"]
            isOneToOne: false
            referencedRelation: "saved_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_cards: {
        Row: {
          card_name: string
          cmc: number | null
          colors: string[]
          created_at: string
          id: string
          image_url: string | null
          mana_cost: string | null
          note: string | null
          oracle_id: string
          price_usd: number | null
          scryfall_id: string | null
          type_line: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_name: string
          cmc?: number | null
          colors?: string[]
          created_at?: string
          id?: string
          image_url?: string | null
          mana_cost?: string | null
          note?: string | null
          oracle_id: string
          price_usd?: number | null
          scryfall_id?: string | null
          type_line?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_name?: string
          cmc?: number | null
          colors?: string[]
          created_at?: string
          id?: string
          image_url?: string | null
          mana_cost?: string | null
          note?: string | null
          oracle_id?: string
          price_usd?: number | null
          scryfall_id?: string | null
          type_line?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          id: string
          label: string | null
          natural_query: string
          normalized_query: string
          result_count: number | null
          scryfall_query: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          natural_query: string
          normalized_query: string
          result_count?: number | null
          scryfall_query?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          natural_query?: string
          normalized_query?: string
          result_count?: number | null
          scryfall_query?: string | null
          updated_at?: string
          user_id?: string
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
      search_history: {
        Row: {
          created_at: string
          id: string
          last_run_at: string
          normalized_query: string
          raw_query: string
          run_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_run_at?: string
          normalized_query: string
          raw_query: string
          run_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_run_at?: string
          normalized_query?: string
          raw_query?: string
          run_count?: number
          user_id?: string
        }
        Relationships: []
      }
      search_intent_clusters: {
        Row: {
          canonical_query: string
          click_count: number
          first_seen_at: string
          last_seen_at: string
          opportunity_score: number
          search_count: number
          searcher_count: number
          signature: string
          status: string
          suggested_slug: string
          updated_at: string
          variant_count: number
          zero_result_count: number
        }
        Insert: {
          canonical_query: string
          click_count?: number
          first_seen_at?: string
          last_seen_at?: string
          opportunity_score?: number
          search_count?: number
          searcher_count?: number
          signature: string
          status?: string
          suggested_slug?: string
          updated_at?: string
          variant_count?: number
          zero_result_count?: number
        }
        Update: {
          canonical_query?: string
          click_count?: number
          first_seen_at?: string
          last_seen_at?: string
          opportunity_score?: number
          search_count?: number
          searcher_count?: number
          signature?: string
          status?: string
          suggested_slug?: string
          updated_at?: string
          variant_count?: number
          zero_result_count?: number
        }
        Relationships: []
      }
      self_heal_runs: {
        Row: {
          candidates: number
          details: Json
          finished_at: string | null
          id: string
          repaired: number
          rolled_back: number
          skipped: number
          started_at: string
          status: string
          verified: number
        }
        Insert: {
          candidates?: number
          details?: Json
          finished_at?: string | null
          id?: string
          repaired?: number
          rolled_back?: number
          skipped?: number
          started_at?: string
          status?: string
          verified?: number
        }
        Update: {
          candidates?: number
          details?: Json
          finished_at?: string | null
          id?: string
          repaired?: number
          rolled_back?: number
          skipped?: number
          started_at?: string
          status?: string
          verified?: number
        }
        Relationships: []
      }
      semrush_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
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
      sitemap_submissions: {
        Row: {
          error: string | null
          http_status: number | null
          id: string
          new_url_count: number | null
          site_url: string | null
          sitemap_url: string
          status: string
          submitted_at: string
          trigger_source: string
        }
        Insert: {
          error?: string | null
          http_status?: number | null
          id?: string
          new_url_count?: number | null
          site_url?: string | null
          sitemap_url: string
          status: string
          submitted_at?: string
          trigger_source: string
        }
        Update: {
          error?: string | null
          http_status?: number | null
          id?: string
          new_url_count?: number | null
          site_url?: string | null
          sitemap_url?: string
          status?: string
          submitted_at?: string
          trigger_source?: string
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
          auto_generated: boolean
          confidence: number
          created_at: string
          description: string | null
          failure_count: number
          id: string
          is_active: boolean
          last_verified_at: string | null
          pattern: string
          scryfall_syntax: string
          source_feedback_id: string | null
          verification_state: string
          verified_result_count: number | null
        }
        Insert: {
          archived_at?: string | null
          auto_generated?: boolean
          confidence?: number
          created_at?: string
          description?: string | null
          failure_count?: number
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          pattern: string
          scryfall_syntax: string
          source_feedback_id?: string | null
          verification_state?: string
          verified_result_count?: number | null
        }
        Update: {
          archived_at?: string | null
          auto_generated?: boolean
          confidence?: number
          created_at?: string
          description?: string | null
          failure_count?: number
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          pattern?: string
          scryfall_syntax?: string
          source_feedback_id?: string | null
          verification_state?: string
          verified_result_count?: number | null
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
      price_mover_stats: {
        Row: {
          card_name: string | null
          collector_number: string | null
          colors: string[] | null
          current_price: number | null
          current_recorded_at: string | null
          legalities: Json | null
          price_14d: number | null
          price_30d: number | null
          price_7d: number | null
          rarity: string | null
          scryfall_id: string | null
          set_name: string | null
          type_line: string | null
        }
        Relationships: []
      }
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
      claim_dedupe_key: {
        Args: { p_decision?: Json; p_key: string; p_ttl_seconds: number }
        Returns: Json
      }
      classify_card_ontology: {
        Args: { p_limit?: number; p_since?: string }
        Returns: Json
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
      expand_ontology_concepts: {
        Args: {
          p_max_depth?: number
          p_min_weight?: number
          p_tag_keys: string[]
        }
        Returns: {
          depth: number
          dimension: string
          label: string
          tag_key: string
          weight: number
        }[]
      }
      get_ai_usage_stats: { Args: { days_back?: number }; Returns: Json }
      get_card_ontology: {
        Args: { p_oracle_ids: string[] }
        Returns: {
          description: string
          dimension: string
          label: string
          matched_signature: string
          oracle_id: string
          priority: number
          tag_key: string
        }[]
      }
      get_card_profiles: { Args: { p_names: string[] }; Returns: Json }
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
      get_error_monitor_summary: { Args: { days_back?: number }; Returns: Json }
      get_intent_opportunities: {
        Args: { max_results?: number; min_searchers?: number }
        Returns: {
          already_covered: boolean
          canonical_query: string
          last_seen_at: string
          opportunity_score: number
          search_count: number
          searcher_count: number
          signature: string
          suggested_slug: string
          variant_count: number
          zero_result_count: number
        }[]
      }
      get_ops_freshness: { Args: never; Returns: Json }
      get_price_movers: {
        Args: { days_back?: number; limit_count?: number; min_price?: number }
        Returns: {
          card_name: string
          change_percent: number
          collector_number: string
          colors: string[]
          current_price: number
          direction: string
          legalities: Json
          previous_price: number
          rarity: string
          scryfall_id: string
          set_name: string
          type_line: string
        }[]
      }
      get_product_metrics: { Args: { days_back?: number }; Returns: Json }
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
      get_recent_cron_failures: {
        Args: { p_hours?: number }
        Returns: {
          failures: number
          jobid: number
          jobname: string
          last_message: string
          last_run: string
        }[]
      }
      get_search_analytics: {
        Args: { max_low_confidence?: number; since_date: string }
        Returns: Json
      }
      get_search_approaches: {
        Args: { p_examples_per_approach?: number; p_oracle_ids: string[] }
        Returns: {
          approach_key: string
          card_count: number
          concepts: string[]
          description: string
          examples: Json
          label: string
        }[]
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
      get_search_failure_candidates: {
        Args: {
          max_results?: number
          min_frequency?: number
          since_date: string
        }
        Returns: {
          frequency: number
          last_translation: string
          query: string
          sources: string
        }[]
      }
      get_search_outcome_breakdown: {
        Args: { days_back?: number }
        Returns: Json
      }
      get_self_heal_diagnostics: {
        Args: { days_back?: number; max_items?: number }
        Returns: Json
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
      increment_rate_limit: {
        Args: { client_ip: string; limit_count: number; window_seconds: number }
        Returns: Json
      }
      list_ontology_concepts: {
        Args: never
        Returns: {
          approaches: string[]
          card_count: number
          description: string
          dimension: string
          label: string
          related: string[]
          tag_key: string
        }[]
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
      normalize_intent_signature: { Args: { q: string }; Returns: string }
      prune_dedupe_and_locks: { Args: never; Returns: undefined }
      prune_old_error_events: { Args: never; Returns: undefined }
      prune_old_price_snapshots: { Args: never; Returns: undefined }
      prune_old_rate_limits: { Args: never; Returns: undefined }
      prune_old_seo_health_checks: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_dedupe_decision: {
        Args: { p_decision: Json; p_key: string }
        Returns: undefined
      }
      refresh_price_mover_stats: { Args: never; Returns: undefined }
      refresh_search_intent_clusters: {
        Args: { days_back?: number }
        Returns: Json
      }
      release_job_lock: {
        Args: { p_holder: string; p_job: string }
        Returns: undefined
      }
      report_error_event: {
        Args: {
          p_context?: Json
          p_error_type: string
          p_message: string
          p_severity?: string
          p_source: string
          p_url?: string
        }
        Returns: undefined
      }
      search_card_profiles: {
        Args: {
          p_colors?: string[]
          p_limit?: number
          p_match?: string
          p_tag_keys: string[]
        }
        Returns: {
          cmc: number
          colors: string[]
          image_url: string
          mana_cost: string
          match_count: number
          matched_tags: string[]
          name: string
          oracle_id: string
          rarity: string
          type_line: string
        }[]
      }
      try_acquire_job_lock: {
        Args: { p_holder: string; p_job: string; p_ttl_seconds?: number }
        Returns: boolean
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
