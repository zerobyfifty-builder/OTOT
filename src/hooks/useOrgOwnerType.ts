import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type OwnerType = "plantation" | "institutional" | "technology" | "other";

export interface OrgContext {
  organizationId: string | null;
  organizationName: string | null;
  ownerType: OwnerType;
  /** Bucket used for role-default lookups: 'plantation' | 'generic' */
  defaultsBucket: "plantation" | "generic";
}

export function useOrgOwnerType() {
  const { user } = useAuth();

  return useQuery<OrgContext>({
    queryKey: ["orgOwnerType", user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          organizationId: null,
          organizationName: null,
          ownerType: "other" as OwnerType,
          defaultsBucket: "generic" as const,
        };
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const orgId = userRow?.organization_id ?? null;
      if (!orgId) {
        return {
          organizationId: null,
          organizationName: null,
          ownerType: "other" as OwnerType,
          defaultsBucket: "generic" as const,
        };
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, category, partner_types(name, category)")
        .eq("id", orgId)
        .maybeSingle();

      const ptCategory = ((org as any)?.partner_types?.category || "").toLowerCase();
      const ptName = ((org as any)?.partner_types?.name || "").toLowerCase();
      const orgCategory = (org?.category || "").toLowerCase();

      let ownerType: OwnerType = "other";
      const haystack = `${orgCategory} ${ptCategory} ${ptName}`;
      if (haystack.includes("plantation")) ownerType = "plantation";
      else if (haystack.includes("institutional") || haystack.includes("ktb")) ownerType = "institutional";
      else if (haystack.includes("technology") || haystack.includes("tech")) ownerType = "technology";

      return {
        organizationId: orgId,
        organizationName: org?.name ?? null,
        ownerType,
        defaultsBucket: ownerType === "plantation" ? "plantation" : "generic",
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export const PLANTATION_ROLES = [
  { key: "field_ops", label: "Field Ops" },
  { key: "expert", label: "Expert" },
  { key: "operations_manager", label: "Operations Manager" },
  { key: "project_manager", label: "Project Manager" },
  { key: "community_coordinator", label: "Community Coordinator" },
  { key: "impact_analyst", label: "Impact Analyst" },
  { key: "finance", label: "Finance" },
  { key: "org_admin", label: "Admin" },
] as const;

export const GENERIC_ROLES = [
  { key: "org_admin", label: "Admin" },
  { key: "finance", label: "Finance" },
  { key: "project_manager", label: "Project Manager" },
  { key: "marketing", label: "Marketing (PR)" },
  { key: "user", label: "Staff" },
] as const;

export function getRolesForOwnerType(t: OwnerType) {
  return t === "plantation" ? PLANTATION_ROLES : GENERIC_ROLES;
}

export const ROLE_LABELS: Record<string, string> = {
  field_ops: "Field Ops",
  expert: "Expert",
  operations_manager: "Operations Manager",
  project_manager: "Project Manager",
  community_coordinator: "Community Coordinator",
  impact_analyst: "Impact Analyst",
  finance: "Finance",
  marketing: "Marketing (PR)",
  org_admin: "Admin",
  user: "Staff",
};
