import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CoverageSnapshot {
  id: string;
  workspace_id: string;
  project_id: string;
  artifact_id: string;
  computed_at: string;
  total_acs: number;
  satisfied_acs: number;
  tested_acs: number;
  coverage_ratio: number;
  missing: {
    untested_ac_ids?: string[];
    unsatisfied_ac_ids?: string[];
  };
  metadata: Record<string, any>;
}

export interface ComputeCoverageResponse {
  project_id: string;
  computed_at: string;
  project_totals: {
    total_acs: number;
    satisfied_acs: number;
    tested_acs: number;
    untested_acs: number;
    coverage_ratio: number;
    test_coverage_ratio: number;
  };
  stories: Array<{
    artifact_id: string;
    total_acs: number;
    satisfied_acs: number;
    tested_acs: number;
    coverage_ratio: number;
    missing: {
      untested_ac_ids: string[];
      unsatisfied_ac_ids: string[];
    };
  }>;
  drift_findings_created: number;
  snapshots_created: number;
}

/** Fetch the latest coverage snapshots for a project (most recent per story) */
export function useCoverageSnapshots(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coverage-snapshots", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("coverage_snapshots")
        .select("*")
        .eq("project_id", projectId)
        .order("computed_at", { ascending: false });

      if (error) throw error;

      // Deduplicate: keep only the latest snapshot per artifact_id
      const latestByArtifact = new Map<string, CoverageSnapshot>();
      for (const snapshot of data as CoverageSnapshot[]) {
        if (!latestByArtifact.has(snapshot.artifact_id)) {
          latestByArtifact.set(snapshot.artifact_id, snapshot);
        }
      }

      return Array.from(latestByArtifact.values());
    },
    enabled: !!user && !!projectId,
  });
}

/** Fetch all historical snapshots for trend charts */
export function useCoverageHistory(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coverage-history", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("coverage_snapshots")
        .select("*")
        .eq("project_id", projectId)
        .order("computed_at", { ascending: true });

      if (error) throw error;
      return data as CoverageSnapshot[];
    },
    enabled: !!user && !!projectId,
  });
}

/** Trigger a coverage recomputation via the edge function */
export function useComputeCoverage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      workspaceId,
      coverageThreshold,
    }: {
      projectId: string;
      workspaceId: string;
      coverageThreshold?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("compute-coverage", {
        body: {
          project_id: projectId,
          workspace_id: workspaceId,
          coverage_threshold: coverageThreshold,
        },
      });

      if (response.error) throw response.error;
      return response.data as ComputeCoverageResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coverage-snapshots", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["coverage-history", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["drift-findings"] });
    },
  });
}
