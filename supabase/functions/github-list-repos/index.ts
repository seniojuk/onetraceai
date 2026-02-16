import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_API = "https://api.github.com";

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
    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = data.claims.sub;

    // Parse query params
    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connectionId");
    const workspaceId = url.searchParams.get("workspaceId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "30");
    const search = url.searchParams.get("search") || "";

    if (!connectionId || !workspaceId) {
      return new Response(JSON.stringify({ error: "Missing connectionId or workspaceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the GitHub access token from the connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch repos from GitHub
    let ghUrl: string;
    if (search) {
      // Use search API for filtering
      ghUrl = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(search)}+in:name+fork:true&sort=updated&per_page=${perPage}&page=${page}`;
    } else {
      // List user repos sorted by recently updated
      ghUrl = `${GITHUB_API}/user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}&type=all`;
    }

    const ghResponse = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!ghResponse.ok) {
      const errorText = await ghResponse.text();
      console.error("GitHub API error:", ghResponse.status, errorText);

      if (ghResponse.status === 401) {
        // Token might be expired/revoked — mark connection degraded
        await supabaseAdmin
          .from("github_connections")
          .update({
            status: "degraded",
            last_error_message: "GitHub token expired or revoked",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", connectionId);

        return new Response(JSON.stringify({ error: "GitHub token expired. Please reconnect." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to fetch repositories from GitHub" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ghData = await ghResponse.json();
    const repos = search ? ghData.items : ghData;

    // Map to a clean shape
    const mappedRepos = (repos || []).map((repo: Record<string, unknown>) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: (repo.owner as Record<string, unknown>)?.login || "",
      description: repo.description || "",
      html_url: repo.html_url,
      default_branch: repo.default_branch || "main",
      private: repo.private,
      updated_at: repo.updated_at,
      language: repo.language,
    }));

    // Parse Link header for pagination
    const linkHeader = ghResponse.headers.get("Link") || "";
    const hasNextPage = linkHeader.includes('rel="next"');

    return new Response(
      JSON.stringify({
        repos: mappedRepos,
        page,
        per_page: perPage,
        has_next_page: hasNextPage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("GitHub list repos error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
