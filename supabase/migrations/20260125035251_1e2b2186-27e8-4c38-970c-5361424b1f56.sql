-- =============================================
-- JIRA INTEGRATION MODULE - DATABASE SCHEMA
-- =============================================

-- 1. Create enum for connection status
CREATE TYPE public.jira_connection_status AS ENUM ('connected', 'degraded', 'broken', 'disconnected');

-- 2. Create enum for sync direction
CREATE TYPE public.jira_sync_direction AS ENUM ('push', 'pull', 'both');

-- 3. Create enum for field mode
CREATE TYPE public.jira_field_mode AS ENUM ('custom_fields', 'issue_properties');

-- =============================================
-- TABLE: jira_connections
-- Stores OAuth tokens and connection health metrics
-- =============================================
CREATE TABLE public.jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Jira site info
  jira_cloud_id TEXT NOT NULL,
  jira_base_url TEXT NOT NULL,
  jira_site_name TEXT,
  
  -- Connection status
  status jira_connection_status NOT NULL DEFAULT 'connected',
  permissions TEXT NOT NULL DEFAULT 'read_write', -- 'read_only' or 'read_write'
  
  -- Health metrics
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  last_webhook_received TIMESTAMP WITH TIME ZONE,
  last_error_message TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  
  -- Metadata
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(workspace_id, jira_cloud_id)
);

-- Enable RLS
ALTER TABLE public.jira_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Jira connections in their workspaces"
  ON public.jira_connections FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can create Jira connections"
  ON public.jira_connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_connections.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Admins can update Jira connections"
  ON public.jira_connections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_connections.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Admins can delete Jira connections"
  ON public.jira_connections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_connections.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =============================================
-- TABLE: jira_project_links
-- Stores project-specific settings and field mappings
-- =============================================
CREATE TABLE public.jira_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  
  -- Jira project info
  jira_project_id TEXT NOT NULL,
  jira_project_key TEXT NOT NULL,
  jira_project_name TEXT,
  
  -- Field mapping configuration
  field_mode jira_field_mode NOT NULL DEFAULT 'custom_fields',
  field_map JSONB DEFAULT '{}'::jsonb,
  -- Example field_map:
  -- {
  --   "artifact_id_field": "customfield_10001",
  --   "short_id_field": "customfield_10002",
  --   "artifact_type_field": "customfield_10003",
  --   "coverage_field": "customfield_10004"
  -- }
  
  -- Status mapping (Jira status → OneTrace status)
  status_mapping JSONB DEFAULT '{
    "To Do": "ACTIVE",
    "In Progress": "IN_PROGRESS",
    "Done": "DONE",
    "Blocked": "BLOCKED"
  }'::jsonb,
  
  -- Sync rules
  sync_settings JSONB DEFAULT '{
    "push_summary": true,
    "push_description": true,
    "push_coverage": true,
    "sync_status": true,
    "sync_assignee": false,
    "sync_comments": false,
    "auto_push_on_publish": false
  }'::jsonb,
  
  -- Required fields defaults (for Jira-required fields)
  required_field_defaults JSONB DEFAULT '{}'::jsonb,
  -- Example:
  -- {
  --   "components": ["Backend"],
  --   "priority": { "id": "3" },
  --   "labels": ["onetrace"]
  -- }
  
  -- Health metrics
  last_push_at TIMESTAMP WITH TIME ZONE,
  last_push_status TEXT,
  last_pull_at TIMESTAMP WITH TIME ZONE,
  last_pull_status TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(project_id, jira_project_id)
);

-- Enable RLS
ALTER TABLE public.jira_project_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Jira project links in their workspaces"
  ON public.jira_project_links FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can create Jira project links"
  ON public.jira_project_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_project_links.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Admins can update Jira project links"
  ON public.jira_project_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_project_links.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Admins can delete Jira project links"
  ON public.jira_project_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_project_links.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =============================================
-- TABLE: jira_issue_mappings
-- Links OneTrace artifacts to Jira issues with hash fingerprints
-- =============================================
CREATE TABLE public.jira_issue_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_link_id UUID NOT NULL REFERENCES public.jira_project_links(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  
  -- Jira issue info
  jira_issue_id TEXT NOT NULL,
  jira_issue_key TEXT NOT NULL,
  jira_issue_url TEXT,
  jira_issue_type TEXT, -- Epic, Story, Bug, Task, etc.
  
  -- Sync timestamps
  last_pushed_at TIMESTAMP WITH TIME ZONE,
  last_pulled_at TIMESTAMP WITH TIME ZONE,
  
  -- Hash fingerprints for conflict detection
  last_pushed_summary_hash TEXT,
  last_pushed_description_hash TEXT,
  last_pulled_summary_hash TEXT,
  last_pulled_description_hash TEXT,
  
  -- Conflict state
  has_conflict BOOLEAN DEFAULT false,
  conflict_detected_at TIMESTAMP WITH TIME ZONE,
  conflict_resolved_at TIMESTAMP WITH TIME ZONE,
  conflict_resolved_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(artifact_id, jira_issue_id)
);

