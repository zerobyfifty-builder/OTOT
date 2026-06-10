import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlantingLocations, PlantingLocation } from "@/hooks/useActivePlantingLocation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MapPin, Upload, X, Crosshair, MoreVertical } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FormState {
  id?: string;
  planted_by_name: string;
  planted_by_description: string;
  site_name: string;
  site_description: string;
  site_url: string;
  photo_url: string;
  gps_lat: string;
  gps_lng: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: FormState = {
  planted_by_name: "",
  planted_by_description: "",
  site_name: "",
  site_description: "",
  site_url: "",
  photo_url: "",
  gps_lat: "",
  gps_lng: "",
  is_active: false,
  sort_order: 0,
};

export default function PlantingLocationsConfig() {
  const { data: locations = [], isLoading } = usePlantingLocations();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setForm(emptyForm); setSheetOpen(true); };
  const openEdit = (loc: PlantingLocation) => {
    setForm({
      id: loc.id,
      planted_by_name: loc.planted_by_name,
      planted_by_description: loc.planted_by_description ?? "",
      site_name: loc.site_name,
      site_description: loc.site_description ?? "",
      site_url: loc.site_url ?? "",
      photo_url: loc.photo_url ?? "",
      gps_lat: loc.gps_lat?.toString() ?? "",
      gps_lng: loc.gps_lng?.toString() ?? "",
      is_active: loc.is_active,
      sort_order: loc.sort_order,
    });
    setSheetOpen(true);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["planting-locations"] }).then(
    () => qc.invalidateQueries({ queryKey: ["active-planting-location"] })
  );

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `planting-locations/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("planting-photos").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("planting-photos").getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: pub.publicUrl }));
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => setForm(f => ({ ...f, photo_url: "" }));

  const captureGps = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({
          ...f,
          gps_lat: pos.coords.latitude.toFixed(7),
          gps_lng: pos.coords.longitude.toFixed(7),
        }));
        toast.success("Captured current GPS location");
      },
      err => toast.error(err.message),
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    if (!form.planted_by_name.trim() || !form.site_name.trim()) {
      toast.error("Planted by and site name are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        planted_by_name: form.planted_by_name.trim(),
        planted_by_description: form.planted_by_description.trim() || null,
        site_name: form.site_name.trim(),
        site_description: form.site_description.trim() || null,
        site_url: form.site_url.trim() || null,
        photo_url: form.photo_url.trim() || null,
        gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
        gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (form.id) {
        const { error } = await supabase.from("planting_locations").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planting_locations").insert(payload);
        if (error) throw error;
      }
      await invalidate();
      setSheetOpen(false);
      toast.success("Planting location saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (loc: PlantingLocation) => {
    const { error } = await supabase
      .from("planting_locations")
      .update({ is_active: !loc.is_active })
      .eq("id", loc.id);
    if (error) { toast.error(error.message); return; }
    await invalidate();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("planting_locations").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    await invalidate();
    setDeleteId(null);
    toast.success("Location deleted");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">Planting Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage the content displayed on the tourist tree-purchase page.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Location</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Locations</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : locations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No planting locations yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Planted by</TableHead>
                  <TableHead>Planted here</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Tourist Portal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map(loc => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.planted_by_name}</TableCell>
                    <TableCell>{loc.site_name}</TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {loc.gps_lat != null && loc.gps_lng != null
                        ? `${Number(loc.gps_lat).toFixed(4)}, ${Number(loc.gps_lng).toFixed(4)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {loc.photo_url
                        ? <img src={loc.photo_url} alt="" className="h-10 w-16 object-cover rounded" />
                        : <Badge variant="outline">None</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch checked={loc.is_active} onCheckedChange={() => toggleActive(loc)} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={loc.show_in_tourist} onCheckedChange={() => toggleTourist(loc)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(loc)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(loc.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <SheetHeader>
            <SheetTitle>{form.id ? "Edit Planting Location" : "Add Planting Location"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label>Planted by (organization)</Label>
              <Input value={form.planted_by_name} onChange={e => setForm(f => ({ ...f, planted_by_name: e.target.value }))} placeholder="MFC-ICLIP" />
            </div>
            <div className="space-y-2">
              <Label>Planted by description</Label>
              <Textarea rows={4} value={form.planted_by_description} onChange={e => setForm(f => ({ ...f, planted_by_description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Planted here (site name)</Label>
              <Input value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} placeholder="Mau Forest Complex" />
            </div>
            <div className="space-y-2">
              <Label>Site description</Label>
              <Textarea rows={4} value={form.site_description} onChange={e => setForm(f => ({ ...f, site_description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Site website (optional)</Label>
              <Input value={form.site_url} onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))} placeholder="https://…" />
            </div>

            <div className="space-y-2">
              <Label>Site photo</Label>
              {form.photo_url ? (
                <div className="relative inline-block">
                  <img src={form.photo_url} alt="" className="h-32 rounded border" />
                  <button type="button" onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 bg-background/90 rounded-full p-1 border">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50 w-fit">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{uploading ? "Uploading…" : "Upload photo"}</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>GPS coordinates</Label>
                <Button type="button" variant="outline" size="sm" onClick={captureGps}>
                  <Crosshair className="h-3 w-3 mr-1" />Capture current
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" value={form.gps_lat} onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value }))} />
                <Input placeholder="Longitude" value={form.gps_lng} onChange={e => setForm(f => ({ ...f, gps_lng: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex items-center h-10">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this planting location?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
