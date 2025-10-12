import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to verify they're logged in
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the requesting user is a super admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role_id, roles!inner(name)')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData || (userData as any).roles?.name !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only super admins can delete users.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Delete from users table first (this will cascade to related tables via foreign keys)
    const { error: deleteUserError } = await adminClient
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (deleteUserError) {
      console.error('Error deleting user from users table:', deleteUserError);
    }

    // Delete the auth user (this will cascade to auth-related tables)
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return new Response(
        JSON.stringify({ error: deleteAuthError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'User and all related data deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
