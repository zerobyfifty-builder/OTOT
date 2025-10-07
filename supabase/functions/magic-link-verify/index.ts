import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawToken = url.searchParams.get("token");

    if (!rawToken) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Hash the token
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const magicTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Validate token
    const { data: magicToken, error: tokenError } = await supabase
      .from("magic_tokens")
      .select("*")
      .eq("token_hash", magicTokenHash)
      .is("consumed_at", null)
      .single();

    if (tokenError || !magicToken) {
      await supabase.from("auth_logs").insert({
        event_type: "magic_link_verify_failed",
        email: null,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { reason: "invalid_token" },
      });

      return new Response(
        JSON.stringify({ error: "Invalid or already used token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiry
    if (new Date(magicToken.expires_at) < new Date()) {
      await supabase.from("auth_logs").insert({
        event_type: "magic_link_verify_failed",
        email: magicToken.email,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { reason: "expired" },
      });

      return new Response(
        JSON.stringify({ error: "Token has expired. Please request a new one." }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark token as consumed
    await supabase
      .from("magic_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", magicToken.id);

    const email = magicToken.email;

    // Check if user exists
    const { data: { users }, error: userListError } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log("Existing user found:", userId);
    } else {
      // Create new user silently
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Mark email as verified
        user_metadata: { created_via: "magic_link" },
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("New user created:", userId);

      // Create user profile
      await supabase.from("users").insert({
        user_id: userId,
        email: email,
        email_verified: true,
        created_via: "magic_link",
      });
    }

    // Update last login
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString(), email_verified: true })
      .eq("user_id", userId);

    // Handle pledge context - save to database
    if (magicToken.pledge_context) {
      const pledgeContext = magicToken.pledge_context;
      
      // If there's tree/pledge data, create or update it
      if (pledgeContext.numTrees || pledgeContext.tripId) {
        const treeData: any = {
          user_id: userId,
          num_trees: pledgeContext.numTrees || 1,
          purchase_type: "Direct",
          amount_paid: pledgeContext.amount || 0,
          pledge_status: "confirmed",
          status: "Waiting to be Assigned",
        };

        if (pledgeContext.tripId) {
          treeData.trip_id = pledgeContext.tripId;
        }

        const { error: treeError } = await supabase.from("trees").insert(treeData);
        
        if (treeError) {
          console.error("Error creating tree record:", treeError);
        }
      }

      // Update pledge status
      await supabase
        .from("users")
        .update({ 
          pledge_status: true, 
          pledge_date: new Date().toISOString() 
        })
        .eq("user_id", userId);
    }

    // Generate a magiclink authentication URL
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });

    if (linkError || !linkData) {
      console.error("Error generating magiclink:", linkError);
      throw linkError;
    }

    // Use the action_link directly for authentication
    const authUrl = linkData.properties.action_link;

    // Log successful verification
    await supabase.from("auth_logs").insert({
      event_type: "magic_link_verified",
      email: email,
      success: true,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { 
        is_new_user: isNewUser,
        has_pledge_context: !!magicToken.pledge_context,
      },
    });

    console.log("Magic link verified successfully for:", email);

    // Return the authentication URL for client-side redirect
    const redirectUrl = magicToken.pledge_context?.redirectUrl || "/dashboard";

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        userId,
        email,
        authUrl,
        redirectUrl,
        pledgeContext: magicToken.pledge_context,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in magic-link-verify:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
