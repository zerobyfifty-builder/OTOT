import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OrgCustomRole {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  mapped_job_role: string;
  created_at: string;
  updated_at: string;
}

export const ROLE_COLOR_PRESETS = [
  "slate", "rose", "pink", "emerald", "teal",
  "sky", "indigo", "violet", "amber", "orange",
] as const;
export type RoleColor = typeof ROLE_COLOR_PRESETS[number];

export const ROLE_COLOR_CLASSES: Record<string, { pill: string; swatch: string; ring: string }> = {
  slate:   { pill: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",       swatch: "bg-slate-100 text-slate-700",       ring: "ring-slate-400" },
  rose:    { pill: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",         swatch: "bg-rose-100 text-rose-700",         ring: "ring-rose-400" },
  pink:    { pill: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200",         swatch: "bg-pink-100 text-pink-700",         ring: "ring-pink-400" },
  emerald: { pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200", swatch: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-500" },
  teal:    { pill: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",         swatch: "bg-teal-100 text-teal-700",         ring: "ring-teal-400" },
  sky:     { pill: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",             swatch: "bg-sky-100 text-sky-700",           ring: "ring-sky-400" },
  indigo:  { pill: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200", swatch: "bg-indigo-100 text-indigo-700",     ring: "ring-indigo-400" },
  violet:  { pill: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200", swatch: "bg-violet-100 text-violet-700",     ring: "ring-violet-400" },
  amber:   { pill: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",     swatch: "bg-amber-100 text-amber-700",       ring: "ring-amber-400" },
  orange:  { pill: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200", swatch: "bg-orange-100 text-orange-700",     ring: "ring-orange-400" },
};

export function useOrgCustomRoles(organizationId: string | null | undefined, opts?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["orgCustomRoles", organizationId, !!opts?.activeOnly],
    queryFn: async (): Promise<OrgCustomRole[]> => {
      if (!organizationId) return [];
      let q = supabase.from("org_custom_roles" as any)
        .select("*").eq("organization_id", organizationId).order("created_at", { ascending: true });
      if (opts?.activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as OrgCustomRole[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateOrgCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organization_id: string; name: string; color: string; description?: string | null }) => {
      const { error } = await supabase.from("org_custom_roles" as any).insert(input as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orgCustomRoles"] }); toast.success("Role created"); },
    onError: (e: any) => toast.error(e.message || "Failed to create role"),
  });
}

export function useUpdateOrgCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<OrgCustomRole, "name" | "color" | "description" | "is_active">> }) => {
      const { error } = await supabase.from("org_custom_roles" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orgCustomRoles"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message || "Failed to update role"),
  });
}

export function useDeleteOrgCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_custom_roles" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orgCustomRoles"] }); toast.success("Role deleted"); },
    onError: (e: any) => toast.error(e.message || "Failed to delete role"),
  });
}
