import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Upload, X, AlertTriangle, Info, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface TransitionRequest {
  treeIds: string[];
  fromStatus: string;
  toStatus: string;
  contributionId?: string;
  treeCount?: number;
  isBatch: boolean;
}

interface StatusTransitionPanelProps {
  open: boolean;
  onClose: () => void;
  request: TransitionRequest | null;
  onConfirm: (request: TransitionRequest, transitionData: Record<string, any>, photos: string[]) => Promise<void>;
}

const STATUS_TITLES: Record<string, string> = {
  assigned: "Assign planting resources",
  site_prepared: "Record site preparation",
  saplings_ready: "Link nursery & species",
  planting_scheduled: "Schedule planting event",
  sapling_planted: "Record planting event",
  being_mapped: "Capture location (geotag)",
  verified: "Record verification",
  planted: "Confirm planted",
  dead: "Record tree loss",
  re_planted: "Record re-planting",
};

const SOIL_TYPES = ["Loam", "Clay", "Sandy", "Volcanic", "Mixed"];
const RAINFALL_ZONES = ["Arid", "Semi-arid", "Sub-humid", "Humid"];
const PLANTING_SEASONS = ["Long Rains (Mar–May)", "Short Rains (Oct–Dec)", "Dry Season"];
const LAND_TYPES = ["Degraded Forest", "Restoration Area", "Agroforestry", "Riverbank", "Open Land"];
const PLANTING_METHODS = ["Manual Pit", "Mechanical", "Broadcast Seeding", "Transplant"];
const VERIFICATION_METHODS = ["Field Visit", "Photo Review", "GPS Confirmation", "Satellite"];
const DEATH_CAUSES = ["Drought", "Disease", "Fire", "Grazing", "Flooding", "Unknown", "Other"];

