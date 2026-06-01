import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ModulePermissions {
  isEnabled: boolean;
  hasRead: boolean;
  hasWrite: boolean;
  hasEdit: boolean;
  hasDelete: boolean;
  accessType: "shared" | "scoped";
  subFeatures: Record<string, boolean>;
  /** True when sub-feature visibility is restricted to explicitly-enabled keys
   *  (i.e., a per-role permission override exists). When false, missing keys
   *  default to enabled (org-level/admin access grants full feature visibility). */
  hasUserOverride: boolean;
  isLoading: boolean;
}

const ALL_TREE_ORDERS_SUBS: Record<string, boolean> = {
  "tree_orders.action.planting_status": true,
  "tree_orders.action.per_tree_status": true,
  "tree_orders.action.tree_operations": true,
  "tree_orders.action.planting_overview": true,
  "tree_orders.action.monitoring_logs": true,
  "tree_orders.action.ecosystem_impact": true,
  "tree_orders.action.community_impact": true,
  "tree_orders.action.carbon_metrics": true,
  "tree_orders.action.engagement": true,
};

export function useModulePermissions(moduleName: string): ModulePermissions {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["modulePermissions", user?.id, moduleName],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();

      if (!userData?.organization_id) return null;

      const { data: moduleData } = await supabase
        .from("modules")
        .select("id, name, access_type")
        .eq("name", moduleName)
        .eq("is_active", true)
        .single();

      if (!moduleData) return null;

      const { data: orgModule } = await supabase
        .from("organization_modules")
        .select("permissions, is_active")
        .eq("organization_id", userData.organization_id)
        .eq("module_id", moduleData.id)
        .eq("is_active", true)
        .single();

      if (!orgModule) return null;

      const orgPermissions = (orgModule.permissions as string[]) || [];

      // Resolve via the user's custom role.
      const { data: orgUserRow } = await supabase
        .from("org_users")
        .select("id, status, custom_role_id")
        .eq("organization_id", userData.organization_id)
        .eq("user_id", user!.id)
        .maybeSingle();

      let rolePerm: any = null;
      let isAdminRole = false;
      let hasRole = false;

      if (orgUserRow && orgUserRow.status === "active" && orgUserRow.custom_role_id) {
        hasRole = true;
        const { data: roleRow } = await supabase
          .from("org_custom_roles" as any)
          .select("id, is_system, mapped_job_role")
          .eq("id", orgUserRow.custom_role_id)
          .maybeSingle();

        if (roleRow && (roleRow as any).is_system && (roleRow as any).mapped_job_role === "org_admin") {
          isAdminRole = true;
        } else {
          const { data: pRow } = await supabase
            .from("org_role_permissions" as any)
            .select("enabled, permissions, sub_features")
            .eq("role_id", orgUserRow.custom_role_id)
            .eq("module_name", moduleName)
            .maybeSingle();
          rolePerm = pRow;
        }
      }

      return {
        accessType: (moduleData as any).access_type || "shared",
        orgPermissions,
        rolePerm,
        isAdminRole,
        hasRole,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading || !data) {
    return {
      isEnabled: false, hasRead: false, hasWrite: false, hasEdit: false, hasDelete: false,
      accessType: "shared", subFeatures: {}, hasUserOverride: false, isLoading,
    };
  }

  // Admin role → full access
  if (data.isAdminRole) {
    return {
      isEnabled: true, hasRead: true, hasWrite: true, hasEdit: true, hasDelete: true,
      accessType: data.accessType as "shared" | "scoped",
      subFeatures: ALL_TREE_ORDERS_SUBS,
      hasUserOverride: false,
      isLoading: false,
    };
  }

  // User has a non-admin custom role → strict opt-in via role permissions row
  if (data.hasRole) {
    if (!data.rolePerm) {
      return {
        isEnabled: false, hasRead: false, hasWrite: false, hasEdit: false, hasDelete: false,
        accessType: data.accessType as "shared" | "scoped",
        subFeatures: {}, hasUserOverride: true, isLoading: false,
      };
    }
    const p = data.rolePerm.permissions || {};
    return {
      isEnabled: !!data.rolePerm.enabled,
      hasRead: !!p.read, hasWrite: !!p.write, hasEdit: !!p.edit, hasDelete: !!p.delete,
      accessType: data.accessType as "shared" | "scoped",
      subFeatures: (data.rolePerm.sub_features as Record<string, boolean>) || {},
      hasUserOverride: true,
      isLoading: false,
    };
  }

  // Fallback: no role assigned (e.g. org owner) → grant org-level access fully.
  return {
    isEnabled: true,
    hasRead: data.orgPermissions.includes("read"),
    hasWrite: data.orgPermissions.includes("write"),
    hasEdit: data.orgPermissions.includes("edit"),
    hasDelete: data.orgPermissions.includes("delete"),
    accessType: data.accessType as "shared" | "scoped",
    subFeatures: ALL_TREE_ORDERS_SUBS,
    hasUserOverride: false,
    isLoading: false,
  };
}
