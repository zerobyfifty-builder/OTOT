import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const { name, email, password, business_name, contact_phone, organization_id } = await req.json()

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the travel_agent role id
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'travel_agent')
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Travel agent role not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user profile in users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        user_id: authData.user.id,
        email,
        role_id: roleData.id,
        organization_id: organization_id || null,
        email_verified: true,
        created_via: 'admin_created'
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    // Update the travel_agents table to link the auth user_id
    // We do this by matching on email after insert
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
        user_id: authData.user.id
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