import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLinkRequest {
  email: string;
  pledgeContext?: any;
  deviceFingerprint?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, pledgeContext, deviceFingerprint }: MagicLinkRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Rate limiting check - max 5 per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentTokens } = await supabase
      .from("magic_tokens")
      .select("id")
      .eq("email", email.toLowerCase())
      .gte("created_at", oneHourAgo.toISOString());

    if (recentTokens && recentTokens.length >= 5) {
      await supabase.from("auth_logs").insert({
        event_type: "magic_link_rate_limited",
        email: email.toLowerCase(),
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate secure random token
    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store hashed token
    const { error: insertError } = await supabase
      .from("magic_tokens")
      .insert({
        email: email.toLowerCase(),
        token_hash: tokenHash,
        pledge_context: pledgeContext,
        expires_at: expiresAt.toISOString(),
        device_fingerprint: deviceFingerprint,
      });

    if (insertError) {
      console.error("Error creating magic token:", insertError);
      throw insertError;
    }

    // Generate magic link (universal link that works for both app and web).
    // Magic links are a tourist-portal flow, so this points at the public app
    // domain — set PUBLIC_APP_URL as a function secret.
    const baseUrl = (Deno.env.get("PUBLIC_APP_URL") || "https://www.onetouristonetree.com")
      .replace(/\/$/, "");
    const magicLinkUrl = `${baseUrl}/auth/magic?token=${rawToken}`;

    // Log the event
    await supabase.from("auth_logs").insert({
      event_type: "magic_link_sent",
      email: email.toLowerCase(),
      success: true,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { has_pledge_context: !!pledgeContext },
    });

    // TODO: Send email with magic link
    // For now, we'll use Supabase's built-in OTP as fallback
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        emailRedirectTo: magicLinkUrl,
      },
    });

    if (otpError) {
      console.error("Error sending OTP:", otpError);
    }

    console.log("Magic link created for:", email, "Token:", rawToken.substring(0, 10) + "...");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Magic link sent to your email",
        expiresAt: expiresAt.toISOString(),
        // For development only - remove in production
        _dev_magic_link: Deno.env.get("ENVIRONMENT") === "development" ? magicLinkUrl : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in magic-link-send:", error);
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
