import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Use const object for EdgeType to allow runtime usage
export const EdgeType = {
  CONTAINS: "CONTAINS",
  DERIVES_FROM: "DERIVES_FROM",
  IMPLEMENTS: "IMPLEMENTS",
  SATISFIES: "SATISFIES",
  VALIDATES: "VALIDATES",
  DEPENDS_ON: "DEPENDS_ON",
  BLOCKS: "BLOCKS",
  SUPERSEDES: "SUPERSEDES",
  RELATED: "RELATED",
} as const;

export type EdgeType = (typeof EdgeType)[keyof typeof EdgeType];

export interface ArtifactEdge {
  id: string;
  workspace_id: string;
  project_id: string;
  from_artifact_id: string;
  to_artifact_id: string;
  edge_type: EdgeType;
  source: string;
  source_ref?: string;
  confidence: number;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

export function useArtifactEdges(artifactId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["artifact-edges", artifactId],
    queryFn: async () => {
      if (!artifactId) return { incoming: [], outgoing: [] };

      const [incomingResult, outgoingResult] = await Promise.all([
        supabase
          .from("artifact_edges")
          .select("*")
          .eq("to_artifact_id", artifactId),
        supabase
          .from("artifact_edges")
          .select("*")
          .eq("from_artifact_id", artifactId),
      ]);

      if (incomingResult.error) throw incomingResult.error;
      if (outgoingResult.error) throw outgoingResult.error;

      return {
        incoming: incomingResult.data as ArtifactEdge[],
        outgoing: outgoingResult.data as ArtifactEdge[],
      };
    },
    enabled: !!user && !!artifactId,
  });
}

export function useCreateArtifactEdge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      projectId,
      fromArtifactId,
      toArtifactId,
      edgeType,
      source = "AI_GENERATED",
      sourceRef,
      confidence = 1.0,
      metadata = {},
    }: {
      workspaceId: string;
      projectId: string;
      fromArtifactId: string;
      toArtifactId: string;
      edgeType: EdgeType;
      source?: string;
      sourceRef?: string;
      confidence?: number;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("artifact_edges")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          from_artifact_id: fromArtifactId,
          to_artifact_id: toArtifactId,
          edge_type: edgeType,
          source,
          source_ref: sourceRef,
          confidence,
          metadata,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ArtifactEdge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artifact-edges", data.from_artifact_id] });
      queryClient.invalidateQueries({ queryKey: ["artifact-edges", data.to_artifact_id] });
      queryClient.invalidateQueries({ queryKey: ["project-artifact-edges", data.project_id] });
    },
  });
}

export function useCreateArtifactEdges() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      edges: Array<{
        workspaceId: string;
        projectId: string;
        fromArtifactId: string;
        toArtifactId: string;
        edgeType: EdgeType;
        source?: string;
        sourceRef?: string;
        confidence?: number;
        metadata?: Record<string, any>;
      }>
    ) => {
      const insertData = edges.map((edge) => ({
        workspace_id: edge.workspaceId,
        project_id: edge.projectId,
        from_artifact_id: edge.fromArtifactId,
        to_artifact_id: edge.toArtifactId,
        edge_type: edge.edgeType,
        source: edge.source || "AI_GENERATED",
        source_ref: edge.sourceRef,
        confidence: edge.confidence ?? 1.0,
        metadata: edge.metadata || {},
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from("artifact_edges")
        .insert(insertData)
        .select();

      if (error) throw error;
      return data as ArtifactEdge[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artifact-edges"] });
      queryClient.invalidateQueries({ queryKey: ["project-artifact-edges"] });
    },
  });
}

// New hook to fetch all edges for a project
export function useProjectArtifactEdges(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project-artifact-edges", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("artifact_edges")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data as ArtifactEdge[];
    },
    enabled: !!user && !!projectId,
  });
}
