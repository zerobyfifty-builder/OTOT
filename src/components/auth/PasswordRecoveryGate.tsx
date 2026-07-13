import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Captured at module load — BEFORE the Supabase client's `detectSessionInUrl`
// consumes and clears the URL hash. A password-recovery link lands with
// `type=recovery` in the hash (implicit flow) or the query string (PKCE).
const initialUrl = `${window.location.hash}${window.location.search}`;
const HAD_RECOVERY_TOKEN = /(?:[#&?])type=recovery(?:&|$)/.test(initialUrl);

/**
 * Ensures a Supabase password-recovery link always lands on the reset-password
 * form. If the recovery `redirect_to` isn't allow-listed, Supabase falls back to
 * the Site URL (the app root), which would otherwise just open the application
 * with a live recovery session instead of showing the reset screen. This gate
 * detects the recovery session and routes to /auth/reset-password regardless of
 * where the link landed.
 *
 * Mounted once inside the Router (see App.tsx).
 */
export const PasswordRecoveryGate = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const goToReset = () => {
      if (window.location.pathname !== '/auth/reset-password') {
        navigate('/auth/reset-password', { replace: true });
      }
    };

    // Case 1: the recovery token was already in the URL when the app loaded
    // (e.g. Supabase redirected to the Site URL root instead of the reset page).
    if (HAD_RECOVERY_TOKEN) {
      goToReset();
    }

    // Case 2: Supabase emits PASSWORD_RECOVERY once it processes the link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        goToReset();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};
