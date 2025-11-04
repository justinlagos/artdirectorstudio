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
      asset_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          shared_asset_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shared_asset_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shared_asset_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_bookmarks_shared_asset_id_fkey"
            columns: ["shared_asset_id"]
            isOneToOne: false
            referencedRelation: "shared_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_likes: {
        Row: {
          created_at: string | null
          id: string
          shared_asset_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shared_asset_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shared_asset_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_likes_shared_asset_id_fkey"
            columns: ["shared_asset_id"]
            isOneToOne: false
            referencedRelation: "shared_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invites: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
          waitlist_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
          waitlist_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_invites_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "beta_waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_waitlist: {
        Row: {
          activated_at: string | null
          consent: boolean
          created_at: string
          email: string
          id: string
          invite_sent_at: string | null
          metadata: Json | null
          name: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          consent?: boolean
          created_at?: string
          email: string
          id?: string
          invite_sent_at?: string | null
          metadata?: Json | null
          name?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          id?: string
          invite_sent_at?: string | null
          metadata?: Json | null
          name?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action: Database["public"]["Enums"]["credit_action"]
          amount: number
          asset_id: string | null
          description: string | null
          id: string
          notes: string | null
          provider: Database["public"]["Enums"]["credit_provider"]
          request_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["credit_action"]
          amount: number
          asset_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          provider: Database["public"]["Enums"]["credit_provider"]
          request_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["credit_action"]
          amount?: number
          asset_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          provider?: Database["public"]["Enums"]["credit_provider"]
          request_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funnel_metrics: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_assets: {
        Row: {
          analysis_data: Json | null
          created_at: string
          id: string
          image_url: string | null
          prompt: string | null
          type: Database["public"]["Enums"]["asset_type"]
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt?: string | null
          type: Database["public"]["Enums"]["asset_type"]
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          image_url?: string | null
          prompt?: string | null
          type?: Database["public"]["Enums"]["asset_type"]
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          metadata: Json | null
          source: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          credits_purchased: number
          currency: string | null
          id: string
          metadata: Json | null
          package_name: string | null
          status: string
          stripe_event_id: string | null
          stripe_payment_intent: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          credits_purchased: number
          currency?: string | null
          id?: string
          metadata?: Json | null
          package_name?: string | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          credits_purchased?: number
          currency?: string | null
          id?: string
          metadata?: Json | null
          package_name?: string | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          action: string
          active: boolean
          credits: number
          id: string
          provider: string
        }
        Insert: {
          action: string
          active?: boolean
          credits: number
          id?: string
          provider: string
        }
        Update: {
          action?: string
          active?: boolean
          credits?: number
          id?: string
          provider?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          has_seen_onboarding: boolean
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          has_seen_onboarding?: boolean
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          has_seen_onboarding?: boolean
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      shared_assets: {
        Row: {
          asset_id: string
          bookmark_count: number | null
          created_at: string
          featured: boolean | null
          id: string
          is_public: boolean
          like_count: number | null
          share_token: string
          tags: Json | null
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          asset_id: string
          bookmark_count?: number | null
          created_at?: string
          featured?: boolean | null
          id?: string
          is_public?: boolean
          like_count?: number | null
          share_token: string
          tags?: Json | null
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          asset_id?: string
          bookmark_count?: number | null
          created_at?: string
          featured?: boolean | null
          id?: string
          is_public?: boolean
          like_count?: number | null
          share_token?: string
          tags?: Json | null
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          display_order: number
          featured: boolean
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          credit_alerts: boolean
          gallery_updates: boolean
          id: string
          new_features: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_alerts?: boolean
          gallery_updates?: boolean
          id?: string
          new_features?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_alerts?: boolean
          gallery_updates?: boolean
          id?: string
          new_features?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      adjust_user_credits:
        | {
            Args: {
              amount: number
              description_text?: string
              target_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: { amount: number; target_user_id: string }
            Returns: undefined
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_share_view_count: {
        Args: { share_token_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_type: "analysis" | "image" | "prompt"
      credit_action: "analyze" | "generate" | "refine" | "blend" | "upscale"
      credit_provider: "lovable" | "openai" | "replicate"
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
      app_role: ["admin", "user"],
      asset_type: ["analysis", "image", "prompt"],
      credit_action: ["analyze", "generate", "refine", "blend", "upscale"],
      credit_provider: ["lovable", "openai", "replicate"],
    },
  },
} as const
