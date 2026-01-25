import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkPushRequest {
  artifactIds: string[];
  projectLinkId: string;
  workspaceId: string;
}

interface PushResult {
  artifactId: string;
  success: boolean;
  jiraIssueKey?: string;
  jiraIssueUrl?: string;
  error?: string;
  action?: "created" | "updated";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const body: BulkPushRequest = await req.json();
    const { artifactIds, projectLinkId, workspaceId } = body;

    if (!artifactIds?.length || !projectLinkId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Limit bulk operations to prevent timeouts
    if (artifactIds.length > 50) {
      return new Response(
        JSON.stringify({ error: "Maximum 50 artifacts per bulk push" }),
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

    // Call the single push function for each artifact
    // This reuses the existing logic and keeps things DRY
    const results: PushResult[] = [];

    for (const artifactId of artifactIds) {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/jira-push-artifact`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              artifactId,
              projectLinkId,
              workspaceId,
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          results.push({
            artifactId,
            success: true,
            jiraIssueKey: data.jiraIssueKey,
            jiraIssueUrl: data.jiraIssueUrl,
            action: data.action === "push_create" ? "created" : "updated",
          });
        } else {
          results.push({
            artifactId,
            success: false,
            error: data.error || "Unknown error",
          });
        }
      } catch (error) {
        results.push({
          artifactId,
          success: false,
          error: error instanceof Error ? error.message : "Request failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Log bulk operation to audit
    try {
      await supabase.from("jira_audit_logs").insert({
        workspace_id: workspaceId,
        project_link_id: projectLinkId,
        actor_id: userId,
        action: "bulk_push",
        artifact_ids: artifactIds,
        jira_issue_keys: results
          .filter((r) => r.jiraIssueKey)
          .map((r) => r.jiraIssueKey!),
        result: failureCount === 0 ? "success" : "partial",
        action_details: {
          total: artifactIds.length,
          succeeded: successCount,
          failed: failureCount,
        },
      });
    } catch (error) {
      console.error("Failed to log bulk audit event:", error);
    }

    return new Response(
      JSON.stringify({
        success: failureCount === 0,
        summary: {
          total: artifactIds.length,
          succeeded: successCount,
          failed: failureCount,
        },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in jira-push-bulk:", error);
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
