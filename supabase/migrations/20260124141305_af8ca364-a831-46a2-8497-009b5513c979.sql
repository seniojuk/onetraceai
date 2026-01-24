-- Enable RLS on workspace_members and workspaces (the tables have policies but RLS is not enabled)
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;