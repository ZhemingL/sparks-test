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
      answers: {
        Row: {
          answer_options: string[] | null
          answer_value: string | null
          created_at: string
          free_text: string | null
          id: string
          question_id: string
          registration_id: string
        }
        Insert: {
          answer_options?: string[] | null
          answer_value?: string | null
          created_at?: string
          free_text?: string | null
          id?: string
          question_id: string
          registration_id: string
        }
        Update: {
          answer_options?: string[] | null
          answer_value?: string | null
          created_at?: string
          free_text?: string | null
          id?: string
          question_id?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          allow_free_text: boolean
          id: string
          is_exclusion: boolean
          label: string
          question_id: string
          sort_order: number
          value: string
        }
        Insert: {
          allow_free_text?: boolean
          id?: string
          is_exclusion?: boolean
          label: string
          question_id: string
          sort_order?: number
          value: string
        }
        Update: {
          allow_free_text?: boolean
          id?: string
          is_exclusion?: boolean
          label?: string
          question_id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          service_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          service_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          service_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          hint_text: string | null
          hint_trigger_value: string | null
          id: string
          is_required: boolean
          jump_logic: Json | null
          questionnaire_id: string
          sort_order: number
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string
          hint_text?: string | null
          hint_trigger_value?: string | null
          id?: string
          is_required?: boolean
          jump_logic?: Json | null
          questionnaire_id: string
          sort_order?: number
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string
          hint_text?: string | null
          hint_trigger_value?: string | null
          id?: string
          is_required?: boolean
          jump_logic?: Json | null
          questionnaire_id?: string
          sort_order?: number
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          created_at: string
          id: string
          rejection_reason: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_email: string
          user_gender: string | null
          user_name: string
          user_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_email: string
          user_gender?: string | null
          user_name: string
          user_phone: string
        }
        Update: {
          created_at?: string
          id?: string
          rejection_reason?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_email?: string
          user_gender?: string | null
          user_name?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          discount_enabled: boolean | null
          discount_price: number | null
          duration: string | null
          extra_info: string | null
          format: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          schedule: string | null
          sessions: number | null
          sort_order: number | null
          status: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_enabled?: boolean | null
          discount_price?: number | null
          duration?: string | null
          extra_info?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          schedule?: string | null
          sessions?: number | null
          sort_order?: number | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_enabled?: boolean | null
          discount_price?: number | null
          duration?: string | null
          extra_info?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          schedule?: string | null
          sessions?: number | null
          sort_order?: number | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      question_type:
        | "yes_no"
        | "single_choice"
        | "multiple_choice"
        | "text_input"
        | "personal_info"
      registration_status: "pending" | "approved" | "rejected" | "paid"
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
      question_type: [
        "yes_no",
        "single_choice",
        "multiple_choice",
        "text_input",
        "personal_info",
      ],
      registration_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
