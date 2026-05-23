import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useImpactInsights, aggregateMetrics, type Period } from "@/hooks/useImpactInsights";
import { HeroKpis } from "@/components/owner/impact-insights/HeroKpis";
import { CarbonTab } from "@/components/owner/impact-insights/CarbonTab";
import { EcosystemTab } from "@/components/owner/impact-insights/EcosystemTab";
import { CommunityTab } from "@/components/owner/impact-insights/CommunityTab";
import { StoriesFeed } from "@/components/owner/impact-insights/StoriesFeed";
import { exportImpactCsv, exportImpactPdf } from "@/utils/impactInsightsExport";

const periodLabels: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

export const OwnerImpactInsights = ({ skipPermissionCheck = false }: { skipPermissionCheck?: boolean } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("30d");
  const [orgName, setOrgName] = useState<string>("");

  // Module gating
  const { data: gating, isLoading: gatingLoading } = useQuery({
    queryKey: ["impact-insights-gating", user?.id],
    enabled: !!user && !skipPermissionCheck,
    queryFn: async () => {
      const { data: u } = await supabase
        .from("users")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!u?.organization_id) return { allowed: false, orgName: "" };

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", u.organization_id)
        .maybeSingle();

      const { data: mods } = await supabase
        .from("organization_modules")
        .select("is_active, modules(name)")
        .eq("organization_id", u.organization_id)
        .eq("is_active", true);

      const allowed = (mods || []).some((m: any) => m.modules?.name === "impact_insights");
      return { allowed, orgName: org?.name || "" };
    },
  });

  useEffect(() => {
    if (gating?.orgName) setOrgName(gating.orgName);
  }, [gating]);

  const { data, isLoading } = useImpactInsights(period);
  const metrics = useMemo(() => aggregateMetrics(data), [data]);

  if (gatingLoading && !skipPermissionCheck) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!skipPermissionCheck && !gating?.allowed) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center max-w-xl mx-auto">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Impact Overview is not enabled</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ask a super-admin to assign the <span className="font-mono">impact_insights</span> module to your organisation
            from the Module Assignment page.
          </p>
          <Button variant="outline" onClick={() => navigate("/owner/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const handleExportCsv = () =>
    exportImpactCsv({
      organizationName: orgName,
      period: periodLabels[period],
      metrics,
      carbon: data?.carbon || [],
      ecosystem: data?.ecosystem || [],
      community: data?.community || [],
      reports: data?.communityReports || [],
    });

  const handleExportPdf = () =>
    exportImpactPdf({
      organizationName: orgName,
      period: periodLabels[period],
      metrics,
      carbon: data?.carbon || [],
      ecosystem: data?.ecosystem || [],
      community: data?.community || [],
      reports: data?.communityReports || [],
    });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Impact Overview</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border bg-card p-0.5">
              {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "all" ? "All" : p.toUpperCase()}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isLoading}>
              <Download className="h-4 w-4 mr-1.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-1.5" /> PDF
            </Button>
          </div>
        </div>

        {/* Hero */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <HeroKpis
            treesPlanted={metrics.treesPlanted}
            co2Kg={metrics.co2Actual + metrics.co2Estimated}
            livesTouched={metrics.livesTouched}
            biodiversity={Number(metrics.avgBiodiversity.toFixed(1))}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Carbon</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{Math.round(metrics.co2Actual + metrics.co2Estimated).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                <p className="text-xs text-muted-foreground mt-1">{data?.carbon.length || 0} log{(data?.carbon.length || 0) === 1 ? "" : "s"} in period</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ecosystem</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{metrics.avgBiodiversity.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
                <p className="text-xs text-muted-foreground mt-1">{data?.ecosystem.length || 0} log{(data?.ecosystem.length || 0) === 1 ? "" : "s"} in period</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Community</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{metrics.livesTouched.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Lives touched • {data?.community.length || 0} log{(data?.community.length || 0) === 1 ? "" : "s"}</p>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">Latest Highlights</h3>
              <StoriesFeedPreview
                carbon={data?.carbon || []}
                ecosystem={data?.ecosystem || []}
                community={data?.community || []}
              />
            </Card>
          </TabsContent>

          <TabsContent value="carbon" className="mt-4">
            <CarbonTab logs={data?.carbon || []} />
          </TabsContent>
          <TabsContent value="ecosystem" className="mt-4">
            <EcosystemTab logs={data?.ecosystem || []} />
          </TabsContent>
          <TabsContent value="community" className="mt-4">
            <CommunityTab logs={data?.community || []} reports={data?.communityReports || []} />
          </TabsContent>
          <TabsContent value="stories" className="mt-4">
            <StoriesFeed
              carbon={data?.carbon || []}
              ecosystem={data?.ecosystem || []}
              community={data?.community || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Compact 5-item highlights for the Overview tab
const StoriesFeedPreview = ({
  carbon,
  ecosystem,
  community,
}: {
  carbon: any[];
  ecosystem: any[];
  community: any[];
}) => {
  const items = [
    ...carbon.map((c) => ({ id: `c-${c.id}`, kind: "Carbon", date: c.log_date, contribution_id: c.contribution_id, note: c.notes })),
    ...ecosystem.map((e) => ({ id: `e-${e.id}`, kind: "Ecosystem", date: e.log_date, contribution_id: e.contribution_id, note: e.ecosystem_notes })),
    ...community.map((m) => ({ id: `m-${m.id}`, kind: "Community", date: m.log_date, contribution_id: m.contribution_id, note: m.community_benefits })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No recent activity in this period.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.id} className="flex items-start justify-between gap-4 border-b last:border-0 pb-3 last:pb-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{i.kind}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{i.contribution_id}</span>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{i.note || <span className="italic text-muted-foreground">No note</span>}</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {new Date(i.date).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default OwnerImpactInsights;
