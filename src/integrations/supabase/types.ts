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
      agent_configs: {
        Row: {
          agent_type: string
          autonomous_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          default_model_id: string | null
          description: string | null
          enabled: boolean | null
          fallback_model_ids: string[] | null
          guardrails: Json | null
          id: string
          invocation_triggers: Json | null
          max_tokens: number | null
          name: string
          persona: string | null
          project_id: string | null
          routing_mode: string | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          agent_type: string
          autonomous_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_model_id?: string | null
          description?: string | null
          enabled?: boolean | null
          fallback_model_ids?: string[] | null
          guardrails?: Json | null
          id?: string
          invocation_triggers?: Json | null
          max_tokens?: number | null
          name: string
          persona?: string | null
          project_id?: string | null
          routing_mode?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          agent_type?: string
          autonomous_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_model_id?: string | null
          description?: string | null
          enabled?: boolean | null
          fallback_model_ids?: string[] | null
          guardrails?: Json | null
          id?: string
          invocation_triggers?: Json | null
          max_tokens?: number | null
          name?: string
          persona?: string | null
          project_id?: string | null
          routing_mode?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_default_model_id_fkey"
            columns: ["default_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string | null
          steps: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id?: string | null
          steps?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string | null
          steps?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_pipelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          agent_config_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_context: Json | null
          input_tokens: number | null
          metadata: Json | null
          model_id: string | null
          output_artifacts: Json | null
          output_tokens: number | null
          project_id: string | null
          run_type: string
          started_at: string | null
          status: string
          total_cost: number | null
          workspace_id: string
        }
        Insert: {
          agent_config_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_context?: Json | null
          input_tokens?: number | null
          metadata?: Json | null
          model_id?: string | null
          output_artifacts?: Json | null
          output_tokens?: number | null
          project_id?: string | null
          run_type: string
          started_at?: string | null
          status?: string
          total_cost?: number | null
          workspace_id: string
        }
        Update: {
          agent_config_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_context?: Json | null
          input_tokens?: number | null
          metadata?: Json | null
          model_id?: string | null
          output_artifacts?: Json | null
          output_tokens?: number | null
          project_id?: string | null
          run_type?: string
          started_at?: string | null
          status?: string
          total_cost?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_agent_config_id_fkey"
            columns: ["agent_config_id"]
            isOneToOne: false
            referencedRelation: "agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          workspace_id: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          workspace_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_audit_logs: {
        Row: {
          action: string
          action_details: Json | null
          actor_id: string | null
          actor_type: string
          artifact_ids: string[] | null
          connection_id: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          ip_address: string | null
          jira_issue_keys: string[] | null
          project_id: string | null
          project_link_id: string | null
          result: string
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          action_details?: Json | null
          actor_id?: string | null
          actor_type?: string
          artifact_ids?: string[] | null
          connection_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          jira_issue_keys?: string[] | null
          project_id?: string | null
          project_link_id?: string | null
          result?: string
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          action_details?: Json | null
          actor_id?: string | null
          actor_type?: string
          artifact_ids?: string[] | null
          connection_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          jira_issue_keys?: string[] | null
          project_id?: string | null
          project_link_id?: string | null
          result?: string
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_audit_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_audit_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_audit_logs_project_link_id_fkey"
            columns: ["project_link_id"]
            isOneToOne: false
            referencedRelation: "jira_project_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_audit_logs_project_link_id_fkey"
            columns: ["project_link_id"]
            isOneToOne: false
            referencedRelation: "jira_project_links_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_connections: {
        Row: {
          access_token: string
          connected_by: string | null
          created_at: string | null
          failure_count: number | null
          id: string
          jira_base_url: string
          jira_cloud_id: string
          jira_site_name: string | null
          last_error_at: string | null
          last_error_message: string | null
          last_successful_sync: string | null
          last_webhook_received: string | null
          permissions: string
          refresh_token: string | null
          status: Database["public"]["Enums"]["jira_connection_status"]
          token_expires_at: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          access_token: string
          connected_by?: string | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          jira_base_url: string
          jira_cloud_id: string
          jira_site_name?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_successful_sync?: string | null
          last_webhook_received?: string | null
          permissions?: string
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["jira_connection_status"]
          token_expires_at?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string
          connected_by?: string | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          jira_base_url?: string
          jira_cloud_id?: string
          jira_site_name?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_successful_sync?: string | null
          last_webhook_received?: string | null
          permissions?: string
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["jira_connection_status"]
          token_expires_at?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_issue_mappings: {
        Row: {
          artifact_id: string
          conflict_detected_at: string | null
          conflict_resolved_at: string | null
          conflict_resolved_by: string | null
          created_at: string | null
          created_by: string | null
          has_conflict: boolean | null
          id: string
          jira_issue_id: string
          jira_issue_key: string
          jira_issue_type: string | null
          jira_issue_url: string | null
          last_pulled_at: string | null
          last_pulled_description_hash: string | null
          last_pulled_summary_hash: string | null
          last_pushed_at: string | null
          last_pushed_description_hash: string | null
          last_pushed_summary_hash: string | null
          project_id: string
          project_link_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          artifact_id: string
          conflict_detected_at?: string | null
          conflict_resolved_at?: string | null
          conflict_resolved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          has_conflict?: boolean | null
          id?: string
          jira_issue_id: string
          jira_issue_key: string
          jira_issue_type?: string | null
          jira_issue_url?: string | null
          last_pulled_at?: string | null
          last_pulled_description_hash?: string | null
          last_pulled_summary_hash?: string | null
          last_pushed_at?: string | null
          last_pushed_description_hash?: string | null
          last_pushed_summary_hash?: string | null
          project_id: string
          project_link_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          artifact_id?: string
          conflict_detected_at?: string | null
          conflict_resolved_at?: string | null
          conflict_resolved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          has_conflict?: boolean | null
          id?: string
          jira_issue_id?: string
          jira_issue_key?: string
          jira_issue_type?: string | null
          jira_issue_url?: string | null
          last_pulled_at?: string | null
          last_pulled_description_hash?: string | null
          last_pulled_summary_hash?: string | null
          last_pushed_at?: string | null
          last_pushed_description_hash?: string | null
          last_pushed_summary_hash?: string | null
          project_id?: string
          project_link_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_issue_mappings_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issue_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issue_mappings_project_link_id_fkey"
            columns: ["project_link_id"]
            isOneToOne: false
            referencedRelation: "jira_project_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issue_mappings_project_link_id_fkey"
            columns: ["project_link_id"]
            isOneToOne: false
            referencedRelation: "jira_project_links_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issue_mappings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_issues_shadow: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string | null
          description_adf: Json | null
          fetched_at: string | null
          id: string
          issue_type: string | null
          jira_data: Json
          jira_issue_id: string
          jira_issue_key: string
          mapping_id: string | null
          priority: string | null
          project_link_id: string
          source: string
          status: string | null
          summary: string | null
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string | null
          description_adf?: Json | null
          fetched_at?: string | null
          id?: string
          issue_type?: string | null
          jira_data: Json
          jira_issue_id: string
          jira_issue_key: string
          mapping_id?: string | null
          priority?: string | null
          project_link_id: string
          source?: string
          status?: string | null
          summary?: string | null
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string | null
          description_adf?: Json | null
          fetched_at?: string | null
          id?: string
          issue_type?: string | null
          jira_data?: Json
          jira_issue_id?: string
          jira_issue_key?: string
          mapping_id?: string | null
          priority?: string | null
          project_link_id?: string
          source?: string
          status?: string | null
          summary?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_issues_shadow_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "jira_issue_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_shadow_project_link_id_fkey"
            columns: ["project_link_id"]
            isOneToOne: false
            referencedRelation: "jira_project_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_shadow_project_link_id_fkey"
            columns: ["project_link_id"]
            isOneToOne: false
            referencedRelation: "jira_project_links_workspace_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_issues_shadow_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_project_links: {
        Row: {
          connection_id: string
          created_at: string | null
          created_by: string | null
          field_map: Json | null
          field_mode: Database["public"]["Enums"]["jira_field_mode"]
          id: string
          jira_project_id: string
          jira_project_key: string
          jira_project_name: string | null
          last_pull_at: string | null
          last_pull_status: string | null
          last_push_at: string | null
          last_push_status: string | null
          project_id: string
          required_field_defaults: Json | null
          status_mapping: Json | null
          sync_settings: Json | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          created_by?: string | null
          field_map?: Json | null
          field_mode?: Database["public"]["Enums"]["jira_field_mode"]
          id?: string
          jira_project_id: string
          jira_project_key: string
          jira_project_name?: string | null
          last_pull_at?: string | null
          last_pull_status?: string | null
          last_push_at?: string | null
          last_push_status?: string | null
          project_id: string
          required_field_defaults?: Json | null
          status_mapping?: Json | null
          sync_settings?: Json | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          created_by?: string | null
          field_map?: Json | null
          field_mode?: Database["public"]["Enums"]["jira_field_mode"]
          id?: string
          jira_project_id?: string
          jira_project_key?: string
          jira_project_name?: string | null
          last_pull_at?: string | null
          last_pull_status?: string | null
          last_push_at?: string | null
          last_push_status?: string | null
          project_id?: string
          required_field_defaults?: Json | null
          status_mapping?: Json | null
          sync_settings?: Json | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_project_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_webhook_events: {
        Row: {
          connection_id: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          received_at: string | null
          webhook_id: string | null
          workspace_id: string | null
        }
        Insert: {
          connection_id?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          webhook_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          connection_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          webhook_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_webhook_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_models: {
        Row: {
          capabilities: Json | null
          cost_per_1k_input_tokens: number | null
          cost_per_1k_output_tokens: number | null
          created_at: string | null
          display_name: string
          enabled: boolean | null
          id: string
          model_name: string
          provider_id: string
        }
        Insert: {
          capabilities?: Json | null
          cost_per_1k_input_tokens?: number | null
          cost_per_1k_output_tokens?: number | null
          created_at?: string | null
          display_name: string
          enabled?: boolean | null
          id?: string
          model_name: string
          provider_id: string
        }
        Update: {
          capabilities?: Json | null
          cost_per_1k_input_tokens?: number | null
          cost_per_1k_output_tokens?: number | null
          created_at?: string | null
          display_name?: string
          enabled?: boolean | null
          id?: string
          model_name?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "llm_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_providers: {
        Row: {
          api_base_url: string | null
          created_at: string | null
          display_name: string
          enabled: boolean | null
          id: string
          is_global: boolean | null
          provider_name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          api_base_url?: string | null
          created_at?: string | null
          display_name: string
          enabled?: boolean | null
          id?: string
          is_global?: boolean | null
          provider_name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          api_base_url?: string | null
          created_at?: string | null
          display_name?: string
          enabled?: boolean | null
          id?: string
          is_global?: boolean | null
          provider_name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_providers_workspace_id_fkey"
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
      pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step: number
          error_message: string | null
          final_output: string | null
          id: string
          input_content: string | null
          pipeline_id: string
          project_id: string | null
          started_at: string | null
          status: string
          step_results: Json
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number
          error_message?: string | null
          final_output?: string | null
          id?: string
          input_content?: string | null
          pipeline_id: string
          project_id?: string | null
          started_at?: string | null
          status?: string
          step_results?: Json
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number
          error_message?: string | null
          final_output?: string | null
          id?: string
          input_content?: string | null
          pipeline_id?: string
          project_id?: string | null
          started_at?: string | null
          status?: string
          step_results?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "agent_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          max_ai_runs_per_month: number | null
          max_artifacts: number | null
          max_projects: number | null
          max_storage_mb: number | null
          max_workspaces: number | null
          plan_id: string
          plan_name: string
          price_monthly: number
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          max_ai_runs_per_month?: number | null
          max_artifacts?: number | null
          max_projects?: number | null
          max_storage_mb?: number | null
          max_workspaces?: number | null
          plan_id: string
          plan_name: string
          price_monthly?: number
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          max_ai_runs_per_month?: number | null
          max_artifacts?: number | null
          max_projects?: number | null
          max_storage_mb?: number | null
          max_workspaces?: number | null
          plan_id?: string
          plan_name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          created_at: string
          id: string
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_type: string
          metric_value?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_type?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_workspace_id_fkey"
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
      jira_connections_admin_view: {
        Row: {
          connected_by: string | null
          connected_by_name: string | null
          created_at: string | null
          failure_count: number | null
          id: string | null
          jira_base_url: string | null
          jira_cloud_id: string | null
          jira_site_name: string | null
          last_error_at: string | null
          last_error_message: string | null
          last_successful_sync: string | null
          permissions: string | null
          project_links_count: number | null
          status: Database["public"]["Enums"]["jira_connection_status"] | null
          token_expires_at: string | null
          updated_at: string | null
          workspace_id: string | null
          workspace_name: string | null
          workspace_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_project_links_workspace_view: {
        Row: {
          connection_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          field_mode: Database["public"]["Enums"]["jira_field_mode"] | null
          id: string | null
          issue_mappings_count: number | null
          jira_project_id: string | null
          jira_project_key: string | null
          jira_project_name: string | null
          last_pull_at: string | null
          last_pull_status: string | null
          last_push_at: string | null
          last_push_status: string | null
          project_id: string | null
          project_key: string | null
          project_name: string | null
          status_mapping: Json | null
          sync_settings: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_project_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections_admin_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_project_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      jira_connection_status:
        | "connected"
        | "degraded"
        | "broken"
        | "disconnected"
      jira_field_mode: "custom_fields" | "issue_properties"
      jira_sync_direction: "push" | "pull" | "both"
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
      jira_connection_status: [
        "connected",
        "degraded",
        "broken",
        "disconnected",
      ],
      jira_field_mode: ["custom_fields", "issue_properties"],
      jira_sync_direction: ["push", "pull", "both"],
    },
  },
} as const
