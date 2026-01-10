-- Create storage bucket for artifact files
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifact-files', 'artifact-files', false);

-- Create RLS policies for the storage bucket
-- Users can view files in their workspace
CREATE POLICY "Users can view files in their workspaces"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'artifact-files'
  AND EXISTS (
    SELECT 1 FROM public.artifacts
    WHERE artifacts.id::text = (storage.foldername(name))[1]
    AND public.is_workspace_member(artifacts.workspace_id)
  )
);

-- Users can upload files in their workspace
CREATE POLICY "Users can upload files in their workspaces"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artifact-files'
  AND auth.uid() IS NOT NULL
);

-- Users can delete files in their workspaces
CREATE POLICY "Users can delete files in their workspaces"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artifact-files'
  AND EXISTS (
    SELECT 1 FROM public.artifacts
    WHERE artifacts.id::text = (storage.foldername(name))[1]
    AND public.is_workspace_member(artifacts.workspace_id)
  )
);

-- Create artifact_file_associations junction table for many-to-many file-artifact relationships
CREATE TABLE public.artifact_file_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_artifact_id UUID NOT NULL,
  associated_artifact_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  project_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(file_artifact_id, associated_artifact_id)
);

-- Enable RLS on artifact_file_associations
ALTER TABLE public.artifact_file_associations ENABLE ROW LEVEL SECURITY;

-- RLS policies for artifact_file_associations
CREATE POLICY "Users can view file associations in their workspaces"
ON public.artifact_file_associations
FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create file associations"
ON public.artifact_file_associations
FOR INSERT
WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete file associations"
ON public.artifact_file_associations
FOR DELETE
USING (is_workspace_member(workspace_id));