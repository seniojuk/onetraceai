import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JiraAuditLog {
  id: string;
  workspace_id: string;
  project_id: string | null;
  connection_id: string | null;
  project_link_id: string | null;
  actor_id: string | null;
  actor_type: string;
  action: string;
  action_details: Record<string, unknown> | null;
  jira_issue_keys: string[] | null;
  artifact_ids: string[] | null;
  result: string;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  created_at: string | null;
}

export function useJiraAuditLogs(
  workspaceId: string | undefined,
  projectId?: string,
  limit: number = 50
) {
  return useQuery({
    queryKey: ["jira-audit-logs", workspaceId, projectId, limit],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("jira_audit_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as JiraAuditLog[];
    },
    enabled: !!workspaceId,
  });
}

export function useJiraConnectionHealth(connectionId: string | undefined) {
  return useQuery({
    queryKey: ["jira-connection-health", connectionId],
    queryFn: async () => {
      if (!connectionId) return null;

      const { data, error } = await supabase
        .from("jira_connections")
        .select("status, last_successful_sync, last_error_at, last_error_message, failure_count, token_expires_at")
        .eq("id", connectionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!connectionId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
