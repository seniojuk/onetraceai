-- Create subscriptions table to track workspace subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id)
);

-- Create invoices table for billing history
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  amount_due INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_metrics table for tracking workspace usage
CREATE TABLE public.usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, metric_type, period_start)
);

-- Create plan_limits table to define limits for each plan
CREATE TABLE public.plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  max_workspaces INTEGER,
  max_projects INTEGER,
  max_artifacts INTEGER,
  max_ai_runs_per_month INTEGER,
  max_storage_mb INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default plan limits
INSERT INTO public.plan_limits (plan_id, plan_name, price_monthly, max_workspaces, max_projects, max_artifacts, max_ai_runs_per_month, max_storage_mb, features) VALUES
  ('free', 'Free', 0, 1, 2, 100, 10, 100, '["Basic graph view", "Community support"]'::jsonb),
  ('pro', 'Pro', 2900, NULL, NULL, NULL, 1000, 10000, '["Advanced graph analytics", "Jira & GitHub integrations", "AI story generation", "Priority support"]'::jsonb),
  ('enterprise', 'Enterprise', -1, NULL, NULL, NULL, NULL, NULL, '["SSO / SAML", "Advanced security", "Custom integrations", "Dedicated support", "SLA guarantees", "On-premise option"]'::jsonb);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view subscriptions in their workspaces"
  ON public.subscriptions FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = subscriptions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
  ));

CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = subscriptions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('OWNER', 'ADMIN')
  ));

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their workspaces"
  ON public.invoices FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

-- RLS Policies for usage_metrics
CREATE POLICY "Users can view usage in their workspaces"
  ON public.usage_metrics FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can manage usage metrics"
  ON public.usage_metrics FOR ALL
  USING (is_workspace_member(workspace_id));

-- RLS Policies for plan_limits (read-only for all authenticated users)
CREATE POLICY "Anyone can view plan limits"
  ON public.plan_limits FOR SELECT
  TO authenticated
  USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_metrics_updated_at
  BEFORE UPDATE ON public.usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();