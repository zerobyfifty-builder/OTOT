import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Leaf,
  MapPin,
  Plane,
  Receipt,
  TreePine,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/contexts/StoreContext";
import { kes, shortDate, usd } from "@/lib/format";
import { receivedKesByDonation } from "@/lib/ledger";
import { isOpenPayout } from "@/lib/payouts";
import { plantingTotals } from "@/lib/plantingStatus";
import { airportCountry } from "@/lib/trips";
import { AccentStatCard, EmptyState, TableFrame } from "@/components/portal/PortalUI";
import { ChartDateRangePicker } from "@/components/ministry/ChartDateRangePicker";
import { ChartExportButton } from "@/components/ministry/ChartExportButton";
import { MinistryStatusBadge } from "@/components/ministry/TableControls";
import {
  EMPTY_RANGE,
  inDateRange,
  requestReceivedKes,
  requestTrees,
  type ChartDateRange,
} from "@/components/ministry/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const n = (value: number) => Math.round(value).toLocaleString("en-US");

const chartConfig = {
  tourists: { label: "Tourists", color: "hsl(var(--primary))" },
  revenue: { label: "Revenue (KES)", color: "hsl(var(--accent))" },
  trips: { label: "Trips", color: "hsl(var(--primary))" },
  pax: { label: "Passengers", color: "hsl(142 70% 55%)" },
};

