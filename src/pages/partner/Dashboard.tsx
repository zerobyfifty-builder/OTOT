import { format } from "date-fns";
import { AlertCircle, AlertTriangle, Info, RefreshCw, TreePine } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { shortDate, treeCount, usd } from "@/lib/format";
import { GlobalDateRangeFilter } from "@/components/partner/GlobalDateRangeFilter";
import { CardEmpty, CrosshairTooltip, DCard, KpiTile, StatusPill, ThinBar } from "@/components/partner/PartnerUI";
import { SpeciesDonut } from "@/components/partner/SpeciesDonut";
import {
  C,
  KPI_TINTS,
  PAYOUT_STATUS_COLORS,
  PAYOUT_STATUS_LABELS,
  REQUEST_STATUS_BAR,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_ORDER,
  SPECIES_COLORS,
  TABLE_HEAD,
  fmtNum,
} from "@/components/partner/partnerTheme";
import { PRESET_LABELS, useDashboardDateRange } from "@/components/partner/useDashboardDateRange";
import { useRefresh } from "@/components/partner/useRefresh";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";

type AlertItem = { level: "red" | "amber" | "blue"; title: string; sub: string };

const ALERT_COLORS = {
  red: { bg: "#FEE2E2", color: "#A32D2D" },
  amber: { bg: "#FAEEDA", color: "#BA7517" },
  blue: { bg: "#E8F4FD", color: "#2D7AB3" },
};

