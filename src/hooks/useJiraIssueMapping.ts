import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JiraIssueMapping {
  id: string;
  artifact_id: string;
  jira_issue_id: string;
  jira_issue_key: string;
  jira_issue_url: string | null;
  jira_issue_type: string | null;
  last_pushed_at: string | null;
  last_pulled_at: string | null;
  has_conflict: boolean;
  project_link_id: string;
}

/**
 * Hook to fetch the Jira issue mapping for a specific artifact
 */
export function useJiraIssueMapping(artifactId: string | undefined) {
  return useQuery({
    queryKey: ["jira-issue-mapping", artifactId],
    queryFn: async () => {
      if (!artifactId) return null;

      const { data, error } = await supabase
        .from("jira_issue_mappings")
        .select(`
          id,
          artifact_id,
          jira_issue_id,
          jira_issue_key,
          jira_issue_url,
          jira_issue_type,
          last_pushed_at,
          last_pulled_at,
          has_conflict,
          project_link_id
        `)
        .eq("artifact_id", artifactId)
        .maybeSingle();

      if (error) throw error;
      return data as JiraIssueMapping | null;
    },
    enabled: !!artifactId,
  });
}

/**
 * Hook to fetch all Jira issue mappings for a project
 */
export function useJiraIssueMappings(projectId: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["jira-issue-mappings", projectId, workspaceId],
    queryFn: async () => {
      if (!projectId || !workspaceId) return [];

      const { data, error } = await supabase
        .from("jira_issue_mappings")
        .select(`
          id,
          artifact_id,
          jira_issue_id,
          jira_issue_key,
          jira_issue_url,
          jira_issue_type,
          last_pushed_at,
          last_pulled_at,
          has_conflict,
          project_link_id
        `)
        .eq("project_id", projectId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      return (data || []) as JiraIssueMapping[];
    },
    enabled: !!projectId && !!workspaceId,
  });
}
