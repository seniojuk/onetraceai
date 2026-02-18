import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GitHubCommit {
  id: string;
  repo_link_id: string;
  commit_sha: string;
  commit_message: string | null;
  commit_url: string | null;
  author_login: string | null;
  author_name: string | null;
  author_email: string | null;
  committed_at: string | null;
  additions: number | null;
  deletions: number | null;
  files_changed: number | null;
  parsed_artifact_refs: string[] | null;
  created_at: string | null;
}

export interface GitHubPR {
  id: string;
  repo_link_id: string;
  pr_number: number;
  pr_title: string | null;
  pr_body: string | null;
  pr_state: string | null;
  pr_url: string | null;
  author_login: string | null;
  head_branch: string | null;
  base_branch: string | null;
  merged_at: string | null;
  closed_at: string | null;
  pr_created_at: string | null;
  pr_updated_at: string | null;
  parsed_artifact_refs: string[] | null;
  labels: unknown;
  created_at: string | null;
}

export function useGitHubCommits(
  projectId: string | undefined,
  options?: { repoLinkId?: string; limit?: number }
) {
  const limit = options?.limit ?? 50;

  return useQuery({
    queryKey: ["github-commits", projectId, options?.repoLinkId, limit],
    queryFn: async () => {
      if (!projectId) return [];
      let query = supabase
        .from("github_commits_shadow")
        .select("*")
        .eq("project_id", projectId)
        .order("committed_at", { ascending: false })
        .limit(limit);

      if (options?.repoLinkId) {
        query = query.eq("repo_link_id", options.repoLinkId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GitHubCommit[];
    },
    enabled: !!projectId,
  });
}

export function useGitHubPRs(
  projectId: string | undefined,
  options?: { repoLinkId?: string; limit?: number; state?: string }
) {
  const limit = options?.limit ?? 50;

  return useQuery({
    queryKey: ["github-prs", projectId, options?.repoLinkId, options?.state, limit],
    queryFn: async () => {
      if (!projectId) return [];
      let query = supabase
        .from("github_prs_shadow")
        .select("*")
        .eq("project_id", projectId)
        .order("pr_created_at", { ascending: false })
        .limit(limit);

      if (options?.repoLinkId) {
        query = query.eq("repo_link_id", options.repoLinkId);
      }
      if (options?.state) {
        query = query.eq("pr_state", options.state);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GitHubPR[];
    },
    enabled: !!projectId,
  });
}
