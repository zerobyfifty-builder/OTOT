import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { usd } from "@/lib/format";
import {
  DateTimeCell,
  PartnerPageHeader,
  Spinner,
  StaticHead,
  StatusPill,
  SummaryStatCard,
  TablePager,
} from "@/components/partner/PartnerUI";
import {
  PAGE_SIZE,
  PAYOUT_STATUS_COLORS,
  PAYOUT_STATUS_LABELS,
  shortRef,
} from "@/components/partner/partnerTheme";
import { useRefresh } from "@/components/partner/useRefresh";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { PayoutStatus } from "@/types/otot";

export default function PartnerPayouts() {
  const { session } = useAuth();
  const { state, loading, refresh } = useStore();
  const { refreshing, run: handleRefresh } = useRefresh(refresh);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const requestIds = state.plantationRequests
    .filter((r) => r.partnerId === session?.vendorId)
    .map((r) => r.id);
  const payouts = state.plantationPayouts.filter((p) => requestIds.includes(p.plantationRequestId));
  const totalAmount = payouts.reduce((s, p) => s + p.amount, 0);
  const paidRows = payouts.filter((p) => p.payoutStatus === "paid");
  const pendingRows = payouts.filter((p) => p.payoutStatus === "pending" || p.payoutStatus === "processing");
  const paidTotal = paidRows.reduce((s, p) => s + p.amount, 0);
  const pendingTotal = pendingRows.reduce((s, p) => s + p.amount, 0);
  const balance = totalAmount - paidTotal;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...payouts]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((p) => {
        if (statusFilter !== "all" && p.payoutStatus !== statusFilter) return false;
        if (!q) return true;
        return (
          shortRef(p.id).toLowerCase().includes(q) ||
          p.transactionReferenceNumber.toLowerCase().includes(q) ||
          p.transactionId.toLowerCase().includes(q)
        );
      });
  }, [payouts, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <PartnerPageHeader
        title="Climate Funding"
        subtitle="End-to-end plantation share from allocation to M-Pesa confirmation"
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard
          label="Total Allocated"
          value={usd(totalAmount)}
          sub={`${payouts.length} batches`}
        />
        <SummaryStatCard
          label="Transferred"
          value={usd(paidTotal)}
          valueClassName="text-violet-600"
          sub={`${paidRows.length} contributions`}
        />
        <SummaryStatCard
          label="Funds Received"
          value={usd(paidTotal)}
          valueClassName="text-amber-600"
          sub={`${paidRows.length} contributions`}
        />
        <SummaryStatCard
          label="Balance"
          value={usd(balance)}
          valueClassName={balance >= 0 ? "text-emerald-600" : "text-red-600"}
          sub={`${pendingRows.length} contributions`}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference or transaction ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(PAYOUT_STATUS_LABELS) as PayoutStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {PAYOUT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && payouts.length === 0 ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <StaticHead label="Date" />
                  <StaticHead label="Amount" />
                  <StaticHead label="Reference" />
                  <StaticHead label="Transaction" />
                  <StaticHead label="Status" />
                  <StaticHead label="Note" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payouts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <DateTimeCell value={p.createdAt} />
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{usd(p.amount)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionReferenceNumber || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionId || "—"}</TableCell>
                      <TableCell>
                        <StatusPill
                          label={PAYOUT_STATUS_LABELS[p.payoutStatus]}
                          className={PAYOUT_STATUS_COLORS[p.payoutStatus]}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {p.failureMessage ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePager page={current} total={filtered.length} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
