import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Jira token endpoint
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";

interface JiraTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface JiraResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
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

    // Use service role for inserting connection
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
    const { code, state, redirectUri } = await req.json();

    if (!code || !state || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing code, state, or redirectUri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode and validate state
    let stateData: { workspaceId: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify state matches current user
    if (stateData.userId !== userId) {
      return new Response(
        JSON.stringify({ error: "State mismatch - security violation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check state is not expired (15 min max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: "OAuth state expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Jira OAuth credentials
    const clientId = Deno.env.get("JIRA_CLIENT_ID");
    const clientSecret = Deno.env.get("JIRA_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Jira OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens: JiraTokenResponse = await tokenResponse.json();

    // Get accessible Jira sites
    const resourcesResponse = await fetch(JIRA_RESOURCES_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });

    if (!resourcesResponse.ok) {
      console.error("Failed to get accessible resources");
      return new Response(
        JSON.stringify({ error: "Failed to get Jira sites" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resources: JiraResource[] = await resourcesResponse.json();

    if (resources.length === 0) {
      return new Response(
        JSON.stringify({ error: "No accessible Jira sites found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Check if connection already exists for this workspace
    const { data: existingConnection } = await supabaseAdmin
      .from("jira_connections")
      .select("id")
      .eq("workspace_id", stateData.workspaceId)
      .maybeSingle();

    let connectionId: string;

    if (existingConnection) {
      // Update existing connection
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("jira_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokenExpiresAt,
          jira_cloud_id: resources[0].id,
          jira_base_url: resources[0].url,
          jira_site_name: resources[0].name,
          status: "connected",
          last_error_message: null,
          last_error_at: null,
          failure_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Failed to update connection:", updateError);
        throw updateError;
      }
      connectionId = updated.id;
    } else {
      // Create new connection
      const { data: created, error: createError } = await supabaseAdmin
        .from("jira_connections")
        .insert({
          workspace_id: stateData.workspaceId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokenExpiresAt,
          jira_cloud_id: resources[0].id,
          jira_base_url: resources[0].url,
          jira_site_name: resources[0].name,
          status: "connected",
          permissions: resources[0].scopes.includes("write:jira-work") ? "read_write" : "read_only",
          connected_by: userId,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Failed to create connection:", createError);
        throw createError;
      }
      connectionId = created.id;
    }

    // Log the connection event
    await supabaseAdmin.from("jira_audit_logs").insert({
      workspace_id: stateData.workspaceId,
      connection_id: connectionId,
      actor_id: userId,
      actor_type: "user",
      action: "CONNECT",
      action_details: {
        jira_site: resources[0].name,
        jira_url: resources[0].url,
      },
      result: "success",
    });

    return new Response(
      JSON.stringify({
        success: true,
        connectionId,
        jiraSite: {
          id: resources[0].id,
          name: resources[0].name,
          url: resources[0].url,
        },
        availableSites: resources.map((r) => ({
          id: r.id,
          name: r.name,
          url: r.url,
        })),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Jira OAuth callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
