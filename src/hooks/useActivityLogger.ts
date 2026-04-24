import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgStakeholderType } from "@/hooks/useOrgStakeholderType";

interface LogParams {
  action_type: string;
  resource_type?: string | null;
  resource_id?: string | null;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Central activity logger. Writes to public.activity_logs scoped to the user's
 * organization so org-admins (and super-admins) can review actions.
 *
 * - Auto-logs page navigations for authenticated org users.
 * - Exposes logActivity() for explicit action logging.
 */
export function useActivityLogger() {
  const { user } = useAuth();
  const { data: orgCtx } = useOrgStakeholderType();
  const organizationId = orgCtx?.organizationId ?? null;

  const logActivity = useCallback(
    async (params: LogParams) => {
      try {
        if (!user) return;
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          organization_id: organizationId,
          action_type: params.action_type,
          resource_type: params.resource_type ?? null,
          resource_id: params.resource_id ?? null,
          metadata: {
            description: params.description ?? params.action_type,
            ...(params.metadata || {}),
          },
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
      } catch (e) {
        // Never break UX because of logging
        console.warn("activity log failed", e);
      }
    },
    [user, organizationId]
  );

  return { logActivity };
}

/**
 * Mount once at the top of an authenticated layout to auto-log page views.
 */
export function useAutoPageViewLogger() {
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();
  const location = useLocation();
  const lastLogged = useRef<string>("");

  useEffect(() => {
    if (!user) return;
    const path = location.pathname + location.search;
    if (lastLogged.current === path) return;
    lastLogged.current = path;
    logActivity({
      action_type: "page_view",
      resource_type: "route",
      description: `Viewed ${location.pathname}`,
      metadata: { path: location.pathname, search: location.search },
    });
  }, [location.pathname, location.search, user, logActivity]);
}
