
-- Add unique constraint for commit upsert (repo_link_id + commit_sha)
ALTER TABLE public.github_commits_shadow 
ADD CONSTRAINT github_commits_shadow_repo_link_commit_unique 
UNIQUE (repo_link_id, commit_sha);

-- Add unique constraint for PR upsert (repo_link_id + pr_number)
ALTER TABLE public.github_prs_shadow 
ADD CONSTRAINT github_prs_shadow_repo_link_pr_unique 
UNIQUE (repo_link_id, pr_number);