export default function PartnerDashboard() {
  const { session } = useAuth();
  const { state, loading, refresh } = useStore();
  const { refreshing, lastUpdated, run: handleRefresh } = useRefresh(refresh);
  const { range, setPreset, setCustom } = useDashboardDateRange();
  const vendorId = session?.vendorId;
  const vendor = state.vendors.find((v) => v.id === vendorId);
  const requests = state.plantationRequests.filter((r) => r.partnerId === vendorId);
  const vprs = state.vendorPlantationRequests.filter((v) => v.vendorId === vendorId);
  const payouts = state.plantationPayouts.filter((p) =>
    requests.some((r) => r.id === p.plantationRequestId),
  );
  const agents = state.users.filter((u) => u.vendorId === vendorId && u.role === "partner_agent");

  const treesFor = (donationIds: string[]) =>
    state.donations
      .filter((d) => donationIds.includes(d.id))
      .reduce((total, d) => total + treeCount(d.trees), 0);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    return d >= range.from && d <= range.to;
  };
  const rangeLabel = `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;

  const rangedRequests = requests.filter((r) => inRange(r.createdAt));
  const rangedVprs = vprs.filter((v) => inRange(v.createdAt));
  const rangedPayouts = payouts.filter((p) => inRange(p.createdAt));
  const treesInQueue = rangedRequests.reduce((s, r) => s + treesFor(r.donationIds), 0);
  const totalTracked = requests.length;

  const monthlyData = (() => {
    const months = new Map<string, { month: string; count: number; ts: number }>();
    rangedRequests.forEach((r) => {
      const d = new Date(r.createdAt);
      const key = format(d, "MMM yyyy");
      const entry = months.get(key) ?? { month: key, count: 0, ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
      entry.count += treesFor(r.donationIds);
      months.set(key, entry);
    });
    return [...months.values()].sort((a, b) => a.ts - b.ts);
  })();
  const avgPerMonth = monthlyData.length
    ? Math.round(monthlyData.reduce((s, m) => s + m.count, 0) / monthlyData.length)
    : 0;

  const speciesBreakdown = (() => {
    const counts = new Map<string, number>();
    rangedRequests.forEach((r) => {
      state.donations
        .filter((d) => r.donationIds.includes(d.id))
        .forEach((d) => d.trees.forEach((t) => counts.set(t.treeType, (counts.get(t.treeType) ?? 0) + t.count)));
    });
    const total = [...counts.values()].reduce((s, v) => s + v, 0);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
        color: SPECIES_COLORS[i % SPECIES_COLORS.length],
      }));
  })();

  const workload = agents
    .map((a) => {
      const mine = vprs.filter((v) => v.assignedAgentId === a.id);
      return { agent: a, open: mine.filter((v) => v.status !== "completed").length, total: mine.length };
    })
    .sort((a, b) => b.open - a.open || b.total - a.total)
    .slice(0, 5);

  const alerts: AlertItem[] = [];
  const awaitingAgent = requests.filter((r) => !vprs.some((v) => v.plantationRequestId === r.id));
  if (awaitingAgent.length > 0) {
    alerts.push({
      level: "red",
      title: `Requests awaiting agent assignment (${awaitingAgent.length})`,
      sub: `Oldest received ${shortDate(awaitingAgent.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt)}`,
    });
  }
  const failedPayouts = payouts.filter((p) => p.payoutStatus === "failed");
  if (failedPayouts.length > 0) {
    alerts.push({
      level: "red",
      title: `Failed payouts (${failedPayouts.length})`,
      sub: failedPayouts.map((p) => p.failureMessage || p.transactionReferenceNumber).filter(Boolean).slice(0, 2).join(", "),
    });
  }
  const notStarted = vprs.filter((v) => v.status === "assigned");
  if (notStarted.length > 0) {
    alerts.push({
      level: "amber",
      title: `Tickets not yet started (${notStarted.length})`,
      sub: "Assigned to agents but not marked in progress",
    });
  }
  const inReview = requests.filter((r) => r.status === "ready_for_review");
  if (inReview.length > 0) {
    alerts.push({
      level: "blue",
      title: `Awaiting ministry review (${inReview.length})`,
      sub: "Completed in the field, pending sign-off",
    });
  }

  const recentPayouts = [...payouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentRequests = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 animate-fade-in">
          <div>
            <h1 className="text-[26px] font-semibold text-foreground mt-0.5">
              Welcome, {vendor?.name || "Partner dashboard"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5">
              {session?.name && <>Logged in as {session.name} · </>}
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Assign ministry requests to agents, then complete them in the field.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>Last updated: {format(lastUpdated, "MMM d, HH:mm")}</span>
            <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div
          className="flex items-center justify-between gap-3 flex-wrap animate-fade-in"
          style={{ animationDelay: "40ms", animationFillMode: "backwards" }}
        >
          <div className="text-[12px] text-muted-foreground">
            Showing dashboard metrics for <span className="font-medium text-foreground">{PRESET_LABELS[range.preset]}</span>
          </div>
          <GlobalDateRangeFilter range={range} onPreset={setPreset} onCustom={setCustom} />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
            style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
          >
            <KpiTile label="Assigned requests" value={rangedRequests.length} tint={KPI_TINTS[0]} delay={0} />
            <KpiTile
              label="In progress"
              value={rangedVprs.filter((v) => v.status !== "completed").length}
              tint={KPI_TINTS[1]}
              delay={80}
            />
            <KpiTile label="Trees in queue" value={treesInQueue} tint={KPI_TINTS[2]} delay={160} />
            <KpiTile
              label="Payouts"
              value={rangedPayouts.reduce((s, p) => s + p.amount, 0)}
              prefix="$"
              decimals={2}
              tint={KPI_TINTS[3]}
              delay={240}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard className="lg:col-span-2" delay={200}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-center gap-5">
                  <h2 className="text-[14px] font-semibold text-foreground">Trees Assigned</h2>
                  <div className="hidden sm:flex items-center gap-3 text-[11px] pl-3 border-l border-border/60">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                      This period
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
              </div>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="partnerPlantArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}K` : String(v))}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<CrosshairTooltip />}
                      cursor={{ stroke: "hsl(var(--foreground))", strokeWidth: 1, strokeDasharray: "0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={C.green}
                      strokeWidth={2}
                      fill="url(#partnerPlantArea)"
                      dot={{ r: 0 }}
                      activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2, fill: C.green }}
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <CardEmpty message="No assignments in this range" className="h-[240px]" />
              )}
              <div className="flex items-center gap-3 mt-3 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                  {vprs.some((v) => v.status !== "completed") ? "Field work: Active" : "Field work: Idle"}
                </span>
                <span className="text-muted-foreground">
                  Avg/month: <span className="text-foreground font-medium tabular-nums">{fmtNum(avgPerMonth)}</span>
                </span>
              </div>
            </div>
          </DCard>

          <DCard delay={300}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <h2 className="text-[14px] font-semibold text-foreground">Requests by Status</h2>
              </div>
              <div className="space-y-3.5">
                {REQUEST_STATUS_ORDER.map((status) => (
                  <ThinBar
                    key={status}
                    label={REQUEST_STATUS_LABELS[status]}
                    value={requests.filter((r) => r.status === status).length}
                    max={totalTracked || 1}
                    color={REQUEST_STATUS_BAR[status]}
                  />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 text-[12px] text-muted-foreground">
                Total requests tracked: <span className="font-semibold text-foreground tabular-nums">{fmtNum(totalTracked)}</span>
              </div>
            </div>
          </DCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard delay={300}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <h2 className="text-[14px] font-medium text-foreground">Species Assigned</h2>
                <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
              </div>
              {speciesBreakdown.length > 0 ? (
                <div className="flex items-center justify-center gap-6 min-h-[180px] flex-wrap">
                  <SpeciesDonut data={speciesBreakdown} size={150} thickness={24} />
                  <div className="space-y-2.5 min-w-[160px]">
                    {speciesBreakdown.slice(0, 6).map((sp) => (
                      <div key={sp.name} className="flex items-center justify-between text-[12px] gap-4">
                        <span className="flex items-center gap-1.5 text-foreground min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sp.color }} />
                          <span className="truncate">{sp.name}</span>
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">{sp.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <CardEmpty message="No species data yet" />
              )}
            </div>
          </DCard>

          <DCard delay={400}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground">Team Workload</h2>
                  <p className="text-[12px] text-muted-foreground">Open tickets per field agent</p>
                </div>
              </div>
              {workload.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-1 pb-1.5 mb-2 border-b border-[#E5E7EB] dark:border-gray-700">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">Agent</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">Open</span>
                  </div>
                  <div className="space-y-3">
                    {workload.map(({ agent, open, total }) => (
                      <div key={agent.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{agent.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ background: C.greenBg, color: C.green }}
                            >
                              Agent
                            </span>
                            <span className="text-[11px] text-[#6B7280]">{total} total</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[#EAF3DE] text-[#3B6D11]">
                          {fmtNum(open)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <CardEmpty message="No field agents yet" />
              )}
              <hr className="my-3 border-[#E5E7EB] dark:border-gray-700" />
              <div className="flex gap-4 text-[11px] text-[#6B7280] dark:text-gray-400">
                <span>
                  Field agents: <strong className="text-foreground">{agents.length}</strong>
                </span>
                <span>
                  Open tickets: <strong className="text-foreground">{vprs.filter((v) => v.status !== "completed").length}</strong>
                </span>
              </div>
            </div>
          </DCard>

          <DCard delay={500}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground">Alerts &amp; actions needed</h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Items requiring your attention</p>
                </div>
                {alerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#A32D2D] animate-pulse">
                    {alerts.length}
                  </span>
                )}
              </div>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const { bg, color } = ALERT_COLORS[alert.level];
                    const Icon = alert.level === "red" ? AlertCircle : alert.level === "amber" ? AlertTriangle : Info;
                    return (
                      <div key={alert.title} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: bg }}>
                          <Icon className="h-3 w-3" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground">{alert.title}</p>
                          {alert.sub && <p className="text-[11px] text-[#6B7280] dark:text-gray-400 truncate">{alert.sub}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[120px] text-center">
                  <div className="w-10 h-10 rounded-full bg-[#EAF3DE] flex items-center justify-center mb-2">
                    <TreePine className="h-5 w-5 text-[#3B6D11]" />
                  </div>
                  <p className="text-[12px] text-[#3B6D11] font-medium">All clear — no actions pending.</p>
                </div>
              )}
            </div>
          </DCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard className="lg:col-span-2" delay={400}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground">Incoming from ministry</h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Plantation requests assigned to your organisation</p>
                </div>
              </div>
              {recentRequests.length === 0 ? (
                <CardEmpty message="No requests assigned yet" />
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        <TableHead className={TABLE_HEAD}>Received</TableHead>
                        <TableHead className={TABLE_HEAD}>Trees</TableHead>
                        <TableHead className={TABLE_HEAD}>Amount</TableHead>
                        <TableHead className={TABLE_HEAD}>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRequests.map((r) => (
                        <TableRow key={r.id} className="hover:bg-[#F8FAF8] dark:hover:bg-gray-800 transition-colors">
                          <TableCell className="text-[13px]">{shortDate(r.createdAt)}</TableCell>
                          <TableCell className="text-[13px] font-medium tabular-nums">{fmtNum(treesFor(r.donationIds))}</TableCell>
                          <TableCell className="text-[13px] tabular-nums">{usd(r.amount)}</TableCell>
                          <TableCell>
                            <StatusPill label={REQUEST_STATUS_LABELS[r.status]} className={REQUEST_STATUS_COLORS[r.status]} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DCard>

          <DCard delay={500}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground">Recent payouts</h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Latest climate funding received</p>
                </div>
              </div>
              {recentPayouts.length > 0 ? (
                <>
                  <div className="space-y-2.5">
                    {recentPayouts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground font-mono truncate">
                            {p.transactionReferenceNumber || "—"}
                          </p>
                          <p className="text-[11px] text-[#6B7280] dark:text-gray-400">
                            {PAYOUT_STATUS_LABELS[p.payoutStatus]} · {shortDate(p.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`font-semibold text-[13px] tabular-nums ${p.payoutStatus === "failed" ? "text-[#A32D2D]" : "text-[#3B6D11]"}`}
                        >
                          {usd(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <hr className="my-3 border-[#E5E7EB] dark:border-gray-700" />
                  <div className="space-y-1 text-[11px] text-[#6B7280] dark:text-gray-400">
                    <p>
                      Total paid:{" "}
                      <strong className="text-foreground">
                        {usd(payouts.filter((p) => p.payoutStatus === "paid").reduce((s, p) => s + p.amount, 0))}
                      </strong>
                    </p>
                    <p>
                      Pending payouts:{" "}
                      <strong className="text-foreground">
                        {payouts.filter((p) => p.payoutStatus === "pending" || p.payoutStatus === "processing").length}
                      </strong>
                    </p>
                  </div>
                </>
              ) : (
                <CardEmpty message="No payouts yet" />
              )}
              {recentPayouts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["pending", "processing", "paid", "failed"] as const).map((s) => {
                    const n = payouts.filter((p) => p.payoutStatus === s).length;
                    return n > 0 ? <StatusPill key={s} label={`${PAYOUT_STATUS_LABELS[s]} · ${n}`} className={PAYOUT_STATUS_COLORS[s]} /> : null;
                  })}
                </div>
              )}
            </div>
          </DCard>
        </div>
      </div>
    </div>
  );
}
