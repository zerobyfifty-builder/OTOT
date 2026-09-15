import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cloud, Leaf, Plane, Plus, ShoppingBag, Sprout, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { airportCity, remainingCarbonKg, remainingTrees, treesPlantedForTrip } from "@/lib/trips";
import type { Donation, PlantationRequest, Trip } from "@/types/otot";
import { TouristPage } from "@/components/layout/TouristPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const TOURIST_STAGE_LABELS = {
  waiting: "Waiting to be Assigned",
  assigned: "Assigned",
  scheduled: "Planting Scheduled",
  planted: "Planted",
} as const;

type TouristStage = keyof typeof TOURIST_STAGE_LABELS;

const STAGE_ORDER: TouristStage[] = ["waiting", "assigned", "scheduled", "planted"];

const PLANTING_STATUS_COLORS: Record<TouristStage, string> = {
  waiting: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  scheduled: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  planted: "bg-accent/10 text-accent border-accent/20",
};

function toTouristStage(status: PlantationRequest["status"] | undefined): TouristStage {
  switch (status) {
    case "ready_for_review":
    case "completed":
      return "planted";
    case "in_progress":
      return "scheduled";
    case "assigned":
      return "assigned";
    default:
      return "waiting";
  }
}

function groupStatus(stages: TouristStage[]) {
  if (stages.length === 0) return "Waiting to be Assigned";
  if (stages.every((s) => s === "planted")) return "Planted";
  if (stages.some((s) => s === "planted")) return "Partially Planted";
  const min = stages.reduce<TouristStage>(
    (acc, s) => (STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(acc) ? s : acc),
    "planted",
  );
  return TOURIST_STAGE_LABELS[min];
}

function groupStatusColor(status: string) {
  if (status === "Planted") return "bg-accent/10 text-accent border-accent/20";
  if (status === "Partially Planted") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  if (status === TOURIST_STAGE_LABELS.waiting) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (status === TOURIST_STAGE_LABELS.assigned) return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  if (status === TOURIST_STAGE_LABELS.scheduled) return "bg-cyan-500/10 text-cyan-700 border-cyan-500/20";
  return "bg-muted text-muted-foreground";
}

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
}

