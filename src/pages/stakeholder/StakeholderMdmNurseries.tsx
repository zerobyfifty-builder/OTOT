import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Pencil, Sprout, MapPin, Phone, User, CheckCircle2, XCircle } from 'lucide-react';

export function StakeholderMdmNurseries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const emptyForm = {
    cbo_name: '', block_name: '', county: '', sub_county: '', location: '',
    manager_name: '', manager_phone: '', capacity: 0, is_kefri_certified: false, address: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  // Get org id
  useQuery({
    queryKey: ['mdmNurseryOrgId', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('organization_id').eq('user_id', user!.id).single();
      if (data?.organization_id) setOrgId(data.organization_id);
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

  const filtered = nurseries.filter(n =>
    n.cbo_name.toLowerCase().includes(search.toLowerCase()) ||
    n.block_name.toLowerCase().includes(search.toLowerCase()) ||
    (n.county || '').toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setFormData({
      cbo_name: item.cbo_name, block_name: item.block_name,
      county: item.county || '', sub_county: item.sub_county || '',
      location: item.location || '', manager_name: item.manager_name || '',
      manager_phone: item.manager_phone || '', capacity: item.capacity || 0,
      is_kefri_certified: item.is_kefri_certified || false, address: item.address || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.cbo_name.trim() || !formData.block_name.trim()) {
      toast.error('CBO name and block name are required');
      return;
    }
    if (!orgId) { toast.error('Organization not found'); return; }
    try {
      const payload = {
        cbo_name: formData.cbo_name.trim(),
        block_name: formData.block_name.trim(),
        county: formData.county.trim() || null,
        sub_county: formData.sub_county.trim() || null,
        location: formData.location.trim() || null,
        manager_name: formData.manager_name.trim() || null,
        manager_phone: formData.manager_phone.trim() || null,
        capacity: formData.capacity || 0,
        is_kefri_certified: formData.is_kefri_certified,
        address: formData.address.trim() || null,
        stakeholder_org_id: orgId,
      };
      if (editingId) {
        const { error } = await supabase.from('nurseries').update(payload).eq('id', editingId);
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_nurseries', record_id: editingId, action: 'UPDATE',
          changed_by_user_id: user?.id, new_values: payload,
        });
        toast.success('Nursery updated');
      } else {
        const { data, error } = await supabase.from('nurseries').insert(payload).select('id').single();
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_nurseries', record_id: data.id, action: 'CREATE',
          changed_by_user_id: user?.id, new_values: payload,
        });
        toast.success('Nursery added');
      }
      queryClient.invalidateQueries({ queryKey: ['mdm_nurseries'] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const toggleActive = async (item: any) => {
    const newState = !item.is_active;
    await supabase.from('nurseries').update({ is_active: newState }).eq('id', item.id);
    await supabase.from('mdm_audit_log').insert({
      module_id: 'mdm_nurseries', record_id: item.id,
      action: newState ? 'REACTIVATE' : 'DEACTIVATE',
      changed_by_user_id: user?.id,
      old_values: { is_active: item.is_active },
      new_values: { is_active: newState },
    });
    queryClient.invalidateQueries({ queryKey: ['mdm_nurseries'] });
    toast.success(newState ? 'Nursery reactivated' : 'Nursery deactivated');
  };

  const totalCapacity = nurseries.reduce((s, n) => s + (n.capacity || 0), 0);
  const activeCount = nurseries.filter(n => n.is_active).length;
  const certifiedCount = nurseries.filter(n => n.is_kefri_certified).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sprout className="h-6 w-6 text-emerald-600" /> Nurseries & CBOs Registry
          </h1>
          <p className="text-muted-foreground mt-1">Manage community-based nurseries linked to your organisation</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
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
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No nurseries found</TableCell></TableRow>
              ) : filtered.map(item => (
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(item)}>
                        {item.is_active ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <Sheet open={showForm} onOpenChange={open => { if (!open) resetForm(); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Nursery' : 'Add New Nursery'}</SheetTitle>
            <SheetDescription>Fill in the nursery / CBO details</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div><Label>CBO Name *</Label><Input value={formData.cbo_name} onChange={e => setFormData(p => ({ ...p, cbo_name: e.target.value }))} placeholder="e.g. Kieni CBO" /></div>
            <div><Label>Block Name *</Label><Input value={formData.block_name} onChange={e => setFormData(p => ({ ...p, block_name: e.target.value }))} placeholder="e.g. Kieni Block" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>County</Label><Input value={formData.county} onChange={e => setFormData(p => ({ ...p, county: e.target.value }))} /></div>
              <div><Label>Sub-County</Label><Input value={formData.sub_county} onChange={e => setFormData(p => ({ ...p, sub_county: e.target.value }))} /></div>
            </div>
            <div><Label>Location</Label><Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} /></div>
            <div><Label>Address</Label><Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Manager Name</Label><Input value={formData.manager_name} onChange={e => setFormData(p => ({ ...p, manager_name: e.target.value }))} /></div>
              <div><Label>Manager Phone</Label><Input value={formData.manager_phone} onChange={e => setFormData(p => ({ ...p, manager_phone: e.target.value }))} /></div>
            </div>
            <div><Label>Capacity (seedlings)</Label><Input type="number" value={formData.capacity} onChange={e => setFormData(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_kefri_certified} onCheckedChange={v => setFormData(p => ({ ...p, is_kefri_certified: v }))} />
              <Label>KEFRI Certified</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">{editingId ? 'Update' : 'Add'} Nursery</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
