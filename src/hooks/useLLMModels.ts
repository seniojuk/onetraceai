import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LLMModelCapabilities {
  context_length?: number;
  tool_calling?: boolean;
  json_mode?: boolean;
  streaming?: boolean;
  multimodal?: boolean;
  advanced_reasoning?: boolean;
}

export interface LLMModel {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  capabilities: LLMModelCapabilities;
  cost_per_1k_input_tokens: number | null;
  cost_per_1k_output_tokens: number | null;
  enabled: boolean;
  created_at: string;
}

export function useLLMModels(providerId?: string) {
  return useQuery({
    queryKey: ["llm-models", providerId],
    queryFn: async () => {
      let query = supabase
        .from("llm_models")
        .select("*")
        .eq("enabled", true);

      if (providerId) {
        query = query.eq("provider_id", providerId);
      }

      const { data, error } = await query.order("display_name");

      if (error) throw error;
      return data as LLMModel[];
    },
    enabled: true,
  });
}

export function useAllModels() {
  return useQuery({
    queryKey: ["llm-models-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("llm_models")
        .select(`
          *,
          provider:llm_providers(id, display_name, provider_name, is_global)
        `)
        .eq("enabled", true)
        .order("display_name");

      if (error) throw error;
      return data as (LLMModel & { provider: { id: string; display_name: string; provider_name: string; is_global: boolean } })[];
    },
  });
}
