-- LLM Providers table
CREATE TABLE public.llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_base_url TEXT,
  enabled BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider_name)
);

-- LLM Models table
CREATE TABLE public.llm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.llm_providers(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  capabilities JSONB DEFAULT '{}',
  cost_per_1k_input_tokens DECIMAL(10,6),
  cost_per_1k_output_tokens DECIMAL(10,6),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, model_name)
);

-- Agent Configurations table
CREATE TABLE public.agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'PRODUCT_AGENT', 'STORY_AGENT', 'ARCHITECTURE_AGENT',
    'UX_AGENT', 'DEV_AGENT', 'QA_AGENT', 'DRIFT_AGENT', 'RELEASE_AGENT',
    'SECURITY_AGENT', 'DOCS_AGENT', 'INTEGRATION_AGENT', 'CUSTOM_AGENT'
  )),
  persona TEXT,
  system_prompt TEXT,
  guardrails JSONB DEFAULT '{}',
  routing_mode TEXT DEFAULT 'AUTO_ROUTE' CHECK (routing_mode IN (
    'AUTO_ROUTE', 'LOCKED', 'MANUAL_PER_RUN'
  )),
  default_model_id UUID REFERENCES public.llm_models(id) ON DELETE SET NULL,
  fallback_model_ids UUID[] DEFAULT '{}',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER,
  autonomous_enabled BOOLEAN DEFAULT false,
  invocation_triggers JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id, project_id, agent_type)
);

-- AI Runs table
CREATE TABLE public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  agent_config_id UUID REFERENCES public.agent_configs(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.llm_models(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('AUTONOMOUS', 'INVOKED', 'SCHEDULED')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  input_context JSONB DEFAULT '{}',
  output_artifacts JSONB DEFAULT '[]',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for llm_providers
CREATE POLICY "Users can view global providers" ON public.llm_providers
  FOR SELECT USING (is_global = true);

CREATE POLICY "Users can view workspace providers" ON public.llm_providers
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create workspace providers" ON public.llm_providers
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update workspace providers" ON public.llm_providers
  FOR UPDATE USING (is_workspace_member(workspace_id) AND is_global = false);

CREATE POLICY "Members can delete workspace providers" ON public.llm_providers
  FOR DELETE USING (is_workspace_member(workspace_id) AND is_global = false);

-- RLS Policies for llm_models
CREATE POLICY "Users can view models of accessible providers" ON public.llm_models
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.llm_providers p 
      WHERE p.id = provider_id 
      AND (p.is_global = true OR is_workspace_member(p.workspace_id))
    )
  );

CREATE POLICY "Members can manage models" ON public.llm_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.llm_providers p 
      WHERE p.id = provider_id 
      AND is_workspace_member(p.workspace_id)
      AND p.is_global = false
    )
  );

-- RLS Policies for agent_configs
CREATE POLICY "Users can view agent configs in their workspaces" ON public.agent_configs
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create agent configs" ON public.agent_configs
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update agent configs" ON public.agent_configs
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete agent configs" ON public.agent_configs
  FOR DELETE USING (is_workspace_member(workspace_id));

-- RLS Policies for ai_runs
CREATE POLICY "Users can view runs in their workspaces" ON public.ai_runs
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create runs" ON public.ai_runs
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update runs" ON public.ai_runs
  FOR UPDATE USING (is_workspace_member(workspace_id));

-- Triggers for updated_at
CREATE TRIGGER update_llm_providers_updated_at
  BEFORE UPDATE ON public.llm_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at
  BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert global Lovable AI provider and models
INSERT INTO public.llm_providers (id, workspace_id, provider_name, display_name, api_base_url, is_global, enabled)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  'lovable_ai',
  'Lovable AI',
  'https://ai.gateway.lovable.dev/v1',
  true,
  true
);

INSERT INTO public.llm_models (provider_id, model_name, display_name, capabilities, enabled) VALUES
('a0000000-0000-0000-0000-000000000001', 'google/gemini-3-flash-preview', 'Gemini 3 Flash Preview', '{"context_length": 1000000, "tool_calling": true, "json_mode": true, "streaming": true}', true),
('a0000000-0000-0000-0000-000000000001', 'google/gemini-3-pro-preview', 'Gemini 3 Pro Preview', '{"context_length": 1000000, "tool_calling": true, "json_mode": true, "streaming": true, "advanced_reasoning": true}', true),
('a0000000-0000-0000-0000-000000000001', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro', '{"context_length": 1000000, "tool_calling": true, "json_mode": true, "streaming": true, "multimodal": true, "advanced_reasoning": true}', true),
('a0000000-0000-0000-0000-000000000001', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash', '{"context_length": 1000000, "tool_calling": true, "json_mode": true, "streaming": true, "multimodal": true}', true),
('a0000000-0000-0000-0000-000000000001', 'google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', '{"context_length": 1000000, "tool_calling": true, "json_mode": true, "streaming": true}', true),
('a0000000-0000-0000-0000-000000000001', 'openai/gpt-5', 'GPT-5', '{"context_length": 128000, "tool_calling": true, "json_mode": true, "streaming": true, "multimodal": true, "advanced_reasoning": true}', true),
('a0000000-0000-0000-0000-000000000001', 'openai/gpt-5-mini', 'GPT-5 Mini', '{"context_length": 128000, "tool_calling": true, "json_mode": true, "streaming": true, "multimodal": true}', true),
('a0000000-0000-0000-0000-000000000001', 'openai/gpt-5-nano', 'GPT-5 Nano', '{"context_length": 128000, "tool_calling": true, "json_mode": true, "streaming": true}', true),
('a0000000-0000-0000-0000-000000000001', 'openai/gpt-5.2', 'GPT-5.2', '{"context_length": 128000, "tool_calling": true, "json_mode": true, "streaming": true, "multimodal": true, "advanced_reasoning": true}', true);