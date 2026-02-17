import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Verify GitHub webhook signature (HMAC SHA-256)
async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hexDigest =
    "sha256=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return hexDigest === signature;
}

// Parse artifact refs (e.g. STORY-001, EPIC-12)
function parseArtifactRefs(text: string): string[] {
  if (!text) return [];
  const pattern = /\b([A-Z]+-\d+)\b/g;
  const matches = text.match(pattern);
  return matches ? [...new Set(matches)] : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.text();
    const eventType = req.headers.get("X-GitHub-Event") || "unknown";
    const deliveryId = req.headers.get("X-GitHub-Delivery") || "";
    const signature = req.headers.get("X-Hub-Signature-256");

    // Validate signature
    const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("GITHUB_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifySignature(body, signature, webhookSecret);
    if (!valid) {
      console.warn("Invalid webhook signature for delivery:", deliveryId);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);

    // Only process push and pull_request events
    if (!["push", "pull_request"].includes(eventType)) {
      return new Response(
        JSON.stringify({ message: `Ignored event: ${eventType}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine repo full name from payload
    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) {
      return new Response(
        JSON.stringify({ error: "No repository in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find all repo links for this repo
    const { data: repoLinks, error: rlError } = await adminClient
      .from("github_repo_links")
      .select("id, workspace_id, project_id, connection_id, default_branch")
      .eq("repo_full_name", repoFullName);

    if (rlError || !repoLinks || repoLinks.length === 0) {
      // Store the event anyway for debugging
      await adminClient.from("github_webhook_events").insert({
        event_type: eventType,
        action: payload.action || null,
        payload,
        workspace_id: null,
        connection_id: null,
      });
      return new Response(
        JSON.stringify({ message: "No linked repos found, event stored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalProcessed = 0;

    for (const repoLink of repoLinks) {
      // Store webhook event
      await adminClient.from("github_webhook_events").insert({
        event_type: eventType,
        action: payload.action || null,
        payload,
        workspace_id: repoLink.workspace_id,
        connection_id: repoLink.connection_id,
      });

      if (eventType === "push") {
        totalProcessed += await processPushEvent(
          adminClient,
          payload,
          repoLink
        );
      } else if (eventType === "pull_request") {
        totalProcessed += await processPREvent(
          adminClient,
          payload,
          repoLink
        );
      }

      // Update connection last sync
      await adminClient
        .from("github_connections")
        .update({ last_successful_sync: new Date().toISOString() })
        .eq("id", repoLink.connection_id);
    }

    return new Response(
      JSON.stringify({
        event: eventType,
        repo: repoFullName,
        repo_links_matched: repoLinks.length,
        records_processed: totalProcessed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("github-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Process a push event – extract commits and upsert into shadow table
async function processPushEvent(
  adminClient: any,
  payload: any,
  repoLink: { id: string; workspace_id: string; project_id: string }
): Promise<number> {
  const commits = payload.commits || [];
  let count = 0;

  for (const commit of commits) {
    const row = {
      repo_link_id: repoLink.id,
      workspace_id: repoLink.workspace_id,
      project_id: repoLink.project_id,
      commit_sha: commit.id,
      commit_message: commit.message || null,
      author_login: commit.author?.username || null,
      author_name: commit.author?.name || null,
      author_email: commit.author?.email || null,
      committed_at: commit.timestamp || null,
      commit_url: commit.url || null,
      files_changed: (commit.added?.length || 0) + (commit.removed?.length || 0) + (commit.modified?.length || 0),
      additions: 0, // not available in webhook push payload
      deletions: 0,
      parsed_artifact_refs: parseArtifactRefs(commit.message || ""),
      fetched_at: new Date().toISOString(),
    };

    const { error } = await adminClient
      .from("github_commits_shadow")
      .upsert(row, { onConflict: "repo_link_id,commit_sha" });

    if (!error) count++;
  }

  // Update last_commit_sha on repo link
  if (commits.length > 0) {
    const headSha = payload.head_commit?.id || commits[commits.length - 1].id;
    await adminClient
      .from("github_repo_links")
      .update({
        last_commit_sha: headSha,
        last_pull_at: new Date().toISOString(),
        last_pull_status: "success",
      })
      .eq("id", repoLink.id);
  }

  return count;
}

// Process a pull_request event – upsert PR into shadow table
async function processPREvent(
  adminClient: any,
  payload: any,
  repoLink: { id: string; workspace_id: string; project_id: string }
): Promise<number> {
  const pr = payload.pull_request;
  if (!pr) return 0;

  const refs = [
    ...parseArtifactRefs(pr.title || ""),
    ...parseArtifactRefs(pr.body || ""),
  ];

  const row = {
    repo_link_id: repoLink.id,
    workspace_id: repoLink.workspace_id,
    project_id: repoLink.project_id,
    pr_number: pr.number,
    pr_title: pr.title || null,
    pr_body: (pr.body || "").substring(0, 10000),
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

  const { error } = await adminClient
    .from("github_prs_shadow")
    .upsert(row, { onConflict: "repo_link_id,pr_number" });

  return error ? 0 : 1;
}
