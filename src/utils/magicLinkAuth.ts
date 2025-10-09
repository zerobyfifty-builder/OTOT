import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://mvp.the1campaign.com";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllemhzc2Z6Yml3bm9maHBqYWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzk4NDEsImV4cCI6MjA3NDcxNTg0MX0.lZ6mVrCKrSxza6dsbMS_2Yq5hY-trUAb-hzZGcdrcD8";

export interface PledgeContext {
  numTrees?: number;
  tripId?: string;
  amount?: number;
  redirectUrl?: string;
  campaign?: string;
}

/**
 * Request a magic link to be sent to the user's email
 */
export async function sendMagicLink(
  email: string,
  pledgeContext?: PledgeContext
): Promise<{ success: boolean; error?: string; devLink?: string }> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/magic-link-send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          pledgeContext,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to send magic link" };
    }

    return {
      success: true,
      devLink: data._dev_magic_link, // Only present in development
    };
  } catch (error: any) {
    console.error("Error sending magic link:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

/**
 * Create a deep link for sharing (QR codes, campaigns)
 */
export async function createDeepLink(params: {
  campaign?: string;
  tripId?: string;
  redirectUrl?: string;
  ttlSeconds?: number;
  pledgeContext?: any;
}): Promise<{ deepLinkUrl?: string; universalLink?: string; error?: string }> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/deeplink-create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(params),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Failed to create deep link" };
    }

    return {
      deepLinkUrl: data.deepLinkUrl,
      universalLink: data.universalLink,
    };
  } catch (error: any) {
    console.error("Error creating deep link:", error);
    return { error: error.message || "Network error" };
  }
}

/**
 * Validate a deep link token and get ephemeral session
 */
export async function validateDeepLink(
  token: string
): Promise<{ ephemeralToken?: string; pledgeContext?: any; error?: string }> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/deeplink-validate?token=${token}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Invalid or expired link" };
    }

    return {
      ephemeralToken: data.ephemeral_token,
      pledgeContext: data.pledge_context,
    };
  } catch (error: any) {
    console.error("Error validating deep link:", error);
    return { error: error.message || "Network error" };
  }
}

/**
 * Set password for passwordless account (optional upgrade)
 */
export async function setPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/set-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to set password" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error setting password:", error);
    return { success: false, error: error.message || "Network error" };
  }
}
