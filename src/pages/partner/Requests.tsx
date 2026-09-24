import { Fragment, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, DollarSign, Search, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, treeCount, usd } from "@/lib/format";
import {
  DateTimeCell,
  EmptyCard,
  IconStatCard,
  PartnerPageHeader,
  Spinner,
  StaticHead,
  StatusPill,
} from "@/components/partner/PartnerUI";
import {
  PAGE_SIZE,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_ORDER,
  VENDOR_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
  fmtNum,
  shortRef,
} from "@/components/partner/partnerTheme";
import { useRefresh } from "@/components/partner/useRefresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PartnerRequests() {
  const { session } = useAuth();
  const { state, loading, refresh, createVendorPlantationRequest } = useStore();
  const { refreshing, run: handleRefresh } = useRefresh(refresh);
  const [agentPick, setAgentPick] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const vendorId = session?.vendorId;
  const requests = state.plantationRequests.filter((r) => r.partnerId === vendorId);
  const agents = state.users.filter((u) => u.vendorId === vendorId && u.role === "partner_agent");

  const donationsFor = (donationIds: string[]) => state.donations.filter((d) => donationIds.includes(d.id));
  const treesFor = (donationIds: string[]) =>
    donationsFor(donationIds).reduce((total, d) => total + treeCount(d.trees), 0);

  const totalTrees = requests.reduce((s, r) => s + treesFor(r.donationIds), 0);
  const completedTrees = requests
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + treesFor(r.donationIds), 0);
  const plantingAmount = requests.reduce((s, r) => s + r.amount, 0);

  const query = search.trim().toLowerCase();
  const filtered = [...requests]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((r) => {
      if (statusFilter === "not_created") {
        if (state.vendorPlantationRequests.some((v) => v.plantationRequestId === r.id)) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const species = donationsFor(r.donationIds).flatMap((d) => d.trees.map((t) => t.treeType.toLowerCase()));
      return shortRef(r.id).toLowerCase().includes(query) || species.some((s) => s.includes(query));
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <PartnerPageHeader
        title="Tree Orders"
        subtitle="Plantation requests from the ministry — create a vendor request and assign it to a field agent"
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <IconStatCard label="Total Allocated" value={fmtNum(totalTrees)} icon={TreePine} tint={{ bg: "bg-primary/10", fg: "text-primary" }} />
        <IconStatCard label="Completed" value={fmtNum(completedTrees)} icon={CheckCircle2} tint={{ bg: "bg-green-100", fg: "text-green-600" }} />
        <IconStatCard label="Planting Amount" value={usd(plantingAmount)} icon={DollarSign} tint={{ bg: "bg-blue-100", fg: "text-blue-600" }} />
        <IconStatCard
          label="Pending Planting"
          value={fmtNum(totalTrees - completedTrees)}
          icon={Clock}
          tint={{ bg: "bg-orange-100", fg: "text-orange-600" }}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID or species..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
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
            {REQUEST_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {REQUEST_STATUS_LABELS[s]}
              </SelectItem>
            ))}
            <SelectItem value="not_created">Awaiting agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && requests.length === 0 ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyCard icon={TreePine} message={requests.length === 0 ? "No plantation requests assigned yet." : "No tree orders found."} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10" />
                    <StaticHead label="Order ID" />
                    <StaticHead label="Date" />
                    <StaticHead label="Trees" />
                    <StaticHead label="Planting Amnt" />
                    <StaticHead label="Request Status" />
                    <StaticHead label="Vendor Request" />
                    <StaticHead label="Assign Agent" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r) => {
                    const donations = donationsFor(r.donationIds);
                    const vpr = state.vendorPlantationRequests.find((v) => v.plantationRequestId === r.id);
                    const agent = vpr ? state.users.find((u) => u.id === vpr.assignedAgentId) : undefined;
                    const isExpanded = expanded.has(r.id);
                    const lines = donations.flatMap((d) => d.trees.map((t) => ({ ...t, donationId: d.id, createdAt: d.createdAt })));
                    return (
                      <Fragment key={r.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleRow(r.id)}>
                          <TableCell className="w-10 px-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">{shortRef(r.id)}</TableCell>
                          <TableCell>
                            <DateTimeCell value={r.createdAt} />
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">{fmtNum(treeCount(donations.flatMap((d) => d.trees)))}</TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">{usd(r.amount)}</TableCell>
                          <TableCell>
                            <StatusPill label={REQUEST_STATUS_LABELS[r.status]} className={REQUEST_STATUS_COLORS[r.status]} />
                          </TableCell>
                          <TableCell>
                            {vpr ? (
                              <div className="leading-tight">
                                <StatusPill label={VENDOR_STATUS_LABELS[vpr.status]} className={VENDOR_STATUS_COLORS[vpr.status]} />
                                {agent && <div className="text-[11px] text-muted-foreground mt-1">{agent.name}</div>}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not created</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {!vpr ? (
                              <div className="flex items-center gap-1.5">
                                <Select
                                  value={agentPick[r.id] || ""}
                                  onValueChange={(v) => setAgentPick((p) => ({ ...p, [r.id]: v }))}
                                >
                                  <SelectTrigger className="w-[170px] h-7 text-xs border-2 border-primary/50 bg-primary/5 hover:border-primary font-medium text-left">
                                    <SelectValue placeholder="Select agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agents.map((a) => (
                                      <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold"
                                  onClick={async () => {
                                    const agentId = agentPick[r.id];
                                    if (!agentId) {
                                      toast.error("Pick an agent");
                                      return;
                                    }
                                    try {
                                      await createVendorPlantationRequest(r.id, agentId);
                                      toast.success("Assigned to agent");
                                    } catch (err) {
                                      toast.error(apiErrorMessage(err));
                                    }
                                  }}
                                >
                                  Assign
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/60 hover:bg-muted/60">
                            <TableCell colSpan={8} className="p-0">
                              <div className="py-3">
                                {lines.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b border-border/40">
                                          <TableHead className="w-12 text-xs">No.</TableHead>
                                          <TableHead className="text-xs">Species</TableHead>
                                          <TableHead className="text-xs">Trees</TableHead>
                                          <TableHead className="text-xs">Contribution Date</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lines.map((line, index) => (
                                          <TableRow key={`${line.donationId}-${line.treeTypeId}-${index}`}>
                                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="text-xs text-foreground">{line.treeType}</TableCell>
                                            <TableCell className="text-xs font-medium tabular-nums">{fmtNum(line.count)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{shortDate(line.createdAt)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground py-2 px-4">No tree records linked to this request.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, page - 1))} disabled={page === 1}>
                ←
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page}
                  onChange={(e) => {
                    const p = parseInt(e.target.value);
                    if (p >= 1 && p <= totalPages) setCurrentPage(p);
                  }}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
