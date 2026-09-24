import { useMemo, useState } from "react";
import { Building2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { AdminSpinner, TablePagination } from "@/components/admin/TablePagination";
import { UNDERLINE_TABS_LIST, UNDERLINE_TABS_TRIGGER, UPPERCASE_HEAD } from "@/components/admin/styles";
import { usePagination } from "@/components/admin/usePagination";
import { VendorActionsMenu, VendorFormSheet } from "@/components/admin/partners/VendorActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

type StatusTab = "all" | "active" | "inactive";

const TAB_LABELS: Record<StatusTab, string> = {
  all: "All Partners",
  active: "Active",
  inactive: "Inactive",
};

const PAGE_SIZE = 10;

export default function AdminVendors() {
  const { state, loading, refresh } = useStore();
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tabCounts: Record<StatusTab, number> = {
    all: state.vendors.length,
    active: state.vendors.filter((v) => v.status === "active").length,
    inactive: state.vendors.filter((v) => v.status === "inactive").length,
  };

  const regions = useMemo(
    () => [...new Set(state.vendors.map((v) => v.region).filter(Boolean))].sort(),
    [state.vendors],
  );

  const agentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of state.vendorAgents) counts.set(a.vendorId, (counts.get(a.vendorId) ?? 0) + 1);
    return counts;
  }, [state.vendorAgents]);

  const orderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of state.vendorPlantationRequests) counts.set(r.vendorId, (counts.get(r.vendorId) ?? 0) + 1);
    return counts;
  }, [state.vendorPlantationRequests]);

  const vendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.vendors.filter(
      (v) =>
        (activeTab === "all" || v.status === activeTab) &&
        (regionFilter === "all" || v.region === regionFilter) &&
        (!q || v.name.toLowerCase().includes(q) || v.region.toLowerCase().includes(q) || (v.mpesaPhone ?? "").includes(q)),
    );
  }, [state.vendors, activeTab, regionFilter, search]);

  const pager = usePagination(vendors, PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage plantation partner organisations and their payout details.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Partner
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as StatusTab);
          pager.resetPage();
        }}
        className="w-full"
      >
        <TabsList className={UNDERLINE_TABS_LIST}>
          {(Object.keys(TAB_LABELS) as StatusTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab} className={UNDERLINE_TABS_TRIGGER}>
              {TAB_LABELS[tab]}
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {tabCounts[tab]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="border shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, region, or M-Pesa number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pager.resetPage();
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={regionFilter}
            onValueChange={(v) => {
              setRegionFilter(v);
              pager.resetPage();
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <AdminSpinner />
          ) : vendors.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {state.vendors.length === 0 ? "No partners found." : "No partners match these filters."}
              </p>
              {state.vendors.length === 0 && (
                <Button onClick={() => setCreateOpen(true)} className="mt-4">
                  Create Your First Partner
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className={UPPERCASE_HEAD}>Name</TableHead>
                      <TableHead className={UPPERCASE_HEAD}>Region</TableHead>
                      <TableHead className={UPPERCASE_HEAD}>M-Pesa</TableHead>
                      <TableHead className={UPPERCASE_HEAD}>Agents</TableHead>
                      <TableHead className={UPPERCASE_HEAD}>Work Orders</TableHead>
                      <TableHead className={UPPERCASE_HEAD}>Status</TableHead>
                      <TableHead className={`${UPPERCASE_HEAD} w-10`}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>{v.region || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{v.mpesaPhone || "-"}</TableCell>
                        <TableCell className="tabular-nums">{agentCounts.get(v.id) ?? 0}</TableCell>
                        <TableCell className="tabular-nums">{orderCounts.get(v.id) ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={v.status === "active" ? "default" : "secondary"}>
                            {v.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <VendorActionsMenu vendor={v} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                compact
                currentPage={pager.currentPage}
                pageSize={pager.pageSize}
                totalCount={pager.totalCount}
                onPageChange={pager.setPage}
              />
            </>
          )}
        </div>
      </Card>

      <VendorFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
