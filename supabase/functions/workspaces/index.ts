import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("id");

    // Helper to check workspace membership
    async function isWorkspaceMember(wsId: string): Promise<boolean> {
      const { data } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", wsId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    }

    // GET - List workspaces or get single workspace
    if (req.method === "GET") {
      if (workspaceId) {
        // Get single workspace - check membership first
        if (!(await isWorkspaceMember(workspaceId))) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        const { data, error } = await supabaseAdmin
          .from("workspaces")
          .select("*")
          .eq("id", workspaceId)
          .single();
          
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // List all workspaces user is a member of
        const { data: memberships } = await supabaseAdmin
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id);
        
        const workspaceIds = memberships?.map(m => m.workspace_id) || [];
        
        if (workspaceIds.length === 0) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        const { data, error } = await supabaseAdmin
          .from("workspaces")
          .select("*")
          .in("id", workspaceIds)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST - Create workspace
    if (req.method === "POST") {
      const body = await req.json();
      const { name, slug } = body;
      
      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create workspace with user as creator
      const { data: workspace, error: createError } = await supabaseAdmin
        .from("workspaces")
        .insert({
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add user as OWNER (trigger should handle this, but ensure it's done)
      const { data: existingMember } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingMember) {
        await supabaseAdmin
          .from("workspace_members")
          .insert({
            workspace_id: workspace.id,
            user_id: user.id,
            role: "OWNER",
            accepted_at: new Date().toISOString(),
          });
      }

      return new Response(JSON.stringify(workspace), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT - Update workspace
    if (req.method === "PUT") {
      if (!workspaceId) {
        return new Response(JSON.stringify({ error: "Workspace ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user is OWNER or ADMIN
      const { data: membership } = await supabaseAdmin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { name, slug } = body;

      const { data, error } = await supabaseAdmin
        .from("workspaces")
        .update({ name, slug, updated_at: new Date().toISOString() })
        .eq("id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Delete workspace
    if (req.method === "DELETE") {
      if (!workspaceId) {
        return new Response(JSON.stringify({ error: "Workspace ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user is OWNER
      const { data: membership } = await supabaseAdmin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership || membership.role !== "OWNER") {
        return new Response(JSON.stringify({ error: "Only workspace owners can delete workspaces" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete all dependent data in correct order (respecting foreign key constraints)
      // 1. Delete pipeline runs (depends on agent_pipelines)
      await supabaseAdmin
        .from("pipeline_runs")
        .delete()
        .eq("workspace_id", workspaceId);

      // 2. Delete agent pipelines
      await supabaseAdmin
        .from("agent_pipelines")
        .delete()
        .eq("workspace_id", workspaceId);

      // 3. Delete AI runs (depends on agent_configs)
      await supabaseAdmin
        .from("ai_runs")
        .delete()
        .eq("workspace_id", workspaceId);

      // 4. Delete agent configs
      await supabaseAdmin
        .from("agent_configs")
        .delete()
        .eq("workspace_id", workspaceId);

      // 5. Delete coverage snapshots (depends on artifacts)
      await supabaseAdmin
        .from("coverage_snapshots")
        .delete()
        .eq("workspace_id", workspaceId);

      // 6. Delete drift findings
      await supabaseAdmin
        .from("drift_findings")
        .delete()
        .eq("workspace_id", workspaceId);

      // 7. Delete artifact edges (depends on artifacts)
      await supabaseAdmin
        .from("artifact_edges")
        .delete()
        .eq("workspace_id", workspaceId);

      // 8. Delete artifact versions (depends on artifacts)
      await supabaseAdmin
        .from("artifact_versions")
        .delete()
        .eq("workspace_id", workspaceId);

      // 9. Delete artifact file associations
      await supabaseAdmin
        .from("artifact_file_associations")
        .delete()
        .eq("workspace_id", workspaceId);

      // 10. Delete artifacts
      await supabaseAdmin
        .from("artifacts")
        .delete()
        .eq("workspace_id", workspaceId);

      // 11. Delete onboarding progress
      await supabaseAdmin
        .from("onboarding_progress")
        .delete()
        .eq("workspace_id", workspaceId);

      // 12. Delete LLM providers
      await supabaseAdmin
        .from("llm_providers")
        .delete()
        .eq("workspace_id", workspaceId);

      // 13. Delete projects
      await supabaseAdmin
        .from("projects")
        .delete()
        .eq("workspace_id", workspaceId);

      // 14. Delete workspace members
      await supabaseAdmin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId);

      // 15. Finally delete the workspace
      const { error } = await supabaseAdmin
        .from("workspaces")
        .delete()
        .eq("id", workspaceId);

      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});