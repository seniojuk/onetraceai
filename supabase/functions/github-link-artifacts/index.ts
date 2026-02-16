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
    const userId = claimsData.claims.sub;

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

    // 1. Get all artifacts in the project, indexed by short_id
    const { data: artifacts, error: artError } = await adminClient
      .from("artifacts")
      .select("id, short_id, title, type")
      .eq("project_id", projectId)
      .eq("workspace_id", workspaceId);

    if (artError) throw artError;
    if (!artifacts || artifacts.length === 0) {
      return new Response(
        JSON.stringify({ edges_created: 0, mappings_created: 0, message: "No artifacts in project" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const artifactByShortId = new Map<string, { id: string; title: string; type: string }>();
    for (const a of artifacts) {
      artifactByShortId.set(a.short_id.toUpperCase(), { id: a.id, title: a.title, type: a.type });
    }

    // 2. Get existing mappings to avoid duplicates
    const { data: existingMappings } = await adminClient
      .from("github_issue_mappings")
      .select("source_type, source_id, artifact_id")
      .eq("repo_link_id", repoLinkId);

    const mappingSet = new Set(
      (existingMappings || []).map((m) => `${m.source_type}:${m.source_id}:${m.artifact_id}`)
    );

    let edgesCreated = 0;
    let mappingsCreated = 0;

    // 3. Process commits
    const { data: commits } = await adminClient
      .from("github_commits_shadow")
      .select("id, commit_sha, parsed_artifact_refs, commit_message")
      .eq("repo_link_id", repoLinkId)
      .not("parsed_artifact_refs", "eq", "{}");

    for (const commit of commits || []) {
      const refs: string[] = commit.parsed_artifact_refs || [];
      for (const ref of refs) {
        const artifact = artifactByShortId.get(ref.toUpperCase());
        if (!artifact) continue;

        const key = `commit:${commit.commit_sha}:${artifact.id}`;
        if (mappingSet.has(key)) continue;

        // Create artifact edge
        const { data: edge, error: edgeError } = await adminClient
          .from("artifact_edges")
          .insert({
            workspace_id: workspaceId,
            project_id: projectId,
            from_artifact_id: artifact.id,
            to_artifact_id: artifact.id, // self-reference for commit link
            edge_type: "commit_reference",
            source: "COMMIT_TRAILER",
            source_ref: commit.commit_sha,
            confidence: 1.0,
            created_by: userId,
            metadata: {
              commit_sha: commit.commit_sha,
              commit_message: (commit.commit_message || "").substring(0, 200),
            },
          })
          .select("id")
          .single();

        if (!edgeError && edge) {
          edgesCreated++;

          // Create mapping record
          const { error: mapError } = await adminClient
            .from("github_issue_mappings")
            .insert({
              workspace_id: workspaceId,
              project_id: projectId,
              repo_link_id: repoLinkId,
              artifact_id: artifact.id,
              edge_id: edge.id,
              source_type: "commit",
              source_id: commit.commit_sha,
              source_ref: ref,
              created_by: userId,
            });

          if (!mapError) {
            mappingsCreated++;
            mappingSet.add(key);
          }
        }
      }
    }

    // 4. Process PRs
    const { data: prs } = await adminClient
      .from("github_prs_shadow")
      .select("id, pr_number, parsed_artifact_refs, pr_title, pr_url")
      .eq("repo_link_id", repoLinkId)
      .not("parsed_artifact_refs", "eq", "{}");

    for (const pr of prs || []) {
      const refs: string[] = pr.parsed_artifact_refs || [];
      for (const ref of refs) {
        const artifact = artifactByShortId.get(ref.toUpperCase());
        if (!artifact) continue;

        const sourceId = `pr-${pr.pr_number}`;
        const key = `pr:${sourceId}:${artifact.id}`;
        if (mappingSet.has(key)) continue;

        const { data: edge, error: edgeError } = await adminClient
          .from("artifact_edges")
          .insert({
            workspace_id: workspaceId,
            project_id: projectId,
            from_artifact_id: artifact.id,
            to_artifact_id: artifact.id,
            edge_type: "pr_reference",
            source: "PR_BODY",
            source_ref: `#${pr.pr_number}`,
            confidence: 1.0,
            created_by: userId,
            metadata: {
              pr_number: pr.pr_number,
              pr_title: pr.pr_title,
              pr_url: pr.pr_url,
            },
          })
          .select("id")
          .single();

        if (!edgeError && edge) {
          edgesCreated++;

          const { error: mapError } = await adminClient
            .from("github_issue_mappings")
            .insert({
              workspace_id: workspaceId,
              project_id: projectId,
              repo_link_id: repoLinkId,
              artifact_id: artifact.id,
              edge_id: edge.id,
              source_type: "pr",
              source_id: sourceId,
              source_ref: ref,
              created_by: userId,
            });

          if (!mapError) {
            mappingsCreated++;
            mappingSet.add(key);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ edges_created: edgesCreated, mappings_created: mappingsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("github-link-artifacts error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
