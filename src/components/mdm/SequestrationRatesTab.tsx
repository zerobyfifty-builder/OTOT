import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Pencil, Leaf, Download, ChevronsUpDown, Check, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['indigenous', 'exotic', 'fruit', 'bamboo'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  indigenous: 'Indigenous',
  exotic: 'Exotic',
  fruit: 'Fruit',
  bamboo: 'Bamboo',
};
const CATEGORY_COLORS: Record<string, string> = {
  indigenous: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  exotic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  fruit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  bamboo: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
};

const GLOBAL_SURVIVAL = 0.85;

interface FormData {
  species_name: string;
  scientific_name: string;
  species_category: string;
  rate_kg_per_year_min: string;
  rate_kg_per_year_max: string;
  rate_kg_per_year_default: string;
  survival_rate_override: string;
  offset_horizon_years: string;
  data_source: string;
  source_year: string;
}

const emptyForm: FormData = {
  species_name: '',
  scientific_name: '',
  species_category: 'indigenous',
  rate_kg_per_year_min: '',
  rate_kg_per_year_max: '',
  rate_kg_per_year_default: '',
  survival_rate_override: '',
  offset_horizon_years: '20',
  data_source: '',
  source_year: new Date().getFullYear().toString(),
};

interface SequestrationRatesTabProps {
  readOnly?: boolean;
}

