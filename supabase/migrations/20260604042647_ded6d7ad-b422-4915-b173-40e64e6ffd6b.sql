-- Enable trigram search for fast fuzzy artifact lookup
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes on the columns we search against
CREATE INDEX IF NOT EXISTS artifacts_title_trgm_idx
  ON public.artifacts USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS artifacts_short_id_trgm_idx
  ON public.artifacts USING gin (short_id gin_trgm_ops);

-- Search RPC: ranked, scoped to a project, respects existing RLS via SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.search_artifacts(
  p_project_id uuid,
  p_query text,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  title text,
  short_id text,
  type text,
  status text,
  score real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.title,
    a.short_id,
    a.type::text,
    a.status::text,
    GREATEST(
      similarity(a.title, p_query),
      similarity(a.short_id, p_query)
    ) AS score
  FROM public.artifacts a
  WHERE a.project_id = p_project_id
    AND (
      a.title ILIKE '%' || p_query || '%'
      OR a.short_id ILIKE '%' || p_query || '%'
      OR a.title % p_query
      OR a.short_id % p_query
    )
  ORDER BY score DESC, a.updated_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_artifacts(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_artifacts(uuid, text, int) TO service_role;