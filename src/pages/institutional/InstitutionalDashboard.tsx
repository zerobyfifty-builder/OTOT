import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TreePine, TrendingUp, BarChart3, Plane, Building, DollarSign, MapPin, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { InstitutionalStatCard } from "@/components/institutional/InstitutionalStatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area } from "recharts";
import { airports } from "@/data/airports";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ChartDateRangePicker } from "@/components/institutional/ChartDateRangePicker";

const getAirportCountry = (code: string): string => {
  const airport = airports.find(a => a.code === code);
  return airport?.country || code;
};

export const InstitutionalDashboard = () => {
  const { user } = useAuth();
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [countriesTimePeriod, setCountriesTimePeriod] = useState<string>("all");
  const [tripsTimePeriod, setTripsTimePeriod] = useState<string>("monthly");
  const [countriesDateRange, setCountriesDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [tripsDateRange, setTripsDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Fetch organization and user info
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

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["institutionalStats"],
    queryFn: async () => {
      const { data: allTreesData, count: totalTrees } = await supabase
        .from("trees")
        .select("status, amount_paid", { count: "exact" });

      const { data: roles } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "tourist")
        .single();

      const { count: totalTourists } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role_id", roles?.id);

      const { count: totalTrips } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      const { data: tripsData } = await supabase
        .from("trips")
        .select("flight_co2, accommodation_co2, total_co2, num_travelers, origin_airport, destination_airport, from_date, created_at");

      const flightCO2 = tripsData?.reduce((sum, trip) => sum + (Number(trip.flight_co2) || 0), 0) || 0;
      const accommodationCO2 = tripsData?.reduce((sum, trip) => sum + (Number(trip.accommodation_co2) || 0), 0) || 0;
      const totalCO2 = tripsData?.reduce((sum, trip) => sum + (Number(trip.total_co2) || 0), 0) || 0;
      const totalVisitors = tripsData?.reduce((sum, trip) => sum + (Number(trip.num_travelers) || 0), 0) || 0;

      // Unique countries from origin airports
      const countries = new Set(tripsData?.map(t => getAirportCountry(t.origin_airport)).filter(Boolean) || []);

      const plantedTrees = allTreesData?.filter(tree => tree.status === "Planted").length || 0;
      const totalRevenue = allTreesData?.reduce((sum, tree) => sum + (Number(tree.amount_paid) || 0), 0) || 0;
      const treesNeeded = Math.ceil(totalCO2 / 25);
      const co2OffsetCommitted = (totalTrees || 0) * 25;
      const revenuePerTourist = totalVisitors > 0 ? totalRevenue / totalVisitors : 0;

      // Travel agents
      const { data: agents, count: totalAgents } = await supabase
        .from("travel_agents")
        .select("id", { count: "exact" });

      const { data: agentTickets } = await supabase
        .from("agent_tickets")
        .select("trees_planted, offset_amount_paid");

      const agentTreesPlanted = agentTickets?.reduce((sum, t) => sum + (Number(t.trees_planted) || 0), 0) || 0;
      const agentRevenue = agentTickets?.reduce((sum, t) => sum + (Number(t.offset_amount_paid) || 0), 0) || 0;

      return {
        totalTrees: totalTrees || 0,
        totalTourists: totalTourists || 0,
        totalTrips: totalTrips || 0,
        totalCO2,
        totalCO2Offset: co2OffsetCommitted,
        flightCO2,
        accommodationCO2,
        treesNeeded,
        plantedTrees,
        totalRevenue,
        totalVisitors,
        totalCountries: countries.size,
        revenuePerTourist,
        totalAgents: totalAgents || 0,
        agentTreesPlanted,
        agentRevenue,
        tripsData: tripsData || [],
      };
    },
    refetchInterval: 30000,
  });

  // Chart data: Countries vs Revenue
  const countriesChartData = useMemo(() => {
    if (!stats?.tripsData) return [];
    const countryMap: Record<string, { tourists: number; revenue: number }> = {};
    
    const filteredTrips = countriesTimePeriod === "all" 
      ? stats.tripsData 
      : stats.tripsData.filter(trip => {
          const date = new Date(trip.from_date || trip.created_at);
          const now = new Date();
          if (countriesTimePeriod === "this_month") {
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
          } else if (countriesTimePeriod === "last_month") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
          } else if (countriesTimePeriod === "last_3_months") {
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3);
            return date >= threeMonthsAgo;
          }
          return true;
        });

    filteredTrips.forEach(trip => {
      const country = getAirportCountry(trip.origin_airport);
      if (!countryMap[country]) countryMap[country] = { tourists: 0, revenue: 0 };
      countryMap[country].tourists += Number(trip.num_travelers) || 0;
    });

    const totalVisitors = Object.values(countryMap).reduce((s, c) => s + c.tourists, 0);
    if (totalVisitors > 0 && stats.totalRevenue > 0) {
      Object.keys(countryMap).forEach(country => {
        countryMap[country].revenue = Math.round((countryMap[country].tourists / totalVisitors) * stats.totalRevenue);
      });
    }

    return Object.entries(countryMap)
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [stats, countriesTimePeriod]);

  // Chart data: Trips vs Revenue by time
  const tripsChartData = useMemo(() => {
    if (!stats?.tripsData) return [];
    const now = new Date();
    const periodMap: Record<string, { trips: number; pax: number; revenue: number }> = {};

    stats.tripsData.forEach(trip => {
      const date = new Date(trip.from_date || trip.created_at);
      let key: string;
      
      if (tripsTimePeriod === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (tripsTimePeriod === "quarterly") {
        const q = Math.ceil((date.getMonth() + 1) / 3);
        key = `${date.getFullYear()} Q${q}`;
      } else {
        key = `${date.getFullYear()}`;
      }

      if (!periodMap[key]) periodMap[key] = { trips: 0, pax: 0, revenue: 0 };
      periodMap[key].trips += 1;
      periodMap[key].pax += Number(trip.num_travelers) || 0;
    });

    // Distribute revenue proportionally by pax
    const totalPax = Object.values(periodMap).reduce((s, p) => s + p.pax, 0);
    if (totalPax > 0 && stats.totalRevenue > 0) {
      Object.keys(periodMap).forEach(key => {
        periodMap[key].revenue = Math.round((periodMap[key].pax / totalPax) * stats.totalRevenue);
      });
    }

    return Object.entries(periodMap)
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [stats, tripsTimePeriod]);

  useEffect(() => {
    if (userProfile) setOrganizationInfo(userProfile.organizations);
  }, [userProfile]);

  const chartConfig = {
    tourists: { label: "Tourists", color: "hsl(var(--primary))" },
    revenue: { label: "Revenue ($)", color: "hsl(var(--accent))" },
    trips: { label: "Trips", color: "hsl(var(--primary))" },
    pax: { label: "Passengers", color: "hsl(142 70% 55%)" },
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {organizationInfo?.name || 'Kenya Tourism Board'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Institutional Partner</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-48" />)
        ) : (
          <>
            <InstitutionalStatCard
              title="Total Trees"
              value={stats?.totalTrees || 0}
              icon={TreePine}
              trend={{ value: 8.3, isPositive: true }}
              breakdown={[
                { label: "Trees Paid For", value: formatNumber(stats?.totalTrees || 0) },
                { label: "Trees Planted", value: formatNumber(stats?.plantedTrees || 0) },
              ]}
            />

            <InstitutionalStatCard
              title="CO₂ Offset"
              value={`${formatNumber(stats?.totalCO2Offset || 0)} kg`}
              icon={TrendingUp}
              breakdown={[
                { label: "CO₂ per Tree", value: "25 kg" },
                { label: "Flight CO₂", value: `${formatNumber(stats?.flightCO2 || 0)} kg` },
                { label: "Accommodation CO₂", value: `${formatNumber(stats?.accommodationCO2 || 0)} kg` },
              ]}
            />

            <InstitutionalStatCard
              title="Revenue"
              value={`$${formatNumber(stats?.totalRevenue || 0)}`}
              icon={DollarSign}
              trend={{ value: 15.7, isPositive: true }}
              breakdown={[
                { label: "Revenue/Tourist", value: `$${formatNumber(Math.round(stats?.revenuePerTourist || 0))}` },
                { label: "Revenue/Tree", value: `$${formatNumber(stats?.totalTrees ? Math.round(stats.totalRevenue / stats.totalTrees) : 0)}` },
              ]}
            />

            <InstitutionalStatCard
              title="Trips"
              value={stats?.totalTrips || 0}
              icon={Plane}
              breakdown={[
                { label: "Total Visitors", value: formatNumber(stats?.totalVisitors || 0) },
                { label: "Countries", value: formatNumber(stats?.totalCountries || 0) },
              ]}
            />

            <InstitutionalStatCard
              title="Travel Agents"
              value={stats?.totalAgents || 0}
              icon={UserCheck}
              breakdown={[
                { label: "Trees Planted", value: formatNumber(stats?.agentTreesPlanted || 0) },
                { label: "Revenue", value: `$${formatNumber(stats?.agentRevenue || 0)}` },
              ]}
            />
          </>
        )}
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries vs Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Countries vs Revenue</CardTitle>
              <CardDescription>Tourists and revenue by origin country</CardDescription>
            </div>
            <Tabs value={countriesTimePeriod} onValueChange={setCountriesTimePeriod}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
                <TabsTrigger value="this_month" className="text-xs px-2 h-6">This Month</TabsTrigger>
                <TabsTrigger value="last_month" className="text-xs px-2 h-6">Last Month</TabsTrigger>
                <TabsTrigger value="last_3_months" className="text-xs px-2 h-6">3 Months</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : countriesChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <ComposedChart data={countriesChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tourists" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tourists" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 4 }} name="Revenue ($)" />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-72 text-muted-foreground">
                <div className="text-center">
                  <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No country data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trips vs Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Trips vs Revenue</CardTitle>
              <CardDescription>Trip volume and passenger count over time</CardDescription>
            </div>
            <Tabs value={tripsTimePeriod} onValueChange={setTripsTimePeriod}>
              <TabsList className="h-8">
                <TabsTrigger value="monthly" className="text-xs px-2 h-6">Month</TabsTrigger>
                <TabsTrigger value="quarterly" className="text-xs px-2 h-6">Quarter</TabsTrigger>
                <TabsTrigger value="yearly" className="text-xs px-2 h-6">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : tripsChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <ComposedChart data={tripsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="trips" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Trips" />
                  <Bar yAxisId="left" dataKey="pax" fill="hsl(142 70% 55%)" radius={[4, 4, 0, 0]} name="Passengers" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 4 }} name="Revenue ($)" />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-72 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No trip data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CO₂ & Activity Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CO₂ Emissions Breakdown</CardTitle>
            <CardDescription>Distribution of carbon emissions by source</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats && (stats.flightCO2 > 0 || stats.accommodationCO2 > 0) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Flight Emissions</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.flightCO2)} kg</p>
                  </div>
                  <Plane className="w-8 h-8 text-primary" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Accommodation Emissions</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.accommodationCO2)} kg</p>
                  </div>
                  <Building className="w-8 h-8 text-secondary-foreground" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Emissions</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.totalCO2 || 0)} kg</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emissions data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
            <CardDescription>Real-time insights into conservation efforts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Active Conservation Projects</p>
                  <p className="text-sm text-muted-foreground">Trees being planted and tracked</p>
                </div>
                <TreePine className="w-8 h-8 text-primary" />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Carbon Offsetting Program</p>
                  <p className="text-sm text-muted-foreground">Tourist carbon footprint tracking</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
