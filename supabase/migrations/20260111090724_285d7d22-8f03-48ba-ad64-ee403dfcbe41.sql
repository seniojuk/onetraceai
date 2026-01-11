-- Allow users to view profiles of other members in their workspaces
CREATE POLICY "Users can view profiles of workspace co-members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
    AND wm2.user_id = profiles.id
  )
);