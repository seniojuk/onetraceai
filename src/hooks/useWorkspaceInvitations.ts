import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  invited_by: string | null;
  expires_at: string;
  created_at: string;
}

export function useWorkspaceInvitations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-invitations", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("workspace_invitations" as never)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkspaceInvitation[];
    },
    enabled: !!workspaceId,
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      email,
      role,
    }: {
      workspaceId: string;
      email: string;
      role: "ADMIN" | "MEMBER" | "VIEWER";
    }) => {
      const { data, error } = await supabase.functions.invoke("workspace-invite", {
        body: { workspaceId, email, role },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-invitations", vars.workspaceId] });
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
    }: {
      invitationId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("workspace_invitations" as never)
        .update({ status: "REVOKED" } as never)
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-invitations", vars.workspaceId] });
    },
  });
}
