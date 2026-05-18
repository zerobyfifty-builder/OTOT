import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import SDG13 from "@/assets/SDG_13.png";
import SDG15 from "@/assets/SDG_15.png";

export const OwnerOutcomes = () => {
  const { user } = useAuth();

  const { data: orgId } = useQuery({
    queryKey: ["ownerOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["outcomeStats", orgId],
    queryFn: async () => {
      const [plantingRes, monitoringRes] = await Promise.all([
        supabase.from("planting_records").select("seedlings_planted").eq("owner_org_id", orgId!),
        supabase.from("monitoring_records").select("survival_rate, planting_records!inner(owner_org_id)"),
      ]);
      const totalPlanted = plantingRes.data?.reduce((s, p) => s + (p.seedlings_planted || 0), 0) || 0;
      const co2Sequestered = totalPlanted * 25; // 25kg CO2 per tree
      const hectaresRestored = Math.round(totalPlanted / 1100); // ~1100 trees per hectare
      const monitoringData = monitoringRes.data?.filter(r => (r.planting_records as any)?.owner_org_id === orgId) || [];
      const avgSurvival = monitoringData.length > 0
        ? monitoringData.reduce((s, m) => s + (Number(m.survival_rate) || 0), 0) / monitoringData.length
        : 0;
      return { totalPlanted, co2Sequestered, hectaresRestored, avgSurvival };
    },
    enabled: !!orgId,
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Environmental Impact</h1>
        <p className="text-muted-foreground mt-1">Environmental impact and SDG alignment reporting</p>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Trees Planted</p>
              <p className="text-3xl font-bold text-primary">{formatNumber(stats?.totalPlanted || 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">CO₂ Sequestered</p>
              <p className="text-3xl font-bold text-accent">{formatNumber(stats?.co2Sequestered || 0)} kg</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Hectares Restored</p>
              <p className="text-3xl font-bold">{formatNumber(stats?.hectaresRestored || 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg Survival Rate</p>
              <p className="text-3xl font-bold">{(stats?.avgSurvival || 0).toFixed(1)}%</p>
            </CardContent></Card>
          </>
        )}
      </div>

      {/* SDG Alignment */}
      <Card>
        <CardHeader>
          <CardTitle>SDG Alignment</CardTitle>
          <CardDescription>Sustainable Development Goals contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted">
              <img src={SDG13} alt="SDG 13" className="h-16 w-16 object-contain" />
              <div>
                <h3 className="font-semibold">SDG 13: Climate Action</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Carbon sequestration through reforestation contributes directly to climate change mitigation. 
                  Each tree planted offsets approximately 25 kg of CO₂ annually.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted">
              <img src={SDG15} alt="SDG 15" className="h-16 w-16 object-contain" />
              <div>
                <h3 className="font-semibold">SDG 15: Life on Land</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Restoration of the Mau Forest Complex directly supports biodiversity conservation, 
                  watershed protection, and sustainable land management.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carbon Credit Potential */}
      <Card>
        <CardHeader>
          <CardTitle>Carbon Credit Potential</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Estimated Annual Credits</p>
              <p className="text-2xl font-bold">{formatNumber(Math.round((stats?.totalPlanted || 0) * 0.025))} tCO₂e</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Market Value (est.)</p>
              <p className="text-2xl font-bold">${formatNumber(Math.round((stats?.totalPlanted || 0) * 0.025 * 15))}</p>
              <p className="text-xs text-muted-foreground">@ $15/tCO₂e</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Verification Status</p>
              <p className="text-lg font-bold text-orange-600">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
