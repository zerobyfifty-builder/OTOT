import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EngagementActivityType =
  | "certificate_viewed"
  | "update_sent"
  | "report_downloaded";

export interface EngagementActivity {
  id: string;
  contribution_id: string;
  activity_type: EngagementActivityType;
  description: string;
  metadata: Record<string, unknown>;
  actor_user_id: string | null;
  actor_email: string | null;
  created_at: string;
}

export const useEngagementActivities = (contributionId: string | null) => {
  return useQuery({
    queryKey: ["engagement_activities", contributionId],
    enabled: !!contributionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_activities" as any)
        .select("*")
        .eq("contribution_id", contributionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EngagementActivity[];
    },
  });
};

interface LogParams {
  contribution_id: string;
  activity_type: EngagementActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  actor_user_id?: string | null;
  actor_email?: string | null;
}

export const useLogEngagementActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: LogParams) => {
      const { data, error } = await supabase
        .from("engagement_activities" as any)
        .insert({
          contribution_id: params.contribution_id,
          activity_type: params.activity_type,
          description: params.description,
          metadata: params.metadata || {},
          actor_user_id: params.actor_user_id ?? null,
          actor_email: params.actor_email ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["engagement_activities", vars.contribution_id] });
    },
  });
};
