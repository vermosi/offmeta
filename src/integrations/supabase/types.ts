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
      archetype_favorites: {
        Row: {
          archetype_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          archetype_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          archetype_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archetype_favorites_archetype_id_fkey"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "archetypes"
            referencedColumns: ["id"]
          },
        ]
      }
      archetypes: {
        Row: {
          budget_tier: string
          color_identity: string[]
          core_cards: Json
          created_at: string
          created_by: string | null
          description: string
          flex_cards: Json
          format: string
          gameplan: string
          id: string
          is_community: boolean
          name: string
          off_meta_score: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          budget_tier?: string
          color_identity?: string[]
          core_cards?: Json
          created_at?: string
          created_by?: string | null
          description: string
          flex_cards?: Json
          format?: string
          gameplan: string
          id?: string
          is_community?: boolean
          name: string
          off_meta_score?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          budget_tier?: string
          color_identity?: string[]
          core_cards?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          flex_cards?: Json
          format?: string
          gameplan?: string
          id?: string
          is_community?: boolean
          name?: string
          off_meta_score?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      collection_cards: {
        Row: {
          card_id: string
          card_name: string
          created_at: string
          foil_quantity: number
          id: string
          quantity: number
          set_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          card_name: string
          created_at?: string
          foil_quantity?: number
          id?: string
          quantity?: number
          set_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          card_name?: string
          created_at?: string
          foil_quantity?: number
          id?: string
          quantity?: number
          set_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decks: {
        Row: {
          commander_id: string | null
          commander_name: string | null
          created_at: string
          description: string | null
          format: string
          id: string
          is_public: boolean
          mainboard: Json
          name: string
          sideboard: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          commander_id?: string | null
          commander_name?: string | null
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          is_public?: boolean
          mainboard?: Json
          name?: string
          sideboard?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          commander_id?: string | null
          commander_name?: string | null
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          is_public?: boolean
          mainboard?: Json
          name?: string
          sideboard?: Json
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
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          is_semantic: boolean
          query: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_semantic?: boolean
          query: string
          result_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_semantic?: boolean
          query?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