export function StatusTransitionPanel({ open, onClose, request, onConfirm }: StatusTransitionPanelProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState<string>("");

  const isEditMode = !!request && request.fromStatus === request.toStatus;

  // Fetch existing transition data when editing current status
  const { data: existingTransitionData } = useQuery({
    queryKey: ["existingTransitionData", request?.treeIds?.[0], request?.toStatus],
    queryFn: async () => {
      if (!request?.treeIds?.[0]) return null;
      const { data } = await supabase
        .from("tree_status_transitions")
        .select("transition_data")
        .eq("tree_id", request.treeIds[0])
        .eq("to_status", request.toStatus)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.transition_data as Record<string, any> | null) || null;
    },
    enabled: open && !!request && isEditMode,
  });

  // Beat search state
  const [beatSearch, setBeatSearch] = useState("");
  const [editingPlantedBy, setEditingPlantedBy] = useState(false);

  // Current user's display name for the "Changed By" accountability field
  const { data: currentUserName } = useQuery({
    queryKey: ["currentUserDisplayName"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "";
      const meta = (user.user_metadata || {}) as Record<string, any>;
      return (
        meta.full_name ||
        meta.name ||
        meta.display_name ||
        user.email ||
        ""
      );
    },
  });

  // Query to fetch assigned planter from previous "assigned" transition
  const { data: assignedPlanterData } = useQuery({
    queryKey: ["assignedPlanterForTrees", request?.treeIds],
    queryFn: async () => {
      if (!request?.treeIds?.length) return null;
      // Get the most recent "assigned" transition for the first tree
      const { data } = await supabase
        .from("tree_status_transitions")
        .select("transition_data")
        .eq("tree_id", request.treeIds[0])
        .eq("to_status", "assigned")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const td = data[0].transition_data as Record<string, any>;
        return { planterId: td?.assigned_to, planterName: td?.planter_name };
      }
      return null;
    },
    enabled: open && !!request && ["planting_scheduled", "sapling_planted"].includes(request.toStatus),
  });

  // Reset form when request changes
  useEffect(() => {
    if (request) {
      const defaults: Record<string, any> = {};
      if (request.toStatus === "assigned") {
        defaults.assigned_date = format(new Date(), "yyyy-MM-dd");
      } else if (request.toStatus === "site_prepared") {
        defaults.site_prepared_date = format(new Date(), "yyyy-MM-dd");
      } else if (request.toStatus === "saplings_ready") {
        defaults.sapling_count = request.treeCount || 1;
        defaults.nursery_ready_date = format(new Date(), "yyyy-MM-dd");
      } else if (request.toStatus === "planting_scheduled") {
        defaults.scheduled_date = format(new Date(), "yyyy-MM-dd");
      } else if (request.toStatus === "sapling_planted") {
        defaults.actual_planting_date = format(new Date(), "yyyy-MM-dd");
        defaults.trees_actually_planted = request.treeCount || request.treeIds.length;
      } else if (request.toStatus === "being_mapped") {
        defaults.geo_tag_date = format(new Date(), "yyyy-MM-dd");
      } else if (request.toStatus === "verified") {
        defaults.verification_date = format(new Date(), "yyyy-MM-dd");
      } else if (request.toStatus === "dead") {
        defaults.date_confirmed_dead = format(new Date(), "yyyy-MM-dd");
        defaults.replacement_planned = false;
      } else if (request.toStatus === "re_planted") {
        defaults.re_planted_date = format(new Date(), "yyyy-MM-dd");
      }
      // Universal accountability field — pre-fill with current user's name
      defaults.changed_by = currentUserName || "";

      // Merge in existing transition data when editing the current status
      const merged = isEditMode && existingTransitionData
        ? { ...defaults, ...existingTransitionData, changed_by: currentUserName || (existingTransitionData as any).changed_by || "" }
        : defaults;
      setFormData(merged);
      setBaseline(JSON.stringify(merged));
      setPhotos([]);
      setBeatSearch("");
      setEditingPlantedBy(false);
    }
  }, [request, currentUserName, existingTransitionData, isEditMode]);

  // Pre-fill planter from assigned status when data is available
  useEffect(() => {
    if (assignedPlanterData?.planterId && request) {
      if (request.toStatus === "planting_scheduled") {
        setFormData(prev => ({ ...prev, planting_team_lead: prev.planting_team_lead || assignedPlanterData.planterId }));
      } else if (request.toStatus === "sapling_planted") {
        setFormData(prev => ({ ...prev, planted_by: prev.planted_by || assignedPlanterData.planterId }));
      }
    }
  }, [assignedPlanterData, request]);

  // Resolve current user's organization to scope planters dropdown
  const { user } = useAuth();
  const { data: currentOrgId } = useQuery({
    queryKey: ["transitionCurrentOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).maybeSingle();
      return data?.organization_id as string | null;
    },
    enabled: !!user?.id,
  });

  // Queries for reference data
  const { data: planters } = useQuery({
    queryKey: ["transitionPlanters", currentOrgId],
    queryFn: async () => {
      let q = supabase.from("tree_carers").select("id, name, planter_type, roles").eq("status", "Active");
      if (currentOrgId) q = q.eq("associated_partner_id", currentOrgId);
      const { data } = await q.order("name");
      return data || [];
    },
    enabled: open && !!request && ["assigned", "planting_scheduled", "sapling_planted", "verified"].includes(request.toStatus),
  });

  const { data: allBeats } = useQuery({
    queryKey: ["transitionAllBeats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mdm_location_beats")
        .select("id, name, station:mdm_location_stations(name, block:mdm_location_blocks(name, subcounty:mdm_location_subcounties(name, county:mdm_location_counties(name))))")
        .eq("is_active", true)
        .order("name");
      return (data || []).map((b: any) => {
        const station = b.station;
        const block = station?.block;
        const subcounty = block?.subcounty;
        const county = subcounty?.county;
        return {
          id: b.id,
          beatName: b.name,
          stationName: station?.name || "",
          blockName: block?.name || "",
          subcountyName: subcounty?.name || "",
          countyName: county?.name || "",
          label: `${b.name} – ${block?.name || ""} (${station?.name || ""}) – ${subcounty?.name || ""} (${county?.name || ""})`,
        };
      });
    },
    enabled: open && !!request && request.toStatus === "assigned",
  });

  const filteredBeats = useMemo(() => {
    if (!allBeats) return [];
    if (!beatSearch) return allBeats;
    const q = beatSearch.toLowerCase();
    return allBeats.filter(b => b.label.toLowerCase().includes(q));
  }, [allBeats, beatSearch]);

  const { data: nurseries } = useQuery({
    queryKey: ["transitionNurseries"],
    queryFn: async () => {
      const { data } = await supabase.from("nurseries").select("id, cbo_name, block_name").eq("is_active", true).order("cbo_name");
      return data || [];
    },
    enabled: open && !!request && request.toStatus === "saplings_ready",
  });

  const { data: speciesForNursery } = useQuery({
    queryKey: ["transitionSpecies", formData.nursery_id],
    queryFn: async () => {
      if (!formData.nursery_id) return [];
      const { data: links } = await supabase.from("nursery_species").select("species_id").eq("nursery_id", formData.nursery_id);
      if (!links?.length) return [];
      const speciesIds = links.map(l => l.species_id);
      const { data: species } = await supabase.from("seed_species").select("id, species_name, common_name, certification_source").in("id", speciesIds).eq("is_active", true);
      return species || [];
    },
    enabled: !!formData.nursery_id,
  });

  // Get seed source for selected species
  const selectedSpeciesData = useMemo(() => {
    if (!speciesForNursery || !formData.species_id) return null;
    return speciesForNursery.find(s => s.id === formData.species_id);
  }, [speciesForNursery, formData.species_id]);

  const setField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = request?.toStatus === "sapling_planted" ? 10 : 5;
    const combined = [...photos, ...files].slice(0, maxFiles);
    setPhotos(combined);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!photos.length) return [];
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split('.').pop();
      const path = `${request?.toStatus}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("planting-photos").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("planting-photos").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(8),
          longitude: pos.coords.longitude.toFixed(8),
          gps_accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
        }));
        toast.success("Location captured");
      },
      (err) => toast.error("Could not get location: " + err.message),
      { enableHighAccuracy: true }
    );
  };

  const validate = (): string | null => {
    if (!request) return "No request";
    const s = request.toStatus;
    if (s === "assigned") {
      if (!formData.assigned_to) return "Please select a planter";
      if (!formData.target_beat) return "Please select a target beat";
      if (!formData.assigned_date) return "Please set an assigned date";
    } else if (s === "site_prepared") {
      if (!formData.site_prepared_date) return "Please set a date";
      if (!formData.soil_type) return "Please select soil type";
      if (!formData.rainfall_zone) return "Please select rainfall zone";
      if (!formData.planting_season) return "Please select planting season";
      if (!formData.land_type) return "Please select land type";
    } else if (s === "saplings_ready") {
      if (!formData.nursery_id) return "Please select a nursery";
      if (!formData.species_id) return "Please select a species";
      if (!formData.sapling_count || formData.sapling_count < 1) return "Sapling count must be at least 1";
      if (!formData.nursery_ready_date) return "Please set nursery ready date";
    } else if (s === "planting_scheduled") {
      if (!formData.scheduled_date) return "Please set a scheduled date";
      if (!formData.planting_team_lead) return "Please select a team lead";
    } else if (s === "sapling_planted") {
      if (!formData.actual_planting_date) return "Please set actual planting date";
      if (!formData.planted_by) return "Please select planted by";
      if (!formData.trees_actually_planted || formData.trees_actually_planted < 1) return "Enter trees actually planted";
      if (!formData.planting_method) return "Please select planting method";
      if (photos.length === 0) return "At least 1 planting photo is required";
    } else if (s === "being_mapped") {
      if (!formData.geo_tag_id) return "Geo Tag ID is required";
      if (!formData.latitude) return "Latitude is required";
      if (!formData.longitude) return "Longitude is required";
      if (!request.isBatch && !formData.geo_tag_date) return "Geo tag date is required";
    } else if (s === "verified") {
      if (!formData.verified_by) return "Please select verifier";
      if (!formData.verification_date) return "Verification date is required";
      if (!formData.verification_method) return "Please select verification method";
    } else if (s === "dead") {
      if (!formData.date_confirmed_dead) return "Date is required";
      if (!formData.cause_of_death) return "Please select cause of death";
    } else if (s === "re_planted") {
      if (!formData.re_planted_date) return "Re-planted date is required";
    }
    if (!formData.changed_by || !String(formData.changed_by).trim()) {
      return "Please enter who is making this change (Entered By)";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) { toast.error(error); return; }
    if (!request) return;

    setSaving(true);
    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        setUploading(true);
        photoUrls = await uploadPhotos();
        setUploading(false);
      }

      // Build full transition data including location cascade info
      const fullData = { ...formData };
      if (request.toStatus === "assigned") {
        // beat label already stored in formData.target_beat_label
        const planter = planters?.find(p => p.id === formData.assigned_to);
        if (planter) fullData.assigned_to_name = planter.name;
      }
      if (request.toStatus === "saplings_ready") {
        const nursery = nurseries?.find(n => n.id === formData.nursery_id);
        if (nursery) fullData.nursery_name = nursery.cbo_name;
        if (selectedSpeciesData) {
          fullData.species_name = selectedSpeciesData.species_name;
          fullData.seed_source = selectedSpeciesData.certification_source || "Not specified";
        }
      }
      if (["planting_scheduled", "sapling_planted", "verified"].includes(request.toStatus)) {
        const planter = planters?.find(p => p.id === (formData.planting_team_lead || formData.planted_by || formData.verified_by));
        if (planter) fullData.planter_name = planter.name;
      }
      if (request.toStatus === "sapling_planted" && assignedPlanterData?.planterId) {
        fullData.original_assigned_planter_id = assignedPlanterData.planterId;
        fullData.original_assigned_planter_name = assignedPlanterData.planterName || null;
        fullData.planter_changed_from_assigned = !!formData.planted_by && formData.planted_by !== assignedPlanterData.planterId;
      }

      await onConfirm(request, fullData, photoUrls);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save transition");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!request) return null;

  const baseTitle = STATUS_TITLES[request.toStatus] || request.toStatus;
  const title = isEditMode ? `Edit: ${baseTitle}` : baseTitle;
  const treeLabel = request.treeIds.length === 1 ? "1 tree" : `${request.treeIds.length} trees`;
  const isDirty = !isEditMode || JSON.stringify(formData) !== baseline || photos.length > 0;

  const renderPlanterSelect = (fieldKey: string, label: string, required = true, roleFilter?: string, placeholder = "Select planter...") => {
    const options = (planters || []).filter(p => {
      if (!roleFilter) return true;
      const roles = Array.isArray((p as any).roles) ? (p as any).roles : [];
      return roles.includes(roleFilter);
    });
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label} {required && <span className="text-destructive">*</span>}</Label>
        <Select value={formData[fieldKey] || ""} onValueChange={(v) => setField(fieldKey, v)}>
          <SelectTrigger><SelectValue placeholder="Select planter..." /></SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matching planters</div>
            ) : options.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} {p.planter_type ? `(${p.planter_type})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPhotoUpload = (maxFiles: number, required = false) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Photos {required && <span className="text-destructive">*</span>}
        <span className="text-muted-foreground font-normal ml-1">(max {maxFiles})</span>
      </Label>
      <div className="flex flex-wrap gap-2">
        {photos.map((file, i) => (
          <div key={i} className="relative group">
            <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => removePhoto(i)}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < maxFiles && (
          <label className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
          </label>
        )}
      </div>
    </div>
  );

  const renderFormFields = () => {
    switch (request.toStatus) {
      case "assigned":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Location (Target Beat) <span className="text-destructive">*</span></Label>
              <Select value={formData.target_beat || ""} onValueChange={(v) => {
                setField("target_beat", v);
                const beat = allBeats?.find(b => b.id === v);
                if (beat) setField("target_beat_label", beat.label);
              }}>
                <SelectTrigger><SelectValue placeholder="Search and select beat..." /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Type to search..."
                      value={beatSearch}
                      onChange={(e) => setBeatSearch(e.target.value)}
                      className="h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {filteredBeats.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">No beats found</p>
                  )}
                  {filteredBeats.map(b => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.target_beat && (() => {
                const sel = allBeats?.find(b => b.id === formData.target_beat);
                if (!sel) return null;
                return (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                    <span className="font-medium text-foreground">Beat:</span><span>{sel.beatName}</span>
                    <span className="font-medium text-foreground">Station:</span><span>{sel.stationName}</span>
                    <span className="font-medium text-foreground">Block:</span><span>{sel.blockName}</span>
                    <span className="font-medium text-foreground">Sub-County:</span><span>{sel.subcountyName}</span>
                    <span className="font-medium text-foreground">County:</span><span>{sel.countyName}</span>
                  </div>
                );
              })()}
            </div>

            {renderPlanterSelect("assigned_to", "Planter")}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Assigned Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.assigned_date || ""} onChange={(e) => setField("assigned_date", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.notes || ""} onChange={(e) => setField("notes", e.target.value)} rows={3} />
            </div>
          </div>
        );

      case "site_prepared":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Site Prepared Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.site_prepared_date || ""} onChange={(e) => setField("site_prepared_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Soil Type <span className="text-destructive">*</span></Label>
              <Select value={formData.soil_type || ""} onValueChange={(v) => setField("soil_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select soil type..." /></SelectTrigger>
                <SelectContent>{SOIL_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Rainfall Zone <span className="text-destructive">*</span></Label>
              <Select value={formData.rainfall_zone || ""} onValueChange={(v) => setField("rainfall_zone", v)}>
                <SelectTrigger><SelectValue placeholder="Select zone..." /></SelectTrigger>
                <SelectContent>{RAINFALL_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Planting Season <span className="text-destructive">*</span></Label>
              <Select value={formData.planting_season || ""} onValueChange={(v) => setField("planting_season", v)}>
                <SelectTrigger><SelectValue placeholder="Select season..." /></SelectTrigger>
                <SelectContent>{PLANTING_SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Land Type <span className="text-destructive">*</span></Label>
              <Select value={formData.land_type || ""} onValueChange={(v) => setField("land_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select land type..." /></SelectTrigger>
                <SelectContent>{LAND_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Site Preparation Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.site_notes || ""} onChange={(e) => setField("site_notes", e.target.value)} rows={3} />
            </div>
            {renderPhotoUpload(5)}
          </div>
        );

      case "saplings_ready":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nursery / CBO <span className="text-destructive">*</span></Label>
              <Select value={formData.nursery_id || ""} onValueChange={(v) => { setField("nursery_id", v); setField("species_id", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select nursery..." /></SelectTrigger>
                <SelectContent>
                  {(nurseries || []).map(n => <SelectItem key={n.id} value={n.id}>{n.cbo_name} — {n.block_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Species <span className="text-destructive">*</span></Label>
              <Select value={formData.species_id || ""} onValueChange={(v) => setField("species_id", v)} disabled={!formData.nursery_id}>
                <SelectTrigger><SelectValue placeholder={formData.nursery_id ? "Select species..." : "Select nursery first"} /></SelectTrigger>
                <SelectContent>
                  {(speciesForNursery || []).map(s => <SelectItem key={s.id} value={s.id}>{s.species_name} {s.common_name ? `(${s.common_name})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sapling Count Allocated</Label>
              <Input type="number" min={1} value={formData.sapling_count || ""} readOnly disabled className="bg-muted cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Auto-filled from total trees in this order</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Sapling Age</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={formData.sapling_age_value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? undefined : parseInt(e.target.value);
                    setField("sapling_age_value", v);
                    const unit = formData.sapling_age_unit || "weeks";
                    setField("sapling_age", v !== undefined ? `${v} ${unit}` : undefined);
                  }}
                  placeholder="Optional"
                  className="flex-1"
                />
                <Select
                  value={formData.sapling_age_unit || "weeks"}
                  onValueChange={(unit) => {
                    setField("sapling_age_unit", unit);
                    if (formData.sapling_age_value !== undefined && formData.sapling_age_value !== "") {
                      setField("sapling_age", `${formData.sapling_age_value} ${unit}`);
                    }
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nursery Ready Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.nursery_ready_date || ""} onChange={(e) => setField("nursery_ready_date", e.target.value)} />
            </div>
            {selectedSpeciesData && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <Label className="text-xs text-muted-foreground">Seed Source (auto-filled)</Label>
                <p className="text-sm font-medium mt-0.5">{selectedSpeciesData.certification_source || "Not specified"}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.notes || ""} onChange={(e) => setField("notes", e.target.value)} rows={3} />
            </div>
          </div>
        );

      case "planting_scheduled":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Scheduled Planting Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.scheduled_date || ""} onChange={(e) => setField("scheduled_date", e.target.value)} />
            </div>
            {renderPlanterSelect("planting_team_lead", "Planting Team Lead", true, "Planting Team Lead")}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Community Participants Expected</Label>
              <Input type="number" min={0} value={formData.community_participants_expected || ""} onChange={(e) => setField("community_participants_expected", parseInt(e.target.value) || undefined)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Event Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.event_notes || ""} onChange={(e) => setField("event_notes", e.target.value)} rows={3} />
            </div>
          </div>
        );

      case "sapling_planted":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Actual Planting Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.actual_planting_date || ""} onChange={(e) => setField("actual_planting_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Planted By <span className="text-destructive">*</span></Label>
              {editingPlantedBy ? (
                <Select
                  value={formData.planted_by || ""}
                  onValueChange={(v) => {
                    setField("planted_by", v);
                    const p = planters?.find(pl => pl.id === v);
                    if (p) setField("planted_by_name", p.name);
                    setEditingPlantedBy(false);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select planter..." /></SelectTrigger>
                  <SelectContent>
                    {(planters || []).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.planter_type ? `(${p.planter_type})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                    value={
                      (planters?.find(p => p.id === formData.planted_by)?.name) ||
                      formData.planted_by_name ||
                      assignedPlanterData?.planterName ||
                      ""
                    }
                    placeholder="Loading planter from Assigned status..."
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setEditingPlantedBy(true)}
                    title="Change planter"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Number of Trees Actually Planted <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} value={formData.trees_actually_planted || ""} onChange={(e) => setField("trees_actually_planted", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Community Participants</Label>
              <Input type="number" min={0} value={formData.community_participants || ""} onChange={(e) => setField("community_participants", parseInt(e.target.value) || undefined)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Planting Method <span className="text-destructive">*</span></Label>
              <Select value={formData.planting_method || ""} onValueChange={(v) => setField("planting_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>{PLANTING_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Planting Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.planting_notes || ""} onChange={(e) => setField("planting_notes", e.target.value)} rows={3} />
            </div>
            {renderPhotoUpload(10, true)}
          </div>
        );

      case "being_mapped":
        return (
          <div className="space-y-4">
            {request.isBatch && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-800">
                    This captures a <span className="font-semibold">group geotag</span> for all {request.treeIds.length} tree(s) in this batch. Per-tree geotags can still be captured separately on the Tree rows.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Geo Tag ID <span className="text-destructive">*</span></Label>
              <Input value={formData.geo_tag_id || ""} onChange={(e) => setField("geo_tag_id", e.target.value)} placeholder="e.g. GT-001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Latitude <span className="text-destructive">*</span></Label>
                <Input type="number" step="any" value={formData.latitude || ""} onChange={(e) => setField("latitude", e.target.value)} placeholder="-1.2921" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Longitude <span className="text-destructive">*</span></Label>
                <Input type="number" step="any" value={formData.longitude || ""} onChange={(e) => setField("longitude", e.target.value)} placeholder="36.8219" />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={handleUseLocation}>
              <MapPin className="h-4 w-4" />
              Capture from Current Location
            </Button>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Accuracy (m)</Label>
              <Input type="number" step="any" value={formData.gps_accuracy || ""} onChange={(e) => setField("gps_accuracy", e.target.value)} placeholder="e.g. 5" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Map Snapshot URL</Label>
              <Input value={formData.map_snapshot || ""} onChange={(e) => setField("map_snapshot", e.target.value)} placeholder="https://..." />
            </div>
            {!request.isBatch && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Geo Tag Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={formData.geo_tag_date || ""} onChange={(e) => setField("geo_tag_date", e.target.value)} />
              </div>
            )}
          </div>
        );

      case "verified":
        return (
          <div className="space-y-4">
            {renderPlanterSelect("verified_by", "Verified By", true, "Manager")}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Verification Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.verification_date || ""} onChange={(e) => setField("verification_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Verification Method <span className="text-destructive">*</span></Label>
              <Select value={formData.verification_method || ""} onValueChange={(v) => setField("verification_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>{VERIFICATION_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Verification Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.verification_notes || ""} onChange={(e) => setField("verification_notes", e.target.value)} rows={3} />
            </div>
            {renderPhotoUpload(5)}
          </div>
        );

      case "dead":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">Marking trees as dead will decrement the Planted counter.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date Confirmed Dead <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.date_confirmed_dead || ""} onChange={(e) => setField("date_confirmed_dead", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cause of Death <span className="text-destructive">*</span></Label>
              <Select value={formData.cause_of_death || ""} onValueChange={(v) => setField("cause_of_death", v)}>
                <SelectTrigger><SelectValue placeholder="Select cause..." /></SelectTrigger>
                <SelectContent>{DEATH_CAUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm font-medium">Replacement Planned?</Label>
              <Switch checked={formData.replacement_planned || false} onCheckedChange={(v) => setField("replacement_planned", v)} />
            </div>
            {formData.replacement_planned && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Replacement Target Date</Label>
                <Input type="date" value={formData.replacement_target_date || ""} onChange={(e) => setField("replacement_target_date", e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea placeholder="Optional notes..." value={formData.notes || ""} onChange={(e) => setField("notes", e.target.value)} rows={3} />
            </div>
          </div>
        );

      case "re_planted":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Re-planted Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={formData.re_planted_date || ""} onChange={(e) => setField("re_planted_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Re-planting Method</Label>
              <Select value={formData.re_planting_method || ""} onValueChange={(v) => setField("re_planting_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>{PLANTING_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea placeholder="Optional notes about re-planting..." value={formData.notes || ""} onChange={(e) => setField("notes", e.target.value)} rows={3} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // "Planted" status shows a confirmation dialog instead
  if (request.toStatus === "planted") {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Confirm Planted
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 py-6 space-y-4">
            <div className="rounded-lg border bg-green-50/50 border-green-200 p-4">
              <p className="text-sm text-green-800">
                Mark <strong>{treeLabel}</strong> as fully planted and verified? This will update the Planted counter in the summary header.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Entered By <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Your name"
                value={formData.changed_by || ""}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">For accountability — recorded with this status change.</p>
            </div>
          </div>
          <SheetFooter className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            {title}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {request.contributionId || ""} – updating {treeLabel}
          </p>
        </SheetHeader>

        <Separator className="my-2" />

        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
          {renderFormFields()}
          <div className="space-y-1.5 pt-3 border-t">
            <Label className="text-sm font-medium">Entered By <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Your name"
              value={formData.changed_by || ""}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
        </div>

        <SheetFooter className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading || !isDirty} className="flex-1">
            {uploading ? "Uploading photos..." : saving ? "Saving..." : isEditMode ? "Save changes" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
