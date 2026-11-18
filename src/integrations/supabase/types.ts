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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_pages: {
        Row: {
          brand: string
          bytes: number
          canonical: string | null
          date_on_page: string | null
          error: string | null
          facts_per_100: number | null
          faq: boolean | null
          fetched_at: string | null
          final_url: string | null
          h1: string | null
          http_last_modified: string | null
          http_status: number | null
          id: string
          improved_page_id: string | null
          is_own: boolean
          lists: number | null
          meta_description: string | null
          query_id: string
          redirected: boolean
          run_id: string
          schema_date_modified: string | null
          schema_types: string[]
          state: string
          tables: number | null
          term_counts: Json
          title: string | null
          url: string
          words: number | null
        }
        Insert: {
          brand: string
          bytes?: number
          canonical?: string | null
          date_on_page?: string | null
          error?: string | null
          facts_per_100?: number | null
          faq?: boolean | null
          fetched_at?: string | null
          final_url?: string | null
          h1?: string | null
          http_last_modified?: string | null
          http_status?: number | null
          id?: string
          improved_page_id?: string | null
          is_own?: boolean
          lists?: number | null
          meta_description?: string | null
          query_id: string
          redirected?: boolean
          run_id: string
          schema_date_modified?: string | null
          schema_types?: string[]
          state?: string
          tables?: number | null
          term_counts?: Json
          title?: string | null
          url: string
          words?: number | null
        }
        Update: {
          brand?: string
          bytes?: number
          canonical?: string | null
          date_on_page?: string | null
          error?: string | null
          facts_per_100?: number | null
          faq?: boolean | null
          fetched_at?: string | null
          final_url?: string | null
          h1?: string | null
          http_last_modified?: string | null
          http_status?: number | null
          id?: string
          improved_page_id?: string | null
          is_own?: boolean
          lists?: number | null
          meta_description?: string | null
          query_id?: string
          redirected?: boolean
          run_id?: string
          schema_date_modified?: string | null
          schema_types?: string[]
          state?: string
          tables?: number | null
          term_counts?: Json
          title?: string | null
          url?: string
          words?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_pages_improved_page_id_fkey"
            columns: ["improved_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_pages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          competitors: string[]
          config: Json
          created_at: string
          id: string
          own_brand: string
          run_date: string
        }
        Insert: {
          competitors?: string[]
          config: Json
          created_at?: string
          id?: string
          own_brand: string
          run_date?: string
        }
        Update: {
          competitors?: string[]
          config?: Json
          created_at?: string
          id?: string
          own_brand?: string
          run_date?: string
        }
        Relationships: []
      }
      briefs: {
        Row: {
          brief: Json
          city: string
          created_at: string
          id: string
          slug: string
        }
        Insert: {
          brief: Json
          city: string
          created_at?: string
          id?: string
          slug: string
        }
        Update: {
          brief?: Json
          city?: string
          created_at?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      check_results: {
        Row: {
          check_id: string
          evidence: string
          id: string
          page_id: string
          pass: boolean
        }
        Insert: {
          check_id: string
          evidence: string
          id?: string
          page_id: string
          pass: boolean
        }
        Update: {
          check_id?: string
          evidence?: string
          id?: string
          page_id?: string
          pass?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "check_results_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "audit_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          brief_id: string | null
          city: string
          copy: Json | null
          created_at: string
          html: string
          id: string
          publish_simulated: boolean
          published_at: string | null
          slug: string
        }
        Insert: {
          brief_id?: string | null
          city: string
          copy?: Json | null
          created_at?: string
          html: string
          id?: string
          publish_simulated?: boolean
          published_at?: string | null
          slug: string
        }
        Update: {
          brief_id?: string | null
          city?: string
          copy?: Json | null
          created_at?: string
          html?: string
          id?: string
          publish_simulated?: boolean
          published_at?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      probe_results: {
        Row: {
          answer_text: string
          brands: Json
          competitors_mentioned: string[]
          created_at: string
          engine: string
          extraction: Json | null
          id: string
          prompt: string
          run_id: string
          sources: string[]
          treebo_mentioned: boolean
          treebo_rank: number | null
          wrong_facts: Json
        }
        Insert: {
          answer_text?: string
          brands?: Json
          competitors_mentioned?: string[]
          created_at?: string
          engine: string
          extraction?: Json | null
          id?: string
          prompt: string
          run_id: string
          sources?: string[]
          treebo_mentioned?: boolean
          treebo_rank?: number | null
          wrong_facts?: Json
        }
        Update: {
          answer_text?: string
          brands?: Json
          competitors_mentioned?: string[]
          created_at?: string
          engine?: string
          extraction?: Json | null
          id?: string
          prompt?: string
          run_id?: string
          sources?: string[]
          treebo_mentioned?: boolean
          treebo_rank?: number | null
          wrong_facts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "probe_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "probe_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      probe_runs: {
        Row: {
          city: string
          created_at: string
          engine: string
          id: string
        }
        Insert: {
          city: string
          created_at?: string
          engine: string
          id?: string
        }
        Update: {
          city?: string
          created_at?: string
          engine?: string
          id?: string
        }
        Relationships: []
      }
      verified_hotels: {
        Row: {
          amenities: string[]
          city: string
          coupleFriendly: boolean
          fetched_at: string
          found: boolean
          id: string
          image: string | null
          locality: string
          lookup_name: string
          name: string
          pricePerNight: number | null
          rating: number
          reviewCount: number
          source: string
          status: string
          url: string
        }
        Insert: {
          amenities?: string[]
          city: string
          coupleFriendly?: boolean
          fetched_at?: string
          found?: boolean
          id: string
          image?: string | null
          locality?: string
          lookup_name: string
          name: string
          pricePerNight?: number | null
          rating?: number
          reviewCount?: number
          source?: string
          status?: string
          url?: string
        }
        Update: {
          amenities?: string[]
          city?: string
          coupleFriendly?: boolean
          fetched_at?: string
          found?: boolean
          id?: string
          image?: string | null
          locality?: string
          lookup_name?: string
          name?: string
          pricePerNight?: number | null
          rating?: number
          reviewCount?: number
          source?: string
          status?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finish_page_audit: {
        Args: { findings: Json; measurements: Json; pid: string }
        Returns: undefined
      }
      start_page_audit: { Args: { payload: Json }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
