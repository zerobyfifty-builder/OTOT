import { useMemo, useState } from "react";
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
import { kes, kg, treeCount, usd } from "@/lib/format";
import { dateMatcher } from "@/lib/dateFilter";
import { buildDonationLedger } from "@/lib/ledger";
import { isOpenPayout, PAYOUT_STATUS_LABEL, RECIPIENT_LABEL } from "@/lib/payouts";
import { plantingTotals, requestDonationIds } from "@/lib/plantingStatus";
import { roleLabel } from "@/lib/portal";
import { AdminStatCard } from "@/components/portal/PortalUI";
import { ActivityFeed, type ActivityCategory, type ActivityEntry } from "@/components/admin/ActivityFeed";
import { AlertsPanel, type AlertItem } from "@/components/admin/AlertsPanel";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DashboardCharts, type DashboardChartData } from "@/components/admin/DashboardCharts";
import { QuickActions } from "@/components/admin/QuickActions";
import { AdminSpinner } from "@/components/admin/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppRole, StoreState } from "@/types/otot";

const DAY_MS = 86_400_000;
/** The API expires unconfirmed charges after 60 minutes; flag them well before. */
const LONG_PENDING_MS = 30 * 60 * 1000;
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
    message: `${plural(unassigned, "plantation request")} awaiting a partner`,
    href: "/ministry/requests",
  });
  const review = count(state.plantationRequests, (r) => r.status === "ready_for_review");
  push({
    id: "review-requests",
    type: "plantation",
    severity: "warning",
    count: review,
    message: `${plural(review, "plantation request")} reported planted, awaiting Ministry verification`,
    href: "/ministry/requests",
  });
  const now = Date.now();
  const flagged = count(state.payments, (p) => Boolean(p.issue) && p.status !== "refunded");
  const longPending = count(
    state.payments,
    (p) => p.status === "pending" && !p.issue && now - new Date(p.createdAt).getTime() > LONG_PENDING_MS,
  );
  push({
    id: "payment-issues",
    type: "payment",
    severity: "error",
    count: flagged + longPending,
    message: [
      flagged ? `${plural(flagged, "payment")} flagged (duplicate, wrong amount or reversed)` : "",
      longPending ? `${plural(longPending, "payment")} pending for over 30 minutes` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    href: "/admin/finance?tab=payments&status=issues",
  });
  const failedPayments = count(state.payments, (p) => p.status === "failed");
  push({
    id: "failed-payments",
    type: "payment",
    severity: "warning",
    count: failedPayments,
    message: plural(failedPayments, "failed payment"),
    href: "/admin/finance?tab=payments&status=failed",
  });
  const reviewPayouts = count(state.payouts, (p) => p.needsReview);
  push({
    id: "review-payouts",
    type: "payout",
    severity: "error",
    count: reviewPayouts,
    message: `${plural(reviewPayouts, "payout")} need review (possible double payment)`,
    href: "/admin/finance?tab=payouts&status=needs_review",
  });
  const failedPayouts = count(state.payouts, (p) => p.status === "failed");
  push({
    id: "failed-payouts",
    type: "payout",
    severity: "error",
    count: failedPayouts,
    message: plural(failedPayouts, "failed payout"),
    href: "/admin/finance?tab=payouts&status=failed",
  });
  const pendingPayouts = count(state.payouts, (p) => isOpenPayout(p.status));
  push({
    id: "pending-payouts",
    type: "payout",
    severity: "warning",
    count: pendingPayouts,
    message: `${plural(pendingPayouts, "payout")} in progress`,
    href: "/admin/finance?tab=payouts&status=in_progress",
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
      description: p.amountKes ? kes(p.amountKes) : usd(p.amount),
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
      description: `${plural(requestDonationIds(r).length, "donation")} · ${usd(r.amount)}`,
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
  for (const p of state.payouts) {
    entries.push({
      id: `payout-${p.id}`,
      category: "admin",
      action: `payout ${PAYOUT_STATUS_LABEL[p.status].toLowerCase()}`,
      tone: p.status === "failed" ? "delete" : p.status === "transferred" ? "create" : "update",
      resource: `${RECIPIENT_LABEL[p.recipientType]} payout · ${p.recipientName}`,
      description: kes(p.amountKes),
      timestamp: p.createdAt,
    });
  }

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50);
}

function buildCharts(state: StoreState): DashboardChartData {
  const now = Date.now();
  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(now - (29 - i) * DAY_MS).toISOString()));
  const ledger = buildDonationLedger(state).filter((row) => row.donation.status === "paid");
  const joinedBy = (roles: AppRole[], date: string) =>
    state.users.filter((u) => roles.includes(u.role) && u.createdAt && dayKey(u.createdAt) <= date).length;

  const userGrowth = days.map((date) => ({
    date,
    tourists: joinedBy(["tourist"], date),
    partners: joinedBy(PARTNER_ROLES, date),
  }));

  // Funded on the day the money arrived.
  const treesByDay = new Map<string, number>();
  for (const row of ledger) {
    const key = dayKey(row.paidAt);
    treesByDay.set(key, (treesByDay.get(key) ?? 0) + treeCount(row.donation.trees));
  }
  const treeTrends = days.map((date) => ({ date, trees: treesByDay.get(date) ?? 0 }));

  // Where the money went, from the KES ledger (void shares were never real money).
  const split = { partner: 0, otot: 0, ministry: 0 };
  for (const a of state.paymentAllocations) {
    if (a.status !== "void") split[a.recipientType] += a.amountKes;
  }
  const fees = state.payments
    .filter((p) => p.status === "success" && p.issue !== "duplicate")
    .reduce((s, p) => s + (p.feeKes ?? 0) + (p.payoutFeeKes ?? 0), 0);
  const revenue = [
    { name: "Partner", value: split.partner, color: "#1a5d1a" },
    { name: "OTOT", value: split.otot, color: "#d4704b" },
    { name: "Ministry", value: split.ministry, color: "#a77a27" },
    { name: "Afrinet fees", value: fees, color: "#8b4513" },
  ];

  // Trees the Ministry has assigned to each partner, at any stage.
  const donationTrees = new Map(state.donations.map((d) => [d.id, treeCount(d.trees)]));
  const vendorTrees = new Map<string, number>();
  for (const r of state.plantationRequests) {
    if (!r.partnerId) continue;
    const trees = requestDonationIds(r).reduce((s, id) => s + (donationTrees.get(id) ?? 0), 0);
    vendorTrees.set(r.partnerId, (vendorTrees.get(r.partnerId) ?? 0) + trees);
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
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");

  const stats = useMemo(() => {
    const paid = state.donations.filter((d) => d.status === "paid");
    const ledger = buildDonationLedger(state).filter((row) => row.donation.status === "paid");
    // Calendar month in Nairobi time, by the date the money arrived.
    const thisMonth = dateMatcher({ preset: "this_month" });
    // Duplicates belong to the payer until refunded.
    const duplicateKes = new Map<string, number>();
    for (const p of state.payments) {
      if (p.status === "success" && p.issue === "duplicate") {
        duplicateKes.set(p.donationId, (duplicateKes.get(p.donationId) ?? 0) + (p.amountKes ?? 0));
      }
    }
    const received = (row: (typeof ledger)[number]) => row.grossKes - (duplicateKes.get(row.donation.id) ?? 0);
    const planting = plantingTotals(state);
    const countRole = (roles: AppRole[]) => state.users.filter((u) => roles.includes(u.role)).length;

    return {
      usersBreakdown: [
        { label: "Tourists", value: countRole(["tourist"]) },
        { label: "Ministry", value: countRole(["ministry_admin", "ministry_user"]) },
        { label: "Partners", value: countRole(PARTNER_ROLES) },
        { label: "Admins", value: countRole(["super_admin"]) },
      ],
      trees: planting.funded,
      offset: paid.reduce((s, d) => s + d.carbonOffsetKg, 0),
      treeBreakdown: [
        { label: "Awaiting partner", value: planting.awaitingPartner.toLocaleString() },
        { label: "Assigned", value: planting.assigned.toLocaleString() },
        { label: "Reported planted", value: planting.reported.toLocaleString() },
        { label: "Verified planted", value: planting.verified.toLocaleString() },
      ],
      revenueKes: ledger.reduce((s, row) => s + received(row), 0),
      revenueUsd: paid.reduce((s, d) => s + d.amount, 0),
      monthRevenueKes: ledger.filter((row) => thisMonth(row.paidAt)).reduce((s, row) => s + received(row), 0),
      paidCount: paid.length,
    };
  }, [state]);

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
          {state.settings.demoResetAllowed && (
            <Button
              variant="outline"
              className="border-admin-primary/20 text-admin-primary"
              onClick={() => {
                setResetText("");
                setResetOpen(true);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset demo data
            </Button>
          )}
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
            title="Trees funded"
            value={stats.trees.toLocaleString()}
            icon={Trees}
            description={`${kg(stats.offset)} CO₂ offset`}
            breakdown={stats.treeBreakdown}
          />
          <AdminStatCard
            title="Received"
            value={kes(stats.revenueKes)}
            icon={DollarSign}
            description={`${kes(stats.monthRevenueKes)} this calendar month · ${stats.paidCount} paid donations`}
            breakdown={[{ label: "Tourists paid (USD)", value: usd(stats.revenueUsd) }]}
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
            <AdminStatCard title="Payouts" value={state.payouts.length} icon={Landmark} />
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

        {state.settings.demoResetAllowed && (
          <ConfirmDialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            title="Reset all demo data?"
            description={
              <>
                <p>
                  This deletes every account, partner, wallet, trip, donation, payment, request and payout in this
                  environment and reloads the demo data. Accounts you created are gone. It can't be undone.
                </p>
                <p>Type RESET to confirm.</p>
              </>
            }
            confirmLabel="Reset demo data"
            busyLabel="Resetting…"
            destructive
            confirmDisabled={resetText !== "RESET"}
            onConfirm={async () => {
              await resetDemo();
              toast.success("Demo data reset");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Type RESET</Label>
              <Input
                id="reset-confirm"
                autoComplete="off"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
              />
            </div>
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
}
