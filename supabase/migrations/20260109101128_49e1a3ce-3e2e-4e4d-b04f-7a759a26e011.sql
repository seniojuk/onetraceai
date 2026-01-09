-- Create artifact_versions table for version history
CREATE TABLE public.artifact_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content_markdown TEXT,
  content_json JSONB,
  enhancement_details TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_artifact_versions_artifact_id ON public.artifact_versions(artifact_id);
CREATE INDEX idx_artifact_versions_created_at ON public.artifact_versions(artifact_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view versions of artifacts in their workspaces"
ON public.artifact_versions
FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Users can create versions in their workspaces"
ON public.artifact_versions
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));

-- Add comment
COMMENT ON TABLE public.artifact_versions IS 'Stores version history of artifacts for tracking changes over time';