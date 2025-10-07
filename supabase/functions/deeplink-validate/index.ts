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
    const token = url.searchParams.get("token");

    if (!token) {
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
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Validate token
    const { data: session, error } = await supabase
      .from("ephemeral_sessions")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("consumed", false)
      .single();

    if (error || !session) {
      console.error("Invalid or expired token:", error);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token has expired" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate ephemeral JWT (15 min validity)
    const ephemeralToken = crypto.randomUUID();
    const ephemeralTokenHash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(ephemeralToken)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    // Mark session as consumed and update with ephemeral token
    await supabase
      .from("ephemeral_sessions")
      .update({ consumed: true })
      .eq("id", session.id);

    console.log("Deep link validated successfully:", { sessionId: session.id });

    return new Response(
      JSON.stringify({
        ephemeral_token: ephemeralToken,
        pledge_context: session.pledge_context,
        expires_in: 900, // 15 minutes
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in deeplink-validate:", error);
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
