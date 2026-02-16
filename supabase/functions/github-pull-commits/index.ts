import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { repoLinkId, workspaceId, projectId } = await req.json();
    if (!repoLinkId || !workspaceId || !projectId) {
      return new Response(
        JSON.stringify({ error: "repoLinkId, workspaceId, and projectId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get repo link with connection
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: repoLink, error: rlError } = await adminClient
      .from("github_repo_links")
      .select("*, github_connections!inner(access_token, status)")
      .eq("id", repoLinkId)
      .eq("workspace_id", workspaceId)
      .single();

    if (rlError || !repoLink) {
      return new Response(
        JSON.stringify({ error: "Repo link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = (repoLink as any).github_connections.access_token;
    const repoFullName = repoLink.repo_full_name;
    const since = repoLink.last_commit_sha ? undefined : undefined; // fetch all initially

    // Fetch commits from GitHub (up to 100 per page)
    const params = new URLSearchParams({ per_page: "100" });
    if (repoLink.default_branch) params.set("sha", repoLink.default_branch);

    const ghRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?${params}`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!ghRes.ok) {
      const errBody = await ghRes.text();
      if (ghRes.status === 401 || ghRes.status === 403) {
        await adminClient
          .from("github_connections")
          .update({ status: "degraded", last_error_message: "Token expired or revoked", last_error_at: new Date().toISOString() })
          .eq("id", repoLink.connection_id);
      }
      return new Response(
        JSON.stringify({ error: "Failed to fetch commits from GitHub", details: errBody }),
        { status: ghRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const commits = await ghRes.json();

    // Parse artifact refs from commit messages (looks for short IDs like STORY-001)
    function parseArtifactRefs(message: string): string[] {
      if (!message) return [];
      const pattern = /\b([A-Z]+-\d+)\b/g;
      const matches = message.match(pattern);
      return matches ? [...new Set(matches)] : [];
    }

    // Upsert commits into shadow table
    let insertedCount = 0;
    let skippedCount = 0;

    for (const commit of commits) {
      // Stop if we've already seen this commit
      if (repoLink.last_commit_sha && commit.sha === repoLink.last_commit_sha) {
        skippedCount = commits.length - insertedCount;
        break;
      }

      const row = {
        repo_link_id: repoLinkId,
        workspace_id: workspaceId,
        project_id: projectId,
        commit_sha: commit.sha,
        commit_message: commit.commit?.message || null,
        author_login: commit.author?.login || null,
        author_name: commit.commit?.author?.name || null,
        author_email: commit.commit?.author?.email || null,
        committed_at: commit.commit?.author?.date || null,
        commit_url: commit.html_url || null,
        files_changed: commit.stats?.total || 0,
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        parsed_artifact_refs: parseArtifactRefs(commit.commit?.message || ""),
        fetched_at: new Date().toISOString(),
      };

      const { error: insertError } = await adminClient
        .from("github_commits_shadow")
        .upsert(row, { onConflict: "repo_link_id,commit_sha" });

      if (!insertError) insertedCount++;
    }

    // Update last_commit_sha on the repo link
    if (commits.length > 0) {
      await adminClient
        .from("github_repo_links")
        .update({
          last_commit_sha: commits[0].sha,
          last_pull_at: new Date().toISOString(),
          last_pull_status: "success",
        })
        .eq("id", repoLinkId);

      // Update connection last sync
      await adminClient
        .from("github_connections")
        .update({ last_successful_sync: new Date().toISOString() })
        .eq("id", repoLink.connection_id);
    }

    return new Response(
      JSON.stringify({
        inserted: insertedCount,
        skipped: skippedCount,
        total_fetched: commits.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("github-pull-commits error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
