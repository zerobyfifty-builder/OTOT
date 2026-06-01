import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OrgRolePermissionRow {
  id: string;
  organization_id: string;
  role_id: string;
  module_name: string;
  enabled: boolean;
  permissions: { read: boolean; write: boolean; edit: boolean; delete: boolean };
  sub_features: Record<string, boolean>;
}

export function useOrgRolePermissions(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["orgRolePermissions", organizationId],
    queryFn: async (): Promise<OrgRolePermissionRow[]> => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("org_role_permissions" as any)
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return (data || []) as unknown as OrgRolePermissionRow[];
    },
    enabled: !!organizationId,
  });
}

export function useSetRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      role_id: string;
      module_name: string;
      enabled?: boolean;
      permissions?: { read: boolean; write: boolean; edit: boolean; delete: boolean };
      sub_features?: Record<string, boolean>;
    }) => {
      // Upsert on (role_id, module_name)
      const { data: existing } = await supabase
        .from("org_role_permissions" as any)
        .select("id, enabled, permissions, sub_features")
        .eq("role_id", input.role_id)
        .eq("module_name", input.module_name)
        .maybeSingle();

      const merged = {
        organization_id: input.organization_id,
        role_id: input.role_id,
        module_name: input.module_name,
        enabled: input.enabled ?? (existing as any)?.enabled ?? false,
        permissions:
          input.permissions ??
          (existing as any)?.permissions ?? { read: true, write: false, edit: false, delete: false },
        sub_features: input.sub_features ?? (existing as any)?.sub_features ?? {},
      };

      if (existing) {
        const { error } = await supabase
          .from("org_role_permissions" as any)
          .update(merged as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("org_role_permissions" as any).insert(merged as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgRolePermissions"] });
      qc.invalidateQueries({ queryKey: ["modulePermissions"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update permission"),
  });
}
