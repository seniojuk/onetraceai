import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Jira OAuth 2.0 (3LO) authorization endpoint
const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";

// Base scopes required for Jira integration
const BASE_SCOPES = [
  "read:jira-work",
  "read:jira-user", 
  "write:jira-work",
  "offline_access", // For refresh tokens
];

// Optional scope for project management (create projects)
const PROJECT_MANAGEMENT_SCOPE = "manage:jira-configuration";

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
    const { workspaceId, redirectUri, includeProjectManagement } = await req.json();

    if (!workspaceId || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing workspaceId or redirectUri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build scopes based on user preference
    const scopes = [...BASE_SCOPES];
    if (includeProjectManagement) {
      scopes.push(PROJECT_MANAGEMENT_SCOPE);
    }
    const scopeString = scopes.join(" ");

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
        JSON.stringify({ error: "Only workspace owners and admins can connect Jira" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Jira OAuth credentials
    const clientId = Deno.env.get("JIRA_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Jira OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate state parameter (includes workspace ID and permissions for callback)
    const state = btoa(JSON.stringify({
      workspaceId,
      userId,
      includeProjectManagement: !!includeProjectManagement,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    }));

    // Build authorization URL
    const authUrl = new URL(JIRA_AUTH_URL);
    authUrl.searchParams.set("audience", "api.atlassian.com");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", scopeString);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("prompt", "consent");

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Jira OAuth init error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
