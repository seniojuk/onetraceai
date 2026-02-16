
-- Fix the overly permissive webhook insert policy to scope it better
DROP POLICY "System can insert GitHub webhook events" ON public.github_webhook_events;

CREATE POLICY "System can insert GitHub webhook events"
  ON public.github_webhook_events FOR INSERT
  WITH CHECK (
    workspace_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.github_connections gc 
      WHERE gc.id = github_webhook_events.connection_id
    )
  );
