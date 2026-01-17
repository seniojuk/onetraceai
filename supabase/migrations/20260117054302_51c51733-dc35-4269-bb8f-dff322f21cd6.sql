-- Drop the existing constraint and recreate it with FILE type added
ALTER TABLE public.artifacts DROP CONSTRAINT artifacts_type_check;

ALTER TABLE public.artifacts ADD CONSTRAINT artifacts_type_check 
CHECK (type = ANY (ARRAY['IDEA'::text, 'PRD'::text, 'EPIC'::text, 'STORY'::text, 'ACCEPTANCE_CRITERION'::text, 'TEST_CASE'::text, 'TEST_SUITE'::text, 'CODE_MODULE'::text, 'COMMIT'::text, 'PULL_REQUEST'::text, 'BUG'::text, 'DECISION'::text, 'RELEASE'::text, 'DEPLOYMENT'::text, 'FILE'::text]));