import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UsageMetrics {
  artifacts: { used: number; limit: number | null };
  projects: { used: number; limit: number | null };
  aiRuns: { used: number; limit: number | null };
  storage: { used: number; limit: number | null };
  users: { used: number; limit: number | null };
}

export function useUsageMetrics(workspaceId: string | undefined, planId: string = "starter") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["usage-metrics", workspaceId, planId],
    queryFn: async (): Promise<UsageMetrics> => {
      if (!workspaceId) {
        return {
          artifacts: { used: 0, limit: 25 },
          projects: { used: 0, limit: 1 },
          aiRuns: { used: 0, limit: 10 },
          storage: { used: 0, limit: 100 },
          users: { used: 0, limit: 1 },
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
          .in("project_id", projectIds)
          .neq("status", "ARCHIVED");
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

      // Count seats (accepted workspace members)
      const { count: memberCount } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      // Calculate storage (simplified - count file artifacts)
      let storageUsed = 0;
      if (projectIds.length > 0) {
        const { data: fileArtifacts } = await supabase
          .from("artifacts")
          .select("content_json")
          .in("project_id", projectIds)
          .eq("type", "FILE");

        storageUsed = fileArtifacts?.reduce((acc, f) => {
          const size = (f.content_json as { size?: number })?.size || 0;
          return acc + size;
        }, 0) || 0;
        storageUsed = Math.round(storageUsed / (1024 * 1024)); // MB
      }

      return {
        artifacts: {
          used: artifactCount,
          limit: planLimit?.max_artifacts ?? null,
        },
        projects: {
          used: projectIds.length,
          limit: planLimit?.max_projects ?? null,
        },
        aiRuns: {
          used: aiRunsCount || 0,
          limit: planLimit?.max_ai_runs_per_month ?? null,
        },
        storage: {
          used: storageUsed,
          limit: planLimit?.max_storage_mb ?? null,
        },
        users: {
          used: memberCount || 0,
          limit: (planLimit as { max_users?: number | null })?.max_users ?? null,
        },
      };
    },
    enabled: !!user && !!workspaceId,
  });
}
