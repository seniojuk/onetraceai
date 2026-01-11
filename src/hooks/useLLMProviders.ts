import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LLMProvider {
  id: string;
  workspace_id: string | null;
  provider_name: string;
  display_name: string;
  api_base_url: string | null;
  enabled: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export function useLLMProviders(workspaceId?: string) {
  return useQuery({
    queryKey: ["llm-providers", workspaceId],
    queryFn: async () => {
      // Get global providers and workspace providers
      let query = supabase
        .from("llm_providers")
        .select("*")
        .eq("enabled", true);

      if (workspaceId) {
        query = query.or(`is_global.eq.true,workspace_id.eq.${workspaceId}`);
      } else {
        query = query.eq("is_global", true);
      }

      const { data, error } = await query.order("display_name");

      if (error) throw error;
      return data as LLMProvider[];
    },
    enabled: true,
  });
}
