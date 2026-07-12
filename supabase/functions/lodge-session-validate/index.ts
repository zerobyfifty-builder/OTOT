// Validates a lodge session token against lodge_sessions (service role) and
// returns the lodge profile if the token is present and unexpired. Replaces the
// old client-side lodge_sessions read, which required anon SELECT access.
// Reachable pre-auth (verify_jwt = false).
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { sessionToken, lodgeId } = await req.json()
    if (!sessionToken || !lodgeId) return json({ valid: false }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: session } = await admin
      .from('lodge_sessions')
      .select('lodge_id, expires_at, lodges(id, name, location)')
      .eq('session_token', sessionToken)
      .eq('lodge_id', lodgeId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!session) return json({ valid: false }, 401)

    const lodge = Array.isArray((session as any).lodges)
      ? (session as any).lodges[0]
      : (session as any).lodges
    const { data: cred } = await admin
      .from('lodge_credentials')
      .select('username')
      .eq('lodge_id', session.lodge_id)
      .maybeSingle()

    return json({
      valid: true,
      lodge: {
        id: lodge?.id,
        name: lodge?.name,
        location: lodge?.location,
        username: cred?.username ?? null,
      },
    })
  } catch (error: any) {
    console.error('lodge-session-validate error:', error)
    return json({ valid: false, error: error?.message || 'Unknown error' }, 500)
  }
})
