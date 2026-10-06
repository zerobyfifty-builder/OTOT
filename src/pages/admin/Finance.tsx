import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, RefreshCw, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage, apiFetch } from "@/lib/api";
import { kes, shortDate, usd } from "@/lib/format";
import { buildDonationLedger, type DonationLedgerRow, type DonationShare } from "@/lib/ledger";
import {
  ALLOCATION_STATUS_LABEL,
  isOpenPayout,
  PAYOUT_SOURCE_LABEL,
  PAYOUT_STATUS_LABEL,
  RECIPIENT_LABEL,
  sweepModeDescription,
  type SweepMode,
} from "@/lib/payouts";
import {
  PLANTING_STAGE_HINT,
  PLANTING_STAGE_LABEL,
  PLANTING_STAGE_TONE,
  REQUEST_STATUS_LABEL,
  plantingStage,
  requestByDonation,
  requestDonationIds,
} from "@/lib/plantingStatus";
import { AdminSpinner, TablePagination } from "@/components/admin/TablePagination";
import { downloadCsv, UNDERLINE_TABS_LIST, UNDERLINE_TABS_TRIGGER } from "@/components/admin/styles";
import { usePagination } from "@/components/admin/usePagination";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ReasonDialog } from "@/components/admin/ConfirmDialog";
import { ALL_TIME, dateFilterLabel, dateMatcher, type DateFilter } from "@/lib/dateFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Payment, PaymentIssue, Payout, RecipientType, Wallet } from "@/types/otot";

type FinanceTab = "donations" | "payouts" | "payments" | "requests";

interface Column {
  label: ReactNode;
  /** CSV header; every column on screen is exported, in the same order. */
  csv: string;
  key: string;
  className?: string;
}

interface Row {
  id: string;
  status: string;
  /** Extra filter values a row matches, e.g. "issues" or "needs_review". */
  flags: string[];
  /** ISO timestamp the date filter applies to. */
  date: string;
  search: string;
  cells: ReactNode[];
  /** One value per column header (see Column.csv); a column can export several values. */
  csv: (string | number)[];
}

const DONATION_FILTERS: { value: string; label: string }[] = [
  { value: "ministry_due", label: "Ministry fee pending" },
  { value: "vendor_due", label: "Vendor payout pending" },
  { value: "unassigned", label: "Awaiting Ministry assignment" },
  { value: "in_flight", label: "Payout in progress" },
  { value: "failed", label: "Payout failed" },
  { value: "void", label: "Not payable" },
  { value: "settled", label: "Fully settled" },
];

const ISSUE_LABEL: Record<PaymentIssue, string> = {
  duplicate: "Duplicate",
  amount_mismatch: "Amount mismatch",
  reversed: "Reversed",
};

/** The API expires unconfirmed charges after 60 minutes; flag them well before. */
const LONG_PENDING_MS = 30 * 60 * 1000;

const TABS: {
  value: FinanceTab;
  label: string;
  noun: string;
  statuses: { value: string; label: string }[];
}[] = [
  {
    value: "donations",
    label: "Donations",
    noun: "donations",
    statuses: DONATION_FILTERS,
  },
  {
    value: "payouts",
    label: "Payouts",
    noun: "payouts",
    statuses: [
      ...(["initiated", "in_progress", "transferred", "failed"] as const).map((s) => ({
        value: s,
        label: PAYOUT_STATUS_LABEL[s],
      })),
      { value: "needs_review", label: "Needs review" },
    ],
  },
  {
    value: "payments",
    label: "Payments",
    noun: "payments",
    statuses: [
      { value: "issues", label: "Needs attention" },
      { value: "pending", label: "Pending" },
      { value: "success", label: "Success" },
      { value: "failed", label: "Failed" },
      { value: "refunded", label: "Refunded" },
    ],
  },
  {
    value: "requests",
    label: "Plantation Requests",
    noun: "requests",
    statuses: (["unassigned", "assigned", "in_progress", "ready_for_review", "completed"] as const).map((s) => ({
      value: s,
      label: REQUEST_STATUS_LABEL[s],
    })),
  },
];

