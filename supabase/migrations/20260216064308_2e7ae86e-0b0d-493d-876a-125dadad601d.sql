
-- =============================================
-- GitHub Integration Tables
-- =============================================

-- 1. github_connections: OAuth tokens per project
CREATE TABLE public.github_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  github_user_id text,
  github_username text,
  github_avatar_url text,
  status text NOT NULL DEFAULT 'connected',
  last_successful_sync timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  failure_count integer DEFAULT 0,
  connected_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT github_connections_status_check CHECK (status IN ('connected', 'disconnected', 'degraded', 'broken'))
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GitHub connections in their workspaces"
  ON public.github_connections FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can create GitHub connections"
  ON public.github_connections FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Admins can update GitHub connections"
  ON public.github_connections FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete GitHub connections"
  ON public.github_connections FOR DELETE
  USING (is_workspace_member(workspace_id));

CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. github_repo_links: Links a repo to a project connection
CREATE TABLE public.github_repo_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.github_connections(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  repo_full_name text NOT NULL,
  default_branch text DEFAULT 'main',
  repo_url text,
  last_commit_sha text,
  last_pull_at timestamptz,
  last_pull_status text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.github_repo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view repo links in their workspaces"
  ON public.github_repo_links FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create repo links"
  ON public.github_repo_links FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update repo links"
  ON public.github_repo_links FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete repo links"
  ON public.github_repo_links FOR DELETE
  USING (is_workspace_member(workspace_id));

CREATE TRIGGER update_github_repo_links_updated_at
  BEFORE UPDATE ON public.github_repo_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. github_commits_shadow: Cached commit data
CREATE TABLE public.github_commits_shadow (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_link_id uuid NOT NULL REFERENCES public.github_repo_links(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commit_sha text NOT NULL,
  commit_message text,
  author_login text,
  author_name text,
  author_email text,
  committed_at timestamptz,
  commit_url text,
  files_changed integer DEFAULT 0,
  additions integer DEFAULT 0,
  deletions integer DEFAULT 0,
  parsed_artifact_refs text[] DEFAULT '{}',
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(repo_link_id, commit_sha)
);

ALTER TABLE public.github_commits_shadow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view commits in their workspaces"
  ON public.github_commits_shadow FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can insert commits"
  ON public.github_commits_shadow FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

-- 4. github_prs_shadow: Cached PR data
CREATE TABLE public.github_prs_shadow (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_link_id uuid NOT NULL REFERENCES public.github_repo_links(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pr_number integer NOT NULL,
  pr_title text,
  pr_body text,
  pr_state text,
  pr_url text,
  author_login text,
  head_branch text,
  base_branch text,
  merged_at timestamptz,
  closed_at timestamptz,
  pr_created_at timestamptz,
  pr_updated_at timestamptz,
  labels jsonb DEFAULT '[]',
  parsed_artifact_refs text[] DEFAULT '{}',
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(repo_link_id, pr_number)
);

ALTER TABLE public.github_prs_shadow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PRs in their workspaces"
  ON public.github_prs_shadow FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can insert PRs"
  ON public.github_prs_shadow FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "System can update PRs"
  ON public.github_prs_shadow FOR UPDATE
  USING (is_workspace_member(workspace_id));

-- 5. github_issue_mappings: Maps commits/PRs to artifacts
CREATE TABLE public.github_issue_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  repo_link_id uuid NOT NULL REFERENCES public.github_repo_links(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_ref text,
  edge_id uuid REFERENCES public.artifact_edges(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  CONSTRAINT github_issue_mappings_source_type_check CHECK (source_type IN ('commit', 'pull_request'))
);

ALTER TABLE public.github_issue_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GitHub mappings in their workspaces"
  ON public.github_issue_mappings FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can insert GitHub mappings"
  ON public.github_issue_mappings FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "System can delete GitHub mappings"
  ON public.github_issue_mappings FOR DELETE
  USING (is_workspace_member(workspace_id));

-- 6. github_webhook_events: Inbound webhook queue
CREATE TABLE public.github_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.github_connections(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  action text,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz DEFAULT now()
);

ALTER TABLE public.github_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view GitHub webhook events"
  ON public.github_webhook_events FOR SELECT
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));

CREATE POLICY "System can insert GitHub webhook events"
  ON public.github_webhook_events FOR INSERT
  WITH CHECK (true);
