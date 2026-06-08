import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface TouristModulePermissions {
  isEnabled: boolean;
  hasRead: boolean;
  hasWrite: boolean;
  hasEdit: boolean;
  hasDelete: boolean;
  /** Sub-action key → enabled. Missing keys default to true. */
  subFeatures: Record<string, boolean>;
  isLoading: boolean;
}

const DEFAULT_RETURN: TouristModulePermissions = {
  isEnabled: true,
  hasRead: true,
  hasWrite: true,
  hasEdit: true,
  hasDelete: true,
  subFeatures: {},
  isLoading: false,
};

/**
 * Reads super-admin-configured access for a tourist-portal module.
 * Defaults are permissive (all enabled) when no row exists, so existing
 * tourist UX is unchanged until an admin explicitly disables something.
 */
export function useTouristModulePermissions(moduleName: string): TouristModulePermissions {
  const { data, isLoading } = useQuery({
    queryKey: ["touristModulePermissionsResolved", moduleName],
    queryFn: async () => {
      const { data: m } = await supabase
        .from("modules")
        .select("id")
        .eq("name", moduleName)
        .eq("audience", "tourist")
        .maybeSingle();

      if (!m?.id) return null;

      const [prRes, subRes] = await Promise.all([
        supabase
          .from("tourist_module_permissions" as any)
          .select("is_enabled, permissions")
          .eq("module_id", m.id)
          .maybeSingle(),
        supabase
          .from("module_sub_actions" as any)
          .select("id, key, tourist_sub_action_permissions(is_enabled)")
          .eq("module_id", m.id)
          .eq("is_active", true),
      ]);

      const pr = (prRes.data as unknown) as { is_enabled: boolean; permissions: any } | null;
      const subRows = ((subRes.data as unknown) as any[]) || [];
      return { pr, subRows };
    },
  });

  if (isLoading) return { ...DEFAULT_RETURN, isLoading: true };
  if (!data) return DEFAULT_RETURN;

  const perms = (data.pr?.permissions as Record<string, boolean>) || {
    read: true,
    write: true,
    edit: true,
    delete: true,
  };
  const isEnabled = data.pr ? data.pr.is_enabled : true;


  const subFeatures: Record<string, boolean> = {};
  for (const row of (data.subRows as any[]) || []) {
    const enabledRow = Array.isArray(row.tourist_sub_action_permissions)
      ? row.tourist_sub_action_permissions[0]
      : row.tourist_sub_action_permissions;
    subFeatures[row.key] = enabledRow ? !!enabledRow.is_enabled : true;
  }

  return {
    isEnabled,
    hasRead: perms.read !== false,
    hasWrite: perms.write !== false,
    hasEdit: perms.edit !== false,
    hasDelete: perms.delete !== false,
    subFeatures,
    isLoading: false,
  };
}
