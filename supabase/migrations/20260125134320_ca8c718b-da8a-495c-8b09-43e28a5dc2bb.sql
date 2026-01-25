-- Create a view for platform admins to see all workspaces with usage metrics
CREATE OR REPLACE VIEW public.workspaces_admin_metrics_view AS
SELECT 
  w.id,
  w.name,
  w.slug,
  w.created_at,
  w.created_by,
  p.display_name as created_by_name,
  -- Subscription info
  s.plan_id,
  s.status as subscription_status,
  s.current_period_end,
  -- Member count
  (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
  -- Project count
  (SELECT COUNT(*) FROM projects pr WHERE pr.workspace_id = w.id AND pr.status != 'ARCHIVED') as project_count,
  -- Artifact count across all projects
  (SELECT COUNT(*) FROM artifacts a 
   JOIN projects pr ON a.project_id = pr.id 
   WHERE pr.workspace_id = w.id) as artifact_count,
  -- AI runs this month
  (SELECT COUNT(*) FROM ai_runs ar 
   WHERE ar.workspace_id = w.id 
   AND ar.created_at >= date_trunc('month', now())) as ai_runs_this_month,
  -- Storage used (estimated from file artifacts)
  (SELECT COALESCE(SUM(
    CASE 
      WHEN a.type = 'FILE' AND a.content_json->>'size' IS NOT NULL 
      THEN (a.content_json->>'size')::bigint 
      ELSE 0 
    END
  ), 0) FROM artifacts a 
   JOIN projects pr ON a.project_id = pr.id 
   WHERE pr.workspace_id = w.id) as storage_bytes,
  -- Plan limits (joined from plan_limits table)
  pl.max_projects,
  pl.max_artifacts,
  pl.max_ai_runs_per_month,
  pl.max_storage_mb
FROM workspaces w
LEFT JOIN profiles p ON w.created_by = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
LEFT JOIN plan_limits pl ON pl.plan_id = COALESCE(s.plan_id, 'free');

-- Grant access to authenticated users (RLS on base tables already restricts access)
-- Platform admins will be able to access this through the is_platform_admin check

-- Create RLS policy for the view (views inherit from base table policies, but we add explicit check)
CREATE POLICY "Platform admins can view all workspace metrics"
ON public.workspaces
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Note: The view will only be accessible to platform admins due to the existing RLS policies
-- and the is_platform_admin function check we'll use in the application code