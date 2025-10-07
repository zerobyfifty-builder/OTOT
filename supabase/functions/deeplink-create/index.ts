import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeepLinkRequest {
  campaign?: string;
  tripId?: string;
  redirectUrl?: string;
  ttlSeconds?: number;
  pledgeContext?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { campaign, tripId, redirectUrl, ttlSeconds = 900, pledgeContext }: DeepLinkRequest = await req.json();

    // Generate random token
    const token = crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Calculate expiry
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Store ephemeral session
    const { error: insertError } = await supabase
      .from("ephemeral_sessions")
      .insert({
        token_hash: tokenHash,
        pledge_context: pledgeContext || { campaign, tripId, redirectUrl },
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error creating ephemeral session:", insertError);
      throw insertError;
    }

    // Generate deep link URL
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://mvp.the1campaign.com") || "https://mvp.the1campaign.com";
    const deepLinkUrl = `${baseUrl}/pledge?token=${token}`;
    const universalLink = `otot://pledge?token=${token}`; // App deep link

    console.log("Deep link created:", { token, expiresAt });

    return new Response(
      JSON.stringify({
        deepLinkUrl,
        universalLink,
        webFallbackUrl: deepLinkUrl,
        token,
        expiresAt: expiresAt.toISOString(),
        ttlSeconds,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in deeplink-create:", error);
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