export function SequestrationRatesTab({ readOnly = false }: SequestrationRatesTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [speciesPopoverOpen, setSpeciesPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: speciesCatalogue = [] } = useQuery({
    queryKey: ['seed_species_catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seed_species')
        .select('id, species_name, common_name, scientific_name, category')
        .eq('is_active', true)
        .order('common_name', { ascending: true });
      if (error) throw error;
      return (data || []).sort((a: any, b: any) => {
        const nameA = (a.common_name || a.species_name || '').toLowerCase();
        const nameB = (b.common_name || b.species_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    },
  });

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['sequestration_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tree_sequestration_rates')
        .select('*')
        .order('species_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return rates.filter((r: any) => {
      const matchSearch = search === '' ||
        r.species_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.scientific_name || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'all' || r.species_category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [rates, search, filterCategory]);

  const getEffectiveRate = (r: any) => {
    const rate = Number(r.rate_kg_per_year_default);
    const survival = r.survival_rate_override != null ? Number(r.survival_rate_override) : GLOBAL_SURVIVAL;
    return rate * survival;
  };

  const liveEffectiveRate = useMemo(() => {
    const rate = parseFloat(formData.rate_kg_per_year_default) || 0;
    const survival = formData.survival_rate_override ? parseFloat(formData.survival_rate_override) : GLOBAL_SURVIVAL;
    return rate * survival;
  }, [formData.rate_kg_per_year_default, formData.survival_rate_override]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setFormData({
      species_name: item.species_name || '',
      scientific_name: item.scientific_name || '',
      species_category: item.species_category || 'indigenous',
      rate_kg_per_year_min: item.rate_kg_per_year_min?.toString() || '',
      rate_kg_per_year_max: item.rate_kg_per_year_max?.toString() || '',
      rate_kg_per_year_default: item.rate_kg_per_year_default?.toString() || '',
      survival_rate_override: item.survival_rate_override?.toString() || '',
      offset_horizon_years: item.offset_horizon_years?.toString() || '20',
      data_source: item.data_source || '',
      source_year: item.source_year?.toString() || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.species_name.trim()) { toast.error('Species name is required'); return; }
    if (!formData.rate_kg_per_year_default) { toast.error('Default rate is required'); return; }
    if (!formData.data_source.trim()) { toast.error('Data source is required'); return; }
    if (!formData.source_year) { toast.error('Source year is required'); return; }

    const payload: any = {
      species_name: formData.species_name.trim(),
      scientific_name: formData.scientific_name.trim() || null,
      species_category: formData.species_category,
      rate_kg_per_year_min: formData.rate_kg_per_year_min ? parseFloat(formData.rate_kg_per_year_min) : null,
      rate_kg_per_year_max: formData.rate_kg_per_year_max ? parseFloat(formData.rate_kg_per_year_max) : null,
      rate_kg_per_year_default: parseFloat(formData.rate_kg_per_year_default),
      survival_rate_override: formData.survival_rate_override ? parseFloat(formData.survival_rate_override) : null,
      offset_horizon_years: parseInt(formData.offset_horizon_years) || 20,
      data_source: formData.data_source.trim(),
      source_year: parseInt(formData.source_year),
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('tree_sequestration_rates').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Rate updated');
      } else {
        const { error } = await supabase.from('tree_sequestration_rates').insert(payload);
        if (error) throw error;
        toast.success('Rate added');
      }
      queryClient.invalidateQueries({ queryKey: ['sequestration_rates'] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleDeleteClick = () => {
    if (!editingId) return;
    const rate = rates.find((r: any) => r.id === editingId);
    setDeleteTarget({ id: editingId, name: rate?.species_name || formData.species_name });
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      // Check dependencies: carbon_offset_calculations and planting_cost_configs
      const [calcCheck, configCheck] = await Promise.all([
        supabase.from('carbon_offset_calculations').select('id', { count: 'exact', head: true }).eq('species_id', deleteTarget.id),
        supabase.from('planting_cost_configs').select('id', { count: 'exact', head: true }).eq('default_species_id', deleteTarget.id),
      ]);

      const deps: string[] = [];
      if ((calcCheck.count || 0) > 0) deps.push(`${calcCheck.count} carbon offset calculation(s)`);
      if ((configCheck.count || 0) > 0) deps.push(`${configCheck.count} planting cost config(s)`);

      if (deps.length > 0) {
        setDeleteError(`Cannot delete "${deleteTarget.name}" — it is linked to ${deps.join(' and ')}. Remove those references first.`);
        setDeleting(false);
        return;
      }

      const { error } = await supabase.from('tree_sequestration_rates').delete().eq('id', deleteTarget.id);
      if (error) throw error;

      toast.success(`"${deleteTarget.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ['sequestration_rates'] });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      resetForm();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (item: any) => {
    const newStatus = !item.is_active;
    try {
      const { error } = await supabase
        .from('tree_sequestration_rates')
        .update({ is_active: newStatus } as any)
        .eq('id', item.id);
      if (error) throw error;
      toast.success(newStatus ? 'Activated' : 'Deactivated');
      queryClient.invalidateQueries({ queryKey: ['sequestration_rates'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Species', 'Scientific Name', 'Category', 'Default Rate', 'Effective Rate', 'Horizon', 'Source', 'Active'];
    const rows = filtered.map((r: any) => [
      r.species_name, r.scientific_name || '', r.species_category,
      r.rate_kg_per_year_default, getEffectiveRate(r).toFixed(1),
      r.offset_horizon_years, r.data_source || '', r.is_active ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sequestration_rates.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" /> Sequestration Rates
          </h1>
          <p className="text-muted-foreground mt-1">CO₂ sequestration rates by tree species for carbon offset calculations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {!readOnly && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Rate
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} rates</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Species</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Default Rate</TableHead>
                  <TableHead className="text-right">Effective Rate</TableHead>
                  <TableHead className="text-right">Horizon</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Updated</TableHead>
                  {!readOnly && <TableHead className="text-center">Active</TableHead>}
                  {!readOnly && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={readOnly ? 7 : 9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={readOnly ? 7 : 9} className="text-center py-8 text-muted-foreground">No rates found</TableCell></TableRow>
                ) : filtered.map((r: any) => (
                  <TableRow key={r.id} className={cn(!r.is_active && 'opacity-50', 'cursor-pointer hover:bg-muted/50')} onClick={() => !readOnly && handleEdit(r)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.species_name}</p>
                        {r.scientific_name && <p className="text-xs text-muted-foreground italic">{r.scientific_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={CATEGORY_COLORS[r.species_category] || 'bg-muted text-muted-foreground'} variant="secondary">
                        {CATEGORY_LABELS[r.species_category] || r.species_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{Number(r.rate_kg_per_year_default)} kg/yr</TableCell>
                    <TableCell className="text-right font-mono">{getEffectiveRate(r).toFixed(1)} kg/yr</TableCell>
                    <TableCell className="text-right">{r.offset_horizon_years} years</TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">{r.data_source}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.updated_at ? format(new Date(r.updated_at), 'dd MMM yyyy') : r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <Switch checked={r.is_active} onCheckedChange={() => handleToggleActive(r)} />
                      </TableCell>
                    )}
                    {!readOnly && (
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Sheet Slider */}
      <Sheet open={showForm} onOpenChange={v => { if (!v) resetForm(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-emerald-600" />
                  {editingId ? 'Edit Rate' : 'Add New Rate'}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {editingId ? 'Update sequestration rate details' : 'Configure CO₂ absorption rate for a tree species'}
                </SheetDescription>
              </div>
              {editingId && (
                <Badge variant="outline" className="text-xs">Editing</Badge>
              )}
            </div>
            {editingId && (() => {
              const editRate = rates.find((r: any) => r.id === editingId);
              return editRate?.updated_at ? (
                <p className="text-xs text-muted-foreground mt-1">Last updated: {format(new Date(editRate.updated_at), 'dd MMM yyyy, HH:mm')}</p>
              ) : editRate?.created_at ? (
                <p className="text-xs text-muted-foreground mt-1">Created: {format(new Date(editRate.created_at), 'dd MMM yyyy, HH:mm')}</p>
              ) : null;
            })()}
          </SheetHeader>

          <Separator className="mb-6" />

          <div className="space-y-6">
            {/* Species Selection Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Species Information</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Species Name <span className="text-destructive">*</span></Label>
                <Popover open={speciesPopoverOpen} onOpenChange={setSpeciesPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={speciesPopoverOpen}
                      className="w-full justify-between font-normal h-10"
                      disabled={!!editingId}
                    >
                      {formData.species_name || 'Search and select species...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type to search species..." />
                      <CommandList>
                        <CommandEmpty>No species found in catalogue.</CommandEmpty>
                        <CommandGroup>
                          {speciesCatalogue.filter((sp: any) => {
                            const spName = (sp.common_name || sp.species_name || '').toLowerCase();
                            // In edit mode, allow the currently-edited species
                            if (editingId) {
                              const editingRate = rates.find((r: any) => r.id === editingId);
                              if (editingRate && editingRate.species_name.toLowerCase() === spName) return true;
                            }
                            // Exclude species already in the rates table
                            return !rates.some((r: any) => r.species_name.toLowerCase() === spName);
                          }).map((sp: any) => {
                            const displayName = sp.common_name || sp.species_name;
                            const label = sp.scientific_name
                              ? `${displayName} (${sp.scientific_name})`
                              : displayName;
                            return (
                              <CommandItem
                                key={sp.id}
                                value={label}
                                onSelect={() => {
                                  setFormData(f => ({
                                    ...f,
                                    species_name: displayName,
                                    scientific_name: sp.scientific_name || '',
                                    species_category: sp.category || f.species_category,
                                  }));
                                  setSpeciesPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", formData.species_name === displayName ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="font-medium">{displayName}</span>
                                  {sp.scientific_name && (
                                    <span className="text-xs text-muted-foreground italic">{sp.scientific_name}</span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scientific Name</Label>
                <Input value={formData.scientific_name} disabled className="bg-muted/50 text-muted-foreground italic" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category <span className="text-destructive">*</span></Label>
                <Select value={formData.species_category} onValueChange={v => setFormData(f => ({ ...f, species_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Rate Configuration Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rate Configuration</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Min (kg/yr)</Label>
                  <Input type="number" placeholder="0" value={formData.rate_kg_per_year_min} onChange={e => setFormData(f => ({ ...f, rate_kg_per_year_min: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max (kg/yr)</Label>
                  <Input type="number" placeholder="0" value={formData.rate_kg_per_year_max} onChange={e => setFormData(f => ({ ...f, rate_kg_per_year_max: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Default (kg/yr) <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="0" value={formData.rate_kg_per_year_default} onChange={e => setFormData(f => ({ ...f, rate_kg_per_year_default: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Survival Rate Override</Label>
                  <Input type="number" step="0.01" min="0" max="1" placeholder="Default: 0.85"
                    value={formData.survival_rate_override} onChange={e => setFormData(f => ({ ...f, survival_rate_override: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Offset Horizon (yrs)</Label>
                  <Input type="number" placeholder="20" value={formData.offset_horizon_years} onChange={e => setFormData(f => ({ ...f, offset_horizon_years: e.target.value }))} />
                </div>
              </div>

              {/* Live effective rate preview */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <span className="text-sm text-muted-foreground">Effective Rate</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{liveEffectiveRate.toFixed(1)} kg/tree/yr</span>
              </div>
            </div>

            <Separator />

            {/* Source Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Data Source</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Source <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. IPCC, KEFRI" value={formData.data_source} onChange={e => setFormData(f => ({ ...f, data_source: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Year <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder={new Date().getFullYear().toString()} value={formData.source_year} onChange={e => setFormData(f => ({ ...f, source_year: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 space-y-3">
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">{editingId ? 'Update Rate' : 'Add Rate'}</Button>
            </div>

            {editingId && (
              <>
                <Separator />
                <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2" onClick={handleDeleteClick}>
                  <Trash2 className="h-4 w-4" /> Delete this rate
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={v => { if (!v) { setDeleteDialogOpen(false); setDeleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteError ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Trash2 className="h-5 w-5 text-destructive" />
              )}
              {deleteError ? 'Cannot Delete' : 'Delete Sequestration Rate'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-amber-600 dark:text-amber-400">{deleteError}</span>
              ) : (
                <>Are you sure you want to permanently delete <strong>&quot;{deleteTarget?.name}&quot;</strong>? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setDeleteError(null); }}>
              {deleteError ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SequestrationRatesTab;
