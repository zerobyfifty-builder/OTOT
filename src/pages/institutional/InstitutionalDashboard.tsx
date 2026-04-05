import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, TreePine, TrendingUp, BarChart3, Plane, Building, DollarSign, 
  MapPin, UserCheck, Heart, Briefcase, Sprout, Activity, Wallet,
  ArrowUpRight, ArrowDownRight, Receipt, Clock, CheckCircle2, AlertCircle,
  Globe, Leaf, CircleDollarSign, BadgeCheck, Timer, PieChart as PieChartIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Line, ComposedChart, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";
import { airports } from "@/data/airports";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ChartDateRangePicker } from "@/components/institutional/ChartDateRangePicker";
import { ChartExportButton } from "@/components/institutional/ChartExportButton";
import { Separator } from "@/components/ui/separator";

const getAirportCountry = (code: string): string => {
  const airport = airports.find(a => a.code === code);
  return airport?.country || code;
};

const PLANTING_LABELS: Record<string, string> = {
  waiting_to_be_assigned: "Waiting to be Assigned",
  assigned: "Assigned",
  site_prepared: "Site Prepared",
  saplings_ready: "Saplings Ready",
  planting_scheduled: "Planting Scheduled",
  sapling_planted: "Sapling Planted",
  planted: "Planted",
  verified: "Verified",
};

const STATUS_COLORS = [
  "hsl(220 70% 55%)", // waiting
  "hsl(280 60% 55%)", // assigned
  "hsl(30 80% 55%)",  // site_prepared
  "hsl(45 90% 50%)",  // saplings_ready
  "hsl(180 60% 45%)", // scheduled
  "hsl(142 50% 50%)", // sapling_planted
  "hsl(142 70% 40%)", // planted
  "hsl(142 80% 30%)", // verified
];

const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  contribution_confirmed: "Confirmed",
  funds_received: "Received by KTB",
  transferred_for_planting: "Transferred",
  received_for_planting: "Received for Planting",
};

const CONTRIBUTION_COLORS = ["hsl(220 70% 55%)", "hsl(45 90% 50%)", "hsl(180 60% 45%)", "hsl(142 70% 40%)"];