const COLUMNS: Record<FinanceTab, Column[]> = {
  donations: [
    { key: "id", label: "Donation ID", csv: "Donation ID" },
    { key: "user", label: "User Details", csv: "User,Email" },
    { key: "date", label: "Paid", csv: "Paid" },
    { key: "vendor", label: "Vendor", csv: "Vendor" },
    { key: "planting", label: "Planting", csv: "Planting" },
    { key: "amount", label: "Amount", className: "text-right", csv: "Amount (KES),Amount (USD)" },
    { key: "fee", label: "Afrinet Fees", className: "text-right", csv: "Afrinet fees (KES)" },
    { key: "otot", label: "Tech Processing Fee (OTOT)", className: "text-right", csv: "OTOT fee (KES),OTOT status" },
    {
      key: "ministry",
      label: "Admin Fee (Ministry)",
      className: "text-right",
      csv: "Ministry fee (KES),Ministry status",
    },
    { key: "vendorAmount", label: "Vendor Payout Amount", className: "text-right", csv: "Vendor payout (KES)" },
    { key: "vendorStatus", label: "Vendor Payout Status", csv: "Vendor payout status" },
  ],
  payouts: [
    { key: "date", label: "Date", csv: "Date" },
    { key: "recipient", label: "Recipient", csv: "Recipient" },
    { key: "phone", label: "M-Pesa", csv: "M-Pesa" },
    { key: "donations", label: "Donations", csv: "Donations" },
    { key: "reference", label: "Reference", csv: "Transaction code,Reference" },
    { key: "source", label: "Sent by", csv: "Sent by" },
    { key: "status", label: "Status", csv: "Status,Needs review" },
    { key: "amount", label: "Amount", className: "text-right", csv: "Amount (KES)" },
    { key: "notes", label: "Notes", csv: "Failure,Review note,Resolution note" },
    { key: "actions", label: "", className: "text-right", csv: "" },
  ],
  payments: [
    { key: "date", label: "Started", csv: "Started" },
    { key: "email", label: "User Email", csv: "User email" },
    { key: "reference", label: "Reference", csv: "Reference" },
    { key: "mode", label: "Mode", csv: "Mode" },
    { key: "status", label: "Status", csv: "Status,Issue,Simulated" },
    { key: "amount", label: "Amount", className: "text-right", csv: "Amount (KES),Amount (USD)" },
    { key: "notes", label: "Notes", csv: "Failure,Resolution note" },
    { key: "actions", label: "", className: "text-right", csv: "" },
  ],
  requests: [
    { key: "date", label: "Date", csv: "Date" },
    { key: "id", label: "ID", csv: "ID" },
    { key: "donations", label: "Donations", csv: "Donations" },
    { key: "partner", label: "Partner", csv: "Partner" },
    { key: "status", label: "Status", csv: "Status" },
    { key: "amount", label: "Received", className: "text-right", csv: "Received (KES),Amount (USD)" },
  ],
};

const PAGE_SIZES = [25, 50, 100];
const shortId = (id: string) => id.substring(0, 8);
const byNewest = <T extends { createdAt: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const shareLabel = (share?: DonationShare) => (share ? ALLOCATION_STATUS_LABEL[share.status] : "");
const isTab = (value: string | null): value is FinanceTab => TABS.some((t) => t.value === value);

function donationMatches(row: DonationLedgerRow, filter: string): boolean {
  const { ministry, partner, otot } = row.shares;
  const all = [ministry, partner, otot].filter(Boolean) as DonationShare[];
  switch (filter) {
    case "ministry_due":
      return Boolean(ministry?.payable);
    case "vendor_due":
      return Boolean(partner?.payable);
    case "unassigned":
      return partner?.status === "unassigned";
    case "in_flight":
      return all.some((s) => s.status === "initiated" || s.status === "in_progress");
    case "failed":
      return all.some((s) => s.status === "failed");
    case "void":
      return all.some((s) => s.status === "void");
    case "settled":
      return (
        all.length > 0 && all.every((s) => s.status === "transferred" || s.status === "void" || s.amountKes === 0)
      );
    default:
      return true;
  }
}

function ShareCell({ share, showStatus }: { share?: DonationShare; showStatus?: boolean }) {
  if (!share) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={share.status === "void" ? "tabular-nums text-muted-foreground line-through" : "tabular-nums"}>
        {kes(share.amountKes)}
      </span>
      {showStatus && <ShareStatus share={share} compact />}
    </div>
  );
}

function ShareStatus({ share, compact }: { share?: DonationShare; compact?: boolean }) {
  if (!share) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={compact ? "[&>div]:text-[10px] [&>div]:px-1.5 [&>div]:py-0" : undefined}>
      <StatusBadge status={share.status} label={ALLOCATION_STATUS_LABEL[share.status]} />
    </span>
  );
}

/** A Super Admin can settle a pending or failed charge by hand; duplicates are refunded instead. */
const canResolvePayment = (p: Payment) =>
  (p.status === "pending" || p.status === "failed") && p.issue !== "duplicate" && p.issue !== "reversed";
const canRefundPayment = (p: Payment) =>
  p.status !== "refunded" && (p.issue === "duplicate" || p.issue === "amount_mismatch");
const isLongPending = (p: Payment, now: number) =>
  p.status === "pending" && !p.issue && now - new Date(p.createdAt).getTime() > LONG_PENDING_MS;

/** `donationIds` undefined means every payable share of that recipient. */
type PayTarget = { recipientType: RecipientType; donationIds?: string[] };

type WalletsOverview = {
  wallets: Wallet[];
  sdkConfigured: boolean;
  minPayoutKes: number;
  sweep: { mode: SweepMode; hourEat: number };
};

const PAY_TITLE: Record<RecipientType, string> = {
  otot: "Transfer OTOT tech processing fee",
  ministry: "Pay Ministry fees",
  partner: "Pay vendor payouts",
};

