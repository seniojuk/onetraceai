import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  artifactId: string;
  projectLinkId: string;
  workspaceId: string;
}

interface ArtifactData {
  id: string;
  type: string;
  title: string;
  status: string;
  content_markdown: string | null;
  content_json: Record<string, unknown> | null;
  short_id: string;
  workspace_id: string;
  project_id: string;
}

interface ProjectLink {
  id: string;
  connection_id: string;
  jira_project_id: string;
  jira_project_key: string;
  field_mode: string;
  status_mapping: Record<string, string>;
  sync_settings: {
    push_summary: boolean;
    push_description: boolean;
    push_coverage: boolean;
    sync_status: boolean;
    auto_push_on_publish: boolean;
  };
}

interface JiraConnection {
  id: string;
  access_token: string;
  refresh_token: string;
  jira_cloud_id: string;
  jira_base_url: string;
  token_expires_at: string;
  status: string;
}

interface IssueMapping {
  id: string;
  jira_issue_id: string;
  jira_issue_key: string;
  jira_issue_url: string;
}

// Map OneTrace artifact types to Jira issue types
function mapArtifactTypeToJiraIssueType(artifactType: string): string {
  const typeMap: Record<string, string> = {
    EPIC: "Epic",
    STORY: "Story",
    BUG: "Bug",
    IDEA: "Task",
    PRD: "Task",
    ACCEPTANCE_CRITERION: "Sub-task",
    TEST_CASE: "Sub-task",
  };
  return typeMap[artifactType] || "Task";
}

// Reverse map OneTrace status to Jira status using project link mapping
function mapOneTraceStatusToJira(
  onetraceStatus: string,
  statusMapping: Record<string, string>
): string {
  // Reverse the mapping: find Jira status that maps to OneTrace status
  for (const [jiraStatus, otStatus] of Object.entries(statusMapping)) {
    if (otStatus === onetraceStatus) {
      return jiraStatus;
    }
  }
  // Default mappings if no custom mapping exists
  const defaultMapping: Record<string, string> = {
    DRAFT: "To Do",
    ACTIVE: "In Progress",
    IN_PROGRESS: "In Progress",
    BLOCKED: "Blocked",
    DONE: "Done",
    ARCHIVED: "Done",
  };
  return defaultMapping[onetraceStatus] || "To Do";
}

// Compute a simple hash for content comparison (drift detection)
function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Convert markdown to Atlassian Document Format (ADF) - simplified version
// Optionally appends OneTrace metadata footer for traceability
function markdownToADF(
  markdown: string | null,
  metadata?: { shortId: string; artifactId: string; type: string }
): object {
  const content: object[] = [];

  if (!markdown) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: "No description provided." }],
    });
  } else {
    // Simple conversion: split by newlines and create paragraphs
    const lines = markdown.split("\n");

    for (const line of lines) {
      if (line.trim() === "") continue;

      // Handle headers
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
        // Handle bullet points
        content.push({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: line.substring(2) }],
                },
              ],
            },
          ],
        });
      } else {
        // Regular paragraph
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
  }

  // Add OneTrace metadata footer for traceability
  if (metadata) {
    // Add a horizontal rule separator
    content.push({ type: "rule" });

    // Add metadata panel
    content.push({
      type: "panel",
      attrs: { panelType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "OneTrace Reference: ", marks: [{ type: "strong" }] },
            { type: "text", text: `${metadata.shortId} (${metadata.type})` },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Artifact ID: ", marks: [{ type: "strong" }] },
            { type: "text", text: metadata.artifactId, marks: [{ type: "code" }] },
          ],
        },
      ],
    });
  }

  return {
    version: 1,
    type: "doc",
    content,
  };
}

async function refreshTokenIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: JiraConnection
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    return connection.access_token;
  }

  // Token is expired or about to expire, refresh it
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

  // Update the connection with new tokens
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

async function findParentEpic(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  artifactId: string,
  workspaceId: string
): Promise<{ artifactId: string; type: string } | null> {
  // Find parent Epic via artifact_edges (CONTAINS relationship where Epic contains Story)
  const { data: parentEdge } = await supabase
    .from("artifact_edges")
    .select(`
      from_artifact_id,
      from_artifact:artifacts!artifact_edges_from_artifact_id_fkey(type)
    `)
    .eq("to_artifact_id", artifactId)
    .eq("workspace_id", workspaceId)
    .eq("edge_type", "CONTAINS")
    .maybeSingle();

  if (!parentEdge || parentEdge.from_artifact?.type !== "EPIC") {
    return null;
  }

  return {
    artifactId: parentEdge.from_artifact_id,
    type: parentEdge.from_artifact.type,
  };
}

async function getOrCreateParentEpicJiraKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  accessToken: string,
  connection: JiraConnection,
  projectLink: ProjectLink,
  parentEpicArtifactId: string,
  workspaceId: string,
  userId: string
): Promise<string | null> {
  // Check if the parent Epic has already been pushed to Jira
  const { data: parentMapping } = await supabase
    .from("jira_issue_mappings")
    .select("jira_issue_key")
    .eq("artifact_id", parentEpicArtifactId)
    .eq("project_link_id", projectLink.id)
    .maybeSingle();

  if (parentMapping?.jira_issue_key) {
    return parentMapping.jira_issue_key;
  }

  // Parent Epic hasn't been pushed yet - push it first
  console.log(`Parent Epic ${parentEpicArtifactId} not in Jira, pushing it first...`);

  // Fetch the parent Epic artifact
  const { data: epicArtifact, error: epicError } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", parentEpicArtifactId)
    .eq("workspace_id", workspaceId)
    .single();

  if (epicError || !epicArtifact) {
    console.error("Failed to fetch parent Epic artifact:", epicError);
    return null;
  }

  // Create the Epic in Jira (Epics don't have parents)
  const epicResult = await createJiraIssue(
    accessToken,
    connection.jira_cloud_id,
    projectLink.jira_project_key,
    epicArtifact as ArtifactData,
    projectLink,
    null // Epics don't have parent issues
  );

  // Compute hashes for the Epic
  const epicSummaryHash = computeHash(epicArtifact.title);
  const epicDescriptionHash = computeHash(epicArtifact.content_markdown || "");

  // Create mapping record for the Epic
  await supabase.from("jira_issue_mappings").insert({
    workspace_id: workspaceId,
    project_id: epicArtifact.project_id,
    project_link_id: projectLink.id,
    artifact_id: parentEpicArtifactId,
    jira_issue_id: epicResult.id,
    jira_issue_key: epicResult.key,
    jira_issue_url: `${connection.jira_base_url}/browse/${epicResult.key}`,
    jira_issue_type: "Epic",
    last_pushed_at: new Date().toISOString(),
    last_pushed_summary_hash: epicSummaryHash,
    last_pushed_description_hash: epicDescriptionHash,
    created_by: userId,
  });

  // Log audit event for the auto-pushed Epic
  await logAuditEvent(supabase, {
    workspaceId,
    projectId: epicArtifact.project_id,
    connectionId: connection.id,
    projectLinkId: projectLink.id,
    actorId: userId,
    action: "push_create",
    artifactIds: [parentEpicArtifactId],
    jiraIssueKeys: [epicResult.key],
    result: "success",
    actionDetails: {
      artifactType: "EPIC",
      artifactTitle: epicArtifact.title,
      autoPushedForChild: true,
    },
  });

  console.log(`Auto-pushed parent Epic ${epicResult.key} to Jira`);
  return epicResult.key;
}

async function createJiraIssue(
  accessToken: string,
  cloudId: string,
  projectKey: string,
  artifact: ArtifactData,
  projectLink: ProjectLink,
  parentEpicKey: string | null
): Promise<{ id: string; key: string; self: string }> {
  const issueType = mapArtifactTypeToJiraIssueType(artifact.type);
  
  // Include OneTrace metadata in the description for traceability
  const description = markdownToADF(artifact.content_markdown, {
    shortId: artifact.short_id,
    artifactId: artifact.id,
    type: artifact.type,
  });

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary: artifact.title,
    issuetype: { name: issueType },
    description,
  };

  // Link Story to parent Epic if available
  if (parentEpicKey && artifact.type === "STORY") {
    fields.parent = { key: parentEpicKey };
  }

  const issueData: Record<string, unknown> = { fields };

  // Add OneTrace reference in issue properties if using that mode
  if (projectLink.field_mode === "issue_properties") {
    // Issue properties are set after creation
  }

  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(issueData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to create Jira issue:", errorText);
    throw new Error(`Failed to create Jira issue: ${response.status}`);
  }

  const result = await response.json();

  // Set issue properties for traceability
  if (projectLink.field_mode === "issue_properties") {
    await setIssueProperty(accessToken, cloudId, result.key, "onetrace", {
      artifactId: artifact.id,
      shortId: artifact.short_id,
      type: artifact.type,
      projectId: artifact.project_id,
      workspaceId: artifact.workspace_id,
    });
  }

  return result;
}

