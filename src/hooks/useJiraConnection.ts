import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface JiraConnection {
  id: string;
  workspace_id: string;
  jira_cloud_id: string;
  jira_base_url: string;
  jira_site_name: string | null;
  status: "connected" | "degraded" | "broken" | "disconnected";
  permissions: string;
  last_successful_sync: string | null;
  last_webhook_received: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  failure_count: number;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  type: string;
  avatar?: string;
}

export interface JiraProjectLink {
  id: string;
  workspace_id: string;
  project_id: string;
  connection_id: string;
  jira_project_id: string;
  jira_project_key: string;
  jira_project_name: string | null;
  field_mode: "custom_fields" | "issue_properties";
  field_map: Record<string, unknown>;
  status_mapping: Record<string, unknown>;
  sync_settings: Record<string, unknown>;
  required_field_defaults: Record<string, unknown>;
  last_push_at: string | null;
  last_push_status: string | null;
  last_pull_at: string | null;
  last_pull_status: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch Jira connection for a workspace
export function useJiraConnection(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["jira-connection", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("jira_connections")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data as JiraConnection | null;
    },
    enabled: !!workspaceId,
  });
}

// Fetch Jira project link for a OneTrace project
export function useJiraProjectLink(projectId: string | undefined) {
  return useQuery({
    queryKey: ["jira-project-link", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("jira_project_links")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data as JiraProjectLink | null;
    },
    enabled: !!projectId,
  });
}

// Initiate OAuth flow
export function useJiraOAuthInit() {
  const { toast } = useToast();
  const [isInitiating, setIsInitiating] = useState(false);

  const initiateOAuth = useCallback(
    async (workspaceId: string) => {
      setIsInitiating(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Build redirect URI (back to the app after OAuth)
        const redirectUri = `${window.location.origin}/integrations/jira/callback`;
        console.log("[JIRA OAuth] Initiating with redirectUri:", redirectUri);

        const response = await supabase.functions.invoke("jira-oauth-init", {
          body: { workspaceId, redirectUri },
        });

        console.log("[JIRA OAuth] Response:", response);

        if (response.error) {
          throw new Error(response.error.message || "Failed to initiate OAuth");
        }

        const { authUrl, state } = response.data;
        
        if (!authUrl) {
          throw new Error("No auth URL returned from server");
        }

        console.log("[JIRA OAuth] Received authUrl:", authUrl);
        
        // Store state in sessionStorage for callback verification
        sessionStorage.setItem("jira_oauth_state", state);
        sessionStorage.setItem("jira_oauth_workspace", workspaceId);
        sessionStorage.setItem("jira_oauth_redirect", redirectUri);

        // Use setTimeout to ensure this runs after any React state updates
        // This helps avoid issues with dialogs/modals blocking navigation
        setTimeout(() => {
          console.log("[JIRA OAuth] Redirecting to:", authUrl);
          window.location.assign(authUrl);
        }, 100);
      } catch (error) {
        console.error("[JIRA OAuth] Init error:", error);
        toast({
          title: "Connection Failed",
          description: error instanceof Error ? error.message : "Failed to connect to Jira",
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
export function useJiraOAuthCallback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      // Verify state matches
      const storedState = sessionStorage.getItem("jira_oauth_state");
      if (!storedState || storedState !== state) {
        throw new Error("Invalid OAuth state - possible security issue");
      }

      const redirectUri = sessionStorage.getItem("jira_oauth_redirect");
      if (!redirectUri) {
        throw new Error("Missing redirect URI");
      }

      const response = await supabase.functions.invoke("jira-oauth-callback", {
        body: { code, state, redirectUri },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to complete OAuth");
      }

      // Clean up session storage
      sessionStorage.removeItem("jira_oauth_state");
      sessionStorage.removeItem("jira_oauth_workspace");
      sessionStorage.removeItem("jira_oauth_redirect");

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jira-connection"] });
      toast({
        title: "Jira Connected",
        description: `Successfully connected to ${data.jiraSite.name}`,
      });
    },
    onError: (error) => {
      console.error("OAuth callback error:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to complete Jira connection",
        variant: "destructive",
      });
    },
  });
}

// Disconnect Jira
export function useJiraDisconnect() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, workspaceId }: { connectionId: string; workspaceId: string }) => {
      const response = await supabase.functions.invoke("jira-disconnect", {
        body: { connectionId, workspaceId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to disconnect");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-connection"] });
      queryClient.invalidateQueries({ queryKey: ["jira-project-link"] });
      toast({
        title: "Jira Disconnected",
        description: "Successfully disconnected from Jira",
      });
    },
    onError: (error) => {
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from Jira",
        variant: "destructive",
      });
    },
  });
}

// Refresh token manually
export function useJiraRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, workspaceId }: { connectionId: string; workspaceId: string }) => {
      const response = await supabase.functions.invoke("jira-refresh-token", {
        body: { connectionId, workspaceId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to refresh token");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira-connection"] });
    },
  });
}

// Fetch Jira projects
export function useJiraProjects(connectionId: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["jira-projects", connectionId],
    queryFn: async () => {
      if (!connectionId || !workspaceId) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jira-get-projects?connectionId=${connectionId}&workspaceId=${workspaceId}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch projects");
      }

      const data = await res.json();
      return data.projects as JiraProject[];
    },
    enabled: !!connectionId && !!workspaceId,
  });
}
