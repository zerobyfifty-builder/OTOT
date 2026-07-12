import { authenticate, corsHeaders, isPlatformAdmin, json } from '../_shared/authz.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // AuthZ: platform admins may create any agent; a government_partner may only
    // create agents within their own organization.
    const auth = await authenticate(req)
    if ('error' in auth) return auth.error
    const supabaseAdmin = auth.ctx.admin

    const { name, email, password, business_name, contact_phone, mobile_number, reference_id, organization_id } = await req.json()

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const canCreate = isPlatformAdmin(auth.ctx.role) ||
      (auth.ctx.role === 'government_partner' &&
        !!organization_id && organization_id === auth.ctx.organizationId)
    if (!canCreate) return json({ error: 'Forbidden' }, 403)

    // Get the travel_agent role id
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'travel_agent')
      .single()

    if (roleError || !roleData) {
      console.error('Role lookup error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Travel agent role not found. Please ensure the travel_agent role exists in the roles table.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let userId: string

    // Try to create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (authError) {
      // If user already exists, look them up and update their password
      if (authError.message.includes('already been registered')) {
        console.log('User already exists, looking up by email:', email)
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          console.error('Error listing users:', listError)
          return new Response(
            JSON.stringify({ error: 'Failed to look up existing user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const existingUser = listData.users.find(u => u.email === email)
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: 'User reportedly exists but could not be found' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        userId = existingUser.id

        // Update the existing user's password and metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { full_name: name },
          email_confirm: true
        })

        if (updateError) {
          console.error('Error updating existing user:', updateError)
        }
      } else {
        console.error('Auth create error:', authError)
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      userId = authData.user.id
    }

    // Create/update user profile in users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        user_id: userId,
        email,
        role_id: roleData.id,
        organization_id: organization_id || null,
        email_verified: true,
        created_via: 'admin_created'
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    // Update the travel_agents table
    const { error: agentUpdateError } = await supabaseAdmin
      .from('travel_agents')
      .update({ password_hash: '__supabase_auth__' })
      .eq('email', email)

    if (agentUpdateError) {
      console.error('Error updating agent record:', agentUpdateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Travel agent user created successfully',
        user_id: userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
