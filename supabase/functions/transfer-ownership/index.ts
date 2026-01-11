import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId, newOwnerId } = await req.json();

    if (!workspaceId || !newOwnerId) {
      return new Response(JSON.stringify({ error: "workspaceId and newOwnerId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if current user is the OWNER
    const { data: currentMembership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!currentMembership || currentMembership.role !== "OWNER") {
      return new Response(JSON.stringify({ error: "Only the current owner can transfer ownership" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if new owner is a member of the workspace
    const { data: newOwnerMembership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", newOwnerId)
      .maybeSingle();

    if (!newOwnerMembership) {
      return new Response(JSON.stringify({ error: "New owner must be a member of the workspace" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cannot transfer to yourself
    if (newOwnerId === user.id) {
      return new Response(JSON.stringify({ error: "You are already the owner" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update new owner's role to OWNER
    const { error: newOwnerError } = await supabaseAdmin
      .from("workspace_members")
      .update({ role: "OWNER" })
      .eq("workspace_id", workspaceId)
      .eq("user_id", newOwnerId);

    if (newOwnerError) throw newOwnerError;

    // Demote current owner to ADMIN
    const { error: demoteError } = await supabaseAdmin
      .from("workspace_members")
      .update({ role: "ADMIN" })
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id);

    if (demoteError) throw demoteError;

    // Update workspace's created_by field (optional, for consistency)
    await supabaseAdmin
      .from("workspaces")
      .update({ created_by: newOwnerId, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    return new Response(JSON.stringify({ success: true, message: "Ownership transferred successfully" }), {
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
