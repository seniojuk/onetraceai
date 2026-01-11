-- Fix RLS policy for llm_models - the ALL policy doesn't work well, need specific policies
DROP POLICY IF EXISTS "Members can manage models" ON public.llm_models;

CREATE POLICY "Members can insert models" ON public.llm_models
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.llm_providers p 
      WHERE p.id = provider_id 
      AND is_workspace_member(p.workspace_id)
      AND p.is_global = false
    )
  );

CREATE POLICY "Members can update models" ON public.llm_models
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.llm_providers p 
      WHERE p.id = provider_id 
      AND is_workspace_member(p.workspace_id)
      AND p.is_global = false
    )
  );

CREATE POLICY "Members can delete models" ON public.llm_models
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.llm_providers p 
      WHERE p.id = provider_id 
      AND is_workspace_member(p.workspace_id)
      AND p.is_global = false
    )
  );