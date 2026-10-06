import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, CheckCircle2, Circle, Clock, Eye, ListChecks, MoreHorizontal, RefreshCw, Search, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kes, shortDate, treeCount } from "@/lib/format";
import { partnerShareKesByDonation } from "@/lib/ledger";
import { requestDonationIds } from "@/lib/plantingStatus";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  DateTimeCell,
  EmptyCard,
  IconStatCard,
  PartnerPageHeader,
  Spinner,
  StaticHead,
  StatusPill,
  SummaryStatCard,
  TablePager,
} from "@/components/partner/PartnerUI";
import {
  PAGE_SIZE,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  VENDOR_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_ORDER,
  fmtNum,
  shortRef,
} from "@/components/partner/partnerTheme";
import { useRefresh } from "@/components/partner/useRefresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VendorPlantationRequest, VendorRequestStatus } from "@/types/otot";

const NEXT: Record<VendorRequestStatus, VendorRequestStatus | null> = {
  assigned: "in_progress",
  in_progress: "completed",
  completed: null,
};

const NEXT_ACTION: Record<VendorRequestStatus, string> = {
  assigned: "Mark assigned",
  in_progress: "Mark in progress",
  completed: "Report planting done",
};

export default function PartnerAssignments() {
  const { session } = useAuth();
  const { state, loading, refresh, updateVendorRequestStatus } = useStore();
  const { refreshing, run: handleRefresh } = useRefresh(refresh);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<VendorPlantationRequest | null>(null);
  const [reporting, setReporting] = useState<VendorPlantationRequest | null>(null);
  const isAdmin = session?.role === "partner_admin";
  // Agents receive no payment data; only partner admins see the KES share.
  const shareByDonation = isAdmin ? partnerShareKesByDonation(state, session.vendorId) : new Map<string, number>();
  const mine = state.vendorPlantationRequests.filter((v) =>
    isAdmin ? v.vendorId === session.vendorId : v.assignedAgentId === session?.userId,
  );
  const agents = state.users.filter((u) => u.vendorId === session?.vendorId && u.role === "partner_agent");

  const requestFor = (v: VendorPlantationRequest) => state.plantationRequests.find((r) => r.id === v.plantationRequestId);
  const donationsFor = (v: VendorPlantationRequest) => {
    const request = requestFor(v);
    const ids = new Set(request ? requestDonationIds(request) : []);
    return state.donations.filter((d) => ids.has(d.id));
  };
  const shareFor = (v: VendorPlantationRequest) => {
    const request = requestFor(v);
    return request ? requestDonationIds(request).reduce((s, id) => s + (shareByDonation.get(id) ?? 0), 0) : 0;
  };
  const treesFor = (v: VendorPlantationRequest) => donationsFor(v).reduce((total, d) => total + treeCount(d.trees), 0);
  const speciesFor = (v: VendorPlantationRequest) =>
    donationsFor(v).flatMap((d) => d.trees.map((t) => `${t.count} × ${t.treeType}`));
  const agentName = (v: VendorPlantationRequest) => state.users.find((u) => u.id === v.assignedAgentId)?.name ?? "Agent";

  const advance = async (v: VendorPlantationRequest, next: VendorRequestStatus) => {
    // Reporting the work done sends it to the Ministry for verification, so confirm first.
    if (next === "completed") {
      setReporting(v);
      return;
    }
    try {
      await updateVendorRequestStatus(v.id, next);
      toast.success(`Ticket marked ${VENDOR_STATUS_LABELS[next].toLowerCase()}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const counts = {
    assigned: mine.filter((v) => v.status === "assigned").length,
    in_progress: mine.filter((v) => v.status === "in_progress").length,
    completed: mine.filter((v) => v.status === "completed").length,
  };

  const sorted = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const detailSheet = (
    <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-primary" />
            Ticket {selected ? shortRef(selected.id) : ""}
          </SheetTitle>
        </SheetHeader>
        {selected && (() => {
          const request = requestFor(selected);
          const next = NEXT[selected.status];
          return (
            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ticket Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Ticket ID" value={shortRef(selected.id)} />
                  <InfoField label="Assigned" value={shortDate(selected.createdAt)} />
                  {isAdmin && <InfoField label="Field Agent" value={agentName(selected)} />}
                  <InfoField label="Order ID" value={request ? shortRef(request.id) : undefined} />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Planting</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Trees" value={fmtNum(treesFor(selected))} />
                  {isAdmin && <InfoField label="Partner Share" value={kes(shareFor(selected))} />}
                </div>
                <div className="rounded-lg border bg-card p-4 space-y-1.5">
                  {speciesFor(selected).length > 0 ? (
                    speciesFor(selected).map((line) => (
                      <p key={line} className="text-sm">
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tree records linked.</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket Status</p>
                    <StatusPill label={VENDOR_STATUS_LABELS[selected.status]} className={VENDOR_STATUS_COLORS[selected.status]} />
                  </div>
                  {request && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ministry Request</p>
                      <StatusPill label={REQUEST_STATUS_LABELS[request.status]} className={REQUEST_STATUS_COLORS[request.status]} />
                    </div>
                  )}
                </div>
                {request?.reviewNote && request.status !== "completed" && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="font-medium">Sent back by the Ministry:</span> {request.reviewNote}
                  </p>
                )}
              </div>
              {next && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      await advance(selected, next);
                      setSelected(null);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" /> {NEXT_ACTION[next]}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </SheetContent>
    </Sheet>
  );

  const reportDialog = (
    <ConfirmDialog
      open={reporting !== null}
      onOpenChange={(open) => !open && setReporting(null)}
      title="Report this planting done?"
      description={
        <>
          <p>
            Confirm that all {reporting ? fmtNum(treesFor(reporting)) : ""} trees on ticket{" "}
            <span className="font-mono">{reporting ? shortRef(reporting.id) : ""}</span> are in the ground.
          </p>
          <p>
            The Ministry is then asked to verify the planting. You can't change the ticket after this unless the
            Ministry sends it back.
          </p>
        </>
      }
      confirmLabel="Report planting done"
      busyLabel="Reporting…"
      onConfirm={async () => {
        await updateVendorRequestStatus(reporting!.id, "completed");
        toast.success("Reported done. The Ministry will verify the planting.");
      }}
    />
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">My Tickets</h1>
              <p className="text-muted-foreground">Track assigned plantation tickets and update status as planting work moves</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryStatCard label="Assigned" value={fmtNum(counts.assigned)} valueClassName="text-blue-600" sub="Not yet started" />
            <SummaryStatCard label="In Progress" value={fmtNum(counts.in_progress)} valueClassName="text-orange-600" sub="Planting under way" />
            <SummaryStatCard
              label="Reported Done"
              value={fmtNum(counts.completed)}
              valueClassName="text-green-600"
              sub={`${fmtNum(mine.filter((v) => v.status === "completed").reduce((s, v) => s + treesFor(v), 0))} trees reported done`}
            />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Trees</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && mine.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Spinner className="py-8" />
                    </TableCell>
                  </TableRow>
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tickets yet. Your partner admin will assign plantation work here.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((v) => {
                    const request = requestFor(v);
                    const next = NEXT[v.status];
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs font-medium">{shortRef(v.id)}</TableCell>
                        <TableCell>{shortDate(v.createdAt)}</TableCell>
                        <TableCell className="font-medium">{fmtNum(treesFor(v))}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground">{speciesFor(v).join(", ") || "—"}</TableCell>
                        <TableCell>
                          <StatusPill label={VENDOR_STATUS_LABELS[v.status]} className={VENDOR_STATUS_COLORS[v.status]} />
                          {request?.reviewNote && request.status !== "completed" && (
                            <div className="text-[11px] text-amber-700 mt-1 max-w-[220px] line-clamp-2" title={request.reviewNote}>
                              Sent back: {request.reviewNote}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelected(v)}>
                                <Eye className="mr-2 h-4 w-4" /> View Ticket Info
                              </DropdownMenuItem>
                              {next && (
                                <DropdownMenuItem onClick={() => advance(v, next)}>
                                  <Check className="mr-2 h-4 w-4" /> {NEXT_ACTION[next]}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {detailSheet}
        {reportDialog}
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = sorted.filter((v) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (agentFilter !== "all" && v.assignedAgentId !== agentFilter) return false;
    if (!query) return true;
    return (
      shortRef(v.id).toLowerCase().includes(query) ||
      agentName(v).toLowerCase().includes(query) ||
      speciesFor(v).some((s) => s.toLowerCase().includes(query))
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <PartnerPageHeader
        title="Team Assignments"
        subtitle="Track field agent tickets and update status as planting work moves"
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconStatCard label="Total Tickets" value={fmtNum(mine.length)} icon={ListChecks} tint={{ bg: "bg-primary/10", fg: "text-primary" }} />
        <IconStatCard label="Assigned" value={fmtNum(counts.assigned)} icon={Clock} tint={{ bg: "bg-orange-100", fg: "text-orange-600" }} />
        <IconStatCard label="In Progress" value={fmtNum(counts.in_progress)} icon={TreePine} tint={{ bg: "bg-blue-100", fg: "text-blue-600" }} />
        <IconStatCard label="Reported Done" value={fmtNum(counts.completed)} icon={CheckCircle2} tint={{ bg: "bg-green-100", fg: "text-green-600" }} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket ID, agent or species..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={agentFilter}
          onValueChange={(v) => {
            setAgentFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {VENDOR_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {VENDOR_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && mine.length === 0 ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyCard icon={ListChecks} message={mine.length === 0 ? "Nothing assigned yet." : "No tickets match your filters."} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <StaticHead label="Ticket ID" />
                  <StaticHead label="Assigned" />
                  <StaticHead label="Field Agent" />
                  <StaticHead label="Trees" />
                  <StaticHead label="Species" />
                  <StaticHead label="Partner Share" />
                  <StaticHead label="Planting Status" />
                  <StaticHead label="Action" className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((v) => {
                  const request = requestFor(v);
                  const next = NEXT[v.status];
                  const currentIdx = VENDOR_STATUS_ORDER.indexOf(v.status);
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-medium">{shortRef(v.id)}</TableCell>
                      <TableCell>
                        <DateTimeCell value={v.createdAt} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{agentName(v)}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{fmtNum(treesFor(v))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{speciesFor(v).join(", ") || "—"}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{request ? kes(shareFor(v)) : "—"}</TableCell>
                      <TableCell>
                        {next ? (
                          <Select value="" onValueChange={(value) => advance(v, value as VendorRequestStatus)}>
                            <SelectTrigger className="w-[170px] h-7 text-xs border-2 border-primary/50 bg-primary/5 hover:border-primary font-medium text-left">
                              <SelectValue placeholder={VENDOR_STATUS_LABELS[v.status]} />
                            </SelectTrigger>
                            <SelectContent className="min-w-[200px]">
                              {VENDOR_STATUS_ORDER.map((s, idx) => {
                                const isPassed = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                const isNextStep = s === next;
                                const isFutureSkip = idx > currentIdx + 1;
                                return (
                                  <SelectItem
                                    key={s}
                                    value={s}
                                    disabled={!isNextStep}
                                    className={
                                      isNextStep
                                        ? "bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground"
                                        : "focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                                    }
                                  >
                                    <span className={`flex items-center gap-2 whitespace-nowrap ${isFutureSkip ? "opacity-40" : ""}`}>
                                      {isPassed && (
                                        <span className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                        </span>
                                      )}
                                      {isCurrent && (
                                        <span className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                        </span>
                                      )}
                                      {isNextStep && <ArrowRight className="h-3.5 w-3.5 shrink-0 animate-nudge-right" />}
                                      {!isPassed && !isCurrent && !isNextStep && (
                                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                                      )}
                                      <span className={isCurrent || isNextStep ? "font-semibold" : ""}>{VENDOR_STATUS_LABELS[s]}</span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <StatusPill label={VENDOR_STATUS_LABELS[v.status]} className={VENDOR_STATUS_COLORS[v.status]} />
                        )}
                        {request?.reviewNote && request.status !== "completed" && (
                          <div className="text-[11px] text-amber-700 mt-1 max-w-[220px] line-clamp-2" title={request.reviewNote}>
                            Sent back: {request.reviewNote}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(v)}>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > PAGE_SIZE && <TablePager page={page} total={filtered.length} onPage={setCurrentPage} />}
        </Card>
      )}
      {detailSheet}
      {reportDialog}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}
