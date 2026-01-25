-- Fix permissive RLS policy on jira_webhook_events
-- The webhook insert policy needs to be more restrictive

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert webhook events" ON public.jira_webhook_events;

-- Create a more secure policy that validates the webhook is for a known connection
-- Webhooks are inserted by edge functions with service role, so we allow inserts
-- only when workspace_id is null (new webhook) or matches a valid connection
CREATE POLICY "Edge function can insert webhook events"
  ON public.jira_webhook_events FOR INSERT
  WITH CHECK (
    -- Allow if workspace_id is null (webhook lookup pending)
    workspace_id IS NULL 
    OR 
    -- Or if the connection exists (validated by edge function)
    EXISTS (
      SELECT 1 FROM public.jira_connections jc
      WHERE jc.id = jira_webhook_events.connection_id
    )
  );