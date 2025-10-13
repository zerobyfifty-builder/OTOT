import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create or update the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'lodge@the1campaign.com',
      password: 'test1234',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Safari Lodge'
      }
    })

    if (authError) {
      // If user already exists, update the password
      if (authError.message.includes('already exists')) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === 'lodge@the1campaign.com')
        
        if (existingUser) {
          const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            {
              password: 'test1234',
              email_confirm: true
            }
          )
          
          if (updateError) {
            console.error('Error updating user:', updateError)
            return new Response(
              JSON.stringify({ error: updateError.message }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Update users table
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .upsert({
              user_id: existingUser.id,
              email: 'lodge@the1campaign.com',
              role_id: (await supabaseAdmin.from('roles').select('id').eq('name', 'business_partner').single()).data?.id,
              organization_id: '11111111-1111-1111-1111-111111111111',
              email_verified: true,
              created_via: 'manual'
            })

          if (profileError) {
            console.error('Error updating profile:', profileError)
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Lodge user password updated and profile linked',
              user: updateData
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }

      console.error('Error creating user:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create user profile in users table
    const roleResult = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'business_partner')
      .single()

    if (roleResult.error || !roleResult.data) {
      console.error('Error fetching role:', roleResult.error)
      return new Response(
        JSON.stringify({ error: 'Business partner role not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        user_id: authData.user.id,
        email: 'lodge@the1campaign.com',
        role_id: roleResult.data.id,
        organization_id: '11111111-1111-1111-1111-111111111111',
        email_verified: true,
        created_via: 'manual'
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lodge user created successfully',
        user: authData.user
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
