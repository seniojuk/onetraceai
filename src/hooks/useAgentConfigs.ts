import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AgentType = 
  | "PRODUCT_AGENT" 
  | "STORY_AGENT" 
  | "ARCHITECTURE_AGENT"
  | "UX_AGENT" 
  | "DEV_AGENT" 
  | "QA_AGENT" 
  | "DRIFT_AGENT" 
  | "RELEASE_AGENT"
  | "SECURITY_AGENT" 
  | "DOCS_AGENT" 
  | "INTEGRATION_AGENT" 
  | "CUSTOM_AGENT";

export type RoutingMode = "AUTO_ROUTE" | "LOCKED" | "MANUAL_PER_RUN";

export interface AgentGuardrails {
  max_tokens_per_run?: number;
  allowed_artifact_types?: string[];
  require_approval?: boolean;
  rate_limit_per_hour?: number;
  blocked_topics?: string[];
}

export interface AgentConfig {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  agent_type: AgentType;
  persona: string | null;
  system_prompt: string | null;
  guardrails: AgentGuardrails | null;
  routing_mode: RoutingMode | null;
  default_model_id: string | null;
  fallback_model_ids: string[] | null;
  temperature: number | null;
  max_tokens: number | null;
  autonomous_enabled: boolean | null;
  invocation_triggers: Json | null;
  enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface CreateAgentConfigInput {
  workspaceId: string;
  projectId?: string;
  name: string;
  description?: string;
  agentType: AgentType;
  persona?: string;
  systemPrompt?: string;
  guardrails?: AgentGuardrails;
  routingMode?: RoutingMode;
  defaultModelId?: string;
  fallbackModelIds?: string[];
  temperature?: number;
  maxTokens?: number;
  autonomousEnabled?: boolean;
  invocationTriggers?: Json;
}

export function useAgentConfigs(workspaceId?: string, projectId?: string) {
  return useQuery({
    queryKey: ["agent-configs", workspaceId, projectId],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("agent_configs")
        .select(`
          *,
          default_model:llm_models(id, model_name, display_name)
        `)
        .eq("workspace_id", workspaceId);

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;
      return data as (AgentConfig & { default_model: { id: string; model_name: string; display_name: string } | null })[];
    },
    enabled: !!workspaceId,
  });
}

export function useAgentConfig(agentId?: string) {
  return useQuery({
    queryKey: ["agent-config", agentId],
    queryFn: async () => {
      if (!agentId) return null;

      const { data, error } = await supabase
        .from("agent_configs")
        .select(`
          *,
          default_model:llm_models(id, model_name, display_name)
        `)
        .eq("id", agentId)
        .single();

      if (error) throw error;
      return data as AgentConfig & { default_model: { id: string; model_name: string; display_name: string } | null };
    },
    enabled: !!agentId,
  });
}

export function useCreateAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentConfigInput) => {
      const { data, error } = await supabase
        .from("agent_configs")
        .insert({
          workspace_id: input.workspaceId,
          project_id: input.projectId || null,
          name: input.name,
          description: input.description || null,
          agent_type: input.agentType,
          persona: input.persona || null,
          system_prompt: input.systemPrompt || null,
          guardrails: input.guardrails as Json || null,
          routing_mode: input.routingMode || "AUTO_ROUTE",
          default_model_id: input.defaultModelId || null,
          fallback_model_ids: input.fallbackModelIds || [],
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxTokens || null,
          autonomous_enabled: input.autonomousEnabled ?? false,
          invocation_triggers: input.invocationTriggers || [],
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgentConfig;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-configs", variables.workspaceId] });
    },
  });
}

export function useUpdateAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      workspace_id,
      guardrails, 
      invocation_triggers, 
      ...updates 
    }: Partial<AgentConfig> & { id: string }) => {
      const updatePayload: Record<string, unknown> = { ...updates };
      
      if (guardrails !== undefined) {
        updatePayload.guardrails = guardrails as Json;
      }
      if (invocation_triggers !== undefined) {
        updatePayload.invocation_triggers = invocation_triggers;
      }

      const { data, error } = await supabase
        .from("agent_configs")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, workspace_id } as AgentConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-configs", data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["agent-config", data.id] });
    },
  });
}

export function useDeleteAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("agent_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, workspaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-configs", data.workspaceId] });
    },
  });
}

// Default agent templates for seeding
export const DEFAULT_AGENT_TEMPLATES: Omit<CreateAgentConfigInput, "workspaceId">[] = [
  {
    name: "Product Agent",
    agentType: "PRODUCT_AGENT",
    description: "Generates and refines Product Requirements Documents (PRDs) with structured sections and user-centered thinking.",
    persona: "You are an experienced product manager with deep expertise in user research, market analysis, and agile methodologies.",
    systemPrompt: "Help create comprehensive PRDs that capture product vision, user needs, and success metrics. Focus on clarity, measurability, and actionable requirements.",
  },
  {
    name: "Story Agent",
    agentType: "STORY_AGENT",
    description: "Creates user stories with acceptance criteria, story points, and priority from PRDs or epics.",
    persona: "You are a skilled business analyst who excels at breaking down complex requirements into clear, implementable user stories.",
    systemPrompt: "Generate user stories in the format 'As a [user], I want [goal] so that [benefit]'. Include comprehensive acceptance criteria and estimate story points using Fibonacci sequence.",
  },
  {
    name: "QA Agent",
    agentType: "QA_AGENT",
    description: "Generates test cases from acceptance criteria covering functional, edge cases, and error scenarios.",
    persona: "You are a meticulous QA engineer with expertise in test strategy, automation, and edge case discovery.",
    systemPrompt: "Create comprehensive test cases with clear steps, expected results, and test data. Cover positive, negative, boundary, and integration scenarios.",
  },
  {
    name: "Architecture Agent",
    agentType: "ARCHITECTURE_AGENT",
    description: "Designs system architecture, data models, and technical specifications.",
    persona: "You are a senior software architect with expertise in scalable systems, cloud infrastructure, and modern tech stacks.",
    systemPrompt: "Design architectures that are scalable, maintainable, and aligned with best practices. Consider security, performance, and cost optimization.",
  },
  {
    name: "UX Agent",
    agentType: "UX_AGENT",
    description: "Creates user flows, wireframes descriptions, and accessibility guidelines.",
    persona: "You are a UX designer passionate about creating intuitive, accessible, and delightful user experiences.",
    systemPrompt: "Focus on user-centered design principles, accessibility standards (WCAG), and modern UX patterns. Consider diverse user needs and edge cases.",
  },
  {
    name: "Security Agent",
    agentType: "SECURITY_AGENT",
    description: "Analyzes requirements for security risks and generates security requirements.",
    persona: "You are a security engineer with expertise in threat modeling, OWASP, and secure development practices.",
    systemPrompt: "Identify potential security vulnerabilities, suggest mitigations, and ensure compliance with security best practices and standards.",
  },
  {
    name: "Documentation Agent",
    agentType: "DOCS_AGENT",
    description: "Generates technical documentation, API docs, and user guides from artifacts.",
    persona: "You are a technical writer skilled at making complex concepts accessible to diverse audiences.",
    systemPrompt: "Create clear, well-structured documentation with examples. Adapt tone and detail level to the target audience.",
  },
];
