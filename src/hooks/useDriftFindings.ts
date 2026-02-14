import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DriftFinding {
  id: string;
  workspace_id: string;
  project_id: string;
  type: string;
  title: string;
  description: string | null;
  severity: number | null;
  status: string | null;
  primary_artifact_id: string | null;
  related_artifact_ids: string[] | null;
  evidence: Record<string, any> | null;
  detected_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_by: string | null;
}

export function useDriftFindings(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["drift-findings", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("drift_findings")
        .select("*")
        .eq("project_id", projectId)
        .order("detected_at", { ascending: false });

      if (error) throw error;
      return data as DriftFinding[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useResolveDriftFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ findingId, resolutionNote }: { findingId: string; resolutionNote?: string }) => {
      const { error } = await supabase
        .from("drift_findings")
        .update({
          status: "RESOLVED",
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_note: resolutionNote || null,
        })
        .eq("id", findingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drift-findings"] });
    },
  });
}

export function useIgnoreDriftFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ findingId }: { findingId: string }) => {
      const { error } = await supabase
        .from("drift_findings")
        .update({ status: "IGNORED" })
        .eq("id", findingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drift-findings"] });
    },
  });
}
