import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GitHubConnection {
  id: string;
  project_id: string;
  workspace_id: string;
  status: string;
  github_user_id: string | null;
  github_username: string | null;
  github_avatar_url: string | null;
  last_successful_sync: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  failure_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Fetch GitHub connection for a project
export function useGitHubConnection(projectId: string | undefined) {
  return useQuery({
    queryKey: ["github-connection", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("github_connections")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data as GitHubConnection | null;
    },
    enabled: !!projectId,
  });
}

// Initiate GitHub OAuth flow
export function useGitHubOAuthInit() {
  const { toast } = useToast();
  const [isInitiating, setIsInitiating] = useState(false);

  const initiateOAuth = useCallback(
    async (workspaceId: string, projectId: string) => {
      setIsInitiating(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const redirectUri = `${window.location.origin}/integrations/github/callback`;

        const response = await supabase.functions.invoke("github-oauth-init", {
          body: { workspaceId, projectId, redirectUri },
        });

        if (response.error) {
          throw new Error(response.error.message || "Failed to initiate OAuth");
        }

        const { authUrl, state } = response.data;
        if (!authUrl) throw new Error("No auth URL returned");

        sessionStorage.setItem("github_oauth_state", state);
        sessionStorage.setItem("github_oauth_workspace", workspaceId);
        sessionStorage.setItem("github_oauth_project", projectId);

        setTimeout(() => {
          window.location.assign(authUrl);
        }, 100);
      } catch (error) {
        toast({
          title: "Connection Failed",
          description: error instanceof Error ? error.message : "Failed to connect to GitHub",
          variant: "destructive",
        });
        setIsInitiating(false);
      }
    },
    [toast]
  );

  return { initiateOAuth, isInitiating };
}

// Handle OAuth callback
export function useGitHubOAuthCallback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const storedState = sessionStorage.getItem("github_oauth_state");
      if (!storedState || storedState !== state) {
        throw new Error("Invalid OAuth state - possible security issue");
      }

      const response = await supabase.functions.invoke("github-oauth-callback", {
        body: { code, state },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to complete OAuth");
      }

      sessionStorage.removeItem("github_oauth_state");
      sessionStorage.removeItem("github_oauth_workspace");
      sessionStorage.removeItem("github_oauth_project");

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-connection"] });
      toast({
        title: "GitHub Connected",
        description: "Successfully connected to GitHub",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to complete GitHub connection",
        variant: "destructive",
      });
    },
  });
}

// Disconnect GitHub
export function useGitHubDisconnect() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, workspaceId }: { connectionId: string; workspaceId: string }) => {
      const response = await supabase.functions.invoke("github-disconnect", {
        body: { connectionId, workspaceId },
      });
      if (response.error) {
        throw new Error(response.error.message || "Failed to disconnect");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-connection"] });
      toast({
        title: "GitHub Disconnected",
        description: "Successfully disconnected from GitHub",
      });
    },
    onError: (error) => {
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from GitHub",
        variant: "destructive",
      });
    },
  });
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
  language: string | null;
}

// Fetch GitHub repos for repo picker
export function useGitHubRepos(
  connectionId: string | undefined,
  workspaceId: string | undefined,
  options?: { search?: string; page?: number }
) {
  const search = options?.search || "";
  const page = options?.page || 1;

  return useQuery({
    queryKey: ["github-repos", connectionId, search, page],
    queryFn: async () => {
      if (!connectionId || !workspaceId) return { repos: [], has_next_page: false };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const params = new URLSearchParams({
        connectionId,
        workspaceId,
        page: String(page),
        per_page: "30",
      });
      if (search) params.set("search", search);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-list-repos?${params}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch repos");
      }

      return (await res.json()) as { repos: GitHubRepo[]; has_next_page: boolean };
    },
    enabled: !!connectionId && !!workspaceId,
  });
}

// Pull commits for a repo link
export function useGitHubPullCommits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoLinkId,
      workspaceId,
      projectId,
    }: {
      repoLinkId: string;
      workspaceId: string;
      projectId: string;
    }) => {
      const response = await supabase.functions.invoke("github-pull-commits", {
        body: { repoLinkId, workspaceId, projectId },
      });
      if (response.error) throw new Error(response.error.message || "Failed to pull commits");
      return response.data as { inserted: number; skipped: number; total_fetched: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["github-commits"] });
      toast({
        title: "Commits Synced",
        description: `Fetched ${data.total_fetched} commits, ${data.inserted} new.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync commits",
        variant: "destructive",
      });
    },
  });
}

// Pull PRs for a repo link
export function useGitHubPullPRs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoLinkId,
      workspaceId,
      projectId,
    }: {
      repoLinkId: string;
      workspaceId: string;
      projectId: string;
    }) => {
      const response = await supabase.functions.invoke("github-pull-prs", {
        body: { repoLinkId, workspaceId, projectId },
      });
      if (response.error) throw new Error(response.error.message || "Failed to pull PRs");
      return response.data as { upserted: number; total_fetched: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["github-prs"] });
      toast({
        title: "PRs Synced",
        description: `Fetched ${data.total_fetched} PRs, ${data.upserted} updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync PRs",
        variant: "destructive",
      });
    },
  });
}

// Link artifacts from parsed refs in commits/PRs
export function useGitHubLinkArtifacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoLinkId,
      workspaceId,
      projectId,
    }: {
      repoLinkId: string;
      workspaceId: string;
      projectId: string;
    }) => {
      const response = await supabase.functions.invoke("github-link-artifacts", {
        body: { repoLinkId, workspaceId, projectId },
      });
      if (response.error) throw new Error(response.error.message || "Failed to link artifacts");
      return response.data as { edges_created: number; mappings_created: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artifact-edges"] });
      queryClient.invalidateQueries({ queryKey: ["github-issue-mappings"] });
      toast({
        title: "Artifacts Linked",
        description: `Created ${data.edges_created} new edges from ${data.mappings_created} references.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Linking Failed",
        description: error instanceof Error ? error.message : "Failed to link artifacts",
        variant: "destructive",
      });
    },
  });
}
