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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          consent_at: string | null
          contact_token: string
          created_at: string
          email: string | null
          id: string
          in_lounge: boolean
          marketing_consent: boolean
          name: string | null
          nickname: string | null
          paid_at: string | null
          payment_id: string | null
          payment_provider: string | null
          payment_status: string
          privacy_consent: boolean
          updated_at: string
        }
        Insert: {
          consent_at?: string | null
          contact_token?: string
          created_at?: string
          email?: string | null
          id: string
          in_lounge?: boolean
          marketing_consent?: boolean
          name?: string | null
          nickname?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          payment_status?: string
          privacy_consent?: boolean
          updated_at?: string
        }
        Update: {
          consent_at?: string | null
          contact_token?: string
          created_at?: string
          email?: string | null
          id?: string
          in_lounge?: boolean
          marketing_consent?: boolean
          name?: string | null
          nickname?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          payment_status?: string
          privacy_consent?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          position: number
          required: boolean
          survey_id: string
          text: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          options?: Json | null
          position?: number
          required?: boolean
          survey_id: string
          text: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          position?: number
          required?: boolean
          survey_id?: string
          text?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          in_lounge: boolean
          result_type_id: string | null
          submitted_at: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id: string
          in_lounge?: boolean
          result_type_id?: string | null
          submitted_at?: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          in_lounge?: boolean
          result_type_id?: string | null
          submitted_at?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          audience_type: string
          bible_verse: string | null
          category: string
          completion_message: string
          created_at: string
          deleted_at: string | null
          description: string
          design_settings: Json
          estimated_time: string
          id: string
          result_types: Json
          share_card: Json
          slug: string
          source_json: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          bible_verse?: string | null
          category?: string
          completion_message?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          design_settings?: Json
          estimated_time?: string
          id: string
          result_types?: Json
          share_card?: Json
          slug: string
          source_json?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          bible_verse?: string | null
          category?: string
          completion_message?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          design_settings?: Json
          estimated_time?: string
          id?: string
          result_types?: Json
          share_card?: Json
          slug?: string
          source_json?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_customer_contact: {
        Args: { p_name?: string; p_nickname?: string }
        Returns: {
          contact_token: string
          id: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      update_customer_contact: {
        Args: {
          p_contact_token: string
          p_customer_id: string
          p_email: string
          p_marketing_consent?: boolean
          p_privacy_consent?: boolean
        }
        Returns: boolean
      }
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
