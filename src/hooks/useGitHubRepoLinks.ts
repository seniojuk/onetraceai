import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GitHubRepoLink {
  id: string;
  connection_id: string;
  workspace_id: string;
  project_id: string;
  repo_full_name: string;
  repo_name: string;
  repo_owner: string;
  repo_url: string | null;
  default_branch: string | null;
  last_commit_sha: string | null;
  last_pull_at: string | null;
  last_pull_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useGitHubRepoLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["github-repo-links", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("github_repo_links")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GitHubRepoLink[];
    },
    enabled: !!projectId,
  });
}

export function useCreateRepoLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      connectionId: string;
      workspaceId: string;
      projectId: string;
      repoFullName: string;
      repoName: string;
      repoOwner: string;
      repoUrl: string;
      defaultBranch: string;
    }) => {
      const { data, error } = await supabase
        .from("github_repo_links")
        .insert({
          connection_id: params.connectionId,
          workspace_id: params.workspaceId,
          project_id: params.projectId,
          repo_full_name: params.repoFullName,
          repo_name: params.repoName,
          repo_owner: params.repoOwner,
          repo_url: params.repoUrl,
          default_branch: params.defaultBranch,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repo-links"] });
      toast({ title: "Repository Linked", description: "Repository has been linked to this project." });
    },
    onError: (error) => {
      toast({
        title: "Link Failed",
        description: error instanceof Error ? error.message : "Failed to link repository",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRepoLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoLinkId: string) => {
      const { error } = await supabase
        .from("github_repo_links")
        .delete()
        .eq("id", repoLinkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-repo-links"] });
      toast({ title: "Repository Unlinked", description: "Repository has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Unlink Failed",
        description: error instanceof Error ? error.message : "Failed to unlink repository",
        variant: "destructive",
      });
    },
  });
}
