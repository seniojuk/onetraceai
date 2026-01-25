import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls: Record<string, string>;
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

    // Parse request
    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connectionId");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!connectionId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing connectionId or workspaceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connection with tokens
    const { data: connection, error: connError } = await supabaseAdmin
      .from("jira_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (new Date(connection.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token expired", code: "TOKEN_EXPIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch projects from Jira
    const jiraUrl = `https://api.atlassian.com/ex/jira/${connection.jira_cloud_id}/rest/api/3/project/search`;
    
    const projectsResponse = await fetch(jiraUrl, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        Accept: "application/json",
      },
    });

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();
      console.error("Failed to fetch Jira projects:", errorText);
      
      if (projectsResponse.status === 401) {
        // Update connection status
        await supabaseAdmin
          .from("jira_connections")
          .update({ status: "degraded", last_error_message: "Authentication failed" })
          .eq("id", connectionId);
          
        return new Response(
          JSON.stringify({ error: "Jira authentication failed", code: "AUTH_FAILED" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to fetch Jira projects" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectsData = await projectsResponse.json();
    const projects: JiraProject[] = projectsData.values || [];

    return new Response(
      JSON.stringify({
        projects: projects.map((p) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          type: p.projectTypeKey,
          avatar: p.avatarUrls?.["48x48"] || p.avatarUrls?.["24x24"],
        })),
        total: projectsData.total || projects.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Jira get projects error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
