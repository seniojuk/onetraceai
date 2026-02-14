import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the project to find workspace_id
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, workspace_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is OWNER or ADMIN of the workspace
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Only workspace owners and admins can delete projects" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cascading delete in correct order
    // 1. Pipeline runs (via project_id)
    await supabaseAdmin.from("pipeline_runs").delete().eq("project_id", projectId);

    // 2. Agent pipelines
    await supabaseAdmin.from("agent_pipelines").delete().eq("project_id", projectId);

    // 3. AI runs
    await supabaseAdmin.from("ai_runs").delete().eq("project_id", projectId);

    // 4. Agent configs
    await supabaseAdmin.from("agent_configs").delete().eq("project_id", projectId);

    // 5. Coverage snapshots
    await supabaseAdmin.from("coverage_snapshots").delete().eq("project_id", projectId);

    // 6. Drift findings
    await supabaseAdmin.from("drift_findings").delete().eq("project_id", projectId);

    // 7. Jira issue mappings
    await supabaseAdmin.from("jira_issue_mappings").delete().eq("project_id", projectId);

    // 8. Jira audit logs
    await supabaseAdmin.from("jira_audit_logs").delete().eq("project_id", projectId);

    // 9. Jira project links
    await supabaseAdmin.from("jira_project_links").delete().eq("project_id", projectId);

    // 10. Artifact edges
    await supabaseAdmin.from("artifact_edges").delete().eq("project_id", projectId);

    // 11. Artifact versions
    await supabaseAdmin.from("artifact_versions").delete().eq("project_id", projectId);

    // 12. Artifact file associations
    await supabaseAdmin.from("artifact_file_associations").delete().eq("project_id", projectId);

    // 13. Artifacts
    await supabaseAdmin.from("artifacts").delete().eq("project_id", projectId);

    // 14. Onboarding progress
    await supabaseAdmin.from("onboarding_progress").delete().eq("project_id", projectId);

    // 15. Finally delete the project
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
