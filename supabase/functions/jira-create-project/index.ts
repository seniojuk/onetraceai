import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateProjectRequest {
  connectionId: string;
  workspaceId: string;
  projectName: string;
  projectKey: string;
  projectType: "software" | "service_desk" | "business";
  description?: string;
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateProjectRequest = await req.json();
    const { connectionId, workspaceId, projectName, projectKey, projectType, description } = body;

    if (!connectionId || !workspaceId || !projectName || !projectKey || !projectType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: connectionId, workspaceId, projectName, projectKey, projectType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate project key format (uppercase letters, 2-10 chars)
    const keyRegex = /^[A-Z][A-Z0-9]{1,9}$/;
    if (!keyRegex.test(projectKey)) {
      return new Response(
        JSON.stringify({ error: "Project key must be 2-10 uppercase letters/numbers, starting with a letter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin/owner of workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Only workspace owners and admins can create Jira projects" }),
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

    // Map project type to Jira template key
    const templateKeyMap: Record<string, string> = {
      software: "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum",
      service_desk: "com.atlassian.servicedesk:simplified-it-service-management",
      business: "com.atlassian.jira-core-project-templates:jira-core-simplified-project-management",
    };

    // Check if we have the manage:jira-configuration permission by checking stored permissions
    const storedPermissions = connection.permissions || "";
    const hasManagePermission = storedPermissions.includes("manage:jira-configuration");
    
    if (!hasManagePermission) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required permission: manage:jira-configuration",
          code: "MISSING_PERMISSION",
          requiredScope: "manage:jira-configuration",
          message: "The OneTrace AI Jira connection does not have permission to create projects. Please ask your Jira administrator to grant the 'manage:jira-configuration' scope to the OneTrace AI OAuth app, or create the project manually in Jira."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, get the current user's account ID from Jira
    const myselfUrl = `https://api.atlassian.com/ex/jira/${connection.jira_cloud_id}/rest/api/3/myself`;
    const myselfResponse = await fetch(myselfUrl, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        Accept: "application/json",
      },
    });

    if (!myselfResponse.ok) {
      console.error("Failed to get Jira user:", await myselfResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to get Jira user information" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const myselfData = await myselfResponse.json();
    const leadAccountId = myselfData.accountId;

    // Create project in Jira
    const createProjectUrl = `https://api.atlassian.com/ex/jira/${connection.jira_cloud_id}/rest/api/3/project`;
    
    const projectPayload: Record<string, unknown> = {
      key: projectKey,
      name: projectName,
      projectTypeKey: projectType === "service_desk" ? "service_desk" : "software",
      projectTemplateKey: templateKeyMap[projectType],
      leadAccountId: leadAccountId,
    };

    if (description) {
      projectPayload.description = description;
    }

    console.log("Creating Jira project with payload:", JSON.stringify(projectPayload));

    const createResponse = await fetch(createProjectUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Failed to create Jira project:", errorText);
      
      let errorMessage = "Failed to create Jira project";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          errorMessage = Object.values(errorJson.errors).join(", ");
        } else if (errorJson.errorMessages?.length > 0) {
          errorMessage = errorJson.errorMessages.join(", ");
        }
      } catch {
        // Use default error message
      }

      if (createResponse.status === 401) {
        await supabaseAdmin
          .from("jira_connections")
          .update({ status: "degraded", last_error_message: "Authentication failed" })
          .eq("id", connectionId);
      }

      // Handle 403 - permission denied from Jira API
      if (createResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: "Permission denied by Jira",
            code: "JIRA_PERMISSION_DENIED",
            message: "Jira denied the request to create a project. This may be due to missing 'manage:jira-configuration' scope or insufficient Jira user permissions. You can create the project manually in Jira and then select it here."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: createResponse.status === 401 ? 401 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdProject = await createResponse.json();
    console.log("Created Jira project:", JSON.stringify(createdProject));

    return new Response(
      JSON.stringify({
        project: {
          id: createdProject.id,
          key: createdProject.key,
          name: projectName,
          type: projectType,
          self: createdProject.self,
        },
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Jira create project error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
