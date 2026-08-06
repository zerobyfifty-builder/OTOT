import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AppRole,
  CURRENT_PORTAL,
  currentPortal,
  isRoleAllowedOnPortal,
  normalizeRole,
  portalHomePath,
  resolvePortalForPath,
} from '@/lib/portal';

/**
 * Enforces host-based portal separation (see `src/lib/portal.ts`):
 *
 * 1. Routes owned by another portal are not served on this host.
 * 2. A session whose role belongs to another portal is signed out — the
 *    tourist app and the ministry/vendor apps are not reachable from each
 *    other even though they share one Supabase project.
 *
 * The role check fails open: an RPC error leaves the session alone and lets
 * the per-route guards decide, so a transient network blip can't lock anyone
 * out of their own portal.
 */
export const PortalGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  // undefined = not resolved yet, null = no session to check.
  const [role, setRole] = useState<AppRole | undefined | null>(user ? undefined : null);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    if (!user) {
      setRole(null);
      return;
    }

    setRole(undefined);

    supabase
      .rpc('get_user_role', { input_user_id: user.id })
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error('[PORTAL_GATE] Could not resolve role, leaving session alone:', error);
          setRole(null);
          return;
        }

        const resolved = normalizeRole(data);
        setRole(resolved);

        if (!isRoleAllowedOnPortal(resolved)) {
          console.warn(
            `[PORTAL_GATE] Role "${resolved}" is not allowed on the ${CURRENT_PORTAL} portal — signing out.`,
          );
          toast.error('These credentials are not valid for this portal.');
          void supabase.auth.signOut();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const pathOwner = resolvePortalForPath(location.pathname);
  const pathBelongsElsewhere = pathOwner !== null && pathOwner !== CURRENT_PORTAL;

  if (pathBelongsElsewhere) {
    // Wait for the role before choosing where to send a signed-in user, so an
    // allowed user lands on their dashboard rather than back at the login form.
    if (user && role === undefined) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    const target = role ? portalHomePath(role) : currentPortal.entryPath;
    if (target !== location.pathname) {
      return <Navigate to={target} replace />;
    }
  }

  return <>{children}</>;
};
