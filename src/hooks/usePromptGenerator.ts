import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PromptTool {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon_name: string | null;
  output_format: string;
  default_token_limit: number;
  is_system: boolean;
  enabled: boolean;
}

export interface GeneratedPrompt {
  id: string;
  workspace_id: string;
  project_id: string;
  artifact_id: string;
  tool_id: string;
  template_id: string | null;
  prompt_content: string;
  context_snapshot: Record<string, any>;
  context_config: Record<string, any>;
  version: number;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

export type DetailLevel = "concise" | "standard" | "comprehensive" | "exhaustive";

export const DETAIL_LEVEL_LABELS: Record<DetailLevel, string> = {
  concise: "Concise",
  standard: "Standard",
  comprehensive: "Comprehensive",
  exhaustive: "Exhaustive",
};

export const DETAIL_LEVEL_DESCRIPTIONS: Record<DetailLevel, string> = {
  concise: "Brief, high-level prompt (~1000 words)",
  standard: "Balanced detail level (~2000 words)",
  comprehensive: "Detailed with full specs (~4000 words)",
  exhaustive: "Maximum detail, all edge cases (~8000+ words)",
};

export interface ContextConfig {
  includeParents: boolean;
  includeChildren: boolean;
  maxDepth: number;
  tokenBudget: number;
  includeTypes: string[] | null; // null = all types
  detailLevel: DetailLevel;
}

export const ALL_ARTIFACT_TYPES = [
  "IDEA",
  "PRD",
  "EPIC",
  "STORY",
  "ACCEPTANCE_CRITERION",
  "TEST_CASE",
] as const;

export const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  IDEA: "Idea",
  PRD: "PRD",
  EPIC: "Epic",
  STORY: "Story",
  ACCEPTANCE_CRITERION: "Acceptance Criterion",
  TEST_CASE: "Test Case",
};

export function usePromptTools() {
  return useQuery({
    queryKey: ["prompt-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_tools")
        .select("*")
        .eq("enabled", true)
        .order("display_name");
      if (error) throw error;
      return data as PromptTool[];
    },
  });
}

export function useGeneratedPrompts(artifactId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["generated-prompts", artifactId],
    queryFn: async () => {
      if (!artifactId) return [];
      const { data, error } = await supabase
        .from("generated_prompts")
        .select("*")
        .eq("artifact_id", artifactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GeneratedPrompt[];
    },
    enabled: !!user && !!artifactId,
  });
}

export function useGeneratePrompt() {
  return useMutation({
    mutationFn: async ({
      artifactId,
      toolName,
      contextConfig,
    }: {
      artifactId: string;
      toolName: string;
      contextConfig?: ContextConfig;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-meta-prompt",
        {
          body: { artifactId, toolName, contextConfig },
        }
      );
      if (error) throw error;
      return data as {
        prompt: string;
        toolId: string;
        toolName: string;
        templateId: string | null;
        contextArtifacts: Array<{
          id: string;
          type: string;
          title: string;
          short_id: string;
        }>;
        usage: any;
      };
    },
  });
}

export function useSaveGeneratedPrompt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      projectId,
      artifactId,
      toolId,
      templateId,
      promptContent,
      contextSnapshot,
      contextConfig,
      metadata,
    }: {
      workspaceId: string;
      projectId: string;
      artifactId: string;
      toolId: string;
      templateId?: string | null;
      promptContent: string;
      contextSnapshot?: Record<string, any>;
      contextConfig?: Record<string, any>;
      metadata?: Record<string, any>;
    }) => {
      // Get latest version for this artifact+tool combo
      const { data: existing } = await supabase
        .from("generated_prompts")
        .select("version")
        .eq("artifact_id", artifactId)
        .eq("tool_id", toolId)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version ?? 0) + 1;

      const { data, error } = await supabase
        .from("generated_prompts")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          artifact_id: artifactId,
          tool_id: toolId,
          template_id: templateId || null,
          prompt_content: promptContent,
          context_snapshot: contextSnapshot || {},
          context_config: contextConfig || {},
          version: nextVersion,
          metadata: metadata || {},
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GeneratedPrompt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["generated-prompts", data.artifact_id],
      });
    },
  });
}
