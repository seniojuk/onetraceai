
-- Create prompt_tools table (registry of supported code generation tools)
CREATE TABLE public.prompt_tools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon_name text,
  output_format text NOT NULL DEFAULT '.md',
  default_token_limit integer DEFAULT 8000,
  is_system boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create prompt_templates table
CREATE TABLE public.prompt_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.prompt_tools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_body text NOT NULL,
  format_rules jsonb DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create generated_prompts table
CREATE TABLE public.generated_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.prompt_tools(id),
  template_id uuid REFERENCES public.prompt_templates(id),
  prompt_content text NOT NULL,
  context_snapshot jsonb DEFAULT '{}'::jsonb,
  context_config jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_prompts ENABLE ROW LEVEL SECURITY;

-- prompt_tools policies (system tools readable by all authenticated, workspace members can manage custom)
CREATE POLICY "Anyone can view enabled tools"
  ON public.prompt_tools FOR SELECT
  USING (enabled = true);

CREATE POLICY "Platform admins can manage tools"
  ON public.prompt_tools FOR ALL
  USING (is_platform_admin(auth.uid()));

-- prompt_templates policies
CREATE POLICY "Users can view system templates"
  ON public.prompt_templates FOR SELECT
  USING (is_system = true);

CREATE POLICY "Members can view workspace templates"
  ON public.prompt_templates FOR SELECT
  USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY "Members can create workspace templates"
  ON public.prompt_templates FOR INSERT
  WITH CHECK (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY "Members can update workspace templates"
  ON public.prompt_templates FOR UPDATE
  USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id) AND is_system = false);

CREATE POLICY "Members can delete workspace templates"
  ON public.prompt_templates FOR DELETE
  USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id) AND is_system = false);

-- generated_prompts policies
CREATE POLICY "Members can view generated prompts"
  ON public.generated_prompts FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create generated prompts"
  ON public.generated_prompts FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete generated prompts"
  ON public.generated_prompts FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Seed system tools
INSERT INTO public.prompt_tools (name, display_name, description, icon_name, output_format, default_token_limit, is_system) VALUES
  ('lovable', 'Lovable', 'Generate prompts optimized for Lovable AI app builder', 'Heart', '.md', 4000, true),
  ('cursor', 'Cursor', 'Generate prompts and .cursorrules for Cursor AI IDE', 'MousePointer', '.cursorrules', 8000, true),
  ('claude_code', 'Claude Code', 'Generate structured specs for Claude Code agent', 'Terminal', '.md', 16000, true),
  ('codex', 'Codex', 'Generate task-oriented prompts for OpenAI Codex', 'Code', '.md', 8000, true),
  ('windsurf', 'Windsurf', 'Generate cascade prompts for Windsurf AI IDE', 'Wind', '.md', 8000, true),
  ('custom', 'Custom', 'Use a custom template for any code generation tool', 'Settings', '.md', 8000, true);

-- Seed system templates for each tool
INSERT INTO public.prompt_templates (tool_id, name, description, template_body, is_system) VALUES
  ((SELECT id FROM public.prompt_tools WHERE name = 'lovable'), 'Lovable Default', 'Standard Lovable prompt template', 
   'Generate a concise feature request for Lovable based on the following artifact context. Focus on UI expectations, user interactions, and acceptance criteria. Keep it actionable and under {{token_limit}} tokens.', true),
  ((SELECT id FROM public.prompt_tools WHERE name = 'cursor'), 'Cursor Default', 'Standard Cursor prompt template',
   'Generate a detailed implementation prompt for Cursor IDE. Include file-level guidance, code structure expectations, and relevant context rules. Format as a .cursorrules compatible output.', true),
  ((SELECT id FROM public.prompt_tools WHERE name = 'claude_code'), 'Claude Code Default', 'Standard Claude Code template',
   'Generate a structured specification for Claude Code agent. Include step-by-step implementation plan, file changes needed, acceptance criteria, and constraints. Be thorough and precise.', true),
  ((SELECT id FROM public.prompt_tools WHERE name = 'codex'), 'Codex Default', 'Standard Codex prompt template',
   'Generate a task-oriented prompt for Codex. Include function signatures, expected inputs/outputs, test expectations, and implementation constraints.', true),
  ((SELECT id FROM public.prompt_tools WHERE name = 'windsurf'), 'Windsurf Default', 'Standard Windsurf cascade template',
   'Generate a cascade-style prompt for Windsurf. Break the implementation into sequential steps with clear context boundaries and expected outcomes per step.', true),
  ((SELECT id FROM public.prompt_tools WHERE name = 'custom'), 'Custom Default', 'Basic custom template',
   'Generate a code generation prompt based on the following artifact context. Adapt the output to be clear, actionable, and well-structured for any AI coding assistant.', true);

-- Add updated_at triggers
CREATE TRIGGER update_prompt_tools_updated_at
  BEFORE UPDATE ON public.prompt_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
