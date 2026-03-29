import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Search, Plane, Eye, ChevronDown, ChevronRight, Leaf, FileText, TreePine, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Trip {
  id: string;
  friendly_trip_id: string | null;
  origin_airport: string;
  destination_airport: string;
  travel_class: string;
  is_return: boolean;
  num_travelers: number;
  flight_co2: number;
  accommodation_co2: number;
  accommodation_type: string | null;
  total_co2: number;
  trees_needed: number;
  from_date: string;
  to_date: string | null;
  created_at: string;
  user_id: string;
}

interface UserCountryMap {
  [userId: string]: string | null;
}

interface ContributionRow {
  id: string;
  contribution_id: string;
  contribution_type: string | null;
  tourist_name: string | null;
  country: string | null;
  trip_id: string | null;
  num_trees: number;
  amount_paid: number;
  amount_transferred: number | null;
  status: string;
  created_at: string;
  payment_date: string | null;
  payment_method: string | null;
  currency: string | null;
}

const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  contribution_received: "Received",
  contribution_confirmed: "Confirmed",
  funds_received: "Received by KTB",
  transferred_for_planting: "Transferred for Plantation",
  received_for_planting: "Received for Plantation",
};

const CONTRIBUTION_STATUS_COLORS: Record<string, string> = {
  contribution_received: "bg-gray-50 text-gray-700 border-gray-200",
  contribution_confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  funds_received: "bg-amber-50 text-amber-700 border-amber-200",
  transferred_for_planting: "bg-violet-50 text-violet-700 border-violet-200",
  received_for_planting: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

type SortField = "friendly_trip_id" | "created_at" | "total_co2" | "trees_needed" | "status";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 15;

const formatDate = (d: string | null) => {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "-"; }
};

const DateTimeCell = ({ value }: { value: string | null }) => {
  if (!value) return <span>-</span>;
  try {
    const date = new Date(value);
    return (
      <div className="leading-tight">
        <div className="text-sm">{format(date, "dd/MM/yyyy")}</div>
        <div className="text-[11px] text-muted-foreground">{format(date, "hh:mm:ss a")}</div>
      </div>
    );
  } catch { return <span>-</span>; }
};

