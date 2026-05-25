import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let token: string | null = url.searchParams.get("token");
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.token) token = body.token;
      } catch { /* ignore */ }
    }

    if (!token) return jsonResponse({ error: "Token is required" }, 400);

    // Look up invitation
    const { data: invite, error } = await admin
      .from("workspace_invitations")
      .select("*, workspaces(name)")
      .eq("token", token)
      .maybeSingle();

    if (error || !invite) return jsonResponse({ error: "Invitation not found" }, 404);

    const expired = new Date(invite.expires_at).getTime() < Date.now();
    if (invite.status === "REVOKED") {
      return jsonResponse({ error: "This invitation has been revoked" }, 410);
    }
    if (invite.status === "ACCEPTED") {
      return jsonResponse({ error: "This invitation has already been accepted" }, 410);
    }
    if (expired) {
      return jsonResponse({ error: "This invitation has expired" }, 410);
    }

    // GET / info action: return public details. POST must continue to accept.
    if (req.method === "GET" || action === "info") {
      return jsonResponse({
        valid: true,
        email: invite.email,
        role: invite.role,
        workspaceName: invite.workspaces?.name ?? null,
      });
    }

    // POST /accept — requires authenticated user whose email matches the invitation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Sign in required" }, 401);

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !user) return jsonResponse({ error: "Invalid session" }, 401);

    if ((user.email || "").toLowerCase() !== invite.email.toLowerCase()) {
      return jsonResponse({
        error: `This invitation is for ${invite.email}. Please sign in with that email.`,
      }, 403);
    }

    // Check if already a member (idempotent accept)
    const { data: existingMember } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMember) {
      const { error: insertErr } = await admin.from("workspace_members").insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
        invited_at: invite.created_at,
        accepted_at: new Date().toISOString(),
      });
      if (insertErr) throw insertErr;
    }

    await admin
      .from("workspace_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invite.id);

    return jsonResponse({
      success: true,
      workspaceId: invite.workspace_id,
      workspaceName: invite.workspaces?.name ?? null,
    });
  } catch (e: unknown) {
    console.error("workspace-invite-accept error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
