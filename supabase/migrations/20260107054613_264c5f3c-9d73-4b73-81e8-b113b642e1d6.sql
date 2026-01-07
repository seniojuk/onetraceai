-- Fix function search path warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Artifacts (nodes in the graph)
CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  short_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'IDEA', 'PRD', 'EPIC', 'STORY', 'ACCEPTANCE_CRITERION',
    'TEST_CASE', 'TEST_SUITE', 'CODE_MODULE', 'COMMIT',
    'PULL_REQUEST', 'BUG', 'DECISION', 'RELEASE', 'DEPLOYMENT'
  )),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ACTIVE', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'ARCHIVED'
  )),
  parent_artifact_id UUID REFERENCES public.artifacts(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  labels JSONB DEFAULT '{}',
  content_json JSONB DEFAULT '{}',
  content_markdown TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, project_id, short_id)
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view artifacts in their workspaces"
  ON public.artifacts FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create artifacts"
  ON public.artifacts FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update artifacts"
  ON public.artifacts FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete artifacts"
  ON public.artifacts FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- Artifact Edges (relationships between artifacts)
CREATE TABLE public.artifact_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  to_artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN (
    'CONTAINS', 'DERIVES_FROM', 'IMPLEMENTS', 'SATISFIES',
    'VALIDATES', 'DEPENDS_ON', 'BLOCKS', 'SUPERSEDES', 'RELATED'
  )),
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL CHECK (source IN (
    'MANUAL', 'COMMIT_TRAILER', 'PR_BODY', 'HEURISTIC', 'AI_INFERRED', 'IMPORT'
  )),
  source_ref TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_artifact_id, to_artifact_id, edge_type)
);

ALTER TABLE public.artifact_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edges in their workspaces"
  ON public.artifact_edges FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create edges"
  ON public.artifact_edges FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete edges"
  ON public.artifact_edges FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- Coverage Snapshots
CREATE TABLE public.coverage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  total_acs INTEGER DEFAULT 0,
  satisfied_acs INTEGER DEFAULT 0,
  tested_acs INTEGER DEFAULT 0,
  coverage_ratio DECIMAL(5,4) CHECK (coverage_ratio >= 0 AND coverage_ratio <= 1),
  missing JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.coverage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view coverage in their workspaces"
  ON public.coverage_snapshots FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create coverage snapshots"
  ON public.coverage_snapshots FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Drift Findings
CREATE TABLE public.drift_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'CODE_WITHOUT_REQUIREMENT', 'REQUIREMENT_WITHOUT_CODE',
    'AC_WITHOUT_TEST', 'TEST_WITHOUT_AC',
    'JIRA_STATUS_MISMATCH', 'UNTRACED_COMMIT'
  )),
  status TEXT DEFAULT 'OPEN' CHECK (status IN (
    'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'
  )),
  severity INTEGER CHECK (severity >= 1 AND severity <= 5),
  title TEXT NOT NULL,
  description TEXT,
  primary_artifact_id UUID REFERENCES public.artifacts(id),
  related_artifact_ids UUID[],
  evidence JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.drift_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drift in their workspaces"
  ON public.drift_findings FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create drift findings"
  ON public.drift_findings FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update drift findings"
  ON public.drift_findings FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

-- Onboarding Progress
CREATE TABLE public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed_steps TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding progress"
  ON public.onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own onboarding progress"
  ON public.onboarding_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
  ON public.onboarding_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Add update trigger for artifacts
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_artifacts_project_type ON public.artifacts(project_id, type);
CREATE INDEX idx_artifacts_status ON public.artifacts(status) WHERE status != 'ARCHIVED';
CREATE INDEX idx_artifact_edges_from ON public.artifact_edges(from_artifact_id);
CREATE INDEX idx_artifact_edges_to ON public.artifact_edges(to_artifact_id);
CREATE INDEX idx_coverage_artifact ON public.coverage_snapshots(artifact_id, computed_at DESC);
CREATE INDEX idx_drift_project_status ON public.drift_findings(project_id, status);