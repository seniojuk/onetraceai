import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Project {
  id: string;
  workspace_id: string;
  project_key: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjects(workspaceId: string | undefined, includeArchived: boolean = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projects", workspaceId, includeArchived],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!includeArchived) {
        query = query.eq("status", "ACTIVE");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useProject(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!user && !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      projectKey,
      description,
    }: {
      workspaceId: string;
      name: string;
      projectKey: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          workspace_id: workspaceId,
          name,
          project_key: projectKey.toUpperCase(),
          description,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", variables.workspaceId] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      description,
      status,
    }: {
      projectId: string;
      name?: string;
      description?: string;
      status?: "ACTIVE" | "ARCHIVED";
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects", data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, workspaceId }: { projectId: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      return { projectId, workspaceId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", variables.workspaceId] });
    },
  });
}
