import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actorUserId = claimsData.claims.sub;

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the actor is a platform admin
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", actorUserId)
      .maybeSingle();

    if (adminCheckError) {
      console.error("Error checking admin status:", adminCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Platform admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, user_email, user_id } = await req.json();

    if (!action || !["add", "remove", "list"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'add', 'remove', or 'list'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List all platform admins
    if (action === "list") {
      const { data: admins, error: listError } = await supabaseAdmin
        .from("platform_admins")
        .select(`
          id,
          user_id,
          granted_by,
          granted_at,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (listError) {
        console.error("Error listing admins:", listError);
        return new Response(
          JSON.stringify({ error: "Failed to list platform admins" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get profile info for each admin
      const userIds = admins?.map(a => a.user_id) || [];
      const grantedByIds = admins?.map(a => a.granted_by).filter(Boolean) || [];
      const allUserIds = [...new Set([...userIds, ...grantedByIds])];

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", allUserIds);

      // Get emails from auth.users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userMap = new Map(
        authUsers?.users?.map(u => [u.id, { email: u.email }]) || []
      );

      const profileMap = new Map(
        profiles?.map(p => [p.id, p.display_name]) || []
      );

      const enrichedAdmins = admins?.map(admin => ({
        ...admin,
        user_email: userMap.get(admin.user_id)?.email || null,
        user_name: profileMap.get(admin.user_id) || null,
        granted_by_name: admin.granted_by ? profileMap.get(admin.granted_by) : null,
        granted_by_email: admin.granted_by ? userMap.get(admin.granted_by)?.email : null,
      }));

      return new Response(
        JSON.stringify({ admins: enrichedAdmins }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add a new platform admin
    if (action === "add") {
      if (!user_email) {
        return new Response(
          JSON.stringify({ error: "user_email is required for add action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find user by email
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = authUsers?.users?.find(
        u => u.email?.toLowerCase() === user_email.toLowerCase()
      );

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: `No user found with email: ${user_email}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already an admin
      const { data: existing } = await supabaseAdmin
        .from("platform_admins")
        .select("id")
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "User is already a platform admin" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add as platform admin
      const { data: newAdmin, error: insertError } = await supabaseAdmin
        .from("platform_admins")
        .insert({
          user_id: targetUser.id,
          granted_by: actorUserId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error adding admin:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to add platform admin" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${user_email} is now a platform admin`,
          admin: newAdmin 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove a platform admin
    if (action === "remove") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required for remove action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-removal
      if (user_id === actorUserId) {
        return new Response(
          JSON.stringify({ error: "You cannot remove yourself as a platform admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if there will be at least one admin remaining
      const { count } = await supabaseAdmin
        .from("platform_admins")
        .select("id", { count: "exact", head: true });

      if (count && count <= 1) {
        return new Response(
          JSON.stringify({ error: "Cannot remove the last platform admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("platform_admins")
        .delete()
        .eq("user_id", user_id);

      if (deleteError) {
        console.error("Error removing admin:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to remove platform admin" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Platform admin removed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in manage-platform-admins:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