export function StakeholderTripManagement() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("trip_management");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userCountries, setUserCountries] = useState<UserCountryMap>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [tripsRes, contribRes] = await Promise.all([
      supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("contribution_tracking" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (tripsRes.data) setTrips(tripsRes.data as any);
    if (contribRes.data) setContributions(contribRes.data as unknown as ContributionRow[]);
    setLoading(false);
  };

  const contribByTrip = useMemo(() => {
    const map: Record<string, ContributionRow[]> = {};
    for (const c of contributions) {
      if (c.trip_id) {
        if (!map[c.trip_id]) map[c.trip_id] = [];
        map[c.trip_id].push(c);
      }
    }
    return map;
  }, [contributions]);

  const treesCommittedByTrip = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contributions) {
      if (c.trip_id) {
        map[c.trip_id] = (map[c.trip_id] || 0) + c.num_trees;
      }
    }
    return map;
  }, [contributions]);

  const getOffsetStatus = (trip: Trip) => {
    const committed = treesCommittedByTrip[trip.id] || 0;
    if (committed >= trip.trees_needed) return "fully_offset";
    if (committed > 0) return "partially_offset";
    return "not_offset";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const SortableHead = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-0.5">{label}{getSortIcon(field)}</span>
    </TableHead>
  );

  const StaticHead = ({ label, className = "" }: { label: string; className?: string }) => (
    <TableHead className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {label}
    </TableHead>
  );

  const filtered = useMemo(() => {
    let result = trips.filter((t) => {
      const s = search.toLowerCase();
      const matchSearch = !search ||
        t.friendly_trip_id?.toLowerCase().includes(s) ||
        t.origin_airport.toLowerCase().includes(s) ||
        t.destination_airport.toLowerCase().includes(s);
      const matchStatus = statusFilter === "all" || getOffsetStatus(t) === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "friendly_trip_id":
          cmp = (a.friendly_trip_id || "").localeCompare(b.friendly_trip_id || "");
          break;
        case "created_at":
          cmp = (a.created_at || "").localeCompare(b.created_at || "");
          break;
        case "total_co2":
          cmp = (Number(a.flight_co2) + Number(a.accommodation_co2)) - (Number(b.flight_co2) + Number(b.accommodation_co2));
          break;
        case "trees_needed":
          cmp = a.trees_needed - b.trees_needed;
          break;
        case "status":
          const order: Record<string, number> = { not_offset: 0, partially_offset: 1, fully_offset: 2 };
          cmp = (order[getOffsetStatus(a)] ?? 0) - (order[getOffsetStatus(b)] ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [trips, search, statusFilter, sortField, sortDir, treesCommittedByTrip]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Stats
  const stats = useMemo(() => {
    const totalTrips = trips.length;
    const totalCO2 = trips.reduce((s, t) => s + Number(t.flight_co2) + Number(t.accommodation_co2), 0);
    const totalTreesNeeded = trips.reduce((s, t) => s + t.trees_needed, 0);
    const totalTreesCommitted = Object.values(treesCommittedByTrip).reduce((s, v) => s + v, 0);
    const fullyOffset = trips.filter(t => getOffsetStatus(t) === "fully_offset").length;
    const partiallyOffset = trips.filter(t => getOffsetStatus(t) === "partially_offset").length;
    const notOffset = trips.filter(t => getOffsetStatus(t) === "not_offset").length;
    return { totalTrips, totalCO2, totalTreesNeeded, totalTreesCommitted, fullyOffset, partiallyOffset, notOffset };
  }, [trips, treesCommittedByTrip]);

  if (permLoading) return <Skeleton className="h-64 w-full m-8" />;

  if (!isEnabled) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">You do not have access to this module.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trip Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View all trips, carbon offset calculations, and contributions</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchData()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Plane className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{formatNumber(stats.totalTrips)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><TreePine className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Trees Committed</p>
                <p className="text-2xl font-bold">{formatNumber(stats.totalTreesCommitted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Leaf className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total CO₂</p>
                <p className="text-2xl font-bold">{formatNumber(Math.round(stats.totalCO2))} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Plane className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Fully Offset</p>
                <p className="text-2xl font-bold">{stats.fullyOffset}<span className="text-sm font-normal text-muted-foreground"> / {stats.totalTrips}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by trip ID, airport..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="fully_offset">Fully Offset</SelectItem>
            <SelectItem value="partially_offset">Partially Offset</SelectItem>
            <SelectItem value="not_offset">Not Offset</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !filtered.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Plane className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No trips found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                    <TableHead className="w-10" />
                    <SortableHead field="friendly_trip_id" label="Trip ID" />
                    <SortableHead field="created_at" label="Date" />
                    <StaticHead label="Route" />
                    <StaticHead label="Class" />
                    <StaticHead label="Return" />
                    <StaticHead label="Travelers" />
                    <StaticHead label="Flight CO₂" />
                    <StaticHead label="Hotel CO₂" />
                    <SortableHead field="total_co2" label="Total CO₂" />
                    <SortableHead field="trees_needed" label="Trees Needed" />
                    <StaticHead label="Trees Committed" />
                    <StaticHead label="Trees Due" />
                    <StaticHead label="Contributions" />
                    <StaticHead label="Total Amount" />
                    <SortableHead field="status" label="Status" />
                    <StaticHead label="Action" className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((trip) => {
                    const tripContribs = contribByTrip[trip.id] || [];
                    const isExpanded = expandedRows.has(trip.id);
                    const committed = treesCommittedByTrip[trip.id] || 0;
                    const totalAmount = tripContribs.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);

                    return (
                      <>
                        <TableRow
                          key={trip.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => tripContribs.length > 0 && toggleExpand(trip.id)}
                        >
                          <TableCell className="w-10 px-3">
                            {tripContribs.length > 0 && (
                              isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">{trip.friendly_trip_id || trip.id.slice(0, 8)}</TableCell>
                          <TableCell><DateTimeCell value={trip.created_at} /></TableCell>
                          <TableCell className="text-sm">{trip.origin_airport} → {trip.destination_airport}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{trip.travel_class}</Badge></TableCell>
                          <TableCell className="text-sm">{trip.is_return ? "Yes" : "No"}</TableCell>
                          <TableCell className="text-sm">{trip.num_travelers}</TableCell>
                          <TableCell className="text-sm tabular-nums">{Number(trip.flight_co2).toFixed(1)} kg</TableCell>
                          <TableCell className="text-sm tabular-nums">{Number(trip.accommodation_co2).toFixed(1)} kg</TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">{(Number(trip.flight_co2) + Number(trip.accommodation_co2)).toFixed(1)} kg</TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">{trip.trees_needed}</TableCell>
                          <TableCell className="text-sm tabular-nums">{committed}</TableCell>
                          <TableCell className="text-sm tabular-nums">{Math.max(0, trip.trees_needed - committed)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{tripContribs.length}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">${totalAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            {committed >= trip.trees_needed ? (
                              <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-green-200 whitespace-nowrap text-[10px] px-2 py-0.5 font-medium">Fully Offset</Badge>
                            ) : committed > 0 ? (
                              <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 border-amber-200 whitespace-nowrap text-[10px] px-2 py-0.5 font-medium">Partially Offset</Badge>
                            ) : (
                              <Badge className="bg-red-100 hover:bg-red-100 text-red-700 border-red-200 whitespace-nowrap text-[10px] px-2 py-0.5 font-medium">Not Offset</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setViewTrip(trip); }}
                              title="View details"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && tripContribs.length > 0 && (
                          <TableRow key={`${trip.id}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={17} className="p-0">
                              <div className="px-4 py-3 space-y-3">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5" />
                                  Contributions for {trip.friendly_trip_id || trip.id.slice(0, 8)}
                                </h4>
                                <div className="rounded-lg border bg-background overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs">Contribution ID</TableHead>
                                        <TableHead className="text-xs">Contributor</TableHead>
                                        <TableHead className="text-xs">Type</TableHead>
                                        <TableHead className="text-xs">Trees</TableHead>
                                        <TableHead className="text-xs">Amount</TableHead>
                                        <TableHead className="text-xs">Method</TableHead>
                                        <TableHead className="text-xs">Date</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {tripContribs.map((c) => (
                                        <TableRow key={c.id}>
                                          <TableCell className="font-mono text-xs">{c.contribution_id}</TableCell>
                                          <TableCell className="text-sm">{c.tourist_name || "-"}</TableCell>
                                          <TableCell>
                                            {c.contribution_type === "travel_agent"
                                              ? <span className="text-xs font-medium text-indigo-600">Agent</span>
                                              : <span className="text-xs font-medium text-teal-600">Tourist</span>}
                                          </TableCell>
                                          <TableCell className="text-sm font-medium">{c.num_trees}</TableCell>
                                          <TableCell className="text-sm tabular-nums">${Number(c.amount_paid).toFixed(2)}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">{c.payment_method || "-"}</TableCell>
                                          <TableCell className="text-sm">{formatDate(c.payment_date || c.created_at)}</TableCell>
                                          <TableCell>
                                            <Badge className={`text-[10px] px-2 py-0.5 font-medium whitespace-nowrap ${CONTRIBUTION_STATUS_COLORS[c.status] || "bg-muted text-muted-foreground"}`}>
                                              {CONTRIBUTION_STATUS_LABELS[c.status] || c.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>←</Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => { const p = parseInt(e.target.value); if (p >= 1 && p <= totalPages) setCurrentPage(p); }}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>→</Button>
            </div>
          )}
        </>
      )}

      {/* View Trip Details Sheet */}
      <Sheet open={!!viewTrip} onOpenChange={(open) => !open && setViewTrip(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {viewTrip && (() => {
            const tripContribs = contribByTrip[viewTrip.id] || [];
            const treesCommitted = treesCommittedByTrip[viewTrip.id] || 0;
            const treesNeeded = viewTrip.trees_needed;
            const progressPct = treesNeeded > 0 ? Math.min(100, Math.round((treesCommitted / treesNeeded) * 100)) : 0;
            const totalAmount = tripContribs.reduce((s, c) => s + Number(c.amount_paid), 0);

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary" />
                    {viewTrip.friendly_trip_id || viewTrip.id.slice(0, 8)}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Trip Details */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trip Details</h3>
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Route</span>
                        <span className="text-sm font-medium">{viewTrip.origin_airport} → {viewTrip.destination_airport}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Travel Class</span>
                        <span className="text-sm font-medium">{viewTrip.travel_class}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Return Trip</span>
                        <span className="text-sm font-medium">{viewTrip.is_return ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Travelers</span>
                        <span className="text-sm font-medium">{viewTrip.num_travelers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Travel Date</span>
                        <span className="text-sm font-medium">{formatDate(viewTrip.from_date)}{viewTrip.to_date ? ` - ${formatDate(viewTrip.to_date)}` : ""}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Accommodation</span>
                        <span className="text-sm font-medium">{viewTrip.accommodation_type || "None"}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Flight CO₂</span>
                        <span className="text-sm font-medium">{Number(viewTrip.flight_co2).toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Accommodation CO₂</span>
                        <span className="text-sm font-medium">{Number(viewTrip.accommodation_co2).toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total CO₂</span>
                        <span className="text-sm font-semibold">{Number(viewTrip.total_co2).toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trees Needed</span>
                        <span className="text-sm font-semibold">{treesNeeded}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Offset Progress */}
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-emerald-50/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-5 w-5 text-emerald-600" />
                          <span className="font-semibold text-sm">Offset Progress</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2 bg-emerald-100 [&>div]:bg-emerald-500" />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span className="text-emerald-600 font-medium">{treesCommitted} committed</span>
                        <span>{treesNeeded} needed</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* All Contributions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      All Contributions ({tripContribs.length})
                    </h3>
                    {tripContribs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No contributions yet for this trip.</p>
                    ) : (
                      <div className="rounded-lg border bg-card overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs font-semibold">Date</TableHead>
                              <TableHead className="text-xs font-semibold">Trees</TableHead>
                              <TableHead className="text-xs font-semibold">Method</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tripContribs.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="text-sm">{formatDate(c.payment_date || c.created_at)}</TableCell>
                                <TableCell className="text-sm font-medium">{c.num_trees}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{c.payment_method || "-"}</TableCell>
                                <TableCell className="text-sm font-semibold text-right">${Number(c.amount_paid).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2">
                              <TableCell className="text-sm font-bold">Total</TableCell>
                              <TableCell className="text-sm font-bold">{treesCommitted}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-sm font-bold text-right">${totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default StakeholderTripManagement;
