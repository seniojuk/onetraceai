import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ArtifactType =
  | "IDEA"
  | "PRD"
  | "EPIC"
  | "STORY"
  | "ACCEPTANCE_CRITERION"
  | "TEST_CASE"
  | "TEST_SUITE"
  | "CODE_MODULE"
  | "COMMIT"
  | "PULL_REQUEST"
  | "BUG"
  | "DECISION"
  | "RELEASE"
  | "DEPLOYMENT";

export type ArtifactStatus =
  | "DRAFT"
  | "ACTIVE"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "ARCHIVED";

export interface Artifact {
  id: string;
  workspace_id: string;
  project_id: string;
  short_id: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  parent_artifact_id: string | null;
  tags: string[];
  labels: Record<string, any>;
  content_json: Record<string, any>;
  content_markdown: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useArtifacts(projectId: string | undefined, type?: ArtifactType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["artifacts", projectId, type],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from("artifacts")
        .select("*")
        .eq("project_id", projectId)
        .neq("status", "ARCHIVED")
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Artifact[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useArtifact(artifactId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["artifact", artifactId],
    queryFn: async () => {
      if (!artifactId) return null;

      const { data, error } = await supabase
        .from("artifacts")
        .select("*")
        .eq("id", artifactId)
        .maybeSingle();

      if (error) throw error;
      return data as Artifact | null;
    },
    enabled: !!user && !!artifactId,
  });
}

export function useCreateArtifact() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      projectId,
      type,
      title,
      parentArtifactId,
      contentJson,
      contentMarkdown,
    }: {
      workspaceId: string;
      projectId: string;
      type: ArtifactType;
      title: string;
      parentArtifactId?: string;
      contentJson?: Record<string, any>;
      contentMarkdown?: string;
    }) => {
      // Generate short_id based on type
      const prefix = getArtifactPrefix(type);
      
      // Get count for generating short_id
      const { count } = await supabase
        .from("artifacts")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("type", type);

      const shortId = `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("artifacts")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          short_id: shortId,
          type,
          title,
          parent_artifact_id: parentArtifactId,
          content_json: contentJson || {},
          content_markdown: contentMarkdown,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Artifact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", variables.projectId] });
    },
  });
}

export function useUpdateArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      status,
      contentJson,
      contentMarkdown,
    }: {
      id: string;
      title?: string;
      status?: ArtifactStatus;
      contentJson?: Record<string, any>;
      contentMarkdown?: string;
    }) => {
      const updates: Partial<Artifact> = {};
      if (title) updates.title = title;
      if (status) updates.status = status;
      if (contentJson) updates.content_json = contentJson;
      if (contentMarkdown !== undefined) updates.content_markdown = contentMarkdown;

      const { data, error } = await supabase
        .from("artifacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Artifact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artifacts", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["artifact", data.id] });
    },
  });
}

function getArtifactPrefix(type: ArtifactType): string {
  const prefixes: Record<ArtifactType, string> = {
    IDEA: "IDEA",
    PRD: "PRD",
    EPIC: "EPIC",
    STORY: "STORY",
    ACCEPTANCE_CRITERION: "AC",
    TEST_CASE: "TEST",
    TEST_SUITE: "SUITE",
    CODE_MODULE: "MOD",
    COMMIT: "COMMIT",
    PULL_REQUEST: "PR",
    BUG: "BUG",
    DECISION: "DEC",
    RELEASE: "REL",
    DEPLOYMENT: "DEPLOY",
  };
  return prefixes[type];
}
