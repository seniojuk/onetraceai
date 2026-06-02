-- Add per-seat limit column
ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS max_users integer;

-- Replace plan rows with stakeholder pricing tiers
-- NULL = unlimited
DELETE FROM public.plan_limits;

INSERT INTO public.plan_limits (plan_id, plan_name, price_monthly, max_users, max_workspaces, max_projects, max_artifacts, max_ai_runs_per_month, max_storage_mb, features) VALUES
  ('starter',    'Starter',    0,      1,    1,    1,    25,   10,   100,   '["1 project","25 artifacts","10 AI runs/mo","Jira + GitHub connect","Community support"]'::jsonb),
  ('team',       'Team',       14900,  10,   NULL, 3,    NULL, 100,  10000, '["Up to 10 users","3 projects","Unlimited artifacts","100 AI runs/mo","Full Jira + GitHub two-way sync","Coverage engine + drift alerts"]'::jsonb),
  ('growth',     'Growth',     39900,  25,   NULL, NULL, NULL, 500,  51200, '["Up to 25 users","Unlimited projects","500 AI runs/mo","Slack notifications","Audit log + versioning","Priority support"]'::jsonb),
  ('enterprise', 'Enterprise', -1,     NULL, NULL, NULL, NULL, NULL, NULL,  '["Unlimited users","SSO / SAML + SCIM","Custom model hub","Dedicated CSM","SLA + DPA"]'::jsonb);

-- Migrate any existing subscriptions from old plan IDs
UPDATE public.subscriptions SET plan_id = 'team' WHERE plan_id = 'pro';
UPDATE public.subscriptions SET plan_id = 'starter' WHERE plan_id = 'free';