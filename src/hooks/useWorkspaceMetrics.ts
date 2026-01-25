import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "./usePlatformAdmin";

export interface WorkspaceMetrics {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  member_count: number;
  project_count: number;
  artifact_count: number;
  ai_runs_this_month: number;
  storage_bytes: number;
  max_projects: number | null;
  max_artifacts: number | null;
  max_ai_runs_per_month: number | null;
  max_storage_mb: number | null;
}

export function useAllWorkspaceMetrics() {
  const { data: isPlatformAdmin } = usePlatformAdmin();

  return useQuery({
    queryKey: ["all-workspace-metrics"],
    queryFn: async () => {
      // Query the view directly - platform admins have access via RLS policy
      const { data, error } = await supabase
        .from("workspaces_admin_metrics_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching workspace metrics:", error);
        throw error;
      }

      return data as WorkspaceMetrics[];
    },
    enabled: isPlatformAdmin === true,
  });
}
