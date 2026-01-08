-- Disable RLS on workspaces table
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;

-- Also disable on workspace_members since they're related
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;