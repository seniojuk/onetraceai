
-- Tech Stack Profiles: reusable technology stack definitions at workspace level
CREATE TABLE public.tech_stack_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Structured categories
  frontend JSONB DEFAULT '[]'::jsonb,        -- e.g. ["React 18", "TypeScript", "Tailwind CSS"]
  backend JSONB DEFAULT '[]'::jsonb,         -- e.g. ["Node.js", "Express", "GraphQL"]
  database JSONB DEFAULT '[]'::jsonb,        -- e.g. ["PostgreSQL", "Redis"]
  mobile JSONB DEFAULT '[]'::jsonb,          -- e.g. ["React Native", "Expo"]
  infrastructure JSONB DEFAULT '[]'::jsonb,  -- e.g. ["AWS", "Docker", "Kubernetes"]
  testing JSONB DEFAULT '[]'::jsonb,         -- e.g. ["Jest", "Playwright", "Cypress"]
  additional_guidelines TEXT,                 -- Free-form conventions/notes
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link projects to a tech stack profile
ALTER TABLE public.projects
  ADD COLUMN tech_stack_profile_id UUID REFERENCES public.tech_stack_profiles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.tech_stack_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view workspace stack profiles"
  ON public.tech_stack_profiles FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create stack profiles"
  ON public.tech_stack_profiles FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update stack profiles"
  ON public.tech_stack_profiles FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete stack profiles"
  ON public.tech_stack_profiles FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Auto-update timestamp
CREATE TRIGGER update_tech_stack_profiles_updated_at
  BEFORE UPDATE ON public.tech_stack_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
