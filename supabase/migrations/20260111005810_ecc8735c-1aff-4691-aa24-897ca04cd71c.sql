-- Create agent_pipelines table for workflow definitions
CREATE TABLE public.agent_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_pipelines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view pipelines in their workspaces"
ON public.agent_pipelines
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create pipelines in their workspaces"
ON public.agent_pipelines
FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update pipelines in their workspaces"
ON public.agent_pipelines
FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete pipelines in their workspaces"
ON public.agent_pipelines
FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Create pipeline_runs table for execution history
CREATE TABLE public.pipeline_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  pipeline_id UUID NOT NULL REFERENCES public.agent_pipelines(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER NOT NULL DEFAULT 0,
  step_results JSONB NOT NULL DEFAULT '[]',
  input_content TEXT,
  final_output TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view pipeline runs in their workspaces"
ON public.pipeline_runs
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create pipeline runs in their workspaces"
ON public.pipeline_runs
FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update pipeline runs in their workspaces"
ON public.pipeline_runs
FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_agent_pipelines_workspace ON public.agent_pipelines(workspace_id);
CREATE INDEX idx_agent_pipelines_project ON public.agent_pipelines(project_id);
CREATE INDEX idx_pipeline_runs_pipeline ON public.pipeline_runs(pipeline_id);
CREATE INDEX idx_pipeline_runs_status ON public.pipeline_runs(status);

-- Add updated_at trigger for pipelines
CREATE TRIGGER update_agent_pipelines_updated_at
BEFORE UPDATE ON public.agent_pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();