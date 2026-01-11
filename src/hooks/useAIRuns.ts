import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AIRunType = "AUTONOMOUS" | "INVOKED" | "SCHEDULED";
export type AIRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface AIRunMetadata {
  generationType?: string;
  inputSource?: string;
  sourceArtifactId?: string;
  generatedItems?: Json[];
  customPrompt?: string;
}

export interface AIRun {
  id: string;
  workspace_id: string;
  project_id: string | null;
  agent_config_id: string | null;
  model_id: string | null;
  run_type: AIRunType;
  status: AIRunStatus;
  input_context: Json | null;
  output_artifacts: Json | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_cost: number | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Json | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface CreateAIRunInput {
  workspaceId: string;
  projectId?: string;
  agentConfigId?: string;
  modelId?: string;
  runType: AIRunType;
  inputContext?: Json;
  metadata?: Json;
}

export function useAIRuns(workspaceId?: string, projectId?: string, limit = 50) {
  return useQuery({
    queryKey: ["ai-runs", workspaceId, projectId, limit],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("ai_runs")
        .select(`
          *,
          agent_config:agent_configs(id, name, agent_type),
          model:llm_models(id, model_name, display_name)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (AIRun & { 
        agent_config: { id: string; name: string; agent_type: string } | null;
        model: { id: string; model_name: string; display_name: string } | null;
      })[];
    },
    enabled: !!workspaceId,
  });
}

export function useAIRun(runId?: string) {
  return useQuery({
    queryKey: ["ai-run", runId],
    queryFn: async () => {
      if (!runId) return null;

      const { data, error } = await supabase
        .from("ai_runs")
        .select(`
          *,
          agent_config:agent_configs(id, name, agent_type, persona, system_prompt),
          model:llm_models(id, model_name, display_name)
        `)
        .eq("id", runId)
        .single();

      if (error) throw error;
      return data as AIRun & { 
        agent_config: { id: string; name: string; agent_type: string; persona: string | null; system_prompt: string | null } | null;
        model: { id: string; model_name: string; display_name: string } | null;
      };
    },
    enabled: !!runId,
  });
}

export function useCreateAIRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAIRunInput) => {
      const { data, error } = await supabase
        .from("ai_runs")
        .insert({
          workspace_id: input.workspaceId,
          project_id: input.projectId || null,
          agent_config_id: input.agentConfigId || null,
          model_id: input.modelId || null,
          run_type: input.runType,
          status: "PENDING",
          input_context: input.inputContext || {},
          metadata: input.metadata || {},
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-runs", variables.workspaceId] });
    },
  });
}

export function useUpdateAIRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspace_id, ...updates }: Partial<AIRun> & { id: string }) => {
      const { data, error } = await supabase
        .from("ai_runs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, workspace_id } as AIRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-runs", data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["ai-run", data.id] });
    },
  });
}

// Helper to complete a run with results
export function useCompleteAIRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      workspaceId,
      outputArtifacts, 
      inputTokens, 
      outputTokens, 
      totalCost,
      metadata,
    }: { 
      id: string;
      workspaceId: string;
      outputArtifacts: Json[];
      inputTokens?: number;
      outputTokens?: number;
      totalCost?: number;
      metadata?: Json;
    }) => {
      const { data, error } = await supabase
        .from("ai_runs")
        .update({
          status: "COMPLETED",
          output_artifacts: outputArtifacts,
          input_tokens: inputTokens || 0,
          output_tokens: outputTokens || 0,
          total_cost: totalCost || 0,
          completed_at: new Date().toISOString(),
          metadata: metadata || {},
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AIRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-runs", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["ai-run", variables.id] });
    },
  });
}

// Helper to fail a run
export function useFailAIRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId, errorMessage }: { id: string; workspaceId: string; errorMessage: string }) => {
      const { data, error } = await supabase
        .from("ai_runs")
        .update({
          status: "FAILED",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AIRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-runs", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["ai-run", variables.id] });
    },
  });
}
