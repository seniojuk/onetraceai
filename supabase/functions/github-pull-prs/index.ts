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

    // Fetch PRs from GitHub – all states, sorted by updated
    const params = new URLSearchParams({
      state: "all",
      sort: "updated",
      direction: "desc",
      per_page: "100",
    });

    const ghRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?${params}`,
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
          .update({
            status: "degraded",
            last_error_message: "Token expired or revoked",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", repoLink.connection_id);
      }
      return new Response(
        JSON.stringify({ error: "Failed to fetch PRs from GitHub", details: errBody }),
        { status: ghRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prs = await ghRes.json();

    // Parse artifact refs from PR title + body
    function parseArtifactRefs(text: string): string[] {
      if (!text) return [];
      const pattern = /\b([A-Z]+-\d+)\b/g;
      const matches = text.match(pattern);
      return matches ? [...new Set(matches)] : [];
    }

    let upsertedCount = 0;

    for (const pr of prs) {
      const refs = [
        ...parseArtifactRefs(pr.title || ""),
        ...parseArtifactRefs(pr.body || ""),
      ];

      const row = {
        repo_link_id: repoLinkId,
        workspace_id: workspaceId,
        project_id: projectId,
        pr_number: pr.number,
        pr_title: pr.title || null,
        pr_body: pr.body || null,
        pr_state: pr.state || null,
        pr_url: pr.html_url || null,
        author_login: pr.user?.login || null,
        head_branch: pr.head?.ref || null,
        base_branch: pr.base?.ref || null,
        merged_at: pr.merged_at || null,
        closed_at: pr.closed_at || null,
        pr_created_at: pr.created_at || null,
        pr_updated_at: pr.updated_at || null,
        labels: (pr.labels || []).map((l: any) => ({ name: l.name, color: l.color })),
        parsed_artifact_refs: [...new Set(refs)],
        fetched_at: new Date().toISOString(),
      };

      const { error: upsertError } = await adminClient
        .from("github_prs_shadow")
        .upsert(row, { onConflict: "repo_link_id,pr_number" });

      if (!upsertError) upsertedCount++;
    }

    // Update connection sync timestamp
    await adminClient
      .from("github_connections")
      .update({ last_successful_sync: new Date().toISOString() })
      .eq("id", repoLink.connection_id);

    return new Response(
      JSON.stringify({
        upserted: upsertedCount,
        total_fetched: prs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("github-pull-prs error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
