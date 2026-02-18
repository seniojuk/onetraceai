
-- Create CI coverage tokens table
CREATE TABLE public.ci_coverage_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid,
  token_hash text NOT NULL,          -- SHA-256 of the raw token (never stored plaintext)
  token_prefix text NOT NULL,        -- First 8 chars for display (e.g. "otr_1a2b")
  label text NOT NULL DEFAULT 'CI Token',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.ci_coverage_tokens ENABLE ROW LEVEL SECURITY;

-- Workspace members can manage their own project tokens
CREATE POLICY "Members can view CI tokens in their workspaces"
  ON public.ci_coverage_tokens FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create CI tokens in their workspaces"
  ON public.ci_coverage_tokens FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update CI tokens in their workspaces"
  ON public.ci_coverage_tokens FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete CI tokens in their workspaces"
  ON public.ci_coverage_tokens FOR DELETE
  USING (is_workspace_member(workspace_id));

-- Index for token lookup by hash (used by edge function)
CREATE INDEX idx_ci_coverage_tokens_hash ON public.ci_coverage_tokens (token_hash);
CREATE INDEX idx_ci_coverage_tokens_project ON public.ci_coverage_tokens (project_id);
