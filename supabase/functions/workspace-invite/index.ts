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

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { workspaceId, email, role } = await req.json();
    if (!workspaceId || !email || !role) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonResponse({ error: "Invalid email address" }, 400);
    }
    if (!["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
      return jsonResponse({ error: "Invalid role" }, 400);
    }

    // Verify caller is OWNER or ADMIN
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return jsonResponse({ error: "Only owners and admins can invite members." }, 403);
    }
    if (membership.role !== "OWNER" && role === "ADMIN") {
      return jsonResponse({ error: "Only owners can assign the ADMIN role" }, 403);
    }

    // Workspace lookup (for email)
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!workspace) return jsonResponse({ error: "Workspace not found" }, 404);

    // Check if user already exists
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existingUser = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

    // If they exist AND are already a member, short-circuit
    if (existingUser) {
      const { data: alreadyMember } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingUser.id)
        .maybeSingle();
      if (alreadyMember) {
        return jsonResponse({ error: "User is already a member of this workspace" }, 400);
      }
    }

    // Inviter profile (for email body)
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    // Create or refresh pending invitation
    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Revoke any existing PENDING invite for same workspace+email, then insert fresh
    await supabaseAdmin
      .from("workspace_invitations")
      .update({ status: "REVOKED" })
      .eq("workspace_id", workspaceId)
      .eq("status", "PENDING")
      .ilike("email", normalizedEmail);

    const { data: invitation, error: inviteErr } = await supabaseAdmin
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: normalizedEmail,
        role,
        token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (inviteErr) throw inviteErr;

    // Build accept URL — use Origin header if available, fall back to published URL
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://onetrace.ai";
    const cleanOrigin = origin.replace(/\/+$/, "").split("/").slice(0, 3).join("/");
    const acceptUrl = `${cleanOrigin}/invite/accept?token=${inviteToken}`;

    // Send invitation email via transactional pipeline
    const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        templateName: "workspace-invite",
        recipientEmail: normalizedEmail,
        idempotencyKey: `ws-invite-${invitation.id}`,
        templateData: {
          workspaceName: workspace.name,
          inviterName: inviterProfile?.display_name || null,
          inviterEmail: user.email,
          role,
          acceptUrl,
          isNewUser: !existingUser,
        },
      }),
    });

    let emailQueued = emailResp.ok;
    if (!emailResp.ok) {
      const text = await emailResp.text();
      console.error("Failed to enqueue invite email", emailResp.status, text);
    }

    return jsonResponse({
      success: true,
      invitation,
      emailQueued,
      message: `Invitation sent to ${normalizedEmail}`,
    }, 201);
  } catch (error: unknown) {
    console.error("workspace-invite error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
