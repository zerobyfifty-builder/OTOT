// Server-side lodge login. Verifies username/password against bcrypt hashes in
// lodge_credentials (via the verify_lodge_password SECURITY DEFINER function),
// then issues a lodge_sessions token. The password hash never leaves the DB and
// is never sent to the browser. Reachable pre-auth (verify_jwt = false); it does
// its own credential check with the service role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const SESSION_DAYS = 7

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return json({ error: 'Username and password are required' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // bcrypt verification happens inside Postgres. Returns lodge_id or null.
    const { data: lodgeId, error: verifyErr } = await admin
      .rpc('verify_lodge_password', { _username: username, _password: password })
    if (verifyErr) throw verifyErr
    if (!lodgeId) return json({ error: 'Invalid username or password' }, 401)

    const { data: lodge, error: lodgeErr } = await admin
      .from('lodges')
      .select('id, name, location')
      .eq('id', lodgeId)
      .single()
    if (lodgeErr || !lodge) return json({ error: 'Invalid username or password' }, 401)

    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()
    const { error: sessErr } = await admin
      .from('lodge_sessions')
      .insert({ lodge_id: lodgeId, session_token: sessionToken, expires_at: expiresAt })
    if (sessErr) throw sessErr

    return json({
      sessionToken,
      expiresAt,
      lodge: { id: lodge.id, name: lodge.name, location: lodge.location, username },
    })
  } catch (error: any) {
    console.error('lodge-login error:', error)
    return json({ error: error?.message || 'Unknown error' }, 500)
  }
})
