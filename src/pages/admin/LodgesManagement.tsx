import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Ban, RefreshCw, KeyRound } from 'lucide-react';

interface Lodge {
  id: string;
  name: string;
  location: string;
  contact_email: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export default function LodgesManagement() {
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLodge, setEditingLodge] = useState<Lodge | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pwLodge, setPwLodge] = useState<Lodge | null>(null);
  const [pwForm, setPwForm] = useState({ username: '', password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchLodges();
  }, []);

  const fetchLodges = async () => {
    try {
      const { data, error } = await supabase
        .from('lodges')
        .select('*')
        .order('name');

      if (error) throw error;
      setLodges(data || []);
    } catch (error) {
      console.error('Error fetching lodges:', error);
      toast({ title: 'Error', description: 'Failed to fetch lodges', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lodge: Lodge) => {
    setEditingLodge(lodge);
    setFormData({
      name: lodge.name,
      location: lodge.location,
      contact_email: lodge.contact_email || '',
      contact_phone: lodge.contact_phone || '',
      latitude: lodge.latitude?.toString() || '',
      longitude: lodge.longitude?.toString() || '',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      location: '',
      contact_email: '',
      contact_phone: '',
      latitude: '',
      longitude: '',
    });
  };

  const handleSave = async () => {
    try {
      const lodgeData = {
        name: formData.name,
        location: formData.location,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editingLodge) {
        const { error } = await supabase
          .from('lodges')
          .update(lodgeData)
          .eq('id', editingLodge.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Lodge updated successfully' });
      } else {
        const { error } = await supabase
          .from('lodges')
          .insert([lodgeData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Lodge created successfully' });
      }

      setEditingLodge(null);
      setIsCreating(false);
      fetchLodges();
    } catch (error) {
      console.error('Error saving lodge:', error);
      toast({ title: 'Error', description: 'Failed to save lodge', variant: 'destructive' });
    }
  };

  const handleOpenPassword = (lodge: Lodge) => {
    setPwLodge(lodge);
    setPwForm({ username: '', password: '' });
  };

  const handleSavePassword = async () => {
    if (!pwLodge) return;
    if (!pwForm.username.trim() || pwForm.password.length < 8) {
      toast({ title: 'Error', description: 'Username required and password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setPwSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-set-lodge-password', {
        body: { lodge_id: pwLodge.id, username: pwForm.username.trim(), password: pwForm.password },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Success', description: `Login credentials set for ${pwLodge.name}` });
      setPwLodge(null);
    } catch (error: any) {
      console.error('Error setting lodge password:', error);
      toast({ title: 'Error', description: error.message || 'Failed to set lodge password', variant: 'destructive' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggleActive = async (lodge: Lodge) => {
    try {
      const { error } = await supabase
        .from('lodges')
        .update({ is_active: !lodge.is_active })
        .eq('id', lodge.id);

      if (error) throw error;
      toast({ title: 'Success', description: `Lodge ${lodge.is_active ? 'deactivated' : 'activated'}` });
      fetchLodges();
    } catch (error) {
      console.error('Error toggling lodge status:', error);
      toast({ title: 'Error', description: 'Failed to update lodge status', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lodge Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage lodges and their contact details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchLodges} variant="outline" size="icon" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lodge
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lodges.map((lodge) => (
              <TableRow key={lodge.id}>
                <TableCell>{lodge.name}</TableCell>
                <TableCell>{lodge.location}</TableCell>
                <TableCell>{lodge.contact_email || '-'}</TableCell>
                <TableCell>{lodge.contact_phone || '-'}</TableCell>
                <TableCell>
                  <span className={lodge.is_active ? 'text-green-600' : 'text-red-600'}>
                    {lodge.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(lodge)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenPassword(lodge)} title="Set login password">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(lodge)}
                    title={lodge.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingLodge || isCreating} onOpenChange={() => { setEditingLodge(null); setIsCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLodge ? 'Edit Lodge' : 'Create Lodge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingLodge ? 'Update' : 'Create'} Lodge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwLodge} onOpenChange={() => setPwLodge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set login credentials{pwLodge ? ` — ${pwLodge.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sets the username and password the lodge uses to sign in at <code>/lodge/login</code>.
              The password is stored hashed (bcrypt) and never shown again.
            </p>
            <div>
              <Label>Username</Label>
              <Input
                autoComplete="off"
                value={pwForm.username}
                onChange={(e) => setPwForm({ ...pwForm, username: e.target.value })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={pwForm.password}
                onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters.</p>
            </div>
            <Button onClick={handleSavePassword} className="w-full" disabled={pwSaving}>
              {pwSaving ? 'Saving…' : 'Save credentials'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
