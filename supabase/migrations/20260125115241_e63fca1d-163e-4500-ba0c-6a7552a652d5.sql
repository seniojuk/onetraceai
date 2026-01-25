-- Create platform_admins table for platform-level administration
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform admin status (prevents recursion)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

-- Platform admins can view the table
CREATE POLICY "Platform admins can view platform_admins"
ON public.platform_admins
FOR SELECT
USING (public.is_platform_admin(auth.uid()));

-- Only platform admins can add other platform admins
CREATE POLICY "Platform admins can add platform_admins"
ON public.platform_admins
FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Only platform admins can remove platform admins
CREATE POLICY "Platform admins can remove platform_admins"
ON public.platform_admins
FOR DELETE
USING (public.is_platform_admin(auth.uid()));

-- Create a view for platform admins to see all Jira connections with workspace info
CREATE OR REPLACE VIEW public.jira_connections_admin_view
WITH (security_invoker = on)
AS
SELECT 
  jc.id,
  jc.workspace_id,
  w.name as workspace_name,
  w.slug as workspace_slug,
  jc.jira_cloud_id,
  jc.jira_base_url,
  jc.jira_site_name,
  jc.status,
  jc.permissions,
  jc.last_successful_sync,
  jc.last_error_at,
  jc.last_error_message,
  jc.failure_count,
  jc.token_expires_at,
  jc.connected_by,
  p.display_name as connected_by_name,
  jc.created_at,
  jc.updated_at,
  (SELECT COUNT(*) FROM public.jira_project_links jpl WHERE jpl.connection_id = jc.id) as project_links_count
FROM public.jira_connections jc
JOIN public.workspaces w ON w.id = jc.workspace_id
LEFT JOIN public.profiles p ON p.id = jc.connected_by;

-- Policy for platform admins to view all Jira connections
CREATE POLICY "Platform admins can view all Jira connections"
ON public.jira_connections
FOR SELECT
USING (public.is_platform_admin(auth.uid()));

-- Create a view for workspace admins to see all project links in their workspace
CREATE OR REPLACE VIEW public.jira_project_links_workspace_view
WITH (security_invoker = on)
AS
SELECT 
  jpl.id,
  jpl.workspace_id,
  jpl.project_id,
  p.name as project_name,
  p.project_key,
  jpl.connection_id,
  jpl.jira_project_id,
  jpl.jira_project_key,
  jpl.jira_project_name,
  jpl.field_mode,
  jpl.status_mapping,
  jpl.sync_settings,
  jpl.last_push_at,
  jpl.last_push_status,
  jpl.last_pull_at,
  jpl.last_pull_status,
  jpl.created_by,
  prof.display_name as created_by_name,
  jpl.created_at,
  jpl.updated_at,
  (SELECT COUNT(*) FROM public.jira_issue_mappings jim WHERE jim.project_link_id = jpl.id) as issue_mappings_count
FROM public.jira_project_links jpl
JOIN public.projects p ON p.id = jpl.project_id
LEFT JOIN public.profiles prof ON prof.id = jpl.created_by;