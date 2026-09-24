import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  DollarSign,
  FileText,
  Landmark,
  ListChecks,
  Plus,
  RotateCcw,
  Settings,
  Trees,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, treeCount, usd } from "@/lib/format";
import { roleLabel } from "@/lib/portal";
import { AdminStatCard } from "@/components/portal/PortalUI";
import { ActivityFeed, type ActivityCategory, type ActivityEntry } from "@/components/admin/ActivityFeed";
import { AlertsPanel, type AlertItem } from "@/components/admin/AlertsPanel";
import { DashboardCharts, type DashboardChartData } from "@/components/admin/DashboardCharts";
import { QuickActions } from "@/components/admin/QuickActions";
import { AdminSpinner } from "@/components/admin/TablePagination";
import { Button } from "@/components/ui/button";
import type { AppRole, StoreState } from "@/types/otot";

const DAY_MS = 86_400_000;
const PARTNER_ROLES: AppRole[] = ["partner_admin", "partner_agent"];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const dayKey = (iso: string) => iso.slice(0, 10);

function roleCategory(role: AppRole): ActivityCategory {
  if (role === "tourist") return "tourist";
  if (PARTNER_ROLES.includes(role)) return "partner";
  return "admin";
}

function buildAlerts(state: StoreState): AlertItem[] {
  const alerts: AlertItem[] = [];
  const push = (item: AlertItem) => {
    if (item.count && item.count > 0) alerts.push(item);
  };
  const count = <T,>(rows: T[], test: (row: T) => boolean) => rows.filter(test).length;

  const unassigned = count(state.plantationRequests, (r) => r.status === "unassigned");
  push({
    id: "unassigned-requests",
    type: "plantation",
    severity: "warning",
    count: unassigned,
    message: `${plural(unassigned, "plantation request")} awaiting assignment`,
    href: "/admin/finance",
  });
  const review = count(state.plantationRequests, (r) => r.status === "ready_for_review");
  push({
    id: "review-requests",
    type: "plantation",
    severity: "warning",
    count: review,
    message: `${plural(review, "plantation request")} ready for review`,
    href: "/admin/finance",
  });
  const failedPayments = count(state.payments, (p) => p.status === "failed");
  push({
    id: "failed-payments",
    type: "payment",
    severity: "error",
    count: failedPayments,
    message: plural(failedPayments, "failed payment"),
    href: "/admin/finance",
  });
  const failedPayouts = count(state.plantationPayouts, (p) => p.payoutStatus === "failed");
  push({
    id: "failed-payouts",
    type: "payout",
    severity: "error",
    count: failedPayouts,
    message: plural(failedPayouts, "failed partner payout"),
  });
  const pendingPayouts = count(
    state.plantationPayouts,
    (p) => p.payoutStatus === "pending" || p.payoutStatus === "processing",
  );
  push({
    id: "pending-payouts",
    type: "payout",
    severity: "warning",
    count: pendingPayouts,
    message: `${plural(pendingPayouts, "partner payout")} in progress`,
  });

  if (alerts.length === 0) {
    alerts.push({ id: "system-healthy", type: "system", message: "All systems operational", severity: "info" });
  }
  return alerts;
}

