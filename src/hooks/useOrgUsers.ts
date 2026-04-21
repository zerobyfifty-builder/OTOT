import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OrgUserRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  job_role: string;
  status: "pending" | "active" | "deactivated";
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export function useOrgUsers(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["orgUsers", organizationId],
    queryFn: async (): Promise<OrgUserRow[]> => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("org_users")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrgUserRow[];
    },
    enabled: !!organizationId,
  });
}

export function useToggleOrgUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, next }: { id: string; next: "active" | "deactivated" }) => {
      const { error } = await supabase.from("org_users").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgUsers"] });
      toast.success("User status updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });
}

export function useRemoveOrgUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgUsers"] });
      toast.success("User removed");
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove user"),
  });
}

export function useUpdateOrgUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<OrgUserRow, "first_name" | "last_name" | "position" | "job_role">>;
    }) => {
      const { error } = await supabase.from("org_users").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgUsers"] });
      toast.success("User updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update user"),
  });
}
