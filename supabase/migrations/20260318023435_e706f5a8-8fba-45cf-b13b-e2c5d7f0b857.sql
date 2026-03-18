
-- Fix 1: Storage upload policy - add workspace membership check
DROP POLICY IF EXISTS "Users can upload files in their workspaces" ON storage.objects;

CREATE POLICY "Users can upload files in their workspaces"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artifact-files'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.artifacts
    WHERE artifacts.id::text = (storage.foldername(name))[1]
    AND public.is_workspace_member(artifacts.workspace_id)
  )
);

-- Fix 2: workspace_members INSERT policy - remove self-join vulnerability
DROP POLICY IF EXISTS "Admins can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON public.workspace_members;

-- Find and drop any INSERT policy on workspace_members
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'workspace_members' 
    AND schemaname = 'public'
    AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can insert workspace members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