function buildActivity(state: StoreState): ActivityEntry[] {
  const userName = new Map(state.users.map((u) => [u.id, u.name || u.email]));
  const vendorName = new Map(state.vendors.map((v) => [v.id, v.name]));
  const donationUser = new Map(state.donations.map((d) => [d.id, d.userId]));
  const entries: ActivityEntry[] = [];

  for (const u of state.users) {
    if (!u.createdAt) continue;
    entries.push({
      id: `user-${u.id}`,
      category: roleCategory(u.role),
      action: "user joined",
      tone: "create",
      resource: roleLabel(u.role),
      description: u.name || u.email,
      timestamp: u.createdAt,
      actor: u.email,
      href: "/admin/users",
    });
  }
  for (const d of state.donations) {
    entries.push({
      id: `donation-${d.id}`,
      category: "tourist",
      action: `donation ${d.status.replace(/_/g, " ")}`,
      tone: d.status === "refunded" ? "delete" : d.status === "paid" ? "create" : "update",
      resource: "Donation",
      description: `${usd(d.amount)} for ${kg(d.carbonOffsetKg)} CO₂`,
      timestamp: d.createdAt,
      actor: userName.get(d.userId),
      href: "/admin/finance",
    });
  }
  for (const p of state.payments) {
    const uid = donationUser.get(p.donationId);
    entries.push({
      id: `payment-${p.id}`,
      category: "tourist",
      action: `payment ${p.status}`,
      tone: p.status === "failed" ? "delete" : p.status === "success" ? "create" : "update",
      resource: p.paymentMode,
      description: usd(p.amount),
      timestamp: p.createdAt,
      actor: uid ? userName.get(uid) : undefined,
      href: "/admin/finance",
    });
  }
  for (const r of state.plantationRequests) {
    entries.push({
      id: `request-${r.id}`,
      category: "admin",
      action: `request ${r.status.replace(/_/g, " ")}`,
      tone: r.status === "completed" ? "create" : "update",
      resource: "Plantation request",
      description: usd(r.amount),
      timestamp: r.createdAt,
      actor: r.partnerId ? vendorName.get(r.partnerId) : undefined,
      href: "/admin/finance",
    });
  }
  for (const r of state.vendorPlantationRequests) {
    entries.push({
      id: `vendor-request-${r.id}`,
      category: "partner",
      action: `work order ${r.status.replace(/_/g, " ")}`,
      tone: r.status === "completed" ? "create" : "update",
      resource: vendorName.get(r.vendorId) ?? "Partner",
      description: "Plantation work order",
      timestamp: r.createdAt,
      href: "/admin/vendors",
    });
  }
  for (const p of state.plantationPayouts) {
    entries.push({
      id: `payout-${p.id}`,
      category: "admin",
      action: `payout ${p.payoutStatus}`,
      tone: p.payoutStatus === "failed" ? "delete" : p.payoutStatus === "paid" ? "create" : "update",
      resource: "Partner payout",
      description: usd(p.amount),
      timestamp: p.createdAt,
    });
  }

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50);
}

function buildCharts(state: StoreState): DashboardChartData {
  const now = Date.now();
  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(now - (29 - i) * DAY_MS).toISOString()));
  const paid = state.donations.filter((d) => d.status === "paid");
  const joinedBy = (roles: AppRole[], date: string) =>
    state.users.filter((u) => roles.includes(u.role) && u.createdAt && dayKey(u.createdAt) <= date).length;

  const userGrowth = days.map((date) => ({
    date,
    tourists: joinedBy(["tourist"], date),
    partners: joinedBy(PARTNER_ROLES, date),
  }));

  const treesByDay = new Map<string, number>();
  for (const d of paid) {
    const key = dayKey(d.createdAt);
    treesByDay.set(key, (treesByDay.get(key) ?? 0) + treeCount(d.trees));
  }
  const treeTrends = days.map((date) => ({ date, trees: treesByDay.get(date) ?? 0 }));

  const split = { plantation: 0, platform: 0, processor: 0 };
  for (const p of state.payments) {
    if (p.status !== "success") continue;
    split.plantation += p.transactionChargesSplit.plantation;
    split.platform += p.transactionChargesSplit.platform;
    split.processor += p.transactionChargesSplit.processor;
  }
  const revenue = [
    { name: "Plantation", value: split.plantation, color: "#1a5d1a" },
    { name: "Platform", value: split.platform, color: "#d4704b" },
    { name: "Processor", value: split.processor, color: "#8b4513" },
  ];

  const donationTrees = new Map(state.donations.map((d) => [d.id, treeCount(d.trees)]));
  const requestTrees = new Map(
    state.plantationRequests.map((r) => {
      const ids = r.donationIds.length > 0 ? r.donationIds : [r.donationId];
      return [r.id, ids.reduce((s, id) => s + (donationTrees.get(id) ?? 0), 0)];
    }),
  );
  const vendorTrees = new Map<string, number>();
  for (const vr of state.vendorPlantationRequests) {
    vendorTrees.set(vr.vendorId, (vendorTrees.get(vr.vendorId) ?? 0) + (requestTrees.get(vr.plantationRequestId) ?? 0));
  }
  const topPartners = state.vendors
    .map((v) => ({ name: v.name, trees: vendorTrees.get(v.id) ?? 0 }))
    .filter((v) => v.trees > 0)
    .sort((a, b) => b.trees - a.trees)
    .slice(0, 10);

  return { userGrowth, treeTrends, revenue, topPartners };
}

