// Shared authorization helpers for privileged Edge Functions.
//
// Files prefixed with `_` are not deployed as functions but can be imported by
// sibling functions. Centralizing the JWT + role check here keeps the security-
// critical logic in one reviewed place instead of copy-pasted per function.
//
// Pattern mirrors the previously-correct gate in admin-set-user-password and
// delete-user: verify the caller's JWT with the anon key, then resolve their
// role/org with the service-role client BEFORE performing any privileged work.
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export interface CallerContext {
  user: User
  /** Service-role client. Only use AFTER an authorization decision has passed. */
  admin: SupabaseClient
  /** Caller's platform role from public.users -> roles.name (may be null). */
  role: string | null
  /** Caller's public.users.organization_id (may be null). */
  organizationId: string | null
}

/**
 * Verify the request's JWT and load the caller's profile (role + org).
 * Returns { ctx } on success or { error } — a Response the handler returns as-is.
 */
export async function authenticate(
  req: Request,
): Promise<{ ctx: CallerContext } | { error: Response }> {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!authHeader) return { error: json({ error: 'Unauthorized' }, 401) }

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return { error: json({ error: 'Unauthorized' }, 401) }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await admin
    .from('users')
    .select('organization_id, roles!inner(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    ctx: {
      user,
      admin,
      role: (profile as any)?.roles?.name ?? null,
      organizationId: (profile as any)?.organization_id ?? null,
    },
  }
}

/** Platform-wide admins. */
export function isPlatformAdmin(role: string | null): boolean {
  return role === 'super_admin' || role === 'admin'
}

/**
 * True when the caller may administer `targetOrgId`: a platform admin, the org
 * owner (public.users.organization_id matches and role 'owner'), or an active
 * org_admin in org_users. Mirrors the client-side useIsOrgAdmin hook.
 */
export async function isOrgAdminOf(
  ctx: CallerContext,
  targetOrgId: string,
): Promise<boolean> {
  if (isPlatformAdmin(ctx.role)) return true
  if (ctx.role === 'owner' && ctx.organizationId === targetOrgId) return true
  const { data: row } = await ctx.admin
    .from('org_users')
    .select('job_role, status')
    .eq('organization_id', targetOrgId)
    .eq('user_id', ctx.user.id)
    .maybeSingle()
  return (row as any)?.job_role === 'org_admin' && (row as any)?.status === 'active'
}
