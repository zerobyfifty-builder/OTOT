import { authenticate, corsHeaders, isPlatformAdmin, json } from '../_shared/authz.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // AuthZ: only platform admins may create partner accounts.
    const auth = await authenticate(req)
    if ('error' in auth) return auth.error
    if (!isPlatformAdmin(auth.ctx.role)) return json({ error: 'Forbidden - admin only' }, 403)
    const supabaseAdmin = auth.ctx.admin

    const { name, email, password, organization_id, category } = await req.json()

    if (!name || !email || !password || !organization_id || !category) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const roleName = (category === 'government' || category === 'ngo') ? 'government_partner' : 'business_partner'

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles').select('id').eq('name', roleName).single()

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: `${roleName} role not found` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let userId: string
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
        const existing = listData?.users.find(u => u.email === email)
        if (!existing) {
          return new Response(JSON.stringify({ error: 'User exists but not found' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        userId = existing.id
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password, user_metadata: { full_name: name }, email_confirm: true
        })
      } else {
        return new Response(JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      userId = authData.user.id
    }

    const { error: profileError } = await supabaseAdmin.from('users').upsert({
      user_id: userId, email, role_id: roleData.id,
      organization_id, email_verified: true, created_via: 'admin_created',
    }, { onConflict: 'user_id' })

    if (profileError) console.error('Profile error:', profileError)

    return new Response(JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