async function updateJiraIssue(
  accessToken: string,
  cloudId: string,
  issueKey: string,
  artifact: ArtifactData,
  projectLink: ProjectLink
): Promise<void> {
  // Include OneTrace metadata in the description for traceability
  const description = markdownToADF(artifact.content_markdown, {
    shortId: artifact.short_id,
    artifactId: artifact.id,
    type: artifact.type,
  });
  
  const updateData: Record<string, unknown> = {
    fields: {},
  };

  if (projectLink.sync_settings.push_summary) {
    updateData.fields = {
      ...(updateData.fields as Record<string, unknown>),
      summary: artifact.title,
    };
  }

  if (projectLink.sync_settings.push_description) {
    updateData.fields = {
      ...(updateData.fields as Record<string, unknown>),
      description,
    };
  }

  // Only update if there are fields to update
  if (Object.keys(updateData.fields as Record<string, unknown>).length > 0) {
    const response = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to update Jira issue:", errorText);
      throw new Error(`Failed to update Jira issue: ${response.status}`);
    }
  }

  // Handle status transition if sync_status is enabled
  if (projectLink.sync_settings.sync_status) {
    const targetStatus = mapOneTraceStatusToJira(
      artifact.status,
      projectLink.status_mapping
    );
    await transitionIssueStatus(accessToken, cloudId, issueKey, targetStatus);
  }
}

async function transitionIssueStatus(
  accessToken: string,
  cloudId: string,
  issueKey: string,
  targetStatus: string
): Promise<void> {
  // Get available transitions
  const transitionsResponse = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!transitionsResponse.ok) {
    console.error("Failed to get transitions");
    return;
  }

  const transitionsData = await transitionsResponse.json();
  const transitions = transitionsData.transitions || [];

  // Find matching transition
  const matchingTransition = transitions.find(
    (t: { to: { name: string } }) =>
      t.to.name.toLowerCase() === targetStatus.toLowerCase()
  );

  if (!matchingTransition) {
    console.log(`No transition found to status: ${targetStatus}`);
    return;
  }

  // Execute the transition
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transition: { id: matchingTransition.id },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to transition issue:", errorText);
  }
}

async function setIssueProperty(
  accessToken: string,
  cloudId: string,
  issueKey: string,
  propertyKey: string,
  value: unknown
): Promise<void> {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/properties/${propertyKey}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    }
  );

  if (!response.ok) {
    console.error("Failed to set issue property:", await response.text());
  }
}

