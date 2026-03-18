import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Sprout, RefreshCw, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const BLOCK_OPTIONS = ["Eastern", "Molo", "Western", "South-West Mau"];

interface NurseryForm {
  cbo_name: string;
  block_name: string;
  location: string;
  capacity: string;
  county: string;
  sub_county: string;
  address: string;
  manager_name: string;
  manager_phone: string;
  is_kefri_certified: boolean;
  selected_species: string[];
}

const emptyForm: NurseryForm = {
  cbo_name: '', block_name: '', location: '', capacity: '',
  county: '', sub_county: '', address: '', manager_name: '',
  manager_phone: '', is_kefri_certified: false, selected_species: [],
};

export const StakeholderNurseries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NurseryForm>(emptyForm);
  const [speciesSearch, setSpeciesSearch] = useState("");

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: nurseries, isLoading, refetch } = useQuery({
    queryKey: ["nurseries", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("nurseries").select("*").eq("stakeholder_org_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: allSpecies } = useQuery({
    queryKey: ["seed_species"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seed_species").select("*").order("species_name");
      if (error) throw error;
      return data;
    },
  });

  const filteredSpecies = useMemo(() => {
    if (!allSpecies) return [];
    if (!speciesSearch) return allSpecies;
    const q = speciesSearch.toLowerCase();
    return allSpecies.filter(s => s.species_name.toLowerCase().includes(q));
  }, [allSpecies, speciesSearch]);

  const toggleSpecies = (id: string) => {
    setForm(prev => ({
      ...prev,
      selected_species: prev.selected_species.includes(id)
        ? prev.selected_species.filter(s => s !== id)
        : [...prev.selected_species, id],
    }));
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: nursery, error } = await supabase.from("nurseries").insert({
        stakeholder_org_id: orgId!,
        cbo_name: form.cbo_name,
        block_name: form.block_name,
        location: form.location,
        capacity: parseInt(form.capacity) || 0,
        county: form.county || null,
        sub_county: form.sub_county || null,
        address: form.address || null,
        manager_name: form.manager_name || null,
        manager_phone: form.manager_phone || null,
        is_kefri_certified: form.is_kefri_certified,
      } as any).select("id").single();
      if (error) throw error;

      // Insert species links
      if (form.selected_species.length > 0 && nursery) {
        const rows = form.selected_species.map(species_id => ({
          nursery_id: nursery.id,
          species_id,
        }));
        const { error: spError } = await supabase.from("nursery_species" as any).insert(rows);
        if (spError) console.error("Species link error:", spError);
      }
    },
    onSuccess: () => {
      toast.success("Nursery added");
      setShowAdd(false);
      setForm(emptyForm);
      setSpeciesSearch("");
      queryClient.invalidateQueries({ queryKey: ["nurseries"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedSpeciesNames = useMemo(() => {
    if (!allSpecies) return [];
    return allSpecies.filter(s => form.selected_species.includes(s.id));
  }, [allSpecies, form.selected_species]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nurseries</h1>
          <p className="text-muted-foreground mt-1">Community-Based Organization nurseries by block</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />Add Nursery
          </Button>
        </div>
      </div>

      {/* Add Nursery Sheet */}
      <Sheet open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setForm(emptyForm); setSpeciesSearch(""); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Add New Nursery</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)] px-6 pb-6">
            <div className="space-y-4 pb-6">
              {/* CBO Name + KEFRI Certified */}
              <div className="space-y-2">
                <Label>CBO Name / Nursery</Label>
                <Input value={form.cbo_name} onChange={e => setForm({ ...form, cbo_name: e.target.value })} placeholder="Community group / nursery name" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kefri"
                  checked={form.is_kefri_certified}
                  onCheckedChange={(checked) => setForm({ ...form, is_kefri_certified: !!checked })}
                />
                <Label htmlFor="kefri" className="cursor-pointer text-sm">KEFRI Certified Nursery</Label>
              </div>

              {/* Block Name Dropdown */}
              <div className="space-y-2">
                <Label>Block Name</Label>
                <Select value={form.block_name} onValueChange={v => setForm({ ...form, block_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select block" /></SelectTrigger>
                  <SelectContent>
                    {BLOCK_OPTIONS.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location details" />
              </div>

              {/* County */}
              <div className="space-y-2">
                <Label>County</Label>
                <Input value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} placeholder="e.g. Nakuru" />
              </div>

              {/* Sub-County */}
              <div className="space-y-2">
                <Label>Sub-County</Label>
                <Input value={form.sub_county} onChange={e => setForm({ ...form, sub_county: e.target.value })} placeholder="e.g. Molo" />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Physical address" />
              </div>

              {/* Manager */}
              <div className="space-y-2">
                <Label>Manager</Label>
                <Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} placeholder="Manager name" />
              </div>

              {/* Manager Contact */}
              <div className="space-y-2">
                <Label>Manager's Contact No</Label>
                <Input value={form.manager_phone} onChange={e => setForm({ ...form, manager_phone: e.target.value })} placeholder="+254..." />
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label>Capacity (seedlings)</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="0" />
              </div>

              {/* Species Multi-Select */}
              <div className="space-y-2">
                <Label>Species</Label>
                <Input
                  value={speciesSearch}
                  onChange={e => setSpeciesSearch(e.target.value)}
                  placeholder="Search species..."
                />
                {/* Selected species chips */}
                {selectedSpeciesNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedSpeciesNames.map(sp => (
                      <Badge key={sp.id} variant="secondary" className="gap-1 text-xs">
                        {sp.species_name.split(" (")[0]}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSpecies(sp.id)} />
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Species list */}
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filteredSpecies.map(sp => (
                    <div
                      key={sp.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
                      onClick={() => toggleSpecies(sp.id)}
                    >
                      <Checkbox checked={form.selected_species.includes(sp.id)} />
                      <span>{sp.species_name}</span>
                    </div>
                  ))}
                  {filteredSpecies.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3">No species found</p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => addMutation.mutate()}
                disabled={!form.cbo_name || !form.block_name || addMutation.isPending}
                className="w-full"
              >
                {addMutation.isPending ? 'Adding...' : 'Add Nursery'}
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !nurseries?.length ? (
            <div className="text-center py-12">
              <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No nurseries registered yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CBO Name / Nursery</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>KEFRI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nurseries.map(n => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.cbo_name}</TableCell>
                    <TableCell>{n.block_name}</TableCell>
                    <TableCell>{(n as any).county || '-'}</TableCell>
                    <TableCell>{(n as any).manager_name || '-'}</TableCell>
                    <TableCell>{n.capacity?.toLocaleString()}</TableCell>
                    <TableCell>
                      {(n as any).is_kefri_certified
                        ? <Badge variant="default" className="text-xs">Yes</Badge>
                        : <Badge variant="outline" className="text-xs">No</Badge>
                      }
                    </TableCell>
                    <TableCell><Badge variant={n.is_active ? "default" : "secondary"}>{n.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
