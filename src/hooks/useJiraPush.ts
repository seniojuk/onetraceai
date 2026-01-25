import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PushArtifactParams {
  artifactId: string;
  projectLinkId: string;
  workspaceId: string;
}

interface PushArtifactResult {
  success: boolean;
  action: string;
  jiraIssueKey: string;
  jiraIssueUrl: string;
  message: string;
}

interface BulkPushParams {
  artifactIds: string[];
  projectLinkId: string;
  workspaceId: string;
}

interface BulkPushResult {
  success: boolean;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  results: Array<{
    artifactId: string;
    success: boolean;
    jiraIssueKey?: string;
    jiraIssueUrl?: string;
    error?: string;
    action?: "created" | "updated";
  }>;
}

export function useJiraPushArtifact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: PushArtifactParams): Promise<PushArtifactResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("jira-push-artifact", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to push artifact");
      }

      return response.data as PushArtifactResult;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Pushed to Jira",
        description: data.message,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["jira-issue-mappings", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["jira-project-link", variables.projectLinkId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Push Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useJiraBulkPush() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: BulkPushParams): Promise<BulkPushResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("jira-push-bulk", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to push artifacts");
      }

      return response.data as BulkPushResult;
    },
    onSuccess: (data, variables) => {
      const { summary } = data;
      
      if (summary.failed === 0) {
        toast({
          title: "Bulk Push Complete",
          description: `Successfully pushed ${summary.succeeded} artifact(s) to Jira.`,
        });
      } else {
        toast({
          title: "Bulk Push Partial Success",
          description: `Pushed ${summary.succeeded} of ${summary.total} artifacts. ${summary.failed} failed.`,
          variant: "destructive",
        });
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["jira-issue-mappings", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["jira-project-link", variables.projectLinkId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Push Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
