import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Sprout, CheckCircle2, XCircle, MoreVertical, Eye, Pencil, Trash2, Power, X, User } from 'lucide-react';

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

type SheetMode = 'add' | 'view' | 'edit';

export function StakeholderMdmNurseries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('add');
  const [selectedNurseryId, setSelectedNurseryId] = useState<string | null>(null);
  const [form, setForm] = useState<NurseryForm>(emptyForm);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ id: string; name: string; is_active: boolean } | null>(null);

  // Get org id
  const { data: orgId } = useQuery({
    queryKey: ['mdmNurseryOrgId', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('organization_id').eq('user_id', user!.id).single();
      return data?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: nurseries = [], isLoading } = useQuery({
    queryKey: ['mdm_nurseries', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nurseries')
        .select('*')
        .eq('stakeholder_org_id', orgId!)
        .order('cbo_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: allSpecies } = useQuery({
    queryKey: ['seed_species'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seed_species').select('*').order('species_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch species for the currently selected nursery
  const { data: nurserySpeciesLinks } = useQuery({
    queryKey: ['nursery_species_mdm', selectedNurseryId],
    queryFn: async () => {
      const { data, error } = await supabase.from('nursery_species' as any).select('species_id').eq('nursery_id', selectedNurseryId!);
      if (error) throw error;
      return (data as any[])?.map((r: any) => r.species_id as string) ?? [];
    },
    enabled: !!selectedNurseryId && sheetOpen,
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

  const filtered = nurseries.filter(n =>
    n.cbo_name.toLowerCase().includes(search.toLowerCase()) ||
    n.block_name.toLowerCase().includes(search.toLowerCase()) ||
    (n.county || '').toLowerCase().includes(search.toLowerCase())
  );

  const openSheet = (mode: SheetMode, nursery?: any) => {
    setSheetMode(mode);
    if (nursery) {
      setSelectedNurseryId(nursery.id);
      setForm({
        cbo_name: nursery.cbo_name || '',
        block_name: nursery.block_name || '',
        location: nursery.location || '',
        capacity: String(nursery.capacity || 0),
        county: nursery.county || '',
        sub_county: nursery.sub_county || '',
        address: nursery.address || '',
        manager_name: nursery.manager_name || '',
        manager_phone: nursery.manager_phone || '',
        is_kefri_certified: nursery.is_kefri_certified || false,
        selected_species: [],
      });
    } else {
      setSelectedNurseryId(null);
      setForm(emptyForm);
    }
    setSpeciesSearch('');
    setSheetOpen(true);
  };

  // Sync species links when they load for view/edit
  useMemo(() => {
    if (nurserySpeciesLinks && selectedNurseryId && (sheetMode === 'view' || sheetMode === 'edit')) {
      setForm(prev => ({ ...prev, selected_species: nurserySpeciesLinks }));
    }
  }, [nurserySpeciesLinks, selectedNurseryId, sheetMode]);

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedNurseryId(null);
    setForm(emptyForm);
    setSpeciesSearch('');
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Organization not found');
      const { data: nursery, error } = await supabase.from('nurseries').insert({
        stakeholder_org_id: orgId,
        cbo_name: form.cbo_name,
        block_name: form.block_name,
        location: form.location || null,
        capacity: parseInt(form.capacity) || 0,
        county: form.county || null,
        sub_county: form.sub_county || null,
        address: form.address || null,
        manager_name: form.manager_name || null,
        manager_phone: form.manager_phone || null,
        is_kefri_certified: form.is_kefri_certified,
      } as any).select('id').single();
      if (error) throw error;

      if (form.selected_species.length > 0 && nursery) {
        const rows = form.selected_species.map(species_id => ({ nursery_id: nursery.id, species_id }));
        await supabase.from('nursery_species' as any).insert(rows);
      }

      await supabase.from('mdm_audit_log').insert({
        module_id: 'mdm_nurseries', record_id: nursery.id, action: 'CREATE',
        changed_by_user_id: user?.id, new_values: form,
      });
    },
    onSuccess: () => {
      toast.success('Nursery added');
      closeSheet();
      queryClient.invalidateQueries({ queryKey: ['mdm_nurseries'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNurseryId) return;
      const { error } = await supabase.from('nurseries').update({
        cbo_name: form.cbo_name,
        block_name: form.block_name,
        location: form.location || null,
        capacity: parseInt(form.capacity) || 0,
        county: form.county || null,
        sub_county: form.sub_county || null,
        address: form.address || null,
        manager_name: form.manager_name || null,
        manager_phone: form.manager_phone || null,
        is_kefri_certified: form.is_kefri_certified,
      } as any).eq('id', selectedNurseryId);
      if (error) throw error;

      // Sync species: delete all then re-insert
      await supabase.from('nursery_species' as any).delete().eq('nursery_id', selectedNurseryId);
      if (form.selected_species.length > 0) {
        const rows = form.selected_species.map(species_id => ({ nursery_id: selectedNurseryId, species_id }));
        await supabase.from('nursery_species' as any).insert(rows);
      }

      await supabase.from('mdm_audit_log').insert({
        module_id: 'mdm_nurseries', record_id: selectedNurseryId, action: 'UPDATE',
        changed_by_user_id: user?.id, new_values: form,
      });
    },
    onSuccess: () => {
      toast.success('Nursery updated');
      closeSheet();
      queryClient.invalidateQueries({ queryKey: ['mdm_nurseries'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('nursery_species' as any).delete().eq('nursery_id', id);
      const { error } = await supabase.from('nurseries').delete().eq('id', id);
      if (error) throw error;
      await supabase.from('mdm_audit_log').insert({
        module_id: 'mdm_nurseries', record_id: id, action: 'DELETE',
        changed_by_user_id: user?.id,
      });
    },
    onSuccess: () => {
      toast.success('Nursery deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['mdm_nurseries'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const newState = !is_active;
      const { error } = await supabase.from('nurseries').update({ is_active: newState } as any).eq('id', id);
      if (error) throw error;
      await supabase.from('mdm_audit_log').insert({
        module_id: 'mdm_nurseries', record_id: id,
        action: newState ? 'REACTIVATE' : 'DEACTIVATE',
        changed_by_user_id: user?.id,
        old_values: { is_active }, new_values: { is_active: newState },
      });
    },
    onSuccess: () => {
      toast.success(`Nursery ${statusTarget?.is_active ? 'deactivated' : 'activated'} successfully`);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['mdm_nurseries'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedSpeciesNames = useMemo(() => {
    if (!allSpecies) return [];
    return allSpecies.filter(s => form.selected_species.includes(s.id));
  }, [allSpecies, form.selected_species]);

  const totalCapacity = nurseries.reduce((s, n) => s + (n.capacity || 0), 0);
  const activeCount = nurseries.filter(n => n.is_active).length;
  const certifiedCount = nurseries.filter(n => n.is_kefri_certified).length;

  const isReadOnly = sheetMode === 'view';
  const sheetTitle = sheetMode === 'add' ? 'Add New Nursery' : sheetMode === 'edit' ? 'Edit Nursery' : 'View Nursery';

  const renderForm = () => (
    <ScrollArea className="h-[calc(100vh-80px)] px-6 pb-6">
      <div className="space-y-4 pb-6">
        {/* CBO Name + KEFRI side by side */}
        <div className="space-y-2">
          <Label>CBO Name / Nursery *</Label>
          <Input value={form.cbo_name} onChange={e => setForm({ ...form, cbo_name: e.target.value })} placeholder="Community group / nursery name" disabled={isReadOnly} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="kefri" checked={form.is_kefri_certified} onCheckedChange={(checked) => setForm({ ...form, is_kefri_certified: !!checked })} disabled={isReadOnly} />
          <Label htmlFor="kefri" className="cursor-pointer text-sm">KEFRI Certified Nursery</Label>
        </div>

        <div className="space-y-2">
          <Label>Block Name *</Label>
          <Select value={form.block_name} onValueChange={v => setForm({ ...form, block_name: v })} disabled={isReadOnly}>
            <SelectTrigger><SelectValue placeholder="Select block" /></SelectTrigger>
            <SelectContent>
              {BLOCK_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location details" disabled={isReadOnly} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>County</Label>
            <Input value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} placeholder="e.g. Nakuru" disabled={isReadOnly} />
          </div>
          <div className="space-y-2">
            <Label>Sub-County</Label>
            <Input value={form.sub_county} onChange={e => setForm({ ...form, sub_county: e.target.value })} placeholder="e.g. Molo" disabled={isReadOnly} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Physical address" disabled={isReadOnly} />
        </div>
        <div className="space-y-2">
          <Label>Manager</Label>
          <Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} placeholder="Manager name" disabled={isReadOnly} />
        </div>
        <div className="space-y-2">
          <Label>Manager's Contact No</Label>
          <Input value={form.manager_phone} onChange={e => setForm({ ...form, manager_phone: e.target.value })} placeholder="+254..." disabled={isReadOnly} />
        </div>
        <div className="space-y-2">
          <Label>Capacity (seedlings)</Label>
          <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="0" disabled={isReadOnly} />
        </div>

        {/* Species Multi-Select */}
        <div className="space-y-2">
          <Label>Species</Label>
          {!isReadOnly && (
            <Input value={speciesSearch} onChange={e => setSpeciesSearch(e.target.value)} placeholder="Search species..." />
          )}
          {selectedSpeciesNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedSpeciesNames.map(sp => (
                <Badge key={sp.id} variant="secondary" className="gap-1 text-xs">
                  {sp.species_name.split(' (')[0]}
                  {!isReadOnly && <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSpecies(sp.id)} />}
                </Badge>
              ))}
            </div>
          )}
          {!isReadOnly && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {filteredSpecies.map(sp => (
                <div key={sp.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm" onClick={() => toggleSpecies(sp.id)}>
                  <Checkbox checked={form.selected_species.includes(sp.id)} />
                  <span>{sp.species_name}</span>
                </div>
              ))}
              {filteredSpecies.length === 0 && <p className="text-xs text-muted-foreground p-3">No species found</p>}
            </div>
          )}
          {isReadOnly && selectedSpeciesNames.length === 0 && (
            <p className="text-sm text-muted-foreground">No species assigned</p>
          )}
        </div>

        {/* Actions */}
        {sheetMode === 'add' && (
          <Button onClick={() => addMutation.mutate()} disabled={!form.cbo_name || !form.block_name || addMutation.isPending} className="w-full">
            {addMutation.isPending ? 'Adding...' : 'Add Nursery'}
          </Button>
        )}
        {sheetMode === 'edit' && (
          <Button onClick={() => editMutation.mutate()} disabled={!form.cbo_name || !form.block_name || editMutation.isPending} className="w-full">
            {editMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
        {sheetMode === 'view' && (
          <Button variant="outline" onClick={() => setSheetMode('edit')} className="w-full">
            <Pencil className="h-4 w-4 mr-2" />Switch to Edit
          </Button>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sprout className="h-6 w-6 text-emerald-600" /> Nurseries & CBOs Registry
          </h1>
          <p className="text-muted-foreground mt-1">Manage community-based nurseries linked to your organisation</p>
        </div>
        <Button onClick={() => openSheet('add')} className="gap-2">
          <Plus className="h-4 w-4" /> Add Nursery
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Sprout className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{nurseries.length}</p><p className="text-xs text-muted-foreground">Total Nurseries</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><CheckCircle2 className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{certifiedCount}</p><p className="text-xs text-muted-foreground">KEFRI Certified</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><Sprout className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{totalCapacity.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Capacity</p></div>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search nurseries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Badge variant="outline">{filtered.length} nurseries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No nurseries found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CBO Name</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>KEFRI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.cbo_name}</TableCell>
                    <TableCell>{item.block_name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.county || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{item.manager_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{(item.capacity || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {item.is_kefri_certified ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={item.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openSheet('view', item)}>
                            <Eye className="h-4 w-4 mr-2" />View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSheet('edit', item)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusTarget({ id: item.id, name: item.cbo_name, is_active: item.is_active ?? true })}>
                            <Power className="h-4 w-4 mr-2" />{item.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: item.id, name: item.cbo_name })}>
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

      {/* Sheet for Add / View / Edit */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>
          {renderForm()}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Nursery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all associated species links. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation */}
      <AlertDialog open={!!statusTarget} onOpenChange={(open) => { if (!open) setStatusTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTarget?.is_active ? 'Deactivate Nursery' : 'Activate Nursery'}</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.is_active ? (
                <>Are you sure you want to deactivate <strong>{statusTarget?.name}</strong>? It will no longer appear in active lists.</>
              ) : (
                <>Are you sure you want to activate <strong>{statusTarget?.name}</strong>? It will be restored to active lists.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusTarget && statusMutation.mutate({ id: statusTarget.id, is_active: statusTarget.is_active })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Processing...' : statusTarget?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
