// Revokes a lodge session token (deletes the lodge_sessions row) with the
// service role, since clients no longer have direct access to that table.
// Reachable pre-auth (verify_jwt = false); knowing the token is the authority
// to revoke it.
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
    const { sessionToken } = await req.json()
    if (!sessionToken) return json({ success: true })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    await admin.from('lodge_sessions').delete().eq('session_token', sessionToken)
    return json({ success: true })
  } catch (error: any) {
    console.error('lodge-logout error:', error)
    return json({ success: true })
  }
})
