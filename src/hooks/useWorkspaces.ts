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

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, name, slug }: { workspaceId: string; name?: string; slug?: string }) => {
      return await callWorkspacesApi("PUT", { id: workspaceId, body: { name, slug } }) as Workspace;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", data.id] });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspaces`);
      url.searchParams.set("id", workspaceId);

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete workspace");
      }
      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Get members
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      if (!members || members.length === 0) return [];

      // Get profiles for all member user_ids
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      // Combine members with profiles
      return members.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id) || null,
      })) as (WorkspaceMember & {
        profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
      })[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useCurrentUserRole(workspaceId: string | undefined) {
  const { user } = useAuth();
  const { data: members } = useWorkspaceMembers(workspaceId);

  if (!user || !members) return null;
  
  const member = members.find(m => m.user_id === user.id);
  return member?.role || null;
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      userId, 
      role 
    }: { 
      workspaceId: string; 
      userId: string; 
      role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (error) throw error;
      return { workspaceId, userId, role };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (error) throw error;
      return { workspaceId, userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      email, 
      role 
    }: { 
      workspaceId: string; 
      email: string; 
      role: "ADMIN" | "MEMBER" | "VIEWER";
    }) => {
      // Call edge function to handle invite
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-invite`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId, email, role }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to invite member");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      newOwnerId 
    }: { 
      workspaceId: string; 
      newOwnerId: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transfer-ownership`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId, newOwnerId }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to transfer ownership");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
