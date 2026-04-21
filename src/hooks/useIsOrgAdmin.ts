import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useOrgStakeholderType } from "./useOrgStakeholderType";

/**
 * Returns true when the current user is the org owner (their `users.organization_id`
 * matches and no org_users row exists yet) OR has an active org_users row with
 * job_role = 'org_admin'.
 */
export function useIsOrgAdmin() {
  const { user } = useAuth();
  const { data: orgCtx } = useOrgStakeholderType();

  return useQuery({
    queryKey: ["isOrgAdmin", user?.id, orgCtx?.organizationId],
    queryFn: async () => {
      if (!user || !orgCtx?.organizationId) return false;

      const { data: row } = await supabase
        .from("org_users")
        .select("job_role, status")
        .eq("organization_id", orgCtx.organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (row) return row.job_role === "org_admin" && row.status === "active";

      // Fallback: org owner (user has organization_id but no org_users entry yet)
      return true;
    },
    enabled: !!user && !!orgCtx?.organizationId,
    staleTime: 60 * 1000,
  });
}
