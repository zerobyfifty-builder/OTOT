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
  isLoading: boolean;
}

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

      const permissions = (orgModule.permissions as string[]) || [];

      // Per-user override: look up org_users row + org_user_permissions for this module
      let userPerm: any = null;
      const { data: orgUserRow } = await supabase
        .from("org_users")
        .select("id, status")
        .eq("organization_id", userData.organization_id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (orgUserRow && orgUserRow.status === "active") {
        const { data: pRow } = await supabase
          .from("org_user_permissions")
          .select("enabled, permissions, sub_features")
          .eq("org_user_id", orgUserRow.id)
          .eq("module_name", moduleName)
          .maybeSingle();
        userPerm = pRow;
      }

      return {
        accessType: (moduleData as any).access_type || "shared",
        permissions,
        userPerm,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading || !data) {
    return {
      isEnabled: false,
      hasRead: false,
      hasWrite: false,
      hasEdit: false,
      hasDelete: false,
      accessType: "shared",
      subFeatures: {},
      isLoading,
    };
  }

  // Apply per-user override when present; otherwise allow all sub-features by default
  // (org-level access already grants full feature visibility unless explicitly scoped).
  if (data.userPerm) {
    const p = data.userPerm.permissions || {};
    return {
      isEnabled: !!data.userPerm.enabled,
      hasRead: !!p.read,
      hasWrite: !!p.write,
      hasEdit: !!p.edit,
      hasDelete: !!p.delete,
      accessType: data.accessType as "shared" | "scoped",
      subFeatures: (data.userPerm.sub_features as Record<string, boolean>) || {},
      isLoading: false,
    };
  }

  return {
    isEnabled: true,
    hasRead: data.permissions.includes("read"),
    hasWrite: data.permissions.includes("write"),
    hasEdit: data.permissions.includes("edit"),
    hasDelete: data.permissions.includes("delete"),
    accessType: data.accessType as "shared" | "scoped",
    subFeatures: {
      "tree_orders.slider.carbon": true,
      "tree_orders.slider.ecosystem": true,
      "tree_orders.slider.community": true,
      "tree_orders.action.status_transition": true,
      "tree_orders.action.send_update": true,
    },
    isLoading: false,
  };
}
