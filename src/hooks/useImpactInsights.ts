import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Period = "7d" | "30d" | "90d" | "all";

export interface CarbonLog {
  id: string;
  contribution_id: string;
  log_date: string;
  co2_offset_estimated_kg: number | null;
  co2_offset_actual_kg: number | null;
  calculation_method: string | null;
  notes: string | null;
  photos: string[] | null;
  recorded_by: string;
  created_at: string;
}

export interface EcosystemLog {
  id: string;
  contribution_id: string;
  log_date: string;
  biodiversity_index: number | null;
  soil_improvement: string | null;
  water_retention: string | null;
  ecosystem_notes: string | null;
  photos: string[] | null;
  recorded_by: string;
  created_at: string;
}

export interface CommunityLog {
  id: string;
  contribution_id: string;
  log_date: string;
  jobs_created: number | null;
  families_supported: number | null;
  women_employed: number | null;
  youth_employed: number | null;
  local_participants_count: number | null;
  nursery_income_kes: number | null;
  avg_monthly_income_kes: number | null;
  community_benefits: string | null;
  reporting_period: string | null;
  reporting_period_end: string | null;
  update_frequency: string | null;
  photos: string[] | null;
  recorded_by: string;
  created_at: string;
}

export interface CommunityReport {
  id: string;
  reporting_period: string;
  jobs_created: number | null;
  families_supported: number | null;
  women_employed: number | null;
  youth_employed: number | null;
  nursery_income_kes: number | null;
  notes: string | null;
}

const cutoffFor = (period: Period): Date | null => {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const useImpactInsights = (period: Period = "30d") => {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setOrgId(data?.organization_id ?? null));
  }, [user]);

  return useQuery({
    queryKey: ["impactInsights", orgId, period],
    enabled: !!orgId,
    queryFn: async () => {
      // Org-scoped contribution IDs via trees
      const { data: trees, error: tErr } = await supabase
        .from("trees")
        .select("contribution_id, status")
        .eq("stakeholder_org_id", orgId!)
        .not("contribution_id", "is", null);
      if (tErr) throw tErr;

      const contributionIds = Array.from(
        new Set((trees || []).map((t: any) => t.contribution_id).filter(Boolean)),
      ) as string[];

      const treesPlanted = (trees || []).filter(
        (t: any) => t.status === "Planted" || t.status === "Growing",
      ).length;
      const treesTotal = (trees || []).length;

      if (contributionIds.length === 0) {
        return {
          contributionIds: [],
          treesPlanted,
          treesTotal,
          carbon: [] as CarbonLog[],
          ecosystem: [] as EcosystemLog[],
          community: [] as CommunityLog[],
          communityReports: [] as CommunityReport[],
        };
      }

      const cutoff = cutoffFor(period);
      const cutoffIso = cutoff ? cutoff.toISOString().slice(0, 10) : null;

      const carbonQ = supabase
        .from("carbon_metrics_logs")
        .select("*")
        .in("contribution_id", contributionIds)
        .order("log_date", { ascending: false });
      const ecoQ = supabase
        .from("ecosystem_impact_logs")
        .select("*")
        .in("contribution_id", contributionIds)
        .order("log_date", { ascending: false });
      const commQ = supabase
        .from("community_impact_logs")
        .select("*")
        .in("contribution_id", contributionIds)
        .order("log_date", { ascending: false });
      const reportsQ = supabase
        .from("community_impact")
        .select("*")
        .eq("stakeholder_org_id", orgId!)
        .order("reporting_period", { ascending: false });

      const filtered = cutoffIso
        ? [
            carbonQ.gte("log_date", cutoffIso),
            ecoQ.gte("log_date", cutoffIso),
            commQ.gte("log_date", cutoffIso),
            reportsQ.gte("reporting_period", cutoffIso),
          ]
        : [carbonQ, ecoQ, commQ, reportsQ];

      const [carbonR, ecoR, commR, reportsR] = await Promise.all(filtered);
      if (carbonR.error) throw carbonR.error;
      if (ecoR.error) throw ecoR.error;
      if (commR.error) throw commR.error;
      if (reportsR.error) throw reportsR.error;

      return {
        contributionIds,
        treesPlanted,
        treesTotal,
        carbon: (carbonR.data || []) as CarbonLog[],
        ecosystem: (ecoR.data || []) as EcosystemLog[],
        community: (commR.data || []) as CommunityLog[],
        communityReports: (reportsR.data || []) as CommunityReport[],
      };
    },
  });
};

export const aggregateMetrics = (data: ReturnType<typeof useImpactInsights>["data"]) => {
  if (!data) {
    return {
      treesPlanted: 0,
      co2Estimated: 0,
      co2Actual: 0,
      livesTouched: 0,
      avgBiodiversity: 0,
      jobs: 0,
      families: 0,
      women: 0,
      youth: 0,
      nurseryIncomeKes: 0,
      participants: 0,
    };
  }

  const sum = (arr: any[], key: string) =>
    arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

  const co2Estimated = sum(data.carbon, "co2_offset_estimated_kg");
  const co2Actual = sum(data.carbon, "co2_offset_actual_kg");

  const bioVals = data.ecosystem
    .map((e) => Number(e.biodiversity_index))
    .filter((v) => !Number.isNaN(v) && v > 0);
  const avgBiodiversity = bioVals.length
    ? bioVals.reduce((s, v) => s + v, 0) / bioVals.length
    : 0;

  const jobs = sum(data.community, "jobs_created");
  const families = sum(data.community, "families_supported");
  const women = sum(data.community, "women_employed");
  const youth = sum(data.community, "youth_employed");
  const participants = sum(data.community, "local_participants_count");
  const nurseryIncomeKes = sum(data.community, "nursery_income_kes");

  const livesTouched = jobs + families + participants;

  return {
    treesPlanted: data.treesPlanted,
    co2Estimated,
    co2Actual,
    livesTouched,
    avgBiodiversity,
    jobs,
    families,
    women,
    youth,
    nurseryIncomeKes,
    participants,
  };
};
