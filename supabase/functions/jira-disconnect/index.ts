import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const { connectionId, workspaceId } = await req.json();

    if (!connectionId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing connectionId or workspaceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin/owner of workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Only workspace owners and admins can disconnect Jira" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connection details for audit log
    const { data: connection, error: connError } = await supabaseAdmin
      .from("jira_connections")
      .select("jira_site_name, jira_base_url")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the connection (cascades to project links)
    const { error: deleteError } = await supabaseAdmin
      .from("jira_connections")
      .delete()
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId);

    if (deleteError) {
      console.error("Failed to delete connection:", deleteError);
      throw deleteError;
    }

    // Log the disconnect event
    await supabaseAdmin.from("jira_audit_logs").insert({
      workspace_id: workspaceId,
      actor_id: userId,
      actor_type: "user",
      action: "DISCONNECT",
      action_details: {
        jira_site: connection.jira_site_name,
        jira_url: connection.jira_base_url,
      },
      result: "success",
    });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Jira disconnect error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
