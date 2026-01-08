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

// Helper to call the workspaces edge function
async function callWorkspacesApi(
  method: "GET" | "POST" | "PUT",
  params?: { id?: string; body?: Record<string, unknown> }
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspaces`);
  if (params?.id) url.searchParams.set("id", params.id);

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: params?.body ? JSON.stringify(params.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useWorkspaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: async () => {
      return await callWorkspacesApi("GET") as Workspace[];
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
      return await callWorkspacesApi("GET", { id: workspaceId }) as Workspace;
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug?: string }) => {
      return await callWorkspacesApi("POST", { body: { name, slug } }) as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