export const InstitutionalDashboard = () => {
  const { user } = useAuth();
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [countriesDateRange, setCountriesDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [tripsDateRange, setTripsDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [treeOrderDateRange, setTreeOrderDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [plantingDateRange, setPlantingDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [contribDateRange, setContribDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select(`*, roles!inner(name, display_name), organizations!inner(*)`)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Main stats query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["institutionalDashboardStats"],
    queryFn: async () => {
      const [
        treesRes, tripsRes, agentsRes, ticketsRes, contributionsRes,
        rolesRes, communityRes, monitoringRes, survivalRes
      ] = await Promise.all([
        supabase.from("trees").select("id, status, amount_paid, num_trees, planting_status, stakeholder_org_id, created_at, contribution_id"),
        supabase.from("trips").select("id, flight_co2, accommodation_co2, total_co2, num_travelers, origin_airport, destination_airport, from_date, created_at"),
        supabase.from("travel_agents").select("id", { count: "exact" }),
        supabase.from("agent_tickets").select("trees_planted, offset_amount_paid, trees_needed"),
        supabase.from("contribution_tracking").select("*"),
        supabase.from("roles").select("id").eq("name", "tourist").single(),
        supabase.from("community_impact").select("families_supported, jobs_created, women_employed, youth_employed, nursery_income_kes"),
        supabase.from("monitoring_records").select("survival_rate"),
        supabase.from("tree_survival_tracking").select("survival_status, survival_rate"),
      ]);

      const trees = treesRes.data || [];
      const trips = tripsRes.data || [];
      const tickets = ticketsRes.data || [];
      const contributions = contributionsRes.data || [];
      const community = communityRes.data || [];
      const monitoring = monitoringRes.data || [];
      const survival = survivalRes.data || [];

      // Tourist count
      let totalTourists = 0;
      if (rolesRes.data?.id) {
        const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role_id", rolesRes.data.id);
        totalTourists = count || 0;
      }

      // Trees metrics
      const totalTreesOrdered = trees.reduce((s, t) => s + (t.num_trees || 0), 0);
      const totalRevenue = trees.reduce((s, t) => s + (Number(t.amount_paid) || 0), 0);
      const uniqueContributions = new Set(trees.map(t => t.contribution_id).filter(Boolean)).size;

      // Planting status breakdown
      const plantingBreakdown: Record<string, number> = {};
      trees.forEach(t => {
        const status = t.planting_status || 'waiting_to_be_assigned';
        plantingBreakdown[status] = (plantingBreakdown[status] || 0) + (t.num_trees || 0);
      });

      const plantedVerified = (plantingBreakdown['planted'] || 0) + (plantingBreakdown['verified'] || 0);
      const allocated = trees.filter(t => t.stakeholder_org_id).reduce((s, t) => s + (t.num_trees || 0), 0);
      const unallocated = totalTreesOrdered - allocated;

      // Trips
      const flightCO2 = trips.reduce((s, t) => s + (Number(t.flight_co2) || 0), 0);
      const accommodationCO2 = trips.reduce((s, t) => s + (Number(t.accommodation_co2) || 0), 0);
      const totalCO2 = trips.reduce((s, t) => s + (Number(t.total_co2) || 0), 0);
      const totalVisitors = trips.reduce((s, t) => s + (Number(t.num_travelers) || 0), 0);
      const countries = new Set(trips.map(t => getAirportCountry(t.origin_airport)).filter(Boolean));

      // CO2 offset (22kg per tree per year)
      const co2Offset = totalTreesOrdered * 22;

      // Agents
      const agentTreesPlanted = tickets.reduce((s, t) => s + (Number(t.trees_planted) || 0), 0);
      const agentRevenue = tickets.reduce((s, t) => s + (Number(t.offset_amount_paid) || 0), 0);

      // Financial from contribution_tracking
      const totalGross = contributions.reduce((s, c) => s + (Number(c.amount_paid) || 0), 0);
      const totalReceived = contributions.reduce((s, c) => s + (Number(c.amount_received) || 0), 0);
      const totalRetained = contributions.reduce((s, c) => s + (Number(c.amount_retained) || 0), 0);
      const totalTransferred = contributions.reduce((s, c) => s + (Number(c.amount_transferred) || 0), 0);
      const totalTechFee = contributions.reduce((s, c) => s + (Number(c.tech_fee_received) || 0), 0);
      const totalMktgFee = contributions.reduce((s, c) => s + (Number(c.mktng_fee_allocated) || 0), 0);

      // Contribution status breakdown (by $ value)
      const contribStatusBreakdown: Record<string, number> = {};
      contributions.forEach(c => {
        const s = c.status || 'contribution_confirmed';
        contribStatusBreakdown[s] = (contribStatusBreakdown[s] || 0) + (Number(c.amount_paid) || 0);
      });

      // Community
      const totalFamilies = community.reduce((s, r) => s + (r.families_supported || 0), 0);
      const totalJobs = community.reduce((s, r) => s + (r.jobs_created || 0), 0);
      const totalWomen = community.reduce((s, r) => s + (r.women_employed || 0), 0);
      const totalYouth = community.reduce((s, r) => s + (r.youth_employed || 0), 0);
      const totalNurseryIncome = community.reduce((s, r) => s + Number(r.nursery_income_kes || 0), 0);

      // Survival
      const avgSurvival = monitoring.length > 0
        ? monitoring.reduce((s, m) => s + (Number(m.survival_rate) || 0), 0) / monitoring.length
        : (survival.length > 0 
            ? survival.filter(s => s.survival_rate).reduce((sum, s) => sum + (Number(s.survival_rate) || 0), 0) / survival.filter(s => s.survival_rate).length
            : 0);
      const aliveCount = survival.filter(s => s.survival_status === 'Alive').length;
      const deadCount = survival.filter(s => s.survival_status === 'Dead').length;

      // Monthly tree orders (for trend chart)
      const monthlyOrders: Record<string, { trees: number; revenue: number }> = {};
      trees.forEach(t => {
        const month = t.created_at?.substring(0, 7) || 'Unknown';
        if (!monthlyOrders[month]) monthlyOrders[month] = { trees: 0, revenue: 0 };
        monthlyOrders[month].trees += t.num_trees || 0;
        monthlyOrders[month].revenue += Number(t.amount_paid) || 0;
      });

      // Country distribution from contributions
      const countryTreeMap: Record<string, number> = {};
      contributions.forEach(c => {
        const country = c.country || 'Unknown';
        countryTreeMap[country] = (countryTreeMap[country] || 0) + (c.num_trees || 0);
      });

      return {
        totalTreesOrdered, totalRevenue, uniqueContributions, plantingBreakdown,
        plantedVerified, allocated, unallocated,
        totalTrips: trips.length, flightCO2, accommodationCO2, totalCO2, totalVisitors,
        totalCountries: countries.size, co2Offset,
        totalAgents: agentsRes.count || 0, agentTreesPlanted, agentRevenue,
        totalGross, totalReceived, totalRetained, totalTransferred, totalTechFee, totalMktgFee,
        contribStatusBreakdown, totalContributions: contributions.length,
        totalFamilies, totalJobs, totalWomen, totalYouth, totalNurseryIncome,
        avgSurvival, aliveCount, deadCount,
        monthlyOrders: Object.entries(monthlyOrders)
          .map(([month, d]) => ({ month, ...d }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        countryTreeMap: Object.entries(countryTreeMap)
          .map(([country, trees]) => ({ country, trees }))
          .sort((a, b) => b.trees - a.trees)
          .slice(0, 8),
        tripsData: trips,
        totalTourists,
      };
    },
    refetchInterval: 30000,
  });

  // Countries chart data
  const countriesChartData = useMemo(() => {
    if (!stats?.tripsData) return [];
    const countryMap: Record<string, { tourists: number; revenue: number }> = {};
    let filteredTrips = stats.tripsData;
    if (countriesDateRange.from) {
      filteredTrips = filteredTrips.filter(trip => {
        const date = new Date(trip.from_date || trip.created_at);
        if (countriesDateRange.from && date < countriesDateRange.from) return false;
        if (countriesDateRange.to && date > countriesDateRange.to) return false;
        return true;
      });
    }
    filteredTrips.forEach(trip => {
      const country = getAirportCountry(trip.origin_airport);
      if (!countryMap[country]) countryMap[country] = { tourists: 0, revenue: 0 };
      countryMap[country].tourists += Number(trip.num_travelers) || 0;
    });
    const totalVis = Object.values(countryMap).reduce((s, c) => s + c.tourists, 0);
    if (totalVis > 0 && stats.totalRevenue > 0) {
      Object.keys(countryMap).forEach(c => {
        countryMap[c].revenue = Math.round((countryMap[c].tourists / totalVis) * stats.totalRevenue);
      });
    }
    return Object.entries(countryMap).map(([country, d]) => ({ country, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [stats, countriesDateRange]);

  // Trips chart data
  const tripsChartData = useMemo(() => {
    if (!stats?.tripsData) return [];
    const periodMap: Record<string, { trips: number; pax: number; revenue: number }> = {};
    const filteredTrips = tripsDateRange.from
      ? stats.tripsData.filter(trip => {
          const date = new Date(trip.from_date || trip.created_at);
          if (tripsDateRange.from && date < tripsDateRange.from) return false;
          if (tripsDateRange.to && date > tripsDateRange.to) return false;
          return true;
        })
      : stats.tripsData;
    filteredTrips.forEach(trip => {
      const date = new Date(trip.from_date || trip.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!periodMap[key]) periodMap[key] = { trips: 0, pax: 0, revenue: 0 };
      periodMap[key].trips += 1;
      periodMap[key].pax += Number(trip.num_travelers) || 0;
    });
    const totalPax = Object.values(periodMap).reduce((s, p) => s + p.pax, 0);
    if (totalPax > 0 && stats.totalRevenue > 0) {
      Object.keys(periodMap).forEach(key => {
        periodMap[key].revenue = Math.round((periodMap[key].pax / totalPax) * stats.totalRevenue);
      });
    }
    return Object.entries(periodMap).map(([period, d]) => ({ period, ...d })).sort((a, b) => a.period.localeCompare(b.period));
  }, [stats, tripsDateRange]);

  // Planting status pie data
  const plantingPieData = useMemo(() => {
    if (!stats?.plantingBreakdown) return [];
    // Filter trees by date if plantingDateRange is set
    // Since plantingBreakdown comes from all trees, we need to recompute from raw data
    const statusOrder = Object.keys(PLANTING_LABELS);
    return statusOrder
      .filter(s => (stats.plantingBreakdown[s] || 0) > 0)
      .map((s, i) => ({
        name: PLANTING_LABELS[s] || s,
        value: stats.plantingBreakdown[s],
        fill: STATUS_COLORS[statusOrder.indexOf(s)] || STATUS_COLORS[0],
      }));
  }, [stats]);

  // Contribution status pie data
  const contribPieData = useMemo(() => {
    if (!stats?.contribStatusBreakdown) return [];
    return Object.entries(CONTRIBUTION_STATUS_LABELS)
      .filter(([k]) => (stats.contribStatusBreakdown[k] || 0) > 0)
      .map(([k, label], i) => ({
        name: label,
        value: stats.contribStatusBreakdown[k],
        fill: CONTRIBUTION_COLORS[i] || CONTRIBUTION_COLORS[0],
      }));
  }, [stats]);

  // Filtered tree order trend data
  const filteredMonthlyOrders = useMemo(() => {
    if (!stats?.monthlyOrders) return [];
    if (!treeOrderDateRange.from) return stats.monthlyOrders;
    return stats.monthlyOrders.filter(item => {
      const date = new Date(item.month + '-01');
      if (treeOrderDateRange.from && date < treeOrderDateRange.from) return false;
      if (treeOrderDateRange.to && date > treeOrderDateRange.to) return false;
      return true;
    });
  }, [stats, treeOrderDateRange]);

  useEffect(() => {
    if (userProfile) setOrganizationInfo(userProfile.organizations);
  }, [userProfile]);

  const chartConfig = {
    tourists: { label: "Tourists", color: "hsl(var(--primary))" },
    revenue: { label: "Revenue ($)", color: "hsl(var(--accent))" },
    trips: { label: "Trips", color: "hsl(var(--primary))" },
    pax: { label: "Passengers", color: "hsl(142 70% 55%)" },
    trees: { label: "Trees", color: "hsl(var(--primary))" },
  };

  const plantingProgress = stats && stats.totalTreesOrdered > 0
    ? Math.round((stats.plantedVerified / stats.totalTreesOrdered) * 100)
    : 0;

  const revenuePerTourist = stats && stats.totalVisitors > 0 ? stats.totalRevenue / stats.totalVisitors : 0;
  const revenuePerTree = stats && stats.totalTreesOrdered > 0 ? stats.totalRevenue / stats.totalTreesOrdered : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {organizationInfo?.name || 'Kenya Tourism Board'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Institutional Partner Dashboard</p>
      </div>

      {/* ─── TOP KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : (
          <>
            {/* Total Trees */}
            <Card className="relative overflow-hidden border-l-4 border-l-primary">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Trees</span>
                  <TreePine className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold">{formatNumber(stats?.totalTreesOrdered || 0)}</p>
                <Separator />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Contributions</span><span className="font-medium">{stats?.uniqueContributions || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Planted & Verified</span><span className="font-medium text-primary">{formatNumber(stats?.plantedVerified || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Allocated</span><span className="font-medium">{formatNumber(stats?.allocated || 0)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* CO₂ Impact */}
            <Card className="relative overflow-hidden border-l-4 border-l-emerald-500">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CO₂ Impact</span>
                  <Leaf className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold">{formatNumber(stats?.co2Offset || 0)} <span className="text-base font-normal text-muted-foreground">kg</span></p>
                <Separator />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Per Tree/Year</span><span className="font-medium">22 kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Flight CO₂</span><span className="font-medium">{formatNumber(stats?.flightCO2 || 0)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Accommodation</span><span className="font-medium">{formatNumber(stats?.accommodationCO2 || 0)} kg</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card className="relative overflow-hidden border-l-4 border-l-violet-500">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</span>
                  <DollarSign className="h-4 w-4 text-violet-500" />
                </div>
                <p className="text-3xl font-bold">${formatNumber(stats?.totalRevenue || 0)}</p>
                <Separator />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Per Tourist</span><span className="font-medium">${formatNumber(revenuePerTourist)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Per Tree</span><span className="font-medium">${formatNumber(revenuePerTree)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tourists</span><span className="font-medium">{formatNumber(stats?.totalTourists || 0)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Trips */}
            <Card className="relative overflow-hidden border-l-4 border-l-sky-500">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trips</span>
                  <Plane className="h-4 w-4 text-sky-500" />
                </div>
                <p className="text-3xl font-bold">{stats?.totalTrips || 0}</p>
                <Separator />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Visitors</span><span className="font-medium">{formatNumber(stats?.totalVisitors || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Countries</span><span className="font-medium">{stats?.totalCountries || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Pax/Trip</span><span className="font-medium">{stats?.totalTrips ? (stats.totalVisitors / stats.totalTrips).toFixed(1) : '0'}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Travel Agents */}
            <Card className="relative overflow-hidden border-l-4 border-l-amber-500">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Travel Agents</span>
                  <UserCheck className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-3xl font-bold">{stats?.totalAgents || 0}</p>
                <Separator />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Trees Planted</span><span className="font-medium">{formatNumber(stats?.agentTreesPlanted || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">${formatNumber(stats?.agentRevenue || 0)}</span></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ─── FINANCIAL OVERVIEW ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5 text-violet-500" /> Financial Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            <>
              <MiniStatCard label="Gross Contributions" value={`$${formatNumber(stats?.totalGross || 0)}`} icon={Receipt} color="text-foreground" />
              <MiniStatCard label="KTB Received" value={`$${formatNumber(stats?.totalReceived || 0)}`} icon={CheckCircle2} color="text-primary" />
              <MiniStatCard label="Retained (Mktg & Admin)" value={`$${formatNumber(stats?.totalRetained || 0)}`} icon={Building} color="text-violet-500" />
              
              <MiniStatCard label="Transferred to Plantation" value={`$${formatNumber(stats?.totalTransferred || 0)}`} icon={ArrowUpRight} color="text-emerald-500" />
              <MiniStatCard label="Pending Processing" value={`$${formatNumber((stats?.totalGross || 0) - (stats?.totalReceived || 0))}`} icon={Clock} color="text-amber-500" />
            </>
          )}
        </div>
      </div>

      {/* ─── CHARTS ROW 1: Countries & Trips ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Countries vs Revenue</CardTitle>
                <CardDescription>Tourists and revenue by origin country</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ChartDateRangePicker dateRange={countriesDateRange} onDateRangeChange={setCountriesDateRange} />
                <ChartExportButton title="Countries vs Revenue" columns={[{ key: "country", label: "Country" }, { key: "tourists", label: "Tourists" }, { key: "revenue", label: "Revenue ($)" }]} data={countriesChartData} iconOnly />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-64 w-full" /> : countriesChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ComposedChart data={countriesChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="country" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tourists" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tourists" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={{ fill: "hsl(142 70% 45%)", r: 3 }} name="Revenue ($)" />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center"><MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No country data available</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Trips vs Revenue</CardTitle>
                <CardDescription>Trip volume and passengers over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ChartDateRangePicker dateRange={tripsDateRange} onDateRangeChange={setTripsDateRange} />
                <ChartExportButton title="Trips vs Revenue" columns={[{ key: "period", label: "Period" }, { key: "trips", label: "Trips" }, { key: "pax", label: "Passengers" }, { key: "revenue", label: "Revenue ($)" }]} data={tripsChartData} iconOnly />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-64 w-full" /> : tripsChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ComposedChart data={tripsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="trips" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Trips" />
                  <Bar yAxisId="left" dataKey="pax" fill="hsl(142 70% 55%)" radius={[4, 4, 0, 0]} name="Passengers" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 3 }} name="Revenue ($)" />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center"><BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No trip data available</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── CHARTS ROW 2: Tree Order Trend & Planting Pipeline ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Tree Orders Trend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tree Order Trend</CardTitle>
                <CardDescription>Monthly tree purchases and revenue</CardDescription>
              </div>
              <ChartDateRangePicker dateRange={treeOrderDateRange} onDateRangeChange={setTreeOrderDateRange} />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-64 w-full" /> : (filteredMonthlyOrders?.length || 0) > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ComposedChart data={filteredMonthlyOrders} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="trees" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2} name="Trees" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={{ fill: "hsl(142 70% 45%)", r: 3 }} name="Revenue ($)" />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-sm">No tree order data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planting Pipeline */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-primary" /> Planting Pipeline
                </CardTitle>
                <CardDescription>Progress across planting stages</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ChartDateRangePicker dateRange={plantingDateRange} onDateRangeChange={setPlantingDateRange} />
                <Badge variant={plantingProgress >= 50 ? "default" : "secondary"} className="text-xs">
                  {plantingProgress}% planted
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={plantingProgress} className="h-2.5 mb-4" />
            {statsLoading ? <Skeleton className="h-48 w-full" /> : plantingPieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={plantingPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {plantingPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {plantingPieData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{formatNumber(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">No planting data yet</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Allocated</p>
                <p className="text-sm font-bold">{formatNumber(stats?.allocated || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Unallocated</p>
                <p className="text-sm font-bold">{formatNumber(stats?.unallocated || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Survival Rate</p>
                <p className="text-sm font-bold text-primary">{(stats?.avgSurvival || 0).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── CONTRIBUTION LIFECYCLE & CO₂ BREAKDOWN ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contribution Lifecycle */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-violet-500" /> Contribution Lifecycle
                </CardTitle>
                <CardDescription>{stats?.totalContributions || 0} total contributions tracked</CardDescription>
              </div>
              <ChartDateRangePicker dateRange={contribDateRange} onDateRangeChange={setContribDateRange} />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-48 w-full" /> : contribPieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="45%" height={160}>
                  <PieChart>
                    <Pie data={contribPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {contribPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {contribPieData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">No contributions tracked yet</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t">
              <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-500/10">
                <p className="text-[10px] text-muted-foreground uppercase">Mktg Fee Allocated</p>
                <p className="text-sm font-bold">${formatNumber(stats?.totalMktgFee || 0)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-500/10">
                <p className="text-[10px] text-muted-foreground uppercase">Tech Fee Collected</p>
                <p className="text-sm font-bold">${formatNumber(stats?.totalTechFee || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CO₂ Emissions Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CO₂ Emissions Breakdown</CardTitle>
            <CardDescription>Carbon emissions from tourism activity</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Flight Emissions</p>
                    <p className="text-xl font-bold">{formatNumber(stats?.flightCO2 || 0)} kg</p>
                  </div>
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-secondary/5 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Accommodation Emissions</p>
                    <p className="text-xl font-bold">{formatNumber(stats?.accommodationCO2 || 0)} kg</p>
                  </div>
                  <Building className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Emissions</p>
                    <p className="text-xl font-bold">{formatNumber(stats?.totalCO2 || 0)} kg</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/10 border border-primary/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Trees Needed to Offset</p>
                    <p className="text-xl font-bold">{formatNumber(stats?.totalCO2 ? Math.ceil(stats.totalCO2 / 22) : 0)}</p>
                  </div>
                  <TreePine className="w-6 h-6 text-primary" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── COMMUNITY IMPACT & PLATFORM ACTIVITY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" /> Community Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase">Families Supported</p>
                </div>
                <p className="text-xl font-bold">{formatNumber(stats?.totalFamilies || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 mb-1">
                  <Briefcase className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase">Jobs Created</p>
                </div>
                <p className="text-xl font-bold">{formatNumber(stats?.totalJobs || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-[10px] text-muted-foreground uppercase">Women Employed</p>
                <p className="text-xl font-bold">{formatNumber(stats?.totalWomen || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-[10px] text-muted-foreground uppercase">Youth Employed</p>
                <p className="text-xl font-bold">{formatNumber(stats?.totalYouth || 0)}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Total Nursery Income</p>
              <p className="text-xl font-bold">KES {formatNumber(stats?.totalNurseryIncome || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Platform Activity
            </CardTitle>
            <CardDescription>Real-time insights into conservation efforts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Active Conservation Projects</p>
                <p className="text-xs text-muted-foreground">Trees being planted and tracked</p>
              </div>
              <TreePine className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Carbon Offsetting Program</p>
                <p className="text-xs text-muted-foreground">Tourist carbon footprint tracking</p>
              </div>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Financial Reconciliation</p>
                <p className="text-xs text-muted-foreground">{stats?.totalContributions || 0} contributions in pipeline</p>
              </div>
              <Wallet className="w-6 h-6 text-violet-500" />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Tree Survival Monitoring</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.aliveCount || 0} alive, {stats?.deadCount || 0} dead tracked
                </p>
              </div>
              <BadgeCheck className="w-6 h-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Mini stat card for financial overview
function MiniStatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</span>
        </div>
        <p className="text-base font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
