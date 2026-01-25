import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConflictMapping {
  id: string;
  artifact_id: string;
  jira_issue_key: string;
  jira_issue_url: string;
  conflict_detected_at: string;
  artifact: {
    id: string;
    title: string;
    type: string;
    content_markdown: string | null;
    short_id: string;
  };
  shadow: {
    summary: string;
    description_adf: unknown;
  } | null;
}

interface ResolveConflictParams {
  mappingId: string;
  workspaceId: string;
  resolution: "accept_jira" | "accept_onetrace" | "merge";
  mergedContent?: {
    title: string;
    content: string;
  };
}

export function useJiraConflicts(workspaceId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ["jira-conflicts", workspaceId, projectId],
    queryFn: async (): Promise<ConflictMapping[]> => {
      if (!workspaceId) return [];

      // Fetch mappings with conflicts
      let query = supabase
        .from("jira_issue_mappings")
        .select(`
          id,
          artifact_id,
          jira_issue_key,
          jira_issue_url,
          conflict_detected_at,
          project_link_id
        `)
        .eq("workspace_id", workspaceId)
        .eq("has_conflict", true)
        .order("conflict_detected_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data: mappings, error: mappingsError } = await query;

      if (mappingsError) throw mappingsError;
      if (!mappings || mappings.length === 0) return [];

      // Fetch artifacts for these mappings
      const artifactIds = mappings.map((m) => m.artifact_id);
      const { data: artifacts, error: artifactsError } = await supabase
        .from("artifacts")
        .select("id, title, type, content_markdown, short_id")
        .in("id", artifactIds);

      if (artifactsError) throw artifactsError;

      // Fetch shadow data
      const mappingIds = mappings.map((m) => m.id);
      const { data: shadows } = await supabase
        .from("jira_issues_shadow")
        .select("mapping_id, summary, description_adf")
        .in("mapping_id", mappingIds);

      // Combine data
      return mappings.map((mapping) => {
        const artifact = artifacts?.find((a) => a.id === mapping.artifact_id);
        const shadow = shadows?.find((s) => s.mapping_id === mapping.id);

        return {
          ...mapping,
          artifact: artifact || {
            id: mapping.artifact_id,
            title: "Unknown",
            type: "UNKNOWN",
            content_markdown: null,
            short_id: "???",
          },
          shadow: shadow ? {
            summary: shadow.summary,
            description_adf: shadow.description_adf,
          } : null,
        };
      });
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: ResolveConflictParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("jira-resolve-conflict", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to resolve conflict");
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Conflict Resolved",
        description: data.message,
      });

      queryClient.invalidateQueries({ queryKey: ["jira-conflicts", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["jira-issue-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["artifacts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
