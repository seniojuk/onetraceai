import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface JiraProjectLinkWorkspaceView {
  id: string;
  workspace_id: string;
  project_id: string;
  project_name: string;
  project_key: string;
  connection_id: string;
  jira_project_id: string;
  jira_project_key: string;
  jira_project_name: string | null;
  field_mode: string;
  status_mapping: Record<string, string>;
  sync_settings: Record<string, boolean>;
  last_push_at: string | null;
  last_push_status: string | null;
  last_pull_at: string | null;
  last_pull_status: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  issue_mappings_count: number;
}

export function useWorkspaceJiraProjectLinks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-jira-project-links", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("jira_project_links_workspace_view")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching workspace Jira project links:", error);
        throw error;
      }

      return data as JiraProjectLinkWorkspaceView[];
    },
    enabled: !!workspaceId,
  });
}

export function useUnlinkJiraProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectLinkId }: { projectLinkId: string }) => {
      const { error } = await supabase
        .from("jira_project_links")
        .delete()
        .eq("id", projectLinkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-jira-project-links"] });
      queryClient.invalidateQueries({ queryKey: ["jira-project-link"] });
      toast({
        title: "Project Unlinked",
        description: "The Jira project link has been removed.",
      });
    },
    onError: (error) => {
      console.error("Error unlinking Jira project:", error);
      toast({
        title: "Error",
        description: "Failed to unlink Jira project. Please try again.",
        variant: "destructive",
      });
    },
  });
}
