import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PullIssueParams {
  mappingId: string;
  workspaceId: string;
}

interface PullIssueResult {
  success: boolean;
  hasConflict: boolean;
  jiraIssue: {
    key: string;
    summary: string;
    status: string;
    descriptionText: string;
  };
  message: string;
}

interface PullSyncParams {
  projectLinkId: string;
  workspaceId: string;
}

interface PullSyncResult {
  success: boolean;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
  results: Array<{
    mappingId: string;
    artifactId: string;
    jiraIssueKey: string;
    success: boolean;
    hasConflict: boolean;
    error?: string;
  }>;
  message: string;
}

export function useJiraPullIssue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: PullIssueParams): Promise<PullIssueResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("jira-pull-issue", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to pull issue");
      }

      return response.data as PullIssueResult;
    },
    onSuccess: (data, variables) => {
      if (data.hasConflict) {
        toast({
          title: "Conflict Detected",
          description: `${data.jiraIssue.key} has changes in both Jira and OneTrace. Please resolve the conflict.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pulled from Jira",
          description: data.message,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["jira-issue-mappings", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["jira-issues-shadow"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Pull Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useJiraPullSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: PullSyncParams): Promise<PullSyncResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("jira-pull-sync", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to sync");
      }

      return response.data as PullSyncResult;
    },
    onSuccess: (data, variables) => {
      const { summary } = data;

      if (summary.conflicts > 0) {
        toast({
          title: "Sync Complete with Conflicts",
          description: `Synced ${summary.succeeded} issues. ${summary.conflicts} have conflicts requiring resolution.`,
          variant: "destructive",
        });
      } else if (summary.failed > 0) {
        toast({
          title: "Sync Partial Success",
          description: `Synced ${summary.succeeded} of ${summary.total} issues. ${summary.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Complete",
          description: data.message,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["jira-issue-mappings", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["jira-project-link", variables.projectLinkId] });
      queryClient.invalidateQueries({ queryKey: ["jira-issues-shadow"] });
      queryClient.invalidateQueries({ queryKey: ["artifacts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
