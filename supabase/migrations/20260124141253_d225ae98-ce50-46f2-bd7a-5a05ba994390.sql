-- Fix RLS on workspace_members table (has policies but RLS was disabled)
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;

-- Fix RLS on workspaces table (has policies but RLS was disabled)  
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;