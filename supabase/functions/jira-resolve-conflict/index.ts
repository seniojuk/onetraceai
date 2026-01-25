import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveRequest {
  mappingId: string;
  workspaceId: string;
  resolution: "accept_jira" | "accept_onetrace" | "merge";
  mergedContent?: {
    title: string;
    content: string;
  };
}

// Compute hash for content
function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Convert ADF to plain text
function adfToPlainText(adf: object | null | undefined): string {
  if (!adf) return "";
  
  const extractText = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    
    const n = node as { type?: string; text?: string; content?: unknown[] };
    
    if (n.type === "text" && n.text) {
      return n.text;
    }
    
    if (Array.isArray(n.content)) {
      return n.content.map(extractText).join("\n");
    }
    
    return "";
  };
  
  return extractText(adf);
}

// Convert markdown to ADF
function markdownToADF(markdown: string | null): object {
  if (!markdown) {
    return {
      version: 1,
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
    };
  }

  const lines = markdown.split("\n");
  const content: object[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    if (line.startsWith("### ")) {
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: line.substring(4) }],
      });
    } else if (line.startsWith("## ")) {
      content.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: line.substring(3) }],
      });
    } else if (line.startsWith("# ")) {
      content.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: line.substring(2) }],
      });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      content.push({
        type: "bulletList",
        content: [{
          type: "listItem",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: line.substring(2) }],
          }],
        }],
      });
    } else {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }

  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: markdown }],
    });
  }

  return { version: 1, type: "doc", content };
}

async function refreshTokenIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: {
    id: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
  }
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    return connection.access_token;
  }

  const clientId = Deno.env.get("JIRA_CLIENT_ID");
  const clientSecret = Deno.env.get("JIRA_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Jira OAuth credentials not configured");
  }

  const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to refresh Jira access token");
  }

  const tokenData = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await supabase
    .from("jira_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || connection.refresh_token,
      token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const body: ResolveRequest = await req.json();
    const { mappingId, workspaceId, resolution, mergedContent } = body;

    if (!mappingId || !workspaceId || !resolution) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resolution === "merge" && !mergedContent) {
      return new Response(
        JSON.stringify({ error: "Merged content required for merge resolution" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Fetch mapping with related data
    const { data: mapping, error: mappingError } = await supabase
      .from("jira_issue_mappings")
      .select("*, project_link:jira_project_links(*)")
      .eq("id", mappingId)
      .eq("workspace_id", workspaceId)
      .single();

    if (mappingError || !mapping) {
      return new Response(JSON.stringify({ error: "Mapping not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mapping.has_conflict) {
      return new Response(
        JSON.stringify({ error: "No conflict to resolve" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch artifact
    const { data: artifact, error: artifactError } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", mapping.artifact_id)
      .single();

    if (artifactError || !artifact) {
      return new Response(JSON.stringify({ error: "Artifact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch shadow data (latest Jira state)
    const { data: shadow } = await supabase
      .from("jira_issues_shadow")
      .select("*")
      .eq("mapping_id", mappingId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch connection
    const { data: connection, error: connError } = await supabase
      .from("jira_connections")
      .select("*")
      .eq("id", mapping.project_link.connection_id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Jira connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await refreshTokenIfNeeded(supabase, connection);

    let finalTitle: string;
    let finalContent: string;

    if (resolution === "accept_jira") {
      // Use Jira data
      finalTitle = shadow?.summary || artifact.title;
      finalContent = shadow?.description_adf 
        ? adfToPlainText(shadow.description_adf) 
        : (artifact.content_markdown || "");
    } else if (resolution === "accept_onetrace") {
      // Use OneTrace data, push to Jira
      finalTitle = artifact.title;
      finalContent = artifact.content_markdown || "";
    } else {
      // Use merged content
      finalTitle = mergedContent!.title;
      finalContent = mergedContent!.content;
    }

    // Update based on resolution
    if (resolution === "accept_jira") {
      // Update OneTrace artifact with Jira data
      await supabase
        .from("artifacts")
        .update({
          title: finalTitle,
          content_markdown: finalContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", artifact.id);
    } else {
      // Push to Jira (accept_onetrace or merge)
      const description = markdownToADF(finalContent);
      
      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${connection.jira_cloud_id}/rest/api/3/issue/${mapping.jira_issue_key}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fields: {
              summary: finalTitle,
              description,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update Jira:", errorText);
        throw new Error(`Failed to update Jira issue: ${response.status}`);
      }

      // If merge, also update OneTrace
      if (resolution === "merge") {
        await supabase
          .from("artifacts")
          .update({
            title: finalTitle,
            content_markdown: finalContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", artifact.id);
      }
    }

    // Compute new hashes
    const summaryHash = computeHash(finalTitle);
    const descriptionHash = computeHash(finalContent);

    // Clear conflict and sync hashes
    await supabase
      .from("jira_issue_mappings")
      .update({
        has_conflict: false,
        conflict_resolved_at: new Date().toISOString(),
        conflict_resolved_by: userId,
        last_pushed_summary_hash: summaryHash,
        last_pushed_description_hash: descriptionHash,
        last_pulled_summary_hash: summaryHash,
        last_pulled_description_hash: descriptionHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mappingId);

    // Log audit event
    try {
      await supabase.from("jira_audit_logs").insert({
        workspace_id: workspaceId,
        project_id: artifact.project_id,
        connection_id: connection.id,
        project_link_id: mapping.project_link_id,
        actor_id: userId,
        action: "resolve_conflict",
        artifact_ids: [artifact.id],
        jira_issue_keys: [mapping.jira_issue_key],
        result: "success",
        action_details: {
          resolution,
          artifactTitle: artifact.title,
          jiraIssueKey: mapping.jira_issue_key,
        },
      });
    } catch (error) {
      console.error("Failed to log audit:", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        resolution,
        message: `Conflict resolved by ${resolution.replace("_", " ")}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jira-resolve-conflict:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
