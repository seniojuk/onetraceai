import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  invited_at: string;
  accepted_at: string | null;
}

export function useWorkspaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Workspace[];
    },
    enabled: !!user,
  });
}

export function useWorkspace(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data as Workspace | null;
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug?: string }) => {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
