
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create versions in their workspaces" ON public.artifact_versions;
DROP POLICY IF EXISTS "Users can view versions of artifacts in their workspaces" ON public.artifact_versions;

-- Recreate as permissive policies
CREATE POLICY "Users can view versions of artifacts in their workspaces"
ON public.artifact_versions
FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "Users can create versions in their workspaces"
ON public.artifact_versions
FOR INSERT
WITH CHECK (is_workspace_member(workspace_id));
