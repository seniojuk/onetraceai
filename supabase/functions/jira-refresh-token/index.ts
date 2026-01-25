import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Jira token endpoint
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";

interface JiraTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function can be called by system (cron) or by user
    const authHeader = req.headers.get("Authorization");
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { connectionId, workspaceId } = body;

    // If no specific connection, refresh all expiring connections
    let connectionsToRefresh;
    
    if (connectionId) {
      // Validate user access if auth header provided
      if (authHeader?.startsWith("Bearer ")) {
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

        // Verify workspace access
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", claimsData.claims.sub)
          .maybeSingle();

        if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
          return new Response(
            JSON.stringify({ error: "Insufficient permissions" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { data, error } = await supabaseAdmin
        .from("jira_connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Connection not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      connectionsToRefresh = [data];
    } else {
      // Find connections expiring within 10 minutes
      const expiryThreshold = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      const { data, error } = await supabaseAdmin
        .from("jira_connections")
        .select("*")
        .eq("status", "connected")
        .not("refresh_token", "is", null)
        .lt("token_expires_at", expiryThreshold);

      if (error) {
        throw error;
      }

      connectionsToRefresh = data || [];
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

    const results = [];

    for (const connection of connectionsToRefresh) {
      if (!connection.refresh_token) {
        results.push({
          connectionId: connection.id,
          success: false,
          error: "No refresh token available",
        });
        continue;
      }

      try {
        // Refresh the token
        const tokenResponse = await fetch(JIRA_TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grant_type: "refresh_token",
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refresh_token,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`Token refresh failed for ${connection.id}:`, errorText);

          // Update connection status
          await supabaseAdmin
            .from("jira_connections")
            .update({
              status: "degraded",
              last_error_message: "Token refresh failed",
              last_error_at: new Date().toISOString(),
              failure_count: connection.failure_count + 1,
            })
            .eq("id", connection.id);

          results.push({
            connectionId: connection.id,
            success: false,
            error: "Token refresh failed",
          });
          continue;
        }

        const tokens: JiraTokenResponse = await tokenResponse.json();
        const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Update connection with new tokens
        await supabaseAdmin
          .from("jira_connections")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || connection.refresh_token,
            token_expires_at: tokenExpiresAt,
            status: "connected",
            last_error_message: null,
            failure_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        results.push({
          connectionId: connection.id,
          success: true,
          expiresAt: tokenExpiresAt,
        });
      } catch (error: unknown) {
        console.error(`Error refreshing token for ${connection.id}:`, error);
        results.push({
          connectionId: connection.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        refreshed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Jira token refresh error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
