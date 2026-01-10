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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artifact_edges: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          edge_type: string
          from_artifact_id: string
          id: string
          metadata: Json | null
          project_id: string
          source: string
          source_ref: string | null
          to_artifact_id: string
          workspace_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          edge_type: string
          from_artifact_id: string
          id?: string
          metadata?: Json | null
          project_id: string
          source: string
          source_ref?: string | null
          to_artifact_id: string
          workspace_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          edge_type?: string
          from_artifact_id?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          source?: string
          source_ref?: string | null
          to_artifact_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_edges_from_artifact_id_fkey"
            columns: ["from_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_edges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_edges_to_artifact_id_fkey"
            columns: ["to_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_edges_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_file_associations: {
        Row: {
          associated_artifact_id: string
          created_at: string
          created_by: string | null
          file_artifact_id: string
          id: string
          project_id: string
          workspace_id: string
        }
        Insert: {
          associated_artifact_id: string
          created_at?: string
          created_by?: string | null
          file_artifact_id: string
          id?: string
          project_id: string
          workspace_id: string
        }
        Update: {
          associated_artifact_id?: string
          created_at?: string
          created_by?: string | null
          file_artifact_id?: string
          id?: string
          project_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      artifact_versions: {
        Row: {
          artifact_id: string
          content_json: Json | null
          content_markdown: string | null
          created_at: string
          created_by: string | null
          enhancement_details: string | null
          id: string
          project_id: string
          title: string
          version_number: number
          workspace_id: string
        }
        Insert: {
          artifact_id: string
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          enhancement_details?: string | null
          id?: string
          project_id: string
          title: string
          version_number?: number
          workspace_id: string
        }
        Update: {
          artifact_id?: string
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          enhancement_details?: string | null
          id?: string
          project_id?: string
          title?: string
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_versions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          content_json: Json | null
          content_markdown: string | null
          created_at: string | null
          created_by: string | null
          id: string
          labels: Json | null
          parent_artifact_id: string | null
          project_id: string
          short_id: string
          status: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          labels?: Json | null
          parent_artifact_id?: string | null
          project_id: string
          short_id: string
          status?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          content_json?: Json | null
          content_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          labels?: Json | null
          parent_artifact_id?: string | null
          project_id?: string
          short_id?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_parent_artifact_id_fkey"
            columns: ["parent_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_snapshots: {
        Row: {
          artifact_id: string
          computed_at: string | null
          coverage_ratio: number | null
          id: string
          metadata: Json | null
          missing: Json | null
          project_id: string
          satisfied_acs: number | null
          tested_acs: number | null
          total_acs: number | null
          workspace_id: string
        }
        Insert: {
          artifact_id: string
          computed_at?: string | null
          coverage_ratio?: number | null
          id?: string
          metadata?: Json | null
          missing?: Json | null
          project_id: string
          satisfied_acs?: number | null
          tested_acs?: number | null
          total_acs?: number | null
          workspace_id: string
        }
        Update: {
          artifact_id?: string
          computed_at?: string | null
          coverage_ratio?: number | null
          id?: string
          metadata?: Json | null
          missing?: Json | null
          project_id?: string
          satisfied_acs?: number | null
          tested_acs?: number | null
          total_acs?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_snapshots_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drift_findings: {
        Row: {
          created_by: string | null
          description: string | null
          detected_at: string | null
          evidence: Json | null
          id: string
          primary_artifact_id: string | null
          project_id: string
          related_artifact_ids: string[] | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: number | null
          status: string | null
          title: string
          type: string
          workspace_id: string
        }
        Insert: {
          created_by?: string | null
          description?: string | null
          detected_at?: string | null
          evidence?: Json | null
          id?: string
          primary_artifact_id?: string | null
          project_id: string
          related_artifact_ids?: string[] | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number | null
          status?: string | null
          title: string
          type: string
          workspace_id: string
        }
        Update: {
          created_by?: string | null
          description?: string | null
          detected_at?: string | null
          evidence?: Json | null
          id?: string
          primary_artifact_id?: string | null
          project_id?: string
          related_artifact_ids?: string[] | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number | null
          status?: string | null
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drift_findings_primary_artifact_id_fkey"
            columns: ["primary_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_findings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_findings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_steps: string[] | null
          created_at: string | null
          current_step: string
          id: string
          metadata: Json | null
          project_id: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_key: string
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_key: string
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_key?: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          invited_at: string | null
          invited_by: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_member: {
        Args: { workspace_uuid: string }
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
