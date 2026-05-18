import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgOwnerType } from "@/hooks/useOrgOwnerType";

interface LogParams {
  action_type: string;
  resource_type?: string | null;
  resource_id?: string | null;
  description?: string;
  metadata?: Record<string, any>;
}

interface CreateLogParams extends LogParams {
  userId: string;
  organizationId?: string | null;
}

export async function resolveUserOrganizationId(userId: string, fallbackOrgId?: string | null) {
  if (fallbackOrgId) return fallbackOrgId;

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (userErr) {
    console.warn("activity log org lookup failed on users", userErr);
  }

  if (userRow?.organization_id) {
    return userRow.organization_id;
  }

  const { data: orgUserRow, error: orgUserErr } = await supabase
    .from("org_users")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orgUserErr) {
    console.warn("activity log org lookup failed on org_users", orgUserErr);
  }

  return orgUserRow?.organization_id ?? null;
}

export async function createActivityLogEntry({
  userId,
  organizationId,
  action_type,
  resource_type,
  resource_id,
  description,
  metadata,
}: CreateLogParams) {
  const resolvedOrganizationId = await resolveUserOrganizationId(userId, organizationId);

  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId,
    organization_id: resolvedOrganizationId,
    action_type,
    resource_type: resource_type ?? null,
    resource_id: resource_id ?? null,
    metadata: {
      description: description ?? action_type,
      ...(metadata || {}),
    },
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (error) {
    console.warn("activity log failed", error);
    return false;
  }

  return true;
}

export function useActivityLogger() {
  const { user } = useAuth();
  const { data: orgCtx } = useOrgOwnerType();
  const organizationId = orgCtx?.organizationId ?? null;

  const logActivity = useCallback(
    async (params: LogParams) => {
      if (!user) return false;

      return createActivityLogEntry({
        userId: user.id,
        organizationId,
        ...params,
      });
    },
    [user, organizationId]
  );

  return { logActivity };
}

export function useAutoPageViewLogger() {
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();
  const location = useLocation();
  const lastLogged = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    const path = location.pathname + location.search;
    if (lastLogged.current === path) return;

    let cancelled = false;

    (async () => {
      const ok = await logActivity({
        action_type: "page_view",
        resource_type: "route",
        description: `Viewed ${location.pathname}`,
        metadata: { path: location.pathname, search: location.search },
      });

      if (!cancelled && ok) {
        lastLogged.current = path;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, user, logActivity]);
}
