import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

const SCOPES = "repo read:user";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId, projectId, redirectUri } = await req.json();

    if (!workspaceId || !projectId || !redirectUri) {
      return new Response(JSON.stringify({ error: "Missing workspaceId, projectId, or redirectUri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is member of workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Only workspace owners and admins can connect GitHub" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "GitHub OAuth not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = btoa(JSON.stringify({
      workspaceId,
      projectId,
      userId: user.id,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    }));

    const authUrl = new URL(GITHUB_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("state", state);

    return new Response(JSON.stringify({ authUrl: authUrl.toString(), state }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GitHub OAuth init error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
