import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInYears, differenceInDays, addYears } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImpactLogSliders } from "@/components/trees/ImpactLogSliders";
import {
  ArrowLeft, Download, TreePine, DollarSign, CheckCircle2, Clock, MapPin,
  Camera, User, Leaf, Activity, BarChart3, Award, Bell, Calendar, Plus,
  ZoomIn, X, ChevronRight, FileText, Heart, Sprout, AlertTriangle, Cloud, Globe, Users
} from "lucide-react";

import { Database } from "@/integrations/supabase/types";

type Tree = Database["public"]["Tables"]["trees"]["Row"];

const STATUS_LABELS: Record<string, string> = {
  waiting_to_be_assigned: 'Waiting to be Assigned',
  assigned: 'Assigned',
  site_prepared: 'Site Prepared',
  saplings_ready: 'Saplings Ready',
  planting_scheduled: 'Planting Scheduled',
  sapling_planted: 'Sapling Planted',
  being_mapped: 'Location Mapped',
  verified: 'Verified',
  planted: 'Planted',
  dead: 'Dead',
  re_planted: 'Re-planted',
};

const PLANTING_STATUS_COLORS: Record<string, string> = {
  waiting_to_be_assigned: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  site_prepared: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  saplings_ready: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  planting_scheduled: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  sapling_planted: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  being_mapped: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  verified: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  planted: "bg-green-500/10 text-green-700 border-green-500/20",
  dead: "bg-red-500/10 text-red-700 border-red-500/20",
  re_planted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

const TIMELINE_DOT_COLORS: Record<string, string> = {
  waiting_to_be_assigned: "bg-yellow-500",
  assigned: "bg-orange-500",
  site_prepared: "bg-amber-500",
  saplings_ready: "bg-blue-500",
  planting_scheduled: "bg-indigo-500",
  sapling_planted: "bg-cyan-500",
  being_mapped: "bg-purple-500",
  verified: "bg-teal-500",
  planted: "bg-green-500",
  dead: "bg-red-500",
  re_planted: "bg-emerald-500",
};

const SURVIVAL_COLORS: Record<string, string> = {
  Alive: "bg-green-500/10 text-green-700 border-green-500/20",
  Dead: "bg-red-500/10 text-red-700 border-red-500/20",
  Replaced: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

const GROWTH_STAGE_COLORS: Record<string, string> = {
  Sapling: "bg-lime-500/10 text-lime-700 border-lime-500/20",
  Young: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Maturing: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  Mature: "bg-green-500/10 text-green-700 border-green-500/20",
};

export const TreeOperations = () => {
  const { contributionId } = useParams<{ contributionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [monitoringForm, setMonitoringForm] = useState({
    inspection_date: '', inspected_by: '', survival_rate_pct: '',
    trees_alive: '', trees_dead: '', trees_replaced: '',
    overall_health_notes: '', photos: ''
  });
  const [showMonitoringForm, setShowMonitoringForm] = useState(false);
  const [impactSlider, setImpactSlider] = useState<"carbon" | "ecosystem" | "community" | null>(null);
  const [impactForm, setImpactForm] = useState({
    co2_offset_estimated_kg: '', co2_offset_actual_kg: '', calculation_method: 'ICAO Standard (22kg/tree/year)',
    biodiversity_index: '', soil_improvement: '', water_retention: '',
    jobs_created: '', local_participants_count: '', community_benefits: '',
    ecosystem_notes: '', update_frequency: 'Quarterly'
  });

  // Fetch contribution data
  const { data: contribution } = useQuery({
    queryKey: ["treeOpsContribution", contributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_tracking" as any)
        .select("*")
        .eq("contribution_id", contributionId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!contributionId,
  });

  // Fetch trees for this contribution
  const { data: trees } = useQuery({
    queryKey: ["treeOpsTrees", contributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .eq("contribution_id", contributionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Tree[];
    },
    enabled: !!contributionId,
  });

  // Fetch status transitions
  const { data: transitions } = useQuery({
    queryKey: ["treeOpsTransitions", contributionId],
    queryFn: async () => {
      if (!trees?.length) return [];
      const treeIds = trees.map(t => t.id);
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("*")
        .in("tree_id", treeIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!trees && trees.length > 0,
  });

  // Fetch trip data
  const { data: trip } = useQuery({
    queryKey: ["treeOpsTrip", contribution?.trip_id],
    queryFn: async () => {
      const { data } = await supabase.from("trips").select("*").eq("id", contribution!.trip_id).single();
      return data;
    },
    enabled: !!contribution?.trip_id,
  });

  // Fetch tree geotags
  const { data: geotags } = useQuery({
    queryKey: ["treeOpsGeotags", trees],
    queryFn: async () => {
      if (!trees?.length) return [];
      const treeIds = trees.map(t => t.id);
      const { data } = await supabase
        .from("tree_geotags" as any)
        .select("*")
        .in("tree_id", treeIds);
      return (data || []) as any[];
    },
    enabled: !!trees && trees.length > 0,
  });

  // Fetch planters
  const { data: planters } = useQuery({
    queryKey: ["treeOpsPlanters"],
    queryFn: async () => {
      const { data } = await supabase.from("tree_carers" as any).select("id, name").eq("status", "Active");
      return (data || []) as any[];
    },
  });

  // Fetch monitoring logs (new table)
  const { data: monitoringLogs } = useQuery({
    queryKey: ["treeOpsMonitoringLogs", contributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_monitoring_logs" as any)
        .select("*")
        .eq("contribution_id", contributionId!)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!contributionId,
  });

  // Fetch survival records
  const { data: survivalRecords } = useQuery({
    queryKey: ["treeOpsSurvival", contributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_records" as any)
        .select("*")
        .eq("contribution_id", contributionId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!contributionId,
  });

  // Fetch impact record
  const { data: impactRecord } = useQuery({
    queryKey: ["treeOpsImpact", contributionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tree_impact_records" as any)
        .select("*")
        .eq("contribution_id", contributionId!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!contributionId,
  });

  // Fetch existing tree_survival_tracking & tree_growth_metrics from existing tables
  const { data: existingSurvival } = useQuery({
    queryKey: ["treeOpsExistingSurvival", trees],
    queryFn: async () => {
      if (!trees?.length) return [];
      const treeIds = trees.map(t => t.id);
      const { data } = await supabase
        .from("tree_survival_tracking" as any)
        .select("*")
        .in("tree_id", treeIds)
        .order("last_checked_date", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!trees && trees.length > 0,
  });

  const { data: existingGrowth } = useQuery({
    queryKey: ["treeOpsExistingGrowth", trees],
    queryFn: async () => {
      if (!trees?.length) return [];
      const treeIds = trees.map(t => t.id);
      const { data } = await supabase
        .from("tree_growth_metrics" as any)
        .select("*")
        .in("tree_id", treeIds)
        .order("last_measured_date", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!trees && trees.length > 0,
  });

  // Save monitoring log mutation
  const saveMonitoringLog = useMutation({
    mutationFn: async (form: typeof monitoringForm) => {
      const { error } = await supabase.from("tree_monitoring_logs" as any).insert({
        contribution_id: contributionId!,
        inspection_date: form.inspection_date,
        inspected_by: form.inspected_by || null,
        trees_alive: parseInt(form.trees_alive) || 0,
        trees_dead: parseInt(form.trees_dead) || 0,
        trees_replaced: parseInt(form.trees_replaced) || 0,
        survival_rate_pct: parseFloat(form.survival_rate_pct) || 0,
        overall_health_notes: form.overall_health_notes || null,
        photos: form.photos ? form.photos.split(',').map(s => s.trim()).filter(Boolean) : [],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Monitoring log saved");
      queryClient.invalidateQueries({ queryKey: ["treeOpsMonitoringLogs"] });
      setShowMonitoringForm(false);
      setMonitoringForm({ inspection_date: '', inspected_by: '', survival_rate_pct: '', trees_alive: '', trees_dead: '', trees_replaced: '', overall_health_notes: '', photos: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Save impact record mutation
  const saveImpactRecord = useMutation({
    mutationFn: async (form: typeof impactForm) => {
      const payload = {
        contribution_id: contributionId!,
        co2_offset_estimated_kg: parseFloat(form.co2_offset_estimated_kg) || null,
        co2_offset_actual_kg: parseFloat(form.co2_offset_actual_kg) || null,
        calculation_method: form.calculation_method || null,
        biodiversity_index: parseFloat(form.biodiversity_index) || null,
        soil_improvement: form.soil_improvement || null,
        water_retention: form.water_retention || null,
        jobs_created: parseInt(form.jobs_created) || 0,
        local_participants_count: parseInt(form.local_participants_count) || 0,
        community_benefits: form.community_benefits || null,
        ecosystem_notes: form.ecosystem_notes || null,
        update_frequency: form.update_frequency || 'Quarterly',
      };
      if (impactRecord) {
        const { error } = await supabase.from("tree_impact_records" as any).update(payload as any).eq("id", impactRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tree_impact_records" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Impact record saved");
      queryClient.invalidateQueries({ queryKey: ["treeOpsImpact"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Computed values
  const overallStatus = useMemo(() => {
    if (!trees?.length) return "waiting_to_be_assigned";
    const statuses = trees.map(t => t.planting_status || "waiting_to_be_assigned");
    if (statuses.every(s => s === "planted" || s === "verified")) return "planted";
    if (statuses.some(s => s === "planted")) return "partially_planted";
    return statuses[0] || "waiting_to_be_assigned";
  }, [trees]);

  const treesAliveCount = useMemo(() => {
    if (!existingSurvival?.length) return trees?.length || 0;
    const latestByTree = new Map<string, any>();
    existingSurvival.forEach((s: any) => {
      if (!latestByTree.has(s.tree_id) || s.last_checked_date > latestByTree.get(s.tree_id).last_checked_date) {
        latestByTree.set(s.tree_id, s);
      }
    });
    return [...latestByTree.values()].filter(s => s.survival_status === 'Alive').length;
  }, [existingSurvival, trees]);

  const avgSurvivalRate = useMemo(() => {
    if (!monitoringLogs?.length) return null;
    const latest = monitoringLogs[0];
    return latest.survival_rate_pct;
  }, [monitoringLogs]);

  const plantingDate = useMemo(() => {
    if (!transitions?.length) return null;
    const planted = transitions.find((t: any) => t.to_status === 'planted' || t.to_status === 'sapling_planted');
    return planted?.created_at ? new Date(planted.created_at) : null;
  }, [transitions]);

  const estimatedCO2 = useMemo(() => {
    if (!plantingDate || !treesAliveCount) return 0;
    const years = Math.max(differenceInDays(new Date(), plantingDate) / 365, 0.1);
    return Math.round(treesAliveCount * 22 * years * 100) / 100;
  }, [plantingDate, treesAliveCount]);

  const carTravelEquivalent = useMemo(() => {
    // Average car emits ~0.21 kg CO2 per km
    return Math.round(estimatedCO2 / 0.21);
  }, [estimatedCO2]);

  const anniversaryDate = useMemo(() => {
    if (!plantingDate) return null;
    return addYears(plantingDate, 1);
  }, [plantingDate]);

  // Unique batch transitions (deduplicated by to_status for timeline)
  const timelineTransitions = useMemo(() => {
    if (!transitions?.length) return [];
    const seen = new Map<string, any>();
    transitions.forEach((t: any) => {
      if (!seen.has(t.to_status)) {
        seen.set(t.to_status, t);
      }
    });
    return [...seen.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [transitions]);

  const geotagMap = useMemo(() => {
    const m = new Map<string, any>();
    geotags?.forEach((g: any) => m.set(g.tree_id, g));
    return m;
  }, [geotags]);

  const planterMap = useMemo(() => {
    const m = new Map<string, string>();
    planters?.forEach((p: any) => m.set(p.id, p.name));
    return m;
  }, [planters]);

  // Get latest survival record per tree
  const latestSurvivalByTree = useMemo(() => {
    const m = new Map<string, any>();
    existingSurvival?.forEach((s: any) => {
      if (!m.has(s.tree_id) || s.last_checked_date > m.get(s.tree_id).last_checked_date) {
        m.set(s.tree_id, s);
      }
    });
    return m;
  }, [existingSurvival]);

  const latestGrowthByTree = useMemo(() => {
    const m = new Map<string, any>();
    existingGrowth?.forEach((g: any) => {
      if (!m.has(g.tree_id) || g.last_measured_date > m.get(g.tree_id).last_measured_date) {
        m.set(g.tree_id, g);
      }
    });
    return m;
  }, [existingGrowth]);

  if (!contributionId) return <div className="p-8">Invalid contribution ID</div>;

  const customerIdFormatted = contributionId.replace("CTR-", "CT2026-");
  const totalTrees = contribution?.num_trees || trees?.length || 0;
  const amountPaid = contribution?.amount_paid || 0;
  const contributorType = contribution?.contribution_type === "travel_agent" ? "Agent" : "Tourist";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tree Orders
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{contributionId}</h1>
                <Badge variant="outline" className={PLANTING_STATUS_COLORS[overallStatus] || "bg-muted text-muted-foreground"}>
                  {STATUS_LABELS[overallStatus] || overallStatus}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Customer ID: <span className="font-medium text-foreground">{customerIdFormatted}</span></span>
                {contribution?.trip_id && (
                  <span>Trip: <span className="font-medium text-foreground">{trip?.friendly_trip_id || contribution.trip_id.slice(0, 8)}</span></span>
                )}
                <span>Contributor: <span className="font-medium text-foreground">{contribution?.tourist_name || "—"}</span> ({contributorType})</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="text-muted-foreground">Trees ordered</div>
                <div className="text-lg font-bold">{totalTrees}</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-right text-sm">
                <div className="text-muted-foreground">Amount paid</div>
                <div className="text-lg font-bold">${amountPaid.toLocaleString()}</div>
              </div>
              <Button variant="outline" size="sm" disabled className="ml-2">
                <Download className="h-4 w-4 mr-1" /> Download Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="planting" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="planting" className="gap-1.5"><Leaf className="h-4 w-4" /> Planting Operations</TabsTrigger>
            <TabsTrigger value="growth" className="gap-1.5"><Activity className="h-4 w-4" /> Growth & Monitoring</TabsTrigger>
            <TabsTrigger value="impact" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Impact</TabsTrigger>
          </TabsList>

          {/* TAB 1: Planting Operations */}
          <TabsContent value="planting" className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" /> Status Timeline</CardTitle>
                <CardDescription>Lifecycle of this tree order through planting statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const FRIENDLY_LABELS: Record<string, string> = {
                    target_beat_label: 'Location (Target Beat)', assigned_to_name: 'Planter', assigned_date: 'Assigned Date',
                    nursery_name: 'Nursery / CBO', species_name: 'Species', tree_carer_name: 'Tree Carer',
                    soil_type: 'Soil Type', rainfall_mm: 'Rainfall (mm)', site_prep_date: 'Site Preparation Date', site_notes: 'Site Notes',
                    sapling_ready_date: 'Sapling Ready Date', sapling_source: 'Sapling Source',
                    sapling_count_allocated: 'Saplings Allocated', sapling_age_weeks: 'Sapling Age (weeks)',
                    scheduled_date: 'Scheduled Date', planting_team_size: 'Team Size',
                    planting_date: 'Planting Date', planting_method: 'Planting Method', planting_notes: 'Planting Notes',
                    planted_by: 'Planted By', planting_team_lead: 'Team Lead',
                    latitude: 'Latitude', longitude: 'Longitude', mapping_date: 'Mapping Date', mapping_method: 'Mapping Method', mapping_notes: 'Mapping Notes', gps_accuracy: 'GPS Accuracy',
                    verification_date: 'Verification Date', verified_by: 'Verified By', verification_method: 'Verification Method', verification_notes: 'Verification Notes', health_status: 'Health Status',
                    planted_confirmed_date: 'Confirmed Date', date_confirmed_dead: 'Date Confirmed Dead', cause_of_death: 'Cause of Death',
                    replacement_planned: 'Replacement Planned', replacement_target_date: 'Replacement Target Date',
                    re_planted_date: 'Re-planted Date', re_planting_method: 'Re-planting Method',
                    notes: 'Notes', reason: 'Reason', batch_notice: 'Notice', planter_name: 'Planter',
                  };

                  const ID_TO_LABEL_MAP: Record<string, string> = {
                    assigned_to: 'assigned_to_name', target_beat: 'target_beat_label',
                    nursery_id: 'nursery_name', species_id: 'species_name', tree_carer_id: 'tree_carer_name',
                  };

                  const resolveTimelineValue = (key: string, value: unknown, data: Record<string, unknown>): string => {
                    if (key === 'verified_by' && data.planter_name) return String(data.planter_name);
                    if (key === 'planted_by' && data.planter_name) return String(data.planter_name);
                    if (key === 'planting_team_lead' && data.planter_name) return String(data.planter_name);
                    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                    // Check if the value looks like a UUID and we have a planter name for it
                    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(value)) {
                      const resolvedName = planterMap.get(value);
                      if (resolvedName) return resolvedName;
                      return '—';
                    }
                    return String(value);
                  };

                  // Build full lifecycle with completed/pending status
                  const allStatuses = Object.keys(STATUS_LABELS);
                  const transitionMap = new Map<string, any>();
                  timelineTransitions.forEach((t: any) => transitionMap.set(t.to_status, t));

                  return timelineTransitions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status transitions recorded yet.</p>
                  ) : (
                    <Accordion type="multiple" className="space-y-2">
                      {timelineTransitions.map((t: any, idx: number) => {
                        const transitionData = typeof t.transition_data === 'string' ? JSON.parse(t.transition_data) : (t.transition_data || {});
                        const photos = t.photos || [];

                        // Build skip keys for raw IDs when label version exists
                        const skipKeys = new Set<string>(['reverted', 'photos']);
                        for (const [idKey, labelKey] of Object.entries(ID_TO_LABEL_MAP)) {
                          if (transitionData[labelKey] !== undefined) skipKeys.add(idKey);
                        }
                        if (transitionData['planter_name'] !== undefined) {
                          skipKeys.add('planted_by');
                          skipKeys.add('planting_team_lead');
                          skipKeys.add('verified_by');
                        }

                        const entries = Object.entries(transitionData)
                          .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== undefined && value !== '')
                          .sort((a, b) => {
                            const order: Record<string, number> = { target_beat_label: 0, assigned_to_name: 1, nursery_name: 2, species_name: 3 };
                            return (order[a[0]] ?? 99) - (order[b[0]] ?? 99);
                          });

                        return (
                          <AccordionItem key={t.id || idx} value={t.id || `t-${idx}`} className="border rounded-xl overflow-hidden bg-card shadow-sm">
                            <AccordionTrigger className="hover:no-underline px-4 py-3">
                              <div className="flex items-center gap-3 w-full">
                                <div className="h-6 w-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                                <Badge variant="outline" className={`text-xs ${PLANTING_STATUS_COLORS[t.to_status] || ''}`}>
                                  {STATUS_LABELS[t.to_status] || t.to_status}
                                </Badge>
                                <span className="text-xs text-muted-foreground ml-auto mr-2">
                                  {t.created_at ? format(new Date(t.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="px-4 pb-4 pt-1 space-y-3">
                                {/* Who made the change */}
                                {t.created_by && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Entered by: <span className="font-medium text-foreground">{planterMap.get(t.created_by) || "System"}</span></span>
                                  </div>
                                )}

                                {/* Transition data - each field on its own line */}
                                {entries.length > 0 && (
                                  <div className="rounded-lg bg-muted/40 border p-3">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                      {entries.map(([key, value]) => {
                                        const label = FRIENDLY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                        const displayValue = resolveTimelineValue(key, value, transitionData as Record<string, unknown>);
                                        return (
                                          <React.Fragment key={key}>
                                            <span className="text-muted-foreground whitespace-nowrap">{label}:</span>
                                            <span className="font-medium text-foreground">{displayValue}</span>
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Photos */}
                                {photos.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Photos</span>
                                    <div className="flex gap-2 flex-wrap">
                                      {photos.map((url: string, i: number) => (
                                        <button key={i} onClick={() => setLightboxPhoto(url)} className="relative group h-16 w-16 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all">
                                          <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {entries.length === 0 && photos.length === 0 && (
                                  <p className="text-xs text-muted-foreground italic">No additional data captured at this transition.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Tree-level grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><TreePine className="h-5 w-5" /> Individual Trees ({trees?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Tree ID</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Species</TableHead>
                        <TableHead className="text-xs">Planter</TableHead>
                        <TableHead className="text-xs">GPS</TableHead>
                        <TableHead className="text-xs">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trees?.map((tree, idx) => {
                        const geo = geotagMap.get(tree.id);
                        const status = tree.planting_status || "waiting_to_be_assigned";
                        return (
                          <TableRow key={tree.id}>
                            <TableCell className="text-xs font-mono">{tree.otot_id || `T-${String(idx + 1).padStart(3, '0')}`}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${PLANTING_STATUS_COLORS[status] || ''}`}>
                                {STATUS_LABELS[status] || status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{tree.tree_type || "—"}</TableCell>
                            <TableCell className="text-xs">{tree.tree_carer_id ? (planterMap.get(tree.tree_carer_id) || "—") : "—"}</TableCell>
                            <TableCell className="text-xs">
                              {geo ? (
                                <button className="text-primary underline" onClick={() => window.open(`https://maps.google.com/?q=${geo.latitude},${geo.longitude}`, '_blank')}>
                                  <MapPin className="h-3 w-3 inline mr-0.5" />
                                  {Number(geo.latitude).toFixed(4)}, {Number(geo.longitude).toFixed(4)}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {tree.updated_at ? format(new Date(tree.updated_at), "MMM dd, yyyy") : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!trees || trees.length === 0) && (
                        <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No trees found for this contribution</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Growth & Monitoring */}
          <TabsContent value="growth" className="space-y-6">
            {/* Section header KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Sprout className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trees in Growth Phase</p>
                      <p className="text-xl font-bold">{treesAliveCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Survival Rate</p>
                      <p className="text-xl font-bold">{avgSurvivalRate != null ? `${avgSurvivalRate}%` : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Monitoring Date</p>
                      <p className="text-xl font-bold">{monitoringLogs?.[0]?.inspection_date ? format(new Date(monitoringLogs[0].inspection_date), "MMM dd, yyyy") : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Survival tracking table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Survival Tracking</CardTitle>
                  <CardDescription>Per-tree survival status and growth metrics</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Tree ID</TableHead>
                        <TableHead className="text-xs">Survival Status</TableHead>
                        <TableHead className="text-xs">Last Checked</TableHead>
                        <TableHead className="text-xs">Growth Stage</TableHead>
                        <TableHead className="text-xs">Height (cm)</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trees?.map((tree, idx) => {
                        const surv = latestSurvivalByTree.get(tree.id);
                        const growth = latestGrowthByTree.get(tree.id);
                        return (
                          <TableRow key={tree.id}>
                            <TableCell className="text-xs font-mono">{tree.otot_id || `T-${String(idx + 1).padStart(3, '0')}`}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${SURVIVAL_COLORS[surv?.survival_status] || 'bg-muted text-muted-foreground'}`}>
                                {surv?.survival_status || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{surv?.last_checked_date ? format(new Date(surv.last_checked_date), "MMM dd, yyyy") : "—"}</TableCell>
                            <TableCell>
                              {growth?.growth_stage ? (
                                <Badge variant="outline" className={`text-[10px] ${GROWTH_STAGE_COLORS[growth.growth_stage] || ''}`}>
                                  {growth.growth_stage}
                                </Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{growth?.tree_height || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{surv?.notes || growth?.notes || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Add monitoring log */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Monitoring Logs</CardTitle>
                  <CardDescription>Periodic inspection records for this contribution batch</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowMonitoringForm(!showMonitoringForm)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Monitoring Log
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showMonitoringForm && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Inspection Date *</Label>
                          <Input type="date" value={monitoringForm.inspection_date} onChange={e => setMonitoringForm(p => ({ ...p, inspection_date: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Inspected By *</Label>
                          <Select value={monitoringForm.inspected_by} onValueChange={v => setMonitoringForm(p => ({ ...p, inspected_by: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
                            <SelectContent>
                              {planters?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Survival Rate % *</Label>
                          <Input type="number" min="0" max="100" value={monitoringForm.survival_rate_pct} onChange={e => setMonitoringForm(p => ({ ...p, survival_rate_pct: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Trees Alive *</Label>
                          <Input type="number" value={monitoringForm.trees_alive} onChange={e => setMonitoringForm(p => ({ ...p, trees_alive: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Trees Dead *</Label>
                          <Input type="number" value={monitoringForm.trees_dead} onChange={e => setMonitoringForm(p => ({ ...p, trees_dead: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Trees Replaced</Label>
                          <Input type="number" value={monitoringForm.trees_replaced} onChange={e => setMonitoringForm(p => ({ ...p, trees_replaced: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">General Health Notes</Label>
                        <Textarea value={monitoringForm.overall_health_notes} onChange={e => setMonitoringForm(p => ({ ...p, overall_health_notes: e.target.value }))} rows={2} />
                      </div>
                      <div>
                        <Label className="text-xs">Photo URLs (comma separated)</Label>
                        <Input value={monitoringForm.photos} onChange={e => setMonitoringForm(p => ({ ...p, photos: e.target.value }))} placeholder="https://..." />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveMonitoringLog.mutate(monitoringForm)} disabled={!monitoringForm.inspection_date || !monitoringForm.inspected_by || !monitoringForm.survival_rate_pct || !monitoringForm.trees_alive}>
                          Save Log
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowMonitoringForm(false)}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Monitoring log history */}
                {monitoringLogs && monitoringLogs.length > 0 ? (
                  <Accordion type="multiple" className="space-y-2">
                    {monitoringLogs.map((log: any, idx: number) => (
                      <AccordionItem key={log.id} value={log.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-sm hover:no-underline">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{log.inspection_date ? format(new Date(log.inspection_date), "MMM dd, yyyy") : "—"}</span>
                            <Badge variant="outline" className="text-[10px]">Survival: {log.survival_rate_pct}%</Badge>
                            <span className="text-xs text-muted-foreground">
                              Alive: {log.trees_alive} | Dead: {log.trees_dead} | Replaced: {log.trees_replaced}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2 pt-2">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Inspector: <span className="text-foreground font-medium">{log.inspected_by ? (planterMap.get(log.inspected_by) || log.inspected_by.slice(0, 8)) : "—"}</span></span>
                          </div>
                          {log.overall_health_notes && <p className="text-xs">{log.overall_health_notes}</p>}
                          {log.photos && Array.isArray(log.photos) && log.photos.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {log.photos.map((url: string, i: number) => (
                                <button key={i} onClick={() => setLightboxPhoto(url)} className="h-14 w-14 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No monitoring logs recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Impact */}
          <TabsContent value="impact" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Leaf className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Est. CO₂ Offset</p>
                      <p className="text-xl font-bold">{estimatedCO2.toLocaleString()} kg</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TreePine className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trees Alive</p>
                      <p className="text-xl font-bold">{treesAliveCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Survival Rate</p>
                      <p className="text-xl font-bold">{avgSurvivalRate != null ? `${avgSurvivalRate}%` : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Car Travel Equivalent</p>
                      <p className="text-xl font-bold">{carTravelEquivalent.toLocaleString()} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Impact Logs Toolbar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impact Logs</CardTitle>
                <CardDescription>Capture and review historical entries for each impact dimension</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="outline" className="h-auto py-3 justify-start gap-3" onClick={() => setImpactSlider("carbon")}>
                    <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <Cloud className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold">Carbon Metrics</span>
                      <span className="text-[11px] text-muted-foreground">CO₂ offsets & methods</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 justify-start gap-3" onClick={() => setImpactSlider("ecosystem")}>
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold">Ecosystem Impact</span>
                      <span className="text-[11px] text-muted-foreground">Biodiversity, soil, water</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 justify-start gap-3" onClick={() => setImpactSlider("community")}>
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold">Community Impact</span>
                      <span className="text-[11px] text-muted-foreground">Jobs, participants, benefits</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5" /> Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={impactRecord?.certificate_issued_date ? "bg-green-500/10 text-green-700 border-green-500/20" : "bg-muted text-muted-foreground"}>
                    {impactRecord?.certificate_issued_date ? "Issued" : "Not Issued"}
                  </Badge>
                  {impactRecord?.certificate_issued_date && (
                    <span className="text-sm text-muted-foreground">
                      Issued on {format(new Date(impactRecord.certificate_issued_date), "MMM dd, yyyy")}
                    </span>
                  )}
                  <Button size="sm" variant="outline" disabled>
                    {impactRecord?.certificate_issued_date ? "Re-issue Certificate" : "Issue Certificate"}
                  </Button>
                  {impactRecord?.certificate_url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={impactRecord.certificate_url} target="_blank" rel="noopener"><Download className="h-4 w-4 mr-1" /> Download</a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5" /> Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Anniversary Date</Label>
                    <p className="text-sm font-medium">{anniversaryDate ? format(anniversaryDate, "MMM dd, yyyy") : "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Notification Status</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {impactRecord?.notification_status || "Pending"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs">Last Update Sent</Label>
                    <p className="text-sm font-medium">{impactRecord?.last_update_sent_date ? format(new Date(impactRecord.last_update_sent_date), "MMM dd, yyyy") : "Never"}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button size="sm" variant="outline" disabled>
                    <Bell className="h-4 w-4 mr-1" /> Send Update to Tourist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Impact Log Sliders */}
      <ImpactLogSliders
        open={impactSlider}
        onClose={() => setImpactSlider(null)}
        contributionId={contributionId!}
        onPhotoClick={(url) => setLightboxPhoto(url)}
      />


      {/* Lightbox */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightboxPhoto && (
            <div className="relative">
              <img src={lightboxPhoto} alt="Photo" className="w-full rounded-lg" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button size="icon" variant="secondary" asChild className="h-8 w-8">
                  <a href={lightboxPhoto} download target="_blank" rel="noopener"><Download className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreeOperations;
