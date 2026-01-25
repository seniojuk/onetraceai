import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdateProjectLinkParams {
  projectLinkId: string;
  updates: {
    status_mapping?: Record<string, string>;
    sync_settings?: Record<string, boolean>;
    field_mode?: "custom_fields" | "issue_properties";
  };
}

export function useUpdateJiraProjectLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectLinkId, updates }: UpdateProjectLinkParams) => {
      const { data, error } = await supabase
        .from("jira_project_links")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectLinkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jira-project-link"] });
      toast({
        title: "Settings Updated",
        description: "Jira project link settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    },
  });
}

interface DeleteProjectLinkParams {
  projectLinkId: string;
  projectId: string;
}

export function useDeleteJiraProjectLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectLinkId }: DeleteProjectLinkParams) => {
      const { error } = await supabase
        .from("jira_project_links")
        .delete()
        .eq("id", projectLinkId);

      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["jira-project-link", projectId] });
      toast({
        title: "Project Unlinked",
        description: "Jira project has been unlinked from this project.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unlink Failed",
        description: error instanceof Error ? error.message : "Failed to unlink project",
        variant: "destructive",
      });
    },
  });
}