export default function MinistryDashboard() {
  const { state, loading } = useStore();
  const [countriesDateRange, setCountriesDateRange] = useState<ChartDateRange>(EMPTY_RANGE);
  const [tripsDateRange, setTripsDateRange] = useState<ChartDateRange>(EMPTY_RANGE);

  const received = useMemo(() => receivedKesByDonation(state), [state]);

  const stats = useMemo(() => {
    const paid = state.donations.filter((d) => d.status === "paid");
    const requests = state.plantationRequests;
    const payouts = state.payouts.filter((p) => p.recipientType === "partner");
    // Void shares (test money) are never paid, so they are not part of anyone's share.
    const shares = state.paymentAllocations.filter((a) => a.status !== "void");
    const settled = state.payments.filter((p) => p.status === "success" && p.issue !== "duplicate");
    const trips = state.trips;
    const totalVisitors = trips.reduce((s, t) => s + t.numTravelers, 0);
    const planting = plantingTotals(state);
    return {
      paidCount: paid.length,
      planting,
      receivedKes: [...received.values()].reduce((s, v) => s + v, 0),
      receivedUsd: paid.reduce((s, d) => s + d.amount, 0),
      co2Pledged: paid.reduce((s, d) => s + d.carbonOffsetKg, 0),
      flightCO2: trips.reduce((s, t) => s + t.flightCo2, 0),
      accommodationCO2: trips.reduce((s, t) => s + t.accommodationCo2, 0),
      totalCO2: trips.reduce((s, t) => s + t.totalCo2, 0),
      treesNeeded: trips.reduce((s, t) => s + t.treesNeeded, 0),
      totalTrips: trips.length,
      totalVisitors,
      totalCountries: new Set(trips.map((t) => airportCountry(t.originAirport))).size,
      openRequests: requests.filter((r) => r.status !== "completed").length,
      unassigned: requests.filter((r) => r.status === "unassigned").length,
      inProgress: requests.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
      ready: requests.filter((r) => r.status === "ready_for_review").length,
      plantationShareKes: shares.filter((a) => a.recipientType === "partner").reduce((s, a) => s + a.amountKes, 0),
      ototMinistryKes: shares.filter((a) => a.recipientType !== "partner").reduce((s, a) => s + a.amountKes, 0),
      feesKes: settled.reduce((s, p) => s + (p.feeKes ?? 0) + (p.payoutFeeKes ?? 0), 0),
      paidOutKes: payouts.filter((p) => p.status === "transferred").reduce((s, p) => s + p.amountKes, 0),
      paidOutCount: payouts.filter((p) => p.status === "transferred").length,
      inFlight: payouts.filter((p) => isOpenPayout(p.status)),
      failedPayouts: payouts.filter((p) => p.status === "failed").length,
      activePartners: state.vendors.filter((v) => v.status === "active").length,
    };
  }, [state, received]);

  const revenueByTrip = useMemo(() => {
    const map: Record<string, number> = {};
    state.donations.forEach((d) => {
      if (d.status === "paid" && d.tripId) map[d.tripId] = (map[d.tripId] || 0) + (received.get(d.id) ?? 0);
    });
    return map;
  }, [state.donations, received]);

  const countriesChartData = useMemo(() => {
    const countryMap: Record<string, { tourists: number; revenue: number }> = {};
    state.trips
      .filter((t) => inDateRange(new Date(t.fromDate || t.createdAt), countriesDateRange))
      .forEach((t) => {
        const country = airportCountry(t.originAirport);
        if (!countryMap[country]) countryMap[country] = { tourists: 0, revenue: 0 };
        countryMap[country].tourists += t.numTravelers;
        countryMap[country].revenue += revenueByTrip[t.id] || 0;
      });
    return Object.entries(countryMap)
      .map(([country, d]) => ({ country, tourists: d.tourists, revenue: Math.round(d.revenue) }))
      .sort((a, b) => b.revenue - a.revenue || b.tourists - a.tourists)
      .slice(0, 10);
  }, [state.trips, revenueByTrip, countriesDateRange]);

  const tripsChartData = useMemo(() => {
    const periodMap: Record<string, { trips: number; pax: number; revenue: number }> = {};
    state.trips
      .filter((t) => inDateRange(new Date(t.fromDate || t.createdAt), tripsDateRange))
      .forEach((t) => {
        const date = new Date(t.fromDate || t.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!periodMap[key]) periodMap[key] = { trips: 0, pax: 0, revenue: 0 };
        periodMap[key].trips += 1;
        periodMap[key].pax += t.numTravelers;
        periodMap[key].revenue += revenueByTrip[t.id] || 0;
      });
    return Object.entries(periodMap)
      .map(([period, d]) => ({ period, trips: d.trips, pax: d.pax, revenue: Math.round(d.revenue) }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [state.trips, revenueByTrip, tripsDateRange]);

  const inFlightKes = stats.inFlight.reduce((s, p) => s + p.amountKes, 0);
  const recentRequests = state.plantationRequests.slice(0, 8);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ministry Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One Tourist One Tree: tourist funding, partner planting and payouts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : (
          <>
            <AccentStatCard
              label="Trees Funded"
              value={n(stats.planting.funded)}
              icon={TreePine}
              accent={{ border: "border-l-primary", icon: "text-primary" }}
              breakdown={[
                { label: "Contributions", value: stats.paidCount },
                { label: "Awaiting partner", value: n(stats.planting.awaitingPartner) },
                { label: "Assigned", value: n(stats.planting.assigned) },
                { label: "Reported planted", value: n(stats.planting.reported) },
                { label: "Planted & Verified", value: n(stats.planting.verified), highlight: true },
              ]}
            />
            <AccentStatCard
              label="CO₂ Impact"
              value={
                <>
                  {n(stats.co2Pledged)} <span className="text-base font-normal text-muted-foreground">kg</span>
                </>
              }
              icon={Leaf}
              accent={{ border: "border-l-emerald-500", icon: "text-emerald-500" }}
              breakdown={[
                { label: "Flight CO₂", value: `${n(stats.flightCO2)} kg` },
                { label: "Accommodation", value: `${n(stats.accommodationCO2)} kg` },
              ]}
            />
            <AccentStatCard
              label="Received (KES)"
              value={kes(stats.receivedKes)}
              icon={DollarSign}
              accent={{ border: "border-l-violet-500", icon: "text-violet-500" }}
              breakdown={[{ label: "Tourists paid (USD)", value: usd(stats.receivedUsd) }]}
            />
            <AccentStatCard
              label="Trips"
              value={stats.totalTrips}
              icon={Plane}
              accent={{ border: "border-l-sky-500", icon: "text-sky-500" }}
              breakdown={[
                { label: "Visitors", value: n(stats.totalVisitors) },
                { label: "Countries", value: stats.totalCountries },
                {
                  label: "Avg Pax/Trip",
                  value: stats.totalTrips ? (stats.totalVisitors / stats.totalTrips).toFixed(1) : "0",
                },
              ]}
            />
            <AccentStatCard
              label="Planting Requests"
              value={stats.openRequests}
              icon={ClipboardList}
              accent={{ border: "border-l-amber-500", icon: "text-amber-500" }}
              breakdown={[
                { label: "Unassigned", value: stats.unassigned },
                { label: "Reported planted (to verify)", value: stats.ready, highlight: true },
              ]}
            />
          </>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-violet-500" /> Financial Overview (KES)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Afrinet fees come off first; the rest is split 15% OTOT, 15% Ministry and 70% partner.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            <>
              <MiniStatCard label="Received" value={kes(stats.receivedKes)} icon={Receipt} color="text-foreground" />
              <MiniStatCard label="Afrinet Fees" value={kes(stats.feesKes)} icon={Receipt} color="text-muted-foreground" />
              <MiniStatCard label="Partner Share" value={kes(stats.plantationShareKes)} icon={CheckCircle2} color="text-primary" />
              <MiniStatCard label="OTOT & Ministry Shares" value={kes(stats.ototMinistryKes)} icon={Building} color="text-violet-500" />
              <MiniStatCard label="Transferred to Partners" value={kes(stats.paidOutKes)} icon={ArrowUpRight} color="text-emerald-500" />
              <MiniStatCard label="Partner Payouts in Progress" value={kes(inFlightKes)} icon={Clock} color="text-amber-500" />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  Countries vs Revenue{" "}
                  <ChartExportButton
                    title="Countries vs Revenue"
                    columns={[
                      { key: "country", label: "Country" },
                      { key: "tourists", label: "Tourists" },
                      { key: "revenue", label: "Revenue (KES)" },
                    ]}
                    data={countriesChartData}
                    iconOnly
                  />
                </CardTitle>
                <CardDescription>Tourists and revenue by origin country</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ChartDateRangePicker dateRange={countriesDateRange} onDateRangeChange={setCountriesDateRange} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : countriesChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ComposedChart data={countriesChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="country" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tourists" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tourists" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(142 70% 45%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142 70% 45%)", r: 3 }}
                    name="Revenue (KES)"
                  />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <ChartEmpty icon={MapPin} message="No country data available" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  Trips vs Revenue{" "}
                  <ChartExportButton
                    title="Trips vs Revenue"
                    columns={[
                      { key: "period", label: "Period" },
                      { key: "trips", label: "Trips" },
                      { key: "pax", label: "Passengers" },
                      { key: "revenue", label: "Revenue (KES)" },
                    ]}
                    data={tripsChartData}
                    iconOnly
                  />
                </CardTitle>
                <CardDescription>Trip volume and passengers over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ChartDateRangePicker dateRange={tripsDateRange} onDateRangeChange={setTripsDateRange} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : tripsChartData.length > 0 ? (
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
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))", r: 3 }}
                    name="Revenue (KES)"
                  />
                </ComposedChart>
              </ChartContainer>
            ) : (
              <ChartEmpty icon={BarChart3} message="No trip data available" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CO₂ Emissions Breakdown</CardTitle>
            <CardDescription>Carbon emissions from tourism activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Flight Emissions</p>
                    <p className="text-xl font-bold">{n(stats.flightCO2)} kg</p>
                  </div>
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-secondary/5 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Accommodation Emissions</p>
                    <p className="text-xl font-bold">{n(stats.accommodationCO2)} kg</p>
                  </div>
                  <Building className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Emissions</p>
                    <p className="text-xl font-bold">{n(stats.totalCO2)} kg</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/10 border border-primary/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Trees Needed to Offset</p>
                    <p className="text-xl font-bold">{n(stats.treesNeeded)}</p>
                  </div>
                  <TreePine className="w-6 h-6 text-primary" />
                </div>
              </div>
            )}
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
            <ActivityRow
              title="Planting Requests"
              description={`${stats.unassigned} unassigned, ${stats.inProgress} with partners`}
              icon={TreePine}
              iconClass="text-primary"
            />
            <ActivityRow
              title="Reported Planted"
              description={`${stats.ready} requests the partner reported done, awaiting your verification`}
              icon={BadgeCheck}
              iconClass="text-emerald-500"
            />
            <ActivityRow
              title="Disbursements"
              description={`${stats.paidOutCount} transferred, ${stats.inFlight.length} in flight, ${stats.failedPayouts} failed`}
              icon={Wallet}
              iconClass="text-violet-500"
            />
            <ActivityRow
              title="Plantation Partners"
              description={`${stats.activePartners} of ${state.vendors.length} partners active`}
              icon={Building2}
              iconClass="text-primary"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Planting Requests</CardTitle>
          <CardDescription>Latest plantation requests and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <EmptyState icon={TreePine} message="No plantation requests yet." />
          ) : (
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Trees</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{shortDate(r.createdAt)}</TableCell>
                      <TableCell className="font-medium">
                        {state.vendors.find((v) => v.id === r.partnerId)?.name || "Unassigned"}
                      </TableCell>
                      <TableCell className="text-right">{n(requestTrees(state, r))}</TableCell>
                      <TableCell className="text-right">{kes(requestReceivedKes(received, r))}</TableCell>
                      <TableCell>
                        <MinistryStatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}) {
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

function ChartEmpty({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center">
        <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function ActivityRow({
  title,
  description,
  icon: Icon,
  iconClass,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-lg border">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Icon className={`w-6 h-6 ${iconClass}`} />
    </div>
  );
}
