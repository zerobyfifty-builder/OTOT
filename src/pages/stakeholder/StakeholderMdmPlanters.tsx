import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Plus, Users, User, CheckCircle2, XCircle, MoreHorizontal,
  Pencil, MapPin, Download, AlertTriangle, X, ChevronRight
} from 'lucide-react';

const PLANTER_TYPES = ['KFS Staff', 'Community Farmer', 'CBO Member', 'Youth Group', 'School Group', 'Private'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

interface PlanterForm {
  name: string;
  id_number: string;
  planter_type: string;
  gender: string;
  phone: string;
  email: string;
  cbo_nursery_id: string;
  county: string;
  sub_county: string;
  date_registered: string;
  notes: string;
}

const emptyForm: PlanterForm = {
  name: '', id_number: '', planter_type: 'Community Farmer', gender: 'Male',
  phone: '', email: '', cbo_nursery_id: '', county: '', sub_county: '',
  date_registered: new Date().toISOString().split('T')[0], notes: '',
};

export function StakeholderMdmPlanters() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCounty, setFilterCounty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanterForm>(emptyForm);
  const [formTab, setFormTab] = useState('details');

  // Beat assignment state
  const [showBeatPanel, setShowBeatPanel] = useState(false);
  const [beatPlanterItem, setBeatPlanterItem] = useState<any>(null);
  const [beatCountyId, setBeatCountyId] = useState('');
  const [beatSubcountyId, setBeatSubcountyId] = useState('');
  const [beatBlockId, setBeatBlockId] = useState('');
  const [beatStationId, setBeatStationId] = useState('');
  const [selectedBeatId, setSelectedBeatId] = useState('');

  // Org ID
  useQuery({
    queryKey: ['mdmPlanterOrgId', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('organization_id').eq('user_id', user!.id).single();
      if (data?.organization_id) setOrgId(data.organization_id);
      return data?.organization_id || null;
    },
    enabled: !!user?.id,
  });

  // Planters
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

  // Nurseries for CBO link
  const { data: nurseries = [] } = useQuery({
    queryKey: ['mdm_nurseries_for_planters', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('nurseries').select('id, cbo_name, block_name').eq('stakeholder_org_id', orgId!).eq('is_active', true).order('cbo_name');
      return data || [];
    },
    enabled: !!orgId,
  });

  // Location hierarchy for beat assignment
  const { data: counties = [] } = useQuery({
    queryKey: ['mdm_counties_planters'],
    queryFn: async () => {
      const { data } = await supabase.from('mdm_location_counties').select('id, name').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: subcounties = [] } = useQuery({
    queryKey: ['mdm_subcounties_planters', beatCountyId],
    queryFn: async () => {
      const { data } = await supabase.from('mdm_location_subcounties').select('id, name').eq('county_id', beatCountyId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!beatCountyId,
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['mdm_blocks_planters', beatSubcountyId],
    queryFn: async () => {
      const { data } = await supabase.from('mdm_location_blocks').select('id, name').eq('subcounty_id', beatSubcountyId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!beatSubcountyId,
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['mdm_stations_planters', beatBlockId],
    queryFn: async () => {
      const { data } = await supabase.from('mdm_location_stations').select('id, name').eq('block_id', beatBlockId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!beatBlockId,
  });

  const { data: beats = [] } = useQuery({
    queryKey: ['mdm_beats_planters', beatStationId],
    queryFn: async () => {
      const { data } = await supabase.from('mdm_location_beats').select('id, name, beat_code').eq('station_id', beatStationId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!beatStationId,
  });

  // All beats for resolving names
  const { data: allBeats = [] } = useQuery({
    queryKey: ['mdm_all_beats_planters'],
    queryFn: async () => {
      const { data } = await supabase.from('mdm_location_beats').select('id, name, beat_code');
      return data || [];
    },
  });

  const beatNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    allBeats.forEach((b: any) => { map[b.id] = b.name; });
    return map;
  }, [allBeats]);

  // Unique counties from planters for filter
  const uniqueCounties = useMemo(() => {
    const set = new Set(planters.map((p: any) => p.county).filter(Boolean));
    return Array.from(set).sort();
  }, [planters]);

  // Filtering
  const filtered = useMemo(() => {
    return planters.filter((p: any) => {
      const s = search.toLowerCase();
      const matchesSearch = !s || p.name.toLowerCase().includes(s) ||
        (p.id_number || '').toLowerCase().includes(s) ||
        (p.phone || '').toLowerCase().includes(s);
      const matchesType = filterType === 'all' || p.planter_type === filterType;
      const matchesCounty = filterCounty === 'all' || p.county === filterCounty;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' ? p.status === 'Active' : p.status !== 'Active');
      return matchesSearch && matchesType && matchesCounty && matchesStatus;
    });
  }, [planters, search, filterType, filterCounty, filterStatus]);

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); setShowForm(false); setFormTab('details'); };

  const handleEdit = (item: any) => {
    setFormData({
      name: item.name || '',
      id_number: item.id_number || '',
      planter_type: item.planter_type || 'Community Farmer',
      gender: item.gender || 'Male',
      phone: item.phone || '',
      email: item.email || '',
      cbo_nursery_id: item.cbo_nursery_id || '',
      county: item.county || '',
      sub_county: item.sub_county || '',
      date_registered: item.date_registered || new Date().toISOString().split('T')[0],
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowForm(true);
    setFormTab('details');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Full Name is required'); return; }
    if (!orgId) { toast.error('Organization not found'); return; }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Invalid email format'); return;
    }
    try {
      const payload: any = {
        name: formData.name.trim(),
        id_number: formData.id_number.trim() || null,
        planter_type: formData.planter_type,
        gender: formData.gender,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        cbo_nursery_id: formData.cbo_nursery_id && formData.cbo_nursery_id !== 'none' ? formData.cbo_nursery_id : null,
        county: formData.county.trim() || null,
        sub_county: formData.sub_county.trim() || null,
        date_registered: formData.date_registered || null,
        notes: formData.notes.trim() || null,
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
        const { data, error } = await supabase.from('tree_carers').insert({ ...payload, status: 'Active', assigned_beats: [] }).select('id').single();
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
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    await supabase.from('tree_carers').update({ status: newStatus }).eq('id', item.id);
    await supabase.from('mdm_audit_log').insert({
      module_id: 'mdm_planters', record_id: item.id,
      action: newStatus === 'Active' ? 'REACTIVATE' : 'DEACTIVATE',
      changed_by_user_id: user?.id,
      old_values: { status: item.status }, new_values: { status: newStatus },
    });
    queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
    toast.success(`Planter ${newStatus === 'Active' ? 'reactivated' : 'deactivated'}`);
  };

  // Beat assignment
  const openBeatPanel = (item: any) => {
    setBeatPlanterItem(item);
    setShowBeatPanel(true);
    setBeatCountyId(''); setBeatSubcountyId(''); setBeatBlockId(''); setBeatStationId(''); setSelectedBeatId('');
  };

  const addBeat = async () => {
    if (!selectedBeatId || !beatPlanterItem) return;
    const currentBeats: string[] = beatPlanterItem.assigned_beats || [];
    if (currentBeats.includes(selectedBeatId)) { toast.error('Beat already assigned'); return; }
    const newBeats = [...currentBeats, selectedBeatId];
    const { error } = await supabase.from('tree_carers').update({ assigned_beats: newBeats }).eq('id', beatPlanterItem.id);
    if (error) { toast.error(error.message); return; }
    setBeatPlanterItem({ ...beatPlanterItem, assigned_beats: newBeats });
    queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
    setSelectedBeatId('');
    toast.success('Beat assigned');
  };

  const removeBeat = async (beatId: string) => {
    if (!beatPlanterItem) return;
    const newBeats = (beatPlanterItem.assigned_beats || []).filter((b: string) => b !== beatId);
    const { error } = await supabase.from('tree_carers').update({ assigned_beats: newBeats }).eq('id', beatPlanterItem.id);
    if (error) { toast.error(error.message); return; }
    setBeatPlanterItem({ ...beatPlanterItem, assigned_beats: newBeats });
    queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
    toast.success('Beat removed');
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Full Name', 'ID Number', 'Type', 'Gender', 'Phone', 'Email', 'County', 'Sub-County', 'Assigned Beats', 'Status', 'Date Registered', 'Notes'];
    const rows = filtered.map((p: any) => [
      p.name, p.id_number || '', p.planter_type || '', p.gender, p.phone || '', p.email || '',
      p.county || '', p.sub_county || '',
      (p.assigned_beats || []).map((id: string) => beatNameMap[id] || id).join('; '),
      p.status, p.date_registered || '', p.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'planters_registry.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const activeCount = planters.filter((p: any) => p.status === 'Active').length;
  const maleCount = planters.filter((p: any) => p.gender === 'Male').length;
  const femaleCount = planters.filter((p: any) => p.gender === 'Female').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" /> Planters & Farmers Registry
          </h1>
          <p className="text-muted-foreground mt-1">Manage individuals authorised to log planting events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Planter
          </Button>
        </div>
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ID, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PLANTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCounty} onValueChange={setFilterCounty}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="County" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {uniqueCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} planters</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Assigned Beats</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No planters found</TableCell></TableRow>
              ) : filtered.map((item: any) => {
                const beatCount = (item.assigned_beats || []).length;
                return (
                  <TableRow key={item.id} className={item.status !== 'active' ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.id_number || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.planter_type || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.county || '—'}</TableCell>
                    <TableCell>
                      {beatCount === 0 ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" /> None
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{beatCount} beat{beatCount > 1 ? 's' : ''}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={item.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }>
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openBeatPanel(item)}>
                            <MapPin className="h-4 w-4 mr-2" /> Assigned Beats
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(item)}>
                            {item.status === 'active'
                              ? <><XCircle className="h-4 w-4 mr-2 text-destructive" /> Deactivate</>
                              : <><CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Reactivate</>
                            }
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Form Sheet */}
      <Sheet open={showForm} onOpenChange={open => { if (!open) resetForm(); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Planter' : 'Add New Planter'}</SheetTitle>
            <SheetDescription>Fill in the planter details below</SheetDescription>
          </SheetHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="beats">Beat Assignment</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-3 mt-4">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Kamau" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">ID / Passport Number</Label>
                <Input value={formData.id_number} onChange={e => setFormData(p => ({ ...p, id_number: e.target.value }))} placeholder="National ID or Passport" className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Planter Type</Label>
                  <Select value={formData.planter_type} onValueChange={v => setFormData(p => ({ ...p, planter_type: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLANTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Gender</Label>
                  <Select value={formData.gender} onValueChange={v => setFormData(p => ({ ...p, gender: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+254..." className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">CBO / Nursery Link</Label>
                <Select value={formData.cbo_nursery_id} onValueChange={v => setFormData(p => ({ ...p, cbo_nursery_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="None (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {nurseries.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.cbo_name} — {n.block_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">County</Label>
                  <Input value={formData.county} onChange={e => setFormData(p => ({ ...p, county: e.target.value }))} placeholder="e.g. Nakuru" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Sub-County</Label>
                  <Input value={formData.sub_county} onChange={e => setFormData(p => ({ ...p, sub_county: e.target.value }))} placeholder="e.g. Njoro" className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Date Registered</Label>
                <Input type="date" value={formData.date_registered} onChange={e => setFormData(p => ({ ...p, date_registered: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." rows={3} />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">{editingId ? 'Update' : 'Add'} Planter</Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </TabsContent>

            <TabsContent value="beats" className="mt-4">
              {!editingId ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Save the planter first to assign beats</p>
                </div>
              ) : (
                <BeatAssignmentInline
                  planterId={editingId}
                  planterBeats={planters.find((p: any) => p.id === editingId)?.assigned_beats || []}
                  beatNameMap={beatNameMap}
                  counties={counties}
                  queryClient={queryClient}
                  userId={user?.id}
                />
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Beat Assignment Panel (from list view) */}
      <Sheet open={showBeatPanel} onOpenChange={open => { if (!open) { setShowBeatPanel(false); setBeatPlanterItem(null); } }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" /> Assigned Beats
            </SheetTitle>
            <SheetDescription>{beatPlanterItem?.name}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Current beats */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Current Assignments</Label>
              {(!beatPlanterItem?.assigned_beats || beatPlanterItem.assigned_beats.length === 0) ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">No beats assigned — planter cannot log planting events</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {beatPlanterItem.assigned_beats.map((beatId: string) => (
                    <Badge key={beatId} variant="secondary" className="gap-1 pr-1">
                      {beatNameMap[beatId] || beatId.slice(0, 8)}
                      <button onClick={() => removeBeat(beatId)} className="ml-1 hover:bg-destructive/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Cascading picker */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="text-xs font-medium">Add Beat</Label>
              <Select value={beatCountyId} onValueChange={v => { setBeatCountyId(v); setBeatSubcountyId(''); setBeatBlockId(''); setBeatStationId(''); setSelectedBeatId(''); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select County" /></SelectTrigger>
                <SelectContent>
                  {counties.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {beatCountyId && (
                <Select value={beatSubcountyId} onValueChange={v => { setBeatSubcountyId(v); setBeatBlockId(''); setBeatStationId(''); setSelectedBeatId(''); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Sub-County" /></SelectTrigger>
                  <SelectContent>
                    {subcounties.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {beatSubcountyId && (
                <Select value={beatBlockId} onValueChange={v => { setBeatBlockId(v); setBeatStationId(''); setSelectedBeatId(''); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Block" /></SelectTrigger>
                  <SelectContent>
                    {blocks.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {beatBlockId && (
                <Select value={beatStationId} onValueChange={v => { setBeatStationId(v); setSelectedBeatId(''); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Station" /></SelectTrigger>
                  <SelectContent>
                    {stations.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {beatStationId && (
                <Select value={selectedBeatId} onValueChange={setSelectedBeatId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Beat" /></SelectTrigger>
                  <SelectContent>
                    {beats.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.beat_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {selectedBeatId && (
                <Button onClick={addBeat} size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" /> Assign Beat
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Inline beat assignment component for use within the edit form tabs
function BeatAssignmentInline({ planterId, planterBeats, beatNameMap, counties, queryClient, userId }: {
  planterId: string;
  planterBeats: string[];
  beatNameMap: Record<string, string>;
  counties: any[];
  queryClient: any;
  userId?: string;
}) {
  const [countyId, setCountyId] = useState('');
  const [subcountyId, setSubcountyId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [stationId, setStationId] = useState('');
  const [beatId, setBeatId] = useState('');
  const [localBeats, setLocalBeats] = useState<string[]>(planterBeats);

  const { data: subs = [] } = useQuery({
    queryKey: ['beat_inline_subs', countyId],
    queryFn: async () => { const { data } = await supabase.from('mdm_location_subcounties').select('id, name').eq('county_id', countyId).eq('is_active', true).order('name'); return data || []; },
    enabled: !!countyId,
  });
  const { data: blks = [] } = useQuery({
    queryKey: ['beat_inline_blks', subcountyId],
    queryFn: async () => { const { data } = await supabase.from('mdm_location_blocks').select('id, name').eq('subcounty_id', subcountyId).eq('is_active', true).order('name'); return data || []; },
    enabled: !!subcountyId,
  });
  const { data: stns = [] } = useQuery({
    queryKey: ['beat_inline_stns', blockId],
    queryFn: async () => { const { data } = await supabase.from('mdm_location_stations').select('id, name').eq('block_id', blockId).eq('is_active', true).order('name'); return data || []; },
    enabled: !!blockId,
  });
  const { data: bts = [] } = useQuery({
    queryKey: ['beat_inline_bts', stationId],
    queryFn: async () => { const { data } = await supabase.from('mdm_location_beats').select('id, name, beat_code').eq('station_id', stationId).eq('is_active', true).order('name'); return data || []; },
    enabled: !!stationId,
  });

  const addBeatInline = async () => {
    if (!beatId) return;
    if (localBeats.includes(beatId)) { toast.error('Already assigned'); return; }
    const newBeats = [...localBeats, beatId];
    const { error } = await supabase.from('tree_carers').update({ assigned_beats: newBeats }).eq('id', planterId);
    if (error) { toast.error(error.message); return; }
    setLocalBeats(newBeats);
    queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
    setBeatId('');
    toast.success('Beat assigned');
  };

  const removeBeatInline = async (bid: string) => {
    const newBeats = localBeats.filter(b => b !== bid);
    const { error } = await supabase.from('tree_carers').update({ assigned_beats: newBeats }).eq('id', planterId);
    if (error) { toast.error(error.message); return; }
    setLocalBeats(newBeats);
    queryClient.invalidateQueries({ queryKey: ['mdm_planters'] });
    toast.success('Beat removed');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-2 block">Current Beats</Label>
        {localBeats.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">No beats assigned</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {localBeats.map(bid => (
              <Badge key={bid} variant="secondary" className="gap-1 pr-1">
                {beatNameMap[bid] || bid.slice(0, 8)}
                <button onClick={() => removeBeatInline(bid)} className="ml-1 hover:bg-destructive/20 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
        <Label className="text-xs font-medium">Add Beat</Label>
        <Select value={countyId} onValueChange={v => { setCountyId(v); setSubcountyId(''); setBlockId(''); setStationId(''); setBeatId(''); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder="County" /></SelectTrigger>
          <SelectContent>{counties.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {countyId && <Select value={subcountyId} onValueChange={v => { setSubcountyId(v); setBlockId(''); setStationId(''); setBeatId(''); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Sub-County" /></SelectTrigger>
          <SelectContent>{subs.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>}
        {subcountyId && <Select value={blockId} onValueChange={v => { setBlockId(v); setStationId(''); setBeatId(''); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Block" /></SelectTrigger>
          <SelectContent>{blks.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>}
        {blockId && <Select value={stationId} onValueChange={v => { setStationId(v); setBeatId(''); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Station" /></SelectTrigger>
          <SelectContent>{stns.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>}
        {stationId && <Select value={beatId} onValueChange={setBeatId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Beat" /></SelectTrigger>
          <SelectContent>{bts.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.beat_code})</SelectItem>)}</SelectContent>
        </Select>}
        {beatId && <Button onClick={addBeatInline} size="sm" className="w-full gap-2"><Plus className="h-4 w-4" /> Assign Beat</Button>}
      </div>
    </div>
  );
}

export default StakeholderMdmPlanters;
