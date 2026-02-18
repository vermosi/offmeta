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
          translated_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_feedback_generated_rule_id_fkey"
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
          confidence: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          pattern: string
          scryfall_syntax: string
          source_feedback_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          pattern: string
          scryfall_syntax: string
          source_feedback_id?: string | null
        }
        Update: {
          confidence?: number | null
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
          user_id: string | null
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
          user_id?: never
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
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_cache: { Args: never; Returns: undefined }
      get_search_analytics: {
        Args: { max_low_confidence?: number; since_date: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
