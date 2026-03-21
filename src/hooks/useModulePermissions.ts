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
  isLoading: boolean;
}

export function useModulePermissions(moduleName: string): ModulePermissions {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["modulePermissions", user?.id, moduleName],
    queryFn: async () => {
      // Get user's organization_id
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();

      if (!userData?.organization_id) return null;

      // Get module + organization_modules join
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

      return {
        accessType: (moduleData as any).access_type || "shared",
        permissions,
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
      isLoading,
    };
  }

  return {
    isEnabled: true,
    hasRead: data.permissions.includes("read"),
    hasWrite: data.permissions.includes("write"),
    hasEdit: data.permissions.includes("edit"),
    hasDelete: data.permissions.includes("delete"),
    accessType: data.accessType as "shared" | "scoped",
    isLoading: false,
  };
}
