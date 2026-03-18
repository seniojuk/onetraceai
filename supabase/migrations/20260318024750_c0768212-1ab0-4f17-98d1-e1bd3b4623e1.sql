
-- Fix: Restrict GitHub connections write policies to OWNER/ADMIN only
DROP POLICY IF EXISTS "Admins can create GitHub connections" ON public.github_connections;
DROP POLICY IF EXISTS "Admins can update GitHub connections" ON public.github_connections;
DROP POLICY IF EXISTS "Admins can delete GitHub connections" ON public.github_connections;

CREATE POLICY "Admins can create GitHub connections"
ON public.github_connections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = github_connections.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);

CREATE POLICY "Admins can update GitHub connections"
ON public.github_connections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = github_connections.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);

CREATE POLICY "Admins can delete GitHub connections"
ON public.github_connections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = github_connections.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
