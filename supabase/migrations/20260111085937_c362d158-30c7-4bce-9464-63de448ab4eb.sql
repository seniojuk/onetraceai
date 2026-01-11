-- Allow owners/admins to delete projects in their workspaces
CREATE POLICY "Admins and owners can delete projects"
ON public.projects
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
  )
);

-- Allow owners to delete workspaces they own
CREATE POLICY "Owners can delete workspaces"
ON public.workspaces
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = auth.uid()
    AND wm.role = 'OWNER'
  )
);

-- Allow owners/admins to update/delete workspace members
CREATE POLICY "Admins and owners can update members"
ON public.workspace_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
  )
);

CREATE POLICY "Admins and owners can delete members"
ON public.workspace_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
  )
);