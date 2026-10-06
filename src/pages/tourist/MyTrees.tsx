import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, Cloud, Eye, MapPin, Plane, Plus, ShoppingBag, Sprout, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, treeCount, usd } from "@/lib/format";
import { DIRECT_DONATION, tripTypeLabel } from "@/lib/offsetLabels";
import { carbonOffsetForTrip, remainingCarbonKg, remainingTrees, tripRouteLabel } from "@/lib/trips";
import { PLANTED_HERE, STAGE_ORDER, TOURIST_STAGE_LABELS, toTouristStage, type TouristStage } from "@/lib/treeStages";
import type { Donation, PlantationRequest, Trip } from "@/types/otot";
import { TripDetailsDialog } from "@/components/tourist/TripDetailsDialog";
import { OffsetTripButton, PendingPaymentLink } from "@/components/tourist/OffsetTripButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

const ITEMS_PER_PAGE = 10;

const PARTLY_PLANTED = "Partly planted";

function groupStatus(stages: TouristStage[]) {
  if (stages.length === 0) return TOURIST_STAGE_LABELS.waiting;
  if (stages.every((s) => s === "planted")) return TOURIST_STAGE_LABELS.planted;
  if (stages.some((s) => s === "planted")) return PARTLY_PLANTED;
  const min = stages.reduce<TouristStage>(
    (acc, s) => (STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(acc) ? s : acc),
    "planted",
  );
  return TOURIST_STAGE_LABELS[min];
}

function groupStatusColor(status: string) {
  if (status === TOURIST_STAGE_LABELS.planted) return "bg-accent/10 text-accent border-accent/20";
  if (status === PARTLY_PLANTED) return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  if (status === TOURIST_STAGE_LABELS.waiting) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (status === TOURIST_STAGE_LABELS.assigned) return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  if (status === TOURIST_STAGE_LABELS.scheduled) return "bg-cyan-500/10 text-cyan-700 border-cyan-500/20";
  if (status === TOURIST_STAGE_LABELS.verifying) return "bg-violet-500/10 text-violet-700 border-violet-500/20";
  return "bg-muted text-muted-foreground";
}

const STAGE_TONES: Record<TouristStage, string> = {
  waiting: "text-yellow-700",
  assigned: "text-orange-700",
  scheduled: "text-cyan-700",
  verifying: "text-violet-700",
  planted: "text-emerald-700",
};

