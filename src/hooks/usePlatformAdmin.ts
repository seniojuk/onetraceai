import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface JiraConnectionAdminView {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string | null;
  jira_cloud_id: string;
  jira_base_url: string;
  jira_site_name: string | null;
  status: string;
  permissions: string;
  last_successful_sync: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  failure_count: number;
  token_expires_at: string | null;
  connected_by: string | null;
  connected_by_name: string | null;
  created_at: string;
  updated_at: string;
  project_links_count: number;
}

export function usePlatformAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["platform-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking platform admin status:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
  });
}

export function useAllJiraConnections() {
  const { data: isPlatformAdmin } = usePlatformAdmin();

  return useQuery({
    queryKey: ["jira-connections-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_connections_admin_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all Jira connections:", error);
        throw error;
      }

      return data as JiraConnectionAdminView[];
    },
    enabled: isPlatformAdmin === true,
  });
}
