import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ArtifactVersion {
  id: string;
  artifact_id: string;
  workspace_id: string;
  project_id: string;
  version_number: number;
  title: string;
  content_markdown: string | null;
  content_json: Record<string, any> | null;
  enhancement_details: string | null;
  created_by: string | null;
  created_at: string;
}

export function useArtifactVersions(artifactId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["artifact-versions", artifactId],
    queryFn: async () => {
      if (!artifactId) return [];

      const { data, error } = await supabase
        .from("artifact_versions")
        .select("*")
        .eq("artifact_id", artifactId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return data as ArtifactVersion[];
    },
    enabled: !!user && !!artifactId,
  });
}

export function useCreateArtifactVersion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      artifactId,
      workspaceId,
      projectId,
      title,
      contentMarkdown,
      contentJson,
      enhancementDetails,
    }: {
      artifactId: string;
      workspaceId: string;
      projectId: string;
      title: string;
      contentMarkdown?: string;
      contentJson?: Record<string, any>;
      enhancementDetails?: string;
    }) => {
      // Get the next version number
      const { data: existingVersions } = await supabase
        .from("artifact_versions")
        .select("version_number")
        .eq("artifact_id", artifactId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 1;

      const { data, error } = await supabase
        .from("artifact_versions")
        .insert({
          artifact_id: artifactId,
          workspace_id: workspaceId,
          project_id: projectId,
          version_number: nextVersion,
          title,
          content_markdown: contentMarkdown,
          content_json: contentJson,
          enhancement_details: enhancementDetails,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ArtifactVersion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artifact-versions", variables.artifactId] });
    },
  });
}
