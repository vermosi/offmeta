export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string;
          event_data: Json;
          event_type: string;
          id: string;
          session_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_data?: Json;
          event_type: string;
          id?: string;
          session_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_data?: Json;
          event_type?: string;
          id?: string;
          session_id?: string | null;
        };
        Relationships: [];
      };
      query_cache: {
        Row: {
          confidence: number;
          created_at: string;
          expires_at: string;
          explanation: Json;
          hit_count: number;
          id: string;
          last_hit_at: string | null;
          normalized_query: string;
          query_hash: string;
          scryfall_query: string;
          show_affiliate: boolean;
        };
        Insert: {
          confidence?: number;
          created_at?: string;
          expires_at?: string;
          explanation?: Json;
          hit_count?: number;
          id?: string;
          last_hit_at?: string | null;
          normalized_query: string;
          query_hash: string;
          scryfall_query: string;
          show_affiliate?: boolean;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          expires_at?: string;
          explanation?: Json;
          hit_count?: number;
          id?: string;
          last_hit_at?: string | null;
          normalized_query?: string;
          query_hash?: string;
          scryfall_query?: string;
          show_affiliate?: boolean;
        };
        Relationships: [];
      };
      query_repairs: {
        Row: {
          created_at: string | null;
          id: string;
          original_query: string;
          repair_steps: string[];
          repaired_query: string;
          scryfall_error: string | null;
          success: boolean;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          original_query: string;
          repair_steps?: string[];
          repaired_query: string;
          scryfall_error?: string | null;
          success?: boolean;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          original_query?: string;
          repair_steps?: string[];
          repaired_query?: string;
          scryfall_error?: string | null;
          success?: boolean;
        };
        Relationships: [];
      };
      search_feedback: {
        Row: {
          created_at: string;
          generated_rule_id: string | null;
          id: string;
          issue_description: string;
          original_query: string;
          processed_at: string | null;
          processing_status: string | null;
          translated_query: string | null;
        };
        Insert: {
          created_at?: string;
          generated_rule_id?: string | null;
          id?: string;
          issue_description: string;
          original_query: string;
          processed_at?: string | null;
          processing_status?: string | null;
          translated_query?: string | null;
        };
        Update: {
          created_at?: string;
          generated_rule_id?: string | null;
          id?: string;
          issue_description?: string;
          original_query?: string;
          processed_at?: string | null;
          processing_status?: string | null;
          translated_query?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'search_feedback_generated_rule_id_fkey';
            columns: ['generated_rule_id'];
            isOneToOne: false;
            referencedRelation: 'translation_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      slot_patterns: {
        Row: {
          created_at: string | null;
          extraction_key: string;
          id: string;
          is_active: boolean | null;
          pattern: string;
          priority: number | null;
          slot_type: string;
        };
        Insert: {
          created_at?: string | null;
          extraction_key: string;
          id?: string;
          is_active?: boolean | null;
          pattern: string;
          priority?: number | null;
          slot_type: string;
        };
        Update: {
          created_at?: string | null;
          extraction_key?: string;
          id?: string;
          is_active?: boolean | null;
          pattern?: string;
          priority?: number | null;
          slot_type?: string;
        };
        Relationships: [];
      };
      translation_logs: {
        Row: {
          confidence_score: number | null;
          created_at: string | null;
          fallback_used: boolean | null;
          filters_applied: Json | null;
          id: string;
          model_used: string;
          natural_language_query: string;
          quality_flags: string[] | null;
          response_time_ms: number | null;
          translated_query: string;
          validation_issues: string[] | null;
        };
        Insert: {
          confidence_score?: number | null;
          created_at?: string | null;
          fallback_used?: boolean | null;
          filters_applied?: Json | null;
          id?: string;
          model_used?: string;
          natural_language_query: string;
          quality_flags?: string[] | null;
          response_time_ms?: number | null;
          translated_query: string;
          validation_issues?: string[] | null;
        };
        Update: {
          confidence_score?: number | null;
          created_at?: string | null;
          fallback_used?: boolean | null;
          filters_applied?: Json | null;
          id?: string;
          model_used?: string;
          natural_language_query?: string;
          quality_flags?: string[] | null;
          response_time_ms?: number | null;
          translated_query?: string;
          validation_issues?: string[] | null;
        };
        Relationships: [];
      };
      translation_rules: {
        Row: {
          aliases: string[] | null;
          category: string | null;
          concept_id: string | null;
          confidence: number | null;
          created_at: string;
          description: string | null;
          embedding: string | null;
          examples: string[] | null;
          id: string;
          is_active: boolean;
          negative_templates: string[] | null;
          pattern: string;
          priority: number | null;
          scryfall_syntax: string;
          scryfall_templates: string[] | null;
          source_feedback_id: string | null;
        };
        Insert: {
          aliases?: string[] | null;
          category?: string | null;
          concept_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          description?: string | null;
          embedding?: string | null;
          examples?: string[] | null;
          id?: string;
          is_active?: boolean;
          negative_templates?: string[] | null;
          pattern: string;
          priority?: number | null;
          scryfall_syntax: string;
          scryfall_templates?: string[] | null;
          source_feedback_id?: string | null;
        };
        Update: {
          aliases?: string[] | null;
          category?: string | null;
          concept_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          description?: string | null;
          embedding?: string | null;
          examples?: string[] | null;
          id?: string;
          is_active?: boolean;
          negative_templates?: string[] | null;
          pattern?: string;
          priority?: number | null;
          scryfall_syntax?: string;
          scryfall_templates?: string[] | null;
          source_feedback_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'translation_rules_source_feedback_id_fkey';
            columns: ['source_feedback_id'];
            isOneToOne: false;
            referencedRelation: 'search_feedback';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_expired_cache: { Args: never; Returns: undefined };
      match_concepts: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          category: string;
          concept_id: string;
          confidence: number;
          description: string;
          id: string;
          negative_templates: string[];
          pattern: string;
          priority: number;
          scryfall_syntax: string;
          scryfall_templates: string[];
          similarity: number;
        }[];
      };
      match_concepts_by_alias: {
        Args: { match_count?: number; search_term: string };
        Returns: {
          category: string;
          concept_id: string;
          confidence: number;
          description: string;
          id: string;
          negative_templates: string[];
          pattern: string;
          priority: number;
          scryfall_syntax: string;
          scryfall_templates: string[];
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
