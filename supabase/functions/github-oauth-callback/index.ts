import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, state } = await req.json();

    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Missing code or state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode and validate state
    let stateData: { workspaceId: string; projectId: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid state parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stateData.userId !== user.id) {
      return new Response(JSON.stringify({ error: "State mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 15 min expiry
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "OAuth state expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "GitHub OAuth not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange code for token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub token exchange failed:", tokenData.error_description);
      return new Response(JSON.stringify({ error: "Failed to exchange authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to get GitHub user info" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const githubUser = await userResponse.json();

    // Check if connection already exists for this project
    const { data: existingConnection } = await supabaseAdmin
      .from("github_connections")
      .select("id")
      .eq("project_id", stateData.projectId)
      .maybeSingle();

    let connectionId: string;

    if (existingConnection) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("github_connections")
        .update({
          access_token: accessToken,
          github_user_id: String(githubUser.id),
          github_username: githubUser.login,
          github_avatar_url: githubUser.avatar_url,
          status: "connected",
          last_error_message: null,
          last_error_at: null,
          failure_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id)
        .select("id")
        .single();

      if (updateError) throw updateError;
      connectionId = updated.id;
    } else {
      const { data: created, error: createError } = await supabaseAdmin
        .from("github_connections")
        .insert({
          project_id: stateData.projectId,
          workspace_id: stateData.workspaceId,
          access_token: accessToken,
          github_user_id: String(githubUser.id),
          github_username: githubUser.login,
          github_avatar_url: githubUser.avatar_url,
          status: "connected",
          connected_by: user.id,
        })
        .select("id")
        .single();

      if (createError) throw createError;
      connectionId = created.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        connectionId,
        githubUser: {
          login: githubUser.login,
          avatar_url: githubUser.avatar_url,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
