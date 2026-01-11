import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentConfig } from "./useAgentConfigs";

export interface PipelineStep {
  id: string;
  agentId: string;
  agentName: string;
  agentType: string;
  inputMapping: "previous_output" | "initial_input" | "custom";
  customPrompt?: string;
  order: number;
}

export interface AgentPipeline {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  steps: PipelineStep[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStepResult {
  stepId: string;
  agentId: string;
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  tokens?: { input: number; output: number };
  durationMs?: number;
  error?: string;
}

export interface PipelineRun {
  id: string;
  workspace_id: string;
  project_id: string | null;
  pipeline_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  current_step: number;
  step_results: PipelineStepResult[];
  input_content: string | null;
  final_output: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  pipeline?: AgentPipeline;
}

export interface CreatePipelineInput {
  workspaceId: string;
  projectId?: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
}

export function useAgentPipelines(workspaceId?: string, projectId?: string) {
  return useQuery({
    queryKey: ["agent-pipelines", workspaceId, projectId],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("agent_pipelines")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        steps: (p.steps as unknown as PipelineStep[]) || []
      })) as AgentPipeline[];
    },
    enabled: !!workspaceId,
  });
}

export function usePipelineRuns(workspaceId?: string, pipelineId?: string) {
  return useQuery({
    queryKey: ["pipeline-runs", workspaceId, pipelineId],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("pipeline_runs")
        .select("*, pipeline:agent_pipelines(*)")
        .eq("workspace_id", workspaceId);

      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        step_results: (r.step_results as unknown as PipelineStepResult[]) || [],
        pipeline: r.pipeline ? {
          ...r.pipeline,
          steps: (r.pipeline.steps as unknown as PipelineStep[]) || []
        } : undefined
      })) as PipelineRun[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePipelineInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("agent_pipelines")
        .insert([{
          workspace_id: input.workspaceId,
          project_id: input.projectId || null,
          name: input.name,
          description: input.description || null,
          steps: input.steps as unknown as Record<string, unknown>[],
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        steps: (data.steps as unknown as PipelineStep[]) || []
      } as AgentPipeline;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-pipelines", variables.workspaceId] });
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId, ...updates }: Partial<AgentPipeline> & { id: string; workspaceId: string }) => {
      const updatePayload: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.steps !== undefined) updatePayload.steps = updates.steps as unknown as Record<string, unknown>[];
      if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

      const { data, error } = await supabase
        .from("agent_pipelines")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        steps: (data.steps as unknown as PipelineStep[]) || []
      } as AgentPipeline;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-pipelines", variables.workspaceId] });
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("agent_pipelines")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, workspaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-pipelines", data.workspaceId] });
    },
  });
}

export function useCreatePipelineRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      workspaceId: string;
      projectId?: string;
      pipelineId: string;
      inputContent: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("pipeline_runs")
        .insert({
          workspace_id: input.workspaceId,
          project_id: input.projectId || null,
          pipeline_id: input.pipelineId,
          input_content: input.inputContent,
          status: "pending",
          step_results: [],
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        step_results: []
      } as PipelineRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-runs", variables.workspaceId] });
    },
  });
}

export function useUpdatePipelineRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId, ...updates }: Partial<PipelineRun> & { id: string; workspaceId: string }) => {
      const updatePayload: Record<string, unknown> = {};
      
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.current_step !== undefined) updatePayload.current_step = updates.current_step;
      if (updates.step_results !== undefined) updatePayload.step_results = updates.step_results as unknown as Record<string, unknown>[];
      if (updates.final_output !== undefined) updatePayload.final_output = updates.final_output;
      if (updates.error_message !== undefined) updatePayload.error_message = updates.error_message;
      if (updates.started_at !== undefined) updatePayload.started_at = updates.started_at;
      if (updates.completed_at !== undefined) updatePayload.completed_at = updates.completed_at;

      const { data, error } = await supabase
        .from("pipeline_runs")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        step_results: (data.step_results as unknown as PipelineStepResult[]) || []
      } as PipelineRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-runs", variables.workspaceId] });
    },
  });
}

// Pre-built pipeline templates
export const PIPELINE_TEMPLATES = [
  {
    name: "PRD → Stories → Test Cases",
    description: "Complete requirements pipeline: generate PRD, break into stories, create test cases",
    agentTypes: ["PRODUCT_AGENT", "STORY_AGENT", "QA_AGENT"],
  },
  {
    name: "Requirements → Architecture → Security Review",
    description: "Technical design pipeline: analyze requirements, design architecture, review security",
    agentTypes: ["PRODUCT_AGENT", "ARCHITECTURE_AGENT", "SECURITY_AGENT"],
  },
  {
    name: "Stories → UX Flow → Documentation",
    description: "User experience pipeline: story analysis, UX design, documentation",
    agentTypes: ["STORY_AGENT", "UX_AGENT", "DOCS_AGENT"],
  },
];