-- Enable RLS
ALTER TABLE public.jira_issue_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Jira issue mappings in their workspaces"
  ON public.jira_issue_mappings FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create Jira issue mappings"
  ON public.jira_issue_mappings FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update Jira issue mappings"
  ON public.jira_issue_mappings FOR UPDATE
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete Jira issue mappings"
  ON public.jira_issue_mappings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_issue_mappings.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =============================================
-- TABLE: jira_issues_shadow
-- Cache for inbound Jira data (debugging/history)
-- =============================================
CREATE TABLE public.jira_issues_shadow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_link_id UUID NOT NULL REFERENCES public.jira_project_links(id) ON DELETE CASCADE,
  mapping_id UUID REFERENCES public.jira_issue_mappings(id) ON DELETE SET NULL,
  
  -- Jira issue snapshot
  jira_issue_id TEXT NOT NULL,
  jira_issue_key TEXT NOT NULL,
  jira_data JSONB NOT NULL, -- Full issue response from Jira API
  
  -- Parsed fields for quick access
  summary TEXT,
  description_adf JSONB,
  status TEXT,
  assignee_id TEXT,
  assignee_name TEXT,
  priority TEXT,
  issue_type TEXT,
  
  -- Sync metadata
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'webhook', -- 'webhook', 'manual_pull', 'scheduled'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jira_issues_shadow ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Jira shadow data in their workspaces"
  ON public.jira_issues_shadow FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can insert Jira shadow data"
  ON public.jira_issues_shadow FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

-- =============================================
-- TABLE: jira_audit_logs
-- Detailed tracking of all Jira sync actions
-- =============================================
CREATE TABLE public.jira_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.jira_connections(id) ON DELETE SET NULL,
  project_link_id UUID REFERENCES public.jira_project_links(id) ON DELETE SET NULL,
  
  -- Actor
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'webhook'
  
  -- Action details
  action TEXT NOT NULL, -- 'JIRA_PUSH', 'JIRA_PULL', 'JIRA_LINK', 'FIELD_DISCOVERY', 'TRANSITION', 'CONNECT', 'DISCONNECT'
  action_details JSONB DEFAULT '{}'::jsonb,
  
  -- Affected entities
  artifact_ids UUID[] DEFAULT '{}',
  jira_issue_keys TEXT[] DEFAULT '{}',
  
  -- Result
  result TEXT NOT NULL DEFAULT 'success', -- 'success', 'failure', 'partial'
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jira_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Jira audit logs in their workspaces"
  ON public.jira_audit_logs FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "System can insert Jira audit logs"
  ON public.jira_audit_logs FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

-- =============================================
-- TABLE: jira_webhook_events
-- Raw webhook event storage for debugging
-- =============================================
CREATE TABLE public.jira_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.jira_connections(id) ON DELETE SET NULL,
  
  -- Webhook data
  webhook_id TEXT,
  event_type TEXT NOT NULL, -- 'jira:issue_created', 'jira:issue_updated', etc.
  payload JSONB NOT NULL,
  
  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  
  -- Metadata
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jira_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only for debugging)
CREATE POLICY "Admins can view webhook events"
  ON public.jira_webhook_events FOR SELECT
  USING (
    workspace_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = jira_webhook_events.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "System can insert webhook events"
  ON public.jira_webhook_events FOR INSERT
  WITH CHECK (true); -- Webhooks come from external source

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_jira_connections_workspace ON public.jira_connections(workspace_id);
CREATE INDEX idx_jira_connections_status ON public.jira_connections(status);

CREATE INDEX idx_jira_project_links_workspace ON public.jira_project_links(workspace_id);
CREATE INDEX idx_jira_project_links_project ON public.jira_project_links(project_id);
CREATE INDEX idx_jira_project_links_connection ON public.jira_project_links(connection_id);

CREATE INDEX idx_jira_issue_mappings_artifact ON public.jira_issue_mappings(artifact_id);
CREATE INDEX idx_jira_issue_mappings_jira_issue ON public.jira_issue_mappings(jira_issue_id);
CREATE INDEX idx_jira_issue_mappings_conflict ON public.jira_issue_mappings(has_conflict) WHERE has_conflict = true;

CREATE INDEX idx_jira_issues_shadow_mapping ON public.jira_issues_shadow(mapping_id);
CREATE INDEX idx_jira_issues_shadow_jira_issue ON public.jira_issues_shadow(jira_issue_id);

CREATE INDEX idx_jira_audit_logs_workspace ON public.jira_audit_logs(workspace_id);
CREATE INDEX idx_jira_audit_logs_action ON public.jira_audit_logs(action);
CREATE INDEX idx_jira_audit_logs_created ON public.jira_audit_logs(created_at DESC);

CREATE INDEX idx_jira_webhook_events_processed ON public.jira_webhook_events(processed) WHERE processed = false;

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_jira_connections_updated_at
  BEFORE UPDATE ON public.jira_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_project_links_updated_at
  BEFORE UPDATE ON public.jira_project_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_issue_mappings_updated_at
  BEFORE UPDATE ON public.jira_issue_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();