async function logAuditEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: {
    workspaceId: string;
    projectId: string;
    connectionId: string;
    projectLinkId: string;
    actorId: string;
    action: string;
    artifactIds: string[];
    jiraIssueKeys: string[];
    result: "success" | "failure";
    errorMessage?: string;
    actionDetails?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from("jira_audit_logs").insert({
      workspace_id: params.workspaceId,
      project_id: params.projectId,
      connection_id: params.connectionId,
      project_link_id: params.projectLinkId,
      actor_id: params.actorId,
      action: params.action,
      artifact_ids: params.artifactIds,
      jira_issue_keys: params.jiraIssueKeys,
      result: params.result,
      error_message: params.errorMessage,
      action_details: params.actionDetails || {},
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const body: PushRequest = await req.json();
    const { artifactId, projectLinkId, workspaceId } = body;

    if (!artifactId || !projectLinkId || !workspaceId) {
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

    // Fetch artifact
    const { data: artifact, error: artifactError } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", artifactId)
      .eq("workspace_id", workspaceId)
      .single();

    if (artifactError || !artifact) {
      return new Response(JSON.stringify({ error: "Artifact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project link
    const { data: projectLink, error: linkError } = await supabase
      .from("jira_project_links")
      .select("*")
      .eq("id", projectLinkId)
      .eq("workspace_id", workspaceId)
      .single();

    if (linkError || !projectLink) {
      return new Response(JSON.stringify({ error: "Project link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Jira connection
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

    // Check connection status
    if (connection.status === "broken") {
      return new Response(
        JSON.stringify({ error: "Jira connection is broken. Please reconnect." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, connection);

    // Check for existing mapping
    const { data: existingMapping } = await supabase
      .from("jira_issue_mappings")
      .select("*")
      .eq("artifact_id", artifactId)
      .eq("project_link_id", projectLinkId)
      .maybeSingle();

    // Compute hashes for drift detection
    const summaryHash = computeHash(artifact.title);
    const descriptionHash = computeHash(artifact.content_markdown || "");

    let jiraIssueKey: string;
    let jiraIssueId: string;
    let jiraIssueUrl: string;
    let action: string;

    if (existingMapping) {
      // Update existing issue
      action = "push_update";
      jiraIssueKey = existingMapping.jira_issue_key;
      jiraIssueId = existingMapping.jira_issue_id;
      jiraIssueUrl = existingMapping.jira_issue_url;

      await updateJiraIssue(
        accessToken,
        connection.jira_cloud_id,
        jiraIssueKey,
        artifact as ArtifactData,
        projectLink as unknown as ProjectLink
      );

      // Update mapping with new hashes
      await supabase
        .from("jira_issue_mappings")
        .update({
          last_pushed_at: new Date().toISOString(),
          last_pushed_summary_hash: summaryHash,
          last_pushed_description_hash: descriptionHash,
          has_conflict: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMapping.id);
    } else {
      // Create new issue
      action = "push_create";
      
      // Find and auto-push parent Epic if this is a Story
      let parentEpicKey: string | null = null;
      if (artifact.type === "STORY") {
        const parentEpic = await findParentEpic(supabase, artifactId, workspaceId);
        
        if (parentEpic) {
          // Get or create the parent Epic in Jira
          parentEpicKey = await getOrCreateParentEpicJiraKey(
            supabase,
            accessToken,
            connection as JiraConnection,
            projectLink as unknown as ProjectLink,
            parentEpic.artifactId,
            workspaceId,
            userId
          );
        }
      }
      
      const result = await createJiraIssue(
        accessToken,
        connection.jira_cloud_id,
        projectLink.jira_project_key,
        artifact as ArtifactData,
        projectLink as unknown as ProjectLink,
        parentEpicKey
      );

      jiraIssueKey = result.key;
      jiraIssueId = result.id;
      jiraIssueUrl = `${connection.jira_base_url}/browse/${result.key}`;

      // Create mapping record
      await supabase.from("jira_issue_mappings").insert({
        workspace_id: workspaceId,
        project_id: artifact.project_id,
        project_link_id: projectLinkId,
        artifact_id: artifactId,
        jira_issue_id: jiraIssueId,
        jira_issue_key: jiraIssueKey,
        jira_issue_url: jiraIssueUrl,
        jira_issue_type: mapArtifactTypeToJiraIssueType(artifact.type),
        last_pushed_at: new Date().toISOString(),
        last_pushed_summary_hash: summaryHash,
        last_pushed_description_hash: descriptionHash,
        created_by: userId,
      });
    }

    // Update project link last_push_at
    await supabase
      .from("jira_project_links")
      .update({
        last_push_at: new Date().toISOString(),
        last_push_status: "success",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectLinkId);

    // Auto-recover from degraded status on successful API call
    if (connection.status === "degraded") {
      await supabase
        .from("jira_connections")
        .update({
          status: "connected",
          last_error_message: null,
          last_error_at: null,
          failure_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
      console.log(`Connection ${connection.id} recovered from degraded status`);
    }

    // Log audit event
    await logAuditEvent(supabase, {
      workspaceId,
      projectId: artifact.project_id,
      connectionId: connection.id,
      projectLinkId,
      actorId: userId,
      action,
      artifactIds: [artifactId],
      jiraIssueKeys: [jiraIssueKey],
      result: "success",
      actionDetails: {
        artifactType: artifact.type,
        artifactTitle: artifact.title,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        jiraIssueKey,
        jiraIssueUrl,
        message: existingMapping
          ? `Updated Jira issue ${jiraIssueKey}`
          : `Created Jira issue ${jiraIssueKey}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in jira-push-artifact:", error);
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
