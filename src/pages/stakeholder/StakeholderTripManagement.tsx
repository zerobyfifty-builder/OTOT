import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Search, Plane, Eye, ChevronDown, ChevronRight, Leaf, FileText, TreePine } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { format } from "date-fns";
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

const formatDate = (d: string | null) => {
  if (!d) return "-";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "-"; }
};

export function StakeholderTripManagement() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("trip_management");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);

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

  // Map contributions by trip_id
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

  // Compute total trees committed per trip
  const treesCommittedByTrip = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contributions) {
      if (c.trip_id) {
        map[c.trip_id] = (map[c.trip_id] || 0) + c.num_trees;
      }
    }
    return map;
  }, [contributions]);

  const filtered = trips.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.friendly_trip_id?.toLowerCase().includes(s) ||
      t.origin_airport.toLowerCase().includes(s) ||
      t.destination_airport.toLowerCase().includes(s)
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="h-6 w-6 text-blue-600" /> Trip Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">View all trips, carbon offset calculations, and contributions</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by trip ID, airport..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead>Travelers</TableHead>
                    <TableHead>Flight CO₂</TableHead>
                    <TableHead>Hotel CO₂</TableHead>
                    <TableHead>Total CO₂</TableHead>
                    <TableHead>Trees Needed</TableHead>
                    <TableHead>Trees Committed</TableHead>
                    <TableHead>Trees Due</TableHead>
                    <TableHead>Contributions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No trips found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((trip) => {
                      const tripContribs = contribByTrip[trip.id] || [];
                      const isExpanded = expandedRows.has(trip.id);
                      return (
                        <>
                          <TableRow key={trip.id} className="cursor-pointer hover:bg-muted/30" onClick={() => tripContribs.length > 0 && toggleExpand(trip.id)}>
                            <TableCell className="px-2">
                              {tripContribs.length > 0 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleExpand(trip.id); }}>
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-medium">{trip.friendly_trip_id || trip.id.slice(0, 8)}</TableCell>
                            <TableCell className="text-sm">{trip.origin_airport} → {trip.destination_airport}</TableCell>
                            <TableCell><Badge variant="outline">{trip.travel_class}</Badge></TableCell>
                            <TableCell>{trip.is_return ? "Yes" : "No"}</TableCell>
                            <TableCell>{trip.num_travelers}</TableCell>
                            <TableCell>{Number(trip.flight_co2).toFixed(1)} kg</TableCell>
                            <TableCell className="font-medium">{Number(trip.total_co2).toFixed(1)} kg</TableCell>
                            <TableCell>{trip.trees_needed}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{tripContribs.length}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{format(new Date(trip.from_date), "dd MMM yyyy")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={(e) => { e.stopPropagation(); setViewTrip(trip); }}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && tripContribs.length > 0 && (
                            <TableRow key={`${trip.id}-expanded`}>
                              <TableCell colSpan={12} className="p-0">
                                <div className="bg-muted/20 border-t border-b px-6 py-3">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Contributions for {trip.friendly_trip_id || trip.id.slice(0, 8)}
                                  </h4>
                                  <div className="rounded-lg border bg-background overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/30">
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
                                            <TableCell className="text-sm">${Number(c.amount_paid).toFixed(2)}</TableCell>
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
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <Plane className="h-5 w-5 text-blue-600" />
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