export default function MyTrees() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { state } = useStore();

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
    for (const req of state.plantationRequests) map.set(req.donationId, req);
    return map;
  }, [state.plantationRequests]);

  const groups = useMemo<TreeGroup[]>(() => {
    const byTrip = new Map<string, Donation[]>();
    const direct: Donation[] = [];
    for (const donation of mine) {
      if (donation.tripId) {
        const list = byTrip.get(donation.tripId) ?? [];
        list.push(donation);
        byTrip.set(donation.tripId, list);
      } else {
        direct.push(donation);
      }
    }
    const tripGroups: TreeGroup[] = trips.map((trip) => ({
      key: trip.id,
      trip,
      donations: byTrip.get(trip.id) ?? [],
    }));
    if (direct.length) tripGroups.push({ key: "__direct__", trip: null, donations: direct });
    return tripGroups.filter((g) => g.donations.length > 0 || g.trip);
  }, [mine, trips]);

  const plantedTrees = mine.reduce((sum, d) => sum + treeCount(d.trees), 0);
  const treesNeeded = trips.reduce((sum, t) => sum + t.treesNeeded, 0);
  const treesRemaining = Math.max(0, treesNeeded - plantedTrees);
  const totalCO2ToOffset = trips.reduce((sum, t) => sum + t.totalCo2, 0);
  const co2AlreadyOffset = mine.reduce((sum, d) => sum + d.carbonOffsetKg, 0);
  const co2Remaining = Math.max(0, totalCO2ToOffset - co2AlreadyOffset);
  const treesPct = treesNeeded > 0 ? Math.min(100, Math.round((plantedTrees / treesNeeded) * 100)) : 0;
  const co2Pct = totalCO2ToOffset > 0 ? Math.min(100, Math.round((co2AlreadyOffset / totalCO2ToOffset) * 100)) : 0;

  return (
    <TouristPage title="My Trees" subtitle="Track your reforestation journey and environmental impact">
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
                <p className="text-xs text-emerald-700/70">Your planting progress</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Needed", value: fmt(treesNeeded), compact: fmtCompact(treesNeeded), color: "text-emerald-900" },
                { label: "Committed", value: fmt(plantedTrees), compact: fmtCompact(plantedTrees), color: "text-green-700" },
                { label: "Remaining", value: fmt(treesRemaining), compact: fmtCompact(treesRemaining), color: "text-orange-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/60 ring-1 ring-white/80 backdrop-blur px-2 py-3 text-center min-w-0">
                  <p title={s.value} className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight whitespace-nowrap truncate ${s.color}`}>
                    {s.compact}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-800/70 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-emerald-800/80 mb-1.5 font-medium">
                <span>{treesPct}% committed</span>
                <span className="tabular-nums">
                  {fmt(plantedTrees)} / {fmt(treesNeeded)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/60 overflow-hidden ring-1 ring-white/80">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600 transition-all duration-500" style={{ width: `${treesPct}%` }} />
              </div>
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
                <p className="text-xs text-teal-700/70">Emissions offset by your trees</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "To Offset", value: fmt(totalCO2ToOffset), compact: fmtCompact(totalCO2ToOffset), color: "text-teal-900" },
                { label: "Offset", value: fmt(co2AlreadyOffset), compact: fmtCompact(co2AlreadyOffset), color: "text-green-700" },
                { label: "Remaining", value: fmt(co2Remaining), compact: fmtCompact(co2Remaining), color: "text-orange-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/60 ring-1 ring-white/80 backdrop-blur px-2 py-3 text-center min-w-0">
                  <p title={`${s.value} kg`} className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight whitespace-nowrap truncate ${s.color}`}>
                    {s.compact}
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
                <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-600 transition-all duration-500" style={{ width: `${co2Pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {mine.length === 0 && trips.length === 0 ? (
        <Card className="glass-card py-12">
          <CardContent className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Sprout className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No trees planted yet</h3>
            <p className="text-muted-foreground mb-6">Start your reforestation journey by planting your first tree.</p>
            <Button onClick={() => navigate("/carbon-calculator")}>
              <Plus className="h-4 w-4 mr-2" />
              Plant Your First Tree
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full" defaultValue={groups.slice(0, 3).map((g) => g.key)}>
              {groups.map((group) => {
                const stages = group.donations.map((d) => toTouristStage(requestByDonation.get(d.id)?.status));
                const status = group.donations.length ? groupStatus(stages) : "Not Offset";
                const trees = group.donations.reduce((sum, d) => sum + treeCount(d.trees), 0);
                const amount = group.donations.reduce((sum, d) => sum + d.amount, 0);
                const isTrip = Boolean(group.trip);
                return (
                  <AccordionItem key={group.key} value={group.key} className="px-4 sm:px-6">
                    <AccordionTrigger className="hover:no-underline py-5">
                      <div className="flex flex-1 items-start sm:items-center gap-3 text-left pr-3">
                        <div className={`mt-0.5 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isTrip ? "bg-primary/10" : "bg-muted"}`}>
                          {isTrip ? <Plane className="h-5 w-5 text-primary" /> : <ShoppingBag className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground truncate">
                              {group.trip
                                ? `${airportCity(group.trip.originAirport)} → ${airportCity(group.trip.destinationAirport)}`
                                : "Direct contribution"}
                            </p>
                            <Badge variant="outline" className={groupStatusColor(status)}>
                              {status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.trip ? `${group.trip.friendlyTripId} · ${trees} of ${group.trip.treesNeeded} trees` : `${trees} trees funded`}
                          </p>
                        </div>
                        <div className="hidden sm:block text-right shrink-0">
                          <p className="font-semibold">{trees} trees</p>
                          <p className="text-xs text-muted-foreground">{usd(amount)}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      {group.trip && treesPlantedForTrip(group.trip.id, state.donations) < group.trip.treesNeeded && (
                        <Button
                          size="sm"
                          className="mb-4"
                          onClick={() =>
                            navigate("/donate", {
                              state: {
                                carbonOffsetKg: remainingCarbonKg(group.trip!, state.donations),
                                treesNeeded: remainingTrees(group.trip!, state.donations),
                                tripId: group.trip!.id,
                              },
                            })
                          }
                        >
                          <Leaf className="h-4 w-4 mr-1" />
                          Offset remaining
                        </Button>
                      )}
                      {group.donations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No trees funded for this trip yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {group.donations.map((donation) => {
                            const stage = toTouristStage(requestByDonation.get(donation.id)?.status);
                            return (
                              <Link
                                key={donation.id}
                                to={`/donations/${donation.id}`}
                                className="block rounded-xl border border-border bg-background p-4 hover:bg-muted/40"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-sm">
                                      {treeCount(donation.trees)} trees · {kg(donation.carbonOffsetKg)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{shortDate(donation.createdAt)}</p>
                                    <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                                      {donation.trees.map((row) => (
                                        <li key={row.treeTypeId}>
                                          {row.count} × {row.treeType}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="text-right space-y-2">
                                    <Badge variant="outline" className={PLANTING_STATUS_COLORS[stage]}>
                                      {TOURIST_STAGE_LABELS[stage]}
                                    </Badge>
                                    <p className="text-sm font-semibold">{usd(donation.amount)}</p>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </TouristPage>
  );
}
