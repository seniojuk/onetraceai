import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-onetrace-token",
};

// SHA-256 hash using the Web Crypto API available in Deno
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // ── Token extraction ────────────────────────────────────────────────────
    // Accept token from: header X-OneTrace-Token, or Bearer auth, or body
    let rawToken: string | null = null;

    const xToken = req.headers.get("x-onetrace-token");
    const authHeader = req.headers.get("authorization");

    if (xToken) {
      rawToken = xToken;
    } else if (authHeader?.startsWith("Bearer ")) {
      rawToken = authHeader.replace("Bearer ", "");
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // body may be empty for simple triggers
    }

    if (!rawToken && body.token) {
      rawToken = body.token as string;
    }

    if (!rawToken) {
      return new Response(
        JSON.stringify({ error: "Missing CI token. Pass via X-OneTrace-Token header or Bearer auth." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate token ──────────────────────────────────────────────────────
    const tokenHash = await sha256Hex(rawToken);

    const { data: tokenRow, error: tokenErr } = await supabase
      .from("ci_coverage_tokens")
      .select("id, workspace_id, project_id, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Invalid CI token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenRow.revoked_at) {
      return new Response(
        JSON.stringify({ error: "CI token has been revoked." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { workspace_id, project_id } = tokenRow;

    // Update last_used_at (fire-and-forget, don't block response)
    supabase
      .from("ci_coverage_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id)
      .then(() => {});

    // ── Optional body params ────────────────────────────────────────────────
    const coverage_threshold = typeof body.coverage_threshold === "number"
      ? body.coverage_threshold
      : 0.7;

    // ── Re-use compute-coverage logic inline ────────────────────────────────
    // 1. Fetch artifacts
    const { data: artifacts, error: artErr } = await supabase
      .from("artifacts")
      .select("id, type, status, title, short_id, parent_artifact_id")
      .eq("project_id", project_id)
      .neq("status", "ARCHIVED");

    if (artErr) throw artErr;

    // 2. Fetch edges
    const { data: edges, error: edgeErr } = await supabase
      .from("artifact_edges")
      .select("from_artifact_id, to_artifact_id, edge_type")
      .eq("project_id", project_id);

    if (edgeErr) throw edgeErr;

    const artifactMap = new Map(artifacts.map((a: any) => [a.id, a]));
    const stories = artifacts.filter((a: any) => a.type === "STORY");
    const acs = artifacts.filter((a: any) => a.type === "ACCEPTANCE_CRITERION");

    const containsEdges = edges.filter((e: any) => e.edge_type === "CONTAINS");
    const validatesEdges = edges.filter((e: any) => e.edge_type === "VALIDATES");

    // story_id -> ac_ids
    const storyToACs = new Map<string, string[]>();
    for (const edge of containsEdges) {
      const parent = artifactMap.get(edge.from_artifact_id);
      const child = artifactMap.get(edge.to_artifact_id);
      if (parent?.type === "STORY" && child?.type === "ACCEPTANCE_CRITERION") {
        const arr = storyToACs.get(edge.from_artifact_id) || [];
        arr.push(edge.to_artifact_id);
        storyToACs.set(edge.from_artifact_id, arr);
      }
    }
    // Fallback via parent_artifact_id
    for (const ac of acs) {
      if (ac.parent_artifact_id) {
        const parent = artifactMap.get(ac.parent_artifact_id);
        if (parent?.type === "STORY") {
          const arr = storyToACs.get(ac.parent_artifact_id) || [];
          if (!arr.includes(ac.id)) { arr.push(ac.id); storyToACs.set(ac.parent_artifact_id, arr); }
        }
      }
    }

    // ac_id -> test_ids
    const acToTests = new Map<string, string[]>();
    for (const edge of validatesEdges) {
      const from = artifactMap.get(edge.from_artifact_id);
      const to = artifactMap.get(edge.to_artifact_id);
      if (from?.type === "TEST_CASE" && to?.type === "ACCEPTANCE_CRITERION") {
        const arr = acToTests.get(edge.to_artifact_id) || [];
        arr.push(edge.from_artifact_id);
        acToTests.set(edge.to_artifact_id, arr);
      }
      if (from?.type === "ACCEPTANCE_CRITERION" && to?.type === "TEST_CASE") {
        const arr = acToTests.get(edge.from_artifact_id) || [];
        arr.push(edge.to_artifact_id);
        acToTests.set(edge.from_artifact_id, arr);
      }
    }

    // 3. Compute per-story coverage
    const coverageResults: any[] = [];
    let failingStories = 0;

    for (const story of stories) {
      const acIds = storyToACs.get(story.id) || [];
      const total = acIds.length;
      let satisfied = 0;
      let tested = 0;
      const untestedIds: string[] = [];
      const unsatisfiedIds: string[] = [];

      for (const acId of acIds) {
        const ac = artifactMap.get(acId);
        if (!ac) continue;
        if (ac.status === "DONE") { satisfied++; } else { unsatisfiedIds.push(acId); }
        if ((acToTests.get(acId) || []).length > 0) { tested++; } else { untestedIds.push(acId); }
      }

      const ratio = total > 0 ? satisfied / total : 0;
      if (ratio < coverage_threshold && total > 0) failingStories++;

      coverageResults.push({
        artifact_id: story.id,
        short_id: story.short_id,
        title: story.title,
        total_acs: total,
        satisfied_acs: satisfied,
        tested_acs: tested,
        coverage_ratio: Math.round(ratio * 10000) / 10000,
        passes_threshold: ratio >= coverage_threshold || total === 0,
        missing: { untested_ac_ids: untestedIds, unsatisfied_ac_ids: unsatisfiedIds },
      });
    }

    // 4. Project totals
    const projectTotal = acs.length;
    const projectSatisfied = acs.filter((a: any) => a.status === "DONE").length;
    let projectTested = 0;
    for (const ac of acs) {
      if ((acToTests.get(ac.id) || []).length > 0) projectTested++;
    }
    const projectRatio = projectTotal > 0 ? Math.round((projectSatisfied / projectTotal) * 10000) / 10000 : 0;
    const passes = projectRatio >= coverage_threshold;

    // 5. Persist snapshots
    const snapshotsToInsert = coverageResults.map((r) => ({
      workspace_id,
      project_id,
      artifact_id: r.artifact_id,
      total_acs: r.total_acs,
      satisfied_acs: r.satisfied_acs,
      tested_acs: r.tested_acs,
      coverage_ratio: r.coverage_ratio,
      missing: r.missing,
      metadata: { triggered_by: "ci", token_id: tokenRow.id },
    }));

    if (snapshotsToInsert.length > 0) {
      await supabase.from("coverage_snapshots").insert(snapshotsToInsert);
    }

    // 6. Create drift findings for stories below threshold
    const driftFindings = coverageResults
      .filter((r) => !r.passes_threshold)
      .map((r) => ({
        workspace_id,
        project_id,
        type: "COVERAGE_GAP",
        title: `CI: Low coverage on ${r.short_id}: ${Math.round(r.coverage_ratio * 100)}%`,
        description: `Story "${r.title}" has ${r.satisfied_acs}/${r.total_acs} ACs satisfied (${Math.round(r.coverage_ratio * 100)}%), below the ${Math.round(coverage_threshold * 100)}% threshold. Triggered by CI.`,
        severity: r.coverage_ratio < 0.3 ? 3 : r.coverage_ratio < 0.5 ? 2 : 1,
        primary_artifact_id: r.artifact_id,
        related_artifact_ids: [...r.missing.untested_ac_ids, ...r.missing.unsatisfied_ac_ids],
        evidence: { coverage_ratio: r.coverage_ratio, coverage_threshold, total_acs: r.total_acs, satisfied_acs: r.satisfied_acs, source: "ci" },
        status: "OPEN",
      }));

    if (driftFindings.length > 0) {
      await supabase.from("drift_findings").insert(driftFindings);
    }

    // 7. Build response (CI-friendly)
    const response = {
      ok: true,
      passes,
      project_id,
      computed_at: new Date().toISOString(),
      coverage_threshold,
      project_totals: {
        total_acs: projectTotal,
        satisfied_acs: projectSatisfied,
        tested_acs: projectTested,
        coverage_ratio: projectRatio,
        coverage_percent: Math.round(projectRatio * 100),
      },
      summary: {
        total_stories: stories.length,
        passing_stories: stories.length - failingStories,
        failing_stories: failingStories,
        snapshots_saved: snapshotsToInsert.length,
        drift_findings_created: driftFindings.length,
      },
      // Include failing stories detail so CI logs are informative
      failing: coverageResults
        .filter((r) => !r.passes_threshold)
        .map((r) => ({
          short_id: r.short_id,
          title: r.title,
          coverage_percent: Math.round(r.coverage_ratio * 100),
          satisfied_acs: r.satisfied_acs,
          total_acs: r.total_acs,
        })),
    };

    // CI systems can use exit code by checking `passes` field
    // Return 200 always; let CI scripts decide whether to fail based on `passes`
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ci-coverage error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
