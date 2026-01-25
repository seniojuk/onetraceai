import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  projectLinkId: string;
  workspaceId: string;
}

interface SyncResult {
  mappingId: string;
  artifactId: string;
  jiraIssueKey: string;
  success: boolean;
  hasConflict: boolean;
  error?: string;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const body: SyncRequest = await req.json();
    const { projectLinkId, workspaceId } = body;

    if (!projectLinkId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all mappings for this project link
    const { data: mappings, error: mappingsError } = await supabase
      .from("jira_issue_mappings")
      .select("id, artifact_id, jira_issue_key")
      .eq("project_link_id", projectLinkId)
      .eq("workspace_id", workspaceId);

    if (mappingsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch mappings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!mappings || mappings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          summary: { total: 0, succeeded: 0, failed: 0, conflicts: 0 },
          results: [],
          message: "No mappings to sync",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Limit to prevent timeouts
    const maxMappings = 25;
    const mappingsToSync = mappings.slice(0, maxMappings);

    const results: SyncResult[] = [];

    // Pull each mapping
    for (const mapping of mappingsToSync) {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/jira-pull-issue`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mappingId: mapping.id,
              workspaceId,
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          results.push({
            mappingId: mapping.id,
            artifactId: mapping.artifact_id,
            jiraIssueKey: mapping.jira_issue_key,
            success: true,
            hasConflict: data.hasConflict || false,
          });
        } else {
          results.push({
            mappingId: mapping.id,
            artifactId: mapping.artifact_id,
            jiraIssueKey: mapping.jira_issue_key,
            success: false,
            hasConflict: false,
            error: data.error || "Unknown error",
          });
        }
      } catch (error) {
        results.push({
          mappingId: mapping.id,
          artifactId: mapping.artifact_id,
          jiraIssueKey: mapping.jira_issue_key,
          success: false,
          hasConflict: false,
          error: error instanceof Error ? error.message : "Request failed",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const conflicts = results.filter((r) => r.hasConflict).length;

    // Update project link last_pull_at
    await supabase
      .from("jira_project_links")
      .update({
        last_pull_at: new Date().toISOString(),
        last_pull_status: failed === 0 ? "success" : "partial",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectLinkId);

    // Log bulk audit event
    try {
      await supabase.from("jira_audit_logs").insert({
        workspace_id: workspaceId,
        project_link_id: projectLinkId,
        actor_id: userId,
        action: "pull_sync",
        artifact_ids: results.map((r) => r.artifactId),
        jira_issue_keys: results.map((r) => r.jiraIssueKey),
        result: failed === 0 ? "success" : "partial",
        action_details: {
          total: mappingsToSync.length,
          succeeded,
          failed,
          conflicts,
          truncated: mappings.length > maxMappings,
        },
      });
    } catch (error) {
      console.error("Failed to log audit:", error);
    }

    return new Response(
      JSON.stringify({
        success: failed === 0,
        summary: {
          total: mappingsToSync.length,
          succeeded,
          failed,
          conflicts,
        },
        results,
        message:
          conflicts > 0
            ? `Synced ${succeeded} issues, ${conflicts} have conflicts requiring resolution`
            : `Successfully synced ${succeeded} of ${mappingsToSync.length} issues`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in jira-pull-sync:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
