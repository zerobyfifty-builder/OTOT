import { useMemo, useState, type ReactNode } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { AdminSpinner, TablePagination } from "@/components/admin/TablePagination";
import { downloadCsv, UNDERLINE_TABS_LIST, UNDERLINE_TABS_TRIGGER } from "@/components/admin/styles";
import { usePagination } from "@/components/admin/usePagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FinanceTab = "donations" | "requests" | "payments";

interface Column {
  label: string;
  className?: string;
}

interface Row {
  id: string;
  status: string;
  search: string;
  cells: ReactNode[];
  csv: (string | number)[];
}

const TABS: { value: FinanceTab; label: string; noun: string; statuses: string[] }[] = [
  { value: "donations", label: "Donations", noun: "donations", statuses: ["pending_payment", "paid", "refunded"] },
  {
    value: "requests",
    label: "Plantation Requests",
    noun: "requests",
    statuses: ["unassigned", "assigned", "in_progress", "ready_for_review", "completed"],
  },
  { value: "payments", label: "Payments", noun: "payments", statuses: ["pending", "success", "failed"] },
];

const COLUMNS: Record<FinanceTab, Column[]> = {
  donations: [
    { label: "Date" },
    { label: "User Email" },
    { label: "ID" },
    { label: "Trees" },
    { label: "Offset" },
    { label: "Status" },
    { label: "Amount", className: "text-right" },
  ],
  requests: [
    { label: "Date" },
    { label: "ID" },
    { label: "Donations" },
    { label: "Partner" },
    { label: "Status" },
    { label: "Amount", className: "text-right" },
  ],
  payments: [
    { label: "Date" },
    { label: "User Email" },
    { label: "Reference" },
    { label: "Mode" },
    { label: "Status" },
    { label: "Amount", className: "text-right" },
  ],
};

const PAGE_SIZES = [25, 50, 100];
const shortId = (id: string) => id.substring(0, 8);
const byNewest = <T extends { createdAt: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export default function AdminFinance() {
  const { state, loading, refresh } = useStore();
  const [tab, setTab] = useState<FinanceTab>("donations");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const successful = state.payments.filter((p) => p.status === "success");
  const pending = state.payments.filter((p) => p.status === "pending");

  const rowsByTab = useMemo<Record<FinanceTab, Row[]>>(() => {
    const email = new Map(state.users.map((u) => [u.id, u.email]));
    const vendor = new Map(state.vendors.map((v) => [v.id, v.name]));
    const donationUser = new Map(state.donations.map((d) => [d.id, d.userId]));
    const userEmail = (userId?: string) => (userId ? email.get(userId) ?? "" : "");

    const donations = byNewest(state.donations).map((d): Row => {
      const trees = treeCount(d.trees);
      const mail = userEmail(d.userId);
      return {
        id: d.id,
        status: d.status,
        search: `${mail} ${d.id}`.toLowerCase(),
        cells: [
          shortDate(d.createdAt),
          <span className="font-medium">{mail || "—"}</span>,
          <span className="font-mono text-sm">{shortId(d.id)}</span>,
          trees,
          kg(d.carbonOffsetKg),
          <StatusBadge status={d.status} />,
          <span className="font-medium">{usd(d.amount)}</span>,
        ],
        csv: [shortDate(d.createdAt), mail, d.id, trees, d.carbonOffsetKg, d.status, d.amount.toFixed(2)],
      };
    });

    const requests = byNewest(state.plantationRequests).map((r): Row => {
      const partner = r.partnerId ? vendor.get(r.partnerId) ?? "" : "";
      const count = r.donationIds.length || 1;
      return {
        id: r.id,
        status: r.status,
        search: `${partner} ${r.id}`.toLowerCase(),
        cells: [
          shortDate(r.createdAt),
          <span className="font-mono text-sm">{shortId(r.id)}</span>,
          count,
          partner || <span className="text-muted-foreground">Unassigned</span>,
          <StatusBadge status={r.status} />,
          <span className="font-medium">{usd(r.amount)}</span>,
        ],
        csv: [shortDate(r.createdAt), r.id, count, partner, r.status, r.amount.toFixed(2)],
      };
    });

    const payments = byNewest(state.payments).map((p): Row => {
      const mail = userEmail(donationUser.get(p.donationId));
      const reference = p.mpesaReceipt || p.externalReference || p.afrinetTransactionCode || p.id;
      return {
        id: p.id,
        status: p.status,
        search: `${mail} ${reference} ${p.id}`.toLowerCase(),
        cells: [
          shortDate(p.createdAt),
          <span className="font-medium">{mail || "—"}</span>,
          <span className="font-mono text-sm">{reference === p.id ? shortId(p.id) : reference}</span>,
          <Badge variant="outline">{p.paymentMode}</Badge>,
          <StatusBadge status={p.status} />,
          <span className="font-medium">{usd(p.amount)}</span>,
        ],
        csv: [shortDate(p.createdAt), mail, reference, p.paymentMode, p.status, p.amount.toFixed(2)],
      };
    });

    return { donations, requests, payments };
  }, [state.users, state.vendors, state.donations, state.plantationRequests, state.payments]);

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const columns = COLUMNS[tab];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowsByTab[tab].filter(
      (r) => (statusFilter === "all" || r.status === statusFilter) && (!q || r.search.includes(q)),
    );
  }, [rowsByTab, tab, search, statusFilter]);

  const pager = usePagination(rows, 25);

  const exportRows = () => {
    downloadCsv(`${tab}-${new Date().toISOString().split("T")[0]}.csv`, [columns.map((c) => c.label), ...rows.map((r) => r.csv)]);
    toast.success("Transactions exported successfully");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Financial Transactions</h1>
          <p className="text-muted-foreground mt-1">Donations, plantation requests, and payments</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Collected", value: usd(successful.reduce((s, p) => s + p.amount, 0)) },
          { label: "Successful Payments", value: successful.length },
          { label: "Pending Payments", value: pending.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
                {rowsByTab[t.value].length}
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
                placeholder={tab === "requests" ? "Search by partner or ID..." : "Search by email or ID..."}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  pager.resetPage();
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                pager.resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {activeTab.statuses.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
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
                      {columns.map((c) => (
                        <TableHead key={c.label} className={c.className}>
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.map((row) => (
                      <TableRow key={row.id}>
                        {row.cells.map((cell, i) => (
                          <TableCell key={columns[i].label} className={columns[i].className}>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