export default function AdminOverview() {
  const { state, loading, resetDemo } = useStore();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const paid = state.donations.filter((d) => d.status === "paid");
    const monthAgo = Date.now() - 30 * DAY_MS;
    const countRole = (roles: AppRole[]) => state.users.filter((u) => roles.includes(u.role)).length;
    const byType = new Map<string, number>();
    for (const d of paid) {
      for (const line of d.trees) byType.set(line.treeType, (byType.get(line.treeType) ?? 0) + line.count);
    }

    return {
      usersBreakdown: [
        { label: "Tourists", value: countRole(["tourist"]) },
        { label: "Ministry", value: countRole(["ministry_admin", "ministry_user"]) },
        { label: "Partners", value: countRole(PARTNER_ROLES) },
        { label: "Admins", value: countRole(["super_admin"]) },
      ],
      trees: paid.reduce((s, d) => s + treeCount(d.trees), 0),
      offset: paid.reduce((s, d) => s + d.carbonOffsetKg, 0),
      treeBreakdown: [...byType.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, value]) => ({ label, value: value.toLocaleString() })),
      revenue: paid.reduce((s, d) => s + d.amount, 0),
      monthRevenue: paid
        .filter((d) => new Date(d.createdAt).getTime() >= monthAgo)
        .reduce((s, d) => s + d.amount, 0),
      paidCount: paid.length,
    };
  }, [state.donations, state.users]);

  const alerts = useMemo(() => buildAlerts(state), [state]);
  const activities = useMemo(() => buildActivity(state), [state]);
  const charts = useMemo(() => buildCharts(state), [state]);

  if (loading) {
    return <AdminSpinner large className="min-h-full bg-admin-cream items-center py-32" />;
  }

  return (
    <div className="min-h-full bg-admin-cream p-4 sm:p-6 md:p-8">
      <div className="max-w-[1920px] mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-admin-primary mb-2">Dashboard</h1>
            <p className="text-admin-primary/70">Complete system oversight and control</p>
          </div>
          <Button
            variant="outline"
            className="border-admin-primary/20 text-admin-primary"
            onClick={async () => {
              try {
                await resetDemo();
                toast.success("Demo data reset");
              } catch (err) {
                toast.error(apiErrorMessage(err));
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset demo data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdminStatCard
            title="Total Users"
            value={state.users.length.toLocaleString()}
            icon={Users}
            description="Across all roles"
            breakdown={stats.usersBreakdown}
          />
          <AdminStatCard
            title="Total Trees"
            value={stats.trees.toLocaleString()}
            icon={Trees}
            description={`${kg(stats.offset)} CO₂ offset`}
            breakdown={stats.treeBreakdown}
          />
          <AdminStatCard
            title="Revenue"
            value={usd(stats.revenue)}
            icon={DollarSign}
            description={`${usd(stats.monthRevenue)} this month · ${stats.paidCount} paid`}
          />
          <AdminStatCard
            title="Partners"
            value={state.vendors.length}
            icon={Building2}
            description="Plantation partner organisations"
            breakdown={[
              { label: "Active", value: state.vendors.filter((v) => v.status === "active").length },
              { label: "Inactive", value: state.vendors.filter((v) => v.status === "inactive").length },
              { label: "Agents", value: state.vendorAgents.length },
            ]}
          />
        </div>

        <AlertsPanel alerts={alerts} />

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-admin-primary">Plantation Pipeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <AdminStatCard title="Plantation requests" value={state.plantationRequests.length} icon={ClipboardList} />
            <AdminStatCard title="Partner work orders" value={state.vendorPlantationRequests.length} icon={ListChecks} />
            <AdminStatCard title="Payouts" value={state.plantationPayouts.length} icon={Landmark} />
          </div>
        </div>

        <ActivityFeed activities={activities} />

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-admin-primary">Analytics & Insights</h2>
          <DashboardCharts data={charts} />
        </div>

        <QuickActions
          actions={[
            { title: "Create New Partner", icon: Plus, primary: true, onClick: () => navigate("/admin/vendors") },
            { title: "Financial Transactions", icon: FileText, onClick: () => navigate("/admin/finance") },
            { title: "Configuration", icon: Settings, onClick: () => navigate("/admin/config") },
          ]}
        />
      </div>
    </div>
  );
}