export default function AdminFinance() {
  const {
    state,
    loading,
    refresh,
    payDonationShares,
    resolvePayout,
    acknowledgePayoutReview,
    resolvePayment,
    refundPayment,
  } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<FinanceTab>(isTab(initialTab) ? initialTab : "donations");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    const status = searchParams.get("status");
    const tabDef = TABS.find((t) => t.value === tab);
    return status && tabDef?.statuses.some((s) => s.value === status) ? status : "all";
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>(ALL_TIME);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [paying, setPaying] = useState(false);
  const [resolving, setResolving] = useState<Payout | null>(null);
  const [reviewing, setReviewing] = useState<Payout | null>(null);
  const [resolvingPayment, setResolvingPayment] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [overview, setOverview] = useState<WalletsOverview | null>(null);

  useEffect(() => {
    apiFetch<WalletsOverview>("/v1/admin/wallets")
      .then(setOverview)
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  // Links from the Overview alerts set the tab and filter once; drop them so a refresh starts clean.
  useEffect(() => {
    if (searchParams.has("tab") || searchParams.has("status")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Only paid donations have money to split; unpaid checkouts stay on the Payments tab.
  const ledger = useMemo(() => buildDonationLedger(state).filter((row) => row.donation.status === "paid"), [state]);
  const ledgerById = useMemo(() => new Map(ledger.map((row) => [row.donation.id, row])), [ledger]);
  const vendorName = useMemo(() => new Map(state.vendors.map((v) => [v.id, v.name])), [state.vendors]);
  const inDateRange = useMemo(() => dateMatcher(dateFilter), [dateFilter]);
  const { chargeFeePct, payoutFeePct } = state.settings;

  // Money totals follow the date the money arrived.
  const totals = useMemo(() => {
    const rows = ledger.filter((row) => inDateRange(row.paidAt));
    const sum = (type: RecipientType, pick: (s: DonationShare) => number) =>
      rows.reduce((total, row) => total + (row.shares[type] ? pick(row.shares[type]!) : 0), 0);
    return {
      grossKes: rows.reduce((s, row) => s + row.grossKes, 0),
      paidCount: rows.length,
      ministryDue: sum("ministry", (s) => s.payableKes),
      partnerDue: sum("partner", (s) => s.payableKes),
      unassignedKes: sum("partner", (s) => (s.status === "unassigned" ? s.amountKes : 0)),
      ototDue: sum("otot", (s) => s.payableKes),
      ototInFlight: sum("otot", (s) => (s.status === "initiated" || s.status === "in_progress" ? s.amountKes : 0)),
    };
  }, [ledger, inDateRange]);

  const rowsByTab = useMemo<Record<FinanceTab, Row[]>>(() => {
    const now = Date.now();
    const users = new Map(state.users.map((u) => [u.id, u]));
    const donationUser = new Map(state.donations.map((d) => [d.id, d.userId]));
    const requests = requestByDonation(state);
    const donationsByPayout = new Map<string, Set<string>>();
    for (const a of state.paymentAllocations) {
      if (!a.payoutId) continue;
      const set = donationsByPayout.get(a.payoutId) ?? new Set<string>();
      set.add(a.donationId);
      donationsByPayout.set(a.payoutId, set);
    }

    const donations = ledger.map((row): Row => {
      const d = row.donation;
      const user = users.get(d.userId);
      const partner = row.shares.partner;
      const vendor = partner?.partnerId ? (vendorName.get(partner.partnerId) ?? "") : "";
      const stage = plantingStage(requests.get(d.id)?.status);
      const feesKes = row.feeKes + row.payoutFeeKes;
      return {
        id: d.id,
        status: d.status,
        flags: [],
        date: row.paidAt,
        search: `${user?.email ?? ""} ${user?.name ?? ""} ${d.id} ${vendor}`.toLowerCase(),
        cells: [
          <span className="font-mono text-sm">{shortId(d.id)}</span>,
          <div className="min-w-0">
            <div className="font-medium truncate">{user?.name || "—"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>,
          <span className="whitespace-nowrap">{shortDate(row.paidAt)}</span>,
          vendor || <span className="text-muted-foreground">Not assigned</span>,
          <span title={PLANTING_STAGE_HINT[stage]}>
            <StatusBadge status={PLANTING_STAGE_TONE[stage]} label={PLANTING_STAGE_LABEL[stage]} />
          </span>,
          <div className="flex flex-col items-end">
            <span className="font-medium tabular-nums">{kes(row.grossKes)}</span>
            <span className="text-xs text-muted-foreground">{usd(d.amount)}</span>
          </div>,
          <span className="tabular-nums">{kes(feesKes)}</span>,
          <ShareCell share={row.shares.otot} showStatus />,
          <ShareCell share={row.shares.ministry} showStatus />,
          <ShareCell share={partner} />,
          <ShareStatus share={partner} />,
        ],
        csv: [
          d.id,
          user?.name ?? "",
          user?.email ?? "",
          shortDate(row.paidAt),
          vendor,
          PLANTING_STAGE_LABEL[stage],
          row.grossKes,
          d.amount.toFixed(2),
          feesKes,
          row.shares.otot?.amountKes ?? "",
          shareLabel(row.shares.otot),
          row.shares.ministry?.amountKes ?? "",
          shareLabel(row.shares.ministry),
          partner?.amountKes ?? "",
          shareLabel(partner),
        ],
      };
    });

    const payouts = byNewest(state.payouts).map((p): Row => {
      const count = donationsByPayout.get(p.id)?.size ?? 0;
      return {
        id: p.id,
        status: p.status,
        flags: p.needsReview ? ["needs_review"] : [],
        date: p.createdAt,
        search: `${p.recipientName} ${p.reference} ${p.transactionCode ?? ""} ${p.mpesaPhone ?? ""}`.toLowerCase(),
        cells: [
          <span className="whitespace-nowrap">{shortDate(p.createdAt)}</span>,
          <div>
            <div className="font-medium">{p.recipientName}</div>
            <div className="text-xs text-muted-foreground">{RECIPIENT_LABEL[p.recipientType]}</div>
          </div>,
          <span className="font-mono text-xs">{p.mpesaPhone ?? "—"}</span>,
          count || <span className="text-muted-foreground">—</span>,
          <div className="font-mono text-xs">
            <div>{p.transactionCode || p.reference}</div>
            {p.transactionCode ? <div className="text-muted-foreground">{p.reference}</div> : null}
          </div>,
          <span className="text-sm">{PAYOUT_SOURCE_LABEL[p.source]}</span>,
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={p.status} label={PAYOUT_STATUS_LABEL[p.status]} />
            {p.needsReview && <StatusBadge status="needs_review" label="Needs review" />}
          </div>,
          <span className="font-medium tabular-nums">{kes(p.amountKes)}</span>,
          <div className="text-xs max-w-[240px] space-y-1">
            {p.needsReview && (
              <p className="text-orange-800" title={p.reviewNote}>
                {p.reviewNote ?? "A late success arrived after its shares were re-sent: possible double payment."}
              </p>
            )}
            {p.failureMessage && (
              <p className="text-muted-foreground truncate" title={p.failureMessage}>
                {p.failureMessage}
              </p>
            )}
            {p.resolutionNote && (
              <p className="text-muted-foreground truncate" title={p.resolutionNote}>
                Resolved: {p.resolutionNote}
              </p>
            )}
            {!p.needsReview && !p.failureMessage && !p.resolutionNote && <span className="text-muted-foreground">—</span>}
          </div>,
          <div className="flex justify-end gap-2">
            {isOpenPayout(p.status) && (
              <Button variant="outline" size="sm" onClick={() => setResolving(p)}>
                Resolve
              </Button>
            )}
            {p.needsReview && (
              <Button variant="outline" size="sm" onClick={() => setReviewing(p)}>
                Mark reviewed
              </Button>
            )}
          </div>,
        ],
        csv: [
          shortDate(p.createdAt),
          `${p.recipientName} (${RECIPIENT_LABEL[p.recipientType]})`,
          p.mpesaPhone ?? "",
          count,
          p.transactionCode ?? "",
          p.reference,
          PAYOUT_SOURCE_LABEL[p.source],
          PAYOUT_STATUS_LABEL[p.status],
          p.needsReview ? "Yes" : "",
          p.amountKes,
          p.failureMessage ?? "",
          p.reviewNote ?? "",
          p.resolutionNote ?? "",
        ],
      };
    });

    const payments = byNewest(state.payments).map((p): Row => {
      const mail = users.get(donationUser.get(p.donationId) ?? "")?.email ?? "";
      const reference = p.mpesaReceipt || p.externalReference || p.afrinetTransactionCode || p.id;
      const longPending = isLongPending(p, now);
      const needsAttention = (Boolean(p.issue) && p.status !== "refunded") || longPending;
      return {
        id: p.id,
        status: p.status,
        flags: needsAttention ? ["issues"] : [],
        date: p.createdAt,
        search: `${mail} ${reference} ${p.id} ${p.donationId}`.toLowerCase(),
        cells: [
          <span className="whitespace-nowrap">{shortDate(p.createdAt)}</span>,
          <span className="font-medium">{mail || "—"}</span>,
          <span className="font-mono text-sm">{reference === p.id ? shortId(p.id) : reference}</span>,
          <Badge variant="outline">{p.paymentMode}</Badge>,
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge status={p.status} />
            {p.issue && <StatusBadge status={p.issue} label={ISSUE_LABEL[p.issue]} />}
            {longPending && <StatusBadge status="needs_review" label="Pending 30+ min" />}
            {p.simulated && (
              <Badge variant="outline" className="border-dashed text-muted-foreground">
                Simulated
              </Badge>
            )}
          </div>,
          <div className="flex flex-col items-end">
            <span className="font-medium tabular-nums">{p.amountKes ? kes(p.amountKes) : "—"}</span>
            <span className="text-xs text-muted-foreground">{usd(p.amount)}</span>
          </div>,
          <div className="text-xs max-w-[220px] space-y-1">
            {p.failureMessage && (
              <p className="text-muted-foreground truncate" title={p.failureMessage}>
                {p.failureMessage}
              </p>
            )}
            {p.resolutionNote && (
              <p className="text-muted-foreground truncate" title={p.resolutionNote}>
                Resolved: {p.resolutionNote}
              </p>
            )}
            {!p.failureMessage && !p.resolutionNote && <span className="text-muted-foreground">—</span>}
          </div>,
          <div className="flex justify-end gap-2">
            {canResolvePayment(p) && (
              <Button variant="outline" size="sm" onClick={() => setResolvingPayment(p)}>
                Resolve
              </Button>
            )}
            {canRefundPayment(p) && (
              <Button
                variant="outline"
                size="sm"
                disabled={!p.afrinetTransactionCode}
                title={p.afrinetTransactionCode ? undefined : "No Afrinet transaction to reverse"}
                onClick={() => setRefunding(p)}
              >
                Refund
              </Button>
            )}
          </div>,
        ],
        csv: [
          shortDate(p.createdAt),
          mail,
          reference,
          p.paymentMode,
          p.status,
          p.issue ? ISSUE_LABEL[p.issue] : longPending ? "Pending 30+ min" : "",
          p.simulated ? "Yes" : "",
          p.amountKes ?? "",
          p.amount.toFixed(2),
          p.failureMessage ?? "",
          p.resolutionNote ?? "",
        ],
      };
    });

    const requestRows = byNewest(state.plantationRequests).map((r): Row => {
      const partner = r.partnerId ? (vendorName.get(r.partnerId) ?? "") : "";
      const ids = requestDonationIds(r);
      const receivedKes = ids.reduce((s, id) => s + (ledgerById.get(id)?.grossKes ?? 0), 0);
      return {
        id: r.id,
        status: r.status,
        flags: [],
        date: r.createdAt,
        search: `${partner} ${r.id} ${ids.join(" ")}`.toLowerCase(),
        cells: [
          shortDate(r.createdAt),
          <span className="font-mono text-sm">{shortId(r.id)}</span>,
          ids.length,
          partner || <span className="text-muted-foreground">Unassigned</span>,
          <StatusBadge status={r.status} label={REQUEST_STATUS_LABEL[r.status]} />,
          <div className="flex flex-col items-end">
            <span className="font-medium tabular-nums">{kes(receivedKes)}</span>
            <span className="text-xs text-muted-foreground">{usd(r.amount)}</span>
          </div>,
        ],
        csv: [
          shortDate(r.createdAt),
          r.id,
          ids.length,
          partner,
          REQUEST_STATUS_LABEL[r.status],
          receivedKes,
          r.amount.toFixed(2),
        ],
      };
    });

    return { donations, payouts, payments, requests: requestRows };
  }, [ledger, ledgerById, state, vendorName]);

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const columns = COLUMNS[tab];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowsByTab[tab].filter((r) => {
      if (q && !r.search.includes(q)) return false;
      if (!inDateRange(r.date)) return false;
      if (statusFilter === "all") return true;
      if (tab === "donations") return donationMatches(ledgerById.get(r.id)!, statusFilter);
      return r.status === statusFilter || r.flags.includes(statusFilter);
    });
  }, [rowsByTab, tab, search, statusFilter, ledgerById, inDateRange]);

  const pager = usePagination(rows, 25);

  // Selection: only donations with a share that can be paid right now (never void shares).
  const isSelectable = (id: string) => {
    const row = ledgerById.get(id);
    return Boolean(row?.shares.ministry?.payable || row?.shares.partner?.payable || row?.shares.otot?.payable);
  };
  // Rows hidden by a filter stay ticked but are never paid, so a payout always matches what is on screen.
  const visibleSelected = useMemo(
    () => (tab === "donations" ? rows.filter((r) => selected.has(r.id)).map((r) => r.id) : []),
    [rows, selected, tab],
  );
  const selectedRows = visibleSelected.map((id) => ledgerById.get(id)).filter(Boolean) as DonationLedgerRow[];
  const selectedMinistryKes = selectedRows.reduce((s, r) => s + (r.shares.ministry?.payableKes ?? 0), 0);
  const selectedPartnerKes = selectedRows.reduce((s, r) => s + (r.shares.partner?.payableKes ?? 0), 0);
  const selectedOtotKes = selectedRows.reduce((s, r) => s + (r.shares.otot?.payableKes ?? 0), 0);
  const minPayoutKes = overview?.minPayoutKes ?? 10;

  /** OTOT fee still owed for the donations the current date filter shows. */
  const transferOtotNow = () => {
    const ids =
      dateFilter.preset === "all"
        ? undefined
        : ledger.filter((r) => inDateRange(r.paidAt) && r.shares.otot?.payable).map((r) => r.donation.id);
    setPayTarget({ recipientType: "otot", donationIds: ids });
  };
  const pageSelectable = pager.pageRows.filter((r) => isSelectable(r.id));
  const allPageSelected = pageSelectable.length > 0 && pageSelectable.every((r) => selected.has(r.id));

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const exportRows = () => {
    const header = columns.filter((c) => c.csv).flatMap((c) => c.csv.split(","));
    downloadCsv(`${tab}-${new Date().toISOString().split("T")[0]}.csv`, [header, ...rows.map((r) => r.csv)]);
    toast.success(`Exported ${rows.length} ${activeTab.noun}`);
  };

  const walletFor = (type: RecipientType, partnerId?: string) =>
    overview?.wallets.find((w) => w.ownerType === type && (type !== "partner" || w.partnerId === partnerId));

  const payBreakdown = useMemo(() => {
    if (!payTarget) return [];
    const groups = new Map<string, { name: string; phone?: string; kes: number; count: number }>();
    for (const id of payTarget.donationIds ?? [...ledgerById.keys()]) {
      const share = ledgerById.get(id)?.shares[payTarget.recipientType];
      if (!share?.payable) continue;
      const key = payTarget.recipientType === "partner" ? (share.partnerId ?? "") : payTarget.recipientType;
      const name =
        payTarget.recipientType === "partner"
          ? (vendorName.get(key) ?? "Partner")
          : RECIPIENT_LABEL[payTarget.recipientType];
      const group = groups.get(key) ?? {
        name,
        phone: walletFor(payTarget.recipientType, share.partnerId)?.mpesaPhone,
        kes: 0,
        count: 0,
      };
      group.kes += share.payableKes;
      group.count += 1;
      groups.set(key, group);
    }
    return [...groups.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payTarget, ledgerById, vendorName, overview]);

  const submitPay = async () => {
    if (!payTarget) return;
    setPaying(true);
    try {
      const result = await payDonationShares(payTarget);
      const sent = result.payouts.reduce((s, p) => s + p.amountKes, 0);
      toast.success(
        `${result.payouts.length} ${result.payouts.length === 1 ? "payout" : "payouts"} submitted (${kes(sent)}).`,
      );
      for (const err of result.errors)
        toast.error(`${vendorName.get(err.partnerId ?? "") ?? "Payout"}: ${err.message}`);
      setSelected(new Set());
      setPayTarget(null);
    } catch (err) {
      toast.error(`${apiErrorMessage(err)} Check the Payouts tab before trying again.`);
    } finally {
      setPaying(false);
    }
  };

  const missingWallet = payBreakdown.some((g) => !g.phone);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Financial Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Each donation split into Afrinet fees, OTOT, Ministry and vendor shares (KES), and the M-Pesa payouts that
            settle them
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportRows} variant="outline" size="sm" disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Refresh"
            aria-label="Refresh"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await refresh();
              } catch (err) {
                toast.error(apiErrorMessage(err));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Collected",
            value: kes(totals.grossKes),
            sub: `${totals.paidCount} paid donations${dateFilter.preset === "all" ? "" : ` · paid ${dateFilterLabel(dateFilter)}`}`,
          },
          {
            label: "Ministry fees pending",
            value: kes(totals.ministryDue),
            sub: "Paid when you send them below",
          },
          {
            label: "Vendor payouts pending",
            value: kes(totals.partnerDue),
            sub: `Payable once assigned · ${kes(totals.unassignedKes)} awaiting Ministry assignment`,
          },
          {
            label: "OTOT tech fee pending",
            value: kes(totals.ototDue),
            sub: `${overview ? sweepModeDescription(overview.sweep.mode, overview.sweep.hourEat) : "Loading schedule…"}${
              totals.ototInFlight ? ` · ${kes(totals.ototInFlight)} in progress` : ""
            }`,
            action: (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                disabled={totals.ototDue < minPayoutKes}
                title={totals.ototDue < minPayoutKes ? `M-Pesa minimum is ${kes(minPayoutKes)}` : undefined}
                onClick={transferOtotNow}
              >
                <Send className="h-4 w-4 mr-2" />
                Transfer now
              </Button>
            ),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              {"action" in stat ? stat.action : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as FinanceTab);
          setStatusFilter("all");
          pager.resetPage();
        }}
        className="w-full"
      >
        <TabsList className={UNDERLINE_TABS_LIST}>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className={UNDERLINE_TABS_TRIGGER}>
              {t.label}
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {rowsByTab[t.value].filter((r) => inDateRange(r.date)).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  tab === "requests"
                    ? "Search by partner, request or donation ID..."
                    : tab === "payouts"
                      ? "Search by recipient, number or reference..."
                      : tab === "payments"
                        ? "Search by user, reference, payment or donation ID..."
                        : "Search by user, vendor or ID..."
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  pager.resetPage();
                }}
                className="pl-10"
              />
            </div>
            <DateRangeFilter
              value={dateFilter}
              onChange={(next) => {
                setDateFilter(next);
                pager.resetPage();
              }}
              className="w-full sm:w-[210px]"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                pager.resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-[230px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {activeTab.statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pager.pageSize.toString()} onValueChange={(value) => pager.setPageSize(Number(value))}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dates are in Nairobi time.{" "}
            {tab === "donations"
              ? "Donations are dated by when the money arrived."
              : tab === "payments"
                ? "Payments are dated by when the checkout started."
                : tab === "payouts"
                  ? "Payouts are dated by when they were sent."
                  : "Requests are dated by when they were created."}
          </p>

          {tab === "donations" && visibleSelected.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-4 py-3 text-sm">
              <span className="font-medium">{visibleSelected.length} selected</span>
              <span className="text-muted-foreground">
                OTOT {kes(selectedOtotKes)} · Ministry {kes(selectedMinistryKes)} · Vendors {kes(selectedPartnerKes)}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedOtotKes < minPayoutKes}
                  title={
                    selectedOtotKes > 0 && selectedOtotKes < minPayoutKes
                      ? `M-Pesa minimum is ${kes(minPayoutKes)}`
                      : undefined
                  }
                  onClick={() =>
                    setPayTarget({
                      recipientType: "otot",
                      donationIds: visibleSelected,
                    })
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  Transfer OTOT fee {kes(selectedOtotKes)}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedMinistryKes <= 0}
                  onClick={() =>
                    setPayTarget({
                      recipientType: "ministry",
                      donationIds: visibleSelected,
                    })
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  Pay Ministry {kes(selectedMinistryKes)}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedPartnerKes <= 0}
                  onClick={() =>
                    setPayTarget({
                      recipientType: "partner",
                      donationIds: visibleSelected,
                    })
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  Pay Vendors {kes(selectedPartnerKes)}
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <AdminSpinner />
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No {activeTab.noun} found.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tab === "donations" && (
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label="Select payable donations on this page"
                            checked={allPageSelected}
                            disabled={pageSelectable.length === 0}
                            onCheckedChange={(on) => pageSelectable.forEach((r) => toggle(r.id, on === true))}
                          />
                        </TableHead>
                      )}
                      {columns.map((c) => (
                        <TableHead key={c.key} className={c.className}>
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.map((row) => (
                      <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                        {tab === "donations" && (
                          <TableCell>
                            <Checkbox
                              aria-label={`Select donation ${shortId(row.id)}`}
                              checked={selected.has(row.id)}
                              disabled={!isSelectable(row.id)}
                              onCheckedChange={(on) => toggle(row.id, on === true)}
                            />
                          </TableCell>
                        )}
                        {row.cells.map((cell, i) => (
                          <TableCell key={columns[i].key} className={columns[i].className}>
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={pager.currentPage}
                pageSize={pager.pageSize}
                totalCount={pager.totalCount}
                noun={activeTab.noun}
                onPageChange={pager.setPage}
              />
              {tab === "donations" && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Vendor payout = amount − Afrinet fees ({chargeFeePct}% collection + {payoutFeePct}% transfer reserve at
                  today's rates; each payment keeps the rates it settled with) − OTOT fee (15% of the remainder) −
                  Ministry fee (15% of the remainder). A vendor's share is payable as soon as the Ministry assigns
                  them. Not payable = test money or a refunded or reversed payment; it is never paid out. Planting:
                  Funded → Assigned → Reported planted → Verified.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={payTarget !== null} onOpenChange={(open) => !open && !paying && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{payTarget ? PAY_TITLE[payTarget.recipientType] : ""}</DialogTitle>
            <DialogDescription>
              One M-Pesa B2C transfer per recipient through Afrinet. This sends real money and can't be recalled.
              Selected shares are marked Initiated until Afrinet confirms them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {payBreakdown.map((g) => (
              <div key={g.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.phone ? (
                      <span className="font-mono">{g.phone}</span>
                    ) : (
                      <span className="text-destructive">No wallet set</span>
                    )}{" "}
                    · {g.count} {g.count === 1 ? "donation" : "donations"}
                  </div>
                </div>
                <span className="font-semibold tabular-nums">{kes(g.kes)}</span>
              </div>
            ))}
            {missingWallet && (
              <p className="text-sm text-destructive">Add the missing M-Pesa numbers on the Wallets screen first.</p>
            )}
            {overview && !overview.sdkConfigured && (
              <p className="text-sm text-amber-700">
                Afrinet is not configured here, so transfers are simulated and marked Transferred immediately.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={paying} onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button disabled={paying || payBreakdown.length === 0 || missingWallet} onClick={() => void submitPay()}>
              {paying ? "Sending…" : `Send ${kes(payBreakdown.reduce((s, g) => s + g.kes, 0))}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResolvePayoutDialog
        payout={resolving}
        onClose={() => setResolving(null)}
        onResolve={async (input) => {
          if (!resolving) return;
          await resolvePayout(resolving.id, input);
          toast.success(`Payout marked ${PAYOUT_STATUS_LABEL[input.status].toLowerCase()}`);
          setResolving(null);
        }}
      />

      <ReasonDialog
        open={reviewing !== null}
        onOpenChange={(open) => !open && setReviewing(null)}
        title="Mark this payout reviewed?"
        description={
          <>
            <p>
              {reviewing?.recipientName} · {reviewing ? kes(reviewing.amountKes) : ""} ·{" "}
              <span className="font-mono">{reviewing?.reference}</span>
            </p>
            <p>
              A late success arrived after this payout's shares were sent again, so the recipient may have been paid
              twice. Record how it was settled (e.g. recovered, or deducted from the next payout). This clears the flag.
            </p>
          </>
        }
        label="How was it settled?"
        confirmLabel="Mark reviewed"
        onConfirm={async (note) => {
          await acknowledgePayoutReview(reviewing!.id, note);
          toast.success("Payout marked reviewed");
        }}
      />

      <ResolvePaymentDialog
        payment={resolvingPayment}
        onClose={() => setResolvingPayment(null)}
        onResolve={async (input) => {
          if (!resolvingPayment) return;
          await resolvePayment(resolvingPayment.id, input);
          toast.success(input.status === "success" ? "Payment marked paid" : "Payment marked failed");
          setResolvingPayment(null);
        }}
      />

      <ReasonDialog
        open={refunding !== null}
        onOpenChange={(open) => !open && setRefunding(null)}
        title="Refund this payment?"
        description={
          <>
            <p>
              {refunding?.amountKes ? kes(refunding.amountKes) : refunding ? usd(refunding.amount) : ""} ·{" "}
              {refunding?.issue ? ISSUE_LABEL[refunding.issue] : ""} ·{" "}
              <span className="font-mono">{refunding?.afrinetTransactionCode}</span>
            </p>
            <p>
              Asks Afrinet to reverse the charge to the payer. Its unpaid shares become not payable; any share already
              sent must be recovered by hand.
              {refunding?.issue === "amount_mismatch"
                ? " Unless another payment covers the donation, it is marked refunded and its trees are no longer funded."
                : " The donation's original payment is not affected."}{" "}
              This can't be undone.
            </p>
          </>
        }
        label="Reason for the refund"
        confirmLabel="Refund payment"
        destructive
        onConfirm={async (reason) => {
          const payment = await refundPayment(refunding!.id, reason);
          toast.success(
            payment.status === "refunded"
              ? "Payment refunded"
              : "Refund requested. Afrinet will confirm it; the payment updates when it does.",
          );
        }}
      />
    </div>
  );
}

function ResolvePayoutDialog({
  payout,
  onClose,
  onResolve,
}: {
  payout: Payout | null;
  onClose: () => void;
  onResolve: (input: { status: "transferred" | "failed"; transactionCode?: string; note?: string }) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<"transferred" | "failed">("transferred");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOutcome("transferred");
    setCode(payout?.transactionCode ?? "");
    setNote("");
  }, [payout]);

  // The API needs a transaction code to mark it transferred (unless Afrinet sent one) and a reason to mark it failed.
  const missing =
    outcome === "transferred"
      ? !code.trim() && !payout?.transactionCode
        ? "Enter the M-Pesa transaction code from the Afrinet merchant portal."
        : null
      : !note.trim()
        ? "Explain why it failed."
        : null;

  const submit = async () => {
    setBusy(true);
    try {
      await onResolve({
        status: outcome,
        transactionCode: code.trim() || undefined,
        note: note.trim() || undefined,
      });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={payout !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve payout</DialogTitle>
          <DialogDescription>
            Use this only after checking the Afrinet merchant portal for what actually happened to this transfer.
          </DialogDescription>
        </DialogHeader>
        {payout && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border px-3 py-2">
              <div className="font-medium">
                {payout.recipientName} · {kes(payout.amountKes)}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {payout.reference} · {payout.mpesaPhone}
              </div>
            </div>
            <div className="space-y-2">
              <Label>What happened?</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as "transferred" | "failed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferred">The money arrived (transferred)</SelectItem>
                  <SelectItem value="failed">The money never left (failed)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {outcome === "transferred"
                  ? "Its shares are marked transferred."
                  : "Its shares become payable again and may be sent a second time. Only choose this if the portal shows no transfer."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-code">
                M-Pesa transaction code{outcome === "transferred" && !payout.transactionCode ? " (required)" : ""}
              </Label>
              <Input id="resolve-code" value={code} maxLength={64} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-note">Note{outcome === "failed" ? " (required)" : " (optional)"}</Label>
              <Textarea
                id="resolve-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={outcome === "failed" ? "e.g. Merchant portal shows the B2C request was rejected." : ""}
              />
            </div>
            {missing && <p className="text-xs text-muted-foreground">{missing}</p>}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={outcome === "failed" ? "destructive" : "default"}
            disabled={busy || Boolean(missing)}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : outcome === "failed" ? "Mark failed" : "Mark transferred"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolvePaymentDialog({
  payment,
  onClose,
  onResolve,
}: {
  payment: Payment | null;
  onClose: () => void;
  onResolve: (input: { status: "success" | "failed"; receipt?: string; note: string }) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<"success" | "failed">("success");
  const [receipt, setReceipt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOutcome("success");
    setReceipt("");
    setNote("");
  }, [payment]);

  const missing =
    outcome === "success" && !receipt.trim()
      ? "Enter the M-Pesa receipt or card transaction reference from the merchant portal."
      : !note.trim()
        ? "Add a note explaining how you confirmed this."
        : null;

  const submit = async () => {
    setBusy(true);
    try {
      await onResolve({
        status: outcome,
        receipt: outcome === "success" ? receipt.trim() : undefined,
        note: note.trim(),
      });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve payment</DialogTitle>
          <DialogDescription>
            For a charge Afrinet never confirmed (or confirmed with a different amount). Check the Afrinet merchant
            portal first.
          </DialogDescription>
        </DialogHeader>
        {payment && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border px-3 py-2">
              <div className="font-medium">
                {payment.amountKes ? kes(payment.amountKes) : usd(payment.amount)} · {payment.paymentMode} ·{" "}
                {payment.status}
                {payment.issue ? ` · ${ISSUE_LABEL[payment.issue]}` : ""}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {payment.externalReference ?? payment.id}
                {payment.failureMessage ? ` · ${payment.failureMessage}` : ""}
              </div>
            </div>
            <div className="space-y-2">
              <Label>What happened?</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as "success" | "failed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">The tourist paid (mark paid)</SelectItem>
                  <SelectItem value="failed">No money arrived (mark failed)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {outcome === "success"
                  ? "The donation becomes paid, its trees are funded and the money is split into payable shares."
                  : "The payment stays unpaid. The tourist can try again."}
              </p>
            </div>
            {outcome === "success" && (
              <div className="space-y-2">
                <Label htmlFor="payment-receipt">M-Pesa receipt or card reference (required)</Label>
                <Input
                  id="payment-receipt"
                  value={receipt}
                  maxLength={64}
                  onChange={(e) => setReceipt(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="payment-note">Note (required)</Label>
              <Textarea
                id="payment-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Receipt QJK1ABC2 found in the merchant portal on 6 Oct."
              />
            </div>
            {missing && <p className="text-xs text-muted-foreground">{missing}</p>}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={outcome === "failed" ? "destructive" : "default"}
            disabled={busy || Boolean(missing)}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : outcome === "failed" ? "Mark failed" : "Mark paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
