import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lodge-session',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let lodgeId: string;

    // Try lodge session token first
    const sessionToken = req.headers.get('x-lodge-session');
    
    if (sessionToken) {
      // Validate lodge session
      const { data: session, error: sessionError } = await supabase
        .from('lodge_sessions')
        .select('lodge_id, expires_at')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired lodge session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lodgeId = session.lodge_id;
    } else {
      // Fall back to Supabase Auth JWT token
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify JWT and get user
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's organization_id (which is the lodge_id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData?.organization_id) {
        return new Response(
          JSON.stringify({ error: 'User not associated with a lodge' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lodgeId = userData.organization_id;
    }

    // Get request body
    const body = await req.json();
    const {
      treeId,
      treeType,
      plantDate,
      latitude,
      longitude,
      locationName,
      growthNotes,
      images,
      status
    } = body;

    if (!treeId) {
      return new Response(
        JSON.stringify({ error: 'Tree ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the tree is assigned to this lodge
    const { data: tree, error: treeError } = await supabase
      .from('trees')
      .select('id, lodge_id')
      .eq('id', treeId)
      .single();

    if (treeError || !tree) {
      return new Response(
        JSON.stringify({ error: 'Tree not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tree.lodge_id !== lodgeId) {
      return new Response(
        JSON.stringify({ error: 'This tree is not assigned to your lodge' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the tree
    const updateData: any = {};
    if (treeType !== undefined) updateData.tree_type = treeType;
    if (plantDate !== undefined) updateData.plant_date = plantDate;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (locationName !== undefined) updateData.location_name = locationName;
    if (growthNotes !== undefined) updateData.growth_notes = growthNotes;
    if (images !== undefined) updateData.images = images;
    if (status !== undefined) updateData.status = status;

    const { data: updatedTree, error: updateError } = await supabase
      .from('trees')
      .update(updateData)
      .eq('id', treeId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tree', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, tree: updatedTree }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
