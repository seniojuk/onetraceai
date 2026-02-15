import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TechStackProfile {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  frontend: string[];
  backend: string[];
  database: string[];
  mobile: string[];
  infrastructure: string[];
  testing: string[];
  additional_guidelines: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STACK_CATEGORIES = [
  { key: "frontend", label: "Frontend", placeholder: "e.g. React 18, TypeScript, Tailwind CSS" },
  { key: "backend", label: "Backend", placeholder: "e.g. Node.js, Express, GraphQL" },
  { key: "database", label: "Database", placeholder: "e.g. PostgreSQL, Redis, MongoDB" },
  { key: "mobile", label: "Mobile", placeholder: "e.g. React Native, Expo, Flutter" },
  { key: "infrastructure", label: "Infrastructure", placeholder: "e.g. AWS, Docker, Kubernetes" },
  { key: "testing", label: "Testing", placeholder: "e.g. Jest, Playwright, Cypress" },
] as const;

export type StackCategory = typeof STACK_CATEGORIES[number]["key"];

export function useTechStackProfiles(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tech-stack-profiles", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("tech_stack_profiles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data as TechStackProfile[];
    },
    enabled: !!user && !!workspaceId,
  });
}

export function useProjectTechStack(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project-tech-stack", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("tech_stack_profile_id")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      if (!data?.tech_stack_profile_id) return null;

      const { data: profile, error: profileError } = await supabase
        .from("tech_stack_profiles")
        .select("*")
        .eq("id", data.tech_stack_profile_id)
        .single();
      if (profileError) throw profileError;
      return profile as TechStackProfile;
    },
    enabled: !!user && !!projectId,
  });
}

export function useCreateTechStackProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      workspaceId: string;
      name: string;
      description?: string;
      frontend?: string[];
      backend?: string[];
      database?: string[];
      mobile?: string[];
      infrastructure?: string[];
      testing?: string[];
      additional_guidelines?: string;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("tech_stack_profiles")
        .insert({
          workspace_id: params.workspaceId,
          name: params.name,
          description: params.description || null,
          frontend: params.frontend || [],
          backend: params.backend || [],
          database: params.database || [],
          mobile: params.mobile || [],
          infrastructure: params.infrastructure || [],
          testing: params.testing || [],
          additional_guidelines: params.additional_guidelines || null,
          is_default: params.is_default || false,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TechStackProfile;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-profiles", vars.workspaceId] });
    },
  });
}

export function useUpdateTechStackProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string | null;
      frontend?: string[];
      backend?: string[];
      database?: string[];
      mobile?: string[];
      infrastructure?: string[];
      testing?: string[];
      additional_guidelines?: string | null;
      is_default?: boolean;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("tech_stack_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TechStackProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-profiles", data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["project-tech-stack"] });
    },
  });
}

export function useDeleteTechStackProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from("tech_stack_profiles").delete().eq("id", id);
      if (error) throw error;
      return { id, workspaceId };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-profiles", vars.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["project-tech-stack"] });
    },
  });
}

export function useAssignTechStackToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, profileId }: { projectId: string; profileId: string | null }) => {
      const { data, error } = await supabase
        .from("projects")
        .update({ tech_stack_profile_id: profileId })
        .eq("id", projectId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-tech-stack", data.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
}

/** Format a tech stack profile into a text block for prompt injection */
export function formatTechStackForPrompt(profile: TechStackProfile): string {
  const lines: string[] = [`## Technology Stack: ${profile.name}`];
  if (profile.description) lines.push(profile.description);
  lines.push("");

  const categories: Array<{ key: StackCategory; label: string }> = [
    { key: "frontend", label: "Frontend" },
    { key: "backend", label: "Backend" },
    { key: "database", label: "Database" },
    { key: "mobile", label: "Mobile" },
    { key: "infrastructure", label: "Infrastructure" },
    { key: "testing", label: "Testing" },
  ];

  for (const { key, label } of categories) {
    const items = profile[key];
    if (items && items.length > 0) {
      lines.push(`**${label}:** ${items.join(", ")}`);
    }
  }

  if (profile.additional_guidelines) {
    lines.push("");
    lines.push("**Additional Guidelines:**");
    lines.push(profile.additional_guidelines);
  }

  return lines.join("\n");
}
