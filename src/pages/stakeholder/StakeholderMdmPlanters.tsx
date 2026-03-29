import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Pencil, Users, User, CheckCircle2, XCircle } from 'lucide-react';

export function StakeholderMdmPlanters() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const emptyForm = {
    name: '', gender: 'Male', age: '', county: '', conservancy: '',
    marital_status: '', number_of_kids: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  useQuery({
    queryKey: ['mdmPlanterOrgId', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('organization_id').eq('user_id', user!.id).single();
      if (data?.organization_id) setOrgId(data.organization_id);
      return data?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: planters = [], isLoading } = useQuery({
    queryKey: ['mdm_planters', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tree_carers')
        .select('*')
        .eq('associated_partner_id', orgId!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const filtered = planters.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.county || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.conservancy || '').toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); setShowForm(false); };

  const handleEdit = (item: any) => {
    setFormData({
      name: item.name, gender: item.gender, age: item.age?.toString() || '',
      county: item.county || '', conservancy: item.conservancy || '',
      marital_status: item.marital_status || '', number_of_kids: item.number_of_kids?.toString() || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (!orgId) { toast.error('Organization not found'); return; }
    try {
      const payload = {
        name: formData.name.trim(),
        gender: formData.gender,
        age: formData.age ? parseInt(formData.age) : null,
        county: formData.county.trim() || null,
        conservancy: formData.conservancy.trim() || null,
        marital_status: formData.marital_status || null,
        number_of_kids: formData.number_of_kids ? parseInt(formData.number_of_kids) : null,
        associated_partner_id: orgId,
      };
      if (editingId) {
        const { error } = await supabase.from('tree_carers').update(payload).eq('id', editingId);
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_planters', record_id: editingId, action: 'UPDATE',
          changed_by_user_id: user?.id, new_values: payload,
        });
        toast.success('Planter updated');
      } else {
        const { data, error } = await supabase.from('tree_carers').insert({ ...payload, status: 'active' }).select('id').single();
        if (error) throw error;
        await supabase.from('mdm_audit_log').insert({
          module_id: 'mdm_planters', record_id: data.id, action: 'CREATE',
          changed_by_user_id: user?.id, new_values: payload,
        });
        toast.success('Planter added');
      }
      queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    await supabase.from('tree_carers').update({ status: newStatus }).eq('id', item.id);
    await supabase.from('mdm_audit_log').insert({
      module_id: 'mdm_planters', record_id: item.id,
      action: newStatus === 'active' ? 'REACTIVATE' : 'DEACTIVATE',
      changed_by_user_id: user?.id,
      old_values: { status: item.status }, new_values: { status: newStatus },
    });
    queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
    toast.success(`Planter ${newStatus === 'active' ? 'reactivated' : 'deactivated'}`);
  };

  const activeCount = planters.filter(p => p.status === 'active').length;
  const maleCount = planters.filter(p => p.gender === 'Male').length;
  const femaleCount = planters.filter(p => p.gender === 'Female').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" /> Planters Registry
          </h1>
          <p className="text-muted-foreground mt-1">Manage tree carers and field planters</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Planter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Users className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{planters.length}</p><p className="text-xs text-muted-foreground">Total Planters</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><User className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{maleCount}</p><p className="text-xs text-muted-foreground">Male</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg"><User className="h-5 w-5 text-pink-600" /></div>
          <div><p className="text-2xl font-bold">{femaleCount}</p><p className="text-xs text-muted-foreground">Female</p></div>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search planters..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Badge variant="outline">{filtered.length} planters</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Conservancy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No planters found</TableCell></TableRow>
              ) : filtered.map(item => (
                <TableRow key={item.id} className={item.status !== 'active' ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={item.gender === 'Female' ? 'border-pink-300 text-pink-700' : 'border-blue-300 text-blue-700'}>
                      {item.gender}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.age || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{item.county || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{item.conservancy || '—'}</TableCell>
                  <TableCell>
                    <Badge className={item.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(item)}>
                        {item.status === 'active' ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
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
            <SheetTitle>{editingId ? 'Edit Planter' : 'Add New Planter'}</SheetTitle>
            <SheetDescription>Fill in the planter details</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div><Label>Full Name *</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Kamau" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={v => setFormData(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Age</Label><Input type="number" value={formData.age} onChange={e => setFormData(p => ({ ...p, age: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>County</Label><Input value={formData.county} onChange={e => setFormData(p => ({ ...p, county: e.target.value }))} /></div>
              <div><Label>Conservancy</Label><Input value={formData.conservancy} onChange={e => setFormData(p => ({ ...p, conservancy: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marital Status</Label>
                <Select value={formData.marital_status} onValueChange={v => setFormData(p => ({ ...p, marital_status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Number of Kids</Label><Input type="number" value={formData.number_of_kids} onChange={e => setFormData(p => ({ ...p, number_of_kids: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">{editingId ? 'Update' : 'Add'} Planter</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
