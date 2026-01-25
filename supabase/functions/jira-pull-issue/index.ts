import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PullRequest {
  mappingId: string;
  workspaceId: string;
}

interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: object | null;
    status?: { name: string };
    assignee?: { accountId: string; displayName: string } | null;
    priority?: { name: string } | null;
    issuetype?: { name: string };
    updated?: string;
  };
}

// Compute a simple hash for content comparison
function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Convert ADF to plain text for comparison
function adfToPlainText(adf: object | null | undefined): string {
  if (!adf) return "";
  
  const extractText = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    
    const n = node as { type?: string; text?: string; content?: unknown[] };
    
    if (n.type === "text" && n.text) {
      return n.text;
    }
    
    if (Array.isArray(n.content)) {
      return n.content.map(extractText).join("");
    }
    
    return "";
  };
  
  return extractText(adf);
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

  console.log("Refreshing Jira access token...");

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
    const errorText = await tokenResponse.text();
    console.error("Token refresh failed:", errorText);
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

async function fetchJiraIssue(
  accessToken: string,
  cloudId: string,
  issueKey: string
): Promise<JiraIssue> {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}?fields=summary,description,status,assignee,priority,issuetype,updated`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch Jira issue:", errorText);
    throw new Error(`Failed to fetch Jira issue: ${response.status}`);
  }

  return await response.json();
}

// Map Jira status to OneTrace status using project link mapping
function mapJiraStatusToOneTrace(
  jiraStatus: string,
  statusMapping: Record<string, string>
): string {
  // Direct lookup in the mapping
  const mappedStatus = statusMapping[jiraStatus];
  if (mappedStatus) {
    return mappedStatus;
  }
  
  // Default mappings
  const defaultMapping: Record<string, string> = {
    "To Do": "DRAFT",
    "In Progress": "ACTIVE",
    "Done": "DONE",
    "Blocked": "BLOCKED",
  };
  
  return defaultMapping[jiraStatus] || "ACTIVE";
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

    const body: PullRequest = await req.json();
    const { mappingId, workspaceId } = body;

    if (!mappingId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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

    const projectLink = mapping.project_link;

    // Fetch connection
    const { data: connection, error: connError } = await supabase
      .from("jira_connections")
      .select("*")
      .eq("id", projectLink.connection_id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Jira connection not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (connection.status === "broken") {
      return new Response(
        JSON.stringify({ error: "Jira connection is broken" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, connection);

    // Fetch the Jira issue
    const jiraIssue = await fetchJiraIssue(
      accessToken,
      connection.jira_cloud_id,
      mapping.jira_issue_key
    );

    // Compute hashes of current Jira data
    const jiraSummaryHash = computeHash(jiraIssue.fields.summary);
    const jiraDescriptionText = adfToPlainText(jiraIssue.fields.description);
    const jiraDescriptionHash = computeHash(jiraDescriptionText);

    // Check for conflicts - if Jira changed since last pull AND OneTrace changed since last push
    const hasJiraChangedSincePull = 
      mapping.last_pulled_summary_hash !== jiraSummaryHash ||
      mapping.last_pulled_description_hash !== jiraDescriptionHash;

    const hasOneTraceChangedSincePush =
      mapping.last_pushed_summary_hash !== mapping.last_pulled_summary_hash ||
      mapping.last_pushed_description_hash !== mapping.last_pulled_description_hash;

    const hasConflict = hasJiraChangedSincePull && hasOneTraceChangedSincePush;

    // Update or create shadow record
    const shadowData = {
      workspace_id: workspaceId,
      project_link_id: projectLink.id,
      mapping_id: mappingId,
      jira_issue_id: jiraIssue.id,
      jira_issue_key: jiraIssue.key,
      summary: jiraIssue.fields.summary,
      status: jiraIssue.fields.status?.name || null,
      assignee_id: jiraIssue.fields.assignee?.accountId || null,
      assignee_name: jiraIssue.fields.assignee?.displayName || null,
      priority: jiraIssue.fields.priority?.name || null,
      issue_type: jiraIssue.fields.issuetype?.name || null,
      description_adf: jiraIssue.fields.description || null,
      jira_data: jiraIssue,
      fetched_at: new Date().toISOString(),
      source: "pull",
    };

    // Upsert shadow record
    const { error: shadowError } = await supabase
      .from("jira_issues_shadow")
      .upsert(shadowData, {
        onConflict: "jira_issue_id,project_link_id",
      });

    if (shadowError) {
      console.error("Failed to update shadow:", shadowError);
    }

    // Update mapping with new pull hashes and conflict status
    const mappingUpdate: Record<string, unknown> = {
      last_pulled_at: new Date().toISOString(),
      last_pulled_summary_hash: jiraSummaryHash,
      last_pulled_description_hash: jiraDescriptionHash,
      updated_at: new Date().toISOString(),
    };

    if (hasConflict && !mapping.has_conflict) {
      mappingUpdate.has_conflict = true;
      mappingUpdate.conflict_detected_at = new Date().toISOString();
    }

    await supabase
      .from("jira_issue_mappings")
      .update(mappingUpdate)
      .eq("id", mappingId);

    // If no conflict and sync_status is enabled, update artifact status
    if (!hasConflict && projectLink.sync_settings?.sync_status && jiraIssue.fields.status) {
      const newStatus = mapJiraStatusToOneTrace(
        jiraIssue.fields.status.name,
        projectLink.status_mapping || {}
      );

      await supabase
        .from("artifacts")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mapping.artifact_id);
    }

    // Log audit event
    try {
      await supabase.from("jira_audit_logs").insert({
        workspace_id: workspaceId,
        project_id: mapping.project_id,
        connection_id: connection.id,
        project_link_id: projectLink.id,
        actor_id: userId,
        action: "pull_issue",
        artifact_ids: [mapping.artifact_id],
        jira_issue_keys: [mapping.jira_issue_key],
        result: "success",
        action_details: {
          hasConflict,
          jiraStatus: jiraIssue.fields.status?.name,
        },
      });
    } catch (error) {
      console.error("Failed to log audit:", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        hasConflict,
        jiraIssue: {
          key: jiraIssue.key,
          summary: jiraIssue.fields.summary,
          status: jiraIssue.fields.status?.name,
          descriptionText: jiraDescriptionText.substring(0, 500),
        },
        message: hasConflict
          ? `Conflict detected for ${jiraIssue.key} - both Jira and OneTrace have changes`
          : `Successfully pulled ${jiraIssue.key}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in jira-pull-issue:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