const fmt = (n: number) => Math.round(n).toLocaleString();
const fmtCompact = (n: number) => {
  const r = Math.round(n);
  if (r >= 1_000_000) return `${(r / 1_000_000).toFixed(r >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (r >= 10_000) return `${(r / 1_000).toFixed(r >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return r.toLocaleString();
};

interface TreeGroup {
  key: string;
  trip: Trip | null;
  donations: Donation[];
  totalTrees: number;
  totalAmount: number;
  latestDate: string;
}

export default function MyTrees() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { state } = useStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const mine = useMemo(
    () => state.donations.filter((d) => d.userId === session?.userId && d.status === "paid"),
    [session?.userId, state.donations],
  );
  const trips = useMemo(
    () => state.trips.filter((t) => t.userId === session?.userId),
    [session?.userId, state.trips],
  );

  const requestByDonation = useMemo(() => {
    const map = new Map<string, PlantationRequest>();
    for (const req of state.plantationRequests) {
      for (const donationId of req.donationIds) map.set(donationId, req);
    }
    return map;
  }, [state.plantationRequests]);

  const groups = useMemo<TreeGroup[]>(() => {
    const byKey = new Map<string, Donation[]>();
    for (const donation of mine) {
      const key = donation.tripId ?? "__direct__";
      const list = byKey.get(key) ?? [];
      list.push(donation);
      byKey.set(key, list);
    }
    const build = (key: string, donations: Donation[]): TreeGroup => {
      const sorted = donations.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
      return {
        key,
        trip: key === "__direct__" ? null : trips.find((t) => t.id === key) ?? null,
        donations: sorted,
        totalTrees: sorted.reduce((sum, d) => sum + treeCount(d.trees), 0),
        totalAmount: sorted.reduce((sum, d) => sum + d.amount, 0),
        latestDate: sorted[sorted.length - 1].createdAt,
      };
    };
    const tripGroups = [...byKey.entries()]
      .filter(([key]) => key !== "__direct__")
      .map(([key, list]) => build(key, list))
      .sort((a, b) => +new Date(b.latestDate) - +new Date(a.latestDate));
    const direct = byKey.get("__direct__");
    return direct ? [...tripGroups, build("__direct__", direct)] : tripGroups;
  }, [mine, trips]);

  const totalPages = Math.ceil(groups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGroups = groups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Trip totals count trip-linked donations only; direct donations are shown on their own.
  const tripDonations = mine.filter((d) => d.tripId);
  const directDonations = mine.filter((d) => !d.tripId);
  const fundedTrees = tripDonations.reduce((sum, d) => sum + treeCount(d.trees), 0);
  const directTrees = directDonations.reduce((sum, d) => sum + treeCount(d.trees), 0);
  const directCo2 = directDonations.reduce((sum, d) => sum + d.carbonOffsetKg, 0);
  const treesNeeded = trips.reduce((sum, t) => sum + t.treesNeeded, 0);
  const treesRemaining = trips.reduce((sum, t) => sum + remainingTrees(t, state.donations), 0);
  const totalCO2ToOffset = trips.reduce((sum, t) => sum + t.totalCo2, 0);
  // Per trip, so extra CO₂ on one trip doesn't count against another.
  const co2Remaining = trips.reduce((sum, t) => sum + remainingCarbonKg(t, state.donations), 0);
  const co2AlreadyOffset = Math.max(0, totalCO2ToOffset - co2Remaining);
  const treesPct =
    fundedTrees + treesRemaining > 0 ? Math.min(100, Math.round((fundedTrees / (fundedTrees + treesRemaining)) * 100)) : 0;
  const co2Pct = totalCO2ToOffset > 0 ? Math.min(100, Math.round((co2AlreadyOffset / totalCO2ToOffset) * 100)) : 0;

  const toggleList = (key: string) =>
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">My Trees</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track your reforestation journey and environmental impact
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-green-50/80 to-teal-50 shadow-sm backdrop-blur-xl p-5 sm:p-6">
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-11 w-11 rounded-full bg-emerald-200/60 ring-1 ring-white/60 flex items-center justify-center shadow-sm">
                    <TreePine className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Trees Overview</p>
                    <p className="text-xs text-emerald-700/70">Trees funded for your trips</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Needed", value: treesNeeded, color: "text-emerald-900" },
                    { label: "Funded", value: fundedTrees, color: "text-green-700" },
                    { label: "Remaining", value: treesRemaining, color: "text-orange-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/60 ring-1 ring-white/80 backdrop-blur px-2 py-3 text-center min-w-0">
                      <p title={fmt(s.value)} className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight whitespace-nowrap truncate ${s.color}`}>
                        {fmtCompact(s.value)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-emerald-800/70 mt-1 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-emerald-800/80 mb-1.5 font-medium">
                    <span>{treesPct}% funded</span>
                    <span className="tabular-nums">
                      {fmt(fundedTrees)} / {fmt(fundedTrees + treesRemaining)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/60 overflow-hidden ring-1 ring-white/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600 transition-all duration-500"
                      style={{ width: `${treesPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-emerald-800/70">
                    {directTrees > 0
                      ? `Plus ${fmt(directTrees)} ${directTrees === 1 ? "tree" : "trees"} from direct donations.`
                      : "Remaining is an estimate; the tree mix you choose sets the final count."}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-cyan-50/80 to-sky-50 shadow-sm backdrop-blur-xl p-5 sm:p-6">
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-teal-200/40 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-11 w-11 rounded-full bg-teal-200/60 ring-1 ring-white/60 flex items-center justify-center shadow-sm">
                    <Cloud className="h-5 w-5 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-teal-900">CO₂ Impact</p>
                    <p className="text-xs text-teal-700/70">Trip emissions offset by trees you funded</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "To Offset", value: totalCO2ToOffset, color: "text-teal-900" },
                    { label: "Offset", value: co2AlreadyOffset, color: "text-green-700" },
                    { label: "Remaining", value: co2Remaining, color: "text-orange-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/60 ring-1 ring-white/80 backdrop-blur px-2 py-3 text-center min-w-0">
                      <p title={`${fmt(s.value)} kg`} className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight whitespace-nowrap truncate ${s.color}`}>
                        {fmtCompact(s.value)}
                        <span className="text-[10px] sm:text-xs font-normal ml-0.5 text-teal-700/70">kg</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-teal-800/70 mt-1 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-teal-800/80 mb-1.5 font-medium">
                    <span>{co2Pct}% offset</span>
                    <span className="tabular-nums">
                      {fmt(co2AlreadyOffset)} / {fmt(totalCO2ToOffset)} kg
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/60 overflow-hidden ring-1 ring-white/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-600 transition-all duration-500"
                      style={{ width: `${co2Pct}%` }}
                    />
                  </div>
                  {directCo2 > 0 && (
                    <p className="mt-2 text-xs text-teal-800/70">Plus {kg(directCo2)} from direct donations.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {mine.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sprout className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No trees funded yet</h3>
              <p className="text-muted-foreground mb-6">Start your reforestation journey by funding your first tree.</p>
              <Button onClick={() => navigate("/donate")}>
                <Plus className="h-4 w-4 mr-2" />
                Plant Your First Tree
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Accordion type="multiple" className="w-full">
                {paginatedGroups.map((group, groupIndex) => {
                  const trip = group.trip;
                  const isTrip = group.key !== "__direct__";
                  const stageCounts: Record<TouristStage, number> = { waiting: 0, assigned: 0, scheduled: 0, verifying: 0, planted: 0 };
                  for (const d of group.donations) {
                    stageCounts[toTouristStage(requestByDonation.get(d.id)?.status)] += treeCount(d.trees);
                  }
                  // Groups with trees still on their way start open so their status is visible; a click flips the default.
                  const openByDefault = stageCounts.planted < group.totalTrees;
                  const isExpanded = expandedLists.has(group.key) !== openByDefault;

                  return (
                    <AccordionItem key={group.key} value={group.key} className="border-b last:border-b-0">
                      <div className="px-4 py-4 hover:bg-muted/30">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isTrip ? "bg-primary/10" : "bg-muted"}`}>
                              {isTrip ? <Plane className="h-4 w-4 text-primary" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm">
                                {isTrip ? trip?.friendlyTripId || `Trip ${startIndex + groupIndex + 1}` : DIRECT_DONATION}
                              </p>
                              {trip && (
                                <p className="text-xs text-muted-foreground">
                                  {tripRouteLabel(trip)} ({tripTypeLabel(trip)})
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">{format(new Date(group.latestDate), "d MMM yyyy")}</p>
                            </div>
                          </div>
                          {trip && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedTrip(trip)}
                                className="text-primary hover:text-primary/80 p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                title="View trip details"
                                aria-label={`View details for trip ${trip.friendlyTripId}`}
                              >
                                <Eye className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          {trip ? (
                            <>
                              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">Trees Needed</p>
                                <p className="text-sm font-bold text-foreground">{trip.treesNeeded}</p>
                              </div>
                              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">Funded</p>
                                <p className="text-sm font-bold text-green-600">{group.totalTrees}</p>
                              </div>
                              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">CO₂ left</p>
                                <p className="text-sm font-bold text-orange-500">{kg(remainingCarbonKg(trip, state.donations))}</p>
                              </div>
                              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">Contribution</p>
                                <p className="text-sm font-bold text-foreground">{usd(group.totalAmount)}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">Funded</p>
                                <p className="text-sm font-bold text-green-600">{group.totalTrees}</p>
                              </div>
                              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-muted-foreground">Contribution</p>
                                <p className="text-sm font-bold text-foreground">{usd(group.totalAmount)}</p>
                              </div>
                            </>
                          )}
                        </div>

                        {trip &&
                          (() => {
                            const offsetKg = carbonOffsetForTrip(trip.id, state.donations);
                            // remainingCarbonKg allows rounding slack, so a covered trip reads 100%.
                            const pct =
                              remainingCarbonKg(trip, state.donations) === 0
                                ? 100
                                : Math.floor(Math.min(100, (offsetKg / trip.totalCo2) * 100));
                            return (
                              <>
                                <div className="mb-3">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>{pct}% offset</span>
                                    <span>
                                      {kg(Math.min(offsetKg, trip.totalCo2))} / {kg(trip.totalCo2)} CO₂
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                  <PendingPaymentLink trip={trip} />
                                  <OffsetTripButton trip={trip} label="+ Plant More Trees" showIcon={false} />
                                </div>
                              </>
                            );
                          })()}
                      </div>

                      <div className="relative mx-4 mb-4 mt-1 overflow-hidden rounded-2xl border border-emerald-300/70 bg-gradient-to-br from-emerald-100/90 via-green-50/85 to-teal-100/90 shadow-md">
                        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-300/40 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-300/30 blur-3xl" />
                        <button
                          type="button"
                          onClick={() => toggleList(group.key)}
                          className={`relative w-full px-4 py-2.5 flex items-center gap-x-3 gap-y-1.5 flex-wrap bg-white/60 ${isExpanded ? "border-b border-emerald-200/50" : ""} hover:bg-white/80 transition-colors text-left backdrop-blur-md`}
                          aria-expanded={isExpanded}
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-950">
                            {group.donations.length} {group.donations.length === 1 ? "contribution" : "contributions"}
                          </span>
                          {STAGE_ORDER.filter((stage) => stageCounts[stage] > 0).map((stage) => (
                            <span
                              key={stage}
                              className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums whitespace-nowrap ${STAGE_TONES[stage]}`}
                              title={`${TOURIST_STAGE_LABELS[stage]}: ${stageCounts[stage]} ${stageCounts[stage] === 1 ? "tree" : "trees"}`}
                            >
                              {TOURIST_STAGE_LABELS[stage]} {stageCounts[stage]}
                              <TreePine className="h-3 w-3" aria-hidden />
                            </span>
                          ))}
                          <ChevronDown className={`h-3.5 w-3.5 ml-auto text-emerald-800 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        <div
                          className={`relative grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                          aria-hidden={!isExpanded}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-2.5 p-3 bg-white/40 backdrop-blur-md">
                              {group.donations.map((donation) => {
                                const count = treeCount(donation.trees);
                                const status = groupStatus([toTouristStage(requestByDonation.get(donation.id)?.status)]);
                                const mix = donation.trees.map((row) => `${row.count} × ${row.treeType}`).join(", ");
                                const track = (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="default"
                                    className="h-9 px-4 gap-1.5 text-sm font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow"
                                  >
                                    <Link to={`/donations/${donation.id}`} tabIndex={isExpanded ? 0 : -1} title="Track trees">
                                      <MapPin className="h-4 w-4" />
                                      Track
                                    </Link>
                                  </Button>
                                );
                                return (
                                  <div
                                    key={donation.id}
                                    className="rounded-xl bg-white/80 ring-1 ring-white/90 backdrop-blur-md px-3 sm:px-4 py-3 hover:bg-white transition-colors shadow-sm"
                                  >
                                    <div className="flex items-start gap-3 sm:hidden">
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                          <span title={mix} className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-foreground whitespace-nowrap">
                                            <TreePine className="h-4 w-4 text-primary" />
                                            {count} {count === 1 ? "tree" : "trees"}
                                          </span>
                                          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                                            {format(new Date(donation.createdAt), "d MMM yyyy")}
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <MapPin className="h-3.5 w-3.5 text-primary/70" />
                                          {PLANTED_HERE}
                                        </div>
                                        <div className="pt-0.5">
                                          <Badge className={`${groupStatusColor(status)} text-[10px] whitespace-nowrap`}>{status}</Badge>
                                        </div>
                                      </div>
                                      <div className="shrink-0">{track}</div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-6">
                                      <span title={mix} className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-foreground whitespace-nowrap">
                                        <TreePine className="h-4 w-4 text-primary" />
                                        {count} {count === 1 ? "tree" : "trees"}
                                      </span>
                                      <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                                        {format(new Date(donation.createdAt), "d MMM yyyy")}
                                      </span>
                                      <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                                        <MapPin className="h-4 w-4 text-primary/70" />
                                        {PLANTED_HERE}
                                      </div>
                                      <Badge className={`${groupStatusColor(status)} text-xs whitespace-nowrap`}>{status}</Badge>
                                      <div className="ml-auto flex items-center gap-2">{track}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    ←
                  </Button>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      aria-label={`Page number, 1 to ${totalPages}`}
                      onChange={(e) => {
                        const page = parseInt(e.target.value, 10);
                        if (page >= 1 && page <= totalPages) setCurrentPage(page);
                      }}
                      className="w-16 text-center"
                    />
                    <span className="text-sm text-muted-foreground">/ {totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <TripDetailsDialog trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      </div>
    </div>
  );
}
