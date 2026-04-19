import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ZoomIn } from "lucide-react";

type SliderType = "carbon" | "ecosystem" | "community";

interface Props {
  open: SliderType | null;
  onClose: () => void;
  contributionId: string;
  onPhotoClick?: (url: string) => void;
}

const TABLE_MAP: Record<SliderType, string> = {
  carbon: "carbon_metrics_logs",
  ecosystem: "ecosystem_impact_logs",
  community: "community_impact_logs",
};

const TITLE_MAP: Record<SliderType, { title: string; desc: string }> = {
  carbon: { title: "Carbon Metrics Logs", desc: "Override or refine carbon offset calculations" },
  ecosystem: { title: "Ecosystem Impact Logs", desc: "Track biodiversity, soil and water indicators" },
  community: { title: "Community Impact Logs", desc: "Track local jobs, participants and benefits" },
};

export const ImpactLogSliders: React.FC<Props> = ({ open, onClose, contributionId, onPhotoClick }) => {
  const queryClient = useQueryClient();
  const type = open;

  const { data: logs, refetch } = useQuery({
    queryKey: ["impactLogs", type, contributionId],
    queryFn: async () => {
      if (!type) return [];
      const { data, error } = await supabase
        .from(TABLE_MAP[type] as any)
        .select("*")
        .eq("contribution_id", contributionId)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!type && !!contributionId,
  });

  // Form states per type
  const [carbonForm, setCarbonForm] = useState<{ log_date: string; recorded_by: string; co2_offset_estimated_kg: string; co2_offset_actual_kg: string; calculation_method: string; notes: string; photos: string[] }>({
    log_date: "", recorded_by: "", co2_offset_estimated_kg: "", co2_offset_actual_kg: "",
    calculation_method: "ICAO Standard (22kg/tree/year)", notes: "", photos: []
  });
  const [ecoForm, setEcoForm] = useState<{ log_date: string; recorded_by: string; biodiversity_index: string; soil_improvement: string; water_retention: string; ecosystem_notes: string; photos: string[] }>({
    log_date: "", recorded_by: "", biodiversity_index: "",
    soil_improvement: "", water_retention: "", ecosystem_notes: "", photos: []
  });
  const [commForm, setCommForm] = useState<{ log_date: string; recorded_by: string; jobs_created: string; local_participants_count: string; update_frequency: string; community_benefits: string; photos: string[] }>({
    log_date: "", recorded_by: "", jobs_created: "", local_participants_count: "",
    update_frequency: "Quarterly", community_benefits: "", photos: []
  });
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setCarbonForm({ log_date: "", recorded_by: "", co2_offset_estimated_kg: "", co2_offset_actual_kg: "", calculation_method: "ICAO Standard (22kg/tree/year)", notes: "", photos: [] });
    setEcoForm({ log_date: "", recorded_by: "", biodiversity_index: "", soil_improvement: "", water_retention: "", ecosystem_notes: "", photos: [] });
    setCommForm({ log_date: "", recorded_by: "", jobs_created: "", local_participants_count: "", update_frequency: "Quarterly", community_benefits: "", photos: [] });
  };

  const currentPhotos = (): string[] => type === "carbon" ? carbonForm.photos : type === "ecosystem" ? ecoForm.photos : commForm.photos;
  const setCurrentPhotos = (updater: (prev: string[]) => string[]) => {
    if (type === "carbon") setCarbonForm(p => ({ ...p, photos: updater(p.photos) }));
    else if (type === "ecosystem") setEcoForm(p => ({ ...p, photos: updater(p.photos) }));
    else setCommForm(p => ({ ...p, photos: updater(p.photos) }));
  };

  const uploadFiles = async (files: File[]) => {
    if (!type || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `impact-${type}/${contributionId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('planting-photos').upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: pub } = supabase.storage.from('planting-photos').getPublicUrl(path);
        if (pub?.publicUrl) uploaded.push(pub.publicUrl);
      }
      if (uploaded.length) {
        setCurrentPhotos(prev => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} photo(s) uploaded`);
      }
    } finally {
      setUploading(false);
    }
  };

  const saveLog = useMutation({
    mutationFn: async () => {
      if (!type) return;
      let payload: any = { contribution_id: contributionId };
      if (type === "carbon") {
        if (!carbonForm.log_date || !carbonForm.recorded_by) throw new Error("Log date and Recorded by are required");
        payload = {
          ...payload,
          log_date: carbonForm.log_date,
          recorded_by: carbonForm.recorded_by,
          co2_offset_estimated_kg: carbonForm.co2_offset_estimated_kg ? parseFloat(carbonForm.co2_offset_estimated_kg) : null,
          co2_offset_actual_kg: carbonForm.co2_offset_actual_kg ? parseFloat(carbonForm.co2_offset_actual_kg) : null,
          calculation_method: carbonForm.calculation_method || null,
          notes: carbonForm.notes || null,
          photos: carbonForm.photos,
        };
      } else if (type === "ecosystem") {
        if (!ecoForm.log_date || !ecoForm.recorded_by) throw new Error("Log date and Recorded by are required");
        payload = {
          ...payload,
          log_date: ecoForm.log_date,
          recorded_by: ecoForm.recorded_by,
          biodiversity_index: ecoForm.biodiversity_index ? parseFloat(ecoForm.biodiversity_index) : null,
          soil_improvement: ecoForm.soil_improvement || null,
          water_retention: ecoForm.water_retention || null,
          ecosystem_notes: ecoForm.ecosystem_notes || null,
          photos: ecoForm.photos,
        };
      } else {
        if (!commForm.log_date || !commForm.recorded_by) throw new Error("Log date and Recorded by are required");
        payload = {
          ...payload,
          log_date: commForm.log_date,
          recorded_by: commForm.recorded_by,
          jobs_created: commForm.jobs_created ? parseInt(commForm.jobs_created) : 0,
          local_participants_count: commForm.local_participants_count ? parseInt(commForm.local_participants_count) : 0,
          update_frequency: commForm.update_frequency || "Quarterly",
          community_benefits: commForm.community_benefits || null,
          photos: commForm.photos,
        };
      }
      const { error } = await supabase.from(TABLE_MAP[type] as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Log saved");
      resetForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ["impactLogs", type, contributionId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const PhotoUploader = () => {
    if (!type) return null;
    const photos = currentPhotos();
    const captureId = `impact-${type}-camera-capture`;
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Photos</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              await uploadFiles(files);
              e.target.value = '';
            }}
          />
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id={captureId}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await uploadFiles([file]);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(captureId)?.click()} disabled={uploading}>
            Capture
          </Button>
        </div>
        {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 pt-2">
            {photos.map((url, i) => (
              <div key={i} className="relative group">
                <button type="button" onClick={() => onPhotoClick?.(url)} className="block w-full h-20 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  if (!type) return null;
  const meta = TITLE_MAP[type];

  return (
    <Sheet open={!!type} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{meta.title}</SheetTitle>
          <SheetDescription>{meta.desc}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="previous" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="previous">Previous Logs ({logs?.length || 0})</TabsTrigger>
            <TabsTrigger value="new">Add New Log</TabsTrigger>
          </TabsList>

          {/* Previous Logs */}
          <TabsContent value="previous">
            <div className="pt-2">
              {logs && logs.length > 0 ? (
                <Accordion type="multiple" className="space-y-2">
                  {logs.map((log: any) => (
                    <AccordionItem key={log.id} value={log.id} className="rounded-lg border bg-card px-3 data-[state=open]:bg-muted/30">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2 gap-2">
                          <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-semibold">
                              {format(new Date(log.log_date), "MMM dd, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">{log.recorded_by}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {type === "carbon" && log.co2_offset_estimated_kg != null && (
                              <Badge variant="outline" className="text-[10px]">
                                Est {Number(log.co2_offset_estimated_kg).toLocaleString()} kg
                              </Badge>
                            )}
                            {type === "carbon" && log.co2_offset_actual_kg != null && (
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/20">
                                Act {Number(log.co2_offset_actual_kg).toLocaleString()} kg
                              </Badge>
                            )}
                            {type === "ecosystem" && log.biodiversity_index != null && (
                              <Badge variant="outline" className="text-[10px]">Bio {log.biodiversity_index}/10</Badge>
                            )}
                            {type === "ecosystem" && log.soil_improvement && (
                              <Badge variant="outline" className="text-[10px]">Soil: {log.soil_improvement}</Badge>
                            )}
                            {type === "community" && (
                              <>
                                <Badge variant="outline" className="text-[10px]">Jobs {log.jobs_created || 0}</Badge>
                                <Badge variant="outline" className="text-[10px]">Part. {log.local_participants_count || 0}</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-2 text-sm">
                          {type === "carbon" && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-muted-foreground text-xs">Estimated:</span> <span className="font-medium">{log.co2_offset_estimated_kg ?? "—"} kg</span></div>
                                <div><span className="text-muted-foreground text-xs">Actual:</span> <span className="font-medium">{log.co2_offset_actual_kg ?? "—"} kg</span></div>
                              </div>
                              {log.calculation_method && <div><span className="text-muted-foreground text-xs">Method:</span> <span className="font-medium">{log.calculation_method}</span></div>}
                              {log.notes && <div className="text-muted-foreground italic">"{log.notes}"</div>}
                            </>
                          )}
                          {type === "ecosystem" && (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <div><span className="text-muted-foreground text-xs">Biodiversity:</span> <span className="font-medium">{log.biodiversity_index ?? "—"}</span></div>
                                <div><span className="text-muted-foreground text-xs">Soil:</span> <span className="font-medium">{log.soil_improvement || "—"}</span></div>
                                <div><span className="text-muted-foreground text-xs">Water:</span> <span className="font-medium">{log.water_retention || "—"}</span></div>
                              </div>
                              {log.ecosystem_notes && <div className="text-muted-foreground italic">"{log.ecosystem_notes}"</div>}
                            </>
                          )}
                          {type === "community" && (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <div><span className="text-muted-foreground text-xs">Jobs:</span> <span className="font-medium">{log.jobs_created || 0}</span></div>
                                <div><span className="text-muted-foreground text-xs">Participants:</span> <span className="font-medium">{log.local_participants_count || 0}</span></div>
                                <div><span className="text-muted-foreground text-xs">Frequency:</span> <span className="font-medium">{log.update_frequency || "—"}</span></div>
                              </div>
                              {log.community_benefits && <div className="text-muted-foreground italic">"{log.community_benefits}"</div>}
                            </>
                          )}
                          {log.photos && log.photos.length > 0 && (
                            <div className="flex gap-2 flex-wrap pt-2">
                              {log.photos.map((p: string, i: number) => (
                                <button key={i} type="button" onClick={() => onPhotoClick?.(p)} className="relative h-16 w-16 rounded overflow-hidden border group">
                                  <img src={p} alt="Log photo" className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                    <ZoomIn className="h-4 w-4 text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-6">No logs recorded yet.</p>
              )}
            </div>
          </TabsContent>

          {/* Add New Log */}
          <TabsContent value="new">
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Log Date *</Label>
                  <Input type="date"
                    value={type === "carbon" ? carbonForm.log_date : type === "ecosystem" ? ecoForm.log_date : commForm.log_date}
                    onChange={e => {
                      if (type === "carbon") setCarbonForm(p => ({ ...p, log_date: e.target.value }));
                      else if (type === "ecosystem") setEcoForm(p => ({ ...p, log_date: e.target.value }));
                      else setCommForm(p => ({ ...p, log_date: e.target.value }));
                    }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Recorded By *</Label>
                  <Input placeholder="Name"
                    value={type === "carbon" ? carbonForm.recorded_by : type === "ecosystem" ? ecoForm.recorded_by : commForm.recorded_by}
                    onChange={e => {
                      if (type === "carbon") setCarbonForm(p => ({ ...p, recorded_by: e.target.value }));
                      else if (type === "ecosystem") setEcoForm(p => ({ ...p, recorded_by: e.target.value }));
                      else setCommForm(p => ({ ...p, recorded_by: e.target.value }));
                    }} />
                </div>
              </div>

              {type === "carbon" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">CO₂ Estimated (kg)</Label>
                      <Input type="number" value={carbonForm.co2_offset_estimated_kg} onChange={e => setCarbonForm(p => ({ ...p, co2_offset_estimated_kg: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CO₂ Actual (kg)</Label>
                      <Input type="number" placeholder="Verified data" value={carbonForm.co2_offset_actual_kg} onChange={e => setCarbonForm(p => ({ ...p, co2_offset_actual_kg: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Calculation Method</Label>
                    <Select value={carbonForm.calculation_method} onValueChange={v => setCarbonForm(p => ({ ...p, calculation_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ICAO Standard (22kg/tree/year)">ICAO Standard (22kg/tree/year)</SelectItem>
                        <SelectItem value="IPCC Tropical">IPCC Tropical</SelectItem>
                        <SelectItem value="Third-party verified">Third-party verified</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Textarea rows={2} value={carbonForm.notes} onChange={e => setCarbonForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <PhotoUploader />
                </>
              )}

              {type === "ecosystem" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Biodiversity Index (0–10)</Label>
                    <Input type="number" min="0" max="10" step="0.1" value={ecoForm.biodiversity_index} onChange={e => setEcoForm(p => ({ ...p, biodiversity_index: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Soil Improvement</Label>
                      <Select value={ecoForm.soil_improvement} onValueChange={v => setEcoForm(p => ({ ...p, soil_improvement: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Minimal">Minimal</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Significant">Significant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Water Retention</Label>
                      <Select value={ecoForm.water_retention} onValueChange={v => setEcoForm(p => ({ ...p, water_retention: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Minimal">Minimal</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Significant">Significant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ecosystem Notes</Label>
                    <Textarea rows={2} value={ecoForm.ecosystem_notes} onChange={e => setEcoForm(p => ({ ...p, ecosystem_notes: e.target.value }))} />
                  </div>
                  <PhotoUploader />
                </>
              )}

              {type === "community" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jobs Created</Label>
                      <Input type="number" value={commForm.jobs_created} onChange={e => setCommForm(p => ({ ...p, jobs_created: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Local Participants</Label>
                      <Input type="number" value={commForm.local_participants_count} onChange={e => setCommForm(p => ({ ...p, local_participants_count: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Update Frequency</Label>
                    <Select value={commForm.update_frequency} onValueChange={v => setCommForm(p => ({ ...p, update_frequency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Community Benefits Description</Label>
                    <Textarea rows={2} value={commForm.community_benefits} onChange={e => setCommForm(p => ({ ...p, community_benefits: e.target.value }))} />
                  </div>
                  <PhotoUploader />
                </>
              )}

              <Button className="w-full" onClick={() => saveLog.mutate()} disabled={saveLog.isPending}>
                {saveLog.isPending ? "Saving..." : "Save Log"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ImpactLogSliders;
