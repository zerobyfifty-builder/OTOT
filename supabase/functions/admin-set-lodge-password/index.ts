// Admin-only: set/reset a lodge's login username + password (bcrypt-hashed via
// the set_lodge_password SECURITY DEFINER function). Gated to platform admins by
// the shared authenticate()+isPlatformAdmin check.
import { authenticate, corsHeaders, isPlatformAdmin, json } from '../_shared/authz.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const auth = await authenticate(req)
    if ('error' in auth) return auth.error
    if (!isPlatformAdmin(auth.ctx.role)) return json({ error: 'Forbidden - admin only' }, 403)

    const { lodge_id, username, password } = await req.json()
    if (!lodge_id || !username || !password) {
      return json({ error: 'lodge_id, username and password are required' }, 400)
    }
    if (String(password).length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400)
    }

    // Confirm the lodge exists before writing credentials.
    const { data: lodge } = await auth.ctx.admin
      .from('lodges').select('id').eq('id', lodge_id).maybeSingle()
    if (!lodge) return json({ error: 'Lodge not found' }, 404)

    const { error: rpcErr } = await auth.ctx.admin
      .rpc('set_lodge_password', { _lodge_id: lodge_id, _username: username, _password: password })
    if (rpcErr) {
      // Unique-violation on username surfaces here.
      if ((rpcErr as any).code === '23505') return json({ error: 'Username already in use' }, 409)
      throw rpcErr
    }

    return json({ success: true })
  } catch (error: any) {
    console.error('admin-set-lodge-password error:', error)
    return json({ error: error?.message || 'Unknown error' }, 500)
  }
})
