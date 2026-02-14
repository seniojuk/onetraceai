import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CoverageResult {
  artifact_id: string;
  total_acs: number;
  satisfied_acs: number;
  tested_acs: number;
  coverage_ratio: number;
  missing: {
    untested_ac_ids: string[];
    unsatisfied_ac_ids: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id, workspace_id, coverage_threshold } = await req.json();

    if (!project_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "project_id and workspace_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch all artifacts for the project
    const { data: artifacts, error: artError } = await supabase
      .from("artifacts")
      .select("id, type, status, title, short_id, parent_artifact_id")
      .eq("project_id", project_id)
      .neq("status", "ARCHIVED");

    if (artError) throw artError;

    // 2. Fetch all edges for the project
    const { data: edges, error: edgeError } = await supabase
      .from("artifact_edges")
      .select("from_artifact_id, to_artifact_id, edge_type")
      .eq("project_id", project_id);

    if (edgeError) throw edgeError;

    const artifactMap = new Map(artifacts.map((a: any) => [a.id, a]));
    const stories = artifacts.filter((a: any) => a.type === "STORY");
    const epics = artifacts.filter((a: any) => a.type === "EPIC");
    const acs = artifacts.filter((a: any) => a.type === "ACCEPTANCE_CRITERION");
    const testCases = artifacts.filter((a: any) => a.type === "TEST_CASE");

    // Build edge indices
    // CONTAINS: Story -> AC (from_artifact_id = story, to_artifact_id = AC)
    // VALIDATES: TestCase -> AC (from_artifact_id = test, to_artifact_id = AC)
    // Also check parent_artifact_id as fallback
    const containsEdges = edges.filter((e: any) => e.edge_type === "CONTAINS");
    const validatesEdges = edges.filter((e: any) => e.edge_type === "VALIDATES");

    // Map: story_id -> [ac_ids]
    const storyToACs = new Map<string, string[]>();
    for (const edge of containsEdges) {
      const parent = artifactMap.get(edge.from_artifact_id);
      const child = artifactMap.get(edge.to_artifact_id);
      if (parent?.type === "STORY" && child?.type === "ACCEPTANCE_CRITERION") {
        const existing = storyToACs.get(edge.from_artifact_id) || [];
        existing.push(edge.to_artifact_id);
        storyToACs.set(edge.from_artifact_id, existing);
      }
    }

    // Fallback: use parent_artifact_id for ACs not linked via edges
    for (const ac of acs) {
      if (ac.parent_artifact_id) {
        const parent = artifactMap.get(ac.parent_artifact_id);
        if (parent?.type === "STORY") {
          const existing = storyToACs.get(ac.parent_artifact_id) || [];
          if (!existing.includes(ac.id)) {
            existing.push(ac.id);
            storyToACs.set(ac.parent_artifact_id, existing);
          }
        }
      }
    }

    // Map: ac_id -> [test_case_ids] (which test cases validate this AC)
    const acToTests = new Map<string, string[]>();
    for (const edge of validatesEdges) {
      const from = artifactMap.get(edge.from_artifact_id);
      const to = artifactMap.get(edge.to_artifact_id);
      if (from?.type === "TEST_CASE" && to?.type === "ACCEPTANCE_CRITERION") {
        const existing = acToTests.get(edge.to_artifact_id) || [];
        existing.push(edge.from_artifact_id);
        acToTests.set(edge.to_artifact_id, existing);
      }
    }

    // Also check reverse direction (AC -> TEST_CASE via VALIDATES)
    for (const edge of validatesEdges) {
      const from = artifactMap.get(edge.from_artifact_id);
      const to = artifactMap.get(edge.to_artifact_id);
      if (from?.type === "ACCEPTANCE_CRITERION" && to?.type === "TEST_CASE") {
        const existing = acToTests.get(edge.from_artifact_id) || [];
        existing.push(edge.to_artifact_id);
        acToTests.set(edge.from_artifact_id, existing);
      }
    }

    // 3. Compute coverage per story
    const coverageResults: CoverageResult[] = [];
    const allUntestedAcIds: string[] = [];
    const allUnsatisfiedAcIds: string[] = [];

    for (const story of stories) {
      const acIds = storyToACs.get(story.id) || [];
      const totalACs = acIds.length;
      let satisfiedACs = 0;
      let testedACs = 0;
      const untestedAcIds: string[] = [];
      const unsatisfiedAcIds: string[] = [];

      for (const acId of acIds) {
        const ac = artifactMap.get(acId);
        if (!ac) continue;

        // Satisfied = AC status is DONE
        if (ac.status === "DONE") {
          satisfiedACs++;
        } else {
          unsatisfiedAcIds.push(acId);
          allUnsatisfiedAcIds.push(acId);
        }

        // Tested = has at least one VALIDATES edge to a test case
        const tests = acToTests.get(acId) || [];
        if (tests.length > 0) {
          testedACs++;
        } else {
          untestedAcIds.push(acId);
          allUntestedAcIds.push(acId);
        }
      }

      const coverageRatio = totalACs > 0 ? satisfiedACs / totalACs : 0;

      coverageResults.push({
        artifact_id: story.id,
        total_acs: totalACs,
        satisfied_acs: satisfiedACs,
        tested_acs: testedACs,
        coverage_ratio: Math.round(coverageRatio * 10000) / 10000,
        missing: {
          untested_ac_ids: untestedAcIds,
          unsatisfied_ac_ids: unsatisfiedAcIds,
        },
      });
    }

    // 4. Compute project-level totals
    const projectTotalACs = acs.length;
    const projectSatisfiedACs = acs.filter((a: any) => a.status === "DONE").length;
    // Count ACs that have at least one test
    let projectTestedACs = 0;
    for (const ac of acs) {
      const tests = acToTests.get(ac.id) || [];
      if (tests.length > 0) projectTestedACs++;
    }

    const projectCoverageRatio = projectTotalACs > 0
      ? Math.round((projectSatisfiedACs / projectTotalACs) * 10000) / 10000
      : 0;

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
      metadata: { computed_by: user.id },
    }));

    if (snapshotsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("coverage_snapshots")
        .insert(snapshotsToInsert);

      if (insertError) {
        console.error("Error inserting snapshots:", insertError);
      }
    }

    // 6. Check coverage threshold and create drift findings if needed
    const threshold = coverage_threshold ?? 0.7;
    const driftFindings: any[] = [];

    for (const result of coverageResults) {
      if (result.total_acs > 0 && result.coverage_ratio < threshold) {
        const story = artifactMap.get(result.artifact_id);
        driftFindings.push({
          workspace_id,
          project_id,
          type: "COVERAGE_GAP",
          title: `Low coverage on ${story?.short_id || "story"}: ${Math.round(result.coverage_ratio * 100)}%`,
          description: `Story "${story?.title}" has ${result.satisfied_acs}/${result.total_acs} ACs satisfied (${Math.round(result.coverage_ratio * 100)}%), below the ${Math.round(threshold * 100)}% threshold. ${result.missing.untested_ac_ids.length} ACs lack test cases.`,
          severity: result.coverage_ratio < 0.3 ? 3 : result.coverage_ratio < 0.5 ? 2 : 1,
          primary_artifact_id: result.artifact_id,
          related_artifact_ids: [...result.missing.untested_ac_ids, ...result.missing.unsatisfied_ac_ids],
          evidence: {
            coverage_ratio: result.coverage_ratio,
            threshold,
            total_acs: result.total_acs,
            satisfied_acs: result.satisfied_acs,
            tested_acs: result.tested_acs,
          },
          status: "OPEN",
          created_by: user.id,
        });
      }
    }

    if (driftFindings.length > 0) {
      const { error: driftError } = await supabase
        .from("drift_findings")
        .insert(driftFindings);

      if (driftError) {
        console.error("Error inserting drift findings:", driftError);
      }
    }

    const response = {
      project_id,
      computed_at: new Date().toISOString(),
      project_totals: {
        total_acs: projectTotalACs,
        satisfied_acs: projectSatisfiedACs,
        tested_acs: projectTestedACs,
        untested_acs: projectTotalACs - projectTestedACs,
        coverage_ratio: projectCoverageRatio,
        test_coverage_ratio: projectTotalACs > 0
          ? Math.round((projectTestedACs / projectTotalACs) * 10000) / 10000
          : 0,
      },
      stories: coverageResults,
      drift_findings_created: driftFindings.length,
      snapshots_created: snapshotsToInsert.length,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error computing coverage:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
