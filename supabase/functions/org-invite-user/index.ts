// Edge function: org-invite-user
// Creates an auth user (or reuses existing), inserts an org_users row with status 'pending',
// seeds org_user_permissions from role defaults, and sends a magic-link / set-password link.
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
      organization_id, email, first_name, last_name, position,
      job_role, personal_message, stakeholder_type,
    } = body || {};

    if (!organization_id || !email || !job_role) {
      return new Response(JSON.stringify({ error: "organization_id, email and job_role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate role ↔ stakeholder type
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

    // Try to find or create the auth user
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === String(email).toLowerCase());
    if (found) {
      userId = found.id;
    } else {
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: { first_name, last_name, invited_org: organization_id },
      });
      if (createErr) throw createErr;
      userId = created.user?.id ?? null;
    }

    // Insert org_users row
    const { data: orgUser, error: insertErr } = await admin
      .from("org_users")
      .insert({
        organization_id,
        user_id: userId,
        email,
        first_name,
        last_name,
        position,
        job_role,
        personal_message,
        status: "pending",
        invited_by: inviter?.id ?? null,
        invited_at: new Date().toISOString(),
      })
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
      await admin.from("org_user_permissions").insert(seedRows);
    }

    // Send magic link / invite email
    const redirectTo = `${req.headers.get("origin") || ""}/auth/callback`;
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (linkErr) console.error("generateLink error:", linkErr.message);

    return new Response(JSON.stringify({ ok: true, org_user_id: orgUser.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("org-invite-user error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
