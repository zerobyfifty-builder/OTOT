import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Pencil, Leaf, TreePine, FlaskConical } from 'lucide-react';

export function StakeholderMdmSpecies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ species_name: '', category: 'indigenous', certification_source: '' });

  const { data: species = [], isLoading } = useQuery({
    queryKey: ['mdm_species'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seed_species').select('*').order('species_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = species.filter(s =>
    s.species_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ species_name: '', category: 'indigenous', certification_source: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setFormData({
      species_name: item.species_name,
      category: item.category || 'indigenous',
      certification_source: item.certification_source || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.species_name.trim()) {
      toast.error('Species name is required');
      return;
    }
    try {
      if (editingId) {
        const { error } = await supabase.from('seed_species').update({
          species_name: formData.species_name.trim(),
          category: formData.category,
          certification_source: formData.certification_source.trim() || null,
        }).eq('id', editingId);
        if (error) throw error;
        // Audit log
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_species',
          record_id: editingId,
          action: 'UPDATE',
          changed_by_user_id: user?.id,
          new_values: formData,
        });
        toast.success('Species updated');
      } else {
        const { data, error } = await supabase.from('seed_species').insert({
          species_name: formData.species_name.trim(),
          category: formData.category,
          certification_source: formData.certification_source.trim() || null,
        }).select('id').single();
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_species',
          record_id: data.id,
          action: 'CREATE',
          changed_by_user_id: user?.id,
          new_values: formData,
        });
        toast.success('Species added');
      }
      queryClient.invalidateQueries({ queryKey: ['mdm_species'] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const categoryColor = (cat: string | null) => {
    switch (cat) {
      case 'indigenous': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'exotic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'fruit': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" /> Species & Seedlings Catalogue
          </h1>
          <p className="text-muted-foreground mt-1">Manage tree species used in planting programmes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Species
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TreePine className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{species.filter(s => s.category === 'indigenous').length}</p>
              <p className="text-xs text-muted-foreground">Indigenous</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Leaf className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{species.filter(s => s.category === 'exotic').length}</p>
              <p className="text-xs text-muted-foreground">Exotic</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FlaskConical className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{species.filter(s => s.category === 'fruit').length}</p>
              <p className="text-xs text-muted-foreground">Fruit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search species..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Badge variant="outline">{filtered.length} species</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Species Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Certification Source</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No species found</TableCell></TableRow>
              ) : filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.species_name}</TableCell>
                  <TableCell>
                    <Badge className={categoryColor(item.category)}>{item.category || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.certification_source || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet open={showForm} onOpenChange={open => { if (!open) resetForm(); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Species' : 'Add New Species'}</SheetTitle>
            <SheetDescription>Fill in the species details below</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Species Name *</Label>
              <Input value={formData.species_name} onChange={e => setFormData(p => ({ ...p, species_name: e.target.value }))} placeholder="e.g. Prunus africana" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indigenous">Indigenous</SelectItem>
                  <SelectItem value="exotic">Exotic</SelectItem>
                  <SelectItem value="fruit">Fruit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certification Source</Label>
              <Input value={formData.certification_source} onChange={e => setFormData(p => ({ ...p, certification_source: e.target.value }))} placeholder="e.g. KEFRI" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">{editingId ? 'Update' : 'Add'} Species</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
