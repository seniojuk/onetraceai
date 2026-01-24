import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UsageMetrics {
  artifacts: { used: number; limit: number | null };
  projects: { used: number; limit: number | null };
  aiRuns: { used: number; limit: number | null };
  storage: { used: number; limit: number | null };
}

export function useUsageMetrics(workspaceId: string | undefined, planId: string = "free") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["usage-metrics", workspaceId, planId],
    queryFn: async (): Promise<UsageMetrics> => {
      if (!workspaceId) {
        return {
          artifacts: { used: 0, limit: 100 },
          projects: { used: 0, limit: 2 },
          aiRuns: { used: 0, limit: 10 },
          storage: { used: 0, limit: 100 },
        };
      }

      // Get plan limits
      const { data: planLimit } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan_id", planId)
        .single();

      // Get all projects for this workspace
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", workspaceId)
        .neq("status", "ARCHIVED");

      const projectIds = projects?.map((p) => p.id) || [];

      // Count artifacts across all projects
      let artifactCount = 0;
      if (projectIds.length > 0) {
        const { count } = await supabase
          .from("artifacts")
          .select("*", { count: "exact", head: true })
          .in("project_id", projectIds);
        artifactCount = count || 0;
      }

      // Count AI runs this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: aiRunsCount } = await supabase
        .from("ai_runs")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonth.toISOString());

      // Calculate storage (simplified - count file artifacts)
      let storageUsed = 0;
      if (projectIds.length > 0) {
        const { data: fileArtifacts } = await supabase
          .from("artifacts")
          .select("content_json")
          .in("project_id", projectIds)
          .eq("type", "FILE");
        
        // Estimate storage from file metadata (rough estimate)
        storageUsed = fileArtifacts?.reduce((acc, f) => {
          const size = (f.content_json as { size?: number })?.size || 0;
          return acc + size;
        }, 0) || 0;
        storageUsed = Math.round(storageUsed / (1024 * 1024)); // Convert to MB
      }

      return {
        artifacts: {
          used: artifactCount,
          limit: planLimit?.max_artifacts || 100,
        },
        projects: {
          used: projectIds.length,
          limit: planLimit?.max_projects || 2,
        },
        aiRuns: {
          used: aiRunsCount || 0,
          limit: planLimit?.max_ai_runs_per_month || 10,
        },
        storage: {
          used: storageUsed,
          limit: planLimit?.max_storage_mb || 100,
        },
      };
    },
    enabled: !!user && !!workspaceId,
  });
}
