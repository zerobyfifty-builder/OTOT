// Edge function: org-invite-user
// Creates an auth user with a chosen password (or updates existing), inserts an org_users row
// with status 'active', and seeds org_user_permissions from role defaults so the user can log in immediately.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANTATION_ROLES = new Set([
  "field_ops","expert","operations_manager","project_manager",
  "community_coordinator","impact_analyst","finance","org_admin",
]);
const GENERIC_ROLES = new Set(["org_admin","finance","project_manager","user"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const body = await req.json();
    const {
      organization_id, email, password, first_name, last_name, position,
      job_role, personal_message, stakeholder_type,
    } = body || {};

    if (!organization_id || !email || !job_role) {
      return new Response(JSON.stringify({ error: "organization_id, email and job_role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!password || String(password).length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allowed = stakeholder_type === "plantation" ? PLANTATION_ROLES : GENERIC_ROLES;
    if (!allowed.has(job_role)) {
      return new Response(JSON.stringify({ error: `Role '${job_role}' is not allowed for ${stakeholder_type} organizations` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Caller (inviter)
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: inviter } } = await caller.auth.getUser();

    // Create or update the auth user with the chosen password and confirm email
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === String(email).toLowerCase());

    if (found) {
      userId = found.id;
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(found.user_metadata || {}),
          first_name: first_name ?? found.user_metadata?.first_name,
          last_name: last_name ?? found.user_metadata?.last_name,
          invited_org: organization_id,
        },
      });
      if (updErr) throw updErr;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, invited_org: organization_id },
      });
      if (createErr) throw createErr;
      userId = created.user?.id ?? null;
    }

    if (!userId) throw new Error("Failed to obtain user id");

    // Upsert org_users row (active so they can log in)
    const nowIso = new Date().toISOString();
    const { data: orgUser, error: insertErr } = await admin
      .from("org_users")
      .upsert({
        organization_id,
        user_id: userId,
        email,
        first_name,
        last_name,
        position,
        job_role,
        personal_message,
        status: "active",
        invited_by: inviter?.id ?? null,
        invited_at: nowIso,
        joined_at: nowIso,
      }, { onConflict: "organization_id,email" })
      .select("id")
      .single();
    if (insertErr) throw insertErr;

    // Seed permissions from role defaults
    const bucket = stakeholder_type === "plantation" ? "plantation" : "generic";
    const { data: defaults } = await admin
      .from("org_job_role_defaults")
      .select("module_name, permissions, sub_features")
      .eq("stakeholder_type", bucket)
      .eq("job_role", job_role);

    const seedRows = (defaults || [])
      .filter((d: any) => d.module_name !== "*")
      .map((d: any) => ({
        org_user_id: orgUser.id,
        module_name: d.module_name,
        enabled: true,
        permissions: d.permissions,
        sub_features: d.sub_features,
      }));
    if (seedRows.length) {
      await admin
        .from("org_user_permissions")
        .upsert(seedRows, { onConflict: "org_user_id,module_name" });
    }

    return new Response(JSON.stringify({ ok: true, org_user_id: orgUser.id, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("org-invite-user error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
