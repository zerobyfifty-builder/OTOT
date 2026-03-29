import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Pencil, Leaf, TreePine, FlaskConical, MoreHorizontal, Download, Power, Sprout, X, Trash2 } from 'lucide-react';

const CATEGORIES = ['Indigenous', 'Exotic', 'Agroforestry', 'Medicinal', 'Fruit Tree'] as const;
const SEED_SOURCES = ['KFS Certified', 'Private Supplier', 'Community Seed Bank', 'Mixed'] as const;
const AVAILABILITY_STATUSES = ['Available', 'Limited Stock', 'Out of Stock'] as const;

interface SpeciesFormData {
  common_name: string;
  scientific_name: string;
  species_category: string;
  seed_source_type: string;
  growing_zone: string;
  avg_height_mature_m: string;
  co2_sequestration_kg_year: string;
  description: string;
}

const emptyForm: SpeciesFormData = {
  common_name: '',
  scientific_name: '',
  species_category: 'Indigenous',
  seed_source_type: 'KFS Certified',
  growing_zone: '',
  avg_height_mature_m: '',
  co2_sequestration_kg_year: '',
  description: '',
};

export function StakeholderMdmSpecies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeedSource, setFilterSeedSource] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SpeciesFormData>(emptyForm);
  const [activeTab, setActiveTab] = useState('details');
  // Nursery linkage after save
  const [showNurseryPrompt, setShowNurseryPrompt] = useState(false);
  const [newSpeciesId, setNewSpeciesId] = useState<string | null>(null);
  const [showNurseryLinkDialog, setShowNurseryLinkDialog] = useState(false);
  const [selectedNurseries, setSelectedNurseries] = useState<Record<string, string>>({});
  // Detail view
  const [detailSpeciesId, setDetailSpeciesId] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState<SpeciesFormData>(emptyForm);

  // Fetch species
  const { data: species = [], isLoading } = useQuery({
    queryKey: ['mdm_species_full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seed_species')
        .select('*')
        .order('species_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch nurseries for linkage
  const { data: nurseries = [] } = useQuery({
    queryKey: ['mdm_nurseries_for_species'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nurseries')
        .select('id, cbo_name, block_name, is_active')
        .eq('is_active', true)
        .order('cbo_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch nursery-species links for detail view
  const { data: nurseryLinks = [], refetch: refetchLinks } = useQuery({
    queryKey: ['species_nursery_links', detailSpeciesId],
    queryFn: async () => {
      if (!detailSpeciesId) return [];
      const { data, error } = await supabase
        .from('nursery_species')
        .select('id, nursery_id, availability_status, notes, nurseries(id, cbo_name, block_name)')
        .eq('species_id', detailSpeciesId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!detailSpeciesId,
  });

  // Filter logic
  const filtered = useMemo(() => {
    return species.filter(s => {
      const matchSearch = search === '' ||
        (s.common_name || s.species_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.scientific_name || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'all' || (s.category || '').toLowerCase() === filterCategory.toLowerCase();
      const matchSeed = filterSeedSource === 'all' || (s.certification_source || '') === filterSeedSource;
      const matchActive = filterActive === 'all' ||
        (filterActive === 'active' && s.is_active !== false) ||
        (filterActive === 'inactive' && s.is_active === false);
      return matchSearch && matchCategory && matchSeed && matchActive;
    });
  }, [species, search, filterCategory, filterSeedSource, filterActive]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setActiveTab('details');
  };

  const handleEdit = (item: any) => {
    // Capitalize category to match Select options (DB stores lowercase)
    const rawCat = item.category || 'indigenous';
    const matchedCategory = CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase()) || 'Indigenous';
    const data: SpeciesFormData = {
      common_name: item.common_name || item.species_name || '',
      scientific_name: item.scientific_name || '',
      species_category: matchedCategory,
      seed_source_type: item.certification_source || 'KFS Certified',
      growing_zone: item.growing_zone || '',
      avg_height_mature_m: item.avg_height_mature_m?.toString() || '',
      co2_sequestration_kg_year: item.co2_sequestration_kg_year?.toString() || '',
      description: item.description || '',
    };
    setFormData(data);
    setInitialFormData(data);
    setEditingId(item.id);
    setDetailSpeciesId(item.id);
    setActiveTab('details');
    setShowForm(true);
  };

  const isFormDirty = useMemo(() => {
    if (!editingId) return true; // Always enabled for new species
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData, editingId]);

  const handleSave = async () => {
    if (!formData.common_name.trim()) {
      toast.error('Common name is required');
      return;
    }
    if (!formData.scientific_name.trim()) {
      toast.error('Scientific name is required');
      return;
    }

    const payload = {
      species_name: formData.common_name.trim(),
      common_name: formData.common_name.trim(),
      scientific_name: formData.scientific_name.trim(),
      category: formData.species_category.toLowerCase(),
      certification_source: formData.seed_source_type,
      growing_zone: formData.growing_zone.trim() || null,
      avg_height_mature_m: formData.avg_height_mature_m ? parseFloat(formData.avg_height_mature_m) : null,
      co2_sequestration_kg_year: formData.co2_sequestration_kg_year ? parseFloat(formData.co2_sequestration_kg_year) : null,
      description: formData.description.trim() || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('seed_species').update(payload).eq('id', editingId);
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_species', record_id: editingId, action: 'UPDATE',
          changed_by_user_id: user?.id, new_values: payload,
        });
        toast.success('Species updated');
        queryClient.invalidateQueries({ queryKey: ['mdm_species_full'] });
        resetForm();
      } else {
        const { data, error } = await supabase.from('seed_species').insert(payload).select('id').single();
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_species', record_id: data.id, action: 'CREATE',
          changed_by_user_id: user?.id, new_values: payload,
        });
        toast.success('Species added');
        queryClient.invalidateQueries({ queryKey: ['mdm_species_full'] });
        setNewSpeciesId(data.id);
        resetForm();
        setShowNurseryPrompt(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleToggleActive = async (item: any) => {
    const newStatus = !(item.is_active !== false);
    try {
      const { error } = await supabase.from('seed_species').update({ is_active: newStatus }).eq('id', item.id);
      if (error) throw error;
      await supabase.from('mdm_audit_log').insert({
        module_id: 'mdm_species', record_id: item.id,
        action: newStatus ? 'ACTIVATE' : 'DEACTIVATE',
        changed_by_user_id: user?.id,
        old_values: { is_active: !newStatus }, new_values: { is_active: newStatus },
      });
      toast.success(newStatus ? 'Species activated' : 'Species deactivated');
      queryClient.invalidateQueries({ queryKey: ['mdm_species_full'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Common Name', 'Scientific Name', 'Category', 'Seed Source', 'Growing Zone', 'Height (m)', 'CO2 (kg/yr)', 'Active'];
    const rows = filtered.map(s => [
      s.common_name || s.species_name || '',
      s.scientific_name || '',
      s.category || '',
      s.certification_source || '',
      s.growing_zone || '',
      s.avg_height_mature_m?.toString() || '',
      s.co2_sequestration_kg_year?.toString() || '',
      s.is_active !== false ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'species_catalogue.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // Nursery linkage handlers
  const handleNurseryPromptYes = () => {
    setShowNurseryPrompt(false);
    setSelectedNurseries({});
    setShowNurseryLinkDialog(true);
  };

  const handleSaveNurseryLinks = async () => {
    if (!newSpeciesId && !detailSpeciesId) return;
    const speciesId = newSpeciesId || detailSpeciesId;
    const entries = Object.entries(selectedNurseries);
    if (entries.length === 0) {
      toast.error('Select at least one nursery');
      return;
    }
    try {
      const inserts = entries.map(([nurseryId, status]) => ({
        species_id: speciesId!,
        nursery_id: nurseryId,
        availability_status: status,
      }));
      const { error } = await supabase.from('nursery_species').insert(inserts);
      if (error) throw error;
      toast.success(`Linked to ${entries.length} nurseries`);
      setShowNurseryLinkDialog(false);
      setSelectedNurseries({});
      setNewSpeciesId(null);
      refetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to link nurseries');
    }
  };

  const handleRemoveNurseryLink = async (linkId: string) => {
    try {
      const { error } = await supabase.from('nursery_species').delete().eq('id', linkId);
      if (error) throw error;
      toast.success('Nursery link removed');
      refetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove link');
    }
  };

  const handleUpdateLinkStatus = async (linkId: string, status: string) => {
    try {
      const { error } = await supabase.from('nursery_species').update({ availability_status: status }).eq('id', linkId);
      if (error) throw error;
      toast.success('Status updated');
      refetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const categoryColor = (cat: string | null) => {
    const c = (cat || '').toLowerCase();
    switch (c) {
      case 'indigenous': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'exotic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'agroforestry': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300';
      case 'medicinal': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'fruit tree': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const seedSourceColor = (src: string | null) => {
    switch (src) {
      case 'KFS Certified': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Private Supplier': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
      case 'Community Seed Bank': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Mixed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const availabilityColor = (s: string) => {
    switch (s) {
      case 'Available': return 'bg-emerald-100 text-emerald-800';
      case 'Limited Stock': return 'bg-amber-100 text-amber-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Stats
  const totalActive = species.filter(s => s.is_active !== false).length;
  const totalInactive = species.filter(s => s.is_active === false).length;
  const categoryCounts: Record<string, number> = {};
  CATEGORIES.forEach(c => { categoryCounts[c] = species.filter(s => (s.category || '').toLowerCase() === c.toLowerCase()).length; });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" /> Species & Seedlings Catalogue
          </h1>
          <p className="text-muted-foreground mt-1">Master catalogue of all tree species and seedling types</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Species
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CATEGORIES.map(cat => (
          <Card key={cat}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${categoryColor(cat).split(' ').slice(0, 1).join(' ')}`}>
                <TreePine className="h-4 w-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{categoryCounts[cat]}</p>
                <p className="text-[11px] text-muted-foreground">{cat}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Table */}
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
                {CATEGORIES.map(c => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSeedSource} onValueChange={setFilterSeedSource}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Seed Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SEED_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} species</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Common Name</TableHead>
                  <TableHead>Scientific Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Seed Source</TableHead>
                  <TableHead>Growing Zone</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No species found</TableCell></TableRow>
                ) : filtered.map(item => (
                  <TableRow key={item.id} className={item.is_active === false ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.common_name || item.species_name}</TableCell>
                    <TableCell className="text-muted-foreground italic text-sm">{item.scientific_name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${categoryColor(item.category)}`}>
                        {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${seedSourceColor(item.certification_source)}`}>
                        {item.certification_source || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.growing_zone || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.is_active !== false ? 'default' : 'secondary'} className="text-[10px]">
                        {item.is_active !== false ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                            <Power className="h-3.5 w-3.5 mr-2" /> {item.is_active !== false ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet open={showForm} onOpenChange={open => { if (!open) resetForm(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Species' : 'Add New Species'}</SheetTitle>
            <SheetDescription>Fill in the species details below</SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              {editingId && <TabsTrigger value="nurseries" className="flex-1">Nursery Linkage</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Common Name *</Label>
                  <Input value={formData.common_name} onChange={e => setFormData(p => ({ ...p, common_name: e.target.value }))} placeholder="e.g. African Cherry" />
                </div>
                <div>
                  <Label>Scientific Name *</Label>
                  <Input value={formData.scientific_name} onChange={e => setFormData(p => ({ ...p, scientific_name: e.target.value }))} placeholder="e.g. Prunus africana" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Species Category</Label>
                    <Select value={formData.species_category} onValueChange={v => setFormData(p => ({ ...p, species_category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Seed Source Type</Label>
                    <Select value={formData.seed_source_type} onValueChange={v => setFormData(p => ({ ...p, seed_source_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEED_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Growing Zone</Label>
                  <Input value={formData.growing_zone} onChange={e => setFormData(p => ({ ...p, growing_zone: e.target.value }))} placeholder="e.g. Highland forest, 1500–2500m" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Avg Height at Maturity (m)</Label>
                    <Input type="number" step="0.01" value={formData.avg_height_mature_m} onChange={e => setFormData(p => ({ ...p, avg_height_mature_m: e.target.value }))} placeholder="e.g. 25.00" />
                  </div>
                  <div>
                    <Label>CO₂ Sequestration (kg/yr)</Label>
                    <Input type="number" step="0.01" value={formData.co2_sequestration_kg_year} onChange={e => setFormData(p => ({ ...p, co2_sequestration_kg_year: e.target.value }))} placeholder="e.g. 22.60" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Additional notes about the species..." rows={3} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">{editingId ? 'Update' : 'Add'} Species</Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </TabsContent>

            {editingId && (
              <TabsContent value="nurseries" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Nurseries currently stocking this species</p>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedNurseries({}); setShowNurseryLinkDialog(true); }} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Link Nursery
                  </Button>
                </div>
                {nurseryLinks.length === 0 ? (
                  <p className="text-sm text-center py-6 text-muted-foreground">No nurseries linked yet</p>
                ) : (
                  <div className="space-y-2">
                    {nurseryLinks.map(link => (
                      <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{link.nurseries?.cbo_name || 'Unknown'}</p>
                          <p className="text-[11px] text-muted-foreground">{link.nurseries?.block_name || ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={link.availability_status || 'Available'} onValueChange={v => handleUpdateLinkStatus(link.id, v)}>
                            <SelectTrigger className="h-7 text-[11px] w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABILITY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveNurseryLink(link.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Nursery prompt after creating new species */}
      <Dialog open={showNurseryPrompt} onOpenChange={setShowNurseryPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Nurseries?</DialogTitle>
            <DialogDescription>Would you like to link this species to nurseries that stock it?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNurseryPrompt(false); setNewSpeciesId(null); }}>No, Later</Button>
            <Button onClick={handleNurseryPromptYes}>Yes, Link Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nursery multi-select dialog */}
      <Dialog open={showNurseryLinkDialog} onOpenChange={setShowNurseryLinkDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Nurseries</DialogTitle>
            <DialogDescription>Choose nurseries and set availability status</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-4">
            {nurseries.filter(n => {
              // Exclude already linked nurseries
              const linkedIds = nurseryLinks.map(l => l.nursery_id);
              return !linkedIds.includes(n.id);
            }).map(n => (
              <div key={n.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!selectedNurseries[n.id]}
                    onCheckedChange={checked => {
                      setSelectedNurseries(prev => {
                        if (checked) return { ...prev, [n.id]: 'Available' };
                        const copy = { ...prev }; delete copy[n.id]; return copy;
                      });
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{n.cbo_name}</p>
                    <p className="text-[11px] text-muted-foreground">{n.block_name}</p>
                  </div>
                </div>
                {selectedNurseries[n.id] && (
                  <Select value={selectedNurseries[n.id]} onValueChange={v => setSelectedNurseries(prev => ({ ...prev, [n.id]: v }))}>
                    <SelectTrigger className="h-7 text-[11px] w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNurseryLinkDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveNurseryLinks} disabled={Object.keys(selectedNurseries).length === 0}>
              Link {Object.keys(selectedNurseries).length} Nurseries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
